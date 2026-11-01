const FacultyMeeting = require('../../models/FacultyMeeting');
const { runAction } = require('../actionLog');
const { getConfig, googleReady, demoModeForced } = require('../config');
const { localParts } = require('../time');
const google = require('./google');

const STEP_MS = 30 * 60 * 1000;

/** Busy intervals for one person: meetings already booked for them, plus their Google Calendar when connected. */
async function busyFor(userId, fromUtc, toUtc) {
  const meetings = await FacultyMeeting.find({
    attendeeUserIds: String(userId),
    outcome: { $nin: ['cancelled'] },
    startUtc: { $lt: toUtc },
    endUtc: { $gt: fromUtc },
  }).lean();
  const intervals = meetings.map((m) => ({ start: new Date(m.startUtc), end: new Date(m.endUtc), source: 'portal' }));
  let googleChecked = false;
  if (googleReady() && !demoModeForced()) {
    const connection = await google.getConnection(userId);
    if (connection && connection.status === 'connected') {
      try {
        intervals.push(...(await google.busy(userId, fromUtc, toUtc)).map((b) => ({ ...b, source: 'google' })));
        googleChecked = true;
      } catch {
        // Calendar unavailable for this person: fall back to portal meetings only and say so.
      }
    }
  }
  return { intervals, googleChecked };
}

function overlaps(start, end, intervals) {
  return intervals.some((b) => start < b.end && end > b.start);
}

/**
 * First `count` working-hour slots (in the configured timezone, Monday-Friday) in which every listed
 * person is free. The result says honestly which people's Google calendars were actually consulted.
 */
async function findCommonSlots({ userIds, durationMinutes, from = new Date(), count = 5, leadDays }) {
  const cfg = getConfig().workflow;
  const duration = (durationMinutes || cfg.durationMinutes) * 60 * 1000;
  const earliest = new Date(from.getTime() + (leadDays ?? cfg.leadDays) * 24 * 60 * 60 * 1000);
  const latest = new Date(earliest.getTime() + cfg.searchDays * 24 * 60 * 60 * 1000);

  const busy = [];
  const consulted = [];
  for (const userId of userIds) {
    const { intervals, googleChecked } = await busyFor(userId, earliest, latest);
    busy.push(...intervals);
    if (googleChecked) consulted.push(String(userId));
  }

  const slots = [];
  const start = Math.ceil(earliest.getTime() / STEP_MS) * STEP_MS;
  for (let t = start; t + duration <= latest.getTime() && slots.length < count; t += STEP_MS) {
    const begin = new Date(t);
    const end = new Date(t + duration);
    const a = localParts(begin);
    const b = localParts(new Date(end.getTime() - 1));
    const weekday = a.dow >= 1 && a.dow <= 5;
    const withinHours = a.hour >= cfg.workStartHour && (b.hour < cfg.workEndHour || (b.hour === cfg.workEndHour && b.minute === 0)) && a.day === b.day;
    if (weekday && withinHours && !overlaps(begin, end, busy)) slots.push({ startUtc: begin, endUtc: end });
  }
  return { slots, googleConsulted: consulted };
}

async function findSlotsLogged(ctx, params) {
  const out = await runAction({
    agent: ctx.agent,
    action: 'meeting.find_slots',
    tool: 'find_common_slots',
    trigger: ctx.trigger,
    correlationId: ctx.correlationId,
    jobId: ctx.jobId,
    applicationId: ctx.applicationId,
    projectId: ctx.projectId,
    idempotencyKey: params.key ? `slots:${params.key}` : undefined,
    inputSummary: `${params.userIds.length} participant(s), ${params.durationMinutes || getConfig().workflow.durationMinutes} min`,
    exec: async () => {
      const found = await findCommonSlots(params);
      return {
        result: { slots: found.slots.map((s) => ({ startUtc: s.startUtc, endUtc: s.endUtc })), googleConsulted: found.googleConsulted },
        summary: found.slots.length
          ? `${ctx.agent} found ${found.slots.length} common slot(s) for ${params.userIds.length} people.`
          : `${ctx.agent} found no common slot in the next ${getConfig().workflow.searchDays} days.`,
      };
    },
  });
  const slots = (out.result?.slots || []).map((s) => ({ startUtc: new Date(s.startUtc), endUtc: new Date(s.endUtc) }));
  return { slots, googleConsulted: out.result?.googleConsulted || [] };
}

module.exports = { findCommonSlots, findSlotsLogged, busyFor };
