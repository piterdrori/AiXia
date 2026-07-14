/**
 * AgentOps messenger TTS eligibility — speak only post-mount final agent replies.
 */

export type AgentOpsTtsEligibilityMessage = {
  id?: string | null;
  senderType?: string | null;
  content?: string | null;
  planned?: boolean | null;
  /** Explicit opt-out (e.g. mock/fallback LLM layer). */
  skipAutoSpeak?: boolean | null;
  createdAt?: string | null;
  senderName?: string | null;
};

export function resolveAgentOpsMessengerMessageId(
  message: AgentOpsTtsEligibilityMessage,
): string {
  const explicit = typeof message.id === "string" ? message.id.trim() : "";
  if (explicit) return explicit;

  // Fallback composite when a surface lacks a stable id.
  const parts = [
    String(message.senderType ?? ""),
    String(message.senderName ?? ""),
    String(message.createdAt ?? ""),
    String(message.content ?? "").slice(0, 120),
  ];
  return `composite:${parts.join("|")}`;
}

function looksLikeJsonOrLongPrompt(content: string): boolean {
  const trimmed = content.trim();
  if (!trimmed) return true;
  if (trimmed.length > 1200) return true;
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      JSON.parse(trimmed);
      return true;
    } catch {
      // not JSON
    }
  }
  if (/^```/.test(trimmed) && /```$/.test(trimmed)) return true;
  if (/Cursor prompt|prompt rewrite proposal/i.test(trimmed) && trimmed.length > 400) {
    return true;
  }
  return false;
}

function looksLikeFallbackOrError(content: string): boolean {
  return (
    /could not reach the staging LLM/i.test(content) ||
    /LLM unavailable/i.test(content) ||
    /fallback reply/i.test(content) ||
    /Local LLM is unavailable/i.test(content) ||
    /mock_response_layer/i.test(content)
  );
}

export function isAgentOpsMessengerMessageAutoSpeakEligible(
  message: AgentOpsTtsEligibilityMessage,
): boolean {
  if (message.skipAutoSpeak === true) return false;
  if (message.senderType !== "agent") return false;
  if (message.planned === true) return false;
  const content = typeof message.content === "string" ? message.content.trim() : "";
  if (!content) return false;
  if (looksLikeFallbackOrError(content)) return false;
  if (looksLikeJsonOrLongPrompt(content)) return false;
  return true;
}

/**
 * Seed session with current history IDs so remount/reload never auto-speaks them.
 * Returns the set (mutates input for convenience).
 */
export function seedAgentOpsTtsHistoryMessageIds(
  messages: AgentOpsTtsEligibilityMessage[],
  into: Set<string> = new Set(),
): Set<string> {
  for (const message of messages) {
    into.add(resolveAgentOpsMessengerMessageId(message));
  }
  return into;
}

/**
 * Find the newest eligible agent message that arrived after history was seeded.
 */
export function selectNextAgentOpsTtsSpeakCandidate(
  messages: AgentOpsTtsEligibilityMessage[],
  alreadyHandledIds: Set<string>,
): { messageId: string; content: string } | null {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    const messageId = resolveAgentOpsMessengerMessageId(message);
    if (alreadyHandledIds.has(messageId)) continue;
    if (!isAgentOpsMessengerMessageAutoSpeakEligible(message)) {
      alreadyHandledIds.add(messageId);
      continue;
    }
    return {
      messageId,
      content: String(message.content ?? "").trim(),
    };
  }
  return null;
}
