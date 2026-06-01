import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";
import { assertDevServerForQa } from "../../scripts/dev-server-utils.mjs";
import { loadAgentOpsOwnerEnv, ownerEnvStatus } from "./load-agentops-owner-env.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const STAGING_PROJECT_REF = "ydppcpbxrvvardeslzrk";
const FIXTURE_ISSUE_CODE = process.env.AGENTOPS_QA_LESSON_FIXTURE_ISSUE?.trim() || "AIXIA-SAMPLE-001";
const reportPath = path.join(
  repoRoot,
  "qa-agent",
  "reports",
  "browser-qa",
  "lesson-candidate-phase-7d-smoke-report.json",
);
const fixtureReportPath = path.join(
  repoRoot,
  "qa-agent",
  "reports",
  "browser-qa",
  "lesson-candidate-phase-7e-fixture-setup.json",
);

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

function parseLessonDraftMeta(metadata) {
  if (!metadata || typeof metadata !== "object") return null;
  if (metadata.action !== "lesson_candidate_draft") return null;
  const draft =
    metadata.lessonCandidateDraft && typeof metadata.lessonCandidateDraft === "object"
      ? metadata.lessonCandidateDraft
      : metadata;
  const lessonId =
    typeof draft.lessonId === "string" && draft.lessonId.trim() ? draft.lessonId.trim() : null;
  const approvalStatus =
    typeof draft.approvalStatus === "string" && draft.approvalStatus.trim()
      ? draft.approvalStatus.trim()
      : "pending_review";
  if (!lessonId) return null;
  return { lessonId, approvalStatus };
}

async function prepareLessonCandidateFixture() {
  loadViteEnv();
  const url = process.env.VITE_SUPABASE_URL?.trim() || "";
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY?.trim() || "";
  const ownerEmail = process.env.AGENTOPS_QA_OWNER_EMAIL?.trim() || "";
  const ownerPassword = process.env.AGENTOPS_QA_OWNER_PASSWORD || "";

  const fixtureSummary = {
    fixtureIssueCode: FIXTURE_ISSUE_CODE,
    prepared: false,
    blocked: false,
    reason: null,
    findingId: null,
    draftResetCount: 0,
    browserSessionStorageKey: null,
    browserSessionJson: null,
    labels: {
      qaFixture: true,
      fixturePurpose: "lesson_candidate_smoke",
      stagingOnly: true,
      safeToDelete: true,
      noProduction: true,
      noDurableMemory: true,
    },
  };

  if (!url || !anonKey) {
    fixtureSummary.blocked = true;
    fixtureSummary.reason = "Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY.";
    return fixtureSummary;
  }

  if (!url.includes(STAGING_PROJECT_REF)) {
    fixtureSummary.blocked = true;
    fixtureSummary.reason = `Refusing fixture setup: Supabase URL is not staging (${STAGING_PROJECT_REF}).`;
    return fixtureSummary;
  }

  if (!ownerEmail || !ownerPassword) {
    fixtureSummary.blocked = true;
    fixtureSummary.reason =
      "Missing AGENTOPS_QA_OWNER_EMAIL or AGENTOPS_QA_OWNER_PASSWORD.";
    return fixtureSummary;
  }

  const supabase = createClient(url, anonKey);
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: ownerEmail,
    password: ownerPassword,
  });
  if (signInError) {
    fixtureSummary.blocked = true;
    fixtureSummary.reason = `Owner sign-in failed: ${signInError.message}`;
    return fixtureSummary;
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user?.id) {
    fixtureSummary.blocked = true;
    fixtureSummary.reason = "Could not resolve signed-in owner user.";
    return fixtureSummary;
  }

  const { error: profileUpdateError } = await supabase
    .from("profiles")
    .update({
      status: "active",
      profile_completed: true,
    })
    .eq("user_id", user.id);
  if (profileUpdateError) {
    fixtureSummary.blocked = true;
    fixtureSummary.reason = `Owner profile activation failed: ${profileUpdateError.message}`;
    return fixtureSummary;
  }
  if (signInData?.session) {
    fixtureSummary.browserSessionStorageKey = "taskflow-auth";
    fixtureSummary.browserSessionJson = JSON.stringify(signInData.session);
  }

  const { data: finding, error: findingError } = await supabase
    .from("agentops_findings")
    .select("id, issue_code, status, queue_state, metadata")
    .eq("issue_code", FIXTURE_ISSUE_CODE)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (findingError) {
    fixtureSummary.blocked = true;
    fixtureSummary.reason = `Finding lookup failed: ${findingError.message}`;
    return fixtureSummary;
  }
  if (!finding?.id) {
    fixtureSummary.blocked = true;
    fixtureSummary.reason = `Fixture issue ${FIXTURE_ISSUE_CODE} was not found in agentops_findings.`;
    return fixtureSummary;
  }
  fixtureSummary.findingId = finding.id;

  const existingMetadata =
    finding.metadata && typeof finding.metadata === "object" ? finding.metadata : {};
  const nowIso = new Date().toISOString();
  const nextMetadata = {
    ...existingMetadata,
    qaFixture: true,
    fixturePurpose: "lesson_candidate_smoke",
    stagingOnly: true,
    safeToDelete: true,
    noProduction: true,
    noDurableMemory: true,
    executionState: "closed_verified",
    latestVerificationResult: "verified_fixed",
    verificationRequestStatus: "verification_passed",
    latestLifecycleStep: "closed_verified",
    latestFixturePreparedAt: nowIso,
  };

  const { error: updateError } = await supabase
    .from("agentops_findings")
    .update({
      status: "Verified Fixed",
      queue_state: "backlog",
      top10_rank: null,
      metadata: nextMetadata,
    })
    .eq("id", finding.id);
  if (updateError) {
    fixtureSummary.blocked = true;
    fixtureSummary.reason = `Fixture finding update failed: ${updateError.message}`;
    return fixtureSummary;
  }

  const { error: fixtureFeedbackError } = await supabase.from("agentops_owner_feedback").insert({
    finding_id: finding.id,
    owner_user_id: user.id,
    feedback_type: "remark",
    remark: "Prepared deterministic lesson-candidate smoke fixture (metadata-only).",
    metadata: {
      action: "lesson_candidate_fixture_setup",
      issueCode: FIXTURE_ISSUE_CODE,
      qaFixture: true,
      fixturePurpose: "lesson_candidate_smoke",
      stagingOnly: true,
      safeToDelete: true,
      noProduction: true,
      noDurableMemory: true,
      noAgentmemoryIndexing: true,
      noHermesRuntime: true,
      noLocalLlmRuntime: true,
      preparedAt: nowIso,
    },
  });
  if (fixtureFeedbackError) {
    fixtureSummary.blocked = true;
    fixtureSummary.reason = `Fixture feedback insert failed: ${fixtureFeedbackError.message}`;
    return fixtureSummary;
  }

  // Ensure Prepare Lesson Candidate is re-testable by neutralizing open drafts.
  const { data: issueFeedbackRows, error: feedbackReadError } = await supabase
    .from("agentops_owner_feedback")
    .select("id, metadata")
    .contains("metadata", { action: "lesson_candidate_draft", issueCode: FIXTURE_ISSUE_CODE })
    .order("created_at", { ascending: false })
    .limit(100);
  if (feedbackReadError) {
    fixtureSummary.blocked = true;
    fixtureSummary.reason = `Draft lookup failed: ${feedbackReadError.message}`;
    return fixtureSummary;
  }

  for (const row of issueFeedbackRows ?? []) {
    const parsed = parseLessonDraftMeta(row.metadata);
    if (!parsed) continue;
    if (parsed.approvalStatus === "rejected" || parsed.approvalStatus === "approved") continue;
    const { error: decisionError } = await supabase.from("agentops_owner_feedback").insert({
      finding_id: finding.id,
      owner_user_id: user.id,
      feedback_type: "remark",
      remark: "Fixture reset: mark old draft rejected to allow deterministic re-prepare.",
      metadata: {
        action: "lesson_candidate_decision",
        issueCode: FIXTURE_ISSUE_CODE,
        lessonId: parsed.lessonId,
        decision: "reject_lesson",
        approvalStatus: "rejected",
        qaFixture: true,
        fixturePurpose: "lesson_candidate_smoke",
        stagingOnly: true,
        safeToDelete: true,
        noProduction: true,
        noDurableMemory: true,
        noAgentmemoryIndexing: true,
        noHermesRuntime: true,
        noLocalLlmRuntime: true,
      },
    });
    if (!decisionError) {
      fixtureSummary.draftResetCount += 1;
    }
  }

  fixtureSummary.prepared = true;
  return fixtureSummary;
}

loadAgentOpsOwnerEnv();
await assertDevServerForQa();
const status = ownerEnvStatus();

if (!status.emailPresent || !status.passwordPresent) {
  console.warn(
    "Owner credentials not configured; smoke will report skipped. Set AGENTOPS_QA_OWNER_EMAIL and AGENTOPS_QA_OWNER_PASSWORD.",
  );
}

const fixtureSetup = await prepareLessonCandidateFixture();
fs.mkdirSync(path.dirname(fixtureReportPath), { recursive: true });
fs.writeFileSync(fixtureReportPath, `${JSON.stringify(fixtureSetup, null, 2)}\n`, "utf8");

if (fixtureSetup.blocked || !fixtureSetup.prepared) {
  console.warn(`BLOCKED_NO_VERIFIED_FIXED_ISSUE: ${fixtureSetup.reason ?? "fixture setup failed"}`);
  process.exit(0);
}

process.env.AGENTOPS_QA_LESSON_FIXTURE_ISSUE = FIXTURE_ISSUE_CODE;
if (fixtureSetup.browserSessionStorageKey && fixtureSetup.browserSessionJson) {
  process.env.AGENTOPS_QA_SUPABASE_SESSION_STORAGE_KEY = fixtureSetup.browserSessionStorageKey;
  process.env.AGENTOPS_QA_SUPABASE_SESSION_JSON = fixtureSetup.browserSessionJson;
}

const result = spawnSync(
  "npx",
  [
    "playwright",
    "test",
    "-c",
    "qa-agent/browser-qa/playwright.config.mjs",
    "qa-agent/browser-qa/tests/agentops-lesson-candidate-phase-7d-smoke.spec.mjs",
  ],
  {
    cwd: repoRoot,
    stdio: "inherit",
    env: process.env,
    shell: true,
  },
);

try {
  if (fs.existsSync(reportPath)) {
    const parsed = JSON.parse(fs.readFileSync(reportPath, "utf8"));
    const smokeStatus = String(parsed?.status ?? "").toUpperCase();
    if (smokeStatus === "BLOCKED_NO_VERIFIED_FIXED_ISSUE" || smokeStatus === "BLOCKED_OWNER_LOGIN") {
      console.warn(smokeStatus);
      process.exit(0);
    }
    if (smokeStatus) {
      console.log(smokeStatus);
    }
  }
} catch (error) {
  console.warn(`Could not parse lesson-candidate smoke report: ${error instanceof Error ? error.message : String(error)}`);
}

if ((result.status ?? 1) !== 0) {
  process.exit(result.status ?? 1);
}
process.exit(0);

