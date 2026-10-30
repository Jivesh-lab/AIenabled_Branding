# Findings & Discoveries: AIenabled_Branding Platform

## Architecture Overview
- **Frontend**: Next.js 16.3.0 (Turbopack, React 19, NextAuth 4.24, Tailwind v4).
- **Backend API**: Node.js / Express 5 on port 5000, connects to MongoDB Atlas (`cluster0.hrjib.mongodb.net`), handles authentication, users, RBAC, audit logging, investor profiles, watchlist, introductions, startups.
- **Agent Service**: FastAPI on port 8000, Python 3.12, LangGraph multi-agent orchestration, asyncpg / SQLite for standalone mode (`standalone_data.sqlite`), RAG, applications, matchmaking endpoints.

## Seed Accounts Reference
- Student: `omkargotawade05@gmail.com` / `Student#2026!Pass`
- Coordinator Faculty: `coordinator@aai-dbitic.edu` / `Coordinator#2026!Pass`
- Volunteer Faculty: `volunteer@aai-dbitic.edu` / `Volunteer#2026!Pass`
- Mentor: `mentor@aai-dbitic.edu` / `Mentor#2026!Pass`
- Investor: `jp13boss@gmail.com` / `Investor#2026!Pass`
- Admin: `admin@aai-dbitic.edu` / `Admin#2026!Ops`
- Super Admin: `superadmin@aai-dbitic.edu` / `SuperAdmin#2026!Secure` (2FA TOTP secret: `JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP`)

## Role Workspaces Audit
- Student: `/workspace/student/*` (dashboard, idea submission, status, milestones, meetings, tasks, reports)
- Faculty: `/workspace/faculty/*` (dashboard, coordinator, volunteer, oversight, grant-drafting, trl-calculator)
- Mentor: `/workspace/mentor/*` (dashboard, feedback, schedule)
- Industry: Covered via industry guide pathway / mentor network / industry partnership governance
- Investor: `/workspace/investor/*` (dashboard, startups directory, matchmaking, watchlist, introductions, schedule)
- Admin: `/workspace/admin/*` (dashboard, users, applications, investors, approvals, reports, settings)
- Super Admin: `/workspace/super-admin/*` (dashboard, audit logs, recovery, universal inspection)

## Key Integration Endpoints
- Express Backend: Port 5000 (`/api/auth/*`, `/api/admin/*`, `/api/investors/*`, `/api/faculty/*`, `/api/audit/*`)
- Agent Service: Port 8000 (`/api/chat/*`, `/api/agents/*`, `/api/rag/*`, `/api/applications/*`, `/api/matchmaking/*`, `/api/health`)
- Frontend NextAuth: `/api/auth/[...nextauth]`
- Frontend Server-side Proxies: `/api/admin/*`, `/api/investor/*`, `/api/agents/*`, `/api/applications/*`
