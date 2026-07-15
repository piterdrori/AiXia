/**
 * Phase 5H — daily 12-agent review verification.
 * Usage: npm run agentops:monitoring-daily-12-agents-verify
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

import {
  CANONICAL_DAILY_REVIEW_PROFILES,
  validateCanonicalDailyReviewRegistry,
} from "../src/lib/agentops/runtime/canonicalAgentDailyReview";
import { EXPECTED_AGENT_COUNT } from "../src/lib/agentops/canonicalAgents";
import { APPROVED_DAILY_12_AGENT_CRON } from "../src/lib/agentops/runtime/agentOpsMonitoringScheduleMeta";
import { DAILY_AGENT_EXECUTIONS_TABLE } from "../src/lib/agentops/runtime/agentOpsDailyAgentExecutions";

const REPO_ROOT = process.cwd();
const failures: string[] = [];

function fail(message: string): void {
  failures.push(message);
}

function mustExist(relativePath: string): string {
  const full = join(REPO_ROOT, relativePath);
  if (!existsSync(full)) {
    fail(`Missing required file: ${relativePath}`);
    return "";
  }
  return readFileSync(full, "utf8");
}

function verifyCanonicalRegistry(): void {
  const validation = validateCanonicalDailyReviewRegistry();
  if (!validation.ok) {
    for (const error of validation.errors) fail(error);
    return;
  }
  if (CANONICAL_DAILY_REVIEW_PROFILES.length !== EXPECTED_AGENT_COUNT) {
    fail(`Expected ${EXPECTED_AGENT_COUNT} daily profiles, found ${CANONICAL_DAILY_REVIEW_PROFILES.length}`);
  }
  const usernames = new Set<string>();
  for (const profile of CANONICAL_DAILY_REVIEW_PROFILES) {
    if (!profile.username.startsWith("@aixia.")) {
      fail(`${profile.agentSlug}: username must use @aixia. prefix`);
    }
    if (usernames.has(profile.username)) {
      fail(`Duplicate username: ${profile.username}`);
    }
    usernames.add(profile.username);
    if (!profile.jobTitle.trim()) fail(`${profile.agentSlug}: missing job title`);
    if (!profile.jobDescription.trim()) fail(`${profile.agentSlug}: missing job description`);
    if (!profile.perspectiveTitle.trim()) fail(`${profile.agentSlug}: missing perspective`);
  }
}

function verifyDailyWorkflow(): void {
  const workflow = mustExist(".github/workflows/agentops-daily-12-agent-review.yml");
  if (!workflow) return;

  if (!workflow.includes(`cron: "${APPROVED_DAILY_12_AGENT_CRON}"`)) {
    fail(`Daily workflow must include cron "${APPROVED_DAILY_12_AGENT_CRON}"`);
  }
  if (!workflow.includes("workflow_dispatch:")) fail("Daily workflow must support workflow_dispatch");
  if (!workflow.includes("agent_scope:")) fail("Daily workflow must include agent_scope input");
  if (!workflow.includes("force_retry:")) fail("Daily workflow must include force_retry input");
  if (!workflow.includes("work_type:")) fail("Daily workflow must include work_type input (Fix B)");
  if (!workflow.includes("owner_manual_run_id:")) {
    fail("Daily workflow must include owner_manual_run_id input (Fix B)");
  }
  if (!workflow.includes("group: agentops-staging-daily-12-agent-review")) {
    fail("Daily workflow must use concurrency group agentops-staging-daily-12-agent-review");
  }
  if (!workflow.includes('AGENTOPS_MONITORING_MODE: daily_12_agent_review')) {
    fail("Daily workflow must set AGENTOPS_MONITORING_MODE=daily_12_agent_review");
  }
  if (!workflow.includes('AGENTOPS_MONITORING_DRY_RUN: "true"')) {
    fail("Daily workflow must set AGENTOPS_MONITORING_DRY_RUN=true");
  }
  if (!workflow.includes('AGENTOPS_MONITORING_CONTINUOUS: "false"')) {
    fail("Daily workflow must set AGENTOPS_MONITORING_CONTINUOUS=false");
  }
  if (!workflow.includes("secrets.AGENTOPS_QA_BASE_URL")) {
    fail("Daily workflow must use staging AGENTOPS_QA_BASE_URL secret");
  }
  if (workflow.includes("vercel --prod") || workflow.includes("deploy --prod")) {
    fail("Daily workflow must not deploy to production");
  }
  if (!workflow.includes("agentops:monitoring:daily-12-agent:gha")) {
    fail("Daily workflow must run npm run agentops:monitoring:daily-12-agent:gha");
  }
}

function verifyScheduledWorkflowUnchanged(): void {
  const workflow = mustExist(".github/workflows/agentops-monitoring-scheduled-dry-run.yml");
  if (!workflow) return;
  const crons: string[] = [];
  for (const line of workflow.split("\n")) {
    if (line.trim().startsWith("#")) continue;
    const match = line.match(/-\s*cron:\s*"([^"]+)"/);
    if (match) crons.push(match[1]);
  }
  if (!crons.includes("0 */6 * * *")) fail("5G operational cron must remain 0 */6 * * *");
  if (!crons.includes("0 2 * * 0")) fail("5G weekly cron must remain 0 2 * * 0");
  if (crons.includes(APPROVED_DAILY_12_AGENT_CRON)) {
    fail("Daily cron must not be added to 5G workflow — use separate daily workflow");
  }
}

function verifyWorkerAndPolicy(): void {
  mustExist("src/lib/agentops/runtime/agentOpsDaily12AgentReview.ts");
  mustExist("src/lib/agentops/runtime/agentOpsDaily12AgentReview.cli.ts");
  mustExist("src/lib/agentops/runtime/agentOpsDailyReviewFindingPolicy.ts");
  mustExist("src/lib/agentops/runtime/agentOpsDailyReviewQueuePolicy.ts");
  mustExist("src/lib/agentops/runtime/agentOpsDailyAgentExecutions.ts");
  mustExist("scripts/agentops-monitoring-daily-12-agent-run.mjs");

  const queuePolicy = mustExist("src/lib/agentops/runtime/agentOpsDailyReviewQueuePolicy.ts");
  if (queuePolicy && !queuePolicy.includes("DAILY_IMPROVEMENT_MAX_PER_AGENT")) {
    fail("Daily queue policy must cap improvements per agent");
  }
  if (queuePolicy && !queuePolicy.includes("DAILY_IMPROVEMENT_MAX_PER_RUN")) {
    fail("Daily queue policy must cap improvements per run");
  }
  if (queuePolicy && !queuePolicy.includes("CandidateNotQueued")) {
    fail("Daily queue policy must define candidateNotQueued records");
  }

  const policy = mustExist("src/lib/agentops/runtime/agentOpsDailyReviewFindingPolicy.ts");
  if (policy && !policy.includes("NO_FINDING")) fail("Daily finding policy must support NO_FINDING");
  if (policy && !policy.includes("isLowValueSuggestion")) {
    fail("Daily finding policy must reject low-value suggestions");
  }

  const worker = mustExist("src/lib/agentops/runtime/agentOpsDaily12AgentReview.ts");
  if (worker && !worker.includes("allAgentsAccountedFor")) {
    fail("Daily worker must produce coverage assertion");
  }
  if (worker && !worker.includes("applyDailyDraftQueueCaps")) {
    fail("Daily worker must apply queue quality caps before draft insert");
  }
  if (worker && worker.includes("auto-fix")) {
    fail("Daily worker must not reference auto-fix execution");
  }
}

function verifyMigration(): void {
  const migration = mustExist("supabase/migrations/20260707140000_agentops_daily_agent_review_executions.sql");
  if (!migration) return;
  if (!migration.includes(DAILY_AGENT_EXECUTIONS_TABLE)) {
    fail(`Migration must create ${DAILY_AGENT_EXECUTIONS_TABLE}`);
  }
  if (!migration.includes("execution_date, agent_id, review_mode")) {
    fail("Migration must enforce unique daily identity per agent");
  }
}

function verifyPackageScript(): void {
  const pkg = JSON.parse(readFileSync(join(REPO_ROOT, "package.json"), "utf8")) as {
    scripts?: Record<string, string>;
  };
  if (!pkg.scripts?.["agentops:monitoring:daily-12-agent:gha"]) {
    fail("package.json must define agentops:monitoring:daily-12-agent:gha");
  }
  if (!pkg.scripts?.["agentops:monitoring-daily-12-agents-verify"]) {
    fail("package.json must define agentops:monitoring-daily-12-agents-verify");
  }
}

function verifyUiSurfaces(): void {
  mustExist("src/app/system/agent-ops/agents/AgentDaily12ReviewCard.tsx");
  const agentsPage = mustExist("src/app/system/agent-ops/agents/page.tsx");
  if (agentsPage && !agentsPage.includes("AgentDaily12ReviewCard")) {
    fail("Agents hub must render AgentDaily12ReviewCard");
  }
}

function verifyRunSelection(): void {
  mustExist("api/agentops/_lib/daily12RunSelection.ts");
  mustExist("scripts/agentops-daily-12-run-selection-verify.ts");
  const routes = mustExist("api/agentops/_lib/monitoringRoutes.ts");
  if (routes && !routes.includes("selectLatestCompletedDaily12Run")) {
    fail("Monitoring status must use selectLatestCompletedDaily12Run");
  }
  if (routes && !routes.includes("buildExecutionMapForSelectedRun")) {
    fail("Monitoring status must build roster from selected run aggregate");
  }
  const card = mustExist("src/app/system/agent-ops/agents/AgentDaily12ReviewCard.tsx");
  if (card && !card.includes("titleHeadingLevel")) {
    fail("Daily 12 card must expose semantic heading via titleHeadingLevel");
  }
}

function verifyRetryUpsert(): void {
  mustExist("scripts/agentops-daily-12-retry-upsert-verify.ts");
  const executions = mustExist("src/lib/agentops/runtime/agentOpsDailyAgentExecutions.ts");
  if (executions && !executions.includes("persistDailyExecutionBatch")) {
    fail("Daily executions must expose persistDailyExecutionBatch for retry upsert");
  }
  if (executions && !executions.includes("resolveDailyExecutionUpsertAction")) {
    fail("Daily executions must expose resolveDailyExecutionUpsertAction retry authority rule");
  }
  const worker = mustExist("src/lib/agentops/runtime/agentOpsDaily12AgentReview.ts");
  if (worker && !worker.includes("buildCanonicalRunQueueMeta")) {
    fail("Daily worker must build canonical runQueueMeta before DB persistence");
  }
  if (worker && !worker.includes("upsertMonitoringRunIndexRecord")) {
    fail("Daily worker must persist run index via upsertMonitoringRunIndexRecord");
  }
  if (worker && worker.includes("insertDailyAgentExecution(bootstrap.client")) {
    fail("Daily worker must not insert per-agent rows before queue finalization");
  }
}

function verifyRegistryLock(): void {
  const lock = mustExist("registry/AGENTOPS_MONITORING_OWNER_PROMOTION_LOCK.md");
  if (!lock) return;
  for (const phrase of [
    "Phase 5H",
    "Daily 12-Agent Review",
    "0 1 * * *",
    "canonical agent count = 12",
    "no forced or fabricated findings",
  ]) {
    if (!lock.includes(phrase)) fail(`Registry lock missing: ${phrase}`);
  }
}

function main(): void {
  verifyCanonicalRegistry();
  verifyDailyWorkflow();
  verifyScheduledWorkflowUnchanged();
  verifyWorkerAndPolicy();
  verifyMigration();
  verifyPackageScript();
  verifyUiSurfaces();
  verifyRunSelection();
  verifyRetryUpsert();
  verifyRegistryLock();

  if (failures.length > 0) {
    console.error("[agentops-daily-12-verify] FAILED:");
    for (const failure of failures) console.error(`  - ${failure}`);
    process.exit(1);
  }

  console.log("[agentops-daily-12-verify] PASS — 12-agent daily review wiring verified.");
}

main();
