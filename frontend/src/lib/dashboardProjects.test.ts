import assert from "node:assert/strict";
import { test } from "node:test";
import { attentionRank, dashboardPreview, rankProjects } from "./dashboardProjects.ts";
import type { MilestoneSummary, StudentProject } from "../types/student-application.ts";

const none: MilestoneSummary = { total: 0, completed: 0, overdue: 0, inProgress: 0, upcoming: 0, progress: null };
const p = (id: string, status: StudentProject["reviewStatus"], extra: Partial<StudentProject> = {}, ms: Partial<MilestoneSummary> = {}): StudentProject => ({
  id, name: id, shortDescription: "", domain: "", reviewStatus: status, pipelinePosition: null, maturity: "IDEA", progress: 0, facultyGuide: null,
  teamSize: 1, updatedAt: "2026-11-01", next: null, milestones: { ...none, ...ms }, ...extra,
});

test("projects that need the student come first", () => {
  const ranked = rankProjects([
    p("rej", "REJECTED"), p("ok", "APPROVED"), p("sub", "SUBMITTED"), p("late", "APPROVED", {}, { total: 2, overdue: 1, progress: 0 }),
    p("draft", "DRAFT"), p("rev", "REVISION_REQUESTED"),
  ]).map((x) => x.id);
  assert.deepEqual(ranked, ["rev", "draft", "late", "sub", "ok", "rej"]);
});

test("ties go to the most recently updated, then by name", () => {
  const ranked = rankProjects([p("b", "SUBMITTED", { updatedAt: "2026-10-01" }), p("a", "SUBMITTED", { updatedAt: "2026-10-01" }), p("new", "SUBMITTED", { updatedAt: "2026-11-01" })]).map((x) => x.id);
  assert.deepEqual(ranked, ["new", "a", "b"]);
});

test("the preview is capped, reports how many are not shown, and never mutates or drops the data", () => {
  const all = Array.from({ length: 12 }, (_, i) => p(`p${i}`, "SUBMITTED", { updatedAt: `2026-10-${String(10 + i).padStart(2, "0")}` }));
  const copy = [...all];
  const view = dashboardPreview(all);
  assert.equal(view.shown.length, 3);
  assert.equal(view.total, 12);
  assert.equal(view.hidden, 9);
  assert.deepEqual(all, copy, "input is untouched");
  assert.equal(dashboardPreview([p("only", "DRAFT")]).hidden, 0);
  assert.deepEqual(dashboardPreview([]), { shown: [], total: 0, hidden: 0 });
});

test("an approved project with overdue work outranks a quiet one", () => {
  assert.ok(attentionRank(p("a", "APPROVED", {}, { total: 1, overdue: 1, progress: 0 })) < attentionRank(p("b", "APPROVED")));
});
