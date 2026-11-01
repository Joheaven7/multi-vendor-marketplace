import Link from "next/link";
import { Logo } from "./logo";
import { siteConfig } from "@/lib/site";

const columns = [
  {
    title: "Shop",
    links: [
      { label: "All products", href: "/shop" },
      { label: "New in", href: "/shop?sort=newest" },
      { label: "Sale", href: "/shop?discount=true" },
    ],
  },
  {
    title: "Account",
    links: [
      { label: "Sign in", href: "/login" },
      { label: "Orders", href: "/dashboard/orders" },
      { label: "Wishlist", href: "/dashboard/wishlist" },
    ],
  },
  {
    title: "Sell",
    links: [
      { label: "Become a seller", href: "/seller" },
      { label: "Seller dashboard", href: "/seller" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-line bg-surface">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_repeat(3,1fr)] lg:px-8">
        <div>
          <Logo />
          <p className="mt-4 max-w-xs text-sm text-muted">{siteConfig.tagline}</p>
        </div>
        {columns.map((column) => (
          <div key={column.title}>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-ink">{column.title}</h2>
            <ul className="mt-4 space-y-3">
              {column.links.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="text-sm text-muted transition-colors hover:text-ink">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-line">
        <p className="mx-auto max-w-7xl px-4 py-5 text-xs text-muted sm:px-6 lg:px-8">
          {siteConfig.name}. A portfolio project.
        </p>
      </div>
    </footer>
  );
}