const crypto = require('crypto');
const CalendarConnection = require('../models/CalendarConnection');
const FacultyMeeting = require('../models/FacultyMeeting');
const { localDateString, localTimeString } = require('../agentic/time');
const google = require('../agentic/tools/google');
const { notify } = require('../agentic/tools/notify');

function syncContext(connection) {
  return {
    agent: 'Calendar Sync',
    trigger: { type: 'webhook', ref: connection.watchChannelId || 'manual' },
    correlationId: `calendar-sync-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
  };
}

async function applyEvent(connection, event) {
  const meeting = await FacultyMeeting.findOne({ googleEventId: event.id }).lean();
  if (!meeting) return false;
  const cancelled = event.status === 'cancelled';
  const start = event.start?.dateTime || event.start?.date;
  const end = event.end?.dateTime || event.end?.date;
  const set = {};
  if (cancelled) {
    if (meeting.outcome !== 'cancelled') {
      set.outcome = 'cancelled';
      set.outcomeAt = new Date();
      set.invitationStatus = 'Cancelled';
    }
  } else if (start && end) {
    const startDate = new Date(start);
    const endDate = new Date(end);
    if (!Number.isNaN(startDate.getTime()) && !Number.isNaN(endDate.getTime())) {
      set.startUtc = startDate;
      set.endUtc = endDate;
      set.date = localDateString(startDate);
      set.startTime = localTimeString(startDate);
      set.durationMinutes = Math.round((endDate - startDate) / 60000);
      if (event.summary) set.title = String(event.summary).slice(0, 200);
      if (typeof event.description === 'string') set.agenda = event.description.slice(0, 4000);
      if (typeof event.location === 'string' && event.location) set.meetingLinkOrLocation = event.location.slice(0, 500);
    }
  }
  if (!Object.keys(set).length) return false;
  await FacultyMeeting.updateOne({ id: meeting.id, googleEventId: event.id }, { $set: set });
  const ctx = syncContext(connection);
  await notify(ctx, {
    key: `calendar-sync:${connection._id}:${event.id}:${event.updated || event.status || 'changed'}`,
    userIds: meeting.attendeeUserIds || [],
    title: cancelled ? 'Meeting cancelled in Google Calendar' : 'Meeting updated in Google Calendar',
    message: cancelled ? `"${meeting.title}" was cancelled in Google Calendar.` : `"${event.summary || meeting.title}" was changed in Google Calendar.`,
    kind: 'meeting',
    email: false,
  });
  return true;
}

async function synchronizeConnection(connectionId, { full = false } = {}) {
  const connection = await CalendarConnection.findOneAndUpdate(
    { _id: connectionId, status: 'connected', syncLockedAt: null },
    { $set: { syncLockedAt: new Date(), syncStatus: 'pending' } },
    { returnDocument: 'after' }
  ).lean();
  if (!connection) return { skipped: true };
  try {
    const result = await google.listChangedEvents(connection.userId, connection, { full });
    let changed = 0;
    for (const event of result.events) if (await applyEvent(connection, event)) changed += 1;
    await CalendarConnection.updateOne(
      { _id: connection._id },
      { $set: { syncToken: result.syncToken || connection.syncToken, lastSyncedAt: new Date(), syncStatus: 'active', syncError: null, syncLockedAt: null } }
    );
    return { changed, received: result.events.length };
  } catch (error) {
    await CalendarConnection.updateOne(
      { _id: connection._id },
      { $set: { syncStatus: 'failed', syncError: String(error.message).slice(0, 200), syncLockedAt: null } }
    );
    throw error;
  }
}

async function synchronizeForChannel(headers) {
  const channelId = String(headers.channelId || '');
  const resourceId = String(headers.resourceId || '');
  if (!channelId || !resourceId) return { accepted: false };
  const connection = await CalendarConnection.findOne({ watchChannelId: channelId, watchResourceId: resourceId, status: 'connected' }).lean();
  if (!connection) return { accepted: false };
  if (connection.watchTokenEnc) {
    const { decrypt } = require('../agentic/secretBox');
    const token = headers.token || '';
    if (token !== decrypt(connection.watchTokenEnc)) return { accepted: false };
  }
  if (headers.resourceState === 'sync') return { accepted: true, handshake: true };
  return { accepted: true, result: await synchronizeConnection(connection._id) };
}

async function renewDueWatches() {
  const threshold = new Date(Date.now() + google.WATCH_LEAD_MS);
  const rows = await CalendarConnection.find({ status: 'connected', watchExpiresAt: { $lte: threshold } }).limit(50).lean();
  let renewed = 0;
  for (const row of rows) {
    try {
      if (await google.renewWatch(row.userId, row)) renewed += 1;
    } catch (error) {
      await CalendarConnection.updateOne({ _id: row._id }, { $set: { syncStatus: 'failed', syncError: String(error.message).slice(0, 200) } });
    }
  }
  return renewed;
}

module.exports = { synchronizeConnection, synchronizeForChannel, renewDueWatches };
