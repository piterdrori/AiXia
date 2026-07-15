/**
 * Pure canonical identity helpers (no Supabase / Vite side effects).
 * Async resolution lives in agentRuntimeIdentity.ts.
 */

import { CANONICAL_AGENTS } from "@/lib/agentops/canonicalAgents";
import type { AgentOpsAgentStatus } from "@/lib/agentops/db/agentOpsRuntimeTypes";
import type { AgentOpsManagedAgentStatus } from "@/lib/agentops/types";

export type OwnerFacingAgentStatus =
  | "Active"
  | "Paused"
  | "Blocked"
  | "Error"
  | "Unknown";

export type OwnerStatusSource =
  | "owner_feedback"
  | "runtime_agent"
  | "canonical_default"
  | "none";

const OWNER_FEEDBACK_STATUSES = new Set([
  "active",
  "quiet",
  "needs_memory",
  "blocked",
  "disabled",
]);

export function resolveCanonicalSlugFromRoute(routeParam: string): string | null {
  const key = routeParam.trim().toLowerCase();
  if (!key) return null;
  const match = CANONICAL_AGENTS.find(
    (agent) =>
      agent.id === key ||
      agent.name.toLowerCase().replace(/\s+/g, "-") === key ||
      agent.name.toLowerCase() === key,
  );
  return match?.id ?? null;
}

export function mapFeedbackStatusToOwnerFacing(
  raw: string | null | undefined,
): OwnerFacingAgentStatus {
  if (!raw) return "Unknown";
  const value = raw.trim().toLowerCase();
  if (value === "blocked") return "Blocked";
  if (value === "quiet" || value === "disabled" || value === "paused") return "Paused";
  if (value === "active") return "Active";
  if (value === "error" || value === "failed") return "Error";
  if (value === "needs_memory") return "Active";
  return "Unknown";
}

export function mapRuntimeStatusToOwnerFacing(
  status: AgentOpsAgentStatus | null | undefined,
): OwnerFacingAgentStatus {
  if (!status) return "Unknown";
  if (status === "blocked") return "Blocked";
  if (status === "paused") return "Paused";
  if (status === "active") return "Active";
  return "Unknown";
}

export function ownerFacingToWriteStatus(
  facing: OwnerFacingAgentStatus,
): AgentOpsManagedAgentStatus | null {
  if (facing === "Active") return "active";
  if (facing === "Paused") return "quiet";
  if (facing === "Blocked") return "blocked";
  return null;
}

export function formatDurationMs(durationMs: number | null | undefined): string {
  if (durationMs == null || !Number.isFinite(durationMs) || durationMs < 0) {
    return "Not recorded";
  }
  const totalSeconds = Math.round(durationMs / 1000);
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes < 60) {
    return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const remMinutes = minutes % 60;
  return remMinutes > 0 ? `${hours}h ${remMinutes}m` : `${hours}h`;
}

export function resolveOwnerFacingStatus(input: {
  feedbackRaw: string | null;
  runtimeStatus: AgentOpsAgentStatus | null;
  canonicalDefault?: OwnerFacingAgentStatus | null;
}): {
  status: OwnerFacingAgentStatus;
  writeValue: AgentOpsManagedAgentStatus | null;
  source: OwnerStatusSource;
} {
  if (input.feedbackRaw && OWNER_FEEDBACK_STATUSES.has(input.feedbackRaw.trim().toLowerCase())) {
    const status = mapFeedbackStatusToOwnerFacing(input.feedbackRaw);
    const write = input.feedbackRaw.trim().toLowerCase() as AgentOpsManagedAgentStatus;
    return {
      status,
      writeValue:
        write === "active" ||
        write === "quiet" ||
        write === "needs_memory" ||
        write === "blocked" ||
        write === "disabled"
          ? write
          : ownerFacingToWriteStatus(status),
      source: "owner_feedback",
    };
  }

  if (input.runtimeStatus) {
    const status = mapRuntimeStatusToOwnerFacing(input.runtimeStatus);
    return {
      status,
      writeValue: ownerFacingToWriteStatus(status),
      source: "runtime_agent",
    };
  }

  if (input.canonicalDefault) {
    return {
      status: input.canonicalDefault,
      writeValue: ownerFacingToWriteStatus(input.canonicalDefault),
      source: "canonical_default",
    };
  }

  return { status: "Unknown", writeValue: null, source: "none" };
}

export function isSyntheticPersonaAgentId(agentId: string | null | undefined): boolean {
  if (!agentId) return false;
  const value = agentId.trim().toLowerCase();
  if (!value) return false;
  if (value.startsWith("agentops-") || value.includes("qa-user") || value.includes("synthetic")) {
    return true;
  }
  if (CANONICAL_AGENTS.some((agent) => agent.id === value)) return false;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    return false;
  }
  return true;
}

export { OWNER_FEEDBACK_STATUSES };
