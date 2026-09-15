/**
 * Mock meetings for the Student "Meetings" page.
 *
 * Dates are date-only ISO strings and times are institute-local wall-clock
 * strings ("15:00"). Storing instants would force timezone conversion during
 * render and make server and browser output disagree.
 *
 * A meeting's status (UPCOMING / TODAY / COMPLETED / CANCELLED / ACTION_REQUIRED)
 * is NOT stored — it is derived from date, time, cancellation and open action
 * items in app/student/meetings/_lib/meetings.ts.
 *
 * Project ids match STUDENT_PROJECTS; people match the other mocks.
 */

export type MeetingType = "MENTOR_SESSION" | "FACULTY_REVIEW" | "DEPARTMENT_REVIEW" | "INCUBATION_REVIEW" | "TEAM_SYNC";

export const MEETING_TYPE_LABEL: Record<MeetingType, string> = {
  MENTOR_SESSION: "Mentor Session",
  FACULTY_REVIEW: "Faculty Review",
  DEPARTMENT_REVIEW: "Department Review",
  INCUBATION_REVIEW: "Incubation Review",
  TEAM_SYNC: "Team Sync",
};

export interface Person {
  name: string;
  role: string;
}

export interface ActionItem {
  id: string;
  title: string;
  assignee: string;
  dueDate: string; // ISO date
  status: "OPEN" | "DONE";
  /** Whether a student on the team may update this item. Host-owned items are read-only. */
  studentEditable: boolean;
}

export interface Meeting {
  id: string;
  title: string;
  projectId: string;
  projectName: string;
  type: MeetingType;
  date: string; // ISO date
  startTime: string; // "HH:MM"
  endTime: string; // "HH:MM"
  host: Person;
  participants: Person[];
  agenda: string[];
  meetingLink?: string;
  location?: string;
  cancellation?: { reason: string };
  /** Official minutes, recorded by the host. */
  minutes?: string;
  actionItems: ActionItem[];
  followUpDate?: string;
}

/** Fixed "now" for mock data — matches MOCK_TODAY in student-projects.ts (a Tuesday). */
export const MOCK_NOW = { date: "2026-09-15", time: "10:00" } as const;

/** The logged-in student. */
export const STUDENT_NAME = "Riya Patel";

/**
 * What a student may do here. RBAC will replace this single object later;
 * the UI already reads every permission from it.
 */
export const STUDENT_MEETING_PERMISSIONS = {
  /** Meeting types a student can request. Official reviews are scheduled by coordinators. */
  requestableTypes: ["MENTOR_SESSION", "TEAM_SYNC"] as MeetingType[],
  canRecordMinutes: false,
  canSetFollowUp: false,
  canAddActionItems: true,
  canKeepPersonalNotes: true,
};

const RIYA: Person = { name: "Riya Patel", role: "Team lead" };

export const MEETINGS: Meeting[] = [
  // ---------------------------------------------------------------- today
  {
    id: "m1",
    title: "Mentor Review",
    projectId: "1",
    projectName: "Smart Agriculture AI Drone",
    type: "MENTOR_SESSION",
    date: "2026-09-15",
    startTime: "15:00",
    endTime: "15:45",
    host: { name: "Dr. Priya Shah", role: "Mentor" },
    participants: [RIYA, { name: "Aditya Shah", role: "Member" }, { name: "Karan Desai", role: "Member" }],
    agenda: ["Review prototype progress", "Discuss technical blockers", "Define the next milestone"],
    meetingLink: "https://meet.google.com/aai-dbt-001",
    actionItems: [],
  },

  // ---------------------------------------------------------------- upcoming
  {
    id: "m2",
    title: "Faculty Project Review",
    projectId: "1",
    projectName: "Smart Agriculture AI Drone",
    type: "FACULTY_REVIEW",
    date: "2026-09-16",
    startTime: "11:00",
    endTime: "11:45",
    host: { name: "Dr. Priya Shah", role: "Faculty Guide" },
    participants: [RIYA, { name: "Aditya Shah", role: "Member" }],
    agenda: ["Walk through the submitted proposal", "Faculty questions on feasibility", "Decide on department referral"],
    location: "Room 304, Department of Information Technology",
    actionItems: [],
  },
  {
    id: "m3",
    title: "Revision Walkthrough",
    projectId: "2",
    projectName: "NeuraMed Diagnostic Assistant",
    type: "DEPARTMENT_REVIEW",
    date: "2026-09-18",
    startTime: "14:00",
    endTime: "14:30",
    host: { name: "Prof. Anand Kulkarni", role: "Department Panel" },
    participants: [RIYA, { name: "Sneha Kulkarni", role: "Member" }],
    agenda: ["Present the revised problem statement", "Clarify target users", "Confirm resubmission scope"],
    meetingLink: "https://meet.google.com/aai-dbt-003",
    actionItems: [],
  },
  {
    id: "m4",
    title: "Pitch Preparation",
    projectId: "3",
    projectName: "CampusRide Mobility Platform",
    type: "MENTOR_SESSION",
    date: "2026-09-24",
    startTime: "10:00",
    endTime: "11:00",
    host: { name: "Ms. Kavya Rao", role: "Industry Mentor" },
    participants: [RIYA, { name: "Rahul Menon", role: "Member" }, { name: "Pooja Nair", role: "Member" }],
    agenda: ["Market research findings", "Pitch deck structure", "Unit economics"],
    meetingLink: "https://meet.google.com/aai-dbt-004",
    actionItems: [],
  },

  // ---------------------------------------------------------------- past
  {
    id: "m6",
    title: "Department Panel Review",
    projectId: "2",
    projectName: "NeuraMed Diagnostic Assistant",
    type: "DEPARTMENT_REVIEW",
    date: "2026-09-14",
    startTime: "11:00",
    endTime: "11:45",
    host: { name: "Prof. Anand Kulkarni", role: "Department Panel" },
    participants: [RIYA, { name: "Sneha Kulkarni", role: "Member" }, { name: "Dr. Meera Iyer", role: "Panel Member" }],
    agenda: ["Present the MVP", "Panel assessment", "Decision on progression"],
    meetingLink: "https://meet.google.com/aai-dbt-006",
    minutes:
      "The panel found the MVP technically strong but the problem statement too broad. Target users should be narrowed to district-hospital radiology departments. A revision was requested before the review continues.",
    actionItems: [
      { id: "a6-1", title: "Rewrite the problem statement", assignee: "Riya Patel", dueDate: "2026-09-15", status: "OPEN", studentEditable: true },
      { id: "a6-2", title: "Add a target-user profile to the proposal", assignee: "Sneha Kulkarni", dueDate: "2026-09-17", status: "OPEN", studentEditable: true },
      { id: "a6-3", title: "Circulate written panel feedback", assignee: "Prof. Anand Kulkarni", dueDate: "2026-09-14", status: "DONE", studentEditable: false },
    ],
    followUpDate: "2026-09-18",
  },
  {
    id: "m7",
    title: "Weekly Team Sync",
    projectId: "1",
    projectName: "Smart Agriculture AI Drone",
    type: "TEAM_SYNC",
    date: "2026-09-11",
    startTime: "17:00",
    endTime: "17:30",
    host: RIYA,
    participants: [RIYA, { name: "Aditya Shah", role: "Member" }, { name: "Karan Desai", role: "Member" }],
    agenda: ["Flight test results", "Split work for the mentor review"],
    meetingLink: "https://meet.google.com/aai-dbt-007",
    minutes: "Flight tests passed on two of three plots. Aditya will retune the camera mount before the mentor review.",
    actionItems: [
      { id: "a7-1", title: "Retune the camera mount", assignee: "Aditya Shah", dueDate: "2026-09-14", status: "DONE", studentEditable: true },
      { id: "a7-2", title: "Prepare the mentor review deck", assignee: "Riya Patel", dueDate: "2026-09-14", status: "DONE", studentEditable: true },
    ],
  },
  {
    id: "m8",
    title: "Mentor Check-in",
    projectId: "3",
    projectName: "CampusRide Mobility Platform",
    type: "MENTOR_SESSION",
    date: "2026-09-12",
    startTime: "12:00",
    endTime: "12:30",
    host: { name: "Ms. Kavya Rao", role: "Industry Mentor" },
    participants: [RIYA, { name: "Rahul Menon", role: "Member" }],
    agenda: ["Early market research"],
    meetingLink: "https://meet.google.com/aai-dbt-008",
    cancellation: { reason: "Mentor unavailable. To be rescheduled." },
    actionItems: [],
  },
  {
    id: "m5",
    title: "Incubation Committee Review",
    projectId: "4",
    projectName: "GreenGrid Smart Energy Meter",
    type: "INCUBATION_REVIEW",
    date: "2026-09-02",
    startTime: "16:00",
    endTime: "17:00",
    host: { name: "Incubation Committee", role: "AAI–DBITIC" },
    participants: [RIYA, { name: "Dr. Rohan Mehta", role: "Faculty Guide" }],
    agenda: ["Project pitch", "Committee questions", "Incubation decision"],
    location: "AAI–DBITIC Innovation Centre, Board Room",
    minutes: "Approved for incubation. Pilot deployment in Hostel B agreed as the first milestone.",
    actionItems: [
      { id: "a5-1", title: "Sign the incubation agreement", assignee: "Riya Patel", dueDate: "2026-09-09", status: "DONE", studentEditable: true },
    ],
  },
];
