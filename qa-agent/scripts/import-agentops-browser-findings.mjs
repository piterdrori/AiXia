#!/usr/bin/env node
/**
 * Stage 9E — Read synthetic-users-smoke-report.json and generate AgentOps backlog import artifacts.
 * Does NOT apply SQL automatically. Does NOT use service-role.
 */

import crypto from "crypto";
import fs from "fs";
import path from "path";
import process from "process";

const ROOT = process.cwd();
const SOURCE_REL = "qa-agent/reports/browser-qa/synthetic-users-smoke-report.json";
const SOURCE_PATH = path.join(ROOT, SOURCE_REL);
const REPORTS_DIR = path.join(ROOT, "qa-agent/reports/browser-qa");
const PUBLIC_DIR = path.join(ROOT, "public/agentops");

const OUTPUT_SQL = path.join(REPORTS_DIR, "agentops-browser-findings-import.sql");
const OUTPUT_MD = path.join(REPORTS_DIR, "agentops-browser-findings-import.md");
const OUTPUT_JSON = path.join(PUBLIC_DIR, "browser-findings-import-plan.json");

const BROWSER_IMPORT_AGENT_ID = "browser-qa-import";
const DEFAULT_CURSOR_PROMPT =
  "Investigate browser smoke evidence first. Preserve business logic, Supabase, routing, permissions, handlers, and backend behavior. Do not fix without confirming root cause from staging smoke artifacts.";

const PRIORITY_SCORE = {
  Critical: 100,
  High: 80,
  Medium: 60,
  Low: 40,
  Suggestion: 20,
};

const KEY_ROLE_IDS = new Set([
  "agentops-owner",
  "platform-admin",
  "finance-admin",
  "tenant-admin",
]);

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

function stableIssueCode(parts) {
  const raw = parts.filter(Boolean).join("|");
  const hash = crypto.createHash("sha256").update(raw).digest("hex").slice(0, 8).toUpperCase();
  return `AIXIA-BROWSER-${hash}`;
}

function issueCodeFromFindingId(id) {
  if (!id) return stableIssueCode(["finding", Date.now()]);
  const safe = String(id).replace(/[^a-zA-Z0-9-]/g, "-");
  return `AIXIA-BROWSER-${safe}`;
}

function mapSeverityForLogin(qaUserId, findingSeverity) {
  if (findingSeverity === "Critical") return "Critical";
  if (KEY_ROLE_IDS.has(qaUserId)) return "High";
  return findingSeverity === "High" ? "High" : "Medium";
}

function buildCursorPrompt({ title, qaUserId, route, problem }) {
  return [
    "# Cursor investigation prompt (browser QA — Stage 9E)",
    "",
    `TASK: Investigate ${title}`,
    "",
    "CONTEXT:",
    `- Synthetic user: ${qaUserId}`,
    `- Route: ${route ?? "/login"}`,
    `- Source: ${SOURCE_REL}`,
    "",
    "EVIDENCE:",
    problem,
    "",
    "INVESTIGATION:",
    "- Review synthetic-users-smoke-report.json and linked screenshot paths.",
    "- Confirm credentials env vars and staging auth user state (no password values in logs).",
    "- Check login form selectors, session persistence, and role profile completion.",
    "",
    DEFAULT_CURSOR_PROMPT,
  ].join("\n");
}

function isExpectedAgentOpsBlock(user, routeEntry) {
  if (routeEntry.route !== "/system/agent-ops") return false;
  if (user.agentOpsOwnerAccess) {
    return routeEntry.status === "loaded" && routeEntry.agentOpsLoaded === true;
  }
  return (
    routeEntry.expected === true ||
    (routeEntry.status === "access-denied" && routeEntry.agentOpsLoaded === false)
  );
}

function isExpectedRouteOutcome(user, routeEntry) {
  if (isExpectedAgentOpsBlock(user, routeEntry)) return true;
  if (routeEntry.status === "loaded" && routeEntry.expected !== false) return true;
  if (routeEntry.status === "auth-required" && !user.agentOpsOwnerAccess) {
    const financeRoutes = ["/finance", "/finance/master-data", "/finance/transactions", "/finance/reports"];
    if (financeRoutes.includes(routeEntry.route) && user.profileRole === "guest") return true;
  }
  return false;
}

function shouldImportReportFinding(finding) {
  const title = String(finding.title ?? "").toLowerCase();
  const problem = String(finding.problem ?? "").toLowerCase();

  if (title.includes("skipped") && title.includes("no password")) return false;
  if (title.includes("login failed") || problem.includes("could not authenticate")) return true;
  if (finding.importEligible === true) return true;
  if (finding.severity === "Critical") return true;
  return false;
}

function shouldImportRouteIssue(user, routeEntry) {
  if (isExpectedRouteOutcome(user, routeEntry)) return false;
  if (routeEntry.agentOpsLoaded && !user.agentOpsOwnerAccess) return true;
  if (routeEntry.status === "timed-out") return true;
  if (routeEntry.status === "failed") return true;
  if (
    user.agentOpsOwnerAccess &&
    routeEntry.route === "/system/agent-ops" &&
    !routeEntry.agentOpsLoaded &&
    routeEntry.status !== "loaded"
  ) {
    return true;
  }
  return false;
}

function loginIssueCode(qaUserId) {
  return issueCodeFromFindingId(`LOGIN-${qaUserId}`);
}

function buildCandidateFromFinding(finding, userById, report) {
  const qaUserId = finding.qaUserId ?? "unknown";
  const user = userById.get(qaUserId);
  const profileRole = user?.profileRole ?? null;
  const isLogin = String(finding.title ?? "").toLowerCase().includes("login");
  const route = isLogin ? "/login" : finding.route ?? null;
  const severity = isLogin
    ? mapSeverityForLogin(qaUserId, finding.severity ?? "Medium")
    : finding.severity === "Critical"
      ? "Critical"
      : finding.severity ?? "Medium";

  let category = finding.category ?? "Functional";
  if (finding.severity === "Critical" || String(finding.title ?? "").includes("AgentOps")) {
    category = "Security/Permission";
  } else if (
    routeEntryIsTechnical(route) ||
    String(finding.title ?? "").toLowerCase().includes("timeout") ||
    String(finding.title ?? "").toLowerCase().includes("network")
  ) {
    category = "Technical";
  }

  const screenshotPath =
    user?.screenshots?.find((p) => p.includes("login-failed")) ??
    user?.routes?.find((r) => r.route === route)?.screenshotPath ??
    null;

  const issueCode = isLogin
    ? loginIssueCode(qaUserId)
    : finding.id
      ? issueCodeFromFindingId(finding.id)
      : stableIssueCode([qaUserId, titleKey(finding)]);

  return {
    issueCode,
    title: `[BROWSER] ${finding.title}`,
    category,
    severity,
    status: "Backlog",
    queueState: "backlog",
    route,
    module: "browser-qa",
    pageType: null,
    reviewPanel: category === "Security/Permission" ? "Security Panel" : "Functional Panel",
    evidenceSummary: buildEvidenceSummary(report, screenshotPath),
    problem: finding.problem ?? finding.title ?? "Browser smoke finding.",
    expectedResult: isLogin
      ? `Synthetic user ${qaUserId} should authenticate and reach an authenticated landing route.`
      : "Route should behave per role permissions without unexpected denial or failure.",
    actualResult: finding.problem ?? finding.title ?? "See browser smoke report.",
    recommendedFixStrategy:
      "Investigate browser smoke evidence and login/session behavior on staging.",
    cursorPrompt: buildCursorPrompt({
      title: finding.title,
      qaUserId,
      route,
      problem: finding.problem ?? finding.title,
    }),
    nonChangeRules: null,
    priorityScore: PRIORITY_SCORE[severity] ?? 60,
    agentId: BROWSER_IMPORT_AGENT_ID,
    metadata: {
      imported: true,
      importSource: "synthetic-users-smoke",
      stage: "9E",
      sourceReport: SOURCE_REL,
      sourceRunId: report.runId ?? null,
      sourceFindingId: finding.id ?? null,
      sourceUser: qaUserId,
      sourceEmail: finding.email ?? user?.email ?? null,
      userRole: profileRole,
      screenshotPath,
      importEligible: true,
      sample: false,
    },
  };
}

function routeEntryIsTechnical(route) {
  return route && ["/system/agent-ops"].includes(route);
}

function titleKey(finding) {
  return String(finding.title ?? finding.problem ?? "finding");
}

function buildEvidenceSummary(report, screenshotPath) {
  const parts = [
    `Imported from Stage 9D synthetic users smoke (${report.runId ?? "unknown run"}).`,
    `Report: ${SOURCE_REL}`,
  ];
  if (screenshotPath) parts.push(`Screenshot: ${screenshotPath}`);
  return parts.join(" ");
}

function buildCandidateFromRoute(user, routeEntry, report) {
  const qaUserId = user.qaUserId;
  const isAgentOpsLeak = routeEntry.agentOpsLoaded && !user.agentOpsOwnerAccess;
  const severity = isAgentOpsLeak
    ? "Critical"
    : routeEntry.status === "timed-out"
      ? "Medium"
      : user.agentOpsOwnerAccess && routeEntry.route === "/system/agent-ops"
        ? "High"
        : "Medium";

  const category = isAgentOpsLeak ? "Security/Permission" : "Technical";
  const title = isAgentOpsLeak
    ? `Non-owner synthetic user can access AgentOps (${qaUserId})`
    : `Unexpected route ${routeEntry.status} on ${routeEntry.route} (${qaUserId})`;

  return {
    issueCode: stableIssueCode([qaUserId, routeEntry.route, routeEntry.status, title]),
    title: `[BROWSER] ${title}`,
    category,
    severity,
    status: "Backlog",
    queueState: "backlog",
    route: routeEntry.route,
    module: "browser-qa",
    pageType: null,
    reviewPanel: category === "Security/Permission" ? "Security Panel" : "Functional Panel",
    evidenceSummary: buildEvidenceSummary(report, routeEntry.screenshotPath),
    problem:
      routeEntry.error ??
      `Route ${routeEntry.route} ended as ${routeEntry.status} (finalUrl: ${routeEntry.finalUrl}).`,
    expectedResult: isAgentOpsLeak
      ? "Non-owner users must not load AgentOps Control Center."
      : `Role ${user.profileRole} should have expected access for ${routeEntry.route}.`,
    actualResult: `Observed ${routeEntry.status}; heading: ${routeEntry.visibleHeading ?? "n/a"}.`,
    recommendedFixStrategy:
      "Investigate browser smoke evidence and login/session behavior on staging.",
    cursorPrompt: buildCursorPrompt({
      title,
      qaUserId,
      route: routeEntry.route,
      problem: routeEntry.error ?? title,
    }),
    nonChangeRules: null,
    priorityScore: PRIORITY_SCORE[severity] ?? 60,
    agentId: BROWSER_IMPORT_AGENT_ID,
    metadata: {
      imported: true,
      importSource: "synthetic-users-smoke",
      stage: "9E",
      sourceReport: SOURCE_REL,
      sourceRunId: report.runId ?? null,
      sourceUser: qaUserId,
      sourceEmail: user.email ?? null,
      userRole: user.profileRole ?? null,
      screenshotPath: routeEntry.screenshotPath ?? null,
      importEligible: true,
      sample: false,
    },
  };
}

function buildCandidateFromLoginUser(user, report) {
  const finding = {
    id: `LOGIN-${user.qaUserId}`,
    title: `Synthetic user login failed (${user.qaUserId})`,
    problem: `Could not authenticate ${user.email}`,
    qaUserId: user.qaUserId,
    email: user.email,
    severity: KEY_ROLE_IDS.has(user.qaUserId) ? "High" : "Medium",
    category: "Functional",
  };
  return buildCandidateFromFinding(finding, new Map([[user.qaUserId, user]]), report);
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
  console.log("AgentOps Stage 9E — browser backlog import plan");
  console.log("------------------------------------------------");

  const report = readJson(SOURCE_REL);
  if (!report) return;

  const users = Array.isArray(report.users) ? report.users : [];
  const findings = Array.isArray(report.findings) ? report.findings : [];
  const userById = new Map(users.map((u) => [u.qaUserId, u]));

  const skippedExpected = [];
  let candidatesFound = 0;

  for (const user of users) {
    if (!user.skipped && Array.isArray(user.routes)) {
      for (const routeEntry of user.routes) {
        if (isExpectedRouteOutcome(user, routeEntry)) {
          skippedExpected.push({
            reason: "expected-route-outcome",
            qaUserId: user.qaUserId,
            route: routeEntry.route,
            status: routeEntry.status,
          });
        } else if (shouldImportRouteIssue(user, routeEntry)) {
          candidatesFound += 1;
        }
      }
    }
    if (!user.skipped && user.loginAttempted && !user.loginSuccessful) {
      candidatesFound += 1;
    }
  }

  for (const finding of findings) {
    if (shouldImportReportFinding(finding)) {
      candidatesFound += 1;
    }
  }

  const candidateByCode = new Map();

  for (const finding of findings) {
    if (!shouldImportReportFinding(finding)) continue;
    const candidate = buildCandidateFromFinding(finding, userById, report);
    candidateByCode.set(candidate.issueCode, candidate);
  }

  for (const user of users) {
    if (user.skipped) continue;
    if (user.loginAttempted && !user.loginSuccessful) {
      const candidate = buildCandidateFromLoginUser(user, report);
      candidateByCode.set(candidate.issueCode, candidate);
      continue;
    }
    if (!Array.isArray(user.routes)) continue;
    for (const routeEntry of user.routes) {
      if (!shouldImportRouteIssue(user, routeEntry)) continue;
      const candidate = buildCandidateFromRoute(user, routeEntry, report);
      if (!candidateByCode.has(candidate.issueCode)) {
        candidateByCode.set(candidate.issueCode, candidate);
      }
    }
  }

  const candidates = [...candidateByCode.values()];
  const generatedAt = new Date().toISOString();

  const importPlan = {
    generatedAt,
    source: SOURCE_REL,
    sourceRunId: report.runId ?? null,
    summary: {
      totalCandidates: candidates.length,
      fromReportFindings: findings.filter(shouldImportReportFinding).length,
      loginFailures: candidates.filter((c) => c.route === "/login").length,
      skippedExpected: skippedExpected.length,
    },
    skippedExpected: skippedExpected.slice(0, 50),
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

  const sqlHeader = `-- AgentOps Stage 9E browser backlog import (generated ${generatedAt})
-- Source: ${SOURCE_REL}
-- Apply on STAGING only with explicit owner approval.
-- ON CONFLICT (issue_code) DO NOTHING — does not modify sample rows.

`;

  const sqlBody = candidates.map((c) => buildInsertSql(c)).join("\n\n");
  fs.writeFileSync(OUTPUT_SQL, `${sqlHeader}${sqlBody}\n`, "utf8");

  const severityCounts = candidates.reduce((acc, c) => {
    acc[c.severity] = (acc[c.severity] ?? 0) + 1;
    return acc;
  }, {});

  const md = [
    "# AgentOps browser findings import plan",
    "",
    `- Generated: ${generatedAt}`,
    `- Source: \`${SOURCE_REL}\``,
    `- Source run ID: \`${report.runId ?? "n/a"}\``,
    `- SQL output: \`qa-agent/reports/browser-qa/agentops-browser-findings-import.sql\``,
    `- UI plan JSON: \`public/agentops/browser-findings-import-plan.json\``,
    "",
    "## Counts",
    "",
    "| Metric | Count |",
    "| --- | ---: |",
    `| Candidates found (raw signals) | ${candidatesFound} |`,
    `| Candidates converted (deduped) | ${candidates.length} |`,
    `| From report findings array | ${importPlan.summary.fromReportFindings} |`,
    `| Login failure candidates | ${importPlan.summary.loginFailures} |`,
    `| Expected records skipped | ${skippedExpected.length} |`,
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
    "## Skipped by design",
    "",
    "- Expected non-owner `/system/agent-ops` access-denied (owner-only block)",
    "- Owner AgentOps Control Center loaded",
    "- Normal loaded routes without failure",
    "- Screenshots alone (paths stored in metadata only)",
    "",
    "## Apply SQL (staging only)",
    "",
    "Run the SQL file in Supabase SQL editor on **staging** after review.",
    "This script does **not** apply SQL automatically.",
    "",
    "## UI import",
    "",
    "After running this script, use **Import Browser Findings** on `/system/agent-ops`",
    "or apply the SQL file directly.",
    "",
  ].join("\n");

  fs.writeFileSync(OUTPUT_MD, md, "utf8");
  fs.writeFileSync(OUTPUT_JSON, `${JSON.stringify(importPlan, null, 2)}\n`, "utf8");

  console.log(`Source: ${SOURCE_REL}`);
  console.log(`Candidates found (signals): ${candidatesFound}`);
  console.log(`Candidates converted: ${candidates.length}`);
  console.log(`Expected skipped: ${skippedExpected.length}`);
  console.log(`SQL: ${path.relative(ROOT, OUTPUT_SQL)}`);
  console.log(`Report: ${path.relative(ROOT, OUTPUT_MD)}`);
  console.log(`UI plan: ${path.relative(ROOT, OUTPUT_JSON)}`);
  if (candidates.length > 0) {
    console.log(`Issue codes: ${candidates.map((c) => c.issueCode).join(", ")}`);
  }
  console.log("Result: PASS (artifacts generated; SQL not applied)");
}

main();
