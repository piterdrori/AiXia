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
    syntheticUsersTotal: credStatus.total,
    credentialsConfigured: credStatus.configured,
    credentialsSkipped: credStatus.skipped,
    usedOwnerPasswordFallback: credStatus.usedOwnerPasswordFallback,
    passwordValuesPrinted: false,
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
    "qa-agent/browser-qa/tests/agentops-synthetic-users-readonly-smoke.spec.mjs",
  ],
  {
    cwd: repoRoot,
    stdio: "inherit",
    env: process.env,
    shell: true,
  },
);

let exitCode = result.status ?? 1;
const reportPath = path.join(repoRoot, "qa-agent", "reports", "browser-qa", "synthetic-users-smoke-report.json");
if (fs.existsSync(reportPath)) {
  try {
    const smokeReport = JSON.parse(fs.readFileSync(reportPath, "utf8"));
    if (smokeReport.status === "passed") {
      exitCode = 0;
    } else if (smokeReport.status === "failed") {
      exitCode = 1;
    }
  } catch {
    // keep Playwright exit code
  }
}

process.exit(exitCode);
