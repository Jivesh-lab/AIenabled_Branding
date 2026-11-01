import { ExclamationCircleIcon, ExclamationTriangleIcon, ShieldCheckIcon } from "@heroicons/react/24/outline";
import MetricCard from "@/components/shared/MetricCard";
import type { Roadblock } from "./roadblocks";

/** Three summary cards in the portal's standard KPI style. A failed load shows "—", never a reassuring 0. */
export default function RoadblockStats({ roadblocks, loading, failed }: { roadblocks: Roadblock[]; loading: boolean; failed: boolean }) {
  const atRisk = roadblocks.filter((r) => r.health === "At Risk").length;
  const count = (n: number) => (failed ? "—" : n);

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:gap-4">
      <MetricCard loading={loading} label="Active Roadblocks" value={count(roadblocks.length)} sub={failed ? "Couldn't load" : "Projects needing support"} icon={ExclamationCircleIcon} tone="attention" />
      <MetricCard loading={loading} label="At-Risk Projects" value={count(atRisk)} sub={failed ? "Couldn't load" : "Highest priority"} icon={ExclamationTriangleIcon} tone="danger" />
      <MetricCard
        loading={loading}
        label="Cohort Health"
        value={failed ? "—" : roadblocks.length === 0 ? "On track" : "Action needed"}
        sub={failed ? "Couldn't load" : roadblocks.length === 0 ? "No flags raised" : `${roadblocks.length} flagged`}
        icon={ShieldCheckIcon}
      />
    </div>
  );
}
