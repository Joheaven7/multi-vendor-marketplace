"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";

type ReasonDialogProps = {
  title: string;
  description: string;
  submitLabel: string;
  variant?: "primary" | "danger";
  loading?: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => void;
};

/** Asks the admin for a written reason, which the seller will see. */
export function ReasonDialog({
  title,
  description,
  submitLabel,
  variant = "danger",
  loading = false,
  onClose,
  onSubmit,
}: ReasonDialogProps) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string>();

  const submit = () => {
    const value = reason.trim();
    if (value.length < 5) return setError("Please enter at least 5 characters");
    if (value.length > 500) return setError("Reason must be at most 500 characters");
    setError(undefined);
    onSubmit(value);
  };

  return (
    <Modal
      open
      onClose={loading ? () => {} : onClose}
      title={title}
      description={description}
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant={variant} onClick={submit} loading={loading}>
            {submitLabel}
          </Button>
        </>
      }
    >
      <Textarea
        label="Reason"
        hint="The seller will see this message."
        maxLength={500}
        value={reason}
        error={error}
        onChange={(event) => {
          setReason(event.target.value);
          if (error) setError(undefined);
        }}
      />
    </Modal>
  );
}