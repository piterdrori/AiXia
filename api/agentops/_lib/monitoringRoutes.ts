/**
 * AgentOps monitoring owner API — status, dry-run, latest report.
 * GET  /api/agentops/monitoring/status
 * POST /api/agentops/monitoring/dry-run
 * GET  /api/agentops/monitoring/reports/latest
 */

import { guardAgentOpsExecutionResponse } from "./agentopsStagingGuard.js";
import { jsonResponse } from "./ollamaProxy.js";
import { buildMonitoringOwnerStatus } from "../../../src/lib/agentops/runtime/agentOpsMonitoringStatusService.js";
import {
  readLatestMonitoringReport,
  summarizeMonitoringReport,
} from "../../../src/lib/agentops/runtime/agentOpsMonitoringReportReader.js";
import { runOwnerUiScheduledDryRun } from "../../../src/lib/agentops/runtime/agentOpsMonitoringScheduledWorker.js";
import { createAgentOpsRuntimeSupabaseClient } from "../../../src/lib/agentops/runtime/agentOpsRuntimeSupabase.js";

function methodNotAllowed(): Response {
  return jsonResponse({ ok: false, error: "Method not allowed" }, 405);
}

export async function handleMonitoringStatusRequest(request: Request): Promise<Response> {
  const blocked = guardAgentOpsExecutionResponse(process.env);
  if (blocked) return blocked;
  if (request.method !== "GET") return methodNotAllowed();

  const bootstrap = createAgentOpsRuntimeSupabaseClient();
  const client = bootstrap.ok ? bootstrap.client : null;
  const status = await buildMonitoringOwnerStatus(client);

  return jsonResponse({
    ok: true,
    environment: "staging",
    status,
  });
}

export async function handleMonitoringDryRunRequest(request: Request): Promise<Response> {
  const blocked = guardAgentOpsExecutionResponse(process.env);
  if (blocked) return blocked;
  if (request.method !== "POST") return methodNotAllowed();

  const result = await runOwnerUiScheduledDryRun();
  const summary = result.report ? summarizeMonitoringReport(result.report) : null;

  const writesSafe =
    summary == null ||
    (summary.actualIssuesCreated === 0 && summary.actualMemoryWrites === 0 && summary.dryRun);

  return jsonResponse(
    {
      ok: result.exitCode === 0 || result.exitCode === 2,
      environment: "staging",
      forcedDryRun: true,
      writesSafe,
      reportPath: result.reportPath,
      summary,
      report: result.report,
      exitCode: result.exitCode,
    },
    result.exitCode === 0 ? 200 : result.exitCode === 2 ? 207 : 503,
  );
}

export async function handleMonitoringLatestReportRequest(request: Request): Promise<Response> {
  const blocked = guardAgentOpsExecutionResponse(process.env);
  if (blocked) return blocked;
  if (request.method !== "GET") return methodNotAllowed();

  const latest = await readLatestMonitoringReport();
  if (!latest) {
    return jsonResponse({
      ok: true,
      environment: "staging",
      report: null,
      summary: null,
      message: "No monitoring reports found yet.",
    });
  }

  return jsonResponse({
    ok: true,
    environment: "staging",
    summary: latest.summary,
    report: latest.report,
  });
}

export async function routeMonitoringRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const rewrittenSubpath = url.searchParams.get("monitoringSubpath")?.replace(/^\/+|\/+$/g, "");
  const pathname = rewrittenSubpath
    ? `/api/agentops/monitoring/${rewrittenSubpath}`.replace(/\/+$/, "")
    : url.pathname.replace(/\/+$/, "");

  if (pathname === "/api/agentops/monitoring/status") {
    return handleMonitoringStatusRequest(request);
  }
  if (pathname === "/api/agentops/monitoring/dry-run") {
    return handleMonitoringDryRunRequest(request);
  }
  if (pathname === "/api/agentops/monitoring/reports/latest") {
    return handleMonitoringLatestReportRequest(request);
  }

  return jsonResponse({ ok: false, error: "Not found" }, 404);
}
