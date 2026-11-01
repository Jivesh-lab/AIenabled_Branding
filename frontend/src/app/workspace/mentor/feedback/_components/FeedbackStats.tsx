import { ChatBubbleLeftRightIcon, CheckCircleIcon, InboxIcon } from "@heroicons/react/24/outline";
import MetricCard from "@/components/shared/MetricCard";
import type { MenteeRequest } from "./requests";

/** Three summary cards in the portal's standard KPI style. A failed load shows "—" instead of a false 0. */
export default function FeedbackStats({ requests, loading, failed }: { requests: MenteeRequest[]; loading: boolean; failed: boolean }) {
  const value = (n: number) => (failed ? "—" : n);
  const sub = (text: string) => (failed ? "Couldn't load" : text);
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:gap-4">
      <MetricCard loading={loading} label="Questions" value={value(requests.length)} sub={sub("From your mentees")} icon={ChatBubbleLeftRightIcon} />
      <MetricCard loading={loading} label="Awaiting Reply" value={value(requests.filter((r) => !r.resolved).length)} sub={sub("Open questions")} icon={InboxIcon} tone="attention" />
      <MetricCard loading={loading} label="Resolved" value={value(requests.filter((r) => r.resolved).length)} sub={sub("Answered")} icon={CheckCircleIcon} />
    </div>
  );
}
