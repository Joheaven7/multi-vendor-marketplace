"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

type Health = { status: string; uptime: number; timestamp: string; database: string };

export function HealthStatus() {
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["health"],
    queryFn: () => api.get<Health>("/health"),
  });

  if (isLoading) {
    return <p className="text-sm text-neutral-500">Checking API…</p>;
  }

  if (isError) {
    return (
      <div className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        <p>{error instanceof Error ? error.message : "Unable to reach the API."}</p>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="mt-3 rounded bg-red-700 px-3 py-1.5 text-white disabled:opacity-60"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="rounded border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
      API: {data?.status} · Database: {data?.database} · Uptime: {data?.uptime}s
    </div>
  );
}