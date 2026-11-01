const FacultyProject = require('../../models/FacultyProject');
const FacultyTask = require('../../models/FacultyTask');
const FacultyMeeting = require('../../models/FacultyMeeting');
const AgentJob = require('../../models/AgentJob');
const jobs = require('../jobs');
const { runAction, note } = require('../actionLog');
const { getConfig } = require('../config');
const py = require('../pythonClient');
const { emit } = require('../events');
const { notify } = require('../tools/notify');
const { createTask, requestReport, updateStartupStatus } = require('../tools/tasks');
const { generateDocument } = require('../tools/documents');
const { localDateString } = require('../time');
const { makeCtx, AGENTS } = require('./context');

const AGENT = AGENTS.monitoring;
const JOB_TYPE = 'monitoring.case';
const DAY = 24 * 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// Explicit stall criteria (pure; unit-tested). No score is invented: a figure that is not tracked is
// reported as "not tracked" and never counted as healthy or unhealthy.
// ---------------------------------------------------------------------------
function evaluateStall({ project, tasks = [], milestones = null, meetings = [], now = new Date(), cfg = getConfig().monitoring, completedReportAt = null }) {
  const today = localDateString(now);
  const reasons = [];
  const evidence = {};

  const founderTasks = tasks.filter((t) => t.assignedRole === 'student' && t.kind !== 'checkin');
  const graceMs = cfg.taskOverdueGraceDays * DAY;
  const overdueTasks = founderTasks.filter((t) => t.status !== 'Completed' && t.dueDate && t.dueDate < today && now.getTime() - new Date(`${t.dueDate}T00:00:00Z`).getTime() >= graceMs);
  if (overdueTasks.length) {
    reasons.push({ code: 'overdue_tasks', label: `${overdueTasks.length} task(s) are more than ${cfg.taskOverdueGraceDays} days overdue` });
    evidence.overdueTasks = overdueTasks.map((t) => ({ title: t.title, dueDate: t.dueDate }));
  }

  if (milestones) {
    const overdue = milestones.filter((m) => m.state === 'overdue');
    evidence.milestones = { tracked: true, total: milestones.length, overdue: overdue.length };
    if (overdue.length) {
      reasons.push({ code: 'overdue_milestones', label: `${overdue.length} milestone(s) are past their due date` });
      evidence.overdueMilestones = overdue.map((m) => ({ title: m.title, dueDate: m.dueDate }));
    }
  } else {
    evidence.milestones = { tracked: false };
  }

  const activityTimes = [];
  tasks.filter((t) => t.status === 'Completed' && t.assignedRole === 'student').forEach((t) => activityTimes.push(new Date(t.completedAt || t.updatedAt || 0).getTime()));
  meetings.filter((m) => m.outcome === 'held').forEach((m) => activityTimes.push(new Date(m.outcomeAt || m.endUtc || 0).getTime()));
  (milestones || []).filter((m) => m.completedAt).forEach((m) => activityTimes.push(new Date(m.completedAt).getTime()));
  const baseline = new Date(project.createdAt || now).getTime();
  const lastActivityAt = new Date(Math.max(baseline, ...activityTimes.filter(Boolean)));
  const daysInactive = Math.floor((now.getTime() - lastActivityAt.getTime()) / DAY);
  evidence.lastActivityAt = lastActivityAt.toISOString();
  evidence.daysInactive = daysInactive;
  if (daysInactive >= cfg.inactivityDays) reasons.push({ code: 'inactivity', label: `No recorded founder activity for ${daysInactive} days` });

  const projectAgeDays = Math.floor((now.getTime() - baseline) / DAY);
  const lastReport = completedReportAt || tasks.filter((t) => t.kind === 'progress_report' && t.status === 'Completed').map((t) => new Date(t.completedAt || t.updatedAt).getTime()).sort().pop();
  const sinceReportDays = lastReport ? Math.floor((now.getTime() - lastReport) / DAY) : projectAgeDays;
  evidence.daysSinceReport = lastReport ? sinceReportDays : null;
  const reportOverdue = projectAgeDays >= cfg.reportEveryDays && sinceReportDays >= cfg.reportEveryDays;
  if (reportOverdue) reasons.push({ code: 'missing_report', label: lastReport ? `No progress report for ${sinceReportDays} days` : 'No progress report has ever been submitted' });

  return { stalled: reasons.length > 0, reasons, evidence, lastActivityAt, reportOverdue };
}

// ---------------------------------------------------------------------------
// Data gathering
// ---------------------------------------------------------------------------
async function loadMilestones(project) {
  if (!project.applicationId || !project.ownerUserId) return null;
  try {
    const data = await py.call(`/api/applications/${encodeURIComponent(project.applicationId)}/milestones`, {
      actor: { id: String(project.ownerUserId), role: 'student', permissions: ['view_applications'] },
    });
    return data.milestones || [];
  } catch {
    return null;
  }
}

async function evaluateProject(project, now, cfg = getConfig().monitoring) {
  const [tasks, meetings, milestones] = await Promise.all([
    FacultyTask.find({ projectId: project.id }).lean(),
    FacultyMeeting.find({ projectId: project.id }).lean(),
    loadMilestones(project),
  ]);
  return { ...evaluateStall({ project, tasks, milestones, meetings, now, cfg }), tasks, meetings, milestones };
}

async function peopleFor(project) {
  return {
    founder: project.ownerUserId ? [String(project.ownerUserId)] : [],
    mentor: project.mentorUserId ? [String(project.mentorUserId)] : [],
    coordinator: project.coordinatorUserId ? [String(project.coordinatorUserId)] : [],
  };
}

// ---------------------------------------------------------------------------
// Scheduled sweep: open a case for every newly stalled startup, wake open cases to re-check them.
// ---------------------------------------------------------------------------
async function sweep({ now = new Date() } = {}) {
  const cfg = getConfig().monitoring;
  const projects = await FacultyProject.find({ ownerUserId: { $ne: null } }).lean();
  const report = { checked: 0, opened: 0, rechecked: 0 };
  for (const project of projects) {
    report.checked += 1;
    const open = await jobs.findOpen(JOB_TYPE, project.id);
    if (open) {
      await jobs.signal(open._id, 'recheck', {});
      report.rechecked += 1;
      continue;
    }
    const evaluation = await evaluateProject(project, now, cfg);
    if (evaluation.reportOverdue && !evaluation.tasks.some((t) => t.kind === 'progress_report' && t.status !== 'Completed')) {
      const ctx = makeCtx(AGENT, { trigger: { type: 'schedule', ref: 'monitoring.sweep' }, projectId: project.id, applicationId: project.applicationId });
      await emit('report.overdue', { aggregateId: project.id, projectId: project.id, payload: {}, dedupe: localDateString(now) });
      await requestReport(ctx, { key: `${project.id}:${localDateString(now)}`, projectId: project.id, projectTitle: project.title, founderUserId: project.ownerUserId, founderName: project.leadStudent, reason: 'It has been a while since your last progress update. Share what is done, what is blocked and what is next.' });
    }
    if (!evaluation.stalled) continue;
    const recent = await AgentJob.findOne({ type: JOB_TYPE, subjectId: project.id, state: 'done', resolvedAt: { $gte: new Date(now.getTime() - cfg.recoveryCooldownMs) } }).lean();
    if (recent) continue; // recently recovered: do not start another case straight away
    const { created } = await jobs.enqueue({
      type: JOB_TYPE, agent: AGENT, dedupeKey: `${JOB_TYPE}:${project.id}:${localDateString(now)}`, applicationId: project.applicationId, projectId: project.id, subjectType: 'project', subjectId: project.id,
      triggerEvent: 'schedule.monitoring', data: { openedAt: now.toISOString(), reasons: evaluation.reasons, evidence: evaluation.evidence, stage: 'open' },
    });
    if (created) report.opened += 1;
  }
  return report;
}

// ---------------------------------------------------------------------------
// The case: check in with the founder, then the mentor, then the coordinator - once each.
// ---------------------------------------------------------------------------
async function handleCase(job, { now, config }) {
  const cfg = config.monitoring;
  const ctx = makeCtx(AGENT, { job });
  const data = job.data || {};
  const project = await FacultyProject.findOne({ id: job.projectId }).lean();
  if (!project) return { state: 'failed', note: 'The startup record no longer exists.' };
  const people = await peopleFor(project);
  const openedAt = new Date(data.openedAt || now);
  const caseKey = `${project.id}:${openedAt.toISOString().slice(0, 10)}`;
  const evaluation = await evaluateProject(project, now, cfg);

  // Did the founder respond, or is the condition gone? Then the intervention worked.
  const checkinTask = evaluation.tasks.find((t) => t.dedupeKey === `checkin:${caseKey}`);
  const responded = (checkinTask && checkinTask.status === 'Completed') || evaluation.lastActivityAt.getTime() > openedAt.getTime();
  if (data.stage !== 'open' && (responded || !evaluation.stalled)) {
    const hours = Math.round((now.getTime() - openedAt.getTime()) / 3600000);
    await emit('startup.recovered', { aggregateId: project.id, projectId: project.id, applicationId: project.applicationId, payload: { hoursToRecover: hours, stageReached: data.stage }, dedupe: caseKey, correlationId: ctx.correlationId });
    await runAction({
      agent: AGENT, action: 'startup.record_recovery', tool: 'record_recovery', trigger: ctx.trigger, correlationId: ctx.correlationId, jobId: ctx.jobId, projectId: project.id, applicationId: project.applicationId,
      audience: { userIds: [...people.founder, ...people.mentor, ...people.coordinator], roles: ['admin'] }, idempotencyKey: `recovered:${caseKey}`, inputSummary: `after ${hours}h at stage ${data.stage}`,
      exec: async () => {
        await updateStartupStatus(ctx, { key: `${caseKey}:recovered`, projectId: project.id, patch: { health: 'On Track' }, reason: 'the startup is active again' });
        await notify(ctx, { key: `recovered-notice:${caseKey}`, userIds: [...people.mentor, ...people.coordinator], title: `${project.title} is back on track`, message: `The startup responded after ${hours} hours (the case reached the "${data.stage}" step).`, link: '/workspace/faculty', kind: 'status', projectId: project.id, logSummary: `${AGENT} told the mentor and coordinator that ${project.title} recovered.` });
        return { result: { hoursToRecover: hours, stageReached: data.stage }, summary: `${project.title} recovered ${hours} hours after the Monitoring Agent opened a case (it had reached the "${data.stage}" step).` };
      },
    });
    return { state: 'done', step: 'recovered', data: { recoveredAt: now.toISOString(), hoursToRecover: hours }, note: 'Recovered.' };
  }

  // Step 1 - check in with the founder (first run).
  if (data.stage === 'open') {
    await emit('startup.stalled', { aggregateId: project.id, projectId: project.id, applicationId: project.applicationId, payload: { reasons: evaluation.reasons.map((r) => r.code) }, dedupe: caseKey, correlationId: ctx.correlationId });
    await updateStartupStatus(ctx, { key: `${caseKey}:at-risk`, projectId: project.id, patch: { health: evaluation.reasons.length > 1 ? 'At Risk' : 'Needs Attention' }, reason: evaluation.reasons.map((r) => r.label).join('; ') });
    const message = `We noticed: ${evaluation.reasons.map((r) => r.label).join('; ')}. Could you reply with a short status (what is done, what is blocked)? Marking the check-in task complete is enough.`;
    await createTask(ctx, {
      key: `checkin:${caseKey}`, projectId: project.id, projectTitle: project.title, title: `Check-in: tell us how ${project.title} is going`, description: message, assignedUserId: project.ownerUserId, assignedTo: project.leadStudent, assignedRole: 'student',
      kind: 'checkin', dueDate: localDateString(new Date(now.getTime() + 2 * DAY)), priority: 'High', link: '/workspace/student/dashboard', action: 'monitoring.checkin',
    });
    await notify(ctx, { key: `checkin-notice:${caseKey}`, userIds: people.founder, title: `A quick check-in on ${project.title}`, message, link: '/workspace/student/dashboard', kind: 'checkin', severity: 'action', projectId: project.id, action: 'monitoring.checkin', logSummary: `${AGENT} checked in with the founders of ${project.title}: ${evaluation.reasons.map((r) => r.label).join('; ')}.` });
    return { state: 'waiting_for_reply', step: 'founder_checkin', nextRunAt: new Date(now.getTime() + cfg.checkinWaitMs), timeoutAt: new Date(now.getTime() + cfg.checkinWaitMs), data: { stage: 'founder_checkin', checkinAt: now.toISOString(), reasons: evaluation.reasons, evidence: evaluation.evidence }, note: 'Founder check-in sent.' };
  }

  // Step 2 - no reply after the wait: tell the mentor (once).
  if (data.stage === 'founder_checkin') {
    if (now.getTime() < new Date(data.checkinAt).getTime() + cfg.checkinWaitMs) return { state: 'waiting_for_reply', step: 'founder_checkin', nextRunAt: new Date(new Date(data.checkinAt).getTime() + cfg.checkinWaitMs) };
    if (!people.mentor.length) return escalateCase(ctx, job, project, people, evaluation, data, now, caseKey);
    await runAction({
      agent: AGENT, action: 'monitoring.notify_mentor', tool: 'notify', trigger: ctx.trigger, correlationId: ctx.correlationId, jobId: ctx.jobId, projectId: project.id, applicationId: project.applicationId,
      audience: { userIds: [...people.mentor, ...people.coordinator], roles: [] }, idempotencyKey: `mentor-notice:${caseKey}`, inputSummary: evaluation.reasons.map((r) => r.label).join('; '),
      exec: async () => {
        await notify(ctx, { key: `mentor-notice-msg:${caseKey}`, userIds: people.mentor, title: `${project.title} has gone quiet`, message: `The founders did not answer our check-in for ${Math.round(cfg.checkinWaitMs / 3600000)} hours. ${evaluation.reasons.map((r) => r.label).join('; ')}. A nudge from you may help.`, link: '/workspace/mentor/dashboard', kind: 'nudge', severity: 'action', projectId: project.id, action: 'monitoring.notify_mentor' });
        return { result: { reasons: evaluation.reasons }, summary: `${AGENT} told the mentor of ${project.title} that the founders did not answer the check-in for ${Math.round(cfg.checkinWaitMs / 3600000)} hours.`, followUp: `The coordinator is told if there is still no response after ${Math.round(cfg.mentorWaitMs / 3600000)} more hours.` };
      },
    });
    return { state: 'waiting_for_reply', step: 'mentor_notified', nextRunAt: new Date(now.getTime() + cfg.mentorWaitMs), timeoutAt: new Date(now.getTime() + cfg.mentorWaitMs), data: { stage: 'mentor_notified', mentorNotifiedAt: now.toISOString() }, note: 'Mentor notified.' };
  }

  // Step 3 - still nothing: escalate to the coordinator with evidence (once).
  if (data.stage === 'mentor_notified') {
    if (now.getTime() < new Date(data.mentorNotifiedAt).getTime() + cfg.mentorWaitMs) return { state: 'waiting_for_reply', step: 'mentor_notified', nextRunAt: new Date(new Date(data.mentorNotifiedAt).getTime() + cfg.mentorWaitMs) };
    return escalateCase(ctx, job, project, people, evaluation, data, now, caseKey);
  }

  // Escalated and still unresolved: stay parked; the sweep re-checks and recovery closes the case.
  return { state: 'escalated', step: 'escalated' };
}

async function escalateCase(ctx, job, project, people, evaluation, data, now, caseKey) {
  const attempts = [
    `Check-in sent to the founders on ${(data.checkinAt || '').slice(0, 10)} - no reply`,
    people.mentor.length ? `Mentor notified on ${(data.mentorNotifiedAt || '').slice(0, 10)} - no change` : 'No mentor is assigned to nudge',
  ];
  const brief = await generateDocument(ctx, {
    key: `escalation-brief:${caseKey}`, kind: 'escalation_brief', title: `Escalation brief - ${project.title}`, projectId: project.id, audience: { userIds: people.coordinator, roles: ['admin'] },
    data: { name: project.title, reasons: evaluation.reasons.map((r) => r.label), attempts, evidence: [`Last founder activity: ${(evaluation.lastActivityAt || '').toString().slice(0, 10)} (${evaluation.evidence.daysInactive} days ago)`, ...(evaluation.evidence.overdueTasks || []).map((t) => `Overdue task: ${t.title} (due ${t.dueDate})`), ...(evaluation.evidence.overdueMilestones || []).map((m) => `Overdue milestone: ${m.title} (due ${m.dueDate})`)] },
  });
  await runAction({
    agent: AGENT, action: 'escalation.raise', tool: 'notify', trigger: ctx.trigger, correlationId: ctx.correlationId, jobId: ctx.jobId, projectId: project.id, applicationId: project.applicationId,
    audience: { userIds: people.coordinator, roles: ['admin'] }, idempotencyKey: `escalate:${caseKey}`, inputSummary: evaluation.reasons.map((r) => r.label).join('; '),
    exec: async () => {
      await notify(ctx, { key: `escalate-msg:${caseKey}`, userIds: people.coordinator, roles: people.coordinator.length ? [] : ['admin'], title: `Escalation: ${project.title} is not responding`, message: `${evaluation.reasons.map((r) => r.label).join('; ')}. The founders and the mentor were contacted without a response. A brief with the evidence has been prepared.`, link: '/workspace/faculty', kind: 'escalation', severity: 'warning', projectId: project.id });
      return { result: { reasons: evaluation.reasons, briefDocumentId: brief.result?.documentId, attempts }, summary: `${AGENT} escalated ${project.title} to the coordinator after the founders${people.mentor.length ? ' and the mentor' : ''} did not respond.`, followUp: 'A person needs to reach out. The case closes automatically if the startup becomes active again.' };
    },
  });
  return { state: 'escalated', step: 'escalated', data: { stage: 'escalated', escalatedAt: now.toISOString() }, note: 'Escalated to the coordinator.' };
}

jobs.registerJobHandler(JOB_TYPE, handleCase);

module.exports = { sweep, handleCase, evaluateStall, evaluateProject, JOB_TYPE };
