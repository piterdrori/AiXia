import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { assertDevServerForQa } from "../../scripts/dev-server-utils.mjs";
import {
  loadSyntheticUsersEnv,
  credentialStatusForUsers,
} from "./load-agentops-synthetic-users-env.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const catalogPath = path.join(repoRoot, "qa-agent", "browser-qa", "synthetic-browser-users.json");

loadSyntheticUsersEnv();
await assertDevServerForQa();

const users = JSON.parse(fs.readFileSync(catalogPath, "utf8")).users;
const credStatus = credentialStatusForUsers(users);

console.log(
  JSON.stringify({
    stage: "10-role-workflow-safe",
    syntheticUsersTotal: credStatus.total,
    credentialsConfigured: credStatus.configured,
    credentialsSkipped: credStatus.skipped,
    usedOwnerPasswordFallback: credStatus.usedOwnerPasswordFallback,
    passwordValuesPrinted: false,
    environment: "staging-only",
  }),
);

if (credStatus.configured === 0) {
  console.warn(
    "No synthetic user passwords configured. Tests will skip all users. Set AGENTOPS_QA_SYNTHETIC_PASSWORD or per-user AGENTOPS_QA_*_PASSWORD in gitignored env files.",
  );
}

const result = spawnSync(
  "npx",
  [
    "playwright",
    "test",
    "-c",
    "qa-agent/browser-qa/playwright.config.mjs",
    "qa-agent/browser-qa/tests/agentops-role-workflow-safe.spec.mjs",
  ],
  {
    cwd: repoRoot,
    stdio: "inherit",
    env: process.env,
    shell: true,
  },
);

let exitCode = result.status ?? 1;
const reportPath = path.join(repoRoot, "qa-agent", "reports", "browser-qa", "role-workflow-safe-report.json");

if (fs.existsSync(reportPath)) {
  try {
    const workflowReport = JSON.parse(fs.readFileSync(reportPath, "utf8"));
    const criticalCount = workflowReport.criticalSecurityFindings?.length ?? 0;

    if (criticalCount > 0) {
      console.error(`Critical security findings: ${criticalCount}. Failing run.`);
      exitCode = 1;
    } else if (workflowReport.status === "passed") {
      exitCode = 0;
    } else if (workflowReport.status === "failed") {
      exitCode = workflowReport.usersTested > 0 ? 0 : 1;
    } else if (workflowReport.status === "skipped") {
      exitCode = 1;
    }

    console.log(
      JSON.stringify({
        reportStatus: workflowReport.status,
        usersTested: workflowReport.usersTested,
        findingsCount: workflowReport.findings?.length ?? 0,
        criticalSecurityFindings: criticalCount,
        agentOpsIsolation: workflowReport.agentOpsIsolation?.status,
        reportJson: "qa-agent/reports/browser-qa/role-workflow-safe-report.json",
        reportMd: "qa-agent/reports/browser-qa/role-workflow-safe-report.md",
      }),
    );
  } catch {
    // keep Playwright exit code
  }
}

process.exit(exitCode);
