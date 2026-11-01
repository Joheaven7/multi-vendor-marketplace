"use client";

import Link from "next/link";
import { ErrorState } from "@/components/ui/error-state";
import { buttonVariants } from "@/components/ui/button";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="grid min-h-dvh place-items-center px-6">
      <div className="w-full max-w-lg text-center">
        <ErrorState
          title="Something went wrong"
          message="An unexpected error stopped this page from loading. You can try again, or go back to the shop."
          onRetry={reset}
        />
        <Link href="/" className={buttonVariants({ variant: "ghost", className: "mt-4" })}>
          Go to the homepage
        </Link>
      </div>
    </main>
  );
}