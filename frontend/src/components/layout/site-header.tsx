"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  Heart,
  LogOut,
  Menu,
  Search,
  ShieldCheck,
  ShoppingBag,
  Store,
  User as UserIcon,
  X,
} from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { buttonVariants } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { Dropdown, type DropdownItem } from "@/components/ui/dropdown";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentUser, useLogout } from "@/features/auth/hooks";
import { usePublicCategories } from "@/features/products/hooks";
import { publicNav } from "@/lib/site";
import { CategoriesMenu } from "./categories-menu";
import { Logo } from "./logo";
import { SearchBar } from "./search-bar";

const iconLink = buttonVariants({ variant: "ghost", size: "icon" });

export function SiteHeader() {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { data: user, isLoading } = useCurrentUser();
  const { data: categories = [] } = usePublicCategories();
  const logout = useLogout();
  const cartCount = 0; // Phase 5 reads this from the cart

  const handleLogout = async () => {
    await logout.mutateAsync().catch(() => undefined);
    router.replace("/");
  };

  const accountLinks = user
    ? [
        { label: "My account", href: "/dashboard", icon: <UserIcon className="size-4" /> },
        ...(user.role === "SELLER"
          ? [{ label: "Seller centre", href: "/seller", icon: <Store className="size-4" /> }]
          : []),
        ...(user.role === "ADMIN"
          ? [{ label: "Admin console", href: "/admin", icon: <ShieldCheck className="size-4" /> }]
          : []),
        ...(user.role === "CUSTOMER"
          ? [{ label: "Become a seller", href: "/become-seller", icon: <Store className="size-4" /> }]
          : []),
      ]
    : [];

  const dropdownItems: DropdownItem[] = [
    ...accountLinks,
    {
      label: "Log out",
      icon: <LogOut className="size-4" />,
      separatorBefore: true,
      onSelect: handleLogout,
    },
  ];

  const mobileLinkClass = "rounded-md px-3 py-3 text-base text-muted hover:bg-ink/5 hover:text-ink";
  const closeMenu = () => setMenuOpen(false);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-canvas/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-2 px-4 sm:px-6 lg:gap-8 lg:px-8">
        <button
          type="button"
          aria-label="Open menu"
          onClick={() => setMenuOpen(true)}
          className={`${iconLink} -ml-2 lg:hidden`}
        >
          <Menu className="size-5" />
        </button>

        <Logo />

        <nav aria-label="Main" className="hidden items-center gap-7 lg:flex">
          <CategoriesMenu />
          {publicNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-muted transition-colors hover:text-ink"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <SearchBar className="hidden max-w-md flex-1 lg:ml-auto lg:block" />

        <div className="ml-auto flex items-center gap-0.5 lg:ml-0">
          <button
            type="button"
            aria-label={searchOpen ? "Close search" : "Open search"}
            aria-expanded={searchOpen}
            onClick={() => setSearchOpen((v) => !v)}
            className={`${iconLink} lg:hidden`}
          >
            {searchOpen ? <X className="size-5" /> : <Search className="size-5" />}
          </button>
          <Link href="/dashboard/wishlist" aria-label="Wishlist" className={iconLink}>
            <Heart className="size-5" />
          </Link>
          <Link href="/cart" aria-label={`Cart, ${cartCount} items`} className={`${iconLink} relative`}>
            <ShoppingBag className="size-5" />
            {cartCount > 0 && (
              <span className="absolute right-1 top-1 flex size-4 items-center justify-center rounded-full bg-accent text-[10px] font-semibold text-on-accent">
                {cartCount}
              </span>
            )}
          </Link>

          {isLoading ? (
            <Skeleton className="mx-1.5 size-8 rounded-full" />
          ) : user ? (
            <Dropdown
              label="Account menu"
              items={dropdownItems}
              trigger={<Avatar name={user.name} src={user.avatar} size="sm" />}
            />
          ) : (
            <Link href="/login" aria-label="Sign in" className={iconLink}>
              <UserIcon className="size-5" />
            </Link>
          )}
        </div>
      </div>

      {searchOpen && (
        <div className="border-t border-line px-4 py-3 lg:hidden">
          <SearchBar autoFocus onSubmitted={() => setSearchOpen(false)} />
        </div>
      )}

      <Drawer open={menuOpen} onClose={closeMenu} title="Menu" side="left">
        <nav aria-label="Mobile" className="flex flex-col p-3">
          {publicNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={closeMenu}
              className="rounded-md px-3 py-3 text-base font-medium text-ink hover:bg-ink/5"
            >
              {item.label}
            </Link>
          ))}

          {categories.length > 0 && (
            <>
              <div className="my-3 h-px bg-line" />
              <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wider text-muted">Categories</p>
              {categories.map((top) => (
                <details key={top.id} className="group">
                  <summary className="flex cursor-pointer list-none items-center justify-between rounded-md px-3 py-3 text-base text-ink hover:bg-ink/5 [&::-webkit-details-marker]:hidden">
                    {top.name}
                    <ChevronDown className="size-4 text-muted transition-transform group-open:rotate-180" aria-hidden />
                  </summary>
                  <ul className="pb-2 pl-3">
                    <li>
                      <Link href={`/category/${top.slug}`} onClick={closeMenu} className={`block ${mobileLinkClass}`}>
                        All {top.name}
                      </Link>
                    </li>
                    {top.children?.map((child) => (
                      <li key={child.id}>
                        <Link href={`/category/${child.slug}`} onClick={closeMenu} className={`block ${mobileLinkClass}`}>
                          {child.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </details>
              ))}
            </>
          )}

          <div className="my-3 h-px bg-line" />
          {user ? (
            <>
              {accountLinks.map((link) => (
                <Link key={link.href} href={link.href} onClick={closeMenu} className={mobileLinkClass}>
                  {link.label}
                </Link>
              ))}
              <button
                type="button"
                onClick={() => {
                  closeMenu();
                  handleLogout();
                }}
                className={`${mobileLinkClass} text-left`}
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <Link href="/login" onClick={closeMenu} className={mobileLinkClass}>
                Sign in
              </Link>
              <Link href="/register" onClick={closeMenu} className={mobileLinkClass}>
                Create account
              </Link>
              <Link href="/become-seller" onClick={closeMenu} className={mobileLinkClass}>
                Sell on Marketplace
              </Link>
            </>
          )}
        </nav>
      </Drawer>
    </header>
  );
}