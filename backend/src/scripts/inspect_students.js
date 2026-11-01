const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');

async function check() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('--- ALL STUDENT USERS IN MONGODB ---');
  const students = await User.find({ role: 'student' }).lean();
  console.log('Count:', students.length);
  students.forEach(s => {
    console.log({
      id: s._id,
      name: s.name,
      email: s.email,
      status: s.status,
      isSoftDeleted: s.isSoftDeleted,
      emailVerified: s.emailVerified,
      twoFactorEnabled: s.twoFactorEnabled,
      hasPassword: !!s.passwordHash,
    });
  });

  console.log('\n--- ALL USERS SUMMARY BY ROLE ---');
  const allUsers = await User.find({}).select('email role status').lean();
  allUsers.forEach(u => console.log(`${u.role}: ${u.email} (${u.status})`));

  await mongoose.disconnect();
}

check().catch(console.error);

