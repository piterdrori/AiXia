/**
 * AgentOps Findings lifecycle model verify — pure mapper/dedupe/tab tests.
 * Run: npx tsx scripts/agentops-findings-lifecycle-model-verify.ts
 */

import {
  applyFindingsFilters,
  buildCanonicalFindingKey,
  buildFindingsSummaryCounts,
  dedupeCanonicalFindings,
  findingMatchesTab,
  mapDraftOwnerStatus,
  mapFindingOwnerStatus,
  mapOwnerFindingType,
  parseFindingsTab,
  toCanonicalFindingView,
  type CanonicalFindingView,
} from "../src/lib/agentops/findings/findingsLifecycleModel";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function main() {
  assert(mapOwnerFindingType("error") === "issue", "error → issue");
  assert(mapOwnerFindingType("bug") === "issue", "bug → issue");
  assert(mapOwnerFindingType("Improvement") === "improvement", "Improvement → improvement");
  assert(mapOwnerFindingType("new_feature") === "feature", "new_feature → feature");
  assert(mapOwnerFindingType("feature_idea") === "feature", "feature_idea → feature");

  assert(mapDraftOwnerStatus("draft") === "needs_review", "draft → needs_review");
  assert(mapDraftOwnerStatus("promoted") === "superseded", "promoted → superseded");
  assert(mapDraftOwnerStatus("rejected") === "rejected", "rejected → rejected");
  assert(mapDraftOwnerStatus("deferred") === "deferred", "deferred → deferred");

  assert(mapFindingOwnerStatus("Active Top 10") === "active", "Active Top 10 → active");
  assert(mapFindingOwnerStatus("Marked Fixed by Piter") === "fixed", "Marked Fixed → fixed");
  assert(
    mapFindingOwnerStatus("Verification Running") === "waiting_for_verification",
    "Verification Running → waiting_for_verification",
  );
  assert(mapFindingOwnerStatus("Verified Fixed") === "verified", "Verified Fixed → verified");
  assert(mapFindingOwnerStatus("False Positive") === "rejected", "False Positive → rejected");

  const promotedDraft = toCanonicalFindingView({
    source: "draft",
    id: "d1",
    draftId: "d1",
    title: "Promoted draft",
    statusRaw: "promoted",
    typeRaw: "error",
    issueCode: "ISS-1",
    promotedIssueId: "uuid-1",
  });
  assert(promotedDraft === null, "promoted draft is superseded (dropped)");

  const draft = toCanonicalFindingView({
    source: "draft",
    id: "d2",
    draftId: "d2",
    title: "Needs review draft",
    statusRaw: "draft",
    typeRaw: "bug",
    agentSlug: "qa-agent",
    duplicateKey: "dup-1",
  });
  assert(draft?.ownerStatus === "needs_review", "draft maps needs_review");
  assert(draft?.type === "issue", "draft type issue");

  const finding = toCanonicalFindingView({
    source: "finding",
    id: "f1",
    findingId: "f1",
    title: "Promoted issue",
    statusRaw: "Active Top 10",
    typeRaw: "Functional",
    issueCode: "ISS-1",
    promotedIssueId: "uuid-1",
    agentSlug: "qa-agent",
  });
  assert(finding?.ownerStatus === "active", "finding active");

  const duplicateDraft = toCanonicalFindingView({
    source: "draft",
    id: "d3",
    draftId: "d3",
    title: "Same as finding",
    statusRaw: "draft",
    typeRaw: "error",
    issueCode: "ISS-1",
    promotedIssueId: "uuid-1",
  });

  const deduped = dedupeCanonicalFindings(
    [draft!, finding!, duplicateDraft!].filter(Boolean) as CanonicalFindingView[],
  );
  assert(deduped.length === 2, `dedupe expected 2 got ${deduped.length}`);
  assert(
    deduped.some((item) => item.source === "finding" && item.issueCode === "ISS-1"),
    "finding wins over draft for same code/promoted key",
  );
  assert(
    buildCanonicalFindingKey({
      source: "finding",
      id: "f1",
      title: "x",
      statusRaw: "Active Top 10",
      issueCode: "ISS-1",
      promotedIssueId: "uuid-1",
    }) === "promoted:uuid-1",
    "key prefers promoted issue id",
  );

  assert(findingMatchesTab(draft!, "needs-review"), "draft in needs-review");
  assert(findingMatchesTab(finding!, "active"), "issue in active");
  assert(!findingMatchesTab(finding!, "improvements"), "issue not in improvements");

  const improvement = toCanonicalFindingView({
    source: "finding",
    id: "f2",
    title: "Improve nav",
    statusRaw: "Backlog",
    typeRaw: "Improvement",
    issueCode: "IMP-1",
  })!;
  assert(findingMatchesTab(improvement, "improvements"), "improvement tab");
  assert(findingMatchesTab(improvement, "needs-review"), "improvement backlog also needs-review");

  const filtered = applyFindingsFilters([finding!, improvement], { agent: "qa-agent" });
  assert(filtered.length === 1 && filtered[0].issueCode === "ISS-1", "agent filter");

  assert(parseFindingsTab("needs_review") === "needs-review", "legacy tab alias");
  assert(parseFindingsTab("features") === "new-features", "features alias");

  const summary = buildFindingsSummaryCounts([draft!, finding!, improvement], false);
  assert(summary.needsReview === 2, "needs review count");
  assert(summary.activeIssues === 1, "active issues count");
  assert(summary.improvements === 1, "improvements count");

  const unavailable = buildFindingsSummaryCounts(null, true);
  assert(unavailable.needsReview === "Unavailable", "no fake zero when unavailable");

  console.log("[agentops-findings-lifecycle-model-verify] PASS");
}

main();
