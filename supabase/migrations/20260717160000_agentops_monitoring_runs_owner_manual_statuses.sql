-- Fix B: owner manual runs insert status=queued then update to running.
-- Original Phase 5B constraint only allowed completed/partial/failed/indexed.

ALTER TABLE public.agentops_monitoring_runs
  DROP CONSTRAINT IF EXISTS agentops_monitoring_runs_status_chk;

ALTER TABLE public.agentops_monitoring_runs
  ADD CONSTRAINT agentops_monitoring_runs_status_chk CHECK (
    status IN ('completed', 'partial', 'failed', 'indexed', 'queued', 'running')
  );

COMMENT ON CONSTRAINT agentops_monitoring_runs_status_chk ON public.agentops_monitoring_runs IS
  'Fleet index statuses plus queued/running for owner_manual_single_agent accept path.';
