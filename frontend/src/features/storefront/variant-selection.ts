import type { PublicVariant } from "./detail-types";

/** The visitor's choice per option, e.g. { Color: "Black", Size: "M" }. */
export type Selection = Record<string, string>;

type Option = { name: string; values: string[] };

const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

function matches(variant: PublicVariant, selection: Selection): boolean {
  return Object.entries(selection).every(([name, value]) =>
    variant.optionValues.some((o) => same(o.name, name) && same(o.value, value)),
  );
}

const toSelection = (variant: PublicVariant): Selection =>
  Object.fromEntries(variant.optionValues.map((o) => [o.name, o.value]));

/** Start on the first variant that is in stock, so a price and availability show straight away. */
export function initialSelection(variants: PublicVariant[]): Selection {
  const first = variants.find((v) => v.inStock) ?? variants[0];
  return first ? toSelection(first) : {};
}

/** The variant for the current selection (the only variant for products without options). */
export function findVariant(
  variants: PublicVariant[],
  options: Option[],
  selection: Selection,
): PublicVariant | undefined {
  if (options.length === 0) return variants[0];
  if (options.some((option) => !selection[option.name])) return undefined;
  return variants.find((variant) => matches(variant, selection));
}

/** True if choosing `value` (keeping the other choices) gives a variant that is in stock. */
export function isValueAvailable(
  variants: PublicVariant[],
  selection: Selection,
  name: string,
  value: string,
): boolean {
  const candidate = { ...selection, [name]: value };
  return variants.some((variant) => variant.inStock && matches(variant, candidate));
}

/**
 * Picks a value. If that exact combination does not exist, the other options jump to the
 * closest variant that has the value (preferring one that is in stock).
 */
export function selectValue(
  variants: PublicVariant[],
  selection: Selection,
  name: string,
  value: string,
): Selection {
  const next = { ...selection, [name]: value };
  if (variants.some((variant) => matches(variant, next))) return next;

  const only = { [name]: value };
  const fallback = variants.find((v) => v.inStock && matches(v, only)) ?? variants.find((v) => matches(v, only));
  return fallback ? toSelection(fallback) : next;
}