import { CalendarDaysIcon, CheckCircleIcon, ClockIcon, UsersIcon } from "@heroicons/react/24/outline";
import MetricCard from "@/components/shared/MetricCard";
import { isCompleted, isUpcoming, sessionsOnMonth, type Session } from "../../_lib/sessions";

/** Four summary cards in the portal's standard KPI style. A failed load shows "—" instead of a false 0. */
export default function ScheduleStats({
  sessions,
  today,
  loading,
  failed,
}: {
  sessions: Session[];
  today: string;
  loading: boolean;
  failed: boolean;
}) {
  const upcoming = sessions.filter((s) => isUpcoming(s, today));
  const year = Number(today.slice(0, 4));
  const month = Number(today.slice(5, 7)) - 1;
  const mentees = new Set(upcoming.flatMap((s) => s.participants)).size;
  const value = (n: number) => (failed ? "—" : n);
  const sub = (text: string) => (failed ? "Couldn't load" : text);

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
      <MetricCard loading={loading} label="This Month" value={value(sessionsOnMonth(sessions, year, month))} sub={sub("Sessions on the calendar")} icon={CalendarDaysIcon} />
      <MetricCard loading={loading} label="Upcoming" value={value(upcoming.length)} sub={sub("Still to happen")} icon={ClockIcon} />
      <MetricCard loading={loading} label="Completed" value={value(sessions.filter(isCompleted).length)} sub={sub("Held and closed")} icon={CheckCircleIcon} />
      <MetricCard loading={loading} label="People Involved" value={value(mentees)} sub={sub("In upcoming sessions")} icon={UsersIcon} />
    </div>
  );
}
