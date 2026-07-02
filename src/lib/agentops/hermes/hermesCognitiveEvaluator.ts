/**
 * Hermes cognitive memory evaluator — probabilistic scoring, not binary reject.
 */

import { detectAgentOpsMemoryIntent } from "@/lib/agentops/agentMemoryIntent";
import { classifyMemory, type ClassifiedMemoryType } from "@/lib/agentops/hermes/memoryClassifier";

export type HermesCognitionType = ClassifiedMemoryType | "none";

export interface HermesCognitionScore {
  type: HermesCognitionType;
  confidence: number;
  shouldStore: boolean;
  reason: string;
}

export type MemoryEvaluationContext = {
  userMessage: string;
  agentReply: string;
  explicitMemoryIntent?: boolean;
  /** Recent user turns (oldest first) for behavior repetition detection. */
  priorUserMessages?: string[];
  proposedMemoryText?: string | null;
};

const GREETING_OR_CHAT =
  /^(hi|hello|hey|thanks|thank you|ok|okay|yes|no|sure|got it|cool|great|bye|goodbye|good morning|good night)[!.?\s]*$/i;

const QUESTION_LEAD =
  /^(what|how|why|when|where|who|which|can you|could you|please|help me|tell me|explain|show me)\b/i;

const RULE_MARKERS =
  /\b(must|always|never|from now on|do not|don't|required|mandatory|enforce|rule|standard|shall)\b/i;

const PREFERENCE_MARKERS =
  /\b(prefer|prefers|like|likes|dislike|dislikes|favorite|favour|rather|instead of|want you to)\b/i;

const FACT_MARKERS =
  /\b(is|are|was|were|has|have|uses|using|located|based in|works on|responsible for|our|my team|we use)\b/i;

const BEHAVIOR_MARKERS =
  /\b(usually|typically|often|every time|each time|habit|pattern|tends to|repeatedly|consistently)\b/i;

function clampConfidence(value: number): number {
  return Math.max(0, Math.min(1, Number(value.toFixed(3))));
}

function normalizeText(text: string): string {
  return text.trim().replace(/\s+/g, " ");
}

function tokenize(text: string): string[] {
  return normalizeText(text)
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 3);
}

function repetitionScore(current: string, prior: string[]): number {
  if (prior.length === 0) return 0;
  const currentTokens = new Set(tokenize(current));
  if (currentTokens.size === 0) return 0;

  let best = 0;
  for (const previous of prior.slice(-6)) {
    const priorTokens = tokenize(previous);
    if (priorTokens.length === 0) continue;
    const overlap = priorTokens.filter((token) => currentTokens.has(token)).length;
    const ratio = overlap / Math.max(priorTokens.length, currentTokens.size);
    best = Math.max(best, ratio);
  }
  return best;
}

function scoreCandidateText(text: string, context: MemoryEvaluationContext): HermesCognitionScore {
  const trimmed = normalizeText(text);
  const explicitIntent = context.explicitMemoryIntent ?? detectAgentOpsMemoryIntent(trimmed);

  if (!trimmed || trimmed.length < 8) {
    return {
      type: "none",
      confidence: 0.05,
      shouldStore: false,
      reason: "Message too short for durable memory.",
    };
  }

  if (GREETING_OR_CHAT.test(trimmed)) {
    return {
      type: "none",
      confidence: 0.08,
      shouldStore: false,
      reason: "Casual greeting or acknowledgment — ephemeral chat.",
    };
  }

  if (QUESTION_LEAD.test(trimmed) && !explicitIntent) {
    return {
      type: "none",
      confidence: 0.12,
      shouldStore: false,
      reason: "Question-led turn — no durable memory signal.",
    };
  }

  const isBrowserQaCommand =
    /\bbrowser qa\b/i.test(trimmed) ||
    /\bdo browser\b/i.test(trimmed) ||
    /\brun browser\b/i.test(trimmed);
  if (isBrowserQaCommand && !explicitIntent) {
    return {
      type: "none",
      confidence: 0.1,
      shouldStore: false,
      reason: "Browser QA execution command — not durable memory.",
    };
  }

  if (explicitIntent) {
    const classified = classifyMemory({ content: trimmed });
    const base =
      classified === "rule" ? 0.82
      : classified === "preference" ? 0.78
      : classified === "behavior" ? 0.8
      : 0.85;
    return {
      type: classified,
      confidence: clampConfidence(base),
      shouldStore: true,
      reason: "Explicit remember/apply intent detected in operator message.",
    };
  }

  const repeat = repetitionScore(trimmed, context.priorUserMessages ?? []);
  if (BEHAVIOR_MARKERS.test(trimmed) || repeat >= 0.55) {
    const confidence = clampConfidence(0.65 + repeat * 0.25 + (BEHAVIOR_MARKERS.test(trimmed) ? 0.1 : 0));
    const shouldStore = confidence >= 0.8;
    return {
      type: "behavior",
      confidence,
      shouldStore,
      reason: shouldStore
        ? "Repeated operator pattern suggests durable behavior memory."
        : "Behavior signal detected but confidence below storage threshold.",
    };
  }

  if (RULE_MARKERS.test(trimmed)) {
    const confidence = clampConfidence(0.68 + (trimmed.length > 40 ? 0.12 : 0));
    return {
      type: "rule",
      confidence,
      shouldStore: confidence >= 0.7,
      reason: shouldStoreReason(confidence, "rule constraint or instruction"),
    };
  }

  if (PREFERENCE_MARKERS.test(trimmed)) {
    const confidence = clampConfidence(0.58 + (trimmed.length > 30 ? 0.1 : 0));
    return {
      type: "preference",
      confidence,
      shouldStore: confidence >= 0.6,
      reason: shouldStoreReason(confidence, "operator preference"),
    };
  }

  if (FACT_MARKERS.test(trimmed) && trimmed.length >= 24) {
    const confidence = clampConfidence(0.62 + Math.min(trimmed.length / 200, 0.2));
    return {
      type: "fact",
      confidence,
      shouldStore: confidence >= 0.75,
      reason: shouldStoreReason(confidence, "persistent factual statement"),
    };
  }

  const heuristicType = classifyMemory({ content: trimmed });
  const weakConfidence = 0.35;
  return {
    type: "none",
    confidence: weakConfidence,
    shouldStore: false,
    reason: `Hermes ignored non-memory signal (intent: chat) — heuristic ${heuristicType} below threshold.`,
  };
}

function shouldStoreReason(confidence: number, label: string): string {
  return confidence >= getThresholdForLabel(label)
    ? `Stored ${label} — confidence ${confidence.toFixed(2)}.`
    : `${label} detected but confidence ${confidence.toFixed(2)} below storage threshold.`;
}

function getThresholdForLabel(label: string): number {
  if (label.includes("rule")) return 0.7;
  if (label.includes("preference")) return 0.6;
  if (label.includes("fact")) return 0.75;
  return 0.8;
}

export function evaluateMemoryCandidate(
  input: MemoryEvaluationContext,
): HermesCognitionScore {
  const candidateText =
    input.proposedMemoryText?.trim() ||
    input.userMessage.trim() ||
    input.agentReply.trim().slice(0, 500);

  return scoreCandidateText(candidateText, input);
}

export function logHermesCognitionDecision(score: HermesCognitionScore): void {
  if (score.type === "none" || score.confidence < 0.5) {
    if (score.type === "none") {
      console.log("Hermes ignored non-memory signal (intent: chat)", {
        confidence: score.confidence,
        reason: score.reason,
      });
    }
    return;
  }

  if (score.shouldStore) {
    console.log("Hermes cognition — store", {
      type: score.type,
      confidence: score.confidence,
      reason: score.reason,
    });
    return;
  }

  console.log("Hermes cognition — skip (below threshold)", {
    type: score.type,
    confidence: score.confidence,
    reason: score.reason,
  });
}

export function cognitionTypeToMemoryType(
  type: HermesCognitionType,
): "FACT" | "RULE" | "PREFERENCE" | "BEHAVIOR" | null {
  if (type === "none") return null;
  switch (type) {
    case "rule":
      return "RULE";
    case "preference":
      return "PREFERENCE";
    case "behavior":
      return "BEHAVIOR";
    default:
      return "FACT";
  }
}
