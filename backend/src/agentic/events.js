/**
 * Canonical event catalogue.
 *
 * Every event an agent reacts to or publishes is declared here with the payload fields it must carry.
 * `emit()` validates a known event before handing it to the existing durable event store
 * (services/eventOrchestrator.enqueueEvent), which already provides the idempotency key, retry with
 * backoff and dead-lettering - so there is exactly one event system, not two.
 */

const EVENTS = Object.freeze({
  'application.submitted': { aggregate: 'application', required: ['applicant_id'] },
  'application.resubmitted': { aggregate: 'application', required: ['applicant_id'] },
  'application.info_requested': { aggregate: 'application', required: ['missing'] },
  'application.info_received': { aggregate: 'application', required: [] },
  'application.assessed': { aggregate: 'application', required: ['complete'] },
  'application.flagged': { aggregate: 'application', required: ['flags'] },
  'application.approved': { aggregate: 'application', required: [] },
  'application.rejected': { aggregate: 'application', required: [] },
  'application.revision_requested': { aggregate: 'application', required: [] },
  'mentor.requested': { aggregate: 'project', required: ['mentorUserId'] },
  'mentor.accepted': { aggregate: 'project', required: ['mentorUserId'] },
  'mentor.declined': { aggregate: 'project', required: ['mentorUserId'] },
  'mentor.timed_out': { aggregate: 'project', required: ['mentorUserId'] },
  'allocation.proposed': { aggregate: 'project', required: ['mentorUserId'] },
  'allocation.confirmed': { aggregate: 'project', required: ['mentorUserId'] },
  'meeting.scheduled': { aggregate: 'meeting', required: ['meetingId'] },
  'meeting.held': { aggregate: 'meeting', required: ['meetingId'] },
  'meeting.no_show': { aggregate: 'meeting', required: ['meetingId'] },
  'report.requested': { aggregate: 'project', required: [] },
  'report.received': { aggregate: 'project', required: [] },
  'report.overdue': { aggregate: 'project', required: [] },
  'startup.stalled': { aggregate: 'project', required: ['reasons'] },
  'startup.recovered': { aggregate: 'project', required: [] },
  'investor.match_found': { aggregate: 'project', required: ['investorUserId'] },
  'intro.requested': { aggregate: 'introduction', required: ['investorUserId'] },
  'intro.consented': { aggregate: 'introduction', required: [] },
  'intro.approved': { aggregate: 'introduction', required: [] },
  'intro.meeting_scheduled': { aggregate: 'introduction', required: [] },
});

function isKnown(eventType) {
  return Object.prototype.hasOwnProperty.call(EVENTS, eventType);
}

function validate(eventType, payload = {}) {
  const spec = EVENTS[eventType];
  if (!spec) return { ok: true, known: false };
  const missing = spec.required.filter((key) => payload[key] === undefined || payload[key] === null);
  return { ok: missing.length === 0, known: true, missing };
}

/**
 * Publish a canonical event. `dedupe` makes the event idempotent: publishing the same logical
 * event twice (a retry, a duplicate delivery) stores it once.
 */
async function emit(eventType, { aggregateId, projectId = null, applicationId = null, actorId = 'system', payload = {}, dedupe, correlationId } = {}) {
  const check = validate(eventType, payload);
  if (!check.ok) throw new Error(`Event ${eventType} is missing required payload field(s): ${check.missing.join(', ')}`);
  if (!aggregateId) throw new Error(`Event ${eventType} requires an aggregateId`);
  const { enqueueEvent } = require('../services/eventOrchestrator');
  const spec = EVENTS[eventType];
  return enqueueEvent({
    eventType,
    aggregateType: spec ? spec.aggregate : 'domain',
    aggregateId: String(aggregateId),
    projectId,
    applicationId,
    actorId,
    payload,
    correlationId,
    idempotencyKey: `${eventType}:${aggregateId}:${dedupe || 'once'}`,
  });
}

module.exports = { EVENTS, isKnown, validate, emit };
