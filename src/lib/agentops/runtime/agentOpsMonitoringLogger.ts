/**
 * Structured monitoring decision logs — observability without new UI.
 */

export type MonitoringLogEvent =
  | "config_loaded"
  | "eligibility_checked"
  | "agent_skipped"
  | "run_started"
  | "run_completed"
  | "dry_run_would_mutate"
  | "loop_blocked"
  | "tick_started"
  | "tick_completed";

export type MonitoringLogPayload = Record<string, unknown>;

export function logMonitoringEvent(event: MonitoringLogEvent, payload: MonitoringLogPayload): void {
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    component: "agentops-monitoring",
    event,
    ...payload,
  });
  console.info(line);
}
