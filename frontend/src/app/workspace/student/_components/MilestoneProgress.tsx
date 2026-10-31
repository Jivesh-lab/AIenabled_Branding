import { ProgressBar } from "@/components/shared/Surface";
import { progressText } from "@/lib/monitoringView";
import type { ReviewStatus } from "@/types/status";
import type { MilestoneSummary } from "@/types/student-application";

/**
 * Milestone progress for one project, from the single persisted summary. Shown the same way on the dashboard,
 * project list, project page and journey. "No milestones recorded" is never drawn as an empty (0%) bar.
 */
export default function MilestoneProgress({ summary, status }: { summary: MilestoneSummary; status: ReviewStatus }) {
  const view = progressText(summary);

  if (!view.tracked) {
    return (
      <p className="text-[12px] text-muted-ink">
        <span className="font-medium text-ink">Milestones:</span>{" "}
        {status === "APPROVED" ? "No milestones recorded yet" : "Available once the project is approved"}
      </p>
    );
  }

  return (
    <div>
      <ProgressBar value={summary.progress ?? 0} label="Milestone progress" />
      <p className={`mt-1 text-[12px] ${summary.overdue > 0 ? "font-medium text-danger" : "text-muted-ink"}`}>{view.text}</p>
    </div>
  );
}
