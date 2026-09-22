const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');
const { logAuditTrail } = require('../middleware/auditLogger');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/aai_dbitic';
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'admin@aai-dbitic.edu').toLowerCase().trim();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin#2026!Ops';
const ADMIN_NAME = process.env.ADMIN_NAME || 'Operations Manager (Admin)';

async function seedAdmin() {
  console.log('====================================================');
  console.log('         AAI-DBITIC Admin Seed Script              ');
  console.log('====================================================');

  try {
    console.log(`Connecting to MongoDB at: ${MONGO_URI}...`);
    await mongoose.connect(MONGO_URI);
    console.log('DB connected successfully.');

    let user = await User.findOne({ email: ADMIN_EMAIL });
    const passwordHash = await User.hashPassword(ADMIN_PASSWORD);

    if (user) {
      console.log(`[SEED] Existing account found for email: ${ADMIN_EMAIL}`);
      user.name = ADMIN_NAME;
      user.passwordHash = passwordHash;
      user.role = 'admin';
      user.emailVerified = true;
      user.status = 'active';
      await user.save();
      console.log(`[SEED] Admin account UPDATED successfully.`);
    } else {
      console.log(`[SEED] Creating NEW Admin account for email: ${ADMIN_EMAIL}`);
      user = await User.create({
        name: ADMIN_NAME,
        email: ADMIN_EMAIL,
        passwordHash,
        role: 'admin',
        emailVerified: true,
        status: 'active',
        profile: {
          department: 'Incubation Center Operations',
          title: 'Operations Manager',
        },
      });
      console.log(`[SEED] Admin account CREATED successfully.`);
    }

    await logAuditTrail({
      userId: user._id,
      email: user.email,
      role: 'admin',
      action: 'ADMIN_SEEDED',
      details: {
        note: 'Operational Admin seeded via CLI script',
        email: ADMIN_EMAIL,
      },
    });

    console.log('\n----------------------------------------------------');
    console.log(' ADMIN OPERATIONAL CREDENTIALS ');
    console.log('----------------------------------------------------');
    console.log(` Email:        ${ADMIN_EMAIL}`);
    console.log(` Role:         ${user.role}`);
    console.log(` Password:     ${ADMIN_PASSWORD}`);
    console.log('----------------------------------------------------');
    console.log(' Login at: http://localhost:3000/login');
    console.log('----------------------------------------------------\n');
  } catch (err) {
    console.error('[SEED ERROR]', err);
  } finally {
    await mongoose.disconnect();
    console.log('DB disconnected. Seed complete.');
  }
}

seedAdmin();
