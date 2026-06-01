#!/usr/bin/env node
/**
 * Stage 10D — Build Piter-approved-only role workflow import artifacts (RWF-28, RWF-29).
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const SOURCE_PLAN = path.join(repoRoot, "public/agentops/role-workflow-import-plan.json");
const APPROVED_IDS = new Set(["RWF-28", "RWF-29"]);
const REPORTS_DIR = path.join(repoRoot, "qa-agent/reports/browser-qa");
const PUBLIC_DIR = path.join(repoRoot, "public/agentops");

function sqlEscape(value) {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  return `'${String(value).replace(/'/g, "''")}'`;
}

function sqlJson(value) {
  return `'${JSON.stringify(value).replace(/'/g, "''")}'::jsonb`;
}

function buildInsertSql(candidate) {
  const metadata = {
    ...candidate.metadata,
    imported: true,
    importSource: "role-workflow-safe",
    approvedByPiter: true,
    approvalStage: "10D",
    sourceFindingId: candidate.metadata.sourceFindingId,
    decision: "import-as-agentops-issue",
    reason: "guest should not access finance routes",
    piterApprovedAt: new Date().toISOString(),
  };

  const columns = [
    "issue_code",
    "title",
    "category",
    "severity",
    "status",
    "queue_state",
    "top10_rank",
    "route",
    "module",
    "page_type",
    "user_role",
    "review_panel",
    "evidence_summary",
    "problem",
    "expected_result",
    "actual_result",
    "recommended_fix_strategy",
    "cursor_prompt",
    "non_change_rules",
    "priority_score",
    "agent_id",
    "metadata",
  ];

  const actualResult =
    candidate.actualResult ??
    `Browser QA observed "${candidate.metadata?.actualStatus ?? "loaded"}" for guest on ${candidate.route}.`;

  const values = [
    sqlEscape(candidate.issueCode),
    sqlEscape(candidate.title),
    sqlEscape(candidate.category),
    sqlEscape(candidate.severity),
    sqlEscape(candidate.status),
    sqlEscape(candidate.queueState),
    "NULL",
    sqlEscape(candidate.route),
    sqlEscape(candidate.module),
    sqlEscape(candidate.pageType),
    sqlEscape(candidate.metadata?.qaUserId === "guest" ? "guest" : null),
    sqlEscape(candidate.reviewPanel),
    sqlEscape(candidate.evidenceSummary),
    sqlEscape(candidate.problem),
    sqlEscape(candidate.expectedResult),
    sqlEscape(actualResult),
    sqlEscape(candidate.recommendedFixStrategy),
    sqlEscape(candidate.cursorPrompt),
    sqlEscape(candidate.nonChangeRules),
    sqlEscape(candidate.priorityScore),
    sqlEscape(candidate.agentId),
    sqlJson(metadata),
  ];

  return `INSERT INTO public.agentops_findings (${columns.join(", ")})
VALUES (${values.join(", ")})
ON CONFLICT (issue_code) DO NOTHING;`;
}

function main() {
  const fullPlan = JSON.parse(fs.readFileSync(SOURCE_PLAN, "utf8"));
  const approved = fullPlan.candidates.filter((c) =>
    APPROVED_IDS.has(c.metadata?.sourceFindingId),
  );

  if (approved.length !== 2) {
    console.error(`Expected 2 approved candidates, found ${approved.length}`);
    process.exit(1);
  }

  const generatedAt = new Date().toISOString();
  const approvedPlan = {
    generatedAt,
    stage: "10D",
    approvedByPiter: true,
    stagingProjectRef: "ydppcpbxrvvardeslzrk",
    sourceFullPlan: "public/agentops/role-workflow-import-plan.json",
    summary: {
      approvedFindingIds: ["RWF-28", "RWF-29"],
      approvedIssueCodes: approved.map((c) => c.issueCode),
      totalCandidates: approved.length,
      heldBackCount: fullPlan.candidates.length - approved.length,
    },
    heldBackNote:
      "18 needs-piter-decision and other Stage 10B candidates remain held; not included in this plan.",
    candidates: approved,
  };

  const sqlHeader = `-- AgentOps Stage 10D approved role workflow import (generated ${generatedAt})
-- Staging only: ydppcpbxrvvardeslzrk
-- Approved by Piter: RWF-28, RWF-29 (guest finance access)
-- ON CONFLICT (issue_code) DO NOTHING

`;

  const sqlBody = approved.map(buildInsertSql).join("\n\n");
  fs.writeFileSync(
    path.join(REPORTS_DIR, "agentops-role-workflow-approved-import.sql"),
    `${sqlHeader}${sqlBody}\n`,
  );
  fs.writeFileSync(
    path.join(PUBLIC_DIR, "role-workflow-approved-import-plan.json"),
    `${JSON.stringify(approvedPlan, null, 2)}\n`,
  );

  const md = [
    "# AgentOps role workflow approved import (Stage 10D)",
    "",
    `- Generated: ${generatedAt}`,
    `- Staging project: \`ydppcpbxrvvardeslzrk\``,
    `- Approved findings: **RWF-28**, **RWF-29**`,
    "",
    "## Issue codes",
    "",
    ...approved.map((c) => `- \`${c.issueCode}\` — ${c.title} (${c.severity})`),
    "",
    "## Held back",
    "",
    `${fullPlan.candidates.length - approved.length} other Stage 10B candidates are **not** in this file.`,
    "",
    "## Apply",
    "",
    "Run SQL in Supabase staging SQL editor or via approved automation:",
    "`qa-agent/reports/browser-qa/agentops-role-workflow-approved-import.sql`",
    "",
  ].join("\n");

  fs.writeFileSync(path.join(REPORTS_DIR, "agentops-role-workflow-approved-import.md"), `${md}\n`);

  console.log(JSON.stringify({ approved: approved.map((c) => c.issueCode), generatedAt }));
}

main();
