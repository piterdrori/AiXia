/**
 * Plain Node handlers for AgentOps LLM routes during Vite dev.
 * Mirrors api/agentops/* serverless handlers without SSR module loading.
 */

import { handleGlobalMemoryRunCommandRequest } from "./agentops-global-memory-command-runner.mjs";
import { handleGlobalMemoryGenerateCandidatesRequest } from "./agentops-global-memory-candidate-generator.mjs";

function readEnv(env, name) {
  const value = env[name] ?? process.env[name];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

const AGENTOPS_OLLAMA_MODEL_CATALOG = [
  { id: "llama3.2", label: "Llama 3.2 3B", hint: "Fast text-only chat" },
  { id: "llama3.2-vision:11b", label: "Llama 3.2 Vision 11B", hint: "Images + text" },
  { id: "qwen3:14b", label: "Qwen3 14B", hint: "Coding / reasoning" },
];

const AGENTOPS_OLLAMA_DEFAULT_MODEL = "llama3.2";

function mergeAgentOpsOllamaModelOptions(installed) {
  const installedNames = installed.map((item) => item.name.trim()).filter(Boolean);
  const installedByName = new Map(installed.map((item) => [item.name.trim(), item.size]));

  function isInstalled(entryId) {
    if (installedByName.has(entryId) || installedByName.has(`${entryId}:latest`)) {
      return true;
    }
    if (entryId === "llama3.2") {
      return installedNames.some((name) => name === "llama3.2:latest" || name === "llama3.2");
    }
    return installedNames.some(
      (name) => name === entryId || name.startsWith(`${entryId}:`) || name.startsWith(`${entryId}-`),
    );
  }

  function resolveSize(entryId) {
    return (
      installedByName.get(entryId) ??
      installedByName.get(`${entryId}:latest`) ??
      installed.find(
        (item) =>
          item.name === entryId ||
          item.name.startsWith(`${entryId}:`) ||
          item.name.startsWith(`${entryId}-`),
      )?.size
    );
  }

  return AGENTOPS_OLLAMA_MODEL_CATALOG.map((entry) => ({
    ...entry,
    installed: isInstalled(entry.id),
    sizeBytes: resolveSize(entry.id),
  }));
}

function getOllamaConfig(env) {
  const baseUrl = (
    readEnv(env, "HERMES_STAGING_ENDPOINT") ??
    readEnv(env, "AGENTOPS_LLM_BASE_URL") ??
    "http://127.0.0.1:11434"
  ).replace(/\/+$/, "");
  const model =
    readEnv(env, "HERMES_LLM_MODEL") ??
    readEnv(env, "AGENTOPS_LLM_MODEL") ??
    readEnv(env, "VITE_AGENTOPS_LLM_MODEL") ??
    "llama3.2";
  const timeoutMs = Number(readEnv(env, "HERMES_TIMEOUT_MS") ?? "120000");
  return { baseUrl, model, timeoutMs };
}

function readAgentOpsLlmProvider(env) {
  return readEnv(env, "AGENTOPS_LLM_PROVIDER") === "doubao_ark" ? "doubao_ark" : "ollama";
}

function getDoubaoArkConfig(env) {
  const baseUrl = (readEnv(env, "ARK_BASE_URL") ?? "https://ark.cn-beijing.volces.com/api/v3").replace(
    /\/+$/,
    "",
  );
  const model = readEnv(env, "ARK_MODEL") ?? "doubao-seed-2-0-pro-260215";
  const apiKey = readEnv(env, "ARK_API_KEY");
  const timeoutMs = Number(readEnv(env, "HERMES_TIMEOUT_MS") ?? "120000");
  return { baseUrl, model, apiKey, timeoutMs };
}

function isDoubaoArkConfigured(env) {
  const { apiKey, baseUrl, model } = getDoubaoArkConfig(env);
  return Boolean(apiKey && baseUrl && model);
}

function formatLlmProviderLabel(provider) {
  return provider === "doubao_ark" ? "Doubao Ark" : "Ollama";
}

function getAgentOpsLlmProviderModel(env) {
  if (readAgentOpsLlmProvider(env) === "doubao_ark") {
    return getDoubaoArkConfig(env).model;
  }
  return getOllamaConfig(env).model;
}

function isAgentOpsLlmProviderConfigured(env) {
  if (readAgentOpsLlmProvider(env) === "doubao_ark") {
    return isDoubaoArkConfigured(env);
  }
  return Boolean(getOllamaConfig(env).baseUrl);
}

function buildDoubaoInput(messages, mergeSystemIntoUser) {
  if (mergeSystemIntoUser) {
    const systemText = messages
      .filter((message) => message.role === "system")
      .map((message) => message.content.trim())
      .filter(Boolean)
      .join("\n\n");
    const userText = messages
      .filter((message) => message.role === "user" || message.role === "assistant")
      .map((message) => message.content.trim())
      .filter(Boolean)
      .join("\n\n");
    const combined = [
      systemText ? `System instructions:\n${systemText}` : "",
      userText ? `User request:\n${userText}` : "",
    ]
      .filter(Boolean)
      .join("\n\n");
    return [{ role: "user", content: [{ type: "input_text", text: combined }] }];
  }
  return messages.map((message) => ({
    role: message.role,
    content: [{ type: "input_text", text: message.content }],
  }));
}

function collectDoubaoResponseText(value, out, depth = 0) {
  if (depth > 10 || value == null) return;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed) out.push(trimmed);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectDoubaoResponseText(item, out, depth + 1);
    return;
  }
  if (typeof value === "object") {
    const record = value;
    if (typeof record.text === "string") collectDoubaoResponseText(record.text, out, depth + 1);
    if (typeof record.content === "string") collectDoubaoResponseText(record.content, out, depth + 1);
    if (typeof record.output_text === "string") collectDoubaoResponseText(record.output_text, out, depth + 1);
    for (const key of ["output", "content", "message", "choices", "data", "result"]) {
      if (key in record) collectDoubaoResponseText(record[key], out, depth + 1);
    }
  }
}

function parseDoubaoArkResponseText(payload) {
  if (!payload || typeof payload !== "object") return null;
  if (typeof payload.output_text === "string" && payload.output_text.trim()) {
    return payload.output_text.trim();
  }
  const collected = [];
  collectDoubaoResponseText(payload.output, collected);
  if (collected.length > 0) return collected.join("\n").trim();
  collectDoubaoResponseText(payload, collected);
  const unique = [...new Set(collected)].filter(Boolean);
  if (unique.length > 0) return unique.join("\n").trim();
  return null;
}

function sanitizeDoubaoError(status, rawBody, apiKey) {
  let body = rawBody.slice(0, 400);
  if (apiKey) body = body.split(apiKey).join("[REDACTED]");
  body = body.replace(/Bearer\s+\S+/gi, "Bearer [REDACTED]");
  return body ? `Doubao Ark HTTP ${status}: ${body}` : `Doubao Ark HTTP ${status}`;
}

async function postDoubaoResponsesRequest(input, model, timeoutMs, apiKey, baseUrl) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${baseUrl}/responses`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model, input }),
      signal: controller.signal,
    });
    const rawBody = await response.text();
    if (!response.ok) {
      return { ok: false, error: sanitizeDoubaoError(response.status, rawBody, apiKey), status: response.status };
    }
    try {
      return { ok: true, payload: JSON.parse(rawBody) };
    } catch {
      return { ok: false, error: "Doubao Ark returned non-JSON response." };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, error: message.includes("abort") ? "Doubao Ark request timed out." : message };
  } finally {
    clearTimeout(timer);
  }
}

async function callDoubaoArkResponses(env, messages, modelOverride) {
  const config = getDoubaoArkConfig(env);
  if (!config.apiKey) return { ok: false, error: "Doubao Ark API key not configured." };
  const model = modelOverride?.trim() || config.model;
  const hasSystem = messages.some((message) => message.role === "system");

  async function attempt(mergeSystemIntoUser) {
    const input = buildDoubaoInput(messages, mergeSystemIntoUser);
    const result = await postDoubaoResponsesRequest(
      input,
      model,
      config.timeoutMs,
      config.apiKey,
      config.baseUrl,
    );
    if (!result.ok) return result;
    const content = parseDoubaoArkResponseText(result.payload);
    if (!content) return { ok: false, error: "Doubao Ark returned empty content." };
    return { ok: true, content, model };
  }

  if (hasSystem) {
    const first = await attempt(false);
    if (first.ok) return first;
    if (first.status && first.status >= 400 && first.status < 500) {
      return attempt(true);
    }
    return first;
  }
  return attempt(false);
}

async function probeAgentOpsLlmTransport(env) {
  if (readAgentOpsLlmProvider(env) === "doubao_ark") {
    if (!isDoubaoArkConfigured(env)) {
      return { reachable: false, error: "Doubao Ark provider not configured (missing ARK_API_KEY)." };
    }
    return { reachable: true, modelCount: 1 };
  }
  const config = getOllamaConfig(env);
  if (!config.baseUrl) return { reachable: false, error: "Ollama endpoint not configured." };
  return probeOllamaReachability(env);
}

async function callAgentOpsLlmChat(env, systemPrompt, userMessage, modelOverride) {
  const provider = readAgentOpsLlmProvider(env);
  if (provider === "doubao_ark") {
    const result = await callDoubaoArkResponses(
      env,
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      modelOverride,
    );
    if (!result.ok) return { ...result, provider };
    return { ok: true, content: result.content, model: result.model, provider };
  }
  const result = await callOllamaChat(env, systemPrompt, userMessage, modelOverride);
  if (!result.ok) return { ...result, provider };
  return { ok: true, content: result.content, model: result.model, provider };
}

function readGateStatus(env, name) {
  const value = readEnv(env, name);
  if (value === "true") return "enabled";
  if (value === "false") return "disabled";
  return "unknown";
}

function isProductionBlocked(env) {
  return readEnv(env, "VERCEL_ENV") === "production";
}

async function buildHermesRuntimeHealthPayload(env) {
  const checkedAt = new Date().toISOString();
  const productionBlocked = isProductionBlocked(env);
  const runtimeGate = readGateStatus(env, "HERMES_RUNTIME_ACTIVE");
  const ownerApproved = readGateStatus(env, "HERMES_OWNER_APPROVED");
  const llmRuntimeGate = readGateStatus(env, "AGENTOPS_LLM_RUNTIME_ACTIVE");
  const runtimeEnabled = isRuntimeEnabled(env);
  const provider = readAgentOpsLlmProvider(env);
  const providerConfigured = isAgentOpsLlmProviderConfigured(env);
  const providerModel = getAgentOpsLlmProviderModel(env);
  const transport = providerConfigured
    ? await probeAgentOpsLlmTransport(env)
    : { reachable: false, error: "LLM provider not configured." };

  const gatesOpen =
    !productionBlocked &&
    runtimeGate !== "disabled" &&
    ownerApproved !== "disabled" &&
    runtimeEnabled;
  const transportReachable = gatesOpen && transport.reachable;
  const llmFallbackReachable = gatesOpen && transport.reachable;

  let mode = "unavailable";
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
      transport.error ?? `${formatLlmProviderLabel(provider)} transport not reachable.`;
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
    hermesEndpointReachable: true,
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

function isRuntimeEnabled(env) {
  const llmActive = readEnv(env, "AGENTOPS_LLM_RUNTIME_ACTIVE");
  const hermesActive = readEnv(env, "HERMES_RUNTIME_ACTIVE");
  const ownerApproved = readEnv(env, "HERMES_OWNER_APPROVED");
  const clientEnabled = readEnv(env, "VITE_AGENTOPS_LLM_ENABLED");

  if (llmActive === "false" || hermesActive === "false" || clientEnabled === "false") {
    return false;
  }
  if (ownerApproved === "false") return false;

  const doubaoProvider = readEnv(env, "AGENTOPS_LLM_PROVIDER") === "doubao_ark";
  const hasDoubaoKey = Boolean(readEnv(env, "ARK_API_KEY"));

  if (
    llmActive === "true" ||
    hermesActive === "true" ||
    ownerApproved === "true" ||
    readEnv(env, "HERMES_STAGING_ENDPOINT") ||
    readEnv(env, "AGENTOPS_LLM_BASE_URL") ||
    (doubaoProvider && hasDoubaoKey)
  ) {
    return true;
  }

  return clientEnabled !== "false";
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function humanizeOllamaError(error) {
  if (/fetch failed|ECONNREFUSED|Failed to fetch|network/i.test(error)) {
    const { baseUrl, model } = getOllamaConfig({});
    return `Ollama is not reachable at ${baseUrl}. Start it with "ollama serve" and run "ollama pull ${model}".`;
  }
  return error;
}

async function listOllamaInstalledModels(env) {
  const { baseUrl } = getOllamaConfig(env);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(`${baseUrl}/api/tags`, {
      method: "GET",
      signal: controller.signal,
    });
    if (!response.ok) {
      return { ok: false, error: `Ollama HTTP ${response.status}` };
    }
    const payload = await response.json();
    const models = (payload.models ?? [])
      .filter((item) => item?.name?.trim())
      .map((item) => ({ name: item.name.trim(), size: item.size }));
    return { ok: true, models };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, error: message };
  } finally {
    clearTimeout(timer);
  }
}

async function probeOllamaReachability(env) {
  const { baseUrl } = getOllamaConfig(env);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 2500);
  try {
    const response = await fetch(`${baseUrl}/api/tags`, {
      method: "GET",
      signal: controller.signal,
    });
    if (!response.ok) {
      return { reachable: false, error: `Ollama HTTP ${response.status}` };
    }
    const payload = await response.json();
    return { reachable: true, modelCount: payload.models?.length ?? 0 };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { reachable: false, error: message };
  } finally {
    clearTimeout(timer);
  }
}

async function callOllamaChat(env, systemPrompt, userMessage, modelOverride) {
  const { baseUrl, model: defaultModel, timeoutMs } = getOllamaConfig(env);
  const model = modelOverride?.trim() || defaultModel;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        stream: false,
      }),
      signal: controller.signal,
    });
    if (!response.ok) {
      return { ok: false, error: `Ollama HTTP ${response.status}` };
    }
    const payload = await response.json();
    const content = payload.message?.content?.trim();
    if (!content) return { ok: false, error: "Ollama returned empty content." };
    return { ok: true, content, model };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, error: message };
  } finally {
    clearTimeout(timer);
  }
}

export function createAgentOpsDevApiHandlers(env) {
  return {
    async handleGlobalMemoryRunCommand(request) {
      return handleGlobalMemoryRunCommandRequest(request, env);
    },

    async handleLlm(request) {
      if (request.method === "GET") {
        const runtimeActive = isRuntimeEnabled(env);
        const provider = readAgentOpsLlmProvider(env);

        if (provider === "doubao_ark") {
          const model = getAgentOpsLlmProviderModel(env);
          const providerConfigured = isAgentOpsLlmProviderConfigured(env);
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

        const config = getOllamaConfig(env);
        const installed = await listOllamaInstalledModels(env);
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

      if (!isRuntimeEnabled(env)) {
        return jsonResponse(
          {
            source: "unavailable",
            error:
              "AgentOps LLM runtime inactive. Set HERMES_RUNTIME_ACTIVE=true and ensure Ollama is running.",
          },
          503,
        );
      }

      let body;
      try {
        body = await request.json();
      } catch {
        return jsonResponse({ error: "Invalid JSON body" }, 400);
      }

      const userMessage = body.userMessage?.trim();
      const systemPrompt = body.systemPrompt?.trim();
      if (!userMessage) return jsonResponse({ error: "userMessage is required" }, 400);
      if (!systemPrompt) return jsonResponse({ error: "systemPrompt is required" }, 400);

      const llmResult = await callAgentOpsLlmChat(env, systemPrompt, userMessage, body.model);
      const requestId = body.requestId ?? `agentops-llm-${Date.now()}`;
    if (!llmResult.ok) {
      return jsonResponse(
        {
          source: "unavailable",
          error: llmResult.provider === "ollama" ? humanizeOllamaError(llmResult.error) : llmResult.error,
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
        limitations: `Live ${formatLlmProviderLabel(llmResult.provider)} response via AgentOps dev server proxy (staging).`,
        safetyFlags: ["staging_only", "local_llm", "no_auto_cursor", "memory_approval_required"],
      });
    },

    async handleHermes(request) {
      if (request.method === "GET") {
        const health = await buildHermesRuntimeHealthPayload(env);
        const clientFlag = readGateStatus(env, "VITE_AGENTOPS_HERMES_ENABLED");
        return jsonResponse({
          ...health,
          stagingOnly: true,
          appCallable: true,
          clientTransportFlag: clientFlag,
          runtimeActive: health.transportReachable,
          ollamaReachable: health.transportReachable,
          endpointConfigured: health.providerConfigured,
        });
      }

      if (request.method !== "POST") {
        return jsonResponse({ error: "Method not allowed" }, 405);
      }

      if (!isRuntimeEnabled(env)) {
        return jsonResponse(
          {
            source: "unavailable",
            error: "Hermes runtime inactive. Set HERMES_RUNTIME_ACTIVE=true.",
          },
          503,
        );
      }

      let body;
      try {
        body = await request.json();
      } catch {
        return jsonResponse({ error: "Invalid JSON body" }, 400);
      }

      const question = body.question?.trim();
      if (!question) return jsonResponse({ error: "question is required" }, 400);

      const HERMES_ADVISORY_SAFETY_LINES = [
        "Advisory only — no memory writes, no source-of-truth writes, no registry writes.",
        "No tool execution or MCP tasks. Hermes coordinator is not fully active.",
      ];

      const systemPrompt =
        body.systemPrompt?.trim() ??
        [
          "You are a Hermes advisory QA agent for AgentOps (staging only).",
          "Never claim to have executed Cursor, changed production, or written memory automatically.",
          ...HERMES_ADVISORY_SAFETY_LINES,
          `Mode: ${body.mode ?? "issue_clarification"}`,
        ].join("\n");

      const llmResult = await callAgentOpsLlmChat(env, systemPrompt, question, body.model);
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
        limitations: `Hermes advisory via dev server ${formatLlmProviderLabel(llmResult.provider)} proxy (staging).`,
        safetyFlags: ["staging_only", "advisory_only", "no_auto_cursor", "memory_approval_required"],
      });
    },
    handleGlobalMemoryGenerateCandidates: handleGlobalMemoryGenerateCandidatesRequest,
  };
}
