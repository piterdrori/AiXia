/**
 * AgentOps runtime worker — starts scheduled + continuous autonomous agent loops.
 * Backend only · staging only · Node / server worker entry.
 */

import type { AgentOpsRuntimeEngineOptions } from "./agentOpsRuntimeEngine";
import {
  runContinuousLoop,
  runScheduledLoop,
  runRuntimeTick,
} from "./agentOpsRuntimeEngine";
import {
  isContinuousMonitoringActive,
  isScheduledMonitoringActive,
} from "./agentOpsMonitoringRuntimeConfig";
import { createAgentOpsRuntimeSupabaseClient } from "./agentOpsRuntimeSupabase";
import { listActiveAgents } from "../db/agentOpsRuntimeRepository";

export type StartAgentRuntimeOptions = AgentOpsRuntimeEngineOptions & {
  /** Run a single tick and exit (cron-friendly). */
  once?: boolean;
};

let stopRequested = false;

export function requestAgentRuntimeStop(): void {
  stopRequested = true;
}

export function isAgentRuntimeStopRequested(): boolean {
  return stopRequested;
}

function bindStopSignals(): void {
  const handleStop = (signal: string) => {
    console.info(`[agentops-runtime] received ${signal} — stopping after current cycle`);
    requestAgentRuntimeStop();
  };

  process.once("SIGINT", () => handleStop("SIGINT"));
  process.once("SIGTERM", () => handleStop("SIGTERM"));
}

/**
 * Bootstrap and run the AgentOps runtime engine.
 * - `once: true` → single tick for all active agents, then exit (scheduled/cron).
 * - default → long-running worker with per-agent mode loops.
 */
export async function startAgentRuntime(
  options: StartAgentRuntimeOptions = {},
): Promise<void> {
  stopRequested = false;
  bindStopSignals();

  const bootstrap = createAgentOpsRuntimeSupabaseClient();
  if (!bootstrap.ok) {
    throw new Error(bootstrap.error);
  }

  const client = bootstrap.client;
  const engineOptions: AgentOpsRuntimeEngineOptions = {
    ...options,
    shouldStop: () => stopRequested || (options.shouldStop?.() ?? false),
    onCycleComplete: (result) => {
      console.info(
        `[agentops-runtime] cycle complete agent=${result.agentName} findings=${result.findingsCount} created=${result.issuesCreated} skipped=${result.issuesSkipped} blocked=${result.issuesBlockedByPolicy} memory=${result.memoryProposals} dryRun=${result.dryRun}`,
      );
      options.onCycleComplete?.(result);
    },
  };

  if (options.once) {
    const tick = await runRuntimeTick(client, engineOptions);
    if (tick.errors.length > 0) {
      console.error("[agentops-runtime] tick completed with errors:", tick.errors);
    }
    return;
  }

  const agentsResult = await listActiveAgents(client);
  if (agentsResult.error || !agentsResult.data) {
    throw new Error(agentsResult.error ?? "Failed to load active agents.");
  }

  const continuousAgents = agentsResult.data.filter((agent) => agent.mode === "continuous");
  const hasScheduledAgents = agentsResult.data.some((agent) => agent.mode === "scheduled");
  const scheduledActive = isScheduledMonitoringActive();
  const continuousActive = isContinuousMonitoringActive();

  if (!scheduledActive && !continuousActive) {
    console.info(
      "[agentops-runtime] long-running worker: scheduled and continuous monitoring prepared but not active. Use once:true for manual tick or set AGENTOPS_MONITORING_* env flags (Phase 2).",
    );
    return;
  }

  console.info(
    `[agentops-runtime] starting worker scheduled=${hasScheduledAgents && scheduledActive} continuous=${continuousActive ? continuousAgents.length : 0}`,
  );

  const continuousTasks =
    continuousActive
      ? continuousAgents.map((agent) => runContinuousLoop(client, agent, engineOptions))
      : [];

  const scheduledTask =
    hasScheduledAgents && scheduledActive
      ? runScheduledLoop(client, engineOptions)
      : Promise.resolve();

  await Promise.all([scheduledTask, ...continuousTasks]);
}
