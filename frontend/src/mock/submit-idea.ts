/**
 * Mock reference data for the Submit New Idea flow.
 * UI-only. Replace with API-backed lookups during backend integration.
 */

export interface StudentProfile {
  id: string;
  name: string;
  rollNumber: string;
  email: string;
  department: string;
}

/** The logged-in student. Always the team lead of a new submission. */
export const CURRENT_STUDENT: StudentProfile = {
  id: "stu-001",
  name: "Riya Patel",
  rollNumber: "22CE1042",
  email: "riya.patel@dbit.in",
  department: "Computer Engineering",
};

/**
 * Faculty guide assignment. `null` means the Faculty Coordinator has not yet
 * assigned one — students cannot choose their own guide.
 */
export const ASSIGNED_FACULTY_GUIDE: { name: string; department: string } | null = null;

/** Directory searched when inviting team members. */
export const STUDENT_DIRECTORY: StudentProfile[] = [
  { id: "stu-002", name: "Aditya Shah", rollNumber: "22CE1007", email: "aditya.shah@dbit.in", department: "Computer Engineering" },
  { id: "stu-003", name: "Sneha Kulkarni", rollNumber: "22IT1031", email: "sneha.kulkarni@dbit.in", department: "Information Technology" },
  { id: "stu-004", name: "Rahul Menon", rollNumber: "22EX1019", email: "rahul.menon@dbit.in", department: "Electronics & Telecommunication" },
  { id: "stu-005", name: "Ananya Iyer", rollNumber: "22ME1024", email: "ananya.iyer@dbit.in", department: "Mechanical Engineering" },
  { id: "stu-006", name: "Karan Desai", rollNumber: "22CE1055", email: "karan.desai@dbit.in", department: "Computer Engineering" },
  { id: "stu-007", name: "Pooja Nair", rollNumber: "22AI1012", email: "pooja.nair@dbit.in", department: "AI & Data Science" },
];

export const DEPARTMENTS = [
  "Computer Engineering",
  "Information Technology",
  "AI & Data Science",
  "Electronics & Telecommunication",
  "Mechanical Engineering",
  "Civil Engineering",
] as const;

export const DOMAINS = [
  "AgriTech",
  "HealthTech",
  "EdTech",
  "FinTech",
  "CleanTech / Energy",
  "Mobility",
  "Smart Cities",
  "AI / Deep Tech",
  "IoT & Hardware",
  "Social Impact",
  "Other",
] as const;

export const PROJECT_TYPES = [
  "Academic Project",
  "Innovation / Research",
  "Startup Idea",
  "Social Impact",
  "Industry Problem",
  "Other",
] as const;

export const TECHNOLOGY_SUGGESTIONS = [
  "Python",
  "React",
  "Next.js",
  "Flutter",
  "Node.js",
  "AI/ML",
  "Computer Vision",
  "IoT",
  "Arduino",
  "Raspberry Pi",
  "Firebase",
  "PostgreSQL",
];

export const TEAM_LIMIT = 5; // including the team lead
export const TECHNOLOGY_LIMIT = 12;

export const FILE_RULES = {
  maxFiles: 5,
  maxSizeBytes: 10 * 1024 * 1024, // 10 MB per file
  extensions: ["pdf", "ppt", "pptx", "doc", "docx"],
  accept: ".pdf,.ppt,.pptx,.doc,.docx",
} as const;
