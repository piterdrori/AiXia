import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";
import { loadAgentOpsOwnerEnv } from "./load-agentops-owner-env.mjs";

const STAGING_PROJECT_REF = "ydppcpbxrvvardeslzrk";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..");

const usersPath = path.join(repoRoot, "qa-agent", "browser-qa", "synthetic-browser-users.json");
const previousExportReportPath = path.join(
  repoRoot,
  "qa-agent",
  "memory-sync",
  "agent-memory-file-export-report.json",
);
const planJsonPath = path.join(repoRoot, "qa-agent", "memory-sync", "agent-memory-refresh-plan.json");
const planMdPath = path.join(repoRoot, "qa-agent", "memory-sync", "agent-memory-refresh-plan.md");
const memoryFilesDir = path.join(repoRoot, "qa-agent", "agent-memory");
const memoryDraftsDir = path.join(repoRoot, "qa-agent", "agent-memory-drafts");

const SENSITIVE_PATTERNS = [
  /password/i,
  /secret/i,
  /api[_\s-]?key/i,
  /supabase[_\s-]?anon[_\s-]?key/i,
  /service[_\s-]?role[_\s-]?key/i,
  /production credential/i,
  /payment credential/i,
];

const DEFAULT_FLAGS = {
  dryRun: true,
  writeDrafts: false,
  noDb: false,
  agentId: null,
};

function parseFlags(argv) {
  const flags = { ...DEFAULT_FLAGS };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--dry-run") flags.dryRun = true;
    else if (token === "--write-drafts") flags.writeDrafts = true;
    else if (token === "--no-db") flags.noDb = true;
    else if (token === "--agent") {
      const value = argv[i + 1];
      if (value && !value.startsWith("--")) {
        flags.agentId = value.trim();
        i += 1;
      }
    }
  }
  return flags;
}

function readJson(filePath, fallback = null) {
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function isSensitive(text) {
  const value = String(text ?? "");
  return SENSITIVE_PATTERNS.some((pattern) => pattern.test(value));
}

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
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

function loadScriptEnv() {
  loadEnvFile(path.join(repoRoot, ".env.local"));
  loadAgentOpsOwnerEnv();
}

function extractInteractionType(metadata) {
  if (!metadata || typeof metadata !== "object") return "add_interaction_note";
  const type = String(metadata.messageType ?? "").toLowerCase();
  if (type === "focus_directive") return "update_focus";
  if (type === "correction") return "add_correction";
  if (type === "feature_idea") return "add_feature_idea";
  if (type === "fix_instruction") return "add_fix_instruction";
  if (type === "test_instruction") return "add_test_instruction";
  return "add_interaction_note";
}

async function readDbRows(flags) {
  if (flags.noDb) {
    return {
      sourceDbRead: { enabled: false, reason: "DB read skipped by --no-db flag." },
      memoryRows: [],
      interactionRows: [],
    };
  }

  loadScriptEnv();
  const url = process.env.VITE_SUPABASE_URL ?? "";
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY ?? "";
  const ownerEmail = process.env.AGENTOPS_QA_OWNER_EMAIL ?? "";
  const ownerPassword = process.env.AGENTOPS_QA_OWNER_PASSWORD ?? "";
  if (!url || !anonKey || !ownerEmail || !ownerPassword) {
    return {
      sourceDbRead: {
        enabled: false,
        reason:
          "Missing VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY/AGENTOPS_QA_OWNER_EMAIL/AGENTOPS_QA_OWNER_PASSWORD.",
      },
      memoryRows: [],
      interactionRows: [],
    };
  }

  if (!url.includes(STAGING_PROJECT_REF)) {
    return {
      sourceDbRead: {
        enabled: false,
        reason: `Refusing DB read: VITE_SUPABASE_URL must point at staging (${STAGING_PROJECT_REF}).`,
      },
      memoryRows: [],
      interactionRows: [],
    };
  }

  const supabase = createClient(url, anonKey);
  const signIn = await supabase.auth.signInWithPassword({
    email: ownerEmail.trim(),
    password: ownerPassword,
  });
  if (signIn.error) {
    return {
      sourceDbRead: { enabled: false, reason: `Owner sign-in failed: ${signIn.error.message}` },
      memoryRows: [],
      interactionRows: [],
    };
  }

  const [memoryResult, feedbackResult] = await Promise.all([
    supabase
      .from("agentops_agent_memory")
      .select("id, agent_id, memory_type, memory_text, created_at")
      .order("created_at", { ascending: false })
      .limit(4000),
    supabase
      .from("agentops_owner_feedback")
      .select("id, remark, metadata, created_at")
      .order("created_at", { ascending: false })
      .limit(4000),
  ]);
  if (memoryResult.error || feedbackResult.error) {
    return {
      sourceDbRead: {
        enabled: false,
        reason: `DB read failed: ${memoryResult.error?.message ?? feedbackResult.error?.message}`,
      },
      memoryRows: [],
      interactionRows: [],
    };
  }

  return {
    sourceDbRead: { enabled: true, reason: "DB read succeeded with owner-authenticated staging credentials." },
    memoryRows: memoryResult.data ?? [],
    interactionRows: (feedbackResult.data ?? []).filter((row) => {
      const meta = row.metadata && typeof row.metadata === "object" ? row.metadata : {};
      return meta.action === "agent_interaction_note" || meta.action === "agent_status_update";
    }),
  };
}

function buildDraftFileContent(agent, changes) {
  const lines = changes.map((change) => `- [${change.changeType}] ${change.summary}`);
  return `# AgentOps Memory Draft — ${agent.displayName}
## Status
Draft-only refresh output from Stage 16F.
No live sync. No overwrite of reviewed memory files.

## Agent
- Agent ID: ${agent.agentId}
- Target reviewed file: ${agent.targetFilePath}
- Draft generated at: ${new Date().toISOString()}

## Proposed Changes
${lines.length ? lines.join("\n") : "- No changes."}
`;
}

function renderPlanMarkdown(plan) {
  const rows = plan.agents.map((agent) => {
    return `- ${agent.agentId}: ${agent.refreshStatus} (changes: ${agent.proposedChangeCount}, warnings: ${agent.sensitiveWarnings.length})`;
  });
  return `# AgentOps Memory Refresh Plan

- Generated at: ${plan.generatedAt}
- Dry run: ${plan.dryRun ? "true" : "false"}
- Source DB read: ${plan.sourceDbRead.enabled ? "enabled" : "disabled"} (${plan.sourceDbRead.reason})
- Previous export report: ${plan.previousExportReportPath}
- Previous memory files folder: ${plan.previousMemoryFilesFolder}
- Draft output folder: ${plan.draftOutputFolder}

## Summary
- totalAgents: ${plan.summary.totalAgents}
- agentsWithChanges: ${plan.summary.agentsWithChanges}
- agentsNoChange: ${plan.summary.agentsNoChange}
- sensitiveWarningsCount: ${plan.summary.sensitiveWarningsCount}
- skippedItemsCount: ${plan.summary.skippedItemsCount}

## Per-agent status
${rows.join("\n")}

## Safety
- liveSyncActive: ${plan.safety.liveSyncActive}
- hermesAutomation: ${plan.safety.hermesAutomation}
- codeGraphAutomation: ${plan.safety.codeGraphAutomation}
- finalRulebooksCreated: ${plan.safety.finalRulebooksCreated}

## Recommended Action
${plan.recommendedAction}
`;
}

async function run() {
  const flags = parseFlags(process.argv.slice(2));
  const usersPayload = readJson(usersPath, { users: [] });
  const users = (usersPayload.users ?? []).filter((user) =>
    flags.agentId ? user.qaUserId === flags.agentId : true,
  );
  const db = await readDbRows(flags);
  const previousExport = readJson(previousExportReportPath, {
    generatedAt: null,
    filesCreated: [],
  });

  const previousFilesSet = new Set(
    (previousExport.filesCreated ?? []).map((entry) => String(entry).replaceAll("\\", "/")),
  );

  const agents = [];
  let sensitiveWarningsCount = 0;
  let skippedItemsCount = 0;
  let draftFilesCreated = 0;

  if (flags.writeDrafts) fs.mkdirSync(memoryDraftsDir, { recursive: true });

  for (const user of users) {
    const agentId = user.qaUserId;
    const reviewedRelative = `qa-agent/agent-memory/${agentId}.memory.md`;
    const reviewedAbsolute = path.join(repoRoot, reviewedRelative);
    const draftRelative = `qa-agent/agent-memory-drafts/${agentId}.memory.draft.md`;
    const draftAbsolute = path.join(repoRoot, draftRelative);
    const existingFileFound = fs.existsSync(reviewedAbsolute);
    const existingText = existingFileFound ? fs.readFileSync(reviewedAbsolute, "utf8") : "";

    const memoryRows = db.memoryRows.filter((row) => row.agent_id === agentId);
    const interactionRows = db.interactionRows.filter((row) => {
      const meta = row.metadata && typeof row.metadata === "object" ? row.metadata : {};
      return meta.agentId === agentId;
    });

    const proposedChanges = [];
    const sensitiveWarnings = [];
    const skippedItems = [];

    for (const row of memoryRows) {
      const content = String(row.memory_text ?? "").trim();
      if (!content) continue;
      if (isSensitive(content)) {
        sensitiveWarnings.push("Sensitive memory content skipped.");
        skippedItems.push({ sourceRecordId: row.id, reason: "sensitive_content_detected" });
        proposedChanges.push({
          changeType: "remove_unsafe_item",
          sourceRecordId: row.id,
          summary: "Unsafe memory content removed from export draft.",
          safeToExport: false,
          reason: "sensitive_content_detected",
        });
        continue;
      }
      const existsInFile = existingText.includes(content);
      if (!existsInFile) {
        proposedChanges.push({
          changeType: row.memory_type?.includes("focus") ? "update_focus" : "add_memory",
          sourceRecordId: row.id,
          summary: `Add memory item (${row.memory_type}).`,
          safeToExport: true,
          reason: "not_found_in_reviewed_file",
        });
      }
    }

    for (const row of interactionRows) {
      const content = String(row.remark ?? "").trim();
      if (!content) continue;
      if (isSensitive(content)) {
        sensitiveWarnings.push("Sensitive interaction content skipped.");
        skippedItems.push({ sourceRecordId: row.id, reason: "sensitive_content_detected" });
        proposedChanges.push({
          changeType: "remove_unsafe_item",
          sourceRecordId: row.id,
          summary: "Unsafe interaction content removed from export draft.",
          safeToExport: false,
          reason: "sensitive_content_detected",
        });
        continue;
      }
      const existsInFile = existingText.includes(content);
      if (!existsInFile) {
        proposedChanges.push({
          changeType: extractInteractionType(row.metadata),
          sourceRecordId: row.id,
          summary: "Add interaction note update from latest DB records.",
          safeToExport: true,
          reason: "not_found_in_reviewed_file",
        });
      }
    }

    sensitiveWarningsCount += sensitiveWarnings.length;
    skippedItemsCount += skippedItems.length;

    const safeChangeCount = proposedChanges.filter((change) => change.safeToExport).length;
    let refreshStatus = "no_change";
    if (!existingFileFound) refreshStatus = "missing_existing_file";
    else if (safeChangeCount > 0) refreshStatus = "draft_ready";
    else if (memoryRows.length === 0 && interactionRows.length === 0) refreshStatus = "skipped_no_memory";
    if (sensitiveWarnings.length > 0 && safeChangeCount === 0) refreshStatus = "blocked_sensitive_content";

    if (flags.writeDrafts && refreshStatus === "draft_ready") {
      const draftContent = buildDraftFileContent(
        { agentId, displayName: user.displayName, targetFilePath: reviewedRelative },
        proposedChanges.filter((change) => change.safeToExport),
      );
      fs.writeFileSync(draftAbsolute, draftContent, "utf8");
      draftFilesCreated += 1;
    }

    agents.push({
      agentId,
      displayName: user.displayName,
      targetFilePath: reviewedRelative,
      draftFilePath: draftRelative,
      existingFileFound,
      dbMemoryCount: memoryRows.length,
      dbInteractionCount: interactionRows.length,
      existingFileMemorySummary: existingFileFound
        ? `Reviewed file present (exported: ${previousExport.generatedAt ?? "unknown"}).`
        : "Reviewed file missing.",
      proposedChangeCount: safeChangeCount,
      proposedChanges,
      sensitiveWarnings,
      skippedItems,
      refreshStatus,
      ownerReviewRequired: true,
      previousExported: previousFilesSet.has(reviewedRelative),
    });
  }

  const summary = {
    totalAgents: agents.length,
    agentsWithChanges: agents.filter((agent) => agent.refreshStatus === "draft_ready").length,
    agentsNoChange: agents.filter((agent) => agent.refreshStatus === "no_change").length,
    sensitiveWarningsCount,
    skippedItemsCount,
    draftFilesCreated,
  };

  const plan = {
    version: "1.0.0",
    generatedAt: new Date().toISOString(),
    dryRun: flags.dryRun && !flags.writeDrafts,
    sourceDbRead: db.sourceDbRead,
    previousExportReportPath: "qa-agent/memory-sync/agent-memory-file-export-report.json",
    previousMemoryFilesFolder: "qa-agent/agent-memory",
    draftOutputFolder: "qa-agent/agent-memory-drafts",
    agents,
    summary,
    safety: {
      liveSyncActive: false,
      hermesAutomation: false,
      codeGraphAutomation: false,
      finalRulebooksCreated: false,
    },
    recommendedAction:
      summary.agentsWithChanges > 0
        ? "Owner review required. Run draft generation manually, then review before any replacement stage."
        : "No draft refresh changes detected.",
  };

  fs.writeFileSync(planJsonPath, `${JSON.stringify(plan, null, 2)}\n`, "utf8");
  fs.writeFileSync(planMdPath, renderPlanMarkdown(plan), "utf8");

  console.log("AgentOps memory refresh plan generated.");
  console.log(`Plan JSON: ${path.relative(repoRoot, planJsonPath)}`);
  console.log(`Plan MD: ${path.relative(repoRoot, planMdPath)}`);
  console.log(`Agents: ${summary.totalAgents}`);
  console.log(`Agents with changes: ${summary.agentsWithChanges}`);
  console.log(`Draft files created: ${summary.draftFilesCreated}`);
  console.log(`DB read: ${db.sourceDbRead.enabled ? "ENABLED" : "DISABLED"}`);
}

run().catch((error) => {
  console.error("Failed to generate refresh plan:", error.message || error);
  process.exitCode = 1;
});
