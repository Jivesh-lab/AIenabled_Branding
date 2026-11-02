# The agentic incubation system

This is how the DBIT Incubation Centre runs its agents **without anyone clicking "Run"**.

```
NOTICE (event or schedule) -> DECIDE -> ACT (real tool) -> VERIFY -> FOLLOW UP -> ESCALATE
```

Test it with one question: *"If nobody logs in for a week, what does each agent get done?"* The answers are in the
"What each agent does on its own" table below.

## Where things live

| Piece | Location | Notes |
|---|---|---|
| Events | `backend/src/agentic/events.js`, `services/eventOrchestrator.js` | One durable event store (idempotent, retried with backoff, dead-lettered). The Python service's `domain_events` are relayed into it. |
| Jobs | `backend/src/agentic/jobs.js`, `models/AgentJob.js` | `pending -> running -> waiting_for_reply / waiting_for_approval / retrying -> escalated -> done / failed`, with `nextRunAt`, `timeoutAt`, `attempts`, `correlationId`. |
| Scheduler | `backend/src/agentic/scheduler.js` | Runs inside the existing event poller. Recovers interrupted jobs, runs due jobs, runs sweeps every `AGENT_SWEEP_MS`. |
| Action Log | `backend/src/agentic/actionLog.js`, `models/ActionLog.js` | Append-only (updates and deletes throw). Every agent action, its tier, trigger, tool, result. |
| Autonomy tiers | `backend/src/agentic/config.js` | `ACTION_TIERS`. Enforced in `runAction()`. **Unknown actions are Tier 3.** |
| Approvals | `backend/src/agentic/approvals.js`, `models/Approval.js` | Tier-3 actions cannot run without an *approved* approval for that exact action. |
| Tools | `backend/src/agentic/tools/*` | email, notify, calendar (+ `.ics`), Google Calendar, slots, tasks, reports, documents, status. Live or sandbox through one code path. |
| Agents | `backend/src/agentic/agents/*` | Application, Mentor-Matching, Workflow, Monitoring, Investor. |
| Assistant | `backend/src/agentic/assistant.js` | Narrates from the Action Log, runs commands through the same agents. Deterministic intents; no LLM in any permission path. |
| Role feeds (API) | `backend/src/routes/agentic.js` | Server-side scoped by role and ownership. |
| Role feeds (UI) | `frontend/src/components/agentic/*` | Approvals, activity, escalations, student strip, mentor requests, introductions, health panel. |

## Autonomy tiers

| Tier | Meaning | Examples |
|---|---|---|
| 1 | Act freely | info-request emails/notifications, reminders, scheduling the first meeting, summaries, status checks |
| 2 | Act, then notify the people affected | rescheduling, nudging mentors, creating follow-up tasks, notifying a mentor of a quiet startup |
| 3 | A human approves **before** it runs | admission decisions, formal mentor allocation, investor introductions |

A Tier-3 action calls `runAction({ action, approvalId, ... })`. Without an approved approval it throws
`ApprovalRequiredError`, writes a `blocked` row to the Action Log and does nothing.

## What each agent does on its own

| Agent | Notices | Does | Waits / follows up | Escalates |
|---|---|---|---|---|
| Application | `application.submitted` / `resubmitted` | Checks completeness (configurable rules), flags spam/duplicates (never deletes), asks for exactly what is missing, re-assesses on reply, prepares assessment + reviewer questions | Reminder after 3 days | Admin after 7 days; admin approval queue for the decision (Tier 3) |
| Mentor-Matching | `application.approved` (only if a *person* approved it) | Ranks real mentor accounts by expertise/stage/capacity, asks the best one, handles accept / decline / timeout, moves to the next | Nudge at half the window; 3-day timeout | Coordinator if nobody is left; proposes ONE mentor for coordinator approval (Tier 3) |
| Workflow | `allocation.confirmed` | Finds a common slot (working hours, timezone, existing meetings, Google free/busy), books the meeting, sends invitations, requests the pre-meeting update, turns the outcome into notes and action-item tasks | Reminder 24h before; no-show check after the meeting | Reschedules (Tier 2), then the coordinator |
| Monitoring | Schedule | Evaluates explicit stall criteria from recorded facts only | Founder check-in -> 48h -> mentor -> 48h -> coordinator with an evidence brief | Records `startup.recovered` and the time it took |
| Investor | Schedule | Checks readiness criteria, updates the profile, matches verified investors, drafts the introduction | Waits for founder consent, reminds once | Admin approval to send (Tier 3); schedules the meeting and collects feedback |

## Running it

```bash
# 1. backend: copy backend/.env.example to backend/.env and fill the PLACEHOLDER values
cd backend && npm install && npm run seed:all   # users; then optionally:
npm run seed:demo                               # demo startups, mentors, investors (needs DEMO_USER_PASSWORD)
npm run dev                                     # starts the API *and* the agent worker

# 2. agent service (Python)
cd agent-service && venv\Scripts\python main.py

# 3. frontend
cd frontend && npm install && npm run dev
```

Nothing else needs to be started: the agent worker is part of the backend process. The same value must be set as
`INTERNAL_JWT_SECRET` in `backend/.env`, `agent-service/.env` and `frontend/.env.local`.

### Switching on the real integrations

Every integration works without keys, in a clearly labelled **sandbox** (recorded in the outbox, shown as
"sandbox - not delivered"). Add keys and the same code path goes live. Nothing needs rewriting.

| Integration | Variables (backend/.env unless noted) | Without it |
|---|---|---|
| Email | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `EMAIL_FROM` | Emails are recorded as `simulated`; in-app notices still work |
| Google Calendar | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, `INTEGRATIONS_ENCRYPTION_KEY` | Meetings are recorded; invitations go by email as `.ics` (or sandbox). Each person connects their own Google account from the profile menu -> *Calendar & reminders* |
| AI model | `LLM_API_KEY` in `agent-service/.env` | Rule-based checks only; AI-written assessments say they are unavailable |
| Force demo mode | `AGENT_DEMO_MODE=true` | (Forces the sandbox even if keys exist) |

Administrators see which keys are missing in a toast on sign-in and in the Super Admin health panel.
Other roles only see a friendly note when something they use is affected.

## Demo script (nobody touches anything except the approvals)

1. As a student, submit an application with no repository link and one team member. Log out.
2. Wait one worker tick (5 s). Log back in as the student: *What your agents are doing* says exactly what is missing; the bell has the request.
3. Add the missing items and resubmit. Log out. As an admin: the application is in **Approvals needed** with the assessment and prepared questions. Approve it.
4. As the first mentor: **Mentoring requests** shows the ask. Decline. The next mentor is asked within a tick. Accept as that mentor.
5. As the coordinator: **Approvals needed** holds ONE proposed mentor with who was asked and why. Approve.
6. As the student or mentor: **Meetings the agents arranged** shows the onboarding meeting and the pre-meeting task. As the mentor, record the meeting with action items.
7. Open the **Agent activity** feed on any role's home screen: every step above, in plain language, with what happens next.
8. To see monitoring without waiting weeks: Super Admin -> Autonomous AI Agents -> **Run now (override)** -> *Monitoring sweep*.

## Tests

```bash
cd backend && npm test                     # 161 tests, includes the end-to-end flagship loop (flagship.test.js)
cd agent-service && venv\Scripts\python -m pytest -q
cd frontend && npm run test:unit && npx tsc --noEmit && npx next build
```

`SHOW_FEED=1 node --test src/agentic/flagship.test.js` prints the Action Log for the whole loop.

## Known limits

* Google Calendar and live email are implemented and unit-tested against recorded responses, but have **not** been run against Google or an SMTP server (no credentials were available).
* Intent detection in the assistant is keyword-based; open-ended questions still go to the existing LLM guidance.
* Calendar slot search uses the configured timezone and working hours; per-person working hours are not modelled.
* Investor readiness uses the thresholds in `INVESTOR_*` variables; tune them for your cohort.
