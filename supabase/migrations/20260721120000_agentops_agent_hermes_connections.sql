-- Phase D-F1 — dedicated per-agent Hermes connection records (staging).
-- Fleet Hermes transport remains separate; this table is the per-agent namespace/connection source of truth.

CREATE TABLE IF NOT EXISTS public.agentops_agent_hermes_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_slug text NOT NULL,
  runtime_agent_id uuid NULL,
  hermes_namespace text NOT NULL,
  status text NOT NULL DEFAULT 'not_configured',
  connection_version text NOT NULL DEFAULT 'd-f1',
  last_health_check_at timestamptz NULL,
  last_memory_sync_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT agentops_agent_hermes_connections_agent_slug_unique UNIQUE (agent_slug),
  CONSTRAINT agentops_agent_hermes_connections_namespace_unique UNIQUE (hermes_namespace),
  CONSTRAINT agentops_agent_hermes_connections_status_chk CHECK (
    status IN ('connected', 'not_configured', 'error', 'disabled')
  )
);

CREATE INDEX IF NOT EXISTS idx_agentops_agent_hermes_connections_status
  ON public.agentops_agent_hermes_connections (status);

CREATE INDEX IF NOT EXISTS idx_agentops_agent_hermes_connections_runtime_agent_id
  ON public.agentops_agent_hermes_connections (runtime_agent_id);

COMMENT ON TABLE public.agentops_agent_hermes_connections IS
  'D-F1 per-agent Hermes memory connection + namespace. Fleet transport health is separate.';

DROP TRIGGER IF EXISTS trg_agentops_agent_hermes_connections_set_updated_at
  ON public.agentops_agent_hermes_connections;
CREATE TRIGGER trg_agentops_agent_hermes_connections_set_updated_at
  BEFORE UPDATE ON public.agentops_agent_hermes_connections
  FOR EACH ROW
  EXECUTE FUNCTION public.finance_set_updated_at();

ALTER TABLE public.agentops_agent_hermes_connections ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.agentops_agent_hermes_connections TO authenticated;

DROP POLICY IF EXISTS agentops_agent_hermes_connections_select_owner
  ON public.agentops_agent_hermes_connections;
CREATE POLICY agentops_agent_hermes_connections_select_owner
  ON public.agentops_agent_hermes_connections
  FOR SELECT TO authenticated
  USING (public.agentops_is_owner());

DROP POLICY IF EXISTS agentops_agent_hermes_connections_insert_owner
  ON public.agentops_agent_hermes_connections;
CREATE POLICY agentops_agent_hermes_connections_insert_owner
  ON public.agentops_agent_hermes_connections
  FOR INSERT TO authenticated
  WITH CHECK (public.agentops_is_owner());

DROP POLICY IF EXISTS agentops_agent_hermes_connections_update_owner
  ON public.agentops_agent_hermes_connections;
CREATE POLICY agentops_agent_hermes_connections_update_owner
  ON public.agentops_agent_hermes_connections
  FOR UPDATE TO authenticated
  USING (public.agentops_is_owner())
  WITH CHECK (public.agentops_is_owner());

DROP POLICY IF EXISTS agentops_agent_hermes_connections_delete_owner
  ON public.agentops_agent_hermes_connections;
CREATE POLICY agentops_agent_hermes_connections_delete_owner
  ON public.agentops_agent_hermes_connections
  FOR DELETE TO authenticated
  USING (public.agentops_is_owner());
