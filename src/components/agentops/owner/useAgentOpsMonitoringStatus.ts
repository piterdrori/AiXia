import { useCallback, useEffect, useRef, useState } from "react";

import { FetchTimeoutError } from "@/lib/fetchWithTimeout";
import {
  fetchAgentOpsMonitoringStatus,
  type Daily12ReviewStatus,
  type DailyRosterRow,
  type MonitoringStatusPayload,
} from "@/lib/agentops/monitoring/agentOpsMonitoringStatusClient";

export type { Daily12ReviewStatus, DailyRosterRow, MonitoringStatusPayload };

export function useAgentOpsMonitoringStatus(enabled = true) {
  const [status, setStatus] = useState<MonitoringStatusPayload | null>(null);
  const [daily12, setDaily12] = useState<Daily12ReviewStatus | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const aliveRef = useRef(true);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  const refresh = useCallback(
    async (options?: { forceRefresh?: boolean }) => {
      if (!enabled) return;
      setLoading(true);
      setError(null);
      try {
        const payload = await fetchAgentOpsMonitoringStatus({
          forceRefresh: options?.forceRefresh ?? false,
        });
        if (!aliveRef.current) return;
        setStatus(payload.status ?? null);
        setDaily12(payload.status?.daily12ReviewStatus ?? null);
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
        setStatus(null);
        setDaily12(null);
      } finally {
        if (aliveRef.current) {
          setLoading(false);
        }
      }
    },
    [enabled],
  );

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    void refresh({ forceRefresh: false });
  }, [enabled, refresh]);

  const forceRefresh = useCallback(() => refresh({ forceRefresh: true }), [refresh]);

  return { status, daily12, loading, error, refresh: forceRefresh };
}
