/**
 * Mock data for the Student Dashboard.
 *
 * UI-only placeholders. No API, no persistence. Replace each export with real
 * data during backend integration — the shapes below are the contract the
 * dashboard components render against.
 */

export type ProjectStage =
  | "Idea Submitted"
  | "Faculty Review"
  | "Department Review"
  | "Incubation Review"
  | "In Development"
  | "Market Ready"
  | "Startup / Product";

export type StatusTone = "info" | "progress" | "attention" | "neutral";

export interface KpiStat {
  id: string;
  label: string;
  value: number;
  /** Lucide icon name resolved by the KPI component. */
  icon: "projects" | "reviews" | "meetings" | "milestones";
  href: string;
}

export interface Project {
  id: string;
  name: string;
  domain: string;
  mentor: string;
  stage: ProjectStage;
  stageTone: StatusTone;
  progress: number;
  nextMilestone: string;
  dueDate: string;
  href: string;
}

export interface Meeting {
  id: string;
  title: string;
  day: string;
  time: string;
  kind: string;
  action: "Join" | "View";
  isToday: boolean;
}

export interface JourneyStage {
  id: string;
  label: string;
  state: "complete" | "current" | "upcoming";
}

export interface NextAction {
  id: string;
  task: string;
  project: string;
  due: string;
  isUrgent: boolean;
}

export interface Insight {
  id: string;
  project: string;
  headline: string;
  detail: string;
}

export interface ActivityEntry {
  id: string;
  description: string;
  timestamp: string;
}

export interface FundingOpportunity {
  id: string;
  name: string;
  amount: string;
  deadline: string;
  domain: string;
  href: string;
}

// ---------------------------------------------------------------------------

export const KPI_STATS: KpiStat[] = [
  { id: "active-projects", label: "Active Projects", value: 3, icon: "projects", href: "/student/projects/1" },
  { id: "pending-reviews", label: "Pending Reviews", value: 1, icon: "reviews", href: "/student/journey" },
  { id: "upcoming-meetings", label: "Upcoming Meetings", value: 2, icon: "meetings", href: "/student/meetings" },
  { id: "milestones-due", label: "Milestones Due", value: 4, icon: "milestones", href: "/student/journey" },
];

export const PROJECTS: Project[] = [
  {
    id: "1",
    name: "Smart Agriculture AI Drone",
    domain: "AgriTech",
    mentor: "Dr. Priya Shah",
    stage: "In Development",
    stageTone: "progress",
    progress: 58,
    nextMilestone: "Prototype validation",
    dueDate: "18 Sep 2026",
    href: "/student/projects/1",
  },
  {
    id: "2",
    name: "NeuraMed Diagnostic Assistant",
    domain: "HealthTech",
    mentor: "Prof. Anand Kulkarni",
    stage: "Incubation Review",
    stageTone: "attention",
    progress: 34,
    nextMilestone: "Upload revised proposal",
    dueDate: "15 Sep 2026",
    href: "/student/projects/2",
  },
  {
    id: "3",
    name: "CampusRide Mobility Platform",
    domain: "Mobility",
    mentor: "Dr. Sneha Deshmukh",
    stage: "Department Review",
    stageTone: "info",
    progress: 21,
    nextMilestone: "Submit market research",
    dueDate: "20 Sep 2026",
    href: "/student/projects/3",
  },
];

export const MEETINGS: Meeting[] = [
  {
    id: "m1",
    title: "NeuraMed MVP Review",
    day: "Today",
    time: "3:00 PM",
    kind: "Mentor Session",
    action: "Join",
    isToday: true,
  },
  {
    id: "m2",
    title: "CampusRide Pitch Prep",
    day: "Tomorrow",
    time: "10:00 AM",
    kind: "Faculty Review",
    action: "View",
    isToday: false,
  },
];

export const JOURNEY_STAGES: JourneyStage[] = [
  { id: "j1", label: "Idea Submitted", state: "complete" },
  { id: "j2", label: "Faculty Review", state: "complete" },
  { id: "j3", label: "Department Review", state: "current" },
  { id: "j4", label: "Incubation Review", state: "upcoming" },
  { id: "j5", label: "Prototype", state: "upcoming" },
  { id: "j6", label: "Market Ready", state: "upcoming" },
  { id: "j7", label: "Startup / Product", state: "upcoming" },
];

export const NEXT_ACTIONS: NextAction[] = [
  { id: "a1", task: "Upload revised proposal", project: "NeuraMed", due: "Due today", isUrgent: true },
  { id: "a2", task: "Complete mentor feedback", project: "Smart Agriculture AI", due: "Due tomorrow", isUrgent: false },
  { id: "a3", task: "Submit market research", project: "CampusRide", due: "Due 20 Sep", isUrgent: false },
];

export const AI_INSIGHTS: Insight[] = [
  {
    id: "i1",
    project: "NeuraMed",
    headline: "Competitor landscape changed.",
    detail: "Two comparable diagnostic tools launched this quarter. Consider strengthening the proprietary-dataset USP.",
  },
  {
    id: "i2",
    project: "CampusRide",
    headline: "Hardware costs may affect scalability.",
    detail: "Unit economics assume campus-scale deployment. Review the current business model before the pitch.",
  },
];

export const RECENT_ACTIVITY: ActivityEntry[] = [
  { id: "r1", description: "Faculty feedback received", timestamp: "2 hours ago" },
  { id: "r2", description: "Project milestone updated", timestamp: "Yesterday" },
  { id: "r3", description: "Mentor session completed", timestamp: "Yesterday" },
  { id: "r4", description: "Funding opportunity matched", timestamp: "2 days ago" },
];

export const FUNDING_OPPORTUNITIES: FundingOpportunity[] = [
  {
    id: "f1",
    name: "AI Innovation Grant",
    amount: "Up to ₹2 Lakh",
    deadline: "28 Sep 2026",
    domain: "AI / Deep Tech",
    href: "/student/funding",
  },
  {
    id: "f2",
    name: "Student Startup Fund",
    amount: "Up to ₹5 Lakh",
    deadline: "05 Oct 2026",
    domain: "Any domain",
    href: "/student/funding",
  },
  {
    id: "f3",
    name: "AgriTech Incubation Support",
    amount: "Up to ₹3 Lakh",
    deadline: "12 Oct 2026",
    domain: "AgriTech",
    href: "/student/funding",
  },
];
