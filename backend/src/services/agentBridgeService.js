const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const FacultyProject = require('../models/FacultyProject');
const StartupProfile = require('../models/StartupProfile');
const MentorAllocation = require('../models/MentorAllocation');
const User = require('../models/User');

let DatabaseSync = null;
try {
  ({ DatabaseSync } = require('node:sqlite'));
} catch (err) {
  console.warn('[agentBridge] node:sqlite not available:', err.message);
}

const SQLITE_PATH = path.resolve(__dirname, '../../../agent-service/standalone_data.sqlite');

async function updateAgentApplicationStatus(appId, status, reviewerId = 'faculty-coordinator', comments = 'Decision updated by Faculty') {
  if (!DatabaseSync || !fs.existsSync(SQLITE_PATH)) {
    return false;
  }

  try {
    const db = new DatabaseSync(SQLITE_PATH);
    const nowIso = new Date().toISOString();
    const row = db.prepare('SELECT status FROM applications WHERE id = ?').get(String(appId));

    if (!row) {
      // Look up from MongoDB and upsert into SQLite
      const [proj, sp] = await Promise.all([
        FacultyProject.findOne({ id: String(appId) }).lean(),
        StartupProfile.findOne({ applicationId: String(appId) }).lean(),
      ]);

      const title = proj?.title || sp?.name || 'Incubation Project';
      const domain = proj?.domain || sp?.sector || 'Technology';
      const stage = (proj?.stage || sp?.stage || 'Prototype').toLowerCase();
      const startupId = sp?.startupId || `s-${appId}`;
      const applicantId = sp?.founderId?.toString() || proj?.teamMembers?.[0]?.id || '6ae6f2ebbcac8a7c0f6a90ec';

      const startupRow = db.prepare('SELECT id FROM startups WHERE id = ?').get(startupId);
      if (!startupRow) {
        db.prepare(`
          INSERT INTO startups (id, user_id, name, tagline, problem, solution, stage, sector, status, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)
        `).run(startupId, applicantId, title, proj?.description || title, proj?.description || 'Problem statement', 'Proposed solution', stage, domain, nowIso, nowIso);
      }

      const formData = JSON.stringify({
        name: title,
        title,
        domain,
        sector: domain,
        maturity: stage,
        stage,
        shortDescription: proj?.description || title,
        teamMembers: proj?.teamMembers || [{ name: proj?.leadStudent || 'Student Founder', rollNumber: proj?.rollNumber || 'DBIT-2026', email: 'student@aai-dbitic.edu', role: 'Lead Founder' }],
      });

      db.prepare(`
        INSERT INTO applications (id, startup_id, applicant_id, status, completeness, eligibility_ok, documents, form_data, ai_summary, ai_feedback, reviewer_id, reviewer_comments, submitted_at, reviewed_at, created_at, updated_at)
        VALUES (?, ?, ?, ?, 85, 1, '[]', ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        String(appId), startupId, applicantId, status, formData,
        `AI synthesis for ${title}`, 'Meets incubation criteria.',
        reviewerId, comments, nowIso, status === 'approved' ? nowIso : null, nowIso, nowIso
      );
    } else {
      const prevStatus = row.status;
      db.prepare(`
        UPDATE applications
        SET status = ?, reviewer_id = ?, reviewer_comments = ?, reviewed_at = ?, updated_at = ?
        WHERE id = ?
      `).run(status, reviewerId, comments, nowIso, nowIso, String(appId));

      try {
        const auditId = 'aud-' + Date.now();
        db.prepare(`
          INSERT INTO application_audit_logs (id, application_id, actor_id, previous_status, new_status, comments, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(auditId, String(appId), reviewerId, prevStatus, status, comments, nowIso);
      } catch (auditErr) {
        console.warn('[agentBridge] SQLite audit log write warning:', auditErr.message);
      }
    }

    db.close();
    console.log(`[agentBridge] Successfully updated application ${appId} status to '${status}' in SQLite.`);
    return true;
  } catch (err) {
    console.error('[agentBridge] updateAgentApplicationStatus error:', err.message);
    return false;
  }
}

async function syncAgentApplications() {
  if (!DatabaseSync || !fs.existsSync(SQLITE_PATH)) {
    return;
  }

  try {
    // 1. Sync from SQLite into MongoDB
    const db = new DatabaseSync(SQLITE_PATH);
    const rows = db.prepare(`
      SELECT 
        a.id as app_id, a.applicant_id, a.status as review_status, a.form_data, a.submitted_at,
        s.id as startup_id, s.name, s.tagline, s.sector, s.stage, s.problem, s.solution
      FROM applications a
      JOIN startups s ON a.startup_id = s.id
    `).all();

    for (const r of rows) {
      let form = {};
      try {
        form = JSON.parse(r.form_data || '{}');
      } catch {}

      const team = Array.isArray(form.teamMembers) ? form.teamMembers : [];
      const lead = team[0] || {};
      const stageRaw = r.stage || form.maturity || 'Ideation';
      const stageCap = stageRaw.charAt(0).toUpperCase() + stageRaw.slice(1).toLowerCase();
      const title = (r.name || form.name || 'Startup Project').trim();
      const domain = (r.sector || form.domain || 'Technology').trim();
      const leadName = lead.name || 'Student Founder';
      const rollNo = lead.rollNumber || 'DBIT-2026';
      const dept = form.department || 'Engineering';

      // Check existing MentorAllocation in Mongo to preserve allocated mentor
      const existingAlloc = await MentorAllocation.findOne({
        projectId: String(r.app_id),
      }).sort({ updatedAt: -1, createdAt: -1 }).lean();

      const existingProject = await FacultyProject.findOne({ id: String(r.app_id) }).lean();

      const isAllocApproved = existingAlloc && (existingAlloc.status === 'approved' || existingAlloc.status === 'allocated');
      const allocatedMentor = isAllocApproved
        ? (existingAlloc.allocatedMentorName || existingAlloc.recommendedMentorName || existingProject?.allocatedMentorName || null)
        : (existingProject?.allocatedMentorName || null);

      let effectiveStatus = r.review_status;
      // If mentor allocation is approved in Mongo, but SQLite application status is still submitted/pending, auto-sync SQLite to approved!
      if (isAllocApproved && r.review_status !== 'approved') {
        const nowIso = new Date().toISOString();
        db.prepare(`
          UPDATE applications
          SET status = 'approved', reviewer_id = 'faculty-coordinator', reviewer_comments = 'Auto-aligned with approved mentor allocation', reviewed_at = ?, updated_at = ?
          WHERE id = ?
        `).run(nowIso, nowIso, String(r.app_id));
        effectiveStatus = 'approved';
      }

      const isApproved = effectiveStatus === 'approved';
      const effectiveStage = isApproved && (stageCap === 'Idea' || stageCap === 'Ideation') ? 'Prototype' : stageCap;
      const progress = isApproved ? (allocatedMentor ? 75 : 60) : 30;
      const nextMilestone = allocatedMentor
        ? 'Prototype Milestone & Mentor Review'
        : isApproved
          ? 'Mentor Strategy Review'
          : 'Initial Faculty Screening';

      // 1. Sync to FacultyProject for Faculty Coordinator & Volunteer views
      await FacultyProject.findOneAndUpdate(
        { id: String(r.app_id) },
        {
          $set: {
            id: String(r.app_id),
            title,
            domain,
            stage: effectiveStage,
            leadStudent: leadName,
            rollNumber: rollNo,
            department: dept,
            teamMembers: team.length ? team : [{ name: leadName, email: lead.email || 'student@aai-dbit.edu', role: 'Lead' }],
            assignedCoordinatorName: 'Dr. K. R. Raman',
            assignedVolunteerName: 'Prof. Ananya Sen',
            allocatedMentorName: allocatedMentor,
            trl: effectiveStage.toLowerCase().includes('prototype') ? 4 : 2,
            progress,
            health: 'On Track',
            overdueMilestonesCount: 0,
            nextMilestone,
            nextMilestoneDate: '2026-11-20',
            description: (r.tagline || form.shortDescription || r.problem || '').trim(),
          },
        },
        { upsert: true, returnDocument: 'after' }
      );

      // 2. Also ensure StartupProfile exists for the applicant
      let founderObjectId = null;
      if (mongoose.Types.ObjectId.isValid(r.applicant_id)) {
        founderObjectId = new mongoose.Types.ObjectId(r.applicant_id);
      } else {
        const u = await User.findOne({ role: 'student' }).select('_id').lean();
        if (u) founderObjectId = u._id;
      }

      await StartupProfile.findOneAndUpdate(
        { applicationId: String(r.app_id) },
        {
          $set: {
            applicationId: String(r.app_id),
            startupId: String(r.startup_id || r.app_id),
            founderId: founderObjectId,
            name: title,
            tagline: (r.tagline || form.shortDescription || 'Innovative Venture').trim(),
            problem: (r.problem || form.problem || 'Market problem').trim(),
            solution: (r.solution || form.solution || 'Proposed solution').trim(),
            sector: domain,
            stage: effectiveStage.toLowerCase(),
            status: 'active',
            isApproved: true,
            readinessScore: 75,
            tags: [domain],
          },
        },
        { upsert: true, returnDocument: 'after' }
      );
    }

    // 2. Sync MongoDB projects into SQLite (so un-synced MongoDB projects are mirrored in SQLite)
    const mongoProjects = await FacultyProject.find({}).lean();
    const nowIso = new Date().toISOString();
    for (const p of mongoProjects) {
      const appId = String(p.id);
      const appRow = db.prepare('SELECT id, status FROM applications WHERE id = ?').get(appId);
      const isApproved = Boolean(p.allocatedMentorName) || p.stage === 'Prototype' || p.stage === 'Validation' || p.progress >= 50;
      const targetStatus = isApproved ? 'approved' : 'submitted';

      if (!appRow) {
        const startupId = `s-${appId}`;
        const applicantId = p.teamMembers?.[0]?.id || '6ae6f2ebbcac8a7c0f6a90ec';
        const title = p.title || 'Incubation Project';
        const domain = p.domain || 'Technology';
        const stage = (p.stage || 'Prototype').toLowerCase();

        const sRow = db.prepare('SELECT id FROM startups WHERE id = ?').get(startupId);
        if (!sRow) {
          db.prepare(`
            INSERT INTO startups (id, user_id, name, tagline, problem, solution, stage, sector, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)
          `).run(startupId, applicantId, title, p.description || title, p.description || 'Problem statement', 'Proposed solution', stage, domain, nowIso, nowIso);
        }

        const formData = JSON.stringify({
          name: title,
          title,
          domain,
          sector: domain,
          maturity: stage,
          stage,
          shortDescription: p.description || title,
          teamMembers: p.teamMembers || [{ name: p.leadStudent || 'Aarav Patel', rollNumber: p.rollNumber || 'DBIT-2026', email: 'student@aai-dbitic.edu', role: 'Lead Founder' }],
        });

        db.prepare(`
          INSERT INTO applications (id, startup_id, applicant_id, status, completeness, eligibility_ok, documents, form_data, ai_summary, ai_feedback, reviewer_id, reviewer_comments, submitted_at, reviewed_at, created_at, updated_at)
          VALUES (?, ?, ?, ?, 85, 1, '[]', ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          appId, startupId, applicantId, targetStatus, formData,
          `AI synthesis for ${title}`, 'Meets incubation criteria.',
          'faculty-coordinator', isApproved ? 'Approved by Faculty Review Panel' : 'Awaiting Faculty Screening',
          nowIso, isApproved ? nowIso : null, nowIso, nowIso
        );
      } else if (isApproved && appRow.status !== 'approved') {
        db.prepare(`
          UPDATE applications
          SET status = 'approved', reviewer_id = 'faculty-coordinator', reviewer_comments = 'Approved by Faculty Review Panel', reviewed_at = ?, updated_at = ?
          WHERE id = ?
        `).run(nowIso, nowIso, appId);
      }
    }

    db.close();
  } catch (err) {
    console.warn('[agentBridge] Sync notice:', err.message);
  }
}

module.exports = { syncAgentApplications, updateAgentApplicationStatus };
