/**
 * Whitelisted Code / Context Tools execution — local/staging owner-triggered only.
 */

import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import {
  evaluateAgentOpsStagingGuard,
  guardAgentOpsExecutionResponse,
  stagingGuardStatusPayload,
} from "./agentops-staging-guard.mjs";

import { probeClaudeContextSetup } from "./agentops-claude-context-probe.mjs";
import { probeCodegraphStatus } from "./agentops-codegraph-status.mjs";
import { probeUnderstandAnythingSetup } from "./agentops-understand-anything-scan.mjs";

const REPO_ROOT = process.cwd();
const COMMAND_TIMEOUT_MS = 15 * 60 * 1000;
const MAX_OUTPUT_CHARS = 6000;

/** @type {Map<string, object>} */
const lastRunByKey = new Map();

export const CODE_CONTEXT_TOOL_IDS = [
  "codegraph",
  "understand-anything",
  "claude-context",
];

export const CODE_CONTEXT_TOOL_ACTIONS = {
  codegraph: ["refresh_codegraph_status"],
  "understand-anything": ["run_understand_anything_summary"],
  "claude-context": [
    "run_claude_context_summary",
    "run_claude_context_semantic_summary",
  ],
};

const WHITELIST = {
  codegraph: {
    refresh_codegraph_status: {
      label: "node scripts/agentops-codegraph-status.mjs",
      argv: ["node", "scripts/agentops-codegraph-status.mjs"],
      artifactPaths: [
        "qa-agent/reports/code-context/codegraph-status-summary.json",
        "qa-agent/reports/code-context/codegraph-status-summary.md",
      ],
    },
  },
  "understand-anything": {
    run_understand_anything_summary: {
      label: "node scripts/agentops-understand-anything-scan.mjs",
      argv: ["node", "scripts/agentops-understand-anything-scan.mjs"],
      artifactPaths: [
        "qa-agent/reports/code-context/understand-anything-scan-result.json",
        "qa-agent/reports/code-context/understand-anything-scan-result.md",
      ],
    },
  },
  "claude-context": {
    run_claude_context_summary: {
      label: "node scripts/agentops-claude-context-probe.mjs",
      argv: ["node", "scripts/agentops-claude-context-probe.mjs"],
      artifactPaths: [
        "qa-agent/reports/code-context/claude-context-summary.json",
        "qa-agent/reports/code-context/claude-context-summary.md",
      ],
    },
    run_claude_context_semantic_summary: {
      label: "node scripts/agentops-claude-context-semantic-summary.mjs",
      argv: ["node", "scripts/agentops-claude-context-semantic-summary.mjs"],
      artifactPaths: [
        "qa-agent/reports/code-context/claude-context-semantic-summary.json",
        "qa-agent/reports/code-context/claude-context-semantic-summary.md",
      ],
    },
  },
};

function resolveSetupProbe(toolId) {
  if (toolId === "understand-anything") return probeUnderstandAnythingSetup();
  if (toolId === "codegraph") return probeCodegraphStatus();
  if (toolId === "claude-context") return probeClaudeContextSetup();
  return null;
}

const SAFETY_BLOCK = {
  productionBlocked: true,
  arbitraryCommandsBlocked: true,
  memoryWritesBlocked: true,
  sotWritesBlocked: true,
  agentMemoryWritesBlocked: true,
  issueMutationBlocked: true,
};

function readEnv(env, name) {
  const value = env[name] ?? process.env[name];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export function isCodeContextToolsRunnerAllowed(env = process.env) {
  const vercelEnv = readEnv(env, "VERCEL_ENV");
  if (vercelEnv === "production") return false;

  const explicitBlock = readEnv(env, "AGENTOPS_CODE_CONTEXT_TOOLS_RUNNER");
  if (explicitBlock === "false" || explicitBlock === "0") return false;
  if (explicitBlock === "true" || explicitBlock === "1") return true;

  const nodeEnv = readEnv(env, "NODE_ENV");
  if (nodeEnv === "production" && vercelEnv !== "preview" && vercelEnv !== "development") {
    return false;
  }

  return true;
}

function sanitizeOutput(text) {
  if (!text) return "";
  let sanitized = text
    .replace(/sk-[a-zA-Z0-9_-]{8,}/g, "[redacted]")
    .replace(/ARK_API_KEY=\S+/gi, "[redacted]")
    .replace(/SUPABASE_[A-Z_]+=\S+/g, "[redacted]")
    .replace(/Bearer\s+\S+/gi, "Bearer [redacted]")
    .replace(/eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g, "[redacted-jwt]");
  if (sanitized.length > MAX_OUTPUT_CHARS) {
    sanitized = `…(truncated)\n${sanitized.slice(-MAX_OUTPUT_CHARS)}`;
  }
  return sanitized.trim();
}

function existingArtifactPaths(paths) {
  return (paths ?? []).filter((rel) => fs.existsSync(path.join(REPO_ROOT, rel)));
}

function buildRunResult({
  ok,
  toolId,
  action,
  status,
  commandLabel,
  startedAt,
  finishedAt,
  durationMs,
  stdoutPreview,
  stderrPreview,
  artifactPaths,
  learningCandidateAvailable,
  extra,
}) {
  return {
    ok,
    toolId,
    action,
    status,
    commandLabel,
    startedAt,
    finishedAt,
    durationMs,
    stdoutPreview,
    stderrPreview,
    artifactPaths,
    learningCandidateAvailable: learningCandidateAvailable ?? true,
    safety: SAFETY_BLOCK,
    ...extra,
  };
}

function runSpawnCommand(toolId, action, spec) {
  const startedAt = new Date().toISOString();
  const startMs = Date.now();

  return new Promise((resolve) => {
    const child = spawn(spec.argv[0], spec.argv.slice(1), {
      cwd: REPO_ROOT,
      env: { ...process.env },
      windowsHide: true,
      shell: false,
    });

    let stdout = "";
    let stderr = "";
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
    }, COMMAND_TIMEOUT_MS);

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      clearTimeout(timer);
      const finishedAt = new Date().toISOString();
      resolve(
        buildRunResult({
          ok: false,
          toolId,
          action,
          status: "failed",
          commandLabel: spec.label,
          startedAt,
          finishedAt,
          durationMs: Date.now() - startMs,
          stdoutPreview: sanitizeOutput(stdout),
          stderrPreview: sanitizeOutput(error.message),
          artifactPaths: existingArtifactPaths(spec.artifactPaths),
          learningCandidateAvailable: false,
        }),
      );
    });

    child.on("close", (code) => {
      clearTimeout(timer);
      const finishedAt = new Date().toISOString();
      const artifactPaths = existingArtifactPaths(spec.artifactPaths);

      if (timedOut) {
        resolve(
          buildRunResult({
            ok: false,
            toolId,
            action,
            status: "failed",
            commandLabel: spec.label,
            startedAt,
            finishedAt,
            durationMs: Date.now() - startMs,
            stdoutPreview: sanitizeOutput(stdout),
            stderrPreview: sanitizeOutput(
              stderr || `Command timed out after ${COMMAND_TIMEOUT_MS}ms.`,
            ),
            artifactPaths,
            learningCandidateAvailable: false,
          }),
        );
        return;
      }

      if (code === 2) {
        const probe = resolveSetupProbe(toolId);
        const missingText =
          probe?.missingSteps?.map((s) => `- ${s}`).join("\n") ||
          stderr ||
          "Setup required before this action can complete.";
        resolve(
          buildRunResult({
            ok: false,
            toolId,
            action,
            status: "setup_required",
            commandLabel: spec.label,
            startedAt,
            finishedAt,
            durationMs: Date.now() - startMs,
            stdoutPreview: sanitizeOutput(stdout),
            stderrPreview: sanitizeOutput(missingText),
            artifactPaths,
            learningCandidateAvailable: false,
            setupProbe: probe ?? undefined,
          }),
        );
        return;
      }

      const passed = code === 0;
      const probe = toolId === "claude-context" ? resolveSetupProbe(toolId) : undefined;
      resolve(
        buildRunResult({
          ok: passed,
          toolId,
          action,
          status: passed ? "passed" : "failed",
          commandLabel: spec.label,
          startedAt,
          finishedAt,
          durationMs: Date.now() - startMs,
          stdoutPreview: sanitizeOutput(stdout || (passed ? "Scan completed." : "")),
          stderrPreview: sanitizeOutput(stderr),
          artifactPaths,
          learningCandidateAvailable: passed,
          extra: probe ? { setupProbe: probe } : undefined,
        }),
      );
    });
  });
}

export async function runCodeContextToolAction(toolId, action, env = process.env) {
  if (!CODE_CONTEXT_TOOL_IDS.includes(toolId)) {
    return buildRunResult({
      ok: false,
      toolId,
      action,
      status: "blocked",
      commandLabel: "unknown",
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      durationMs: 0,
      stdoutPreview: "Unknown tool id.",
      stderrPreview: "Tool id is not whitelisted.",
      artifactPaths: [],
      learningCandidateAvailable: false,
    });
  }

  const spec = WHITELIST[toolId]?.[action];
  if (!spec) {
    return buildRunResult({
      ok: false,
      toolId,
      action,
      status: "blocked",
      commandLabel: "unknown",
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      durationMs: 0,
      stdoutPreview: "Unknown action.",
      stderrPreview: "Action is not whitelisted for this tool.",
      artifactPaths: [],
      learningCandidateAvailable: false,
    });
  }

  const result = await runSpawnCommand(toolId, action, spec);
  lastRunByKey.set(`${toolId}:${action}`, result);
  return result;
}

export function getCodeContextToolsRunnerStatus(env = process.env) {
  const available = isCodeContextToolsRunnerAllowed(env);
  const stagingGuard = evaluateAgentOpsStagingGuard(env);
  const executionAvailable = available && stagingGuard.ok;
  const understandAnything = probeUnderstandAnythingSetup();
  const codegraph = probeCodegraphStatus();
  const claudeContext = probeClaudeContextSetup();

  return {
    ok: true,
    available: executionAvailable,
    stagingOnly: true,
    productionBlocked: true,
    ...stagingGuardStatusPayload(env),
    tools: CODE_CONTEXT_TOOL_IDS.map((toolId) => {
      const actions = CODE_CONTEXT_TOOL_ACTIONS[toolId] ?? [];
      const lastRuns = Object.fromEntries(
        actions.map((action) => [action, lastRunByKey.get(`${toolId}:${action}`) ?? null]),
      );
      return {
        toolId,
        actions,
        lastRuns,
        lastRun: lastRuns[actions[0]] ?? null,
      };
    }),
    understandAnything,
    codegraph,
    claudeContext,
    safetyGates: [
      "production_blocked",
      "whitelisted_commands_only",
      "no_arbitrary_shell",
      "no_issue_mutation",
      "no_sot_writes",
      "no_durable_memory_writes",
      "owner_triggered_only",
      "read_only_scan_only",
    ],
    rejectionReason: executionAvailable
      ? null
      : stagingGuard.reason ??
        (available ? null : "Code / Context Tools runner is disabled in production."),
    safety: SAFETY_BLOCK,
  };
}

export async function handleCodeContextToolsRequest(request, env = process.env) {
  if (request.method === "GET") {
    return Response.json(getCodeContextToolsRunnerStatus(env));
  }

  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  const stagingBlocked = guardAgentOpsExecutionResponse(env);
  if (stagingBlocked) return stagingBlocked;

  if (!isCodeContextToolsRunnerAllowed(env)) {
    return Response.json(
      buildRunResult({
        ok: false,
        toolId: "unknown",
        action: "unknown",
        status: "blocked",
        commandLabel: "blocked",
        startedAt: new Date().toISOString(),
        finishedAt: new Date().toISOString(),
        durationMs: 0,
        stdoutPreview: "",
        stderrPreview: "Rejected: production or runner disabled.",
        artifactPaths: [],
        learningCandidateAvailable: false,
      }),
      { status: 403 },
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const toolId = typeof body?.toolId === "string" ? body.toolId.trim() : "";
  const action = typeof body?.action === "string" ? body.action.trim() : "";

  if (
    body.command !== undefined ||
    body.shell !== undefined ||
    body.script !== undefined ||
    body.argv !== undefined
  ) {
    return Response.json(
      buildRunResult({
        ok: false,
        toolId: toolId || "unknown",
        action: action || "unknown",
        status: "blocked",
        commandLabel: "rejected",
        startedAt: new Date().toISOString(),
        finishedAt: new Date().toISOString(),
        durationMs: 0,
        stdoutPreview: "",
        stderrPreview: "Raw command fields are not accepted.",
        artifactPaths: [],
        learningCandidateAvailable: false,
      }),
      { status: 400 },
    );
  }

  if (!toolId || !action) {
    return Response.json({ error: "toolId and action are required" }, { status: 400 });
  }

  const result = await runCodeContextToolAction(toolId, action, env);
  const statusCode =
    result.status === "blocked" ? 400 : result.status === "setup_required" ? 200 : result.ok ? 200 : 500;
  return Response.json(result, { status: statusCode });
}
