/**
 * Stage 12 / 12B — AgentOps verification runner (staging only).
 * Default: report-only. Apply mode (--apply --owner-approved) updates AgentOps via Owner RLS.
 */
import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";
import { DEV_URL, isDevServerUp } from "../../scripts/dev-server-utils.mjs";
import {
  applyVerificationResults,
  createOwnerSupabaseClient,
} from "./agentops-verification-apply.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const STAGING_PROJECT_REF = "ydppcpbxrvvardeslzrk";
const TARGETS_PATH = path.join(repoRoot, "qa-agent", "verification", "verification-targets.json");
const REPORT_DIR = path.join(repoRoot, "qa-agent", "reports", "verification");
const JSON_REPORT = path.join(REPORT_DIR, "verification-foundation-run.json");
const MD_REPORT = path.join(REPORT_DIR, "verification-foundation-run.md");

const BLOCKED_ROUTE_STATUSES = new Set([
  "redirected",
  "access-denied",
  "failed",
  "timed-out",
  "auth-required",
  "blocked",
]);

const APPROVED_NPM_SCRIPTS = new Set([
  "build",
  "qa:validate-foundation",
  "qa:agentops-role-workflow-safe",
  "qa:agentops-write-draft-safe",
  "qa:agentops-synthetic-users-smoke",
  "qa:agentops-owner-smoke",
]);

function parseArgs(argv) {
  const args = {
    dryRun: false,
    apply: false,
    ownerApproved: false,
    target: null,
    issue: null,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--dry-run") args.dryRun = true;
    else if (token === "--apply") args.apply = true;
    else if (token === "--owner-approved") args.ownerApproved = true;
    else if (token === "--target" && argv[i + 1]) {
      args.target = argv[++i];
    } else if (token === "--issue" && argv[i + 1]) {
      args.issue = argv[++i];
    }
  }
  if (!args.apply && !args.target && !args.issue) args.dryRun = true;
  return args;
}

function rel(filePath) {
  return path.relative(repoRoot, filePath).replaceAll("\\", "/");
}

function readJsonIfExists(filePath) {
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

function runNpmScript(scriptName) {
  if (!APPROVED_NPM_SCRIPTS.has(scriptName)) {
    return {
      npmScript: scriptName,
      exitCode: 1,
      skipped: true,
      reason: "script not in approved allowlist",
      stdoutTail: "",
      stderrTail: "",
    };
  }

  const result = spawnSync("npm", ["run", scriptName], {
    cwd: repoRoot,
    encoding: "utf8",
    shell: true,
    maxBuffer: 20 * 1024 * 1024,
  });

  const stdout = result.stdout ?? "";
  const stderr = result.stderr ?? "";
  return {
    npmScript: scriptName,
    exitCode: result.status ?? 1,
    skipped: false,
    reason: null,
    stdoutTail: stdout.slice(-2000),
    stderrTail: stderr.slice(-2000),
  };
}

function findUserRoute(report, qaUserId, route) {
  const user = (report?.users ?? []).find((row) => row.qaUserId === qaUserId);
  if (!user?.routes) return null;
  return user.routes.find((row) => row.route === route) ?? null;
}

function routeIsBlocked(routeRow) {
  if (!routeRow) return { blocked: false, reason: "route row missing" };
  const status = String(routeRow.status ?? "").toLowerCase();
  if (status === "loaded") {
    return { blocked: false, reason: `status=${status}` };
  }
  if (BLOCKED_ROUTE_STATUSES.has(status)) {
    return { blocked: true, reason: `status=${status}` };
  }
  return { blocked: true, reason: `status=${status || "unknown"}` };
}

function evaluateGuestFinanceAccess(target, context) {
  const checks = [];
  const reportPath = path.join(repoRoot, target.reportPaths.primary);
  const report = context.reports.roleWorkflow;

  if (!report) {
    return {
      verificationStatus: "verification_blocked",
      checks,
      summary: "role-workflow-safe-report.json missing",
    };
  }

  const guestMaster = findUserRoute(report, "guest", "/finance/master-data");
  const guestReports = findUserRoute(report, "guest", "/finance/reports");
  const masterBlock = routeIsBlocked(guestMaster);
  const reportsBlock = routeIsBlocked(guestReports);

  checks.push({
    id: "guest-master-data-blocked",
    pass: masterBlock.blocked,
    detail: masterBlock.reason,
  });
  checks.push({
    id: "guest-reports-blocked",
    pass: reportsBlock.blocked,
    detail: reportsBlock.reason,
  });

  const criticalCount = (report.criticalSecurityFindings ?? []).length;
  checks.push({
    id: "critical-security-findings-zero",
    pass: criticalCount === 0,
    detail: `count=${criticalCount}`,
  });

  const isolation = report.agentOpsIsolation?.status ?? "unknown";
  checks.push({
    id: "agentops-isolation-passed",
    pass: isolation === "passed",
    detail: `status=${isolation}`,
  });

  const roleCmd = context.commands.find((c) => c.npmScript === "qa:agentops-role-workflow-safe");
  if (roleCmd && !roleCmd.skipped) {
    checks.push({
      id: "role-workflow-command-exit-zero",
      pass: roleCmd.exitCode === 0,
      detail: `exitCode=${roleCmd.exitCode}`,
    });
  }

  const guestLoadedFinance = [guestMaster, guestReports].some(
    (row) => String(row?.status ?? "").toLowerCase() === "loaded",
  );
  if (guestLoadedFinance) {
    return {
      verificationStatus: "still_broken",
      checks,
      summary: "Guest still loads finance master-data or reports",
    };
  }

  if (!context.devServerAvailable) {
    return {
      verificationStatus: "verification_blocked",
      checks,
      summary: "Dev server unavailable for browser verification",
    };
  }

  if (roleCmd && roleCmd.exitCode !== 0) {
    return {
      verificationStatus: "verification_blocked",
      checks,
      summary: "role-workflow-safe command failed",
    };
  }

  const allPass = checks.every((c) => c.pass);
  if (allPass) {
    return {
      verificationStatus: "verified_fixed",
      checks,
      summary: "Guest finance routes blocked; AgentOps isolation passed",
    };
  }

  const blockedOnlyEnv = checks
    .filter((c) => !c.pass)
    .every((c) => c.id === "role-workflow-command-exit-zero");

  if (blockedOnlyEnv) {
    return {
      verificationStatus: "verification_blocked",
      checks,
      summary: "Browser suite did not complete successfully",
    };
  }

  return {
    verificationStatus: "needs_follow_up_fix",
    checks,
    summary: "Partial pass — review failed checks",
  };
}

function evaluateQuotationCreateShell(target, context) {
  const checks = [];
  const report = context.reports.writeDraft;

  if (!report) {
    return {
      verificationStatus: "verification_blocked",
      checks,
      summary: "write-draft-safe-report.json missing",
    };
  }

  if (!context.devServerAvailable) {
    return {
      verificationStatus: "verification_blocked",
      checks,
      summary: "Dev server unavailable for write-draft verification",
    };
  }

  const writeCmd = context.commands.find((c) => c.npmScript === "qa:agentops-write-draft-safe");
  if (writeCmd && !writeCmd.skipped) {
    checks.push({
      id: "write-draft-command-exit-zero",
      pass: writeCmd.exitCode === 0,
      detail: `exitCode=${writeCmd.exitCode}`,
    });
  }

  const safety = (report.safetyConfirmations ?? []).join(" ").toLowerCase();
  checks.push({
    id: "viewer-blocked-quotations-new",
    pass: safety.includes("finance-viewer") && safety.includes("quotations/new"),
    detail: report.safetyConfirmations?.find((s) => s.includes("finance-viewer")) ?? "missing",
  });
  checks.push({
    id: "guest-blocked-quotations-new",
    pass: safety.includes("guest") && safety.includes("quotations/new"),
    detail: report.safetyConfirmations?.find((s) => s.includes("guest")) ?? "missing",
  });

  const adminNew = (report.workflowsAttempted ?? []).find(
    (w) =>
      w.qaUserId === "finance-admin" &&
      w.route === "/finance/transactions/quotations/new" &&
      w.mode === "create-draft-test-record",
  );
  checks.push({
    id: "finance-admin-new-loaded",
    pass: adminNew?.outcome === "loaded",
    detail: adminNew?.outcome ?? "workflow missing",
  });

  const criticalCount = (report.criticalFindings ?? []).length;
  checks.push({
    id: "critical-findings-zero",
    pass: criticalCount === 0,
    detail: `count=${criticalCount}`,
  });

  const recordsCount = (report.recordsCreated ?? []).length;
  checks.push({
    id: "no-records-created",
    pass: recordsCount === 0,
    detail: `count=${recordsCount}`,
  });

  const viewerLoaded = (report.workflowsAttempted ?? []).some(
    (w) =>
      w.qaUserId === "finance-viewer" &&
      w.route === "/finance/transactions/quotations/new" &&
      w.outcome === "loaded",
  );
  const guestLoaded = (report.workflowsAttempted ?? []).some(
    (w) =>
      w.qaUserId === "guest" &&
      w.route === "/finance/transactions/quotations/new" &&
      w.outcome === "loaded",
  );

  if (viewerLoaded || guestLoaded) {
    return {
      verificationStatus: "still_broken",
      checks,
      summary: "Unauthorized user still loads quotation create shell",
    };
  }

  if (writeCmd && writeCmd.exitCode !== 0) {
    return {
      verificationStatus: "verification_blocked",
      checks,
      summary: "write-draft-safe command failed",
    };
  }

  const findingsCount = (report.findings ?? []).length;
  if (findingsCount > 0 && criticalCount === 0) {
    const allPass = checks.filter((c) => c.id !== "critical-findings-zero").every((c) => c.pass);
    if (allPass) {
      return {
        verificationStatus: "needs_follow_up_fix",
        checks,
        summary: `Non-critical findings remain (${findingsCount}) but core permission checks pass`,
      };
    }
  }

  if (checks.every((c) => c.pass)) {
    return {
      verificationStatus: "verified_fixed",
      checks,
      summary: "Quotation create shell permissions verified for viewer/guest/admin",
    };
  }

  return {
    verificationStatus: "needs_follow_up_fix",
    checks,
    summary: "One or more quotation verification checks failed",
  };
}

function evaluateGenericBuildSmoke(target, context) {
  const checks = [];

  for (const cmd of context.commands) {
    if (cmd.skipped) continue;
    checks.push({
      id: `command-${cmd.npmScript}`,
      pass: cmd.exitCode === 0,
      detail: `exitCode=${cmd.exitCode}`,
    });
  }

  const ownerReport = context.reports.ownerSmoke;
  if (ownerReport) {
    checks.push({
      id: "owner-smoke-passed",
      pass: ownerReport.status === "passed",
      detail: `status=${ownerReport.status}`,
    });
    checks.push({
      id: "owner-agentops-visible",
      pass: ownerReport.agentOpsHeadingVisible === true,
      detail: `agentOpsHeadingVisible=${ownerReport.agentOpsHeadingVisible}`,
    });
  } else if (context.commands.some((c) => c.npmScript === "qa:agentops-owner-smoke" && !c.skipped)) {
    checks.push({
      id: "owner-smoke-report-exists",
      pass: false,
      detail: "owner-agentops-smoke-report.json missing",
    });
  }

  const syntheticReport = context.reports.syntheticSmoke;
  if (syntheticReport) {
    checks.push({
      id: "synthetic-smoke-ran",
      pass: (syntheticReport.usersTested ?? 0) >= 1,
      detail: `usersTested=${syntheticReport.usersTested ?? 0}`,
    });
    const ownerIsolation = syntheticReport.agentOpsOwnerAccess?.status;
    checks.push({
      id: "synthetic-owner-agentops-loaded",
      pass: ownerIsolation === "loaded",
      detail: `ownerStatus=${ownerIsolation}`,
    });
  }

  const browserCmds = context.commands.filter(
    (c) =>
      !c.skipped &&
      (c.npmScript === "qa:agentops-synthetic-users-smoke" ||
        c.npmScript === "qa:agentops-owner-smoke"),
  );
  if (!context.devServerAvailable && browserCmds.length > 0) {
    return {
      verificationStatus: "verification_blocked",
      checks,
      summary: "Dev server unavailable for smoke suites",
    };
  }

  if (checks.some((c) => !c.pass && c.id.startsWith("command-"))) {
    return {
      verificationStatus: "still_broken",
      checks,
      summary: "One or more required commands failed",
    };
  }

  if (checks.every((c) => c.pass)) {
    return {
      verificationStatus: "verified_fixed",
      checks,
      summary: "Build and smoke gates passed",
    };
  }

  return {
    verificationStatus: "needs_follow_up_fix",
    checks,
    summary: "Review failed build/smoke checks",
  };
}

function evaluateTarget(target, context) {
  const evaluators = {
    "guest-finance-access": evaluateGuestFinanceAccess,
    "quotation-create-shell-access": evaluateQuotationCreateShell,
    "generic-build-and-smoke": evaluateGenericBuildSmoke,
  };
  const fn = evaluators[target.targetId];
  if (!fn) {
    return {
      verificationStatus: "verification_blocked",
      checks: [],
      summary: `No evaluator for target ${target.targetId}`,
    };
  }
  return fn(target, context);
}

function loadBrowserReports() {
  return {
    roleWorkflow: readJsonIfExists(
      path.join(repoRoot, "qa-agent/reports/browser-qa/role-workflow-safe-report.json"),
    ),
    writeDraft: readJsonIfExists(
      path.join(repoRoot, "qa-agent/reports/browser-qa/write-draft-safe-report.json"),
    ),
    syntheticSmoke: readJsonIfExists(
      path.join(repoRoot, "qa-agent/reports/browser-qa/synthetic-users-smoke-report.json"),
    ),
    ownerSmoke: readJsonIfExists(
      path.join(repoRoot, "qa-agent/reports/browser-qa/owner-agentops-smoke-report.json"),
    ),
  };
}

function printDryRunPlan(targets, devServerAvailable, args) {
  console.log("\nAgentOps Verification Runner — dry-run plan");
  console.log(`Environment: staging-only (${STAGING_PROJECT_REF})`);
  console.log(`Base URL: ${DEV_URL}`);
  console.log(`Dev server: ${devServerAvailable ? "available" : "NOT available"}`);
  console.log(`Mode: ${args.apply ? "apply (requires --owner-approved at run time)" : "report-only"}`);
  console.log("DB status updates: disabled in dry-run\n");

  for (const target of targets) {
    console.log(`--- target: ${target.targetId} ---`);
    console.log(`Title: ${target.title}`);
    console.log(`Issues: ${(target.issueCodes ?? []).join(", ") || "(generic)"}`);
    console.log(`Type: ${target.verificationType}`);
    for (const cmd of target.requiredCommands ?? []) {
      const needsServer = cmd.requiresDevServer ? " [needs dev server]" : "";
      const skip = cmd.requiresDevServer && !devServerAvailable ? " — WOULD BLOCK" : "";
      console.log(`  npm run ${cmd.npmScript}${needsServer}${skip}`);
    }
    const primary = target.reportPaths?.primary ?? target.reportPaths?.syntheticSmoke;
    if (primary) console.log(`  Parse report: ${primary}`);
    console.log(`  Pass criteria: ${(target.passCriteria ?? []).length} rules`);
    console.log("");
  }
}

function renderMarkdown(run) {
  const lines = [
    "# AgentOps Verification Foundation Run",
    "",
    `- **Run ID:** ${run.runId}`,
    `- **Created:** ${run.createdAt}`,
    `- **Environment:** ${run.environment} (${run.stagingProjectRef})`,
    `- **Mode:** ${run.mode}`,
    `- **Owner approved:** ${run.ownerApproved}`,
    `- **Dry run:** ${run.dryRun}`,
    `- **Dev server:** ${run.devServerAvailable ? "available" : "unavailable"}`,
    `- **Overall:** ${run.overallStatus}`,
    `- **DB updated:** ${run.agentOpsDbUpdated}`,
    "",
  ];

  if (run.applyResults?.length) {
    lines.push("## Apply results", "");
    lines.push(`- **Issues considered:** ${(run.issuesConsidered ?? []).join(", ") || "—"}`);
    lines.push(`- **Issues updated:** ${(run.issuesUpdated ?? []).join(", ") || "—"}`);
    lines.push(`- **Issues skipped:** ${(run.issuesSkipped ?? []).join(", ") || "—"}`);
    lines.push("");
    for (const row of run.applyResults) {
      lines.push(
        `- \`${row.issueCode ?? row.targetId}\` — **${row.outcome}** — ${row.message ?? ""}`,
      );
    }
    lines.push("");
  }

  lines.push("## Targets", "");

  for (const target of run.targetsExecuted) {
    lines.push(`### ${target.targetId}`);
    lines.push("");
    lines.push(`- **Result:** \`${target.verificationStatus}\``);
    lines.push(`- **Summary:** ${target.summary}`);
    if (target.issueCodes?.length) {
      lines.push(`- **Issues:** ${target.issueCodes.join(", ")}`);
    }
    lines.push("");
    lines.push("#### Commands");
    lines.push("");
    for (const cmd of target.commands) {
      const status = cmd.skipped ? "skipped" : cmd.exitCode === 0 ? "PASS" : "FAIL";
      lines.push(`- \`${cmd.npmScript}\` — ${status}${cmd.reason ? ` (${cmd.reason})` : ""}`);
    }
    lines.push("");
    lines.push("#### Checks");
    lines.push("");
    for (const check of target.checks) {
      lines.push(`- [${check.pass ? "x" : " "}] ${check.id} — ${check.detail}`);
    }
    lines.push("");
  }

  lines.push("## Safety");
  lines.push("");
  lines.push("- Staging only; no production.");
  lines.push("- DB updates only with `--apply --owner-approved` (Stage 12B).");
  lines.push("- No scheduler/cron/Hermes/CodeGraph runtime automation.");
  lines.push("");

  return lines.join("\n");
}

function summarizeApplyResults(applyResults) {
  const issuesConsidered = [];
  const issuesUpdated = [];
  const issuesSkipped = [];

  for (const row of applyResults) {
    if (row.issueCode) issuesConsidered.push(row.issueCode);
    if (row.dbUpdated && row.outcome !== "skipped_already_resolved") {
      issuesUpdated.push(row.issueCode);
    }
    if (
      row.outcome === "skipped_already_resolved" ||
      row.outcome === "skipped" ||
      row.outcome === "evidence_only_no_pending_verification"
    ) {
      if (row.issueCode) issuesSkipped.push(row.issueCode);
    }
  }

  return {
    issuesConsidered: [...new Set(issuesConsidered)],
    issuesUpdated: [...new Set(issuesUpdated)],
    issuesSkipped: [...new Set(issuesSkipped)],
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.apply && !args.ownerApproved) {
    console.error("Apply mode requires --owner-approved.");
    process.exit(1);
  }

  if (args.apply && !args.target && !args.issue) {
    console.error("Apply mode requires --target <targetId> or --issue <issueCode>.");
    process.exit(1);
  }

  const config = JSON.parse(fs.readFileSync(TARGETS_PATH, "utf8"));
  const devServerAvailable = await isDevServerUp(DEV_URL);

  let targets = config.targets ?? [];
  if (args.target) {
    targets = targets.filter((t) => t.targetId === args.target);
    if (!targets.length) {
      console.error(`Unknown target: ${args.target}`);
      process.exit(1);
    }
  }
  if (args.issue) {
    targets = targets.filter((t) => (t.issueCodes ?? []).includes(args.issue));
    if (!targets.length) {
      console.error(`No target defines issue: ${args.issue}`);
      process.exit(1);
    }
  }

  if (args.dryRun) {
    printDryRunPlan(targets, devServerAvailable, args);
    const run = {
      runId: `verification-foundation-${Date.now()}`,
      createdAt: new Date().toISOString(),
      environment: config.environment,
      stagingProjectRef: STAGING_PROJECT_REF,
      baseUrl: config.baseUrlDefault ?? DEV_URL,
      mode: args.apply ? "apply-planned" : "report-only",
      ownerApproved: args.ownerApproved,
      dryRun: true,
      devServerAvailable,
      agentOpsDbUpdated: false,
      targetsExecuted: targets.map((target) => ({
        targetId: target.targetId,
        issueCodes: target.issueCodes ?? [],
        verificationStatus: "verification_blocked",
        summary: "Dry-run only — no commands executed",
        commands: (target.requiredCommands ?? []).map((cmd) => ({
          npmScript: cmd.npmScript,
          exitCode: null,
          skipped: true,
          reason: "dry-run",
        })),
        checks: [],
      })),
      overallStatus: "DRY-RUN",
    };
    fs.mkdirSync(REPORT_DIR, { recursive: true });
    fs.writeFileSync(JSON_REPORT, `${JSON.stringify(run, null, 2)}\n`);
    fs.writeFileSync(MD_REPORT, renderMarkdown(run));
    console.log(`\nWrote ${rel(JSON_REPORT)}`);
    console.log(`Wrote ${rel(MD_REPORT)}`);
    process.exit(0);
  }

  const runId = `verification-foundation-${Date.now()}`;
  const targetsExecuted = [];

  for (const target of targets) {
    const commands = [];
    let blocked = false;
    let commandsSkippedReason = null;

    if (args.apply && args.ownerApproved && (target.issueCodes ?? []).length > 0) {
      try {
        const supabase = await createOwnerSupabaseClient();
        const { data: findings } = await supabase
          .from("agentops_findings")
          .select("issue_code, status, queue_state")
          .in("issue_code", target.issueCodes);
        const allResolved =
          (findings ?? []).length > 0 &&
          findings.every(
            (row) => row.status === "Verified Fixed" && row.queue_state === "archived",
          );
        if (allResolved) {
          commandsSkippedReason = "all_target_issues_already_verified_fixed";
          for (const spec of target.requiredCommands ?? []) {
            commands.push({
              npmScript: spec.npmScript,
              exitCode: 0,
              skipped: true,
              reason: commandsSkippedReason,
            });
          }
        }
      } catch {
        /* run commands normally if precheck fails */
      }
    }

    if (!commandsSkippedReason) for (const spec of target.requiredCommands ?? []) {
      if (spec.requiresDevServer && !devServerAvailable) {
        commands.push({
          npmScript: spec.npmScript,
          exitCode: 1,
          skipped: true,
          reason: "dev server unavailable",
        });
        blocked = true;
        continue;
      }
      console.log(`\n[target ${target.targetId}] npm run ${spec.npmScript}`);
      const result = runNpmScript(spec.npmScript);
      commands.push(result);
      console.log(`  exit ${result.exitCode}`);
    }

    const reports = loadBrowserReports();
    const evaluation = evaluateTarget(target, {
      devServerAvailable,
      commands,
      reports,
      blocked,
    });

    targetsExecuted.push({
      targetId: target.targetId,
      title: target.title,
      verificationType: target.verificationType,
      issueCodes: target.issueCodes ?? [],
      verificationStatus: evaluation.verificationStatus,
      summary: evaluation.summary,
      commands,
      commandsSkippedReason,
      checks: evaluation.checks,
      reportPaths: target.reportPaths ?? {},
    });
  }

  const statuses = targetsExecuted.map((t) => t.verificationStatus);
  let overallStatus = "PASS";
  if (statuses.some((s) => s === "still_broken")) overallStatus = "FAILED";
  else if (statuses.some((s) => s === "verification_blocked")) overallStatus = "PASS WITH FOLLOW-UP";
  else if (statuses.some((s) => s === "needs_follow_up_fix")) overallStatus = "PASS WITH FOLLOW-UP";

  const reportJsonPath = rel(JSON_REPORT);
  const reportMdPath = rel(MD_REPORT);

  let applyResults = [];
  let agentOpsDbUpdated = false;
  let applySummary = null;

  if (args.apply && args.ownerApproved) {
    console.log("\n--- Apply mode (Owner-approved, staging only) ---");
    try {
      const applyOutcome = await applyVerificationResults({
        run: { runId, createdAt: new Date().toISOString() },
        targetsExecuted,
        reportJsonPath,
        reportMdPath,
        issueFilter: args.issue,
      });
      applyResults = applyOutcome.applyResults;
      agentOpsDbUpdated = applyOutcome.anyDbUpdated;
      applySummary = summarizeApplyResults(applyResults);
      for (const row of applyResults) {
        console.log(
          `${row.issueCode ?? row.targetId}: ${row.outcome} — ${row.message ?? ""}`,
        );
      }
    } catch (error) {
      console.error(`Apply failed: ${error.message}`);
      process.exit(1);
    }
  }

  const run = {
    runId,
    createdAt: new Date().toISOString(),
    environment: config.environment,
    stagingProjectRef: STAGING_PROJECT_REF,
    baseUrl: config.baseUrlDefault ?? DEV_URL,
    mode: args.apply && args.ownerApproved ? "apply" : "report-only",
    ownerApproved: args.ownerApproved,
    dryRun: false,
    devServerAvailable,
    agentOpsDbUpdated,
    targetsExecuted,
    overallStatus,
    applyResults,
    issuesConsidered: applySummary?.issuesConsidered ?? [],
    issuesUpdated: applySummary?.issuesUpdated ?? [],
    issuesSkipped: applySummary?.issuesSkipped ?? [],
    evidencePaths: {
      reportJsonPath,
      reportMdPath,
    },
    dbUpdateResult: args.apply
      ? agentOpsDbUpdated
        ? "feedback and/or status updated for approved issues"
        : "no status changes (already resolved or evidence-only)"
      : "not requested",
    safetyStatement:
      "Stage 12B verification runner: staging-only; apply requires --apply --owner-approved.",
  };

  fs.mkdirSync(REPORT_DIR, { recursive: true });
  fs.writeFileSync(JSON_REPORT, `${JSON.stringify(run, null, 2)}\n`);
  fs.writeFileSync(MD_REPORT, renderMarkdown(run));

  console.log("\n--- Verification summary ---");
  for (const t of targetsExecuted) {
    console.log(`${t.targetId}: ${t.verificationStatus} — ${t.summary}`);
  }
  console.log(`Overall: ${overallStatus}`);
  console.log(`Mode: ${run.mode}`);
  if (args.apply) {
    console.log(`DB updated: ${agentOpsDbUpdated}`);
  }
  console.log(`\nWrote ${reportJsonPath}`);
  console.log(`Wrote ${reportMdPath}`);

  const exitCode = overallStatus === "FAILED" ? 1 : 0;
  process.exit(exitCode);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
