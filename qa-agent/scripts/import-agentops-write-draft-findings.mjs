#!/usr/bin/env node
/**
 * Stage 11B — Read write-draft-safe-report.json and generate AgentOps backlog import artifacts.
 * Does NOT apply SQL automatically. Does NOT use service-role.
 */

import crypto from "crypto";
import fs from "fs";
import path from "path";
import process from "process";

const ROOT = process.cwd();
const SOURCE_REL = "qa-agent/reports/browser-qa/write-draft-safe-report.json";
const SOURCE_PATH = path.join(ROOT, SOURCE_REL);
const REPORTS_DIR = path.join(ROOT, "qa-agent/reports/browser-qa");
const PUBLIC_DIR = path.join(ROOT, "public/agentops");

const OUTPUT_SQL = path.join(REPORTS_DIR, "write-draft-findings-import.sql");
const OUTPUT_MD = path.join(REPORTS_DIR, "write-draft-findings-import.md");
const OUTPUT_JSON = path.join(PUBLIC_DIR, "write-draft-findings-import-plan.json");

const WRITE_IMPORT_AGENT_ID = "write-draft-qa-import";
const INVESTIGATION_FOOTER =
  "Investigate on staging with write-draft-safe evidence first. Do not change permissions, route guards, or RLS until root cause is confirmed. No production writes.";

const PRIORITY_SCORE = {
  Critical: 100,
  High: 80,
  Medium: 60,
  Low: 40,
  Suggestion: 20,
};

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

function readJson(relativePath) {
  const fullPath = path.join(ROOT, relativePath);
  if (!fs.existsSync(fullPath)) {
    fail(`Missing required file: ${relativePath}`);
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(fullPath, "utf8"));
  } catch (error) {
    fail(`${relativePath}: invalid JSON — ${error.message}`);
    return null;
  }
}

function stableIssueCode(findingId) {
  if (findingId) {
    const safe = String(findingId).replace(/[^a-zA-Z0-9-]/g, "-");
    return `AIXIA-WRITE-${safe}`;
  }
  const hash = crypto.createHash("sha256").update(String(Date.now())).digest("hex").slice(0, 8);
  return `AIXIA-WRITE-${hash}`;
}

function findScreenshot(report, qaUserId, route) {
  const user = (report.users ?? []).find((u) => u.qaUserId === qaUserId);
  const fromWorkflow = user?.workflows?.find((w) => w.route === route)?.screenshot;
  if (fromWorkflow) return fromWorkflow;

  const routeSlug = route.replace(/\//g, "_").replace(/^_/, "");
  const match = (report.screenshots ?? []).find(
    (p) => p.includes(qaUserId) && (p.includes(routeSlug) || p.includes("quotations")),
  );
  return match ?? null;
}

function classifyFinding(finding) {
  const title = String(finding.title ?? "").toLowerCase();
  const qaUserId = finding.qaUserId ?? "unknown";
  const route = finding.route ?? null;

  if (qaUserId === "guest" && route?.includes("/quotations/new")) {
    return {
      classification: "permission-review",
      category: "Security/Permission",
      severity: "Medium",
      requiresPiterDecision: true,
      recommendedHandling:
        "Review whether guest should be redirected/blocked from /finance/transactions/quotations/new (shell loaded; Save Draft was not enabled in QA).",
      recommendedNextAction: "Route guard / finance pageAccess review on staging",
      realBugLikelihood: "likely-permission-gap",
    };
  }

  if (qaUserId === "finance-viewer" && route?.includes("/quotations/new")) {
    return {
      classification: "permission-review",
      category: "Security/Permission",
      severity: "Medium",
      requiresPiterDecision: true,
      recommendedHandling:
        "Confirm finance-viewer should not reach create shell; read-only registry may be sufficient.",
      recommendedNextAction: "Permission matrix review for finance-viewer on transaction create routes",
      realBugLikelihood: "likely-permission-gap",
    };
  }

  if (
    qaUserId === "finance-admin" &&
    route?.includes("/quotations") &&
    title.includes("cannot see") &&
    title.includes("create")
  ) {
    return {
      classification: "testability-review",
      category: "Functional",
      severity: "Low",
      requiresPiterDecision: true,
      recommendedHandling:
        "Inspect quotations list UI: create control may use non-button pattern (link/toolbar). Could be Playwright selector mismatch rather than missing admin access.",
      recommendedNextAction: "Manual UI check + align QA selector with real control",
      realBugLikelihood: "uncertain-test-or-ux",
    };
  }

  return {
    classification: "functional-review",
    category: finding.category ?? "Functional",
    severity: finding.severity ?? "Medium",
    requiresPiterDecision: true,
    recommendedHandling: "Review write-draft-safe evidence and classify before fix.",
    recommendedNextAction: "Owner review in AgentOps backlog",
    realBugLikelihood: "needs-review",
  };
}

function shouldImportFinding(finding) {
  if (!finding || typeof finding !== "object") return false;
  const title = String(finding.title ?? "").toLowerCase();
  const problem = String(finding.problem ?? "").toLowerCase();

  if (title.includes("skipped") && title.includes("safety")) return false;
  if (problem.includes("intentionally did not save")) return false;
  if (problem.includes("no record creation")) return false;

  return Boolean(finding.title && (finding.severity || finding.category));
}

function buildCursorPrompt({ finding, meta, screenshotPath }) {
  const fixSection =
    meta.realBugLikelihood === "uncertain-test-or-ux"
      ? "Start with test selector / UI control inspection. Only propose app fixes if manual check confirms broken create access."
      : "Start with route guard and finance permission investigation. Only propose fixes after confirming guest/viewer should not reach create shell.";

  return [
    "# Cursor investigation prompt (write/draft QA — Stage 11B)",
    "",
    `TASK: Investigate ${finding.title}`,
    "",
    "CONTEXT:",
    `- Synthetic user: ${finding.qaUserId}`,
    `- Route: ${finding.route ?? "n/a"}`,
    `- Classification: ${meta.classification}`,
    `- Source: ${SOURCE_REL}`,
    screenshotPath ? `- Screenshot: ${screenshotPath}` : "",
    "",
    "EVIDENCE:",
    finding.problem ?? finding.title,
    "",
    "RECOMMENDED HANDLING:",
    meta.recommendedHandling,
    "",
    fixSection,
    "",
    INVESTIGATION_FOOTER,
  ]
    .filter(Boolean)
    .join("\n");
}

function buildCandidate(finding, report, meta) {
  const screenshotPath = findScreenshot(report, finding.qaUserId, finding.route);
  const issueCode = stableIssueCode(finding.id);

  return {
    issueCode,
    title: `[WRITE-QA] ${finding.title}`,
    category: meta.category,
    severity: meta.severity,
    status: "Backlog",
    queueState: "backlog",
    route: finding.route ?? null,
    module: "write-draft-qa",
    pageType: finding.route?.includes("/new") ? "create-form" : "registry",
    reviewPanel: meta.category === "Security/Permission" ? "Security Panel" : "Functional Panel",
    evidenceSummary: [
      `Imported from Stage 11 write/draft safe QA (${report.runId ?? "unknown"}).`,
      `Report: ${SOURCE_REL}`,
      screenshotPath ? `Screenshot: ${screenshotPath}` : null,
      "Save Draft was not enabled during QA; finding is route-shell / visibility related.",
    ]
      .filter(Boolean)
      .join(" "),
    problem: finding.problem ?? finding.title,
    expectedResult:
      meta.classification === "testability-review"
        ? "Finance-admin should see a discoverable New Quotation create entry on quotations registry."
        : `${finding.qaUserId} should not reach finance create shell without appropriate write permission.`,
    actualResult: finding.problem ?? finding.title,
    recommendedFixStrategy: meta.recommendedHandling,
    cursorPrompt: buildCursorPrompt({ finding, meta, screenshotPath }),
    nonChangeRules:
      "Do not modify production. Staging investigation only until Piter approves import and fix scope.",
    priorityScore: PRIORITY_SCORE[meta.severity] ?? 60,
    agentId: WRITE_IMPORT_AGENT_ID,
    metadata: {
      imported: true,
      importSource: "write-draft-safe",
      stage: "11B",
      sourceReport: SOURCE_REL,
      sourceRunId: report.runId ?? null,
      sourceFindingId: finding.id ?? null,
      classification: meta.classification,
      qaUserId: finding.qaUserId,
      route: finding.route ?? null,
      screenshotPath,
      requiresPiterDecision: meta.requiresPiterDecision,
      recommendedNextAction: meta.recommendedNextAction,
      realBugLikelihood: meta.realBugLikelihood,
      sample: false,
    },
  };
}

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
    sqlJson(candidate.metadata),
  ];

  return `INSERT INTO public.agentops_findings (${columns.join(", ")})
VALUES (${values.join(", ")})
ON CONFLICT (issue_code) DO NOTHING;`;
}

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function main() {
  console.log("AgentOps Stage 11B — write/draft backlog import plan");
  console.log("-----------------------------------------------------");

  const report = readJson(SOURCE_REL);
  if (!report) return;

  const findings = Array.isArray(report.findings) ? report.findings : [];
  const skippedIntentional = [];

  for (const item of report.workflowsSkippedForSafety ?? []) {
    skippedIntentional.push({
      reason: "workflow-skipped-for-safety",
      qaUserId: item.qaUserId,
      workflowId: item.workflowId,
      detail: item.reason,
    });
  }

  skippedIntentional.push({
    reason: "no-records-created-by-design",
    detail: "Stage 11 did not persist drafts; absence of created records is expected.",
  });

  skippedIntentional.push({
    reason: "owner-platform-admin-no-findings",
    detail: "Visibility-only checks produced no report findings.",
  });

  const candidateByCode = new Map();
  let findingsRead = 0;
  let findingsSkipped = 0;

  for (const finding of findings) {
    findingsRead += 1;
    if (!shouldImportFinding(finding)) {
      findingsSkipped += 1;
      skippedIntentional.push({
        reason: "finding-filtered",
        sourceFindingId: finding.id,
        title: finding.title,
      });
      continue;
    }
    const meta = classifyFinding(finding);
    const candidate = buildCandidate(finding, report, meta);
    candidateByCode.set(candidate.issueCode, candidate);
  }

  const candidates = [...candidateByCode.values()];
  const generatedAt = new Date().toISOString();

  const permissionReviewCount = candidates.filter(
    (c) => c.metadata.classification === "permission-review",
  ).length;
  const testabilityCount = candidates.filter(
    (c) => c.metadata.classification === "testability-review",
  ).length;
  const piterDecisionNeededCount = candidates.filter(
    (c) => c.metadata.requiresPiterDecision === true,
  ).length;

  const importPlan = {
    generatedAt,
    source: SOURCE_REL,
    sourceRunId: report.runId ?? null,
    summary: {
      totalCandidates: candidates.length,
      fromReportFindings: findingsRead,
      findingsSkipped,
      permissionReviewCount,
      testabilityCount,
      piterDecisionNeededCount,
      skippedIntentional: skippedIntentional.length,
    },
    skippedIntentional,
    candidates: candidates.map((c) => ({
      issueCode: c.issueCode,
      title: c.title,
      category: c.category,
      severity: c.severity,
      status: c.status,
      queueState: c.queueState,
      route: c.route,
      module: c.module,
      pageType: c.pageType,
      reviewPanel: c.reviewPanel,
      evidenceSummary: c.evidenceSummary,
      problem: c.problem,
      expectedResult: c.expectedResult,
      recommendedFixStrategy: c.recommendedFixStrategy,
      cursorPrompt: c.cursorPrompt,
      nonChangeRules: c.nonChangeRules,
      priorityScore: c.priorityScore,
      agentId: c.agentId,
      metadata: c.metadata,
    })),
  };

  ensureDir(REPORTS_DIR);
  ensureDir(PUBLIC_DIR);

  const sqlHeader = `-- AgentOps Stage 11B write/draft backlog import (generated ${generatedAt})
-- Source: ${SOURCE_REL}
-- Apply on STAGING only with explicit owner approval.
-- ON CONFLICT (issue_code) DO NOTHING

`;

  fs.writeFileSync(OUTPUT_SQL, `${sqlHeader}${candidates.map(buildInsertSql).join("\n\n")}\n`, "utf8");

  const severityCounts = candidates.reduce((acc, c) => {
    acc[c.severity] = (acc[c.severity] ?? 0) + 1;
    return acc;
  }, {});

  const classificationLines = candidates.map((c) => {
    const m = c.metadata;
    return [
      `### ${c.issueCode}`,
      "",
      `- **Title:** ${c.title}`,
      `- **Classification:** ${m.classification}`,
      `- **Real bug likelihood:** ${m.realBugLikelihood}`,
      `- **Piter decision needed:** ${m.requiresPiterDecision ? "Yes" : "No"}`,
      `- **Recommended next action:** ${m.recommendedNextAction}`,
      "",
    ].join("\n");
  });

  const md = [
    "# AgentOps write/draft findings import plan",
    "",
    `- Generated: ${generatedAt}`,
    `- Source: \`${SOURCE_REL}\``,
    `- Source run ID: \`${report.runId ?? "n/a"}\``,
    `- SQL: \`qa-agent/reports/browser-qa/write-draft-findings-import.sql\``,
    `- UI plan: \`public/agentops/write-draft-findings-import-plan.json\``,
    "",
    "## Counts",
    "",
    "| Metric | Count |",
    "| --- | ---: |",
    `| Findings read | ${findingsRead} |`,
    `| Findings skipped (filtered) | ${findingsSkipped} |`,
    `| Candidates converted | ${candidates.length} |`,
    `| Permission review | ${permissionReviewCount} |`,
    `| Testability review | ${testabilityCount} |`,
    `| Piter decision needed | ${piterDecisionNeededCount} |`,
    `| Intentional skips logged | ${skippedIntentional.length} |`,
    "",
    "## Severity summary",
    "",
    ...Object.entries(severityCounts).map(([sev, n]) => `- ${sev}: ${n}`),
    "",
    "## Issue codes",
    "",
    ...(candidates.length === 0
      ? ["- None"]
      : candidates.map((c) => `- \`${c.issueCode}\` — ${c.title}`)),
    "",
    "## Classification (per candidate)",
    "",
    ...(classificationLines.length ? classificationLines : ["- None"]),
    "",
    "## Skipped by design",
    "",
    "- Stage 11 workflows skipped for safety (Save Draft not clicked, master-data, etc.)",
    "- Zero records created is expected for Stage 11 MVP",
    "- Critical findings array empty (nothing to import)",
    "",
    "## Apply SQL",
    "",
    "Run on **staging** Supabase after Piter review. This script does **not** apply SQL.",
    "",
    "## UI import",
    "",
    "Use **Import Write/Draft Findings** on `/system/agent-ops` after generating this plan.",
    "",
  ].join("\n");

  fs.writeFileSync(OUTPUT_MD, md, "utf8");
  fs.writeFileSync(OUTPUT_JSON, `${JSON.stringify(importPlan, null, 2)}\n`, "utf8");

  console.log(`Source: ${SOURCE_REL}`);
  console.log(`Findings read: ${findingsRead}`);
  console.log(`Candidates converted: ${candidates.length}`);
  console.log(`Skipped intentional log entries: ${skippedIntentional.length}`);
  console.log(`SQL: ${path.relative(ROOT, OUTPUT_SQL)}`);
  console.log(`Report: ${path.relative(ROOT, OUTPUT_MD)}`);
  console.log(`UI plan: ${path.relative(ROOT, OUTPUT_JSON)}`);
  if (candidates.length > 0) {
    console.log(`Issue codes: ${candidates.map((c) => c.issueCode).join(", ")}`);
  }
  console.log("Result: PASS (artifacts generated; SQL not applied)");
}

main();
