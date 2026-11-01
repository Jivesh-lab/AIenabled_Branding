const crypto = require('crypto');
const FacultyMeeting = require('../../models/FacultyMeeting');
const User = require('../../models/User');
const { runAction } = require('../actionLog');
const { googleReady, demoModeForced } = require('../config');
const { localDateString, localTimeString, formatLocal } = require('../time');
const { buildInvite } = require('../ics');
const emailAdapter = require('./email');
const google = require('./google');
const { notify } = require('./notify');

/**
 * Meeting / calendar adapter.
 *
 * The portal's own meeting record (FacultyMeeting) is always written so dashboards and the assistant
 * see the meeting. On top of it, in order of preference:
 *   1. Google Calendar - when someone in the meeting has connected their Google account, the event
 *      (with a Meet link) is created on that person's calendar and Google invites everyone.
 *   2. Email with a .ics invitation - delivered live when SMTP is configured.
 *   3. Sandbox - recorded in the outbox, clearly labelled as not delivered.
 * An invitation is never described as accepted; only "sent" / "simulated" are ever claimed.
 */
function newId(prefix) {
  return `${prefix}-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
}

async function pickGoogleOrganizer(attendees) {
  if (!googleReady() || demoModeForced()) return null;
  for (const a of attendees) {
    if (!a.userId) continue;
    const connection = await google.getConnection(a.userId);
    if (connection && connection.status === 'connected') return a;
  }
  return null;
}

async function deliver({ ctx, meeting, attendees, title, description, location, sequence = 0, method = 'REQUEST' }) {
  const organizer = await pickGoogleOrganizer(attendees);
  if (organizer && sequence === 0) {
    try {
      const created = await google.createEvent(organizer.userId, {
        title,
        description,
        startUtc: meeting.startUtc,
        endUtc: meeting.endUtc,
        attendees: attendees.filter((a) => a.userId !== organizer.userId),
        requestId: String(meeting.icsUid || meeting.id),
      });
      return { calendarMode: 'google', googleEventId: created.id, googleOrganizerUserId: organizer.userId, link: created.meetLink || created.htmlLink, simulated: false };
    } catch (error) {
      // Fall through to the email invitation, and say so rather than hiding the Google failure.
      ctx.calendarWarning = `Google Calendar could not be used (${error.message}); an emailed invitation was used instead.`;
    }
  }
  const ics = buildInvite({
    uid: meeting.icsUid, title, description, location, startUtc: meeting.startUtc, endUtc: meeting.endUtc,
    organizer: { name: 'DBIT Incubation Centre', email: process.env.EMAIL_FROM || process.env.SMTP_FROM || process.env.SMTP_USER || 'incubation@example.invalid' },
    attendees, sequence, method,
  });
  const emails = attendees.map((a) => a.email).filter(Boolean);
  let status = 'skipped';
  if (emails.length) {
    const sent = await emailAdapter.sendEmail({
      to: emails,
      subject: `${sequence ? 'Updated invitation' : 'Invitation'}: ${title}`,
      text: `${title}\nWhen: ${formatLocal(new Date(meeting.startUtc))}\nWhere: ${location}\n\n${description}\n\nThe calendar invitation is attached.`,
      ics,
      dedupeKey: `invite:${meeting.id}:${sequence}`,
      correlationId: ctx.correlationId,
      meta: { meetingId: meeting.id },
    });
    status = sent.status;
  }
  return { calendarMode: status === 'sent' ? 'ics_email' : 'sandbox', googleEventId: null, googleOrganizerUserId: null, link: null, simulated: status !== 'sent', ics };
}

async function scheduleMeeting(ctx, params) {
  const { key, projectId, projectTitle, title, agenda = '', startUtc, endUtc, attendees, kind = 'general', location = process.env.DEFAULT_MEETING_LOCATION || 'DBIT Incubation Centre' } = params;
  if (!key) throw new Error('scheduleMeeting requires a stable key');
  const out = await runAction({
    agent: ctx.agent,
    action: params.action || 'meeting.schedule',
    tool: 'create_calendar_event',
    trigger: ctx.trigger,
    correlationId: ctx.correlationId,
    jobId: ctx.jobId,
    applicationId: ctx.applicationId,
    projectId,
    audience: { userIds: attendees.map((a) => a.userId).filter(Boolean), roles: [] },
    idempotencyKey: `meeting:${key}`,
    inputSummary: `${title} at ${formatLocal(new Date(startUtc))} with ${attendees.length} participant(s)`,
    exec: async () => {
      const meetingId = newId('meet');
      const meeting = await FacultyMeeting.create({
        id: meetingId,
        title,
        projectId,
        projectTitle: projectTitle || 'Incubation project',
        participants: attendees.map((a) => a.name || a.email || 'Participant'),
        date: localDateString(new Date(startUtc)),
        startTime: localTimeString(new Date(startUtc)),
        durationMinutes: Math.round((new Date(endUtc) - new Date(startUtc)) / 60000),
        meetingType: kind === 'onboarding' ? 'Onboarding' : 'Review',
        agenda,
        meetingProvider: 'Pending',
        meetingLinkOrLocation: location,
        invitationStatus: 'Pending',
        source: 'agent',
        kind,
        startUtc: new Date(startUtc),
        endUtc: new Date(endUtc),
        attendeeUserIds: attendees.map((a) => a.userId).filter(Boolean).map(String),
        icsUid: `${meetingId}@dbit-incubation`,
        dedupeKey: key,
      });
      const plain = typeof meeting.toObject === 'function' ? meeting.toObject() : meeting;
      const delivery = await deliver({ ctx, meeting: plain, attendees, title, description: agenda, location });
      await FacultyMeeting.updateOne(
        { id: meetingId },
        {
          $set: {
            calendarMode: delivery.calendarMode,
            googleEventId: delivery.googleEventId,
            googleOrganizerUserId: delivery.googleOrganizerUserId,
            meetingProvider: delivery.calendarMode === 'google' ? 'Google Meet' : 'In person / invitation by email',
            meetingLinkOrLocation: delivery.link || location,
            invitationStatus: delivery.simulated ? 'Simulated' : 'Sent',
          },
        }
      );
      await notify({ ...ctx, projectId }, {
        key: `meeting-notice:${key}`,
        userIds: attendees.map((a) => a.userId).filter(Boolean),
        title: 'Meeting scheduled',
        message: `${title} - ${formatLocal(new Date(startUtc))}.`,
        link: null,
        kind: 'meeting',
        email: false,
        logSummary: `${ctx.agent} told the participants about "${title}".`,
      });
      const where = delivery.calendarMode === 'google' ? 'Google Calendar invitations were sent' : delivery.simulated ? 'invitations were recorded in the sandbox outbox (not delivered)' : 'email invitations (.ics) were sent';
      return {
        status: delivery.simulated ? 'simulated' : 'success',
        result: { meetingId, calendarMode: delivery.calendarMode, link: delivery.link, startUtc, endUtc },
        summary: `${ctx.agent} booked "${title}" for ${formatLocal(new Date(startUtc))}; ${where}.${ctx.calendarWarning ? ` ${ctx.calendarWarning}` : ''}`,
        followUp: delivery.simulated ? 'Connect SMTP or Google Calendar to deliver real invitations.' : 'Waiting for the meeting to take place.',
      };
    },
  });
  return out;
}

async function rescheduleMeeting(ctx, { key, meeting, startUtc, endUtc, reason }) {
  const people = meeting.attendeeUserIds?.length ? await User.find({ _id: { $in: meeting.attendeeUserIds.map(String) } }).select('_id name email').lean() : [];
  const attendees = people.map((u) => ({ userId: String(u._id), name: u.name, email: u.email }));
  return runAction({
    agent: ctx.agent,
    action: 'meeting.reschedule',
    tool: 'create_calendar_event',
    trigger: ctx.trigger,
    correlationId: ctx.correlationId,
    jobId: ctx.jobId,
    projectId: meeting.projectId,
    audience: { userIds: meeting.attendeeUserIds || [], roles: [] },
    idempotencyKey: `meeting-reschedule:${key}`,
    inputSummary: `${meeting.title} -> ${formatLocal(new Date(startUtc))} (${reason})`,
    exec: async () => {
      const sequence = (meeting.rescheduleCount || 0) + 1;
      await FacultyMeeting.updateOne(
        { id: meeting.id },
        {
          $set: {
            date: localDateString(new Date(startUtc)),
            startTime: localTimeString(new Date(startUtc)),
            startUtc: new Date(startUtc),
            endUtc: new Date(endUtc),
            outcome: 'pending',
            rescheduleCount: sequence,
          },
        }
      );
      let mode = 'ics_email';
      let simulated = false;
      if (meeting.googleEventId && meeting.googleOrganizerUserId) {
        try {
          await google.updateEventTime(meeting.googleOrganizerUserId, meeting.googleEventId, { startUtc, endUtc });
          mode = 'google';
        } catch (error) {
          ctx.calendarWarning = `Google Calendar could not be updated (${error.message}); an emailed update was used.`;
        }
      }
      if (mode !== 'google') {
        const delivery = await deliver({
          ctx,
          meeting: { ...meeting, startUtc, endUtc, id: meeting.id, icsUid: meeting.icsUid || `${meeting.id}@dbit-incubation` },
          attendees,
          title: meeting.title,
          description: meeting.agenda,
          location: meeting.meetingLinkOrLocation,
          sequence,
        });
        mode = delivery.calendarMode;
        simulated = delivery.simulated;
      }
      await notify({ ...ctx, projectId: meeting.projectId }, {
        key: `meeting-resched-notice:${key}`,
        userIds: meeting.attendeeUserIds || [],
        title: 'Meeting rescheduled',
        message: `"${meeting.title}" moved to ${formatLocal(new Date(startUtc))}. ${reason}`,
        kind: 'meeting',
        email: false,
        action: 'notification.send',
        logSummary: `${ctx.agent} told the participants "${meeting.title}" was rescheduled.`,
      });
      return {
        status: simulated ? 'simulated' : 'success',
        result: { meetingId: meeting.id, calendarMode: mode, startUtc, endUtc },
        summary: `${ctx.agent} rescheduled "${meeting.title}" to ${formatLocal(new Date(startUtc))} (${reason}).${ctx.calendarWarning ? ` ${ctx.calendarWarning}` : ''}`,
      };
    },
  });
}

module.exports = { scheduleMeeting, rescheduleMeeting };
