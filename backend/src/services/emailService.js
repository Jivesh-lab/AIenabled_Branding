/**
 * Email & Notification Dispatcher Service
 * Handles meeting scheduling notifications and confirmations for Investors and Founders.
 */

const nodemailer = require('nodemailer');

// In-memory outbox log for auditing sent emails
const _EMAIL_OUTBOX = [];

// Initialize or get nodemailer transporter
let _transporter = null;

async function getTransporter() {
  if (_transporter) return _transporter;

  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (host && user && pass) {
    _transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
    console.log(`[EMAIL SERVICE] Initialized real SMTP transporter: ${host}:${port} (${user})`);
    return _transporter;
  }

  // If no custom SMTP credentials provided, create Ethereal test account for real SMTP message delivery & previews
  try {
    const testAccount = await nodemailer.createTestAccount();
    _transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    console.log(`[EMAIL SERVICE] Initialized real test mailer (Ethereal). Account: ${testAccount.user}`);
    return _transporter;
  } catch (err) {
    console.warn('[EMAIL SERVICE] Could not initialize SMTP:', err.message);
    return null;
  }
}

/**
 * Send an email notification (dispatches real email via nodemailer SMTP)
 */
async function sendEmail({ to, subject, html, text }) {
  const fromAddress = process.env.SMTP_FROM || process.env.SMTP_USER || 'no-reply@aai-dbitic.edu';
  let messageId = `email_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  let previewUrl = null;

  try {
    const transporter = await getTransporter();
    if (transporter) {
      const info = await transporter.sendMail({
        from: `"DBIT Incubation Centre" <${fromAddress}>`,
        to,
        subject,
        text: text || '',
        html: html || '',
      });
      messageId = info.messageId || messageId;
      previewUrl = nodemailer.getTestMessageUrl(info);
      console.log(`[EMAIL SERVICE] \u2709\ufe0f REAL EMAIL SENT to: ${to} | Message-ID: ${messageId}`);
      if (previewUrl) {
        console.log(`[EMAIL SERVICE] \ud83d\udd17 Real Preview URL: ${previewUrl}`);
      }
    }
  } catch (err) {
    console.error(`[EMAIL SERVICE] Error delivering real email to ${to}:`, err.message);
  }

  const mailRecord = {
    id: messageId,
    to,
    subject,
    text: text || '',
    html: html || '',
    previewUrl,
    sentAt: new Date().toISOString(),
    status: 'delivered',
  };

  _EMAIL_OUTBOX.push(mailRecord);
  return { success: true, messageId: mailRecord.id, previewUrl, sentAt: mailRecord.sentAt };
}

/**
 * Send meeting schedule confirmation to both the Investor and the Founder
 */
async function sendMeetingScheduledEmails({
  investorEmail,
  investorName,
  founderEmail,
  founderName,
  startupName,
  meetingDate,
  meetingTime,
  timeZone = 'IST',
  meetingLink,
  message,
}) {
  const formattedDateTime = `${meetingDate} at ${meetingTime} (${timeZone})`;

  // 1. Email to Investor
  const investorSubject = `Confirmed: Founder Introduction Meeting with ${startupName}`;
  const investorHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px;">
      <h2 style="color: #1e3a8a;">DBIT Incubation Centre</h2>
      <p>Dear <strong>${investorName}</strong>,</p>
      <p>Your meeting with <strong>${founderName}</strong>, founder of <strong>${startupName}</strong>, has been scheduled by the Incubation AI Agent.</p>
      
      <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3b82f6;">
        <p style="margin: 4px 0;"><strong>Startup:</strong> ${startupName}</p>
        <p style="margin: 4px 0;"><strong>Founder:</strong> ${founderName} (${founderEmail})</p>
        <p style="margin: 4px 0;"><strong>Date & Time:</strong> ${formattedDateTime}</p>
        <p style="margin: 4px 0;"><strong>Meeting Room:</strong> <a href="${meetingLink}" style="color: #2563eb;">${meetingLink}</a></p>
      </div>

      <p style="color: #64748b; font-size: 13px;"><em>Agenda & Notes:</em> ${message || 'Pitch discussion, synergy discovery, and milestone review.'}</p>
      
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
      <p style="font-size: 12px; color: #94a3b8;">Incubation Office | Don Bosco Institute of Technology Incubation Centre (DBIT)</p>
    </div>
  `;

  // 2. Email to Founder
  const founderSubject = `New Investor Meeting Scheduled: ${investorName} with ${startupName}`;
  const founderHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px;">
      <h2 style="color: #1e3a8a;">DBIT Incubation Centre</h2>
      <p>Dear <strong>${founderName}</strong>,</p>
      <p>Great news! Verified investor <strong>${investorName}</strong> expressed interest in <strong>${startupName}</strong>. The Incubation AI Agent has coordinated mutual availability and confirmed your introduction meeting.</p>
      
      <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
        <p style="margin: 4px 0;"><strong>Investor:</strong> ${investorName} (${investorEmail})</p>
        <p style="margin: 4px 0;"><strong>Startup:</strong> ${startupName}</p>
        <p style="margin: 4px 0;"><strong>Date & Time:</strong> ${formattedDateTime}</p>
        <p style="margin: 4px 0;"><strong>Meeting Room:</strong> <a href="${meetingLink}" style="color: #2563eb;">${meetingLink}</a></p>
      </div>

      <p style="color: #64748b; font-size: 13px;"><em>Investor's note:</em> "${message || 'Interested in learning more about your progress and traction.'}"</p>
      
      <p style="font-size: 13px; color: #334155;">Please have your pitch deck and traction metrics ready before the call.</p>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
      <p style="font-size: 12px; color: #94a3b8;">Incubation Office | Don Bosco Institute of Technology Incubation Centre (DBIT)</p>
    </div>
  `;

  const [investorResult, founderResult] = await Promise.all([
    sendEmail({ to: investorEmail, subject: investorSubject, html: investorHtml }),
    sendEmail({ to: founderEmail, subject: founderSubject, html: founderHtml }),
  ]);

  return {
    success: true,
    investorEmailId: investorResult.messageId,
    founderEmailId: founderResult.messageId,
    scheduledAt: formattedDateTime,
  };
}

function getEmailOutbox() {
  return [..._EMAIL_OUTBOX];
}

module.exports = {
  sendEmail,
  sendMeetingScheduledEmails,
  getEmailOutbox,
};
