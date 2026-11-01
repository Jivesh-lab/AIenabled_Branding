import assert from "node:assert/strict";
import { test } from "node:test";
import { incubationOverview } from "./incubationOverview.ts";
import { buildJourney } from "./journey.ts";
import type { MilestoneSummary, StudentProject } from "../types/student-application.ts";

const NOW = { date: "2026-11-04", time: "12:00" };
const none: MilestoneSummary = { total: 0, completed: 0, overdue: 0, inProgress: 0, upcoming: 0, progress: null };
const proj = (id: string, status: StudentProject["reviewStatus"]): StudentProject => ({
  id, name: id, shortDescription: "", domain: "", reviewStatus: status, pipelinePosition: null, maturity: "IDEA", progress: 0, facultyGuide: null,
  teamSize: 1, updatedAt: null, next: null, milestones: none,
});
const journey = (p: StudentProject, matched: boolean) =>
  buildJourney({
    project: p, now: NOW, tasks: [], meetings: [], monitoring: null,
    mentor: { ok: true, data: matched ? { state: "matched", mentor: { name: "Dr X" } } : { state: "not_started", mentor: null } } as never,
  });
const counts = (projects: StudentProject[], journeys: ReturnType<typeof journey>[]) =>
  Object.fromEntries(incubationOverview(projects, journeys).map((s) => [s.id, s.count]));

test("every project lands in exactly one stage and the counts add up", () => {
  const projects = [proj("d", "DRAFT"), proj("s", "SUBMITTED"), proj("u", "UNDER_REVIEW"), proj("r", "REVISION_REQUESTED"), proj("a", "APPROVED"), proj("m", "APPROVED"), proj("x", "REJECTED")];
  const out = counts(projects, [journey(projects[4], false), journey(projects[5], true)]);
  assert.deepEqual(out, { draft: 1, "in-review": 2, revision: 1, approved: 1, "in-incubation": 1, "not-approved": 1 });
  assert.equal(Object.values(out).reduce((a, b) => a + b, 0), projects.length);
});

test("an approved project whose mentor status is unknown counts as Approved, never as In incubation", () => {
  const out = counts([proj("a", "APPROVED")], []);
  assert.equal(out["approved"], 1);
  assert.equal(out["in-incubation"], 0);
});

test("no projects gives all-zero counts", () => {
  assert.ok(incubationOverview([], []).every((s) => s.count === 0));
});
