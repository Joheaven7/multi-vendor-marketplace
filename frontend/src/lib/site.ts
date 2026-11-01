export const siteConfig = {
  name: "Marketplace",
  tagline: "Curated goods from independent sellers",
} as const;

export const publicNav = [
  { label: "Shop", href: "/shop" },
  { label: "New in", href: "/shop?sort=newest" },
  { label: "Sale", href: "/shop?discount=true" },
] as const;