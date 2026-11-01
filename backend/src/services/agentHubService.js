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

  /**
   * Manual "run now" (Super Admin override). It starts the SAME persistent Mentor-Matching job the agent
   * starts on approval: real mentor accounts are ranked and asked one at a time. Nothing is faked here.
   */
  async runMentorMatching({ projectId, actor }) {
    const project = await FacultyProject.findOne({ id: projectId }).lean();
    if (!project) throw new Error(`Startup project not found for ID: ${projectId}`);
    const jobs = require('../agentic/jobs');
    const open = await jobs.findOpen('mentor.matching', project.id);
    if (open) return this._runSummary(project, open, false);
    const { job, created } = await jobs.enqueue({
      type: 'mentor.matching',
      agent: 'Mentor-Matching Agent',
      dedupeKey: `mentor.matching:${project.id}:override:${Date.now()}`,
      applicationId: project.applicationId,
      projectId: project.id,
      subjectType: 'project',
      subjectId: project.id,
      triggerEvent: 'override.run',
      data: { phase: 'start', index: 0, tried: [], requestedBy: actor?.id || null },
    });
    return this._runSummary(project, job, created);
  }

  /** What a manual run returns: the job that now owns the work (results appear in the action log as it proceeds). */
  _runSummary(project, job, created) {
    return {
      id: String(job._id), jobId: String(job._id), projectId: project.id, projectTitle: project.title, executionStatus: created ? 'queued' : 'running',
      note: created ? 'Started. The Mentor-Matching Agent will ask mentors one at a time.' : 'Matching is already in progress for this startup.',
      recommendations: [], coordinatorDecision: { status: 'pending' },
    };
  }

  async getMentorMatchingRuns(projectId) {
    const filter = projectId ? { projectId } : {};
    return await MentorMatchingRun.find(filter).sort({ createdAt: -1 }).lean();
  }

  /** Coordinator decision on a proposed allocation. It is recorded on the Approval, which is what gates the action. */
  async decideMentorRecommendation({ runId, decision, comments, actor }) {
    const run = await MentorMatchingRun.findOne({ id: runId });
    if (!run) throw new Error(`Mentor matching run not found: ${runId}`);
    const approvals = require('../agentic/approvals');
    const Approval = require('../models/Approval');
    const pending = await Approval.findOne({ type: 'mentor_allocation', subjectId: run.projectId, status: 'pending' }).lean();
    if (!pending) throw new Error('There is no pending mentor proposal for this startup.');
    const result = await approvals.decide({ approvalId: pending._id, user: actor, decision, comment: comments || '' });
    if (result.executionError) throw new Error(`The decision was saved, but applying it failed: ${result.executionError}`);
    return MentorMatchingRun.findOne({ id: runId }).lean();
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

  /** Runs one workflow action through the real tools and returns what actually happened. */
  async _runWorkflowTool({ actionType, projectId, projectTitle, targetId, targetName, targetRole, payload, actor, idempotencyKey }) {
    const User = require('../models/User');
    const { notify } = require('../agentic/tools/notify');
    const { createTask, requestReport } = require('../agentic/tools/tasks');
    const { scheduleMeeting } = require('../agentic/tools/calendar');
    const { zonedToUtc } = require('../agentic/time');
    const project = await FacultyProject.findOne({ id: projectId }).lean();
    const system = actor?.role === 'system';
    const ctx = {
      agent: 'Workflow Agent',
      trigger: system ? { type: 'schedule', ref: actor.name || 'worker' } : { type: 'user', ref: String(actor?.id || 'unknown') },
      correlationId: null,
      jobId: null,
      projectId,
      applicationId: project?.applicationId || null,
    };
    const isUserId = /^[a-f0-9]{24}$/i.test(String(targetId || ''));
    const recipient = isUserId ? String(targetId) : (targetRole === 'student' ? project?.ownerUserId : null);

    if (actionType === 'assign_task') {
      const out = await createTask(ctx, {
        key: idempotencyKey,
        projectId,
        projectTitle,
        title: payload.title || 'Incubation action item',
        description: payload.description || '',
        assignedUserId: payload.assignedUserId || (targetRole === 'student' ? project?.ownerUserId : null),
        assignedTo: targetName || project?.leadStudent,
        assignedRole: targetRole || 'student',
        dueDate: payload.dueDate || payload.due_date,
        priority: payload.priority || 'Medium',
        link: '/workspace/student/dashboard',
      });
      return { linkedRecord: { modelName: 'FacultyTask', recordId: out.result?.taskId }, receipt: out.summary, status: out.status };
    }
    if (actionType === 'request_progress_report') {
      const out = await requestReport(ctx, { key: idempotencyKey, projectId, projectTitle, founderUserId: project?.ownerUserId, founderName: targetName || project?.leadStudent, reason: payload.description });
      return { linkedRecord: { modelName: 'FacultyTask', recordId: out.result?.taskId }, receipt: out.summary, status: out.status };
    }
    if (actionType === 'send_reminder') {
      const out = await notify(ctx, {
        key: idempotencyKey,
        userIds: recipient ? [String(recipient)] : [],
        title: payload.title || 'Reminder',
        message: payload.description || payload.message || 'A reminder from the incubation team.',
        link: '/workspace/student/dashboard',
        kind: 'reminder',
        severity: 'action',
        action: 'application.remind',
        projectId,
      });
      return { linkedRecord: { modelName: null, recordId: null }, receipt: out.summary, status: out.status };
    }
    if (actionType === 'schedule_meeting') {
      if (!payload.date || !payload.startTime) throw new Error('A meeting needs a date and a start time.');
      const startUtc = zonedToUtc(payload.date, payload.startTime);
      const endUtc = new Date(startUtc.getTime() + (payload.durationMinutes || 45) * 60000);
      const actorId = actor?.id && /^[a-f0-9]{24}$/i.test(String(actor.id)) ? actor.id : null;
      const ids = [project?.ownerUserId, project?.mentorUserId, project?.coordinatorUserId, actorId].filter(Boolean).map(String);
      const people = await User.find({ _id: { $in: [...new Set(ids)] }, status: 'active' }).select('_id name email').lean();
      const out = await scheduleMeeting(ctx, {
        key: idempotencyKey,
        projectId,
        projectTitle,
        title: payload.title || 'Review meeting',
        agenda: payload.agenda || '',
        startUtc,
        endUtc,
        attendees: people.map((u) => ({ userId: String(u._id), name: u.name, email: u.email })),
      });
      return { linkedRecord: { modelName: 'FacultyMeeting', recordId: out.result?.meetingId }, receipt: out.summary, status: out.status };
    }
    throw new Error(`Unsupported workflow action: ${actionType}`);
  }

  async coordinateWorkflowAction({
    actionType, projectId = 'general', projectTitle = 'Incubation Project', targetId, targetName = '', targetRole = 'student', targetEmail = '', payload = {}, actor = {},
  }) {
    const requestedIdempotencyKey = payload.idempotencyKey || payload.idempotency_key;
    if (requestedIdempotencyKey) {
      const existing = await WorkflowExecution.findOne({ idempotencyKey: requestedIdempotencyKey });
      if (existing) return existing;
    }
    const execId = `wf-exec-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
    const idempotencyKey = requestedIdempotencyKey || `wf-${actionType}-${targetId}-${payload.title || Date.now()}`;
    const startTime = new Date();
    const actorName = actor.role === 'system' ? (actor.name || 'Workflow Agent') : (actor.name || 'Staff member');

    let outcome;
    let errorMessage = null;
    try {
      outcome = await this._runWorkflowTool({ actionType, projectId, projectTitle, targetId, targetName, targetRole, payload, actor, idempotencyKey });
    } catch (error) {
      errorMessage = error.message;
    }
    const failed = Boolean(errorMessage);
    const simulated = outcome?.status === 'simulated';
    const execution = new WorkflowExecution({
      id: execId,
      actionType,
      status: failed ? 'failed' : 'completed',
      projectId,
      projectTitle,
      actorId: actor.id || 'system',
      actorRole: actor.role || 'system',
      actorName,
      targetId: targetId || 'unknown',
      targetName,
      targetRole,
      targetEmail,
      payload,
      idempotencyKey,
      deliveryStatus: failed ? 'failed' : simulated ? 'queued' : 'delivered',
      deliveryTimestamp: new Date(),
      deliveryReceipt: failed ? `Not completed: ${errorMessage}` : outcome.receipt,
      errorMessage,
      retryCount: 0,
      startedAt: startTime,
      completedAt: new Date(),
      linkedRecord: outcome?.linkedRecord || { modelName: null, recordId: null },
      executionLogs: [
        { timestamp: startTime, message: `${actionType} requested by ${actorName}`, level: 'info' },
        { timestamp: new Date(), message: failed ? `Failed: ${errorMessage}` : outcome.receipt, level: failed ? 'error' : 'info' },
      ],
    });
    await execution.save();
    return execution;
  }

  async retryWorkflowExecution({ executionId, actor }) {
    const execution = await WorkflowExecution.findOne({ id: executionId });
    if (!execution) throw new Error(`Workflow execution not found: ${executionId}`);
    if (execution.status !== 'failed') throw new Error('Only a failed action can be retried.');
    if (execution.retryCount >= execution.maxRetries) throw new Error(`Maximum retry limit (${execution.maxRetries}) reached for this execution.`);
    execution.retryCount += 1;
    execution.status = 'running';
    await execution.save();
    try {
      const outcome = await this._runWorkflowTool({
        actionType: execution.actionType,
        projectId: execution.projectId,
        projectTitle: execution.projectTitle,
        targetId: execution.targetId,
        targetName: execution.targetName,
        targetRole: execution.targetRole,
        payload: execution.payload,
        actor,
        idempotencyKey: `${execution.idempotencyKey}:retry${execution.retryCount}`,
      });
      execution.status = 'completed';
      execution.deliveryStatus = outcome.status === 'simulated' ? 'queued' : 'delivered';
      execution.deliveryReceipt = outcome.receipt;
      execution.errorMessage = null;
      execution.linkedRecord = outcome.linkedRecord;
      execution.executionLogs.push({ timestamp: new Date(), message: `Retry #${execution.retryCount} succeeded: ${outcome.receipt}`, level: 'info' });
    } catch (error) {
      execution.status = 'failed';
      execution.errorMessage = error.message;
      execution.executionLogs.push({ timestamp: new Date(), message: `Retry #${execution.retryCount} failed: ${error.message}`, level: 'error' });
    }
    execution.deliveryTimestamp = new Date();
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
