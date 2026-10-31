import type { MentorResult } from "../lib/mentorState.ts";
import type { MonitoringResponse, StudentProject } from "./student-application.ts";
import type { StudentMeeting, StudentTask } from "./student-workflow.ts";

export type FailureKind = "unauthenticated" | "forbidden" | "not-found" | "unavailable";

/** One independently-loaded data source. A failure is a value, never an empty list. */
export type Section<T> = { ok: true; data: T } | { ok: false; kind: FailureKind; status?: number; message: string };

/**
 * Everything the Journey page and the dashboard need, loaded once on the server from the student-scoped
 * sources (agent-service applications/milestones, backend tasks/meetings/mentoring). Each section succeeds or
 * fails on its own, so one failing source never hides the others.
 */
export interface StudentOverview {
  generatedAt: string;
  projects: Section<StudentProject[]>;
  tasks: Section<StudentTask[]>;
  meetings: Section<StudentMeeting[]>;
  /** Per-project mentor result (each carries its own failure). Empty when projects could not be loaded. */
  mentors: Record<string, MentorResult>;
  /** Only filled when requested. "unavailable" = the check failed or its inputs were missing. */
  monitoring: Record<string, MonitoringResponse | "unavailable">;
}
