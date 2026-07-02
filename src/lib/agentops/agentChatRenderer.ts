/**
 * AgentOps chat renderer — Doubao-only display contract (no fallback/mock UI states).
 */

export type AgentChatRenderState =
  | { status: "loading" }
  | { status: "success"; text: string; source: "doubao" }
  | { status: "error"; message: string };

/** Doubao-only chat UI state (no fallback branch). */
export type ChatState = AgentChatRenderState;

export const DOUBAO_CHAT_SOURCE = "doubao" as const;
export const BROWSER_QA_CHAT_SOURCE = "browser_qa" as const;

export type AgentChatResponseSource = typeof DOUBAO_CHAT_SOURCE | typeof BROWSER_QA_CHAT_SOURCE;

export function isBrowserQaChatSource(source: string | null | undefined): boolean {
  return source === BROWSER_QA_CHAT_SOURCE;
}

/** Mandatory debug — always logs normalized source (must be "doubao" for live turns). */
export function logChatSource(source: string | null | undefined): void {
  const normalized = normalizeDoubaoChatSource(source);
  console.log("CHAT SOURCE →", normalized ?? source ?? "none");
}

export function assertDoubaoChatSource(source: string | null | undefined): void {
  if (source !== DOUBAO_CHAT_SOURCE) {
    throw new Error("INVALID_CHAT_SOURCE");
  }
}

/** Map legacy persisted sources to Doubao for read path only. */
export function normalizeDoubaoChatSource(source: string | null | undefined): "doubao" | null {
  if (
    source === DOUBAO_CHAT_SOURCE ||
    source === "local_llm" ||
    source === "local_llm_runtime" ||
    source === "cloud_llm"
  ) {
    return DOUBAO_CHAT_SOURCE;
  }
  return null;
}

export function isRenderableDoubaoChatSource(source: string | null | undefined): boolean {
  return normalizeDoubaoChatSource(source) === DOUBAO_CHAT_SOURCE;
}

export function toChatRenderState(input: {
  loading: boolean;
  sending: boolean;
  error: string | null;
  lastAgentText: string | null;
  lastAgentSource: string | null;
}): AgentChatRenderState {
  if (input.loading || input.sending) {
    return { status: "loading" };
  }
  if (input.error) {
    return { status: "error", message: input.error };
  }
  const text = input.lastAgentText?.trim();
  if (text && isRenderableDoubaoChatSource(input.lastAgentSource)) {
    logChatSource(DOUBAO_CHAT_SOURCE);
    return { status: "success", text, source: DOUBAO_CHAT_SOURCE };
  }
  return { status: "loading" };
}
