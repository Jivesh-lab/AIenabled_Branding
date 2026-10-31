"use client";

import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useDelayedFlag, useLongWait } from "@/hooks/useDelayedFlag";

/**
 * Branded start-up screen, shown ONLY while the signed-in workspace is genuinely initialising (the session is
 * still being resolved on a /workspace page). It is not shown for page-to-page navigation, never waits for
 * dashboard data, and is removed the moment the session is known (signed in or not). It also stays hidden for the
 * first 120ms, so a fast session check shows nothing at all.
 */
export default function AppStartupLoader() {
  const { status } = useSession();
  const pathname = usePathname();
  const initialising = status === "loading" && (pathname?.startsWith("/workspace") ?? false);
  const show = useDelayedFlag(initialising, 120);
  const slow = useLongWait(initialising, 8000);

  if (!show) return null;
  return (
    <div role="status" aria-live="polite" className="fixed inset-0 z-[90] flex items-center justify-center bg-canvas px-6">
      <div className="w-full max-w-md rounded-2xl border border-line bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-brand-deep">
          <svg viewBox="0 0 20 20" className="size-7 text-white" fill="none" aria-hidden="true">
            <path d="M10 2L17 6V14L10 18L3 14V6L10 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
            <path d="M10 7L13 9V13L10 15L7 13V9L10 7Z" fill="currentColor" opacity="0.5" />
          </svg>
        </div>
        <h2 className="mt-4 text-[20px] font-semibold tracking-tight text-brand-deep">DBIT</h2>
        <p className="text-[13px] text-muted-ink">Incubation Centre</p>

        <div className="mx-auto mt-6 h-1.5 w-full overflow-hidden rounded-full bg-brand-soft" aria-hidden="true">
          <div className="h-full w-1/3 rounded-full bg-brand animate-[startup-progress-slide_1.3s_ease-in-out_infinite] motion-reduce:w-full motion-reduce:animate-none motion-reduce:opacity-60" />
        </div>

        <p className="mt-4 text-[14px] font-medium text-ink">Preparing your workspace...</p>
        <p className="mt-1 text-[13px] text-muted-ink">Securing your session and loading your dashboard.</p>

        {slow && (
          <div className="mt-5 border-t border-line pt-4">
            <p className="text-[13px] text-muted-ink">Taking longer than usual…</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-2 inline-flex h-9 items-center rounded-lg bg-brand px-4 text-[13px] font-semibold text-white hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
            >
              Reload
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
