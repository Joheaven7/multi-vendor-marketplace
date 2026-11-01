import { Product } from "../models/Product";
import { Seller } from "../models/Seller";
import { AppError } from "../utils/AppError";
import { PUBLIC_BASE_FILTER, getActiveCategoryIds } from "./public-catalog";

export type StoreDTO = {
  id: string;
  storeName: string;
  slug: string;
  description?: string;
  logo?: { url: string };
  city: string;
  region: string;
  /** When the seller was approved (or applied, if that date is missing). */
  sellingSince: Date;
  productCount: number;
};

/** Only active sellers have a public store page. */
export async function getPublicStore(slug: string): Promise<StoreDTO> {
  const seller = await Seller.findOne({ slug, status: "ACTIVE" });
  if (!seller) throw AppError.notFound("Store not found");

  const categoryIds = await getActiveCategoryIds();
  const productCount = await Product.countDocuments({
    ...PUBLIC_BASE_FILTER,
    seller: seller._id,
    category: { $in: categoryIds },
  });

  return {
    id: seller.id,
    storeName: seller.storeName,
    slug: seller.slug,
    description: seller.description,
    logo: seller.logo ? { url: seller.logo.url } : undefined,
    city: seller.address.city,
    region: seller.address.region,
    sellingSince: seller.reviewedAt ?? seller.createdAt,
    productCount,
  };
}