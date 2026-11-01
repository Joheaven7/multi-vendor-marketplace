import Link from "next/link";
import { cn } from "@/lib/utils";
import { siteConfig } from "@/lib/site";

export function Logo({ className, href = "/" }: { className?: string; href?: string }) {
  return (
    <Link
      href={href}
      className={cn("font-display text-xl uppercase tracking-[0.2em] text-ink", className)}
    >
      {siteConfig.name}
    </Link>
  );
}