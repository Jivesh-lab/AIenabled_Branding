const User = require('../../models/User');
const FacultyProject = require('../../models/FacultyProject');
const FacultyMeeting = require('../../models/FacultyMeeting');
const AgentJob = require('../../models/AgentJob');
const jobs = require('../jobs');
const { runAction, note } = require('../actionLog');
const { getConfig } = require('../config');
const { emit } = require('../events');
const { cleanName } = require('../projects');
const { notify } = require('../tools/notify');
const { findSlotsLogged } = require('../tools/slots');
const { scheduleMeeting, rescheduleMeeting } = require('../tools/calendar');
const { createTask, isoDate } = require('../tools/tasks');
const { generateDocument } = require('../tools/documents');
const { formatLocal, localDateString } = require('../time');
const { makeCtx, AGENTS } = require('./context');

const AGENT = AGENTS.workflow;
const ONBOARDING = 'workflow.onboarding';
const REVIEW = 'workflow.review';
const DAY = 24 * 60 * 60 * 1000;

async function participantsFor(userIds) {
  const users = await User.find({ _id: { $in: [...new Set(userIds.filter(Boolean).map(String))] }, status: 'active', isSoftDeleted: { $ne: true } }).select('_id name email role').lean();
  return users.map((u) => ({ userId: String(u._id), name: cleanName(u.name), email: u.email, role: u.role }));
}

// ---------------------------------------------------------------------------
// Event entry points
// ---------------------------------------------------------------------------

async function onAllocationConfirmed(event) {
  const projectId = event.projectId || event.aggregateId;
  const { job } = await jobs.enqueue({
    type: ONBOARDING, agent: AGENT, dedupeKey: `${ONBOARDING}:${projectId}`, correlationId: event.correlationId, triggerEvent: event.eventType,
    applicationId: event.applicationId, projectId, subjectType: 'project', subjectId: projectId,
    data: { kind: 'onboarding', mentorUserId: event.payload?.mentorUserId, slotAttempts: 0 },
  });
  return job;
}

/** Anyone (the assistant, a coordinator) can ask for a review meeting; it runs through the same job. */
async function requestReviewMeeting({ projectId, requestedBy, attendeeUserIds, title, notBefore }) {
  const { job } = await jobs.enqueue({
    type: REVIEW, agent: AGENT, dedupeKey: `${REVIEW}:${projectId}:${Date.now()}`, projectId, subjectType: 'project', subjectId: projectId,
    triggerEvent: 'user.command', data: { kind: 'review', title: title || 'Review meeting', attendeeUserIds, requestedBy, notBefore: notBefore ? new Date(notBefore).toISOString() : null, slotAttempts: 0 },
  });
  return job;
}

/** A participant (or the coordinator) records what happened. Wakes the job so notes and tasks follow at once. */
async function recordOutcome({ meetingId, user, held, notes = '', actionItems = [] }) {
  const meeting = await FacultyMeeting.findOne({ id: meetingId }).lean();
  if (!meeting) throw Object.assign(new Error('This meeting was not found.'), { status: 404 });
  const allowed = user.role === 'super_admin' || user.role === 'admin' || user.role === 'faculty' || (meeting.attendeeUserIds || []).includes(String(user.id));
  if (!allowed) throw Object.assign(new Error('Only people in the meeting or the coordinators can record its outcome.'), { status: 403 });
  if (meeting.outcome === 'held') throw Object.assign(new Error('This meeting has already been recorded.'), { status: 409 });
  await FacultyMeeting.updateOne({ id: meetingId }, { $set: { outcome: held ? 'held' : 'no_show', outcomeAt: new Date(), attendanceLogged: true, notes: String(notes).slice(0, 4000) } });
  const job = await AgentJob.findOne({ 'data.meetingId': meetingId, state: { $nin: ['done', 'failed'] } }).lean();
  if (job) await jobs.signal(job._id, 'meeting_outcome', { held: Boolean(held), actionItems: (actionItems || []).map((a) => String(a).slice(0, 200)).slice(0, 10), by: String(user.id) });
  return { meetingId, outcome: held ? 'held' : 'no_show' };
}

/** A participant accepts or declines the proposed time. A decline moves the meeting (tier 2: act, then notify). */
async function respondToMeeting({ meetingId, user, accept }) {
  const meeting = await FacultyMeeting.findOne({ id: meetingId }).lean();
  if (!meeting) throw Object.assign(new Error('This meeting was not found.'), { status: 404 });
  if (!(meeting.attendeeUserIds || []).includes(String(user.id))) throw Object.assign(new Error('You are not invited to this meeting.'), { status: 403 });
  await FacultyMeeting.updateOne({ id: meetingId }, { $set: { [`responses.${user.id}`]: accept ? 'accepted' : 'declined' } });
  if (!accept) {
    const job = await AgentJob.findOne({ 'data.meetingId': meetingId, state: { $nin: ['done', 'failed'] } }).lean();
    if (job) await jobs.signal(job._id, 'declined', { by: String(user.id) });
  }
  return { meetingId, response: accept ? 'accepted' : 'declined' };
}

// ---------------------------------------------------------------------------
// The job (onboarding and review share the same life cycle)
// ---------------------------------------------------------------------------

async function pickAndBook(ctx, job, project, people, { now, config, notBefore, title, kind, attempt }) {
  const cfg = config.workflow;
  const found = await findSlotsLogged(ctx, {
    key: `${job._id}:${attempt}`, userIds: people.map((p) => p.userId), durationMinutes: cfg.durationMinutes,
    from: notBefore && new Date(notBefore) > now ? new Date(notBefore) : now, count: 3,
  });
  if (!found.slots.length) return null;
  const slot = found.slots[0];
  const booked = await scheduleMeeting(ctx, {
    key: `${job._id}:${attempt}`, projectId: project.id, projectTitle: project.title, title, kind,
    agenda: kind === 'onboarding'
      ? `Kick-off between ${project.title} and their mentor: agree the first milestone plan and how you will work together.`
      : 'Review progress, blockers and next steps.',
    startUtc: slot.startUtc, endUtc: slot.endUtc, attendees: people,
  });
  return { slot, booked, googleConsulted: found.googleConsulted };
}

async function handleMeetingJob(job, { now, config }) {
  const ctx = makeCtx(AGENT, { job });
  const data = job.data || {};
  const signals = (data.signals || []);
  const cfg = config.workflow;
  const project = await FacultyProject.findOne({ id: job.projectId }).lean();
  if (!project) return { state: 'failed', note: 'The startup record no longer exists.' };
  const kind = data.kind || 'onboarding';

  // ---- Waiting for the meeting to happen -----------------------------------------------------------
  if (data.meetingId) {
    const meeting = await FacultyMeeting.findOne({ id: data.meetingId }).lean();
    if (!meeting) return { state: 'failed', note: 'The booked meeting was removed.' };
    const outcomeSignal = signals.find((s) => s.name === 'meeting_outcome');
    const declined = signals.find((s) => s.name === 'declined');
    const end = new Date(meeting.endUtc).getTime();

    if (meeting.outcome === 'held' || (outcomeSignal && outcomeSignal.payload?.held)) {
      const attendees = await participantsFor(meeting.attendeeUserIds || []);
      const items = outcomeSignal?.payload?.actionItems || data.actionItems || [];
      await emit('meeting.held', { aggregateId: meeting.id, projectId: project.id, payload: { meetingId: meeting.id }, dedupe: 'held', correlationId: ctx.correlationId });
      await generateDocument(ctx, {
        key: `meeting-notes:${meeting.id}`, kind: 'meeting_notes', title: `Meeting notes - ${meeting.title}`, projectId: project.id,
        audience: { userIds: meeting.attendeeUserIds || [], roles: ['faculty'] },
        data: { title: meeting.title, startUtc: meeting.startUtc, attendees: attendees.map((a) => a.name), notes: meeting.notes, actionItems: items },
      });
      const founder = attendees.find((a) => a.userId === String(project.ownerUserId));
      let index = 0;
      for (const item of items) {
        index += 1;
        await createTask(ctx, {
          key: `meeting-action:${meeting.id}:${index}`, projectId: project.id, projectTitle: project.title, title: item, description: `Action item from "${meeting.title}".`,
          assignedUserId: founder?.userId || project.ownerUserId, assignedTo: founder?.name || project.leadStudent, assignedRole: 'student', dueDate: isoDate(7), priority: 'Medium', kind: 'action_item', link: '/workspace/student/dashboard',
        });
      }
      await note({ ...ctx, action: 'meeting.follow_up', projectId: project.id, status: 'success', summary: `${AGENT} recorded that "${meeting.title}" took place, saved the notes${items.length ? ` and created ${items.length} action-item task(s)` : ''}.`, audience: { userIds: meeting.attendeeUserIds || [], roles: ['faculty'] } });
      return { state: 'done', step: 'meeting_held', note: 'Meeting held; notes and tasks created.' };
    }

    if (declined && (meeting.rescheduleCount || 0) < cfg.maxReschedules) {
      return reschedule(ctx, job, project, meeting, now, config, 'a participant declined the proposed time');
    }

    if (!outcomeSignal && now.getTime() >= end + cfg.noShowGraceMs && meeting.outcome === 'pending') {
      await FacultyMeeting.updateOne({ id: meeting.id }, { $set: { outcome: 'no_show', outcomeAt: now } });
      await emit('meeting.no_show', { aggregateId: meeting.id, projectId: project.id, payload: { meetingId: meeting.id }, dedupe: `s${meeting.rescheduleCount || 0}`, correlationId: ctx.correlationId });
      if ((meeting.rescheduleCount || 0) < cfg.maxReschedules) return reschedule(ctx, job, project, meeting, now, config, 'nobody recorded that the meeting took place');
      return escalateMeeting(ctx, project, meeting, `The meeting was missed ${cfg.maxReschedules + 1} time(s) and could not be held.`);
    }
    if (outcomeSignal && !outcomeSignal.payload?.held) {
      await FacultyMeeting.updateOne({ id: meeting.id }, { $set: { outcome: 'no_show', outcomeAt: now } });
      if ((meeting.rescheduleCount || 0) < cfg.maxReschedules) return reschedule(ctx, job, project, meeting, now, config, 'it was recorded as missed');
      return escalateMeeting(ctx, project, meeting, 'The meeting was recorded as missed and the reschedule limit was reached.');
    }

    // Pre-meeting reminder 24h before (once), then keep waiting for the outcome.
    const start = new Date(meeting.startUtc).getTime();
    const reminderAt = start - cfg.preMeetingUpdateDueBeforeMs;
    if (!data.reminded && now.getTime() >= reminderAt && now.getTime() < start) {
      await notify(ctx, { key: `meeting-reminder:${meeting.id}:${meeting.rescheduleCount || 0}`, userIds: meeting.attendeeUserIds || [], title: `Tomorrow: ${meeting.title}`, message: `${formatLocal(new Date(start))}. Please complete the pre-meeting update so the time is used well.`, link: '/workspace/student/dashboard', kind: 'reminder', severity: 'action', projectId: project.id, action: 'notification.send', logSummary: `${AGENT} reminded the participants about "${meeting.title}".` });
      return { state: 'waiting_for_reply', step: 'awaiting_meeting', nextRunAt: new Date(end + cfg.noShowGraceMs), data: { reminded: true } };
    }
    const next = !data.reminded && now.getTime() < reminderAt ? reminderAt : end + cfg.noShowGraceMs;
    return { state: 'waiting_for_reply', step: 'awaiting_meeting', nextRunAt: new Date(next) };
  }

  // ---- Book the meeting ----------------------------------------------------------------------------
  const ids = kind === 'review' ? data.attendeeUserIds : [project.ownerUserId, data.mentorUserId || project.mentorUserId, project.coordinatorUserId];
  const people = await participantsFor(ids);
  if (people.length < 2) return escalateMeeting(ctx, project, null, 'There are not enough active participants with accounts to schedule a meeting.');
  const title = kind === 'onboarding' ? `Onboarding: ${project.title}` : data.title || `Review: ${project.title}`;
  const mentor = people.find((p) => p.userId === String(data.mentorUserId || project.mentorUserId));

  if (kind === 'onboarding') {
    await generateDocument(ctx, {
      key: `onboarding-pack:${project.id}`, kind: 'onboarding_pack', title: `Onboarding pack - ${project.title}`, projectId: project.id,
      audience: { userIds: people.map((p) => p.userId), roles: ['faculty'] },
      data: {
        name: project.title, mentorName: mentor?.name || 'Your mentor', coordinatorName: project.assignedCoordinatorName, founderNames: people.filter((p) => p.role === 'student').map((p) => p.name),
        steps: ['Write down the three most important things you want help with', 'List what you have completed so far', 'Share any blockers you want to discuss'],
      },
    });
  }

  const booking = await pickAndBook(ctx, job, project, people, { now, config, notBefore: data.notBefore, title, kind, attempt: data.slotAttempts || 0 });
  if (!booking) {
    const attempts = (data.slotAttempts || 0) + 1;
    if (attempts >= 3) return escalateMeeting(ctx, project, null, `No common free time was found for ${people.length} people after ${attempts} searches.`);
    await note({ ...ctx, action: 'meeting.find_slots', status: 'skipped', projectId: project.id, summary: `${AGENT} found no common slot for ${project.title}; it will search again tomorrow.`, audience: { userIds: people.map((p) => p.userId), roles: ['faculty'] } });
    return { state: 'retrying', step: 'finding_slot', nextRunAt: new Date(now.getTime() + DAY), data: { slotAttempts: attempts } };
  }
  const meetingId = booking.booked.result.meetingId;
  await emit('meeting.scheduled', { aggregateId: meetingId, projectId: project.id, payload: { meetingId }, dedupe: 'v0', correlationId: ctx.correlationId });

  const founder = people.find((p) => p.userId === String(project.ownerUserId));
  if (founder) {
    const dueBefore = new Date(booking.slot.startUtc.getTime() - cfg.preMeetingUpdateDueBeforeMs);
    await createTask(ctx, {
      key: `pre-meeting:${meetingId}`, projectId: project.id, projectTitle: project.title, title: `Pre-meeting update for "${title}"`,
      description: 'Share what you completed, what is blocked, and what you want to discuss.', assignedUserId: founder.userId, assignedTo: founder.name, assignedRole: 'student',
      dueDate: localDateString(dueBefore > now ? dueBefore : new Date(now.getTime() + DAY)), priority: 'High', kind: 'pre_meeting_update', link: '/workspace/student/dashboard',
    });
  }
  const end = booking.slot.endUtc.getTime();
  return {
    state: 'waiting_for_reply', step: 'awaiting_meeting', nextRunAt: new Date(Math.min(end + cfg.noShowGraceMs, booking.slot.startUtc.getTime() - cfg.preMeetingUpdateDueBeforeMs > now.getTime() ? booking.slot.startUtc.getTime() - cfg.preMeetingUpdateDueBeforeMs : end + cfg.noShowGraceMs)),
    data: { meetingId, meetingEndUtc: booking.slot.endUtc.toISOString(), reminded: false, slotAttempts: 0 }, note: `Booked ${formatLocal(booking.slot.startUtc)}.`,
  };
}

async function reschedule(ctx, job, project, meeting, now, config, reason) {
  const people = await participantsFor(meeting.attendeeUserIds || []);
  const attempt = (meeting.rescheduleCount || 0) + 1;
  const from = new Date(Math.max(now.getTime(), new Date(meeting.endUtc).getTime()));
  const found = await findSlotsLogged(ctx, { key: `${job._id}:resched:${attempt}`, userIds: people.map((p) => p.userId), durationMinutes: meeting.durationMinutes, from, count: 1, leadDays: 1 });
  if (!found.slots.length) return escalateMeeting(ctx, project, meeting, `No free time was found to reschedule "${meeting.title}" after ${reason}.`);
  const slot = found.slots[0];
  await rescheduleMeeting(ctx, { key: `${meeting.id}:${attempt}`, meeting, startUtc: slot.startUtc, endUtc: slot.endUtc, reason: `Rescheduled because ${reason}.` });
  return {
    state: 'waiting_for_reply', step: 'awaiting_meeting', nextRunAt: new Date(slot.endUtc.getTime() + config.workflow.noShowGraceMs),
    data: { meetingEndUtc: slot.endUtc.toISOString(), reminded: false }, note: `Rescheduled to ${formatLocal(slot.startUtc)}.`,
  };
}

async function escalateMeeting(ctx, project, meeting, reason) {
  const coordinatorIds = project.coordinatorUserId ? [String(project.coordinatorUserId)] : [];
  await runAction({
    agent: AGENT, action: 'escalation.raise', tool: 'notify', trigger: ctx.trigger, correlationId: ctx.correlationId, jobId: ctx.jobId, projectId: project.id,
    audience: { userIds: coordinatorIds, roles: ['admin'] }, idempotencyKey: `meeting-escalation:${project.id}:${meeting?.id || 'none'}:${meeting?.rescheduleCount || 0}`, inputSummary: reason,
    exec: async () => {
      await notify(ctx, {
        key: `meeting-escalation-notice:${project.id}:${meeting?.id || 'none'}:${meeting?.rescheduleCount || 0}`, userIds: coordinatorIds, roles: coordinatorIds.length ? [] : ['admin'], title: `Meeting needs attention: ${project.title}`,
        message: `${reason} Please arrange it directly with the mentor and founders.`, link: '/workspace/faculty', kind: 'escalation', severity: 'warning', projectId: project.id, logSummary: `${AGENT} asked the coordinator to step in on the meeting for ${project.title}.`,
      });
      return { result: { reason }, summary: `${AGENT} escalated the meeting for ${project.title}: ${reason}`, followUp: 'A person needs to arrange the meeting.' };
    },
  });
  return { state: 'escalated', step: 'needs_human', note: reason };
}

jobs.registerJobHandler(ONBOARDING, handleMeetingJob);
jobs.registerJobHandler(REVIEW, handleMeetingJob);

module.exports = { onAllocationConfirmed, requestReviewMeeting, recordOutcome, respondToMeeting, handleMeetingJob, ONBOARDING, REVIEW };
