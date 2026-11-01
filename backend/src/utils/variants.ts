export type OptionValue = { name: string; value: string };

/**
 * A canonical string for a combination of option values, so "Black / M" and "black / m"
 * (in any order) are recognised as the same variant. A product without options uses "default".
 */
export function variantKey(optionValues: OptionValue[]): string {
  if (optionValues.length === 0) return "default";

  return [...optionValues]
    .sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()))
    .map((option) => `${option.name.toLowerCase()}=${option.value.toLowerCase()}`)
    .join("|");
}

export type StockStatus = "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";

export function getStockStatus(stock: number, lowStockThreshold: number): StockStatus {
  if (stock <= 0) return "OUT_OF_STOCK";
  if (stock <= lowStockThreshold) return "LOW_STOCK";
  return "IN_STOCK";
}