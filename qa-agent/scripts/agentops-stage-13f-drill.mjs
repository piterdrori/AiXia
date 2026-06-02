/**
 * Stage 13F — end-to-end manual verification-request drill (staging only).
 * Records Owner feedback + finding metadata only. No app code changes.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";
import { createClient } from "@supabase/supabase-js";
import { loadAgentOpsOwnerEnv, ownerEnvStatus } from "./load-agentops-owner-env.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const STAGING_PROJECT_REF = "ydppcpbxrvvardeslzrk";
const DRILL_ISSUE_CODE = "AIXIA-BROWSER-LOGIN-finance-admin";
const DRILL_PLAN_ID = "plan-AIXIA-BROWSER-LOGIN-finance-admin-stage-13f-drill";
const DRILL_REPORT_PATH =
  "qa-agent/agentops/AGENTOPS_STAGE_13F_MANUAL_VERIFICATION_DRILL_REPORT.md";

const CURSOR_FIX_REPORT_TEXT = `This is a Stage 13F workflow drill. No app code was changed.

Summary:
- Validated AgentOps handoff → verification request → manual result recording.
- Drill-only metadata and owner feedback on staging.
- No production changes.`;

const VERIFICATION_TARGET = "generic-build-and-smoke";
const REPORT_ONLY_CMD = `npm run qa:agentops-verify -- --target ${VERIFICATION_TARGET}`;
const APPLY_CMD = `${REPORT_ONLY_CMD} --apply --owner-approved`;

function loadViteEnv() {
  const envPath = path.join(repoRoot, ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

async function createOwnerClient() {
  loadViteEnv();
  loadAgentOpsOwnerEnv();
  const url = process.env.VITE_SUPABASE_URL ?? "";
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY ?? "";
  const email = process.env.AGENTOPS_QA_OWNER_EMAIL?.trim() ?? "";
  const password = process.env.AGENTOPS_QA_OWNER_PASSWORD ?? "";

  if (!url.includes(STAGING_PROJECT_REF)) {
    throw new Error(`Refusing drill: URL must be staging (${STAGING_PROJECT_REF}).`);
  }
  const ownerStatus = ownerEnvStatus();
  if (!ownerStatus.emailPresent || !ownerStatus.passwordPresent) {
    throw new Error("Set AGENTOPS_QA_OWNER_EMAIL and AGENTOPS_QA_OWNER_PASSWORD.");
  }
  if (!url || !anonKey) {
    throw new Error("VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY required.");
  }

  const supabase = createClient(url, anonKey);
  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
  if (signInError) throw new Error(`Owner sign-in failed: ${signInError.message}`);
  return supabase;
}

async function getOwnerUserId(supabase) {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user?.id) throw new Error("Could not resolve owner user.");
  return user.id;
}

async function insertFeedback(supabase, ownerUserId, findingId, remark, metadata) {
  const { data, error } = await supabase
    .from("agentops_owner_feedback")
    .insert({
      finding_id: findingId,
      owner_user_id: ownerUserId,
      feedback_type: "remark",
      remark,
      metadata: { stage: "13F", drill: true, ...metadata },
    })
    .select("id")
    .single();
  if (error) throw new Error(`Feedback insert failed: ${error.message}`);
  return data.id;
}

async function main() {
  const supabase = await createOwnerClient();
  const ownerUserId = await getOwnerUserId(supabase);
  const handoffId = `handoff-${DRILL_ISSUE_CODE}-stage-13f-${Date.now()}`;
  const steps = [];
  const feedbackIds = [];

  const { data: finding, error: findingError } = await supabase
    .from("agentops_findings")
    .select("id, issue_code, status, queue_state, metadata")
    .eq("issue_code", DRILL_ISSUE_CODE)
    .maybeSingle();

  if (findingError) throw new Error(findingError.message);
  if (!finding) {
    throw new Error(
      `${DRILL_ISSUE_CODE} not found in staging AgentOps. Import or generate fix plans first.`,
    );
  }

  const existingMetaCheck =
    finding.metadata && typeof finding.metadata === "object" ? finding.metadata : {};
  if (existingMetaCheck.stage13fDrill === true && process.env.AGENTOPS_13F_FORCE !== "1") {
    console.log(`SKIP: ${DRILL_ISSUE_CODE} already has stage13fDrill metadata. Set AGENTOPS_13F_FORCE=1 to re-run.`);
    process.exit(0);
  }

  const statusBefore = finding.status;
  const queueBefore = finding.queue_state;
  const existingMeta =
    finding.metadata && typeof finding.metadata === "object"
      ? { ...finding.metadata }
      : {};

  const planPath = path.join(
    repoRoot,
    "qa-agent/reports/fix-plans/issues",
    `${DRILL_ISSUE_CODE}_FIX_PLAN.json`,
  );
  let cursorPrompt = "Stage 13F drill prompt placeholder.";
  if (fs.existsSync(planPath)) {
    const plan = JSON.parse(fs.readFileSync(planPath, "utf8"));
    if (typeof plan.cursorPrompt === "string") cursorPrompt = plan.cursorPrompt;
  }

  feedbackIds.push(
    await insertFeedback(supabase, ownerUserId, finding.id, "Stage 13F: approve fix plan (drill)", {
      action: "fix_plan_decision",
      issueCode: DRILL_ISSUE_CODE,
      planId: DRILL_PLAN_ID,
      decision: "approve_fix_plan",
      decisionStatus: "approved",
      ownerApproved: true,
    }),
  );
  steps.push("fix plan approved");

  feedbackIds.push(
    await insertFeedback(supabase, ownerUserId, finding.id, "Stage 13F: prepare Cursor handoff", {
      action: "cursor_handoff",
      issueCode: DRILL_ISSUE_CODE,
      planId: DRILL_PLAN_ID,
      handoffId,
      handoffStatus: "ready_for_cursor",
      cursorPrompt,
      ownerApproved: true,
    }),
  );
  steps.push("handoff prepared");

  feedbackIds.push(
    await insertFeedback(supabase, ownerUserId, finding.id, "Stage 13F: prompt copied", {
      action: "cursor_handoff",
      issueCode: DRILL_ISSUE_CODE,
      handoffId,
      handoffStatus: "copied_manually",
    }),
  );
  steps.push("prompt copied");

  feedbackIds.push(
    await insertFeedback(supabase, ownerUserId, finding.id, "Stage 13F: Cursor working", {
      action: "cursor_handoff",
      issueCode: DRILL_ISSUE_CODE,
      handoffId,
      handoffStatus: "cursor_working",
    }),
  );
  steps.push("Cursor working");

  feedbackIds.push(
    await insertFeedback(supabase, ownerUserId, finding.id, "Stage 13F: Cursor fix report", {
      action: "cursor_fix_report",
      issueCode: DRILL_ISSUE_CODE,
      handoffId,
      reportText: CURSOR_FIX_REPORT_TEXT,
      filesChanged: [],
      validationSummary: "Stage 13F drill — no code changes.",
      readyForVerification: true,
    }),
  );
  steps.push("fix report received");
  steps.push("verification requested");

  feedbackIds.push(
    await insertFeedback(supabase, ownerUserId, finding.id, "Stage 13F: approve verification run", {
      action: "verification_request_approved",
      issueCode: DRILL_ISSUE_CODE,
      handoffId,
      verificationTarget: VERIFICATION_TARGET,
      approvedVerificationCommand: REPORT_ONLY_CMD,
      reportOnlyCommand: REPORT_ONLY_CMD,
      applyCommand: APPLY_CMD,
    }),
  );
  steps.push("verification approved");

  feedbackIds.push(
    await insertFeedback(supabase, ownerUserId, finding.id, "Stage 13F: command copied", {
      action: "verification_command_copied",
      issueCode: DRILL_ISSUE_CODE,
      handoffId,
      commandType: "report-only",
      command: REPORT_ONLY_CMD,
    }),
  );
  steps.push("command copied");

  feedbackIds.push(
    await insertFeedback(supabase, ownerUserId, finding.id, "Stage 13F: verification running", {
      action: "verification_running_manual",
      issueCode: DRILL_ISSUE_CODE,
      handoffId,
    }),
  );
  steps.push("verification running");

  let verificationCommandRun = false;
  let verificationResult = "verification_blocked";
  let verificationReportPath =
    "qa-agent/reports/verification/verification-foundation-run.md";
  let verificationCommandExit = null;
  const runVerifyCli = process.env.AGENTOPS_13F_RUN_VERIFY === "1";

  if (runVerifyCli) {
    const verifyRun = spawnSync(
      "npm",
      ["run", "qa:agentops-verify", "--", "--target", VERIFICATION_TARGET],
      {
        cwd: repoRoot,
        shell: true,
        encoding: "utf8",
        env: process.env,
        timeout: 600_000,
      },
    );
    verificationCommandExit = verifyRun.status ?? (verifyRun.error ? 1 : 0);
    if (verifyRun.status === 0) {
      verificationCommandRun = true;
      verificationResult = "verified_fixed";
      verificationReportPath = "qa-agent/reports/verification/verification-foundation-run.json";
    }
  }

  const resultSummary = verificationCommandRun
    ? `Stage 13F drill: verification command passed (exit ${verificationCommandExit ?? 0}).`
    : runVerifyCli
      ? `Stage 13F drill: verification command failed (exit ${verificationCommandExit}).`
      : "Stage 13F drill: manual drill only — no verification command executed (set AGENTOPS_13F_RUN_VERIFY=1 to run CLI).";

  feedbackIds.push(
    await insertFeedback(supabase, ownerUserId, finding.id, "Stage 13F: manual verification result", {
      action: "manual_verification_result",
      issueCode: DRILL_ISSUE_CODE,
      handoffId,
      verificationResult,
      verificationReportPath,
      summary: resultSummary,
    }),
  );
  steps.push("result recorded");

  const metadataPatch = {
    ...existingMeta,
    latestFixPlanDecision: "approve_fix_plan",
    latestFixPlanDecisionStatus: "approved",
    latestFixPlanPlanId: DRILL_PLAN_ID,
    latestCursorHandoffStatus: "verification_requested",
    latestCursorHandoffId: handoffId,
    verificationRequested: true,
    verificationRequestStatus: verificationCommandRun ? "verification_passed" : "verification_blocked",
    approvedVerificationTarget: VERIFICATION_TARGET,
    approvedVerificationCommand: REPORT_ONLY_CMD,
    latestVerificationResult: verificationResult,
    latestVerificationReportPath: verificationReportPath,
    stage13fDrill: true,
    stage13fDrillAt: new Date().toISOString(),
  };

  const { error: metaError } = await supabase
    .from("agentops_findings")
    .update({ metadata: metadataPatch })
    .eq("id", finding.id);
  if (metaError) throw new Error(metaError.message);

  const { data: findingAfter } = await supabase
    .from("agentops_findings")
    .select("status, queue_state")
    .eq("id", finding.id)
    .single();

  const statusChanged =
    findingAfter?.status !== statusBefore || findingAfter?.queue_state !== queueBefore;

  const reportMd = `# AgentOps Stage 13F Manual Verification Drill Report

## Purpose
Prove the manual workflow from Cursor fix report to verification result.

## Drill Issue
- **Issue code:** ${DRILL_ISSUE_CODE}
- **Plan id:** ${DRILL_PLAN_ID}
- **Handoff id:** ${handoffId}
- **Finding status before:** ${statusBefore} / ${queueBefore}
- **Finding status after:** ${findingAfter?.status ?? "—"} / ${findingAfter?.queue_state ?? "—"}

## Workflow Steps Completed
${steps.map((s) => `- ${s}`).join("\n")}

## Verification Command
- **Run:** ${verificationCommandRun ? "Yes" : "No"}
- **Command:** \`${REPORT_ONLY_CMD}\`
- **Exit code:** ${verificationCommandExit ?? "n/a"}
- **Result recorded:** \`${verificationResult}\`
- **Report path:** \`${verificationReportPath}\`

## DB/Feedback Records
- **Feedback rows created:** ${feedbackIds.length}
- **Feedback ids:** ${feedbackIds.join(", ")}
- **Finding metadata updated:** yes (drill fields only; status unchanged unless verification closed issue)

## Issue Status Impact
- **Status changed:** ${statusChanged ? "Yes" : "No"}
- Drill intentionally avoids closing unrelated backlog issues unless verification proves fixed.

## What Was Not Done
- no code fix
- no automatic Cursor execution
- no shell execution from UI
- no scheduler
- no production/main
- no schema/RLS/API changes
- no unrelated issue changes

## Final Status
${verificationCommandRun ? "PASS" : "PASS WITH FOLLOW-UP"} — workflow records complete; verification command ${verificationCommandRun ? "passed" : "not run or failed"}.

## Next Recommended Stage
Stage 14 — low-backlog scan/refill trigger.
Alternative: Stage 13G — improve UI for approval/handoff drill results if needed.
`;

  fs.writeFileSync(path.join(repoRoot, DRILL_REPORT_PATH), reportMd);

  console.log(`DRILL_ISSUE:${DRILL_ISSUE_CODE}`);
  console.log(`FEEDBACK_COUNT:${feedbackIds.length}`);
  console.log(`VERIFICATION_COMMAND_RUN:${verificationCommandRun}`);
  console.log(`VERIFICATION_RESULT:${verificationResult}`);
  console.log(`STATUS_CHANGED:${statusChanged}`);
  console.log(`REPORT:${DRILL_REPORT_PATH}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
