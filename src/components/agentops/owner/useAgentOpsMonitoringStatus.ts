import { useCallback, useEffect, useState } from "react";

import { FetchTimeoutError, fetchWithTimeout } from "@/lib/fetchWithTimeout";

const MONITORING_STATUS_TIMEOUT_MS = 18_000;

export type DailyRosterRow = {
  agentSlug: string;
  displayName: string;
  username: string;
  jobTitle: string;
  agentStatus: string;
  lastDailyRunAt: string | null;
  todayStatus: string;
  todayResult: string;
  errorsFound: number;
  improvementsFound: number;
  featuresFound: number;
  draftsQueued?: number;
  noFindings: boolean;
};

export type Daily12ReviewStatus = {
  schedule: string;
  environment: string;
  modeLabel: string;
  registeredAgents: number;
  expectedAgents: number;
  executionDate: string;
  agentsAttemptedToday: number;
  agentsCompletedToday: number;
  agentsFailedToday: number;
  agentsBlockedToday: number;
  agentsMissingToday: string[];
  lastCompletedDailyReviewAt: string | null;
  nextExpectedDailyReviewAt: string | null;
  latestDailyRunId: string | null;
  latestRunStatus: string | null;
  persistenceComplete?: boolean;
  errorsFoundToday: number;
  improvementsSuggestedToday: number;
  newFeaturesSuggestedToday: number;
  candidatesDetectedToday: number;
  draftsQueuedToday: number;
  candidatesNotQueuedToday: number;
  duplicatesConsolidatedToday: number;
  noFindingsAgentsToday: number;
  healthWarnings: string[];
  roster: DailyRosterRow[];
  githubWorkflowUrl: string;
};

export type MonitoringStatusPayload = {
  daily12ReviewStatus?: Daily12ReviewStatus;
  dailyStatusError?: string | null;
  configError?: string | null;
  operationalScanStatus?: {
    lastRunAt?: string | null;
    nextRunAt?: string | null;
    status?: string | null;
  };
  weeklyReviewStatus?: {
    lastRunAt?: string | null;
    nextRunAt?: string | null;
    status?: string | null;
  };
};

export function useAgentOpsMonitoringStatus(enabled = true) {
  const [status, setStatus] = useState<MonitoringStatusPayload | null>(null);
  const [daily12, setDaily12] = useState<Daily12ReviewStatus | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetchWithTimeout("/api/agentops/monitoring/status", {
        timeoutMs: MONITORING_STATUS_TIMEOUT_MS,
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        error?: string;
        status?: MonitoringStatusPayload;
      };
      if (!response.ok || payload.ok === false) {
        throw new Error(
          payload.error ??
            payload.status?.dailyStatusError ??
            payload.status?.configError ??
            "Could not load monitoring status.",
        );
      }
      setStatus(payload.status ?? null);
      setDaily12(payload.status?.daily12ReviewStatus ?? null);
      if (payload.status?.dailyStatusError) {
        setError(payload.status.dailyStatusError);
      }
    } catch (loadError) {
      if (loadError instanceof FetchTimeoutError) {
        setError("Monitoring status timed out. Try refresh.");
      } else {
        setError(loadError instanceof Error ? loadError.message : String(loadError));
      }
      setStatus(null);
      setDaily12(null);
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { status, daily12, loading, error, refresh };
}
