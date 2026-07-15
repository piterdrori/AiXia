/**
 * Canonical Agent Detail identity resolver (Fix A).
 *
 * Mapping assumptions (documented for owners / future agents):
 * 1. Route slug matches CANONICAL_AGENTS.id (e.g. `system-agent`).
 * 2. Runtime row is `agentops_agents` matched via mergeAgentsWithDB / canonical tool tag
 *    — never synthetic-browser-users qaUserId personas.
 * 3. Living memory (`agentops_memory`) is keyed by runtime UUID (`agentops_agents.id`).
 * 4. Owner feedback (`agent_status_update`) and chat room ids use the canonical slug.
 * 5. Monitoring / daily executions are keyed by canonical slug (`agent_slug`).
 * 6. If a runtime row is missing: leave runtimeAgentId null and show Unknown —
 *    do not fall back to unrelated synthetic personas.
 */

import { supabase } from "@/lib/supabase";
import { CANONICAL_AGENTS } from "@/lib/agentops/canonicalAgents";
import {
  fetchAgentByRouteParam,
  fetchAgentScopedMemory,
} from "@/app/system/agent-ops/agents/agentIntelligenceClient";
import type { AgentOpsRuntimeAgentRow } from "@/lib/agentops/db/agentOpsRuntimeTypes";
import {
  AGENTOPS_RUNTIME_ENVIRONMENT,
  AGENTOPS_RUNTIME_TABLES,
} from "@/lib/agentops/db/agentOpsRuntimeTypes";
import { getAgentOwnerMeta } from "@/components/agentops/owner/agentDisplayMeta";
import {
  mapFeedbackStatusToOwnerFacing,
  OWNER_FEEDBACK_STATUSES,
  resolveCanonicalSlugFromRoute,
  resolveOwnerFacingStatus,
  type OwnerFacingAgentStatus,
  type OwnerStatusSource,
} from "@/lib/agentops/agents/agentRuntimeIdentityModel";
import type { AgentOpsManagedAgentStatus } from "@/lib/agentops/types";

export type {
  OwnerFacingAgentStatus,
  OwnerStatusSource,
} from "@/lib/agentops/agents/agentRuntimeIdentityModel";

export {
  formatDurationMs,
  isSyntheticPersonaAgentId,
  mapFeedbackStatusToOwnerFacing,
  mapRuntimeStatusToOwnerFacing,
  ownerFacingToWriteStatus,
  resolveCanonicalSlugFromRoute,
  resolveOwnerFacingStatus,
} from "@/lib/agentops/agents/agentRuntimeIdentityModel";

export type AgentRuntimeIdentity = {
  canonicalSlug: string;
  canonicalName: string;
  username: string;
  runtimeAgentId: string | null;
  runtimeAgentRecord: AgentOpsRuntimeAgentRow | null;
  latestOwnerStatus: OwnerFacingAgentStatus;
  ownerStatusWriteValue: AgentOpsManagedAgentStatus | null;
  ownerStatusSource: OwnerStatusSource;
  memoryAgentId: string | null;
  monitoringAgentId: string;
  identityError: string | null;
};

export type RuntimeMemoryCounts = {
  assigned: number;
  approved: number;
  pending: number;
  globalAvailable: number | null;
  error: string | null;
};

export type LatestDailyExecutionSummary = {
  id: string;
  status: string;
  startedAt: string | null;
  completedAt: string | null;
  durationMs: number | null;
  failureReason: string | null;
  error: string | null;
};

export async function fetchLatestOwnerStatusFeedback(
  canonicalSlug: string,
): Promise<{ raw: string | null; error: string | null }> {
  const slug = canonicalSlug.trim();
  if (!slug) return { raw: null, error: "Missing canonical slug." };

  const { data, error } = await supabase
    .from("agentops_owner_feedback")
    .select("id, remark, metadata, created_at")
    .contains("metadata", { action: "agent_status_update" })
    .order("created_at", { ascending: false })
    .limit(400);

  if (error) return { raw: null, error: error.message };

  for (const row of data ?? []) {
    const metadata =
      row.metadata && typeof row.metadata === "object"
        ? (row.metadata as Record<string, unknown>)
        : null;
    const agentId = typeof metadata?.agentId === "string" ? metadata.agentId.trim() : "";
    if (!agentId) continue;
    if (
      agentId !== slug &&
      agentId.toLowerCase() !== slug.toLowerCase() &&
      !agentId.toLowerCase().endsWith(`.${slug}`)
    ) {
      continue;
    }
    const rawStatus = metadata?.status ?? metadata?.agentStatus;
    if (typeof rawStatus === "string" && OWNER_FEEDBACK_STATUSES.has(rawStatus.trim().toLowerCase())) {
      return { raw: rawStatus.trim().toLowerCase(), error: null };
    }
  }

  return { raw: null, error: null };
}

export async function resolveAgentRuntimeIdentity(
  routeParam: string,
): Promise<AgentRuntimeIdentity> {
  const canonicalSlug = resolveCanonicalSlugFromRoute(routeParam);
  if (!canonicalSlug) {
    return {
      canonicalSlug: routeParam.trim().toLowerCase(),
      canonicalName: routeParam.trim() || "Unknown agent",
      username: "@aixia.unknown",
      runtimeAgentId: null,
      runtimeAgentRecord: null,
      latestOwnerStatus: "Unknown",
      ownerStatusWriteValue: null,
      ownerStatusSource: "none",
      memoryAgentId: null,
      monitoringAgentId: routeParam.trim().toLowerCase(),
      identityError: `Unknown agent route "${routeParam}".`,
    };
  }

  const canonical = CANONICAL_AGENTS.find((agent) => agent.id === canonicalSlug)!;
  const meta = getAgentOwnerMeta(canonicalSlug);
  const routeResult = await fetchAgentByRouteParam(canonicalSlug);
  const runtimeAgentRecord = routeResult.data;
  const runtimeAgentId = runtimeAgentRecord?.id ?? routeResult.dbAgentId ?? null;

  const feedback = await fetchLatestOwnerStatusFeedback(canonicalSlug);
  const resolved = resolveOwnerFacingStatus({
    feedbackRaw: feedback.raw,
    runtimeStatus: runtimeAgentRecord?.status ?? null,
    canonicalDefault: null,
  });

  return {
    canonicalSlug,
    canonicalName: canonical.name,
    username: meta.username,
    runtimeAgentId,
    runtimeAgentRecord,
    latestOwnerStatus: resolved.status,
    ownerStatusWriteValue: resolved.writeValue,
    ownerStatusSource: resolved.source,
    memoryAgentId: runtimeAgentId,
    monitoringAgentId: canonicalSlug,
    identityError:
      feedback.error ??
      (runtimeAgentId ? null : routeResult.error ?? "Runtime agent row missing."),
  };
}

export async function fetchRuntimeMemoryCounts(
  runtimeAgentId: string | null,
): Promise<RuntimeMemoryCounts> {
  if (!runtimeAgentId) {
    return {
      assigned: 0,
      approved: 0,
      pending: 0,
      globalAvailable: null,
      error: "Agent runtime identity missing",
    };
  }

  const [agentScoped, globalScoped] = await Promise.all([
    fetchAgentScopedMemory(runtimeAgentId, 500),
    supabase
      .from(AGENTOPS_RUNTIME_TABLES.memory)
      .select("id", { count: "exact", head: true })
      .eq("environment", AGENTOPS_RUNTIME_ENVIRONMENT)
      .eq("scope", "global")
      .eq("approved", true),
  ]);

  if (agentScoped.error) {
    return {
      assigned: 0,
      approved: 0,
      pending: 0,
      globalAvailable: null,
      error: agentScoped.error,
    };
  }

  const rows = agentScoped.data ?? [];
  const approved = rows.filter((row) => row.approved).length;
  const pending = rows.filter((row) => !row.approved).length;
  const globalAvailable =
    globalScoped.error != null ? null : (globalScoped.count ?? 0);

  return {
    assigned: rows.length,
    approved,
    pending,
    globalAvailable,
    error: null,
  };
}

export async function fetchLatestDailyExecutionForSlug(
  agentSlug: string,
): Promise<LatestDailyExecutionSummary> {
  const slug = agentSlug.trim();
  if (!slug) {
    return {
      id: "",
      status: "unknown",
      startedAt: null,
      completedAt: null,
      durationMs: null,
      failureReason: null,
      error: "Missing agent slug.",
    };
  }

  const { data, error } = await supabase
    .from("agentops_monitoring_daily_agent_executions")
    .select(
      "id, status, started_at, completed_at, duration_ms, failure_reason, agent_slug, created_at",
    )
    .eq("agent_slug", slug)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return {
      id: "",
      status: "unknown",
      startedAt: null,
      completedAt: null,
      durationMs: null,
      failureReason: null,
      error: error.message,
    };
  }

  if (!data) {
    return {
      id: "",
      status: "not_run",
      startedAt: null,
      completedAt: null,
      durationMs: null,
      failureReason: null,
      error: null,
    };
  }

  return {
    id: String(data.id),
    status: String(data.status ?? "unknown"),
    startedAt: typeof data.started_at === "string" ? data.started_at : null,
    completedAt: typeof data.completed_at === "string" ? data.completed_at : null,
    durationMs:
      typeof data.duration_ms === "number" && Number.isFinite(data.duration_ms)
        ? data.duration_ms
        : null,
    failureReason:
      typeof data.failure_reason === "string" ? data.failure_reason : null,
    error: null,
  };
}

// Keep mapFeedback re-export used by verify for readability.
void mapFeedbackStatusToOwnerFacing;
