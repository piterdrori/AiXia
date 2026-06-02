/**
 * Server-side Hermes adapter proxy → Ollama (staging only).
 * Issue workspace uses this route; Council/Agent use /api/agentops/llm.
 */

import {
  callOllamaChat,
  getAgentOpsOllamaConfig,
  isAgentOpsLlmRuntimeEnabled,
  jsonResponse,
  readOptionalInternalSecret,
} from "./ollamaProxy";

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

function buildDefaultSystemPrompt(body: HermesRunBody): string {
  if (body.systemPrompt?.trim()) return body.systemPrompt.trim();
  const ctx = body.issueContext ?? {};
  const lines = [
    "You are a Hermes advisory QA agent for AgentOps (staging only).",
    "Never claim to have executed Cursor, changed production, or written memory automatically.",
    "Do not expose secrets.",
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
    const runtimeActive = isAgentOpsLlmRuntimeEnabled();
    const config = getAgentOpsOllamaConfig();

    return jsonResponse({
      runtimeActive,
      appCallable: true,
      endpointConfigured: Boolean(config.baseUrl),
      ollamaReachable: null,
      stagingOnly: true,
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
  const llmResult = await callOllamaChat(systemPrompt, question, body.model);
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
    limitations: "Hermes advisory via server Ollama proxy (staging).",
    safetyFlags: ["staging_only", "advisory_only", "no_auto_cursor", "memory_approval_required"],
  });
}
