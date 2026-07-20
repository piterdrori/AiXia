-- Phase D-B: allow owner cancel terminal status on staging monitoring runs.

ALTER TABLE public.agentops_monitoring_runs
  DROP CONSTRAINT IF EXISTS agentops_monitoring_runs_status_chk;

ALTER TABLE public.agentops_monitoring_runs
  ADD CONSTRAINT agentops_monitoring_runs_status_chk CHECK (
    status IN (
      'completed',
      'partial',
      'failed',
      'indexed',
      'queued',
      'running',
      'canceled'
    )
  );

COMMENT ON CONSTRAINT agentops_monitoring_runs_status_chk ON public.agentops_monitoring_runs IS
  'Fleet index + queued/running + canceled for owner/scheduled staging worker runs.';
