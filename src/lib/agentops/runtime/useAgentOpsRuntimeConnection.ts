/**
 * Connection + system health hooks for AgentOps mirror UI.
 * Polling is owned by AgentOpsRuntimeRefreshController — these hooks only subscribe.
 */

import { useCallback, useEffect, useState } from "react";

import {
  invalidateAgentOpsProjectHealthCache,
  verifySupabaseProjectHealth,
  type AgentOpsSupabaseProjectHealth,
} from "./agentOpsSupabaseConnection";
import { checkAgentOpsSystemHealth, type AgentOpsSystemHealth } from "./agentOpsSystemHealth";
import { subscribeAgentOpsRuntimeRefresh } from "./agentOpsRuntimeRefreshController";

export function useAgentOpsRuntimeConnection() {
  const [projectHealth, setProjectHealth] = useState<AgentOpsSupabaseProjectHealth | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (bypassCache: boolean, showLoading: boolean) => {
    if (showLoading) setLoading(true);
    if (bypassCache) invalidateAgentOpsProjectHealthCache();
    const result = await verifySupabaseProjectHealth({ bypassCache: true });
    setProjectHealth(result);
    setLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const run = async (bypassCache: boolean, showLoading: boolean) => {
      if (showLoading) setLoading(true);
      if (bypassCache) invalidateAgentOpsProjectHealthCache();
      const result = await verifySupabaseProjectHealth({ bypassCache: true });
      if (cancelled) return;
      setProjectHealth(result);
      setLoading(false);
    };

    void run(false, true);

    const unsubscribe = subscribeAgentOpsRuntimeRefresh(() => {
      void run(false, false);
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  const refresh = useCallback(
    async (bypassCache = true) => {
      await load(bypassCache, true);
    },
    [load],
  );

  return { projectHealth, loading, refresh };
}

export function useAgentOpsSystemHealth() {
  const [health, setHealth] = useState<AgentOpsSystemHealth | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (showLoading: boolean) => {
    if (showLoading) setLoading(true);
    invalidateAgentOpsProjectHealthCache();
    const result = await checkAgentOpsSystemHealth();
    setHealth(result);
    setLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const run = async (showLoading: boolean) => {
      if (showLoading) setLoading(true);
      invalidateAgentOpsProjectHealthCache();
      const result = await checkAgentOpsSystemHealth();
      if (cancelled) return;
      setHealth(result);
      setLoading(false);
    };

    void run(true);

    const unsubscribe = subscribeAgentOpsRuntimeRefresh(() => {
      void run(false);
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  const refresh = useCallback(async () => {
    await load(true);
  }, [load]);

  return { health, loading, refresh };
}
