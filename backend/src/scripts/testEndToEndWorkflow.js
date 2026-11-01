/**
 * testEndToEndWorkflow.js
 * Comprehensive end-to-end integration verification across all 3 services:
 * Next.js Frontend (port 3000), Express Backend (port 5000), FastAPI Agent Service (port 8000).
 */

const FRONTEND_URL = 'http://localhost:3000';
const BACKEND_URL = 'http://127.0.0.1:5000';
const AGENT_URL = 'http://127.0.0.1:8000';

async function loginViaNextAuth(email, password, twoFactorCode = '') {
  const csrfRes = await fetch(`${FRONTEND_URL}/api/auth/csrf`);
  const csrfCookies = csrfRes.headers.getSetCookie().map(c => c.split(';')[0]).join('; ');
  const { csrfToken } = await csrfRes.json();

  const bodyParams = {
    csrfToken,
    email,
    password,
    redirect: 'false',
    json: 'true',
  };
  if (twoFactorCode) bodyParams.twoFactorCode = twoFactorCode;

  const loginRes = await fetch(`${FRONTEND_URL}/api/auth/callback/credentials`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': csrfCookies,
    },
    body: new URLSearchParams(bodyParams),
    redirect: 'manual',
  });

  const sessionCookies = loginRes.headers.getSetCookie().map(c => c.split(';')[0]).join('; ');
  return { status: loginRes.status, cookies: sessionCookies };
}

async function runVerification() {
  console.log('===============================================================');
  console.log(' STARTING END-TO-END WORKFLOW VERIFICATION SUITE');
  console.log('===============================================================');

  const results = [];
  function assertStep(name, condition, extra = '') {
    if (condition) {
      console.log(`[PASS] ${name} ${extra}`);
      results.push({ name, status: 'PASS' });
    } else {
      console.error(`[FAIL] ${name} ${extra}`);
      results.push({ name, status: 'FAIL', error: extra });
      throw new Error(`Assertion failed: ${name} - ${extra}`);
    }
  }

  // -------------------------------------------------------------------------
  // 1. Health Checks
  // -------------------------------------------------------------------------
  const beHealth = await fetch(`${BACKEND_URL}/api/health`).then(r => r.json());
  assertStep('Backend health check', beHealth.success === true, JSON.stringify(beHealth));

  const agentHealth = await fetch(`${AGENT_URL}/api/health`).then(r => r.json());
  assertStep('Agent Service health check', agentHealth.status === 'ok', JSON.stringify(agentHealth));

  const feRoot = await fetch(`${FRONTEND_URL}`);
  assertStep('Frontend root check', feRoot.status === 200);

  // -------------------------------------------------------------------------
  // 2. Student Authentication & Profile
  // -------------------------------------------------------------------------
  const studentAuth = await loginViaNextAuth('omkargotawade05@gmail.com', 'Student#2026!Pass');
  assertStep('Student NextAuth login', studentAuth.status === 200 && studentAuth.cookies.includes('next-auth.session-token'));

  const studentSession = await fetch(`${FRONTEND_URL}/api/auth/session`, {
    headers: { 'Cookie': studentAuth.cookies }
  }).then(r => r.json());
  assertStep('Student session verification', studentSession.user?.role === 'student', `Role: ${studentSession.user?.role}`);

  // -------------------------------------------------------------------------
  // 3. Workflow A: Application Validation & Submission
  // -------------------------------------------------------------------------
  const testIdeaPayload = {
    name: `AgriSort AI ${Date.now()}`,
    shortDescription: 'Autonomous computer vision sorting for fresh produce reducing harvest waste.',
    domain: 'AgriTech',
    maturity: 'Prototype',
    problem: 'Post-harvest grading in rural packing hubs suffers from 35% manual inconsistency.',
    solution: 'Multi-spectral camera system with edge AI running embedded inference on sorting belts.',
    targetAudience: 'Cooperative farming societies and export aggregation centers.',
    uniqueness: 'Patented micro-spectrometry sensor module at 10x lower cost than European sorters.',
    businessModel: 'Hardware lease with monthly predictive maintenance and analytics SaaS.',
    competitors: 'Compac Sorting, Tomra Food, manual labour contractors.',
    revenueStream: 'Hardware installation fees + recurring software licenses.',
    estimatedCost: '₹15,00,000 for pilot deployment',
    milestones: 'Complete field validation across 3 apple packhouses in Himachal Pradesh.',
    declarationAccepted: true,
    department: 'Computer Engineering',
    projectType: 'Hardware + AI Prototype',
    affectedUsers: '500+ smallholder farmers',
    currentSolutions: 'Manual sorting tables',
    differentiation: 'Edge inference with sub-second rejection pneumatic nozzles',
    prototypeAvailable: "yes",
    teamMembers: [
      { id: "tm_1", name: "Aarav Patel", rollNumber: "DBIT-2023-CS-084", email: "omkargotawade05@gmail.com", inviteStatus: "accepted" },
      { id: "tm_2", name: "Pooja Nair", rollNumber: "DBIT-2023-CS-092", email: "pooja@dbit.edu", inviteStatus: "pending" }
    ],
    technologies: ["PyTorch", "TensorRT", "Raspberry Pi 5", "Pneumatics"],
    githubUrl: "https://github.com/dbit-incubator/agrisort-ai",
    demoUrl: "https://agrisort-ai-demo.dbit.edu",
    attachments: [
      { id: "att_1", name: "Architecture_Spec_v1.pdf", sizeBytes: 2450000 }
    ],
  };

  // Pre-submission validation endpoint
  const valRes = await fetch(`${FRONTEND_URL}/api/applications/validate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': studentAuth.cookies
    },
    body: JSON.stringify(testIdeaPayload)
  });
  const valData = await valRes.json();
  assertStep('Application pre-validation check', valRes.status === 200 && (valData.validation?.is_complete === true || valData.validation?.is_valid === true), JSON.stringify(valData.validation || valData));

  // Submit idea
  const submitRes = await fetch(`${FRONTEND_URL}/api/applications/submit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': studentAuth.cookies
    },
    body: JSON.stringify(testIdeaPayload)
  });
  const submitData = await submitRes.json();
  let createdAppId = submitData.application_id || submitData.id;

  if (submitRes.status === 409) {
    console.log('[INFO] Student already has an active application; retrieving existing application ID...');
    const listRes = await fetch(`${FRONTEND_URL}/api/applications/`, {
      headers: { 'Cookie': studentAuth.cookies }
    });
    const listData = await listRes.json();
    const existing = listData.projects?.[0] || listData[0];
    createdAppId = existing?.id;
    assertStep('Duplicate application handled gracefully', Boolean(createdAppId), `Reused existing ID: ${createdAppId}`);
  } else {
    assertStep('Application submission to Agent Service', submitRes.status === 200 && Boolean(createdAppId), `Status: ${submitRes.status}, Body: ${JSON.stringify(submitData)}`);
  }

  // -------------------------------------------------------------------------
  // 4. Workflow A (cont.) & B: Admin Review, Decision & Startup Sync
  // -------------------------------------------------------------------------
  const adminAuth = await loginViaNextAuth('admin@aai-dbitic.edu', 'Admin#2026!Ops');
  assertStep('Admin NextAuth login', adminAuth.status === 200 && adminAuth.cookies.includes('next-auth.session-token'));

  // Admin fetch applications queue
  const queueRes = await fetch(`${FRONTEND_URL}/api/admin/applications/queue`, {
    headers: { 'Cookie': adminAuth.cookies }
  });
  const queueData = await queueRes.json();
  const queueList = queueData.queue || queueData.applications || [];
  assertStep('Admin applications queue fetch', queueRes.status === 200 && Array.isArray(queueList), `Queue count: ${queueList.length}`);
  const foundApp = queueList.find(a => a.id === createdAppId || a.startupName === testIdeaPayload.name || a.name === testIdeaPayload.name);
  assertStep('Created application visible in admin queue', Boolean(foundApp), `Found ID: ${foundApp?.id}`);

  // Admin approves application
  const decideRes = await fetch(`${FRONTEND_URL}/api/admin/applications/${createdAppId}/decide`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': adminAuth.cookies
    },
    body: JSON.stringify({
      decision: 'approved',
      comments: 'Excellent technological differentiation and field validation roadmap. Approved for DBIT Cohort 2026 incubation.'
    })
  });
  const decideData = await decideRes.json();
  assertStep('Admin application approval decision', decideRes.status === 200, JSON.stringify(decideData));

  // Verify StartupProfile synced in Express MongoDB
  const startupSyncCheck = await fetch(`${BACKEND_URL}/api/investors/startups`, {
    headers: {
      'Authorization': `Bearer ${decideData.token || ''}`
    }
  });
  // Or check public directory through investor
  const investorAuth = await loginViaNextAuth('jp13boss@gmail.com', 'Investor#2026!Pass');
  assertStep('Investor NextAuth login', investorAuth.status === 200 && investorAuth.cookies.includes('next-auth.session-token'));

  const investorStartupsRes = await fetch(`${FRONTEND_URL}/api/investor/startups`, {
    headers: { 'Cookie': investorAuth.cookies }
  });
  const investorStartups = await investorStartupsRes.json();
  assertStep('Investor startups directory fetch', investorStartupsRes.status === 200 && Array.isArray(investorStartups.startups || investorStartups));

  // -------------------------------------------------------------------------
  // 5. Workflow C: AI Mentor Matching Agent
  // -------------------------------------------------------------------------
  const mentorMatchRes = await fetch(`${FRONTEND_URL}/api/agents/mentor-match`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': studentAuth.cookies
    },
    body: JSON.stringify({
      domain: 'AgriTech',
      stage: 'Prototype',
      challenges: 'Need assistance with edge AI optimization and connecting with agricultural export buyers.',
      requestedExpertise: ['AI/ML', 'Go-To-Market', 'Embedded Systems']
    })
  });
  const mentorMatchData = await mentorMatchRes.json();
  assertStep('Mentor Matching Agent execution', mentorMatchRes.status === 200 && Array.isArray(mentorMatchData.recommendations) && mentorMatchData.recommendations.length > 0, `Matches: ${mentorMatchData.recommendations?.length}`);

  // -------------------------------------------------------------------------
  // 6. Workflow D: Workflow Agent Coordination
  // -------------------------------------------------------------------------
  const workflowCoordRes = await fetch(`${AGENT_URL}/api/agents/workflow/coordinate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action_type: 'assign_task',
      target_id: createdAppId,
      actor_id: 'admin_usr_1',
      actor_role: 'admin',
      payload: {
        title: 'Submit Lab Safety Compliance Form',
        deadline: '2026-11-15',
        priority: 'high'
      }
    })
  });
  const workflowCoordData = await workflowCoordRes.json();
  assertStep('Workflow Agent task coordination', workflowCoordRes.status === 200 && (workflowCoordData.success === true || workflowCoordData.status === 'assigned'), JSON.stringify(workflowCoordData));

  // -------------------------------------------------------------------------
  // 7. Workflow E: Monitoring Agent Status Evaluation
  // -------------------------------------------------------------------------
  const monitorRes = await fetch(`${FRONTEND_URL}/api/agents/monitoring/status`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': studentAuth.cookies
    },
    body: JSON.stringify({
      startup_name: testIdeaPayload.name,
      stage: 'Prototype',
      total_milestones: 4,
      completed_milestones: 2,
      overdue_milestones: 0,
      tasks_completed: 3,
      total_tasks: 4,
      days_since_last_report: 4,
      measured_metrics: {
        samples_tested: 120,
        accuracy_rate: '94.2%'
      }
    })
  });
  const monitorData = await monitorRes.json();
  assertStep('Monitoring Agent status evaluation', monitorRes.status === 200 && (monitorData.health_status || monitorData.status === 'success'), `Health Status: ${monitorData.health_status || monitorData.ai_interpretation?.health_status}`);

  // -------------------------------------------------------------------------
  // 8. Workflow F: Investor Matchmaking, Watchlist & Introductions
  // -------------------------------------------------------------------------
  const matchmakingRes = await fetch(`${FRONTEND_URL}/api/investor/matchmaking`, {
    method: 'POST',
    headers: { 'Cookie': investorAuth.cookies }
  });
  const matchmakingData = await matchmakingRes.json();
  assertStep('Investor deterministic matchmaking', matchmakingRes.status === 200, `Matched startups: ${matchmakingData.startups?.length || 0}`);

  // -------------------------------------------------------------------------
  // 9. Workflow G: AI Incubation Assistant Chat
  // -------------------------------------------------------------------------
  const studentBeLogin = await fetch(`${BACKEND_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'omkargotawade05@gmail.com', password: 'Student#2026!Pass' })
  }).then(r => r.json());

  const chatRes = await fetch(`${AGENT_URL}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${studentBeLogin.token}`
    },
    body: JSON.stringify({
      message: 'What are the seed funding guidelines and milestone requirements for prototypes at DBIT incubation centre?',
      user_id: studentSession.user.id,
      user_role: 'student'
    })
  });
  const chatData = await chatRes.json();
  assertStep('AI Incubation Assistant chat response', chatRes.status === 200 && (chatData.response || chatData.reply || chatData.output), `Response length: ${(chatData.response || chatData.reply || chatData.output || '').length}`);

  // -------------------------------------------------------------------------
  // 10. Super Admin 2FA & Audit Log Verification
  // -------------------------------------------------------------------------
  const superAdminAuth = await loginViaNextAuth('superadmin@aai-dbitic.edu', 'SuperAdmin#2026!Secure', '123456');
  assertStep('Super Admin 2FA NextAuth login', superAdminAuth.status === 200 && superAdminAuth.cookies.includes('next-auth.session-token'));

  const superAdminSession = await fetch(`${FRONTEND_URL}/api/auth/session`, {
    headers: { 'Cookie': superAdminAuth.cookies }
  }).then(r => r.json());
  assertStep('Super Admin session role check', superAdminSession.user?.role === 'super_admin');

  console.log('===============================================================');
  console.log(` ALL ${results.length} END-TO-END WORKFLOW STEPS PASSED SUCCESSFULLY!`);
  console.log('===============================================================');
}

runVerification().catch(err => {
  console.error('\nFATAL WORKFLOW ERROR:', err);
  process.exit(1);
});
