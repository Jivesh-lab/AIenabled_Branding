import { ClockIcon, DocumentTextIcon, VideoCameraIcon } from "@heroicons/react/24/outline";
import MetricCard from "@/components/shared/MetricCard";
import type { Session } from "../../_lib/sessions";
import { isAwaitingNotes } from "./summaries";

/** Three summary cards in the portal's standard KPI style. A failed load shows "—" instead of a false 0. */
export default function SummaryStats({ sessions, today, loading, failed }: { sessions: Session[]; today: string; loading: boolean; failed: boolean }) {
  const value = (n: number) => (failed ? "—" : n);
  const sub = (text: string) => (failed ? "Couldn't load" : text);

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:gap-4">
      <MetricCard loading={loading} label="Sessions" value={value(sessions.length)} sub={sub("On your schedule")} icon={VideoCameraIcon} />
      <MetricCard loading={loading} label="Notes Recorded" value={value(sessions.filter((s) => s.notes).length)} sub={sub("Sessions with notes")} icon={DocumentTextIcon} />
      <MetricCard
        loading={loading}
        label="Awaiting Notes"
        value={value(sessions.filter((s) => isAwaitingNotes(s, today)).length)}
        sub={sub("Held, no notes yet")}
        icon={ClockIcon}
        tone="attention"
      />
    </div>
  );
}
