import { randomBytes } from "crypto";
import { Types, type ClientSession, type HydratedDocument } from "mongoose";
import { Brand } from "../models/Brand";
import { Category } from "../models/Category";
import type { IManagedImage } from "../models/image.schema";
import { PRODUCT_TRANSITIONS, Product, type ProductStatus } from "../models/Product";
import { ProductVariant, type IProductVariant } from "../models/ProductVariant";
import type { ProductInput, SellerProductListQuery } from "../validators/product.validator";
import { AppError } from "../utils/AppError";
import { buildPaginationMeta, escapeRegex, getSkip } from "../utils/pagination";
import { calculateProductStats } from "../utils/pricing";
import { slugify } from "../utils/slug";
import { runInTransaction } from "../utils/transaction";
import { variantKey, type OptionValue } from "../utils/variants";
import { buildProductDTOs, type ProductDTO, type ProductDocument } from "./product.dto";
import { assertManagedImage, deleteImageQuietly, productImageFolder } from "./storage";

type VariantDocument = HydratedDocument<IProductVariant>;

type NormalizedVariant = {
  id?: string;
  sku: string;
  price: number;
  stock?: number;
  optionValues: OptionValue[];
  key: string;
};

/* --------------------------------- helpers -------------------------------- */

export function assertProductTransition(from: ProductStatus, to: ProductStatus) {
  if (!PRODUCT_TRANSITIONS[from].includes(to)) {
    throw new AppError(409, "INVALID_TRANSITION", `Cannot change a product from ${from} to ${to}`);
  }
}

/**
 * Changes the status with a conditional update, so two people acting at the same moment
 * (for example a seller withdrawing while an admin approves) cannot both win.
 */
export async function changeProductStatus(
  product: ProductDocument,
  to: ProductStatus,
  changes: { set?: Record<string, unknown>; unset?: string[] } = {},
): Promise<void> {
  assertProductTransition(product.status, to);

  const update: Record<string, Record<string, unknown>> = { $set: { status: to, ...changes.set } };
  if (changes.unset?.length) {
    update.$unset = Object.fromEntries(changes.unset.map((field) => [field, ""]));
  }

  const result = await Product.updateOne(
    { _id: product._id, status: product.status, deletedAt: null },
    update,
  );
  if (result.matchedCount === 0) {
    throw AppError.conflict("This product was changed by someone else. Refresh and try again.");
  }
}

/** Recalculates the denormalized price and stock numbers from the active variants. */
export async function refreshProductStats(
  productId: Types.ObjectId | string,
  session?: ClientSession,
): Promise<void> {
  const product = await Product.findById(productId).select("discountPercent").session(session ?? null);
  if (!product) return;

  const variants = await ProductVariant.find({ product: productId, isActive: true })
    .select("price stock")
    .session(session ?? null);

  await Product.updateOne(
    { _id: productId },
    { $set: calculateProductStats(variants, product.discountPercent) },
    { session },
  );
}

async function assertCategoryUsable(categoryId: string) {
  const category = await Category.findById(categoryId);
  const parent = category?.parent ? await Category.findById(category.parent) : null;

  if (!category || !category.isActive || (parent && !parent.isActive)) {
    throw AppError.badRequest("Choose an existing, active category");
  }
}

async function assertBrandUsable(brandId: string) {
  const brand = await Brand.findById(brandId);
  if (!brand || !brand.isActive) throw AppError.badRequest("Choose an existing, active brand");
}

/**
 * Images already on the product are kept exactly as stored (a client cannot swap their URL).
 * Any new image must have been uploaded through the marketplace into this seller's folder.
 */
function resolveImages(
  sellerId: string,
  current: IManagedImage[],
  requested: IManagedImage[],
): IManagedImage[] {
  const known = new Map(current.map((i) => [i.publicId, { url: i.url, publicId: i.publicId }]));

  return requested.map((image) => {
    const existing = known.get(image.publicId);
    if (existing) return existing;

    assertManagedImage(image, productImageFolder(sellerId));
    return { url: image.url, publicId: image.publicId };
  });
}

/** Puts option values in the product's option order, with the exact casing the option defines. */
function normalizeVariants(input: ProductInput): NormalizedVariant[] {
  return input.variants.map((variant) => {
    const optionValues = input.options.map((option) => {
      const entry = Object.entries(variant.optionValues).find(
        ([name]) => name.toLowerCase() === option.name.toLowerCase(),
      );
      if (!entry) throw AppError.badRequest(`Choose a value for ${option.name}`);

      const value = option.values.find((v) => v.toLowerCase() === entry[1].toLowerCase()) ?? entry[1];
      return { name: option.name, value };
    });

    return {
      id: variant.id,
      sku: variant.sku,
      price: variant.price,
      stock: variant.stock,
      optionValues,
      key: variantKey(optionValues),
    };
  });
}

/** A SKU may only belong to the variant it is being assigned to. */
async function assertSkusAvailable(
  sellerId: string,
  assignments: { sku: string; variantId?: string }[],
  session?: ClientSession,
) {
  const clashes = await ProductVariant.find({
    seller: sellerId,
    sku: { $in: assignments.map((a) => a.sku) },
  }).session(session ?? null);

  const targetBySku = new Map(assignments.map((a) => [a.sku, a.variantId]));
  const taken = clashes.filter((c) => targetBySku.get(c.sku) !== c.id).map((c) => c.sku);

  if (taken.length > 0) {
    throw AppError.conflict(`SKU already in use: ${taken.join(", ")}`, { skus: taken });
  }
}

async function generateProductSlug(name: string): Promise<string> {
  const base = slugify(name).slice(0, 50).replace(/-+$/g, "") || "product";

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const candidate = `${base}-${randomBytes(3).toString("hex")}`;
    if (!(await Product.exists({ slug: candidate }))) return candidate;
  }
  throw new Error("Could not generate a unique product slug");
}

async function findOwnedOrThrow(sellerId: string, productId: string): Promise<ProductDocument> {
  // Scoped to the seller: another seller's product is simply "not found".
  const product = await Product.findOne({ _id: productId, seller: sellerId, deletedAt: null });
  if (!product) throw AppError.notFound("Product not found");
  return product;
}

/* ------------------------------ seller actions ----------------------------- */

export async function listSellerProducts(sellerId: string, query: SellerProductListQuery) {
  const { page, limit, status, search } = query;

  const filter: Record<string, unknown> = { seller: sellerId, deletedAt: null };
  if (status) filter.status = status;
  if (search) filter.name = new RegExp(escapeRegex(search), "i");

  const [products, total] = await Promise.all([
    Product.find(filter).sort({ createdAt: -1 }).skip(getSkip(page, limit)).limit(limit),
    Product.countDocuments(filter),
  ]);

  return {
    items: await buildProductDTOs(products, { withVariants: false }),
    pagination: buildPaginationMeta(page, limit, total),
  };
}

export async function getSellerProduct(sellerId: string, productId: string): Promise<ProductDTO> {
  const product = await findOwnedOrThrow(sellerId, productId);
  const [dto] = await buildProductDTOs([product], { withVariants: true });
  return dto;
}

export async function createProduct(sellerId: string, input: ProductInput): Promise<ProductDTO> {
  if (input.variants.some((variant) => variant.id)) {
    throw AppError.badRequest("A new product cannot reference existing variants");
  }

  await assertCategoryUsable(input.category);
  if (input.brand) await assertBrandUsable(input.brand);

  const images = resolveImages(sellerId, [], input.images);
  const variants = normalizeVariants(input);
  await assertSkusAvailable(sellerId, variants);
  const slug = await generateProductSlug(input.name);

  const created = await runInTransaction(async (session) => {
    const [product] = await Product.create(
      [
        {
          seller: new Types.ObjectId(sellerId),
          name: input.name,
          slug,
          description: input.description,
          category: new Types.ObjectId(input.category),
          brand: input.brand ? new Types.ObjectId(input.brand) : undefined,
          images,
          specifications: input.specifications,
          options: input.options,
          discountPercent: input.discountPercent,
          lowStockThreshold: input.lowStockThreshold,
          status: "DRAFT",
          isSellerActive: true,
        },
      ],
      { session },
    );

    await ProductVariant.create(
      variants.map((variant) => ({
        product: product._id,
        seller: product.seller,
        sku: variant.sku,
        key: variant.key,
        optionValues: variant.optionValues,
        price: variant.price,
        stock: variant.stock ?? 0,
      })),
      { session, ordered: true },
    );

    await refreshProductStats(product._id, session);
    return product;
  });

  return getSellerProduct(sellerId, created.id);
}

/**
 * Replaces the editable parts of a product. The status does not change: a published
 * product stays live, a draft stays a draft. Existing variants are matched by id (or by
 * option combination), updated in place, and any variant left out is deactivated.
 * Stock of existing variants is deliberately NOT touched here (see the inventory endpoint).
 */
export async function updateProduct(
  sellerId: string,
  productId: string,
  input: ProductInput,
): Promise<ProductDTO> {
  const product = await findOwnedOrThrow(sellerId, productId);

  if (product.status === "PENDING_REVIEW") {
    throw AppError.conflict("Withdraw this product from review before editing it");
  }

  const nextBrand = input.brand ?? null;
  if (input.category !== product.category.toString()) await assertCategoryUsable(input.category);
  if (nextBrand && nextBrand !== product.brand?.toString()) await assertBrandUsable(nextBrand);

  const images = resolveImages(sellerId, product.images, input.images);
  const removedPublicIds = product.images
    .filter((old) => !images.some((image) => image.publicId === old.publicId))
    .map((old) => old.publicId);
  const incoming = normalizeVariants(input);

  await runInTransaction(async (session) => {
    const existing = await ProductVariant.find({ product: product._id }).session(session);
    const byId = new Map(existing.map((v) => [v.id, v]));
    const byKey = new Map(existing.map((v) => [v.key, v]));

    // 1. Decide which existing variant (if any) each incoming variant maps to.
    const used = new Set<string>();
    const plans = incoming.map((data) => {
      let target: VariantDocument | undefined;
      if (data.id) {
        target = byId.get(data.id);
        if (!target) throw AppError.badRequest("Unknown variant in request");
      } else {
        target = byKey.get(data.key);
      }
      if (target) {
        if (used.has(target.id)) throw AppError.badRequest("Two variants point at the same variant");
        used.add(target.id);
      }
      return { target, data };
    });

    await assertSkusAvailable(
      sellerId,
      plans.map(({ target, data }) => ({ sku: data.sku, variantId: target?.id })),
      session,
    );

    // 2. Apply: update matched variants, create new ones.
    const keepIds: Types.ObjectId[] = [];
    for (const { target, data } of plans) {
      if (target) {
        const wasInactive = !target.isActive;
        target.sku = data.sku;
        target.key = data.key;
        target.optionValues = data.optionValues;
        target.price = data.price;
        target.isActive = true;
        // A variant coming back from "removed" starts with the stock the seller just typed.
        if (wasInactive && data.stock !== undefined) target.stock = data.stock;
        await target.save({ session });
        keepIds.push(target._id);
      } else {
        const [created] = await ProductVariant.create(
          [
            {
              product: product._id,
              seller: product.seller,
              sku: data.sku,
              key: data.key,
              optionValues: data.optionValues,
              price: data.price,
              stock: data.stock ?? 0,
            },
          ],
          { session },
        );
        keepIds.push(created._id);
      }
    }

    // 3. Variants the seller left out are deactivated, never deleted.
    await ProductVariant.updateMany(
      { product: product._id, isActive: true, _id: { $nin: keepIds } },
      { $set: { isActive: false } },
      { session },
    );

    // 4. Product fields. The slug never changes.
    product.name = input.name;
    product.description = input.description;
    product.category = new Types.ObjectId(input.category);
    product.brand = nextBrand ? new Types.ObjectId(nextBrand) : undefined;
    product.images = images;
    product.specifications = input.specifications;
    product.options = input.options;
    product.discountPercent = input.discountPercent;
    product.lowStockThreshold = input.lowStockThreshold;
    await product.save({ session });

    await refreshProductStats(product._id, session);
  });

  await Promise.all(removedPublicIds.map((publicId) => deleteImageQuietly(publicId)));
  return getSellerProduct(sellerId, productId);
}

/** Soft delete: the record stays so order history keeps working. */
export async function deleteProduct(sellerId: string, productId: string): Promise<void> {
  const product = await findOwnedOrThrow(sellerId, productId);
  product.deletedAt = new Date();
  await product.save();
}

export async function submitProduct(sellerId: string, productId: string): Promise<ProductDTO> {
  const product = await findOwnedOrThrow(sellerId, productId);
  assertProductTransition(product.status, "PENDING_REVIEW");

  try {
    await assertCategoryUsable(product.category.toString());
    if (product.brand) await assertBrandUsable(product.brand.toString());
  } catch {
    throw AppError.conflict("The category or brand of this product is no longer available. Edit the product and choose another.");
  }

  await changeProductStatus(product, "PENDING_REVIEW", { unset: ["moderationReason"] });
  return getSellerProduct(sellerId, productId);
}

export async function withdrawProduct(sellerId: string, productId: string): Promise<ProductDTO> {
  const product = await findOwnedOrThrow(sellerId, productId);
  await changeProductStatus(product, "DRAFT");
  return getSellerProduct(sellerId, productId);
}