/**
 * The URL is the single source of truth for what the shop shows:
 * /shop?category=men&brand=nike,adidas&minPrice=1000&sort=price_asc&page=2
 * These helpers convert between the URL and a typed filter object.
 */

export const SORT_VALUES = ["relevance", "newest", "price_asc", "price_desc", "rated", "popular"] as const;
export type SortValue = (typeof SORT_VALUES)[number];

export const SORT_LABELS: Record<SortValue, string> = {
  relevance: "Most relevant",
  newest: "Newest",
  price_asc: "Price: low to high",
  price_desc: "Price: high to low",
  rated: "Top rated",
  popular: "Most popular",
};

export const PAGE_SIZE = 12;

export type ListingFilters = {
  q: string;
  category: string;
  brands: string[];
  minPrice: string;
  maxPrice: string;
  rating: string;
  inStock: boolean;
  discount: boolean;
  sort: SortValue;
  page: number;
};

/** Search results start with the best match, everything else with the newest. */
export function defaultSort(q: string): SortValue {
  return q ? "relevance" : "newest";
}

export const EMPTY_FILTERS: ListingFilters = {
  q: "",
  category: "",
  brands: [],
  minPrice: "",
  maxPrice: "",
  rating: "",
  inStock: false,
  discount: false,
  sort: "newest",
  page: 1,
};

const isFlag = (value: string | null) => value === "1" || value === "true";
const digits = (value: string | null) => (value && /^\d{1,9}$/.test(value) ? value : "");

/** Reads the URL. Anything invalid is ignored rather than breaking the page. */
export function parseFilters(params: URLSearchParams): ListingFilters {
  const q = (params.get("q") ?? "").trim().slice(0, 80);

  const sortParam = params.get("sort") as SortValue | null;
  const sortIsValid = sortParam !== null && SORT_VALUES.includes(sortParam) && (sortParam !== "relevance" || q !== "");

  const rating = params.get("rating");
  const page = Number.parseInt(params.get("page") ?? "1", 10);

  return {
    q,
    category: (params.get("category") ?? "").toLowerCase().replace(/[^a-z0-9-]/g, ""),
    brands: [
      ...new Set(
        params
          .getAll("brand")
          .flatMap((value) => value.split(","))
          .map((slug) => slug.trim().toLowerCase())
          .filter(Boolean),
      ),
    ].slice(0, 10),
    minPrice: digits(params.get("minPrice")),
    maxPrice: digits(params.get("maxPrice")),
    rating: rating && /^[1-5]$/.test(rating) ? rating : "",
    inStock: isFlag(params.get("inStock")),
    discount: isFlag(params.get("discount")),
    sort: sortIsValid ? sortParam : defaultSort(q),
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}

/** Writes the URL (and the API query, which uses the same names). Defaults are left out. */
export function toSearchParams(filters: ListingFilters, options: { omitCategory?: boolean } = {}): URLSearchParams {
  const params = new URLSearchParams();

  if (filters.q) params.set("q", filters.q);
  if (filters.category && !options.omitCategory) params.set("category", filters.category);
  if (filters.brands.length > 0) params.set("brand", filters.brands.join(","));
  if (filters.minPrice) params.set("minPrice", filters.minPrice);
  if (filters.maxPrice) params.set("maxPrice", filters.maxPrice);
  if (filters.rating) params.set("rating", filters.rating);
  if (filters.inStock) params.set("inStock", "1");
  if (filters.discount) params.set("discount", "1");
  if (filters.sort !== defaultSort(filters.q)) params.set("sort", filters.sort);
  if (filters.page > 1) params.set("page", String(filters.page));

  return params;
}

/** How many filters the visitor has applied (not counting the search term or category). */
export function activeFilterCount(filters: ListingFilters): number {
  return (
    filters.brands.length +
    (filters.minPrice || filters.maxPrice ? 1 : 0) +
    (filters.rating ? 1 : 0) +
    (filters.inStock ? 1 : 0) +
    (filters.discount ? 1 : 0)
  );
}