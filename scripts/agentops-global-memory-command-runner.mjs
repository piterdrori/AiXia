/**
 * Whitelisted read-only global memory scan commands — local/staging dev only.
 * Browser sends commandId enum only; this module maps to exact npm/node invocations.
 */

import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const REPO_ROOT = process.cwd();

const COMMAND_TIMEOUT_MS = 10 * 60 * 1000;
const MAX_OUTPUT_CHARS = 4000;

export const GLOBAL_MEMORY_COMMAND_IDS = [
  "static_discovery",
  "static_design_guardrails",
  "guardrail_action_plan",
  "full_read_only_scan",
];

const WHITELIST = {
  static_discovery: {
    label: "Static discovery",
    argv: ["node", "qa-agent/scripts/static-app-discovery.mjs"],
    reportPaths: [
      "qa-agent/reports/static-app-discovery.json",
      "qa-agent/reports/static-app-discovery.md",
    ],
  },
  static_design_guardrails: {
    label: "Static design guardrails",
    argv: ["node", "qa-agent/scripts/static-design-guardrails.mjs"],
    reportPaths: [
      "qa-agent/reports/static-design-guardrails.json",
      "qa-agent/reports/static-design-guardrails.md",
    ],
  },
  guardrail_action_plan: {
    label: "Guardrail action plan",
    argv: ["node", "qa-agent/scripts/generate-guardrail-action-plan.mjs"],
    reportPaths: [
      "qa-agent/reports/guardrail-action-plan.json",
      "qa-agent/reports/guardrail-action-plan.md",
    ],
  },
  full_read_only_scan: {
    label: "Full read-only scan",
    sequence: ["static_discovery", "static_design_guardrails", "guardrail_action_plan"],
    reportPaths: [
      "qa-agent/reports/static-app-discovery.json",
      "qa-agent/reports/static-app-discovery.md",
      "qa-agent/reports/static-design-guardrails.json",
      "qa-agent/reports/static-design-guardrails.md",
      "qa-agent/reports/guardrail-action-plan.json",
      "qa-agent/reports/guardrail-action-plan.md",
    ],
  },
};

function readEnv(env, name) {
  const value = env[name] ?? process.env[name];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export function isGlobalMemoryCommandRunnerAllowed(env = process.env) {
  const vercelEnv = readEnv(env, "VERCEL_ENV");
  if (vercelEnv === "production") return false;

  const explicitBlock = readEnv(env, "AGENTOPS_GLOBAL_MEMORY_COMMAND_RUNNER");
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
    .replace(/SUPABASE_[A-Z_]+=\S+/g, "[redacted]")
    .replace(/Bearer\s+\S+/gi, "Bearer [redacted]");
  if (sanitized.length > MAX_OUTPUT_CHARS) {
    sanitized = `…(truncated)\n${sanitized.slice(-MAX_OUTPUT_CHARS)}`;
  }
  return sanitized.trim();
}

function existingReportPaths(paths) {
  return paths.filter((rel) => fs.existsSync(path.join(REPO_ROOT, rel)));
}

function runSingleCommand(commandId) {
  const spec = WHITELIST[commandId];
  if (!spec?.argv) {
    return Promise.resolve({
      ok: false,
      status: "rejected",
      commandId,
      errorMessage: "Unknown command id.",
    });
  }

  const startedAt = new Date().toISOString();
  const startMs = Date.now();

  return new Promise((resolve) => {
    const child = spawn(spec.argv[0], spec.argv.slice(1), {
      cwd: REPO_ROOT,
      env: { ...process.env },
      windowsHide: true,
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
      resolve({
        ok: false,
        status: "failed",
        commandId,
        label: spec.label,
        startedAt,
        finishedAt,
        durationMs: Date.now() - startMs,
        outputSummary: sanitizeOutput(error.message),
        reportPaths: existingReportPaths(spec.reportPaths ?? []),
        errorMessage: error.message,
      });
    });

    child.on("close", (code) => {
      clearTimeout(timer);
      const finishedAt = new Date().toISOString();
      const combined = sanitizeOutput(
        [stdout, stderr].filter(Boolean).join("\n") ||
          (code === 0 ? "Command completed with no output." : "Command failed."),
      );
      const reportPaths = existingReportPaths(spec.reportPaths ?? []);

      if (timedOut) {
        resolve({
          ok: false,
          status: "failed",
          commandId,
          label: spec.label,
          startedAt,
          finishedAt,
          durationMs: Date.now() - startMs,
          outputSummary: combined || "Command timed out.",
          reportPaths,
          errorMessage: `Command timed out after ${COMMAND_TIMEOUT_MS}ms.`,
        });
        return;
      }

      if (code !== 0) {
        resolve({
          ok: false,
          status: "failed",
          commandId,
          label: spec.label,
          startedAt,
          finishedAt,
          durationMs: Date.now() - startMs,
          outputSummary: combined,
          reportPaths,
          errorMessage: `Exit code ${code ?? "unknown"}.`,
        });
        return;
      }

      resolve({
        ok: true,
        status: "success",
        commandId,
        label: spec.label,
        startedAt,
        finishedAt,
        durationMs: Date.now() - startMs,
        outputSummary:
          combined ||
          `Read-only scan command completed. Reports: ${reportPaths.join(", ") || "none detected"}. Hermes memory was not updated automatically.`,
        reportPaths,
      });
    });
  });
}

async function runFullReadOnlyScan() {
  const spec = WHITELIST.full_read_only_scan;
  const startedAt = new Date().toISOString();
  const startMs = Date.now();
  const stepResults = [];

  for (const stepId of spec.sequence) {
    const stepResult = await runSingleCommand(stepId);
    stepResults.push(stepResult);
    if (!stepResult.ok) {
      const finishedAt = new Date().toISOString();
      return {
        ok: false,
        status: "failed",
        commandId: "full_read_only_scan",
        label: spec.label,
        startedAt,
        finishedAt,
        durationMs: Date.now() - startMs,
        outputSummary: sanitizeOutput(
          [
            `Full read-only scan stopped at step: ${stepResult.label ?? stepId}.`,
            stepResult.outputSummary,
          ].join("\n"),
        ),
        reportPaths: existingReportPaths(spec.reportPaths),
        errorMessage: stepResult.errorMessage ?? `Step ${stepId} failed.`,
        steps: stepResults,
      };
    }
  }

  const finishedAt = new Date().toISOString();
  return {
    ok: true,
    status: "success",
    commandId: "full_read_only_scan",
    label: spec.label,
    startedAt,
    finishedAt,
    durationMs: Date.now() - startMs,
    outputSummary:
      "Read-only scan command sequence completed. Reports were generated/updated under qa-agent/reports. Hermes memory was not updated automatically.",
    reportPaths: existingReportPaths(spec.reportPaths),
    fullCliScanConfirmed: true,
    steps: stepResults,
  };
}

export async function runGlobalMemoryWhitelistedCommand(commandId) {
  if (!GLOBAL_MEMORY_COMMAND_IDS.includes(commandId)) {
    return {
      ok: false,
      status: "rejected",
      commandId,
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      durationMs: 0,
      outputSummary: "Unknown command id.",
      errorMessage: "Command id is not whitelisted.",
    };
  }

  if (commandId === "full_read_only_scan") {
    return runFullReadOnlyScan();
  }

  return runSingleCommand(commandId);
}

export function getGlobalMemoryCommandRunnerStatus(env = process.env) {
  const available = isGlobalMemoryCommandRunnerAllowed(env);
  return {
    available,
    stagingOnly: true,
    allowedCommandIds: GLOBAL_MEMORY_COMMAND_IDS,
    rejectionReason: available
      ? null
      : "Local command runner is disabled in production. Use copy-command fallback.",
  };
}

export async function handleGlobalMemoryRunCommandRequest(request, env = process.env) {
  if (request.method === "GET") {
    return Response.json(getGlobalMemoryCommandRunnerStatus(env));
  }

  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  if (!isGlobalMemoryCommandRunnerAllowed(env)) {
    return Response.json(
      {
        ok: false,
        status: "rejected",
        commandId: null,
        startedAt: new Date().toISOString(),
        finishedAt: new Date().toISOString(),
        durationMs: 0,
        outputSummary: "Local command runner unavailable in production.",
        errorMessage: "Rejected: production or runner disabled.",
      },
      { status: 403 },
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const commandId = typeof body?.commandId === "string" ? body.commandId.trim() : "";
  if (!commandId) {
    return Response.json({ error: "commandId is required" }, { status: 400 });
  }

  if (body.command !== undefined || body.shell !== undefined || body.script !== undefined) {
    return Response.json(
      {
        ok: false,
        status: "rejected",
        commandId,
        errorMessage: "Raw command fields are not accepted.",
      },
      { status: 400 },
    );
  }

  const result = await runGlobalMemoryWhitelistedCommand(commandId);
  const statusCode = result.status === "rejected" ? 400 : result.ok ? 200 : 500;
  return Response.json(result, { status: statusCode });
}
