/**
 * Single source of refresh for AgentOps runtime mirror UI.
 * One interval (optional) notifies all subscribers — no per-hook timers.
 */

import {
  AGENTOPS_RUNTIME_GLOBAL_POLL_MS,
  DEBUG_NO_REFRESH,
} from "./agentOpsRuntimeRefreshConfig";

export type AgentOpsRuntimeRefreshListener = () => void;

const listeners = new Set<AgentOpsRuntimeRefreshListener>();
let globalIntervalId: number | null = null;
let globalPollingRefCount = 0;

export function subscribeAgentOpsRuntimeRefresh(
  listener: AgentOpsRuntimeRefreshListener,
): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Manual refresh — invoked by Refresh buttons and optional global tick. */
export function triggerAgentOpsRuntimeRefresh(): void {
  for (const listener of listeners) {
    listener();
  }
}

export function startAgentOpsRuntimeGlobalPolling(): () => void {
  globalPollingRefCount += 1;

  if (globalIntervalId == null && AGENTOPS_RUNTIME_GLOBAL_POLL_MS > 0) {
    globalIntervalId = window.setInterval(() => {
      triggerAgentOpsRuntimeRefresh();
    }, AGENTOPS_RUNTIME_GLOBAL_POLL_MS);
  }

  return () => {
    globalPollingRefCount = Math.max(0, globalPollingRefCount - 1);
    if (globalPollingRefCount === 0 && globalIntervalId != null) {
      window.clearInterval(globalIntervalId);
      globalIntervalId = null;
    }
  };
}

export function isAgentOpsRuntimeAutoRefreshEnabled(): boolean {
  return !DEBUG_NO_REFRESH && AGENTOPS_RUNTIME_GLOBAL_POLL_MS > 0;
}

export function readAgentOpsRuntimePollIntervalMs(): number {
  return AGENTOPS_RUNTIME_GLOBAL_POLL_MS;
}
