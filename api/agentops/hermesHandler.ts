/**
 * Server-side Hermes adapter proxy → Ollama (staging only).
 * Issue workspace uses this route; Council/Agent use /api/agentops/llm.
 */

import {
  callAgentOpsLlmChat,
  formatAgentOpsLlmProviderLabel,
  getAgentOpsLlmProviderModel,
  isAgentOpsLlmProviderConfigured,
  probeAgentOpsLlmTransport,
  readAgentOpsLlmProvider,
  type AgentOpsLlmProviderId,
} from "./llmProvider";
import {
  isAgentOpsLlmRuntimeEnabled,
  isAgentOpsProductionBlocked,
  jsonResponse,
  readAgentOpsLlmRuntimeGateStatus,
  readHermesOwnerApprovedStatus,
  readHermesRuntimeGateStatus,
  readOptionalInternalSecret,
  readServerEnv,
  type AgentOpsEnvGateStatus,
} from "./ollamaProxy";

export type AgentOpsHermesRuntimeHealthMode = "advisory_transport" | "blocked" | "unavailable";

export interface AgentOpsHermesRuntimeHealthPayload {
  ok: boolean;
  mode: AgentOpsHermesRuntimeHealthMode;
  provider: AgentOpsLlmProviderId;
  providerConfigured: boolean;
  providerModel: string;
  runtimeGate: AgentOpsEnvGateStatus;
  ownerApproved: AgentOpsEnvGateStatus;
  llmRuntimeGate: AgentOpsEnvGateStatus;
  coordinatorActive: false;
  transportReachable: boolean;
  hermesEndpointReachable: boolean;
  llmFallbackReachable: boolean;
  fallbackAvailable: boolean;
  productionBlocked: boolean;
  writesBlocked: true;
  sotWritesBlocked: true;
  advisoryOnly: true;
  message: string;
  checkedAt: string;
}

function readClientHermesTransportFlagStatus(): AgentOpsEnvGateStatus {
  const value = readServerEnv("VITE_AGENTOPS_HERMES_ENABLED");
  if (value === "true") return "enabled";
  if (value === "false") return "disabled";
  return "unknown";
}

/** Safe public health payload for GET /api/agentops/hermes — no secrets or internal URLs. */
export async function buildAgentOpsHermesRuntimeHealthPayload(): Promise<AgentOpsHermesRuntimeHealthPayload> {
  const checkedAt = new Date().toISOString();
  const productionBlocked = isAgentOpsProductionBlocked();
  const runtimeGate = readHermesRuntimeGateStatus();
  const ownerApproved = readHermesOwnerApprovedStatus();
  const llmRuntimeGate = readAgentOpsLlmRuntimeGateStatus();
  const runtimeEnabled = isAgentOpsLlmRuntimeEnabled();
  const provider = readAgentOpsLlmProvider();
  const providerConfigured = isAgentOpsLlmProviderConfigured();
  const providerModel = getAgentOpsLlmProviderModel();
  const transport = providerConfigured
    ? await probeAgentOpsLlmTransport()
    : { reachable: false, error: "LLM provider not configured." };

  const hermesEndpointReachable = true;
  const gatesOpen =
    !productionBlocked &&
    runtimeGate !== "disabled" &&
    ownerApproved !== "disabled" &&
    runtimeEnabled;
  const transportReachable = gatesOpen && transport.reachable;
  const llmFallbackReachable = gatesOpen && transport.reachable;

  let mode: AgentOpsHermesRuntimeHealthMode = "unavailable";
  let message = "Hermes transport health unavailable.";
  let ok = false;

  if (productionBlocked) {
    mode = "blocked";
    message = "Production activation blocked unless separately approved.";
  } else if (runtimeGate === "disabled" || ownerApproved === "disabled") {
    mode = "blocked";
    message = "Server runtime gate or owner approval is disabled.";
  } else if (!runtimeEnabled) {
    mode = "blocked";
    message = "Server LLM/Hermes runtime gate is not open.";
  } else if (!transport.reachable) {
    mode = "unavailable";
    message =
      transport.error ??
      `${formatAgentOpsLlmProviderLabel(provider)} transport not reachable.`;
  } else {
    mode = "advisory_transport";
    message = "Advisory runtime reachable. Coordinator not active.";
    ok = true;
  }

  return {
    ok,
    mode,
    provider,
    providerConfigured,
    providerModel,
    runtimeGate,
    ownerApproved,
    llmRuntimeGate,
    coordinatorActive: false,
    transportReachable,
    hermesEndpointReachable,
    llmFallbackReachable,
    fallbackAvailable: true,
    productionBlocked,
    writesBlocked: true,
    sotWritesBlocked: true,
    advisoryOnly: true,
    message,
    checkedAt,
  };
}

type HermesMode =
  | "issue_clarification"
  | "prompt_refinement"
  | "risk_review"
  | "next_step_recommendation"
  | "cursor_report_synthesis"
  | "archive_lesson_extraction";

interface HermesRunBody {
  requestId?: string;
  mode?: HermesMode;
  question?: string;
  systemPrompt?: string;
  issueContext?: Record<string, unknown>;
  model?: string | null;
}

const HERMES_ADVISORY_SAFETY_LINES = [
  "Advisory only — no memory writes, no source-of-truth writes, no registry writes.",
  "No tool execution or MCP tasks. Hermes coordinator is not fully active.",
];

function buildDefaultSystemPrompt(body: HermesRunBody): string {
  if (body.systemPrompt?.trim()) {
    return `${body.systemPrompt.trim()}\n\n${HERMES_ADVISORY_SAFETY_LINES.join(" ")}`;
  }
  const ctx = body.issueContext ?? {};
  const lines = [
    "You are a Hermes advisory QA agent for AgentOps (staging only).",
    "Never claim to have executed Cursor, changed production, or written memory automatically.",
    "Do not expose secrets.",
    ...HERMES_ADVISORY_SAFETY_LINES,
    `Mode: ${body.mode ?? "issue_clarification"}`,
  ];
  for (const [key, value] of Object.entries(ctx)) {
    if (value == null || value === "") continue;
    lines.push(`${key}: ${typeof value === "string" ? value : JSON.stringify(value)}`);
  }
  return lines.join("\n");
}

export async function handleAgentOpsHermesRequest(request: Request): Promise<Response> {
  if (request.method === "GET") {
    const health = await buildAgentOpsHermesRuntimeHealthPayload();
    const clientTransportFlag = readClientHermesTransportFlagStatus();

    return jsonResponse({
      ...health,
      stagingOnly: true,
      appCallable: true,
      clientTransportFlag,
      /** @deprecated Use transportReachable — kept for older probes */
      runtimeActive: health.transportReachable,
      ollamaReachable: health.transportReachable,
      endpointConfigured: health.providerConfigured,
    });
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  if (!readOptionalInternalSecret(request)) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  if (!isAgentOpsLlmRuntimeEnabled()) {
    return jsonResponse(
      {
        source: "unavailable",
        error: "Hermes runtime inactive. Set HERMES_RUNTIME_ACTIVE=true and HERMES_OWNER_APPROVED=true.",
      },
      503,
    );
  }

  let body: HermesRunBody;
  try {
    body = (await request.json()) as HermesRunBody;
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const question = body.question?.trim();
  if (!question) {
    return jsonResponse({ error: "question is required" }, 400);
  }

  const systemPrompt = buildDefaultSystemPrompt(body);
  const llmResult = await callAgentOpsLlmChat(systemPrompt, question, body.model);
  if (!llmResult.ok) {
    return jsonResponse(
      {
        source: "mock_fallback",
        hermesRuntimeCalled: true,
        shouldFallbackToMock: true,
        error: llmResult.error,
        requestId: body.requestId ?? `hermes-req-${Date.now()}`,
      },
      502,
    );
  }

  return jsonResponse({
    source: "hermes_runtime",
    hermesRuntimeCalled: true,
    shouldFallbackToMock: false,
    requestId: body.requestId ?? `hermes-req-${Date.now()}`,
    mode: body.mode ?? "issue_clarification",
    response: llmResult.content,
    promptSuggestions: "",
    riskNotes: "",
    nextRecommendedAction: "",
    confidence: "medium",
    limitations: `Hermes advisory via server ${formatAgentOpsLlmProviderLabel(llmResult.provider)} proxy (staging).`,
    safetyFlags: ["staging_only", "advisory_only", "no_auto_cursor", "memory_approval_required"],
  });
}
