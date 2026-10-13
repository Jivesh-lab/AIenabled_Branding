const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const { generateSecret } = require('otplib');
const User = require('../models/User');
const { logAuditTrail } = require('../middleware/auditLogger');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/aai_dbitic';

const USERS_TO_SEED = [
  {
    name: 'Aarav Patel (Student Founder)',
    email: 'student@aai-dbit.edu',
    password: process.env.STUDENT_PASSWORD || 'Student#2026!Pass',
    role: 'student',
    emailVerified: true,
    status: 'active',
    twoFactorEnabled: false,
    profile: {
      college: 'Don Bosco Institute of Technology',
      department: 'Computer Engineering',
      year: 'Final Year',
      studentId: 'DBIT-2023-CS-084',
      bio: 'Building Next-Gen AI AgriTech autonomous sorting and quality inspection system.',
    },
  },
  {
    name: 'Aarav Patel (Student Founder)',
    email: 'student@aai-dbitic.edu',
    password: process.env.STUDENT_PASSWORD || 'Student#2026!Pass',
    role: 'student',
    emailVerified: true,
    status: 'active',
    twoFactorEnabled: false,
    profile: {
      college: 'Don Bosco Institute of Technology',
      department: 'Computer Engineering',
      year: 'Final Year',
      studentId: 'DBIT-2023-CS-084',
      bio: 'Building Next-Gen AI AgriTech autonomous sorting and quality inspection system.',
    },
  },
  {
    name: 'Dr. K. R. Raman (Faculty Coordinator)',
    email: 'dr.raman@dbit.ac.in',
    password: 'Faculty#2026!Pass',
    role: 'faculty',
    facultyRole: 'coordinator',
    emailVerified: true,
    status: 'active',
    twoFactorEnabled: false,
    profile: {
      department: 'Electronics & Computer Science',
      designation: 'Chief Incubation Coordinator',
      title: 'Chief Incubation Coordinator',
    },
  },
  {
    name: 'Prof. Ananya Sen (Faculty Volunteer)',
    email: 'ananya.sen@dbit.ac.in',
    password: 'Faculty#2026!Pass',
    role: 'faculty',
    facultyRole: 'volunteer',
    emailVerified: true,
    status: 'active',
    twoFactorEnabled: false,
    profile: {
      department: 'Computer Science & AI',
      designation: 'Faculty Volunteer Advisor',
      title: 'Faculty Volunteer Advisor',
    },
  },
  {
    name: 'Faculty General Account',
    email: 'faculty@dbit.ac.in',
    password: 'Faculty#2026!Pass',
    role: 'faculty',
    facultyRole: 'coordinator',
    emailVerified: true,
    status: 'active',
    twoFactorEnabled: false,
    profile: {
      department: 'Incubation Innovation Desk',
      designation: 'Faculty Guide',
      title: 'Faculty Guide',
    },
  },
  {
    name: 'Dr. Neha Sharma (Faculty Coordinator)',
    email: 'coordinator@aai-dbitic.edu',
    password: process.env.COORDINATOR_PASSWORD || 'Coordinator#2026!Pass',
    role: 'faculty',
    facultyRole: 'coordinator',
    emailVerified: true,
    status: 'active',
    twoFactorEnabled: false,
    profile: {
      department: 'Computer Science & AI',
      designation: 'Associate Professor & Incubation Coordinator',
      researchAreas: ['Artificial Intelligence', 'Embedded Systems', 'Startup Mentoring'],
    },
  },
  {
    name: 'Prof. Rajesh Kulkarni (Faculty Volunteer)',
    email: 'volunteer@aai-dbitic.edu',
    password: process.env.VOLUNTEER_PASSWORD || 'Volunteer#2026!Pass',
    role: 'faculty',
    facultyRole: 'volunteer',
    emailVerified: true,
    status: 'active',
    twoFactorEnabled: false,
    profile: {
      department: 'Electronics & Telecommunication',
      designation: 'Assistant Professor & Faculty Volunteer',
      researchAreas: ['IoT', 'Hardware Prototyping', 'Student Project Guidance'],
    },
  },
  {
    name: 'Dr. Neha Sharma (Legacy Faculty Login)',
    email: 'faculty@aai-dbitic.edu',
    password: process.env.FACULTY_PASSWORD || 'Faculty#2026!Pass',
    role: 'faculty',
    facultyRole: 'coordinator',
    emailVerified: true,
    status: 'active',
    twoFactorEnabled: false,
    profile: {
      department: 'Computer Science & AI',
      designation: 'Associate Professor & Incubation Coordinator',
      researchAreas: ['Artificial Intelligence', 'Embedded Systems', 'Startup Mentoring'],
    },
  },
  {
    name: 'Vikramaditya Rao (Industry Mentor)',
    email: 'mentor@aai-dbitic.edu',
    password: process.env.MENTOR_PASSWORD || 'Mentor#2026!Pass',
    role: 'mentor',
    emailVerified: true,
    status: 'active',
    twoFactorEnabled: false,
    profile: {
      organization: 'DeepTech Venture Studio',
      designation: 'Managing Partner & EIR',
      expertise: ['DeepTech', 'B2B SaaS', 'Product-Market Fit', 'Go-To-Market'],
      totalMentees: 14,
    },
  },
  {
    name: 'Rohit Singhania (Angel Investor)',
    email: 'investor@aai-dbitic.edu',
    password: process.env.INVESTOR_PASSWORD || 'Investor#2026!Pass',
    role: 'investor',
    emailVerified: true,
    status: 'active',
    isInvestorVerified: true,
    twoFactorEnabled: false,
    profile: {
      fundName: 'Horizon Catalyst Ventures',
      ticketSize: '$25k - $150k',
      sectors: ['AI/ML', 'HealthTech', 'AgriTech', 'ClimateTech'],
      stages: ['Ideation', 'Prototype', 'MVP'],
      accreditationType: 'Angel Syndicate Partner',
    },
  },
  {
    name: 'Kavita Deshmukh (Incubation Ops Admin)',
    email: 'admin@aai-dbitic.edu',
    password: process.env.ADMIN_PASSWORD || 'Admin#2026!Ops',
    role: 'admin',
    emailVerified: true,
    status: 'active',
    twoFactorEnabled: false,
    profile: {
      department: 'DBIT Incubation Center',
      title: 'Operations & Community Manager',
    },
  },
  {
    name: 'Omkar G (System Owner Super Admin)',
    email: 'superadmin@aai-dbitic.edu',
    password: process.env.SUPER_ADMIN_PASSWORD || 'SuperAdmin#2026!Secure',
    role: 'super_admin',
    emailVerified: true,
    status: 'active',
    twoFactorEnabled: true,
    twoFactorSecret: 'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP', // Valid 32-char Base32 secret (160 bits)
    profile: {
      department: 'Executive Governance & Platform Architecture',
      title: 'Chief Technology Director',
    },
  },
];

async function seedAllUsers() {
  console.log('====================================================');
  console.log('       AAI-DBITIC Complete Multi-Role Seed Script   ');
  console.log('====================================================');

  try {
    console.log(`Connecting to MongoDB at: ${MONGO_URI}...`);
    await mongoose.connect(MONGO_URI);
    console.log('DB connected successfully.\n');

    for (const userData of USERS_TO_SEED) {
      const { email, password, role, facultyRole, name, profile, isInvestorVerified, twoFactorEnabled, twoFactorSecret } = userData;
      const normalizedEmail = email.toLowerCase().trim();
      const passwordHash = await User.hashPassword(password);

      let user = await User.findOne({ email: normalizedEmail });

      if (user) {
        user.name = name;
        user.passwordHash = passwordHash;
        user.role = role;
        user.facultyRole = facultyRole || null;
        user.emailVerified = true;
        user.status = 'active';
        user.profile = profile;
        if (isInvestorVerified !== undefined) {
          user.isInvestorVerified = isInvestorVerified;
          user.investorVerifiedAt = new Date();
        }
        if (twoFactorEnabled !== undefined) {
          user.twoFactorEnabled = twoFactorEnabled;
          if (twoFactorSecret) user.twoFactorSecret = twoFactorSecret;
        }
        await user.save();
        console.log(`[UPDATED]  Role: ${role.padEnd(12)} (${facultyRole || 'standard'}) | Email: ${normalizedEmail}`);
      } else {
        user = await User.create({
          name,
          email: normalizedEmail,
          passwordHash,
          role,
          facultyRole: facultyRole || null,
          emailVerified: true,
          status: 'active',
          profile,
          isInvestorVerified: isInvestorVerified || false,
          investorVerifiedAt: isInvestorVerified ? new Date() : null,
          twoFactorEnabled: twoFactorEnabled || false,
          twoFactorSecret: twoFactorSecret || null,
        });
        console.log(`[CREATED]  Role: ${role.padEnd(12)} (${facultyRole || 'standard'}) | Email: ${normalizedEmail}`);
      }

      await logAuditTrail({
        userId: user._id,
        email: user.email,
        role: user.role,
        action: 'MULTI_ROLE_SEEDED',
        details: { note: `Seeded ${role} test account`, email: normalizedEmail },
      });
    }

    console.log('\n====================================================');
    console.log(' ALL ROLES SEEDED WITH SEPARATE LOGIN CREDENTIALS: ');
    console.log('====================================================');
    USERS_TO_SEED.forEach((u) => {
      console.log(`- Role: ${u.role.toUpperCase().padEnd(12)} | Email: ${u.email.padEnd(26)} | Password: ${u.password}`);
    });
    console.log('====================================================\n');
  } catch (err) {
    console.error('[SEED ERROR]', err);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    console.log('DB disconnected. All users ready.');
  }
}

seedAllUsers();
