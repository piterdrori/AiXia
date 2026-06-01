/**
 * Stage 12B — Owner-authenticated apply for verification runner (staging only).
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";
import { loadAgentOpsOwnerEnv, ownerEnvStatus } from "./load-agentops-owner-env.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const STAGING_PROJECT_REF = "ydppcpbxrvvardeslzrk";

const BACKLOG_RESOLVABLE_STATUSES = ["Backlog", "New", "Owner Reviewed", "Approved for Fix"];

const FINDING_STATUS_BY_RESULT = {
  verified_fixed: "Verified Fixed",
  still_broken: "Still Broken",
  needs_follow_up_fix: "Needs Follow-Up Fix",
  verification_blocked: "Verification Blocked",
};

const QUEUE_STATE_BY_RESULT = {
  verified_fixed: "archived",
  still_broken: "active_top_10",
  needs_follow_up_fix: "active_top_10",
  verification_blocked: "active_top_10",
};

export function loadViteEnv() {
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

export function assertStagingApplyGuard() {
  loadViteEnv();
  loadAgentOpsOwnerEnv();

  const url = process.env.VITE_SUPABASE_URL ?? "";
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY ?? "";

  if (!url.includes(STAGING_PROJECT_REF)) {
    throw new Error(
      `Refusing apply: VITE_SUPABASE_URL must point at staging (${STAGING_PROJECT_REF}).`,
    );
  }

  const ownerStatus = ownerEnvStatus();
  if (!ownerStatus.emailPresent || !ownerStatus.passwordPresent) {
    throw new Error(
      "Apply mode requires AGENTOPS_QA_OWNER_EMAIL and AGENTOPS_QA_OWNER_PASSWORD.",
    );
  }

  if (!url || !anonKey) {
    throw new Error("VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY required in .env.local");
  }

  return { url, anonKey, email: process.env.AGENTOPS_QA_OWNER_EMAIL.trim(), password: process.env.AGENTOPS_QA_OWNER_PASSWORD };
}

export async function createOwnerSupabaseClient() {
  const { url, anonKey, email, password } = assertStagingApplyGuard();
  const supabase = createClient(url, anonKey);
  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
  if (signInError) {
    throw new Error(`Owner sign-in failed: ${signInError.message}`);
  }
  return supabase;
}

function buildEvidenceMetadata({ run, target, targetResult, reportJsonPath, reportMdPath }) {
  return {
    action: "verification_runner_apply",
    stage: "12B",
    ownerApproved: true,
    appliedBy: "agentops-verification-runner",
    verificationTarget: target.targetId,
    verificationResult: targetResult.verificationStatus,
    verificationRunId: run.runId,
    reportJsonPath,
    reportMdPath,
    commandResults: (targetResult.commands ?? []).map((c) => ({
      npmScript: c.npmScript,
      exitCode: c.exitCode,
      skipped: c.skipped,
    })),
    checks: targetResult.checks ?? [],
    appliedAt: new Date().toISOString(),
  };
}

async function insertOwnerFeedback(supabase, finding, remark, metadata) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user?.id) {
    return { ok: false, message: "Not authenticated as owner" };
  }

  const { data, error } = await supabase
    .from("agentops_owner_feedback")
    .insert({
      finding_id: finding.id,
      owner_user_id: user.id,
      feedback_type: "remark",
      remark,
      metadata,
    })
    .select("id")
    .single();

  if (error) return { ok: false, message: error.message };
  return { ok: true, feedbackId: data.id };
}

async function getPendingVerification(supabase, findingId) {
  const { data, error } = await supabase
    .from("agentops_verifications")
    .select("id, verification_status, metadata")
    .eq("finding_id", findingId)
    .in("verification_status", ["pending", "running"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return { error: error.message, row: null };
  return { error: null, row: data };
}

async function updatePendingVerification(supabase, verificationId, verificationStatus, metadata, actualResult) {
  const { data: existing, error: loadError } = await supabase
    .from("agentops_verifications")
    .select("metadata")
    .eq("id", verificationId)
    .single();

  if (loadError) return { ok: false, message: loadError.message };

  const mergedMeta = {
    ...(existing?.metadata && typeof existing.metadata === "object" ? existing.metadata : {}),
    ...metadata,
  };

  const { error } = await supabase
    .from("agentops_verifications")
    .update({
      verification_status: verificationStatus,
      actual_result: actualResult,
      verified_at: new Date().toISOString(),
      metadata: mergedMeta,
    })
    .eq("id", verificationId);

  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

async function updateFindingStatus(supabase, findingId, status, queueState, clearRank) {
  const patch = {
    status,
    queue_state: queueState,
    ...(clearRank ? { top10_rank: null } : {}),
  };

  const { data, error } = await supabase
    .from("agentops_findings")
    .update(patch)
    .eq("id", findingId)
    .select("issue_code, status, queue_state")
    .single();

  if (error) return { ok: false, message: error.message };
  return { ok: true, finding: data };
}

async function resolveBacklogVerifiedFixed(supabase, finding, remark, metadata) {
  if (finding.queue_state !== "backlog") {
    return { ok: false, message: "not in backlog queue" };
  }
  if (!BACKLOG_RESOLVABLE_STATUSES.includes(finding.status)) {
    return { ok: false, message: `status ${finding.status} not resolvable from backlog` };
  }

  const feedback = await insertOwnerFeedback(supabase, finding, remark, {
    ...metadata,
    action: "backlog_verified_fixed",
    resolution_status: "Verified Fixed",
  });
  if (!feedback.ok) return feedback;

  const updated = await updateFindingStatus(
    supabase,
    finding.id,
    "Verified Fixed",
    "archived",
    true,
  );
  if (!updated.ok) return updated;

  return {
    ok: true,
    action: "backlog_verified_fixed",
    feedbackId: feedback.feedbackId,
    finding: updated.finding,
  };
}

function isAlreadyResolved(finding) {
  return finding.status === "Verified Fixed" && finding.queue_state === "archived";
}

/**
 * Apply verification result to one finding (staging Owner RLS).
 */
export async function applyVerificationToFinding(
  supabase,
  finding,
  verificationStatus,
  { run, target, targetResult, reportJsonPath, reportMdPath },
) {
  const evidence = buildEvidenceMetadata({
    run,
    target,
    targetResult,
    reportJsonPath,
    reportMdPath,
  });

  const remark = `Stage 12B verification runner (${target.targetId}): ${verificationStatus}. ${targetResult.summary}`;

  if (isAlreadyResolved(finding)) {
    const feedback = await insertOwnerFeedback(supabase, finding, remark, {
      ...evidence,
      action: "verification_runner_already_resolved",
      skippedStatusChange: true,
    });
    return {
      issueCode: finding.issue_code,
      outcome: "skipped_already_resolved",
      verificationStatus,
      message: "Already Verified Fixed / archived — feedback recorded only",
      feedbackId: feedback.ok ? feedback.feedbackId : null,
      error: feedback.ok ? null : feedback.message,
      dbUpdated: feedback.ok,
    };
  }

  if (verificationStatus === "verified_fixed" && finding.queue_state === "backlog") {
    const resolved = await resolveBacklogVerifiedFixed(supabase, finding, remark, evidence);
    if (resolved.ok) {
      return {
        issueCode: finding.issue_code,
        outcome: "updated_backlog_verified_fixed",
        verificationStatus,
        message: resolved.action,
        feedbackId: resolved.feedbackId,
        findingAfter: resolved.finding,
        dbUpdated: true,
      };
    }
  }

  if (finding.queue_state === "active_top_10") {
    const pending = await getPendingVerification(supabase, finding.id);
    if (pending.error) {
      return {
        issueCode: finding.issue_code,
        outcome: "apply_failed",
        verificationStatus,
        message: pending.error,
        dbUpdated: false,
      };
    }

    if (pending.row?.id) {
      const actualResult = targetResult.summary;
      const verUpdate = await updatePendingVerification(
        supabase,
        pending.row.id,
        verificationStatus,
        evidence,
        actualResult,
      );
      if (!verUpdate.ok) {
        return {
          issueCode: finding.issue_code,
          outcome: "apply_failed",
          verificationStatus,
          message: verUpdate.message,
          dbUpdated: false,
        };
      }

      const findingStatus = FINDING_STATUS_BY_RESULT[verificationStatus];
      const queueState = QUEUE_STATE_BY_RESULT[verificationStatus];
      const findingUpdate = await updateFindingStatus(
        supabase,
        finding.id,
        findingStatus,
        queueState,
        verificationStatus === "verified_fixed",
      );

      const feedback = await insertOwnerFeedback(supabase, finding, remark, {
        ...evidence,
        action: "verification_runner_active_top10",
        verificationId: pending.row.id,
      });

      return {
        issueCode: finding.issue_code,
        outcome: "updated_active_top10_verification",
        verificationStatus,
        message: `Active Top 10 verification ${verificationStatus}`,
        verificationId: pending.row.id,
        findingAfter: findingUpdate.ok ? findingUpdate.finding : null,
        feedbackId: feedback.ok ? feedback.feedbackId : null,
        dbUpdated: findingUpdate.ok,
        error: findingUpdate.ok ? null : findingUpdate.message,
      };
    }
  }

  const feedback = await insertOwnerFeedback(supabase, finding, remark, {
    ...evidence,
    action: "verification_runner_evidence_only",
    skippedStatusChange: true,
    reason:
      finding.queue_state === "active_top_10"
        ? "no pending verification row — status unchanged"
        : "finding not in backlog/active apply path — status unchanged",
  });

  return {
    issueCode: finding.issue_code,
    outcome:
      verificationStatus === "verified_fixed"
        ? "evidence_only_no_pending_verification"
        : "evidence_recorded",
    verificationStatus,
    message: feedback.ok ? "Owner feedback recorded; finding status unchanged" : feedback.message,
    feedbackId: feedback.ok ? feedback.feedbackId : null,
    dbUpdated: feedback.ok,
    error: feedback.ok ? null : feedback.message,
  };
}

export async function applyVerificationResults({
  run,
  targetsExecuted,
  reportJsonPath,
  reportMdPath,
  issueFilter,
}) {
  const supabase = await createOwnerSupabaseClient();
  const applyResults = [];
  let anyDbUpdated = false;

  for (const targetResult of targetsExecuted) {
    const target = { targetId: targetResult.targetId };
    let issueCodes = targetResult.issueCodes ?? [];

    if (issueFilter) {
      if (!issueCodes.includes(issueFilter)) {
        applyResults.push({
          targetId: targetResult.targetId,
          issueCode: issueFilter,
          outcome: "skipped",
          message: `Issue ${issueFilter} not in target ${targetResult.targetId}`,
          dbUpdated: false,
        });
        continue;
      }
      issueCodes = [issueFilter];
    }

    if (!issueCodes.length) {
      applyResults.push({
        targetId: targetResult.targetId,
        outcome: "skipped",
        message: "Target has no mapped issue codes — apply skipped",
        dbUpdated: false,
      });
      continue;
    }

    const { data: findings, error } = await supabase
      .from("agentops_findings")
      .select("id, issue_code, status, queue_state, title")
      .in("issue_code", issueCodes);

    if (error) {
      for (const code of issueCodes) {
        applyResults.push({
          targetId: targetResult.targetId,
          issueCode: code,
          outcome: "apply_failed",
          message: error.message,
          dbUpdated: false,
        });
      }
      continue;
    }

    const byCode = new Map((findings ?? []).map((row) => [row.issue_code, row]));

    for (const code of issueCodes) {
      const finding = byCode.get(code);
      if (!finding) {
        applyResults.push({
          targetId: targetResult.targetId,
          issueCode: code,
          outcome: "skipped",
          message: "Finding not found in staging AgentOps",
          dbUpdated: false,
        });
        continue;
      }

      const result = await applyVerificationToFinding(
        supabase,
        finding,
        targetResult.verificationStatus,
        {
          run,
          target: { targetId: targetResult.targetId, title: targetResult.title },
          targetResult,
          reportJsonPath,
          reportMdPath,
        },
      );

      applyResults.push({ targetId: targetResult.targetId, ...result });
      if (result.dbUpdated) anyDbUpdated = true;
    }
  }

  return { applyResults, anyDbUpdated };
}
