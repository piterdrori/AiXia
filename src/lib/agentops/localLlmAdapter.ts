import { generateAgentOpsMockResponse } from "./agentResponseMock";
import { buildAgentOpsAgentSystemPrompt } from "./agentIdentityLoader";
import { appendAgentOpsGlobalApprovedMemoryPromptLines } from "./globalMemoryApprovedService";
import {
  mapIntentToHermesMode,
  runAgentOpsHermesAdapter,
  runAgentOpsHermesAdapterAsync,
} from "./hermesAdapter";
import type {
  AgentOpsHermesAdapterResult,
  AgentOpsHermesAdapterRunInput,
  AgentOpsLocalLlmApiStyle,
  AgentOpsLocalLlmChatRequest,
  AgentOpsLocalLlmChatResult,
  AgentOpsLocalLlmPerAgentResponse,
  AgentOpsLocalLlmProposedMemoryUpdate,
  AgentOpsLocalLlmStatus,
} from "./types";

const LOCAL_LLM_CONTRACT_PATH = "qa-agent/local-llm/local-llm-chat-contract.json";
const LOCAL_LLM_CONTRACT_VERSION = "phase-5-6-architecture-draft";
const DEFAULT_BASE_URL = "http://127.0.0.1:11434";
const DEFAULT_MODEL = "llama3.2";
const LLM_PROXY_PATH = "/api/agentops/llm";
const REQUEST_TIMEOUT_MS = 120_000;

let cachedReachability:
  | { checkedAt: number; reachable: boolean; error?: string }
  | null = null;

const MEMORY_INTENT_PATTERNS = [
  /\bremember\b/i,
  /\bfrom now on\b/i,
  /\balways use\b/i,
  /\bupdate (your|my|agent) memory\b/i,
  /\bapply this (rule|standard)\b/i,
  /\blearn this\b/i,
  /\bstore this in memory\b/i,
];

function readEnv(key: string): string | undefined {
  const value = import.meta.env[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function newRequestId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, "");
}

export function getAgentOpsLocalLlmConfig(): {
  enabled: boolean;
  baseUrl: string;
  model: string;
  apiStyle: AgentOpsLocalLlmApiStyle;
} {
  const enabledFlag = readEnv("VITE_AGENTOPS_LLM_ENABLED");
  const enabled =
    enabledFlag === "false" ? false : enabledFlag === "true" ? true : true;
  const baseUrl = normalizeBaseUrl(readEnv("VITE_AGENTOPS_LLM_BASE_URL") ?? DEFAULT_BASE_URL);
  const model = readEnv("VITE_AGENTOPS_LLM_MODEL") ?? DEFAULT_MODEL;
  const rawStyle = readEnv("VITE_AGENTOPS_LLM_API_STYLE") ?? "ollama";
  const apiStyle: AgentOpsLocalLlmApiStyle = rawStyle === "openai" ? "openai" : "ollama";
  return { enabled, baseUrl, model, apiStyle };
}

export function isAgentOpsLocalLlmEnabled(): boolean {
  return getAgentOpsLocalLlmConfig().enabled;
}

export function getAgentOpsLocalLlmStatus(): AgentOpsLocalLlmStatus {
  const config = getAgentOpsLocalLlmConfig();
  const blockers: string[] = [];
  if (!config.enabled) {
    blockers.push("Local LLM disabled (VITE_AGENTOPS_LLM_ENABLED=false).");
  }
  if (cachedReachability && !cachedReachability.reachable) {
    blockers.push(cachedReachability.error ?? "Ollama is not reachable via server proxy.");
  }

  return {
    runtimeActive:
      config.enabled &&
      (cachedReachability ? cachedReachability.reachable : true),
    configured: config.enabled,
    reachable: cachedReachability?.reachable ?? null,
    baseUrl: config.baseUrl,
    model: config.model,
    apiStyle: config.apiStyle,
    contractVersion: LOCAL_LLM_CONTRACT_VERSION,
    contractPath: LOCAL_LLM_CONTRACT_PATH,
    fallbackMode: "agentResponseMock",
    ownerApprovalRequired: true,
    stagingOnly: true,
    blockers,
  };
}

/** Probe /api/agentops/llm health and Ollama reachability (server-side). */
export async function probeAgentOpsLocalLlmRuntime(force = false): Promise<{
  reachable: boolean;
  runtimeActive: boolean;
  error?: string;
}> {
  if (!force && cachedReachability && Date.now() - cachedReachability.checkedAt < 30_000) {
    return {
      reachable: cachedReachability.reachable,
      runtimeActive: cachedReachability.reachable && isAgentOpsLocalLlmEnabled(),
      error: cachedReachability.error,
    };
  }

  if (!isAgentOpsLocalLlmEnabled()) {
    cachedReachability = {
      checkedAt: Date.now(),
      reachable: false,
      error: "Local LLM disabled in client env.",
    };
    return { reachable: false, runtimeActive: false, error: cachedReachability.error };
  }

  try {
    const response = await fetchWithTimeout(LLM_PROXY_PATH, { method: "GET" }, 8000);
    const payload = (await response.json()) as {
      runtimeActive?: boolean;
      ollamaReachable?: boolean | null;
      error?: string;
    };
    const configured = Boolean(response.ok && payload.runtimeActive);
    cachedReachability = {
      checkedAt: Date.now(),
      reachable: configured,
      error: configured ? undefined : payload.error ?? `LLM proxy HTTP ${response.status}`,
    };
    return {
      reachable: configured,
      runtimeActive: configured,
      error: cachedReachability.error,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    cachedReachability = { checkedAt: Date.now(), reachable: false, error: message };
    return { reachable: false, runtimeActive: false, error: message };
  }
}

export function detectAgentOpsMemoryIntent(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  return MEMORY_INTENT_PATTERNS.some((pattern) => pattern.test(trimmed));
}

function buildProposedMemoryUpdate(
  message: string,
  targetAgentId: string | null,
  targetScope: AgentOpsLocalLlmProposedMemoryUpdate["targetScope"],
): AgentOpsLocalLlmProposedMemoryUpdate {
  return {
    targetScope,
    targetAgentId,
    reason: "Owner message contains a remember/apply/learn intent.",
    proposedText: message.trim(),
  };
}

function stagingSafetyRules(): string {
  return [
    "Staging-only AgentOps assistant.",
    "Never claim to have executed Cursor, changed production, or written memory automatically.",
    "Do not expose secrets or environment variables.",
    "Be concise, practical, and evidence-aware.",
  ].join(" ");
}

function buildIssueSystemPrompt(request: AgentOpsLocalLlmChatRequest): string {
  const ctx = request.issueContext;
  const lines = [
    "You are the reporting QA agent for an AgentOps finding discussion chat.",
    "Answer only from your own professional specialty and the finding context below.",
    "Do not claim evidence you do not have. If evidence is thin, say so clearly.",
    "You may discuss risk, false-positive likelihood, solutions, verification, and prompt improvements.",
    "You must never change finding lifecycle state, execute prompts, open PRs, deploy, or edit production/main.",
    stagingSafetyRules(),
    `Finding / issue code: ${request.issueCode ?? "unknown"}`,
  ];
  if (ctx?.title) lines.push(`Title: ${ctx.title}`);
  if (ctx?.typeLabel) lines.push(`Type: ${ctx.typeLabel}`);
  if (ctx?.statusLabel) lines.push(`Owner status: ${ctx.statusLabel}`);
  if (ctx?.severity || ctx?.category) {
    lines.push(`Severity/category: ${ctx?.severity ?? "—"} · ${ctx?.category ?? "—"}`);
  }
  if (ctx?.route) lines.push(`Route: ${ctx.route}`);
  if (ctx?.module) lines.push(`Module: ${ctx.module}`);
  if (ctx?.summary) lines.push(`Explanation: ${ctx.summary}`);
  if (ctx?.whyItMatters) lines.push(`Why it matters: ${ctx.whyItMatters}`);
  if (ctx?.evidence) lines.push(`Evidence summary: ${ctx.evidence}`);
  if (ctx?.observedBehavior) lines.push(`Observed behavior: ${ctx.observedBehavior}`);
  if (ctx?.expectedBehavior) lines.push(`Expected behavior: ${ctx.expectedBehavior}`);
  if (ctx?.fixPlan) lines.push(`Suggested solution: ${ctx.fixPlan}`);
  if (ctx?.likelyRootCause) lines.push(`Likely root cause: ${ctx.likelyRootCause}`);
  if (ctx?.recommendedFixStrategy) {
    lines.push(`Recommended fix strategy: ${ctx.recommendedFixStrategy}`);
  }
  if (ctx?.executionState) lines.push(`Execution state: ${ctx.executionState}`);
  if (ctx?.cursorPrompt) lines.push(`Current suggested fix prompt: ${ctx.cursorPrompt}`);
  if (ctx?.originalPrompt) lines.push(`Original prompt: ${ctx.originalPrompt}`);
  if (ctx?.promptSafetyWarnings?.length) {
    lines.push(`Prompt safety warnings: ${ctx.promptSafetyWarnings.join(", ")}`);
  }
  if (ctx?.reportingAgent) lines.push(`Reporting agent: ${ctx.reportingAgent}`);
  if (ctx?.reportingAgentRole) lines.push(`Reporting agent role: ${ctx.reportingAgentRole}`);
  if (ctx?.supportingAgents?.length) {
    lines.push(`Supporting agents: ${ctx.supportingAgents.join(", ")}`);
  }
  appendAgentOpsGlobalApprovedMemoryPromptLines(lines, ctx?.globalApprovedMemory);
  if (ctx?.agentMemory?.length) {
    lines.push(`Agent memory:\n${ctx.agentMemory.map((item) => `- ${item}`).join("\n")}`);
  }
  if (ctx?.timeline?.length) {
    lines.push(`Timeline:\n${ctx.timeline.map((item) => `- ${item}`).join("\n")}`);
  }
  lines.push(`Owner intent: ${request.intent ?? "clarification"}`);
  if (ctx?.includePromptRewriteContract || request.intent === "prompt_improvement") {
    lines.push(
      [
        "When rewriting the suggested fix prompt, include a fenced ```promptRewrite JSON block with keys:",
        "explanation, rewritten_prompt, changes_made, safety_notes, validation_steps.",
        "Normal answers stay plain text.",
      ].join(" "),
    );
  }
  return lines.join("\n");
}

function buildIndividualAgentSystemPrompt(request: AgentOpsLocalLlmChatRequest): string {
  const agent = request.agentContext;
  if (!agent) {
    return ["You are an AgentOps synthetic QA agent.", stagingSafetyRules()].join("\n");
  }
  return `${buildAgentOpsAgentSystemPrompt(agent.agentId, {
    chatScope: "individual_agent",
    memorySnippets: agent.memorySnippets,
    roomContext: agent.currentFocus ?? undefined,
    enableCreativity: true,
  })}\nKeep responses under 220 words unless asked for detail.`;
}

function buildCouncilAgentSystemPrompt(
  agent: NonNullable<AgentOpsLocalLlmChatRequest["councilAgents"]>[number],
): string {
  return `${buildAgentOpsAgentSystemPrompt(agent.agentId, {
    chatScope: "council",
    memorySnippets: agent.memorySnippets,
    roomContext: `${agent.currentFocus ?? "No focus recorded yet."} · Status: ${agent.status.replaceAll("_", " ")}`,
    enableCreativity: true,
  })}\nKeep under 180 words.`;
}

function humanizeLlmProxyError(error: string): string {
  const config = getAgentOpsLocalLlmConfig();
  if (/fetch failed|ECONNREFUSED|Failed to fetch|network/i.test(error)) {
    return `Ollama is not reachable at ${config.baseUrl}. Start it with "ollama serve" and run "ollama pull ${config.model}".`;
  }
  return error;
}

function appendAttachmentContext(message: string, descriptions?: string[]): string {
  const items = (descriptions ?? []).map((item) => item.trim()).filter(Boolean);
  if (items.length === 0) return message;
  return `${message}\n\nAttachments:\n${items.map((item) => `- ${item}`).join("\n")}`;
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs = REQUEST_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    window.clearTimeout(timer);
  }
}

async function callLocalLlmChat(
  systemPrompt: string,
  userMessage: string,
  chatScope?: AgentOpsLocalLlmChatRequest["chatScope"],
  agentId?: string | null,
  model?: string | null,
): Promise<{ ok: true; content: string } | { ok: false; error: string }> {
  if (!isAgentOpsLocalLlmEnabled()) {
    return { ok: false, error: "Local LLM disabled." };
  }

  try {
    const response = await fetchWithTimeout(LLM_PROXY_PATH, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requestId: newRequestId("llm-proxy"),
        systemPrompt,
        userMessage,
        chatScope,
        agentId,
        model: model ?? undefined,
      }),
    });

    const payload = (await response.json()) as {
      source?: string;
      response?: string;
      error?: string;
    };

    // Server returns "local_llm" for Ollama and "cloud_llm" for Doubao Ark — both are live.
    const liveSource =
      payload.source === "local_llm" || payload.source === "cloud_llm";
    if (response.ok && liveSource && payload.response?.trim()) {
      cachedReachability = { checkedAt: Date.now(), reachable: true };
      return { ok: true, content: payload.response.trim() };
    }

    const error = humanizeLlmProxyError(payload.error ?? `LLM proxy HTTP ${response.status}`);
    cachedReachability = { checkedAt: Date.now(), reachable: false, error };
    return { ok: false, error };
  } catch (error) {
    const message = humanizeLlmProxyError(error instanceof Error ? error.message : String(error));
    cachedReachability = { checkedAt: Date.now(), reachable: false, error: message };
    return { ok: false, error: message };
  }
}

function councilFallbackResponse(
  agent: NonNullable<AgentOpsLocalLlmChatRequest["councilAgents"]>[number],
  message: string,
): string {
  return `${agent.displayName} (${agent.qaSpecialty}): I received your council message — "${message.slice(0, 120)}${message.length > 120 ? "…" : ""}". Local LLM is unavailable, so this is a staging fallback reply.`;
}

function individualFallbackResponse(
  agent: AgentOpsLocalLlmChatRequest["agentContext"] | undefined,
  message: string,
): string {
  const name = agent?.displayName ?? "Agent";
  return `${name}: Local LLM is unavailable. Fallback reply for "${message.slice(0, 120)}${message.length > 120 ? "…" : ""}". Configure Ollama at ${getAgentOpsLocalLlmConfig().baseUrl}.`;
}

export async function runAgentOpsLocalLlmChat(
  request: AgentOpsLocalLlmChatRequest,
): Promise<AgentOpsLocalLlmChatResult> {
  const requestId = newRequestId(`llm-${request.chatScope}`);
  const memoryIntentDetected = detectAgentOpsMemoryIntent(request.message);
  const baseResult: AgentOpsLocalLlmChatResult = {
    chatScope: request.chatScope,
    source: "unavailable",
    localLlmCalled: false,
    shouldFallbackToMock: true,
    requestId,
    response: null,
    perAgentResponses: [],
    proposedMemoryUpdate: null,
    memoryIntentDetected,
    memoryApprovalRequired: memoryIntentDetected,
    limitations: "",
    blockers: [],
  };

  if (!isAgentOpsLocalLlmEnabled()) {
    return {
      ...baseResult,
      blockers: ["Local LLM runtime disabled."],
      limitations: "Local LLM disabled — mock fallback required.",
    };
  }

  const userMessage = appendAttachmentContext(request.message, request.attachmentDescriptions);
  const model = request.model?.trim() || getAgentOpsLocalLlmConfig().model;

  if (request.chatScope === "issue") {
    const llmResult = await callLocalLlmChat(
      buildIssueSystemPrompt(request),
      userMessage,
      "issue",
      request.issueContext?.reportingAgent ?? null,
      model,
    );
    if (!llmResult.ok) {
      return {
        ...baseResult,
        blockers: [llmResult.error],
        limitations: `Local LLM call failed: ${llmResult.error}`,
      };
    }
    return {
      ...baseResult,
      source: "local_llm",
      localLlmCalled: true,
      shouldFallbackToMock: false,
      response: llmResult.content,
      proposedMemoryUpdate:
        memoryIntentDetected ?
          buildProposedMemoryUpdate(
            request.message,
            request.issueContext?.reportingAgent ?? null,
            "issue",
          )
        : null,
      limitations: "Live local LLM response (staging). Memory writes still require explicit Yes approval.",
      blockers: [],
    };
  }

  if (request.chatScope === "individual_agent") {
    const llmResult = await callLocalLlmChat(
      buildIndividualAgentSystemPrompt(request),
      userMessage,
      "individual_agent",
      request.agentContext?.agentId ?? request.selectedAgentId ?? null,
      model,
    );
    if (!llmResult.ok) {
      return {
        ...baseResult,
        blockers: [llmResult.error],
        limitations: `Local LLM call failed: ${llmResult.error}`,
        response: individualFallbackResponse(request.agentContext, request.message),
        shouldFallbackToMock: true,
        source: "mock_fallback",
      };
    }
    return {
      ...baseResult,
      source: "local_llm",
      localLlmCalled: true,
      shouldFallbackToMock: false,
      response: llmResult.content,
      proposedMemoryUpdate:
        memoryIntentDetected ?
          buildProposedMemoryUpdate(
            request.message,
            request.agentContext?.agentId ?? null,
            "agent",
          )
        : null,
      limitations: "Live local LLM response (staging). Memory writes still require explicit Yes approval.",
      blockers: [],
    };
  }

  const councilAgents = request.councilAgents ?? [];
  if (councilAgents.length === 0) {
    return {
      ...baseResult,
      blockers: ["No council agents provided."],
      limitations: "Council chat requires managed agents.",
    };
  }

  const perAgentResponses: AgentOpsLocalLlmPerAgentResponse[] = await Promise.all(
    councilAgents.map(async (agent) => {
      const llmResult = await callLocalLlmChat(
        buildCouncilAgentSystemPrompt(agent),
        userMessage,
        "council",
        agent.agentId,
        model,
      );
      const roleText = `${agent.appRole} · ${agent.qaSpecialty}`;
      if (!llmResult.ok) {
        return {
          agentId: agent.agentId,
          agentName: agent.displayName,
          role: roleText,
          response: councilFallbackResponse(agent, request.message),
          source: "mock_fallback" as const,
          memoryIntentDetected,
        };
      }
      return {
        agentId: agent.agentId,
        agentName: agent.displayName,
        role: roleText,
        response: llmResult.content,
        source: "local_llm" as const,
        memoryIntentDetected,
      };
    }),
  );

  const anyLive = perAgentResponses.some((item) => item.source === "local_llm");
  return {
    ...baseResult,
    source: anyLive ? "local_llm" : "mock_fallback",
    localLlmCalled: anyLive,
    shouldFallbackToMock: !anyLive,
    perAgentResponses,
    proposedMemoryUpdate:
      memoryIntentDetected ?
        buildProposedMemoryUpdate(request.message, null, "shared")
      : null,
    limitations:
      anyLive ?
        "Live local LLM council fan-out (staging). Memory writes still require explicit Yes approval."
      : "Council fallback replies — local LLM unavailable.",
    blockers: anyLive ? [] : ["All council agent LLM calls failed or returned empty."],
  };
}

function buildIssueHermesSystemPrompt(input: AgentOpsHermesAdapterRunInput): string {
  const reportingAgentId =
    input.reportingAgent && input.reportingAgent !== "Not linked yet" ? input.reportingAgent : null;
  const issueContextLines = [
    `Issue code: ${input.issueCode}`,
    input.title ? `Title: ${input.title}` : null,
    input.issueSummary ? `Summary: ${input.issueSummary}` : null,
    input.evidence ? `Evidence: ${input.evidence}` : null,
    input.fixPlan ? `Fix plan: ${input.fixPlan}` : null,
    input.likelyRootCause ? `Likely root cause: ${input.likelyRootCause}` : null,
    input.recommendedFixStrategy ? `Recommended fix: ${input.recommendedFixStrategy}` : null,
    input.executionState ? `Execution state: ${input.executionState}` : null,
    input.cursorPrompt ? `Cursor prompt draft: ${input.cursorPrompt}` : null,
    `Owner intent: ${input.intent ?? "clarification"}`,
  ].filter((line): line is string => Boolean(line));

  const globalSnippets = input.globalApprovedMemorySnippets;

  if (reportingAgentId) {
    return buildAgentOpsAgentSystemPrompt(reportingAgentId, {
      chatScope: "issue",
      memorySnippets: input.agentMemory,
      globalApprovedMemorySnippets: globalSnippets,
      issueContextLines,
      enableCreativity: true,
    });
  }

  return buildIssueSystemPrompt({
    chatScope: "issue",
    message: input.question,
    issueCode: input.issueCode,
    intent: input.intent,
    issueContext: {
      title: input.title ?? null,
      summary: input.issueSummary,
      evidence: input.evidence,
      fixPlan: input.fixPlan,
      cursorPrompt: input.cursorPrompt,
      executionState: input.executionState,
      route: input.route ?? null,
      category: input.category ?? null,
      severity: input.severity ?? null,
      module: input.module ?? null,
      likelyRootCause: input.likelyRootCause ?? null,
      recommendedFixStrategy: input.recommendedFixStrategy ?? null,
      reportingAgent: input.reportingAgent,
      agentMemory: input.agentMemory,
      globalApprovedMemory: globalSnippets,
      timeline: input.timeline,
    },
  });
}

/** Issue workspace chat: Hermes server proxy first, local LLM second, mock fallback last. */
export async function runAgentOpsIssueChatAdapter(
  input: AgentOpsHermesAdapterRunInput & { attachmentDescriptions?: string[] },
): Promise<AgentOpsHermesAdapterResult & { localLlmCalled: boolean; memoryIntentDetected: boolean }> {
  const memoryIntentDetected = detectAgentOpsMemoryIntent(input.question);
  const systemPrompt = buildIssueHermesSystemPrompt(input);

  const hermesResult = await runAgentOpsHermesAdapterAsync(input, systemPrompt);
  if (hermesResult.source === "hermes_runtime" && hermesResult.response) {
    const mode = mapIntentToHermesMode(input.intent);
    return {
      ...hermesResult,
      mode,
      localLlmCalled: false,
      memoryIntentDetected,
    };
  }

  const llmResult = await runAgentOpsLocalLlmChat({
    chatScope: "issue",
    message: input.question,
    model: input.model,
    attachmentDescriptions: input.attachmentDescriptions,
    issueCode: input.issueCode,
    intent: input.intent,
    issueContext: {
      title: input.title ?? null,
      summary: input.issueSummary,
      evidence: input.evidence,
      fixPlan: input.fixPlan,
      cursorPrompt: input.cursorPrompt,
      executionState: input.executionState,
      route: input.route ?? null,
      category: input.category ?? null,
      severity: input.severity ?? null,
      module: input.module ?? null,
      likelyRootCause: input.likelyRootCause ?? null,
      recommendedFixStrategy: input.recommendedFixStrategy ?? null,
      reportingAgent: input.reportingAgent,
      agentMemory: input.agentMemory,
      globalApprovedMemory: input.globalApprovedMemorySnippets,
      timeline: input.timeline,
    },
  });

  if (llmResult.localLlmCalled && llmResult.response) {
    const mode = mapIntentToHermesMode(input.intent);
    return {
      source: "local_llm",
      hermesRuntimeCalled: false,
      shouldFallbackToMock: false,
      requestId: llmResult.requestId,
      mode,
      response: llmResult.response,
      promptSuggestions: "",
      riskNotes: "",
      nextRecommendedAction: "",
      confidence: "medium",
      limitations: llmResult.limitations,
      safetyFlags: ["staging_only", "local_llm", "no_auto_cursor", "memory_approval_required"],
      localLlmCalled: true,
      memoryIntentDetected: llmResult.memoryIntentDetected,
    };
  }

  const mockResult = runAgentOpsHermesAdapter(input);
  const mock = generateAgentOpsMockResponse({
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
  });

  return {
    ...mockResult,
    response: mock.response,
    promptSuggestions: mock.suggestedPromptChanges,
    riskNotes: mock.riskNotes,
    nextRecommendedAction: mock.nextRecommendedAction,
    confidence: mock.confidence,
    limitations: llmResult.blockers.length ?
      `${llmResult.limitations} ${mock.limitations}`
    : mock.limitations,
    localLlmCalled: false,
    memoryIntentDetected: detectAgentOpsMemoryIntent(input.question),
  };
}
