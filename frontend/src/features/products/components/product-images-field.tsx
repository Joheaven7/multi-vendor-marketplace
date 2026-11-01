"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, ImagePlus, LoaderCircle, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useUploadImage } from "@/features/catalog/hooks";
import { MAX_IMAGES } from "../form-utils";
import type { ManagedImage } from "../types";

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

type ProductImagesFieldProps = {
  images: ManagedImage[];
  onChange: (images: ManagedImage[]) => void;
  error?: string;
  disabled?: boolean;
};

const iconButton =
  "flex size-7 items-center justify-center rounded-full bg-surface/90 text-ink shadow-soft transition-colors hover:bg-surface disabled:pointer-events-none disabled:opacity-40";

export function ProductImagesField({ images, onChange, error, disabled }: ProductImagesFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const latest = useRef(images);
  const upload = useUploadImage();
  const [pending, setPending] = useState(0);
  const [problems, setProblems] = useState<string[]>([]);

  // Uploads finish one after another; this keeps the list current between them.
  useEffect(() => {
    latest.current = images;
  });

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList) return;

    const room = Math.max(MAX_IMAGES - latest.current.length, 0);
    const files = Array.from(fileList);
    const accepted = files.slice(0, room);
    const issues: string[] = [];
    if (files.length > accepted.length) issues.push(`You can add at most ${MAX_IMAGES} images.`);

    setProblems([]);
    setPending(accepted.length);

    for (const file of accepted) {
      try {
        if (!ACCEPTED_TYPES.includes(file.type)) {
          issues.push(`${file.name}: use a JPEG, PNG or WebP image.`);
        } else if (file.size > MAX_BYTES) {
          issues.push(`${file.name}: image must be 5 MB or smaller.`);
        } else {
          const image = await upload.mutateAsync({ file, purpose: "product" });
          const next = [...latest.current, { url: image.url, publicId: image.publicId }];
          latest.current = next;
          onChange(next);
        }
      } catch (err) {
        issues.push(`${file.name}: ${err instanceof Error ? err.message : "upload failed"}`);
      } finally {
        setPending((count) => count - 1);
      }
    }
    setProblems(issues);
  };

  const move = (index: number, direction: -1 | 1) => {
    const next = [...images];
    [next[index], next[index + direction]] = [next[index + direction], next[index]];
    onChange(next);
  };

  const busy = pending > 0;
  const canAdd = !disabled && images.length + pending < MAX_IMAGES;

  return (
    <div className="flex flex-col gap-2">
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="Product images">
        {images.map((image, index) => (
          <li
            key={image.publicId}
            className="relative aspect-square overflow-hidden rounded-lg border border-line bg-canvas"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={image.url} alt={`Product image ${index + 1}`} className="size-full object-cover" />
            {index === 0 && (
              <Badge variant="accent" className="absolute left-2 top-2 bg-surface">
                Primary
              </Badge>
            )}
            <div className="absolute inset-x-2 bottom-2 flex items-center justify-between">
              <div className="flex gap-1">
                <button
                  type="button"
                  className={iconButton}
                  aria-label={`Move image ${index + 1} earlier`}
                  disabled={disabled || index === 0}
                  onClick={() => move(index, -1)}
                >
                  <ArrowLeft className="size-3.5" />
                </button>
                <button
                  type="button"
                  className={iconButton}
                  aria-label={`Move image ${index + 1} later`}
                  disabled={disabled || index === images.length - 1}
                  onClick={() => move(index, 1)}
                >
                  <ArrowRight className="size-3.5" />
                </button>
              </div>
              <button
                type="button"
                className={iconButton}
                aria-label={`Remove image ${index + 1}`}
                disabled={disabled}
                onClick={() => onChange(images.filter((_, i) => i !== index))}
              >
                <X className="size-3.5" />
              </button>
            </div>
          </li>
        ))}

        {busy && (
          <li
            role="status"
            className="flex aspect-square flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-line-strong bg-canvas text-sm text-muted"
          >
            <LoaderCircle className="size-5 animate-spin" aria-hidden />
            Uploading {pending}…
          </li>
        )}

        {canAdd && (
          <li>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex aspect-square w-full flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-line-strong text-muted transition-colors hover:border-accent hover:text-accent"
            >
              <ImagePlus className="size-6" aria-hidden />
              <span className="text-sm">Add images</span>
            </button>
          </li>
        )}
      </ul>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPTED_TYPES.join(",")}
        className="hidden"
        tabIndex={-1}
        onChange={(event) => {
          void handleFiles(event.target.files);
          event.target.value = "";
        }}
      />

      <p className="text-sm text-muted">
        JPEG, PNG or WebP, up to 5 MB each. The first image is the primary one.
      </p>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      {problems.map((problem) => (
        <p key={problem} role="alert" className="text-sm text-danger">
          {problem}
        </p>
      ))}
    </div>
  );
}