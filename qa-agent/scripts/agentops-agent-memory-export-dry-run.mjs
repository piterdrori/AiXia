import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";
import { loadAgentOpsOwnerEnv } from "./load-agentops-owner-env.mjs";

const STAGING_PROJECT_REF = "ydppcpbxrvvardeslzrk";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..");

const usersPath = path.join(repoRoot, "qa-agent", "browser-qa", "synthetic-browser-users.json");
const outputPath = path.join(repoRoot, "qa-agent", "memory-sync", "agent-memory-sync-dry-run.json");

const QA_SPECIALTY_BY_QA_USER_ID = {
  "agentops-owner": "Final Council Chair and Implementation Planner",
  "platform-admin": "Business Logic and Operations Agent",
  "finance-admin": "Finance Workflow Agent",
  "finance-viewer": "Finance Read-Only and Reporting Agent",
  employee: "Synthetic User QA Agent",
  "hr-admin": "HR and People Operations Agent",
  "hr-employee": "HR Employee Self-Service Agent",
  manager: "Manager Review and Approval Agent",
  "ai-user": "Personal AI Productivity Agent",
  guest: "Design and UX Agent",
  "vendor-external": "Security, Permissions, and Tenant Isolation Agent",
  "tenant-admin": "Tenant Admin Platform Workflow Agent",
};

function loadEnvFile(envPath) {
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
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

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function safeMetadataObject(value) {
  return value && typeof value === "object" ? value : {};
}

async function tryReadDbData() {
  loadScriptEnv();
  const url = process.env.VITE_SUPABASE_URL ?? "";
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY ?? "";
  const ownerEmail = process.env.AGENTOPS_QA_OWNER_EMAIL ?? "";
  const ownerPassword = process.env.AGENTOPS_QA_OWNER_PASSWORD ?? "";

  if (!url || !anonKey || !ownerEmail || !ownerPassword) {
    return {
      enabled: false,
      reason:
        "Missing VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY/AGENTOPS_QA_OWNER_EMAIL/AGENTOPS_QA_OWNER_PASSWORD.",
      memoryRows: [],
      feedbackRows: [],
    };
  }

  if (!url.includes(STAGING_PROJECT_REF)) {
    return {
      enabled: false,
      reason: `Refusing DB read: VITE_SUPABASE_URL must point at staging (${STAGING_PROJECT_REF}).`,
      memoryRows: [],
      feedbackRows: [],
    };
  }

  const supabase = createClient(url, anonKey);
  const signIn = await supabase.auth.signInWithPassword({
    email: ownerEmail.trim(),
    password: ownerPassword,
  });

  if (signIn.error) {
    return {
      enabled: false,
      reason: `Owner sign-in failed: ${signIn.error.message}`,
      memoryRows: [],
      feedbackRows: [],
    };
  }

  const [memoryResult, feedbackResult] = await Promise.all([
    supabase
      .from("agentops_agent_memory")
      .select("id, agent_id, memory_type, memory_text, metadata, created_at")
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
      enabled: false,
      reason: `DB read failed: ${memoryResult.error?.message ?? feedbackResult.error?.message}`,
      memoryRows: [],
      feedbackRows: [],
    };
  }

  return {
    enabled: true,
    reason: "DB read succeeded using owner-authenticated staging credentials.",
    memoryRows: toArray(memoryResult.data),
    feedbackRows: toArray(feedbackResult.data),
  };
}

function groupAgentData(users, dbData, exportId, generatedAt) {
  const safetyWarnings = [
    "Do not export passwords, secrets, or credentials.",
    "Do not export private personal data.",
    "Dry-run only. No memory files are created.",
    "No Hermes or CodeGraph runtime calls are executed.",
    "Final rulebooks remain postponed.",
  ];

  return users.map((user) => {
    const agentId = user.qaUserId;
    const appRole = user.profileRole ?? user.intendedPlatformRole ?? "unknown";
    const skill = QA_SPECIALTY_BY_QA_USER_ID[agentId] ?? user.intendedAgentUse ?? "Unknown specialty";
    const targetFilePath = `qa-agent/agent-memory/${agentId}.memory.md`;

    const memoryRows = dbData.enabled
      ? dbData.memoryRows.filter((row) => row.agent_id === agentId)
      : [];

    const rawFeedback = dbData.enabled
      ? dbData.feedbackRows.filter((row) => {
          const meta = safeMetadataObject(row.metadata);
          return meta.agentId === agentId;
        })
      : [];

    const interactionRows = rawFeedback.filter((row) => {
      const meta = safeMetadataObject(row.metadata);
      return meta.action === "agent_interaction_note";
    });

    const statusRows = rawFeedback.filter((row) => {
      const meta = safeMetadataObject(row.metadata);
      return meta.action === "agent_status_update";
    });

    const memoryItems = memoryRows.map((row) => {
      const meta = safeMetadataObject(row.metadata);
      return {
        id: row.id,
        memoryType: row.memory_type,
        content: row.memory_text ?? "",
        createdAt: row.created_at,
        source: meta.source ?? "unknown",
        priority: meta.priority ?? "medium",
      };
    });

    const typedByInputMemoryType = (value) =>
      memoryRows
        .filter((row) => {
          const meta = safeMetadataObject(row.metadata);
          return meta.inputMemoryType === value;
        })
        .map((row) => ({
          id: row.id,
          content: row.memory_text ?? "",
          createdAt: row.created_at,
        }));

    const typedByMessageType = (value) =>
      interactionRows
        .filter((row) => {
          const meta = safeMetadataObject(row.metadata);
          return meta.messageType === value;
        })
        .map((row) => ({
          id: row.id,
          content: row.remark ?? "",
          createdAt: row.created_at,
        }));

    const interactionNotes = interactionRows.map((row) => {
      const meta = safeMetadataObject(row.metadata);
      return {
        id: row.id,
        messageType: meta.messageType ?? "piter_note",
        content: row.remark ?? "",
        priority: meta.priority ?? "medium",
        status: meta.interactionStatus ?? "logged",
        createdAt: row.created_at,
      };
    });

    const latestStatus =
      safeMetadataObject(statusRows[0]?.metadata).status ??
      safeMetadataObject(interactionRows[0]?.metadata).agentStatus ??
      "unknown";

    const totalEvidence = memoryItems.length + interactionNotes.length + statusRows.length;
    const syncStatus =
      totalEvidence === 0
        ? "skipped_no_memory"
        : dbData.enabled
          ? "ready_for_owner_review"
          : "dry_run_only";

    return {
      version: "1.0.0",
      exportId,
      generatedAt,
      dryRun: true,
      agentId,
      displayName: user.displayName,
      syntheticEmail: user.email,
      agentSkillSpecialty: skill,
      appRole,
      agentOpsOwnerAccess: Boolean(user.agentOpsOwnerAccess),
      memoryMode: "Database-only",
      memoryItems,
      focusDirectives: typedByInputMemoryType("focus").concat(typedByMessageType("focus_directive")),
      corrections: typedByInputMemoryType("correction").concat(typedByMessageType("correction")),
      featureIdeas: typedByInputMemoryType("feature_idea").concat(typedByMessageType("feature_idea")),
      fixInstructions: typedByMessageType("fix_instruction"),
      testInstructions: typedByMessageType("test_instruction"),
      blockedBehaviors: typedByInputMemoryType("blocked_behavior"),
      interactionNotes,
      latestStatus,
      sourceRecords: {
        memoryRecordCount: memoryItems.length,
        interactionRecordCount: interactionNotes.length,
        statusRecordCount: statusRows.length,
        dbReadMode: dbData.enabled ? "live_db" : "local_only",
      },
      safetyWarnings,
      targetFilePath,
      syncStatus,
    };
  });
}

function mainSummary(agents, dbData) {
  const totalMemory = agents.reduce((sum, agent) => sum + agent.sourceRecords.memoryRecordCount, 0);
  const totalInteractions = agents.reduce(
    (sum, agent) => sum + agent.sourceRecords.interactionRecordCount,
    0,
  );
  return {
    dryRun: true,
    dbRead: {
      enabled: dbData.enabled,
      reason: dbData.reason,
    },
    agentsCount: agents.length,
    totalMemoryRecords: totalMemory,
    totalInteractionRecords: totalInteractions,
  };
}

async function run() {
  const usersJson = JSON.parse(fs.readFileSync(usersPath, "utf8"));
  const users = toArray(usersJson.users);
  const exportId = `agentops-stage-16c-${Date.now()}`;
  const generatedAt = new Date().toISOString();

  const dbData = await tryReadDbData();
  const agents = groupAgentData(users, dbData, exportId, generatedAt);
  const payload = {
    version: "1.0.0",
    exportId,
    generatedAt,
    dryRun: true,
    memoryMode: "Database-only",
    dbRead: {
      enabled: dbData.enabled,
      reason: dbData.reason,
    },
    summary: mainSummary(agents, dbData),
    agents,
  };

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");

  console.log("AgentOps agent memory export dry-run complete.");
  console.log(`Output: ${path.relative(repoRoot, outputPath)}`);
  console.log(`Agents: ${agents.length}`);
  console.log(`DB read: ${dbData.enabled ? "ENABLED" : "SKIPPED"}`);
  console.log(`Reason: ${dbData.reason}`);
}

run().catch((error) => {
  console.error("Dry-run failed:", error.message || error);
  process.exitCode = 1;
});
