import { describe, expect, it } from "vitest";
import { calculateFinalPrice, calculateProductStats } from "./pricing";
import { getStockStatus, variantKey } from "./variants";

describe("calculateFinalPrice", () => {
  it("applies the discount and rounds to whole ETB", () => {
    expect(calculateFinalPrice(2000, 10)).toBe(1800);
    expect(calculateFinalPrice(2000, 0)).toBe(2000);
    expect(calculateFinalPrice(999, 15)).toBe(849);
    expect(calculateFinalPrice(1001, 50)).toBe(501);
    expect(Number.isInteger(calculateFinalPrice(777, 33))).toBe(true);
  });
});

describe("calculateProductStats", () => {
  it("summarises prices and stock across variants", () => {
    const stats = calculateProductStats(
      [
        { price: 2000, stock: 5 },
        { price: 2500, stock: 3 },
      ],
      10,
    );
    expect(stats).toEqual({ minPrice: 2000, maxPrice: 2500, minFinalPrice: 1800, totalStock: 8 });
  });

  it("returns zeros when there are no variants", () => {
    expect(calculateProductStats([], 10)).toEqual({
      minPrice: 0,
      maxPrice: 0,
      minFinalPrice: 0,
      totalStock: 0,
    });
  });
});

describe("variantKey", () => {
  it("ignores order and letter case", () => {
    const a = variantKey([
      { name: "Color", value: "Black" },
      { name: "Size", value: "M" },
    ]);
    const b = variantKey([
      { name: "size", value: "m" },
      { name: "COLOR", value: "BLACK" },
    ]);
    expect(a).toBe(b);
  });

  it("uses 'default' for products without options", () => {
    expect(variantKey([])).toBe("default");
  });
});

describe("getStockStatus", () => {
  it("classifies stock against the threshold", () => {
    expect(getStockStatus(0, 5)).toBe("OUT_OF_STOCK");
    expect(getStockStatus(5, 5)).toBe("LOW_STOCK");
    expect(getStockStatus(6, 5)).toBe("IN_STOCK");
  });
});