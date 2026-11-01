"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatPrice } from "@/lib/utils";
import { finalPrice, suggestSkus, type SectionErrors, type VariantDraft } from "../form-utils";

type VariantsEditorProps = {
  variants: VariantDraft[];
  hasOptions: boolean;
  productName: string;
  discountPercent: number;
  errors: SectionErrors;
  onChange: (variants: VariantDraft[]) => void;
};

export function VariantsEditor({
  variants,
  hasOptions,
  productName,
  discountPercent,
  errors,
  onChange,
}: VariantsEditorProps) {
  const update = (index: number, patch: Partial<VariantDraft>) =>
    onChange(variants.map((variant, i) => (i === index ? { ...variant, ...patch } : variant)));

  const samePriceForAll = () => {
    const first = variants.find((v) => v.price.trim())?.price;
    if (first) onChange(variants.map((v) => ({ ...v, price: first })));
  };

  const hasExisting = variants.some((v) => v.id);
  const discount = Number.isFinite(discountPercent) ? discountPercent : 0;

  if (hasOptions && variants.length === 0) {
    return (
      <div className="space-y-2">
        {errors.variantsGeneral && (
          <p role="alert" className="text-sm text-danger">
            {errors.variantsGeneral}
          </p>
        )}
        <p className="rounded-lg border border-dashed border-line-strong px-4 py-6 text-center text-sm text-muted">
          Add an option name and at least one value above. A variant row appears for every combination.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {errors.variantsGeneral && (
        <p role="alert" className="text-sm text-danger">
          {errors.variantsGeneral}
        </p>
      )}

      {(hasOptions || variants.length > 1) && (
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => onChange(suggestSkus(productName, variants))}>
            Fill empty SKUs
          </Button>
          <Button variant="outline" size="sm" onClick={samePriceForAll}>
            Use first price for all
          </Button>
        </div>
      )}

      {variants.map((variant, index) => {
        const row = errors.variants?.[index] ?? {};
        const title = hasOptions
          ? Object.values(variant.optionValues).join(" / ")
          : "Price and stock";
        const price = Number(variant.price);
        const showFinal = discount > 0 && Number.isInteger(price) && price > 0;

        return (
          <fieldset key={variant.key} className="rounded-lg border border-line p-4">
            <legend className="px-1 text-sm font-medium text-ink">{title}</legend>
            <div className="grid gap-4 sm:grid-cols-3">
              <Input
                label="SKU"
                placeholder="SNK-001"
                value={variant.sku}
                error={row.sku}
                onChange={(event) => update(index, { sku: event.target.value })}
              />
              <Input
                label="Price (ETB)"
                type="number"
                inputMode="numeric"
                min={1}
                value={variant.price}
                error={row.price}
                hint={showFinal ? `Customers pay ${formatPrice(finalPrice(price, discount))}` : undefined}
                onChange={(event) => update(index, { price: event.target.value })}
              />
              <Input
                label="Stock"
                type="number"
                inputMode="numeric"
                min={0}
                value={variant.stock}
                error={row.stock}
                disabled={Boolean(variant.id)}
                hint={variant.id ? "Change on the Inventory page" : undefined}
                onChange={(event) => update(index, { stock: event.target.value })}
              />
            </div>
          </fieldset>
        );
      })}

      {hasExisting && (
        <p className="text-xs text-muted">
          Stock of existing variants is managed on the Inventory page, so a form saved late can never
          overwrite stock that orders have already used.
        </p>
      )}
    </div>
  );
}