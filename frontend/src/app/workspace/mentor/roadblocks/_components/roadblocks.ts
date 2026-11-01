import { cleanName } from "@/lib/displayName";

export type RoadblockHealth = "At Risk" | "Needs Attention";

export interface Roadblock {
  id: string;
  project: string;
  lead: string;
  stage: string;
  health: RoadblockHealth;
  overdue: number;
}

interface ProjectRecord {
  id?: string;
  _id?: string;
  title?: string;
  leadStudent?: string;
  stage?: string;
  trl?: number;
  health?: string;
  overdueMilestonesCount?: number;
}

/**
 * A roadblock is a project the cohort data already flags: marked At Risk or Needs Attention, or with overdue
 * milestones. Nothing is inferred beyond that, so the page never describes a problem the data does not record.
 * Most urgent first: At Risk, then the most overdue milestones.
 */
export function toRoadblocks(records: unknown[]): Roadblock[] {
  return (records as ProjectRecord[])
    .filter((p) => p.health === "At Risk" || p.health === "Needs Attention" || (p.overdueMilestonesCount ?? 0) > 0)
    .map((p, i) => ({
      id: p.id || p._id || `roadblock-${i}`,
      project: p.title || "Untitled project",
      lead: cleanName(p.leadStudent || "Researcher"),
      stage: p.stage || `TRL ${p.trl || 1}`,
      health: (p.health === "At Risk" ? "At Risk" : "Needs Attention") as RoadblockHealth,
      overdue: p.overdueMilestonesCount ?? 0,
    }))
    .sort((a, b) => Number(b.health === "At Risk") - Number(a.health === "At Risk") || b.overdue - a.overdue);
}
