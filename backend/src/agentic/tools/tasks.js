const crypto = require('crypto');
const FacultyTask = require('../../models/FacultyTask');
const FacultyProject = require('../../models/FacultyProject');
const { runAction } = require('../actionLog');
const { notify } = require('./notify');
const { localDateString } = require('../time');

/**
 * Task, report-request and startup-status tools. Each one changes real records that the dashboards
 * read and notifies the person affected, so an "action" is something a user can see and act on.
 */
function isoDate(daysFromNow) {
  return localDateString(new Date(Date.now() + daysFromNow * 24 * 60 * 60 * 1000));
}

async function createTask(ctx, params) {
  const { key, projectId, projectTitle, title, description = '', assignedUserId, assignedTo, assignedRole = 'student', dueDate, priority = 'Medium', kind = 'general', link, action = 'task.create' } = params;
  return runAction({
    agent: ctx.agent,
    action,
    tool: 'create_task',
    trigger: ctx.trigger,
    correlationId: ctx.correlationId,
    jobId: ctx.jobId,
    applicationId: ctx.applicationId,
    projectId,
    audience: { userIds: assignedUserId ? [assignedUserId] : [], roles: [] },
    idempotencyKey: `task:${key}`,
    inputSummary: `${title} -> ${assignedTo || assignedUserId}`,
    exec: async () => {
      const id = `task-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
      await FacultyTask.create({
        id,
        title,
        projectId,
        projectTitle: projectTitle || 'Incubation project',
        assignedTo: assignedTo || 'Assignee',
        assignedRole,
        assignedUserId: assignedUserId ? String(assignedUserId) : null,
        dueDate: dueDate || isoDate(5),
        priority,
        status: 'Pending',
        description,
        source: 'agent',
        kind,
        createdByAgent: ctx.agent,
        dedupeKey: key,
      });
      if (assignedUserId) {
        await notify({ ...ctx, projectId }, {
          key: `task-notice:${key}`,
          userIds: [assignedUserId],
          title: 'New task for you',
          message: `${title}${dueDate ? ` (due ${dueDate})` : ''}`,
          link,
          kind: 'task',
          severity: 'action',
          logSummary: `${ctx.agent} told ${assignedTo || 'the assignee'} about the new task "${title}".`,
        });
      }
      return { result: { taskId: id, dueDate: dueDate || isoDate(5) }, summary: `${ctx.agent} created the task "${title}" for ${assignedTo || 'the assignee'}${dueDate ? `, due ${dueDate}` : ''}.`, followUp: 'Waiting for the task to be completed.' };
    },
  });
}

/** A report request is a task of kind "progress_report" plus a `report.requested` event for the agents. */
async function requestReport(ctx, params) {
  const { key, projectId, projectTitle, founderUserId, founderName, reason, link = '/workspace/student/dashboard' } = params;
  const created = await createTask(ctx, {
    key: `report:${key}`,
    projectId,
    projectTitle,
    title: `Submit a short progress update for ${projectTitle}`,
    description: reason || 'Please share what you finished, what is blocked, and what you plan next.',
    assignedUserId: founderUserId,
    assignedTo: founderName,
    kind: 'progress_report',
    dueDate: isoDate(3),
    priority: 'High',
    link,
    action: params.action || 'report.request',
  });
  return created;
}

async function updateStartupStatus(ctx, { key, projectId, patch, reason }) {
  return runAction({
    agent: ctx.agent,
    action: 'startup.update_status',
    tool: 'update_startup_status',
    trigger: ctx.trigger,
    correlationId: ctx.correlationId,
    jobId: ctx.jobId,
    projectId,
    audience: { userIds: [], roles: ['faculty', 'admin'] },
    idempotencyKey: `status:${key}`,
    inputSummary: JSON.stringify(patch),
    exec: async () => {
      const project = await FacultyProject.findOne({ id: projectId }).lean();
      if (!project) throw new Error('This startup could not be found.');
      await FacultyProject.updateOne({ id: projectId }, { $set: patch });
      const summary = Object.entries(patch).map(([k, v]) => `${k} -> ${v}`).join(', ');
      return { result: { projectId, patch }, summary: `${ctx.agent} updated ${project.title}: ${summary}${reason ? ` (${reason})` : ''}.` };
    },
  });
}

module.exports = { createTask, requestReport, updateStartupStatus, isoDate };
