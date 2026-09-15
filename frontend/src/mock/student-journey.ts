/**
 * Mock journey events — what has actually happened to each project.
 *
 * Events are historical facts only. Current and upcoming stages are NOT stored
 * here; they are derived from the project's reviewStatus, pipelinePosition and
 * maturity (see app/student/journey/_lib/journey.ts), so the timeline can never
 * disagree with the project's real status.
 *
 * Project ids match STUDENT_PROJECTS in ./student-projects.ts.
 */
import type { Maturity, PipelinePosition } from "@/types/status";

export type JourneyEventType =
  | "SUBMITTED"
  | "GUIDE_ASSIGNED"
  | "REVIEW_COMPLETED"
  | "REVISION_REQUESTED"
  | "RESUBMITTED"
  | "APPROVED"
  | "REJECTED"
  | "MATURITY_UPDATED";

export interface JourneyEvent {
  id: string;
  projectId: string;
  type: JourneyEventType;
  date: string; // ISO date
  title: string;
  description: string;
  /** The review stage this event belongs to, when it belongs to one. */
  pipelinePosition?: PipelinePosition;
  score?: number;
  /** For MATURITY_UPDATED events. */
  maturity?: { from: Maturity; to: Maturity };
  /** Reviewer feedback exists for this event. */
  hasFeedback?: boolean;
}

export const JOURNEY_EVENTS: JourneyEvent[] = [
  // 1 — Smart Agriculture AI Drone · UNDER_REVIEW · FACULTY_REVIEW · PROTOTYPE
  {
    id: "e1-1",
    projectId: "1",
    type: "SUBMITTED",
    date: "2026-09-12",
    title: "Idea submitted",
    description: "Your idea was submitted and entered the AAI–DBITIC review pipeline.",
  },
  {
    id: "e1-2",
    projectId: "1",
    type: "GUIDE_ASSIGNED",
    date: "2026-09-13",
    title: "Faculty guide assigned",
    description: "Dr. Priya Shah was assigned as your faculty guide by the Faculty Coordinator.",
    pipelinePosition: "FACULTY_REVIEW",
  },

  // 2 — NeuraMed · REVISION_REQUESTED · DEPARTMENT_REVIEW · MVP
  {
    id: "e2-1",
    projectId: "2",
    type: "SUBMITTED",
    date: "2026-08-25",
    title: "Idea submitted",
    description: "Your idea was submitted and entered the AAI–DBITIC review pipeline.",
  },
  {
    id: "e2-2",
    projectId: "2",
    type: "GUIDE_ASSIGNED",
    date: "2026-08-28",
    title: "Faculty guide assigned",
    description: "Prof. Anand Kulkarni was assigned as your faculty guide.",
    pipelinePosition: "FACULTY_REVIEW",
  },
  {
    id: "e2-3",
    projectId: "2",
    type: "REVIEW_COMPLETED",
    date: "2026-09-02",
    title: "Faculty review completed",
    description: "Recommended for department review.",
    pipelinePosition: "FACULTY_REVIEW",
    score: 82,
    hasFeedback: true,
  },
  {
    id: "e2-4",
    projectId: "2",
    type: "REVISION_REQUESTED",
    date: "2026-09-14",
    title: "Revision requested",
    description: "Update the problem statement and clarify the target users before the department panel continues.",
    pipelinePosition: "DEPARTMENT_REVIEW",
    hasFeedback: true,
  },

  // 3 — CampusRide · UNDER_REVIEW · DEPARTMENT_REVIEW · CONCEPT
  {
    id: "e3-1",
    projectId: "3",
    type: "SUBMITTED",
    date: "2026-08-20",
    title: "Idea submitted",
    description: "Your idea was submitted and entered the AAI–DBITIC review pipeline.",
  },
  {
    id: "e3-2",
    projectId: "3",
    type: "GUIDE_ASSIGNED",
    date: "2026-08-22",
    title: "Faculty guide assigned",
    description: "Dr. Sneha Deshmukh was assigned as your faculty guide.",
    pipelinePosition: "FACULTY_REVIEW",
  },
  {
    id: "e3-3",
    projectId: "3",
    type: "REVIEW_COMPLETED",
    date: "2026-09-08",
    title: "Faculty review completed",
    description: "Recommended for department review with a request for market research.",
    pipelinePosition: "FACULTY_REVIEW",
    score: 76,
    hasFeedback: true,
  },

  // 4 — GreenGrid · APPROVED · (no pipeline) · MVP
  {
    id: "e4-1",
    projectId: "4",
    type: "SUBMITTED",
    date: "2026-07-15",
    title: "Idea submitted",
    description: "Your idea was submitted and entered the AAI–DBITIC review pipeline.",
  },
  {
    id: "e4-2",
    projectId: "4",
    type: "REVIEW_COMPLETED",
    date: "2026-08-05",
    title: "Faculty review completed",
    description: "Recommended for department review.",
    pipelinePosition: "FACULTY_REVIEW",
    score: 88,
    hasFeedback: true,
  },
  {
    id: "e4-3",
    projectId: "4",
    type: "REVIEW_COMPLETED",
    date: "2026-08-20",
    title: "Department review completed",
    description: "Endorsed by the department panel for incubation.",
    pipelinePosition: "DEPARTMENT_REVIEW",
    score: 84,
    hasFeedback: true,
  },
  {
    id: "e4-4",
    projectId: "4",
    type: "APPROVED",
    date: "2026-09-02",
    title: "Approved for incubation",
    description: "The incubation committee approved the project for incubation support.",
    pipelinePosition: "INCUBATION_REVIEW",
    hasFeedback: true,
  },
  {
    id: "e4-5",
    projectId: "4",
    type: "MATURITY_UPDATED",
    date: "2026-09-10",
    title: "Maturity updated",
    description: "Pilot-ready build confirmed by your mentor.",
    maturity: { from: "PROTOTYPE", to: "MVP" },
  },

  // 6 — SignBridge · SUBMITTED · FACULTY_REVIEW · CONCEPT
  {
    id: "e6-1",
    projectId: "6",
    type: "SUBMITTED",
    date: "2026-09-12",
    title: "Idea submitted",
    description: "Your idea was submitted and entered the AAI–DBITIC review pipeline.",
  },

  // 7 — Rural Tele-Pharmacy · REJECTED · DEPARTMENT_REVIEW · IDEA
  {
    id: "e7-1",
    projectId: "7",
    type: "SUBMITTED",
    date: "2026-08-01",
    title: "Idea submitted",
    description: "Your idea was submitted and entered the AAI–DBITIC review pipeline.",
  },
  {
    id: "e7-2",
    projectId: "7",
    type: "REVIEW_COMPLETED",
    date: "2026-08-10",
    title: "Faculty review completed",
    description: "Forwarded to the department with concerns about market differentiation.",
    pipelinePosition: "FACULTY_REVIEW",
    score: 64,
    hasFeedback: true,
  },
  {
    id: "e7-3",
    projectId: "7",
    type: "REJECTED",
    date: "2026-08-28",
    title: "Not approved",
    description: "The department panel found the need is already served by existing e-pharmacy networks.",
    pipelinePosition: "DEPARTMENT_REVIEW",
    hasFeedback: true,
  },

  // 5 — Campus Waste Sorting Bot is a DRAFT: no events yet.
];
