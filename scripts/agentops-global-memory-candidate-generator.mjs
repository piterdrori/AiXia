/**
 * Whitelisted read-only report reader + global memory candidate draft builder (dev/local only).
 */

import fs from "node:fs";
import path from "node:path";

const REPO_ROOT = process.cwd();

export const GLOBAL_MEMORY_WHITELISTED_REPORT_IDS = [
  "guardrail_action_plan",
  "static_design_guardrails",
  "static_app_discovery",
];

const REPORT_PATH_BY_ID = {
  guardrail_action_plan: "qa-agent/reports/guardrail-action-plan.json",
  static_design_guardrails: "qa-agent/reports/static-design-guardrails.json",
  static_app_discovery: "qa-agent/reports/static-app-discovery.json",
};

const PRIMARY_REPORT_ID = "guardrail_action_plan";
const MAX_CANDIDATES_TOTAL = 10;
const MAX_ACTIONABLE = 4;
const MAX_REPEATED_RULE = 3;
const MAX_ROUTE_MODULE = 2;
const MIN_REPEATED_COUNT = 3;

function isGlobalMemoryCandidateGeneratorAllowed(env = process.env) {
  if (env.VERCEL_ENV === "production") return false;
  if (env.AGENTOPS_GLOBAL_MEMORY_COMMAND_RUNNER === "false") return false;
  return true;
}

function readJsonReport(reportId) {
  const rel = REPORT_PATH_BY_ID[reportId];
  if (!rel) return { error: "Report id is not whitelisted." };
  const abs = path.join(REPO_ROOT, rel);
  if (!fs.existsSync(abs)) {
    return { error: `No report found at ${rel}. Run full read-only scan first.` };
  }
  try {
    const raw = fs.readFileSync(abs, "utf8");
    const parsed = JSON.parse(raw);
    return { data: parsed, sourceReport: rel, reportId };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to read report JSON.",
    };
  }
}

function clip(text, max = 600) {
  const value = String(text ?? "").trim();
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1)}…`;
}

function inferTargetOwnerFile(finding) {
  const blob = [
    finding.ruleId,
    finding.ruleName,
    finding.message,
    finding.suggestedScope,
    finding.classificationReason,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (/table|aixia-table|08-table/.test(blob)) {
    return "src/design-system/aixia-global/08-table-list-standard.md";
  }
  if (/hero|04-hero/.test(blob)) {
    return "src/design-system/aixia-global/04-hero-header-standard.md";
  }
  if (/navigation|workspace|12-navigation/.test(blob)) {
    return "src/design-system/aixia-global/12-navigation-workspace-standard.md";
  }
  if (/glass|card|06-card/.test(blob)) {
    return "src/design-system/aixia-global/06-card-section-standard.md";
  }
  if (/guardrail|15-guardrail/.test(blob)) {
    return "src/design-system/aixia-global/15-guardrail-rules.md";
  }
  return undefined;
}

function isDesignSotFinding(finding) {
  const blob = [
    finding.ruleId,
    finding.message,
    finding.suggestedScope,
    finding.whyActionable,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return (
    /aixia-global|source.of.truth|shared aixia|design.system|design-system/.test(blob) ||
    Boolean(inferTargetOwnerFile(finding))
  );
}

function baseCandidateFields(nowIso) {
  return {
    requiresPiterApproval: true,
    noDurableMemoryWrite: true,
    noHermesRuntime: true,
    noSotFileWrite: true,
    status: "pending_review",
    createdAt: nowIso,
    updatedAt: nowIso,
  };
}

function buildDedupeKey(candidate) {
  return `${candidate.sourceReport}|${candidate.sourceFindingId ?? ""}|${candidate.candidateType}`;
}

function candidateFromActionable(finding, sourceReport, nowIso, index) {
  const designSot = isDesignSotFinding(finding);
  const targetOwnerFile = designSot ? inferTargetOwnerFile(finding) : undefined;
  const candidateType = designSot ? "design_sot" : "guardrail";
  const targetMemoryLevel = designSot ? "source-of-truth-candidate" : "global";

  const title = designSot
    ? `Design law candidate: ${finding.ruleName ?? finding.ruleId ?? "Guardrail finding"}`
    : `Guardrail candidate: ${finding.ruleName ?? finding.ruleId ?? "Actionable finding"}`;

  const proposedMemoryText = clip(
    [
      finding.message,
      finding.whyActionable ? `Why actionable: ${finding.whyActionable}` : "",
      finding.suggestedScope ? `Suggested scope: ${finding.suggestedScope}` : "",
      targetOwnerFile
        ? `If approved later, propose an update to ${targetOwnerFile} — do not auto-write source-of-truth.`
        : "Fix shared AiXia components/CSS before page-local visual systems.",
    ]
      .filter(Boolean)
      .join("\n\n"),
    900,
  );

  return {
    candidateId: `gmem-${Date.now()}-${index}`,
    candidateType,
    title,
    summary: clip(finding.message ?? finding.classificationReason, 280),
    proposedMemoryText,
    sourceReport,
    sourcePath: typeof finding.filePath === "string" ? finding.filePath : undefined,
    sourceFindingId: typeof finding.id === "string" ? finding.id : undefined,
    evidence: clip(finding.evidence, 200),
    targetMemoryLevel,
    targetOwnerFile,
    confidence: finding.severity === "high" ? "high" : "medium",
    risk: designSot ? "medium" : "low",
    ...baseCandidateFields(nowIso),
  };
}

function candidatesFromActionableFindings(report, sourceReport, nowIso) {
  const list = Array.isArray(report.actionableFindings) ? report.actionableFindings : [];
  return list.slice(0, MAX_ACTIONABLE).map((finding, index) =>
    candidateFromActionable(finding, sourceReport, nowIso, index),
  );
}

function candidatesFromRepeatedRules(report, sourceReport, nowIso, startIndex) {
  const byRule = report.findingsByRule;
  if (!byRule || typeof byRule !== "object") return [];

  const entries = Object.entries(byRule)
    .map(([ruleId, count]) => ({ ruleId, count: Number(count) || 0 }))
    .filter((row) => row.count >= MIN_REPEATED_COUNT)
    .sort((a, b) => b.count - a.count)
    .slice(0, MAX_REPEATED_RULE);

  return entries.map((row, offset) => {
    const index = startIndex + offset;
    return {
      candidateId: `gmem-${Date.now()}-${index}`,
      candidateType: "repeated_issue",
      title: `Repeated issue: ${row.ruleId}`,
      summary: `${row.count} guardrail findings share rule "${row.ruleId}". Review for a shared fix, not page-by-page patches.`,
      proposedMemoryText: clip(
        `Multiple pages trigger rule "${row.ruleId}" (${row.count} findings in static design guardrails). Prefer fixing shared AiXia components or global CSS instead of repeated page-local work.`,
        700,
      ),
      sourceReport,
      sourceFindingId: `rule:${row.ruleId}`,
      evidence: `findingsByRule.${row.ruleId}=${row.count}`,
      targetMemoryLevel: "global",
      confidence: row.count >= 10 ? "high" : "medium",
      risk: "low",
      ...baseCandidateFields(nowIso),
    };
  });
}

function candidatesFromRouteModules(report, sourceReport, nowIso, startIndex) {
  const routes = Array.isArray(report.discoveredRoutes) ? report.discoveredRoutes : [];
  const financeRoutes = routes.filter(
    (r) =>
      r &&
      typeof r.routePattern === "string" &&
      r.routePattern.startsWith("/finance") &&
      r.pageTypeGuess !== "redirect",
  );
  if (financeRoutes.length < 5) return [];

  const hubCount = financeRoutes.filter((r) => r.pageTypeGuess === "hub").length;
  const detailCount = financeRoutes.length - hubCount;

  return [
    {
      candidateId: `gmem-${Date.now()}-${startIndex}`,
      candidateType: "route_module",
      title: "Finance route family structure",
      summary: `${financeRoutes.length} finance routes discovered (${hubCount} hub-like, ${detailCount} other). Align navigation with parent pill / module rhythm.`,
      proposedMemoryText: clip(
        `Static discovery found ${financeRoutes.length} finance routes. When adding finance child pages, use parent navigation rhythm and shared Finance module shells — avoid orphan pages without hub context.`,
        650,
      ),
      sourceReport,
      sourceFindingId: "route-family:finance",
      evidence: `${financeRoutes.length} finance routes in static-app-discovery`,
      targetMemoryLevel: "workflow-rule",
      confidence: "medium",
      risk: "low",
      ...baseCandidateFields(nowIso),
    },
  ].slice(0, MAX_ROUTE_MODULE);
}

/**
 * Build candidate drafts from whitelisted reports (primary: guardrail-action-plan).
 */
export function buildGlobalMemoryCandidatesFromReports(options = {}) {
  const primary = readJsonReport(options.primaryReportId ?? PRIMARY_REPORT_ID);
  if (primary.error) {
    return { ok: false, error: primary.error, candidates: [], sourceReport: REPORT_PATH_BY_ID[PRIMARY_REPORT_ID] };
  }

  const nowIso = new Date().toISOString();
  const sourceReport = primary.sourceReport;
  const candidates = candidatesFromActionableFindings(primary.data, sourceReport, nowIso);

  const guardrails = readJsonReport("static_design_guardrails");
  if (!guardrails.error && candidates.length < MAX_CANDIDATES_TOTAL) {
    const repeated = candidatesFromRepeatedRules(
      guardrails.data,
      guardrails.sourceReport,
      nowIso,
      candidates.length,
    );
    for (const row of repeated) {
      if (candidates.length >= MAX_CANDIDATES_TOTAL) break;
      candidates.push(row);
    }
  }

  const discovery = readJsonReport("static_app_discovery");
  if (!discovery.error && candidates.length < MAX_CANDIDATES_TOTAL) {
    const routeCandidates = candidatesFromRouteModules(
      discovery.data,
      discovery.sourceReport,
      nowIso,
      candidates.length,
    );
    for (const row of routeCandidates) {
      if (candidates.length >= MAX_CANDIDATES_TOTAL) break;
      candidates.push(row);
    }
  }

  const capped = candidates.slice(0, MAX_CANDIDATES_TOTAL).map((candidate, index) => ({
    ...candidate,
    candidateId: `gmem-${Date.now()}-${index}`,
  }));

  return {
    ok: true,
    sourceReport,
    sourceReportGeneratedAt:
      typeof primary.data.generatedAt === "string" ? primary.data.generatedAt : null,
    candidates: capped,
    dedupeKeys: capped.map(buildDedupeKey),
  };
}

export function getGlobalMemoryCandidateGeneratorStatus(env = process.env) {
  const available = isGlobalMemoryCandidateGeneratorAllowed(env);
  const primaryPath = path.join(REPO_ROOT, REPORT_PATH_BY_ID[PRIMARY_REPORT_ID]);
  const primaryReportExists = fs.existsSync(primaryPath);
  return {
    available,
    stagingOnly: true,
    primaryReport: REPORT_PATH_BY_ID[PRIMARY_REPORT_ID],
    primaryReportExists,
    allowedReportIds: GLOBAL_MEMORY_WHITELISTED_REPORT_IDS,
    rejectionReason: available
      ? null
      : "Candidate generator is disabled in production.",
  };
}

export async function handleGlobalMemoryGenerateCandidatesRequest(request, env = process.env) {
  if (request.method === "GET") {
    return Response.json(getGlobalMemoryCandidateGeneratorStatus(env));
  }

  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  if (!isGlobalMemoryCandidateGeneratorAllowed(env)) {
    return Response.json(
      {
        ok: false,
        error: "Candidate generator unavailable in production.",
        candidates: [],
      },
      { status: 403 },
    );
  }

  let body = {};
  try {
    if (request.headers.get("content-length") !== "0") {
      body = await request.json();
    }
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (body.reportPath !== undefined || body.filePath !== undefined || body.shell !== undefined) {
    return Response.json(
      { ok: false, error: "Arbitrary report paths are not accepted.", candidates: [] },
      { status: 400 },
    );
  }

  const result = buildGlobalMemoryCandidatesFromReports({
    primaryReportId:
      typeof body.reportId === "string" && GLOBAL_MEMORY_WHITELISTED_REPORT_IDS.includes(body.reportId)
        ? body.reportId
        : PRIMARY_REPORT_ID,
  });

  if (!result.ok) {
    return Response.json(result, { status: 404 });
  }

  return Response.json({
    ok: true,
    sourceReport: result.sourceReport,
    sourceReportGeneratedAt: result.sourceReportGeneratedAt,
    candidates: result.candidates,
    dedupeKeys: result.dedupeKeys,
    message: `Prepared ${result.candidates.length} candidate draft(s) from curated report data. No memory was written.`,
  });
}
