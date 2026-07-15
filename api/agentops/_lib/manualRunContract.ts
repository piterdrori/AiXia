/**
 * Vercel-safe copy of manual-run contract validators (no src/lib imports).
 * Keep in sync with src/lib/agentops/agents/agentManualRunContract.ts
 */

export const AGENT_MANUAL_WORK_TYPES = ["website_audit", "browser_qa"] as const;
export type AgentManualWorkType = (typeof AGENT_MANUAL_WORK_TYPES)[number];

export const AGENT_MANUAL_SCOPE_TYPES = [
  "assigned_modules",
  "selected_modules",
  "selected_routes",
  "entire_staging",
] as const;
export type AgentManualScopeType = (typeof AGENT_MANUAL_SCOPE_TYPES)[number];

export type AgentManualRunScope = {
  type: AgentManualScopeType;
  modules?: string[];
  routes?: string[];
};

export type AgentManualRunRequest = {
  agentSlug: string;
  workType: AgentManualWorkType;
  scope: AgentManualRunScope;
  maxDurationMinutes: number;
  avoidOverlap: boolean;
  requestedBy: string;
  ownerFacingPaused?: boolean;
  runOnceWhilePaused?: boolean;
  activateAndRun?: boolean;
};

export const CANONICAL_AGENT_SLUGS = [
  "system-agent",
  "memory-agent",
  "issue-agent",
  "evolution-agent",
  "fix-agent",
  "qa-agent",
  "design-agent",
  "runtime-agent",
  "logs-agent",
  "config-agent",
  "chat-agent",
  "analytics-agent",
] as const;

export const ABSOLUTE_MANUAL_MAX_DURATION_MINUTES = 30;
export const DAILY12_WORKFLOW_FILE = "agentops-daily-12-agent-review.yml";
export const GITHUB_REPO = "piterdrori/AiXia";
export const GITHUB_REF = "staging";

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*-agent$/;

function isWorkType(value: unknown): value is AgentManualWorkType {
  return typeof value === "string" && (AGENT_MANUAL_WORK_TYPES as readonly string[]).includes(value);
}

function isScopeType(value: unknown): value is AgentManualScopeType {
  return typeof value === "string" && (AGENT_MANUAL_SCOPE_TYPES as readonly string[]).includes(value);
}

export function validateAgentManualRunRequest(
  input: unknown,
): { ok: true; request: AgentManualRunRequest } | { ok: false; error: string } {
  if (!input || typeof input !== "object") {
    return { ok: false, error: "Request body is required." };
  }
  const body = input as Record<string, unknown>;
  const agentSlug = typeof body.agentSlug === "string" ? body.agentSlug.trim().toLowerCase() : "";
  if (!agentSlug || !SLUG_RE.test(agentSlug)) {
    return { ok: false, error: "agentSlug must be a canonical agent id." };
  }
  if (!(CANONICAL_AGENT_SLUGS as readonly string[]).includes(agentSlug)) {
    return { ok: false, error: `Unknown canonical agent "${agentSlug}".` };
  }
  if (!isWorkType(body.workType)) {
    return { ok: false, error: "workType must be website_audit or browser_qa." };
  }

  const scopeRaw =
    body.scope && typeof body.scope === "object"
      ? (body.scope as Record<string, unknown>)
      : null;
  if (!scopeRaw || !isScopeType(scopeRaw.type)) {
    return { ok: false, error: "scope.type is required." };
  }

  const modules = Array.isArray(scopeRaw.modules)
    ? scopeRaw.modules
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 20)
    : undefined;
  const routes = Array.isArray(scopeRaw.routes)
    ? scopeRaw.routes
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 20)
    : undefined;

  if (scopeRaw.type === "selected_routes" && (!routes || routes.length === 0)) {
    return { ok: false, error: "selected_routes scope requires at least one route." };
  }
  if (scopeRaw.type === "selected_modules" && (!modules || modules.length === 0)) {
    return { ok: false, error: "selected_modules scope requires at least one module." };
  }
  if (body.workType === "browser_qa" && scopeRaw.type === "entire_staging") {
    return {
      ok: false,
      error: "Browser QA requires a limited route/module scope for Fix B.",
    };
  }

  const maxDurationMinutes = Number(body.maxDurationMinutes);
  if (
    !Number.isFinite(maxDurationMinutes) ||
    maxDurationMinutes < 1 ||
    maxDurationMinutes > ABSOLUTE_MANUAL_MAX_DURATION_MINUTES
  ) {
    return {
      ok: false,
      error: `maxDurationMinutes must be 1–${ABSOLUTE_MANUAL_MAX_DURATION_MINUTES}.`,
    };
  }

  const requestedBy =
    typeof body.requestedBy === "string" && body.requestedBy.trim()
      ? body.requestedBy.trim().slice(0, 120)
      : "owner";

  return {
    ok: true,
    request: {
      agentSlug,
      workType: body.workType,
      scope: { type: scopeRaw.type, modules, routes },
      maxDurationMinutes: Math.floor(maxDurationMinutes),
      avoidOverlap: body.avoidOverlap !== false,
      requestedBy,
      ownerFacingPaused: body.ownerFacingPaused === true,
      runOnceWhilePaused: body.runOnceWhilePaused === true,
      activateAndRun: body.activateAndRun === true,
    },
  };
}

export function buildManualRunSummary(input: {
  agentSlug: string;
  runtimeAgentId: string | null;
  workType: AgentManualWorkType;
  scope: AgentManualRunScope;
  requestedBy: string;
  maxDurationMinutes: number;
}): Record<string, unknown> {
  return {
    trigger: "owner_manual",
    ownerManual: true,
    agentSlug: input.agentSlug,
    runtimeAgentId: input.runtimeAgentId,
    workType: input.workType,
    scope: input.scope,
    requestedBy: input.requestedBy,
    maxDurationMinutes: input.maxDurationMinutes,
    productionWritesBlocked: true,
    autoPromoteBlocked: true,
    autoFixBlocked: true,
    autoMemoryApplyBlocked: true,
  };
}
