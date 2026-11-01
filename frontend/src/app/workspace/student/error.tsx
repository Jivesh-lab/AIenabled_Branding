"use client";

import { useEffect } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import PageContainer from "@/components/shared/PageContainer";
import { Card } from "@/components/shared/Surface";

/**
 * Route-level safety net for every Student Portal page: if rendering throws, the student sees a calm message and a
 * way forward inside the normal shell (sidebar and header stay). The technical error is logged for developers and is
 * never shown on screen.
 */
export default function StudentError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[researcher portal]", error);
    toast.error("Something went wrong loading this page.", { id: "student-route-error" });
  }, [error]);

  return (
    <PageContainer>
      <Card>
        <div role="alert" className="flex flex-col items-start gap-4 p-6">
          <div className="flex items-start gap-3">
            <ExclamationTriangleIcon className="mt-0.5 size-5 shrink-0 text-danger" aria-hidden="true" />
            <div>
              <h2 className="text-[16px] font-semibold text-ink">We couldn&apos;t load this page</h2>
              <p className="mt-1 text-[13px] text-muted-ink">
                Something went wrong on our side. Your information is safe. Please try again, or head back to your dashboard.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={reset}
              className="inline-flex h-9 items-center rounded-lg bg-brand px-4 text-[13px] font-semibold text-white hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
            >
              Try again
            </button>
            <Link
              href="/workspace/student/dashboard"
              className="inline-flex h-9 items-center rounded-lg border border-line bg-white px-4 text-[13px] font-medium text-ink hover:bg-nav-hover"
            >
              Go to dashboard
            </Link>
          </div>
        </div>
      </Card>
    </PageContainer>
  );
}
