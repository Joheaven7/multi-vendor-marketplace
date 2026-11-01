"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown, LogOut, Menu, Store, User } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { buttonVariants } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { Dropdown } from "@/components/ui/dropdown";
import { useCurrentUser, useLogout } from "@/features/auth/hooks";
import { cn } from "@/lib/utils";
import { Logo } from "./logo";
import { areaMeta, dashboardNav, type DashboardArea, type NavItem } from "./nav-config";

/** The most specific matching item wins, so /admin/sellers/applications does not also highlight Sellers. */
function getActiveHref(items: NavItem[], pathname: string) {
  const matches = items.filter((i) => pathname === i.href || pathname.startsWith(`${i.href}/`));
  return matches.sort((a, b) => b.href.length - a.href.length)[0]?.href;
}

type NavLinksProps = {
  items: NavItem[];
  tone: "light" | "dark";
  onNavigate?: () => void;
};

function NavLinks({ items, tone, onNavigate }: NavLinksProps) {
  const pathname = usePathname();
  const activeHref = getActiveHref(items, pathname);

  return (
    <nav aria-label="Dashboard" className="flex flex-col gap-1 p-3">
      {items.map((item) => {
        const active = item.href === activeHref;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
              tone === "dark"
                ? active
                  ? "bg-white/10 text-white"
                  : "text-white/65 hover:bg-white/5 hover:text-white"
                : active
                  ? "bg-accent-soft text-accent"
                  : "text-muted hover:bg-ink/5 hover:text-ink",
            )}
          >
            <item.icon className="size-[18px]" aria-hidden />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function DashboardShell({ area, children }: { area: DashboardArea; children: React.ReactNode }) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const { data: user } = useCurrentUser();
  const logout = useLogout();

  const meta = areaMeta[area];
  const items = dashboardNav[area];
  const dark = area === "admin";

  const handleLogout = async () => {
    await logout.mutateAsync().catch(() => undefined);
    router.replace("/login");
  };

  return (
    <div data-area={area} className="flex min-h-dvh bg-canvas">
      <aside
        className={cn(
          "sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r lg:flex",
          dark ? "border-transparent bg-ink text-white" : "border-line bg-surface",
        )}
      >
        <div className="flex h-16 shrink-0 flex-col justify-center border-b border-white/10 px-6">
          <Logo href={meta.home} className={cn("text-base", dark && "text-white")} />
        </div>
        <div className="flex-1 overflow-y-auto">
          <p
            className={cn(
              "px-6 pt-5 text-xs font-semibold uppercase tracking-wider",
              dark ? "text-white/45" : "text-subtle",
            )}
          >
            {meta.label}
          </p>
          <NavLinks items={items} tone={dark ? "dark" : "light"} />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-line bg-surface/90 px-4 backdrop-blur lg:px-8">
          <button
            type="button"
            aria-label="Open navigation"
            onClick={() => setMenuOpen(true)}
            className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "-ml-2 lg:hidden")}
          >
            <Menu className="size-5" />
          </button>
          <span className="font-display text-lg text-ink lg:hidden">{meta.label}</span>

          <div className="ml-auto flex items-center gap-1">
            <Link href="/" className={buttonVariants({ variant: "ghost", size: "sm" })}>
              <Store className="mr-2 size-4" aria-hidden />
              <span className="hidden sm:inline">View store</span>
              <span className="sm:hidden">Store</span>
            </Link>
            <Dropdown
              label="Account menu"
              trigger={
                <span className="flex items-center gap-2">
                  <Avatar name={user?.name ?? "Account"} src={user?.avatar} size="sm" />
                  <span className="hidden max-w-32 truncate text-sm font-medium sm:inline">
                    {user?.name}
                  </span>
                  <ChevronDown className="size-4 text-muted" aria-hidden />
                </span>
              }
              items={[
                { label: "Profile", href: "/dashboard/profile", icon: <User className="size-4" /> },
                { label: "Back to store", href: "/", icon: <Store className="size-4" /> },
                {
                  label: "Log out",
                  icon: <LogOut className="size-4" />,
                  separatorBefore: true,
                  onSelect: handleLogout,
                },
              ]}
            />
          </div>
        </header>

        <main className={cn("mx-auto w-full flex-1 px-4 py-8 sm:px-6 lg:px-8 lg:py-10", meta.maxWidth)}>
          {children}
        </main>
      </div>

      <Drawer open={menuOpen} onClose={() => setMenuOpen(false)} title={meta.label} side="left">
        <NavLinks items={items} tone="light" onNavigate={() => setMenuOpen(false)} />
      </Drawer>
    </div>
  );
}