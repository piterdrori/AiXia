#!/usr/bin/env node
/**
 * Stage 10B — Classify Stage 10 role-workflow-safe findings and generate backlog import artifacts.
 * Does NOT apply SQL. Does NOT modify app permissions.
 */

import crypto from "crypto";
import fs from "fs";
import path from "path";
import process from "process";

const ROOT = process.cwd();
const SOURCE_REL = "qa-agent/reports/browser-qa/role-workflow-safe-report.json";
const SOURCE_PATH = path.join(ROOT, SOURCE_REL);
const SCOPE_REL = "qa-agent/browser-qa/workflow-scope.json";
const USERS_REL = "qa-agent/browser-qa/synthetic-browser-users.json";
const REPORTS_DIR = path.join(ROOT, "qa-agent/reports/browser-qa");
const PUBLIC_DIR = path.join(ROOT, "public/agentops");

const OUTPUT_REVIEW_JSON = path.join(REPORTS_DIR, "role-workflow-findings-review.json");
const OUTPUT_REVIEW_MD = path.join(REPORTS_DIR, "role-workflow-findings-review.md");
const OUTPUT_SQL = path.join(REPORTS_DIR, "agentops-role-workflow-import.sql");
const OUTPUT_JSON = path.join(PUBLIC_DIR, "role-workflow-import-plan.json");

const WORKFLOW_IMPORT_AGENT_ID = "role-workflow-qa-import";

const PRIORITY_SCORE = {
  Critical: 100,
  High: 80,
  Medium: 60,
  Low: 40,
  Suggestion: 20,
};

const CLASSIFICATIONS = [
  "real-permission-issue",
  "scope-expectation-mismatch",
  "staging-role-setup-issue",
  "acceptable-current-behavior",
  "needs-piter-decision",
];

function readJson(relativePath) {
  const fullPath = path.join(ROOT, relativePath);
  if (!fs.existsSync(fullPath)) {
    console.error(`Missing required file: ${relativePath}`);
    process.exitCode = 1;
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(fullPath, "utf8"));
  } catch (error) {
    console.error(`${relativePath}: invalid JSON — ${error.message}`);
    process.exitCode = 1;
    return null;
  }
}

function issueCodeFromFindingId(id) {
  const safe = String(id ?? "unknown").replace(/[^a-zA-Z0-9-]/g, "-");
  return `AIXIA-WORKFLOW-${safe}`;
}

function routeAllowedByCatalog(user, route) {
  const allowed = user?.allowedModules ?? [];
  if (route === "/finance" && allowed.includes("finance")) return true;
  if (route === "/finance/reports" && allowed.includes("finance-reports")) return true;
  if (route === "/finance/master-data" && allowed.includes("finance-master-data")) return true;
  if (route === "/finance/transactions" && allowed.includes("finance-transactions")) return true;
  if (route === "/ai-management" && allowed.includes("ai-management")) return true;
  if (route === "/dashboard" && allowed.includes("dashboard")) return true;
  return false;
}

function financeBlockedInCatalog(user) {
  return (user?.blockedModules ?? []).includes("finance");
}

function findRouteEntry(report, qaUserId, route) {
  const user = report.users?.find((u) => u.qaUserId === qaUserId);
  return user?.routes?.find((r) => r.route === route) ?? null;
}

function findScreenshot(report, qaUserId, route) {
  const routeEntry = findRouteEntry(report, qaUserId, route);
  if (routeEntry?.screenshotPath) return routeEntry.screenshotPath;
  const slug = route.replace(/\//g, "_").replace(/^_/, "") || "root";
  const needle = `${qaUserId}-${slug}`;
  return report.screenshots?.find((p) => p.includes(needle)) ?? null;
}

function getExpectedAccess(scope, qaUserId, route) {
  const routeSpec = scope.routes?.find((r) => r.route === route);
  return routeSpec?.expectedAccess?.[qaUserId] ?? null;
}

/**
 * Classify a Stage 10 "unexpected access allowed" finding.
 * Defaults ambiguous cases to needs-piter-decision per Stage 10B spec.
 */
function classifyFinding(finding, user, scope, report) {
  const qaUserId = finding.qaUserId;
  const route = finding.route;
  const expectedStatus = getExpectedAccess(scope, qaUserId, route);
  const routeEntry = findRouteEntry(report, qaUserId, route);
  const actualStatus = routeEntry?.status ?? "loaded";
  const base = {
    findingId: finding.id,
    qaUserId,
    route,
    expectedStatus,
    actualStatus,
    profileRole: user?.profileRole ?? null,
    intendedPlatformRole: user?.intendedPlatformRole ?? null,
    workflowScopeUpdate: null,
  };

  if (qaUserId === "guest" && route.startsWith("/finance")) {
    return {
      ...base,
      classification: "real-permission-issue",
      rationale:
        "Guest synthetic user loaded a finance route; catalog blocks finance module. Review whether finance UI/data is exposed beyond intended guest boundary.",
      importCandidate: true,
      severity: "High",
      category: "Security/Permission",
      reviewPanel: "Security Panel",
    };
  }

  if (qaUserId === "finance-admin" && route === "/ai-management") {
    return {
      ...base,
      classification: "staging-role-setup-issue",
      rationale:
        "Finance Admin QA uses profiles.role=admin, which may grant broader navigation than workflow-scope persona. Not a confirmed data leak in Stage 10.",
      importCandidate: false,
      severity: "Medium",
      category: "Logical",
      reviewPanel: "Functional Panel",
      workflowScopeUpdate:
        'workflow-scope.json: consider expected "loaded" for finance-admin on /ai-management OR narrow staging profileRole/permissions for this synthetic user.',
    };
  }

  if (routeAllowedByCatalog(user, route)) {
    return {
      ...base,
      classification: "scope-expectation-mismatch",
      rationale:
        "synthetic-browser-users.json allows this module; workflow-scope.json expected block/redirect. Likely test matrix mismatch, not a confirmed permission bug.",
      importCandidate: false,
      severity: "Low",
      category: "Logical",
      reviewPanel: "Functional Panel",
      workflowScopeUpdate: `Set expectedAccess["${qaUserId}"]["${route}"] to "loaded" if current staging behavior is correct.`,
    };
  }

  if (financeBlockedInCatalog(user) && route.startsWith("/finance")) {
    return {
      ...base,
      classification: "scope-expectation-mismatch",
      rationale:
        "Catalog blocks finance for this persona, but Stage 10 saw route shell load (navigation) without write actions. workflow-scope may be stricter than current route guards.",
      importCandidate: false,
      severity: "Low",
      category: "Logical",
      reviewPanel: "Functional Panel",
      workflowScopeUpdate:
        `Clarify whether ${qaUserId} should hard-redirect finance routes or only block writes/data APIs.`,
    };
  }

  if (qaUserId === "finance-viewer") {
    return {
      ...base,
      classification: "needs-piter-decision",
      rationale:
        "Finance Viewer has read finance overrides; master-data/transactions/ai-management access needs owner decision on read vs navigation-only.",
      importCandidate: true,
      severity: "Medium",
      category: "Logical",
      reviewPanel: "Functional Panel",
    };
  }

  if (qaUserId === "hr-admin" && route.startsWith("/finance")) {
    return {
      ...base,
      classification: "needs-piter-decision",
      rationale:
        "HR Admin QA (manager + payroll overrides) reached finance routes; confirm whether HR should see finance hub vs employee-directory-only paths.",
      importCandidate: true,
      severity: "Medium",
      category: "Logical",
      reviewPanel: "Functional Panel",
    };
  }

  if (qaUserId === "ai-user" && route.startsWith("/finance")) {
    return {
      ...base,
      classification: "needs-piter-decision",
      rationale:
        "AI User QA is scoped to chat/ai-management in catalog; finance route load needs owner decision before treating as bug.",
      importCandidate: true,
      severity: "Medium",
      category: "Logical",
      reviewPanel: "Functional Panel",
    };
  }

  return {
    ...base,
    classification: "needs-piter-decision",
    rationale:
      "Route loaded while workflow-scope expected deny/redirect. Confirm intended RBAC with Piter before code or policy changes.",
    importCandidate: true,
    severity: "Medium",
    category: "Logical",
    reviewPanel: "Functional Panel",
  };
}

function buildCursorPrompt({ title, qaUserId, route, problem, classification }) {
  return [
    "# Cursor investigation prompt (role workflow QA — Stage 10B)",
    "",
    `TASK: ${title}`,
    "",
    "CONTEXT:",
    `- Classification: ${classification}`,
    `- Synthetic user: ${qaUserId}`,
    `- Route: ${route}`,
    `- Source: ${SOURCE_REL}`,
    "",
    "EVIDENCE:",
    problem,
    "",
    "INVESTIGATION (do not change code until confirmed):",
    "- Inspect route guards, profiles.role, and permission overrides for this synthetic user on staging.",
    "- Compare workflow-scope.json, synthetic-browser-users.json, and actual UI/data exposure.",
    "- Confirm with Piter whether navigation-only load is acceptable or a real permission bug.",
    "",
    "Preserve business logic, Supabase policies, routing, and handlers unless a confirmed bug requires a targeted fix.",
  ].join("\n");
}

function buildImportCandidate(reviewed, user, report) {
  const roleLabel = user?.displayName ?? reviewed.qaUserId;
  const screenshotPath = findScreenshot(report, reviewed.qaUserId, reviewed.route);
  const issueCode = issueCodeFromFindingId(reviewed.findingId);

  const title = `[WORKFLOW] ${reviewed.route} access review for ${roleLabel}`;
  const problem = `Stage 10 safe workflow QA: ${roleLabel} (${reviewed.qaUserId}) loaded ${reviewed.route} while workflow-scope expected ${reviewed.expectedStatus ?? "block"}. ${reviewed.rationale}`;
  const expectedResult = `Per workflow-scope.json, ${reviewed.qaUserId} should receive "${reviewed.expectedStatus}" for ${reviewed.route}.`;
  const actualResult = `Browser observed status "${reviewed.actualStatus}" (route shell loaded).`;

  return {
    issueCode,
    title,
    category: reviewed.category,
    severity: reviewed.severity,
    status: "Backlog",
    queueState: "backlog",
    route: reviewed.route,
    module: "role-workflow-qa",
    pageType: null,
    reviewPanel: reviewed.reviewPanel,
    evidenceSummary: [
      `Imported from Stage 10B role workflow review (${report.runId ?? "unknown"}).`,
      `Classification: ${reviewed.classification}.`,
      `Role: ${reviewed.qaUserId} (${reviewed.profileRole ?? "n/a"}).`,
      `Expected: ${reviewed.expectedStatus}; actual: ${reviewed.actualStatus}.`,
      screenshotPath ? `Screenshot: ${screenshotPath}` : null,
      `Source: ${SOURCE_REL}`,
    ]
      .filter(Boolean)
      .join(" "),
    problem,
    expectedResult,
    actualResult,
    recommendedFixStrategy:
      "Do not fix blindly. Confirm intended role behavior with Piter, or update workflow-scope.json if current staging navigation is correct. Only then adjust route guards/permissions if needed.",
    cursorPrompt: buildCursorPrompt({
      title,
      qaUserId: reviewed.qaUserId,
      route: reviewed.route,
      problem,
      classification: reviewed.classification,
    }),
    nonChangeRules: null,
    priorityScore: PRIORITY_SCORE[reviewed.severity] ?? 60,
    agentId: WORKFLOW_IMPORT_AGENT_ID,
    metadata: {
      imported: true,
      importSource: "role-workflow-safe",
      stage: "10B",
      classification: reviewed.classification,
      sourceReport: SOURCE_REL,
      sourceRunId: report.runId ?? null,
      sourceFindingId: reviewed.findingId,
      qaUserId: reviewed.qaUserId,
      route: reviewed.route,
      expectedStatus: reviewed.expectedStatus,
      actualStatus: reviewed.actualStatus,
      screenshotPath,
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
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
}

function main() {
  console.log("AgentOps Stage 10B — role workflow findings review");
  console.log("--------------------------------------------------");

  const report = readJson(SOURCE_REL);
  const scope = readJson(SCOPE_REL);
  const usersCatalog = readJson(USERS_REL);
  if (!report || !scope || !usersCatalog) return;

  const findings = Array.isArray(report.findings) ? report.findings : [];
  const userById = new Map((usersCatalog.users ?? []).map((u) => [u.qaUserId, u]));

  const reviewedFindings = [];
  const classificationCounts = Object.fromEntries(CLASSIFICATIONS.map((c) => [c, 0]));
  const workflowScopeUpdates = [];

  for (const finding of findings) {
    const user = userById.get(finding.qaUserId);
    const reviewed = classifyFinding(finding, user, scope, report);
    classificationCounts[reviewed.classification] =
      (classificationCounts[reviewed.classification] ?? 0) + 1;
    if (reviewed.workflowScopeUpdate) {
      workflowScopeUpdates.push({
        findingId: finding.id,
        qaUserId: finding.qaUserId,
        route: finding.route,
        recommendation: reviewed.workflowScopeUpdate,
      });
    }
    reviewedFindings.push({
      ...finding,
      ...reviewed,
    });
  }

  const importCandidates = [];
  const skipped = [];

  for (const reviewed of reviewedFindings) {
    const user = userById.get(reviewed.qaUserId);
    if (reviewed.importCandidate) {
      importCandidates.push(buildImportCandidate(reviewed, user, report));
    } else {
      skipped.push({
        findingId: reviewed.findingId,
        qaUserId: reviewed.qaUserId,
        route: reviewed.route,
        classification: reviewed.classification,
        reason: reviewed.rationale,
      });
    }
  }

  const candidateByCode = new Map();
  for (const c of importCandidates) {
    candidateByCode.set(c.issueCode, c);
  }
  const candidates = [...candidateByCode.values()];

  const piterDecisions = reviewedFindings.filter(
    (r) => r.classification === "needs-piter-decision",
  );

  const routeSummary = {};
  for (const r of reviewedFindings) {
    routeSummary[r.route] = routeSummary[r.route] ?? { total: 0, import: 0 };
    routeSummary[r.route].total += 1;
    if (r.importCandidate) routeSummary[r.route].import += 1;
  }

  const userSummary = {};
  for (const r of reviewedFindings) {
    userSummary[r.qaUserId] = userSummary[r.qaUserId] ?? { total: 0, import: 0 };
    userSummary[r.qaUserId].total += 1;
    if (r.importCandidate) userSummary[r.qaUserId].import += 1;
  }

  const generatedAt = new Date().toISOString();

  const reviewPayload = {
    generatedAt,
    stage: "10B",
    sourceReport: SOURCE_REL,
    sourceRunId: report.runId ?? null,
    environment: report.environment ?? "staging-only",
    summary: {
      totalFindingsReviewed: findings.length,
      classificationCounts,
      importCandidateCount: candidates.length,
      skippedCount: skipped.length,
      piterDecisionNeededCount: piterDecisions.length,
      realPermissionIssueCount: classificationCounts["real-permission-issue"] ?? 0,
    },
    reviewedFindings,
    importCandidates: candidates,
    skippedFindings: skipped,
    piterDecisionsNeeded: piterDecisions.map((r) => ({
      findingId: r.findingId,
      qaUserId: r.qaUserId,
      route: r.route,
      expectedStatus: r.expectedStatus,
      actualStatus: r.actualStatus,
      rationale: r.rationale,
    })),
    workflowScopeUpdatesRecommended: workflowScopeUpdates,
    routeSummary,
    userSummary,
  };

  const importPlan = {
    generatedAt,
    source: SOURCE_REL,
    sourceRunId: report.runId ?? null,
    summary: {
      totalCandidates: candidates.length,
      totalReviewed: findings.length,
      skippedCount: skipped.length,
      classificationCounts,
      piterDecisionNeededCount: piterDecisions.length,
    },
    skippedFindings: skipped,
    workflowScopeUpdatesRecommended: workflowScopeUpdates,
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

  const sqlHeader = `-- AgentOps Stage 10B role workflow backlog import (generated ${generatedAt})
-- Source: ${SOURCE_REL}
-- Apply on STAGING only with explicit owner approval.
-- ON CONFLICT (issue_code) DO NOTHING

`;

  fs.writeFileSync(OUTPUT_SQL, `${sqlHeader}${candidates.map(buildInsertSql).join("\n\n")}\n`, "utf8");
  fs.writeFileSync(OUTPUT_REVIEW_JSON, `${JSON.stringify(reviewPayload, null, 2)}\n`, "utf8");
  fs.writeFileSync(OUTPUT_JSON, `${JSON.stringify(importPlan, null, 2)}\n`, "utf8");

  const md = [
    "# Role workflow findings review (Stage 10B)",
    "",
    `- Generated: ${generatedAt}`,
    `- Source: \`${SOURCE_REL}\``,
    `- Source run ID: \`${report.runId ?? "n/a"}\``,
    "",
    "## Summary",
    "",
    "| Metric | Count |",
    "| --- | ---: |",
    `| Findings reviewed | ${findings.length} |`,
    `| Import candidates | ${candidates.length} |`,
    `| Skipped (not imported) | ${skipped.length} |`,
    `| Piter decisions needed | ${piterDecisions.length} |`,
    "",
    "## Classification counts",
    "",
    ...CLASSIFICATIONS.map((c) => `- **${c}**: ${classificationCounts[c] ?? 0}`),
    "",
    "## Import candidates (issue codes)",
    "",
    ...(candidates.length === 0
      ? ["- None"]
      : candidates.map((c) => `- \`${c.issueCode}\` — ${c.title} (${c.metadata.classification})`)),
    "",
    "## Skipped findings",
    "",
    ...(skipped.length === 0
      ? ["- None"]
      : skipped.map(
          (s) =>
            `- \`${s.findingId}\` ${s.qaUserId} @ \`${s.route}\` — **${s.classification}**: ${s.reason}`,
        )),
    "",
    "## Piter decisions needed",
    "",
    ...(piterDecisions.length === 0
      ? ["- None"]
      : piterDecisions.map(
          (p) =>
            `- \`${p.findingId}\` **${p.qaUserId}** on \`${p.route}\` (expected ${p.expectedStatus}, actual ${p.actualStatus})`,
        )),
    "",
    "## Workflow scope updates recommended",
    "",
    ...(workflowScopeUpdates.length === 0
      ? ["- None"]
      : workflowScopeUpdates.map(
          (w) => `- \`${w.findingId}\` (${w.qaUserId} @ ${w.route}): ${w.recommendation}`,
        )),
    "",
    "## Route summary",
    "",
    ...Object.entries(routeSummary).map(
      ([route, stats]) => `- \`${route}\`: ${stats.import}/${stats.total} import candidates`,
    ),
    "",
    "## User summary",
    "",
    ...Object.entries(userSummary).map(
      ([user, stats]) => `- \`${user}\`: ${stats.import}/${stats.total} import candidates`,
    ),
    "",
    "## Artifacts",
    "",
    `- Review JSON: \`qa-agent/reports/browser-qa/role-workflow-findings-review.json\``,
    `- SQL (not applied): \`qa-agent/reports/browser-qa/agentops-role-workflow-import.sql\``,
    `- UI plan: \`public/agentops/role-workflow-import-plan.json\``,
    "",
  ].join("\n");

  fs.writeFileSync(OUTPUT_REVIEW_MD, md, "utf8");

  console.log(`Findings reviewed: ${findings.length}`);
  console.log(`Classification: ${JSON.stringify(classificationCounts)}`);
  console.log(`Import candidates: ${candidates.length}`);
  console.log(`Skipped: ${skipped.length}`);
  console.log(`Piter decisions needed: ${piterDecisions.length}`);
  if (candidates.length > 0) {
    console.log(`Issue codes: ${candidates.map((c) => c.issueCode).join(", ")}`);
  }
  console.log(`Review JSON: ${path.relative(ROOT, OUTPUT_REVIEW_JSON)}`);
  console.log(`SQL: ${path.relative(ROOT, OUTPUT_SQL)}`);
  console.log(`Import plan: ${path.relative(ROOT, OUTPUT_JSON)}`);
  console.log("Result: PASS (artifacts generated; SQL not applied)");
}

main();
