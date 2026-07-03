-- AgentOps scheduled monitoring run index (staging only, Phase 5B).
-- Stores GHA dry-run summaries for Agents hub — no issue/memory writes from this table.

CREATE TABLE IF NOT EXISTS public.agentops_monitoring_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id text NOT NULL,
  source text NOT NULL DEFAULT 'github_actions',
  mode text NOT NULL,
  level int NOT NULL,
  dry_run boolean NOT NULL,
  target_base_url text NOT NULL,
  target_class text NOT NULL,
  production_blocked boolean NOT NULL,
  production_guard_active boolean NOT NULL,
  production_target_rejected boolean NOT NULL,
  continuous_enabled boolean NOT NULL DEFAULT false,
  agents_considered int NOT NULL DEFAULT 0,
  agents_run int NOT NULL DEFAULT 0,
  findings_count int NOT NULL DEFAULT 0,
  actual_issues_created int NOT NULL DEFAULT 0,
  actual_memory_writes int NOT NULL DEFAULT 0,
  errors_count int NOT NULL DEFAULT 0,
  status text NOT NULL,
  started_at timestamptz,
  ended_at timestamptz,
  duration_ms int,
  github_run_id text,
  github_run_url text,
  artifact_name text,
  summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT agentops_monitoring_runs_status_chk CHECK (
    status IN ('completed', 'partial', 'failed', 'indexed')
  ),
  CONSTRAINT agentops_monitoring_runs_target_class_chk CHECK (
    target_class IN ('staging', 'preview', 'local', 'production_rejected', 'invalid')
  ),
  CONSTRAINT agentops_monitoring_runs_staging_writes_chk CHECK (
    dry_run = true OR (actual_issues_created = 0 AND actual_memory_writes = 0)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_agentops_monitoring_runs_run_id
  ON public.agentops_monitoring_runs (run_id);

CREATE INDEX IF NOT EXISTS idx_agentops_monitoring_runs_created_at_desc
  ON public.agentops_monitoring_runs (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_agentops_monitoring_runs_github_run_id
  ON public.agentops_monitoring_runs (github_run_id)
  WHERE github_run_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_agentops_monitoring_runs_status
  ON public.agentops_monitoring_runs (status);

COMMENT ON TABLE public.agentops_monitoring_runs IS
  'Staging index of AgentOps scheduled monitoring dry-run summaries (GHA + UI read). No live-write automation.';

ALTER TABLE public.agentops_monitoring_runs ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.agentops_monitoring_runs TO authenticated;
-- Inserts via service role (GHA) only — no authenticated INSERT policy.

DROP POLICY IF EXISTS agentops_monitoring_runs_select_owner ON public.agentops_monitoring_runs;
CREATE POLICY agentops_monitoring_runs_select_owner ON public.agentops_monitoring_runs
  FOR SELECT TO authenticated
  USING (public.agentops_is_owner());
