"use client";

import { useState } from "react";
import { MoreHorizontal, Pencil, Plus, Tags, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dropdown } from "@/components/ui/dropdown";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { toast } from "@/store/toast-store";
import { useAdminCategories, useDeleteCategory } from "../hooks";
import type { Category } from "../types";
import { CategoryFormModal } from "./category-form-modal";
import { ImageThumb } from "./image-thumb";

type FormState = { category?: Category; defaultParentId?: string } | null;

type RowProps = {
  category: Category;
  depth: 0 | 1;
  onEdit: (category: Category) => void;
  onAddChild: (parent: Category) => void;
  onDelete: (category: Category) => void;
};

function CategoryRow({ category, depth, onEdit, onAddChild, onDelete }: RowProps) {
  const childCount = category.children?.length ?? 0;

  return (
    <div className={cn("flex items-center gap-3 px-4 py-3", depth === 1 && "bg-canvas/60 pl-10 sm:pl-14")}>
      <ImageThumb url={category.image?.url} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-ink">{category.name}</p>
        <p className="truncate text-xs text-muted">
          /{category.slug}
          {depth === 0 && ` · ${childCount} ${childCount === 1 ? "subcategory" : "subcategories"}`}
        </p>
      </div>
      {!category.isActive && <Badge>Inactive</Badge>}
      <Dropdown
        label={`Actions for ${category.name}`}
        trigger={<MoreHorizontal className="size-5" />}
        items={[
          { label: "Edit", icon: <Pencil className="size-4" />, onSelect: () => onEdit(category) },
          ...(depth === 0
            ? [
                {
                  label: "Add subcategory",
                  icon: <Plus className="size-4" />,
                  onSelect: () => onAddChild(category),
                },
              ]
            : []),
          {
            label: "Delete",
            icon: <Trash2 className="size-4" />,
            danger: true,
            separatorBefore: true,
            onSelect: () => onDelete(category),
          },
        ]}
      />
    </div>
  );
}

export function CategoriesAdmin() {
  const { data: tree, isLoading, isError, refetch } = useAdminCategories();
  const remove = useDeleteCategory();
  const [form, setForm] = useState<FormState>(null);
  const [deleting, setDeleting] = useState<Category | null>(null);

  const addButton = (
    <Button leftIcon={<Plus className="size-4" />} onClick={() => setForm({})}>
      Add category
    </Button>
  );

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      await remove.mutateAsync(deleting.id);
      toast.success("Category deleted", deleting.name);
      setDeleting(null);
    } catch (error) {
      toast.error("Could not delete", error instanceof Error ? error.message : undefined);
      setDeleting(null);
    }
  };

  if (isError) return <ErrorState title="Unable to load categories" onRetry={() => refetch()} />;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">{addButton}</div>

      {isLoading ? (
        <div className="space-y-px overflow-hidden rounded-lg border border-line bg-surface">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3">
              <Skeleton className="size-10" />
              <Skeleton className="h-4 w-40" />
            </div>
          ))}
        </div>
      ) : !tree || tree.length === 0 ? (
        <EmptyState
          icon={<Tags />}
          title="No categories yet"
          description="Create your first category so sellers can list products."
          action={addButton}
        />
      ) : (
        <div className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface shadow-soft">
          {tree.map((top) => (
            <div key={top.id} className="divide-y divide-line">
              <CategoryRow
                category={top}
                depth={0}
                onEdit={(category) => setForm({ category })}
                onAddChild={(parent) => setForm({ defaultParentId: parent.id })}
                onDelete={setDeleting}
              />
              {top.children?.map((child) => (
                <CategoryRow
                  key={child.id}
                  category={child}
                  depth={1}
                  onEdit={(category) => setForm({ category })}
                  onAddChild={() => {}}
                  onDelete={setDeleting}
                />
              ))}
            </div>
          ))}
        </div>
      )}

      {form && (
        <CategoryFormModal
          category={form.category}
          defaultParentId={form.defaultParentId}
          topLevel={tree ?? []}
          onClose={() => setForm(null)}
        />
      )}

      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        loading={remove.isPending}
        variant="danger"
        title={`Delete ${deleting?.name ?? "category"}?`}
        description="This cannot be undone. A category with subcategories or products cannot be deleted."
        confirmLabel="Delete"
      />
    </div>
  );
}