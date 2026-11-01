import type { HydratedDocument, PipelineStage, Types } from "mongoose";
import { Brand } from "../models/Brand";
import { Category } from "../models/Category";
import { Product, type IProduct } from "../models/Product";
import { ProductVariant } from "../models/ProductVariant";
import { Seller } from "../models/Seller";
import type { PublicProductQuery } from "../validators/public.validator";
import { AppError } from "../utils/AppError";
import { buildPaginationMeta, escapeRegex, getSkip } from "../utils/pagination";
import { calculateFinalPrice } from "../utils/pricing";
import {
  PUBLIC_BASE_FILTER,
  buildProductCards,
  getActiveCategoryIds,
  type ProductCardDTO,
} from "./public-catalog";

type ProductDocument = HydratedDocument<IProduct>;
type Filter = Record<string, unknown>;

const MAX_BRAND_FILTERS = 10;
const MAX_QUANTITY_PER_ORDER = 10;
const RELATED_LIMIT = 8;

const match = (filter: Filter): PipelineStage => ({
  $match: filter as PipelineStage.Match["$match"],
});

/* --------------------------------- listing -------------------------------- */

type Context = {
  categoryIds: Types.ObjectId[];
  brandIds?: Types.ObjectId[];
  sellerId?: Types.ObjectId;
  /** True when the search term matches through the text index, false for the "contains" fallback. */
  textMode: boolean;
};

const SORTS = {
  newest: { createdAt: -1, _id: -1 },
  price_asc: { minFinalPrice: 1, _id: 1 },
  price_desc: { minFinalPrice: -1, _id: -1 },
  rated: { ratingAverage: -1, ratingCount: -1, _id: -1 },
  popular: { soldCount: -1, _id: -1 },
} as const;

/** Turns slugs from the URL into database ids. Returns null if a filter points at nothing. */
async function resolveContext(query: PublicProductQuery): Promise<Context | null> {
  const active = await getActiveCategoryIds();
  let categoryIds = active;

  if (query.category) {
    const category = await Category.findOne({ slug: query.category });
    if (!category) return null;

    const family = [category._id];
    if (!category.parent) {
      const children = await Category.find({ parent: category._id }).select("_id");
      family.push(...children.map((child) => child._id));
    }

    const activeSet = new Set(active.map((id) => id.toString()));
    categoryIds = family.filter((id) => activeSet.has(id.toString()));
    if (categoryIds.length === 0) return null;
  }

  let brandIds: Types.ObjectId[] | undefined;
  if (query.brand) {
    const slugs = [...new Set(query.brand.split(",").map((s) => s.trim()).filter(Boolean))].slice(
      0,
      MAX_BRAND_FILTERS,
    );
    const brands = await Brand.find({ slug: { $in: slugs }, isActive: true }).select("_id");
    if (brands.length === 0) return null;
    brandIds = brands.map((brand) => brand._id);
  }

  let sellerId: Types.ObjectId | undefined;
  if (query.seller) {
    const seller = await Seller.findOne({ slug: query.seller, status: "ACTIVE" }).select("_id");
    if (!seller) return null;
    sellerId = seller._id;
  }

  // Use the text index if it finds anything at all, otherwise fall back to "name contains",
  // so a partial word such as "sneak" still finds "Sneakers".
  let textMode = false;
  if (query.q) {
    textMode = !!(await Product.exists({
      ...PUBLIC_BASE_FILTER,
      category: { $in: categoryIds },
      $text: { $search: query.q },
    }));
  }

  return { categoryIds, brandIds, sellerId, textMode };
}

function buildFilter(
  query: PublicProductQuery,
  ctx: Context,
  omit: { brand?: boolean; price?: boolean } = {},
): Filter {
  const filter: Filter = { ...PUBLIC_BASE_FILTER, category: { $in: ctx.categoryIds } };

  if (ctx.sellerId) filter.seller = ctx.sellerId;
  if (ctx.brandIds && !omit.brand) filter.brand = { $in: ctx.brandIds };

  if (!omit.price && (query.minPrice !== undefined || query.maxPrice !== undefined)) {
    filter.minFinalPrice = {
      ...(query.minPrice !== undefined ? { $gte: query.minPrice } : {}),
      ...(query.maxPrice !== undefined ? { $lte: query.maxPrice } : {}),
    };
  }
  if (query.rating !== undefined) filter.ratingAverage = { $gte: query.rating };
  if (query.inStock) filter.totalStock = { $gt: 0 };
  if (query.discount) filter.discountPercent = { $gt: 0 };

  if (query.q) {
    if (ctx.textMode) filter.$text = { $search: query.q };
    else filter.name = new RegExp(escapeRegex(query.q), "i");
  }
  return filter;
}

export type ListingFacets = {
  brands: { id: string; name: string; slug: string; count: number }[];
  priceRange: { min: number; max: number };
};

/**
 * Filter options for the current results. Each facet ignores its own filter, so choosing
 * a brand does not make the other brands disappear.
 */
async function buildFacets(query: PublicProductQuery, ctx: Context): Promise<ListingFacets> {
  const [brandRows, priceRows] = await Promise.all([
    Product.aggregate<{ _id: Types.ObjectId | null; count: number }>([
      match(buildFilter(query, ctx, { brand: true })),
      { $group: { _id: "$brand", count: { $sum: 1 } } },
    ]),
    Product.aggregate<{ min: number; max: number }>([
      match(buildFilter(query, ctx, { price: true })),
      { $group: { _id: null, min: { $min: "$minFinalPrice" }, max: { $max: "$minFinalPrice" } } },
    ]),
  ]);

  const counts = new Map<string, number>();
  for (const row of brandRows) if (row._id) counts.set(row._id.toString(), row.count);
  // Brands the visitor has already selected stay in the list, even with a count of 0.
  for (const id of ctx.brandIds ?? []) if (!counts.has(id.toString())) counts.set(id.toString(), 0);

  const brands = await Brand.find({ _id: { $in: [...counts.keys()] }, isActive: true }).select("name slug");

  return {
    brands: brands
      .map((brand) => ({ id: brand.id, name: brand.name, slug: brand.slug, count: counts.get(brand.id) ?? 0 }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
    priceRange: { min: priceRows[0]?.min ?? 0, max: priceRows[0]?.max ?? 0 },
  };
}

export async function listPublicProducts(query: PublicProductQuery) {
  const { page, limit } = query;
  const ctx = await resolveContext(query);

  if (!ctx) {
    return {
      items: [] as ProductCardDTO[],
      pagination: buildPaginationMeta(page, limit, 0),
      facets: { brands: [], priceRange: { min: 0, max: 0 } } satisfies ListingFacets,
    };
  }

  const filter = buildFilter(query, ctx);
  const requested = query.sort ?? (query.q ? "relevance" : "newest");
  const byScore = requested === "relevance" && ctx.textMode;
  const sortKey = requested === "relevance" ? "newest" : requested;

  const find = Product.find(filter, byScore ? { score: { $meta: "textScore" } } : undefined);
  const sorted = byScore ? find.sort({ score: { $meta: "textScore" }, _id: -1 }) : find.sort(SORTS[sortKey]);

  const [products, total, facets] = await Promise.all([
    sorted.skip(getSkip(page, limit)).limit(limit),
    Product.countDocuments(filter),
    buildFacets(query, ctx),
  ]);

  return {
    items: await buildProductCards(products),
    pagination: buildPaginationMeta(page, limit, total),
    facets,
  };
}

/* --------------------------------- detail --------------------------------- */

export type ProductDetailDTO = {
  id: string;
  slug: string;
  name: string;
  description: string;
  images: { url: string }[];
  specifications: { label: string; value: string }[];
  options: { name: string; values: string[] }[];
  discountPercent: number;
  minPrice: number;
  maxPrice: number;
  minFinalPrice: number;
  ratingAverage: number;
  ratingCount: number;
  brand: { name: string; slug: string } | null;
  seller: { storeName: string; slug: string; city: string; region: string };
  /** From the top-level category down to the product's own category. */
  categoryTrail: { name: string; slug: string }[];
  variants: {
    id: string;
    optionValues: { name: string; value: string }[];
    price: number;
    finalPrice: number;
    inStock: boolean;
    /** How many can be ordered at once: the stock, capped at 10. */
    maxQuantity: number;
    /** Set only when stock is running low ("Only 3 left"). */
    stockLeft?: number;
  }[];
  related: ProductCardDTO[];
  createdAt: Date;
};

async function findRelated(
  product: ProductDocument,
  activeCategoryIds: Types.ObjectId[],
): Promise<ProductCardDTO[]> {
  const base = { ...PUBLIC_BASE_FILTER, _id: { $ne: product._id } };
  const order = { soldCount: -1, createdAt: -1 } as const;

  const sameCategory = await Product.find({ ...base, category: product.category })
    .sort(order)
    .limit(RELATED_LIMIT);
  let related = sameCategory;

  if (sameCategory.length < RELATED_LIMIT) {
    const category = await Category.findById(product.category).select("parent");
    const rootId = category?.parent ?? category?._id;
    const family = await Category.find({ $or: [{ _id: rootId }, { parent: rootId }] }).select("_id");

    const active = new Set(activeCategoryIds.map((id) => id.toString()));
    const familyIds = family
      .map((c) => c._id)
      .filter((id) => active.has(id.toString()) && !id.equals(product.category));

    if (familyIds.length > 0) {
      const more = await Product.find({ ...base, category: { $in: familyIds } })
        .sort(order)
        .limit(RELATED_LIMIT - sameCategory.length);
      related = [...sameCategory, ...more];
    }
  }

  return buildProductCards(related);
}

export async function getPublicProduct(slug: string): Promise<ProductDetailDTO> {
  const product = await Product.findOne({ slug, ...PUBLIC_BASE_FILTER });
  if (!product) throw AppError.notFound("Product not found");

  const activeCategoryIds = await getActiveCategoryIds();
  if (!activeCategoryIds.some((id) => id.equals(product.category))) {
    throw AppError.notFound("Product not found");
  }

  const [seller, category, brand, variants] = await Promise.all([
    Seller.findById(product.seller).select("storeName slug status address"),
    Category.findById(product.category).select("name slug parent"),
    product.brand ? Brand.findById(product.brand).select("name slug") : null,
    ProductVariant.find({ product: product._id, isActive: true }).sort({ createdAt: 1, _id: 1 }),
  ]);

  if (!seller || seller.status !== "ACTIVE" || !category) throw AppError.notFound("Product not found");

  const parent = category.parent ? await Category.findById(category.parent).select("name slug") : null;

  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    description: product.description,
    images: product.images.map((image) => ({ url: image.url })),
    specifications: product.specifications.map((s) => ({ label: s.label, value: s.value })),
    options: product.options.map((o) => ({ name: o.name, values: [...o.values] })),
    discountPercent: product.discountPercent,
    minPrice: product.minPrice,
    maxPrice: product.maxPrice,
    minFinalPrice: product.minFinalPrice,
    ratingAverage: product.ratingAverage,
    ratingCount: product.ratingCount,
    brand: brand ? { name: brand.name, slug: brand.slug } : null,
    seller: {
      storeName: seller.storeName,
      slug: seller.slug,
      city: seller.address.city,
      region: seller.address.region,
    },
    categoryTrail: [parent, category]
      .filter((c): c is NonNullable<typeof c> => c !== null)
      .map((c) => ({ name: c.name, slug: c.slug })),
    variants: variants.map((variant) => ({
      id: variant.id,
      optionValues: variant.optionValues.map((o) => ({ name: o.name, value: o.value })),
      price: variant.price,
      finalPrice: calculateFinalPrice(variant.price, product.discountPercent),
      inStock: variant.stock > 0,
      maxQuantity: Math.min(variant.stock, MAX_QUANTITY_PER_ORDER),
      stockLeft:
        variant.stock > 0 && variant.stock <= product.lowStockThreshold ? variant.stock : undefined,
    })),
    related: await findRelated(product, activeCategoryIds),
    createdAt: product.createdAt,
  };
}