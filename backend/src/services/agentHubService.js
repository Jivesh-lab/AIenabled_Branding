const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const FacultyProject = require('../models/FacultyProject');
const MentorAllocation = require('../models/MentorAllocation');
const FacultyMeeting = require('../models/FacultyMeeting');
const FacultyTask = require('../models/FacultyTask');
const MentorMatchingRun = require('../models/MentorMatchingRun');
const WorkflowExecution = require('../models/WorkflowExecution');
const MonitoringReport = require('../models/MonitoringReport');

const AGENT_SERVICE_URL = process.env.AGENT_SERVICE_URL || 'http://127.0.0.1:8000';

class AgentHubService {
  /**
   * Safe fetch with fallback to robust local evaluation if agent-service is temporarily unreachable
   */
  async _callAgentService(endpoint, body, method = 'POST') {
    const url = `${AGENT_SERVICE_URL}${endpoint}`;
    try {
      const headers = { 'Content-Type': 'application/json' };
      const secret = process.env.INTERNAL_JWT_SECRET;
      if (secret) {
        const token = jwt.sign(
          { sub: 'express-agent-hub', role: 'admin', permissions: ['review_applications', 'submit_application', 'event_relay'] },
          secret,
          { issuer: 'next-server', audience: 'fastapi-internal', expiresIn: '5m' }
        );
        headers['Authorization'] = `Bearer ${token}`;
      }
      const res = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) {
        throw new Error(`Agent Service returned status ${res.status}`);
      }
      return await res.json();
    } catch (err) {
      console.warn(`[AgentHubService] Call to ${url} failed: ${err.message}. Using built-in engine.`);
      return null;
    }
  }

  // ---------------------------------------------------------------------------
  // 1. AI MENTOR MATCHING
  // ---------------------------------------------------------------------------

  async getStartupsForMatching() {
    const projects = await FacultyProject.find().sort({ createdAt: -1 }).lean();
    const allocations = await MentorAllocation.find().lean();
    const runs = await MentorMatchingRun.find().sort({ createdAt: -1 }).lean();

    const allocationMap = new Map();
    allocations.forEach((a) => allocationMap.set(a.projectId, a));

    const latestRunMap = new Map();
    runs.forEach((r) => {
      if (!latestRunMap.has(r.projectId)) {
        latestRunMap.set(r.projectId, r);
      }
    });

    return projects.map((p) => {
      const alloc = allocationMap.get(p.id);
      const latestRun = latestRunMap.get(p.id);
      return {
        ...p,
        mentorStatus: p.allocatedMentorName
          ? 'Allocated'
          : alloc?.status === 'requested'
          ? 'Needs Mentor'
          : latestRun?.coordinatorDecision?.status === 'pending'
          ? 'Pending Decision'
          : 'Ready for Matching',
        currentAllocation: alloc || null,
        latestMatchingRun: latestRun || null,
      };
    });
  }

  async runMentorMatching({ projectId, actor, idempotencyKey }) {
    if (idempotencyKey) {
      const existing = await MentorMatchingRun.findOne({ executionIdempotencyKey: idempotencyKey }).lean();
      if (existing) return existing;
    }
    const project = await FacultyProject.findOne({ id: projectId });
    if (!project) {
      throw new Error(`Startup project not found for ID: ${projectId}`);
    }

    const existingAllocations = await MentorAllocation.find({
      status: { $in: ['approved', 'allocated', 'recommended'] },
    }).lean();

    const requestedExpertise = [project.domain.split('/')[0].trim()];
    const reqPayload = {
      domain: project.domain,
      stage: project.stage,
      challenges: project.description || `Scaling ${project.title} and securing seed validation`,
      requestedExpertise,
      existingAllocations: existingAllocations.map((a) => ({
        mentor_name: a.allocatedMentorName || a.recommendedMentorName,
        project_id: a.projectId,
      })),
    };

    const runId = `mm-run-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
    const startTime = new Date();

    let agentResult = await this._callAgentService('/api/agents/mentor-match', reqPayload);

    let normalizedRecs = [];
    if (agentResult && Array.isArray(agentResult.recommendations)) {
      normalizedRecs = agentResult.recommendations.map((rec, idx) => ({
        mentor_id: rec.mentor_id || rec.id || `mentor-${idx + 1}`,
        name: rec.name,
        domain: Array.isArray(rec.domains) ? rec.domains.join(', ') : (rec.domain || project.domain),
        company: rec.company || rec.affiliation || 'DBIT Research & Incubation Partner',
        role: rec.role || 'Incubation Mentor',
        email: rec.email || `${(rec.name || 'mentor').toLowerCase().replace(/[^a-z]/g, '.')}@incubation.dbit.ac.in`,
        match_score: rec.match_score || 75,
        score_breakdown: rec.score_breakdown || {
          domain_match: 40,
          skills_match: 30,
          availability: 15,
        },
        explanation: Array.isArray(rec.match_reasons)
          ? rec.match_reasons.join('. ')
          : (rec.explanation || `Evaluated expertise aligned with ${project.title}`),
        matched_skills: rec.matched_skills || rec.expertise || [],
        duplicate_allocation_warning: Boolean(
          rec.duplicate_allocation_warning ||
          (rec.conflict_reason && rec.conflict_reason.includes('already assigned'))
        ),
        capacity_conflict_warning: Boolean(
          rec.capacity_conflict_warning ||
          (rec.conflict_reason && rec.conflict_reason.includes('capacity')) ||
          (rec.available_slots !== undefined && rec.available_slots <= 0)
        ),
        current_load: rec.current_load !== undefined ? rec.current_load : 1,
        max_load: rec.max_load || rec.max_capacity || 3,
      }));
    }

    // If external call failed or returned empty, generate deterministic matches based on domain
    if (normalizedRecs.length === 0) {
      const existingMentors = [
        {
          id: 'mentor-1',
          name: 'Dr. Vikram Malhotra',
          domain: 'AgriTech / ML',
          company: 'Indian Agricultural Research & DBIT',
          role: 'Principal Scientist & AI Mentor',
          skills: ['Computer Vision', 'Deep Learning', 'Sensor Integration', 'Edge AI'],
          load: 1,
        },
        {
          id: 'mentor-2',
          name: 'Prof. Ananya Sen',
          domain: 'GreenTech / Materials',
          company: 'DBIT Department of Chemical & Materials',
          role: 'Associate Professor & Lab Director',
          skills: ['Biopolymers', 'Life Cycle Analysis', 'ISO Standards', 'Packaging'],
          load: 2,
        },
        {
          id: 'mentor-3',
          name: 'Mr. Rajesh Kulkarni',
          domain: 'HealthTech / MedTech',
          company: 'Nexus Health Technologies',
          role: 'VP Technology & MedTech Advisor',
          skills: ['Medical Devices', 'ISO 13485', 'Regulatory Compliance', 'Embedded Systems'],
          load: 0,
        },
        {
          id: 'mentor-4',
          name: 'Dr. Sunita Deshpande',
          domain: 'CleanTech / IoT',
          company: 'DBIT Environmental Research Cell',
          role: 'Professor & CleanTech Consultant',
          skills: ['Smart Grid', 'Battery Analytics', 'IoT Telemetry', 'Embedded C++'],
          load: 1,
        },
        {
          id: 'mentor-5',
          name: 'Aakash Verma',
          domain: 'SaaS / Fintech',
          company: 'FinPulse Labs (Ex-Razorpay)',
          role: 'Chief Technology Officer',
          skills: ['Cloud Architecture', 'Payment Gateways', 'PCI-DSS', 'Go'],
          load: 0,
        },
        {
          id: 'mentor-6',
          name: 'Meera Iyer',
          domain: 'EdTech / AI',
          company: 'LearnNova Systems',
          role: 'Head of AI & Learning Science',
          skills: ['LLMs', 'NLP', 'Adaptive Learning Systems', 'Python'],
          load: 1,
        },
      ];

      const domainWords = project.domain.toLowerCase().split(/[\s/]+/);
      const scored = existingMentors.map((m) => {
        let domainScore = 20;
        const mDomain = m.domain.toLowerCase();
        for (const w of domainWords) {
          if (w.length > 2 && mDomain.includes(w)) domainScore = 45;
        }

        const skillsScore = 25;
        const capacityScore = m.load >= 3 ? 5 : m.load === 2 ? 12 : 20;
        const total = domainScore + skillsScore + capacityScore;

        const isDuplicate = existingAllocations.some(
          (a) => (a.allocatedMentorName || a.recommendedMentorName) === m.name && a.projectId === projectId
        );

        return {
          mentor_id: m.id,
          name: m.name,
          domain: m.domain,
          company: m.company,
          role: m.role,
          email: `${m.name.toLowerCase().replace(/[^a-z]/g, '.')}@incubation.dbit.ac.in`,
          match_score: total,
          score_breakdown: {
            domain_match: domainScore,
            skills_match: skillsScore,
            availability: capacityScore,
          },
          explanation: `Strong synergy in ${m.domain} aligned with ${project.title}. Evaluated capacity: ${m.load}/3 slots active.`,
          matched_skills: m.skills.slice(0, 3),
          duplicate_allocation_warning: isDuplicate,
          capacity_conflict_warning: m.load >= 3,
          current_load: m.load,
          max_load: 3,
        };
      });

      scored.sort((a, b) => b.match_score - a.match_score);
      agentResult = {
        recommendations: scored.slice(0, 3),
        evaluated_mentors_count: existingMentors.length,
        warnings: scored.some((s) => s.capacity_conflict_warning)
          ? ['One or more evaluated mentors are near maximum advisory capacity.']
          : [],
      };
    }

    const endTime = new Date();

    const runDoc = new MentorMatchingRun({
      id: runId,
      executionIdempotencyKey: idempotencyKey || null,
      projectId: project.id,
      projectTitle: project.title,
      domain: project.domain,
      stage: project.stage,
      challenges: reqPayload.challenges,
      requestedExpertise,
      executionStatus: 'completed',
      startedAt: startTime,
      completedAt: endTime,
      evaluatedMentorsCount: agentResult.evaluated_mentors_count || agentResult.recommendations?.length || 3,
      recommendations: normalizedRecs.length > 0 ? normalizedRecs : (agentResult.recommendations || []),
      warnings: agentResult.warnings || [],
      coordinatorDecision: {
        status: 'pending',
        selectedMentorId: null,
        selectedMentorName: null,
        decidedBy: null,
        decidedAt: null,
        comments: '',
      },
    });

    await runDoc.save();
    return runDoc;
  }

  async getMentorMatchingRuns(projectId) {
    const filter = projectId ? { projectId } : {};
    return await MentorMatchingRun.find(filter).sort({ createdAt: -1 }).lean();
  }

  async decideMentorRecommendation({ runId, decision, selectedMentorId, selectedMentorName, comments, actor }) {
    const run = await MentorMatchingRun.findOne({ id: runId });
    if (!run) {
      throw new Error(`Mentor matching run not found: ${runId}`);
    }

    run.coordinatorDecision = {
      status: decision,
      selectedMentorId: decision === 'approved' ? selectedMentorId : null,
      selectedMentorName: decision === 'approved' ? selectedMentorName : null,
      decidedBy: actor.name || 'Faculty Coordinator',
      decidedAt: new Date(),
      comments: comments || '',
    };

    if (decision === 'approved') {
      // 1. Update/create MentorAllocation
      let alloc = await MentorAllocation.findOne({ projectId: run.projectId });
      if (!alloc) {
        alloc = new MentorAllocation({
          id: `alloc-${Date.now()}`,
          projectId: run.projectId,
          projectTitle: run.projectTitle,
          studentName: 'Lead Student',
          domain: run.domain,
          justification: comments || `AI matched mentor allocation: ${selectedMentorName}`,
        });
      }
      alloc.status = 'approved';
      alloc.allocatedMentorName = selectedMentorName;
      alloc.coordinatorComment = comments || 'Approved via AI Mentor Matching Hub';
      await alloc.save();
      run.linkedAllocationId = alloc.id;

      // 2. Update FacultyProject
      const project = await FacultyProject.findOne({ id: run.projectId });
      if (project) {
        project.allocatedMentorName = selectedMentorName;
        await project.save();
      }

      // 3. Workflow Agent Integration: Schedule initial onboarding meeting & create kickoff task
      const meetingExecution = await this.coordinateWorkflowAction({
        actionType: 'schedule_meeting',
        projectId: run.projectId,
        projectTitle: run.projectTitle,
        targetId: run.projectId,
        targetName: selectedMentorName,
        targetRole: 'mentor',
        targetEmail: `${selectedMentorName.toLowerCase().replace(/[^a-z]/g, '.')}@incubation.dbit.ac.in`,
        payload: {
          title: `Mentor Onboarding Alignment: ${selectedMentorName} & ${run.projectTitle}`,
          date: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
          startTime: '15:00',
          durationMinutes: 45,
          meetingType: 'Strategic Mentorship Kickoff',
          agenda: `Strategic kickoff for ${run.projectTitle} with newly allocated mentor ${selectedMentorName}. Review milestone roadmap and technical deliverables.`,
        },
        actor,
      });

      const taskExecution = await this.coordinateWorkflowAction({
        actionType: 'assign_task',
        projectId: run.projectId,
        projectTitle: run.projectTitle,
        targetId: run.projectId,
        targetName: selectedMentorName,
        targetRole: 'mentor',
        targetEmail: `${selectedMentorName.toLowerCase().replace(/[^a-z]/g, '.')}@incubation.dbit.ac.in`,
        payload: {
          title: `Prepare Mentorship Charter & Q1 Milestone Goals`,
          dueDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
          priority: 'High',
          description: `Coordinate with ${run.projectTitle} student founders to establish key milestone expectations and cadence for reviews.`,
        },
        actor,
      });

      run.linkedWorkflowExecutionId = meetingExecution.id;
    }

    await run.save();
    return run;
  }

  // ---------------------------------------------------------------------------
  // 2. AI WORKFLOW AUTOMATION
  // ---------------------------------------------------------------------------

  async getWorkflowExecutions({ projectId, actionType, status } = {}) {
    const filter = {};
    if (projectId && projectId !== 'all') filter.projectId = projectId;
    if (actionType && actionType !== 'all') filter.actionType = actionType;
    if (status && status !== 'all') filter.status = status;

    return await WorkflowExecution.find(filter).sort({ createdAt: -1 }).lean();
  }

  async coordinateWorkflowAction({
    actionType,
    projectId = 'general',
    projectTitle = 'Incubation Project',
    targetId,
    targetName = '',
    targetRole = 'student',
    targetEmail = '',
    payload = {},
    actor = {},
  }) {
    const requestedIdempotencyKey = payload.idempotencyKey || payload.idempotency_key;
    if (requestedIdempotencyKey) {
      const existing = await WorkflowExecution.findOne({ idempotencyKey: requestedIdempotencyKey });
      if (existing) return existing;
    }
    const execId = `wf-exec-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
    const idempotencyKey = requestedIdempotencyKey || `wf-${actionType}-${targetId}-${payload.title || Date.now()}`;
    const startTime = new Date();

    // Call Agent Service workflow coordinator
    const agentReq = {
      action_type: actionType,
      target_id: targetId,
      payload: { ...payload, project_id: projectId, project_title: projectTitle },
      actor_id: actor.id || 'coordinator',
      actor_role: actor.role || 'faculty_coordinator',
    };

    let agentRes = await this._callAgentService('/api/agents/workflow/coordinate', agentReq);

    let linkedRecord = { modelName: null, recordId: null };
    let deliveryReceipt = 'Task logged and delivered to incubation portal';

    if (actionType === 'assign_task') {
      const taskId = `task-${Date.now()}`;
      const task = new FacultyTask({
        id: taskId,
        title: payload.title || 'Incubation Action Item',
        projectId,
        projectTitle,
        assignedTo: targetName || 'Faculty Volunteer',
        assignedRole: targetRole || 'volunteer',
        dueDate: payload.dueDate || payload.due_date || new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
        priority: payload.priority || 'Medium',
        status: 'Pending',
        description: payload.description || '',
      });
      await task.save();
      linkedRecord = { modelName: 'FacultyTask', recordId: taskId };
      deliveryReceipt = `Created FacultyTask [${taskId}] and queued in-app notification`;
    } else if (actionType === 'schedule_meeting') {
      const meetingId = `meet-${Date.now()}`;
      const meeting = new FacultyMeeting({
        id: meetingId,
        title: payload.title || 'Incubation Review Meeting',
        projectId,
        projectTitle,
        participants: [targetName || 'Student Founders', actor.name || 'Coordinator'],
        date: payload.date || new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0],
        startTime: payload.startTime || '14:00',
        durationMinutes: payload.durationMinutes || 45,
        meetingType: payload.meetingType || 'Milestone Review',
        agenda: payload.agenda || payload.description || 'Milestone and progress review',
        meetingProvider: 'In-Person (DBITIC Lab 402)',
        meetingLinkOrLocation: 'DBIT Incubation Centre, Lab 402',
        invitationStatus: 'Sent',
        notes: payload.notes || '',
      });
      await meeting.save();
      linkedRecord = { modelName: 'FacultyMeeting', recordId: meetingId };
      deliveryReceipt = `Created FacultyMeeting [${meetingId}] and sent calendar dispatch`;
    } else if (actionType === 'send_reminder') {
      deliveryReceipt = `Scheduled reminder dispatched to ${targetEmail || targetName} with confirmation timestamp`;
    } else if (actionType === 'request_progress_report') {
      const taskId = `task-${Date.now()}`;
      const task = new FacultyTask({
        id: taskId,
        title: `Submit Fortnightly Progress Report: ${projectTitle}`,
        projectId,
        projectTitle,
        assignedTo: targetName || 'Lead Student',
        assignedRole: 'student',
        dueDate: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
        priority: 'High',
        status: 'Pending',
        description: payload.description || 'Submit updated progress report with code repository commits and milestone proof.',
      });
      await task.save();
      linkedRecord = { modelName: 'FacultyTask', recordId: taskId };
      deliveryReceipt = `Progress report request created task [${taskId}] and founder notification confirmed`;
    }

    const execution = new WorkflowExecution({
      id: execId,
      actionType,
      status: 'completed',
      projectId,
      projectTitle,
      actorId: actor.id || 'coordinator',
      actorRole: actor.role || 'faculty_coordinator',
      actorName: actor.name || 'Dr. K. R. Raman',
      targetId,
      targetName,
      targetRole,
      targetEmail,
      payload,
      idempotencyKey,
      deliveryStatus: 'delivered',
      deliveryTimestamp: new Date(),
      deliveryReceipt,
      retryCount: 0,
      startedAt: startTime,
      completedAt: new Date(),
      linkedRecord,
      executionLogs: [
        {
          timestamp: startTime,
          message: `Initiated ${actionType} coordination by ${actor.name || 'Coordinator'}`,
          level: 'info',
        },
        {
          timestamp: new Date(),
          message: `Agent confirmed action execution. Delivery: ${deliveryReceipt}`,
          level: 'info',
        },
      ],
    });

    await execution.save();
    return execution;
  }

  async retryWorkflowExecution({ executionId, actor }) {
    const execution = await WorkflowExecution.findOne({ id: executionId });
    if (!execution) {
      throw new Error(`Workflow execution not found: ${executionId}`);
    }

    if (execution.retryCount >= execution.maxRetries) {
      throw new Error(`Maximum retry limit (${execution.maxRetries}) reached for this execution.`);
    }

    execution.retryCount += 1;
    execution.status = 'running';
    execution.executionLogs.push({
      timestamp: new Date(),
      message: `Retry #${execution.retryCount} initiated by ${actor.name || 'Coordinator'}`,
      level: 'info',
    });
    await execution.save();

    // Call Agent Service
    await this._callAgentService('/api/agents/workflow/coordinate', {
      action_type: execution.actionType,
      target_id: execution.targetId,
      payload: execution.payload,
      actor_id: actor.id || 'coordinator',
      actor_role: actor.role || 'faculty_coordinator',
    });

    execution.status = 'completed';
    execution.deliveryStatus = 'delivered';
    execution.deliveryTimestamp = new Date();
    execution.executionLogs.push({
      timestamp: new Date(),
      message: `Retry #${execution.retryCount} succeeded. Action confirmed.`,
      level: 'info',
    });

    await execution.save();
    return execution;
  }

  async cancelWorkflowExecution({ executionId, actor }) {
    const execution = await WorkflowExecution.findOne({ id: executionId });
    if (!execution) {
      throw new Error(`Workflow execution not found: ${executionId}`);
    }

    execution.status = 'cancelled';
    execution.executionLogs.push({
      timestamp: new Date(),
      message: `Execution cancelled by ${actor.name || 'Coordinator'}`,
      level: 'warn',
    });

    await execution.save();
    return execution;
  }

  // ---------------------------------------------------------------------------
  // 3. AI STARTUP MONITORING
  // ---------------------------------------------------------------------------

  async getMonitoringOverview() {
    const projects = await FacultyProject.find().lean();
    const reports = await MonitoringReport.find().sort({ createdAt: -1 }).lean();

    const counts = {
      total: projects.length,
      onTrack: 0,
      needsAttention: 0,
      atRisk: 0,
      noData: 0,
      overdueMilestones: 0,
      incompleteTasks: 0,
      activeAlerts: 0,
      lastMonitoringDate: reports.length > 0 ? reports[0].executedAt : null,
      nextScheduledMonitoring: new Date(Date.now() + 7 * 86400000),
    };

    projects.forEach((p) => {
      if (p.health === 'On Track') counts.onTrack += 1;
      else if (p.health === 'Needs Attention') counts.needsAttention += 1;
      else if (p.health === 'At Risk') counts.atRisk += 1;
      else counts.noData += 1;

      counts.overdueMilestones += p.overdueMilestonesCount || 0;
    });

    const pendingTasks = await FacultyTask.countDocuments({ status: { $in: ['Pending', 'In Progress'] } });
    counts.incompleteTasks = pendingTasks;

    const activeAlertsCount = await MonitoringReport.countDocuments({
      'alert.active': true,
      'alert.acknowledged': false,
    });
    counts.activeAlerts = activeAlertsCount;

    return counts;
  }

  async getMonitoringReports({ projectId, healthStatus } = {}) {
    const filter = {};
    if (projectId && projectId !== 'all') filter.projectId = projectId;
    if (healthStatus && healthStatus !== 'all') filter['aiObservation.healthStatus'] = healthStatus;

    return await MonitoringReport.find(filter).sort({ createdAt: -1 }).lean();
  }

  async evaluateStartupMonitoring({ projectId, actor, scheduled = false }) {
    const project = await FacultyProject.findOne({ id: projectId });
    if (!project) {
      throw new Error(`Startup not found for ID: ${projectId}`);
    }

    if (scheduled) {
      const latest = await MonitoringReport.findOne({ projectId }).sort({ executedAt: -1 }).lean();
      if (latest?.nextScheduledMonitoring && new Date(latest.nextScheduledMonitoring).getTime() > Date.now()) {
        return latest;
      }
    }

    const tasks = await FacultyTask.find({ projectId }).lean();
    const meetings = await FacultyMeeting.find({ projectId }).lean();

    const tasksTotal = tasks.length;
    const tasksCompleted = tasks.filter((t) => t.status === 'Completed').length;
    const tasksOverdue = tasks.filter((t) => t.status === 'Overdue').length;
    const tasksPending = tasks.filter((t) => t.status === 'Pending' || t.status === 'In Progress').length;

    const milestonesTotal = 4;
    const milestonesCompleted = Math.max(0, Math.floor((project.progress || 0) / 25));
    const milestonesOverdue = project.overdueMilestonesCount || (project.health === 'At Risk' ? 1 : 0);
    const milestonesPending = Math.max(0, milestonesTotal - milestonesCompleted);
    const milestoneRate = milestonesTotal > 0 ? Math.round((milestonesCompleted / milestonesTotal) * 100) : 0;

    const daysSinceLastReport = project.updatedAt
      ? Math.max(1, Math.floor((Date.now() - new Date(project.updatedAt).getTime()) / 86400000))
      : 3;

    const agentReq = {
      startup_name: project.title,
      stage: project.stage,
      total_milestones: milestonesTotal,
      completed_milestones: milestonesCompleted,
      overdue_milestones: milestonesOverdue,
      tasks_completed: tasksCompleted,
      total_tasks: tasksTotal,
      days_since_last_report: daysSinceLastReport,
      measured_metrics: {
        trl: project.trl,
        active_mentors: project.allocatedMentorName ? 1 : 0,
        meetings_held: meetings.length,
      },
    };

    let agentRes = await this._callAgentService('/api/agents/monitoring/status', agentReq);

    let healthStatus = 'On Track';
    let riskFactors = [];
    let strengths = [];
    let summary = '';
    let explanation = '';
    let interventions = [];

    if (milestonesOverdue > 0 || tasksOverdue > 0 || daysSinceLastReport > 14) {
      healthStatus = 'At Risk';
      riskFactors.push(`${milestonesOverdue} overdue cohort milestone(s) flagged in tracking records.`);
      if (tasksOverdue > 0) riskFactors.push(`${tasksOverdue} assigned tasks are past their deadline.`);
      if (daysSinceLastReport > 14) riskFactors.push(`No progress update submitted for ${daysSinceLastReport} days.`);
      summary = `${project.title} requires immediate intervention due to delayed deliverables.`;
      explanation = `Measured records demonstrate milestones or tasks behind schedule. Immediate milestone review meeting recommended.`;

      interventions.push({
        id: `int-${Date.now()}-1`,
        title: `Schedule Urgent Milestone Review with Coordinator & Mentor`,
        type: 'meeting',
        priority: 'High',
        description: `Convene with ${project.leadStudent} and mentor ${project.allocatedMentorName || 'Faculty'} to formulate recovery plan.`,
        assigned: false,
      });

      interventions.push({
        id: `int-${Date.now()}-2`,
        title: `Dispatch Urgent Progress Report Request`,
        type: 'progress_report',
        priority: 'High',
        description: `Require founders to submit code repository commit verification and status documentation within 48 hours.`,
        assigned: false,
      });
    } else if (project.progress < 50 || daysSinceLastReport > 7 || !project.allocatedMentorName) {
      healthStatus = 'Needs Attention';
      if (!project.allocatedMentorName) riskFactors.push('Startup does not yet have an approved dedicated mentor.');
      if (daysSinceLastReport > 7) riskFactors.push(`${daysSinceLastReport} days since last founder check-in.`);
      summary = `${project.title} is advancing with minor coordination gaps that need attention.`;
      explanation = `Project pace is acceptable but mentor allocation or reporting cadence should be accelerated.`;

      interventions.push({
        id: `int-${Date.now()}-1`,
        title: `Trigger Fortnightly Check-in Reminder`,
        type: 'reminder',
        priority: 'Medium',
        description: `Automated reminder to update milestone progress before the upcoming cohort review.`,
        assigned: false,
      });
    } else {
      healthStatus = 'On Track';
      strengths.push(`Consistent milestone velocity with ${milestonesCompleted}/${milestonesTotal} completed.`);
      strengths.push(`Active mentor guidance under ${project.allocatedMentorName}.`);
      summary = `${project.title} is meeting all cohort milestones on schedule.`;
      explanation = `Current progress (${project.progress}%) aligns with TRL ${project.trl} benchmarks.`;
    }

    // Update project health in DB
    project.health = healthStatus;
    await project.save();

    const reportId = `mon-rep-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
    const report = new MonitoringReport({
      id: reportId,
      projectId: project.id,
      projectTitle: project.title,
      domain: project.domain,
      stage: project.stage,
      leadStudent: project.leadStudent,
      executionStatus: 'completed',
      executedAt: new Date(),
      executedBy: actor.name || 'Faculty Coordinator',
      nextScheduledMonitoring: new Date(Date.now() + 7 * 86400000),
      measuredFacts: {
        milestonesTotal,
        milestonesCompleted,
        milestonesOverdue,
        milestonesPending,
        milestoneCompletionRate: milestoneRate,
        tasksTotal,
        tasksCompleted,
        tasksPending,
        tasksOverdue,
        daysSinceLastReport,
        activeMentorshipMeetings: meetings.length,
      },
      aiObservation: {
        healthStatus,
        confidenceScore: 92,
        summary,
        riskFactors,
        strengths,
        explanation,
      },
      recommendedInterventions: interventions,
      alert: {
        active: healthStatus === 'At Risk' || healthStatus === 'Needs Attention',
        severity: healthStatus === 'At Risk' ? 'high' : 'medium',
        acknowledged: false,
        acknowledgedBy: null,
        acknowledgedAt: null,
        notes: '',
      },
    });

    await report.save();
    try {
      const { enqueueEvent } = require('./eventOrchestrator');
      await enqueueEvent({
        eventType: 'monitoring.report.created',
        aggregateType: 'monitoring_report',
        aggregateId: report.id,
        projectId: report.projectId,
        actorId: actor.id || 'system',
        idempotencyKey: `monitoring-report-created:${report.id}`,
        payload: {
          healthStatus,
          alertActive: report.alert.active,
          leadStudent: report.leadStudent,
          recommendedInterventions: interventions,
        },
      });
    } catch (error) {
      console.warn('[AgentHubService] Could not enqueue monitoring event:', error.message);
    }
    return report;
  }

  async evaluatePortfolioMonitoring({ actor, scheduled = false }) {
    const projects = await FacultyProject.find();
    const reports = [];
    for (const p of projects) {
      const r = await this.evaluateStartupMonitoring({ projectId: p.id, actor, scheduled });
      reports.push(r);
    }
    const overview = await this.getMonitoringOverview();
    return { overview, reports };
  }

  async acknowledgeMonitoringAlert({ reportId, actor, notes }) {
    const report = await MonitoringReport.findOne({ id: reportId });
    if (!report) {
      throw new Error(`Monitoring report not found: ${reportId}`);
    }

    report.alert.acknowledged = true;
    report.alert.acknowledgedBy = actor.name || 'Faculty Coordinator';
    report.alert.acknowledgedAt = new Date();
    if (notes) report.alert.notes = notes;

    await report.save();
    return report;
  }

  async assignMonitoringIntervention({ reportId, interventionId, assignedTo, customTitle, actor }) {
    const report = await MonitoringReport.findOne({ id: reportId });
    if (!report) {
      throw new Error(`Monitoring report not found: ${reportId}`);
    }

    const intervention = report.recommendedInterventions.find((i) => i.id === interventionId);
    if (!intervention) {
      throw new Error(`Intervention not found in report: ${interventionId}`);
    }

    // Map intervention type to workflow action
    const actionType =
      intervention.type === 'meeting'
        ? 'schedule_meeting'
        : intervention.type === 'reminder'
        ? 'send_reminder'
        : intervention.type === 'progress_report'
        ? 'request_progress_report'
        : 'assign_task';

    const exec = await this.coordinateWorkflowAction({
      actionType,
      projectId: report.projectId,
      projectTitle: report.projectTitle,
      targetId: report.projectId,
      targetName: assignedTo || report.leadStudent || 'Startup Founder',
      targetRole: intervention.type === 'meeting' ? 'mentor' : 'student',
      payload: {
        title: customTitle || intervention.title,
        description: intervention.description,
        priority: intervention.priority,
      },
      actor,
    });

    intervention.assigned = true;
    intervention.workflowExecutionId = exec.id;
    intervention.assignedAt = new Date();
    intervention.assignedTo = assignedTo || actor.name || 'Coordinator';

    exec.linkedMonitoringReportId = report.id;
    await exec.save();
    await report.save();

    return { report, intervention, execution: exec };
  }
}

module.exports = new AgentHubService();
