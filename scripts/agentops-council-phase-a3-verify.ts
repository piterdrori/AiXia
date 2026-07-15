/**
 * Phase A.3 — Council chat workspace static contracts.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  buildCouncilTurns,
  filterCouncilMessagesForRosterMode,
  isNonConversationalCouncilContent,
  latestCouncilTurn,
  priorCouncilTurns,
  type CouncilTurnView,
} from "../src/lib/agentops/council/councilTurnModel.ts";
import type { AgentOpsCouncilChatMessage } from "../src/lib/agentops/types.ts";

const ROOT = process.cwd();

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`AGENTOPS COUNCIL PHASE A.3 REGRESSION: ${message}`);
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
  assert(isNonConversationalCouncilContent("ready"), "ready filtered");
  assert(isNonConversationalCouncilContent("Ready."), "Ready. filtered");

  const messages: AgentOpsCouncilChatMessage[] = [
    msg({
      id: "o1",
      sender: "piter",
      content: "What is your review focus?",
      createdAt: "2026-07-15T01:00:00.000Z",
      metadata: {
        selectedAgentIds: ["system-agent", "design-agent"],
        rosterMode: "canonical",
      },
    }),
    msg({
      id: "a1",
      sender: "agent",
      agentId: "system-agent",
      agentName: "System Agent",
      content: "I review AgentOps health.",
      createdAt: "2026-07-15T01:00:01.000Z",
      source: "local_llm_runtime",
      metadata: { requestId: "req-1", rosterMode: "canonical" },
    }),
    msg({
      id: "a2",
      sender: "agent",
      agentId: "design-agent",
      agentName: "Design Agent",
      content: "I review UI consistency.",
      createdAt: "2026-07-15T01:00:02.000Z",
      source: "local_llm_runtime",
      metadata: { requestId: "req-1", rosterMode: "canonical" },
    }),
    msg({
      id: "o2",
      sender: "piter",
      content: "Second question",
      createdAt: "2026-07-15T02:00:00.000Z",
      metadata: {
        selectedAgentIds: ["system-agent"],
        rosterMode: "canonical",
      },
    }),
    msg({
      id: "a3",
      sender: "agent",
      agentId: "system-agent",
      agentName: "System Agent",
      content: "Still health.",
      createdAt: "2026-07-15T02:00:01.000Z",
      source: "local_llm_runtime",
      metadata: { requestId: "req-2", rosterMode: "canonical" },
    }),
  ];

  const turns = buildCouncilTurns(filterCouncilMessagesForRosterMode(messages, "canonical"));
  assert(turns.length === 2, "two owner turns expected");
  const latest = latestCouncilTurn(turns) as CouncilTurnView;
  const prior = priorCouncilTurns(turns);
  assert(latest.question === "Second question", "latest question must be newest");
  assert(prior.length === 1, "exactly one prior turn");
  assert(prior[0]!.question === "What is your review focus?", "prior is older turn");
  assert(
    !prior.some((turn) => turn.turnId === latest.turnId),
    "latest must not appear in history",
  );
  assert(latest.summaryLabel === "Council overview", "owner-friendly overview label");
  assert(!/not an LLM consensus/i.test(latest.summaryLabel), "technical summary label removed");

  const workspace = read("src/components/agentops/owner/AgentOpsCouncilWorkspace.tsx");
  assert(workspace.includes("agentops-council-workspace__conversation"), "conversation column");
  assert(workspace.includes("agentops-council-workspace__agents"), "agents side panel");
  assert(workspace.includes("agentops-council-history-drawer"), "history drawer");
  assert(workspace.includes("Council overview"), "friendly overview copy");
  assert(!workspace.includes("Earlier Council turns"), "history not in active viewport");
  assert(!workspace.includes("AixiaMessengerToolbar"), "single custom toolbar");
  assert(workspace.includes("agentops-messenger-dock"), "fixed composer dock");

  const card = read("src/components/agentops/owner/AgentOpsCouncilChatCard.tsx");
  assert(!card.includes("<AixiaSection"), "no nested section chrome on embed");
  assert(card.includes("AgentOpsCouncilWorkspace"), "workspace wired");

  const panel = read("src/components/agentops/owner/AgentOpsCouncilAgentPanelRow.tsx");
  assert(panel.includes("agentops-council-agent-row"), "compact agent panel rows");
  assert(panel.includes('data-testid="agentops-council-response-row"'), "row test id retained");

  const css = read("src/styles/aixia-design-system.css");
  assert(css.includes("clamp(620px, 70vh, 700px)"), "workspace height 620–700");
  assert(css.includes("grid-template-columns: minmax(0, 1.75fr) minmax(220px, 0.7fr)"), "two columns");
  assert(css.includes("max-height: 140px"), "composer dock ≤140");
  assert(css.includes("min-height: 60px"), "composer textarea floor");

  console.log(
    JSON.stringify(
      {
        ok: true,
        layer: "STATIC_CONTRACT_PASS",
        phase: "A.3",
        checks: [
          "composer-dock-fixed-contract",
          "two-column-desktop",
          "history-not-duplicating-latest",
          "overview-label-friendly",
          "no-nested-section",
          "side-panel-rows",
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
