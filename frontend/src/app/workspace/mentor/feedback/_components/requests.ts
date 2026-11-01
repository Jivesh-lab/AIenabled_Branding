import { cleanName } from "@/lib/displayName";
import { formatShortDate } from "@/lib/formatDate";

export interface MenteeRequest {
  id: string;
  project: string;
  mentee: string;
  category: string;
  question: string;
  /** Formatted date when the record has one, otherwise the text it was stored with. */
  submitted?: string;
  resolved: boolean;
  response?: string;
}

export type RequestTab = "open" | "resolved" | "all";

export const REQUEST_TAB_LABEL: Record<RequestTab, string> = { open: "Open", resolved: "Resolved", all: "All" };

interface SupportRecord {
  id?: string;
  _id?: string;
  projectTitle?: string;
  studentName?: string;
  category?: string;
  question?: string;
  submittedAt?: string;
  createdAt?: string;
  status?: string;
  volunteerResponse?: string | null;
}

/** Mentee questions. Open ones are listed before resolved ones so what needs a reply is on top; newest first within each. */
export function toRequests(records: unknown[]): MenteeRequest[] {
  const parsed = (records as SupportRecord[]).map((r, i) => {
    const stored = r.submittedAt && r.submittedAt !== "Recent" ? r.submittedAt : undefined;
    const request: MenteeRequest = {
      id: r.id || r._id || `request-${i}`,
      project: r.projectTitle || "Untitled project",
      mentee: cleanName(r.studentName || "Researcher"),
      category: r.category || "General",
      question: r.question || "",
      submitted: formatShortDate(r.createdAt) ?? stored,
      resolved: r.status === "Resolved",
      response: r.volunteerResponse?.trim() || undefined,
    };
    return { request, created: Date.parse(r.createdAt ?? "") || 0 };
  });
  return parsed
    .sort((a, b) => Number(a.request.resolved) - Number(b.request.resolved) || b.created - a.created)
    .map((entry) => entry.request);
}

export function filterRequests(requests: MenteeRequest[], tab: RequestTab): MenteeRequest[] {
  if (tab === "open") return requests.filter((r) => !r.resolved);
  if (tab === "resolved") return requests.filter((r) => r.resolved);
  return requests;
}
