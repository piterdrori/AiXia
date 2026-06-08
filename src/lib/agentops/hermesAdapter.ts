import { generateAgentOpsMockResponse } from "./agentResponseMock";
import type {
  AgentOpsAgentMockIntent,
  AgentOpsHermesAdapterMode,
  AgentOpsHermesAdapterRequest,
  AgentOpsHermesAdapterResult,
  AgentOpsHermesAdapterRunInput,
  AgentOpsHermesAdapterStatus,
  AgentOpsHermesEnvGateStatus,
  AgentOpsHermesReadinessGate,
  AgentOpsHermesEndpointSource,
  AgentOpsHermesRuntimeHealth,
  AgentOpsHermesRuntimeHealthMode,
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

function normalizeGateStatus(value: unknown): AgentOpsHermesEnvGateStatus {
  if (value === "enabled" || value === "disabled" || value === "unknown") return value;
  return "unknown";
}

function normalizeHealthMode(value: unknown): AgentOpsHermesRuntimeHealthMode {
  if (value === "advisory_transport" || value === "blocked" || value === "unavailable") return value;
  return "unavailable";
}

function unavailableHermesRuntimeHealth(message: string, loadError?: string): AgentOpsHermesRuntimeHealth {
  const checkedAt = new Date().toISOString();
  return {
    status: "unavailable",
    ok: false,
    mode: "unavailable",
    runtimeGate: "unknown",
    ownerApproved: "unknown",
    llmRuntimeGate: "unknown",
    clientTransportEnabled: isClientHermesEnabled(),
    coordinatorActive: false,
    transportReachable: false,
    hermesEndpointReachable: false,
    llmFallbackReachable: false,
    fallbackAvailable: true,
    productionBlocked: false,
    writesBlocked: true,
    sotWritesBlocked: true,
    advisoryOnly: true,
    message,
    checkedAt,
    loadError,
  };
}

const HERMES_ADVISORY_ACTIVATION_TEST_PROMPT =
  "For activation test only, reply with exactly: Hermes advisory runtime reachable.\nDo not mention memory updates.";

const HERMES_ADVISORY_CONTEXT_TEST_PROMPT =
  "Using the read-only AiXia context, summarize in 3 bullets what Hermes can safely do today and what it must not do.";

export interface AgentOpsHermesAdvisoryActivationProbe {
  ok: boolean;
  checkedAt: string;
  response?: string;
  error?: string;
  source?: string;
  httpStatus?: number;
  contextIncluded?: boolean;
  coordinatorActive?: boolean;
  writesBlocked?: boolean;
  advisoryOnly?: boolean;
  safetyFlags?: string[];
}

export interface AgentOpsHermesAdvisoryProbeOptions {
  includeContext?: boolean;
  question?: string;
}

/** Workflow 1 — Issue Workspace advisory instructions (read-only, no writes). */
export const HERMES_ISSUE_ADVISORY_INSTRUCTIONS = `You are Hermes in advisory mode only.

Review the current AgentOps issue using the provided issue context and optional read-only AiXia context.

Return:
1. What is wrong
2. Why it matters
3. Risk level
4. What Piter should ask Cursor to do next
5. What must not be touched
6. Whether this is safe to proceed as a Cursor prompt

Do not mark the issue fixed.
Do not verify the issue.
Do not write memory.
Do not update source-of-truth.
Do not execute tools.
Do not claim coordinator activation.`;

/** Workflow 2 — Issue Workspace Cursor prompt review (read-only, no writes). */
export const HERMES_ISSUE_CURSOR_PROMPT_REVIEW_INSTRUCTIONS = `You are Hermes in advisory mode only.

Review the proposed Cursor prompt for this AgentOps issue.

Return:
1. Safety verdict: safe / needs edits / unsafe
2. Missing context
3. Risky instructions to remove
4. Improved Cursor prompt
5. Files/scope Cursor may touch
6. Files/scope Cursor must not touch
7. Validation commands/checks
8. Stop condition

Rules:
- Do not run Cursor.
- Do not claim files were changed.
- Do not mark the issue fixed.
- Do not verify the issue.
- Do not write memory.
- Do not update source-of-truth.
- Do not execute tools.
- Preserve existing business logic unless issue explicitly requires logic changes.

When drafting the improved Cursor prompt, include these guardrails for Cursor:
- Use exact files and exact sections when possible.
- Do not touch business logic unless explicitly required.
- Do not touch Supabase logic, API calls, routing, permissions, validation, handlers, data structure, or backend behavior for design-only issues.
- Preserve existing logic exactly.
- Reuse existing AiXia shared standards/components/CSS.
- Do not create new page-local design standards unless absolutely necessary.
- Do not write source-of-truth files without Piter approval.
- No production changes.
- No unrelated cleanup.
- Validate with lint/build or specific route QA as appropriate.
- Stop and report if scope expands.

If no proposed Cursor prompt is provided in issueContext, generate a new safe Cursor prompt from available issue context and clearly state it was generated from available context only.`;

/** Workflow 3 — Fix/build/QA report verification review (read-only, no writes). */
export const HERMES_ISSUE_FIX_REPORT_REVIEW_INSTRUCTIONS = `You are Hermes in advisory mode only.

Review the pasted fix/build/QA report for this AgentOps issue.

Return:
1. Verification verdict:
   - proven fixed
   - likely fixed but needs QA
   - insufficient evidence
   - not fixed / risky
2. Evidence found in the report
3. Evidence missing
4. Risk of accepting this as fixed
5. QA / validation steps needed
6. Whether Piter should enable the Fixed button
7. What Cursor/build agent should do next if not enough evidence
8. What must not be changed or assumed

Rules:
- Do not mark the issue fixed.
- Do not verify the issue.
- Do not change issue status.
- Do not write memory.
- Do not update source-of-truth.
- Do not execute tools.
- Do not run QA.
- Do not claim files were changed unless the pasted report proves it.`;

export interface AgentOpsHermesIssueAdvisoryContext {
  issueCode: string;
  title?: string;
  module?: string | null;
  route?: string | null;
  severity?: string | null;
  status?: string | null;
  summary?: string;
  evidence?: string;
  proposedCursorPrompt?: string;
  likelyRootCause?: string | null;
  recommendedFixStrategy?: string | null;
  executionState?: string;
  /** Workflow 3 — pasted fix/build/QA report (transient; not persisted). */
  fixReport?: string;
}

/**
 * Future automation candidate shape — client/types only today.
 * Intended path: Cursor/build agent report → Hermes verdict → Piter approval gate.
 * Not persisted or wired in Workflow 3.
 */
export type AgentOpsHermesFixReportReviewAutomationCandidate = {
  fixReportSource: "manual_paste" | "cursor_webhook" | "build_agent";
  reportTimestamp?: string;
  buildRunId?: string;
  changedFiles?: string[];
  validationCommands?: string[];
  verdict?:
    | "proven_fixed"
    | "likely_fixed_needs_qa"
    | "insufficient_evidence"
    | "not_fixed";
  confidence?: number;
  requiresHumanApproval: true;
};

export interface AgentOpsHermesIssueAdvisoryInput {
  issueContext: AgentOpsHermesIssueAdvisoryContext;
  /** Default true when omitted. */
  includeContext?: boolean;
}

export interface AgentOpsHermesIssueFixReportReviewInput {
  issueContext: AgentOpsHermesIssueAdvisoryContext & { fixReport: string };
  /** Default true when omitted. */
  includeContext?: boolean;
}

export interface AgentOpsHermesIssueAdvisoryResult {
  ok: boolean;
  checkedAt: string;
  response?: string;
  error?: string;
  source?: string;
  contextIncluded?: boolean;
  httpStatus?: number;
  safetyFlags?: string[];
  limitations?: string;
}

/**
 * Staging advisory activation probe — POST /api/agentops/hermes (no memory/SOT writes).
 * Fails with 401 when HERMES_INTERNAL_SECRET is set and header is not supplied.
 */
export async function probeAgentOpsHermesAdvisoryRuntime(
  options?: AgentOpsHermesAdvisoryProbeOptions,
): Promise<AgentOpsHermesAdvisoryActivationProbe> {
  const checkedAt = new Date().toISOString();
  const includeContext = options?.includeContext === true;
  const question =
    options?.question?.trim() ??
    (includeContext ? HERMES_ADVISORY_CONTEXT_TEST_PROMPT : HERMES_ADVISORY_ACTIVATION_TEST_PROMPT);

  try {
    const response = await fetch("/api/agentops/hermes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "issue_clarification",
        includeContext,
        question,
      }),
    });

    const payload = (await response.json()) as {
      response?: string;
      error?: string;
      source?: string;
      contextIncluded?: boolean;
      coordinatorActive?: boolean;
      writesBlocked?: boolean;
      advisoryOnly?: boolean;
      safetyFlags?: string[];
    };

    if (response.ok && payload.source === "hermes_runtime" && payload.response?.trim()) {
      return {
        ok: true,
        checkedAt,
        response: payload.response.trim(),
        source: payload.source,
        httpStatus: response.status,
        contextIncluded: payload.contextIncluded === true,
        coordinatorActive: payload.coordinatorActive === true,
        writesBlocked: payload.writesBlocked !== false,
        advisoryOnly: payload.advisoryOnly !== false,
        safetyFlags: Array.isArray(payload.safetyFlags)
          ? payload.safetyFlags.filter((flag): flag is string => typeof flag === "string")
          : undefined,
      };
    }

    return {
      ok: false,
      checkedAt,
      error: payload.error ?? `Hermes advisory probe failed (HTTP ${response.status}).`,
      source: payload.source,
      httpStatus: response.status,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, checkedAt, error: message };
  }
}

function buildHermesIssueContextPayload(
  issueContext: AgentOpsHermesIssueAdvisoryContext,
): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(issueContext)) {
    if (value == null || value === "") continue;
    payload[key] = value;
  }
  return payload;
}

async function postHermesIssueClarificationRequest(params: {
  includeContext: boolean;
  question: string;
  issueContext: Record<string, unknown>;
  failureLabel: string;
}): Promise<AgentOpsHermesIssueAdvisoryResult> {
  const checkedAt = new Date().toISOString();

  try {
    const response = await fetch("/api/agentops/hermes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "issue_clarification",
        includeContext: params.includeContext,
        question: params.question,
        issueContext: params.issueContext,
      }),
    });

    const payload = (await response.json()) as {
      response?: string;
      error?: string;
      source?: string;
      contextIncluded?: boolean;
      safetyFlags?: string[];
      limitations?: string;
    };

    if (response.ok && payload.source === "hermes_runtime" && payload.response?.trim()) {
      return {
        ok: true,
        checkedAt,
        response: payload.response.trim(),
        source: payload.source,
        contextIncluded: payload.contextIncluded === true,
        httpStatus: response.status,
        safetyFlags: payload.safetyFlags,
        limitations: payload.limitations,
      };
    }

    return {
      ok: false,
      checkedAt,
      error:
        payload.error ??
        (payload.source === "mock_fallback"
          ? "Hermes advisory runtime unavailable (provider fallback)."
          : `${params.failureLabel} (HTTP ${response.status}).`),
      source: payload.source,
      httpStatus: response.status,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, checkedAt, error: message };
  }
}

/**
 * Best-effort extraction of improved Cursor prompt text from a Hermes review response.
 * Returns null when no dedicated prompt block is found.
 */
export function extractImprovedCursorPromptFromHermesReview(text: string): string | null {
  const fencedPatterns = [
    /(?:####?\s*4\.?\s*Improved Cursor prompt[\s\S]*?```(?:\w+)?\n([\s\S]*?)```)/i,
    /(?:Improved Cursor prompt[:\s]*\n```(?:\w+)?\n([\s\S]*?)```)/i,
    /```(?:cursor|markdown|text)?\n([\s\S]*?)```/i,
  ];

  for (const pattern of fencedPatterns) {
    const match = text.match(pattern);
    if (match?.[1]?.trim()) return match[1].trim();
  }

  const sectionMatch = text.match(
    /(?:####?\s*4\.?\s*Improved Cursor prompt[:\s]*\n)([\s\S]*?)(?=\n####|\n#{1,3}\s|\n\d+\.\s|$)/i,
  );
  if (sectionMatch?.[1]?.trim() && sectionMatch[1].trim().length > 40) {
    return sectionMatch[1].trim();
  }

  return null;
}

/**
 * Workflow 1 — manual Issue Workspace advisory (POST /api/agentops/hermes).
 * No persistence, no mock fallback on failure, no issue status changes.
 */
export async function requestAgentOpsHermesIssueAdvisory(
  input: AgentOpsHermesIssueAdvisoryInput,
): Promise<AgentOpsHermesIssueAdvisoryResult> {
  const includeContext = input.includeContext !== false;
  const issueContextPayload = buildHermesIssueContextPayload(input.issueContext);

  const question = [
    HERMES_ISSUE_ADVISORY_INSTRUCTIONS,
    "",
    `Issue code: ${input.issueContext.issueCode}`,
    "Provide a concise advisory review for Piter.",
  ].join("\n");

  return postHermesIssueClarificationRequest({
    includeContext,
    question,
    issueContext: issueContextPayload,
    failureLabel: "Hermes advisory request failed",
  });
}

/**
 * Workflow 2 — manual Cursor prompt review (POST /api/agentops/hermes).
 * Transient client-side advice only; no persistence or issue mutations.
 */
export async function requestAgentOpsHermesIssueCursorPromptReview(
  input: AgentOpsHermesIssueAdvisoryInput,
): Promise<AgentOpsHermesIssueAdvisoryResult> {
  const includeContext = input.includeContext !== false;
  const issueContextPayload = buildHermesIssueContextPayload(input.issueContext);
  const hasProposedPrompt = Boolean(input.issueContext.proposedCursorPrompt?.trim());

  const question = [
    HERMES_ISSUE_CURSOR_PROMPT_REVIEW_INSTRUCTIONS,
    "",
    `Issue code: ${input.issueContext.issueCode}`,
    hasProposedPrompt
      ? "Review and improve the proposed Cursor prompt supplied in issueContext.proposedCursorPrompt."
      : "No proposed Cursor prompt was supplied. Generate a new safe Cursor prompt from available issue context and state that clearly.",
    "Return the full structured review for Piter.",
  ].join("\n");

  return postHermesIssueClarificationRequest({
    includeContext,
    question,
    issueContext: issueContextPayload,
    failureLabel: "Hermes Cursor prompt review failed",
  });
}

/**
 * Workflow 3 — manual fix/build/QA report verification review (POST /api/agentops/hermes).
 * Recommendation only; no status mutation, verification, or persistence.
 */
export async function requestAgentOpsHermesIssueFixReportReview(
  input: AgentOpsHermesIssueFixReportReviewInput,
): Promise<AgentOpsHermesIssueAdvisoryResult> {
  const includeContext = input.includeContext !== false;
  const fixReport = input.issueContext.fixReport.trim();
  if (!fixReport) {
    return {
      ok: false,
      checkedAt: new Date().toISOString(),
      error: "Paste a fix/build/QA report before requesting review.",
    };
  }

  const issueContextPayload = buildHermesIssueContextPayload({
    ...input.issueContext,
    fixReport,
  });

  const question = [
    HERMES_ISSUE_FIX_REPORT_REVIEW_INSTRUCTIONS,
    "",
    `Issue code: ${input.issueContext.issueCode}`,
    "Review the pasted fix report supplied in issueContext.fixReport.",
    "Return the full structured verification recommendation for Piter.",
    "Recommendation only — do not mark fixed or change issue status.",
  ].join("\n");

  return postHermesIssueClarificationRequest({
    includeContext,
    question,
    issueContext: issueContextPayload,
    failureLabel: "Hermes fix report review failed",
  });
}

/**
 * Read-only Hermes runtime health (A1) — probes safe GET /api/agentops/hermes.
 * Transport truth only; coordinator is never active.
 */
export async function getAgentOpsHermesRuntimeHealth(): Promise<AgentOpsHermesRuntimeHealth> {
  try {
    const response = await fetch("/api/agentops/hermes", { method: "GET" });
    let payload: Record<string, unknown> = {};
    try {
      payload = (await response.json()) as Record<string, unknown>;
    } catch {
      return unavailableHermesRuntimeHealth(
        "Health unavailable — fallback only.",
        `Invalid health response (HTTP ${response.status}).`,
      );
    }

    if (!response.ok) {
      return unavailableHermesRuntimeHealth(
        typeof payload.message === "string" ? payload.message : "Health unavailable — fallback only.",
        `Hermes health HTTP ${response.status}`,
      );
    }

    const mode = normalizeHealthMode(payload.mode);
    const ok = Boolean(payload.ok);
    const status: AgentOpsHermesRuntimeHealth["status"] =
      mode === "advisory_transport" && ok ? "ok" : mode === "blocked" ? "blocked" : "unavailable";

    const clientFlag = payload.clientTransportFlag;
    const clientTransportEnabled =
      clientFlag === "enabled" || clientFlag === "disabled"
        ? clientFlag === "enabled"
        : isClientHermesEnabled();

    return {
      status,
      ok,
      mode,
      provider:
        payload.provider === "doubao_ark" ? "doubao_ark" : payload.provider === "ollama" ? "ollama" : undefined,
      providerConfigured:
        typeof payload.providerConfigured === "boolean" ? payload.providerConfigured : undefined,
      providerModel: typeof payload.providerModel === "string" ? payload.providerModel : undefined,
      runtimeGate: normalizeGateStatus(payload.runtimeGate),
      ownerApproved: normalizeGateStatus(payload.ownerApproved),
      llmRuntimeGate: normalizeGateStatus(payload.llmRuntimeGate),
      clientTransportEnabled,
      coordinatorActive: payload.coordinatorActive === true,
      transportReachable: Boolean(payload.transportReachable),
      hermesEndpointReachable: Boolean(payload.hermesEndpointReachable ?? true),
      llmFallbackReachable: Boolean(payload.llmFallbackReachable),
      fallbackAvailable: payload.fallbackAvailable !== false,
      productionBlocked: Boolean(payload.productionBlocked),
      writesBlocked: true,
      sotWritesBlocked: true,
      advisoryOnly: true,
      message:
        typeof payload.message === "string"
          ? payload.message
          : "Hermes transport health loaded.",
      checkedAt: typeof payload.checkedAt === "string" ? payload.checkedAt : new Date().toISOString(),
      contextAssemblerAvailable:
        typeof payload.contextAssemblerAvailable === "boolean"
          ? payload.contextAssemblerAvailable
          : undefined,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return unavailableHermesRuntimeHealth("Health unavailable — fallback only.", message);
  }
}

function stagingHealthFromRuntimeHealth(health: AgentOpsHermesRuntimeHealth): AgentOpsHermesStagingHealthCheck {
  const blockers: string[] = [];
  if (health.productionBlocked) {
    blockers.push("Production activation blocked unless separately approved.");
  }
  if (health.runtimeGate === "disabled") {
    blockers.push("HERMES_RUNTIME_ACTIVE is disabled on server.");
  }
  if (health.ownerApproved === "disabled") {
    blockers.push("HERMES_OWNER_APPROVED is disabled on server.");
  }
  if (!health.clientTransportEnabled) {
    blockers.push("Client VITE_AGENTOPS_HERMES_ENABLED is false.");
  }
  if (!health.transportReachable) {
    blockers.push(health.message);
  }
  if (health.loadError) {
    blockers.push(health.loadError);
  }

  let status: AgentOpsHermesStagingHealthCheck["status"] = "not_configured";
  if (health.status === "ok" && health.transportReachable) {
    status = "ready";
  } else if (health.status === "blocked" || health.productionBlocked) {
    status = "blocked_by_gate";
  } else if (health.hermesEndpointReachable) {
    status = "unhealthy";
  }

  return {
    checkId: newHealthCheckId(),
    status,
    endpointReachable: health.transportReachable,
    runtimeAllowed: health.transportReachable,
    fallbackAvailable: health.fallbackAvailable,
    latencyMs: null,
    checkedAt: health.checkedAt,
    blockers,
    nextStep: health.message,
    healthCheckContractPath: HERMES_HEALTH_CHECK_CONTRACT_PATH,
  };
}

/**
 * Staging Hermes health check — uses server health payload (A1 gate alignment).
 */
export async function checkHermesStagingHealthAsync(): Promise<AgentOpsHermesStagingHealthCheck> {
  const health = await getAgentOpsHermesRuntimeHealth();
  return stagingHealthFromRuntimeHealth(health);
}

/** Sync stub for initial render — does not claim transport ready (use Refresh health). */
export function checkHermesStagingHealth(): AgentOpsHermesStagingHealthCheck {
  const checkedAt = new Date().toISOString();
  const clientEnabled = isClientHermesEnabled();
  const blockers: string[] = [
    "Live transport status not loaded — use Refresh health on the Hermes page.",
  ];
  if (!clientEnabled) {
    blockers.push("Client VITE_AGENTOPS_HERMES_ENABLED is false.");
  }

  return {
    checkId: newHealthCheckId(),
    status: "not_configured",
    endpointReachable: false,
    runtimeAllowed: false,
    fallbackAvailable: true,
    latencyMs: null,
    checkedAt,
    blockers,
    nextStep: "Open Hermes Runtime Health and click Refresh health for server gate truth.",
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
