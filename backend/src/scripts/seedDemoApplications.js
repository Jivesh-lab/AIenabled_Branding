/**
 * Sample startup applications for the demo accounts, created through the REAL workflow:
 * the founder's submission goes to agent-service exactly as the portal's BFF would send it, and the
 * coordinator's decision uses the normal /decide endpoint. Approval therefore fires the usual events
 * (project record, mentor matching, investor visibility) - nothing is inserted behind the workflow's back.
 *
 *   node src/scripts/seedDemoApplications.js --yes
 *
 * Needs: seedDemoJourney.js already run, agent-service on AGENT_SERVICE_URL, and the backend running so its
 * event orchestrator can pick the approval up. Idempotent: an application whose name the founder already has
 * is left alone. SmartAgri AI is deliberately NOT created: the demo submits it live.
 */
const dns = require('dns');
try { dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']); } catch {}
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env'), quiet: true });
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const AGENT = process.env.AGENT_SERVICE_URL || 'http://127.0.0.1:8000';

const token = (user, permissions) =>
  jwt.sign({ sub: String(user._id), role: user.role, permissions }, process.env.INTERNAL_JWT_SECRET, {
    algorithm: 'HS256', issuer: 'next-server', audience: 'fastapi-internal', expiresIn: 120,
  });

async function agent(method, p, bearer, body) {
  const res = await fetch(`${AGENT}${p}`, {
    method,
    headers: { Authorization: `Bearer ${bearer}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

const STARTUPS = [
  {
    owner: 'aarav.student@example.com', outcome: 'approved', comments: 'Clear problem and a working prototype. Approved for incubation.',
    form: {
      name: 'HealthBridge AI', domain: 'HealthTech', department: 'Computer Engineering', projectType: 'Software', maturity: 'PROTOTYPE',
      shortDescription: 'AI-supported navigation that helps patients find the right clinic, specialist and next step.',
      problem: 'Patients in smaller towns often do not know which specialist or facility to visit, causing delays and repeat visits.',
      affectedUsers: 'Patients and families in tier-2 and tier-3 towns, and the clinics that receive them.',
      currentSolutions: 'Phone enquiries and word of mouth.',
      solution: 'A guided symptom-to-care pathway that suggests the appropriate care level and nearby facilities, never a diagnosis.',
      differentiation: 'Built for low-bandwidth use and local-language prompts, with clinician-reviewed pathways.',
      technologies: ['Python', 'FastAPI', 'NLP'],
    },
  },
  {
    owner: 'aarav.student@example.com', outcome: 'revision_requested', comments: 'Please add evidence of user interviews and clarify how the insights are validated.',
    form: {
      name: 'FinWise', domain: 'FinTech', department: 'Computer Engineering', projectType: 'Software', maturity: 'MVP',
      shortDescription: 'AI-assisted financial education and personalised money insights for first-time earners.',
      problem: 'Young first-time earners lack simple, trustworthy guidance on budgeting, saving and avoiding high-cost debt.',
      affectedUsers: 'College graduates and early-career employees in urban India.',
      currentSolutions: 'Generic videos, finance blogs and informal advice.',
      solution: 'A mobile-first coach that turns a user\'s spending patterns into short lessons and monthly insights.',
      differentiation: 'Lessons are triggered by the user\'s own behaviour instead of a fixed course.',
      technologies: ['Python', 'React Native', 'LLM'],
    },
  },
  {
    owner: 'priya.student@example.com', outcome: 'pending', comments: '',
    form: {
      name: 'EcoTrack', domain: 'Sustainability / IoT', department: 'Information Technology', projectType: 'Hardware', maturity: 'IDEA',
      shortDescription: 'IoT-based environmental monitoring for campuses and small factories.',
      problem: 'Small organisations cannot afford continuous air, noise and water-quality monitoring, so problems go unnoticed.',
      affectedUsers: 'Campus administrators, small factory owners and nearby residents.',
      currentSolutions: 'Occasional manual sampling by outside agencies.',
      solution: 'Low-cost sensor nodes that stream readings to a dashboard and raise alerts when thresholds are crossed.',
      differentiation: 'Costs a fraction of industrial monitors and is simple enough for non-specialists to install.',
      technologies: ['ESP32', 'MQTT', 'Python'],
    },
  },
];

(async () => {
  const args = process.argv.slice(2);
  if (process.env.NODE_ENV === 'production') { console.error('Refusing to run with NODE_ENV=production.'); process.exit(1); }
  if (!args.includes('--yes')) { console.error('Re-run with --yes to submit the sample applications.'); process.exit(1); }
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 15000 });
  try {
    const find = (email) => User.findOne({ email, 'profile.demoJourney': true }).lean();
    const coordinator = await find('neha.faculty@example.com');
    if (!coordinator) throw new Error('Run seedDemoJourney.js first (coordinator account missing).');
    const reviewer = token(coordinator, ['review_applications', 'view_applications']);

    for (const s of STARTUPS) {
      const owner = await find(s.owner);
      if (!owner) throw new Error(`${s.owner} is missing; run seedDemoJourney.js first.`);
      const asOwner = () => token(owner, ['submit_application', 'view_applications']);

      const list = await agent('GET', '/api/applications/', asOwner());
      if (list.status !== 200) throw new Error(`Could not list applications (${list.status}). Is agent-service running?`);
      const existing = (list.data.projects || []).find((p) => String(p.name).toLowerCase() === s.form.name.toLowerCase());
      if (existing) { console.log(`= ${s.form.name}: already exists (${existing.status || existing.reviewStatus || 'present'})`); continue; }

      const submit = await agent('POST', '/api/applications/submit', asOwner(), {
        ...s.form, applicationId: null,
        teamMembers: [{ id: 'lead', name: owner.name, rollNumber: owner.profile?.studentId || '', email: owner.email, inviteStatus: 'LEAD' }],
        githubUrl: '', demoUrl: '', prototypeAvailable: s.form.maturity === 'IDEA' ? 'NO' : 'YES', attachments: [], declarationAccepted: true,
      });
      if (submit.status !== 200) throw new Error(`Submitting ${s.form.name} failed (${submit.status}): ${JSON.stringify(submit.data).slice(0, 200)}`);
      const id = submit.data.application_id;
      console.log(`+ ${s.form.name}: submitted as ${owner.email} (${id})`);

      if (s.outcome !== 'pending') {
        const decide = await agent('POST', `/api/applications/${id}/decide`, reviewer, { decision: s.outcome, comments: s.comments });
        if (decide.status !== 200) throw new Error(`Decision on ${s.form.name} failed (${decide.status}): ${JSON.stringify(decide.data).slice(0, 200)}`);
        console.log(`  decision by ${coordinator.email}: ${s.outcome}`);
      } else {
        console.log('  left awaiting review');
      }
    }
  } catch (e) {
    console.error('[demo] failed:', e.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
})();
