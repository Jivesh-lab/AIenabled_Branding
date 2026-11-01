import assert from "node:assert/strict";
import { test } from "node:test";
import {
  endTime,
  groupMeetings,
  istNow,
  joinUrl,
  meetingStatus,
  reminderLabel,
  sortTasks,
  summarize,
  taskState,
  type Now,
} from "./workflowState.ts";
import type { StudentMeeting, StudentTask } from "../types/student-workflow.ts";

const NOW: Now = { date: "2026-11-04", time: "12:00" }; // a Wednesday

const meeting = (extra: Partial<StudentMeeting> = {}): StudentMeeting => ({
  id: "m", title: "Review", projectId: "p", projectTitle: "P", date: "2026-11-06", startTime: "10:00", durationMinutes: 60,
  timeZone: "IST", meetingType: "x", agenda: "", provider: "", location: "https://meet.example/x", invitationStatus: "Sent",
  participants: [], notes: null, attendanceLogged: false, reminder: null, ...extra,
});
const task = (extra: Partial<StudentTask> = {}): StudentTask => ({
  id: "t", title: "T", description: "", projectId: "p", projectTitle: "P", dueDate: "2026-11-10", priority: "Medium", status: "Pending", reminder: null, ...extra,
});

test("istNow converts to institute time across the date boundary", () => {
  assert.deepEqual(istNow(Date.UTC(2026, 10, 3, 20, 0)), { date: "2026-11-04", time: "01:30" }); // 20:00Z = 01:30 IST next day
  assert.deepEqual(istNow(Date.UTC(2026, 10, 4, 6, 30)), { date: "2026-11-04", time: "12:00" });
});

test("endTime adds the duration and never spills past midnight", () => {
  assert.equal(endTime({ startTime: "10:00", durationMinutes: 45 }), "10:45");
  assert.equal(endTime({ startTime: "23:30", durationMinutes: 90 }), "23:59");
  assert.equal(endTime({ startTime: "", durationMinutes: 45 }), null);
});

test("meeting status uses only supported backend signals", () => {
  assert.equal(meetingStatus(meeting({ invitationStatus: "Requested" }), NOW), "REQUESTED");
  assert.equal(meetingStatus(meeting({ invitationStatus: "Cancelled" }), NOW), "CANCELLED");
  assert.equal(meetingStatus(meeting({ invitationStatus: "canceled" }), NOW), "CANCELLED");
  assert.equal(meetingStatus(meeting({ date: "Next Friday" }), NOW), "UNSCHEDULED");
  assert.equal(meetingStatus(meeting({ date: "2026-11-06" }), NOW), "UPCOMING");
  assert.equal(meetingStatus(meeting({ date: "2026-11-04", startTime: "15:00" }), NOW), "TODAY");
});

test("a past meeting is COMPLETED only when the host logged it as held; otherwise it just ENDED", () => {
  assert.equal(meetingStatus(meeting({ date: "2026-11-01" }), NOW), "ENDED");
  assert.equal(meetingStatus(meeting({ date: "2026-11-01", attendanceLogged: true }), NOW), "COMPLETED");
  assert.equal(meetingStatus(meeting({ date: "2026-11-04", startTime: "10:00", durationMinutes: 60 }), NOW), "ENDED"); // ended 11:00 < 12:00
});

test("a requested meeting stays 'awaiting confirmation' even if its preferred date has passed", () => {
  assert.equal(meetingStatus(meeting({ invitationStatus: "Requested", date: "2026-10-01" }), NOW), "REQUESTED");
});

test("joinUrl only on the day, only for http(s) links", () => {
  const today = meeting({ date: "2026-11-04", startTime: "15:00" });
  assert.equal(joinUrl(today, NOW), "https://meet.example/x");
  assert.equal(joinUrl(meeting({ date: "2026-11-06" }), NOW), null);
  assert.equal(joinUrl({ ...today, location: "DBIT Lab 402" }, NOW), null);
  assert.equal(joinUrl({ ...today, location: "javascript:alert(1)" }, NOW), null);
});

test("grouping and the summary agree", () => {
  const all = [
    meeting({ id: "a", date: "2026-11-04", startTime: "15:00" }),
    meeting({ id: "b", date: "2026-11-06" }),
    meeting({ id: "c", date: "2026-11-20" }),
    meeting({ id: "d", invitationStatus: "Requested" }),
    meeting({ id: "e", date: "2026-11-01", attendanceLogged: true }),
    meeting({ id: "f", date: "soon" }),
    meeting({ id: "g", invitationStatus: "Cancelled" }),
  ];
  const groups = groupMeetings(all, NOW);
  assert.deepEqual(groups.today.map((m) => m.id), ["a"]);
  assert.deepEqual(groups.upcoming.map((m) => m.id), ["b", "c"]);
  assert.deepEqual(groups.requested.map((m) => m.id), ["d"]);
  assert.deepEqual(groups.unscheduled.map((m) => m.id), ["f"]);
  assert.deepEqual(groups.past.map((m) => m.id).sort(), ["e", "g"]);
  assert.deepEqual(summarize(all, NOW), { upcoming: 3, thisWeek: 2, completed: 1, requested: 1 });
});

test("task state is derived from the stored status and the due date", () => {
  const today = "2026-11-04";
  assert.equal(taskState(task({ status: "Completed", dueDate: "2020-01-01" }), today), "COMPLETED");
  assert.equal(taskState(task({ dueDate: "2026-11-03" }), today), "OVERDUE");
  assert.equal(taskState(task({ dueDate: "2026-11-04" }), today), "DUE_SOON");
  assert.equal(taskState(task({ dueDate: "2026-11-06" }), today), "DUE_SOON");
  assert.equal(taskState(task({ dueDate: "2026-11-07" }), today), "UPCOMING");
  assert.equal(taskState(task({ dueDate: "15 Nov" }), today), "NO_DATE");
  assert.equal(taskState(task({ status: "Overdue", dueDate: "2026-12-01" }), today), "UPCOMING", "a stored 'Overdue' flag does not override the date");
});

test("overdue tasks sort first and completed tasks last", () => {
  const ordered = sortTasks(
    [task({ id: "done", status: "Completed" }), task({ id: "later", dueDate: "2026-12-01" }), task({ id: "late", dueDate: "2026-10-01" }), task({ id: "soon", dueDate: "2026-11-05" })],
    "2026-11-04",
  ).map((t) => t.id);
  assert.deepEqual(ordered, ["late", "soon", "later", "done"]);
});

test("reminders: nothing is claimed unless an outcome was recorded", () => {
  assert.equal(reminderLabel(null), null);
  assert.equal(reminderLabel({ status: "sent", at: null })?.tone, "ok");
  assert.equal(reminderLabel({ status: "failed", at: null })?.tone, "bad");
  assert.match(reminderLabel({ status: "pending", at: null })!.text, /being sent/);
  assert.doesNotMatch(reminderLabel({ status: "failed", at: null })!.text, /sent to/);
});

import { formatIstDateTime, istDateOf } from "./workflowState.ts";

test("dates shown to students are institute (IST) dates, not UTC slices", () => {
  // 20:50 UTC on 31 Oct is 02:20 IST on 1 Nov: cutting the UTC date would show the wrong day.
  assert.equal(istDateOf("2026-10-31T20:50:00.000Z"), "2026-11-01");
  assert.equal(istDateOf("2026-10-31T10:00:00.000Z"), "2026-10-31");
  assert.equal(istDateOf("2026-10-31T18:29:59Z"), "2026-10-31");
  assert.equal(istDateOf("2026-10-31T18:30:00Z"), "2026-11-01");
  assert.equal(istDateOf("not a date"), "not a date");
});

test("date-times are formatted in IST regardless of the machine's time zone", () => {
  const out = formatIstDateTime("2026-10-31T20:50:00.000Z");
  assert.match(out, /1 Nov 2026/);
  assert.match(out, /2:20/);
  assert.equal(formatIstDateTime("garbage"), "garbage");
});
