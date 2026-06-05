/**
 * Shared server-side Ollama proxy for AgentOps (Hermes + local LLM routes).
 * Keeps LLM calls off the browser and avoids CORS against Ollama.
 */

export function readServerEnv(name: string): string | undefined {
  const value = process.env[name];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export function getAgentOpsOllamaConfig(): {
  baseUrl: string;
  model: string;
  timeoutMs: number;
} {
  const baseUrl = (
    readServerEnv("HERMES_STAGING_ENDPOINT") ??
    readServerEnv("AGENTOPS_LLM_BASE_URL") ??
    "http://127.0.0.1:11434"
  ).replace(/\/+$/, "");
  const model =
    readServerEnv("HERMES_LLM_MODEL") ??
    readServerEnv("AGENTOPS_LLM_MODEL") ??
    readServerEnv("VITE_AGENTOPS_LLM_MODEL") ??
    "llama3.2";
  const timeoutMs = Number(readServerEnv("HERMES_TIMEOUT_MS") ?? "120000");
  return { baseUrl, model, timeoutMs };
}

export type AgentOpsEnvGateStatus = "enabled" | "disabled" | "unknown";

export function readHermesRuntimeGateStatus(): AgentOpsEnvGateStatus {
  const value = readServerEnv("HERMES_RUNTIME_ACTIVE");
  if (value === "true") return "enabled";
  if (value === "false") return "disabled";
  return "unknown";
}

export function readHermesOwnerApprovedStatus(): AgentOpsEnvGateStatus {
  const value = readServerEnv("HERMES_OWNER_APPROVED");
  if (value === "true") return "enabled";
  if (value === "false") return "disabled";
  return "unknown";
}

export function readAgentOpsLlmRuntimeGateStatus(): AgentOpsEnvGateStatus {
  const value = readServerEnv("AGENTOPS_LLM_RUNTIME_ACTIVE");
  if (value === "true") return "enabled";
  if (value === "false") return "disabled";
  return "unknown";
}

export function isAgentOpsProductionBlocked(): boolean {
  return readServerEnv("VERCEL_ENV") === "production";
}

export function isAgentOpsLlmRuntimeEnabled(): boolean {
  const llmActive = readServerEnv("AGENTOPS_LLM_RUNTIME_ACTIVE");
  const hermesActive = readServerEnv("HERMES_RUNTIME_ACTIVE");
  const ownerApproved = readServerEnv("HERMES_OWNER_APPROVED");
  const clientEnabled = readServerEnv("VITE_AGENTOPS_LLM_ENABLED");

  if (llmActive === "false" || hermesActive === "false" || clientEnabled === "false") {
    return false;
  }
  if (ownerApproved === "false") return false;

  if (
    llmActive === "true" ||
    hermesActive === "true" ||
    ownerApproved === "true" ||
    readServerEnv("HERMES_STAGING_ENDPOINT") ||
    readServerEnv("AGENTOPS_LLM_BASE_URL")
  ) {
    return true;
  }

  // Staging default: when client LLM is enabled, server proxy is active in local dev.
  return clientEnabled !== "false";
}

export type OllamaInstalledModel = {
  name: string;
  size?: number;
};

export async function listOllamaInstalledModels(): Promise<
  { ok: true; models: OllamaInstalledModel[] } | { ok: false; error: string }
> {
  const { baseUrl } = getAgentOpsOllamaConfig();
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
    const payload = (await response.json()) as {
      models?: Array<{ name?: string; size?: number }>;
    };
    const models = (payload.models ?? [])
      .filter((item): item is { name: string; size?: number } => Boolean(item.name?.trim()))
      .map((item) => ({ name: item.name.trim(), size: item.size }));
    return { ok: true, models };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, error: message };
  } finally {
    clearTimeout(timer);
  }
}

export async function probeOllamaReachability(): Promise<{
  reachable: boolean;
  error?: string;
  modelCount?: number;
}> {
  const { baseUrl, timeoutMs } = getAgentOpsOllamaConfig();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Math.min(timeoutMs, 2500));

  try {
    const response = await fetch(`${baseUrl}/api/tags`, {
      method: "GET",
      signal: controller.signal,
    });
    if (!response.ok) {
      return { reachable: false, error: `Ollama HTTP ${response.status}` };
    }
    const payload = (await response.json()) as { models?: unknown[] };
    return { reachable: true, modelCount: payload.models?.length ?? 0 };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { reachable: false, error: message };
  } finally {
    clearTimeout(timer);
  }
}

export async function callOllamaChat(
  systemPrompt: string,
  userMessage: string,
  modelOverride?: string | null,
): Promise<{ ok: true; content: string; model: string } | { ok: false; error: string }> {
  const { baseUrl, model: defaultModel, timeoutMs } = getAgentOpsOllamaConfig();
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

    const payload = (await response.json()) as { message?: { content?: string } };
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

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export function readOptionalInternalSecret(request: Request): boolean {
  const internalSecret = readServerEnv("HERMES_INTERNAL_SECRET");
  if (!internalSecret) return true;
  return request.headers.get("x-agentops-hermes-secret") === internalSecret;
}
