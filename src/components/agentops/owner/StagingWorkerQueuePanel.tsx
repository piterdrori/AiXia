import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { AixiaBadge, AixiaButton } from "@/components/aixia";
import {
  acknowledgeWorkerHealthAlert,
  cancelOwnerManualRun,
  fetchWorkerQueueStatus,
  type ManualRunCapability,
  type WorkerQueueRunView,
  type WorkerQueueSnapshot,
} from "@/lib/agentops/agents/agentManualRunClient";

const COMPACT_QUEUED_MAX = 3;

type StagingWorkerQueuePanelProps = {
  agentSlug?: string;
  compact?: boolean;
  refreshKey?: number;
};

function ageLabel(ageMs: number | null | undefined): string {
  if (ageMs == null) return "—";
  if (ageMs < 60_000) return `${Math.round(ageMs / 1000)}s`;
  if (ageMs < 3_600_000) return `${Math.round(ageMs / 60_000)}m`;
  return `${Math.round(ageMs / 3_600_000)}h`;
}

function statusTone(
  status: string,
  stale?: boolean,
): "emerald" | "amber" | "neutral" | "rose" {
  if (stale) return "amber";
  if (status === "completed") return "emerald";
  if (status === "failed") return "rose";
  if (status === "canceled") return "neutral";
  if (status === "running") return "amber";
  return "neutral";
}

/** E-A9 — owner-readable run outcome, matching the Issues inbox vocabulary. */
function terminalOutcomeLabel(row: WorkerQueueRunView): string | null {
  if (row.status !== "completed") return null;
  const issues = row.draftsCreated ?? 0;
  const improvements = row.improvementDraftsCreated ?? 0;
  if (issues > 0 && improvements > 0) {
    return `${issues} issue${issues === 1 ? "" : "s"} + ${improvements} improvement${improvements === 1 ? "" : "s"} filed`;
  }
  if (issues > 0) return `${issues} issue${issues === 1 ? "" : "s"} filed`;
  if (improvements > 0) {
    return `${improvements} improvement suggestion${improvements === 1 ? "" : "s"} filed`;
  }
  if (row.result === "findings_found") return "Findings recorded";
  if (row.result === "improvements_suggested") return "Improvements suggested";
  if (row.result === "completed") return "No new findings (existing suggestions still open)";
  return null;
}

export function StagingWorkerQueuePanel({
  agentSlug,
  compact = false,
  refreshKey = 0,
}: StagingWorkerQueuePanelProps) {
  const [queue, setQueue] = useState<WorkerQueueSnapshot | null>(null);
  const [capability, setCapability] = useState<ManualRunCapability | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [workTypeFilter, setWorkTypeFilter] = useState("");
  const [triggerFilter, setTriggerFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [ackBusyType, setAckBusyType] = useState<string | null>(null);
  const [cancelBusyId, setCancelBusyId] = useState<string | null>(null);
  const navigate = useNavigate();

  const scoped = Boolean(agentSlug);
  const queuedLimit = compact ? COMPACT_QUEUED_MAX : 10;
  const queuedRows = (queue?.queued ?? []).slice(0, queuedLimit);
  // Literal labels kept for D-E1 truthfulness / verify (global vs this-agent scope).
  const scopePrefix = scoped ? "This agent" : "Global";
  const queueLengthLabel = scoped ? "This agent queue:" : "Global queue:";
  const oldestQueuedLabel = scoped
    ? "This agent oldest queued:"
    : "Global oldest queued:";

  const load = useCallback(async () => {
    setLoading(true);
    const result = await fetchWorkerQueueStatus({
      agentSlug,
      workType: workTypeFilter || undefined,
      trigger: triggerFilter || undefined,
      status: statusFilter || undefined,
    });
    setQueue(result.queue);
    setCapability(result.capability);
    setError(result.error);
    setLoading(false);
  }, [agentSlug, workTypeFilter, triggerFilter, statusFilter]);

  const onAcknowledgeAlert = useCallback(
    async (alertType: string) => {
      if (!alertType || ackBusyType) return;
      setAckBusyType(alertType);
      const result = await acknowledgeWorkerHealthAlert(alertType);
      if (!result.ok) {
        setError(result.error || "Could not acknowledge alert.");
      } else {
        await load();
      }
      setAckBusyType(null);
    },
    [ackBusyType, load],
  );

  const onCancelQueued = useCallback(
    async (row: WorkerQueueRunView) => {
      if (!row.runId || cancelBusyId) return;
      setCancelBusyId(row.runId);
      const result = await cancelOwnerManualRun({
        runId: row.runId,
        agentSlug: row.agentSlug ?? agentSlug,
      });
      if (!result.ok) {
        setError(result.message || "Cancel failed.");
      } else {
        setError(null);
        await load();
      }
      setCancelBusyId(null);
    },
    [agentSlug, cancelBusyId, load],
  );

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  const workerLabel =
    capability?.workerConnected && capability?.workerStatus !== "stale"
      ? "Worker online"
      : "Worker offline";
  const schedulerLabel = capability?.schedulerConnected
    ? "Scheduler online"
    : "Scheduler offline";
  const enginesLabel = capability?.enginesReady
    ? "Audit tools ready"
    : "Audit tools unavailable";

  const hasAgentWork =
    Boolean(queue?.active) ||
    (queue?.queued?.length ?? 0) > 0 ||
    (queue?.running?.length ?? 0) > 0;

  if (compact && scoped && !loading && !hasAgentWork) {
    return (
      <section
        className="space-y-3 rounded-xl border border-white/10 bg-white/[0.02] p-4"
        data-testid="agentops-staging-worker-queue-panel"
        aria-labelledby="agentops-worker-queue-title"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 id="agentops-worker-queue-title" className="text-base font-semibold text-white">
              This agent queue
            </h2>
            <p
              className="mt-1 text-sm text-white/70"
              data-testid="agentops-queue-empty-compact"
            >
              No active or queued work for this agent.
            </p>
            <p className="mt-1 text-xs text-white/45">
              {workerLabel}
              {!capability?.workerConnected || capability?.workerStatus === "stale"
                ? " — queued work will start when the worker is running."
                : "."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <AixiaButton
              variant="secondary"
              onClick={() => navigate("/system/agent-ops/monitoring")}
              data-testid="agentops-queue-open-monitoring"
            >
              Open Monitoring
            </AixiaButton>
            <AixiaButton variant="secondary" onClick={() => void load()} disabled={loading}>
              Refresh
            </AixiaButton>
          </div>
        </div>
        {error ? (
          <p className="text-sm text-amber-200/80" role="status">
            {error}
          </p>
        ) : null}
      </section>
    );
  }

  return (
    <section
      className="space-y-3 rounded-xl border border-white/10 bg-white/[0.02] p-4"
      data-testid="agentops-staging-worker-queue-panel"
      aria-labelledby="agentops-worker-queue-title"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="agentops-worker-queue-title" className="text-base font-semibold text-white">
            {compact && scoped ? "This agent queue" : "Staging worker queue"}
          </h2>
          <p className="text-xs text-white/45">
            {compact
              ? scoped
                ? "Active and queued work for this agent."
                : "Compact staging queue."
              : "Owner-gated staging queue. No GitHub dispatch. No Playwright on Vercel."}
            {!compact && scoped ? " Metrics below are scoped to this agent." : null}
            {!compact && !scoped ? " Metrics below are global." : null}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {compact ? (
            <AixiaButton
              variant="secondary"
              onClick={() => navigate("/system/agent-ops/monitoring")}
              data-testid="agentops-queue-open-monitoring"
            >
              Open Monitoring
            </AixiaButton>
          ) : null}
          <AixiaButton variant="secondary" onClick={() => void load()} disabled={loading}>
            Refresh queue
          </AixiaButton>
        </div>
      </div>

      {error ? (
        <p className="text-sm text-amber-200/80" role="status">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2 text-xs">
        <AixiaBadge tone={capability?.workerConnected ? "emerald" : "neutral"}>
          {workerLabel}
        </AixiaBadge>
        <AixiaBadge tone={capability?.schedulerConnected ? "emerald" : "neutral"}>
          {schedulerLabel}
        </AixiaBadge>
        <AixiaBadge tone={capability?.enginesReady ? "emerald" : "neutral"}>
          {enginesLabel}
        </AixiaBadge>
        <AixiaBadge tone="neutral" data-testid="agentops-queue-scope-length">
          {queueLengthLabel} {queue?.length ?? "—"}
        </AixiaBadge>
      </div>

      <div className="grid gap-2 text-xs text-white/60 sm:grid-cols-2 lg:grid-cols-3">
        <p data-testid="agentops-queue-active-run">
          {scopePrefix} active:{" "}
          <span className="text-white/85">
            {queue?.active
              ? `${queue.active.runId} · ${queue.active.agentSlug ?? "?"} · ${queue.active.workType ?? "?"} · ${queue.active.trigger ?? "?"}`
              : "None"}
          </span>
        </p>
        <p data-testid="agentops-queue-oldest-age">
          {oldestQueuedLabel} {ageLabel(queue?.oldestQueuedAgeMs)}
          {!compact && queue?.opsOldestQueuedAgeStale && queue.opsOldestQueuedAgeMs != null ? (
            <span className="text-white/35">
              {" "}
              (ops diagnostic {ageLabel(queue.opsOldestQueuedAgeMs)} · stale)
            </span>
          ) : null}
        </p>
        {!compact ? (
          <>
            <p>
              Heartbeat:{" "}
              {queue?.workerHeartbeatAt
                ? new Date(queue.workerHeartbeatAt).toLocaleString()
                : "—"}
            </p>
            <p>
              Scheduler tick:{" "}
              {queue?.schedulerHeartbeatAt
                ? new Date(queue.schedulerHeartbeatAt).toLocaleString()
                : "—"}
            </p>
          </>
        ) : null}
        <p data-testid="agentops-queue-last-completed">
          {scoped ? "Latest completed for this agent" : "Latest global completed"}:{" "}
          {queue?.lastCompletedRunId ?? "—"}
        </p>
        <p>
          {scoped ? "Latest failed for this agent" : "Latest global failed"}:{" "}
          {queue?.lastFailedRunId ?? "—"}
        </p>
        {queue?.lastError ? (
          <p className="sm:col-span-2 lg:col-span-3">
            Last error: <span className="text-amber-200/70">{queue.lastError}</span>
          </p>
        ) : null}
      </div>

      {(queue?.alerts?.length ?? 0) > 0 || (!compact && queue?.alertFanout) ? (
        <div className="space-y-2" data-testid="agentops-worker-health-alerts">
          <h3 className="text-sm font-medium text-white/80">
            {scoped ? "Health alerts (global worker)" : "Health alerts"}
          </h3>
          {!compact && queue?.alertFanout ? (
            <p className="text-xs text-white/45" data-testid="agentops-alert-fanout-status">
              Fanout: {queue.alertFanout.enabled === false ? "disabled" : queue.alertFanout.lastFanoutChannel || "—"}
              {queue.alertFanout.lastFanoutAt
                ? ` · last ${new Date(queue.alertFanout.lastFanoutAt).toLocaleString()}`
                : ""}
              {typeof queue.alertFanout.suppressedCount === "number"
                ? ` · suppressed ${queue.alertFanout.suppressedCount}`
                : ""}
            </p>
          ) : null}
          <ul className="space-y-1 text-xs text-white/70">
            {queue!
              .alerts!.filter((a) => !a.acknowledged)
              .slice(0, compact ? 3 : 8)
              .map((alert) => (
                <li
                  key={String(alert.id || alert.type)}
                  className="flex flex-wrap items-center gap-2 rounded border border-white/10 px-2 py-1"
                >
                  <AixiaBadge
                    tone={
                      alert.level === "critical"
                        ? "rose"
                        : alert.level === "warning"
                          ? "amber"
                          : "neutral"
                    }
                  >
                    {String(alert.level || "info")}
                  </AixiaBadge>
                  <span className="font-mono">{String(alert.type)}</span>
                  <span>{String(alert.message || "")}</span>
                  {alert.recommendedAction ? (
                    <span className="basis-full text-amber-200/70">
                      {String(alert.recommendedAction)}
                    </span>
                  ) : null}
                  {alert.type ? (
                    <AixiaButton
                      variant="secondary"
                      className="ml-auto"
                      data-testid="agentops-health-alert-ack"
                      disabled={ackBusyType === String(alert.type)}
                      onClick={() => void onAcknowledgeAlert(String(alert.type))}
                    >
                      {ackBusyType === String(alert.type) ? "Ack…" : "Acknowledge"}
                    </AixiaButton>
                  ) : null}
                </li>
              ))}
          </ul>
          {!compact &&
            (queue!.alerts!.filter((a) => a.acknowledged).length > 0 ||
              (queue?.alertHistory?.length ?? 0) > 0) && (
              <details className="text-xs text-white/50">
                <summary>Acknowledged / history</summary>
                <ul className="mt-1 space-y-1">
                  {queue!
                    .alerts!.filter((a) => a.acknowledged)
                    .slice(0, 5)
                    .map((alert) => (
                      <li key={`ack-${alert.id || alert.type}`}>
                        {String(alert.type)} — {String(alert.message || "")}
                      </li>
                    ))}
                  {(queue?.alertHistory || []).slice(0, 5).map((h, i) => (
                    <li key={`hist-${i}`}>
                      {String(h.type || "")} @ {String(h.acknowledgedAt || "")}
                    </li>
                  ))}
                </ul>
              </details>
            )}
        </div>
      ) : null}

      {!compact ? (
        <div className="flex flex-wrap gap-2 text-xs">
          <label className="flex items-center gap-1 text-white/55">
            Work
            <select
              className="rounded border border-white/15 bg-black/30 px-2 py-1 text-white/80"
              value={workTypeFilter}
              onChange={(e) => setWorkTypeFilter(e.target.value)}
            >
              <option value="">All</option>
              <option value="website_audit">website_audit</option>
              <option value="browser_qa">browser_qa</option>
            </select>
          </label>
          <label className="flex items-center gap-1 text-white/55">
            Trigger
            <select
              className="rounded border border-white/15 bg-black/30 px-2 py-1 text-white/80"
              value={triggerFilter}
              onChange={(e) => setTriggerFilter(e.target.value)}
            >
              <option value="">All</option>
              <option value="owner_manual">owner_manual</option>
              <option value="schedule">schedule</option>
            </select>
          </label>
          <label className="flex items-center gap-1 text-white/55">
            Status
            <select
              className="rounded border border-white/15 bg-black/30 px-2 py-1 text-white/80"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">Active</option>
              <option value="queued">queued</option>
              <option value="running">running</option>
              <option value="completed">completed</option>
              <option value="failed">failed</option>
              <option value="canceled">canceled</option>
            </select>
          </label>
        </div>
      ) : null}

      <div className="space-y-2">
        <h3 className="text-sm font-medium text-white/80">
          Queued (max {queuedLimit}){scoped ? " · this agent" : ""}
        </h3>
        {queuedRows.length === 0 ? (
          <p className="text-xs text-white/45">No queued runs.</p>
        ) : (
          <ul className="space-y-1 text-xs text-white/70">
            {queuedRows.map((row) => (
              <li
                key={row.runId}
                className="flex flex-wrap items-center gap-2 rounded border border-white/10 px-2 py-1"
                data-testid={
                  row.trigger === "schedule"
                    ? "agentops-queued-scheduled-run-row"
                    : "agentops-queued-run-row"
                }
              >
                <AixiaBadge tone={statusTone(row.status)}>{row.status}</AixiaBadge>
                <span className="font-mono">{row.runId}</span>
                <span>
                  {row.agentSlug} · {row.workType} · {row.trigger}
                </span>
                <span className="text-white/40">age {ageLabel(row.ageMs)}</span>
                <span className="text-amber-200/70">
                  {row.waitingReason ||
                    (capability?.workerConnected && capability?.workerStatus !== "stale"
                      ? "Waiting for staging worker"
                      : "Worker offline — this run will start when the worker is running")}
                </span>
                {(row.status === "queued" || row.status === "running") &&
                (!agentSlug || !row.agentSlug || row.agentSlug === agentSlug) ? (
                  <AixiaButton
                    variant="secondary"
                    className="ml-auto"
                    data-testid="agentops-queue-row-cancel"
                    disabled={cancelBusyId === row.runId || row.cancelRequested}
                    onClick={() => void onCancelQueued(row)}
                  >
                    {row.cancelRequested
                      ? "Cancel requested"
                      : cancelBusyId === row.runId
                        ? "Canceling…"
                        : "Cancel"}
                  </AixiaButton>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-medium text-white/80">
          Running{scoped ? " · this agent" : ""}
        </h3>
        {(queue?.running?.length ?? 0) === 0 ? (
          <p className="text-xs text-white/45">No running runs.</p>
        ) : (
          <ul className="space-y-1 text-xs text-white/70">
            {queue!.running.map((row) => (
              <li
                key={row.runId}
                className="flex flex-wrap items-center gap-2 rounded border border-white/10 px-2 py-1"
                data-testid={row.stale ? "agentops-stale-run-row" : undefined}
              >
                <AixiaBadge tone={statusTone(row.status, row.stale)}>
                  {row.stale ? "stale" : row.status}
                </AixiaBadge>
                {row.cancelRequested ? (
                  <AixiaBadge tone="amber">Cancel requested</AixiaBadge>
                ) : null}
                <span className="font-mono">{row.runId}</span>
                <span>
                  {row.agentSlug} · {row.workType} · {row.trigger}
                </span>
                {row.lockExpiresAt ? (
                  <span className="text-white/40">
                    lock {new Date(row.lockExpiresAt).toLocaleString()}
                  </span>
                ) : null}
                {row.suggestedAction ? (
                  <span className="basis-full text-amber-200/70">{row.suggestedAction}</span>
                ) : null}
                {!row.cancelRequested &&
                (!agentSlug || !row.agentSlug || row.agentSlug === agentSlug) ? (
                  <AixiaButton
                    variant="secondary"
                    className="ml-auto"
                    data-testid="agentops-queue-row-cancel"
                    disabled={cancelBusyId === row.runId}
                    onClick={() => void onCancelQueued(row)}
                  >
                    {cancelBusyId === row.runId ? "Canceling…" : "Cancel"}
                  </AixiaButton>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>

      {!compact ? (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-white/80">Recent runs</h3>
          {(queue?.recentTerminal?.length ?? 0) === 0 ? (
            <p className="text-xs text-white/45">No recent completed/failed/canceled runs.</p>
          ) : (
            <ul className="space-y-1 text-xs text-white/70" data-testid="agentops-recent-runs">
              {queue!.recentTerminal.map((row) => {
                const outcome = terminalOutcomeLabel(row);
                const filedSomething =
                  (row.draftsCreated ?? 0) + (row.improvementDraftsCreated ?? 0) > 0;
                return (
                  <li
                    key={row.runId}
                    className="flex flex-wrap items-center gap-2 rounded border border-white/10 px-2 py-1"
                  >
                    <AixiaBadge tone={statusTone(row.status)}>{row.status}</AixiaBadge>
                    <span className="font-mono">{row.runId}</span>
                    <span>
                      {row.agentSlug ? (
                        <button
                          type="button"
                          className="text-cyan-300/90 hover:text-cyan-200"
                          onClick={() =>
                            navigate(`/system/agent-ops/agents/${row.agentSlug}`)
                          }
                        >
                          {row.agentSlug}
                        </button>
                      ) : (
                        "?"
                      )}{" "}
                      · {row.workType} · {row.trigger}
                      {row.routesCheckedCount ? ` · ${row.routesCheckedCount} route${row.routesCheckedCount === 1 ? "" : "s"}` : ""}
                    </span>
                    {row.endedAt ? (
                      <span className="text-white/40">
                        {new Date(row.endedAt).toLocaleString()}
                      </span>
                    ) : null}
                    {outcome ? (
                      <span
                        className={filedSomething ? "text-emerald-300/80" : "text-white/50"}
                        data-testid="agentops-run-outcome"
                      >
                        {outcome}
                      </span>
                    ) : null}
                    {filedSomething ? (
                      <button
                        type="button"
                        className="ml-auto text-cyan-300/90 hover:text-cyan-200"
                        onClick={() => navigate("/system/agent-ops/issues")}
                        data-testid="agentops-run-open-issues"
                      >
                        Open Issues inbox
                      </button>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : null}
    </section>
  );
}
