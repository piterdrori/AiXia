import { generateAgentOpsMockResponse } from "./agentResponseMock";
import type {
  AgentOpsAgentMockIntent,
  AgentOpsHermesAdapterMode,
  AgentOpsHermesAdapterRequest,
  AgentOpsHermesAdapterResult,
  AgentOpsHermesAdapterRunInput,
  AgentOpsHermesAdapterStatus,
  AgentOpsHermesReadinessGate,
  AgentOpsHermesEndpointSource,
  AgentOpsHermesStagingHealthCheck,
  AgentOpsIssueAgentMessageType,
} from "./types";

const HERMES_READINESS_GATE_PATH = "qa-agent/hermes/hermes-readiness-gate.json";
const HERMES_HEALTH_CHECK_CONTRACT_PATH = "qa-agent/hermes/hermes-health-check-contract.json";
const HERMES_ENDPOINT_CONFIG_DESIGN_PATH = "qa-agent/hermes/hermes-endpoint-config-design.md";

/** Client Hermes enable flag — server route must also be active. */
function readClientEnv(key: string): string | undefined {
  const value = import.meta.env[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function isClientHermesEnabled(): boolean {
  const flag = readClientEnv("VITE_AGENTOPS_HERMES_ENABLED");
  if (flag === "false") return false;
  return flag === "true" || flag === undefined;
}

const HERMES_ENDPOINT_CONFIGURED = isClientHermesEnabled();
const HERMES_ENDPOINT_SOURCE: AgentOpsHermesEndpointSource = HERMES_ENDPOINT_CONFIGURED
  ? "app_api_route"
  : "not_configured";

const HERMES_APP_CALLABLE = HERMES_ENDPOINT_CONFIGURED;
const HERMES_CONTRACT_VERSION = "1.0.0";
const PROMPT_STYLE_STANDARD_PATH = "qa-agent/prompt-standards/cursor-prompt-style-standard.md";

function newRequestId(): string {
  return `hermes-req-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/** Map Issue Workspace intent to Hermes contract mode. */
export function mapIntentToHermesMode(intent: AgentOpsAgentMockIntent): AgentOpsHermesAdapterMode {
  switch (intent) {
    case "prompt_improvement":
      return "prompt_refinement";
    case "risk_review":
      return "risk_review";
    case "next_step":
      return "next_step_recommendation";
    case "clarification":
    default:
      return "issue_clarification";
  }
}

function requestedOutputForMode(mode: AgentOpsHermesAdapterMode): AgentOpsHermesAdapterRequest["requestedOutput"] {
  switch (mode) {
    case "prompt_refinement":
      return { promptSuggestions: true };
    case "risk_review":
      return { riskNotes: true };
    case "next_step_recommendation":
      return { nextAction: true };
    case "cursor_report_synthesis":
      return { clarification: true, nextAction: true };
    case "archive_lesson_extraction":
      return { lessonSummary: true };
    case "issue_clarification":
    default:
      return { clarification: true, riskNotes: true };
  }
}

function isRuntimeActive(): boolean {
  if (!isClientHermesEnabled() || !HERMES_APP_CALLABLE) return false;
  return true;
}

function newHealthCheckId(): string {
  return `hermes-hc-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Staging Hermes health check — probes /api/agentops/hermes when client runtime is enabled.
 */
export async function checkHermesStagingHealthAsync(): Promise<AgentOpsHermesStagingHealthCheck> {
  const checkedAt = new Date().toISOString();
  const runtimeActive = isRuntimeActive();
  const appCallable = HERMES_APP_CALLABLE;
  const blockers: string[] = [];

  if (!runtimeActive) {
    blockers.push("Hermes client runtime inactive.");
    blockers.push("Ensure VITE_AGENTOPS_HERMES_ENABLED=true and server HERMES_RUNTIME_ACTIVE=true.");
  }

  let endpointReachable = false;
  let probeError: string | undefined;

  if (runtimeActive) {
    try {
      const response = await fetch("/api/agentops/hermes", { method: "GET" });
      const payload = (await response.json()) as {
        ollamaReachable?: boolean;
        runtimeActive?: boolean;
        error?: string;
      };
      endpointReachable = Boolean(response.ok && payload.ollamaReachable);
      if (!endpointReachable) {
        probeError = payload.error ?? `Hermes health HTTP ${response.status}`;
        blockers.push(probeError);
      }
    } catch (error) {
      probeError = error instanceof Error ? error.message : String(error);
      blockers.push(probeError);
    }
  }

  let status: AgentOpsHermesStagingHealthCheck["status"] = runtimeActive ? "ready" : "not_configured";
  if (runtimeActive && !endpointReachable) {
    status = probeError?.includes("fetch") ? "not_configured" : "unhealthy";
  }
  if (runtimeActive && !appCallable) {
    status = "blocked_by_gate";
  }

  return {
    checkId: newHealthCheckId(),
    status: endpointReachable ? "ready" : status,
    endpointReachable,
    runtimeAllowed: runtimeActive,
    fallbackAvailable: true,
    latencyMs: null,
    checkedAt,
    blockers,
    nextStep: endpointReachable
      ? "Hermes server route /api/agentops/hermes is connected to Ollama."
      : runtimeActive
        ? "Start Ollama (ollama serve) and pull the configured model."
        : "Enable VITE_AGENTOPS_HERMES_ENABLED and configure server HERMES_* env vars.",
    healthCheckContractPath: HERMES_HEALTH_CHECK_CONTRACT_PATH,
  };
}

/** Sync stub for initial render — use checkHermesStagingHealthAsync for live probes. */
export function checkHermesStagingHealth(): AgentOpsHermesStagingHealthCheck {
  const checkedAt = new Date().toISOString();
  const runtimeActive = isRuntimeActive();
  const appCallable = HERMES_APP_CALLABLE;

  const blockers: string[] = [];
  if (!runtimeActive) {
    blockers.push("Hermes client runtime inactive.");
    blockers.push("Ensure VITE_AGENTOPS_HERMES_ENABLED=true and server HERMES_RUNTIME_ACTIVE=true.");
  }

  let status: AgentOpsHermesStagingHealthCheck["status"] = runtimeActive ? "ready" : "not_configured";
  if (runtimeActive && !appCallable) {
    status = "blocked_by_gate";
  }

  return {
    checkId: newHealthCheckId(),
    status,
    endpointReachable: runtimeActive,
    runtimeAllowed: runtimeActive,
    fallbackAvailable: true,
    latencyMs: null,
    checkedAt,
    blockers,
    nextStep: runtimeActive
      ? "Hermes server route /api/agentops/hermes is callable when Ollama is running."
      : "Enable VITE_AGENTOPS_HERMES_ENABLED and configure server HERMES_* env vars.",
    healthCheckContractPath: HERMES_HEALTH_CHECK_CONTRACT_PATH,
  };
}

/**
 * Read-only Hermes readiness gate (Phase 5C, health-aware Phase 5D).
 * Hermes is essential and planned — gate prevents accidental runtime activation before staging owner approval.
 */
export function getAgentOpsHermesReadinessGate(): AgentOpsHermesReadinessGate {
  const runtimeActive = isRuntimeActive();
  const contractReady = true;
  const safetyPolicyReady = true;
  const fallbackReady = true;
  const appCallable = HERMES_APP_CALLABLE;
  const health = checkHermesStagingHealth();
  const healthCheckPassing = health.status === "ready";

  const blockers: string[] = [];
  if (!HERMES_ENDPOINT_CONFIGURED) {
    blockers.push("Hermes client flag disabled (set VITE_AGENTOPS_HERMES_ENABLED=true)");
  }
  if (!appCallable) {
    blockers.push("App-callable Hermes adapter endpoint not yet wired in runtime");
  }
  if (!runtimeActive) {
    blockers.push("Hermes runtime inactive on client");
  }
  if (!healthCheckPassing) {
    blockers.push("Staging health check not ready or not passing");
  }
  if (runtimeActive && healthCheckPassing) {
    blockers.length = 0;
  }

  let currentState: AgentOpsHermesReadinessGate["currentState"] = "staging_ready_pending_owner";
  if (!contractReady || !safetyPolicyReady || !fallbackReady) {
    currentState = "not_configured";
  } else if (!healthCheckPassing && health.status === "not_configured") {
    currentState = "staging_ready_pending_owner";
  } else if (!healthCheckPassing) {
    currentState = "failed_health_check";
  } else if (!appCallable && !runtimeActive) {
    currentState = "staging_ready_pending_owner";
  } else if (runtimeActive) {
    currentState = "staging_enabled";
  } else {
    currentState = "contract_ready";
  }

  return {
    currentState,
    contractReady,
    safetyPolicyReady,
    fallbackReady,
    appCallable,
    runtimeActive,
    stagingOnly: true,
    ownerApprovalRequired: true,
    canEnableInStaging: false,
    blockers,
    nextStep: health.nextStep,
    gateArtifactPath: HERMES_READINESS_GATE_PATH,
    healthCheckStatus: health.status,
    healthCheckPassing,
    endpointConfigured: HERMES_ENDPOINT_CONFIGURED,
    endpointSource: HERMES_ENDPOINT_SOURCE,
    envRequired: true,
    ownerSignoffRequired: true,
  };
}

/** Read-only adapter status for Issue Workspace UI. */
export function getAgentOpsHermesAdapterStatus(): AgentOpsHermesAdapterStatus {
  const runtimeActive = isRuntimeActive();
  return {
    runtimeActive,
    appCallable: HERMES_APP_CALLABLE,
    responseMode: runtimeActive ? "hermes_advisory" : "mock_fallback",
    contractVersion: HERMES_CONTRACT_VERSION,
    fallbackMode: "agentResponseMock",
    ownerApprovalRequired: true,
    safetyPolicyActive: true,
    endpointConfigured: HERMES_ENDPOINT_CONFIGURED,
    endpointSource: HERMES_ENDPOINT_SOURCE,
    envRequired: true,
    ownerSignoffRequired: true,
    endpointConfigDesignPath: HERMES_ENDPOINT_CONFIG_DESIGN_PATH,
  };
}

/** Build Hermes-shaped request object (local only — not sent over network). */
export function createAgentOpsHermesRequest(input: AgentOpsHermesAdapterRunInput): AgentOpsHermesAdapterRequest {
  const mode = mapIntentToHermesMode(input.intent);
  return {
    requestId: newRequestId(),
    mode,
    issueContext: {
      issueCode: input.issueCode,
      title: input.title ?? undefined,
      severity: input.severity ?? undefined,
      category: input.category ?? undefined,
      route: input.route ?? null,
      module: input.module ?? null,
      summary: input.issueSummary,
      evidence: input.evidence,
      likelyRootCause: input.likelyRootCause ?? null,
      recommendedFixStrategy: input.recommendedFixStrategy ?? null,
    },
    agentContext: {
      agentId: input.reportingAgent !== "Not linked yet" ? input.reportingAgent : null,
      relevantMemory: input.agentMemory,
    },
    promptContext: {
      currentPrompt: input.cursorPrompt,
      promptStyleStandard: PROMPT_STYLE_STANDARD_PATH,
      approvedPromptRequired: true,
    },
    lifecycleContext: {
      executionState: input.executionState,
      latestCursorReport: input.latestCursorReport ?? null,
      verificationStatus: input.verificationStatus ?? null,
      timelineSummary: input.timeline,
    },
    safety: {
      stagingOnly: true,
      noAutoCursor: true,
      noProduction: true,
      noSecrets: true,
      ownerApprovalRequired: true,
      environment: "staging",
    },
    requestedOutput: requestedOutputForMode(mode),
  };
}

function mockInputFromRunInput(input: AgentOpsHermesAdapterRunInput) {
  return {
    issueCode: input.issueCode,
    question: input.question,
    intent: input.intent,
    issueSummary: input.issueSummary,
    evidence: input.evidence,
    fixPlan: input.fixPlan,
    cursorPrompt: input.cursorPrompt,
    executionState: input.executionState,
    reportingAgent: input.reportingAgent,
    agentMemory: input.agentMemory,
    timeline: input.timeline,
    route: input.route,
    category: input.category,
    severity: input.severity,
    module: input.module,
    likelyRootCause: input.likelyRootCause,
    recommendedFixStrategy: input.recommendedFixStrategy,
  };
}

/**
 * Run Hermes adapter async — calls /api/agentops/hermes when runtime active.
 */
export async function runAgentOpsHermesAdapterAsync(
  input: AgentOpsHermesAdapterRunInput,
  systemPrompt?: string,
): Promise<AgentOpsHermesAdapterResult> {
  const request = createAgentOpsHermesRequest(input);

  if (!isRuntimeActive()) {
    return runMockFallback(request, input, ["staging_only", "advisory_only", "no_auto_cursor"]);
  }

  try {
    const response = await fetch("/api/agentops/hermes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requestId: request.requestId,
        mode: request.mode,
        question: input.question,
        systemPrompt,
        issueContext: request.issueContext,
        model: input.model ?? undefined,
      }),
    });

    const payload = (await response.json()) as AgentOpsHermesAdapterResult & { error?: string };

    if (response.ok && payload.source === "hermes_runtime" && payload.response) {
      return {
        source: "hermes_runtime",
        hermesRuntimeCalled: true,
        shouldFallbackToMock: false,
        requestId: payload.requestId ?? request.requestId,
        mode: payload.mode ?? request.mode,
        response: payload.response,
        promptSuggestions: payload.promptSuggestions ?? "",
        riskNotes: payload.riskNotes ?? "",
        nextRecommendedAction: payload.nextRecommendedAction ?? "",
        confidence: payload.confidence ?? "medium",
        limitations: payload.limitations ?? "Hermes advisory via server proxy.",
        safetyFlags: payload.safetyFlags ?? ["staging_only", "hermes_runtime"],
      };
    }

    return runMockFallback(request, input, [
      "hermes_fallback",
      payload.error ?? `HTTP ${response.status}`,
    ]);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return runMockFallback(request, input, ["hermes_network_error", message]);
  }
}

/**
 * Run Hermes adapter — sync mock fallback when async path not used.
 */
export function runAgentOpsHermesAdapter(input: AgentOpsHermesAdapterRunInput): AgentOpsHermesAdapterResult {
  const request = createAgentOpsHermesRequest(input);
  return runMockFallback(request, input, ["staging_only", "advisory_only", "no_auto_cursor"]);
}

function runMockFallback(
  request: AgentOpsHermesAdapterRequest,
  input: AgentOpsHermesAdapterRunInput,
  safetyFlags: string[],
): AgentOpsHermesAdapterResult {
  const mock = generateAgentOpsMockResponse(mockInputFromRunInput(input));

  return {
    source: "mock_fallback",
    hermesRuntimeCalled: false,
    shouldFallbackToMock: true,
    requestId: request.requestId,
    mode: request.mode,
    response: mock.response,
    promptSuggestions: mock.suggestedPromptChanges,
    riskNotes: mock.riskNotes,
    nextRecommendedAction: mock.nextRecommendedAction,
    confidence: mock.confidence,
    limitations: mock.limitations,
    safetyFlags,
  };
}

/** Map adapter mode back to owner-feedback message type. */
export function mapHermesModeToAgentMessageType(
  mode: AgentOpsHermesAdapterMode,
): AgentOpsIssueAgentMessageType {
  switch (mode) {
    case "prompt_refinement":
      return "prompt_improvement_suggestion";
    case "risk_review":
      return "risk_note";
    case "next_step_recommendation":
      return "next_step_recommendation";
    case "issue_clarification":
    default:
      return "agent_clarification";
  }
}
