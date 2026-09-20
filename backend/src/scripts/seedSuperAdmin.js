const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const { generateSecret } = require('otplib');
const QRCode = require('qrcode');
const User = require('../models/User');
const { logAuditTrail } = require('../middleware/auditLogger');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/aai_dbitic';
const SUPER_ADMIN_EMAIL = (process.env.SUPER_ADMIN_EMAIL || 'superadmin@aai-dbitic.edu').toLowerCase().trim();
const SUPER_ADMIN_PASSWORD = process.env.SUPER_ADMIN_PASSWORD || 'SuperAdmin#2026!Secure';
const SUPER_ADMIN_NAME = process.env.SUPER_ADMIN_NAME || 'System Owner (Super Admin)';

async function seedSuperAdmin() {
  console.log('====================================================');
  console.log('       AAI-DBITIC Super Admin Seed Script          ');
  console.log('====================================================');

  try {
    console.log(`Connecting to MongoDB at: ${MONGO_URI}...`);
    await mongoose.connect(MONGO_URI);
    console.log('DB connected successfully.');

    let user = await User.findOne({ email: SUPER_ADMIN_EMAIL });

    const passwordHash = await User.hashPassword(SUPER_ADMIN_PASSWORD);
    let secret;

    if (user) {
      console.log(`[SEED] Existing account found for email: ${SUPER_ADMIN_EMAIL}`);
      user.name = SUPER_ADMIN_NAME;
      user.passwordHash = passwordHash;
      user.role = 'super_admin';
      user.emailVerified = true;

      // Keep existing secret or generate new if absent
      if (!user.twoFactorSecret) {
        secret = generateSecret();
        user.twoFactorSecret = secret;
        user.twoFactorEnabled = true;
      } else {
        secret = user.twoFactorSecret;
        user.twoFactorEnabled = true;
      }

      await user.save();
      console.log(`[SEED] Super Admin account UPDATED successfully.`);
    } else {
      console.log(`[SEED] Creating NEW Super Admin account for email: ${SUPER_ADMIN_EMAIL}`);
      secret = generateSecret();

      user = await User.create({
        name: SUPER_ADMIN_NAME,
        email: SUPER_ADMIN_EMAIL,
        passwordHash,
        role: 'super_admin',
        emailVerified: true,
        twoFactorEnabled: true,
        twoFactorSecret: secret,
        profile: {
          department: 'System Infrastructure & Security',
          title: 'Lead System Developer & Owner',
        },
      });
      console.log(`[SEED] Super Admin account CREATED successfully.`);
    }

    const otpauthUrl = `otpauth://totp/AAI-DBITIC:${encodeURIComponent(SUPER_ADMIN_EMAIL)}?secret=${secret}&issuer=AAI-DBITIC`;
    const qrTerminal = await QRCode.toString(otpauthUrl, { type: 'terminal', small: true });

    await logAuditTrail({
      userId: user._id,
      email: user.email,
      role: 'super_admin',
      action: 'SUPER_ADMIN_SEEDED',
      details: {
        note: 'Super Admin seeded via CLI script',
        email: SUPER_ADMIN_EMAIL,
      },
    });

    console.log('\n----------------------------------------------------');
    console.log(' SUPER ADMIN CREDENTIALS & 2FA SETUP INFO ');
    console.log('----------------------------------------------------');
    console.log(` Email:        ${SUPER_ADMIN_EMAIL}`);
    console.log(` Role:         ${user.role}`);
    console.log(` Password:     ${SUPER_ADMIN_PASSWORD}`);
    console.log(` 2FA Secret:   ${secret}`);
    console.log('----------------------------------------------------');
    console.log(' Scan this QR code in Google Authenticator / Authy:');
    console.log(qrTerminal);
    console.log('----------------------------------------------------\n');
  } catch (err) {
    console.error('[SEED ERROR]', err);
  } finally {
    await mongoose.disconnect();
    console.log('DB disconnected. Seed complete.');
  }
}

seedSuperAdmin();
