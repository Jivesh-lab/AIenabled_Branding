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
