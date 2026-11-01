import Link from "next/link";
import { CalendarDaysIcon } from "@heroicons/react/24/outline";
import { Card, StatusBadge } from "@/components/shared/Surface";
import type { Roadblock } from "./roadblocks";

const buttonBase =
  "inline-flex h-9 items-center justify-center gap-1.5 rounded-lg px-3.5 text-[13px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40";

/** One flagged project: what is wrong (the recorded health and overdue count), who leads it, and the next step. */
export default function RoadblockCard({ roadblock }: { roadblock: Roadblock }) {
  return (
    <Card className="p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <StatusBadge label={roadblock.health} tone={roadblock.health === "At Risk" ? "danger" : "attention"} />
            <span className="text-[12px] text-muted-ink">Stage: {roadblock.stage}</span>
          </div>
          <h3 className="mt-2 text-[15px] font-semibold leading-snug text-ink">{roadblock.project}</h3>
          <p className="mt-0.5 text-[13px] text-muted-ink">Led by {roadblock.lead}</p>
          {roadblock.overdue > 0 && (
            <p className="mt-2 text-[13px] font-medium text-brand-gold-ink">
              {roadblock.overdue} overdue {roadblock.overdue === 1 ? "milestone" : "milestones"}
            </p>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          <Link href="/workspace/mentor/mentees" className={`${buttonBase} border border-line bg-white text-ink hover:bg-nav-hover`}>
            View mentee
          </Link>
          <Link href="/workspace/mentor/schedule" className={`${buttonBase} bg-brand text-white hover:bg-brand-hover`}>
            <CalendarDaysIcon className="size-4" aria-hidden="true" />
            Schedule support session
          </Link>
        </div>
      </div>
    </Card>
  );
}
