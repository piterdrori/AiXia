-- Phase 5H — per-agent daily 12-agent review execution records (staging only).

CREATE TABLE IF NOT EXISTS public.agentops_monitoring_daily_agent_executions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  monitoring_run_id uuid REFERENCES public.agentops_monitoring_runs(id) ON DELETE SET NULL,
  run_id text NOT NULL,
  github_run_id text,
  execution_date date NOT NULL,
  review_mode text NOT NULL DEFAULT 'daily_12_agent_review',
  agent_id uuid NOT NULL REFERENCES public.agentops_agents(id) ON DELETE CASCADE,
  agent_slug text NOT NULL,
  username text NOT NULL,
  job_title text,
  perspective text,
  status text NOT NULL,
  routes_reviewed text[] NOT NULL DEFAULT '{}'::text[],
  errors_found integer NOT NULL DEFAULT 0,
  improvements_found integer NOT NULL DEFAULT 0,
  features_found integer NOT NULL DEFAULT 0,
  drafts_created integer NOT NULL DEFAULT 0,
  duplicates_skipped integer NOT NULL DEFAULT 0,
  no_findings boolean NOT NULL DEFAULT false,
  evidence_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  failure_reason text,
  started_at timestamptz,
  completed_at timestamptz,
  duration_ms integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT agentops_daily_agent_exec_status_chk CHECK (
    status IN ('completed', 'failed', 'blocked', 'skipped_ineligible')
  ),
  CONSTRAINT agentops_daily_agent_exec_review_mode_chk CHECK (
    review_mode = 'daily_12_agent_review'
  ),
  CONSTRAINT agentops_daily_agent_exec_environment_chk CHECK (true)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_agentops_daily_agent_exec_unique_day
  ON public.agentops_monitoring_daily_agent_executions (execution_date, agent_id, review_mode);

CREATE INDEX IF NOT EXISTS idx_agentops_daily_agent_exec_run_id
  ON public.agentops_monitoring_daily_agent_executions (run_id);

CREATE INDEX IF NOT EXISTS idx_agentops_daily_agent_exec_agent_slug
  ON public.agentops_monitoring_daily_agent_executions (agent_slug, execution_date DESC);

CREATE INDEX IF NOT EXISTS idx_agentops_daily_agent_exec_execution_date
  ON public.agentops_monitoring_daily_agent_executions (execution_date DESC);

COMMENT ON TABLE public.agentops_monitoring_daily_agent_executions IS
  'Per-agent daily 12-agent staging review accountability (Phase 5H). One row per agent per UTC day.';

ALTER TABLE public.agentops_monitoring_daily_agent_executions ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.agentops_monitoring_daily_agent_executions TO authenticated;

DROP POLICY IF EXISTS agentops_daily_agent_exec_select_owner ON public.agentops_monitoring_daily_agent_executions;
CREATE POLICY agentops_daily_agent_exec_select_owner ON public.agentops_monitoring_daily_agent_executions
  FOR SELECT TO authenticated USING (public.agentops_is_owner());

DROP POLICY IF EXISTS agentops_daily_agent_exec_insert_owner ON public.agentops_monitoring_daily_agent_executions;
CREATE POLICY agentops_daily_agent_exec_insert_owner ON public.agentops_monitoring_daily_agent_executions
  FOR INSERT TO authenticated WITH CHECK (public.agentops_is_owner());

DROP POLICY IF EXISTS agentops_daily_agent_exec_update_owner ON public.agentops_monitoring_daily_agent_executions;
CREATE POLICY agentops_daily_agent_exec_update_owner ON public.agentops_monitoring_daily_agent_executions
  FOR UPDATE TO authenticated USING (public.agentops_is_owner()) WITH CHECK (public.agentops_is_owner());

DROP POLICY IF EXISTS agentops_daily_agent_exec_delete_owner ON public.agentops_monitoring_daily_agent_executions;
CREATE POLICY agentops_daily_agent_exec_delete_owner ON public.agentops_monitoring_daily_agent_executions
  FOR DELETE TO authenticated USING (public.agentops_is_owner());
