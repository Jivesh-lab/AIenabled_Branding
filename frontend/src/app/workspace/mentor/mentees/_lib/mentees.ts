import type { StatusTone } from "@/types/status";

/** A mentee as the mentor sees it: the researcher on a project the mentor supports. */
export interface Mentee {
  id: string;
  name: string;
  rollNumber?: string;
  department?: string;
  projectTitle?: string;
  domain?: string;
  progress: number;
  trl?: number;
  stage?: string;
  health: Exclude<HealthFilter, "All">;
  overdueMilestones: number;
}

export const HEALTH_FILTERS = ["All", "On Track", "Needs Attention", "At Risk"] as const;
export type HealthFilter = (typeof HEALTH_FILTERS)[number];

export const HEALTH_TONE: Record<Exclude<HealthFilter, "All">, StatusTone> = {
  "On Track": "success",
  "Needs Attention": "attention",
  "At Risk": "danger",
};

export { cleanName, initialsOf } from "@/lib/displayName";

function toHealth(value: unknown): Mentee["health"] {
  return value === "Needs Attention" || value === "At Risk" ? value : "On Track";
}

interface ProjectRecord {
  _id?: string;
  id?: string;
  leadStudent?: string;
  rollNumber?: string;
  department?: string;
  title?: string;
  domain?: string;
  progress?: number;
  trl?: number;
  stage?: string;
  health?: string;
  overdueMilestonesCount?: number;
}

/** Mentees are the lead researchers on the projects returned by /api/faculty/projects. */
export function toMentees(projects: ProjectRecord[]): Mentee[] {
  return projects.map((p, i) => ({
    id: p._id || p.id || `mentee-${i}`,
    name: p.leadStudent || "Researcher",
    rollNumber: p.rollNumber,
    department: p.department,
    projectTitle: p.title,
    domain: p.domain,
    progress: typeof p.progress === "number" ? Math.max(0, Math.min(100, p.progress)) : 0,
    trl: p.trl,
    stage: p.stage,
    health: toHealth(p.health),
    overdueMilestones: p.overdueMilestonesCount || 0,
  }));
}

export function countByHealth(mentees: Mentee[]): Record<HealthFilter, number> {
  return {
    All: mentees.length,
    "On Track": mentees.filter((m) => m.health === "On Track").length,
    "Needs Attention": mentees.filter((m) => m.health === "Needs Attention").length,
    "At Risk": mentees.filter((m) => m.health === "At Risk").length,
  };
}

export function filterMentees(mentees: Mentee[], filter: HealthFilter, search: string): Mentee[] {
  const term = search.trim().toLowerCase();
  return mentees.filter((m) => {
    if (filter !== "All" && m.health !== filter) return false;
    if (!term) return true;
    return [m.name, m.projectTitle, m.department, m.rollNumber, m.domain].some((field) => field?.toLowerCase().includes(term));
  });
}
