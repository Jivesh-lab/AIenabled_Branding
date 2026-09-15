/**
 * Mock project portfolio for the Student "My Projects" page.
 *
 * Every project carries the three independent status fields (§15.2):
 * reviewStatus, pipelinePosition and maturity. Replace with an API call during
 * backend integration — `StudentProject` is the contract the page renders.
 */
import type { Maturity, PipelinePosition, ReviewStatus } from "@/types/status";

export interface ProjectNextStep {
  /** An action the student must take, or an upcoming milestone. */
  kind: "action" | "milestone";
  label: string;
  dueDate?: string; // ISO date
}

export interface StudentProject {
  id: string;
  name: string;
  shortDescription: string;
  domain: string;

  reviewStatus: ReviewStatus;
  /** Which reviewer holds it. null for drafts and for projects past review. */
  pipelinePosition: PipelinePosition | null;
  maturity: Maturity;

  /** For drafts this is submission completeness; otherwise delivery progress. */
  progress: number;
  facultyGuide: string | null;
  teamSize: number;
  updatedAt: string; // ISO date
  next: ProjectNextStep | null;
}

/**
 * Fixed "today" for mock data. Relative labels ("2 days ago") are computed
 * against this, so they read the same on the server and in the browser.
 * Replace with the real date once data comes from the API.
 */
export const MOCK_TODAY = "2026-09-15";

export const STUDENT_PROJECTS: StudentProject[] = [
  {
    id: "1",
    name: "Smart Agriculture AI Drone",
    shortDescription:
      "AI-powered drone that detects crop disease early from multispectral imagery and recommends targeted treatment.",
    domain: "AgriTech",
    reviewStatus: "UNDER_REVIEW",
    pipelinePosition: "FACULTY_REVIEW",
    maturity: "PROTOTYPE",
    progress: 58,
    facultyGuide: "Dr. Priya Shah",
    teamSize: 4,
    updatedAt: "2026-09-13",
    next: { kind: "action", label: "Faculty feedback pending" },
  },
  {
    id: "2",
    name: "NeuraMed Diagnostic Assistant",
    shortDescription:
      "Decision-support tool that flags anomalies in chest X-rays for faster triage in district hospitals.",
    domain: "HealthTech",
    reviewStatus: "REVISION_REQUESTED",
    pipelinePosition: "DEPARTMENT_REVIEW",
    maturity: "MVP",
    progress: 34,
    facultyGuide: "Prof. Anand Kulkarni",
    teamSize: 3,
    updatedAt: "2026-09-14",
    next: { kind: "action", label: "Upload revised proposal", dueDate: "2026-09-15" },
  },
  {
    id: "3",
    name: "CampusRide Mobility Platform",
    shortDescription: "Shared e-bike network for large campuses with app-based unlocking and usage analytics.",
    domain: "Mobility",
    reviewStatus: "UNDER_REVIEW",
    pipelinePosition: "DEPARTMENT_REVIEW",
    maturity: "CONCEPT",
    progress: 21,
    facultyGuide: "Dr. Sneha Deshmukh",
    teamSize: 5,
    updatedAt: "2026-09-08",
    next: { kind: "action", label: "Submit market research", dueDate: "2026-09-20" },
  },
  {
    id: "4",
    name: "GreenGrid Smart Energy Meter",
    shortDescription: "Low-cost IoT meter that shows hostel rooms their real-time power use to cut energy waste.",
    domain: "CleanTech / Energy",
    reviewStatus: "APPROVED",
    pipelinePosition: null,
    maturity: "MVP",
    progress: 72,
    facultyGuide: "Dr. Rohan Mehta",
    teamSize: 4,
    updatedAt: "2026-09-10",
    next: { kind: "milestone", label: "Pilot deployment in Hostel B", dueDate: "2026-09-30" },
  },
  {
    id: "5",
    name: "Campus Waste Sorting Bot",
    shortDescription: "Camera-guided bin that separates dry, wet and recyclable waste at canteen collection points.",
    domain: "Smart Cities",
    reviewStatus: "DRAFT",
    pipelinePosition: null,
    maturity: "IDEA",
    progress: 40,
    facultyGuide: null,
    teamSize: 2,
    updatedAt: "2026-09-15",
    next: { kind: "action", label: "Complete the Problem & Solution step" },
  },
  {
    id: "6",
    name: "SignBridge Sign-Language Translator",
    shortDescription: "Mobile app that translates Indian Sign Language into text and speech in real time.",
    domain: "Social Impact",
    reviewStatus: "SUBMITTED",
    pipelinePosition: "FACULTY_REVIEW",
    maturity: "CONCEPT",
    progress: 10,
    facultyGuide: null,
    teamSize: 3,
    updatedAt: "2026-09-12",
    next: { kind: "action", label: "Awaiting faculty guide assignment" },
  },
  {
    id: "7",
    name: "Rural Tele-Pharmacy Kiosk",
    shortDescription: "Village kiosk connecting patients to remote pharmacists for prescription fulfilment.",
    domain: "HealthTech",
    reviewStatus: "REJECTED",
    pipelinePosition: "DEPARTMENT_REVIEW",
    maturity: "IDEA",
    progress: 15,
    facultyGuide: "Prof. Anand Kulkarni",
    teamSize: 2,
    updatedAt: "2026-08-28",
    next: { kind: "action", label: "Read reviewer feedback" },
  },
];
