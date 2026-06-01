import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const configPath = path.join(repoRoot, "qa-agent", "fix-planning", "fix-plan-generator-config.json");

const SOURCE_PLAN_FILES = [
  "public/agentops/static-import-plan.json",
  "public/agentops/browser-findings-import-plan.json",
  "public/agentops/role-workflow-import-plan.json",
  "public/agentops/write-draft-findings-import-plan.json",
  "public/agentops/role-workflow-approved-import-plan.json",
  "public/agentops/write-draft-approved-import-plan.json",
];

function parseArgs(argv) {
  const args = { source: "reports", issue: null, all: true, dryRun: false };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--source" && argv[i + 1]) args.source = argv[++i];
    else if (token === "--issue" && argv[i + 1]) {
      args.issue = argv[++i];
      args.all = false;
    } else if (token === "--all") args.all = true;
    else if (token === "--dry-run") args.dryRun = true;
  }
  return args;
}

function readJson(absPath) {
  if (!fs.existsSync(absPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(absPath, "utf8"));
  } catch {
    return null;
  }
}

function rel(p) {
  return p.replaceAll("\\", "/").replace(`${repoRoot.replaceAll("\\", "/")}/`, "");
}

function normalizeSeverity(value) {
  const v = String(value ?? "").toLowerCase();
  if (v === "critical") return "Critical";
  if (v === "high") return "High";
  if (v === "medium") return "Medium";
  if (v === "low") return "Low";
  return "Suggestion";
}

function severityRank(v) {
  const s = normalizeSeverity(v);
  return { Critical: 4, High: 3, Medium: 2, Low: 1, Suggestion: 0 }[s] ?? 0;
}

function inferFiles(issue) {
  const files = new Set([
    "src/lib/agentops/service.ts",
    "src/app/system/agent-ops/page.tsx",
  ]);
  const route = issue.route ?? issue.affectedRoute ?? "";
  if (route.includes("/finance/transactions/quotations")) {
    files.add("src/app/finance/transactions/quotations/page.tsx");
    files.add("src/app/finance/transactions/quotations/new/page.tsx");
    files.add("src/lib/permissions.ts");
    files.add("src/lib/finance/pageAccess.ts");
  } else if (route.includes("/finance")) {
    files.add("src/lib/permissions.ts");
    files.add("src/App.tsx");
  }
  if ((issue.category ?? "").toLowerCase().includes("design")) {
    files.add("src/styles/aixia-design-system.css");
  }
  return [...files];
}

function buildCursorPrompt(issue, plan, validationCommands) {
  const source = issue.sourceReportPath || issue.sourceReport || "qa-agent reports";
  return `TASK:
Implement fix for ${plan.issueCode}: ${plan.issueTitle}

STAGING-ONLY RULE:
Use staging/local only. Do not touch production/main Supabase or production/main GitHub.

SOURCE EVIDENCE:
- ${source}
- ${plan.evidencePaths.length ? plan.evidencePaths.join("\n- ") : "No explicit evidence path; inspect source report."}

FILES TO INSPECT FIRST:
${plan.filesToInspect.map((f) => `- ${f}`).join("\n")}

PREFERRED FIX STRATEGY:
${plan.preferredFixStrategy}

HARD DO-NOT-CHANGE RULES:
${plan.doNotChange.map((r) => `- ${r}`).join("\n")}

VALIDATION COMMANDS:
${validationCommands.map((c) => `- ${c}`).join("\n")}

REQUIRED FINAL CHECK FORMAT:
1. Files changed
2. Issue behavior before/after
3. Validation command results
4. Safety confirmations (no prod/main, no schema/RLS unless approved)

STOP CONDITION:
If resolving this issue requires schema/RLS/business logic changes not explicitly approved, stop and report that blocker instead of implementing.`;
}

function choosePlanStatus(issue) {
  if (!issue.issueCode || !issue.title) return "blocked_missing_context";
  const hasEvidence = Boolean(issue.evidenceSummary) || (issue.evidencePaths?.length ?? 0) > 0;
  if (!hasEvidence) return "needs_more_evidence";
  return "ready_for_owner_review";
}

function selectIssues(candidates, cfg, args) {
  const skip = new Set(cfg.issueSelectionRules.skipStatuses.map((s) => s.toLowerCase()));
  const out = [];
  for (const issue of candidates) {
    const status = String(issue.status ?? "").toLowerCase();
    if (skip.has(status)) continue;
    const queue = String(issue.queueState ?? issue.queue_state ?? "").toLowerCase();
    const severity = normalizeSeverity(issue.severity);
    const approved = Boolean(issue.metadata?.approvedByPiter);

    const include =
      (cfg.issueSelectionRules.includeActiveTop10OpenFindings && queue === "active_top_10") ||
      (cfg.issueSelectionRules.includeBacklogApprovedByPiter && queue === "backlog" && approved) ||
      (cfg.issueSelectionRules.includeBacklogCriticalOrHigh &&
        queue === "backlog" &&
        (severity === "Critical" || severity === "High"));

    if (!include) continue;
    if (args.issue && issue.issueCode !== args.issue) continue;
    out.push(issue);
  }
  return out;
}

function mergeCandidates(rawCandidates) {
  const byCode = new Map();
  for (const c of rawCandidates) {
    if (!c.issueCode) continue;
    const prev = byCode.get(c.issueCode);
    if (!prev || severityRank(c.severity) > severityRank(prev.severity)) {
      byCode.set(c.issueCode, c);
    }
  }
  return [...byCode.values()];
}

function collectReportCandidates() {
  const collected = [];
  const seenSources = [];
  for (const relPath of SOURCE_PLAN_FILES) {
    const abs = path.join(repoRoot, relPath);
    const json = readJson(abs);
    if (!json?.candidates || !Array.isArray(json.candidates)) continue;
    seenSources.push(relPath);
    for (const c of json.candidates) {
      collected.push({
        issueCode: c.issueCode,
        title: c.title,
        category: c.category ?? "Functional",
        severity: normalizeSeverity(c.severity),
        status: c.status ?? "Backlog",
        queueState: c.queueState ?? "backlog",
        route: c.route ?? null,
        module: c.module ?? null,
        userRole: c.userRole ?? c.metadata?.qaUserId ?? null,
        evidenceSummary: c.evidenceSummary ?? "",
        evidencePaths: [c.metadata?.screenshotPath, c.metadata?.sourceReport].filter(Boolean),
        problem: c.problem ?? "",
        expectedResult: c.expectedResult ?? "",
        likelyRootCause: c.metadata?.classification ?? "Needs investigation",
        recommendedFixStrategy: c.recommendedFixStrategy ?? "Investigate and fix minimal root cause.",
        cursorPromptSeed: c.cursorPrompt ?? "",
        metadata: c.metadata ?? {},
        sourceReportPath: c.metadata?.sourceReport ?? null,
      });
    }
  }
  return { candidates: mergeCandidates(collected), seenSources };
}

function renderIssueMarkdown(plan) {
  return `# ${plan.issueCode} Fix Plan

## Issue Summary
- **Title:** ${plan.issueTitle}
- **Category:** ${plan.issueCategory}
- **Severity:** ${plan.severity}
- **Queue/Status:** ${plan.queueState} / ${plan.status}
- **Route:** ${plan.affectedRoute ?? "N/A"}
- **Role:** ${plan.affectedRole ?? "N/A"}

## Why It Matters
${plan.whyItMatters}

## Likely Root Cause
${plan.likelyRootCause}

## Files To Inspect
${plan.filesToInspect.map((f) => `- ${f}`).join("\n")}

## Preferred Fix Strategy
${plan.preferredFixStrategy}

## Do-Not-Change Rules
${plan.doNotChange.map((r) => `- ${r}`).join("\n")}

## Validation Commands
${plan.validationCommands.map((c) => `- ${c}`).join("\n")}

## Expected Verification Result
${plan.expectedVerificationResult}

## Cursor Prompt
\`\`\`
${plan.cursorPrompt}
\`\`\`
`;
}

function ensureDir(absPath) {
  fs.mkdirSync(absPath, { recursive: true });
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const cfg = readJson(configPath);
  if (!cfg) {
    console.error("Missing fix-plan-generator-config.json");
    process.exit(1);
  }

  if (args.source !== "reports" && args.source !== "db") {
    console.error("--source must be reports or db");
    process.exit(1);
  }
  if (args.source === "db") {
    console.error("DB source is intentionally not enabled in Stage 13B. Use --source reports.");
    process.exit(1);
  }

  const { candidates, seenSources } = collectReportCandidates();
  const selected = selectIssues(candidates, cfg, args);

  const plans = selected.map((issue) => {
    const validation = [...cfg.defaultValidationCommands];
    const optional = cfg.optionalValidationByCategory[issue.category];
    if (optional) validation.push(optional);
    const readableSummary =
      issue.problem && issue.expectedResult
        ? `${issue.problem} Expected: ${issue.expectedResult}`
        : issue.evidenceSummary || "No concise summary available.";

    const plan = {
      version: "1.0.0",
      planId: `plan-${issue.issueCode}-${Date.now()}`,
      issueCode: issue.issueCode,
      issueTitle: issue.title,
      issueCategory: issue.category,
      severity: issue.severity,
      queueState: issue.queueState,
      status: issue.status,
      affectedRoute: issue.route,
      affectedModule: issue.module,
      affectedRole: issue.userRole,
      evidenceSummary: issue.evidenceSummary || issue.problem || "",
      evidencePaths: issue.evidencePaths || [],
      readableSummary,
      whyItMatters:
        issue.category === "Security/Permission"
          ? "Permission boundary issues can expose unauthorized access paths and must be contained."
          : "Issue can impact expected workflow reliability and QA confidence.",
      likelyRootCause: issue.likelyRootCause || "Needs focused inspection.",
      filesToInspect: inferFiles(issue),
      preferredFixStrategy: issue.recommendedFixStrategy,
      doNotChange: cfg.defaultDoNotChangeRules,
      validationCommands: validation,
      expectedVerificationResult: "Issue no longer reproduces and validation commands pass in staging.",
      cursorPrompt: "",
      ownerApprovalRequired: true,
      autoFixEligible: false,
      riskLevel:
        issue.severity === "Critical" || issue.severity === "High"
          ? "high"
          : issue.severity === "Medium"
            ? "medium"
            : "low",
      createdAt: new Date().toISOString(),
      sourceFindingMetadata: issue.metadata ?? {},
      planStatus: "draft_plan",
    };
    plan.cursorPrompt = buildCursorPrompt(issue, plan, validation);
    plan.planStatus = choosePlanStatus({
      issueCode: plan.issueCode,
      title: plan.issueTitle,
      evidenceSummary: plan.evidenceSummary,
      evidencePaths: plan.evidencePaths,
    });
    return plan;
  });

  const outputFolder = path.join(repoRoot, cfg.outputFolder);
  const issueFolder = path.join(repoRoot, cfg.perIssueFolder);
  const summaryJsonPath = path.join(outputFolder, "agentops-fix-plan-summary.json");
  const summaryMdPath = path.join(outputFolder, "agentops-fix-plan-summary.md");
  const publicSummaryPath = path.join(
    repoRoot,
    "public",
    "agentops",
    "fix-plan-summary.json",
  );

  const summary = {
    generatedAt: new Date().toISOString(),
    sourceMode: args.source,
    dryRun: args.dryRun,
    selectedIssueCount: selected.length,
    generatedPlanCount: plans.length,
    seenSources,
    plans: plans.map((p) => ({
      issueCode: p.issueCode,
      issueTitle: p.issueTitle,
      severity: p.severity,
      queueState: p.queueState,
      status: p.status,
      planStatus: p.planStatus,
      markdownPath: `${cfg.perIssueFolder}/${p.issueCode}_FIX_PLAN.md`,
      jsonPath: `${cfg.perIssueFolder}/${p.issueCode}_FIX_PLAN.json`,
    })),
  };

  const publicSummary = {
    generatedAt: summary.generatedAt,
    sourceMode: summary.sourceMode,
    dryRun: summary.dryRun,
    selectedIssueCount: summary.selectedIssueCount,
    generatedPlanCount: summary.generatedPlanCount,
    plans: plans.map((p) => ({
      issueCode: p.issueCode,
      issueTitle: p.issueTitle,
      issueCategory: p.issueCategory,
      severity: p.severity,
      queueState: p.queueState,
      status: p.status,
      planStatus: p.planStatus,
      planId: p.planId,
      readableSummary: p.readableSummary,
      whyItMatters: p.whyItMatters,
      preferredFixStrategy: p.preferredFixStrategy,
      validationCommands: p.validationCommands,
      cursorPrompt: p.cursorPrompt,
      affectedRoute: p.affectedRoute,
      affectedModule: p.affectedModule,
      affectedRole: p.affectedRole,
      markdownPath: `${cfg.perIssueFolder}/${p.issueCode}_FIX_PLAN.md`,
      jsonPath: `${cfg.perIssueFolder}/${p.issueCode}_FIX_PLAN.json`,
    })),
  };

  if (!args.dryRun) {
    ensureDir(outputFolder);
    ensureDir(issueFolder);
    for (const plan of plans) {
      const issueJson = path.join(issueFolder, `${plan.issueCode}_FIX_PLAN.json`);
      const issueMd = path.join(issueFolder, `${plan.issueCode}_FIX_PLAN.md`);
      fs.writeFileSync(issueJson, `${JSON.stringify(plan, null, 2)}\n`);
      fs.writeFileSync(issueMd, renderIssueMarkdown(plan));
    }

    const md = [
      "# AgentOps Fix Plan Summary",
      "",
      `- Generated: ${summary.generatedAt}`,
      `- Source mode: ${summary.sourceMode}`,
      `- Selected issues: ${summary.selectedIssueCount}`,
      `- Plans generated: ${summary.generatedPlanCount}`,
      "",
      "## Plans",
      "",
      ...summary.plans.map(
        (p) =>
          `- **${p.issueCode}** (${p.severity}) — ${p.issueTitle} | status: ${p.planStatus} | \`${p.markdownPath}\``,
      ),
      "",
    ].join("\n");

    fs.writeFileSync(summaryJsonPath, `${JSON.stringify(summary, null, 2)}\n`);
    fs.writeFileSync(summaryMdPath, md);
    ensureDir(path.dirname(publicSummaryPath));
    fs.writeFileSync(publicSummaryPath, `${JSON.stringify(publicSummary, null, 2)}\n`);
  }

  console.log(`Source mode: ${args.source}`);
  console.log(`Selected issues: ${summary.selectedIssueCount}`);
  console.log(`Generated plans: ${summary.generatedPlanCount}`);
  if (args.dryRun) {
    console.log("Dry-run: no files written.");
  } else {
    console.log(`Summary JSON: ${rel(summaryJsonPath)}`);
    console.log(`Summary MD: ${rel(summaryMdPath)}`);
    console.log(`Public summary JSON: ${rel(publicSummaryPath)}`);
  }
}

main();
