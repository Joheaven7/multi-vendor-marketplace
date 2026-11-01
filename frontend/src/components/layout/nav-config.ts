import {
  BadgeCheck,
  Bell,
  Boxes,
  ClipboardCheck,
  Heart,
  LayoutDashboard,
  MapPin,
  Package,
  Percent,
  Settings,
  ShoppingBag,
  Star,
  Store,
  Tags,
  TrendingUp,
  User,
  Users,
  type LucideIcon,
} from "lucide-react";

export type DashboardArea = "customer" | "seller" | "admin";

export type NavItem = { label: string; href: string; icon: LucideIcon };

export const areaMeta: Record<DashboardArea, { label: string; home: string; maxWidth: string }> = {
  customer: { label: "My account", home: "/dashboard", maxWidth: "max-w-4xl" },
  seller: { label: "Seller centre", home: "/seller", maxWidth: "max-w-6xl" },
  admin: { label: "Admin console", home: "/admin", maxWidth: "max-w-7xl" },
};

export const dashboardNav: Record<DashboardArea, NavItem[]> = {
  customer: [
    { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
    { label: "Orders", href: "/dashboard/orders", icon: Package },
    { label: "Wishlist", href: "/dashboard/wishlist", icon: Heart },
    { label: "Addresses", href: "/dashboard/addresses", icon: MapPin },
    { label: "Reviews", href: "/dashboard/reviews", icon: Star },
    { label: "Notifications", href: "/dashboard/notifications", icon: Bell },
    { label: "Profile", href: "/dashboard/profile", icon: User },
  ],
  seller: [
    { label: "Overview", href: "/seller", icon: LayoutDashboard },
    { label: "Products", href: "/seller/products", icon: Package },
    { label: "Inventory", href: "/seller/inventory", icon: Boxes },
    { label: "Orders", href: "/seller/orders", icon: ShoppingBag },
    { label: "Analytics", href: "/seller/analytics", icon: TrendingUp },
    { label: "Store", href: "/seller/store", icon: Store },
    { label: "Settings", href: "/seller/settings", icon: Settings },
  ],
  admin: [
    { label: "Overview", href: "/admin", icon: LayoutDashboard },
    { label: "Users", href: "/admin/users", icon: Users },
    { label: "Sellers", href: "/admin/sellers", icon: Store },
    { label: "Applications", href: "/admin/sellers/applications", icon: ClipboardCheck },
    { label: "Products", href: "/admin/products", icon: Package },
    { label: "Categories", href: "/admin/categories", icon: Tags },
    { label: "Brands", href: "/admin/brands", icon: BadgeCheck },
    { label: "Orders", href: "/admin/orders", icon: ShoppingBag },
    { label: "Commissions", href: "/admin/commissions", icon: Percent },
    { label: "Settings", href: "/admin/settings", icon: Settings },
  ],
};