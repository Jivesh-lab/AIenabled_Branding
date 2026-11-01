const AgentDocument = require('../../models/AgentDocument');
const { runAction } = require('../actionLog');
const { formatLocal } = require('../time');

/**
 * Document generator. Content is assembled from persisted facts with fixed templates, so it is
 * deterministic and never invents a fact. (A language model may later polish the wording, but no
 * workflow depends on one.)
 */
const bullets = (items) => (items && items.length ? items.map((i) => `- ${i}`).join('\n') : '- None recorded');

const TEMPLATES = {
  application_summary: ({ name, domain, stage, problem, solution, team, validation, flags, questions, assessment }) => `# Application summary: ${name}

**Domain:** ${domain || 'n/a'} | **Stage:** ${stage || 'n/a'} | **Team size:** ${team ?? 'n/a'}

## Problem
${problem || 'n/a'}

## Proposed solution
${solution || 'n/a'}

## Completeness check
${bullets(validation?.missing?.length ? validation.missing.map((m) => `Missing: ${m}`) : ['All required evidence is present'])}

## Flags for the reviewer
${bullets(flags)}

## Preliminary assessment
${assessment || 'An AI assessment was not available (the language-model key is not configured); only the rule-based checks above were applied.'}

## Questions to ask the founders
${bullets(questions && questions.length ? questions : ['What evidence do you have that users want this?', 'Who will do the build work over the next three months?'])}

_Prepared by the Application Agent. The admission decision belongs to a human reviewer._`,

  onboarding_pack: ({ name, mentorName, coordinatorName, founderNames, meetingStart, steps }) => `# Onboarding pack: ${name}

**Mentor:** ${mentorName} | **Coordinator:** ${coordinatorName || 'Assigned coordinator'} | **Founders:** ${founderNames.join(', ')}

## First meeting
${meetingStart ? formatLocal(new Date(meetingStart)) : 'To be scheduled'}

## Before the meeting
${bullets(steps)}

## What happens next
- The mentor and founders agree the first milestone plan in the meeting.
- Meeting notes and action items are recorded here afterwards.
- The Monitoring Agent keeps an eye on milestones and will check in if progress stalls.

_Prepared by the Workflow Agent._`,

  meeting_notes: ({ title, startUtc, attendees, notes, actionItems }) => `# Meeting notes: ${title}

**When:** ${formatLocal(new Date(startUtc))}
**Attendees:** ${attendees.join(', ')}

## Notes
${notes || 'No written notes were submitted.'}

## Action items
${bullets(actionItems)}

_Compiled by the Workflow Agent from the notes submitted after the meeting._`,

  intro_draft: ({ startupName, investorName, fit, summary, ask }) => `# Introduction draft: ${startupName} to ${investorName}

## Why this introduction
${bullets(fit)}

## About ${startupName}
${summary}

## The ask
${ask || 'A 30-minute introductory conversation.'}

_Prepared by the Investor Agent. Nothing is shared until the founder consents and an administrator approves._`,

  escalation_brief: ({ name, reasons, attempts, evidence }) => `# Escalation brief: ${name}

## Why this was escalated
${bullets(reasons)}

## What the agents already tried
${bullets(attempts)}

## Evidence
${bullets(evidence)}

_Prepared by the Monitoring Agent for the coordinator._`,
};

async function generateDocument(ctx, { key, kind, title, data, projectId = null, applicationId = null, audience = { userIds: [], roles: [] } }) {
  const template = TEMPLATES[kind];
  if (!template) throw new Error(`Unknown document kind ${kind}`);
  return runAction({
    agent: ctx.agent,
    action: 'document.generate',
    tool: 'generate_document',
    trigger: ctx.trigger,
    correlationId: ctx.correlationId,
    jobId: ctx.jobId,
    applicationId: applicationId || ctx.applicationId,
    projectId: projectId || ctx.projectId,
    audience,
    idempotencyKey: `doc:${key}`,
    inputSummary: `${kind}: ${title}`,
    exec: async () => {
      const markdown = template(data);
      const doc = await AgentDocument.create({ kind, title, markdown, generatedBy: ctx.agent, method: 'rules', dedupeKey: key, projectId, applicationId, audience });
      return { result: { documentId: String(doc._id), kind }, summary: `${ctx.agent} prepared "${title}".` };
    },
  });
}

module.exports = { generateDocument, TEMPLATES };
