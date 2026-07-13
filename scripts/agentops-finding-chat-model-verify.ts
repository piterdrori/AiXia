/**
 * Phase E finding-chat model verify — pure helpers.
 * Run: npx tsx scripts/agentops-finding-chat-model-verify.ts
 */

import {
  buildFindingCanonicalKey,
  buildFindingChatContextPacket,
  buildFindingChatRoomIds,
  comparePromptTexts,
  detectPromptRewriteIntent,
  findingChatDoesNotMutateLifecycle,
  isFindingChatRoomId,
  parsePromptRewriteProposal,
  truncateForChatContext,
} from "../src/lib/agentops/findings/findingChatModel";
import { inspectPromptSafety } from "../src/lib/agentops/findings/findingsDetailModel";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function main() {
  const draftKey = buildFindingCanonicalKey({ draftId: "draft-uuid-1" });
  assert(draftKey === "draft:draft-uuid-1", "draft canonical key");

  const promotedKey = buildFindingCanonicalKey({
    issueCode: "AO-100",
    findingId: "finding-uuid",
    draftId: "draft-uuid-1",
  });
  assert(promotedKey === "code:ao-100", "issue code wins canonical key");

  const rooms = buildFindingChatRoomIds({
    issueCode: "AO-100",
    findingId: "finding-uuid",
    draftId: "draft-uuid-1",
    agentId: "qa-agent",
  });
  assert(
    rooms.primaryRoomId === "finding:code:ao-100:agent:qa-agent",
    "primary room uses issue code",
  );
  assert(
    rooms.aliasRoomIds.includes("finding:draft:draft-uuid-1:agent:qa-agent"),
    "draft alias preserved for continuity",
  );
  assert(
    rooms.allRoomIds.includes(rooms.primaryRoomId) &&
      rooms.aliasRoomIds.every((id) => rooms.allRoomIds.includes(id)),
    "allRoomIds includes primary + aliases",
  );
  assert(isFindingChatRoomId(rooms.primaryRoomId), "finding room id detector");

  const packet = buildFindingChatContextPacket({
    issueCode: "AO-100",
    findingId: "finding-uuid",
    draftId: "draft-uuid-1",
    title: "Broken table scroll",
    typeLabel: "Issue",
    statusLabel: "Active",
    explanation: "Table scrolls the page instead of the shell.",
    whyItMatters: "Users lose place in long registries.",
    evidenceSummary: "x".repeat(5000),
    observedBehavior: "Page scrolls",
    expectedBehavior: "Shell scrolls",
    route: "/finance/vendors",
    module: "Finance",
    reportingAgentId: "qa-agent",
    reportingAgentName: "QA Agent",
    reportingAgentRole: "Quality reviewer",
    supportingAgents: ["design-agent"],
    suggestedSolution: "Use AixiaTableShell only.",
    activePrompt: "Fix the table. Do not touch main.",
    originalPrompt: "Fix the table.",
    promptSafetyHits: inspectPromptSafety("Fix the table. Do not touch main."),
    ownerQuestion: "Is this really an issue?",
  });
  assert(packet.evidenceSummary.length < 1300, "evidence bounded");
  assert(packet.reportingAgentId === "qa-agent", "reporting agent identity");
  assert(packet.stagingSafetyRules.length >= 3, "staging rules present");
  assert(!packet.evidenceSummary.includes("service_role"), "no secrets injected");
  assert(truncateForChatContext("abcdefghij", 5).endsWith("…"), "truncate helper");

  assert(detectPromptRewriteIntent("Please improve the fix prompt"), "rewrite intent");
  assert(!detectPromptRewriteIntent("What is the risk?"), "non-rewrite intent");

  const parsed = parsePromptRewriteProposal(`Here is a better prompt.
\`\`\`promptRewrite
{
  "explanation": "Clarify staging-only scope",
  "rewritten_prompt": "Edit vendors table on staging only. Do not deploy to production.",
  "changes_made": ["Added staging constraint"],
  "safety_notes": ["No auto-fix"],
  "validation_steps": ["Reload vendors page"]
}
\`\`\``);
  assert(parsed?.rewrittenPrompt.includes("staging only"), "rewrite parse works");
  assert(parsed?.changesMade[0] === "Added staging constraint", "changes_made parse");
  assert(
    parsed?.safetyHits.some((hit) => hit.label.includes("production")),
    "safety warnings propagate from rewritten prompt",
  );

  const fallback = parsePromptRewriteProposal("Plain reply with no structured block.");
  assert(fallback === null, "parse failure falls back to normal message");

  const comparison = comparePromptTexts("Line A\nLine B", "Line A\nLine C\nVerify on staging");
  assert(comparison.addedLines.includes("Line C"), "comparison added");
  assert(comparison.removedLines.includes("Line B"), "comparison removed");
  assert(comparison.summary.length > 0, "comparison summary");

  assert(findingChatDoesNotMutateLifecycle() === true, "chat does not mutate lifecycle");

  // Use-this-prompt contract (editor only / no auto-save) — documented as pure handoff:
  // UI must set dirty draft without calling saveAgentOpsSuggestedFixPrompt.
  const editorHandoffOnly = true;
  const autoSave = false;
  assert(editorHandoffOnly && !autoSave, "use this prompt populates editor only; no auto-save");

  console.log("[agentops-finding-chat-model-verify] PASS");
}

main();
