import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..");

const dryRunPath = path.join(repoRoot, "qa-agent", "memory-sync", "agent-memory-sync-dry-run.json");
const usersPath = path.join(repoRoot, "qa-agent", "browser-qa", "synthetic-browser-users.json");
const memoryDir = path.join(repoRoot, "qa-agent", "agent-memory");
const reportPath = path.join(
  repoRoot,
  "qa-agent",
  "memory-sync",
  "agent-memory-file-export-report.json",
);
const readmePath = path.join(memoryDir, "README.md");

const SENSITIVE_PATTERNS = [
  /password/i,
  /secret/i,
  /api[_\s-]?key/i,
  /supabase[_\s-]?anon[_\s-]?key/i,
  /service[_\s-]?role[_\s-]?key/i,
  /production credential/i,
  /payment credential/i,
];

const TYPE_GROUP_ORDER = [
  "instruction",
  "preference",
  "focus",
  "correction",
  "feature_idea",
  "blocked_behavior",
  "fix_instruction",
  "test_instruction",
  "memory_update",
];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function isSensitiveContent(text) {
  const value = String(text ?? "");
  return SENSITIVE_PATTERNS.some((pattern) => pattern.test(value));
}

function buildTypeBuckets() {
  return TYPE_GROUP_ORDER.reduce((acc, type) => {
    acc[type] = [];
    return acc;
  }, {});
}

function mapMemoryToBucketType(memory) {
  const rawType = String(memory.memoryType ?? "").toLowerCase();
  if (rawType.includes("instruction")) return "instruction";
  if (rawType.includes("preference")) return "preference";
  if (rawType.includes("focus")) return "focus";
  if (rawType.includes("correction")) return "correction";
  if (rawType.includes("feature")) return "feature_idea";
  if (rawType.includes("blocked")) return "blocked_behavior";
  return "instruction";
}

function mapInteractionToBucketType(interaction) {
  const messageType = String(interaction.messageType ?? "").toLowerCase();
  if (messageType === "fix_instruction") return "fix_instruction";
  if (messageType === "test_instruction") return "test_instruction";
  if (messageType === "memory_update") return "memory_update";
  if (messageType === "focus_directive") return "focus";
  if (messageType === "correction") return "correction";
  if (messageType === "feature_idea") return "feature_idea";
  return "instruction";
}

function lineFromItem(item, fallbackTypeLabel) {
  const createdAt = item.createdAt ? ` (${item.createdAt})` : "";
  const typeLabel = fallbackTypeLabel ? `[${fallbackTypeLabel}] ` : "";
  return `- ${typeLabel}${String(item.content ?? "").trim()}${createdAt}`;
}

function safeListOrFallback(lines, emptyText) {
  if (!lines.length) return `${emptyText}\n`;
  return `${lines.join("\n")}\n`;
}

function renderAgentFile(agent, user, buckets, safeInteractions) {
  const allowedModules = (user.allowedModules ?? []).length
    ? user.allowedModules.map((v) => `\`${v}\``).join(", ")
    : "None";
  const blockedModules = (user.blockedModules ?? []).length
    ? user.blockedModules.map((v) => `\`${v}\``).join(", ")
    : "None";
  const focusLines = (agent.focusDirectives ?? [])
    .map((item) => lineFromItem(item))
    .filter(Boolean);
  const interactionLines = safeInteractions.map((item) =>
    lineFromItem(item, String(item.messageType ?? "interaction")),
  );

  const groupedLines = TYPE_GROUP_ORDER.flatMap((type) => {
    const entries = buckets[type] ?? [];
    const header = `### ${type}`;
    if (!entries.length) return [header, "- No entries."];
    return [header, ...entries.map((entry) => lineFromItem(entry))];
  });

  return `# AgentOps Memory — ${agent.displayName}
## Status
Static memory file.
Generated from Stage 16D reviewed export.
No live sync.
No Hermes automation.
No final rulebook.

## Agent Identity
* Agent ID: ${agent.agentId}
* Display Name: ${agent.displayName}
* Synthetic Email: ${agent.syntheticEmail}
* Agent Skill / Specialty: ${agent.agentSkillSpecialty}
* App Role: ${agent.appRole}
* AgentOps Owner Access: ${agent.agentOpsOwnerAccess ? "Yes" : "No"}
* Allowed Modules: ${allowedModules}
* Blocked Modules: ${blockedModules}

## Current Focus
${safeListOrFallback(focusLines, "No current focus recorded yet.")}
## Memory Notes
${groupedLines.join("\n")}

## Interaction Notes
${safeListOrFallback(interactionLines, "No interaction notes recorded yet.")}
## Safety Notes
* No secrets should be stored here.
* No production credentials.
* No Personal ChatGPT memory.
* AgentOps memory remains separate from personal AI memory.
* This file is not a final rulebook.

## Future Sync Placeholder
This file may later be used as input for Cursor/Hermes memory workflows after Piter approval.
No live sync is active.
`;
}

function renderReadme() {
  return `# AgentOps Agent Memory Files

These are static AgentOps per-agent memory files.

- Generated from reviewed staging AgentOps DB memory dry-run output.
- Not final rulebooks.
- Not live synced.
- Do not activate Hermes.
- Do not activate CodeGraph.
- Must not contain secrets.
- Final 12-agent rulebooks remain postponed until the end of the whole AgentOps build.
`;
}

function main() {
  const generatedAt = new Date().toISOString();
  const dryRun = readJson(dryRunPath);
  const users = readJson(usersPath).users ?? [];
  const userById = new Map(users.map((u) => [u.qaUserId, u]));

  ensureDir(memoryDir);
  if (!fs.existsSync(readmePath)) {
    fs.writeFileSync(readmePath, renderReadme(), "utf8");
  }

  const filesCreated = [];
  const agentsExported = [];
  const skippedItems = [];
  let sensitiveWarningsCount = 0;

  for (const agent of dryRun.agents ?? []) {
    const agentId = agent.agentId;
    const filePath = path.join(memoryDir, `${agentId}.memory.md`);
    const user = userById.get(agentId) ?? { allowedModules: [], blockedModules: [] };
    const buckets = buildTypeBuckets();
    const safeInteractions = [];

    for (const memory of agent.memoryItems ?? []) {
      if (isSensitiveContent(memory.content)) {
        sensitiveWarningsCount += 1;
        skippedItems.push({
          agentId,
          itemType: "memory",
          itemId: memory.id ?? "unknown",
          reason: "sensitive_content_detected",
        });
        continue;
      }
      const bucketType = mapMemoryToBucketType(memory);
      buckets[bucketType].push(memory);
    }

    for (const interaction of agent.interactionNotes ?? []) {
      if (isSensitiveContent(interaction.content)) {
        sensitiveWarningsCount += 1;
        skippedItems.push({
          agentId,
          itemType: "interaction",
          itemId: interaction.id ?? "unknown",
          reason: "sensitive_content_detected",
        });
        continue;
      }
      safeInteractions.push(interaction);
      const bucketType = mapInteractionToBucketType(interaction);
      if (buckets[bucketType]) buckets[bucketType].push(interaction);
    }

    if (fs.existsSync(filePath)) {
      skippedItems.push({
        agentId,
        itemType: "file",
        itemId: `${agentId}.memory.md`,
        reason: "file_exists_no_overwrite",
      });
      continue;
    }

    const content = renderAgentFile(agent, user, buckets, safeInteractions);
    fs.writeFileSync(filePath, content, "utf8");
    filesCreated.push(path.relative(repoRoot, filePath));
    agentsExported.push(agentId);
  }

  const exportReport = {
    generatedAt,
    dryRunSource: path.relative(repoRoot, dryRunPath),
    filesCreated,
    agentsExported,
    skippedItems,
    sensitiveWarningsCount,
    hermesAutomation: false,
    codeGraphAutomation: false,
    finalRulebooksCreated: false,
    liveSyncActive: false,
  };

  fs.writeFileSync(reportPath, `${JSON.stringify(exportReport, null, 2)}\n`, "utf8");

  console.log("Agent memory file export complete.");
  console.log(`Agents exported: ${agentsExported.length}`);
  console.log(`Files created: ${filesCreated.length}`);
  console.log(`Sensitive warnings: ${sensitiveWarningsCount}`);
  console.log(`Report: ${path.relative(repoRoot, reportPath)}`);
}

main();
