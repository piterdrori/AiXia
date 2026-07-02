import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  invalidateAgentOpsProjectHealthCache,
  verifySupabaseProjectHealth,
  type AgentOpsSupabaseProjectHealth,
} from "@/lib/agentops/runtime/agentOpsSupabaseConnection";
import {
  isAgentOpsRuntimeAutoRefreshEnabled,
  startAgentOpsRuntimeGlobalPolling,
  subscribeAgentOpsRuntimeRefresh,
  triggerAgentOpsRuntimeRefresh,
} from "@/lib/agentops/runtime/agentOpsRuntimeRefreshController";

type AgentOpsRuntimeRefreshContextValue = {
  refreshAll: () => void;
  autoRefreshEnabled: boolean;
};

type AgentOpsRuntimeConnectionContextValue = {
  projectHealth: AgentOpsSupabaseProjectHealth | null;
  loading: boolean;
  refresh: (bypassCache?: boolean) => Promise<void>;
};

const RefreshContext = createContext<AgentOpsRuntimeRefreshContextValue | null>(null);
const ConnectionContext = createContext<AgentOpsRuntimeConnectionContextValue | null>(null);

function useSharedConnectionState(): AgentOpsRuntimeConnectionContextValue {
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

type AgentOpsRuntimeRefreshProviderProps = {
  children: ReactNode;
};

export function AgentOpsRuntimeRefreshProvider({ children }: AgentOpsRuntimeRefreshProviderProps) {
  useEffect(() => startAgentOpsRuntimeGlobalPolling(), []);

  const connection = useSharedConnectionState();

  const refreshAll = useCallback(() => {
    triggerAgentOpsRuntimeRefresh();
  }, []);

  const refreshValue = useMemo<AgentOpsRuntimeRefreshContextValue>(
    () => ({
      refreshAll,
      autoRefreshEnabled: isAgentOpsRuntimeAutoRefreshEnabled(),
    }),
    [refreshAll],
  );

  return (
    <RefreshContext.Provider value={refreshValue}>
      <ConnectionContext.Provider value={connection}>{children}</ConnectionContext.Provider>
    </RefreshContext.Provider>
  );
}

export function useAgentOpsRuntimeRefreshController(): AgentOpsRuntimeRefreshContextValue {
  const context = useContext(RefreshContext);
  if (!context) {
    throw new Error(
      "useAgentOpsRuntimeRefreshController must be used within AgentOpsRuntimeRefreshProvider",
    );
  }
  return context;
}

export function useAgentOpsRuntimeConnectionContext(): AgentOpsRuntimeConnectionContextValue {
  const context = useContext(ConnectionContext);
  if (!context) {
    throw new Error(
      "useAgentOpsRuntimeConnectionContext must be used within AgentOpsRuntimeRefreshProvider",
    );
  }
  return context;
}
