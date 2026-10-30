const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
const mongoose = require('mongoose');
const User = require('../models/User');

async function main() {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/dbitic';
  console.log('Connecting to', uri);
  await mongoose.connect(uri);
  
  const users = await User.find({}).lean();
  console.log('--- ALL USERS IN DB ---');
  for (const u of users) {
    console.log(`Email: ${u.email} | Role: ${u.role} | 2FA: ${u.twoFactorEnabled} | HasSecret: ${!!u.twoFactorSecret}`);
  }

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

