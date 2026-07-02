/**
 * Agent memory intent detection — shared by Doubao chat and Hermes pipeline (no LLM dependency).
 */

const MEMORY_INTENT_PATTERNS = [
  /\bremember\b/i,
  /\bremember this\b/i,
  /\bfrom now on\b/i,
  /\balways use\b/i,
  /\bupdate (your|my|agent) memory\b/i,
  /\bapply this (rule|standard)\b/i,
  /\blearn this\b/i,
  /\bstore this in memory\b/i,
  /\bsave this rule\b/i,
  /\bchange your behavior\b/i,
  /\bpermanent operating rule\b/i,
];

export function detectAgentOpsMemoryIntent(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  return MEMORY_INTENT_PATTERNS.some((pattern) => pattern.test(trimmed));
}
