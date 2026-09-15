import Link from "next/link";
import { Plus } from "lucide-react";

/**
 * Page header — title, one supporting line, and the single primary action.
 * Submitting an idea is the most meaningful action for a student, so it is the
 * only primary CTA on this page.
 */
export default function DashboardHeader() {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-[28px] font-bold leading-tight tracking-tight text-ink">
          Student Dashboard
        </h1>
        <p className="mt-1.5 text-[14px] text-muted-ink">
          Track your projects, milestones, mentoring, and incubation progress.
        </p>
      </div>

      <Link
        href="/student/submit"
        className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg bg-brand px-4 text-[14px] font-semibold text-white transition-colors duration-150 hover:bg-brand-hover active:bg-brand-active focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 focus-visible:ring-offset-1"
      >
        <Plus className="-ml-0.5 size-4" aria-hidden="true" />
        Submit New Idea
      </Link>
    </header>
  );
}
