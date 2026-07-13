/**
 * Phase E — Finding Chat helpers (thread keys, bounded context, rewrite parse/compare).
 * Pure functions only — no network / schema.
 */

import {
  inspectPromptSafety,
  type PromptSafetyHit,
} from "@/lib/agentops/findings/findingsDetailModel";

export const FINDING_CHAT_SCOPE = "finding" as const;

export const FINDING_CHAT_QUICK_QUESTIONS: ReadonlyArray<{ id: string; label: string; message: string }> = [
  {
    id: "explain",
    label: "Explain this finding",
    message: "Explain this finding in plain language from your professional perspective.",
  },
  {
    id: "evidence",
    label: "Show me the evidence",
    message: "Show me the evidence you used and how strong it is. Say clearly if evidence is thin.",
  },
  {
    id: "real-issue",
    label: "Is this really an issue?",
    message: "Is this really an issue, or could it be a false positive? Explain your confidence.",
  },
  {
    id: "risk",
    label: "What is the risk?",
    message: "What is the user/business risk if we leave this as-is, and what is the implementation risk of fixing it?",
  },
  {
    id: "another-solution",
    label: "Suggest another solution",
    message: "Suggest another solution approach and compare it to the current suggested solution.",
  },
  {
    id: "improve-prompt",
    label: "Improve the fix prompt",
    message:
      "Improve the suggested fix prompt for this finding. Return a structured prompt rewrite proposal.",
  },
  {
    id: "verify",
    label: "How should we verify the fix?",
    message: "How should we verify the fix on staging? List concrete validation steps.",
  },
];

const CONTEXT_FIELD_MAX = 900;
const EVIDENCE_MAX = 1200;
const PROMPT_CONTEXT_MAX = 2500;

export type FindingChatKeyInput = {
  issueCode?: string | null;
  findingId?: string | null;
  draftId?: string | null;
};

export type FindingChatContextInput = FindingChatKeyInput & {
  title: string;
  typeLabel: string;
  statusLabel: string;
  explanation?: string | null;
  whyItMatters?: string | null;
  evidenceSummary?: string | null;
  observedBehavior?: string | null;
  expectedBehavior?: string | null;
  route?: string | null;
  module?: string | null;
  reportingAgentId?: string | null;
  reportingAgentName?: string | null;
  reportingAgentRole?: string | null;
  supportingAgents?: string[];
  suggestedSolution?: string | null;
  activePrompt?: string | null;
  originalPrompt?: string | null;
  promptSafetyHits?: PromptSafetyHit[];
  ownerQuestion?: string | null;
};

export type FindingChatContextPacket = {
  canonicalFindingKey: string;
  roomId: string;
  aliasRoomIds: string[];
  issueCode: string | null;
  findingId: string | null;
  draftId: string | null;
  title: string;
  type: string;
  status: string;
  explanation: string;
  whyItMatters: string;
  evidenceSummary: string;
  observedBehavior: string;
  expectedBehavior: string;
  route: string | null;
  module: string | null;
  reportingAgentId: string | null;
  reportingAgentName: string | null;
  reportingAgentRole: string | null;
  supportingAgents: string[];
  suggestedSolution: string;
  activePrompt: string;
  originalPrompt: string;
  promptSafetyWarnings: string[];
  ownerQuestion: string;
  stagingSafetyRules: string[];
};

export type PromptRewriteProposal = {
  explanation: string;
  rewrittenPrompt: string;
  changesMade: string[];
  safetyNotes: string[];
  validationSteps: string[];
  safetyHits: PromptSafetyHit[];
  parseSource: "json_block" | "json_object" | "markdown_fenced";
  rawExcerpt: string;
};

export type PromptLineComparison = {
  currentLines: string[];
  proposedLines: string[];
  addedLines: string[];
  removedLines: string[];
  summary: string[];
};

export function truncateForChatContext(value: string | null | undefined, max = CONTEXT_FIELD_MAX): string {
  const text = (value ?? "").trim();
  if (!text) return "";
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}…`;
}

export function buildFindingCanonicalKey(input: FindingChatKeyInput): string {
  const issueCode = input.issueCode?.trim();
  if (issueCode) return `code:${issueCode.toLowerCase()}`;
  const findingId = input.findingId?.trim();
  if (findingId) return `finding:${findingId}`;
  const draftId = input.draftId?.trim();
  if (draftId) return `draft:${draftId}`;
  return "unknown";
}

export function buildFindingChatRoomId(canonicalFindingKey: string, agentId: string): string {
  const key = canonicalFindingKey.trim() || "unknown";
  const agent = agentId.trim() || "unknown-agent";
  return `finding:${key}:agent:${agent}`;
}

/**
 * Alias rooms used so a promoted draft keeps the same conversation thread.
 * Primary room prefers issue code / finding id; draft room remains readable as alias.
 */
export function buildFindingChatRoomIds(input: FindingChatKeyInput & { agentId: string }): {
  canonicalFindingKey: string;
  primaryRoomId: string;
  aliasRoomIds: string[];
  allRoomIds: string[];
} {
  const agentId = input.agentId.trim();
  const canonicalFindingKey = buildFindingCanonicalKey(input);
  const primaryRoomId = buildFindingChatRoomId(canonicalFindingKey, agentId);
  const aliasRoomIds: string[] = [];

  if (input.draftId?.trim()) {
    const draftKey = buildFindingCanonicalKey({ draftId: input.draftId });
    const draftRoom = buildFindingChatRoomId(draftKey, agentId);
    if (draftRoom !== primaryRoomId) aliasRoomIds.push(draftRoom);
  }
  if (input.findingId?.trim() && input.issueCode?.trim()) {
    const findingKey = buildFindingCanonicalKey({ findingId: input.findingId });
    const findingRoom = buildFindingChatRoomId(findingKey, agentId);
    if (findingRoom !== primaryRoomId && !aliasRoomIds.includes(findingRoom)) {
      aliasRoomIds.push(findingRoom);
    }
  }

  return {
    canonicalFindingKey,
    primaryRoomId,
    aliasRoomIds,
    allRoomIds: [primaryRoomId, ...aliasRoomIds],
  };
}

export function isFindingChatRoomId(roomId: string | null | undefined): boolean {
  return typeof roomId === "string" && roomId.startsWith("finding:");
}

export function isAgentDetailChatRoomId(roomId: string | null | undefined): boolean {
  return typeof roomId === "string" && roomId.startsWith("agent-chat:");
}

export function buildFindingChatContextPacket(input: FindingChatContextInput): FindingChatContextPacket {
  const rooms = buildFindingChatRoomIds({
    issueCode: input.issueCode,
    findingId: input.findingId,
    draftId: input.draftId,
    agentId: input.reportingAgentId ?? "unknown-agent",
  });

  const safety =
    input.promptSafetyHits ??
    inspectPromptSafety(input.activePrompt ?? "");

  return {
    canonicalFindingKey: rooms.canonicalFindingKey,
    roomId: rooms.primaryRoomId,
    aliasRoomIds: rooms.aliasRoomIds,
    issueCode: input.issueCode?.trim() || null,
    findingId: input.findingId?.trim() || null,
    draftId: input.draftId?.trim() || null,
    title: truncateForChatContext(input.title, 240) || "Untitled finding",
    type: input.typeLabel,
    status: input.statusLabel,
    explanation: truncateForChatContext(input.explanation),
    whyItMatters: truncateForChatContext(input.whyItMatters),
    evidenceSummary: truncateForChatContext(input.evidenceSummary, EVIDENCE_MAX),
    observedBehavior: truncateForChatContext(input.observedBehavior),
    expectedBehavior: truncateForChatContext(input.expectedBehavior),
    route: input.route?.trim() || null,
    module: input.module?.trim() || null,
    reportingAgentId: input.reportingAgentId?.trim() || null,
    reportingAgentName: input.reportingAgentName?.trim() || null,
    reportingAgentRole: input.reportingAgentRole?.trim() || null,
    supportingAgents: (input.supportingAgents ?? []).map((item) => item.trim()).filter(Boolean).slice(0, 8),
    suggestedSolution: truncateForChatContext(input.suggestedSolution),
    activePrompt: truncateForChatContext(input.activePrompt, PROMPT_CONTEXT_MAX),
    originalPrompt: truncateForChatContext(input.originalPrompt, PROMPT_CONTEXT_MAX),
    promptSafetyWarnings: safety.map((hit) => hit.label),
    ownerQuestion: truncateForChatContext(input.ownerQuestion, 500),
    stagingSafetyRules: [
      "Staging-only. Never instruct production deployment or touching main.",
      "Do not claim evidence you do not have.",
      "Do not auto-execute fixes, open PRs, deploy, or change lifecycle state.",
      "Prompt rewrites require explicit owner approval before save.",
      "Never expose secrets or service-role errors.",
    ],
  };
}

export function detectPromptRewriteIntent(message: string): boolean {
  return /\b(improve|rewrite|revise|update|better)\b.{0,40}\b(prompt|fix prompt|suggested fix)\b|\bprompt rewrite\b/i.test(
    message,
  );
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean)
    .slice(0, 12);
}

function normalizeProposalObject(
  raw: Record<string, unknown>,
  parseSource: PromptRewriteProposal["parseSource"],
  rawExcerpt: string,
): PromptRewriteProposal | null {
  const rewritten =
    (typeof raw.rewritten_prompt === "string" && raw.rewritten_prompt) ||
    (typeof raw.rewrittenPrompt === "string" && raw.rewrittenPrompt) ||
    (typeof raw.prompt === "string" && raw.prompt) ||
    "";
  if (!rewritten.trim()) return null;

  const explanation =
    (typeof raw.explanation === "string" && raw.explanation.trim()) ||
    (typeof raw.rationale === "string" && raw.rationale.trim()) ||
    "Proposed prompt rewrite.";

  const changesMade =
    asStringArray(raw.changes_made).length > 0
      ? asStringArray(raw.changes_made)
      : asStringArray(raw.changesMade);

  const safetyNotes =
    asStringArray(raw.safety_notes).length > 0
      ? asStringArray(raw.safety_notes)
      : asStringArray(raw.safetyNotes);

  const validationSteps =
    asStringArray(raw.validation_steps).length > 0
      ? asStringArray(raw.validation_steps)
      : asStringArray(raw.validationSteps);

  const rewrittenPrompt = rewritten.trim();
  return {
    explanation,
    rewrittenPrompt,
    changesMade,
    safetyNotes,
    validationSteps,
    safetyHits: inspectPromptSafety(rewrittenPrompt),
    parseSource,
    rawExcerpt: truncateForChatContext(rawExcerpt, 400),
  };
}

/**
 * Parse a structured prompt rewrite from an agent reply.
 * On failure returns null — caller should keep the full reply as a normal message.
 */
export function parsePromptRewriteProposal(content: string): PromptRewriteProposal | null {
  const text = content?.trim() ?? "";
  if (!text) return null;

  const fenced = text.match(/```(?:json|promptRewrite)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    try {
      const parsed = JSON.parse(fenced[1].trim()) as unknown;
      if (parsed && typeof parsed === "object") {
        const proposal = normalizeProposalObject(
          parsed as Record<string, unknown>,
          /promptRewrite/i.test(fenced[0]) ? "markdown_fenced" : "json_block",
          fenced[1],
        );
        if (proposal) return proposal;
      }
    } catch {
      // fall through
    }
  }

  const objectMatch = text.match(/\{[\s\S]*"rewritten_prompt"[\s\S]*\}/);
  if (objectMatch?.[0]) {
    try {
      const parsed = JSON.parse(objectMatch[0]) as unknown;
      if (parsed && typeof parsed === "object") {
        return normalizeProposalObject(
          parsed as Record<string, unknown>,
          "json_object",
          objectMatch[0],
        );
      }
    } catch {
      return null;
    }
  }

  return null;
}

export function comparePromptTexts(current: string, proposed: string): PromptLineComparison {
  const currentLines = (current || "").split(/\r?\n/);
  const proposedLines = (proposed || "").split(/\r?\n/);
  const currentSet = new Set(currentLines.map((line) => line.trim()).filter(Boolean));
  const proposedSet = new Set(proposedLines.map((line) => line.trim()).filter(Boolean));

  const addedLines = [...proposedSet].filter((line) => !currentSet.has(line)).slice(0, 40);
  const removedLines = [...currentSet].filter((line) => !proposedSet.has(line)).slice(0, 40);

  const summary: string[] = [];
  if (addedLines.length) summary.push(`${addedLines.length} added instruction line(s)`);
  if (removedLines.length) summary.push(`${removedLines.length} removed instruction line(s)`);

  const scopeHint =
    /\bstaging\b/i.test(proposed) && !/\bstaging\b/i.test(current)
      ? "clarified staging scope"
      : null;
  const safetyHint =
    /\b(owner approval|do not (auto|deploy|touch main))\b/i.test(proposed) &&
    !/\b(owner approval|do not (auto|deploy|touch main))\b/i.test(current)
      ? "changed safety constraints"
      : null;
  const verifyHint =
    /\bverif/i.test(proposed) && !/\bverif/i.test(current) ? "changed verification steps" : null;

  if (scopeHint) summary.push(scopeHint);
  if (safetyHint) summary.push(safetyHint);
  if (verifyHint) summary.push(verifyHint);
  if (summary.length === 0) summary.push("Prompt text updated (no line-level delta summary).");

  return { currentLines, proposedLines, addedLines, removedLines, summary };
}

export function promptRewriteSystemInstructions(): string {
  return [
    "When the owner asks to improve or rewrite the suggested fix prompt, reply with a short explanation AND a fenced JSON block:",
    "```promptRewrite",
    "{",
    '  "explanation": "...",',
    '  "rewritten_prompt": "...",',
    '  "changes_made": ["..."],',
    '  "safety_notes": ["..."],',
    '  "validation_steps": ["..."]',
    "}",
    "```",
    "Keep rewritten_prompt staging-only. Never instruct production deploy, main-branch edits, auto-fix, auto-PR, or secret exposure.",
    "Normal chat answers (not prompt rewrites) should be plain text — do not force the JSON contract.",
  ].join("\n");
}

export function findingChatDoesNotMutateLifecycle(): true {
  return true;
}
