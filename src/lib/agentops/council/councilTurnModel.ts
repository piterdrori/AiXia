/**
 * Read-only Council turn view model.
 * Groups persisted council messages without changing orchestration or persistence.
 *
 * Turn ID rule:
 * - Prefer metadata.requestId shared by agent replies in the same fan-out.
 * - Else synthesise turn-{ownerMessageId}.
 * Limitation: historical turns without requestId are grouped by contiguous
 * owner → subsequent agent replies until the next owner message.
 */

import type { AgentOpsCouncilChatMessage } from "@/lib/agentops/types";

export type CouncilReplyStatus = "replied" | "pending" | "failed" | "unavailable";

export type CouncilAgentReplyView = {
  messageId: string;
  agentId: string | null;
  agentName: string;
  jobTitle: string | null;
  content: string;
  preview: string;
  createdAt: string;
  source: AgentOpsCouncilChatMessage["source"];
  status: CouncilReplyStatus;
  skippedAsNonConversational: boolean;
};

export type CouncilTurnView = {
  turnId: string;
  ownerMessageId: string | null;
  question: string;
  createdAt: string;
  requestedAgentIds: string[];
  requestedCount: number;
  repliedCount: number;
  pendingCount: number;
  failedCount: number;
  replies: CouncilAgentReplyView[];
  /** Deterministic UI extraction — never invents LLM consensus. */
  summaryLabel: string;
  summary: string;
  agreements: string[];
  disagreements: string[];
  recommendedNextStep: string | null;
};

const PRESENCE_OR_NON_ANSWER =
  /^(ready|online|ok|okay|here|present|active|standing by|standing-by|listening|pong|ack|acknowledged)[.!\s]*$/i;

const JSON_OR_DEBUG_START = /^\s*[\[{]|^\s*```|^\s*<\?xml/i;

/** Presence / readiness / empty / debug text must not appear as Council answers. */
export function isNonConversationalCouncilContent(content: string | null | undefined): boolean {
  const trimmed = (content ?? "").trim();
  if (!trimmed) return true;
  if (PRESENCE_OR_NON_ANSWER.test(trimmed)) return true;
  if (JSON_OR_DEBUG_START.test(trimmed) && trimmed.length < 40) return true;
  if (/^(tool status|status:|selected:|presence:)/i.test(trimmed)) return true;
  return false;
}

export function previewCouncilReply(content: string, max = 96): string {
  const oneLine = content.replace(/\s+/g, " ").trim();
  if (oneLine.length <= max) return oneLine;
  return `${oneLine.slice(0, max - 1)}…`;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function turnIdFor(
  owner: AgentOpsCouncilChatMessage | null,
  agents: AgentOpsCouncilChatMessage[],
): string {
  for (const reply of agents) {
    const requestId = reply.metadata?.requestId;
    if (typeof requestId === "string" && requestId.trim()) return requestId.trim();
  }
  if (owner?.id) return `turn-${owner.id}`;
  if (agents[0]?.id) return `turn-orphan-${agents[0].id}`;
  return `turn-unknown-${Date.now()}`;
}

function buildDeterministicSummary(replies: CouncilAgentReplyView[]): {
  summaryLabel: string;
  summary: string;
  agreements: string[];
  disagreements: string[];
  recommendedNextStep: string | null;
} {
  const conversational = replies.filter((r) => !r.skippedAsNonConversational && r.status === "replied");
  if (conversational.length === 0) {
    return {
      summaryLabel: "Local summary",
      summary: "No conversational agent replies in this turn yet.",
      agreements: [],
      disagreements: [],
      recommendedNextStep: "Send a clear question to the selected Council agents.",
    };
  }

  const normalized = conversational.map((r) => r.content.replace(/\s+/g, " ").trim().toLowerCase());
  const counts = new Map<string, { count: number; sample: string; agents: string[] }>();
  conversational.forEach((reply, index) => {
    const key = normalized[index];
    const existing = counts.get(key);
    if (existing) {
      existing.count += 1;
      existing.agents.push(reply.agentName);
    } else {
      counts.set(key, {
        count: 1,
        sample: conversational[index].preview,
        agents: [reply.agentName],
      });
    }
  });

  const repeated = [...counts.values()]
    .filter((entry) => entry.count >= 2)
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  const unique = [...counts.values()]
    .filter((entry) => entry.count === 1)
    .slice(0, 4)
    .map((entry) => `${entry.agents[0]}: ${entry.sample}`);

  const agreements = repeated.map(
    (entry) => `${entry.count} agents similar: “${entry.sample}”`,
  );
  const disagreements =
    unique.length > 0 && conversational.length > 1
      ? unique
      : conversational.length > 1
        ? ["Perspectives differ — expand individual responses for details."]
        : [];

  return {
    summaryLabel: "Local summary (not an LLM consensus)",
    summary: `${conversational.length} agent${conversational.length === 1 ? "" : "s"} replied. Open individual responses below.`,
    agreements,
    disagreements,
    recommendedNextStep:
      conversational.length >= 2
        ? "Expand disagreeing agents, then ask a focused follow-up."
        : "Ask a follow-up to deepen this perspective.",
  };
}

/**
 * Build Council turns from persisted messages (newest turns last).
 * Filters non-conversational content from owner-facing replies (records preserved upstream).
 */
export function buildCouncilTurns(
  messages: AgentOpsCouncilChatMessage[],
  options?: {
    pendingAgentIds?: string[];
    submitting?: boolean;
  },
): CouncilTurnView[] {
  const sorted = [...messages].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

  type Bucket = {
    owner: AgentOpsCouncilChatMessage | null;
    agents: AgentOpsCouncilChatMessage[];
  };
  const buckets: Bucket[] = [];
  let current: Bucket | null = null;

  for (const message of sorted) {
    if (message.sender === "piter") {
      current = { owner: message, agents: [] };
      buckets.push(current);
      continue;
    }
    if (!current) {
      current = { owner: null, agents: [message] };
      buckets.push(current);
    } else {
      current.agents.push(message);
    }
  }

  const pendingIds = new Set(options?.pendingAgentIds ?? []);
  const submitting = options?.submitting === true;

  return buckets.map((bucket) => {
    const requestedAgentIds = asStringArray(bucket.owner?.metadata?.selectedAgentIds);
    const replies: CouncilAgentReplyView[] = bucket.agents.map((agent) => {
      const skipped = isNonConversationalCouncilContent(agent.content);
      const failed =
        agent.source === "mock_response_layer" &&
        /could not reach|unavailable|fallback/i.test(agent.content);
      return {
        messageId: agent.id,
        agentId: agent.agentId,
        agentName: agent.agentName?.trim() || agent.agentId || "Agent",
        jobTitle: typeof agent.metadata?.role === "string" ? agent.metadata.role : null,
        content: agent.content,
        preview: skipped ? "(non-conversational — hidden)" : previewCouncilReply(agent.content),
        createdAt: agent.createdAt,
        source: agent.source,
        status: skipped ? "unavailable" : failed ? "failed" : "replied",
        skippedAsNonConversational: skipped,
      };
    });

    const visibleReplies = replies.filter((r) => !r.skippedAsNonConversational);
    const repliedAgentIds = new Set(
      visibleReplies.map((r) => r.agentId).filter((id): id is string => Boolean(id)),
    );

    const pendingRows: CouncilAgentReplyView[] = [];
    if (submitting || pendingIds.size > 0) {
      for (const agentId of pendingIds) {
        if (repliedAgentIds.has(agentId)) continue;
        pendingRows.push({
          messageId: `pending-${agentId}`,
          agentId,
          agentName: agentId,
          jobTitle: null,
          content: "",
          preview: "Waiting for reply…",
          createdAt: bucket.owner?.createdAt ?? new Date().toISOString(),
          source: "owner",
          status: "pending",
          skippedAsNonConversational: false,
        });
      }
    }

    const allReplies = [...visibleReplies, ...pendingRows];
    const requestedCount =
      requestedAgentIds.length > 0
        ? requestedAgentIds.length
        : Math.max(allReplies.length, pendingIds.size);
    const repliedCount = visibleReplies.filter((r) => r.status === "replied").length;
    const pendingCount = allReplies.filter((r) => r.status === "pending").length;
    const failedCount = allReplies.filter((r) => r.status === "failed").length;
    const derived = buildDeterministicSummary(visibleReplies);

    return {
      turnId: turnIdFor(bucket.owner, bucket.agents),
      ownerMessageId: bucket.owner?.id ?? null,
      question: bucket.owner?.content?.trim() || "(No owner question recorded)",
      createdAt: bucket.owner?.createdAt ?? bucket.agents[0]?.createdAt ?? "",
      requestedAgentIds,
      requestedCount,
      repliedCount,
      pendingCount,
      failedCount,
      replies: allReplies,
      ...derived,
    };
  });
}

export function latestCouncilTurn(turns: CouncilTurnView[]): CouncilTurnView | null {
  return turns.length > 0 ? turns[turns.length - 1]! : null;
}

export function priorCouncilTurns(turns: CouncilTurnView[]): CouncilTurnView[] {
  if (turns.length <= 1) return [];
  return turns.slice(0, -1).reverse();
}
