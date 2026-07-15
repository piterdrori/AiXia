/**
 * Fix B — owner Detail client for manual website audit / Browser QA.
 * Playwright executes on GitHub Actions; this client only accept/status/capability.
 */

import { supabase } from "@/lib/supabase";
import {
  AGENT_MANUAL_RUN_COPY,
  DEFAULT_MANUAL_MAX_DURATION_MINUTES,
  type AgentManualRunRequest,
  type AgentManualRunResult,
  type AgentManualWorkType,
} from "@/lib/agentops/agents/agentManualRunContract";

export const MANUAL_RUN_CAPABILITY_URL = "/api/agentops/monitoring/manual-run/capability";
export const MANUAL_RUN_URL = "/api/agentops/monitoring/manual-run";

export type ManualRunCapability = {
  websiteAudit: { available: boolean; reason: string | null; engine: string };
  browserQa: { available: boolean; reason: string | null; engine: string };
  notes: string[];
};

async function authHeaders(): Promise<HeadersInit> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) {
    throw new Error("You must be signed in as AgentOps Owner.");
  }
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

export async function fetchManualRunCapability(): Promise<{
  ok: boolean;
  capability: ManualRunCapability | null;
  error: string | null;
}> {
  try {
    const response = await fetch(MANUAL_RUN_CAPABILITY_URL, {
      method: "GET",
      headers: { Accept: "application/json" },
    });
    const payload = (await response.json()) as {
      ok?: boolean;
      capability?: ManualRunCapability;
      error?: string;
    };
    if (!response.ok || payload.ok === false) {
      return {
        ok: false,
        capability: null,
        error: payload.error ?? "Manual run capability unavailable.",
      };
    }
    return { ok: true, capability: payload.capability ?? null, error: null };
  } catch (error) {
    return {
      ok: false,
      capability: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function startOwnerManualRun(
  input: Omit<AgentManualRunRequest, "requestedBy"> & { requestedBy?: string },
): Promise<AgentManualRunResult> {
  const headers = await authHeaders();
  const body: AgentManualRunRequest = {
    agentSlug: input.agentSlug,
    workType: input.workType,
    scope: input.scope,
    maxDurationMinutes: input.maxDurationMinutes || DEFAULT_MANUAL_MAX_DURATION_MINUTES,
    avoidOverlap: input.avoidOverlap !== false,
    requestedBy: input.requestedBy ?? "owner",
    ownerFacingPaused: input.ownerFacingPaused,
    runOnceWhilePaused: input.runOnceWhilePaused,
    activateAndRun: input.activateAndRun,
  };

  const response = await fetch(MANUAL_RUN_URL, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  const payload = (await response.json()) as AgentManualRunResult & {
    ok?: boolean;
    agentPaused?: boolean;
  };

  return {
    accepted: Boolean(payload.accepted),
    runId: payload.runId,
    status: payload.status ?? "rejected",
    message: payload.message || AGENT_MANUAL_RUN_COPY.ghaUnavailable,
    startedAt: payload.startedAt,
    completedAt: payload.completedAt,
    evidenceAvailable: payload.evidenceAvailable,
    githubRunId: payload.githubRunId,
    githubRunUrl: payload.githubRunUrl,
    workType: payload.workType ?? input.workType,
    agentSlug: payload.agentSlug ?? input.agentSlug,
    durationMs: payload.durationMs,
    routesChecked: payload.routesChecked,
    rawObservations: payload.rawObservations,
    queuedFindings: payload.queuedFindings,
    existingRunId: payload.existingRunId,
  };
}

export async function fetchManualRunStatus(input: {
  runId?: string;
  agentSlug?: string;
}): Promise<{
  ok: boolean;
  active: boolean;
  result: AgentManualRunResult | null;
  error: string | null;
}> {
  try {
    const headers = await authHeaders();
    const params = new URLSearchParams();
    if (input.runId) params.set("runId", input.runId);
    if (input.agentSlug) params.set("agentSlug", input.agentSlug);
    const response = await fetch(`${MANUAL_RUN_URL}?${params.toString()}`, {
      method: "GET",
      headers,
    });
    const payload = (await response.json()) as {
      ok?: boolean;
      active?: boolean;
      result?: AgentManualRunResult | null;
      error?: string;
    };
    if (!response.ok || payload.ok === false) {
      return {
        ok: false,
        active: false,
        result: null,
        error: payload.error ?? "Could not load manual run status.",
      };
    }
    return {
      ok: true,
      active: Boolean(payload.active),
      result: payload.result ?? null,
      error: null,
    };
  } catch (error) {
    return {
      ok: false,
      active: false,
      result: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export function activityLabelForManualRun(
  status: string | null | undefined,
  workType: AgentManualWorkType | null | undefined,
): "Preparing" | "Auditing" | "Running Browser QA" | "Processing evidence" | "Completed" | "Failed" | "Idle" {
  const s = (status ?? "").toLowerCase();
  if (s === "queued") return "Preparing";
  if (s === "running") {
    return workType === "browser_qa" ? "Running Browser QA" : "Auditing";
  }
  if (s === "completed") return "Completed";
  if (s === "failed" || s === "rejected") return "Failed";
  return "Idle";
}

export function defaultScopeForWorkType(workType: AgentManualWorkType): AgentManualRunRequest["scope"] {
  if (workType === "browser_qa") {
    return { type: "selected_routes", routes: ["/system/agent-ops"] };
  }
  return { type: "assigned_modules" };
}

export function formatManualRunResultBanner(result: AgentManualRunResult): string {
  const parts = [
    result.status === "completed" ? "Completed" : result.status === "failed" ? "Failed" : result.status,
    result.durationMs != null ? `${Math.round(result.durationMs / 1000)}s` : null,
    result.routesChecked && result.routesChecked.length > 0
      ? `${result.routesChecked.length} route(s)`
      : null,
    result.rawObservations != null ? `${result.rawObservations} raw observation(s)` : null,
    result.queuedFindings != null
      ? result.queuedFindings > 0
        ? `${result.queuedFindings} queued finding(s)`
        : AGENT_MANUAL_RUN_COPY.zeroFindings
      : null,
    result.evidenceAvailable ? "Evidence available" : null,
  ].filter(Boolean);
  return parts.join(" · ");
}
