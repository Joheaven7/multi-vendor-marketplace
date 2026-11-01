"use client";

import { Alert } from "@/components/ui/alert";
import { useMySeller } from "@/features/sellers/hooks";

/** Shown on every seller screen while the store is suspended. */
export function SellerStatusBanner() {
  const { data: seller } = useMySeller();

  if (seller?.status !== "SUSPENDED") return null;

  return (
    <Alert variant="error" className="mb-6">
      <p className="font-medium">Your store is suspended</p>
      <p className="mt-1">
        Your products are hidden from customers and you cannot add or edit products.
        {seller.suspensionReason ? ` Reason: ${seller.suspensionReason}.` : ""} Contact support to
        resolve this.
      </p>
    </Alert>
  );
}