"use client";

/**
 * ProjectPortfolio — the interactive part of My Projects.
 *
 * Holds one piece of state (the filters). The visible list and the counts are
 * derived from props on each render — no effects, no copies of the list in
 * state, nothing to keep in sync. The portfolio is small (a student has a
 * handful of projects), so recomputing is cheaper than memoising.
 */
import { useState } from "react";
import type { StudentProject } from "@/mock/student-projects";
import {
  countByStatus,
  DEFAULT_FILTERS,
  filterProjects,
  hasActiveFilters,
  type ProjectFilters,
} from "../_lib/filter-projects";
import SummaryFilters from "./SummaryFilters";
import ProjectsToolbar from "./ProjectsToolbar";
import ProjectCard from "./ProjectCard";
import EmptyState from "./EmptyState";

export default function ProjectPortfolio({ projects }: { projects: StudentProject[] }) {
  const [filters, setFilters] = useState<ProjectFilters>(DEFAULT_FILTERS);

  const counts = countByStatus(projects);
  const visible = filterProjects(projects, filters);
  const filtered = hasActiveFilters(filters);

  function update<K extends keyof ProjectFilters>(key: K, value: ProjectFilters[K]) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  /** Keeps the chosen sort — only the narrowing filters are reset. */
  function clearFilters() {
    setFilters((prev) => ({ ...DEFAULT_FILTERS, sort: prev.sort }));
  }

  if (projects.length === 0) return <EmptyState kind="no-projects" />;

  return (
    <div className="flex flex-col gap-6">
      <SummaryFilters counts={counts} active={filters.status} onSelect={(status) => update("status", status)} />

      <section aria-labelledby="project-list-heading" className="flex flex-col gap-4">
        <h2 id="project-list-heading" className="sr-only">
          Project list
        </h2>

        <ProjectsToolbar filters={filters} onChange={update} />

        <div className="flex min-h-5 items-center justify-between gap-3">
          <p aria-live="polite" className="text-[13px] text-muted-ink">
            Showing <span className="font-medium text-ink">{visible.length}</span> of {projects.length}{" "}
            {projects.length === 1 ? "project" : "projects"}
          </p>
          {filtered && (
            <button
              type="button"
              onClick={clearFilters}
              className="rounded-md px-1.5 py-0.5 text-[13px] font-medium text-brand transition-colors hover:text-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
            >
              Clear filters
            </button>
          )}
        </div>

        {visible.length === 0 ? (
          filters.query.trim() ? (
            <EmptyState kind="no-results" query={filters.query} onClear={() => update("query", "")} />
          ) : (
            <EmptyState kind="no-filter-match" onClear={clearFilters} />
          )
        ) : (
          <ul className="flex flex-col gap-4">
            {visible.map((project) => (
              <li key={project.id}>
                <ProjectCard project={project} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
