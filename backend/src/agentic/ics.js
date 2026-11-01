/** RFC 5545 calendar invitation (.ics). Times are written in UTC so every client renders them correctly. */

function escapeText(value) {
  return String(value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

function stamp(date) {
  return new Date(date).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

// Lines longer than 75 octets are folded with CRLF + space.
function fold(line) {
  const out = [];
  let rest = line;
  while (Buffer.byteLength(rest) > 75) {
    let cut = 75;
    while (Buffer.byteLength(rest.slice(0, cut)) > 75) cut -= 1;
    out.push(rest.slice(0, cut));
    rest = ` ${rest.slice(cut)}`;
  }
  out.push(rest);
  return out.join('\r\n');
}

function buildInvite({ uid, title, description = '', location = '', startUtc, endUtc, organizer, attendees = [], sequence = 0, method = 'REQUEST', url }) {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//DBIT Incubation Centre//Agents//EN',
    'CALSCALE:GREGORIAN',
    `METHOD:${method}`,
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(startUtc)}`,
    `DTEND:${stamp(endUtc)}`,
    `SEQUENCE:${sequence}`,
    `SUMMARY:${escapeText(title)}`,
    `DESCRIPTION:${escapeText(description)}`,
  ];
  if (location) lines.push(`LOCATION:${escapeText(location)}`);
  if (url) lines.push(`URL:${url}`);
  if (organizer?.email) lines.push(`ORGANIZER;CN=${escapeText(organizer.name || 'DBIT Incubation Centre')}:mailto:${organizer.email}`);
  attendees
    .filter((a) => a.email)
    .forEach((a) => {
      lines.push(`ATTENDEE;CN=${escapeText(a.name || a.email)};ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE:mailto:${a.email}`);
    });
  lines.push('STATUS:CONFIRMED', 'END:VEVENT', 'END:VCALENDAR');
  return `${lines.map(fold).join('\r\n')}\r\n`;
}

module.exports = { buildInvite, escapeText, stamp, fold };
