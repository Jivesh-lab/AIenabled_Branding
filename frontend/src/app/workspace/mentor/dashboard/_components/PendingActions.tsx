"use client";

import Link from "next/link";
import { CheckCircleIcon, ClipboardDocumentListIcon } from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";
import { cleanName } from "@/lib/displayName";
import { formatShortDate } from "@/lib/formatDate";
import { useApiList } from "@/lib/useApiList";
import PanelCard, { PanelMessage } from "@/components/shared/PanelCard";
import { PanelRowsSkeleton } from "./DashboardSkeleton";

interface TaskItem {
  id: string;
  title: string;
  startup: string;
  due?: string;
  high: boolean;
}

interface TaskRecord {
  id?: string;
  _id?: string;
  title?: string;
  assignedStudent?: string;
  dueDate?: string;
  priority?: string;
  status?: string;
}

const PREVIEW = 4;

function toItems(records: unknown[]): TaskItem[] {
  return (records as TaskRecord[])
    .filter((t) => t.status !== "Completed")
    .map((t, i) => ({
      id: t.id || t._id || `task-${i}`,
      title: t.title || "Pending task",
      startup: cleanName(t.assignedStudent || "Cohort project"),
      due: formatShortDate(t.dueDate),
      high: t.priority === "High",
    }));
}

export default function PendingActions() {
  const { items, loading, failed, reload } = useApiList("/api/faculty/tasks", toItems);

  return (
    <PanelCard title="Pending Actions" count={loading || failed ? undefined : items.length}>
      {loading ? (
        <PanelRowsSkeleton rows={3} compact />
      ) : failed ? (
        <PanelMessage onRetry={() => void reload()}>We couldn&apos;t load your actions right now.</PanelMessage>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center gap-1.5 px-5 py-8 text-center">
          <CheckCircleIcon className="size-6 text-success" aria-hidden="true" />
          <p className="text-[13px] text-muted-ink">You&apos;re all caught up. No actions are waiting.</p>
        </div>
      ) : (
        <ul className="p-2">
          {items.slice(0, PREVIEW).map((action) => (
            <li key={action.id}>
              <Link
                href="/workspace/mentor/feedback"
                className="flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-nav-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-full border",
                    action.high ? "border-brand-gold/25 bg-brand-gold/10 text-brand-gold-ink" : "border-line bg-canvas text-icon"
                  )}
                >
                  <ClipboardDocumentListIcon className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-semibold leading-snug text-ink">{action.title}</span>
                  <span className="mt-0.5 block truncate text-[12px] text-muted-ink">{action.startup}</span>
                  {action.due && (
                    <span className={cn("mt-1 block text-[12px]", action.high ? "font-medium text-brand-gold-ink" : "text-muted-ink")}>
                      Due {action.due}
                    </span>
                  )}
                </span>
              </Link>
            </li>
          ))}
          {items.length > PREVIEW && (
            <li className="px-3 pb-1 pt-2 text-[12px] text-muted-ink">+ {items.length - PREVIEW} more in Feedback</li>
          )}
        </ul>
      )}
    </PanelCard>
  );
}
