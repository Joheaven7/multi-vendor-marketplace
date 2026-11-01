import type { HydratedDocument } from "mongoose";
import { Brand } from "../models/Brand";
import { Category } from "../models/Category";
import type { IManagedImage } from "../models/image.schema";
import type { IProduct, IProductOption, ISpecification, ProductStatus } from "../models/Product";
import { ProductVariant, type IProductVariant } from "../models/ProductVariant";
import { calculateFinalPrice } from "../utils/pricing";
import { getStockStatus, type StockStatus } from "../utils/variants";

export type ProductDocument = HydratedDocument<IProduct>;
type VariantDocument = HydratedDocument<IProductVariant>;

export type VariantDTO = {
  id: string;
  sku: string;
  optionValues: { name: string; value: string }[];
  price: number;
  finalPrice: number;
  stock: number;
  stockStatus: StockStatus;
};

export type ProductDTO = {
  id: string;
  sellerId: string;
  name: string;
  slug: string;
  description: string;
  categoryId: string;
  categoryName: string | null;
  brandId: string | null;
  brandName: string | null;
  images: IManagedImage[];
  specifications: ISpecification[];
  options: IProductOption[];
  discountPercent: number;
  lowStockThreshold: number;
  status: ProductStatus;
  moderationReason?: string;
  moderatedAt?: Date;
  isSellerActive: boolean;
  minPrice: number;
  maxPrice: number;
  minFinalPrice: number;
  totalStock: number;
  createdAt: Date;
  updatedAt: Date;
  /** Only present when requested. Contains active variants only. */
  variants?: VariantDTO[];
};

function toVariantDTO(
  variant: VariantDocument,
  product: { discountPercent: number; lowStockThreshold: number },
): VariantDTO {
  return {
    id: variant.id,
    sku: variant.sku,
    optionValues: variant.optionValues.map((o) => ({ name: o.name, value: o.value })),
    price: variant.price,
    finalPrice: calculateFinalPrice(variant.price, product.discountPercent),
    stock: variant.stock,
    stockStatus: getStockStatus(variant.stock, product.lowStockThreshold),
  };
}

/** Converts product documents to API objects, loading category/brand names (and variants) in bulk. */
export async function buildProductDTOs(
  products: ProductDocument[],
  { withVariants }: { withVariants: boolean },
): Promise<ProductDTO[]> {
  if (products.length === 0) return [];

  const categoryIds = [...new Set(products.map((p) => p.category.toString()))];
  const brandIds = [...new Set(products.flatMap((p) => (p.brand ? [p.brand.toString()] : [])))];

  const [categories, brands, variants] = await Promise.all([
    Category.find({ _id: { $in: categoryIds } }).select("name"),
    Brand.find({ _id: { $in: brandIds } }).select("name"),
    withVariants
      ? ProductVariant.find({ product: { $in: products.map((p) => p._id) }, isActive: true }).sort({
          createdAt: 1,
          _id: 1,
        })
      : Promise.resolve<VariantDocument[]>([]),
  ]);

  const categoryNames = new Map(categories.map((c) => [c.id, c.name]));
  const brandNames = new Map(brands.map((b) => [b.id, b.name]));
  const variantsByProduct = new Map<string, VariantDocument[]>();
  for (const variant of variants) {
    const key = variant.product.toString();
    variantsByProduct.set(key, [...(variantsByProduct.get(key) ?? []), variant]);
  }

  return products.map((product) => ({
    id: product.id,
    sellerId: product.seller.toString(),
    name: product.name,
    slug: product.slug,
    description: product.description,
    categoryId: product.category.toString(),
    categoryName: categoryNames.get(product.category.toString()) ?? null,
    brandId: product.brand ? product.brand.toString() : null,
    brandName: product.brand ? (brandNames.get(product.brand.toString()) ?? null) : null,
    images: product.images.map((i) => ({ url: i.url, publicId: i.publicId })),
    specifications: product.specifications.map((s) => ({ label: s.label, value: s.value })),
    options: product.options.map((o) => ({ name: o.name, values: [...o.values] })),
    discountPercent: product.discountPercent,
    lowStockThreshold: product.lowStockThreshold,
    status: product.status,
    moderationReason: product.moderationReason,
    moderatedAt: product.moderatedAt,
    isSellerActive: product.isSellerActive,
    minPrice: product.minPrice,
    maxPrice: product.maxPrice,
    minFinalPrice: product.minFinalPrice,
    totalStock: product.totalStock,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
    variants: withVariants
      ? (variantsByProduct.get(product.id) ?? []).map((v) => toVariantDTO(v, product))
      : undefined,
  }));
}