import { AlertCircle, ClipboardCheck, FilePen, FolderKanban } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { StatusFilter } from "../_lib/filter-projects";

interface SummaryItem {
  status: StatusFilter;
  label: string;
  icon: LucideIcon;
  attention?: boolean;
}

const ITEMS: SummaryItem[] = [
  { status: "ALL", label: "Total Projects", icon: FolderKanban },
  { status: "DRAFT", label: "Drafts", icon: FilePen },
  { status: "UNDER_REVIEW", label: "Under Review", icon: ClipboardCheck },
  { status: "REVISION_REQUESTED", label: "Revision Requested", icon: AlertCircle, attention: true },
];

/**
 * Summary counts that double as the review-status filter. There is no second
 * row of tabs: these buttons and the toolbar's status select drive the same state.
 */
export default function SummaryFilters({
  counts,
  active,
  onSelect,
}: {
  counts: Record<StatusFilter, number>;
  active: StatusFilter;
  onSelect: (status: StatusFilter) => void;
}) {
  return (
    <div role="group" aria-label="Filter by review status" className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
      {ITEMS.map(({ status, label, icon: Icon, attention }) => {
        const count = counts[status] ?? 0;
        const isActive = active === status;
        const showAttention = attention && count > 0;

        return (
          <button
            key={status}
            type="button"
            aria-pressed={isActive}
            onClick={() => onSelect(status)}
            className={cn(
              "flex items-start justify-between gap-3 rounded-xl border bg-white p-4 text-left shadow-sm outline-none",
              "transition-colors duration-150 focus-visible:ring-3 focus-visible:ring-brand/20",
              isActive
                ? attention
                  ? "border-brand-gold bg-brand-gold/5"
                  : "border-brand bg-brand-cyan-soft/40"
                : "border-line hover:border-brand-cyan/40 hover:bg-nav-hover"
            )}
          >
            <span className="min-w-0">
              <span className="block truncate text-[13px] font-medium text-muted-ink">{label}</span>
              <span
                className={cn(
                  "mt-1 block text-[24px] font-bold leading-none tabular-nums",
                  showAttention ? "text-brand-gold-ink" : "text-brand"
                )}
              >
                {count}
              </span>
            </span>
            <Icon
              className={cn("size-[18px] shrink-0", showAttention ? "text-brand-gold" : "text-brand-cyan")}
              aria-hidden="true"
            />
          </button>
        );
      })}
    </div>
  );
}
