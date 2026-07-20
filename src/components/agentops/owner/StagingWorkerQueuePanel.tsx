import { useCallback, useEffect, useState } from "react";

import { AixiaBadge, AixiaButton } from "@/components/aixia";
import {
  acknowledgeWorkerHealthAlert,
  fetchWorkerQueueStatus,
  type ManualRunCapability,
  type WorkerQueueSnapshot,
} from "@/lib/agentops/agents/agentManualRunClient";

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

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  const workerLabel = capability?.workerConnected
    ? "Worker connected"
    : capability?.workerStatus === "stale"
      ? "Worker stale"
      : "Worker offline";
  const schedulerLabel = capability?.schedulerConnected
    ? "Scheduler executable"
    : "Scheduler not executable";
  const enginesLabel = capability?.enginesReady ? "Engines ready" : "Engines not ready";

  return (
    <section
      className="space-y-3 rounded-xl border border-white/10 bg-white/[0.02] p-4"
      data-testid="agentops-staging-worker-queue-panel"
      aria-labelledby="agentops-worker-queue-title"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="agentops-worker-queue-title" className="text-base font-semibold text-white">
            Staging worker queue
          </h2>
          <p className="text-xs text-white/45">
            Owner-gated staging queue. No GitHub dispatch. No Playwright on Vercel.
          </p>
        </div>
        <AixiaButton variant="secondary" onClick={() => void load()} disabled={loading}>
          Refresh queue
        </AixiaButton>
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
        <AixiaBadge tone="neutral">Queue: {queue?.length ?? "—"}</AixiaBadge>
      </div>

      <div className="grid gap-2 text-xs text-white/60 sm:grid-cols-2 lg:grid-cols-3">
        <p data-testid="agentops-queue-active-run">
          Active:{" "}
          <span className="text-white/85">
            {queue?.active
              ? `${queue.active.runId} · ${queue.active.agentSlug ?? "?"} · ${queue.active.workType ?? "?"} · ${queue.active.trigger ?? "?"}`
              : "None"}
          </span>
        </p>
        <p>Oldest queued age: {ageLabel(queue?.oldestQueuedAgeMs)}</p>
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
        <p>Last completed: {queue?.lastCompletedRunId ?? "—"}</p>
        <p>Last failed: {queue?.lastFailedRunId ?? "—"}</p>
        <p className="sm:col-span-2 lg:col-span-3">
          Last error:{" "}
          <span className="text-amber-200/70">{queue?.lastError ?? "None"}</span>
        </p>
      </div>

      {(queue?.alerts?.length ?? 0) > 0 || queue?.alertFanout ? (
        <div className="space-y-2" data-testid="agentops-worker-health-alerts">
          <h3 className="text-sm font-medium text-white/80">Health alerts</h3>
          {queue?.alertFanout ? (
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
              .slice(0, 8)
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
          {(queue!.alerts!.filter((a) => a.acknowledged).length > 0 ||
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
        <h3 className="text-sm font-medium text-white/80">Queued (next 10)</h3>
        {(queue?.queued?.length ?? 0) === 0 ? (
          <p className="text-xs text-white/45">No queued runs.</p>
        ) : (
          <ul className="space-y-1 text-xs text-white/70">
            {queue!.queued.map((row) => (
              <li
                key={row.runId}
                className="flex flex-wrap items-center gap-2 rounded border border-white/10 px-2 py-1"
              >
                <AixiaBadge tone={statusTone(row.status)}>{row.status}</AixiaBadge>
                <span className="font-mono">{row.runId}</span>
                <span>
                  {row.agentSlug} · {row.workType} · {row.trigger}
                </span>
                <span className="text-white/40">age {ageLabel(row.ageMs)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-medium text-white/80">Running</h3>
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
              </li>
            ))}
          </ul>
        )}
      </div>

      {!compact ? (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-white/80">Recent terminal</h3>
          {(queue?.recentTerminal?.length ?? 0) === 0 ? (
            <p className="text-xs text-white/45">No recent completed/failed/canceled runs.</p>
          ) : (
            <ul className="space-y-1 text-xs text-white/70">
              {queue!.recentTerminal.map((row) => (
                <li
                  key={row.runId}
                  className="flex flex-wrap items-center gap-2 rounded border border-white/10 px-2 py-1"
                >
                  <AixiaBadge tone={statusTone(row.status)}>{row.status}</AixiaBadge>
                  <span className="font-mono">{row.runId}</span>
                  <span>
                    {row.agentSlug} · {row.workType} · {row.trigger}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </section>
  );
}
