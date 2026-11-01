"use client";

import { useId } from "react";
import Link from "next/link";
import { BookOpenIcon, CalendarDaysIcon, ChevronDownIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";
import { Card, ProgressBar, StatusBadge } from "@/components/shared/Surface";
import { HEALTH_TONE, cleanName, initialsOf, type Mentee } from "../_lib/mentees";

function Fact({ label, value }: { label: string; value?: string | number }) {
  return (
    <div className="min-w-0">
      <dt className="text-[12px] text-muted-ink">{label}</dt>
      <dd className="mt-0.5 truncate text-[13px] font-medium text-ink">{value || "Not recorded"}</dd>
    </div>
  );
}

/** One mentee. The header is a real button (keyboard and screen-reader friendly) that opens the details below. */
export default function MenteeRow({ mentee, open, onToggle }: { mentee: Mentee; open: boolean; onToggle: () => void }) {
  const panelId = useId();
  const who = [mentee.department, mentee.rollNumber].filter(Boolean).join(" · ");

  return (
    <Card className="overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full items-start gap-4 p-5 text-left outline-none transition-colors hover:bg-nav-hover focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand/40"
      >
        <span
          aria-hidden="true"
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-soft text-[13px] font-semibold text-brand"
        >
          {initialsOf(mentee.name)}
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-[15px] font-semibold leading-snug text-ink">{cleanName(mentee.name)}</span>
            <StatusBadge label={mentee.health} tone={HEALTH_TONE[mentee.health]} />
            {typeof mentee.trl === "number" && (
              <span className="rounded-md border border-line bg-white px-2 py-0.5 text-[11px] font-semibold text-muted-ink">TRL {mentee.trl}</span>
            )}
          </span>

          {mentee.projectTitle && <span className="mt-1 block truncate text-[13px] font-medium text-ink">{mentee.projectTitle}</span>}
          {who && <span className="mt-0.5 block truncate text-[12px] text-muted-ink">{who}</span>}

          <span className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-muted-ink">
            {mentee.stage && (
              <span className="inline-flex items-center gap-1.5">
                <BookOpenIcon className="size-3.5" aria-hidden="true" /> Stage: {mentee.stage}
              </span>
            )}
            <span className={cn("inline-flex items-center gap-1.5", mentee.overdueMilestones > 0 && "font-medium text-brand-gold-ink")}>
              <ExclamationTriangleIcon className="size-3.5" aria-hidden="true" />
              {mentee.overdueMilestones > 0
                ? `${mentee.overdueMilestones} overdue ${mentee.overdueMilestones === 1 ? "milestone" : "milestones"}`
                : "No overdue milestones"}
            </span>
          </span>
        </span>

        <span className="hidden w-36 shrink-0 sm:block">
          <ProgressBar value={mentee.progress} label="Progress" />
        </span>

        <ChevronDownIcon
          className={cn("mt-1 size-4 shrink-0 text-muted-ink transition-transform duration-150", open && "rotate-180")}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div id={panelId} className="border-t border-line bg-canvas/50 px-5 py-4">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
            <Fact label="Department" value={mentee.department} />
            <Fact label="Roll number" value={mentee.rollNumber} />
            <Fact label="Domain" value={mentee.domain} />
            <Fact label="Stage" value={mentee.stage} />
          </dl>
          <div className="mt-4 sm:hidden">
            <ProgressBar value={mentee.progress} label="Progress" />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/workspace/mentor/schedule"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-brand px-3.5 text-[13px] font-semibold text-white transition-colors hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 focus-visible:ring-offset-1"
            >
              <CalendarDaysIcon className="size-4" aria-hidden="true" />
              Schedule a session
            </Link>
          </div>
        </div>
      )}
    </Card>
  );
}
