const jobs = require('../jobs');
const approvals = require('../approvals');
const { runAction, note } = require('../actionLog');
const { getConfig } = require('../config');
const py = require('../pythonClient');
const { emit } = require('../events');
const { notify } = require('../tools/notify');
const { generateDocument } = require('../tools/documents');
const { makeCtx, AGENTS } = require('./context');

const AGENT = AGENTS.application;
const JOB_TYPE = 'application.review';

// ---------------------------------------------------------------------------
// Pure checks (unit-tested)
// ---------------------------------------------------------------------------

/** Evidence required before an application goes to a human reviewer. Thresholds come from configuration. */
function checkCompleteness(form, cfg = getConfig().application) {
  const missing = [];
  const technologies = Array.isArray(form.technologies) ? form.technologies.filter(Boolean) : [];
  const attachments = Array.isArray(form.attachments) ? form.attachments : [];
  const team = Array.isArray(form.teamMembers) ? form.teamMembers : [];
  if (technologies.length === 0) missing.push('the technologies or tools you plan to use');
  if (!String(form.githubUrl || '').trim() && !String(form.demoUrl || '').trim() && attachments.length === 0) {
    missing.push('a link to a prototype, repository or demo - or an uploaded document that shows your progress');
  }
  if (team.length < cfg.minTeamSize) missing.push(`your team size - at least ${cfg.minTeamSize} team members (add the teammates who will work on this with you)`);
  if (String(form.currentSolutions || '').trim().length < 10) missing.push('how people solve this problem today (existing alternatives)');
  return { complete: missing.length === 0, missing };
}

function tokens(text) {
  return String(text || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((w) => w.length > 2);
}

function jaccard(a, b) {
  const A = new Set(tokens(a));
  const B = new Set(tokens(b));
  if (!A.size || !B.size) return 0;
  let shared = 0;
  A.forEach((w) => { if (B.has(w)) shared += 1; });
  return shared / (A.size + B.size - shared);
}

/** Likely spam or duplicate signals. These FLAG for a human; nothing is ever deleted or rejected here. */
function detectFlags(form, others = [], cfg = getConfig().application) {
  const flags = [];
  const body = [form.problem, form.solution, form.shortDescription].join(' ');
  const words = tokens(body);
  if (words.length >= 12 && new Set(words).size / words.length < cfg.spamMinUniqueWordRatio) {
    flags.push({ kind: 'spam', reason: 'The text repeats the same few words, which often means filler or copy-pasted content.' });
  }
  if (/(.)\1{7,}/.test(body)) flags.push({ kind: 'spam', reason: 'The text contains long runs of repeated characters.' });
  if ((body.match(/https?:\/\//g) || []).length > 3) flags.push({ kind: 'spam', reason: 'The description contains many links.' });
  if (form.problem && form.solution && tokens(form.problem).join(' ') === tokens(form.solution).join(' ')) {
    flags.push({ kind: 'spam', reason: 'The problem and solution text are identical.' });
  }
  others.forEach((other) => {
    const nameSimilarity = jaccard(form.name, other.name);
    const textSimilarity = jaccard(`${form.problem} ${form.solution}`, `${other.problem || ''} ${other.solution || ''}`);
    if (nameSimilarity >= cfg.duplicateNameSimilarity || textSimilarity >= cfg.duplicateTextSimilarity) {
      flags.push({
        kind: 'duplicate',
        reason: `Looks very similar to another application ("${other.name}", ${Math.round(Math.max(nameSimilarity, textSimilarity) * 100)}% match).`,
        otherApplicationId: other.id,
      });
    }
  });
  return flags;
}

// ---------------------------------------------------------------------------
// Event entry points
// ---------------------------------------------------------------------------

async function onSubmitted(event) {
  const applicationId = event.applicationId || event.aggregateId;
  const ctx = makeCtx(AGENT, { event, applicationId });
  const { job, created } = await jobs.enqueue({
    type: JOB_TYPE,
    agent: AGENT,
    dedupeKey: `${JOB_TYPE}:${applicationId}`,
    correlationId: event.correlationId,
    triggerEvent: event.eventType,
    applicationId,
    subjectType: 'application',
    subjectId: applicationId,
    data: { round: 0, applicantId: event.payload?.applicant_id || null },
  });
  if (!created && !['done', 'failed'].includes(job.state)) {
    // A duplicate submit event: the existing job already covers it.
    await note({ ...ctx, action: 'application.assess', status: 'skipped', summary: `${AGENT} ignored a duplicate submission event; the application is already being handled.`, audience: { userIds: [], roles: ['super_admin'] } });
  }
  return job;
}

async function onResubmitted(event) {
  const applicationId = event.applicationId || event.aggregateId;
  const ctx = makeCtx(AGENT, { event, applicationId });
  const open = await jobs.findOpen(JOB_TYPE, applicationId);
  if (open) {
    await emit('application.info_received', { aggregateId: applicationId, applicationId, payload: { eventId: event.eventId }, dedupe: event.eventId, correlationId: open.correlationId });
    await jobs.signal(open._id, 'resubmitted', { eventId: event.eventId });
    return open;
  }
  // The earlier cycle already finished (or never existed): start a fresh review round.
  const { job } = await jobs.enqueue({
    type: JOB_TYPE,
    agent: AGENT,
    dedupeKey: `${JOB_TYPE}:${applicationId}:${event.eventId}`,
    correlationId: event.correlationId,
    triggerEvent: event.eventType,
    applicationId,
    subjectType: 'application',
    subjectId: applicationId,
    data: { round: 1, applicantId: event.payload?.applicant_id || null },
  });
  return job;
}

/** A human decided (through the approval queue or the existing review screen): close the loop. */
async function onDecided(event) {
  const applicationId = event.applicationId || event.aggregateId;
  const decision = event.eventType.split('.')[1];
  const reviewer = String(event.actorId || '');
  const resolved = await approvals.resolveExternally({
    type: 'admission', subjectId: applicationId, decision: decision === 'approved' ? 'approved' : 'rejected',
    decidedBy: reviewer, decidedByRole: 'admin', comment: event.payload?.comments || '',
  });
  const open = await jobs.findOpen(JOB_TYPE, applicationId);
  if (open) await jobs.signal(open._id, 'decided', { decision, by: reviewer });
  return { approvalResolved: Boolean(resolved), jobSignalled: Boolean(open) };
}

// ---------------------------------------------------------------------------
// The job
// ---------------------------------------------------------------------------

async function otherApplications(app) {
  try {
    const queue = await py.getQueue(py.agentActor('application'));
    const others = (queue.queue || []).filter((q) => String(q.id) !== String(app.id));
    // Only compare names for the cheap check; the full text is fetched for the closest few.
    const close = others.filter((o) => o.startupName).slice(0, 15);
    const detailed = [];
    for (const item of close) {
      try {
        const d = await py.getApplication(item.id, py.agentActor('application'));
        detailed.push({ id: item.id, name: d.startup?.name || item.startupName, problem: d.startup?.problem, solution: d.startup?.solution, applicantId: d.applicantId });
      } catch {
        detailed.push({ id: item.id, name: item.startupName });
      }
    }
    return detailed;
  } catch {
    return [];
  }
}

async function admins() {
  return { roles: ['admin'] };
}

async function handleReview(job, { now, config }) {
  const cfg = config.application;
  const data = job.data || {};
  const applicationId = job.applicationId;
  const ctx = makeCtx(AGENT, { job });
  const signals = (job.data?.signals || []).map((s) => s.name);
  const round = (data.round || 0) + (signals.includes('resubmitted') ? 1 : 0);
  let app;
  try {
    app = await py.getApplication(applicationId, py.agentActor('application'));
  } catch (error) {
    if (error.status === 404) return { state: 'failed', note: 'The application no longer exists.' };
    throw error;
  }
  const status = String(app.status || '').toLowerCase();
  const name = app.startup?.name || 'your application';
  const applicantId = app.applicantId;
  const studentLink = '/workspace/student/dashboard';

  // A human has already decided: nothing left for this agent to do.
  if (signals.includes('decided') || status === 'approved' || status === 'rejected') {
    return { state: 'done', step: 'decided', note: `A reviewer ${status === 'approved' ? 'approved' : status === 'rejected' ? 'rejected' : 'decided'} the application.` };
  }

  // ---- A waiting job woken by its timer (no new submission) -------------------------------------
  if (job.previousState === 'waiting_for_reply' && !signals.includes('resubmitted') && data.step === 'waiting_info') {
    const asked = new Date(data.requestedAt).getTime();
    if (now.getTime() >= asked + cfg.escalateAfterMs) {
      await runAction({
        agent: AGENT, action: 'escalation.raise', tool: 'notify', trigger: ctx.trigger, correlationId: ctx.correlationId, jobId: ctx.jobId, applicationId,
        audience: { userIds: [], roles: ['admin'] }, idempotencyKey: `app:${applicationId}:r${round}:escalate`,
        inputSummary: `No reply for ${Math.round(cfg.escalateAfterMs / 86400000)} days`,
        exec: async () => {
          await notify(ctx, {
            key: `app:${applicationId}:r${round}:escalate-notice`, ...(await admins()), title: `No reply from the founders of ${name}`,
            message: `The Application Agent asked for ${data.missing?.length || 'some'} missing item(s) and has had no reply after ${Math.round(cfg.escalateAfterMs / 86400000)} days (one reminder sent). Please follow up with the applicant or decide how to proceed.`,
            link: '/workspace/admin/applications', kind: 'escalation', severity: 'warning', logSummary: `${AGENT} told the admins that ${name} has not replied to the information request.`,
          });
          return { result: { applicationId, missing: data.missing }, summary: `${AGENT} escalated to the admins: ${name} has not replied after ${Math.round(cfg.escalateAfterMs / 86400000)} days.`, followUp: 'An admin needs to follow up; the agent will re-assess automatically if the student resubmits.' };
        },
      });
      return { state: 'escalated', step: 'waiting_info', data: { escalatedAt: now.toISOString() }, note: 'Escalated to Admin after no reply.' };
    }
    if (!data.remindedAt && now.getTime() >= asked + cfg.reminderAfterMs) {
      await notify(ctx, {
        key: `app:${applicationId}:r${round}:remind`, userIds: [applicantId], title: `Reminder: we still need information for ${name}`,
        message: `We are still waiting for: ${(data.missing || []).join('; ')}. Open your application, add it and resubmit - the review restarts automatically.`,
        link: studentLink, kind: 'reminder', severity: 'action', action: 'application.remind',
        logSummary: `${AGENT} reminded the applicant about the information still missing for ${name}.`,
      });
      return { state: 'waiting_for_reply', step: 'waiting_info', nextRunAt: new Date(asked + cfg.escalateAfterMs), timeoutAt: new Date(asked + cfg.escalateAfterMs), data: { remindedAt: now.toISOString() }, note: 'Reminder sent.' };
    }
    return { state: 'waiting_for_reply', step: 'waiting_info', nextRunAt: new Date(asked + (data.remindedAt ? cfg.escalateAfterMs : cfg.reminderAfterMs)) };
  }

  // ---- Awaiting a human admission decision: nudge when it goes stale -----------------------------
  if (job.previousState === 'waiting_for_approval' && data.step === 'awaiting_decision' && !signals.length) {
    const pending = await approvals.listPending({ role: 'super_admin' }, { type: 'admission' });
    const mine = pending.find((a) => String(a.subjectId) === String(applicationId));
    if (!mine) return { state: 'done', step: 'decided', note: 'The approval is no longer pending.' };
    await notify(ctx, {
      key: `app:${applicationId}:decision-nudge:${Math.floor(now.getTime() / config.approvals.staleAfterMs)}`, ...(await admins()), title: `Decision needed: ${name}`,
      message: `${name} has been ready for an admission decision for over ${Math.round(config.approvals.staleAfterMs / 86400000)} days.`, link: '/workspace/admin/dashboard', kind: 'reminder', severity: 'action', action: 'application.remind',
      logSummary: `${AGENT} reminded the admins that ${name} is still waiting for a decision.`,
    });
    return { state: 'waiting_for_approval', step: 'awaiting_decision', nextRunAt: new Date(now.getTime() + config.approvals.staleAfterMs) };
  }

  // ---- Assess the application now (first submission, or the student replied) ---------------------
  const form = app.formData || {};
  const check = checkCompleteness(form, cfg);
  const flags = detectFlags({ ...form, name }, await otherApplications(app), cfg);

  if (flags.length) {
    await runAction({
      agent: AGENT, action: 'application.flag', tool: 'flag_application', trigger: ctx.trigger, correlationId: ctx.correlationId, jobId: ctx.jobId, applicationId,
      audience: { userIds: [], roles: ['admin'] }, idempotencyKey: `app:${applicationId}:r${round}:flag`, inputSummary: flags.map((f) => f.kind).join(','),
      exec: async () => {
        await notify(ctx, {
          key: `app:${applicationId}:r${round}:flag-notice`, ...(await admins()), title: `Flagged for review: ${name}`,
          message: flags.map((f) => f.reason).join(' '), link: '/workspace/admin/applications', kind: 'flag', severity: 'warning',
          logSummary: `${AGENT} flagged ${name} for the admins (${flags.map((f) => f.kind).join(', ')}). It was not removed.`,
        });
        await emit('application.flagged', { aggregateId: applicationId, applicationId, payload: { flags }, dedupe: `r${round}`, correlationId: ctx.correlationId });
        return { result: { flags }, summary: `${AGENT} flagged ${name} as a possible ${[...new Set(flags.map((f) => f.kind))].join(' / ')}; it stays in the queue for a person to judge.` };
      },
    });
  }

  if (!check.complete) {
    const comment = `Application Agent: please add the following before this application can be reviewed:\n- ${check.missing.join('\n- ')}`;
    await runAction({
      agent: AGENT, action: 'application.request_info', tool: 'request_information', trigger: ctx.trigger, correlationId: ctx.correlationId, jobId: ctx.jobId, applicationId,
      audience: { userIds: [applicantId], roles: [] }, idempotencyKey: `app:${applicationId}:r${round}:request-info`, inputSummary: check.missing.join(' | '),
      summary: `${AGENT} asked the applicant of ${name} for ${check.missing.length} missing item(s): ${check.missing.join('; ')}.`,
      exec: async () => {
        if (status !== 'revision_requested') await py.decideApplication(applicationId, 'revision_requested', comment, py.agentActor('application'));
        await notify(ctx, {
          key: `app:${applicationId}:r${round}:info-notice`, userIds: [applicantId], title: `We need a little more for ${name}`,
          message: `Please add: ${check.missing.join('; ')}. Then resubmit - the review resumes automatically and nothing else is needed from you.`,
          link: studentLink, kind: 'info_request', severity: 'action', action: 'application.request_info',
          logSummary: `${AGENT} sent the applicant a message listing exactly what is missing for ${name}.`,
        });
        await emit('application.info_requested', { aggregateId: applicationId, applicationId, payload: { missing: check.missing }, dedupe: `r${round}`, correlationId: ctx.correlationId });
        return { result: { missing: check.missing }, followUp: `Waiting for the student. A reminder goes out after ${Math.round(cfg.reminderAfterMs / 86400000)} days and an escalation to Admin after ${Math.round(cfg.escalateAfterMs / 86400000)} days.` };
      },
    });
    return {
      state: 'waiting_for_reply',
      step: 'waiting_info',
      nextRunAt: new Date(now.getTime() + cfg.reminderAfterMs),
      timeoutAt: new Date(now.getTime() + cfg.escalateAfterMs),
      data: { round, step: 'waiting_info', missing: check.missing, requestedAt: now.toISOString(), remindedAt: null, escalatedAt: null },
      note: `Asked for ${check.missing.length} missing item(s).`,
    };
  }

  // Complete: prepare the assessment and reviewer questions, then hand the decision to a human.
  let assessment = null;
  let assessmentNote = null;
  try {
    const result = await py.requestAssessment(applicationId, py.agentActor('application'));
    assessment = result.assessment;
  } catch (error) {
    assessmentNote = error.status === 503 ? 'An AI assessment was not available (the language-model key is missing or the service is busy); the rule-based checks were still applied.' : `The AI assessment failed (${error.message}); the rule-based checks were still applied.`;
  }
  await note({ ...ctx, action: 'application.assess', status: assessment ? 'success' : 'skipped', tool: 'assessment', summary: assessment ? `${AGENT} assessed ${name}: the application is complete and ready for a decision.` : `${AGENT} checked ${name}: complete. ${assessmentNote}`, audience: { userIds: [applicantId], roles: ['admin'] } });
  await emit('application.assessed', { aggregateId: applicationId, applicationId, payload: { complete: true, aiAssessed: Boolean(assessment) }, dedupe: `r${round}`, correlationId: ctx.correlationId });

  const questions = assessment?.questions_for_reviewers || [];
  const docResult = await generateDocument(ctx, {
    key: `app:${applicationId}:r${round}:summary`, kind: 'application_summary', title: `Application summary - ${name}`, applicationId,
    audience: { userIds: [], roles: ['admin'] },
    data: {
      name, domain: form.domain, stage: form.maturity, problem: form.problem, solution: form.solution, team: (form.teamMembers || []).length,
      validation: check, flags: flags.map((f) => f.reason), questions,
      assessment: assessment ? assessment.recommendation_summary || '' : assessmentNote,
    },
  });
  const { approval } = await approvals.request({
    type: 'admission', action: 'admission.decide', title: `Admission decision: ${name}`,
    summary: assessment?.recommendation_summary || `${name} is complete and ready for a human admission decision.`,
    requestedBy: AGENT, assignedRoles: ['admin'], applicationId, subjectId: applicationId, jobId: job._id, correlationId: ctx.correlationId, trigger: ctx.trigger,
    evidence: {
      startup: { name, domain: form.domain, stage: form.maturity, tagline: form.shortDescription, teamSize: (form.teamMembers || []).length },
      completeness: check, flags, aiAssessed: Boolean(assessment), assessmentNote,
      scores: assessment?.preliminary_assessment || null, strengths: assessment?.preliminary_assessment?.strengths || [], weaknesses: assessment?.preliminary_assessment?.weaknesses || [],
      reviewerQuestions: questions, summaryDocumentId: docResult.result?.documentId || null,
    },
    payload: { applicationId, applicantId },
  });
  await note({ ...ctx, action: 'application.queue_for_decision', status: 'success', summary: `${AGENT} sent ${name} to the admin approvals queue with the assessment and ${questions.length} prepared reviewer question(s).`, approvalId: approval._id, audience: { userIds: [], roles: ['admin'] }, followUp: 'Waiting for an admin to decide.' });
  await notify(ctx, {
    key: `app:${applicationId}:r${round}:queue-notice`, ...(await admins()), title: `Ready for decision: ${name}`, message: 'The application is complete and the assessment is prepared.', link: '/workspace/admin/dashboard', kind: 'approval', severity: 'action',
    logSummary: `${AGENT} told the admins that ${name} is ready for a decision.`,
  });
  await notify(ctx, {
    key: `app:${applicationId}:r${round}:student-ready`, userIds: [applicantId], title: `${name} is with the review team`, message: 'Your application is complete. A reviewer will decide on it; you will be notified.', link: studentLink, kind: 'status',
    logSummary: `${AGENT} told the applicant that ${name} is now with the review team.`,
  });
  return { state: 'waiting_for_approval', step: 'awaiting_decision', nextRunAt: new Date(now.getTime() + config.approvals.staleAfterMs), data: { round, step: 'awaiting_decision', approvalId: String(approval._id) } };
}

// ---------------------------------------------------------------------------
// Admission decisions run through the single Tier-3 gate
// ---------------------------------------------------------------------------

approvals.registerApprovalHandler('admission', {
  async approve(approval, user) {
    return decide(approval, user, 'approved');
  },
  async reject(approval, user) {
    return decide(approval, user, 'rejected');
  },
});

async function decide(approval, user, decision) {
  const ctx = makeCtx(AGENT, { trigger: { type: 'user', ref: String(user.id) }, applicationId: approval.applicationId, correlationId: approval.correlationId });
  const comment = approval.decisionComment || `${decision === 'approved' ? 'Approved' : 'Rejected'} from the admissions queue.`;
  await runAction({
    agent: AGENT, action: 'admission.decide', tool: 'decide_application', trigger: ctx.trigger, correlationId: ctx.correlationId, applicationId: approval.applicationId, approvalId: approval._id,
    audience: { userIds: [], roles: ['admin'] }, idempotencyKey: `admission:${approval.applicationId}:${decision}:${approval._id}`, inputSummary: `${decision} by ${user.name || user.role}`,
    summary: `${user.name || 'An administrator'} ${decision} the application; it is now ${decision}.`,
    exec: async () => {
      await py.decideApplication(approval.applicationId, decision, comment, py.humanActor(user));
      return { result: { decision, by: String(user.id) } };
    },
  });
}

jobs.registerJobHandler(JOB_TYPE, handleReview);

module.exports = { onSubmitted, onResubmitted, onDecided, handleReview, checkCompleteness, detectFlags, jaccard, JOB_TYPE };
