"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm, useWatch, type Path } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import { z } from "zod";
import { Alert } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { ApiError } from "@/lib/api-client";
import { toast } from "@/store/toast-store";
import type { Category } from "@/features/catalog/types";
import { usePublicBrands, usePublicCategories, useSaveProduct, useSubmitProduct } from "../hooks";
import {
  blankFormSections,
  blankVariant,
  buildPayload,
  hasSectionErrors,
  syncVariants,
  toFormSections,
  validateSections,
  type OptionDraft,
  type SectionErrors,
} from "../form-utils";
import type { Product } from "../types";
import { OptionsEditor } from "./options-editor";
import { ProductImagesField } from "./product-images-field";
import { VariantsEditor } from "./variants-editor";

const specRow = z
  .object({
    label: z.string().trim().max(50, "At most 50 characters"),
    value: z.string().trim().max(200, "At most 200 characters"),
  })
  .refine((row) => (row.label === "") === (row.value === ""), {
    message: "Fill in both fields or remove the row",
    path: ["value"],
  });

const schema = z.object({
  name: z.string().trim().min(3, "Name must be at least 3 characters").max(120, "At most 120 characters"),
  description: z
    .string()
    .trim()
    .min(10, "Description must be at least 10 characters")
    .max(5000, "At most 5000 characters"),
  category: z.string().min(1, "Choose a category"),
  brand: z.string(),
  discountPercent: z
    .number({ error: "Enter a whole number" })
    .int("Enter a whole number")
    .min(0, "Must be 0 or more")
    .max(90, "At most 90%"),
  lowStockThreshold: z
    .number({ error: "Enter a whole number" })
    .int("Enter a whole number")
    .min(0, "Must be 0 or more")
    .max(1000, "At most 1000"),
  specifications: z.array(specRow).max(20),
});

type Values = z.infer<typeof schema>;

const FORM_FIELDS = new Set(["name", "description", "category", "brand", "discountPercent", "lowStockThreshold", "specifications"]);

function Card({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-line bg-surface p-6 shadow-soft">
      <h2 className="font-display text-xl text-ink">{title}</h2>
      {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      <div className="mt-6 space-y-5">{children}</div>
    </section>
  );
}

function CategoryOptions({
  tree,
  currentId,
  currentName,
}: {
  tree: Category[];
  currentId?: string;
  currentName?: string | null;
}) {
  const ids = new Set(tree.flatMap((top) => [top.id, ...(top.children ?? []).map((c) => c.id)]));

  return (
    <>
      <option value="">Choose a category</option>
      {currentId && !ids.has(currentId) && (
        <option value={currentId}>{currentName ?? "Current category"} (no longer available)</option>
      )}
      {tree.map((top) =>
        top.children && top.children.length > 0 ? (
          <optgroup key={top.id} label={top.name}>
            <option value={top.id}>{top.name} (general)</option>
            {top.children.map((child) => (
              <option key={child.id} value={child.id}>
                {child.name}
              </option>
            ))}
          </optgroup>
        ) : (
          <option key={top.id} value={top.id}>
            {top.name}
          </option>
        ),
      )}
    </>
  );
}

type ServerErrorResult = { general: string | null; sections: SectionErrors };

/** Spreads the backend's validation errors over the form fields and the custom sections. */
function mapServerErrors(
  error: unknown,
  setError: (name: Path<Values>, error: { type: string; message: string }) => void,
  skus: string[],
): ServerErrorResult {
  const sections: SectionErrors = {};
  if (!(error instanceof ApiError)) return { general: "Something went wrong. Please try again.", sections };

  if (error.code === "CONFLICT" && error.details && typeof error.details === "object" && "skus" in error.details) {
    const taken = new Set((error.details as { skus: string[] }).skus);
    const rows: SectionErrors["variants"] = {};
    skus.forEach((sku, index) => {
      if (taken.has(sku.trim().toUpperCase())) rows[index] = { sku: "SKU already used by another of your products" };
    });
    sections.variants = rows;
    return { general: "Some SKUs are already in use.", sections };
  }

  if (error.code === "VALIDATION_ERROR" && Array.isArray(error.details)) {
    let general: string | null = null;
    for (const detail of error.details as { path?: string; message: string }[]) {
      const path = detail.path ?? "";
      const variant = /^variants\.(\d+)\.(sku|price|stock|optionValues)$/.exec(path);

      if (FORM_FIELDS.has(path.split(".")[0])) {
        setError(path as Path<Values>, { type: "server", message: detail.message });
      } else if (variant) {
        const rows = (sections.variants ??= {});
        const field = variant[2] === "optionValues" ? "options" : (variant[2] as "sku" | "price" | "stock");
        rows[Number(variant[1])] = { ...rows[Number(variant[1])], [field]: detail.message };
      } else if (path.startsWith("images")) {
        sections.images = detail.message;
      } else if (path.startsWith("options")) {
        sections.options = detail.message;
      } else if (path === "variants") {
        sections.variantsGeneral = detail.message;
      } else {
        general = detail.message;
      }
    }
    return { general: general ?? "Please fix the highlighted fields.", sections };
  }

  return { general: error.message, sections };
}

export function ProductForm({ product }: { product?: Product }) {
  const router = useRouter();
  const isEdit = Boolean(product);
  const canSubmitForReview = !product || product.status === "DRAFT" || product.status === "REJECTED";

  const categories = usePublicCategories();
  const brands = usePublicBrands();
  const save = useSaveProduct();
  const submit = useSubmitProduct();

  const [initial] = useState(() => (product ? toFormSections(product) : blankFormSections()));
  const [images, setImages] = useState(initial.images);
  const [hasOptions, setHasOptions] = useState(initial.hasOptions);
  const [options, setOptions] = useState<OptionDraft[]>(initial.options);
  const [variants, setVariants] = useState(initial.variants);
  const [sectionErrors, setSectionErrors] = useState<SectionErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: product?.name ?? "",
      description: product?.description ?? "",
      category: product?.categoryId ?? "",
      brand: product?.brandId ?? "",
      discountPercent: product?.discountPercent ?? 0,
      lowStockThreshold: product?.lowStockThreshold ?? 5,
      specifications: product?.specifications ?? [],
    },
  });
  const specs = useFieldArray({ control, name: "specifications" });
  const productName = useWatch({ control, name: "name" });
  const discountPercent = useWatch({ control, name: "discountPercent" });

  const changeOptions = (next: OptionDraft[]) => {
    setOptions(next);
    setVariants((current) => syncVariants(next, current));
  };

  const toggleOptions = (on: boolean) => {
    setHasOptions(on);
    if (on) {
      setOptions([{ uid: "opt-new", name: "", values: [], locked: false }]);
      setVariants([]);
    } else {
      setOptions([]);
      setVariants([variants[0] ? { ...variants[0], key: "default", optionValues: {} } : blankVariant()]);
    }
    setSectionErrors({});
  };

  const run = (andSubmit: boolean) =>
    handleSubmit(async (values) => {
      setFormError(null);

      const sections = { images, hasOptions, options, variants };
      const found = validateSections(sections);
      setSectionErrors(found);
      if (hasSectionErrors(found)) {
        setFormError("Please fix the highlighted fields.");
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }

      let saved: Product;
      try {
        saved = await save.mutateAsync({ id: product?.id, input: buildPayload(values, sections) });
      } catch (error) {
        const result = mapServerErrors(error, setError, variants.map((v) => v.sku));
        setSectionErrors(result.sections);
        setFormError(result.general);
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }

      if (andSubmit) {
        try {
          await submit.mutateAsync(saved.id);
          toast.success("Submitted for review", saved.name);
        } catch (error) {
          toast.error("Saved, but could not submit", error instanceof Error ? error.message : undefined);
        }
      } else {
        toast.success(isEdit ? "Product saved" : "Draft saved", saved.name);
      }
      router.push("/seller/products");
    });

  const busy = isSubmitting || save.isPending || submit.isPending;

  return (
    <form onSubmit={run(false)} noValidate className="space-y-8">
      {formError && <Alert variant="error">{formError}</Alert>}

      <Card title="Basic information">
        <Input label="Product name" error={errors.name?.message} {...register("name")} />
        <Textarea
          label="Description"
          className="min-h-40"
          hint="Materials, sizing, what is included."
          error={errors.description?.message}
          {...register("description")}
        />
        <div className="grid gap-5 sm:grid-cols-2">
          <Select
            label="Category"
            disabled={categories.isLoading}
            error={errors.category?.message ?? (categories.isError ? "Could not load categories" : undefined)}
            {...register("category")}
          >
            <CategoryOptions
              tree={categories.data ?? []}
              currentId={product?.categoryId}
              currentName={product?.categoryName}
            />
          </Select>
          <Select label="Brand (optional)" disabled={brands.isLoading} error={errors.brand?.message} {...register("brand")}>
            <option value="">No brand</option>
            {product?.brandId && !(brands.data ?? []).some((b) => b.id === product.brandId) && (
              <option value={product.brandId}>{product.brandName ?? "Current brand"} (no longer available)</option>
            )}
            {(brands.data ?? []).map((brand) => (
              <option key={brand.id} value={brand.id}>
                {brand.name}
              </option>
            ))}
          </Select>
        </div>
      </Card>

      <Card title="Images" description="Show the product clearly from a few angles.">
        <ProductImagesField images={images} onChange={setImages} error={sectionErrors.images} />
      </Card>

      <Card title="Options and variants" description="Set up how the product is sold.">
        <OptionsEditor
          hasOptions={hasOptions}
          options={options}
          isEdit={isEdit}
          errors={sectionErrors}
          onToggle={toggleOptions}
          onChange={changeOptions}
        />
        <VariantsEditor
          variants={variants}
          hasOptions={hasOptions}
          productName={productName}
          discountPercent={discountPercent}
          errors={sectionErrors}
          onChange={setVariants}
        />
      </Card>

      <Card title="Discount and stock alerts">
        <div className="grid gap-5 sm:grid-cols-2">
          <Input
            label="Discount (%)"
            type="number"
            inputMode="numeric"
            hint="Applied to every variant. Use 0 for no discount."
            error={errors.discountPercent?.message}
            {...register("discountPercent", { valueAsNumber: true })}
          />
          <Input
            label="Low stock alert at"
            type="number"
            inputMode="numeric"
            hint="A variant counts as low stock at or below this number."
            error={errors.lowStockThreshold?.message}
            {...register("lowStockThreshold", { valueAsNumber: true })}
          />
        </div>
      </Card>

      <Card title="Specifications" description="Optional details shown on the product page, like Material or Weight.">
        {specs.fields.map((field, index) => (
          <div key={field.id} className="flex items-start gap-3">
            <Input
              label={index === 0 ? "Label" : undefined}
              aria-label={`Specification ${index + 1} label`}
              placeholder="Material"
              wrapperClassName="flex-1"
              error={errors.specifications?.[index]?.label?.message}
              {...register(`specifications.${index}.label`)}
            />
            <Input
              label={index === 0 ? "Value" : undefined}
              aria-label={`Specification ${index + 1} value`}
              placeholder="Leather"
              wrapperClassName="flex-1"
              error={errors.specifications?.[index]?.value?.message}
              {...register(`specifications.${index}.value`)}
            />
            <Button
              variant="ghost"
              size="icon"
              className={index === 0 ? "mt-7 text-danger hover:bg-danger-soft" : "text-danger hover:bg-danger-soft"}
              aria-label={`Remove specification ${index + 1}`}
              onClick={() => specs.remove(index)}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}
        <Button
          variant="outline"
          size="sm"
          leftIcon={<Plus className="size-4" />}
          disabled={specs.fields.length >= 20}
          onClick={() => specs.append({ label: "", value: "" })}
        >
          Add specification
        </Button>
      </Card>

      <div className="flex flex-col-reverse gap-3 border-t border-line pt-6 sm:flex-row sm:justify-end">
        <Link href="/seller/products" className={buttonVariants({ variant: "ghost" })}>
          Cancel
        </Link>
        {canSubmitForReview && (
          <Button variant="outline" disabled={busy} loading={busy && save.isPending} onClick={run(true)}>
            {product?.status === "REJECTED" ? "Save and resubmit" : "Save and submit for review"}
          </Button>
        )}
        <Button type="submit" loading={busy}>
          {isEdit ? "Save changes" : "Save as draft"}
        </Button>
      </div>
    </form>
  );
}