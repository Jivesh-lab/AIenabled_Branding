import assert from "node:assert/strict";
import { test } from "node:test";
import {
  ALLOCATION_STATUSES,
  MATCHING_DESCRIPTION,
  MATCHING_LABEL,
  deriveMatchingState,
  summariseMentor,
  type AllocationView,
  type MentorResult,
} from "./mentorState.ts";

const alloc = (status: string, extra: Partial<AllocationView> = {}): AllocationView => ({
  status,
  requestedExpertise: [],
  recommendation: null,
  mentor: null,
  updatedAt: null,
  ...extra,
});

test("application status gates matching before any allocation is considered", () => {
  for (const status of ["DRAFT", "SUBMITTED", "UNDER_REVIEW", "REVISION_REQUESTED"]) {
    assert.equal(deriveMatchingState(status, alloc("approved", { mentor: { name: "X", contact: null } })), "not-started", status);
  }
  assert.equal(deriveMatchingState("REJECTED", null), "not-applicable");
  assert.equal(deriveMatchingState("approved", null), "not-requested", "case-insensitive");
});

test("each persisted allocation status maps to exactly one student-visible state", () => {
  assert.equal(deriveMatchingState("APPROVED", alloc("requested")), "pending");
  assert.equal(deriveMatchingState("APPROVED", alloc("under_review")), "in-progress");
  assert.equal(deriveMatchingState("APPROVED", alloc("recommended")), "recommended");
  assert.equal(deriveMatchingState("APPROVED", alloc("rejected")), "unsuccessful");
  for (const s of ["approved", "allocated"]) {
    assert.equal(deriveMatchingState("APPROVED", alloc(s, { mentor: { name: "Dr. A", contact: null } })), "matched");
    assert.equal(deriveMatchingState("APPROVED", alloc(s, { mentor: { name: null, contact: null } })), "matched-name-pending");
    assert.equal(deriveMatchingState("APPROVED", alloc(s)), "matched-name-pending");
  }
});

test("a status the app does not know is reported as unknown, never guessed", () => {
  assert.equal(deriveMatchingState("APPROVED", alloc("something_new")), "unknown");
});

test("every supported allocation status is handled, and every state has a label and description", () => {
  for (const s of ALLOCATION_STATUSES) assert.notEqual(deriveMatchingState("APPROVED", alloc(s)), "unknown", s);
  for (const state of Object.keys(MATCHING_LABEL) as (keyof typeof MATCHING_LABEL)[]) {
    assert.ok(MATCHING_LABEL[state] && MATCHING_DESCRIPTION[state], state);
  }
});

test("a recommendation is never presented as a confirmed assignment", () => {
  const result: MentorResult = {
    ok: true,
    data: {
      applicationId: "a", state: "recommended", requestedExpertise: [], mentor: null, profileUnavailable: false, updatedAt: null,
      recommendation: { name: "Prof. Rajiv Menon", organization: null },
    },
  };
  const summary = summariseMentor(result);
  assert.equal(summary.confirmed, false);
  assert.match(summary.text, /not confirmed/);
});

test("only a matched state with a recorded mentor is confirmed", () => {
  const ok = (state: "matched" | "pending"): MentorResult => ({
    ok: true,
    data: {
      applicationId: "a", state, requestedExpertise: [], recommendation: null, profileUnavailable: false, updatedAt: null,
      mentor: state === "matched" ? { name: "Dr. K. R. Raman", contact: null, directory: null } : null,
    },
  });
  assert.deepEqual([summariseMentor(ok("matched")).confirmed, summariseMentor(ok("matched")).text], [true, "Dr. K. R. Raman"]);
  assert.equal(summariseMentor(ok("pending")).confirmed, false);
});

test("failures and missing data are reported as unavailable, not as 'no mentor'", () => {
  assert.equal(summariseMentor(undefined).text, "Mentor status unavailable");
  const failed = summariseMentor({ ok: false, kind: "unavailable", message: "down" });
  assert.equal(failed.text, "Mentor status unavailable");
  assert.equal(failed.tone, "danger");
});

import { interpretAllocationResponse } from "./mentorState.ts";

test("interpretAllocationResponse: 200 with data is ok, and a null allocation means 'no request yet'", () => {
  const ok = interpretAllocationResponse(200, { success: true, data: { allocation: null } });
  assert.deepEqual(ok, { ok: true, allocation: null });
  const withAlloc = interpretAllocationResponse(200, { success: true, data: { allocation: alloc("requested") } });
  assert.equal(withAlloc.ok && withAlloc.allocation?.status, "requested");
});

test("interpretAllocationResponse: every failure is explicit and distinct from an empty result", () => {
  assert.equal(interpretAllocationResponse(401, {}).ok, false);
  assert.equal((interpretAllocationResponse(403, {}) as { kind: string }).kind, "forbidden");
  assert.equal((interpretAllocationResponse(404, {}) as { kind: string }).kind, "not-found");
  for (const status of [500, 502, 503]) assert.equal((interpretAllocationResponse(status, {}) as { kind: string }).kind, "unavailable");
  // A 200 whose body is not the expected shape must not be read as "no allocation".
  assert.equal(interpretAllocationResponse(200, { unexpected: true }).ok, false);
  assert.equal(interpretAllocationResponse(200, null).ok, false);
});
