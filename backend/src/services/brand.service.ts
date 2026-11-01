import type { HydratedDocument } from "mongoose";
import { Brand, type IBrand } from "../models/Brand";
import type { CreateBrandInput, UpdateBrandInput } from "../validators/catalog.validator";
import { AppError } from "../utils/AppError";
import { findUniqueSlug } from "../utils/slug";
import { CATALOG_FOLDER, assertManagedImage, deleteImageQuietly } from "./storage";
import { Product } from "../models/Product";

type BrandDocument = HydratedDocument<IBrand>;

export type BrandDTO = {
  id: string;
  name: string;
  slug: string;
  logo?: { url: string; publicId?: string };
  isActive: boolean;
};

const COLLATION = { locale: "en", strength: 2 } as const;

function toDTO(brand: BrandDocument, admin: boolean): BrandDTO {
  return {
    id: brand.id,
    name: brand.name,
    slug: brand.slug,
    logo: brand.logo
      ? { url: brand.logo.url, ...(admin ? { publicId: brand.logo.publicId } : {}) }
      : undefined,
    isActive: brand.isActive,
  };
}

async function findOrThrow(id: string): Promise<BrandDocument> {
  const brand = await Brand.findById(id);
  if (!brand) throw AppError.notFound("Brand not found");
  return brand;
}

async function assertUniqueName(name: string, excludeId?: string) {
  const clash = await Brand.findOne({
    name,
    ...(excludeId ? { _id: { $ne: excludeId } } : {}),
  }).collation(COLLATION);

  if (clash) throw AppError.conflict("A brand with this name already exists");
}

export async function listBrands({ admin }: { admin: boolean }): Promise<BrandDTO[]> {
  const brands = await Brand.find(admin ? {} : { isActive: true })
    .sort({ name: 1 })
    .collation(COLLATION);
  return brands.map((brand) => toDTO(brand, admin));
}

export async function createBrand(input: CreateBrandInput): Promise<BrandDTO> {
  await assertUniqueName(input.name);
  if (input.logo) assertManagedImage(input.logo, CATALOG_FOLDER);

  const slug = await findUniqueSlug(
    input.name,
    async (candidate) => !!(await Brand.exists({ slug: candidate })),
    "brand",
  );

  const brand = await Brand.create({
    name: input.name,
    slug,
    logo: input.logo,
    isActive: input.isActive ?? true,
  });
  return toDTO(brand, true);
}

export async function updateBrand(id: string, input: UpdateBrandInput): Promise<BrandDTO> {
  const brand = await findOrThrow(id);

  if (input.name !== undefined && input.name !== brand.name) {
    await assertUniqueName(input.name, id);
    brand.name = input.name;
  }
  if (input.isActive !== undefined) brand.isActive = input.isActive;

  let replacedPublicId: string | undefined;
  if (input.logo === null && brand.logo) {
    replacedPublicId = brand.logo.publicId;
    brand.logo = undefined;
  } else if (input.logo && input.logo.publicId !== brand.logo?.publicId) {
    assertManagedImage(input.logo, CATALOG_FOLDER);
    replacedPublicId = brand.logo?.publicId;
    brand.logo = input.logo;
  }

  await brand.save();
  await deleteImageQuietly(replacedPublicId);
  return toDTO(brand, true);
}

export async function deleteBrand(id: string): Promise<void> {
  const brand = await findOrThrow(id);

  const inUse = await Product.exists({ brand: brand._id, deletedAt: null });
  if (inUse) throw AppError.conflict("Products use this brand. Move or delete them first.");

  await brand.deleteOne();
  await deleteImageQuietly(brand.logo?.publicId);
}