/**
 * React hook — reads runtime mirror data from Supabase via the shared refresh controller.
 * No per-component polling; subscribe to AgentOpsRuntimeRefreshController only.
 */

import { useCallback, useEffect, useRef, useState } from "react";

import type { AgentOpsRuntimeMirrorResult } from "./agentOpsRuntimeMirrorClient";
import { subscribeAgentOpsRuntimeRefresh } from "./agentOpsRuntimeRefreshController";

type MirrorRefreshOptions = {
  showLoading?: boolean;
};

export function useAgentOpsRuntimeMirror<T>(
  fetcher: () => Promise<AgentOpsRuntimeMirrorResult<T>>,
) {
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);

  const refresh = useCallback(async (options: MirrorRefreshOptions = {}) => {
    const showLoading = options.showLoading ?? false;
    if (showLoading) setLoading(true);

    const result = await fetcherRef.current();

    if (!mountedRef.current) return;

    if (result.error) {
      setError(result.error);
      setData(null);
    } else {
      setError(null);
      setData(result.data);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    void refresh({ showLoading: true });

    const unsubscribe = subscribeAgentOpsRuntimeRefresh(() => {
      void refresh({ showLoading: false });
    });

    return () => {
      mountedRef.current = false;
      unsubscribe();
    };
  }, [fetcher, refresh]);

  return {
    data,
    error,
    loading,
    refresh: () => refresh({ showLoading: true }),
  };
}
