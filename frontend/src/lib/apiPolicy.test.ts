// Run with: npm run test:unit   (Node's built-in runner; no extra dependencies)
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  STUDENT_READ_ROLES,
  STUDENT_WRITE_ROLES,
  authorize,
  classifyStatus,
  classifyThrown,
  errorBody,
  failureMessage,
  initialsOf,
} from "./apiPolicy.ts";

test("authorize: no session or no user id is 401", () => {
  assert.equal(authorize(null, STUDENT_WRITE_ROLES)?.status, 401);
  assert.equal(authorize({ role: "student" }, STUDENT_WRITE_ROLES)?.status, 401);
});

test("authorize: only students may write applications", () => {
  assert.equal(authorize({ id: "1", role: "student" }, STUDENT_WRITE_ROLES), null);
  for (const role of ["faculty", "mentor", "investor", "admin", "super_admin", "", undefined]) {
    assert.equal(authorize({ id: "1", role }, STUDENT_WRITE_ROLES)?.status, 403, `role ${role}`);
  }
});

test("authorize: admins may read the student workspace, other roles may not", () => {
  for (const role of ["student", "admin", "super_admin"]) {
    assert.equal(authorize({ id: "1", role }, STUDENT_READ_ROLES), null);
  }
  for (const role of ["faculty", "mentor", "investor"]) {
    assert.equal(authorize({ id: "1", role }, STUDENT_READ_ROLES)?.status, 403);
  }
});

test("classifyStatus maps upstream statuses to failure kinds", () => {
  assert.equal(classifyStatus(401), "unauthenticated");
  assert.equal(classifyStatus(403), "forbidden");
  assert.equal(classifyStatus(404), "not-found");
  for (const status of [400, 409, 422, 500, 502, 503]) assert.equal(classifyStatus(status), "unavailable");
});

test("failureMessage prefers the service's own message, then detail, then a default", () => {
  assert.equal(failureMessage("unavailable", { message: "M" }), "M");
  assert.equal(failureMessage("forbidden", { detail: "You do not own this application" }), "You do not own this application");
  assert.equal(failureMessage("unavailable", { detail: { message: "Application is incomplete" } }), "Application is incomplete");
  assert.match(failureMessage("unavailable", null), /unavailable/i);
  assert.match(failureMessage("unauthenticated", {}), /sign in/i);
});

test("errorBody keeps FastAPI detail (field errors) and always adds a message", () => {
  const fieldErrors = [{ loc: ["body", "name"], msg: "too short" }];
  const body = errorBody(422, { detail: fieldErrors });
  assert.deepEqual(body.detail, fieldErrors);
  assert.equal(typeof body.message, "string");
  assert.equal(errorBody(409, { detail: "already submitted" }).message, "already submitted");
  assert.equal(typeof errorBody(500, "not an object").message, "string");
});

test("classifyThrown: network failure is 503, anything else 500", () => {
  assert.equal(classifyThrown(new TypeError("fetch failed")).status, 503);
  assert.equal(classifyThrown(new Error("boom")).status, 500);
  assert.equal(classifyThrown(new DOMException("timed out", "TimeoutError")).status, 503);
});

test("initialsOf", () => {
  assert.equal(initialsOf("Asha Rao"), "AR");
  assert.equal(initialsOf("  priya  "), "P");
  assert.equal(initialsOf(""), "");
  assert.equal(initialsOf(null), "");
});
