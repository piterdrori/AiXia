-- AgentOps monitoring issue drafts (staging only, Phase 5C).
-- Owner-gated drafts from dry-run findings — never auto-promote to live issues.

CREATE TABLE IF NOT EXISTS public.agentops_monitoring_issue_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  monitoring_run_id uuid REFERENCES public.agentops_monitoring_runs(id) ON DELETE SET NULL,
  run_id text NOT NULL,
  github_run_id text,
  source text NOT NULL DEFAULT 'monitoring_dry_run',
  status text NOT NULL DEFAULT 'draft',
  agent_slug text NOT NULL,
  module text,
  route text,
  issue_type text,
  severity text NOT NULL DEFAULT 'medium',
  title text NOT NULL,
  summary text NOT NULL,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  browser_qa_evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  suggested_fix_prompt text,
  confidence numeric,
  duplicate_key text NOT NULL,
  duplicate_of uuid REFERENCES public.agentops_monitoring_issue_drafts(id) ON DELETE SET NULL,
  owner_decision_by text,
  owner_decision_at timestamptz,
  promoted_issue_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT agentops_monitoring_issue_drafts_status_chk CHECK (
    status IN ('draft', 'owner_approved', 'rejected', 'deferred', 'promoted')
  ),
  CONSTRAINT agentops_monitoring_issue_drafts_severity_chk CHECK (
    severity IN ('low', 'medium', 'high', 'critical')
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_agentops_monitoring_issue_drafts_duplicate_key
  ON public.agentops_monitoring_issue_drafts (duplicate_key);

CREATE INDEX IF NOT EXISTS idx_agentops_monitoring_issue_drafts_status
  ON public.agentops_monitoring_issue_drafts (status);

CREATE INDEX IF NOT EXISTS idx_agentops_monitoring_issue_drafts_run_id
  ON public.agentops_monitoring_issue_drafts (run_id);

CREATE INDEX IF NOT EXISTS idx_agentops_monitoring_issue_drafts_github_run_id
  ON public.agentops_monitoring_issue_drafts (github_run_id)
  WHERE github_run_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_agentops_monitoring_issue_drafts_agent_slug
  ON public.agentops_monitoring_issue_drafts (agent_slug);

CREATE INDEX IF NOT EXISTS idx_agentops_monitoring_issue_drafts_route
  ON public.agentops_monitoring_issue_drafts (route)
  WHERE route IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_agentops_monitoring_issue_drafts_severity
  ON public.agentops_monitoring_issue_drafts (severity);

CREATE INDEX IF NOT EXISTS idx_agentops_monitoring_issue_drafts_created_at_desc
  ON public.agentops_monitoring_issue_drafts (created_at DESC);

COMMENT ON TABLE public.agentops_monitoring_issue_drafts IS
  'Owner-gated issue drafts from monitoring dry-runs. No auto-promotion to agentops_issues.';

ALTER TABLE public.agentops_monitoring_issue_drafts ENABLE ROW LEVEL SECURITY;

GRANT SELECT, UPDATE ON public.agentops_monitoring_issue_drafts TO authenticated;
-- Inserts via service role (GHA pipeline) only.

DROP POLICY IF EXISTS agentops_monitoring_issue_drafts_select_owner ON public.agentops_monitoring_issue_drafts;
CREATE POLICY agentops_monitoring_issue_drafts_select_owner ON public.agentops_monitoring_issue_drafts
  FOR SELECT TO authenticated
  USING (public.agentops_is_owner());

DROP POLICY IF EXISTS agentops_monitoring_issue_drafts_update_owner ON public.agentops_monitoring_issue_drafts;
CREATE POLICY agentops_monitoring_issue_drafts_update_owner ON public.agentops_monitoring_issue_drafts
  FOR UPDATE TO authenticated
  USING (public.agentops_is_owner())
  WITH CHECK (public.agentops_is_owner());

CREATE OR REPLACE FUNCTION public.agentops_monitoring_issue_drafts_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS agentops_monitoring_issue_drafts_updated_at ON public.agentops_monitoring_issue_drafts;
CREATE TRIGGER agentops_monitoring_issue_drafts_updated_at
  BEFORE UPDATE ON public.agentops_monitoring_issue_drafts
  FOR EACH ROW
  EXECUTE FUNCTION public.agentops_monitoring_issue_drafts_set_updated_at();
