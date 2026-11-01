import { Types, type HydratedDocument } from "mongoose";
import {
  SELLER_TRANSITIONS,
  Seller,
  type ISeller,
  type ISellerAddress,
  type ISellerDocument,
  type SellerStatus,
} from "../models/Seller";
import { User, type Role } from "../models/User";
import type { AdminSellerListQuery, SellerApplicationInput } from "../validators/seller.validator";
import { AppError } from "../utils/AppError";
import { buildPaginationMeta, escapeRegex, getSkip } from "../utils/pagination";
import { slugify } from "../utils/slug";
import { runInTransaction } from "../utils/transaction";
import { Product } from "../models/Product";

type SellerDocument = HydratedDocument<ISeller>;

export type SellerOwner = { id: string; name: string; email: string; phone?: string };

export type SellerDTO = {
  id: string;
  storeName: string;
  slug: string;
  description?: string;
  logo?: { url: string };
  businessName: string;
  phone: string;
  address: ISellerAddress;
  tinNumber?: string;
  documents: ISellerDocument[];
  status: SellerStatus;
  rejectionReason?: string;
  suspensionReason?: string;
  submittedAt: Date;
  reviewedAt?: Date;
  createdAt: Date;
  owner?: SellerOwner;
};

export function toSellerDTO(seller: SellerDocument, owner?: SellerOwner): SellerDTO {
  return {
    id: seller.id,
    storeName: seller.storeName,
    slug: seller.slug,
    description: seller.description,
    logo: seller.logo ? { url: seller.logo.url } : undefined,
    businessName: seller.businessName,
    phone: seller.phone,
    address: {
      region: seller.address.region,
      city: seller.address.city,
      subcity: seller.address.subcity,
      details: seller.address.details,
    },
    tinNumber: seller.tinNumber,
    documents: seller.documents.map((d) => ({ url: d.url, publicId: d.publicId, type: d.type })),
    status: seller.status,
    rejectionReason: seller.rejectionReason,
    suspensionReason: seller.suspensionReason,
    submittedAt: seller.submittedAt,
    reviewedAt: seller.reviewedAt,
    createdAt: seller.createdAt,
    owner,
  };
}

function assertTransition(from: SellerStatus, to: SellerStatus) {
  if (!SELLER_TRANSITIONS[from].includes(to)) {
    throw new AppError(409, "INVALID_TRANSITION", `Cannot change a seller from ${from} to ${to}`);
  }
}

async function generateUniqueSlug(storeName: string, excludeId?: Types.ObjectId): Promise<string> {
  const base = slugify(storeName) || "store";
  let candidate = base;
  let counter = 1;

  while (
    await Seller.exists({ slug: candidate, ...(excludeId ? { _id: { $ne: excludeId } } : {}) })
  ) {
    counter += 1;
    candidate = `${base}-${counter}`;
  }
  return candidate;
}

/* ------------------------------ seller-facing ------------------------------ */

/**
 * Creates a seller application, or re-submits a rejected one.
 * The owner always comes from the authenticated user, never from the request body.
 */
export async function apply(
  user: { id: string; role: Role },
  input: SellerApplicationInput,
): Promise<SellerDTO> {
  if (user.role === "ADMIN") throw AppError.forbidden("Admin accounts cannot become sellers");

  const existing = await Seller.findOne({ user: user.id });

  if (!existing) {
    const seller = await Seller.create({
      user: new Types.ObjectId(user.id),
      ...input,
      slug: await generateUniqueSlug(input.storeName),
    });
    return toSellerDTO(seller);
  }

  if (existing.status !== "REJECTED") {
    throw AppError.conflict(`You already have a ${existing.status.toLowerCase()} seller account`);
  }
  assertTransition(existing.status, "PENDING");

  if (existing.storeName !== input.storeName) {
    existing.slug = await generateUniqueSlug(input.storeName, existing._id);
  }
  existing.set({
    storeName: input.storeName,
    description: input.description,
    businessName: input.businessName,
    phone: input.phone,
    tinNumber: input.tinNumber,
    address: input.address,
    status: "PENDING",
    submittedAt: new Date(),
    reviewedBy: undefined,
    reviewedAt: undefined,
    rejectionReason: undefined,
  });
  await existing.save();
  return toSellerDTO(existing);
}

/** The current user's own seller record, or null if they have not applied. */
export async function getMine(userId: string): Promise<SellerDTO | null> {
  const seller = await Seller.findOne({ user: userId });
  return seller ? toSellerDTO(seller) : null;
}

/* ------------------------------- admin-facing ------------------------------ */

function toOwner(user: { id: string; name: string; email: string; phone?: string }): SellerOwner {
  return { id: user.id, name: user.name, email: user.email, phone: user.phone };
}

export async function listSellers(query: AdminSellerListQuery) {
  const { page, limit, status, search } = query;

  const filter: Record<string, unknown> = {};
  if (status) filter.status = status;
  if (search) {
    const pattern = new RegExp(escapeRegex(search), "i");
    filter.$or = [{ storeName: pattern }, { businessName: pattern }];
  }

  const [sellers, total] = await Promise.all([
    Seller.find(filter).sort({ createdAt: -1 }).skip(getSkip(page, limit)).limit(limit),
    Seller.countDocuments(filter),
  ]);

  const owners = await User.find({ _id: { $in: sellers.map((s) => s.user) } }).select(
    "name email phone",
  );
  const ownerById = new Map(owners.map((o) => [o.id, toOwner(o)]));

  return {
    items: sellers.map((s) => toSellerDTO(s, ownerById.get(s.user.toString()))),
    pagination: buildPaginationMeta(page, limit, total),
  };
}

export async function getSellerForAdmin(sellerId: string): Promise<SellerDTO> {
  const seller = await Seller.findById(sellerId);
  if (!seller) throw AppError.notFound("Seller not found");

  const owner = await User.findById(seller.user).select("name email phone");
  return toSellerDTO(seller, owner ? toOwner(owner) : undefined);
}

type TransitionOptions = { from: SellerStatus; to: SellerStatus; reason?: string };

/**
 * Applies a status change. The seller and the owner's role are updated in one
 * transaction, so they can never disagree.
 */
async function transition(
  sellerId: string,
  adminId: string,
  { from, to, reason }: TransitionOptions,
): Promise<SellerDTO> {
  await runInTransaction(async (session) => {
    const seller = await Seller.findById(sellerId).session(session);
    if (!seller) throw AppError.notFound("Seller not found");

    if (seller.status !== from) {
      throw new AppError(409, "INVALID_TRANSITION", `Cannot change a seller from ${seller.status} to ${to}`);
    }
    assertTransition(seller.status, to);

    seller.status = to;
    seller.reviewedBy = new Types.ObjectId(adminId);
    seller.reviewedAt = new Date();
    seller.rejectionReason = to === "REJECTED" ? reason : undefined;
    seller.suspensionReason = to === "SUSPENDED" ? reason : undefined;
    await seller.save({ session });

    // First approval grants the SELLER role. Suspension keeps it, so the seller can
    // still sign in and see why they are suspended.
    if (from === "PENDING" && to === "ACTIVE") {
      await User.updateOne({ _id: seller.user }, { $set: { role: "SELLER" } }, { session });
    }

    
    // A suspended seller's products leave the storefront; reactivating brings them back.
    if (to === "ACTIVE" || to === "SUSPENDED") {
      await Product.updateMany(
        { seller: seller._id },
        { $set: { isSellerActive: to === "ACTIVE" } },
        { session },
      );
    }
  });

  return getSellerForAdmin(sellerId);
}

export const approveSeller = (sellerId: string, adminId: string) =>
  transition(sellerId, adminId, { from: "PENDING", to: "ACTIVE" });

export const rejectSeller = (sellerId: string, adminId: string, reason: string) =>
  transition(sellerId, adminId, { from: "PENDING", to: "REJECTED", reason });

export const suspendSeller = (sellerId: string, adminId: string, reason: string) =>
  transition(sellerId, adminId, { from: "ACTIVE", to: "SUSPENDED", reason });

export const reactivateSeller = (sellerId: string, adminId: string) =>
  transition(sellerId, adminId, { from: "SUSPENDED", to: "ACTIVE" });