/**
 * Tab-local GET /api/agentops/monitoring/status client.
 * Single-flight + short success cache to stop StrictMode dual abort races.
 */

import { FetchTimeoutError } from "@/lib/fetchWithTimeout";

export const AGENTOPS_MONITORING_STATUS_URL = "/api/agentops/monitoring/status";
export const AGENTOPS_MONITORING_STATUS_TIMEOUT_MS = 45_000;
/** Tab-local success cache — short enough to avoid stale Team status. */
export const AGENTOPS_MONITORING_STATUS_CACHE_TTL_MS = 8_000;

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
  [key: string]: unknown;
};

export type AgentOpsMonitoringStatusResponse = {
  ok?: boolean;
  error?: string;
  status?: MonitoringStatusPayload;
  /** Extra API fields allowed without parser rejection. */
  [key: string]: unknown;
};

export type FetchAgentOpsMonitoringStatusOptions = {
  /** Bypass short success cache (Retry / Refresh). */
  forceRefresh?: boolean;
  /** Override timeout (tests). */
  timeoutMs?: number;
  /** Override fetch (tests). */
  fetchImpl?: typeof fetch;
};

type SuccessCache = {
  expiresAt: number;
  value: AgentOpsMonitoringStatusResponse;
};

let inFlightMonitoringStatusRequest: Promise<AgentOpsMonitoringStatusResponse> | null = null;
let successCache: SuccessCache | null = null;

function isValidatedSuccess(payload: AgentOpsMonitoringStatusResponse): boolean {
  if (payload.ok !== true) return false;
  if (!payload.status || typeof payload.status !== "object") return false;
  const daily = payload.status.daily12ReviewStatus;
  if (!daily || typeof daily !== "object") return false;
  if (typeof daily.registeredAgents !== "number") return false;
  return true;
}

async function fetchWithDedicatedTimeout(
  timeoutMs: number,
  fetchImpl: typeof fetch,
): Promise<Response> {
  const controller = new AbortController();
  const timer = globalThis.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetchImpl(AGENTOPS_MONITORING_STATUS_URL, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
  } catch (error) {
    if (
      (error instanceof DOMException && error.name === "AbortError") ||
      (error instanceof Error && error.name === "AbortError")
    ) {
      throw new FetchTimeoutError(timeoutMs);
    }
    throw error;
  } finally {
    globalThis.clearTimeout(timer);
  }
}

async function performMonitoringStatusRequest(
  options: FetchAgentOpsMonitoringStatusOptions,
): Promise<AgentOpsMonitoringStatusResponse> {
  const timeoutMs = options.timeoutMs ?? AGENTOPS_MONITORING_STATUS_TIMEOUT_MS;
  const fetchImpl = options.fetchImpl ?? fetch;

  const response = await fetchWithDedicatedTimeout(timeoutMs, fetchImpl);
  let payload: AgentOpsMonitoringStatusResponse;
  try {
    payload = (await response.json()) as AgentOpsMonitoringStatusResponse;
  } catch {
    throw new Error("Monitoring status returned invalid JSON.");
  }

  if (!response.ok || payload.ok === false) {
    throw new Error(
      payload.error ??
        (typeof payload.status?.dailyStatusError === "string"
          ? payload.status.dailyStatusError
          : null) ??
        (typeof payload.status?.configError === "string" ? payload.status.configError : null) ??
        "Could not load monitoring status.",
    );
  }

  if (!payload.status || typeof payload.status !== "object") {
    throw new Error("Monitoring status payload missing status object.");
  }

  return payload;
}

/**
 * Shared monitoring status fetch — one in-flight request per tab.
 * Not aborted by React consumer unmount.
 */
export async function fetchAgentOpsMonitoringStatus(
  options: FetchAgentOpsMonitoringStatusOptions = {},
): Promise<AgentOpsMonitoringStatusResponse> {
  const forceRefresh = Boolean(options.forceRefresh);
  const now = Date.now();

  if (forceRefresh) {
    successCache = null;
  }

  if (
    !forceRefresh &&
    successCache &&
    successCache.expiresAt > now &&
    isValidatedSuccess(successCache.value)
  ) {
    return successCache.value;
  }

  // Join any in-flight request (StrictMode double mount / multi-consumer).
  // forceRefresh also joins rather than storming parallel heavy GETs;
  // callers that need a new attempt after failure find inFlight cleared.
  if (inFlightMonitoringStatusRequest) {
    return inFlightMonitoringStatusRequest;
  }

  const request = performMonitoringStatusRequest(options)
    .then((payload) => {
      if (isValidatedSuccess(payload)) {
        successCache = {
          expiresAt: Date.now() + AGENTOPS_MONITORING_STATUS_CACHE_TTL_MS,
          value: payload,
        };
      } else {
        successCache = null;
      }
      return payload;
    })
    .catch((error) => {
      successCache = null;
      throw error;
    })
    .finally(() => {
      if (inFlightMonitoringStatusRequest === request) {
        inFlightMonitoringStatusRequest = null;
      }
    });

  inFlightMonitoringStatusRequest = request;
  return request;
}

/** @internal Clears tab-local in-flight + cache (unit verify only). */
export function resetAgentOpsMonitoringStatusClientForTests(): void {
  inFlightMonitoringStatusRequest = null;
  successCache = null;
}

/** @internal Peek in-flight for verify scripts. */
export function peekAgentOpsMonitoringStatusInFlightForTests(): boolean {
  return inFlightMonitoringStatusRequest != null;
}
