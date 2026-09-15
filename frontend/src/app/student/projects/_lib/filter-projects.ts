/**
 * Pure filtering, searching and sorting for the My Projects list.
 * No React here — the page derives its visible list from this on each render.
 */
import type { Maturity, ReviewStatus } from "@/types/status";
import type { StudentProject } from "@/mock/student-projects";

export type StatusFilter = "ALL" | ReviewStatus;
export type MaturityFilter = "ALL" | Maturity;
export type SortKey = "updated" | "name" | "progress";

export interface ProjectFilters {
  query: string;
  status: StatusFilter;
  maturity: MaturityFilter;
  sort: SortKey;
}

export const DEFAULT_FILTERS: ProjectFilters = {
  query: "",
  status: "ALL",
  maturity: "ALL",
  sort: "updated",
};

export const SORT_LABEL: Record<SortKey, string> = {
  updated: "Recently updated",
  name: "Name (A–Z)",
  progress: "Progress",
};

export function hasActiveFilters(f: ProjectFilters) {
  return f.query.trim() !== "" || f.status !== "ALL" || f.maturity !== "ALL";
}

export function filterProjects(projects: StudentProject[], f: ProjectFilters): StudentProject[] {
  const q = f.query.trim().toLowerCase();

  const matched = projects.filter((p) => {
    if (f.status !== "ALL" && p.reviewStatus !== f.status) return false;
    if (f.maturity !== "ALL" && p.maturity !== f.maturity) return false;
    if (!q) return true;
    return (
      p.name.toLowerCase().includes(q) ||
      p.shortDescription.toLowerCase().includes(q) ||
      p.domain.toLowerCase().includes(q)
    );
  });

  // Sort a copy — never mutate the incoming array.
  return [...matched].sort((a, b) => {
    if (f.sort === "name") return a.name.localeCompare(b.name);
    if (f.sort === "progress") return b.progress - a.progress;
    return b.updatedAt.localeCompare(a.updatedAt); // ISO dates sort lexically
  });
}

/** Counts per review status across the whole portfolio (not the filtered list). */
export function countByStatus(projects: StudentProject[]) {
  const counts = { ALL: projects.length } as Record<StatusFilter, number>;
  for (const p of projects) counts[p.reviewStatus] = (counts[p.reviewStatus] ?? 0) + 1;
  return counts;
}
