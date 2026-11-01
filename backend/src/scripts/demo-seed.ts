import type { HydratedDocument, Types } from "mongoose";
import { Brand } from "../models/Brand";
import { Category } from "../models/Category";
import { Product } from "../models/Product";
import { ProductVariant } from "../models/ProductVariant";
import { Seller, type ISeller } from "../models/Seller";
import { User, type Role } from "../models/User";
import { hashPassword } from "../utils/password";
import { calculateProductStats } from "../utils/pricing";
import { slugify } from "../utils/slug";
import { variantKey } from "../utils/variants";
import {
  DEMO_BRANDS,
  DEMO_CATEGORIES,
  DEMO_CUSTOMER,
  DEMO_PASSWORD,
  DEMO_PRODUCTS,
  DEMO_SELLERS,
  demoImages,
  DEMO_METRICS,
} from "./demo-data";

export type SeedCounts = {
  categories: number;
  brands: number;
  users: number;
  sellers: number;
  products: number;
};

/**
 * Creates the demo catalogue, accounts and products. Safe to run again: anything that
 * already exists (matched by slug or email) is left untouched.
 * It never connects to the database itself, so tests can run it too.
 */
export async function seedDemoData(): Promise<SeedCounts> {
  const created: SeedCounts = { categories: 0, brands: 0, users: 0, sellers: 0, products: 0 };

  /* ------------------------------- categories ------------------------------- */
  const categoryIds = new Map<string, Types.ObjectId>();

  const ensureCategory = async (slug: string, name: string, parent: Types.ObjectId | null, sortOrder: number) => {
    let category = await Category.findOne({ slug });
    if (!category) {
      category = await Category.create({ slug, name, parent, sortOrder });
      created.categories += 1;
    }
    categoryIds.set(slug, category._id);
    return category;
  };

  for (const [topIndex, top] of DEMO_CATEGORIES.entries()) {
    const parent = await ensureCategory(top.slug, top.name, null, topIndex + 1);
    for (const [childIndex, child] of top.children.entries()) {
      await ensureCategory(child.slug, child.name, parent._id, childIndex + 1);
    }
  }

  /* --------------------------------- brands --------------------------------- */
  const brandIds = new Map<string, Types.ObjectId>();

  for (const brand of DEMO_BRANDS) {
    let doc = await Brand.findOne({ slug: brand.slug });
    if (!doc) {
      doc = await Brand.create(brand);
      created.brands += 1;
    }
    brandIds.set(brand.slug, doc._id);
  }

  /* ---------------------------------- users --------------------------------- */
  const passwordHash = await hashPassword(DEMO_PASSWORD);

  const ensureUser = async (name: string, email: string, role: Role) => {
    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({ name, email, passwordHash, role });
      created.users += 1;
    }
    return user;
  };

  await ensureUser(DEMO_CUSTOMER.name, DEMO_CUSTOMER.email, "CUSTOMER");

  /* --------------------------------- sellers -------------------------------- */
  const admin = await User.findOne({ role: "ADMIN" }).select("_id");
  const sellers = new Map<string, HydratedDocument<ISeller>>();

  for (const def of DEMO_SELLERS) {
    const owner = await ensureUser(def.owner.name, def.owner.email, def.status === "ACTIVE" ? "SELLER" : "CUSTOMER");

    let seller = await Seller.findOne({ user: owner._id });
    if (!seller) {
      seller = await Seller.create({
        user: owner._id,
        storeName: def.storeName,
        slug: slugify(def.storeName),
        description: def.description,
        businessName: def.businessName,
        phone: def.phone,
        tinNumber: def.tinNumber,
        address: def.address,
        status: def.status,
        ...(def.status === "ACTIVE" ? { reviewedBy: admin?._id, reviewedAt: new Date() } : {}),
      });
      created.sellers += 1;
    }
    sellers.set(def.key, seller);
  }

  /* -------------------------------- products -------------------------------- */
  for (const def of DEMO_PRODUCTS) {
    const slug = slugify(def.name);
    if (await Product.exists({ slug })) continue;

    const seller = sellers.get(def.seller);
    const category = categoryIds.get(def.category);
    const brand = def.brand ? brandIds.get(def.brand) : undefined;
    if (!seller || !category || (def.brand && !brand)) {
      throw new Error(`Demo product "${def.name}" references an unknown seller, category or brand`);
    }

    const moderated = def.status === "PUBLISHED" || def.status === "REJECTED";

    const product = await Product.create({
      seller: seller._id,
      name: def.name,
      slug,
      description: def.description,
      category,
      brand,
      images: demoImages(def.name),
      specifications: def.specifications,
      options: def.options,
      discountPercent: def.discountPercent,
      lowStockThreshold: def.lowStockThreshold,
      status: def.status,
      moderationReason: def.moderationReason,
      ...(moderated ? { moderatedBy: admin?._id, moderatedAt: new Date() } : {}),
      isSellerActive: seller.status === "ACTIVE",
            ratingAverage: DEMO_METRICS[slug]?.rating ?? 0,
      ratingCount: DEMO_METRICS[slug]?.reviews ?? 0,
      soldCount: DEMO_METRICS[slug]?.sold ?? 0,
      ...calculateProductStats(def.variants, def.discountPercent),
    });

    await ProductVariant.create(
      def.variants.map((variant) => {
        const optionValues = Object.entries(variant.optionValues).map(([name, value]) => ({ name, value }));
        return {
          product: product._id,
          seller: seller._id,
          sku: variant.sku,
          key: variantKey(optionValues),
          optionValues,
          price: variant.price,
          stock: variant.stock,
        };
      }),
    );
    created.products += 1;
  }

  return created;
}

/**
 * Removes the demo accounts and everything they own (sellers, products, variants).
 * Categories and brands are kept: they are harmless and other data may use them.
 */
export async function resetDemoData() {
  const emails = [DEMO_CUSTOMER.email, ...DEMO_SELLERS.map((seller) => seller.owner.email)];

  const users = await User.find({ email: { $in: emails } }).select("_id");
  const userIds = users.map((user) => user._id);

  const sellers = await Seller.find({ user: { $in: userIds } }).select("_id");
  const sellerIds = sellers.map((seller) => seller._id);

  const variants = await ProductVariant.deleteMany({ seller: { $in: sellerIds } });
  const products = await Product.deleteMany({ seller: { $in: sellerIds } });
  await Seller.deleteMany({ _id: { $in: sellerIds } });
  await User.deleteMany({ _id: { $in: userIds } });

  return {
    users: userIds.length,
    sellers: sellerIds.length,
    products: products.deletedCount,
    variants: variants.deletedCount,
  };
}