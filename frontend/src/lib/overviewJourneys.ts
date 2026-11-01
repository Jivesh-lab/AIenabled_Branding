/** Journeys for every project in an overview. Pure: the same call powers the Journey page and the dashboard. */
import { buildJourney, type Journey } from "./journey.ts";
import type { Now } from "./workflowState.ts";
import type { StudentOverview } from "../types/student-overview.ts";

export function journeysFor(overview: StudentOverview, now: Now): Journey[] {
  if (!overview.projects.ok) return [];
  return overview.projects.data.map((project) =>
    buildJourney({
      project,
      mentor: overview.mentors[project.id],
      tasks: overview.tasks.ok ? overview.tasks.data : null,
      meetings: overview.meetings.ok ? overview.meetings.data : null,
      monitoring: overview.monitoring[project.id] ?? null,
      now,
    }),
  );
}
