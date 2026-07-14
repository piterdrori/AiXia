/**
 * Display-only reporting-agent identity normalization for Findings UX.
 * Does not mutate stored finding records.
 */

import { CANONICAL_AGENTS } from "@/lib/agentops/canonicalAgents";

export type ReportingAgentKind = "canonical" | "alias" | "external";

export type NormalizedReportingAgent = {
  /** Canonical agent id when chat may bind to a runtime agent; null for external. */
  canonicalId: string | null;
  /** Owner-facing display name. */
  displayName: string;
  /** Original slug/label as stored. */
  originalLabel: string;
  kind: ReportingAgentKind;
  /** True when Finding Chat may use this identity as the reporting agent runtime id. */
  canChat: boolean;
  /** Short explanation for UI / docs. */
  note: string;
};

/**
 * Known non-canonical labels → deterministic canonical id.
 * Only include aliases that are unambiguous role mappings.
 */
export const REPORTING_AGENT_ALIAS_MAP: Readonly<Record<string, string>> = {
  "static-guardrail-import": "qa-agent",
  "aixia.static-guardrail-import": "qa-agent",
  "@aixia.static-guardrail-import": "qa-agent",
  "browser-qa": "qa-agent",
  "browser-qa-agent": "qa-agent",
  "aixia.browser-qa": "qa-agent",
  "@aixia.browser-qa": "qa-agent",
  "guardrail-import": "qa-agent",
  "static-import": "qa-agent",
  "monitoring-import": "issue-agent",
  "aixia.monitoring-import": "issue-agent",
  "@aixia.monitoring-import": "issue-agent",
};

function stripAtPrefix(value: string): string {
  return value.replace(/^@+/, "").trim();
}

function stripAixiaPrefix(value: string): string {
  return value.replace(/^aixia\./i, "").trim();
}

function lookupCanonicalId(raw: string): string | null {
  const key = raw.trim().toLowerCase();
  if (!key) return null;
  const match = CANONICAL_AGENTS.find(
    (agent) =>
      agent.id === key ||
      key.endsWith(`.${agent.id}`) ||
      key === agent.name.toLowerCase().replace(/\s+/g, "-") ||
      key === `@aixia.${agent.id}` ||
      key === `aixia.${agent.id}` ||
      key === `@${agent.id}`,
  );
  return match?.id ?? null;
}

function resolveAlias(raw: string): string | null {
  const key = raw.trim().toLowerCase();
  if (!key) return null;
  if (REPORTING_AGENT_ALIAS_MAP[key]) return REPORTING_AGENT_ALIAS_MAP[key];
  const noAt = stripAtPrefix(key);
  if (REPORTING_AGENT_ALIAS_MAP[noAt]) return REPORTING_AGENT_ALIAS_MAP[noAt];
  const noAixia = stripAixiaPrefix(noAt);
  if (REPORTING_AGENT_ALIAS_MAP[noAixia]) return REPORTING_AGENT_ALIAS_MAP[noAixia];
  if (REPORTING_AGENT_ALIAS_MAP[`aixia.${noAixia}`]) return REPORTING_AGENT_ALIAS_MAP[`aixia.${noAixia}`];
  if (REPORTING_AGENT_ALIAS_MAP[`@aixia.${noAixia}`]) {
    return REPORTING_AGENT_ALIAS_MAP[`@aixia.${noAixia}`];
  }
  return null;
}

/**
 * Normalize a stored reporting-agent slug for display and Finding Chat binding.
 * Never invents a canonical agent for unknown reporters.
 */
export function normalizeReportingAgent(
  raw: string | null | undefined,
): NormalizedReportingAgent {
  const originalLabel = (raw ?? "").trim() || "Unknown reporter";
  if (!(raw ?? "").trim()) {
    return {
      canonicalId: null,
      displayName: "External / imported reporter",
      originalLabel,
      kind: "external",
      canChat: false,
      note: "No reporting agent was recorded on this finding.",
    };
  }

  const exact = lookupCanonicalId(originalLabel);
  if (exact) {
    const name = CANONICAL_AGENTS.find((agent) => agent.id === exact)?.name ?? exact;
    return {
      canonicalId: exact,
      displayName: name,
      originalLabel,
      kind: "canonical",
      canChat: true,
      note: "Matched a canonical AgentOps agent.",
    };
  }

  const alias = resolveAlias(originalLabel);
  if (alias && CANONICAL_AGENTS.some((agent) => agent.id === alias)) {
    const name = CANONICAL_AGENTS.find((agent) => agent.id === alias)?.name ?? alias;
    return {
      canonicalId: alias,
      displayName: name,
      originalLabel,
      kind: "alias",
      canChat: true,
      note: `Mapped from known import alias (${originalLabel}) → ${alias}.`,
    };
  }

  return {
    canonicalId: null,
    displayName: "External / imported reporter",
    originalLabel,
    kind: "external",
    canChat: false,
    note: "Unknown reporter — not attributed to a canonical agent. Finding Chat disabled.",
  };
}
