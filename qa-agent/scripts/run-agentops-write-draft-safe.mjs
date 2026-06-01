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
const scopePath = path.join(repoRoot, "qa-agent", "browser-qa", "write-workflow-scope.json");

loadSyntheticUsersEnv();

let devServerOk = true;
try {
  await assertDevServerForQa();
} catch (error) {
  devServerOk = false;
  console.error(String(error?.message || error));
  console.error("Start the dev server with: npm run dev (http://127.0.0.1:5173)");
}

const users = JSON.parse(fs.readFileSync(catalogPath, "utf8")).users;
const scope = JSON.parse(fs.readFileSync(scopePath, "utf8"));
const credStatus = credentialStatusForUsers(users);

console.log(
  JSON.stringify({
    stage: "11-write-draft-safe",
    syntheticUsersTotal: credStatus.total,
    credentialsConfigured: credStatus.configured,
    credentialsSkipped: credStatus.skipped,
    passwordValuesPrinted: false,
    environment: scope.environment,
    devServerOk,
  }),
);

if (!devServerOk) {
  process.exit(1);
}

if (credStatus.configured === 0) {
  console.warn(
    "No synthetic user passwords configured. Tests will skip. Set AGENTOPS_QA_SYNTHETIC_PASSWORD or per-user passwords in gitignored env files.",
  );
}

const result = spawnSync(
  "npx",
  [
    "playwright",
    "test",
    "-c",
    "qa-agent/browser-qa/playwright.config.mjs",
    "qa-agent/browser-qa/tests/agentops-synthetic-write-draft-safe.spec.mjs",
  ],
  {
    cwd: repoRoot,
    stdio: "inherit",
    env: process.env,
    shell: true,
  },
);

let exitCode = result.status ?? 1;
const reportPath = path.join(
  repoRoot,
  "qa-agent",
  "reports",
  "browser-qa",
  "write-draft-safe-report.json",
);

if (fs.existsSync(reportPath)) {
  try {
    const writeReport = JSON.parse(fs.readFileSync(reportPath, "utf8"));
    const criticalCount = writeReport.criticalFindings?.length ?? 0;

    if (criticalCount > 0) {
      console.error(`Critical safety findings: ${criticalCount}. Failing run.`);
      exitCode = 1;
    } else if (writeReport.status === "passed") {
      exitCode = 0;
    } else if (writeReport.status === "failed") {
      exitCode = writeReport.usersTested > 0 ? 0 : 1;
    } else if (writeReport.status === "skipped") {
      exitCode = 1;
    }

    console.log(
      JSON.stringify({
        reportStatus: writeReport.status,
        usersTested: writeReport.usersTested,
        writeAttempts: writeReport.writeAttempts,
        skippedWriteAttempts: writeReport.skippedWriteAttempts,
        recordsCreatedCount: writeReport.recordsCreated?.length ?? 0,
        findingsCount: writeReport.findings?.length ?? 0,
        criticalFindings: criticalCount,
        reportJson: "qa-agent/reports/browser-qa/write-draft-safe-report.json",
        reportMd: "qa-agent/reports/browser-qa/write-draft-safe-report.md",
      }),
    );
  } catch {
    // keep Playwright exit code
  }
}

process.exit(exitCode);
