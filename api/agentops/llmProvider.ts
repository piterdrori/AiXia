/**
 * AgentOps LLM provider switch — Ollama (local) or Doubao Ark (staging cloud).
 */

import { callDoubaoArkResponses, getDoubaoArkConfig, isDoubaoArkConfigured } from "./doubaoArkProvider.js";
import {
  callOllamaChat,
  getAgentOpsOllamaConfig,
  probeOllamaReachability,
  readServerEnv,
} from "./ollamaProxy.js";

export type AgentOpsLlmProviderId = "ollama" | "doubao_ark";

export function readAgentOpsLlmProvider(): AgentOpsLlmProviderId {
  const value = readServerEnv("AGENTOPS_LLM_PROVIDER");
  return value === "doubao_ark" ? "doubao_ark" : "ollama";
}

export function getAgentOpsLlmProviderModel(): string {
  if (readAgentOpsLlmProvider() === "doubao_ark") {
    return getDoubaoArkConfig().model;
  }
  return getAgentOpsOllamaConfig().model;
}

export function isAgentOpsLlmProviderConfigured(): boolean {
  if (readAgentOpsLlmProvider() === "doubao_ark") {
    return isDoubaoArkConfigured();
  }
  return Boolean(getAgentOpsOllamaConfig().baseUrl);
}

/** Lightweight transport probe — no live generation on GET for Doubao. */
export async function probeAgentOpsLlmTransport(): Promise<{
  reachable: boolean;
  error?: string;
  modelCount?: number;
}> {
  if (readAgentOpsLlmProvider() === "doubao_ark") {
    if (!isDoubaoArkConfigured()) {
      return { reachable: false, error: "Doubao Ark provider not configured (missing ARK_API_KEY)." };
    }
    return { reachable: true, modelCount: 1 };
  }

  const config = getAgentOpsOllamaConfig();
  if (!config.baseUrl) {
    return { reachable: false, error: "Ollama endpoint not configured." };
  }
  return probeOllamaReachability();
}

export async function callAgentOpsLlmChat(
  systemPrompt: string,
  userMessage: string,
  modelOverride?: string | null,
): Promise<{ ok: true; content: string; model: string; provider: AgentOpsLlmProviderId } | { ok: false; error: string; provider: AgentOpsLlmProviderId }> {
  const provider = readAgentOpsLlmProvider();

  if (provider === "doubao_ark") {
    const result = await callDoubaoArkResponses({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      model: modelOverride ?? undefined,
    });
    if (!result.ok) return { ok: false, error: result.error, provider };
    return { ok: true, content: result.content, model: result.model, provider };
  }

  const result = await callOllamaChat(systemPrompt, userMessage, modelOverride);
  if (!result.ok) return { ok: false, error: result.error, provider };
  return { ok: true, content: result.content, model: result.model, provider };
}

export function formatAgentOpsLlmProviderLabel(provider: AgentOpsLlmProviderId): string {
  return provider === "doubao_ark" ? "Doubao Ark" : "Ollama";
}
