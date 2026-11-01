"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type ImageGalleryProps = {
  images: { url: string }[];
  name: string;
};

const arrowButton =
  "absolute top-1/2 hidden size-10 -translate-y-1/2 items-center justify-center rounded-full bg-surface/90 text-ink shadow-soft transition-colors hover:bg-surface md:flex";

/** A swipeable strip (CSS scroll-snap) with thumbnails. Works with touch, mouse and keyboard. */
export function ImageGallery({ images, name }: ImageGalleryProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  const goTo = (index: number) => {
    const track = trackRef.current;
    if (!track) return;
    const clamped = Math.max(0, Math.min(images.length - 1, index));
    track.scrollTo({ left: clamped * track.clientWidth, behavior: "smooth" });
  };

  const onScroll = () => {
    const track = trackRef.current;
    if (!track || track.clientWidth === 0) return;
    setActive(Math.round(track.scrollLeft / track.clientWidth));
  };

  if (images.length === 0) {
    return (
      <div className="flex aspect-[4/5] items-center justify-center rounded-lg border border-line bg-canvas text-subtle">
        <ImageIcon className="size-10" aria-hidden />
        <span className="sr-only">No images available</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <div
          ref={trackRef}
          onScroll={onScroll}
          tabIndex={0}
          role="region"
          aria-roledescription="carousel"
          aria-label={`${name} images`}
          onKeyDown={(event) => {
            if (event.key === "ArrowRight") {
              event.preventDefault();
              goTo(active + 1);
            } else if (event.key === "ArrowLeft") {
              event.preventDefault();
              goTo(active - 1);
            }
          }}
          className="flex snap-x snap-mandatory overflow-x-auto rounded-lg border border-line bg-canvas [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {images.map((image, index) => (
            <div
              key={image.url}
              role="group"
              aria-roledescription="slide"
              aria-label={`${index + 1} of ${images.length}`}
              className="relative aspect-[4/5] w-full shrink-0 snap-center"
            >
              <Image
                src={image.url}
                alt={`${name}, image ${index + 1}`}
                fill
                sizes="(min-width: 1024px) 50vw, 100vw"
                priority={index === 0}
                className="object-cover"
              />
            </div>
          ))}
        </div>

        {images.length > 1 && (
          <>
            <button
              type="button"
              aria-label="Previous image"
              disabled={active === 0}
              onClick={() => goTo(active - 1)}
              className={cn(arrowButton, "left-3 disabled:pointer-events-none disabled:opacity-40")}
            >
              <ChevronLeft className="size-5" />
            </button>
            <button
              type="button"
              aria-label="Next image"
              disabled={active === images.length - 1}
              onClick={() => goTo(active + 1)}
              className={cn(arrowButton, "right-3 disabled:pointer-events-none disabled:opacity-40")}
            >
              <ChevronRight className="size-5" />
            </button>
            <p
              className="absolute bottom-3 right-3 rounded-md bg-surface/90 px-2 py-1 text-xs text-ink md:hidden"
              aria-hidden
            >
              {active + 1} / {images.length}
            </p>
          </>
        )}
      </div>

      {images.length > 1 && (
        <ul className="hidden gap-2 sm:flex" aria-label="Choose an image">
          {images.map((image, index) => (
            <li key={image.url}>
              <button
                type="button"
                onClick={() => goTo(index)}
                aria-label={`Show image ${index + 1}`}
                aria-current={index === active ? "true" : undefined}
                className={cn(
                  "relative size-16 overflow-hidden rounded-md border-2 transition-colors",
                  index === active ? "border-accent" : "border-line hover:border-line-strong",
                )}
              >
                <Image src={image.url} alt="" fill sizes="64px" className="object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}