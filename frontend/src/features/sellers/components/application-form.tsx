"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { applyServerErrors } from "@/lib/forms";
import { toast } from "@/store/toast-store";
import { useApplySeller } from "../hooks";
import { applicationSchema, type ApplicationValues } from "../schemas";
import type { Seller } from "../types";

const REGIONS = [
  "Addis Ababa",
  "Afar",
  "Amhara",
  "Benishangul-Gumuz",
  "Central Ethiopia",
  "Dire Dawa",
  "Gambela",
  "Harari",
  "Oromia",
  "Sidama",
  "Somali",
  "South Ethiopia",
  "South West Ethiopia",
  "Tigray",
];

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-5">
      <legend className="mb-1 font-display text-lg text-ink">{title}</legend>
      {children}
    </fieldset>
  );
}

/** `initial` pre-fills the form when a rejected seller re-applies. */
export function ApplicationForm({ initial }: { initial?: Seller }) {
  const apply = useApplySeller();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ApplicationValues>({
    resolver: zodResolver(applicationSchema),
    defaultValues: {
      storeName: initial?.storeName ?? "",
      description: initial?.description ?? "",
      businessName: initial?.businessName ?? "",
      phone: initial?.phone ?? "",
      tinNumber: initial?.tinNumber ?? "",
      address: {
        region: initial?.address.region ?? "",
        city: initial?.address.city ?? "",
        subcity: initial?.address.subcity ?? "",
        details: initial?.address.details ?? "",
      },
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await apply.mutateAsync({
        storeName: values.storeName,
        description: values.description || undefined,
        businessName: values.businessName,
        phone: values.phone,
        tinNumber: values.tinNumber || undefined,
        address: {
          region: values.address.region,
          city: values.address.city,
          subcity: values.address.subcity || undefined,
          details: values.address.details || undefined,
        },
      });
      toast.success("Application submitted", "We will review it shortly.");
    } catch (error) {
      setFormError(applyServerErrors(error, setError));
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-10">
      {formError && <Alert variant="error">{formError}</Alert>}

      <FormSection title="Your store">
        <Input
          label="Store name"
          hint="Shown to customers on your storefront."
          error={errors.storeName?.message}
          {...register("storeName")}
        />
        <Textarea
          label="Description (optional)"
          placeholder="Tell customers what you sell."
          maxLength={500}
          error={errors.description?.message}
          {...register("description")}
        />
      </FormSection>

      <FormSection title="Business details">
        <div className="grid gap-5 sm:grid-cols-2">
          <Input
            label="Business name"
            error={errors.businessName?.message}
            {...register("businessName")}
          />
          <Input
            label="Business phone"
            type="tel"
            placeholder="0911223344"
            error={errors.phone?.message}
            {...register("phone")}
          />
        </div>
        <Input
          label="TIN (optional)"
          inputMode="numeric"
          maxLength={10}
          hint="10-digit tax identification number."
          error={errors.tinNumber?.message}
          {...register("tinNumber")}
        />
      </FormSection>

      <FormSection title="Location">
        <div className="grid gap-5 sm:grid-cols-2">
          <Select label="Region" error={errors.address?.region?.message} {...register("address.region")}>
            <option value="">Choose a region</option>
            {REGIONS.map((region) => (
              <option key={region} value={region}>
                {region}
              </option>
            ))}
          </Select>
          <Input label="City" error={errors.address?.city?.message} {...register("address.city")} />
          <Input
            label="Subcity / woreda (optional)"
            error={errors.address?.subcity?.message}
            {...register("address.subcity")}
          />
          <Input
            label="Street or landmark (optional)"
            error={errors.address?.details?.message}
            {...register("address.details")}
          />
        </div>
      </FormSection>

      <Button type="submit" size="lg" className="w-full sm:w-auto" loading={isSubmitting}>
        {initial ? "Re-submit application" : "Submit application"}
      </Button>
    </form>
  );
}