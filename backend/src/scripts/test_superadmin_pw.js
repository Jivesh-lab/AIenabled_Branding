const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
const mongoose = require('mongoose');
const User = require('../models/User');

async function testAuth() {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/dbitic';
  await mongoose.connect(uri);

  const superAdmin = await User.findOne({ email: 'superadmin@aai-dbitic.edu' });
  if (!superAdmin) {
    console.log('Superadmin not found!');
    process.exit(1);
  }

  const passwordsToTest = [
    'SuperAdmin#2026!Secure',
    'SuperAdmin@123',
    'Admin#2026!Ops',
    'admin123',
    'password',
    'SuperAdmin#2026'
  ];

  console.log('Testing passwords for superadmin@aai-dbitic.edu:');
  for (const pw of passwordsToTest) {
    const ok = await User.verifyPassword(pw, superAdmin.passwordHash);
    console.log(`Password "${pw}": ${ok ? 'MATCH!' : 'Failed'}`);
  }

  console.log('Superadmin 2FA secret:', superAdmin.twoFactorSecret);
  process.exit(0);
}

testAuth().catch(err => {
  console.error(err);
  process.exit(1);
});

