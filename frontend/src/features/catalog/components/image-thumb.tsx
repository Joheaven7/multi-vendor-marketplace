import { ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type ImageThumbProps = { url?: string; className?: string };

/** Small square preview. Decorative: the name next to it already describes the item. */
export function ImageThumb({ url, className }: ImageThumbProps) {
  const base = "size-10 shrink-0 rounded-md border border-line";

  if (!url) {
    return (
      <span className={cn(base, "flex items-center justify-center bg-canvas text-subtle", className)} aria-hidden>
        <ImageIcon className="size-4" />
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt="" loading="lazy" className={cn(base, "object-cover", className)} />
  );
}