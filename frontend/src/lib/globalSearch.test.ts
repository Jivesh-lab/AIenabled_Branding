// Run with: npm run test:unit   (Node's built-in runner; no extra dependencies)
import assert from "node:assert/strict";
import { test } from "node:test";
import { GRANT_OPPORTUNITIES } from "./fundingGrants.ts";
import { buildIndex, searchIndex, splitMatches } from "./globalSearch.ts";
import type { StudentOverview } from "../types/student-overview.ts";

const failed = { ok: false as const, kind: "unavailable" as const, message: "x" };

function overview(partial: Partial<StudentOverview>): StudentOverview {
  return { generatedAt: "", projects: failed, tasks: failed, meetings: failed, mentors: {}, monitoring: {}, ...partial };
}

test("with nothing loaded, funding schemes and portal pages are still searchable", () => {
  const index = buildIndex(null, GRANT_OPPORTUNITIES);
  assert.ok(index.some((e) => e.group === "Funding"));
  assert.ok(index.some((e) => e.group === "Pages"));
  assert.ok(!index.some((e) => e.group === "Projects" || e.group === "Meetings"));
});

test("a section that failed to load contributes nothing instead of fake matches", () => {
  const index = buildIndex(overview({}), []);
  assert.deepEqual(new Set(index.map((e) => e.group)), new Set(["Pages"]));
});

test("projects, meetings, tasks and confirmed mentors are indexed from the student's own records", () => {
  const index = buildIndex(
    overview({
      projects: {
        ok: true,
        data: [{ id: "p1", name: "CivilSentinel", shortDescription: "Bridge monitoring", domain: "CivilTech", reviewStatus: "APPROVED" }] as never,
      },
      meetings: {
        ok: true,
        data: [{ id: "m1", title: "Mentor review", projectTitle: "CivilSentinel", date: "2026-11-20", meetingType: "Review", participants: ["Dr Rao"], agenda: "" }] as never,
      },
      tasks: { ok: true, data: [{ id: "t1", title: "Market validation", projectId: "p1", projectTitle: "CivilSentinel", dueDate: "2026-11-25", description: "" }] as never },
      mentors: { p1: { ok: true, data: { state: "matched", mentor: { name: "Dr Rao" } } } as never },
    }),
    [],
  );
  const groups = (q: string) => searchIndex(index, q).map((r) => r.group);
  assert.ok(groups("civil").includes("Projects"));
  assert.ok(groups("review").includes("Meetings"));
  assert.ok(groups("validation").includes("Tasks"));
  assert.ok(groups("rao").includes("Mentors"));
});

test("a recommended (unconfirmed) mentor is not searchable as a mentor", () => {
  const index = buildIndex(
    overview({
      projects: { ok: true, data: [{ id: "p1", name: "Alpha", shortDescription: "", domain: "", reviewStatus: "APPROVED" }] as never },
      mentors: { p1: { ok: true, data: { state: "recommended", mentor: null, recommendation: { name: "Dr Maybe" } } } as never },
    }),
    [],
  );
  assert.equal(searchIndex(index, "maybe").length, 0);
});

test("a blank query returns nothing, and every term must match", () => {
  const index = buildIndex(null, GRANT_OPPORTUNITIES);
  assert.deepEqual(searchIndex(index, "   "), []);
  assert.ok(searchIndex(index, "agritech grant").length > 0);
  assert.equal(searchIndex(index, "agritech zzzzqq").length, 0);
});

test("within a group, better matches come first (title before description)", () => {
  const index = [
    { id: "a", group: "Funding" as const, title: "Alpha Grant", subtitle: "", href: "/a", keywords: "robotics fund" },
    { id: "b", group: "Funding" as const, title: "Robotics Fund", subtitle: "", href: "/b", keywords: "" },
  ];
  const results = searchIndex(index, "robotics");
  assert.deepEqual(results.map((r) => r.id), ["b", "a"]);
  assert.ok(results[0].score > results[1].score);
});

test("splitMatches marks what the student typed, case-insensitively, and keeps the original text", () => {
  const parts = splitMatches("Student Startup Seed Fund", "seed fund");
  assert.equal(parts.map((p) => p.text).join(""), "Student Startup Seed Fund");
  assert.deepEqual(parts.filter((p) => p.match).map((p) => p.text), ["Seed", "Fund"]);
  assert.deepEqual(splitMatches("Anything", ""), [{ text: "Anything", match: false }]);
});

test("splitMatches treats regular-expression characters as plain text", () => {
  assert.doesNotThrow(() => splitMatches("a (b) [c]", "(b"));
  assert.deepEqual(splitMatches("a (b) [c]", "(b").filter((p) => p.match).map((p) => p.text), ["(b"]);
});
