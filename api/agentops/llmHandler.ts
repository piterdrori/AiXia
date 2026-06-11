/**
 * Unified AgentOps LLM handler — Council, Agent Workspace, and Issue chats.
 */

import {
  AGENTOPS_OLLAMA_DEFAULT_MODEL,
  mergeAgentOpsOllamaModelOptions,
} from "./modelCatalog.js";
import {
  callAgentOpsLlmChat,
  formatAgentOpsLlmProviderLabel,
  getAgentOpsLlmProviderModel,
  isAgentOpsLlmProviderConfigured,
  readAgentOpsLlmProvider,
} from "./llmProvider.js";
import {
  getAgentOpsOllamaConfig,
  isAgentOpsLlmRuntimeEnabled,
  jsonResponse,
  listOllamaInstalledModels,
  readOptionalInternalSecret,
} from "./ollamaProxy.js";
import { guardAgentOpsExecutionResponse } from "./agentopsStagingGuard.js";

export type AgentOpsLlmChatScope = "council" | "individual_agent" | "issue";

export interface AgentOpsLlmRunBody {
  requestId?: string;
  systemPrompt?: string;
  userMessage?: string;
  chatScope?: AgentOpsLlmChatScope;
  agentId?: string | null;
  model?: string | null;
}

export async function handleAgentOpsLlmRequest(request: Request): Promise<Response> {
  if (request.method === "GET") {
    const runtimeActive = isAgentOpsLlmRuntimeEnabled();
    const provider = readAgentOpsLlmProvider();

    if (provider === "doubao_ark") {
      const model = getAgentOpsLlmProviderModel();
      const providerConfigured = isAgentOpsLlmProviderConfigured();
      return jsonResponse({
        runtimeActive,
        appCallable: true,
        provider: "doubao_ark",
        providerConfigured,
        ollamaReachable: providerConfigured,
        ollamaError: providerConfigured ? null : "Doubao Ark provider not configured.",
        model,
        defaultModel: model,
        models: [{ id: model, label: model, hint: "Doubao Ark cloud model", installed: providerConfigured }],
        stagingOnly: true,
      });
    }

    const config = getAgentOpsOllamaConfig();
    const installed = await listOllamaInstalledModels();
    const models =
      installed.ok ?
        mergeAgentOpsOllamaModelOptions(installed.models)
      : mergeAgentOpsOllamaModelOptions([]);

    return jsonResponse({
      runtimeActive,
      appCallable: true,
      ollamaReachable: installed.ok ? true : false,
      ollamaError: installed.ok ? null : installed.error,
      model: config.model,
      defaultModel: AGENTOPS_OLLAMA_DEFAULT_MODEL,
      models,
      baseUrl: config.baseUrl,
      stagingOnly: true,
    });
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const stagingBlocked = guardAgentOpsExecutionResponse();
  if (stagingBlocked) return stagingBlocked;

  if (!readOptionalInternalSecret(request)) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  if (!isAgentOpsLlmRuntimeEnabled()) {
    return jsonResponse(
      {
        source: "unavailable",
        error:
          "AgentOps LLM runtime inactive. Set HERMES_RUNTIME_ACTIVE=true (or AGENTOPS_LLM_RUNTIME_ACTIVE=true) and configure Ollama or Doubao Ark.",
      },
      503,
    );
  }

  let body: AgentOpsLlmRunBody;
  try {
    body = (await request.json()) as AgentOpsLlmRunBody;
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const userMessage = body.userMessage?.trim();
  const systemPrompt = body.systemPrompt?.trim();
  if (!userMessage) {
    return jsonResponse({ error: "userMessage is required" }, 400);
  }
  if (!systemPrompt) {
    return jsonResponse({ error: "systemPrompt is required" }, 400);
  }

  const llmResult = await callAgentOpsLlmChat(systemPrompt, userMessage, body.model);
  const requestId = body.requestId ?? `agentops-llm-${Date.now()}`;

  if (!llmResult.ok) {
    return jsonResponse(
      {
        source: "unavailable",
        error: llmResult.error,
        requestId,
        chatScope: body.chatScope ?? null,
        agentId: body.agentId ?? null,
      },
      502,
    );
  }

  return jsonResponse({
    source: llmResult.provider === "doubao_ark" ? "cloud_llm" : "local_llm",
    response: llmResult.content,
    requestId,
    model: llmResult.model,
    chatScope: body.chatScope ?? null,
    agentId: body.agentId ?? null,
    limitations: `Live ${formatAgentOpsLlmProviderLabel(llmResult.provider)} response via AgentOps server proxy (staging).`,
    safetyFlags: ["staging_only", "local_llm", "no_auto_cursor", "memory_approval_required"],
  });
}
