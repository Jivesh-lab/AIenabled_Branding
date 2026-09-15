/**
 * Submit New Idea — form schema, defaults and step definitions.
 *
 * One schema covers the whole submission. Each wizard step validates only its
 * own fields (see STEP_FIELDS), so moving between steps never reports errors
 * from steps the student has not reached yet.
 *
 * No transforms or defaults live in the schema, so its input and output types
 * are identical — this keeps react-hook-form typing simple.
 */
import { z } from "zod";
import { SUBMITTABLE_MATURITY_LEVELS } from "@/types/status";
import { FILE_RULES, TEAM_LIMIT, TECHNOLOGY_LIMIT } from "@/mock/submit-idea";

/**
 * http(s) with a real domain only. Plain z.url() accepts `javascript:` and
 * `mailto:` URLs, which would become an XSS vector once these links are
 * rendered for reviewers.
 */
const optionalUrl = z.union([
  z.literal(""),
  z.url({
    protocol: /^https?$/,
    hostname: z.regexes.domain,
    message: "Enter a full web address, starting with https://",
  }),
]);

const teamMemberSchema = z.object({
  id: z.string(),
  name: z.string(),
  rollNumber: z.string(),
  email: z.string(),
  /** Invites are never accepted on the student's behalf. */
  inviteStatus: z.literal("PENDING"),
});

const attachmentSchema = z.object({
  id: z.string(),
  name: z.string(),
  sizeBytes: z.number(),
});

export const ideaSchema = z.object({
  // Step 1 — Idea basics
  name: z
    .string()
    .trim()
    .min(3, "Give your idea a name (at least 3 characters)")
    .max(120, "Keep the name under 120 characters"),
  shortDescription: z
    .string()
    .trim()
    .min(20, "Describe the idea in at least 20 characters")
    .max(300, "Keep the short description under 300 characters"),
  department: z.string().min(1, "Select your department"),
  domain: z.string().min(1, "Select a domain or sector"),
  projectType: z.string(),
  maturity: z.enum(SUBMITTABLE_MATURITY_LEVELS),

  // Step 2 — Problem & solution
  problem: z
    .string()
    .trim()
    .min(30, "Explain the problem in at least 30 characters")
    .max(2000, "Keep this under 2,000 characters"),
  affectedUsers: z
    .string()
    .trim()
    .min(10, "Tell us who faces this problem")
    .max(1000, "Keep this under 1,000 characters"),
  currentSolutions: z.string().trim().max(1500, "Keep this under 1,500 characters"),
  solution: z
    .string()
    .trim()
    .min(30, "Describe your solution in at least 30 characters")
    .max(2000, "Keep this under 2,000 characters"),
  differentiation: z
    .string()
    .trim()
    .min(20, "Explain what makes your solution different")
    .max(1500, "Keep this under 1,500 characters"),

  // Step 3 — Team & technology
  teamMembers: z.array(teamMemberSchema).max(TEAM_LIMIT - 1, `A team can have at most ${TEAM_LIMIT} people`),
  technologies: z.array(z.string()).max(TECHNOLOGY_LIMIT, `Add at most ${TECHNOLOGY_LIMIT} technologies`),
  githubUrl: optionalUrl.refine(
    (v) => v === "" || /^https?:\/\/(www\.)?github\.com\//i.test(v),
    "Enter a github.com repository link"
  ),
  demoUrl: optionalUrl,
  prototypeAvailable: z.enum(["YES", "NO"]),
  attachments: z.array(attachmentSchema).max(FILE_RULES.maxFiles, `Attach at most ${FILE_RULES.maxFiles} files`),

  // Step 4 — Review & submit
  declarationAccepted: z
    .boolean()
    .refine((v) => v, "Please confirm the declaration before submitting"),
});

export type IdeaFormValues = z.infer<typeof ideaSchema>;
export type TeamMemberInvite = IdeaFormValues["teamMembers"][number];
export type Attachment = IdeaFormValues["attachments"][number];

export const IDEA_DEFAULT_VALUES: IdeaFormValues = {
  name: "",
  shortDescription: "",
  department: "",
  domain: "",
  projectType: "",
  maturity: "IDEA",
  problem: "",
  affectedUsers: "",
  currentSolutions: "",
  solution: "",
  differentiation: "",
  teamMembers: [],
  technologies: [],
  githubUrl: "",
  demoUrl: "",
  prototypeAvailable: "NO",
  attachments: [],
  declarationAccepted: false,
};

// ---------------------------------------------------------------------------
// Steps
// ---------------------------------------------------------------------------
export const WIZARD_STEPS = [
  { id: "basics", title: "Idea Basics", description: "What the idea is and where it sits." },
  { id: "problem", title: "Problem & Solution", description: "The problem, who it affects and how you solve it." },
  { id: "team", title: "Team & Technology", description: "Who is building it and with what." },
  { id: "review", title: "Review & Submit", description: "Check everything before it enters review." },
] as const;

/**
 * WORKFLOW TEST MODE — TEMPORARY.
 * true  → every step can be passed with empty fields, and Submit works without
 *         the declaration. Use this to click through the whole flow.
 * false → normal validation. SET BACK TO false BEFORE RELEASE.
 */
export const SKIP_VALIDATION = true;

export type StepIndex = 0 | 1 | 2 | 3;
export const LAST_STEP: StepIndex = 3;

/** Fields validated when leaving each step. */
export const STEP_FIELDS: Record<StepIndex, (keyof IdeaFormValues)[]> = {
  0: ["name", "shortDescription", "department", "domain", "projectType", "maturity"],
  1: ["problem", "affectedUsers", "currentSolutions", "solution", "differentiation"],
  2: ["teamMembers", "technologies", "githubUrl", "demoUrl", "prototypeAvailable", "attachments"],
  3: ["declarationAccepted"],
};

/** The first step containing any of the given error fields. */
export function firstStepWithError(errorFields: string[]): StepIndex {
  for (const step of [0, 1, 2, 3] as StepIndex[]) {
    if (STEP_FIELDS[step].some((field) => errorFields.includes(field))) return step;
  }
  return 0;
}
