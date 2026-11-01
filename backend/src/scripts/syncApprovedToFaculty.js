const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
const mongoose = require('mongoose');
const sqlite3 = require('sqlite3').verbose();

const FacultyProject = require('../models/FacultyProject');
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/dbitic';

async function sync() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  const dbPath = path.join(__dirname, '..', '..', '..', 'agent-service', 'standalone_data.sqlite');
  const db = new sqlite3.Database(dbPath);

  db.all(
    `SELECT a.id, s.name, s.sector, s.stage, a.applicant_id, s.problem, s.tagline, a.form_data 
     FROM applications a 
     JOIN startups s ON a.startup_id = s.id 
     WHERE a.status = 'approved'`,
    [],
    async (err, rows) => {
      if (err) {
        console.error('SQLite err:', err);
        process.exit(1);
      }

      console.log(`Found ${rows.length} approved applications in agent service.`);

      for (const row of rows) {
        let formData = {};
        try {
          formData = JSON.parse(row.form_data || '{}');
        } catch {}

        const stageCap = (row.stage || 'Prototype').charAt(0).toUpperCase() + (row.stage || 'Prototype').slice(1).toLowerCase();

        const doc = {
          id: row.id,
          title: row.name,
          domain: row.sector || 'Technology',
          stage: stageCap,
          leadStudent: row.applicant_id.includes('@') ? row.applicant_id.split('@')[0] : 'Aarav Patel',
          rollNumber: formData.teamMembers?.[0]?.rollNumber || '2024-IT-042',
          department: formData.department || 'Information Technology',
          teamMembers: formData.teamMembers || [
            { name: 'Lead Student', rollNumber: '2024-IT-042', email: row.applicant_id, role: 'Lead Founder' }
          ],
          assignedCoordinatorName: 'Dr. K. R. Raman',
          assignedVolunteerName: 'Prof. Ananya Sen',
          allocatedMentorName: null,
          trl: stageCap === 'Mvp' ? 5 : 4,
          progress: 55,
          health: 'On Track',
          overdueMilestonesCount: 0,
          nextMilestone: 'Cohort Induction & Technical Review',
          nextMilestoneDate: '15 Nov 2026',
          description: row.tagline || row.problem || '',
        };

        await FacultyProject.findOneAndUpdate({ id: row.id }, { $set: doc }, { upsert: true, new: true });
        console.log(`Synced to FacultyProject: ${row.name} (${row.id})`);
      }

      const totalFacultyProjects = await FacultyProject.countDocuments();
      console.log(`Total projects in Faculty Coordinator view now: ${totalFacultyProjects}`);
      process.exit(0);
    }
  );
}

sync().catch(console.error);

