"use client";

import { ClipboardDocumentCheckIcon } from "@heroicons/react/24/outline";
import ActivityTimeline, { type ActivityEntry } from "@/components/shared/ActivityTimeline";
import { cleanName } from "@/lib/displayName";
import { formatShortDate } from "@/lib/formatDate";
import { useApiList } from "@/lib/useApiList";
import PanelCard, { PanelMessage } from "@/components/shared/PanelCard";
import { PanelRowsSkeleton } from "./DashboardSkeleton";

interface OverviewProject {
  id?: string;
  _id?: string;
  leadStudent?: string;
  stage?: string;
  updatedAt?: string;
}

const LIMIT = 4;

/** /api/faculty/overview returns `{ data: { projects, metrics } }`; the timeline is built from the projects. */
function projectsOf(data: unknown): unknown {
  return (data as { projects?: unknown } | null)?.projects;
}

function toEntries(records: unknown[]): ActivityEntry[] {
  return (records as OverviewProject[]).slice(0, LIMIT).map((p, i) => ({
    id: p.id || p._id || `activity-${i}`,
    title: (
      <>
        <span className="font-semibold">{cleanName(p.leadStudent || "Researcher")}</span>{" "}
        <span className="text-muted-ink">updated milestone status to {p.stage || "In Review"}</span>
      </>
    ),
    meta: formatShortDate(p.updatedAt),
    icon: ClipboardDocumentCheckIcon,
    tone: "info",
  }));
}

/** Recent milestone updates across the mentor's projects, in the shared Recent Activity timeline. */
export default function RecentActivity() {
  const { items, loading, failed, reload } = useApiList("/api/faculty/overview", toEntries, projectsOf);

  return (
    <PanelCard title="Recent Activity">
      {loading ? (
        <div className="p-4">
          <PanelRowsSkeleton rows={3} bare />
        </div>
      ) : failed ? (
        <PanelMessage onRetry={() => void reload()}>We couldn&apos;t load recent activity right now.</PanelMessage>
      ) : (
        <div className="p-4">
          <ActivityTimeline entries={items} emptyMessage="No recent activity recorded." />
        </div>
      )}
    </PanelCard>
  );
}
