"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { CircleCheck, Clock, OctagonAlert } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { LoadingState } from "@/components/ui/skeleton";
import { authKeys, useCurrentUser } from "@/features/auth/hooks";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useMySeller } from "../hooks";
import type { Seller } from "../types";
import { ApplicationForm } from "./application-form";

const tones = {
  warning: "border-warning/25 bg-warning-soft/60 [&_.icon]:bg-warning-soft [&_.icon]:text-warning",
  success: "border-success/25 bg-success-soft/60 [&_.icon]:bg-success-soft [&_.icon]:text-success",
  danger: "border-danger/25 bg-danger-soft/60 [&_.icon]:bg-danger-soft [&_.icon]:text-danger",
} as const;

function StatusPanel({
  tone,
  icon,
  title,
  children,
  action,
}: {
  tone: keyof typeof tones;
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className={cn("rounded-lg border p-6 sm:p-8", tones[tone])}>
      <div className="icon flex size-11 items-center justify-center rounded-full [&>svg]:size-5">{icon}</div>
      <h2 className="mt-5 font-display text-2xl text-ink">{title}</h2>
      <div className="mt-2 space-y-2 text-sm text-muted">{children}</div>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

function ApplicationSummary({ seller }: { seller: Seller }) {
  return (
    <dl className="mt-6 grid gap-4 rounded-lg border border-line bg-surface p-5 text-sm sm:grid-cols-2">
      <div>
        <dt className="text-xs font-medium uppercase tracking-wider text-muted">Store</dt>
        <dd className="mt-1 text-ink">{seller.storeName}</dd>
      </div>
      <div>
        <dt className="text-xs font-medium uppercase tracking-wider text-muted">Business</dt>
        <dd className="mt-1 text-ink">{seller.businessName}</dd>
      </div>
      <div>
        <dt className="text-xs font-medium uppercase tracking-wider text-muted">Location</dt>
        <dd className="mt-1 text-ink">
          {seller.address.city}, {seller.address.region}
        </dd>
      </div>
      <div>
        <dt className="text-xs font-medium uppercase tracking-wider text-muted">Submitted</dt>
        <dd className="mt-1 text-ink">{formatDate(seller.submittedAt)}</dd>
      </div>
    </dl>
  );
}

function Page({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 lg:py-16">{children}</div>;
}

function Intro({ title, text }: { title: string; text: string }) {
  return (
    <div className="mb-10">
      <h1 className="font-display text-4xl tracking-tight text-ink">{title}</h1>
      <p className="mt-3 text-muted">{text}</p>
    </div>
  );
}

export function BecomeSellerView() {
  const queryClient = useQueryClient();
  const { data: user, isLoading: userLoading } = useCurrentUser();
  const { data: seller, isLoading: sellerLoading, isError, refetch } = useMySeller();

  // Once approved, the account role changes on the server. Refresh the cached user
  // so the seller dashboard opens without logging in again.
  useEffect(() => {
    if (seller?.status === "ACTIVE" && user && user.role !== "SELLER") {
      queryClient.invalidateQueries({ queryKey: authKeys.me });
    }
  }, [seller?.status, user, queryClient]);

  if (userLoading || (user && sellerLoading)) {
    return (
      <Page>
        <LoadingState message="Loading…" />
      </Page>
    );
  }

  if (!user) {
    return (
      <Page>
        <Intro
          title="Sell on Marketplace"
          text="Open your own storefront and reach customers across Ethiopia. Sign in or create an account to apply."
        />
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link href="/login?next=%2Fbecome-seller" className={buttonVariants({ size: "lg" })}>
            Sign in
          </Link>
          <Link
            href="/register?next=%2Fbecome-seller"
            className={buttonVariants({ variant: "outline", size: "lg" })}
          >
            Create an account
          </Link>
        </div>
      </Page>
    );
  }

  if (user.role === "ADMIN") {
    return (
      <Page>
        <Alert variant="info">Admin accounts cannot open a seller store.</Alert>
      </Page>
    );
  }

  if (isError) {
    return (
      <Page>
        <ErrorState
          title="Unable to load your application"
          onRetry={() => refetch()}
        />
      </Page>
    );
  }

  if (!seller) {
    return (
      <Page>
        <Intro
          title="Sell on Marketplace"
          text="Tell us about your business. An admin reviews every application before a store goes live."
        />
        <ApplicationForm />
      </Page>
    );
  }

  if (seller.status === "PENDING") {
    return (
      <Page>
        <StatusPanel
          tone="warning"
          icon={<Clock />}
          title="Application under review"
          action={
            <Link href="/" className={buttonVariants({ variant: "outline" })}>
              Continue shopping
            </Link>
          }
        >
          <p>An admin is reviewing your application. Check back here for the result.</p>
        </StatusPanel>
        <ApplicationSummary seller={seller} />
      </Page>
    );
  }

  if (seller.status === "ACTIVE") {
    return (
      <Page>
        <StatusPanel
          tone="success"
          icon={<CircleCheck />}
          title="Your store is approved"
          action={
            <Link href="/seller" className={buttonVariants()}>
              Go to seller centre
            </Link>
          }
        >
          <p>{seller.storeName} is ready. You can now add products and receive orders.</p>
        </StatusPanel>
      </Page>
    );
  }

  if (seller.status === "SUSPENDED") {
    return (
      <Page>
        <StatusPanel tone="danger" icon={<OctagonAlert />} title="Your store is suspended">
          {seller.suspensionReason && <p>Reason: {seller.suspensionReason}</p>}
          <p>Please contact support to resolve this.</p>
        </StatusPanel>
        <ApplicationSummary seller={seller} />
      </Page>
    );
  }

  // REJECTED: show the reason and let the seller correct and re-apply.
  return (
    <Page>
      <StatusPanel tone="danger" icon={<OctagonAlert />} title="Application not approved">
        {seller.rejectionReason && <p>Reason: {seller.rejectionReason}</p>}
        <p>Update your details below and submit again.</p>
      </StatusPanel>
      <div className="mt-10">
        <ApplicationForm initial={seller} />
      </div>
    </Page>
  );
}