/** "Café Addis & Co." -> "cafe-addis-co". Returns "" if nothing usable remains. */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
}

/** Slugifies `text`, then adds -2, -3... until `exists` says the slug is free. */
export async function findUniqueSlug(
  text: string,
  exists: (slug: string) => Promise<boolean>,
  fallback: string,
): Promise<string> {
  const base = slugify(text) || fallback;
  let candidate = base;
  let counter = 1;

  while (await exists(candidate)) {
    counter += 1;
    candidate = `${base}-${counter}`;
  }
  return candidate;
}