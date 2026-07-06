-- AgentOps monitoring memory proposals (staging only, Phase 5E).
-- Owner-gated memory proposals from dry-run patterns — never auto-apply to active memory.

CREATE TABLE IF NOT EXISTS public.agentops_monitoring_memory_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  monitoring_run_id uuid REFERENCES public.agentops_monitoring_runs(id) ON DELETE SET NULL,
  run_id text NOT NULL,
  github_run_id text,
  source text NOT NULL DEFAULT 'monitoring',
  status text NOT NULL DEFAULT 'proposal',
  agent_slug text,
  memory_scope text NOT NULL,
  memory_type text NOT NULL,
  title text NOT NULL,
  proposal text NOT NULL,
  rationale text NOT NULL,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  confidence numeric,
  duplicate_key text,
  duplicate_of uuid REFERENCES public.agentops_monitoring_memory_proposals(id) ON DELETE SET NULL,
  owner_decision_by text,
  owner_decision_at timestamptz,
  applied_memory_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT agentops_monitoring_memory_proposals_status_chk CHECK (
    status IN ('proposal', 'owner_approved', 'rejected', 'deferred', 'applied')
  ),
  CONSTRAINT agentops_monitoring_memory_proposals_scope_chk CHECK (
    memory_scope IN ('global', 'agent', 'module', 'route')
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_agentops_monitoring_memory_proposals_duplicate_key
  ON public.agentops_monitoring_memory_proposals (duplicate_key)
  WHERE duplicate_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_agentops_monitoring_memory_proposals_status
  ON public.agentops_monitoring_memory_proposals (status);

CREATE INDEX IF NOT EXISTS idx_agentops_monitoring_memory_proposals_memory_scope
  ON public.agentops_monitoring_memory_proposals (memory_scope);

CREATE INDEX IF NOT EXISTS idx_agentops_monitoring_memory_proposals_memory_type
  ON public.agentops_monitoring_memory_proposals (memory_type);

CREATE INDEX IF NOT EXISTS idx_agentops_monitoring_memory_proposals_agent_slug
  ON public.agentops_monitoring_memory_proposals (agent_slug)
  WHERE agent_slug IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_agentops_monitoring_memory_proposals_run_id
  ON public.agentops_monitoring_memory_proposals (run_id);

CREATE INDEX IF NOT EXISTS idx_agentops_monitoring_memory_proposals_github_run_id
  ON public.agentops_monitoring_memory_proposals (github_run_id)
  WHERE github_run_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_agentops_monitoring_memory_proposals_created_at_desc
  ON public.agentops_monitoring_memory_proposals (created_at DESC);

COMMENT ON TABLE public.agentops_monitoring_memory_proposals IS
  'Owner-gated memory proposals from monitoring dry-runs. No auto-apply to agentops_memory.';

ALTER TABLE public.agentops_monitoring_memory_proposals ENABLE ROW LEVEL SECURITY;

GRANT SELECT, UPDATE ON public.agentops_monitoring_memory_proposals TO authenticated;
-- Inserts via service role (GHA pipeline) only.

DROP POLICY IF EXISTS agentops_monitoring_memory_proposals_select_owner ON public.agentops_monitoring_memory_proposals;
CREATE POLICY agentops_monitoring_memory_proposals_select_owner ON public.agentops_monitoring_memory_proposals
  FOR SELECT TO authenticated
  USING (public.agentops_is_owner());

DROP POLICY IF EXISTS agentops_monitoring_memory_proposals_update_owner ON public.agentops_monitoring_memory_proposals;
CREATE POLICY agentops_monitoring_memory_proposals_update_owner ON public.agentops_monitoring_memory_proposals
  FOR UPDATE TO authenticated
  USING (public.agentops_is_owner())
  WITH CHECK (public.agentops_is_owner());

CREATE OR REPLACE FUNCTION public.agentops_monitoring_memory_proposals_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS agentops_monitoring_memory_proposals_updated_at ON public.agentops_monitoring_memory_proposals;
CREATE TRIGGER agentops_monitoring_memory_proposals_updated_at
  BEFORE UPDATE ON public.agentops_monitoring_memory_proposals
  FOR EACH ROW
  EXECUTE FUNCTION public.agentops_monitoring_memory_proposals_set_updated_at();
