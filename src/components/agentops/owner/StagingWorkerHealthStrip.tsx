import { useCallback, useEffect, useState } from "react";

import {
  fetchManualRunCapability,
  type ManualRunCapability,
} from "@/lib/agentops/agents/agentManualRunClient";
import {
  OWNER_TOOLS_BADGE,
  OWNER_WORKER_COPY,
  ownerWorkerLabel,
} from "@/lib/agentops/agents/agentDetailOwnerReadability";

type StripState =
  | { kind: "loading" }
  | { kind: "unavailable"; error: string }
  | { kind: "ready"; capability: ManualRunCapability };

function toolsLabel(capability: ManualRunCapability): string {
  const audit = capability.websiteAudit?.available === true;
  const browserQa = capability.browserQa?.available === true;
  if (audit || browserQa || capability.enginesReady) return OWNER_TOOLS_BADGE.ready;
  return OWNER_TOOLS_BADGE.unavailable;
}

function schedulerLabel(capability: ManualRunCapability): string {
  if (capability.schedulerConnected) return "Scheduler online";
  return "Scheduler offline";
}

function queueLabel(capability: ManualRunCapability): string {
  const queued = capability.queueLength ?? 0;
  if (capability.activeRunId) return `Queue ${queued} · run active`;
  if (queued > 0) return `Queue ${queued}`;
  return "Queue empty";
}

type StagingWorkerHealthStripProps = {
  enabled?: boolean;
  refreshKey?: number;
  className?: string;
};

/**
 * Compact truthful staging-worker strip for Agents (and similar) pages.
 * Does not replace Agent Detail / Monitoring queue panels.
 */
export function StagingWorkerHealthStrip({
  enabled = true,
  refreshKey = 0,
  className = "",
}: StagingWorkerHealthStripProps) {
  const [state, setState] = useState<StripState>({ kind: "loading" });

  const load = useCallback(async () => {
    if (!enabled) return;
    const result = await fetchManualRunCapability();
    if (!result.ok || !result.capability) {
      setState({
        kind: "unavailable",
        error: result.error ?? "Staging worker status unavailable.",
      });
      return;
    }
    setState({ kind: "ready", capability: result.capability });
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      setState({ kind: "unavailable", error: "Owner session required." });
      return;
    }
    setState({ kind: "loading" });
    void load();
  }, [enabled, load, refreshKey]);

  if (!enabled) return null;

  const workerText =
    state.kind === "ready"
      ? ownerWorkerLabel({
          workerConnected: state.capability.workerConnected,
          workerStatus: state.capability.workerStatus,
        })
      : state.kind === "loading"
        ? "Checking worker…"
        : OWNER_WORKER_COPY.offline;

  return (
    <div
      data-testid="agentops-staging-worker-health-strip"
      className={`flex flex-wrap gap-x-5 gap-y-1 rounded-lg border border-white/10 bg-white/[0.02] px-4 py-2.5 text-sm text-white/70 ${className}`}
      role="status"
      aria-live="polite"
    >
      <span data-testid="agentops-health-strip-worker">
        <span className="text-white/45">Staging worker:</span> {workerText}
      </span>
      {state.kind === "ready" ? (
        <>
          <span data-testid="agentops-health-strip-scheduler">
            <span className="text-white/45">Scheduler:</span>{" "}
            {schedulerLabel(state.capability)}
          </span>
          <span data-testid="agentops-health-strip-tools">
            <span className="text-white/45">Audit tools:</span> {toolsLabel(state.capability)}
          </span>
          <span data-testid="agentops-health-strip-queue">
            <span className="text-white/45">Queue:</span> {queueLabel(state.capability)}
          </span>
        </>
      ) : state.kind === "unavailable" ? (
        <span className="text-amber-100/80">{state.error}</span>
      ) : null}
    </div>
  );
}
