"use client";

import { useId, useRef, useState } from "react";
import { ImagePlus, LoaderCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUploadImage } from "../hooks";
import type { ManagedImage, UploadPurpose } from "../types";

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

type ImageUploaderProps = {
  label: string;
  purpose: UploadPurpose;
  value: ManagedImage | null;
  onChange: (image: ManagedImage | null) => void;
  hint?: string;
  error?: string;
  disabled?: boolean;
};

/**
 * Picks an image, checks it in the browser (type and size, for quick feedback),
 * uploads it, and reports the result. The server checks everything again.
 */
export function ImageUploader({ label, purpose, value, onChange, hint, error, disabled }: ImageUploaderProps) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const upload = useUploadImage();
  const [localError, setLocalError] = useState<string | null>(null);

  const message = localError ?? error;
  const busy = upload.isPending;

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setLocalError(null);

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setLocalError("Use a JPEG, PNG or WebP image.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setLocalError("Image must be 5 MB or smaller.");
      return;
    }

    try {
      const image = await upload.mutateAsync({ file, purpose });
      onChange({ url: image.url, publicId: image.publicId });
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Upload failed. Please try again.");
    }
  };

  const openPicker = () => inputRef.current?.click();

  return (
    <div className="flex flex-col gap-1.5">
      <span id={`${id}-label`} className="text-sm font-medium text-ink">
        {label}
      </span>

      <div className="flex items-center gap-4">
        <div
          className={cn(
            "relative size-24 shrink-0 overflow-hidden rounded-lg border bg-canvas",
            message ? "border-danger" : "border-line-strong",
          )}
        >
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value.url} alt={`${label} preview`} className="size-full object-cover" />
          ) : (
            <button
              type="button"
              onClick={openPicker}
              disabled={disabled || busy}
              aria-labelledby={`${id}-label`}
              className="flex size-full flex-col items-center justify-center gap-1 text-muted transition-colors hover:text-ink disabled:opacity-50"
            >
              <ImagePlus className="size-6" aria-hidden />
              <span className="text-xs">Upload</span>
            </button>
          )}

          {busy && (
            <div
              role="status"
              className="absolute inset-0 flex items-center justify-center bg-surface/80"
            >
              <LoaderCircle className="size-5 animate-spin text-muted" aria-hidden />
              <span className="sr-only">Uploading…</span>
            </div>
          )}
        </div>

        {value && (
          <div className="flex flex-col items-start gap-1">
            <button
              type="button"
              onClick={openPicker}
              disabled={disabled || busy}
              className="text-sm font-medium text-accent hover:text-accent-hover disabled:opacity-50"
            >
              Replace
            </button>
            <button
              type="button"
              onClick={() => onChange(null)}
              disabled={disabled || busy}
              className="inline-flex items-center gap-1 text-sm text-muted hover:text-danger disabled:opacity-50"
            >
              <X className="size-3.5" aria-hidden />
              Remove
            </button>
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(",")}
        className="hidden"
        tabIndex={-1}
        onChange={(event) => {
          void handleFile(event.target.files?.[0]);
          event.target.value = ""; // lets the same file be chosen again
        }}
      />

      {message ? (
        <p role="alert" className="text-sm text-danger">
          {message}
        </p>
      ) : hint ? (
        <p className="text-sm text-muted">{hint}</p>
      ) : null}
    </div>
  );
}