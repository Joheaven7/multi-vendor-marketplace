/** Prices are whole ETB. The final price is rounded to the nearest whole ETB. */
export function calculateFinalPrice(price: number, discountPercent: number): number {
  return Math.round((price * (100 - discountPercent)) / 100);
}

export type ProductStats = {
  minPrice: number;
  maxPrice: number;
  minFinalPrice: number;
  totalStock: number;
};

/** The denormalized numbers stored on a product, calculated from its active variants. */
export function calculateProductStats(
  variants: { price: number; stock: number }[],
  discountPercent: number,
): ProductStats {
  if (variants.length === 0) {
    return { minPrice: 0, maxPrice: 0, minFinalPrice: 0, totalStock: 0 };
  }

  const prices = variants.map((variant) => variant.price);
  const minPrice = Math.min(...prices);

  return {
    minPrice,
    maxPrice: Math.max(...prices),
    minFinalPrice: calculateFinalPrice(minPrice, discountPercent),
    totalStock: variants.reduce((sum, variant) => sum + variant.stock, 0),
  };
}