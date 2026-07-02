/**
 * Runtime observability immutability guard — structural freeze for 4-surface architecture.
 * Authority: registry/AGENTOPS_RUNTIME_SEMANTIC_BOUNDARY.md · registry/ACDL_SYSTEM_LOCK_v2.1.md
 * Verify: npx tsx scripts/agentops-runtime-immutability-check.ts
 */

/** Canonical runtime observatory routes — exactly four surfaces. */
export const ALLOWED_RUNTIME_ROUTES = [
  "/system/agent-ops/runtime",
  "/system/agent-ops/runtime/memory",
  "/system/agent-ops/issues/runtime",
  "/system/agent-ops/agents/runtime",
] as const;

export type AllowedRuntimeRoute = (typeof ALLOWED_RUNTIME_ROUTES)[number];

/** Frozen legacy redirect routes — must remain redirect-only; count must not grow. */
export const FROZEN_LEGACY_RUNTIME_REDIRECT_ROUTES = [
  "/system/agent-ops/runtime/evolution",
  "/system/agent-ops/runtime/fix",
  "/system/agent-ops/runtime/config",
  "/system/agent-ops/evolution",
  "/system/agent-ops/fix",
  "/system/agent-ops/memory",
  "/system/agent-ops/config",
] as const;

/** Page modules that may render runtime observatory UI (surface count = 4). */
export const RUNTIME_SURFACE_PAGE_PATHS = [
  "src/app/system/agent-ops/runtime/page.tsx",
  "src/app/system/agent-ops/memory/page.tsx",
  "src/app/system/agent-ops/issues/runtime/page.tsx",
  "src/app/system/agent-ops/agents/runtime/page.tsx",
] as const;

/** Shared runtime UI components scanned for import + token boundaries. */
export const RUNTIME_UI_COMPONENT_PATHS = [
  "src/components/agentops/runtime/AgentOpsRuntimeNav.tsx",
  "src/components/agentops/runtime/AgentOpsRuntimeMirrorShell.tsx",
  "src/components/agentops/runtime/AgentOpsRuntimeMirrorStates.tsx",
  "src/components/agentops/runtime/AgentOpsRuntimeDashboardSectionBoundary.tsx",
  "src/components/agentops/runtime/AgentOpsRuntimeRefreshProvider.tsx",
  "src/components/agentops/runtime/AgentOpsRuntimeSystemStatusBar.tsx",
  "src/components/agentops/runtime/AgentOpsConnectionDebugger.tsx",
] as const;

/** Frozen redirect page modules — Navigate-only; not observatory surfaces. */
export const FROZEN_RUNTIME_REDIRECT_PAGE_IMPORTS = [
  "@/app/system/agent-ops/evolution/page",
  "@/app/system/agent-ops/fix/page",
  "@/app/system/agent-ops/config/page",
] as const;

/** Frozen surface page imports allowed in App.tsx route registration. */
export const FROZEN_RUNTIME_SURFACE_PAGE_IMPORTS = [
  "@/app/system/agent-ops/runtime/page",
  "@/app/system/agent-ops/memory/page",
  "@/app/system/agent-ops/issues/runtime/page",
  "@/app/system/agent-ops/agents/runtime/page",
] as const;

export const RUNTIME_IMMUTABILITY_REGRESSION_LABEL = "RUNTIME IMMUTABILITY REGRESSION";

export const EXPECTED_RUNTIME_SURFACE_COUNT = ALLOWED_RUNTIME_ROUTES.length;

/** Import paths forbidden in runtime observatory UI (ACDL / causal / ranking engines). */
export const FORBIDDEN_RUNTIME_IMPORT_PATTERNS: { pattern: RegExp; label: string }[] = [
  { pattern: /browserQa\/acdl/, label: "ACDL engine (browserQa/acdl)" },
  { pattern: /acdlV\d+Engine/, label: "ACDL version engine" },
  { pattern: /\bacdlEngine\b/, label: "acdlEngine" },
  { pattern: /\/scil\//, label: "SCIL module" },
  { pattern: /\bcgpfl\b/i, label: "CGPFL module" },
  { pattern: /\bvefl\b/i, label: "vEFL module" },
  { pattern: /generateCausalInterventions/, label: "causal intervention engine" },
  { pattern: /runSystemicCausalIntelligence/, label: "SCIL runner" },
  { pattern: /generateFixIntelligence/, label: "fix intelligence engine" },
  { pattern: /falsifyRealityFromScan/, label: "ACDL v5 falsification" },
  { pattern: /orchestrateDeployment/, label: "ACDL v8 deployment orchestration" },
  { pattern: /runAutonomousEngineeringLoop/, label: "ACDL v10 loop" },
  { pattern: /runEngineeringGovernance/, label: "ACDL governance engine" },
  { pattern: /runGlobalEngineeringStrategy/, label: "ACDL global strategy" },
  { pattern: /runExecutionFeedbackLayer/, label: "vEFL runner" },
  { pattern: /synthesizeEpistemicFleet/, label: "epistemic fleet synthesis" },
  { pattern: /agentOpsRuntimeEngine/, label: "runtime ACDL engine bridge" },
  { pattern: /generateRuntimeFixPrompt/, label: "runtime fix prompt generator" },
];

/** Prefixes allowed for @/lib/agentops imports on runtime observatory pages. */
export const ALLOWED_AGENTOPS_IMPORT_PREFIXES = [
  "@/lib/agentops/runtime/",
  "@/lib/agentops/usl/",
  "@/lib/agentops/db/",
  "@/lib/agentops/issues/",
  "@/lib/agentops/agentRuntimeState",
  "@/lib/agentops/initializeCanonicalAgents",
] as const;

/** Forbidden reasoning tokens in runtime UI copy (unless allowlisted). */
export const FORBIDDEN_RUNTIME_STRUCTURE_PATTERNS: { pattern: RegExp; label: string }[] = [
  { pattern: /\bpriority\b/i, label: "priority" },
  { pattern: /\brecommend/i, label: "recommend" },
  { pattern: /\binsight\b/i, label: "insight" },
  { pattern: /\bnext action\b/i, label: "next action" },
  { pattern: /\bsuggest/i, label: "suggest" },
  { pattern: /\brank(?:ing|ed)?\b/i, label: "rank" },
  { pattern: /\bscore(?:d|s)?\b/i, label: "score" },
  { pattern: /\bevolution engine\b/i, label: "evolution engine" },
  { pattern: /\bfix[\s-]?plan\b/i, label: "fix plan" },
  { pattern: /\bfix pipeline\b/i, label: "fix pipeline" },
  { pattern: /\brecommended fix\b/i, label: "recommended fix" },
  { pattern: /\bpriority issue\b/i, label: "priority issue" },
  { pattern: /\bhealth reasoning\b/i, label: "health reasoning" },
  { pattern: /\bproductivity scoring\b/i, label: "productivity scoring" },
];

/** Line-level allowlist for stored DB fields, prop names, and frozen symbols. */
export const RUNTIME_STRUCTURE_ALLOWLIST_SUBSTRINGS = [
  "suggestedFix",
  "AgentHealthPanel",
  "runAgentRegistryHealthCheck",
  "AgentRegistryHealthResult",
  "impact_score",
  "health_score",
  "Stored score",
  "signal strength",
  "diagnostic trace",
  "Evolution mirror",
  "redirect-only",
  "Navigate to=",
  "Registry status",
] as const;

export function isRuntimeStructureLineAllowlisted(line: string): boolean {
  return RUNTIME_STRUCTURE_ALLOWLIST_SUBSTRINGS.some((token) => line.includes(token));
}

/** True when path is a runtime observatory or legacy redirect route segment. */
export function isRuntimeRoutePath(routePath: string): boolean {
  return (
    routePath.startsWith("/system/agent-ops/runtime") ||
    routePath === "/system/agent-ops/issues/runtime" ||
    routePath === "/system/agent-ops/agents/runtime" ||
    FROZEN_LEGACY_RUNTIME_REDIRECT_ROUTES.includes(
      routePath as (typeof FROZEN_LEGACY_RUNTIME_REDIRECT_ROUTES)[number],
    )
  );
}

export function classifyRuntimeRoute(routePath: string): "surface" | "legacy-redirect" | "forbidden" {
  if ((ALLOWED_RUNTIME_ROUTES as readonly string[]).includes(routePath)) return "surface";
  if ((FROZEN_LEGACY_RUNTIME_REDIRECT_ROUTES as readonly string[]).includes(routePath)) {
    return "legacy-redirect";
  }
  if (
    routePath.startsWith("/system/agent-ops/runtime/") ||
    routePath.endsWith("/runtime") && routePath.includes("/agent-ops/")
  ) {
    return "forbidden";
  }
  return "forbidden";
}

export function validateRuntimeRouteRegistry(routePaths: string[]): string[] {
  const failures: string[] = [];
  const runtimePaths = routePaths.filter(isRuntimeRoutePath);

  for (const route of runtimePaths) {
    const kind = classifyRuntimeRoute(route);
    if (kind === "forbidden") {
      failures.push(`forbidden runtime route registered: ${route}`);
    }
  }

  for (const required of ALLOWED_RUNTIME_ROUTES) {
    if (!routePaths.includes(required)) {
      failures.push(`missing required runtime surface route: ${required}`);
    }
  }

  const surfaceRoutes = runtimePaths.filter((r) => classifyRuntimeRoute(r) === "surface");
  if (surfaceRoutes.length !== EXPECTED_RUNTIME_SURFACE_COUNT) {
    failures.push(
      `runtime surface route count ${surfaceRoutes.length} !== ${EXPECTED_RUNTIME_SURFACE_COUNT}`,
    );
  }

  return failures;
}

export function validateRuntimeSurfaceFileRegistry(discoveredPaths: string[]): string[] {
  const failures: string[] = [];
  const allowed = new Set<string>(RUNTIME_SURFACE_PAGE_PATHS);

  for (const file of discoveredPaths) {
    const normalized = file.replace(/\\/g, "/");
    if (!allowed.has(normalized)) {
      failures.push(`unexpected runtime surface page file: ${normalized}`);
    }
  }

  for (const required of RUNTIME_SURFACE_PAGE_PATHS) {
    if (!discoveredPaths.some((p) => p.replace(/\\/g, "/") === required)) {
      failures.push(`missing required runtime surface page: ${required}`);
    }
  }

  if (discoveredPaths.length !== EXPECTED_RUNTIME_SURFACE_COUNT) {
    failures.push(
      `runtime surface page file count ${discoveredPaths.length} !== ${EXPECTED_RUNTIME_SURFACE_COUNT}`,
    );
  }

  return failures;
}

export function validateRuntimePageImports(importLines: string[]): string[] {
  const failures: string[] = [];
  const frozen = new Set<string>([
    ...FROZEN_RUNTIME_SURFACE_PAGE_IMPORTS,
    ...FROZEN_RUNTIME_REDIRECT_PAGE_IMPORTS,
  ]);

  const runtimePageImportPattern =
    /@\/app\/system\/agent-ops\/(?:runtime|memory|evolution|fix|config|issues\/runtime|agents\/runtime)\/page/;

  for (const line of importLines) {
    if (!runtimePageImportPattern.test(line)) continue;
    const match = line.match(/from\s+["']([^"']+)["']/);
    if (!match) continue;
    const spec = match[1];
    if (!frozen.has(spec)) {
      failures.push(`unregistered runtime page import in App router: ${spec}`);
    }
  }

  return failures;
}

export function validateForbiddenRuntimeImports(
  filePath: string,
  importLines: string[],
): string[] {
  const failures: string[] = [];

  for (const line of importLines) {
    for (const { pattern, label } of FORBIDDEN_RUNTIME_IMPORT_PATTERNS) {
      if (pattern.test(line)) {
        failures.push(`${filePath}: forbidden import (${label}): ${line.trim()}`);
      }
    }

    const agentopsMatch = line.match(/from\s+["']@\/lib\/agentops\/([^"']+)["']/);
    if (agentopsMatch) {
      const suffix = agentopsMatch[1];
      const full = `@/lib/agentops/${suffix}`;
      const allowed = ALLOWED_AGENTOPS_IMPORT_PREFIXES.some((prefix) => full.startsWith(prefix));
      if (!allowed) {
        failures.push(`${filePath}: agentops import outside runtime boundary: ${full}`);
      }
    }
  }

  return failures;
}

export function validateForbiddenRuntimeStructureTokens(
  filePath: string,
  lines: string[],
): string[] {
  const failures: string[] = [];

  lines.forEach((line, index) => {
    if (isRuntimeStructureLineAllowlisted(line)) return;
    for (const { pattern, label } of FORBIDDEN_RUNTIME_STRUCTURE_PATTERNS) {
      if (pattern.test(line)) {
        failures.push(`${filePath}:${index + 1}: forbidden structure token "${label}"`);
      }
    }
  });

  return failures;
}

export function assertRuntimeImmutability(check: { pass: boolean; failures: string[] }): void {
  if (check.pass) return;
  const detail = check.failures.map((f) => `  - ${f}`).join("\n");
  throw new Error(`${RUNTIME_IMMUTABILITY_REGRESSION_LABEL}:\n${detail}`);
}
