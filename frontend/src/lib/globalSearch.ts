/**
 * Student Portal global search: builds an index from records the signed-in student is already allowed to see, and
 * ranks matches. Pure (no framework imports) so it is unit-tested directly. Nothing here is invented: every entry
 * is a project, meeting, task, confirmed mentor, funding scheme or portal page that exists.
 */
import type { StudentOverview } from "../types/student-overview.ts";
import type { GrantOpportunity } from "./fundingGrants.ts";

export type SearchGroup = "Projects" | "Meetings" | "Tasks" | "Mentors" | "Funding" | "Pages";

export const GROUP_ORDER: SearchGroup[] = ["Projects", "Meetings", "Tasks", "Mentors", "Funding", "Pages"];

export interface SearchEntry {
  id: string;
  group: SearchGroup;
  title: string;
  subtitle: string;
  href: string;
  /** Extra text that can match but is not shown (description, domain, participants...). */
  keywords: string;
}

export interface SearchResult extends SearchEntry {
  score: number;
}

export const PORTAL_PAGES: { title: string; subtitle: string; href: string; keywords: string }[] = [
  { title: "Dashboard", subtitle: "Overview of your projects and activity", href: "/workspace/student/dashboard", keywords: "home overview" },
  { title: "My Projects", subtitle: "All of your ideas and applications", href: "/workspace/student/projects", keywords: "applications ideas startups" },
  { title: "Submit a New Idea", subtitle: "Start a new application", href: "/workspace/student/submit", keywords: "proposal new idea apply" },
  { title: "Funding & Grants", subtitle: "Grants and seed funding schemes", href: "/workspace/student/funding", keywords: "grant seed money scheme" },
  { title: "Journey Timeline", subtitle: "Where each project stands", href: "/workspace/student/journey", keywords: "progress milestones stages" },
  { title: "Meetings", subtitle: "Mentor, faculty and investor meetings", href: "/workspace/student/meetings", keywords: "schedule calendar mentor request" },
  { title: "My Profile", subtitle: "Your account details", href: "/workspace/student/profile", keywords: "account" },
  { title: "Account Settings", subtitle: "Preferences and security", href: "/workspace/student/settings", keywords: "preferences password" },
];

/** Where a project opens: a draft reopens the wizard, everything else opens the project page. */
function projectLink(project: { id: string; reviewStatus: string }): string {
  return project.reviewStatus === "DRAFT"
    ? `/workspace/student/submit?applicationId=${encodeURIComponent(project.id)}`
    : `/workspace/student/projects/${encodeURIComponent(project.id)}`;
}

/**
 * Index every searchable record. A section that failed to load simply contributes nothing (it is never shown as an
 * empty match), and funding and pages are always available.
 */
export function buildIndex(overview: StudentOverview | null, grants: GrantOpportunity[]): SearchEntry[] {
  const entries: SearchEntry[] = [];

  if (overview?.projects.ok) {
    for (const p of overview.projects.data) {
      entries.push({
        id: `project:${p.id}`,
        group: "Projects",
        title: p.name,
        subtitle: [p.domain, p.reviewStatus.replace(/_/g, " ").toLowerCase()].filter(Boolean).join(" · "),
        href: projectLink(p),
        keywords: `${p.shortDescription ?? ""} ${p.domain ?? ""}`,
      });
      const mentor = overview.mentors?.[p.id];
      if (mentor?.ok && mentor.data.state === "matched" && mentor.data.mentor?.name) {
        entries.push({
          id: `mentor:${p.id}`,
          group: "Mentors",
          title: mentor.data.mentor.name,
          subtitle: `Mentor for ${p.name}`,
          href: `/workspace/student/projects/${encodeURIComponent(p.id)}`,
          keywords: p.name,
        });
      }
    }
  }

  if (overview?.meetings.ok) {
    for (const m of overview.meetings.data) {
      entries.push({
        id: `meeting:${m.id}`,
        group: "Meetings",
        title: m.title,
        subtitle: [m.projectTitle, m.date].filter(Boolean).join(" · "),
        href: `/workspace/student/meetings/${encodeURIComponent(m.id)}`,
        keywords: `${m.meetingType ?? ""} ${(m.participants ?? []).join(" ")} ${m.agenda ?? ""}`,
      });
    }
  }

  if (overview?.tasks.ok) {
    for (const t of overview.tasks.data) {
      entries.push({
        id: `task:${t.id}`,
        group: "Tasks",
        title: t.title,
        subtitle: [t.projectTitle, t.dueDate && `due ${t.dueDate}`].filter(Boolean).join(" · "),
        href: `/workspace/student/projects/${encodeURIComponent(t.projectId)}#tasks`,
        keywords: t.description ?? "",
      });
    }
  }

  for (const g of grants) {
    entries.push({
      id: `grant:${g.id}`,
      group: "Funding",
      title: g.name,
      subtitle: `${g.provider} · ${g.amount}`,
      href: "/workspace/student/funding",
      keywords: `${g.category} ${g.domain} ${g.description}`,
    });
  }

  for (const page of PORTAL_PAGES) {
    entries.push({ id: `page:${page.href}`, group: "Pages", ...page });
  }

  return entries;
}

function normalise(text: string): string {
  return text.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "");
}

/** Every whitespace-separated term must appear somewhere; earlier and title matches rank higher. */
function scoreEntry(entry: SearchEntry, terms: string[]): number {
  const title = normalise(entry.title);
  const subtitle = normalise(entry.subtitle);
  const keywords = normalise(entry.keywords);
  let total = 0;
  for (const term of terms) {
    if (title.startsWith(term)) total += 100;
    else if (title.split(/[\s/&-]+/).some((word) => word.startsWith(term))) total += 80;
    else if (title.includes(term)) total += 60;
    else if (subtitle.includes(term)) total += 30;
    else if (keywords.includes(term)) total += 15;
    else return 0;
  }
  return total;
}

const PER_GROUP = 4;
const MAX_RESULTS = 14;

/** Ranked, capped results for a query; empty for a blank query. */
export function searchIndex(index: SearchEntry[], query: string): SearchResult[] {
  const terms = normalise(query).split(/\s+/).filter(Boolean);
  if (terms.length === 0) return [];

  const byGroup = new Map<SearchGroup, SearchResult[]>();
  for (const entry of index) {
    const score = scoreEntry(entry, terms);
    if (score === 0) continue;
    const list = byGroup.get(entry.group) ?? [];
    list.push({ ...entry, score });
    byGroup.set(entry.group, list);
  }

  const out: SearchResult[] = [];
  for (const group of GROUP_ORDER) {
    const list = (byGroup.get(group) ?? []).sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));
    out.push(...list.slice(0, PER_GROUP));
  }
  return out.slice(0, MAX_RESULTS);
}

/** Splits text into matched and unmatched segments so the UI can highlight what the student typed. */
export function splitMatches(text: string, query: string): { text: string; match: boolean }[] {
  const terms = [...new Set(query.trim().split(/\s+/).filter(Boolean))];
  if (terms.length === 0 || !text) return [{ text, match: false }];
  const escaped = terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).sort((a, b) => b.length - a.length);
  const pattern = new RegExp(`(${escaped.join("|")})`, "gi");
  // split() with one capturing group puts every matched piece at an odd index.
  return text
    .split(pattern)
    .map((part, i) => ({ text: part, match: i % 2 === 1 }))
    .filter((segment) => segment.text !== "");
}
