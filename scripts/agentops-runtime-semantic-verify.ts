/**
 * Runtime semantic boundary verification — observation-only observatory surfaces.
 * Usage: npx tsx scripts/agentops-runtime-semantic-verify.ts
 */
import fs from "node:fs";
import path from "node:path";

const REPO_ROOT = process.cwd();
const REGRESSION_LABEL = "RUNTIME SEMANTIC REGRESSION";

/** Runtime observatory files (post 7→4 collapse). */
const RUNTIME_SURFACE_PATHS = [
  "src/app/system/agent-ops/runtime/page.tsx",
  "src/app/system/agent-ops/memory/page.tsx",
  "src/app/system/agent-ops/issues/runtime/page.tsx",
  "src/app/system/agent-ops/agents/runtime/page.tsx",
  "src/components/agentops/runtime/AgentOpsRuntimeNav.tsx",
];

/** User-visible authority / inference language — not allowed in runtime observatories. */
const FORBIDDEN_DISPLAY_PATTERNS: { pattern: RegExp; label: string }[] = [
  { pattern: /\bevolution engine\b/i, label: "evolution engine" },
  { pattern: /\bfix[\s-]?plan\b/i, label: "fix plan" },
  { pattern: /\bfix pipeline\b/i, label: "fix pipeline" },
  { pattern: /\bautonomous fix engine\b/i, label: "autonomous fix engine" },
  { pattern: /\brecommended action\b/i, label: "recommended action" },
  { pattern: /\bnext action\b/i, label: "next action" },
  { pattern: /\bpriority issue\b/i, label: "priority issue" },
  { pattern: /\brecommended fix\b/i, label: "recommended fix" },
  { pattern: /\binsight clustering\b/i, label: "insight clustering" },
  { pattern: /\bsystem interpretation\b/i, label: "system interpretation" },
  { pattern: /\bhealth reasoning\b/i, label: "health reasoning" },
  { pattern: /\bproductivity scoring\b/i, label: "productivity scoring" },
  { pattern: /\bgovernance outcome\b/i, label: "governance outcome" },
];

/** Computed inference helpers that must not appear in issues observatory. */
const FORBIDDEN_INFERENCE_SYMBOLS = [
  { file: "src/app/system/agent-ops/issues/runtime/page.tsx", symbol: "resolveOutcome" },
];

/** Allowed exceptions (prop names, imports, stored field labels). */
const ALLOWLIST_SUBSTRINGS = [
  "suggestedFix=",
  "AgentHealthPanel",
  "runAgentRegistryHealthCheck",
  "AgentRegistryHealthResult",
  "health_score",
  "Stored score field",
  "diagnostic trace",
  "Evolution mirror",
];

function isAllowlisted(line: string): boolean {
  return ALLOWLIST_SUBSTRINGS.some((token) => line.includes(token));
}

function scanForbiddenDisplayLanguage(): string[] {
  const hits: string[] = [];
  for (const rel of RUNTIME_SURFACE_PATHS) {
    const full = path.join(REPO_ROOT, rel);
    if (!fs.existsSync(full)) {
      hits.push(`${rel}: missing runtime surface file`);
      continue;
    }
    const lines = fs.readFileSync(full, "utf8").split(/\r?\n/);
    lines.forEach((line, index) => {
      if (isAllowlisted(line)) return;
      for (const { pattern, label } of FORBIDDEN_DISPLAY_PATTERNS) {
        if (pattern.test(line)) {
          hits.push(`${rel}:${index + 1}: forbidden "${label}"`);
        }
      }
      if (/\brecommend/i.test(line) && !line.includes("suggestedFix")) {
        hits.push(`${rel}:${index + 1}: forbidden "recommend*"`);
      }
      if (/\bpriority\b/i.test(line) && !line.includes("signal strength")) {
        hits.push(`${rel}:${index + 1}: forbidden "priority"`);
      }
      if (/\binsight\b/i.test(line) && !/insights pending owner approval/i.test(line)) {
        hits.push(`${rel}:${index + 1}: forbidden "insight"`);
      }
    });
  }
  return hits;
}

function scanForbiddenInferenceSymbols(): string[] {
  const hits: string[] = [];
  for (const { file, symbol } of FORBIDDEN_INFERENCE_SYMBOLS) {
    const full = path.join(REPO_ROOT, file);
    if (!fs.existsSync(full)) continue;
    const text = fs.readFileSync(full, "utf8");
    if (text.includes(symbol)) {
      hits.push(`${file}: computed inference symbol "${symbol}" must not appear`);
    }
  }
  return hits;
}

function main() {
  const displayLeaks = scanForbiddenDisplayLanguage();
  const inferenceLeaks = scanForbiddenInferenceSymbols();
  const failures = [...displayLeaks, ...inferenceLeaks];

  const output = {
    pass: failures.length === 0,
    regressionLabel: REGRESSION_LABEL,
    surfacesChecked: RUNTIME_SURFACE_PATHS.length,
    forbiddenDisplayHits: displayLeaks,
    forbiddenInferenceHits: inferenceLeaks,
    failureCount: failures.length,
    failures,
  };

  console.log(JSON.stringify(output, null, 2));
  if (!output.pass) process.exitCode = 1;
}

main();
