const User = require('../models/User');
const FacultyProject = require('../models/FacultyProject');
const FacultyTask = require('../models/FacultyTask');
const FacultyMeeting = require('../models/FacultyMeeting');
const ActionLog = require('../models/ActionLog');
const AgentJob = require('../models/AgentJob');
const jobs = require('./jobs');
const approvals = require('./approvals');
const access = require('./access');
const views = require('./views');
const { localParts, zonedToUtc, localDateString, formatLocal } = require('./time');
const { cleanName } = require('./projects');
const { integrationStatus } = require('./config');
const { note } = require('./actionLog');
const workflowAgent = require('./agents/workflowAgent');

/**
 * The Incubation Assistant as a control surface.
 *
 *  - NARRATE: answers come only from persisted records (Action Log, jobs, tasks, meetings, approvals)
 *    that the signed-in person is allowed to see.
 *  - COMMAND: requests go through the same agents, tools and approval gate as everything else.
 *    The reply states what the Action Log / job result confirms - never what was merely requested.
 *
 * Intent detection is deterministic on purpose: permissions and approvals never depend on a language model.
 */
const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

function reply(text, extra = {}) {
  return { handled: true, reply: text, ...extra };
}

/** "next Thursday", "tomorrow", "on 2026-11-12", "in 3 days" -> a local date string, or null. */
function parseDate(text, now = new Date()) {
  const lower = text.toLowerCase();
  const iso = lower.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
  if (iso) return iso[1];
  const today = localParts(now);
  const addDays = (n) => localDateString(new Date(now.getTime() + n * 86400000));
  if (/\btomorrow\b/.test(lower)) return addDays(1);
  const inDays = lower.match(/\bin (\d{1,2}) days?\b/);
  if (inDays) return addDays(Number(inDays[1]));
  // "Thursday" and "next Thursday" both mean the first such day strictly after today.
  for (let i = 0; i < 7; i += 1) {
    if (new RegExp(`\\b${WEEKDAYS[i]}\\b`).test(lower)) {
      const delta = ((i - today.dow + 7) % 7) || 7;
      return addDays(delta);
    }
  }
  return null;
}

function parseTime(text) {
  const m = text.toLowerCase().match(/\b(?:at )?(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/);
  if (!m) return null;
  let hour = Number(m[1]) % 12;
  if (m[3] === 'pm') hour += 12;
  return `${String(hour).padStart(2, '0')}:${m[2] || '00'}`;
}

async function resolveProject(user, text) {
  const ids = await access.projectIdsFor(user);
  const filter = ids === null ? {} : { id: { $in: ids } };
  const projects = await FacultyProject.find(filter).lean();
  const named = projects.filter((p) => text.toLowerCase().includes(String(p.title).toLowerCase()));
  if (named.length === 1) return { project: named[0] };
  if (projects.length === 1) return { project: projects[0] };
  if (!projects.length) return { error: user.role === 'student' ? 'I could not find a startup linked to your account yet. Once your application is approved it will appear here.' : 'You have no startups assigned to you.' };
  return { error: `Which startup do you mean? ${projects.slice(0, 6).map((p) => p.title).join(', ')}.` };
}

async function findPerson(text, roles) {
  const cleaned = text.toLowerCase().replace(/\b(dr|prof|mr|ms|mrs)\.?\s/g, ' ');
  const people = await User.find({ role: { $in: roles }, status: 'active', isSoftDeleted: { $ne: true } }).select('_id name email role').lean();
  const hits = people.filter((p) => {
    const tokens = cleanName(p.name).toLowerCase().replace(/\b(dr|prof|mr|ms|mrs)\.?\s/g, ' ').split(/\s+/).filter((t) => t.length > 2);
    return tokens.some((t) => new RegExp(`\\b${t}\\b`).test(cleaned));
  });
  return hits;
}

// ---------------------------------------------------------------------------
// Narration
// ---------------------------------------------------------------------------
async function narrateActivity(user, days = 7) {
  const rows = await access.feedFor(user, { limit: 40 });
  const since = Date.now() - days * 86400000;
  const recent = rows.filter((r) => new Date(r.createdAt).getTime() >= since);
  if (!recent.length) {
    return reply(`The agents have not recorded anything for you in the last ${days} days. When something happens - an application check, a mentor request, a meeting or a check-in - it will show up here with what was done and what happens next.`);
  }
  const lines = recent.slice(0, 8).map((r) => `- ${r.summary}${r.followUp ? ` Next: ${r.followUp}` : ''}${r.status === 'simulated' ? ' (sandbox - not delivered)' : ''}`);
  return reply(`Here is what the agents did in the last ${days} days (${recent.length} action${recent.length === 1 ? '' : 's'}):\n${lines.join('\n')}`, { actions: [{ label: 'Open my dashboard', href: '/workspace' }] });
}

async function narrateMissing(user) {
  const open = (await access.jobsFor(user)).filter((j) => j.type === 'application.review');
  if (!open.length) return reply('Nothing is outstanding on your application right now. If the Application Agent needs more from you, it will say exactly what is missing and I will list it here.');
  const waiting = open.filter((j) => j.step === 'waiting_info' && (j.data?.missing || []).length);
  if (!waiting.length) {
    const d = views.describeJob(open[0]);
    return reply(`Nothing is missing from you. ${d.headline}.`);
  }
  const items = waiting.flatMap((j) => j.data.missing).map((m) => `- ${m}`);
  return reply(`The Application Agent is waiting for:\n${items.join('\n')}\n\nAdd these and resubmit; the review restarts automatically.`, { actions: [{ label: 'Open my application', href: '/workspace/student/submit' }] });
}

async function narrateApprovals(user) {
  if (!['admin', 'faculty', 'super_admin'].includes(user.role)) return reply('Your role has no approvals queue. Decisions on admissions, mentor allocations and investor introductions are made by administrators and coordinators.');
  const pending = await approvals.listPending(user);
  if (!pending.length) return reply('Nothing is waiting for your approval right now.');
  return reply(`${pending.length} item${pending.length === 1 ? ' is' : 's are'} waiting for you:\n${pending.slice(0, 8).map((a) => `- ${a.title}`).join('\n')}\n\nOpen them from your home screen to approve or reject with the evidence in front of you.`, { actions: [{ label: 'Open my home screen', href: '/workspace' }] });
}

async function narrateTasks(user) {
  const tasks = await FacultyTask.find({ assignedUserId: String(user.id), status: { $ne: 'Completed' } }).sort({ dueDate: 1 }).limit(8).lean();
  if (!tasks.length) return reply('You have no open tasks.');
  return reply(`You have ${tasks.length} open task${tasks.length === 1 ? '' : 's'}:\n${tasks.map((t) => `- ${t.title} (due ${t.dueDate})`).join('\n')}`);
}

async function narrateMeetings(user) {
  const meetings = await FacultyMeeting.find({ attendeeUserIds: String(user.id), outcome: 'pending', startUtc: { $gte: new Date() } }).sort({ startUtc: 1 }).limit(6).lean();
  if (!meetings.length) return reply('You have no upcoming meetings booked by the agents.');
  return reply(`Upcoming meetings:\n${meetings.map((m) => `- ${m.title}: ${formatLocal(new Date(m.startUtc))}${m.calendarMode === 'sandbox' ? ' (invitation recorded in the sandbox, not emailed)' : ''}`).join('\n')}`);
}

async function narrateStatus(user) {
  const open = (await access.jobsFor(user)).map(views.describeJob);
  if (!open.length) return reply('No agent is working on anything for you at the moment.');
  return reply(`What the agents are doing:\n${open.slice(0, 6).map((j) => `- ${j.agent}: ${j.headline}`).join('\n')}`);
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------
async function commandSchedule(user, text) {
  if (!['student', 'faculty', 'mentor', 'admin', 'super_admin'].includes(user.role)) return reply('Your role cannot schedule meetings here.');
  const { project, error } = await resolveProject(user, text);
  if (error) return reply(error);
  const date = parseDate(text);
  const time = parseTime(text);
  const named = await findPerson(text, ['mentor', 'faculty']);
  if (named.length > 1) return reply(`I found more than one person that could match: ${named.map((p) => cleanName(p.name)).join(', ')}. Which one do you mean?`);
  const attendees = new Set([project.ownerUserId, named[0] ? String(named[0]._id) : project.mentorUserId].filter(Boolean).map(String));
  attendees.add(String(user.id));
  if (attendees.size < 2) return reply(`${project.title} has no confirmed mentor yet, so there is no one to schedule with. Tell me who to include (for example "with Dr. Rao").`);
  const notBefore = date ? zonedToUtc(date, time || '10:00') : null;

  const job = await workflowAgent.requestReviewMeeting({
    projectId: project.id, requestedBy: String(user.id), attendeeUserIds: [...attendees], title: `Review: ${project.title}`, notBefore,
  });
  const done = await jobs.runJobNow(job._id, { trigger: { type: 'assistant', ref: String(user.id) } });
  const meetingId = done?.data?.meetingId;
  if (meetingId) {
    const meeting = await FacultyMeeting.findOne({ id: meetingId }).lean();
    const logged = await ActionLog.findOne({ jobId: String(job._id), action: 'meeting.schedule' }).sort({ createdAt: -1 }).lean();
    const delivered = logged?.status === 'success' ? 'Invitations were sent.' : logged?.status === 'simulated' ? 'Invitations were recorded in the sandbox outbox and NOT delivered (email/calendar is not configured).' : '';
    return reply(`Done. The Workflow Agent booked "${meeting.title}" for ${formatLocal(new Date(meeting.startUtc))}. ${delivered}`.trim(), { performed: [{ agent: 'Workflow Agent', action: 'meeting.schedule', status: logged?.status || 'success', summary: logged?.summary || '' }], actions: [{ label: 'View meetings', href: '/workspace/student/meetings' }] });
  }
  if (done && ['retrying', 'pending'].includes(done.state)) {
    return reply(`I asked the Workflow Agent, but it could not find a common free time yet${date ? ` after ${date}` : ''}. It will search again tomorrow and tell you when it is booked. Nothing is booked yet.`);
  }
  if (done && done.state === 'escalated') return reply('The Workflow Agent could not book this and has asked the coordinator to step in. Nothing is booked.');
  if (done && done.state === 'failed') return reply(`That did not work: ${done.lastError || 'the meeting could not be scheduled'}. Nothing was booked.`);
  return reply('I passed this to the Workflow Agent, but I cannot confirm a booking yet, so please do not assume one exists. Check your meetings in a minute.');
}

async function refuseDecision(user, text) {
  await note({ agent: 'Incubation Assistant', action: 'admission.decide', tier: 3, status: 'blocked', trigger: { type: 'assistant', ref: String(user.id) }, summary: `The assistant did not carry out "${text.slice(0, 80)}" for ${user.name || user.role}: it needs a person to approve it from the approvals list.`, audience: { userIds: [String(user.id)], roles: [] } }).catch(() => null);
  return reply('I cannot make that decision for you. Admissions, mentor allocations and investor introductions need a person to approve them with the evidence in front of them. I did not do anything. Open your approvals to review and decide.', { actions: [{ label: 'Open approvals', href: '/workspace' }] });
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------
async function handle({ user, message }) {
  const text = String(message).trim();
  const lower = text.toLowerCase();

  // Decisions that need a human are never executed from chat.
  if (/\b(approve|reject|accept|admit|confirm)\b.*\b(application|startup|mentor|allocation|introduction|intro)\b/.test(lower) && !/\b(show|what|which|list|waiting|pending)\b/.test(lower)) return refuseDecision(user, text);

  if (/\b(schedule|book|set up|arrange)\b.*\b(meeting|review|call|session|catch ?up)\b/.test(lower)) return commandSchedule(user, text);
  if (/\b(what|which)\b.*\b(missing|outstanding|need from me)\b|\bmissing (information|info|details)\b/.test(lower)) return narrateMissing(user);
  if (/\b(awaiting|waiting for|pending|need).*\b(approval|decision|my approval)\b|\bshow.*\b(approvals|applications awaiting)\b|\bapprovals?\b/.test(lower)) return narrateApprovals(user);
  if (/\bwhat did (the )?agents?\b|\bagents? (do|did|done)\b|\brecent activity\b|\bwhat happened\b|\bthis week\b/.test(lower)) return narrateActivity(user, /today/.test(lower) ? 1 : 7);
  if (/\b(my )?tasks?\b|\bto ?do\b|\bwhat should i do\b/.test(lower)) return narrateTasks(user);
  if (/\b(my )?meetings?\b|\bupcoming\b/.test(lower)) return narrateMeetings(user);
  if (/\bstatus\b|\bwhat are the agents doing\b|\bhow is my (application|startup)\b/.test(lower)) return narrateStatus(user);

  const status = integrationStatus();
  return { handled: false, reply: null, hint: status.llm.configured ? 'general' : 'llm_not_configured' };
}

module.exports = { handle, parseDate, parseTime };
