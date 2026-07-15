/**
 * Phase A.2 — Council turn view-model + embedded workspace static contracts.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  buildCouncilTurns,
  isNonConversationalCouncilContent,
  latestCouncilTurn,
  type CouncilTurnView,
} from "../src/lib/agentops/council/councilTurnModel.ts";
import type { AgentOpsCouncilChatMessage } from "../src/lib/agentops/types.ts";

const ROOT = process.cwd();

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`AGENTOPS COUNCIL PHASE A.2 REGRESSION: ${message}`);
  }
}

function msg(
  partial: Partial<AgentOpsCouncilChatMessage> &
    Pick<AgentOpsCouncilChatMessage, "id" | "sender" | "content" | "createdAt">,
): AgentOpsCouncilChatMessage {
  return {
    agentId: null,
    agentName: null,
    source: "owner",
    metadata: {},
    ...partial,
  };
}

function main(): void {
  assert(isNonConversationalCouncilContent("ready"), "ready must be non-conversational");
  assert(isNonConversationalCouncilContent("Ready."), "Ready. must be non-conversational");
  assert(isNonConversationalCouncilContent("online"), "online must be non-conversational");
  assert(isNonConversationalCouncilContent(""), "empty must be non-conversational");
  assert(
    !isNonConversationalCouncilContent("I review finance transaction flows."),
    "substantive text must remain conversational",
  );

  const messages: AgentOpsCouncilChatMessage[] = [
    msg({
      id: "o1",
      sender: "piter",
      content: "What is your review focus?",
      createdAt: "2026-07-15T01:00:00.000Z",
      metadata: { selectedAgentIds: ["system-agent", "qa-agent"] },
    }),
    msg({
      id: "a1",
      sender: "agent",
      agentId: "system-agent",
      agentName: "System Agent",
      content: "I review AgentOps health.",
      createdAt: "2026-07-15T01:00:01.000Z",
      source: "local_llm_runtime",
      metadata: { requestId: "req-1" },
    }),
    msg({
      id: "a2",
      sender: "agent",
      agentId: "qa-agent",
      agentName: "QA Agent",
      content: "ready",
      createdAt: "2026-07-15T01:00:02.000Z",
      source: "local_llm_runtime",
      metadata: { requestId: "req-1" },
    }),
    msg({
      id: "a3",
      sender: "agent",
      agentId: "qa-agent",
      agentName: "QA Agent",
      content: "I review browser regressions.",
      createdAt: "2026-07-15T01:00:03.000Z",
      source: "local_llm_runtime",
      metadata: { requestId: "req-1" },
    }),
  ];

  const turns = buildCouncilTurns(messages);
  assert(turns.length === 1, "one owner question must form one turn");
  const latest = latestCouncilTurn(turns) as CouncilTurnView;
  assert(latest.turnId === "req-1", "turn id must use requestId when present");
  assert(latest.repliedCount === 2, "ready reply must not count as conversational reply");
  assert(
    latest.replies.every((r) => r.content.toLowerCase() !== "ready"),
    "ready messages must be filtered from owner-facing replies",
  );
  assert(latest.replies.every((r) => r.status !== "replied" || r.content.length > 5), "collapsed replies exist");
  assert(latest.summary.includes("2 agent"), "deterministic summary must report reply count");

  const workspace = read("src/components/agentops/owner/AgentOpsCouncilWorkspace.tsx");
  assert(workspace.includes("AgentOps Council"), "canonical roster mode label required");
  assert(workspace.includes("Custom Council"), "custom roster mode must remain available");
  assert(workspace.includes("agentops-council-turn-responses"), "compact response list required");

  const card = read("src/components/agentops/owner/AgentOpsCouncilChatCard.tsx");
  assert(card.includes("AgentOpsCouncilWorkspace"), "embedded card must use workspace");
  assert(!card.includes("AixiaMessengerShell"), "embedded card must not use flat messenger shell");

  const hook = read("src/components/agentops/owner/useAgentOpsCouncilChat.tsx");
  assert(hook.includes('rosterMode === "canonical"'), "canonical roster default path required");
  assert(hook.includes("CANONICAL_AGENTS"), "canonical 12 must drive AgentOps Council mode");
  assert(hook.includes("buildCouncilTurns"), "hook must expose turn grouping");

  const css = read("src/styles/aixia-design-system.css");
  assert(css.includes(".agentops-council-workspace--embedded"), "workspace embedded class required");
  assert(css.includes("clamp(680px, 75vh, 760px)"), "workspace height target 680–760");
  assert(
    css.includes(".agentops-council-workspace .aixia-messenger-composer__input"),
    "composer compact override required",
  );

  const row = read("src/components/agentops/owner/AgentOpsCouncilAgentResponseRow.tsx");
  assert(row.includes('data-testid="agentops-council-response-row"'), "response row test id");
  assert(row.includes("expanded"), "accordion expand/collapse required");

  console.log(
    JSON.stringify(
      {
        ok: true,
        layer: "STATIC_CONTRACT_PASS",
        checks: [
          "presence-ready-filtered",
          "turn-grouping-requestId",
          "collapsed-responses-default",
          "canonical-roster-mode",
          "custom-roster-mode",
          "workspace-embedded",
          "composer-compact-css",
        ],
      },
      null,
      2,
    ),
  );
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
