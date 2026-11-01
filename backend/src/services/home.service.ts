import type { Types } from "mongoose";
import { Category } from "../models/Category";
import { Product } from "../models/Product";
import { Seller } from "../models/Seller";
import { PUBLIC_BASE_FILTER, buildProductCards, getActiveCategoryIds } from "./public-catalog";

const SECTION_SIZE = 8;
const TOP_STORES = 6;

/** Homepage content, all derived from live data (there is no manual "featured" list). */
export async function getHomeContent() {
  const categoryIds = await getActiveCategoryIds();
  const base = { ...PUBLIC_BASE_FILTER, category: { $in: categoryIds } };

  const [categories, newArrivals, deals, popular, storeRows] = await Promise.all([
    Category.find({ isActive: true, parent: null }).sort({ sortOrder: 1, name: 1 }).limit(8),
    Product.find(base).sort({ createdAt: -1, _id: -1 }).limit(SECTION_SIZE),
    Product.find({ ...base, discountPercent: { $gt: 0 } })
      .sort({ discountPercent: -1, createdAt: -1 })
      .limit(SECTION_SIZE),
    Product.find(base).sort({ soldCount: -1, ratingAverage: -1, createdAt: -1 }).limit(SECTION_SIZE),
    Product.aggregate<{ _id: Types.ObjectId; count: number }>([
      { $match: base as Record<string, unknown> },
      { $group: { _id: "$seller", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: TOP_STORES },
    ]),
  ]);

  const sellers = await Seller.find({
    _id: { $in: storeRows.map((row) => row._id) },
    status: "ACTIVE",
  });
  const sellerById = new Map(sellers.map((seller) => [seller.id, seller]));

  const [newCards, dealCards, popularCards] = await Promise.all([
    buildProductCards(newArrivals),
    buildProductCards(deals),
    buildProductCards(popular),
  ]);

  return {
    categories: categories.map((category) => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
      image: category.image ? { url: category.image.url } : undefined,
    })),
    newArrivals: newCards,
    deals: dealCards,
    popular: popularCards,
    topStores: storeRows.flatMap((row) => {
      const seller = sellerById.get(row._id.toString());
      if (!seller) return [];
      return [
        {
          id: seller.id,
          storeName: seller.storeName,
          slug: seller.slug,
          description: seller.description,
          logo: seller.logo ? { url: seller.logo.url } : undefined,
          city: seller.address.city,
          productCount: row.count,
        },
      ];
    }),
  };
}