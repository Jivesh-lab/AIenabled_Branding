/**
 * Controlled demo dataset for the incubation centre.
 *
 *   node src/scripts/seedDemoData.js --yes                 create (or refresh) the demo set
 *   node src/scripts/seedDemoData.js --clean --yes         remove ONLY what this script created
 *   node src/scripts/seedDemoData.js --remove-legacy-samples --yes
 *                                                          remove the old auto-seeded sample projects
 *                                                          (proj-1..4, mr-1..3, meet-1..2, task-1..3, sr-1..2)
 *
 * It never runs implicitly (the web app no longer seeds on page reads) and refuses to write without --yes.
 * Demo accounts are flagged profile.isDemo and demo records use a "demo-" id prefix, so cleaning cannot touch
 * real data. No activity is faked: the Action Log, jobs and approvals fill only when the agents actually run.
 *
 * Needs MONGO_URI and DEMO_USER_PASSWORD in backend/.env (or the environment). Run `npm run seed:all` first so
 * a faculty coordinator and an admin exist.
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const FacultyProject = require('../models/FacultyProject');
const FacultyTask = require('../models/FacultyTask');
const FacultyMeeting = require('../models/FacultyMeeting');
const MentorAllocation = require('../models/MentorAllocation');
const SupportRequest = require('../models/SupportRequest');
const StartupProfile = require('../models/StartupProfile');

const DAY = 86400000;
const iso = (offsetDays) => new Date(Date.now() + offsetDays * DAY).toISOString().slice(0, 10);

const MENTORS = [
  { name: 'Dr. Anil Deshpande', email: 'demo.mentor.anil@example.edu', profile: { organization: 'Agri Research Institute', designation: 'Principal Scientist', expertise: ['AgriTech', 'IoT', 'Computer Vision'], stages: ['Prototype', 'MVP'], maxMentees: 3 } },
  { name: 'Meera Iyer', email: 'demo.mentor.meera@example.edu', profile: { organization: 'LearnNova', designation: 'Head of Learning Science', expertise: ['EdTech', 'AI', 'Product'], stages: ['Idea', 'Prototype', 'MVP'], maxMentees: 2 } },
  { name: 'Rajesh Kulkarni', email: 'demo.mentor.rajesh@example.edu', profile: { organization: 'Nexus Health', designation: 'VP Technology', expertise: ['HealthTech', 'MedTech', 'Regulatory'], stages: ['Idea', 'Prototype'], maxMentees: 3 } },
  { name: 'Aakash Verma', email: 'demo.mentor.aakash@example.edu', profile: { organization: 'FinPulse Labs', designation: 'CTO', expertise: ['Fintech', 'SaaS', 'Payments'], stages: ['Prototype', 'MVP', 'Growth'], maxMentees: 4 } },
  { name: 'Prof. Sunita Kapoor', email: 'demo.mentor.sunita@example.edu', profile: { organization: 'DBIT Materials Lab', designation: 'Professor', expertise: ['GreenTech', 'Materials', 'Packaging'], stages: ['Idea', 'Prototype'], maxMentees: 1 } },
  { name: 'Vikram Malhotra', email: 'demo.mentor.vikram@example.edu', profile: { organization: 'Smart Cities Forum', designation: 'Consultant', expertise: ['IoT', 'Smart City', 'CleanTech'], stages: ['Prototype', 'MVP'], maxMentees: 2, availability: 'unavailable' } },
  { name: 'Neha Joshi', email: 'demo.mentor.neha@example.edu', profile: { organization: 'LexTech Partners', designation: 'Partner', expertise: ['LegalTech', 'Compliance', 'SaaS'], stages: ['Concept', 'Idea'], maxMentees: 3 } },
];

const INVESTORS = [
  { name: 'Rohit Singhania', email: 'demo.investor.rohit@example.edu', profile: { fundName: 'Horizon Catalyst Ventures', ticketSize: '$25k - $150k', sectors: ['AgriTech', 'HealthTech', 'ClimateTech'], stages: ['Idea', 'Prototype', 'MVP'] } },
  { name: 'Anjali Menon', email: 'demo.investor.anjali@example.edu', profile: { fundName: 'Lotus Seed Fund', ticketSize: '$50k - $300k', sectors: ['Fintech', 'EdTech', 'SaaS'], stages: ['Prototype', 'MVP', 'Growth'] } },
  { name: 'Karan Bhatia', email: 'demo.investor.karan@example.edu', profile: { fundName: 'GreenLeaf Angels', ticketSize: '$10k - $75k', sectors: ['GreenTech', 'CleanTech', 'IoT'], stages: ['Idea', 'Prototype'] } },
];

// stage -> StartupProfile stage; progress/trl give the agents something realistic to work with.
const STARTUPS = [
  { key: 'agrisense', title: 'AgriSense', domain: 'AgriTech', stage: 'Prototype', profileStage: 'prototype', founder: 'Asha Rao', mentor: 'demo.mentor.anil@example.edu', progress: 65, trl: 5, ageDays: 70, tagline: 'Low-cost soil-moisture sensing and irrigation advice for small farms', tasks: [{ title: 'Field-test the sensor on two farms', due: -3, status: 'Completed' }, { title: 'Share pilot results with the mentor', due: 6, status: 'Pending' }] },
  { key: 'meditrack', title: 'MediTrack', domain: 'HealthTech', stage: 'Idea', profileStage: 'idea', founder: 'Ravi Kumar', mentor: null, progress: 10, trl: 2, ageDays: 6, tagline: 'Tracking oxygen cylinders across rural hospitals', tasks: [] },
  { key: 'edupulse', title: 'EduPulse', domain: 'EdTech', stage: 'MVP', profileStage: 'mvp', founder: 'Priya Nair', mentor: 'demo.mentor.meera@example.edu', progress: 40, trl: 5, ageDays: 55, tagline: 'Adaptive revision tool for engineering students', tasks: [{ title: 'Submit the fortnightly progress report', due: -12, status: 'Pending' }] },
  { key: 'greenpack', title: 'GreenPack', domain: 'GreenTech', stage: 'Prototype', profileStage: 'prototype', founder: 'Arjun Mehta', mentor: 'demo.mentor.sunita@example.edu', progress: 55, trl: 4, ageDays: 48, tagline: 'Compostable packaging made from sugarcane bagasse', tasks: [{ title: 'Send samples for the lab certificate', due: 4, status: 'In Progress' }] },
  { key: 'finledger', title: 'FinLedger', domain: 'Fintech', stage: 'MVP', profileStage: 'mvp', founder: 'Sana Sheikh', mentor: 'demo.mentor.aakash@example.edu', progress: 85, trl: 6, ageDays: 90, tagline: 'Bookkeeping that small shops can run from WhatsApp', tasks: [{ title: 'Share the investor update', due: -2, status: 'Completed' }] },
  { key: 'cityflow', title: 'CityFlow', domain: 'IoT', stage: 'Idea', profileStage: 'idea', founder: 'Dev Patil', mentor: null, progress: 5, trl: 2, ageDays: 12, tagline: 'Traffic-light timing from camera counts', tasks: [] },
  { key: 'solarsathi', title: 'SolarSathi', domain: 'CleanTech', stage: 'Growth', profileStage: 'growth', founder: 'Isha Gupta', mentor: 'demo.mentor.aakash@example.edu', progress: 72, trl: 7, ageDays: 150, tagline: 'Rooftop solar planning for housing societies', tasks: [{ title: 'Close the first three society contracts', due: 9, status: 'In Progress' }] },
  { key: 'legallens', title: 'LegalLens', domain: 'LegalTech', stage: 'Concept', profileStage: 'concept', founder: 'Tanvi Shah', mentor: null, progress: 15, trl: 2, ageDays: 20, tagline: 'Plain-language summaries of rental agreements', tasks: [] },
];

const LEGACY = { projects: ['proj-1', 'proj-2', 'proj-3', 'proj-4'], mentorAllocations: ['mr-1', 'mr-2', 'mr-3'], meetings: ['meet-1', 'meet-2'], tasks: ['task-1', 'task-2', 'task-3'], support: ['sr-1', 'sr-2'] };

function redactedTarget() {
  try {
    return new URL(process.env.MONGO_URI).host;
  } catch {
    return '(unparseable MONGO_URI)';
  }
}

async function upsertUser(data, role, password) {
  const email = data.email.toLowerCase();
  const passwordHash = await bcrypt.hash(password, 10);
  const fields = { name: data.name, role, emailVerified: true, status: 'active', profile: { ...data.profile, isDemo: true }, passwordHash };
  if (role === 'investor') Object.assign(fields, { isInvestorVerified: true, investorVerifiedAt: new Date() });
  const existing = await User.findOne({ email });
  if (existing) {
    if (!existing.profile?.isDemo) throw new Error(`${email} exists and is not a demo account; refusing to overwrite it.`);
    Object.assign(existing, fields);
    await existing.save();
    return existing;
  }
  return User.create({ email, ...fields });
}

async function seed() {
  const password = process.env.DEMO_USER_PASSWORD;
  if (!password || password.length < 10) throw new Error('Set DEMO_USER_PASSWORD (at least 10 characters) in backend/.env before seeding.');
  const coordinator = (await User.findOne({ role: 'faculty', facultyRole: 'coordinator', status: 'active' })) || (await User.findOne({ role: 'faculty', status: 'active' }));
  if (!coordinator) throw new Error('No faculty coordinator account exists yet. Run `npm run seed:all` first.');

  const mentors = {};
  for (const m of MENTORS) mentors[m.email] = await upsertUser(m, 'mentor', password);
  for (const i of INVESTORS) await upsertUser(i, 'investor', password);

  for (const s of STARTUPS) {
    const founder = await upsertUser({ name: s.founder, email: `demo.student.${s.key}@example.edu`, profile: { department: 'Computer Engineering' } }, 'student', password);
    const id = `demo-${s.key}`;
    const mentor = s.mentor ? mentors[s.mentor] : null;
    await StartupProfile.findOneAndUpdate(
      { applicationId: id },
      { $set: { applicationId: id, founderId: founder._id, name: s.title, tagline: s.tagline, problem: `${s.tagline}. Demo record.`, solution: `A working ${s.domain} product. Demo record.`, sector: s.domain, stage: s.profileStage, status: 'active', isApproved: true, approvedAt: new Date(), readinessScore: s.progress, tractionSummary: null, tags: [s.domain] } },
      { upsert: true, returnDocument: 'after' }
    );
    await FacultyProject.findOneAndUpdate(
      { id },
      {
        $set: {
          id, title: s.title, domain: s.domain, stage: s.stage, leadStudent: s.founder, ownerUserId: String(founder._id), applicationId: id,
          coordinatorUserId: String(coordinator._id), assignedCoordinatorName: coordinator.name.replace(/\s*\([^)]*\)\s*$/, ''),
          mentorUserId: mentor ? String(mentor._id) : null, allocatedMentorName: mentor ? mentor.name : null,
          teamMembers: [{ name: s.founder, email: founder.email, role: 'Lead' }], trl: s.trl, progress: s.progress, health: 'On Track', description: s.tagline, isDemo: true,
          createdAt: new Date(Date.now() - s.ageDays * DAY),
        },
      },
      { upsert: true, returnDocument: 'after', timestamps: false }
    );
    if (mentor) {
      await MentorAllocation.findOneAndUpdate(
        { id: `demo-alloc-${s.key}` },
        { $set: { id: `demo-alloc-${s.key}`, projectId: id, projectTitle: s.title, studentName: s.founder, domain: s.domain, justification: 'Demo allocation.', status: 'approved', allocatedMentorName: mentor.name, allocatedMentorUserId: String(mentor._id) } },
        { upsert: true }
      );
    }
    for (const [index, t] of s.tasks.entries()) {
      await FacultyTask.findOneAndUpdate(
        { id: `demo-task-${s.key}-${index}` },
        { $set: { id: `demo-task-${s.key}-${index}`, title: t.title, projectId: id, projectTitle: s.title, assignedTo: s.founder, assignedRole: 'student', assignedUserId: String(founder._id), dueDate: iso(t.due), priority: 'Medium', status: t.status, source: 'demo', completedAt: t.status === 'Completed' ? new Date() : null } },
        { upsert: true }
      );
    }
  }
  console.log(`Seeded ${MENTORS.length} mentors, ${INVESTORS.length} investors and ${STARTUPS.length} startups (each with a linked founder account).`);
  console.log('All demo accounts use DEMO_USER_PASSWORD. Emails: demo.student.<startup>@example.edu, demo.mentor.<name>@example.edu, demo.investor.<name>@example.edu');
}

async function clean() {
  const demoUsers = await User.find({ 'profile.isDemo': true }).select('_id').lean();
  const results = {
    tasks: (await FacultyTask.deleteMany({ id: /^demo-task-/ })).deletedCount,
    allocations: (await MentorAllocation.deleteMany({ id: /^demo-alloc-/ })).deletedCount,
    projects: (await FacultyProject.deleteMany({ id: /^demo-/ })).deletedCount,
    profiles: (await StartupProfile.deleteMany({ applicationId: /^demo-/ })).deletedCount,
    users: (await User.deleteMany({ _id: { $in: demoUsers.map((u) => u._id) } })).deletedCount,
  };
  console.log('Removed demo data:', results);
}

async function removeLegacySamples() {
  const results = {
    projects: (await FacultyProject.deleteMany({ id: { $in: LEGACY.projects }, ownerUserId: null })).deletedCount,
    mentorAllocations: (await MentorAllocation.deleteMany({ id: { $in: LEGACY.mentorAllocations } })).deletedCount,
    meetings: (await FacultyMeeting.deleteMany({ id: { $in: LEGACY.meetings }, source: { $ne: 'agent' } })).deletedCount,
    tasks: (await FacultyTask.deleteMany({ id: { $in: LEGACY.tasks }, source: { $ne: 'agent' } })).deletedCount,
    support: (await SupportRequest.deleteMany({ id: { $in: LEGACY.support } })).deletedCount,
  };
  console.log('Removed legacy auto-seeded samples (projects not linked to a user only):', results);
}

async function main() {
  const args = new Set(process.argv.slice(2));
  if (!args.has('--yes')) {
    console.log('Dry run. This script writes to the database named by MONGO_URI. Re-run with --yes to proceed.');
    console.log('Target host:', redactedTarget());
    return;
  }
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to', redactedTarget());
  if (args.has('--remove-legacy-samples')) await removeLegacySamples();
  else if (args.has('--clean')) await clean();
  else await seed();
}

main()
  .catch((error) => {
    console.error('[SEED ERROR]', error.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
