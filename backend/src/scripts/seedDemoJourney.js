/**
 * Fictional demo accounts for walking the whole incubation workflow by hand in the browser.
 *
 *   node src/scripts/seedDemoJourney.js --yes                    create missing accounts (idempotent)
 *   node src/scripts/seedDemoJourney.js --yes --rotate-passwords  new passwords for existing demo accounts
 *   node src/scripts/seedDemoJourney.js --clean --yes            remove ONLY accounts/records this script created
 *
 * Safety:
 *  - Refuses to run when NODE_ENV=production and never runs without --yes. Prints the target host first.
 *  - Additive: an existing account that is not flagged profile.demoJourney is never modified.
 *  - Passwords are random, bcrypt-hashed with the app's own User.hashPassword, and written once to the
 *    git-ignored backend/demo-credentials.local.md. Nothing secret lives in this file.
 *  - Admin / Super Admin are created here, the same trusted CLI route as seedAdmin.js / seedSuperAdmin.js.
 *    There is no HTTP endpoint that can create them.
 *  - Applications are NOT created here: they go through the real submit / review workflow
 *    (seedDemoApplications.js, or by hand in the browser).
 */
const dns = require('dns');
try { dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']); } catch {}
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
require('dotenv').config({ path: path.join(__dirname, '../../.env'), quiet: true });
const mongoose = require('mongoose');
const { generateSecret } = require('otplib');
const User = require('../models/User');
const StartupProfile = require('../models/StartupProfile');
const FacultyProject = require('../models/FacultyProject');
const TeamMembership = require('../models/TeamMembership');

const CREDENTIALS_FILE = path.join(__dirname, '../../demo-credentials.local.md');
const FLAG = 'demoJourney';

const ACCOUNTS = [
  {
    key: 'founder', label: 'Student / Founder', name: 'Aarav Sharma', email: 'aarav.student@example.com', role: 'student',
    profile: { college: 'Don Bosco Institute of Technology', department: 'Computer Engineering', year: 'Final Year', studentId: 'DEMO-CE-001', skills: ['Python', 'Machine Learning', 'Computer Vision'], interests: ['AgriTech', 'Applied AI'], startupExperience: 'Led a campus hackathon team that prototyped a crop-disease classifier.', bio: 'AI startup founder building tools for small farms.' },
  },
  {
    key: 'teammate', label: 'Student / Team Member', name: 'Priya Patel', email: 'priya.student@example.com', role: 'student',
    profile: { college: 'Don Bosco Institute of Technology', department: 'Information Technology', year: 'Third Year', studentId: 'DEMO-IT-002', skills: ['Data Science', 'SQL', 'Statistics'], interests: ['Data Analytics', 'AgriTech'], startupExperience: 'Data analyst intern on a student startup project.', bio: 'Data science student.' },
  },
  {
    key: 'coordinator', label: 'Faculty Coordinator', name: 'Dr. Neha Kulkarni', email: 'neha.faculty@example.com', role: 'faculty', facultyRole: 'coordinator',
    profile: { department: 'Computer Science & AI', designation: 'Associate Professor & Incubation Coordinator', researchAreas: ['Artificial Intelligence', 'Startup Evaluation', 'Applied Machine Learning'] },
  },
  {
    key: 'mentor', label: 'Mentor', name: 'Rahul Mehta', email: 'rahul.mentor@example.com', role: 'mentor',
    profile: { organization: 'Northwind Ventures (fictional)', designation: 'Founder & Startup Mentor', expertise: ['AI', 'Artificial Intelligence', 'Machine Learning', 'Computer Vision', 'AgriTech', 'Agriculture', 'Farming', 'Crop Disease Detection', 'HealthTech', 'Healthcare', 'Health', 'Product Development'], stages: ['Idea', 'Prototype', 'MVP'], maxMentees: 3, bio: 'AI/ML engineer turned founder; mentors early-stage product teams.' },
  },
  {
    key: 'mentor2', label: 'Mentor (sustainability / IoT / hardware)', name: 'Dr. Meera Kulkarni', email: 'meera.mentor@example.com', role: 'mentor',
    profile: { organization: 'GreenGrid Labs (fictional)', designation: 'Principal Engineer & EIR', expertise: ['Sustainability', 'IoT', 'Hardware', 'CleanTech', 'Climate', 'Environment', 'Environmental Monitoring', 'Sensors', 'Embedded Systems', 'Smart Cities'], stages: ['Idea', 'Prototype', 'MVP'], maxMentees: 3, bio: 'Hardware and IoT specialist who mentors climate and sustainability teams from idea to pilot.' },
  },
  {
    key: 'mentor3', label: 'Mentor (FinTech / EdTech / SaaS)', name: 'Sanjay Iyer', email: 'sanjay.mentor@example.com', role: 'mentor',
    profile: { organization: 'Ledgerleaf Technologies (fictional)', designation: 'CTO & Startup Advisor', expertise: ['FinTech', 'Finance', 'Financial Education', 'EdTech', 'Education', 'SaaS', 'Payments', 'Go-To-Market', 'Product Development', 'Artificial Intelligence'], stages: ['Idea', 'Prototype', 'MVP', 'Growth'], maxMentees: 4, bio: 'Built and scaled two B2B SaaS products; advises student startups on product-market fit.' },
  },
  {
    key: 'industry', label: 'Industry Representative (mentor role + industry profile)', name: 'Ananya Desai', email: 'ananya.industry@example.com', role: 'mentor',
    profile: { organization: 'Brightwave Technologies (fictional)', designation: 'Head of Technology Partnerships', industryDomain: 'Enterprise Technology', representativeType: 'industry', expertise: ['Enterprise Software', 'FinTech', 'IoT', 'Industry Partnerships'], areasOfInterest: ['Pilot projects with startups', 'Sustainability tech'], stages: ['Prototype', 'MVP'], maxMentees: 2 },
  },
  {
    key: 'investor', label: 'Investor', name: 'Vikram Shah', email: 'vikram.investor@example.com', role: 'investor', isInvestorVerified: true,
    profile: {
      firmName: 'Lakeside Angels (fictional)', firmType: 'angel',
      investmentThesis: 'Early-stage technology startups applying AI to agriculture, healthcare, climate and financial inclusion in India.',
      ticketSizeMin: 500000, ticketSizeMax: 2500000, ticketSize: 'INR 5 lakh - 25 lakh',
      preferredSectors: ['AI', 'AgriTech', 'HealthTech', 'ClimateTech', 'FinTech', 'IoT'], preferredStages: ['Idea', 'Prototype', 'MVP'],
      // Keys the investor-matching agent reads:
      fundName: 'Lakeside Angels (fictional)', sectors: ['AI', 'AgriTech', 'HealthTech', 'ClimateTech', 'FinTech', 'IoT', 'Sustainability'], stages: ['Idea', 'Prototype', 'MVP'],
    },
  },
  {
    key: 'admin', label: 'Admin', name: 'Platform Admin', email: 'admin@example.com', role: 'admin',
    profile: { department: 'DBIT Incubation Center', title: 'Application and User Management' },
  },
  {
    key: 'superadmin', label: 'Super Admin', name: 'Platform Super Admin', email: 'superadmin@example.com', role: 'super_admin', twoFactor: true,
    profile: { department: 'DBIT Incubation Center', title: 'Platform-wide Administration' },
  },
];

const newPassword = () => `Demo-${crypto.randomBytes(9).toString('base64url')}!9`;

function target() {
  try { return new URL(process.env.MONGO_URI).host; } catch { return '(unparseable MONGO_URI)'; }
}

async function clean() {
  const users = await User.find({ [`profile.${FLAG}`]: true }).select('_id email').lean();
  const ids = users.map((u) => u._id);
  const strIds = ids.map(String);
  const r = {
    startupProfiles: (await StartupProfile.deleteMany({ founderId: { $in: ids } })).deletedCount,
    projects: (await FacultyProject.deleteMany({ ownerUserId: { $in: strIds } })).deletedCount,
    memberships: (await TeamMembership.deleteMany({ $or: [{ invitedBy: { $in: strIds } }, { userId: { $in: strIds } }] })).deletedCount,
    users: (await User.deleteMany({ _id: { $in: ids } })).deletedCount,
  };
  console.log('[demo] removed:', r);
  console.log('[demo] Applications live in agent-service (standalone_data.sqlite); they are not removed here.');
  if (fs.existsSync(CREDENTIALS_FILE)) fs.unlinkSync(CREDENTIALS_FILE);
}

async function seed({ rotate }) {
  const created = [];
  const kept = [];
  const creds = [];
  for (const a of ACCOUNTS) {
    const email = a.email.toLowerCase();
    const existing = await User.findOne({ email });
    if (existing && !existing.profile?.[FLAG]) {
      throw new Error(`${email} already exists and is not a demo-journey account; refusing to modify it.`);
    }
    const profile = { ...a.profile, isDemo: true, [FLAG]: true };
    const base = {
      name: a.name, role: a.role, facultyRole: a.facultyRole || null, emailVerified: true, status: 'active', mustChangePassword: false,
      isInvestorVerified: Boolean(a.isInvestorVerified), investorVerifiedAt: a.isInvestorVerified ? new Date() : null, profile,
    };
    if (a.twoFactor) base.twoFactorEnabled = true;

    if (existing) {
      Object.assign(existing, base);
      let pw = null;
      if (rotate) { pw = newPassword(); existing.passwordHash = await User.hashPassword(pw); }
      if (a.twoFactor && !existing.twoFactorSecret) existing.twoFactorSecret = generateSecret();
      await existing.save();
      kept.push(email);
      if (pw) creds.push({ a, pw, secret: existing.twoFactorSecret });
    } else {
      const pw = newPassword();
      const doc = new User({ ...base, email, passwordHash: await User.hashPassword(pw), twoFactorSecret: a.twoFactor ? generateSecret() : null });
      await doc.save();
      created.push(email);
      creds.push({ a, pw, secret: doc.twoFactorSecret });
    }
  }

  if (creds.length) writeCredentials(creds, { merge: !rotate });
  else if (!fs.existsSync(CREDENTIALS_FILE)) console.log('[demo] All accounts already exist but the credentials file is missing; re-run with --rotate-passwords.');
  console.log(`[demo] created ${created.length}, already present ${kept.length}`);
  created.forEach((e) => console.log('  + ' + e));
  kept.forEach((e) => console.log('  = ' + e));
}

function writeCredentials(creds, { merge }) {
  const rows = new Map();
  if (merge && fs.existsSync(CREDENTIALS_FILE)) {
    for (const line of fs.readFileSync(CREDENTIALS_FILE, 'utf8').split('\n')) {
      const m = line.match(/^\| (.+?) \| (.+?) \| `(.+?)` \| `(.+?)` \| (.*) \|$/);
      if (m) rows.set(m[3], line);
    }
  }
  for (const { a, pw, secret } of creds) {
    const note = a.twoFactor ? `2FA required. TOTP secret \`${secret}\`; in development the code 123456 is also accepted.` : '';
    rows.set(a.email, `| ${a.label} | ${a.name} | \`${a.email}\` | \`${pw}\` | ${note} |`);
  }
  const order = ACCOUNTS.map((a) => a.email);
  const body = [...rows.entries()].sort((x, y) => order.indexOf(x[0]) - order.indexOf(y[0])).map(([, l]) => l).join('\n');
  fs.writeFileSync(CREDENTIALS_FILE, [
    '# Demo credentials (LOCAL ONLY - git-ignored, fictional accounts)', '',
    `Generated ${new Date().toISOString()} for database host ${target()}. Sign in at http://localhost:3000/login.`, '',
    '| Role | Name | Email | Password | Notes |', '|---|---|---|---|---|', body, '',
  ].join('\n'), { mode: 0o600 });
  console.log(`[demo] credentials written to ${path.relative(process.cwd(), CREDENTIALS_FILE)} (git-ignored)`);
}

(async () => {
  const args = process.argv.slice(2);
  if (process.env.NODE_ENV === 'production') { console.error('Refusing to run with NODE_ENV=production.'); process.exit(1); }
  if (!args.includes('--yes')) { console.error(`Dry run only. Target database host: ${target()}\nRe-run with --yes to write.`); process.exit(1); }
  if (!process.env.MONGO_URI) { console.error('MONGO_URI is not set.'); process.exit(1); }
  console.log(`[demo] target database host: ${target()}`);
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 15000 });
  try {
    if (args.includes('--clean')) await clean();
    else await seed({ rotate: args.includes('--rotate-passwords') });
  } catch (e) {
    console.error('[demo] failed:', e.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
})();
