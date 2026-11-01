const crypto = require('crypto');
const User = require('../../models/User');
const FacultyProject = require('../../models/FacultyProject');
const MentorAllocation = require('../../models/MentorAllocation');
const MentorMatchingRun = require('../../models/MentorMatchingRun');
const MentorRequest = require('../../models/MentorRequest');
const jobs = require('../jobs');
const approvals = require('../approvals');
const { runAction, note } = require('../actionLog');
const { getConfig } = require('../config');
const py = require('../pythonClient');
const { ensureProject, cleanName } = require('../projects');
const { emit } = require('../events');
const { notify } = require('../tools/notify');
const { makeCtx, AGENTS } = require('./context');

const AGENT = AGENTS.mentor;
const JOB_TYPE = 'mentor.matching';

// ---------------------------------------------------------------------------
// Ranking over REAL mentor accounts (pure given its inputs; unit-tested)
// ---------------------------------------------------------------------------

function words(value) {
  return String(Array.isArray(value) ? value.join(' ') : value || '').toLowerCase().replace(/[^a-z0-9+#\s]/g, ' ').split(/\s+/).filter((w) => w.length > 2);
}

/**
 * Score each mentor 0-100 from three explainable parts: how much of the startup's field their
 * expertise covers (up to 60), whether they work with this stage (10), and free capacity (30).
 * Mentors at capacity or marked unavailable are excluded and the reason is kept as evidence.
 */
function rankMentors({ project, mentors, loads = {}, excludeIds = [], cfg = getConfig().mentor }) {
  const wanted = new Set([...words(project.domain), ...words(project.description), ...words(project.title)]);
  const stage = String(project.stage || '').toLowerCase();
  const ranked = [];
  const excluded = [];
  for (const mentor of mentors) {
    const id = String(mentor._id);
    const profile = mentor.profile || {};
    const name = cleanName(mentor.name);
    if (excludeIds.map(String).includes(id)) { excluded.push({ mentorUserId: id, name, reason: 'Already asked for this startup' }); continue; }
    if (profile.availability === 'unavailable') { excluded.push({ mentorUserId: id, name, reason: 'Marked unavailable' }); continue; }
    const capacity = Number(profile.maxMentees ?? profile.capacity ?? cfg.defaultCapacity);
    const load = loads[id] || 0;
    const free = capacity - load;
    if (free <= 0) { excluded.push({ mentorUserId: id, name, reason: `At capacity (${load}/${capacity} startups)` }); continue; }

    const expertise = [...(profile.expertise || []), ...(profile.domains || []), ...(profile.sectors || [])];
    const have = new Set(words(expertise));
    const overlap = [...wanted].filter((w) => have.has(w));
    const coverage = wanted.size ? Math.min(1, overlap.length / Math.min(wanted.size, 4)) : 0;
    const expertisePoints = Math.round(coverage * 60);
    const stagePoints = (profile.stages || []).some((s) => String(s).toLowerCase() === stage) ? 10 : 0;
    const capacityPoints = Math.round(Math.min(1, free / capacity) * 30);
    const score = expertisePoints + stagePoints + capacityPoints;
    const reasons = [];
    if (overlap.length) reasons.push(`Expertise overlaps with this startup: ${overlap.slice(0, 4).join(', ')}`);
    else reasons.push('No direct expertise overlap recorded in the mentor profile');
    if (stagePoints) reasons.push(`Works with ${project.stage}-stage startups`);
    reasons.push(`${free} of ${capacity} mentoring slot(s) free`);
    ranked.push({ mentorUserId: id, name, email: mentor.email, score, breakdown: { expertise: expertisePoints, stage: stagePoints, capacity: capacityPoints }, reasons, capacity, load });
  }
  ranked.sort((a, b) => b.score - a.score || a.load - b.load || a.name.localeCompare(b.name));
  const eligible = (c) => c.score >= cfg.minScore && c.breakdown.expertise > 0; // free capacity alone never makes a mentor a match
  return { candidates: ranked.filter(eligible).slice(0, cfg.maxCandidates), belowThreshold: ranked.filter((c) => !eligible(c)), excluded };
}

/** Current mentoring load per mentor: confirmed startups plus mentors who accepted and await confirmation. */
async function mentorLoads(excludeProjectId) {
  const confirmed = await FacultyProject.find({ mentorUserId: { $ne: null } }).select('id mentorUserId').lean();
  const reserved = await MentorRequest.find({ status: 'accepted' }).select('projectId mentorUserId').lean();
  const loads = {};
  confirmed.filter((p) => p.id !== excludeProjectId).forEach((p) => { loads[String(p.mentorUserId)] = (loads[String(p.mentorUserId)] || 0) + 1; });
  const confirmedProjects = new Set(confirmed.map((p) => p.id));
  reserved.filter((r) => r.projectId !== excludeProjectId && !confirmedProjects.has(r.projectId)).forEach((r) => { loads[String(r.mentorUserId)] = (loads[String(r.mentorUserId)] || 0) + 1; });
  return loads;
}

async function activeMentors() {
  return User.find({ role: 'mentor', status: 'active', isSoftDeleted: { $ne: true } }).select('_id name email profile').lean();
}

// ---------------------------------------------------------------------------
// Event entry points
// ---------------------------------------------------------------------------

/** An application was approved by a human: make sure the startup exists and begin matching. */
async function onApproved(event) {
  const applicationId = event.applicationId || event.aggregateId;
  const reviewer = String(event.actorId || '');
  const ctx = makeCtx(AGENT, { event, applicationId, projectId: applicationId });
  // Integrity guard: only a human reviewer's decision may start formal allocation work.
  if (!reviewer || reviewer === 'system' || reviewer.startsWith('agent:')) {
    await note({ ...ctx, action: 'mentor.request', status: 'blocked', summary: `${AGENT} did not start mentor matching: the approval was not recorded by an authorised person.`, audience: { userIds: [], roles: ['super_admin'] } });
    return null;
  }
  const app = await py.getApplication(applicationId, py.agentActor('mentor-matching'));
  const project = await ensureProject({ applicationId, startup: app.startup, applicantId: app.applicantId, form: app.formData || {} });
  const { job } = await jobs.enqueue({
    type: JOB_TYPE, agent: AGENT, dedupeKey: `${JOB_TYPE}:${project.id}`, correlationId: event.correlationId, triggerEvent: event.eventType,
    applicationId, projectId: project.id, subjectType: 'project', subjectId: project.id, data: { phase: 'start', index: 0, tried: [] },
  });
  return job;
}

/** A mentor answered a request (called by the mentor-facing API). */
async function respond({ requestId, user, decision, note: text = '' }) {
  const request = await MentorRequest.findOne({ _id: requestId }).lean();
  if (!request) throw Object.assign(new Error('This mentoring request was not found.'), { status: 404 });
  if (String(request.mentorUserId) !== String(user.id) && user.role !== 'super_admin') throw Object.assign(new Error('This request was sent to a different mentor.'), { status: 403 });
  if (request.status !== 'pending') throw Object.assign(new Error(`This request was already ${request.status.replace('_', ' ')}.`), { status: 409 });
  if (new Date(request.dueAt) < new Date()) throw Object.assign(new Error('This request has expired. The coordinator will be in touch if it is still needed.'), { status: 410 });
  const status = decision === 'accept' ? 'accepted' : 'declined';
  const updated = await MentorRequest.findOneAndUpdate({ _id: request._id, status: 'pending' }, { $set: { status, respondedAt: new Date(), responseNote: String(text).slice(0, 500) } }, { returnDocument: 'after' }).lean();
  if (!updated) throw Object.assign(new Error('This request was just answered.'), { status: 409 });
  const ctx = makeCtx(AGENT, { trigger: { type: 'user', ref: String(user.id) }, projectId: request.projectId, applicationId: request.applicationId });
  await note({ ...ctx, action: 'mentor.request', status: 'success', tool: 'mentor_response', summary: `${cleanName(user.name || request.mentorName)} ${status === 'accepted' ? 'accepted' : 'declined'} the request to mentor ${request.projectTitle}${text ? ` - "${String(text).slice(0, 100)}"` : ''}.`, audience: { userIds: [], roles: ['faculty', 'admin'] }, projectId: request.projectId });
  await emit(status === 'accepted' ? 'mentor.accepted' : 'mentor.declined', { aggregateId: request.projectId, projectId: request.projectId, applicationId: request.applicationId, actorId: String(user.id), payload: { mentorUserId: request.mentorUserId, requestId: String(request._id) }, dedupe: String(request._id) });
  if (request.jobId) await jobs.signal(request.jobId, status, { requestId: String(request._id) });
  return updated;
}

// ---------------------------------------------------------------------------
// The job
// ---------------------------------------------------------------------------

async function coordinatorFor(project) {
  const id = project.coordinatorUserId;
  if (!id) return { userIds: [], names: [] };
  const user = await User.findById(String(id)).select('_id name').lean();
  return { userIds: user ? [String(user._id)] : [], names: user ? [cleanName(user.name)] : [] };
}

async function escalate(ctx, { project, reason, tried, excluded, now }) {
  const coord = await coordinatorFor(project);
  await runAction({
    agent: AGENT, action: 'escalation.raise', tool: 'notify', trigger: ctx.trigger, correlationId: ctx.correlationId, jobId: ctx.jobId, projectId: project.id, applicationId: project.applicationId,
    audience: { userIds: coord.userIds, roles: ['admin'] }, idempotencyKey: `mentor:${project.id}:escalate:${tried.length}`, inputSummary: reason,
    exec: async () => {
      await notify(ctx, {
        key: `mentor:${project.id}:escalate-notice:${tried.length}`, userIds: coord.userIds, roles: ['admin'], title: `No mentor found yet for ${project.title}`,
        message: `${reason} ${tried.length ? `Mentors already asked: ${tried.map((t) => `${t.name} (${t.outcome})`).join(', ')}.` : ''} Please choose a mentor manually or add mentors with matching expertise.`,
        link: '/workspace/faculty', kind: 'escalation', severity: 'warning', projectId: project.id,
        logSummary: `${AGENT} told the coordinator it could not find a mentor for ${project.title}.`,
      });
      return { result: { reason, tried, excluded: (excluded || []).slice(0, 10) }, summary: `${AGENT} escalated ${project.title} to the coordinator: ${reason}`, followUp: 'A person needs to choose a mentor or add mentor profiles.' };
    },
  });
  return { state: 'escalated', step: 'needs_human', data: { phase: 'escalated' }, note: reason };
}

async function requestNext(ctx, job, project, candidates, tried, now, cfg) {
  const index = (job.data.index || 0);
  const candidate = candidates[index];
  if (!candidate) return null;
  const dueAt = new Date(now.getTime() + cfg.mentor.responseWindowMs);
  let request = await MentorRequest.findOne({ projectId: project.id, mentorUserId: candidate.mentorUserId }).lean();
  if (!request) {
    request = await MentorRequest.create({
      projectId: project.id, applicationId: project.applicationId, projectTitle: project.title, mentorUserId: candidate.mentorUserId, mentorName: candidate.name,
      mentorEmail: candidate.email || '', rank: index + 1, score: candidate.score, reasons: candidate.reasons, requestedAt: now, dueAt, jobId: String(job._id),
    });
  }
  const plainRequest = typeof request.toObject === 'function' ? request.toObject() : request;
  await runAction({
    agent: AGENT, action: 'mentor.request', tool: 'notify', trigger: ctx.trigger, correlationId: ctx.correlationId, jobId: ctx.jobId, projectId: project.id, applicationId: project.applicationId,
    audience: { userIds: [candidate.mentorUserId], roles: ['faculty'] }, idempotencyKey: `mentor:${project.id}:request:${candidate.mentorUserId}`, inputSummary: `${candidate.name} (score ${candidate.score})`,
    exec: async () => {
      await notify(ctx, {
        key: `mentor:${project.id}:request-notice:${candidate.mentorUserId}`, userIds: [candidate.mentorUserId], title: `Mentoring request: ${project.title}`,
        message: `${project.title} (${project.domain}, ${project.stage}) would like you as their mentor. Why you: ${candidate.reasons[0]}. Please accept or decline within ${Math.round(cfg.mentor.responseWindowMs / 86400000)} days.`,
        link: '/workspace/mentor/dashboard', kind: 'mentor_request', severity: 'action', projectId: project.id, action: 'mentor.request',
        logSummary: `${AGENT} sent ${candidate.name} a mentoring request for ${project.title}.`,
      });
      await emit('mentor.requested', { aggregateId: project.id, projectId: project.id, applicationId: project.applicationId, payload: { mentorUserId: candidate.mentorUserId, requestId: String(plainRequest._id) }, dedupe: candidate.mentorUserId, correlationId: ctx.correlationId });
      return { result: { requestId: String(plainRequest._id), mentor: candidate.name, rank: index + 1, dueAt }, summary: `${AGENT} asked ${candidate.name} (best available match, ${candidate.score}/100) to mentor ${project.title}.`, followUp: `Waiting for a reply until ${dueAt.toISOString().slice(0, 10)}.` };
    },
  });
  return {
    state: 'waiting_for_reply', step: 'awaiting_mentor', nextRunAt: new Date(new Date(plainRequest.requestedAt).getTime() + cfg.mentor.responseWindowMs / 2), timeoutAt: new Date(plainRequest.dueAt),
    data: { index, currentRequestId: String(plainRequest._id), nudgedAt: null, tried },
    note: `Asked ${candidate.name}.`,
  };
}

async function propose(ctx, job, project, request, candidate, tried, candidates, now) {
  const coord = await coordinatorFor(project);
  const run = await MentorMatchingRun.create({
    id: `mm-run-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`, executionIdempotencyKey: `mentor-agent:${project.id}:${request.mentorUserId}`, projectId: project.id, projectTitle: project.title,
    domain: project.domain, stage: project.stage, challenges: project.description || '', requestedExpertise: [project.domain],
    evaluatedMentorsCount: candidates.length,
    recommendations: [{ mentor_id: candidate.mentorUserId, name: candidate.name, email: candidate.email || '', domain: project.domain, match_score: candidate.score, score_breakdown: { domain_match: candidate.breakdown.expertise, skills_match: candidate.breakdown.stage, availability: candidate.breakdown.capacity }, explanation: `${candidate.reasons.join('. ')}. The mentor has accepted this request.`, current_load: candidate.load, max_load: candidate.capacity }],
    coordinatorDecision: { status: 'pending' },
  });
  const { approval } = await approvals.request({
    type: 'mentor_allocation', action: 'mentor.confirm_allocation', title: `Confirm mentor for ${project.title}: ${candidate.name}`,
    summary: `${candidate.name} has accepted the request. The Mentor-Matching Agent proposes this allocation for your approval.`,
    requestedBy: AGENT, assignedRoles: ['faculty'], assignedUserIds: coord.userIds, projectId: project.id, applicationId: project.applicationId, subjectId: project.id, jobId: job._id, correlationId: ctx.correlationId, trigger: ctx.trigger,
    evidence: {
      mentor: { userId: candidate.mentorUserId, name: candidate.name, score: candidate.score, breakdown: candidate.breakdown, reasons: candidate.reasons },
      startup: { id: project.id, title: project.title, domain: project.domain, stage: project.stage },
      attempts: tried, alternatives: candidates.filter((c) => c.mentorUserId !== candidate.mentorUserId).slice(0, 3).map((c) => ({ name: c.name, score: c.score })), runId: run.id || run._id,
    },
    payload: { projectId: project.id, mentorUserId: candidate.mentorUserId, mentorName: candidate.name, runId: run.id || String(run._id), requestId: String(request._id) },
  });
  await emit('allocation.proposed', { aggregateId: project.id, projectId: project.id, applicationId: project.applicationId, payload: { mentorUserId: candidate.mentorUserId }, dedupe: candidate.mentorUserId, correlationId: ctx.correlationId });
  await notify(ctx, {
    key: `mentor:${project.id}:proposal-notice:${candidate.mentorUserId}`, userIds: coord.userIds, title: `Approve mentor allocation: ${project.title}`,
    message: `${candidate.name} accepted. ${tried.filter((t) => t.outcome !== 'accepted').length ? `Earlier candidates: ${tried.filter((t) => t.outcome !== 'accepted').map((t) => `${t.name} (${t.outcome})`).join(', ')}. ` : ''}Review and confirm.`,
    link: '/workspace/faculty', kind: 'approval', severity: 'action', projectId: project.id, logSummary: `${AGENT} asked the coordinator to confirm ${candidate.name} as mentor of ${project.title}.`,
  });
  return { state: 'waiting_for_approval', step: 'awaiting_allocation', nextRunAt: new Date(now.getTime() + getConfig().approvals.staleAfterMs), data: { approvalId: String(approval._id), currentRequestId: String(request._id) }, note: `Proposed ${candidate.name} for approval.` };
}

async function handleMatching(job, { now, config }) {
  const ctx = makeCtx(AGENT, { job });
  const data = job.data || {};
  const signals = (data.signals || []).map((s) => s.name);
  const project = await FacultyProject.findOne({ id: job.projectId }).lean();
  if (!project) return { state: 'failed', note: 'The startup record no longer exists.' };
  const tried = [...(data.tried || [])];

  // Mentor was confirmed (possibly through another screen) - nothing more to do.
  if (project.mentorUserId && signals.includes('allocation_confirmed')) return { state: 'done', step: 'allocated' };
  if (signals.includes('allocation_confirmed')) return { state: 'done', step: 'allocated' };

  // Starting out: rank real mentors and ask the best one.
  if (!data.candidates) {
    const mentors = await activeMentors();
    const loads = await mentorLoads(project.id);
    const ranking = rankMentors({ project, mentors, loads, cfg: config.mentor });
    await note({ ...ctx, action: 'mentor.request', tool: 'rank_mentors', status: 'success', projectId: project.id, summary: `${AGENT} ranked ${ranking.candidates.length} eligible mentor(s) for ${project.title} (${ranking.excluded.length} excluded for capacity or availability).`, audience: { userIds: [], roles: ['faculty', 'admin'] } });
    if (!ranking.candidates.length) {
      return escalate(ctx, { project, tried, excluded: ranking.excluded, now, reason: mentors.length ? 'No mentor with matching expertise and free capacity was found.' : 'There are no active mentor accounts yet.' });
    }
    const first = await requestNext(ctx, { ...job, data: { ...data, index: 0 } }, project, ranking.candidates, tried, now, config);
    return { ...first, data: { ...first.data, candidates: ranking.candidates, excluded: ranking.excluded } };
  }

  const candidates = data.candidates;
  const current = data.currentRequestId ? await MentorRequest.findOne({ _id: data.currentRequestId }).lean() : null;

  // The coordinator rejected the proposal: ask the next mentor.
  if (signals.includes('allocation_rejected')) {
    if (current) tried.push({ name: current.mentorName, outcome: 'not confirmed by the coordinator' });
    return advance(ctx, job, project, candidates, tried, now, config, data.index + 1);
  }
  if (current && (current.status === 'accepted' || signals.includes('accepted')) && job.previousState !== 'waiting_for_approval') {
    const candidate = candidates.find((c) => c.mentorUserId === String(current.mentorUserId)) || { mentorUserId: String(current.mentorUserId), name: current.mentorName, score: current.score, reasons: current.reasons, breakdown: { expertise: 0, stage: 0, capacity: 0 }, capacity: 0, load: 0 };
    tried.push({ name: current.mentorName, outcome: 'accepted' });
    return propose(ctx, job, project, current, candidate, tried, candidates, now);
  }
  if (job.previousState === 'waiting_for_approval' && !signals.length) {
    // The proposal is still waiting for the coordinator: nudge, then keep waiting.
    const coord = await coordinatorFor(project);
    await notify(ctx, { key: `mentor:${project.id}:proposal-nudge:${Math.floor(now.getTime() / config.approvals.staleAfterMs)}`, userIds: coord.userIds, title: `Still waiting: mentor for ${project.title}`, message: 'A mentor has accepted and is waiting for your confirmation.', link: '/workspace/faculty', kind: 'reminder', severity: 'action', projectId: project.id, action: 'notification.send', logSummary: `${AGENT} reminded the coordinator about the pending mentor confirmation for ${project.title}.` });
    return { state: 'waiting_for_approval', step: 'awaiting_allocation', nextRunAt: new Date(now.getTime() + config.approvals.staleAfterMs) };
  }

  if (current && (current.status === 'declined' || signals.includes('declined'))) {
    tried.push({ name: current.mentorName, outcome: 'declined' });
    return advance(ctx, job, project, candidates, tried, now, config, data.index + 1);
  }

  // Timer wake-up while a request is outstanding.
  if (current && current.status === 'pending') {
    const due = new Date(current.dueAt).getTime();
    if (now.getTime() >= due) {
      await MentorRequest.findOneAndUpdate({ _id: current._id, status: 'pending' }, { $set: { status: 'timed_out', respondedAt: now } }, { returnDocument: 'after' });
      await emit('mentor.timed_out', { aggregateId: project.id, projectId: project.id, applicationId: project.applicationId, payload: { mentorUserId: String(current.mentorUserId) }, dedupe: String(current._id), correlationId: ctx.correlationId });
      await note({ ...ctx, action: 'mentor.request', status: 'success', projectId: project.id, summary: `${current.mentorName} did not reply to the request for ${project.title} in time; the request was closed.`, audience: { userIds: [], roles: ['faculty', 'admin'] } });
      tried.push({ name: current.mentorName, outcome: 'no reply' });
      return advance(ctx, job, project, candidates, tried, now, config, data.index + 1);
    }
    const half = new Date(current.requestedAt).getTime() + config.mentor.responseWindowMs / 2;
    if (!data.nudgedAt && now.getTime() >= half) {
      await notify(ctx, { key: `mentor:${project.id}:nudge:${current.mentorUserId}`, userIds: [String(current.mentorUserId)], title: `Reminder: mentoring request for ${project.title}`, message: 'This request is still open. Please accept or decline so the founders are not left waiting.', link: '/workspace/mentor/dashboard', kind: 'reminder', severity: 'action', projectId: project.id, action: 'mentor.nudge', logSummary: `${AGENT} nudged ${current.mentorName} about the open request for ${project.title}.` });
      return { state: 'waiting_for_reply', step: 'awaiting_mentor', nextRunAt: new Date(due), data: { nudgedAt: now.toISOString() } };
    }
    return { state: 'waiting_for_reply', step: 'awaiting_mentor', nextRunAt: new Date(data.nudgedAt ? due : half) };
  }
  return advance(ctx, job, project, candidates, tried, now, config, (data.index || 0) + 1);
}

async function advance(ctx, job, project, candidates, tried, now, config, nextIndex) {
  if (nextIndex >= candidates.length) {
    return escalate(ctx, { project, tried, excluded: job.data.excluded, now, reason: `All ${candidates.length} eligible mentor(s) were asked and none could be confirmed.` });
  }
  const next = await requestNext(ctx, { ...job, data: { ...job.data, index: nextIndex } }, project, candidates, tried, now, config);
  return { ...next, data: { ...next.data, index: nextIndex, tried } };
}

// ---------------------------------------------------------------------------
// Coordinator approval (Tier 3)
// ---------------------------------------------------------------------------

approvals.registerApprovalHandler('mentor_allocation', {
  async approve(approval, user) {
    const { projectId, mentorUserId, mentorName, runId, requestId } = approval.payload;
    const project = await FacultyProject.findOne({ id: projectId }).lean();
    const ctx = makeCtx(AGENT, { trigger: { type: 'user', ref: String(user.id) }, projectId, applicationId: approval.applicationId, correlationId: approval.correlationId });
    await runAction({
      agent: AGENT, action: 'mentor.confirm_allocation', tool: 'confirm_allocation', trigger: ctx.trigger, correlationId: ctx.correlationId, projectId, applicationId: approval.applicationId, approvalId: approval._id,
      audience: { userIds: [mentorUserId, project?.ownerUserId].filter(Boolean), roles: ['faculty', 'admin'] }, idempotencyKey: `allocation:${projectId}:${mentorUserId}`, inputSummary: `${mentorName} -> ${project?.title}`,
      summary: `${user.name || 'The coordinator'} confirmed ${mentorName} as mentor of ${project?.title || projectId}.`,
      exec: async () => {
        await FacultyProject.updateOne({ id: projectId }, { $set: { allocatedMentorName: mentorName, mentorUserId } });
        const existing = await MentorAllocation.findOne({ projectId }).lean();
        const fields = { status: 'approved', allocatedMentorName: mentorName, allocatedMentorUserId: mentorUserId, coordinatorComment: approval.decisionComment || 'Confirmed by the coordinator.', recommendedMentorName: mentorName };
        if (existing) await MentorAllocation.updateOne({ projectId }, { $set: fields });
        else await MentorAllocation.create({ id: `alloc-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`, projectId, projectTitle: project?.title || '', studentName: project?.leadStudent || '', domain: project?.domain || '', justification: 'Allocated by the Mentor-Matching Agent after the mentor accepted.', ...fields });
        if (runId) await MentorMatchingRun.updateOne({ id: runId }, { $set: { 'coordinatorDecision.status': 'approved', 'coordinatorDecision.selectedMentorId': mentorUserId, 'coordinatorDecision.selectedMentorName': mentorName, 'coordinatorDecision.decidedBy': user.name || String(user.id), 'coordinatorDecision.decidedAt': new Date(), 'coordinatorDecision.comments': approval.decisionComment || '' } });
        await MentorRequest.updateMany({ projectId, status: 'pending' }, { $set: { status: 'withdrawn' } });
        await emit('allocation.confirmed', { aggregateId: projectId, projectId, applicationId: approval.applicationId, actorId: String(user.id), payload: { mentorUserId, mentorName }, dedupe: mentorUserId, correlationId: approval.correlationId });
        await notify(ctx, { key: `allocation:${projectId}:notice`, userIds: [mentorUserId, project?.ownerUserId].filter(Boolean), title: `Mentor confirmed for ${project?.title}`, message: `${mentorName} is now the mentor of ${project?.title}. The onboarding meeting is being arranged.`, link: '/workspace/student/dashboard', kind: 'status', projectId, logSummary: `${AGENT} told the founders and the mentor that the allocation is confirmed.` });
        return { result: { projectId, mentorUserId } };
      },
    });
    if (approval.jobId) await jobs.signal(approval.jobId, 'allocation_confirmed', {});
  },
  async reject(approval, user) {
    const { projectId, mentorName, runId } = approval.payload;
    if (runId) await MentorMatchingRun.updateOne({ id: runId }, { $set: { 'coordinatorDecision.status': 'rejected', 'coordinatorDecision.decidedBy': user.name || String(user.id), 'coordinatorDecision.decidedAt': new Date(), 'coordinatorDecision.comments': approval.decisionComment || '' } });
    await note({ agent: AGENT, action: 'mentor.propose_allocation', status: 'success', trigger: { type: 'user', ref: String(user.id) }, projectId, summary: `${user.name || 'The coordinator'} did not confirm ${mentorName}; ${AGENT} will ask the next candidate.`, audience: { userIds: [], roles: ['faculty', 'admin'] } });
    if (approval.jobId) await jobs.signal(approval.jobId, 'allocation_rejected', {});
  },
});

jobs.registerJobHandler(JOB_TYPE, handleMatching);

module.exports = { onApproved, respond, handleMatching, rankMentors, mentorLoads, JOB_TYPE };
