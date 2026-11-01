/**
 * What the student assistant may state as FACT. Every fact is derived from the signed-in student's own saved
 * records (already ownership-checked by the sources that produced them). Anything that could not be loaded is
 * reported as unavailable instead of being guessed. The AI step only phrases suggestions on top of these facts; it
 * has no way to add a fact. Pure and unit-tested.
 */
import { formatLongDateSafe } from "./journeyFormat.ts";
import { projectUrl, type Journey } from "./journey.ts";
import { MATCHING_DESCRIPTION, type MentorResult } from "./mentorState.ts";
import { isIsoDate, istDateOf, meetingStatus, taskState, type Now } from "./workflowState.ts";
import type { ApplicationDetail, MilestonesResponse, StudentProject } from "../types/student-application.ts";
import type { StudentMeeting, StudentTask } from "../types/student-workflow.ts";

export type Topic = "status" | "feedback" | "progress" | "mentor" | "meetings" | "tasks" | "blockers" | "next";

export interface Fact {
  id: string;
  topic: Topic;
  text: string;
  href?: string;
  linkLabel?: string;
}

export interface AssistantContext {
  project: StudentProject;
  /** null = the project details could not be loaded. */
  detail: ApplicationDetail | null;
  journey: Journey;
  mentor: MentorResult | undefined;
  tasks: StudentTask[] | null;
  meetings: StudentMeeting[] | null;
  /** null = not loaded (only relevant for approved projects). */
  milestones: MilestonesResponse | null;
  now: Now;
}

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "a draft (not submitted)",
  SUBMITTED: "submitted and waiting for review",
  UNDER_REVIEW: "under review",
  REVISION_REQUESTED: "waiting for your changes (revision requested)",
  APPROVED: "approved",
  REJECTED: "not approved (rejected)",
};

const clip = (text: string, n = 280) => (text.length > n ? `${text.slice(0, n - 1)}…` : text);
const quote = (text: string, n = 280) => `"${clip(text.replace(/\s+/g, " ").trim(), n)}"`;

/** A specific link label from where the link goes (never a vague "Go"). */
export function labelForHref(href: string): string {
  if (href.includes("#milestones")) return "Open milestones";
  if (href.includes("#tasks")) return "Open tasks";
  if (href.includes("/submit")) return "Edit application";
  if (/\/meetings\/[^/]+/.test(href)) return "Open meeting";
  if (href.endsWith("/meetings")) return "Open meetings";
  return "Open project";
}

export function buildFacts(ctx: AssistantContext): { facts: Fact[]; unavailable: { topic: Topic; text: string }[] } {
  const { project, detail, journey, mentor, tasks, meetings, milestones, now } = ctx;
  const facts: Fact[] = [];
  const unavailable: { topic: Topic; text: string }[] = [];
  const id = project.id;
  const approved = project.reviewStatus === "APPROVED";
  const here = projectUrl(id);

  // status
  facts.push({ id: "status", topic: "status", text: `Your application "${project.name}" is ${STATUS_LABEL[project.reviewStatus] ?? project.reviewStatus}.`, href: here, linkLabel: "Open project" });
  const current = journey.stages.find((s) => s.id === journey.currentStageId);
  facts.push({
    id: "journey", topic: "status",
    text: `Journey: ${journey.progress.done} of ${journey.progress.total} stages done (${journey.progress.percent}%)${current ? `; current stage is "${current.label}" - ${current.detail.replace(/\.$/, "")}` : ""}.`,
    href: "/workspace/student/journey", linkLabel: "Open journey",
  });

  // reviewer feedback
  if (!detail) {
    unavailable.push({ topic: "feedback", text: "Reviewer feedback could not be loaded right now." });
  } else {
    if (detail.reviewerComments && detail.reviewerComments.trim()) {
      facts.push({ id: "reviewer", topic: "feedback", text: `Reviewer comment: ${quote(detail.reviewerComments)}`, href: here, linkLabel: "Open project" });
    } else if (project.reviewStatus === "REVISION_REQUESTED") {
      facts.push({ id: "reviewer", topic: "feedback", text: "The reviewer requested changes but left no written comment.", href: here, linkLabel: "Open project" });
    } else {
      facts.push({ id: "reviewer", topic: "feedback", text: "No reviewer comment is recorded for this project." });
    }
    for (const [i, entry] of detail.history.slice(-3).entries()) {
      const when = entry.at ? formatLongDateSafe(istDateOf(entry.at)) : "an unknown date";
      facts.push({ id: `history-${i}`, topic: "feedback", text: `On ${when}: ${entry.from ? `${entry.from} → ` : ""}${entry.to}${entry.comments ? ` - ${quote(entry.comments)}` : ""}.` });
    }
  }

  // progress / milestones
  if (!approved) {
    facts.push({ id: "milestones-na", topic: "progress", text: "Milestones become available once the project is approved." });
  } else if (!milestones) {
    unavailable.push({ topic: "progress", text: "Milestones could not be loaded right now." });
  } else if (milestones.summary.total === 0) {
    facts.push({ id: "milestones-none", topic: "progress", text: "No milestones are recorded for this project yet.", href: projectUrl(id, "#milestones"), linkLabel: "Add milestones" });
  } else {
    const s = milestones.summary;
    facts.push({ id: "milestones", topic: "progress", text: `${s.completed} of ${s.total} milestones are done (${s.progress}% progress); ${s.overdue} overdue.`, href: projectUrl(id, "#milestones"), linkLabel: "Open milestones" });
    for (const m of milestones.milestones.filter((x) => x.state === "overdue").slice(0, 3)) {
      facts.push({ id: `overdue-${m.id}`, topic: "progress", text: `Milestone "${m.title}" is overdue${m.dueDate ? ` (target ${formatLongDateSafe(m.dueDate)})` : ""}.`, href: projectUrl(id, "#milestones"), linkLabel: "Open milestones" });
    }
  }

  // mentor
  if (!approved && project.reviewStatus !== "REJECTED") {
    facts.push({ id: "mentor", topic: "mentor", text: MATCHING_DESCRIPTION["not-started"] });
  } else if (!mentor || !mentor.ok) {
    unavailable.push({ topic: "mentor", text: "Mentor information could not be loaded right now." });
  } else if (mentor.data.state === "matched" && mentor.data.mentor) {
    facts.push({ id: "mentor", topic: "mentor", text: `Your confirmed mentor is ${mentor.data.mentor.name}.`, href: here, linkLabel: "Open project" });
  } else if (mentor.data.state === "recommended" && mentor.data.recommendation) {
    facts.push({ id: "mentor", topic: "mentor", text: `${mentor.data.recommendation.name} has been RECOMMENDED as a mentor. This is a proposal, not a confirmed assignment.`, href: here, linkLabel: "Open project" });
  } else {
    facts.push({ id: "mentor", topic: "mentor", text: MATCHING_DESCRIPTION[mentor.data.state], href: here, linkLabel: "Open project" });
  }

  // meetings
  if (meetings === null) {
    unavailable.push({ topic: "meetings", text: "Meetings could not be loaded right now." });
  } else {
    const mine = meetings.filter((m) => m.projectId === id);
    const upcoming = mine
      .filter((m) => ["TODAY", "UPCOMING"].includes(meetingStatus(m, now)))
      .sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`))
      .slice(0, 3);
    const awaiting = mine.filter((m) => meetingStatus(m, now) === "REQUESTED").length;
    if (upcoming.length === 0) facts.push({ id: "meetings-none", topic: "meetings", text: "No confirmed upcoming meetings for this project.", href: "/workspace/student/meetings", linkLabel: "Open meetings" });
    for (const m of upcoming) {
      facts.push({
        id: `meeting-${m.id}`, topic: "meetings",
        text: `Meeting "${m.title}" on ${isIsoDate(m.date) ? formatLongDateSafe(m.date) : m.date}${m.startTime ? ` at ${m.startTime} IST` : ""}${m.agenda ? `. Agenda: ${quote(m.agenda, 160)}` : ""}.`,
        href: `/workspace/student/meetings/${encodeURIComponent(m.id)}`, linkLabel: "Open meeting",
      });
    }
    if (awaiting > 0) facts.push({ id: "meetings-awaiting", topic: "meetings", text: `${awaiting} meeting ${awaiting === 1 ? "request is" : "requests are"} awaiting the host's confirmation.`, href: "/workspace/student/meetings", linkLabel: "Open meetings" });
  }

  // tasks
  if (!approved) {
    facts.push({ id: "tasks-na", topic: "tasks", text: "Tasks are available once the project is approved." });
  } else if (tasks === null) {
    unavailable.push({ topic: "tasks", text: "Tasks could not be loaded right now." });
  } else {
    const open = tasks.filter((t) => t.projectId === id && t.status !== "Completed").slice(0, 5);
    if (open.length === 0) facts.push({ id: "tasks-none", topic: "tasks", text: "You have no open tasks on this project.", href: projectUrl(id, "#tasks"), linkLabel: "Open tasks" });
    for (const t of open) {
      const state = taskState(t, now.date);
      facts.push({
        id: `task-${t.id}`, topic: "tasks",
        text: `Task "${t.title}" is ${t.status}, due ${isIsoDate(t.dueDate) ? formatLongDateSafe(t.dueDate) : t.dueDate}${state === "OVERDUE" ? " (overdue)" : state === "DUE_SOON" ? " (due soon)" : ""}.`,
        href: projectUrl(id, "#tasks"), linkLabel: "Open tasks",
      });
    }
  }

  // blockers + next steps come from the journey model, i.e. the same rules as the Journey page
  if (journey.blockers.length === 0) facts.push({ id: "blockers-none", topic: "blockers", text: "No blockers are recorded for this project." });
  for (const b of journey.blockers) facts.push({ id: `blocker-${b.id}`, topic: "blockers", text: `Blocker: ${b.label}.`, href: b.href, linkLabel: labelForHref(b.href) });
  for (const m of journey.missing) unavailable.push({ topic: "blockers", text: `The ${m} information could not be loaded, so blockers related to it are unknown.` });
  for (const a of journey.actions.slice(0, 5)) facts.push({ id: `next-${a.id}`, topic: "next", text: `Next step from your records: ${a.label}.`, href: a.href, linkLabel: labelForHref(a.href) });
  if (journey.actions.length === 0) facts.push({ id: "next-none", topic: "next", text: "No pending steps are recorded for this project." });

  return { facts, unavailable };
}

const TOPIC_PATTERNS: [Topic, RegExp][] = [
  ["feedback", /feedback|comment|reviewer|revision|changes|resubmit/i],
  ["progress", /progress|milestone|percent|how far|complete/i],
  ["mentor", /mentor|guide|coordinator/i],
  ["meetings", /meeting|session|\bcall\b|schedul|agenda|prepare|preparation/i],
  ["tasks", /task|deadline|\bdue\b|to-?do/i],
  ["blockers", /block|stuck|problem|risk|overdue|delay|issue/i],
  ["next", /\bnext\b|should i|work on|what now|priorit|focus|\bdo now\b/i],
  ["status", /status|application|submitted|approved|reject|decision|review|where am i|stage/i],
];

export function detectTopics(question: string): Topic[] {
  const topics = TOPIC_PATTERNS.filter(([, re]) => re.test(question)).map(([t]) => t);
  return topics.length > 0 ? topics : ["status", "next"];
}

/**
 * Requests about other people's records. This is only a courtesy refusal: the real guarantee is that the assistant
 * never loads anyone else's data in the first place.
 */
export function isOutOfScope(question: string): boolean {
  if (/\bmy (other|another)\b/i.test(question)) return false;
  return (
    /\b(another|other|someone else'?s?|somebody else'?s?|everyone'?s?|all)\s+(the\s+)?(students?|applications?|projects?|teams?|founders?|mentors?|meetings?)\b/i.test(question) ||
    /\b(his|her|their)\s+(application|project|meeting|mentor|team|feedback)\b/i.test(question) ||
    /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(question) ||
    /\b(student|user)\s*id\b/i.test(question)
  );
}

export const OUT_OF_SCOPE_ANSWER = "I can only talk about your own projects and records. I can't look up or share anyone else's information.";

export interface RecordAnswer {
  topics: Topic[];
  facts: Fact[];
  unavailable: string[];
  links: { label: string; href: string }[];
}

/** The deterministic, verified part of every answer. */
export function answerFor(ctx: AssistantContext, question: string): RecordAnswer {
  const topics = detectTopics(question);
  const wanted = new Set<Topic>(topics);
  if (wanted.has("next")) {
    wanted.add("blockers");
    wanted.add("tasks");
  }
  const { facts, unavailable } = buildFacts(ctx);
  const chosen = facts.filter((f) => wanted.has(f.topic));
  const links: { label: string; href: string }[] = [];
  for (const f of chosen) {
    if (f.href && f.linkLabel && !links.some((l) => l.href === f.href)) links.push({ label: f.linkLabel, href: f.href });
  }
  return { topics, facts: chosen, unavailable: unavailable.filter((u) => wanted.has(u.topic)).map((u) => u.text), links: links.slice(0, 5) };
}
