import { spawnSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import { assertDevServerForQa } from "../../scripts/dev-server-utils.mjs";
import { loadAgentOpsOwnerEnv, ownerEnvStatus } from "./load-agentops-owner-env.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

loadAgentOpsOwnerEnv();
await assertDevServerForQa();
const status = ownerEnvStatus();

if (!status.emailPresent || !status.passwordPresent) {
  console.warn(
    "Owner credentials not configured; smoke will report skipped. Set AGENTOPS_QA_OWNER_EMAIL and AGENTOPS_QA_OWNER_PASSWORD.",
  );
}

const result = spawnSync(
  "npx",
  [
    "playwright",
    "test",
    "-c",
    "qa-agent/browser-qa/playwright.config.mjs",
    "qa-agent/browser-qa/tests/agentops-codegraph-discovery-phase-6c-smoke.spec.mjs",
  ],
  {
    cwd: repoRoot,
    stdio: "inherit",
    env: process.env,
    shell: true,
  },
);

process.exit(result.status ?? 1);
