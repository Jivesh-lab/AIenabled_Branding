/**
 * Student-visible meetings and tasks as returned by the Express student endpoints
 * (backend/src/routes/student.js). Both are persisted records; nothing here is generated client-side.
 */

/** Latest recorded reminder outcome for a record. `null` on a record means no reminder was ever attempted. */
export interface ReminderState {
  status: "pending" | "sent" | "failed";
  at: string | null;
}

export interface StudentMeeting {
  id: string;
  title: string;
  projectId: string;
  projectTitle: string;
  /** Usually YYYY-MM-DD (institute time). Anything else is treated as "date to be confirmed". */
  date: string;
  /** HH:MM, or "" when the time has not been set yet. */
  startTime: string;
  durationMinutes: number;
  timeZone: string;
  meetingType: string;
  agenda: string;
  provider: string;
  /** A URL for online meetings, otherwise a place. */
  location: string;
  /** Free text from the faculty workflow: "Sent", "Requested", "Cancelled", ... */
  invitationStatus: string;
  participants: string[];
  /** null until the host has logged the meeting as held. */
  notes: string | null;
  attendanceLogged: boolean;
  reminder: ReminderState | null;
}

export const STUDENT_TASK_STATUSES = ["Pending", "In Progress", "Completed"] as const;
export type StudentTaskStatus = (typeof STUDENT_TASK_STATUSES)[number];

export interface StudentTask {
  id: string;
  title: string;
  description: string;
  projectId: string;
  projectTitle: string;
  /** Usually YYYY-MM-DD. */
  dueDate: string;
  priority: "High" | "Medium" | "Low";
  /** Stored status; "Overdue" may have been set by faculty. Display state is derived from the due date. */
  status: string;
  reminder: ReminderState | null;
}
