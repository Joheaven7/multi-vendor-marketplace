import type { ManagedImage, Product, ProductInput } from "./types";

export type OptionDraft = {
  uid: string;
  name: string;
  values: string[];
  /** Options that already exist on a saved product keep their name. Values can still change. */
  locked: boolean;
};

export type VariantDraft = {
  /** Canonical option combination, e.g. "color=black|size=m". "default" for simple products. */
  key: string;
  id?: string;
  sku: string;
  price: string;
  stock: string;
  optionValues: Record<string, string>;
};

export type FormSections = {
  images: ManagedImage[];
  hasOptions: boolean;
  options: OptionDraft[];
  variants: VariantDraft[];
};

export type VariantErrors = { sku?: string; price?: string; stock?: string; options?: string };

export type SectionErrors = {
  images?: string;
  options?: string;
  optionNames?: Record<string, string>;
  optionValues?: Record<string, string>;
  variants?: Record<number, VariantErrors>;
  variantsGeneral?: string;
};

export const MAX_IMAGES = 8;
export const MAX_OPTIONS = 3;
export const MAX_OPTION_VALUES = 10;
const SKU_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{2,39}$/;

let counter = 0;
export const nextUid = () => `opt-${++counter}`;

export function comboKey(values: { name: string; value: string }[]): string {
  if (values.length === 0) return "default";
  return [...values]
    .sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()))
    .map((v) => `${v.name.trim().toLowerCase()}=${v.value.trim().toLowerCase()}`)
    .join("|");
}

export const blankVariant = (): VariantDraft => ({
  key: "default",
  sku: "",
  price: "",
  stock: "0",
  optionValues: {},
});

export function blankFormSections(): FormSections {
  return { images: [], hasOptions: false, options: [], variants: [blankVariant()] };
}

export function toFormSections(product: Product): FormSections {
  const options: OptionDraft[] = product.options.map((o) => ({
    uid: nextUid(),
    name: o.name,
    values: [...o.values],
    locked: true,
  }));

  const variants: VariantDraft[] = (product.variants ?? []).map((v) => ({
    key: comboKey(v.optionValues),
    id: v.id,
    sku: v.sku,
    price: String(v.price),
    stock: String(v.stock),
    optionValues: Object.fromEntries(v.optionValues.map((o) => [o.name, o.value])),
  }));

  return {
    images: product.images.map((i) => ({ url: i.url, publicId: i.publicId })),
    hasOptions: options.length > 0,
    options,
    variants: variants.length > 0 ? variants : [blankVariant()],
  };
}

/** Every combination of the option values, e.g. Color x Size. */
export function combinations(options: OptionDraft[]): Record<string, string>[] {
  const usable = options.filter((o) => o.name.trim() && o.values.length > 0);
  if (usable.length === 0) return [];

  return usable.reduce<Record<string, string>[]>(
    (rows, option) =>
      rows.flatMap((row) => option.values.map((value) => ({ ...row, [option.name.trim()]: value }))),
    [{}],
  );
}

/** Rebuilds the variant rows after the options changed, keeping what the seller already typed. */
export function syncVariants(options: OptionDraft[], current: VariantDraft[]): VariantDraft[] {
  const byKey = new Map(current.map((v) => [v.key, v]));
  const suggestedPrice = current.find((v) => v.price.trim())?.price ?? "";

  return combinations(options).map((optionValues) => {
    const key = comboKey(Object.entries(optionValues).map(([name, value]) => ({ name, value })));
    const existing = byKey.get(key);
    return existing
      ? { ...existing, optionValues }
      : { key, sku: "", price: suggestedPrice, stock: "0", optionValues };
  });
}

export function finalPrice(price: number, discountPercent: number): number {
  return Math.round((price * (100 - discountPercent)) / 100);
}

const clean = (text: string) => text.replace(/[^a-zA-Z0-9]/g, "").slice(0, 3).toUpperCase();

/** Fills empty SKUs like "SNE-BLA-M" from the product name and option values. */
export function suggestSkus(productName: string, variants: VariantDraft[]): VariantDraft[] {
  const prefix = clean(productName) || "SKU";
  return variants.map((variant, index) => {
    if (variant.sku.trim()) return variant;
    const parts = Object.values(variant.optionValues).map(clean).filter(Boolean);
    const suffix = parts.length > 0 ? parts.join("-") : String(index + 1).padStart(3, "0");
    return { ...variant, sku: `${prefix}-${suffix}` };
  });
}

export function validateSections(sections: FormSections): SectionErrors {
  const errors: SectionErrors = {};

  if (sections.images.length === 0) errors.images = "Add at least one image.";

  if (sections.hasOptions) {
    const names = new Set<string>();
    const nameErrors: Record<string, string> = {};
    const valueErrors: Record<string, string> = {};

    if (sections.options.length === 0) errors.options = "Add at least one option, such as Color or Size.";

    for (const option of sections.options) {
      const name = option.name.trim().toLowerCase();
      if (!name) nameErrors[option.uid] = "Enter an option name.";
      else if (names.has(name)) nameErrors[option.uid] = "Option names must be different.";
      names.add(name);

      if (option.values.length === 0) valueErrors[option.uid] = "Add at least one value.";
    }
    if (Object.keys(nameErrors).length > 0) errors.optionNames = nameErrors;
    if (Object.keys(valueErrors).length > 0) errors.optionValues = valueErrors;
  }

  const variantErrors: Record<number, VariantErrors> = {};
  const seenSkus = new Set<string>();

  if (sections.variants.length === 0) {
    errors.variantsGeneral = "Add option values to create at least one variant.";
  }

  sections.variants.forEach((variant, index) => {
    const row: VariantErrors = {};
    const sku = variant.sku.trim().toUpperCase();

    if (!SKU_PATTERN.test(sku)) row.sku = "3-40 characters: letters, numbers, - or _";
    else if (seenSkus.has(sku)) row.sku = "Duplicate SKU";
    seenSkus.add(sku);

    const price = Number(variant.price);
    if (variant.price.trim() === "" || !Number.isInteger(price) || price < 1) {
      row.price = "Whole number, at least 1";
    }

    if (!variant.id) {
      const stock = Number(variant.stock);
      if (variant.stock.trim() === "" || !Number.isInteger(stock) || stock < 0) {
        row.stock = "Whole number, 0 or more";
      }
    }

    if (Object.keys(row).length > 0) variantErrors[index] = row;
  });
  if (Object.keys(variantErrors).length > 0) errors.variants = variantErrors;

  return errors;
}

export function hasSectionErrors(errors: SectionErrors): boolean {
  return Object.keys(errors).length > 0;
}

type BaseValues = {
  name: string;
  description: string;
  category: string;
  brand: string;
  discountPercent: number;
  lowStockThreshold: number;
  specifications: { label: string; value: string }[];
};

export function buildPayload(base: BaseValues, sections: FormSections): ProductInput {
  return {
    name: base.name,
    description: base.description,
    category: base.category,
    brand: base.brand || null,
    images: sections.images,
    specifications: base.specifications.filter((s) => s.label.trim() && s.value.trim()),
    options: sections.hasOptions
      ? sections.options.map((o) => ({ name: o.name.trim(), values: o.values }))
      : [],
    discountPercent: base.discountPercent,
    lowStockThreshold: base.lowStockThreshold,
    variants: sections.variants.map((v) => ({
      ...(v.id ? { id: v.id } : { stock: Number(v.stock) }),
      sku: v.sku.trim().toUpperCase(),
      price: Number(v.price),
      optionValues: v.optionValues,
    })),
  };
}