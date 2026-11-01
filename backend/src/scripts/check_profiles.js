const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
const mongoose = require('mongoose');
const StartupProfile = require('../models/StartupProfile');
const FacultyProject = require('../models/FacultyProject');

async function main() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/dbitic');
  const profiles = await StartupProfile.find().lean();
  console.log('STARTUP_PROFILES_COUNT:', profiles.length);
  for (const p of profiles) {
    console.log(`- ${p.name} | isApproved: ${p.isApproved} | AppID: ${p.applicationId}`);
  }

  const facultyProjects = await FacultyProject.find().lean();
  console.log('FACULTY_PROJECTS_COUNT:', facultyProjects.length);
  for (const fp of facultyProjects) {
    console.log(`- ${fp.title} | ID: ${fp.id} | Health: ${fp.health} | Coordinator: ${fp.assignedCoordinatorName}`);
  }

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

