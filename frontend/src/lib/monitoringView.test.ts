import assert from "node:assert/strict";
import { test } from "node:test";
import { actionForSignal, describeHealth, MONITORING_UNAVAILABLE, overdueAcross, progressText } from "./monitoringView.ts";
import type { MilestoneSummary } from "../types/student-application.ts";

const summary = (extra: Partial<MilestoneSummary> = {}): MilestoneSummary => ({ total: 0, completed: 0, overdue: 0, inProgress: 0, upcoming: 0, progress: null, ...extra });

test("missing data is never worded as a healthy project", () => {
  for (const unknown of ["No Data", "", "Something else"]) {
    const view = describeHealth(unknown);
    assert.equal(view.tone, "neutral", unknown);
    assert.doesNotMatch(view.label, /on track/i);
  }
  assert.equal(describeHealth("On Track").tone, "success");
  assert.equal(describeHealth("Needs Attention").tone, "attention");
  assert.equal(describeHealth("At Risk").tone, "danger");
});

test("a failed monitoring check is neutral and says nothing about the project", () => {
  assert.equal(MONITORING_UNAVAILABLE.tone, "neutral");
  assert.doesNotMatch(MONITORING_UNAVAILABLE.label, /track|risk|healthy/i);
  assert.match(MONITORING_UNAVAILABLE.description, /says nothing/);
});

test("each finding links to the workflow that can address it", () => {
  assert.equal(actionForSignal({ code: "x", label: "", target: "milestones" }, "app 1").href, "/workspace/student/projects/app%201#milestones");
  assert.equal(actionForSignal({ code: "x", label: "", target: "tasks" }, "a").href, "/workspace/student/projects/a#tasks");
  assert.equal(actionForSignal({ code: "x", label: "", target: "meetings" }, "a").href, "/workspace/student/meetings");
});

test("'no milestones' is different from '0 done'", () => {
  assert.deepEqual(progressText(summary()), { tracked: false, text: "No milestones recorded" });
  assert.deepEqual(progressText(summary({ total: 3, completed: 0, progress: 0 })), { tracked: true, text: "0 of 3 done" });
  assert.equal(progressText(summary({ total: 4, completed: 1, overdue: 2, progress: 30 })).text, "1 of 4 done · 2 overdue");
});

test("the overdue total is null (not 0) when nothing is tracked", () => {
  assert.equal(overdueAcross([]), null);
  assert.equal(overdueAcross([summary(), summary()]), null);
  assert.equal(overdueAcross([summary({ total: 2, progress: 0 })]), 0);
  assert.equal(overdueAcross([summary({ total: 2, overdue: 1, progress: 0 }), summary({ total: 1, overdue: 2, progress: 0 }), summary()]), 3);
});
