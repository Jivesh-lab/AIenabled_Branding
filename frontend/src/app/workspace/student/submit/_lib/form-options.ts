/**
 * Option lists and limits for the Submit New Idea form. Static configuration, not sample data.
 */

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
