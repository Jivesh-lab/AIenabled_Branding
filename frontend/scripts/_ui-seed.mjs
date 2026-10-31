// Temporary: seeds one demo student into the running test stack and prints a session cookie value. Deleted after use.
import { randomBytes } from "node:crypto";
import { encode } from "next-auth/jwt";

const BASE = "http://localhost:3100";
const STUB = "http://127.0.0.1:5055";
const SECRET = "smoke-test-secret";
const id = randomBytes(12).toString("hex");
const istDate = (o = 0) => new Date(Date.now() + 5.5 * 3600000 + o * 86400000).toISOString().slice(0, 10);
const cookie = async (uid, role) => `next-auth.session-token=${await encode({ token: { id: uid, role, name: "Asha Rao", email: "asha@example.edu" }, secret: SECRET })}`;
const call = async (c, method, path, body) => {
  const r = await fetch(`${BASE}${path}`, { method, headers: { cookie: c, ...(body ? { "Content-Type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined });
  return { status: r.status, json: await r.json().catch(() => null) };
};
const idea = (name, extra = {}) => ({
  name, shortDescription: "Soil-moisture driven irrigation for small farms.", department: "Electronics", domain: "AgriTech", projectType: "Hardware", maturity: "PROTOTYPE",
  problem: "Smallholder farmers over-water crops because they cannot measure soil moisture.", affectedUsers: "Smallholder farmers in semi-arid regions.",
  currentSolutions: "Manual scheduling.", solution: "A low-cost sensor node that opens valves only when the soil is dry.", differentiation: "Costs a tenth of commercial controllers.",
  teamMembers: [{ id: "lead", name: "Asha Rao", rollNumber: "", email: "asha@example.edu", inviteStatus: "LEAD" }],
  technologies: ["ESP32"], githubUrl: "", demoUrl: "", prototypeAvailable: "YES", attachments: [], declarationAccepted: true, ...extra,
});
const student = await cookie(id, "student");
const admin = await cookie(randomBytes(12).toString("hex"), "admin");

const submit = async (name) => {
  const d = await call(student, "POST", "/api/applications/draft", { values: { ...idea(name), declarationAccepted: undefined }, step: 0, furthestStep: 0 });
  await call(student, "POST", "/api/applications/submit", idea(name, { applicationId: d.json.application_id }));
  return d.json.application_id;
};
const p1 = await submit("Smart Irrigation Controller");
const p2 = await submit("Campus Waste Tracker");
await call(admin, "POST", `/api/admin/applications/${p1}/decide`, { decision: "approved" });
await call(admin, "POST", `/api/admin/applications/${p2}/decide`, { decision: "revision_requested", comments: "Please add a cost breakdown and a pilot plan." });
await call(student, "POST", `/api/applications/${p1}/milestones`, { title: "Build prototype", dueDate: istDate(-3) });
await call(student, "POST", `/api/applications/${p1}/milestones`, { title: "Field pilot", dueDate: istDate(20) });

await fetch(`${STUB}/__db`, {
  method: "POST", headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    profiles: [{ applicationId: p1, founderId: id }], users: { [id]: { name: "Asha Rao", email: "asha@example.edu" } },
    allocations: [{ projectId: p1, status: "approved", allocatedMentorName: "Dr. K. R. Raman", requestedExpertise: [], updatedAt: new Date().toISOString() }],
    tasks: [{ id: "t-1", title: "Upload field-test report", projectId: p1, projectTitle: "Smart Irrigation Controller", assignedRole: "student", dueDate: istDate(-2), priority: "High", status: "Pending", description: "PDF with soil readings" }],
    meetings: [{ id: "m-1", title: "Prototype review", projectId: p1, projectTitle: "Smart Irrigation Controller", participants: ["Asha Rao"], date: istDate(3), startTime: "10:00", durationMinutes: 45, timeZone: "IST", meetingType: "Milestone Review", agenda: "Walk through test results", meetingProvider: "Online", meetingLinkOrLocation: "https://meet.example/abc", invitationStatus: "Sent", notes: "", attendanceLogged: false }],
  }),
});
console.log(JSON.stringify({ cookieValue: student.split("=")[1], p1, p2 }));
