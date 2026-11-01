const User = require('../../models/User');
const StartupProfile = require('../../models/StartupProfile');
const FacultyProject = require('../../models/FacultyProject');
const InvestorIntroduction = require('../../models/InvestorIntroduction');
const jobs = require('../jobs');
const approvals = require('../approvals');
const { runAction, note } = require('../actionLog');
const { getConfig } = require('../config');
const py = require('../pythonClient');
const { emit } = require('../events');
const { cleanName } = require('../projects');
const { notify } = require('../tools/notify');
const { findSlotsLogged } = require('../tools/slots');
const { scheduleMeeting } = require('../tools/calendar');
const { generateDocument } = require('../tools/documents');
const { formatLocal } = require('../time');
const { makeCtx, AGENTS } = require('./context');
const { evaluateProject } = require('./monitoringAgent');

const AGENT = AGENTS.investor;
const JOB_TYPE = 'investor.introduction';
const DAY = 24 * 60 * 60 * 1000;

function words(value) {
  return String(Array.isArray(value) ? value.join(' ') : value || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((w) => w.length > 2);
}

// ---------------------------------------------------------------------------
// Readiness and matching (pure parts are unit-tested)
// ---------------------------------------------------------------------------
function readiness(project, { progress, overdueMilestones = 0, stalled = false }, cfg = getConfig().investor) {
  const checks = [
    { ok: Boolean(project.mentorUserId), label: 'A mentor is confirmed' },
    { ok: (progress ?? 0) >= cfg.minProgress, label: `Progress is at least ${cfg.minProgress}% (now ${progress ?? 'not tracked'}%)` },
    { ok: (project.trl || 0) >= cfg.minTrl, label: `Technology readiness is at least TRL ${cfg.minTrl} (now ${project.trl || 0})` },
    { ok: overdueMilestones <= cfg.maxOverdueMilestones, label: `No more than ${cfg.maxOverdueMilestones} overdue milestone(s)` },
    { ok: !stalled, label: 'The startup is not currently flagged as stalled' },
  ];
  return { ready: checks.every((c) => c.ok), checks };
}

/** Sector overlap (60) plus stage fit (40) against verified investors' own profiles. */
function matchInvestors(startup, investors, cfg = getConfig().investor) {
  const wanted = new Set([...words(startup.sector), ...words(startup.tags)]);
  const stage = String(startup.stage || '').toLowerCase();
  return investors
    .map((inv) => {
      const profile = inv.profile || {};
      const sectors = new Set(words(profile.sectors));
      const overlap = [...wanted].filter((w) => sectors.has(w));
      const sectorPoints = wanted.size ? Math.round(Math.min(1, overlap.length / Math.min(wanted.size, 2)) * 60) : 0;
      const stageFit = (profile.stages || []).some((s) => String(s).toLowerCase() === stage || String(s).toLowerCase().replace(/\s/g, '_') === stage);
      const score = sectorPoints + (stageFit ? 40 : 0);
      const reasons = [];
      if (overlap.length) reasons.push(`Invests in ${overlap.join(', ')}`);
      if (stageFit) reasons.push(`Invests at the ${startup.stage} stage`);
      return { investorUserId: String(inv._id), name: cleanName(inv.name), fund: profile.fundName || null, score, reasons };
    })
    .filter((m) => m.score >= cfg.minMatchScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, cfg.maxMatches);
}

// ---------------------------------------------------------------------------
// Scheduled sweep: find startups that became ready and start an introduction job per good match
// ---------------------------------------------------------------------------
async function sweep({ now = new Date() } = {}) {
  const cfg = getConfig().investor;
  const profiles = await StartupProfile.find({ isApproved: true, status: 'active' }).lean();
  const investors = await User.find({ role: 'investor', status: 'active', isInvestorVerified: true, isSoftDeleted: { $ne: true } }).select('_id name email profile').lean();
  const report = { checked: 0, ready: 0, introductions: 0 };
  for (const startup of profiles) {
    const project = await FacultyProject.findOne({ id: startup.applicationId }).lean();
    if (!project || !project.ownerUserId) continue;
    report.checked += 1;
    const evaluation = await evaluateProject(project, now);
    const milestoneProgress = evaluation.milestones?.length
      ? Math.round(evaluation.milestones.reduce((sum, m) => sum + (m.completionPct || 0), 0) / evaluation.milestones.length)
      : project.progress;
    const overdue = evaluation.milestones ? evaluation.milestones.filter((m) => m.state === 'overdue').length : 0;
    const verdict = readiness(project, { progress: milestoneProgress, overdueMilestones: overdue, stalled: evaluation.stalled }, cfg);
    if (!verdict.ready) continue;
    report.ready += 1;
    const ctx = makeCtx(AGENT, { trigger: { type: 'schedule', ref: 'investor.sweep' }, projectId: project.id, applicationId: project.applicationId });
    await runAction({
      agent: AGENT, action: 'investor.build_profile', tool: 'update_profile', trigger: ctx.trigger, projectId: project.id, applicationId: project.applicationId, audience: { userIds: [String(project.ownerUserId)], roles: ['admin'] },
      idempotencyKey: `profile:${project.id}:${Math.floor(now.getTime() / (7 * DAY))}`, inputSummary: `progress ${milestoneProgress}`,
      exec: async () => {
        const facts = [];
        if (evaluation.milestones?.length) facts.push(`${evaluation.milestones.filter((m) => m.state === 'completed').length} of ${evaluation.milestones.length} milestones completed`);
        facts.push(`${evaluation.meetings.filter((m) => m.outcome === 'held').length} mentor meeting(s) held`);
        if (project.mentorUserId) facts.push('mentor confirmed');
        await StartupProfile.updateOne({ _id: startup._id }, { $set: { readinessScore: Math.min(100, Math.round(milestoneProgress ?? 0)), tractionSummary: facts.join('; ') } });
        return { result: { readinessScore: milestoneProgress, tractionSummary: facts.join('; ') }, summary: `${AGENT} updated the investor profile of ${project.title} from verified progress (${facts.join('; ')}).` };
      },
    });
    const matches = matchInvestors(startup, investors, cfg);
    await note({ ...ctx, action: 'investor.find_matches', status: 'success', tool: 'match_investors', summary: `${AGENT} found ${matches.length} suitable verified investor(s) for ${project.title}.`, audience: { userIds: [String(project.ownerUserId)], roles: ['admin'] } });
    for (const match of matches) {
      const { created } = await jobs.enqueue({
        type: JOB_TYPE, agent: AGENT, dedupeKey: `${JOB_TYPE}:${project.id}:${match.investorUserId}`, applicationId: project.applicationId, projectId: project.id, subjectType: 'introduction',
        subjectId: `${project.id}:${match.investorUserId}`, triggerEvent: 'schedule.investor', data: { stage: 'draft', match, startupProfileId: String(startup._id) },
      });
      if (created) report.introductions += 1;
    }
  }
  return report;
}

// ---------------------------------------------------------------------------
// API entry points
// ---------------------------------------------------------------------------
async function founderConsent({ introId, user, grant }) {
  const intro = await InvestorIntroduction.findOne({ _id: introId }).lean();
  if (!intro || intro.origin !== 'agent') throw Object.assign(new Error('This introduction was not found.'), { status: 404 });
  if (String(intro.founderId) !== String(user.id)) throw Object.assign(new Error('Only the founder can answer this request.'), { status: 403 });
  if (intro.founderConsent.status !== 'pending') throw Object.assign(new Error(`You already answered this request (${intro.founderConsent.status}).`), { status: 409 });
  await InvestorIntroduction.updateOne({ _id: intro._id }, { $set: { 'founderConsent.status': grant ? 'granted' : 'declined', 'founderConsent.at': new Date(), ...(grant ? {} : { status: 'cancelled' }) } });
  if (intro.jobId) await jobs.signal(intro.jobId, grant ? 'consent_granted' : 'consent_declined', {});
  await emit('intro.consented', { aggregateId: String(intro._id), projectId: String(intro.startupId), actorId: String(user.id), payload: { granted: grant }, dedupe: grant ? 'yes' : 'no' }).catch(() => null);
  return { introId: String(intro._id), consent: grant ? 'granted' : 'declined' };
}

async function investorRespond({ introId, user, accept }) {
  const intro = await InvestorIntroduction.findOne({ _id: introId }).lean();
  if (!intro || intro.origin !== 'agent') throw Object.assign(new Error('This introduction was not found.'), { status: 404 });
  if (String(intro.investorId) !== String(user.id)) throw Object.assign(new Error('This introduction was sent to a different investor.'), { status: 403 });
  if (intro.status !== 'approved') throw Object.assign(new Error('This introduction is not open for a response.'), { status: 409 });
  await InvestorIntroduction.updateOne({ _id: intro._id }, { $set: { investorResponse: accept ? 'accepted' : 'declined', ...(accept ? {} : { status: 'declined' }) } });
  if (intro.jobId) await jobs.signal(intro.jobId, accept ? 'investor_accepted' : 'investor_declined', {});
  return { introId: String(intro._id), response: accept ? 'accepted' : 'declined' };
}

async function submitFeedback({ introId, user, rating, comment }) {
  const intro = await InvestorIntroduction.findOne({ _id: introId }).lean();
  if (!intro || intro.origin !== 'agent') throw Object.assign(new Error('This introduction was not found.'), { status: 404 });
  const party = String(intro.investorId) === String(user.id) ? 'investor' : String(intro.founderId) === String(user.id) ? 'founder' : null;
  if (!party) throw Object.assign(new Error('Only the investor or the founder can leave feedback.'), { status: 403 });
  if (!['scheduled', 'approved', 'accepted'].includes(intro.status) || !intro.meetingId) throw Object.assign(new Error('Feedback opens once the meeting has been arranged.'), { status: 409 });
  if ((intro.feedback || []).some((f) => f.byUserId === String(user.id))) throw Object.assign(new Error('You already left feedback for this introduction.'), { status: 409 });
  await InvestorIntroduction.updateOne({ _id: intro._id }, { $push: { feedback: { byUserId: String(user.id), byRole: party, rating: Math.max(1, Math.min(5, Number(rating) || 3)), comment: String(comment || '').slice(0, 1000), at: new Date() } } });
  if (intro.jobId) await jobs.signal(intro.jobId, 'feedback', { party });
  return { introId: String(intro._id), recorded: true };
}

// ---------------------------------------------------------------------------
// The job (one per startup/investor pair)
// ---------------------------------------------------------------------------
async function handleIntroduction(job, { now, config }) {
  const cfg = config.investor;
  const ctx = makeCtx(AGENT, { job });
  const data = job.data || {};
  const signals = (data.signals || []).map((s) => s.name);
  const project = await FacultyProject.findOne({ id: job.projectId }).lean();
  const startup = await StartupProfile.findOne({ _id: data.startupProfileId }).lean();
  if (!project || !startup) return { state: 'failed', note: 'The startup record no longer exists.' };
  const founderId = String(project.ownerUserId);
  const investor = await User.findById(data.match.investorUserId).select('_id name email profile').lean();
  if (!investor) return { state: 'failed', note: 'The investor account no longer exists.' };
  let intro = data.introId ? await InvestorIntroduction.findOne({ _id: data.introId }).lean() : null;

  // ---- 1. Draft the introduction and ask the founder for consent --------------------------------
  if (data.stage === 'draft') {
    const draft = await generateDocument(ctx, {
      key: `intro-draft:${job._id}`, kind: 'intro_draft', title: `Introduction draft - ${startup.name} to ${cleanName(investor.name)}`, projectId: project.id,
      audience: { userIds: [founderId], roles: ['admin'] },
      data: { startupName: startup.name, investorName: cleanName(investor.name), fit: data.match.reasons, summary: `${startup.tagline}\n\nSector: ${startup.sector} | Stage: ${startup.stage}${startup.tractionSummary ? `\nProgress: ${startup.tractionSummary}` : ''}`, ask: 'A 30-minute introductory conversation.' },
    });
    intro = await InvestorIntroduction.create({
      investorId: investor._id, startupId: startup._id, founderId: project.ownerUserId, type: 'meeting_request',
      message: `${startup.name} (${startup.sector}, ${startup.stage}) would like to be introduced to you. ${startup.tagline}`.slice(0, 1900).padEnd(20, '.'),
      status: 'awaiting_founder_consent', origin: 'agent', founderConsent: { status: 'pending' }, matchScore: data.match.score, matchReasons: data.match.reasons, draftDocumentId: draft.result?.documentId || null, jobId: String(job._id),
    });
    await emit('investor.match_found', { aggregateId: project.id, projectId: project.id, applicationId: project.applicationId, payload: { investorUserId: data.match.investorUserId }, dedupe: data.match.investorUserId, correlationId: ctx.correlationId });
    await emit('intro.requested', { aggregateId: String(intro._id), projectId: project.id, payload: { investorUserId: data.match.investorUserId }, dedupe: 'once', correlationId: ctx.correlationId });
    await runAction({
      agent: AGENT, action: 'investor.request_consent', tool: 'notify', trigger: ctx.trigger, correlationId: ctx.correlationId, jobId: ctx.jobId, projectId: project.id, applicationId: project.applicationId,
      audience: { userIds: [founderId], roles: [] }, idempotencyKey: `consent:${job._id}`, inputSummary: `${cleanName(investor.name)} (${data.match.score}/100)`,
      exec: async () => {
        await notify(ctx, {
          key: `consent-notice:${job._id}`, userIds: [founderId], title: `May we introduce ${startup.name} to ${cleanName(investor.name)}?`,
          message: `${data.match.reasons.join('; ')}. Nothing is shared with the investor until you agree and an administrator approves. You can say yes or no from your dashboard.`, link: '/workspace/student/dashboard', kind: 'consent', severity: 'action', projectId: project.id, action: 'investor.request_consent',
        });
        return { result: { introId: String(intro._id) }, summary: `${AGENT} asked the founders of ${startup.name} for consent to be introduced to ${cleanName(investor.name)}; nothing has been shared.`, followUp: `Waiting for the founders' answer for up to ${Math.round(cfg.consentWaitMs / DAY)} days.` };
      },
    });
    return { state: 'waiting_for_reply', step: 'awaiting_consent', nextRunAt: new Date(now.getTime() + cfg.consentWaitMs / 2), timeoutAt: new Date(now.getTime() + cfg.consentWaitMs), data: { stage: 'awaiting_consent', introId: String(intro._id), requestedAt: now.toISOString(), reminded: false } };
  }

  // ---- 2. Waiting for the founder ---------------------------------------------------------------
  if (data.stage === 'awaiting_consent') {
    if (signals.includes('consent_declined')) {
      await note({ ...ctx, action: 'investor.request_consent', status: 'success', projectId: project.id, summary: `The founders of ${startup.name} declined the introduction to ${cleanName(investor.name)}; nothing was shared.`, audience: { userIds: [founderId], roles: ['admin'] } });
      return { state: 'done', step: 'consent_declined' };
    }
    if (signals.includes('consent_granted')) {
      const { approval } = await approvals.request({
        type: 'investor_intro', action: 'investor.send_introduction', title: `Approve introduction: ${startup.name} to ${cleanName(investor.name)}`,
        summary: `The founders consented. The Investor Agent drafted an introduction based on a ${data.match.score}/100 match.`, requestedBy: AGENT, assignedRoles: ['admin'], projectId: project.id, applicationId: project.applicationId, subjectId: String(intro._id), jobId: job._id, correlationId: ctx.correlationId, trigger: ctx.trigger,
        evidence: { match: data.match, startup: { name: startup.name, sector: startup.sector, stage: startup.stage, tagline: startup.tagline, tractionSummary: startup.tractionSummary }, founderConsent: 'granted', draftDocumentId: intro.draftDocumentId, willBeShared: ['Startup name, sector, stage and tagline', 'Progress summary', 'Founder contact only after the investor accepts'] },
        payload: { introId: String(intro._id), investorUserId: String(investor._id), projectId: project.id },
      });
      await InvestorIntroduction.updateOne({ _id: intro._id }, { $set: { status: 'pending_admin_review' } });
      await notify(ctx, { key: `intro-approval-notice:${job._id}`, roles: ['admin'], title: `Introduction awaiting approval: ${startup.name}`, message: `Founders consented to be introduced to ${cleanName(investor.name)}.`, link: '/workspace/admin/dashboard', kind: 'approval', severity: 'action', projectId: project.id, logSummary: `${AGENT} sent the introduction of ${startup.name} to the admin approvals queue.` });
      return { state: 'waiting_for_approval', step: 'awaiting_admin', nextRunAt: new Date(now.getTime() + config.approvals.staleAfterMs), data: { stage: 'awaiting_admin', approvalId: String(approval._id) } };
    }
    const asked = new Date(data.requestedAt).getTime();
    if (now.getTime() >= asked + cfg.consentWaitMs) {
      await InvestorIntroduction.updateOne({ _id: intro._id }, { $set: { status: 'cancelled', 'founderConsent.status': 'declined' } });
      await note({ ...ctx, action: 'investor.request_consent', status: 'success', projectId: project.id, summary: `The founders of ${startup.name} did not answer in ${Math.round(cfg.consentWaitMs / DAY)} days; the introduction to ${cleanName(investor.name)} was closed. Nothing was shared.`, audience: { userIds: [founderId], roles: ['admin'] } });
      return { state: 'done', step: 'consent_expired' };
    }
    if (!data.reminded && now.getTime() >= asked + cfg.consentWaitMs / 2) {
      await notify(ctx, { key: `consent-reminder:${job._id}`, userIds: [founderId], title: `Reminder: introduction to ${cleanName(investor.name)}`, message: 'We are still waiting for your answer. Nothing is shared without it.', link: '/workspace/student/dashboard', kind: 'reminder', severity: 'action', projectId: project.id, action: 'application.remind', logSummary: `${AGENT} reminded the founders of ${startup.name} about the introduction request.` });
      return { state: 'waiting_for_reply', step: 'awaiting_consent', nextRunAt: new Date(asked + cfg.consentWaitMs), data: { reminded: true } };
    }
    return { state: 'waiting_for_reply', step: 'awaiting_consent', nextRunAt: new Date(asked + (data.reminded ? cfg.consentWaitMs : cfg.consentWaitMs / 2)) };
  }

  // ---- 3. Waiting for the admin; then for the investor -------------------------------------------
  if (data.stage === 'awaiting_admin') {
    if (signals.includes('intro_rejected')) return { state: 'done', step: 'rejected' };
    if (signals.includes('intro_approved')) {
      return { state: 'waiting_for_reply', step: 'awaiting_investor', nextRunAt: new Date(now.getTime() + 7 * DAY), timeoutAt: new Date(now.getTime() + 7 * DAY), data: { stage: 'awaiting_investor', approvedAt: now.toISOString() } };
    }
    return { state: 'waiting_for_approval', step: 'awaiting_admin', nextRunAt: new Date(now.getTime() + config.approvals.staleAfterMs) };
  }

  if (data.stage === 'awaiting_investor') {
    if (signals.includes('investor_declined')) return { state: 'done', step: 'investor_declined' };
    if (signals.includes('investor_accepted')) {
      const people = [
        { userId: String(investor._id), name: cleanName(investor.name), email: investor.email },
        ...(await User.find({ _id: founderId }).select('_id name email').lean()).map((u) => ({ userId: String(u._id), name: cleanName(u.name), email: u.email })),
      ];
      const found = await findSlotsLogged(ctx, { key: `intro:${job._id}`, userIds: people.map((p) => p.userId), durationMinutes: 30, from: now, count: 1 });
      if (!found.slots.length) {
        await note({ ...ctx, action: 'meeting.find_slots', status: 'skipped', projectId: project.id, summary: `${AGENT} found no common time for ${startup.name} and ${cleanName(investor.name)}; it will search again tomorrow.`, audience: { userIds: [founderId], roles: ['admin'] } });
        return { state: 'retrying', step: 'finding_slot', nextRunAt: new Date(now.getTime() + DAY), data: { signals: [{ name: 'investor_accepted' }] } };
      }
      const slot = found.slots[0];
      const booked = await scheduleMeeting(ctx, { key: `intro:${job._id}`, projectId: project.id, projectTitle: project.title, title: `Introduction: ${startup.name} and ${cleanName(investor.name)}`, kind: 'investor_intro', agenda: 'Introductory conversation arranged by the DBIT Incubation Centre.', startUtc: slot.startUtc, endUtc: slot.endUtc, attendees: people });
      await InvestorIntroduction.updateOne({ _id: intro._id }, { $set: { status: 'scheduled', meetingId: booked.result.meetingId, scheduledMeeting: { date: slot.startUtc.toISOString().slice(0, 10), time: formatLocal(slot.startUtc), timeZone: config.timezone, meetingLink: booked.result.link || null, scheduledByAgent: true, emailSentToInvestor: booked.status === 'success', emailSentToFounder: booked.status === 'success', scheduledAt: new Date() } } });
      await emit('intro.meeting_scheduled', { aggregateId: String(intro._id), projectId: project.id, payload: { meetingId: booked.result.meetingId }, dedupe: 'once', correlationId: ctx.correlationId });
      const feedbackAt = new Date(slot.endUtc.getTime() + cfg.feedbackAfterMs);
      return { state: 'waiting_for_reply', step: 'awaiting_meeting', nextRunAt: feedbackAt, data: { stage: 'awaiting_meeting', feedbackAt: feedbackAt.toISOString(), meetingId: booked.result.meetingId } };
    }
    if (now.getTime() >= new Date(data.approvedAt).getTime() + 7 * DAY) {
      await note({ ...ctx, action: 'investor.send_introduction', status: 'success', projectId: project.id, summary: `${cleanName(investor.name)} did not respond to the introduction of ${startup.name} within 7 days; it was closed.`, audience: { userIds: [founderId], roles: ['admin'] } });
      await InvestorIntroduction.updateOne({ _id: intro._id }, { $set: { status: 'cancelled' } });
      return { state: 'done', step: 'investor_no_reply' };
    }
    return { state: 'waiting_for_reply', step: 'awaiting_investor', nextRunAt: new Date(new Date(data.approvedAt).getTime() + 7 * DAY) };
  }

  // ---- 4. After the meeting: collect feedback from both sides -----------------------------------
  if (data.stage === 'awaiting_meeting') {
    const current = await InvestorIntroduction.findOne({ _id: intro._id }).lean();
    const parties = (current.feedback || []).map((f) => f.byRole);
    if (parties.includes('investor') && parties.includes('founder')) {
      await note({ ...ctx, action: 'investor.send_introduction', status: 'success', projectId: project.id, summary: `Both sides left feedback on the ${startup.name} introduction; the process is complete.`, audience: { userIds: [founderId], roles: ['admin'] } });
      return { state: 'done', step: 'feedback_collected' };
    }
    if (!data.feedbackRequested && now.getTime() >= new Date(data.feedbackAt).getTime()) {
      await notify(ctx, { key: `feedback-request:${job._id}`, userIds: [founderId, String(investor._id)], title: `How did the ${startup.name} introduction go?`, message: 'A short rating and comment helps us improve future introductions.', link: '/workspace/student/dashboard', kind: 'feedback', severity: 'action', projectId: project.id, action: 'report.request', logSummary: `${AGENT} asked both sides for feedback on the ${startup.name} introduction.` });
      return { state: 'waiting_for_reply', step: 'awaiting_feedback', nextRunAt: new Date(now.getTime() + 7 * DAY), data: { feedbackRequested: true, feedbackRequestedAt: now.toISOString() } };
    }
    if (data.feedbackRequested && now.getTime() >= new Date(data.feedbackRequestedAt).getTime() + 7 * DAY) return { state: 'done', step: 'feedback_closed' };
    return { state: 'waiting_for_reply', step: data.feedbackRequested ? 'awaiting_feedback' : 'awaiting_meeting', nextRunAt: new Date(data.feedbackRequested ? new Date(data.feedbackRequestedAt).getTime() + 7 * DAY : new Date(data.feedbackAt)) };
  }

  return { state: 'failed', note: `Unknown stage ${data.stage}` };
}

// Tier 3: the introduction is only sent after an administrator approves it.
approvals.registerApprovalHandler('investor_intro', {
  async approve(approval, user) {
    const { introId, investorUserId, projectId } = approval.payload;
    const intro = await InvestorIntroduction.findOne({ _id: introId }).lean();
    const startup = intro ? await StartupProfile.findOne({ _id: intro.startupId }).lean() : null;
    const ctx = makeCtx(AGENT, { trigger: { type: 'user', ref: String(user.id) }, projectId, applicationId: approval.applicationId, correlationId: approval.correlationId });
    await runAction({
      agent: AGENT, action: 'investor.send_introduction', tool: 'send_introduction', trigger: ctx.trigger, correlationId: ctx.correlationId, projectId, applicationId: approval.applicationId, approvalId: approval._id,
      audience: { userIds: [investorUserId, String(intro?.founderId)].filter(Boolean), roles: ['admin'] }, idempotencyKey: `send-intro:${introId}`, inputSummary: `${startup?.name} -> investor`,
      summary: `${user.name || 'An administrator'} approved the introduction of ${startup?.name}; the investor has been told.`,
      exec: async () => {
        await InvestorIntroduction.updateOne({ _id: introId }, { $set: { status: 'approved', reviewedBy: user.id, reviewedAt: new Date(), adminNotes: approval.decisionComment || null } });
        await notify(ctx, { key: `send-intro-notice:${introId}`, userIds: [investorUserId], title: `Introduction: ${startup?.name}`, message: `${startup?.tagline || ''} (${startup?.sector}, ${startup?.stage}). The founders have agreed to this introduction. Accept to arrange a short meeting.`, link: '/workspace/investor/dashboard', kind: 'introduction', severity: 'action', projectId, logSummary: `${AGENT} introduced ${startup?.name} to the investor.` });
        await notify(ctx, { key: `send-intro-founder:${introId}`, userIds: [String(intro?.founderId)], title: `Your introduction was approved`, message: 'The investor has been told. A meeting is arranged automatically if they accept.', link: '/workspace/student/dashboard', kind: 'status', projectId });
        await emit('intro.approved', { aggregateId: introId, projectId, actorId: String(user.id), payload: {}, dedupe: 'once', correlationId: approval.correlationId });
        return { result: { introId } };
      },
    });
    if (approval.jobId) await jobs.signal(approval.jobId, 'intro_approved', {});
  },
  async reject(approval, user) {
    await InvestorIntroduction.updateOne({ _id: approval.payload.introId }, { $set: { status: 'declined', reviewedBy: user.id, reviewedAt: new Date(), adminNotes: approval.decisionComment || null } });
    await note({ agent: AGENT, action: 'investor.send_introduction', status: 'success', trigger: { type: 'user', ref: String(user.id) }, projectId: approval.projectId, summary: `${user.name || 'An administrator'} did not approve the introduction; nothing was shared with the investor.`, audience: { userIds: [], roles: ['admin'] } });
    if (approval.jobId) await jobs.signal(approval.jobId, 'intro_rejected', {});
  },
});

jobs.registerJobHandler(JOB_TYPE, handleIntroduction);

module.exports = { sweep, readiness, matchInvestors, founderConsent, investorRespond, submitFeedback, handleIntroduction, JOB_TYPE };
