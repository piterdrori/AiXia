/**
 * Whitelisted Evidence Tools execution — local/staging owner-triggered only.
 * Browser sends toolId + action enum only; this module maps to exact invocations.
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

const REPO_ROOT = process.cwd();
const COMMAND_TIMEOUT_MS = 15 * 60 * 1000;
const MAX_OUTPUT_CHARS = 6000;
const REPORTS_ROOT = path.join(REPO_ROOT, "qa-agent", "reports");
const VERIFICATION_REPORT_JSON = path.join(
  REPO_ROOT,
  "qa-agent",
  "reports",
  "verification",
  "verification-foundation-run.json",
);

/** @type {Map<string, object>} */
const lastRunByKey = new Map();

export const EVIDENCE_TOOL_IDS = [
  "browser-qa",
  "playwright",
  "reports",
  "guardrails",
  "verification-results",
];

export const EVIDENCE_TOOL_ACTIONS = {
  "browser-qa": ["run_browser_qa_foundation"],
  playwright: ["run_playwright_smoke"],
  reports: ["refresh_report_index"],
  guardrails: ["run_guardrails"],
  "verification-results": ["refresh_verification_results"],
};

const WHITELIST = {
  "browser-qa": {
    run_browser_qa_foundation: {
      label: "npm run qa:agentops-browser-foundation",
      argv: ["node", "qa-agent/scripts/agentops-browser-qa-runner.mjs"],
      artifactPaths: [
        "qa-agent/reports/browser-qa/browser-qa-foundation-run.json",
        "qa-agent/reports/browser-qa/browser-qa-foundation-run.md",
      ],
    },
  },
  playwright: {
    run_playwright_smoke: {
      label: "npm run qa:agentops-playwright-smoke-fast",
      argv: ["npm", "run", "qa:agentops-playwright-smoke-fast"],
      shell: true,
      artifactPaths: [
        "qa-agent/reports/browser-qa/browser-smoke-report.json",
        "qa-agent/reports/browser-qa/browser-smoke-report.md",
      ],
    },
  },
  guardrails: {
    run_guardrails: {
      label: "node scripts/aixia-guardrails.mjs",
      argv: ["node", "scripts/aixia-guardrails.mjs"],
      artifactPaths: [],
    },
  },
  reports: {
    refresh_report_index: {
      label: "Refresh report index (read-only)",
      type: "report_index",
    },
  },
  "verification-results": {
    refresh_verification_results: {
      label: "Refresh verification evidence (read-only)",
      type: "verification_index",
    },
  },
};

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

export function isEvidenceToolsRunnerAllowed(env = process.env) {
  const vercelEnv = readEnv(env, "VERCEL_ENV");
  if (vercelEnv === "production") return false;

  const explicitBlock = readEnv(env, "AGENTOPS_EVIDENCE_TOOLS_RUNNER");
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

function walkReportFiles(dir, base = REPORTS_ROOT, depth = 0) {
  if (!fs.existsSync(dir) || depth > 6) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkReportFiles(full, base, depth + 1));
      continue;
    }
    if (!/\.(json|md|txt)$/i.test(entry.name)) continue;
    const rel = path.relative(REPO_ROOT, full).replaceAll("\\", "/");
    const stat = fs.statSync(full);
    files.push({
      path: rel,
      sizeBytes: stat.size,
      modifiedAt: stat.mtime.toISOString(),
    });
  }
  return files;
}

async function refreshReportIndex() {
  const startedAt = new Date().toISOString();
  const startMs = Date.now();
  const files = walkReportFiles(REPORTS_ROOT);
  files.sort((a, b) => new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime());
  const finishedAt = new Date().toISOString();
  const summary = files.length
    ? `Indexed ${files.length} report artifact(s) under qa-agent/reports/.`
    : "No report artifacts found under qa-agent/reports/.";
  const stdoutPreview = [
    summary,
    ...files.slice(0, 40).map((f) => `- ${f.path} (${f.sizeBytes} bytes, ${f.modifiedAt})`),
    files.length > 40 ? `…and ${files.length - 40} more` : "",
  ]
    .filter(Boolean)
    .join("\n");

  return buildRunResult({
    ok: true,
    toolId: "reports",
    action: "refresh_report_index",
    status: "passed",
    commandLabel: WHITELIST.reports.refresh_report_index.label,
    startedAt,
    finishedAt,
    durationMs: Date.now() - startMs,
    stdoutPreview: sanitizeOutput(stdoutPreview),
    stderrPreview: "",
    artifactPaths: files.slice(0, 50).map((f) => f.path),
    extra: { reportIndexCount: files.length },
  });
}

async function refreshVerificationIndex(env) {
  const startedAt = new Date().toISOString();
  const startMs = Date.now();
  const lines = [];
  const artifactPaths = [];

  if (fs.existsSync(VERIFICATION_REPORT_JSON)) {
    artifactPaths.push("qa-agent/reports/verification/verification-foundation-run.json");
    try {
      const report = JSON.parse(fs.readFileSync(VERIFICATION_REPORT_JSON, "utf8"));
      lines.push("Local verification foundation report found.");
      if (typeof report.summary === "string") lines.push(report.summary);
      if (Array.isArray(report.targets)) {
        lines.push(`Targets in report: ${report.targets.length}`);
      }
    } catch (error) {
      lines.push(
        `Local verification report exists but could not be parsed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  } else {
    lines.push("No local verification foundation report at qa-agent/reports/verification/.");
  }

  const supabaseUrl = readEnv(env, "VITE_SUPABASE_URL");
  const supabaseKey =
    readEnv(env, "SUPABASE_SERVICE_ROLE_KEY") ?? readEnv(env, "VITE_SUPABASE_ANON_KEY");

  if (supabaseUrl && supabaseKey) {
    try {
      const url = `${supabaseUrl.replace(/\/+$/, "")}/rest/v1/agentops_verifications?select=id,issue_code,status,created_at&order=created_at.desc&limit=25`;
      const response = await fetch(url, {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
      });
      if (response.ok) {
        const rows = await response.json();
        if (Array.isArray(rows) && rows.length > 0) {
          lines.push(`Supabase agentops_verifications: ${rows.length} recent row(s) (read-only).`);
          for (const row of rows.slice(0, 15)) {
            lines.push(
              `- ${row.issue_code ?? row.id}: ${row.status ?? "unknown"} (${row.created_at ?? "?"})`,
            );
          }
        } else {
          lines.push("Supabase agentops_verifications: no rows returned (read-only).");
        }
      } else {
        lines.push(`Supabase read-only query failed: HTTP ${response.status}`);
      }
    } catch (error) {
      lines.push(
        `Supabase read-only query error: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  } else {
    lines.push("Supabase not configured for server verification read — local report only.");
  }

  const finishedAt = new Date().toISOString();
  const stdoutPreview = sanitizeOutput(lines.join("\n"));

  return buildRunResult({
    ok: true,
    toolId: "verification-results",
    action: "refresh_verification_results",
    status: "passed",
    commandLabel: WHITELIST["verification-results"].refresh_verification_results.label,
    startedAt,
    finishedAt,
    durationMs: Date.now() - startMs,
    stdoutPreview,
    stderrPreview: "",
    artifactPaths,
  });
}

function runSpawnCommand(toolId, action, spec) {
  const startedAt = new Date().toISOString();
  const startMs = Date.now();

  return new Promise((resolve) => {
    const child = spawn(spec.argv[0], spec.argv.slice(1), {
      cwd: REPO_ROOT,
      env: { ...process.env },
      windowsHide: true,
      shell: Boolean(spec.shell),
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
            stderrPreview: sanitizeOutput(stderr || `Command timed out after ${COMMAND_TIMEOUT_MS}ms.`),
            artifactPaths,
          }),
        );
        return;
      }

      const passed = code === 0;
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
          stdoutPreview: sanitizeOutput(stdout || (passed ? "Command completed." : "")),
          stderrPreview: sanitizeOutput(stderr),
          artifactPaths,
        }),
      );
    });
  });
}

export async function runEvidenceToolAction(toolId, action, env = process.env) {
  if (!EVIDENCE_TOOL_IDS.includes(toolId)) {
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

  const toolActions = WHITELIST[toolId];
  const spec = toolActions?.[action];
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

  let result;
  if (spec.type === "report_index") {
    result = await refreshReportIndex();
  } else if (spec.type === "verification_index") {
    result = await refreshVerificationIndex(env);
  } else {
    result = await runSpawnCommand(toolId, action, spec);
  }

  lastRunByKey.set(`${toolId}:${action}`, result);
  return result;
}

export function getEvidenceToolsRunnerStatus(env = process.env) {
  const available = isEvidenceToolsRunnerAllowed(env);
  const stagingGuard = evaluateAgentOpsStagingGuard(env);
  const executionAvailable = available && stagingGuard.ok;
  return {
    ok: true,
    available: executionAvailable,
    stagingOnly: true,
    productionBlocked: true,
    ...stagingGuardStatusPayload(env),
    tools: EVIDENCE_TOOL_IDS.map((toolId) => ({
      toolId,
      actions: EVIDENCE_TOOL_ACTIONS[toolId] ?? [],
      lastRun: lastRunByKey.get(`${toolId}:${(EVIDENCE_TOOL_ACTIONS[toolId] ?? [])[0]}`) ?? null,
    })),
    safetyGates: [
      "production_blocked",
      "whitelisted_commands_only",
      "no_arbitrary_shell",
      "no_issue_mutation",
      "no_sot_writes",
      "no_durable_memory_writes",
      "owner_triggered_only",
    ],
    rejectionReason: executionAvailable
      ? null
      : stagingGuard.reason ??
        (available
          ? null
          : "Evidence Tools runner is disabled in production."),
    safety: SAFETY_BLOCK,
  };
}

export async function handleEvidenceToolsRequest(request, env = process.env) {
  if (request.method === "GET") {
    return Response.json(getEvidenceToolsRunnerStatus(env));
  }

  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  const stagingBlocked = guardAgentOpsExecutionResponse(env);
  if (stagingBlocked) return stagingBlocked;

  if (!isEvidenceToolsRunnerAllowed(env)) {
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

  const result = await runEvidenceToolAction(toolId, action, env);
  const statusCode = result.status === "blocked" ? 400 : result.ok ? 200 : 500;
  return Response.json(result, { status: statusCode });
}
