/**
 * The dashboard incubation overview: how many of the student projects sit in each stage. Counts come only from the
 * saved application status and the confirmed-mentor stage of the journey model; no stage is guessed.
 *
 *   draft          review status DRAFT
 *   in-review      SUBMITTED or UNDER_REVIEW
 *   revision       REVISION_REQUESTED
 *   approved       APPROVED, no confirmed mentor yet (or mentor status unavailable)
 *   in-incubation  APPROVED and a mentor is confirmed
 *   not-approved   REJECTED
 * Every project falls in exactly one stage, so the counts always add up to the project total. Pure and unit-tested.
 */
import type { Journey } from "./journey.ts";
import type { StudentProject } from "../types/student-application.ts";

export type OverviewStageId = "draft" | "in-review" | "revision" | "approved" | "in-incubation" | "not-approved";

export interface OverviewStage {
  id: OverviewStageId;
  label: string;
  count: number;
}

const ORDER: { id: OverviewStageId; label: string }[] = [
  { id: "draft", label: "Idea saved (draft)" },
  { id: "in-review", label: "Under review" },
  { id: "revision", label: "Changes requested" },
  { id: "approved", label: "Approved" },
  { id: "in-incubation", label: "In incubation" },
  { id: "not-approved", label: "Not approved" },
];

export function stageOfProject(project: StudentProject, journey: Journey | undefined): OverviewStageId {
  switch (project.reviewStatus) {
    case "DRAFT":
      return "draft";
    case "SUBMITTED":
    case "UNDER_REVIEW":
      return "in-review";
    case "REVISION_REQUESTED":
      return "revision";
    case "REJECTED":
      return "not-approved";
    default:
      return journey?.stages.find((s) => s.id === "mentor")?.state === "complete" ? "in-incubation" : "approved";
  }
}

export function incubationOverview(projects: StudentProject[], journeys: Journey[]): OverviewStage[] {
  const byProject = new Map(journeys.map((j) => [j.projectId, j]));
  const counts = new Map<OverviewStageId, number>();
  for (const p of projects) {
    const id = stageOfProject(p, byProject.get(p.id));
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return ORDER.map((s) => ({ ...s, count: counts.get(s.id) ?? 0 }));
}
