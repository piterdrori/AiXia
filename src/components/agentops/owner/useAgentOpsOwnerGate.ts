import { useCallback, useEffect, useRef, useState } from "react";

import { getAgentOpsOwnerStatus } from "@/lib/agentops";

export type AgentOpsOwnerGateRefreshOptions = {
  /** When true (or after first successful validation), do not flip blocking initialLoading. */
  silent?: boolean;
};

export function useAgentOpsOwnerGate() {
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasValidatedRef = useRef(false);

  const refresh = useCallback(async (options?: AgentOpsOwnerGateRefreshOptions) => {
    const silent = options?.silent === true || hasValidatedRef.current;
    if (silent) {
      setRefreshing(true);
    } else {
      setInitialLoading(true);
    }
    setError(null);

    const result = await getAgentOpsOwnerStatus();
    if (result.error) {
      setError(result.error);
      setIsOwner(false);
    } else {
      setIsOwner(Boolean(result.data?.isOwner));
      if (!result.data?.isOwner) {
        setError("AgentOps owner access required.");
      } else {
        hasValidatedRef.current = true;
      }
    }

    setInitialLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    void refresh();
    const timer = window.setTimeout(() => {
      setInitialLoading((current) => {
        if (!current) return current;
        setError((existing) => existing ?? "Owner gate timed out. Retry.");
        return false;
      });
    }, 20_000);
    return () => window.clearTimeout(timer);
  }, [refresh]);

  return {
    /** Blocking first-load flag — use for AixiaAsyncState / page shells. */
    loading: initialLoading,
    initialLoading,
    refreshing,
    isOwner,
    error,
    refresh,
  };
}
