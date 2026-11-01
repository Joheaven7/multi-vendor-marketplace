"use client";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDate } from "@/lib/format";
import type { Seller, SellerAction } from "../types";

type SellerDetailsModalProps = {
  seller: Seller | null;
  open: boolean;
  onClose: () => void;
  onAction: (action: SellerAction) => void;
};

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wider text-muted">{label}</dt>
      <dd className="mt-1 break-words text-sm text-ink">{children}</dd>
    </div>
  );
}

function Footer({ seller, onClose, onAction }: Omit<SellerDetailsModalProps, "open" | "seller"> & { seller: Seller }) {
  switch (seller.status) {
    case "PENDING":
      return (
        <>
          <Button variant="outline" onClick={() => onAction("reject")}>
            Reject
          </Button>
          <Button onClick={() => onAction("approve")}>Approve</Button>
        </>
      );
    case "ACTIVE":
      return (
        <>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button variant="danger" onClick={() => onAction("suspend")}>
            Suspend
          </Button>
        </>
      );
    case "SUSPENDED":
      return (
        <>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button onClick={() => onAction("reactivate")}>Reactivate</Button>
        </>
      );
    default:
      return (
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      );
  }
}

export function SellerDetailsModal({ seller, open, onClose, onAction }: SellerDetailsModalProps) {
  const address = seller
    ? [seller.address.details, seller.address.subcity, seller.address.city, seller.address.region]
        .filter(Boolean)
        .join(", ")
    : "";

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={seller?.storeName ?? ""}
      description={seller ? `Application from ${seller.owner?.name ?? "unknown"}` : undefined}
      size="lg"
      footer={seller ? <Footer seller={seller} onClose={onClose} onAction={onAction} /> : undefined}
    >
      {seller && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge status={seller.status} />
            <span className="text-sm text-muted">Submitted {formatDate(seller.submittedAt)}</span>
          </div>

          {seller.rejectionReason && <Alert variant="error">Rejected: {seller.rejectionReason}</Alert>}
          {seller.suspensionReason && (
            <Alert variant="warning">Suspended: {seller.suspensionReason}</Alert>
          )}

          <dl className="grid gap-5 sm:grid-cols-2">
            <Detail label="Owner">
              {seller.owner?.name}
              <br />
              <span className="text-muted">{seller.owner?.email}</span>
            </Detail>
            <Detail label="Business name">{seller.businessName}</Detail>
            <Detail label="Business phone">{seller.phone}</Detail>
            <Detail label="TIN">{seller.tinNumber ?? "Not provided"}</Detail>
            <Detail label="Address">{address}</Detail>
            <Detail label="Documents">
              {seller.documents.length > 0
                ? `${seller.documents.length} uploaded`
                : "None uploaded yet"}
            </Detail>
          </dl>

          {seller.description && (
            <div>
              <h3 className="text-xs font-medium uppercase tracking-wider text-muted">Description</h3>
              <p className="mt-1 text-sm text-ink">{seller.description}</p>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}