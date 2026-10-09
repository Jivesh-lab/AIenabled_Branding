-- =============================================================================
-- schema.sql
-- AAI Incubation Centre — PostgreSQL + pgvector schema
-- Run once against the aai_incubation database
-- =============================================================================

-- Enable the pgvector extension (must be installed: apt install postgresql-16-pgvector)
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- STARTUPS
-- =============================================================================
CREATE TABLE IF NOT EXISTS startups (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         VARCHAR(64) NOT NULL,         -- MongoDB ObjectId of the owning student/team
    name            VARCHAR(255) NOT NULL,
    tagline         TEXT,
    problem         TEXT,
    solution        TEXT,
    stage           VARCHAR(50) DEFAULT 'idea',    -- idea | prototype | mvp | growth
    sector          VARCHAR(100),
    readiness_score SMALLINT DEFAULT 0,            -- 0–100, auto-computed by agents
    readiness_breakdown JSONB DEFAULT '{}',        -- per-dimension scores
    status          VARCHAR(50) DEFAULT 'active',  -- active | incubated | graduated | rejected
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_startups_user_id ON startups(user_id);
CREATE INDEX IF NOT EXISTS idx_startups_status  ON startups(status);

-- =============================================================================
-- APPLICATIONS (incubation applications submitted by startups)
-- =============================================================================
CREATE TABLE IF NOT EXISTS applications (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    startup_id      UUID REFERENCES startups(id) ON DELETE CASCADE,
    applicant_id    VARCHAR(64) NOT NULL,          -- MongoDB user id
    status          VARCHAR(50) DEFAULT 'draft',   -- draft | submitted | under_review | approved | rejected
    eligibility_ok  BOOLEAN,
    completeness    SMALLINT DEFAULT 0,            -- 0–100 document completeness score
    ai_summary      TEXT,                          -- LLM-generated application summary
    ai_feedback     TEXT,                          -- LLM-generated improvement suggestions
    documents       JSONB DEFAULT '[]',            -- [{name, url, type, uploaded_at}]
    submitted_at    TIMESTAMPTZ,
    reviewed_at     TIMESTAMPTZ,
    reviewer_id     VARCHAR(64),                   -- MongoDB admin user id
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_applications_startup_id ON applications(startup_id);
CREATE INDEX IF NOT EXISTS idx_applications_status     ON applications(status);

-- =============================================================================
-- MILESTONES
-- =============================================================================
CREATE TABLE IF NOT EXISTS milestones (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    startup_id      UUID REFERENCES startups(id) ON DELETE CASCADE,
    title           VARCHAR(255) NOT NULL,
    description     TEXT,
    due_date        DATE,
    status          VARCHAR(50) DEFAULT 'pending', -- pending | in_progress | completed | overdue
    completion_pct  SMALLINT DEFAULT 0,
    created_by      VARCHAR(64),                   -- MongoDB user id (admin or mentor)
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- MEETINGS
-- =============================================================================
CREATE TABLE IF NOT EXISTS meetings (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mentor_id       VARCHAR(64) NOT NULL,          -- MongoDB user id
    student_id      VARCHAR(64) NOT NULL,          -- MongoDB user id
    startup_id      UUID REFERENCES startups(id),
    title           VARCHAR(255),
    agenda          TEXT,
    scheduled_at    TIMESTAMPTZ NOT NULL,
    duration_mins   SMALLINT DEFAULT 60,
    status          VARCHAR(50) DEFAULT 'scheduled', -- scheduled | completed | cancelled
    meeting_link    VARCHAR(500),
    summary         TEXT,                          -- AI-generated post-meeting summary
    action_items    JSONB DEFAULT '[]',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_meetings_mentor_id  ON meetings(mentor_id);
CREATE INDEX IF NOT EXISTS idx_meetings_student_id ON meetings(student_id);
CREATE INDEX IF NOT EXISTS idx_meetings_scheduled  ON meetings(scheduled_at);

-- =============================================================================
-- AGENT LOGS (every agent run is logged for audit + debugging)
-- =============================================================================
CREATE TABLE IF NOT EXISTS agent_logs (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id      VARCHAR(64) NOT NULL,
    user_id         VARCHAR(64) NOT NULL,          -- MongoDB user id
    agent_name      VARCHAR(100) NOT NULL,         -- orchestrator | research | market | etc.
    input_text      TEXT,
    output_text     TEXT,
    tool_calls      JSONB DEFAULT '[]',            -- [{tool, args, result}]
    tokens_used     INT DEFAULT 0,
    latency_ms      INT,
    status          VARCHAR(50) DEFAULT 'success', -- success | error | timeout
    error_message   TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_logs_user_id    ON agent_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_logs_session_id ON agent_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_agent_logs_agent_name ON agent_logs(agent_name);

-- =============================================================================
-- KNOWLEDGE BASE (RAG — documents + embeddings)
-- =============================================================================
CREATE TABLE IF NOT EXISTS knowledge_base (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source          VARCHAR(500) NOT NULL,         -- filename or URL
    source_type     VARCHAR(50) DEFAULT 'document',-- document | policy | scheme | report
    title           VARCHAR(500),
    content         TEXT NOT NULL,                 -- raw chunk text
    embedding       VECTOR(1536),                  -- text-embedding-ada-002 vector
    metadata        JSONB DEFAULT '{}',            -- {page, section, tags, ...}
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- HNSW index for fast approximate nearest-neighbour search
CREATE INDEX IF NOT EXISTS idx_kb_embedding ON knowledge_base
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

-- Full-text search index for hybrid retrieval
CREATE INDEX IF NOT EXISTS idx_kb_content_fts ON knowledge_base
    USING gin(to_tsvector('english', content));

-- =============================================================================
-- CHAT SESSIONS (persistent conversation history per user)
-- =============================================================================
CREATE TABLE IF NOT EXISTS chat_sessions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         VARCHAR(64) NOT NULL,
    title           VARCHAR(255) DEFAULT 'New Chat',
    messages        JSONB DEFAULT '[]',            -- [{role, content, agent, timestamp}]
    context         JSONB DEFAULT '{}',            -- attached startup_id, application_id etc.
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON chat_sessions(user_id);

-- =============================================================================
-- RESEARCH ANALYSES (output of Research Analysis Agent)
-- =============================================================================
CREATE TABLE IF NOT EXISTS research_analyses (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    startup_id      UUID REFERENCES startups(id) ON DELETE CASCADE,
    novelty_score   SMALLINT,                      -- 0–100
    problem_clarity SMALLINT,                      -- 0–100
    use_cases       JSONB DEFAULT '[]',
    similar_solutions JSONB DEFAULT '[]',
    suggested_domains JSONB DEFAULT '[]',
    full_report     TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- MARKET VALIDATIONS (output of Market Validation Agent)
-- =============================================================================
CREATE TABLE IF NOT EXISTS market_validations (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    startup_id      UUID REFERENCES startups(id) ON DELETE CASCADE,
    market_size     JSONB DEFAULT '{}',            -- {tam, sam, som}
    competitors     JSONB DEFAULT '[]',
    target_customers JSONB DEFAULT '[]',
    problem_solution_fit SMALLINT,                 -- 0–100
    opportunity_score SMALLINT,                    -- 0–100
    full_report     TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- PROTOTYPE EVALUATIONS (output of Prototype Evaluation Agent)
-- =============================================================================
CREATE TABLE IF NOT EXISTS prototype_evaluations (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    startup_id      UUID REFERENCES startups(id) ON DELETE CASCADE,
    technical_feasibility SMALLINT,                -- 0–100
    mvp_suggestions JSONB DEFAULT '[]',
    improvement_areas JSONB DEFAULT '[]',
    development_roadmap TEXT,
    trl_level       SMALLINT,                      -- 1–9 Technology Readiness Level
    full_report     TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- INVESTOR MATCHES (output of Investor Matching Agent)
-- =============================================================================
CREATE TABLE IF NOT EXISTS investor_matches (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    startup_id      UUID REFERENCES startups(id) ON DELETE CASCADE,
    investor_name   VARCHAR(255),
    investor_type   VARCHAR(100),                  -- angel | vc | government | corporate
    match_score     SMALLINT,                      -- 0–100
    match_reason    TEXT,
    contact_info    JSONB DEFAULT '{}',
    status          VARCHAR(50) DEFAULT 'identified', -- identified | contacted | meeting_scheduled | invested
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- TRIGGERS — auto-update updated_at
-- =============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
    t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'startups','applications','milestones','meetings','chat_sessions'
    ] LOOP
        EXECUTE format(
            'CREATE OR REPLACE TRIGGER trg_%I_updated_at
             BEFORE UPDATE ON %I
             FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()',
            t, t
        );
    END LOOP;
END $$;
