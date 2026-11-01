"use client";

import { useId } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDialog } from "@/lib/use-dialog";
import { useIsClient } from "@/lib/use-is-client";

type DrawerProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  side?: "left" | "right";
  children?: React.ReactNode;
  className?: string;
};

export function Drawer({ open, onClose, title, side = "left", children, className }: DrawerProps) {
  const isClient = useIsClient();
  const ref = useDialog(open, onClose);
  const titleId = useId();

  if (!isClient) return null;

  const offscreen = side === "left" ? "-100%" : "100%";

  return createPortal(
    <AnimatePresence>
      {open && (
        <div key="drawer" className="fixed inset-0 z-50">
          <motion.div
            aria-hidden
            className="absolute inset-0 bg-ink/45"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          />
          <motion.div
            ref={ref}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            className={cn(
              "absolute inset-y-0 flex w-[86vw] max-w-sm flex-col bg-surface shadow-overlay outline-none",
              side === "left" ? "left-0" : "right-0",
              className,
            )}
            initial={{ x: offscreen }}
            animate={{ x: 0 }}
            exit={{ x: offscreen }}
            transition={{ duration: 0.22, ease: "easeOut" }}
          >
            <div className="flex h-16 shrink-0 items-center justify-between border-b border-line px-5">
              <h2 id={titleId} className="font-display text-lg text-ink">
                {title}
              </h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="-mr-2 rounded-md p-2 text-muted transition-colors hover:bg-ink/5 hover:text-ink"
              >
                <X className="size-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}