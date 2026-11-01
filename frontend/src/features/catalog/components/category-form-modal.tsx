"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { applyServerErrors } from "@/lib/forms";
import { toast } from "@/store/toast-store";
import { useCreateCategory, useUpdateCategory } from "../hooks";
import type { Category, ManagedImage } from "../types";
import { ImageUploader } from "./image-uploader";

const schema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(60, "Name must be at most 60 characters"),
  parent: z.string(),
  sortOrder: z
    .number({ error: "Enter a whole number" })
    .int("Enter a whole number")
    .min(0, "Must be 0 or more")
    .max(9999, "Must be at most 9999"),
  isActive: z.boolean(),
});

type Values = z.infer<typeof schema>;

type CategoryFormModalProps = {
  /** Present when editing. */
  category?: Category;
  /** Pre-selects the parent when adding a subcategory. */
  defaultParentId?: string;
  topLevel: Category[];
  onClose: () => void;
};

export function CategoryFormModal({ category, defaultParentId, topLevel, onClose }: CategoryFormModalProps) {
  const isEdit = Boolean(category);
  const create = useCreateCategory();
  const update = useUpdateCategory();

  const [image, setImage] = useState<ManagedImage | null>(
    category?.image?.publicId ? { url: category.image.url, publicId: category.image.publicId } : null,
  );
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: category?.name ?? "",
      parent: defaultParentId ?? "",
      sortOrder: category?.sortOrder ?? 0,
      isActive: category?.isActive ?? true,
    },
  });

  const parentName = category?.parentId
    ? topLevel.find((top) => top.id === category.parentId)?.name
    : undefined;

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      if (category) {
        await update.mutateAsync({
          id: category.id,
          input: { name: values.name, sortOrder: values.sortOrder, isActive: values.isActive, image },
        });
        toast.success("Category updated", values.name);
      } else {
        await create.mutateAsync({
          name: values.name,
          parent: values.parent || undefined,
          image: image ?? undefined,
          sortOrder: values.sortOrder,
          isActive: values.isActive,
        });
        toast.success("Category created", values.name);
      }
      onClose();
    } catch (error) {
      setFormError(applyServerErrors(error, setError));
    }
  });

  return (
    <Modal
      open
      onClose={onClose}
      title={isEdit ? "Edit category" : "New category"}
      description={parentName ? `Subcategory of ${parentName}` : undefined}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" form="category-form" loading={isSubmitting}>
            {isEdit ? "Save changes" : "Create category"}
          </Button>
        </>
      }
    >
      <form id="category-form" onSubmit={onSubmit} noValidate className="space-y-5">
        {formError && <Alert variant="error">{formError}</Alert>}

        <Input label="Name" error={errors.name?.message} {...register("name")} />

        {!isEdit && (
          <Select
            label="Parent category"
            hint="Leave empty for a top-level category. Categories can be two levels deep."
            {...register("parent")}
          >
            <option value="">None (top-level)</option>
            {topLevel.map((top) => (
              <option key={top.id} value={top.id}>
                {top.name}
              </option>
            ))}
          </Select>
        )}

        <Input
          label="Sort order"
          type="number"
          inputMode="numeric"
          hint="Lower numbers appear first."
          error={errors.sortOrder?.message}
          {...register("sortOrder", { valueAsNumber: true })}
        />

        <ImageUploader label="Image" purpose="catalog" value={image} onChange={setImage} />

        <Checkbox
          label="Active"
          description="Inactive categories (and their subcategories) are hidden from the storefront."
          {...register("isActive")}
        />
      </form>
    </Modal>
  );
}