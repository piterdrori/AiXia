import {
  AGENTOPS_CODEGRAPH_DISCOVERY_READINESS,
  type AgentOpsCodeGraphDiscoveryReadiness,
  type AgentOpsCodeGraphDiscoverySuggestionItem,
  type AgentOpsCodeGraphRuntimeActivationState,
  type AgentOpsCodeGraphRuntimeReadinessGate,
  type AgentOpsCodeGraphRuntimeStatus,
} from "./types";

const CODEGRAPH_RUNTIME_READINESS_GATE_PATH =
  "qa-agent/codegraph/codegraph-runtime-readiness-gate.json";
const CODEGRAPH_STAGING_RUNTIME_PLAN_PATH =
  "qa-agent/codegraph/codegraph-staging-runtime-plan.md";
const CODEGRAPH_OWNER_SIGNOFF_TEMPLATE_PATH =
  "qa-agent/codegraph/codegraph-owner-signoff-template.md";

/** Phase 6D: hardcoded off — no live CodeGraph, MCP, or browser/repo scan from app. */
const CODEGRAPH_RUNTIME_ACTIVE = false;
/** Phase 6D: sanitized artifact path not wired — Option A planned in Phase 6E. */
const CODEGRAPH_SANITIZED_ARTIFACT_CONFIGURED = false;

const UNKNOWN_HINT =
  "Unknown — CodeGraph runtime not active. Cursor should inspect route/component ownership first.";

const SHARED_AIXIA_COMPONENTS = "src/components/aixia";
const SHARED_AIXIA_STYLES = "src/styles/aixia-design-system.css";

export interface AgentOpsCodeGraphDiscoveryMockInput {
  issueCode: string;
  title?: string | null;
  route?: string | null;
  module?: string | null;
  category?: string | null;
  severity?: string | null;
  summary?: string | null;
  evidence?: string | null;
  likelyRootCause?: string | null;
  recommendedFixStrategy?: string | null;
}

export interface AgentOpsCodeGraphDiscoveryMockSuggestions {
  likelyRoutes: AgentOpsCodeGraphDiscoverySuggestionItem[];
  likelyFiles: AgentOpsCodeGraphDiscoverySuggestionItem[];
  likelyComponents: AgentOpsCodeGraphDiscoverySuggestionItem[];
  sharedComponents: AgentOpsCodeGraphDiscoverySuggestionItem[];
  sharedStyles: AgentOpsCodeGraphDiscoverySuggestionItem[];
  likelyServices: AgentOpsCodeGraphDiscoverySuggestionItem[];
  likelyTypes: AgentOpsCodeGraphDiscoverySuggestionItem[];
  likelyTests: AgentOpsCodeGraphDiscoverySuggestionItem[];
  relatedPastIssues: AgentOpsCodeGraphDiscoverySuggestionItem[];
  recurrenceCandidates: AgentOpsCodeGraphDiscoverySuggestionItem[];
  promptContextHints: AgentOpsCodeGraphDiscoverySuggestionItem[];
}

export interface AgentOpsCodeGraphDiscoveryMockResult {
  source: "mock_static_hints";
  runtimeCalled: false;
  mcpCalled: false;
  browserScanUsed: false;
  repositoryScanUsed: false;
  suggestions: AgentOpsCodeGraphDiscoveryMockSuggestions;
  confidence: "low" | "medium" | "high";
  limitations: string;
  requiresOwnerReview: true;
  shouldFallbackToManualInspection: boolean;
}

/** Adapter result (Phase 6D) — currently same shape as mock; future may add sanitized_artifact source. */
export type AgentOpsCodeGraphDiscoveryAdapterResult = AgentOpsCodeGraphDiscoveryMockResult;

function staticHint(
  label: string,
  reason: string,
  confidence: AgentOpsCodeGraphDiscoverySuggestionItem["confidence"],
  path?: string | null,
  evidence?: string | null,
): AgentOpsCodeGraphDiscoverySuggestionItem {
  return {
    label,
    path: path ?? null,
    reason,
    confidence,
    evidence: evidence ?? null,
    source: "static_index",
    safeToIncludeInPrompt: false,
  };
}

function manualHint(label: string, reason: string): AgentOpsCodeGraphDiscoverySuggestionItem {
  return {
    label,
    path: null,
    reason,
    confidence: "low",
    evidence: null,
    source: "manual_hint",
    safeToIncludeInPrompt: false,
  };
}

function includesAny(text: string, terms: string[]): boolean {
  const lower = text.toLowerCase();
  return terms.some((term) => lower.includes(term));
}

function buildTextBundle(input: AgentOpsCodeGraphDiscoveryMockInput): string {
  return [
    input.title,
    input.category,
    input.severity,
    input.summary,
    input.evidence,
    input.likelyRootCause,
    input.recommendedFixStrategy,
    input.module,
  ]
    .filter(Boolean)
    .join(" ");
}

/**
 * Safe mock CodeGraph discovery (Phase 6B).
 * Static hints from issue fields only — no CodeGraph, MCP, fs, or browser scan.
 */
export function runAgentOpsCodeGraphDiscoveryMock(
  input: AgentOpsCodeGraphDiscoveryMockInput,
): AgentOpsCodeGraphDiscoveryMockResult {
  const route = (input.route ?? "").trim();
  const module = (input.module ?? "").trim();
  const category = (input.category ?? "").trim();
  const severity = (input.severity ?? "").trim();
  const textBundle = buildTextBundle(input);

  const likelyRoutes: AgentOpsCodeGraphDiscoverySuggestionItem[] = [];
  const likelyFiles: AgentOpsCodeGraphDiscoverySuggestionItem[] = [];
  const likelyComponents: AgentOpsCodeGraphDiscoverySuggestionItem[] = [];
  const sharedComponents: AgentOpsCodeGraphDiscoverySuggestionItem[] = [];
  const sharedStyles: AgentOpsCodeGraphDiscoverySuggestionItem[] = [];
  const likelyServices: AgentOpsCodeGraphDiscoverySuggestionItem[] = [];
  const likelyTypes: AgentOpsCodeGraphDiscoverySuggestionItem[] = [];
  const likelyTests: AgentOpsCodeGraphDiscoverySuggestionItem[] = [];
  const relatedPastIssues: AgentOpsCodeGraphDiscoverySuggestionItem[] = [];
  const recurrenceCandidates: AgentOpsCodeGraphDiscoverySuggestionItem[] = [];
  const promptContextHints: AgentOpsCodeGraphDiscoverySuggestionItem[] = [];

  let confidence: AgentOpsCodeGraphDiscoveryMockResult["confidence"] = "low";
  let shouldFallbackToManualInspection = true;

  if (route) {
    likelyRoutes.push(
      staticHint(
        `Reported route: ${route}`,
        "Start discovery from the route shown in the issue record.",
        "medium",
        route,
        input.issueCode,
      ),
    );
    shouldFallbackToManualInspection = false;
  }

  if (route.includes("/system/agent-ops/issues")) {
    confidence = "medium";
    likelyRoutes.push(
      staticHint(
        "Route area: AgentOps Issue Workspace",
        "Issue workspace UI and lifecycle actions for a single finding.",
        "medium",
      ),
    );
    likelyFiles.push(
      staticHint(
        "Issue Workspace page",
        "Primary UI for issue summary, agent clarification, CodeGraph panel, and Cursor prompt.",
        "medium",
        "src/app/system/agent-ops/issues/[issueCode]/page.tsx",
      ),
      staticHint(
        "Execution lifecycle helpers",
        "Timeline, lifecycle rail, and execution state derivation.",
        "medium",
        "src/lib/agentops/executionLifecycle.ts",
      ),
      staticHint(
        "AgentOps service layer",
        "Supabase-backed issue actions, handoffs, and owner feedback.",
        "medium",
        "src/lib/agentops/service.ts",
      ),
      staticHint(
        "CodeGraph mock discovery",
        "Static hint adapter (Phase 6B) — not live CodeGraph.",
        "medium",
        "src/lib/agentops/codegraphDiscovery.ts",
      ),
    );
    likelyComponents.push(
      staticHint(
        "AgentOps Issue Workspace sections",
        "Inspect Agent Clarification, CodeGraph Discovery, and Cursor Prompt sections in the page.",
        "low",
      ),
    );
  } else if (route.includes("/system/agent-ops")) {
    confidence = "medium";
    likelyRoutes.push(
      staticHint("Route area: AgentOps Control Center", "Registry and control surfaces for AgentOps.", "medium"),
    );
    likelyFiles.push(
      staticHint(
        "AgentOps Control Center page",
        "Main AgentOps hub UI.",
        "medium",
        "src/app/system/agent-ops/page.tsx",
      ),
      staticHint(
        "AgentOps service layer",
        "Shared backend calls for findings and queue.",
        "medium",
        "src/lib/agentops/service.ts",
      ),
    );
  }

  const securitySignals = includesAny(textBundle, [
    "permission",
    "permissions",
    "security",
    "rls",
    "auth",
    "unauthorized",
    "forbidden",
    "role",
  ]);
  if (
    securitySignals ||
    includesAny(category, ["security", "permission"]) ||
    includesAny(severity, ["critical"])
  ) {
    likelyServices.push(
      manualHint(
        "Route guard and permission helpers",
        "Inspect route protection, pageAccess, and permission checks for the reported route.",
      ),
    );
    if (confidence === "low") confidence = "low";
  }

  const layoutSignals = includesAny(textBundle, [
    "layout",
    "table",
    "design",
    "css",
    "ui",
    "component",
    "hero",
    "registry",
    "scroll",
  ]);
  if (layoutSignals) {
    likelyComponents.push(
      manualHint(
        "Page component first",
        "Confirm whether the bug is page-specific before editing shared systems.",
      ),
    );
    sharedComponents.push(
      staticHint(
        "Shared AiXia components",
        "Repeated UI issues often belong in @/components/aixia, not page hacks.",
        "low",
        SHARED_AIXIA_COMPONENTS,
      ),
    );
    sharedStyles.push(
      staticHint(
        "Shared AiXia design system CSS",
        "Inspect shared styles before adding page-level overrides.",
        "low",
        SHARED_AIXIA_STYLES,
      ),
    );
  } else {
    sharedComponents.push(
      staticHint(
        "Shared AiXia components (default check)",
        "Verify shared component usage before local page changes.",
        "low",
        SHARED_AIXIA_COMPONENTS,
      ),
    );
    sharedStyles.push(
      staticHint(
        "Shared AiXia design system CSS (default check)",
        "Verify shared CSS source-of-truth for visual issues.",
        "low",
        SHARED_AIXIA_STYLES,
      ),
    );
  }

  const financeSignals =
    route.includes("/finance") ||
    module.toLowerCase().includes("finance") ||
    includesAny(category, ["finance"]);
  if (financeSignals) {
    likelyRoutes.push(
      manualHint(
        "Finance route area",
        "Inspect the finance route/page tied to this issue and FinancePage shell conventions.",
      ),
    );
    likelyFiles.push(
      manualHint(
        "Finance page and access",
        route
          ? `Search src/app for route segment matching: ${route}`
          : "Locate finance page under src/app/finance from issue metadata.",
      ),
    );
    likelyServices.push(
      manualHint(
        "Finance permissions / pageAccess",
        "Check finance pageAccess and permission helpers if access or visibility is involved.",
      ),
    );
  }

  if (!route) {
    promptContextHints.push(
      manualHint(
        "No route on issue",
        "Manual inspection only — locate the affected page in src/app from evidence and title.",
      ),
    );
    confidence = "low";
    shouldFallbackToManualInspection = true;
  } else {
    promptContextHints.push(
      staticHint(
        `Inspect route/page: ${route}`,
        "Open the page component and trace imports to shared components.",
        route.includes("/system/agent-ops") ? "medium" : "low",
        route,
      ),
    );
  }

  if (input.likelyRootCause?.trim()) {
    promptContextHints.push(
      staticHint(
        "Likely root cause (issue record)",
        input.likelyRootCause.trim(),
        "low",
        null,
        input.likelyRootCause.trim(),
      ),
    );
  }

  if (input.recommendedFixStrategy?.trim()) {
    promptContextHints.push(
      staticHint(
        "Recommended fix strategy (issue record)",
        input.recommendedFixStrategy.trim(),
        "low",
        null,
        input.recommendedFixStrategy.trim(),
      ),
    );
  }

  relatedPastIssues.push(
    manualHint(
      "Related past fixes",
      "No archive lookup in mock mode — search AgentOps backlog/archive manually if recurrence suspected.",
    ),
  );

  recurrenceCandidates.push(
    manualHint(
      "Recurrence clues",
      "CodeGraph recurrence lookup inactive — compare fingerprints and prior fixes manually.",
    ),
  );

  likelyTypes.push(
    manualHint(
      "Types and contracts",
      UNKNOWN_HINT,
    ),
  );

  likelyTests.push(
    manualHint(
      "Tests and smoke",
      "Run relevant npm qa/build smoke after fix; no automated test mapping in mock mode.",
    ),
  );

  const limitations = [
    "Mock static hints only (Phase 6B).",
    "No CodeGraph runtime, MCP, browser scan, or repository scan.",
    "File paths are convention-based guesses — verify in repo before editing.",
    shouldFallbackToManualInspection
      ? "Manual inspection fallback recommended."
      : "Partial route-based hints only.",
  ].join(" ");

  return {
    source: "mock_static_hints",
    runtimeCalled: false,
    mcpCalled: false,
    browserScanUsed: false,
    repositoryScanUsed: false,
    suggestions: {
      likelyRoutes,
      likelyFiles,
      likelyComponents,
      sharedComponents,
      sharedStyles,
      likelyServices,
      likelyTypes,
      likelyTests,
      relatedPastIssues,
      recurrenceCandidates,
      promptContextHints,
    },
    confidence,
    limitations,
    requiresOwnerReview: true,
    shouldFallbackToManualInspection,
  };
}

/** Flatten suggestion groups for UI lists. */
export function flattenCodeGraphMockSuggestions(
  result: AgentOpsCodeGraphDiscoveryMockResult,
): Array<{ group: string; item: AgentOpsCodeGraphDiscoverySuggestionItem }> {
  const groups: Array<[string, AgentOpsCodeGraphDiscoverySuggestionItem[]]> = [
    ["Likely routes", result.suggestions.likelyRoutes],
    ["Likely files", result.suggestions.likelyFiles],
    ["Likely components", result.suggestions.likelyComponents],
    ["Shared components", result.suggestions.sharedComponents],
    ["Shared styles", result.suggestions.sharedStyles],
    ["Likely services", result.suggestions.likelyServices],
    ["Types", result.suggestions.likelyTypes],
    ["Tests", result.suggestions.likelyTests],
    ["Related past issues", result.suggestions.relatedPastIssues],
    ["Recurrence", result.suggestions.recurrenceCandidates],
    ["Prompt context", result.suggestions.promptContextHints],
  ];
  return groups.flatMap(([group, items]) => items.map((item) => ({ group, item })));
}

/** Format hints for optional append to local prompt draft only (owner review required). */
export function formatCodeGraphHintsForPromptDraft(
  result: AgentOpsCodeGraphDiscoveryMockResult,
): string {
  const lines: string[] = [
    "CODEGRAPH DISCOVERY HINTS — OWNER REVIEW REQUIRED:",
    "",
    "- These are mock/static hints.",
    "- CodeGraph runtime is not active.",
    "- Cursor must verify files before editing.",
    "- Do not edit files based only on these hints.",
    "",
  ];

  for (const { group, item } of flattenCodeGraphMockSuggestions(result)) {
    const pathPart = item.path ? ` (${item.path})` : "";
    lines.push(`- [${group}] ${item.label}${pathPart} — ${item.reason} [${item.confidence}]`);
  }

  lines.push("");
  lines.push(`Limitations: ${result.limitations}`);

  return lines.join("\n");
}

function isCodeGraphRuntimeActive(): boolean {
  return CODEGRAPH_RUNTIME_ACTIVE && CODEGRAPH_SANITIZED_ARTIFACT_CONFIGURED;
}

/**
 * Read-only CodeGraph runtime status (Phase 6D).
 * No MCP, no file scan, no network from browser.
 */
export function getAgentOpsCodeGraphRuntimeStatus(): AgentOpsCodeGraphRuntimeStatus {
  const runtimeActive = isCodeGraphRuntimeActive();
  const blockers = [
    "CodeGraph runtime source is not configured.",
    "Owner approval is required.",
    "Read-only staging runtime has not been enabled.",
  ];
  if (!CODEGRAPH_SANITIZED_ARTIFACT_CONFIGURED) {
    blockers.push("Sanitized discovery artifact not configured (Phase 6E).");
  }

  return {
    runtimeActive,
    readOnly: true,
    runtimeMode: runtimeActive ? "sanitized_artifact" : "mock_static_hints",
    stagingOnly: true,
    ownerApprovalRequired: true,
    promptAutoMutation: false,
    cursorAutoTrigger: false,
    fallbackMode: "mock_static_hints",
    blockers,
    artifactConfigured: CODEGRAPH_SANITIZED_ARTIFACT_CONFIGURED,
    gateArtifactPath: CODEGRAPH_RUNTIME_READINESS_GATE_PATH,
    stagingRuntimePlanPath: CODEGRAPH_STAGING_RUNTIME_PLAN_PATH,
    ownerSignoffTemplatePath: CODEGRAPH_OWNER_SIGNOFF_TEMPLATE_PATH,
  };
}

/**
 * Read-only CodeGraph runtime readiness gate (Phase 6D).
 */
export function getAgentOpsCodeGraphRuntimeReadinessGate(): AgentOpsCodeGraphRuntimeReadinessGate {
  const runtimeActive = isCodeGraphRuntimeActive();
  const contractReady = true;
  const safetyPolicyReady = true;
  const fallbackReady = true;

  const blockers = [
    "CodeGraph runtime source is not configured.",
    "Owner approval is required.",
    "Read-only staging runtime has not been enabled.",
  ];
  if (!CODEGRAPH_SANITIZED_ARTIFACT_CONFIGURED) {
    blockers.push("Sanitized discovery artifact generator not wired (Phase 6E).");
  }

  let currentState: AgentOpsCodeGraphRuntimeActivationState = "staging_ready_pending_owner";
  if (!contractReady || !safetyPolicyReady || !fallbackReady) {
    currentState = "not_configured";
  } else if (runtimeActive) {
    currentState = "staging_enabled_read_only";
  } else {
    currentState = "staging_ready_pending_owner";
  }

  return {
    currentState,
    contractReady,
    safetyPolicyReady,
    fallbackReady,
    readOnlyMode: true,
    stagingOnly: true,
    ownerApprovalRequired: true,
    runtimeActive,
    canEnableReadOnlyStaging: false,
    blockers,
    nextStep:
      "Complete owner signoff and Phase 6E sanitized artifact design before CODEGRAPH_RUNTIME_ACTIVE=true",
    gateArtifactPath: CODEGRAPH_RUNTIME_READINESS_GATE_PATH,
  };
}

/**
 * Owner-gated CodeGraph discovery adapter (Phase 6D).
 * Falls back to mock static hints when runtime inactive — no MCP, no browser/repo scan.
 */
export function runAgentOpsCodeGraphDiscoveryAdapter(
  input: AgentOpsCodeGraphDiscoveryMockInput,
): AgentOpsCodeGraphDiscoveryAdapterResult {
  const status = getAgentOpsCodeGraphRuntimeStatus();
  if (!status.runtimeActive) {
    return runAgentOpsCodeGraphDiscoveryMock(input);
  }

  // Future Phase 6E: load pre-generated sanitized artifact only — never scan from browser.
  const artifact = tryLoadSanitizedDiscoveryArtifact(input.issueCode);
  if (artifact) {
    return artifact;
  }

  return runAgentOpsCodeGraphDiscoveryMock(input);
}

/**
 * Phase 6E placeholder — returns null until sanitized artifact source is configured.
 * Must not read filesystem or call CodeGraph MCP from browser.
 */
function tryLoadSanitizedDiscoveryArtifact(
  _issueCode: string,
): AgentOpsCodeGraphDiscoveryAdapterResult | null {
  if (!CODEGRAPH_SANITIZED_ARTIFACT_CONFIGURED) {
    return null;
  }
  return null;
}

/**
 * Read-only CodeGraph discovery status (Phase 6A/6B).
 * No MCP, no file scan, no network.
 */
export function getAgentOpsCodeGraphDiscoveryReadiness(): AgentOpsCodeGraphDiscoveryReadiness {
  return { ...AGENTOPS_CODEGRAPH_DISCOVERY_READINESS };
}
