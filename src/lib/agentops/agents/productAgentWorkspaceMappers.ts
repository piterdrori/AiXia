import { getAgentIdentityDefinition } from "./agentIdentityDefinitions";
import { getAgentResponsibilitySummary } from "./productAgentDisplay";
import { AGENT_DETAIL_DISPLAY } from "./agentDetailDisplayCopy";
import type { AgentOpsRuntimeAgentRow } from "@/lib/agentops/db/agentOpsRuntimeTypes";

export type ProductToolTier = "direct" | "infrastructure";

export type ProductToolRow = {
  id: string;
  name: string;
  purpose: string;
  tier: ProductToolTier;
  statusLabel: string;
  detail: string;
};

export type ProductPermissionsModel = {
  role: string;
  ownedDomain: string;
  storedScope: string[];
  canDo: string[];
  cannotDo: string[];
  alwaysForbidden: string[];
};

const INFRASTRUCTURE_TOOL_IDS = new Set(["codegraph", "acdl"]);

/** USL-safe global staging forbidden list — display only, not permission enforcement. */
const STAGING_ALWAYS_FORBIDDEN = [
  "Production deploy",
  "Production database writes",
  "Autonomous execution without owner command",
  "ACDL gate output as product authority on this page",
] as const;

const DIRECT_TOOL_DEFS: Record<
  string,
  { name: string; purpose: string; detect: (tools: string[], actions: Set<string>) => boolean }
> = {
  browser_qa: {
    name: "Browser QA / Playwright",
    purpose: "Staging page scans, console/network evidence, issue promotion",
    detect: (tools, actions) =>
      tools.some((t) => t.includes("browser") || t.includes("qa")) || actions.has("browser_qa"),
  },
  hermes_memory: {
    name: "Hermes Memory",
    purpose: "Persistent rules, recall, and agent-scoped memory",
    detect: (_tools, actions) =>
      actions.has("memory_read") || actions.has("memory_write") || actions.has("memory"),
  },
  issue_promotion: {
    name: "Issue promotion",
    purpose: "Promote QA findings to AgentOps issues",
    detect: (_tools, actions) =>
      actions.has("issue_promotion") ||
      actions.has("issue_classify") ||
      actions.has("issue_read"),
  },
  agent_chat: {
    name: "Agent chat",
    purpose: "Workflow conversation with Hermes / Doubao where wired",
    detect: (_tools, actions) => actions.has("chat"),
  },
};

const INFRASTRUCTURE_TOOL_DEFS: Record<string, { name: string; purpose: string; detail: string }> =
  {
    codegraph: {
      name: "CodeGraph (CGPFL)",
      purpose: "Code structure, callers, and impact analysis",
      detail:
        "Platform support layer — available to AgentOps via Tools/CodeGraph, not a direct tag on this agent row.",
    },
    acdl: {
      name: "ACDL reasoning stack",
      purpose: "Structured reasoning in Browser QA — v10.4 is the sole ALLOW/HOLD/REJECT gate",
      detail:
        "System reasoning layer — runs in Browser QA / Tools pipelines, not as a direct per-agent callable tool.",
    },
  };

function formatStoredAction(action: string): string {
  return action.trim().replace(/_/g, " ");
}

/**
 * Maps stored allowedActions to display lines — one line per stored action, no inference.
 */
export function buildCanDoLines(allowedActions: readonly string[]): string[] {
  const normalized = allowedActions.map((action) => action.trim()).filter(Boolean);
  if (normalized.length === 0) {
    return ["No explicit actions defined (read-only agent)"];
  }
  return normalized.map(formatStoredAction);
}

/**
 * Maps stored forbiddenActions from identity lock — no cross-agent inference.
 */
export function buildCannotDoLines(forbiddenActions: readonly string[]): string[] {
  const normalized = forbiddenActions.map((action) => action.trim()).filter(Boolean);
  if (normalized.length === 0) {
    return ["No explicit forbidden operations defined in identity lock."];
  }
  return normalized;
}

export function buildProductToolRows(
  agent: AgentOpsRuntimeAgentRow,
  canonicalId: string | null,
): ProductToolRow[] {
  const identity = getAgentIdentityDefinition(canonicalId);
  const tools = (agent.tools ?? []).map((t) => t.toLowerCase());
  const actions = new Set((identity?.allowedActions ?? []).map((a) => a.toLowerCase()));

  const directRows: ProductToolRow[] = Object.entries(DIRECT_TOOL_DEFS).map(([id, def]) => {
    const available = def.detect(tools, actions);
    return {
      id,
      name: def.name,
      purpose: def.purpose,
      tier: "direct" as const,
      statusLabel: available ? AGENT_DETAIL_DISPLAY.directToolAvailable : AGENT_DETAIL_DISPLAY.directToolNotOnRow,
      detail: available
        ? AGENT_DETAIL_DISPLAY.directToolAvailableDetail
        : AGENT_DETAIL_DISPLAY.directToolNotOnRowDetail,
    };
  });

  const infrastructureRows: ProductToolRow[] = Object.entries(INFRASTRUCTURE_TOOL_DEFS).map(
    ([id, def]) => ({
      id,
      name: def.name,
      purpose: def.purpose,
      tier: "infrastructure" as const,
      statusLabel: AGENT_DETAIL_DISPLAY.platformSupportStatus,
      detail: `${def.detail} ${AGENT_DETAIL_DISPLAY.platformSupportDetail}`,
    }),
  );

  return [...directRows, ...infrastructureRows];
}

export function isInfrastructureToolId(id: string): boolean {
  return INFRASTRUCTURE_TOOL_IDS.has(id);
}

export function buildProductPermissionsModel(
  canonicalId: string | null,
  agent: AgentOpsRuntimeAgentRow,
): ProductPermissionsModel | null {
  const identity = getAgentIdentityDefinition(canonicalId);
  if (!identity) return null;

  const storedScope = (agent.scope ?? []).map((entry) => entry.trim()).filter(Boolean);
  const ownedDomain =
    canonicalId ? getAgentResponsibilitySummary(canonicalId) : identity.mission;

  return {
    role: identity.role,
    ownedDomain,
    storedScope,
    canDo: buildCanDoLines(identity.allowedActions),
    cannotDo: buildCannotDoLines(identity.forbiddenActions),
    alwaysForbidden: [...STAGING_ALWAYS_FORBIDDEN],
  };
}
