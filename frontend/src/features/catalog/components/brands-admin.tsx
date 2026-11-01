"use client";

import { useState } from "react";
import { MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dropdown } from "@/components/ui/dropdown";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { DataTable, type Column } from "@/components/ui/table";
import { applyServerErrors } from "@/lib/forms";
import { toast } from "@/store/toast-store";
import { useAdminBrands, useCreateBrand, useDeleteBrand, useUpdateBrand } from "../hooks";
import type { Brand, ManagedImage } from "../types";
import { ImageThumb } from "./image-thumb";
import { ImageUploader } from "./image-uploader";

const schema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(60, "Name must be at most 60 characters"),
  isActive: z.boolean(),
});

type Values = z.infer<typeof schema>;

function BrandFormModal({ brand, onClose }: { brand?: Brand; onClose: () => void }) {
  const isEdit = Boolean(brand);
  const create = useCreateBrand();
  const update = useUpdateBrand();

  const [logo, setLogo] = useState<ManagedImage | null>(
    brand?.logo?.publicId ? { url: brand.logo.url, publicId: brand.logo.publicId } : null,
  );
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: brand?.name ?? "", isActive: brand?.isActive ?? true },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      if (brand) {
        await update.mutateAsync({
          id: brand.id,
          input: { name: values.name, isActive: values.isActive, logo },
        });
        toast.success("Brand updated", values.name);
      } else {
        await create.mutateAsync({ name: values.name, isActive: values.isActive, logo: logo ?? undefined });
        toast.success("Brand created", values.name);
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
      title={isEdit ? "Edit brand" : "New brand"}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" form="brand-form" loading={isSubmitting}>
            {isEdit ? "Save changes" : "Create brand"}
          </Button>
        </>
      }
    >
      <form id="brand-form" onSubmit={onSubmit} noValidate className="space-y-5">
        {formError && <Alert variant="error">{formError}</Alert>}
        <Input label="Name" error={errors.name?.message} {...register("name")} />
        <ImageUploader label="Logo" purpose="catalog" value={logo} onChange={setLogo} />
        <Checkbox
          label="Active"
          description="Inactive brands cannot be chosen for new products."
          {...register("isActive")}
        />
      </form>
    </Modal>
  );
}

type FormState = { brand?: Brand } | null;

export function BrandsAdmin() {
  const { data, isLoading, isError, refetch } = useAdminBrands();
  const remove = useDeleteBrand();
  const [form, setForm] = useState<FormState>(null);
  const [deleting, setDeleting] = useState<Brand | null>(null);

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      await remove.mutateAsync(deleting.id);
      toast.success("Brand deleted", deleting.name);
    } catch (error) {
      toast.error("Could not delete", error instanceof Error ? error.message : undefined);
    }
    setDeleting(null);
  };

  const columns: Column<Brand>[] = [
    {
      key: "brand",
      header: "Brand",
      cell: (brand) => (
        <div className="flex items-center gap-3">
          <ImageThumb url={brand.logo?.url} />
          <span className="font-medium">{brand.name}</span>
        </div>
      ),
    },
    { key: "slug", header: "Slug", cell: (brand) => <span className="text-muted">/{brand.slug}</span> },
    {
      key: "status",
      header: "Status",
      cell: (brand) =>
        brand.isActive ? <Badge variant="success" dot>Active</Badge> : <Badge dot>Inactive</Badge>,
    },
    {
      key: "actions",
      header: "",
      align: "right",
      cell: (brand) => (
        <div className="flex justify-end">
          <Dropdown
            label={`Actions for ${brand.name}`}
            trigger={<MoreHorizontal className="size-5" />}
            items={[
              { label: "Edit", icon: <Pencil className="size-4" />, onSelect: () => setForm({ brand }) },
              {
                label: "Delete",
                icon: <Trash2 className="size-4" />,
                danger: true,
                separatorBefore: true,
                onSelect: () => setDeleting(brand),
              },
            ]}
          />
        </div>
      ),
    },
  ];

  const addButton = (
    <Button leftIcon={<Plus className="size-4" />} onClick={() => setForm({})}>
      Add brand
    </Button>
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-end">{addButton}</div>

      <DataTable
        columns={columns}
        rows={data ?? []}
        getRowKey={(brand) => brand.id}
        loading={isLoading}
        error={isError}
        onRetry={() => refetch()}
        emptyTitle="No brands yet"
        emptyDescription="Add brands so sellers can tag their products."
        emptyAction={addButton}
      />

      {form && <BrandFormModal brand={form.brand} onClose={() => setForm(null)} />}

      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        loading={remove.isPending}
        variant="danger"
        title={`Delete ${deleting?.name ?? "brand"}?`}
        description="This cannot be undone. A brand that products use cannot be deleted."
        confirmLabel="Delete"
      />
    </div>
  );
}