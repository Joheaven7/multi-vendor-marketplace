import type { HydratedDocument, Types } from "mongoose";
import { Category, type ICategory } from "../models/Category";
import type { CreateCategoryInput, UpdateCategoryInput } from "../validators/catalog.validator";
import { AppError } from "../utils/AppError";
import { findUniqueSlug } from "../utils/slug";
import { CATALOG_FOLDER, assertManagedImage, deleteImageQuietly } from "./storage";
import { Product } from "../models/Product";

type CategoryDocument = HydratedDocument<ICategory>;

export type CategoryDTO = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  image?: { url: string; publicId?: string };
  isActive: boolean;
  sortOrder: number;
  children?: CategoryDTO[];
};

// Case-insensitive comparisons and sorting.
const COLLATION = { locale: "en", strength: 2 } as const;

/** `admin` also exposes the image publicId, which the public storefront has no need for. */
function toDTO(category: CategoryDocument, admin: boolean): CategoryDTO {
  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    parentId: category.parent ? category.parent.toString() : null,
    image: category.image
      ? { url: category.image.url, ...(admin ? { publicId: category.image.publicId } : {}) }
      : undefined,
    isActive: category.isActive,
    sortOrder: category.sortOrder,
  };
}

async function findOrThrow(id: string): Promise<CategoryDocument> {
  const category = await Category.findById(id);
  if (!category) throw AppError.notFound("Category not found");
  return category;
}

async function assertUniqueName(name: string, parent: Types.ObjectId | null, excludeId?: string) {
  const clash = await Category.findOne({
    name,
    parent,
    ...(excludeId ? { _id: { $ne: excludeId } } : {}),
  }).collation(COLLATION);

  if (clash) throw AppError.conflict("A category with this name already exists here");
}

/**
 * Top-level categories with their children. The public tree only contains active
 * categories, and the children of an inactive parent are hidden with it.
 */
export async function listTree({ admin }: { admin: boolean }): Promise<CategoryDTO[]> {
  const all = await Category.find(admin ? {} : { isActive: true })
    .sort({ sortOrder: 1, name: 1 })
    .collation(COLLATION);

  const childrenByParent = new Map<string, CategoryDocument[]>();
  for (const category of all) {
    if (!category.parent) continue;
    const key = category.parent.toString();
    childrenByParent.set(key, [...(childrenByParent.get(key) ?? []), category]);
  }

  return all
    .filter((category) => !category.parent)
    .map((top) => ({
      ...toDTO(top, admin),
      children: (childrenByParent.get(top.id) ?? []).map((child) => toDTO(child, admin)),
    }));
}

export async function createCategory(input: CreateCategoryInput): Promise<CategoryDTO> {
  let parentId: Types.ObjectId | null = null;

  if (input.parent) {
    const parent = await Category.findById(input.parent);
    if (!parent) throw AppError.notFound("Parent category not found");
    if (parent.parent) throw AppError.badRequest("Categories can be at most two levels deep");
    parentId = parent._id;
  }

  await assertUniqueName(input.name, parentId);
  if (input.image) assertManagedImage(input.image, CATALOG_FOLDER);

  const slug = await findUniqueSlug(
    input.name,
    async (candidate) => !!(await Category.exists({ slug: candidate })),
    "category",
  );

  const category = await Category.create({
    name: input.name,
    slug,
    parent: parentId,
    image: input.image,
    sortOrder: input.sortOrder ?? 0,
    isActive: input.isActive ?? true,
  });
  return toDTO(category, true);
}

/** The slug never changes after creation, so storefront URLs stay stable when a category is renamed. */
export async function updateCategory(id: string, input: UpdateCategoryInput): Promise<CategoryDTO> {
  const category = await findOrThrow(id);

  if (input.name !== undefined && input.name !== category.name) {
    await assertUniqueName(input.name, category.parent, id);
    category.name = input.name;
  }
  if (input.sortOrder !== undefined) category.sortOrder = input.sortOrder;
  if (input.isActive !== undefined) category.isActive = input.isActive;

  let replacedPublicId: string | undefined;
  if (input.image === null && category.image) {
    replacedPublicId = category.image.publicId;
    category.image = undefined;
  } else if (input.image && input.image.publicId !== category.image?.publicId) {
    assertManagedImage(input.image, CATALOG_FOLDER);
    replacedPublicId = category.image?.publicId;
    category.image = input.image;
  }

  await category.save();
  await deleteImageQuietly(replacedPublicId);
  return toDTO(category, true);
}

export async function deleteCategory(id: string): Promise<void> {
  const category = await findOrThrow(id);

  const children = await Category.countDocuments({ parent: category._id });
  if (children > 0) {
    throw AppError.conflict("This category has subcategories. Delete or empty them first.");
  }

    const inUse = await Product.exists({ category: category._id, deletedAt: null });
  if (inUse) {
    throw AppError.conflict("Products use this category. Move or delete them first.");
  }

  await category.deleteOne();
  await deleteImageQuietly(category.image?.publicId);
}

/** A public category page: the category, its parent (for the breadcrumb) and its children. */
export async function getPublicCategoryBySlug(slug: string) {
  const category = await Category.findOne({ slug, isActive: true });
  if (!category) throw AppError.notFound("Category not found");

  let parent: CategoryDocument | null = null;
  if (category.parent) {
    parent = await Category.findById(category.parent);
    if (!parent || !parent.isActive) throw AppError.notFound("Category not found");
  }

  const children = category.parent
    ? []
    : await Category.find({ parent: category._id, isActive: true })
        .sort({ sortOrder: 1, name: 1 })
        .collation(COLLATION);

  return {
    category: toDTO(category, false),
    parent: parent ? toDTO(parent, false) : null,
    children: children.map((child) => toDTO(child, false)),
  };
}