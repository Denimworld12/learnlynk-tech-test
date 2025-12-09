-- Enable UUID generator
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

---------------------------------------------------------
-- TEAM TABLES (needed for RLS)
---------------------------------------------------------

CREATE TABLE IF NOT EXISTS teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL
);

CREATE TABLE IF NOT EXISTS user_teams (
  user_id uuid NOT NULL,
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL,
  PRIMARY KEY (user_id, team_id)
);

---------------------------------------------------------
-- 1. LEADS TABLE
---------------------------------------------------------

CREATE TABLE IF NOT EXISTS leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  owner_id uuid NOT NULL,
  stage text NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_leads_owner ON leads(owner_id);
CREATE INDEX IF NOT EXISTS idx_leads_stage ON leads(stage);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at);

---------------------------------------------------------
-- 2. APPLICATIONS TABLE
---------------------------------------------------------

CREATE TABLE IF NOT EXISTS applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Fetch applications by lead
CREATE INDEX IF NOT EXISTS idx_applications_lead ON applications(lead_id);

---------------------------------------------------------
-- 3. TASKS TABLE
---------------------------------------------------------

CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  application_id uuid NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  type text NOT NULL,
  due_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Constraints
  CONSTRAINT task_type_check CHECK (type IN ('call', 'email', 'review')),
  CONSTRAINT task_due_after_created CHECK (due_at >= created_at)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tasks_due_at ON tasks(due_at);
CREATE INDEX IF NOT EXISTS idx_tasks_application ON tasks(application_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
