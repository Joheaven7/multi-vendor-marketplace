"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { LoadingState } from "@/components/ui/skeleton";
import { ApiError } from "@/lib/api-client";
import { useCurrentUser } from "../hooks";
import type { Role } from "../types";
import { getHomePath } from "../utils";

type RoleGuardProps = {
  roles: Role[];
  area: "customer" | "seller" | "admin";
  children: React.ReactNode;
};

function FullPage({ children }: { children: React.ReactNode }) {
  return <div className="grid min-h-dvh place-items-center p-6">{children}</div>;
}

/**
 * UX guard only. The backend enforces every permission; this just avoids showing
 * screens a user cannot use and redirects signed-out visitors to the login page.
 */
export function RoleGuard({ roles, area, children }: RoleGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: user, isLoading, isError, error, refetch } = useCurrentUser();

  const signedOut = !isLoading && user === null;

  useEffect(() => {
    if (signedOut) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [signedOut, pathname, router]);

  if (isLoading || signedOut) {
    return (
      <FullPage>
        <LoadingState message="Checking your session…" />
      </FullPage>
    );
  }

  if (isError || !user) {
    const suspended = error instanceof ApiError && error.code === "ACCOUNT_SUSPENDED";
    return (
      <FullPage>
        <ErrorState
          title={suspended ? "Account suspended" : "Unable to verify your session"}
          message={suspended ? "This account has been suspended. Contact support for help." : undefined}
          onRetry={suspended ? undefined : () => refetch()}
        />
      </FullPage>
    );
  }

  if (!roles.includes(user.role)) {
    const needsSellerAccount = area === "seller" && user.role === "CUSTOMER";
    return (
      <FullPage>
        <EmptyState
          className="max-w-md"
          icon={<Lock />}
          title="You don't have access to this page"
          description={
            needsSellerAccount
              ? "This area is for approved sellers. Apply to start selling on the marketplace."
              : "Your account does not have permission to view this area."
          }
          action={
            <div className="flex flex-col gap-3 sm:flex-row">
              {needsSellerAccount && (
                <Link href="/become-seller" className={buttonVariants()}>
                  Apply to sell
                </Link>
              )}
              <Link
                href={getHomePath(user.role)}
                className={buttonVariants({ variant: needsSellerAccount ? "outline" : "primary" })}
              >
                Go to my dashboard
              </Link>
            </div>
          }
        />
      </FullPage>
    );
  }

  return <>{children}</>;
}