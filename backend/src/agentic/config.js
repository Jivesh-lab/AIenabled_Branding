/**
 * Agentic runtime configuration.
 *
 * Everything an operator may want to tune lives here, read from environment variables with safe
 * defaults. Autonomy tiers are configuration that is ENFORCED IN CODE by actionLog.runAction():
 * an action that is not listed is treated as Tier 3 (needs a human), so forgetting to classify
 * something can never silently grant autonomy.
 */

const TIER = Object.freeze({ ACT_FREELY: 1, ACT_THEN_NOTIFY: 2, HUMAN_APPROVES: 3 });

const ACTION_TIERS = Object.freeze({
  // Tier 1 - act freely
  'notification.send': TIER.ACT_FREELY,
  'email.send': TIER.ACT_FREELY,
  'application.assess': TIER.ACT_FREELY,
  'application.request_info': TIER.ACT_FREELY,
  'application.remind': TIER.ACT_FREELY,
  'application.flag': TIER.ACT_FREELY,
  'application.queue_for_decision': TIER.ACT_FREELY,
  'mentor.request': TIER.ACT_FREELY,
  'mentor.propose_allocation': TIER.ACT_FREELY,
  'meeting.schedule': TIER.ACT_FREELY,
  'meeting.find_slots': TIER.ACT_FREELY,
  'report.request': TIER.ACT_FREELY,
  'document.generate': TIER.ACT_FREELY,
  'monitoring.check': TIER.ACT_FREELY,
  'monitoring.checkin': TIER.ACT_FREELY,
  'investor.build_profile': TIER.ACT_FREELY,
  'investor.find_matches': TIER.ACT_FREELY,
  'investor.draft_intro': TIER.ACT_FREELY,
  'investor.request_consent': TIER.ACT_FREELY,
  'startup.record_recovery': TIER.ACT_FREELY,
  'escalation.raise': TIER.ACT_FREELY,
  // Tier 2 - act, then notify the people affected
  'meeting.reschedule': TIER.ACT_THEN_NOTIFY,
  'mentor.nudge': TIER.ACT_THEN_NOTIFY,
  'monitoring.rerun': TIER.ACT_THEN_NOTIFY,
  'task.create': TIER.ACT_THEN_NOTIFY,
  'startup.update_status': TIER.ACT_THEN_NOTIFY,
  'monitoring.notify_mentor': TIER.ACT_THEN_NOTIFY,
  'meeting.follow_up': TIER.ACT_THEN_NOTIFY,
  // Tier 3 - a human must approve before the action executes
  'admission.decide': TIER.HUMAN_APPROVES,
  'mentor.confirm_allocation': TIER.HUMAN_APPROVES,
  'investor.send_introduction': TIER.HUMAN_APPROVES,
  'investor.schedule_meeting': TIER.HUMAN_APPROVES,
});

function tierFor(action) {
  return ACTION_TIERS[action] || TIER.HUMAN_APPROVES;
}

const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;

function num(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

/** Read lazily so tests and operators can change the environment without a restart of the module. */
function getConfig() {
  return {
    timezone: process.env.AGENT_TIMEZONE || 'Asia/Kolkata',
    tickMs: Math.max(1000, num('EVENT_ORCHESTRATOR_POLL_MS', 5000)),
    sweepMs: Math.max(60 * 1000, num('AGENT_SWEEP_MS', 15 * 60 * 1000)),
    jobLeaseMs: num('AGENT_JOB_LEASE_MS', 5 * 60 * 1000),
    retry: { baseMs: num('AGENT_RETRY_BASE_MS', 30 * 1000), maxMs: num('AGENT_RETRY_MAX_MS', HOUR), maxAttempts: num('AGENT_MAX_ATTEMPTS', 5) },
    application: {
      reminderAfterMs: num('APPLICATION_REMINDER_AFTER_MS', 3 * DAY),
      escalateAfterMs: num('APPLICATION_ESCALATE_AFTER_MS', 7 * DAY),
      minTeamSize: num('APPLICATION_MIN_TEAM_SIZE', 2),
      duplicateNameSimilarity: num('APPLICATION_DUPLICATE_NAME_SIMILARITY', 0.85),
      duplicateTextSimilarity: num('APPLICATION_DUPLICATE_TEXT_SIMILARITY', 0.8),
      spamMinUniqueWordRatio: num('APPLICATION_SPAM_MIN_UNIQUE_WORD_RATIO', 0.35),
    },
    mentor: {
      responseWindowMs: num('MENTOR_RESPONSE_WINDOW_MS', 3 * DAY),
      defaultCapacity: num('MENTOR_DEFAULT_CAPACITY', 3),
      maxCandidates: num('MENTOR_MAX_CANDIDATES', 5),
      minScore: num('MENTOR_MIN_SCORE', 20),
    },
    workflow: {
      workStartHour: num('MEETING_WORK_START_HOUR', 10),
      workEndHour: num('MEETING_WORK_END_HOUR', 17),
      durationMinutes: num('ONBOARDING_MEETING_MINUTES', 45),
      searchDays: num('MEETING_SEARCH_DAYS', 10),
      leadDays: num('MEETING_LEAD_DAYS', 2),
      noShowGraceMs: num('MEETING_NO_SHOW_GRACE_MS', 2 * HOUR),
      maxReschedules: num('MEETING_MAX_RESCHEDULES', 2),
      preMeetingUpdateDueBeforeMs: num('PRE_MEETING_UPDATE_DUE_BEFORE_MS', 1 * DAY),
    },
    monitoring: {
      inactivityDays: num('MONITORING_INACTIVITY_DAYS', 14),
      taskOverdueGraceDays: num('MONITORING_TASK_OVERDUE_GRACE_DAYS', 2),
      checkinWaitMs: num('MONITORING_CHECKIN_WAIT_MS', 48 * HOUR),
      mentorWaitMs: num('MONITORING_MENTOR_WAIT_MS', 48 * HOUR),
      reportEveryDays: num('MONITORING_REPORT_EVERY_DAYS', 14),
      recoveryCooldownMs: num('MONITORING_RECOVERY_COOLDOWN_MS', 7 * DAY),
    },
    investor: {
      minProgress: num('INVESTOR_MIN_PROGRESS', 60),
      minTrl: num('INVESTOR_MIN_TRL', 4),
      maxOverdueMilestones: num('INVESTOR_MAX_OVERDUE_MILESTONES', 0),
      maxMatches: num('INVESTOR_MAX_MATCHES', 3),
      minMatchScore: num('INVESTOR_MIN_MATCH_SCORE', 40),
      consentWaitMs: num('INVESTOR_CONSENT_WAIT_MS', 5 * DAY),
      feedbackAfterMs: num('INVESTOR_FEEDBACK_AFTER_MS', 1 * DAY),
    },
    approvals: { staleAfterMs: num('APPROVAL_STALE_AFTER_MS', 3 * DAY) },
  };
}

/**
 * Integration status. Each integration is "live" only when its credentials are present. Anything
 * else runs in a clearly labelled sandbox that records what WOULD have happened in the outbox.
 */
function demoModeForced() {
  return String(process.env.AGENT_DEMO_MODE || '').toLowerCase() === 'true';
}

function smtpReady() {
  const pass = process.env.SMTP_PASSWORD || process.env.SMTP_PASS;
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && pass);
}

function googleReady() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_REDIRECT_URI && process.env.INTEGRATIONS_ENCRYPTION_KEY);
}

function llmReady() {
  return Boolean(process.env.LLM_API_KEY || process.env.OPENROUTER_API_KEY);
}

function integrationStatus() {
  const forced = demoModeForced();
  return {
    demoMode: forced,
    email: { configured: smtpReady(), mode: smtpReady() && !forced ? 'live' : 'sandbox', missing: smtpReady() ? [] : ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASSWORD'] },
    calendar: {
      configured: googleReady(),
      mode: googleReady() && !forced ? 'live' : 'sandbox',
      missing: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_REDIRECT_URI', 'INTEGRATIONS_ENCRYPTION_KEY'].filter((key) => !process.env[key]),
    },
    llm: { configured: llmReady(), mode: llmReady() ? 'live' : 'rules_only', missing: llmReady() ? [] : ['LLM_API_KEY'] },
  };
}

module.exports = { TIER, ACTION_TIERS, tierFor, getConfig, integrationStatus, demoModeForced, smtpReady, googleReady, llmReady, DAY, HOUR };
