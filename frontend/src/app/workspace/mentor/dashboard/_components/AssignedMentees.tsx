"use client";

import Link from "next/link";
import { CalendarDaysIcon, ArrowRightIcon } from "@heroicons/react/24/outline";
import { StatusBadge } from "@/components/shared/Surface";
import { cleanName } from "@/lib/displayName";
import type { StatusTone } from "@/types/status";
import { formatShortDate } from "@/lib/formatDate";
import { useApiList } from "@/lib/useApiList";
import PanelCard, { PanelMessage } from "@/components/shared/PanelCard";
import { PanelRowsSkeleton } from "./DashboardSkeleton";

interface MenteeItem {
  id: string;
  startup: string;
  lead: string;
  stage: string;
  health: "On Track" | "Needs Attention" | "At Risk";
  updated?: string;
}

const HEALTH_TONE: Record<MenteeItem["health"], StatusTone> = {
  "On Track": "success",
  "Needs Attention": "attention",
  "At Risk": "danger",
};

/** How many mentees the dashboard previews; the full list is on My Mentees. */
const PREVIEW = 5;

interface ProjectRecord {
  id?: string;
  _id?: string;
  title?: string;
  leadStudent?: string;
  teamMembers?: string[];
  stage?: string;
  trl?: number;
  health?: string;
  updatedAt?: string;
}

function toItems(records: unknown[]): MenteeItem[] {
  return (records as ProjectRecord[]).map((p, i) => ({
    id: p.id || p._id || `mentee-${i}`,
    startup: p.title || "Untitled project",
    lead: cleanName(p.leadStudent || p.teamMembers?.[0] || "Researcher"),
    stage: p.stage || `TRL ${p.trl || 1}`,
    health: p.health === "At Risk" || p.health === "Needs Attention" ? p.health : "On Track",
    updated: formatShortDate(p.updatedAt),
  }));
}

const ghostButton =
  "inline-flex h-8 items-center gap-1.5 rounded-lg border border-line bg-white px-3 text-[13px] font-medium text-ink transition-colors hover:bg-nav-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40";

export default function AssignedMentees() {
  const { items, loading, failed, reload } = useApiList("/api/faculty/projects", toItems);
  const shown = items.slice(0, PREVIEW);

  return (
    <PanelCard
      title="Assigned Mentees"
      description="Startups and projects you are currently advising."
      action={{ label: items.length > PREVIEW ? `View all (${items.length})` : "View all", href: "/workspace/mentor/mentees" }}
    >
      {loading ? (
        <PanelRowsSkeleton rows={4} withActions />
      ) : failed ? (
        <PanelMessage onRetry={() => void reload()}>We couldn&apos;t load your mentees right now.</PanelMessage>
      ) : items.length === 0 ? (
        <PanelMessage>No mentees are assigned to you yet.</PanelMessage>
      ) : (
        <ul className="divide-y divide-line">
          {shown.map((mentee) => (
            <li key={mentee.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <h3 className="text-[14px] font-semibold leading-snug text-ink">{mentee.startup}</h3>
                  <StatusBadge label={mentee.health} tone={HEALTH_TONE[mentee.health]} />
                </div>
                <p className="mt-1 truncate text-[13px] text-muted-ink">
                  {mentee.lead} · {mentee.stage}
                  {mentee.updated && <> · Updated {mentee.updated}</>}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Link href="/workspace/mentor/mentees" className={ghostButton}>
                  View
                  <ArrowRightIcon className="size-3.5" aria-hidden="true" />
                </Link>
                <Link href="/workspace/mentor/schedule" className={ghostButton}>
                  <CalendarDaysIcon className="size-3.5" aria-hidden="true" />
                  Schedule
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </PanelCard>
  );
}
