#!/usr/bin/env node
/**
 * Stage 11C — Filter WDS-1/WDS-2 from write-draft import plan into approved artifacts.
 */
import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const SOURCE_PLAN = path.join(ROOT, "public/agentops/write-draft-findings-import-plan.json");
const APPROVED_CODES = new Set(["AIXIA-WRITE-WDS-1", "AIXIA-WRITE-WDS-2"]);
const HELD_CODES = ["AIXIA-WRITE-WDS-3"];

const OUTPUT_SQL = path.join(ROOT, "qa-agent/reports/browser-qa/write-draft-approved-import.sql");
const OUTPUT_MD = path.join(ROOT, "qa-agent/reports/browser-qa/write-draft-approved-import.md");
const OUTPUT_JSON = path.join(ROOT, "public/agentops/write-draft-approved-import-plan.json");

const APPROVAL_META = {
  approvedByPiter: true,
  approvalStage: "11C",
  decision: "import-as-agentops-issue",
  heldFindings: HELD_CODES,
  reason: "Guest/viewer quotation create-shell access requires permission review.",
};

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
  const metadata = { ...candidate.metadata, ...APPROVAL_META };
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
    "review_panel",
    "evidence_summary",
    "problem",
    "expected_result",
    "recommended_fix_strategy",
    "cursor_prompt",
    "non_change_rules",
    "priority_score",
    "agent_id",
    "metadata",
  ];
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
    sqlEscape(candidate.reviewPanel),
    sqlEscape(candidate.evidenceSummary),
    sqlEscape(candidate.problem),
    sqlEscape(candidate.expectedResult),
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

const plan = JSON.parse(fs.readFileSync(SOURCE_PLAN, "utf8"));
const approved = plan.candidates.filter((c) => APPROVED_CODES.has(c.issueCode));
const held = plan.candidates.filter((c) => HELD_CODES.includes(c.issueCode));

if (approved.length !== 2) {
  console.error(`Expected 2 approved candidates, got ${approved.length}`);
  process.exit(1);
}

const generatedAt = new Date().toISOString();

const approvedPlan = {
  generatedAt,
  source: plan.source,
  sourceRunId: plan.sourceRunId,
  approvalStage: "11C",
  approvedIssueCodes: [...APPROVED_CODES],
  heldIssueCodes: HELD_CODES,
  summary: {
    approvedCount: approved.length,
    heldCount: held.length,
    permissionReviewCount: approved.filter(
      (c) => c.metadata?.classification === "permission-review",
    ).length,
  },
  heldFindings: held.map((c) => ({
    issueCode: c.issueCode,
    title: c.title,
    reason: "Held for testability/selector investigation — not imported in Stage 11C",
  })),
  candidates: approved.map((c) => ({
    ...c,
    metadata: { ...c.metadata, ...APPROVAL_META },
  })),
};

const sqlHeader = `-- AgentOps Stage 11C write/draft APPROVED import (generated ${generatedAt})
-- Staging only: ydppcpbxrvvardeslzrk
-- Approved: AIXIA-WRITE-WDS-1, AIXIA-WRITE-WDS-2
-- Held (NOT in this file): AIXIA-WRITE-WDS-3
-- ON CONFLICT (issue_code) DO NOTHING

`;

fs.writeFileSync(OUTPUT_SQL, `${sqlHeader}${approved.map(buildInsertSql).join("\n\n")}\n`, "utf8");
fs.writeFileSync(OUTPUT_JSON, `${JSON.stringify(approvedPlan, null, 2)}\n`, "utf8");

const md = [
  "# AgentOps write/draft approved import (Stage 11C)",
  "",
  `- Generated: ${generatedAt}`,
  `- Source plan: \`public/agentops/write-draft-findings-import-plan.json\``,
  `- Staging project: \`ydppcpbxrvvardeslzrk\``,
  "",
  "## Piter decision",
  "",
  "| Issue | Action |",
  "| --- | --- |",
  "| AIXIA-WRITE-WDS-1 | **Import** — finance-viewer quotation create shell |",
  "| AIXIA-WRITE-WDS-2 | **Import** — guest quotation create shell |",
  "| AIXIA-WRITE-WDS-3 | **Hold** — testability/selector review first |",
  "",
  "## Approved candidates",
  "",
  ...approved.map((c) => `- \`${c.issueCode}\` — ${c.title}`),
  "",
  "## Held",
  "",
  ...held.map((c) => `- \`${c.issueCode}\` — ${c.title}`),
  "",
  "## Apply",
  "",
  "Run `write-draft-approved-import.sql` on staging Supabase only after review.",
  "",
].join("\n");

fs.writeFileSync(OUTPUT_MD, md, "utf8");
console.log(`Approved: ${approved.map((c) => c.issueCode).join(", ")}`);
console.log(`Held: ${HELD_CODES.join(", ")}`);
console.log(`SQL: ${OUTPUT_SQL}`);
console.log(`JSON: ${OUTPUT_JSON}`);
