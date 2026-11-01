"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { Card } from "@/components/shared/Surface";

/**
 * Shown when data failed to load. A failure is never rendered as "empty": the student is told what
 * happened and, when retrying can help, gets a button that re-runs the server fetch.
 */
export default function LoadError({
  title,
  message,
  canRetry = true,
  backHref,
  backLabel = "Back",
}: {
  title: string;
  message: string;
  canRetry?: boolean;
  backHref?: string;
  backLabel?: string;
}) {
  const router = useRouter();
  return (
    <Card>
      <div role="alert" className="flex flex-col items-start gap-4 p-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-danger" aria-hidden="true" />
          <div>
            <h2 className="text-[16px] font-semibold text-ink">{title}</h2>
            <p className="mt-1 text-[13px] text-muted-ink">{message}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {canRetry && (
            <button
              type="button"
              onClick={() => router.refresh()}
              className="inline-flex h-9 items-center rounded-lg bg-brand px-4 text-[13px] font-semibold text-white hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
            >
              Try again
            </button>
          )}
          {backHref && (
            <Link
              href={backHref}
              className="inline-flex h-9 items-center rounded-lg border border-line bg-white px-4 text-[13px] font-medium text-ink hover:bg-nav-hover"
            >
              {backLabel}
            </Link>
          )}
        </div>
      </div>
    </Card>
  );
}
