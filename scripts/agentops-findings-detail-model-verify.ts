/**
 * Phase D finding-detail model verify — pure helpers.
 * Run: npx tsx scripts/agentops-findings-detail-model-verify.ts
 */

import {
  inspectPromptSafety,
  mapFeedbackToHistoryLabel,
  ownerReadableExplanation,
  resolveSuggestedFixPrompt,
  validOwnerActionsFor,
} from "../src/lib/agentops/findings/findingsDetailModel";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function main() {
  const prompt = resolveSuggestedFixPrompt({
    ownerEditedPrompt: "edited",
    cursorPrompt: "cursor",
    suggestedFixPrompt: "suggested",
  });
  assert(prompt.source === "owner_edited_prompt" && prompt.text === "edited", "owner edit wins");
  assert(prompt.originalText === "cursor", "original preserved from cursor");

  const fallback = resolveSuggestedFixPrompt({
    remediationPrompt: "remediate",
  });
  assert(fallback.source === "remediation_prompt", "remediation fallback");

  const none = resolveSuggestedFixPrompt({});
  assert(none.source === "none" && none.text === null, "empty prompt");

  const unsafe = inspectPromptSafety("Please deploy to production and push to main");
  assert(unsafe.some((hit) => hit.label.includes("production")), "safety production");
  assert(unsafe.some((hit) => hit.label.includes("main")), "safety main");

  const readable = ownerReadableExplanation(
    '[Monitoring draft] page.goto: Timeout 8000ms exceeded. Call log: - navigating',
  );
  assert(readable.inferred, "technical explanation inferred");
  assert(readable.technical, "technical preserved");

  const needsReview = validOwnerActionsFor({
    source: "draft",
    ownerStatus: "needs_review",
    hasFindingId: false,
    hasDraftId: true,
    hasPendingVerification: false,
  });
  assert(needsReview.includes("approve"), "draft approve");
  assert(!needsReview.includes("mark_fixed"), "draft no mark fixed");

  const active = validOwnerActionsFor({
    source: "finding",
    ownerStatus: "active",
    hasFindingId: true,
    hasDraftId: false,
    hasPendingVerification: false,
  });
  assert(active.includes("mark_fixed"), "active mark fixed");
  assert(active.includes("request_verification"), "active request verification");

  const waiting = validOwnerActionsFor({
    source: "finding",
    ownerStatus: "waiting_for_verification",
    hasFindingId: true,
    hasDraftId: false,
    hasPendingVerification: true,
  });
  assert(waiting.includes("verify") && waiting.includes("reopen"), "verification actions");

  assert(
    mapFeedbackToHistoryLabel("remark", { action: "save_suggested_fix_prompt" }) ===
      "Prompt edited",
    "prompt history label",
  );

  console.log("[agentops-findings-detail-model-verify] PASS");
}

main();
