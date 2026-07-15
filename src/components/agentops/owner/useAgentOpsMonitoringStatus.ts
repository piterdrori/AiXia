import { useCallback, useEffect, useRef, useState } from "react";

import { FetchTimeoutError } from "@/lib/fetchWithTimeout";
import {
  fetchAgentOpsMonitoringStatus,
  type Daily12ReviewStatus,
  type DailyRosterRow,
  type MonitoringStatusPayload,
} from "@/lib/agentops/monitoring/agentOpsMonitoringStatusClient";

export type { Daily12ReviewStatus, DailyRosterRow, MonitoringStatusPayload };

export type AgentOpsMonitoringRefreshOptions = {
  forceRefresh?: boolean;
};

export function useAgentOpsMonitoringStatus(enabled = true) {
  const [status, setStatus] = useState<MonitoringStatusPayload | null>(null);
  const [daily12, setDaily12] = useState<Daily12ReviewStatus | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const aliveRef = useRef(true);
  const hasDataRef = useRef(false);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  const refresh = useCallback(
    async (options?: AgentOpsMonitoringRefreshOptions) => {
      if (!enabled) return;
      const preserveOnError = hasDataRef.current;
      if (preserveOnError) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      try {
        const payload = await fetchAgentOpsMonitoringStatus({
          forceRefresh: options?.forceRefresh ?? false,
        });
        if (!aliveRef.current) return;
        setStatus(payload.status ?? null);
        setDaily12(payload.status?.daily12ReviewStatus ?? null);
        hasDataRef.current = Boolean(payload.status?.daily12ReviewStatus);
        if (payload.status?.dailyStatusError) {
          setError(payload.status.dailyStatusError);
        }
      } catch (loadError) {
        if (!aliveRef.current) return;
        if (loadError instanceof FetchTimeoutError) {
          setError("Monitoring status timed out. Try refresh.");
        } else {
          setError(loadError instanceof Error ? loadError.message : String(loadError));
        }
        // Keep previous roster/metrics on soft refresh failures.
        if (!preserveOnError) {
          setStatus(null);
          setDaily12(null);
        }
      } finally {
        if (aliveRef.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [enabled],
  );

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      setRefreshing(false);
      return;
    }
    void refresh({ forceRefresh: false });
  }, [enabled, refresh]);

  const forceRefresh = useCallback(() => refresh({ forceRefresh: true }), [refresh]);

  return {
    status,
    daily12,
    loading,
    refreshing,
    error,
    refresh: forceRefresh,
  };
}
