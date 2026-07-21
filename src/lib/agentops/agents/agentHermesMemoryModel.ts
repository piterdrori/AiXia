/**
 * Phase D-F1 — pure per-agent Hermes memory helpers (no Supabase / Vite raw imports).
 */

import type { AgentOpsManagedAgentMemoryItem } from "@/lib/agentops/types";

export const AGENT_HERMES_CONNECTION_VERSION = "d-f1";

export type AgentHermesConnectionStatus =
  | "connected"
  | "not_configured"
  | "error"
  | "disabled";

export function buildAgentHermesNamespace(agentSlug: string): string {
  const slug = agentSlug.trim().toLowerCase();
  return `agentops.agent.${slug}`;
}

export function isApprovedActiveAgentMemory(item: AgentOpsManagedAgentMemoryItem): boolean {
  if (!item.active) return false;
  if (item.approvalStatus === "pending_approval") return false;
  if (item.approvalStatus === "rejected") return false;
  if (item.approvalStatus === "disabled") return false;
  if (item.approvalStatus === "archived") return false;
  return item.approvalStatus === "active" || item.approvalStatus == null;
}

export function isPendingMemoryImprovement(item: AgentOpsManagedAgentMemoryItem): boolean {
  return item.approvalStatus === "pending_approval";
}

/** Prompt/chat/worker context — approved active only; never pending or diagnostics. */
export function selectApprovedAgentMemoryForPrompt(
  items: AgentOpsManagedAgentMemoryItem[],
  limit = 8,
): string[] {
  return items
    .filter(isApprovedActiveAgentMemory)
    .map((item) => item.memoryText.trim())
    .filter(Boolean)
    .slice(0, limit);
}

export function resolveConnectionStatusFromRetrieval(input: {
  recordExists: boolean;
  retrievalOk: boolean;
  retrievalError?: string | null;
  disabled?: boolean;
}): AgentHermesConnectionStatus {
  if (input.disabled) return "disabled";
  if (!input.recordExists) return "not_configured";
  if (!input.retrievalOk || input.retrievalError) return "error";
  return "connected";
}
