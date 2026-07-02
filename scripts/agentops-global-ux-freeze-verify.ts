/**
 * AgentOps Global UX Freeze verification — product surface vocabulary + required copy owners.
 * Usage: npx tsx scripts/agentops-global-ux-freeze-verify.ts
 *
 * Runtime observatory checks delegate to existing authoritative scripts (no logic duplication).
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const REPO_ROOT = process.cwd();
const REGRESSION_LABEL = "AGENTOPS GLOBAL UX FREEZE REGRESSION";

const REQUIRED_FILES = [
  "registry/AGENTOPS_GLOBAL_UX_FREEZE.md",
  "src/lib/agentops/agents/agentDetailDisplayCopy.ts",
  "src/lib/agentops/issues/issueDetailDisplayCopy.ts",
  "src/lib/agentops/issues/issueDisplayMappers.ts",
  "src/lib/agentops/agents/agentMemoryProductView.ts",
  "src/lib/agentops/agents/productAgentWorkspaceMappers.ts",
  "src/app/system/agent-ops/agents/page.tsx",
  "src/app/system/agent-ops/agents/[agentId]/page.tsx",
  "src/app/system/agent-ops/issues/page.tsx",
  "src/app/system/agent-ops/issues/[issueCode]/page.tsx",
] as const;

const APP_AGENTS_BACKEND_BASENAMES = new Set([
  "agentChatService.ts",
  "agentMemoryService.ts",
  "useAgentChat.ts",
  "agentHealthCheck.ts",
  "agentIntelligenceClient.ts",
  "agentScheduleService.ts",
  "agentSTTService.ts",
  "agentChatRender.ts",
  "normalizeCursorPrompt.ts",
  "BrowserQaToolReportActions.tsx",
  "AgentConfigPanel.tsx",
  "AgentHermesHandoffPanel.tsx",
]);

const LIB_AGENTS_PRODUCT_BASENAMES = new Set([
  "agentDetailDisplayCopy.ts",
  "productAgentDisplay.ts",
  "productAgentWorkspaceMappers.ts",
  "agentMemoryProductView.ts",
  "productAgentsService.ts",
  "productAgentIssues.ts",
  "productAgentStatus.ts",
]);

const LIB_ISSUES_PRODUCT_BASENAMES = new Set([
  "issueDetailDisplayCopy.ts",
  "issueDisplayMappers.ts",
  "productIssueMappers.ts",
  "productIssuesService.ts",
  "productIssueTypes.ts",
]);

const FORBIDDEN_DISPLAY_PATTERNS: { pattern: RegExp; label: string }[] = [
  { pattern: /\brecommended action\b/i, label: "recommended action" },
  { pattern: /\bfix plan\b/i, label: "fix plan" },
  { pattern: /\bexecution status\b/i, label: "execution status" },
  { pattern: /\bstatus helper\b/i, label: "status helper" },
  { pattern: /\bUI helper\b/i, label: "UI helper" },
  { pattern: /\bnot wired \(raw\)/i, label: "not wired (raw)" },
  { pattern: /\bcognition signal\b/i, label: "cognition signal" },
  { pattern: /\bUI indicator\b/i, label: "UI indicator" },
  { pattern: /\bautonomous action\b/i, label: "autonomous action" },
  { pattern: /\bsystem truth\b/i, label: "system truth" },
  { pattern: /\bintelligence outcome\b/i, label: "intelligence outcome" },
  { pattern: /\brecommended fix\b/i, label: "recommended fix" },
  { pattern: /\bfix planning engine\b/i, label: "fix planning engine" },
];

const CONTEXT_FORBIDDEN_PATTERNS: { pattern: RegExp; label: string }[] = [
  { pattern: /\bpriority\b/i, label: "priority" },
  { pattern: /\branking\b/i, label: "ranking" },
  { pattern: /\bscore\b/i, label: "score" },
  { pattern: /\bcognition\b/i, label: "cognition" },
  { pattern: /\brecommendation\b/i, label: "recommendation" },
  { pattern: /\bdecision\b/i, label: "decision" },
];

const LINE_ALLOWLIST_SUBSTRINGS = [
  "import ",
  "from ",
  "export type",
  "export interface",
  "recommended_fix_strategy",
  "recommendedFixStrategy",
  "priority_score",
  "priorityScore",
  "executionState",
  "executionStateLabel",
  "deriveExecutionState",
  "prepareAgentOpsExecutionRequest",
  "recordAgentOpsFixPlanDecision",
  "getAgentOpsFixPlanDecisionHistory",
  "fixDecisionHistory",
  "fixPlan",
  "fix_plan",
  "approve_fix_plan",
  "reject_fix_plan",
  "HermesCognition",
  "logHermesCognitionDecision",
  "reasoning.decision",
  "nextRecommendedAction",
  "buildHermesRecommendation",
  "recordAgentOpsHermesRecommendation",
  "AgentOpsHermesRecommendation",
  "handleSaveRecommendation",
  "canSaveCurrentRecommendation",
  "issue-hermes-save-recommendation",
  "recommendationResult",
  "USL_FINAL_GATE_MARKER",
  "Final gate (v10.4",
  "v10.4 ONLY",
  "normalizeIssueDisplayString",
  "normalizeDisplayString",
  "translateToUSL",
  "issueDisplayMappers",
  "FORBIDDEN",
  "legacyTerms",
  "pattern:",
  "replacement:",
  "health_score",
  "impact_score",
  "signal strength",
  "diagnostic trace",
  "display layer",
  "data-testid",
  "// ",
  "* ",
  "not a failure of platform support",
  "Platform support",
  "verified_fixed",
  "Verified Fixed",
  "isVerifiedFixedLifecycle",
  "canMarkFixedRecommendation",
  "fix-agent",
  "Fix Agent",
  "fix_report_review",
  "request_better_plan",
  "manual handoff decisions",
];

function collectProductUiFiles(): string[] {
  const files: string[] = [];

  const agentsAppDir = path.join(REPO_ROOT, "src/app/system/agent-ops/agents");
  if (fs.existsSync(agentsAppDir)) {
    for (const entry of fs.readdirSync(agentsAppDir, { withFileTypes: true })) {
      if (!entry.isFile()) continue;
      if (!entry.name.endsWith(".tsx")) continue;
      if (APP_AGENTS_BACKEND_BASENAMES.has(entry.name)) continue;
      files.push(`src/app/system/agent-ops/agents/${entry.name}`);
    }
    const detailPage = "src/app/system/agent-ops/agents/[agentId]/page.tsx";
    if (fs.existsSync(path.join(REPO_ROOT, detailPage))) files.push(detailPage);
  }

  const issuesAppDir = path.join(REPO_ROOT, "src/app/system/agent-ops/issues");
  if (fs.existsSync(issuesAppDir)) {
    for (const entry of fs.readdirSync(issuesAppDir, { withFileTypes: true })) {
      if (!entry.isFile()) continue;
      if (!entry.name.endsWith(".tsx")) continue;
      files.push(`src/app/system/agent-ops/issues/${entry.name}`);
    }
    const workspacePage = "src/app/system/agent-ops/issues/[issueCode]/page.tsx";
    if (fs.existsSync(path.join(REPO_ROOT, workspacePage))) files.push(workspacePage);
  }

  const libAgentsDir = path.join(REPO_ROOT, "src/lib/agentops/agents");
  if (fs.existsSync(libAgentsDir)) {
    for (const name of LIB_AGENTS_PRODUCT_BASENAMES) {
      const rel = `src/lib/agentops/agents/${name}`;
      if (fs.existsSync(path.join(REPO_ROOT, rel))) files.push(rel);
    }
  }

  const libIssuesDir = path.join(REPO_ROOT, "src/lib/agentops/issues");
  if (fs.existsSync(libIssuesDir)) {
    for (const name of LIB_ISSUES_PRODUCT_BASENAMES) {
      const rel = `src/lib/agentops/issues/${name}`;
      if (fs.existsSync(path.join(REPO_ROOT, rel))) files.push(rel);
    }
  }

  return [...new Set(files)];
}

function isLineAllowlisted(line: string): boolean {
  return LINE_ALLOWLIST_SUBSTRINGS.some((token) => line.includes(token));
}

function isDecisionAllowedInContext(line: string): boolean {
  if (!/\bdecision\b/i.test(line)) return true;
  if (line.includes("reasoning.decision")) return true;
  if (line.includes("approve_fix_plan") || line.includes("reject_fix_plan")) return true;
  if (line.includes("request_better_plan")) return true;
  if (line.includes("fixDecisionHistory")) return true;
  if (line.includes("manual handoff decisions")) return true;
  return false;
}

function scanProductUiForbiddenCopy(): string[] {
  const hits: string[] = [];
  const files = collectProductUiFiles();

  for (const rel of files) {
    const full = path.join(REPO_ROOT, rel);
    const lines = fs.readFileSync(full, "utf8").split(/\r?\n/);
    lines.forEach((line, index) => {
      if (isLineAllowlisted(line)) return;

      for (const { pattern, label } of FORBIDDEN_DISPLAY_PATTERNS) {
        if (pattern.test(line)) {
          hits.push(`${rel}:${index + 1}: forbidden "${label}"`);
        }
      }

      for (const { pattern, label } of CONTEXT_FORBIDDEN_PATTERNS) {
        if (!pattern.test(line)) continue;
        if (label === "decision" && isDecisionAllowedInContext(line)) continue;
        if (label === "priority" && line.includes("signal strength")) continue;
        if (label === "score" && line.includes("impact_score")) continue;
        hits.push(`${rel}:${index + 1}: forbidden "${label}"`);
      }
    });
  }

  return hits;
}

function verifyRequiredFiles(): string[] {
  const missing: string[] = [];
  for (const rel of REQUIRED_FILES) {
    if (!fs.existsSync(path.join(REPO_ROOT, rel))) {
      missing.push(`missing required file: ${rel}`);
    }
  }
  return missing;
}

function runDelegatedScript(scriptRel: string): { pass: boolean; label: string; detail?: string } {
  const scriptPath = path.join(REPO_ROOT, scriptRel);
  if (!fs.existsSync(scriptPath)) {
    return { pass: false, label: scriptRel, detail: "script missing" };
  }
  try {
    const stdout = execSync(`npx tsx "${scriptPath}"`, {
      cwd: REPO_ROOT,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    const parsed = JSON.parse(stdout) as { pass?: boolean };
    return { pass: parsed.pass === true, label: scriptRel };
  } catch (error) {
    const err = error as { stdout?: string; message?: string };
    return {
      pass: false,
      label: scriptRel,
      detail: err.stdout?.slice(0, 200) ?? err.message ?? "failed",
    };
  }
}

function main() {
  const missingFiles = verifyRequiredFiles();
  const productUiFiles = collectProductUiFiles();
  const productUiHits = scanProductUiForbiddenCopy();

  const runtimeImmutability = runDelegatedScript("scripts/agentops-runtime-immutability-check.ts");
  const runtimeSemantic = runDelegatedScript("scripts/agentops-runtime-semantic-verify.ts");

  const failures = [
    ...missingFiles,
    ...productUiHits,
    ...(runtimeImmutability.pass ? [] : [`delegated check failed: ${runtimeImmutability.label}`]),
    ...(runtimeSemantic.pass ? [] : [`delegated check failed: ${runtimeSemantic.label}`]),
  ];

  const output = {
    pass: failures.length === 0,
    regressionLabel: REGRESSION_LABEL,
    freezeDocument: "registry/AGENTOPS_GLOBAL_UX_FREEZE.md",
    requiredFilesChecked: REQUIRED_FILES.length,
    missingFiles,
    productUiFilesScanned: productUiFiles.length,
    productUiFiles,
    productUiForbiddenHits: productUiHits,
    productUiForbiddenHitCount: productUiHits.length,
    delegatedChecks: {
      runtimeImmutability: runtimeImmutability.pass,
      runtimeSemantic: runtimeSemantic.pass,
    },
    failureCount: failures.length,
    failures,
  };

  console.log(JSON.stringify(output, null, 2));
  if (!output.pass) process.exitCode = 1;
}

main();
