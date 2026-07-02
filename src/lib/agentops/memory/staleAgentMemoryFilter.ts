/**
 * Exclude historical refusal/chatbot memory from active agent brain context.
 * Logs remain in DB — only active prompt/brain hydration is filtered.
 */

const STALE_REFUSAL_PATTERNS: RegExp[] = [
  /\bi can'?t execute\b/i,
  /\bi cannot execute\b/i,
  /\bno live (execution )?perm/i,
  /\bdon'?t have live execution\b/i,
  /\bsimulated browser qa\b/i,
  /\bpending piter'?s? finalization\b/i,
  /\bpending finalization\b/i,
  /\bwaiting for approval\b/i,
  /\bcan only help (with )?plan/i,
  /\bonly help (with )?planning\b/i,
  /\bmission (?:is )?not (?:defined|formalized)\b/i,
  /\bjob definition placeholder\b/i,
];

export function isStaleRefusalMemoryText(text: string): boolean {
  const normalized = text.trim();
  if (!normalized) return false;
  return STALE_REFUSAL_PATTERNS.some((pattern) => pattern.test(normalized));
}

export function isStaleRefusalMemoryContent(content: unknown): boolean {
  if (typeof content === "string") {
    return isStaleRefusalMemoryText(content);
  }

  if (content && typeof content === "object") {
    const record = content as Record<string, unknown>;
    const candidates = [record.text, record.message_summary, record.agent_reply, record.summary];
    return candidates.some(
      (value) => typeof value === "string" && isStaleRefusalMemoryText(value),
    );
  }

  return false;
}
