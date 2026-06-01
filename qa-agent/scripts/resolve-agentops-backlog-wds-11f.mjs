/**
 * Stage 11F — Owner-authenticated backlog Verified Fixed for WDS-1/WDS-2 (staging).
 * Same semantics as resolveAgentOpsBacklogFinding / Stage 10H script (RLS via owner sign-in).
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";
import { loadAgentOpsOwnerEnv, ownerEnvStatus } from "./load-agentops-owner-env.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const STAGING_PROJECT_REF = "ydppcpbxrvvardeslzrk";
const EVIDENCE_REPORT_PATH =
  "qa-agent/agentops/AGENTOPS_STAGE_11E_QUOTATION_CREATE_PERMISSION_FIX_REPORT.md";
const TARGET_ISSUE_CODES = ["AIXIA-WRITE-WDS-1", "AIXIA-WRITE-WDS-2"];
const VALIDATION_CODES = [...TARGET_ISSUE_CODES, "AIXIA-WRITE-WDS-3"];

const NOTE =
  "Verified by Stage 11E write-draft-safe QA: unauthorized quotation create shell access blocked for finance-viewer and guest; finance-admin access preserved.";

const BACKLOG_RESOLVABLE_STATUSES = ["Backlog", "New", "Owner Reviewed", "Approved for Fix"];

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

async function resolveBacklogFinding(supabase, finding) {
  if (finding.queue_state !== "backlog") {
    return { ok: false, message: `${finding.issue_code}: not in backlog queue` };
  }
  if (!BACKLOG_RESOLVABLE_STATUSES.includes(finding.status)) {
    return {
      ok: false,
      message: `${finding.issue_code}: status ${finding.status} not resolvable`,
    };
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user?.id) {
    return { ok: false, message: "Not authenticated as owner" };
  }

  const feedbackMetadata = {
    action: "backlog_verified_fixed",
    resolution_status: "Verified Fixed",
    evidence_report_path: EVIDENCE_REPORT_PATH,
    evidence_summary: NOTE,
    stage: "11F",
  };

  const { data: feedback, error: feedbackError } = await supabase
    .from("agentops_owner_feedback")
    .insert({
      finding_id: finding.id,
      owner_user_id: user.id,
      feedback_type: "remark",
      remark: NOTE,
      metadata: feedbackMetadata,
    })
    .select("id")
    .single();

  if (feedbackError) {
    return {
      ok: false,
      message: `${finding.issue_code}: feedback failed — ${feedbackError.message}`,
    };
  }

  const { data: updated, error: updateError } = await supabase
    .from("agentops_findings")
    .update({
      status: "Verified Fixed",
      queue_state: "archived",
      top10_rank: null,
    })
    .eq("id", finding.id)
    .select("issue_code, status, queue_state")
    .single();

  if (updateError) {
    return {
      ok: false,
      message: `${finding.issue_code}: update failed — ${updateError.message}`,
    };
  }

  return {
    ok: true,
    message: `${finding.issue_code} → ${updated.status} / ${updated.queue_state}`,
    feedbackId: feedback.id,
  };
}

async function main() {
  loadViteEnv();
  loadAgentOpsOwnerEnv();

  const url = process.env.VITE_SUPABASE_URL ?? "";
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY ?? "";
  const email = process.env.AGENTOPS_QA_OWNER_EMAIL?.trim() ?? "";
  const password = process.env.AGENTOPS_QA_OWNER_PASSWORD ?? "";

  if (!url.includes(STAGING_PROJECT_REF)) {
    console.error(
      `Refusing to run: VITE_SUPABASE_URL must point at staging (${STAGING_PROJECT_REF}).`,
    );
    process.exit(1);
  }

  const ownerStatus = ownerEnvStatus();
  if (!ownerStatus.emailPresent || !ownerStatus.passwordPresent) {
    console.error(
      "Owner credentials missing. Set AGENTOPS_QA_OWNER_EMAIL and AGENTOPS_QA_OWNER_PASSWORD.",
    );
    process.exit(1);
  }

  if (!url || !anonKey) {
    console.error("VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY required in .env.local");
    process.exit(1);
  }

  const supabase = createClient(url, anonKey);
  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
  if (signInError) {
    console.error(`Owner sign-in failed: ${signInError.message}`);
    process.exit(1);
  }

  const { data: findings, error: fetchError } = await supabase
    .from("agentops_findings")
    .select("id, issue_code, status, queue_state")
    .in("issue_code", TARGET_ISSUE_CODES);

  if (fetchError) {
    console.error(fetchError.message);
    process.exit(1);
  }

  const byCode = new Map((findings ?? []).map((row) => [row.issue_code, row]));
  let failures = 0;
  const feedbackIds = [];

  for (const issueCode of TARGET_ISSUE_CODES) {
    const finding = byCode.get(issueCode);
    if (!finding) {
      console.warn(`${issueCode}: not found`);
      failures += 1;
      continue;
    }
    if (finding.status === "Verified Fixed" && finding.queue_state === "archived") {
      console.log(`${issueCode}: already Verified Fixed / archived`);
      continue;
    }
    const result = await resolveBacklogFinding(supabase, finding);
    if (result.ok) {
      console.log(result.message);
      if (result.feedbackId) feedbackIds.push({ issueCode, feedbackId: result.feedbackId });
    } else {
      console.error(result.message);
      failures += 1;
    }
  }

  const { data: validation, error: validationError } = await supabase
    .from("agentops_findings")
    .select("issue_code, status, queue_state")
    .in("issue_code", VALIDATION_CODES)
    .order("issue_code");

  if (validationError) {
    console.error(validationError.message);
    process.exit(1);
  }

  console.log("\nValidation (WDS-1, WDS-2, WDS-3):");
  console.table(validation ?? []);

  const wds3 = (validation ?? []).find((row) => row.issue_code === "AIXIA-WRITE-WDS-3");
  if (wds3) {
    console.warn(
      "Note: AIXIA-WRITE-WDS-3 is present in agentops_findings — not modified by this stage.",
    );
  } else {
    console.log("AIXIA-WRITE-WDS-3: not in agentops_findings (expected held / not imported).");
  }

  if (feedbackIds.length) {
    console.log("\nFeedback recorded:", feedbackIds);
  }

  process.exit(failures > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
