import type { IncomingMessage, ServerResponse } from "node:http";
import type { Plugin } from "vite";
import { loadEnv } from "vite";

// Dev-only plain JS handlers (see agentops-api-dev-handlers.mjs)
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — no TS module for .mjs dev helper
import { createAgentOpsDevApiHandlers } from "./agentops-api-dev-handlers.mjs";

function readRequestBody(req: IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

async function writeFetchResponse(res: ServerResponse, response: Response): Promise<void> {
  res.statusCode = response.status;
  response.headers.forEach((value, key) => {
    res.setHeader(key, value);
  });
  const body = Buffer.from(await response.arrayBuffer());
  res.end(body);
}

/**
 * Serves non-LLM AgentOps API routes during `npm run dev`.
 * LLM (`/api/agentops/llm`) is owned by the Express backend on port 3001 — see `server/index.ts`.
 */
export function agentOpsApiDevPlugin(): Plugin {
  return {
    name: "agentops-api-dev",
    configureServer(server) {
      // Vite loadEnv does not override keys already present in process.env (e.g. stale shell exports).
      // Clear Chat & Voice provider keys so .env.local updates apply after dev:restart.
      for (const key of Object.keys(process.env)) {
        if (
          key.startsWith("DOUBAO_") ||
          key.startsWith("AGENTOPS_DOUBAO_") ||
          key.startsWith("AGENTOPS_SUPERTONIC_")
        ) {
          delete process.env[key];
        }
      }
      const env = loadEnv(server.config.mode, process.cwd(), "");
      Object.assign(process.env, env);
      if (!process.env.AGENTOPS_STAGING_SUPABASE_PROJECT_REF) {
        const supabaseUrl = process.env.VITE_SUPABASE_URL ?? "";
        if (supabaseUrl.includes("ydppcpbxrvvardeslzrk")) {
          process.env.AGENTOPS_STAGING_SUPABASE_PROJECT_REF = "ydppcpbxrvvardeslzrk";
        }
      }
      const handlers = createAgentOpsDevApiHandlers(env);

      server.middlewares.use(async (req, res, next) => {
        const pathname = req.url?.split("?")[0] ?? "";

        if (pathname === "/api/agentops/llm") {
          res.statusCode = 410;
          res.setHeader("Content-Type", "application/json");
          res.end(
            JSON.stringify({
              error: "LLM route moved to Express backend",
              llmUrl: "http://127.0.0.1:3001/api/agentops/llm",
              provider: "doubao",
            }),
          );
          return;
        }

        const isGlobalMemoryRun =
          pathname === "/api/agentops/global-memory/run-command";
        const isGlobalMemoryCandidates =
          pathname === "/api/agentops/global-memory/generate-candidates";
        const isEvidenceTools = pathname === "/api/agentops/evidence-tools";
        const isCodeContextTools = pathname === "/api/agentops/code-context-tools";
        const isHermesContextIngestion =
          pathname === "/api/agentops/hermes-context-ingestion";
        const isSupertonicTts = pathname === "/api/agentops/chat-voice/supertonic-tts";
        const isDoubaoAsr =
          pathname === "/api/agentops/chat-voice/doubao-asr" ||
          pathname === "/api/agentops/chat-voice/doubao-stt";
        const isDoubaoTts = pathname === "/api/agentops/chat-voice/doubao-tts";
        const isLiveStatus = pathname === "/api/agentops/live-status";
        const isExecuteFixedRun = pathname === "/api/agentops/execute-fixed-run";
        const isChatBrowserQa = pathname === "/api/agentops/chat-browser-qa";
        const isExecuteWorkflow = pathname === "/api/agentops/workflows/execute-workflow";
        const isWorkflowRuns = pathname === "/api/agentops/workflows/workflow-runs";
        const isWorkflowStream = pathname === "/api/agentops/workflows/workflow-stream";
        const isWorkflowEvents = pathname === "/api/agentops/workflows/workflow-events";
        const isWorkflowDebugger = pathname === "/api/agentops/workflows/workflow-debugger";
        const isInitializeCanonicalAgents =
          pathname === "/api/agentops/initialize-canonical-agents";
        const isMonitoringStatus = pathname === "/api/agentops/monitoring/status";
        const isMonitoringDryRun = pathname === "/api/agentops/monitoring/dry-run";
        const isMonitoringLatestReport =
          pathname === "/api/agentops/monitoring/reports/latest";
        if (
          pathname !== "/api/agentops/hermes" &&
          !isLiveStatus &&
          !isExecuteFixedRun &&
          !isChatBrowserQa &&
          !isExecuteWorkflow &&
          !isWorkflowRuns &&
          !isWorkflowStream &&
          !isWorkflowEvents &&
          !isWorkflowDebugger &&
          !isInitializeCanonicalAgents &&
          !isMonitoringStatus &&
          !isMonitoringDryRun &&
          !isMonitoringLatestReport &&
          !isGlobalMemoryRun &&
          !isGlobalMemoryCandidates &&
          !isEvidenceTools &&
          !isCodeContextTools &&
          !isHermesContextIngestion &&
          !isSupertonicTts &&
          !isDoubaoAsr &&
          !isDoubaoTts
        ) {
          return next();
        }
        if (!req.method) {
          return next();
        }

        try {
          const host = req.headers.host ?? "127.0.0.1:5173";
          const url = `http://${host}${req.url ?? pathname}`;
          const headers = new Headers();
          for (const [key, value] of Object.entries(req.headers)) {
            if (value == null) continue;
            if (Array.isArray(value)) {
              value.forEach((item) => headers.append(key, item));
            } else {
              headers.set(key, value);
            }
          }

          let body: Buffer | undefined;
          if (req.method !== "GET" && req.method !== "HEAD") {
            body = await readRequestBody(req);
          }

          const request = new Request(url, {
            method: req.method,
            headers,
            body: body && body.length > 0 ? body : undefined,
          });

          let response: Response;
          if (pathname === "/api/agentops/hermes") {
            const mod = await server.ssrLoadModule("/api/agentops/_lib/hermesHandler.ts");
            response = await mod.handleAgentOpsHermesRequest(request);
          } else if (isLiveStatus) {
            const mod = await server.ssrLoadModule("/api/agentops/live-status.ts");
            response = await mod.handleAgentOpsLiveStatusRequest(request);
          } else if (isExecuteFixedRun) {
            const mod = await server.ssrLoadModule("/api/agentops/execute-fixed-run.ts");
            response = await mod.handleExecuteFixedRunRequest(request);
          } else if (isChatBrowserQa) {
            const mod = await server.ssrLoadModule("/api/agentops/chat-browser-qa.ts");
            response = await mod.handleChatBrowserQaRequest(request);
          } else if (isExecuteWorkflow) {
            const mod = await server.ssrLoadModule("/api/agentops/workflows/execute-workflow.ts");
            response = await mod.handleExecuteWorkflowRequest(request);
          } else if (isWorkflowRuns) {
            const mod = await server.ssrLoadModule("/api/agentops/workflows/workflow-runs.ts");
            response = await mod.handleWorkflowRunsRequest(request);
          } else if (isWorkflowStream) {
            const mod = await server.ssrLoadModule("/api/agentops/workflows/workflow-stream.ts");
            response = await mod.handleWorkflowStreamRequest(request);
          } else if (isWorkflowEvents) {
            const mod = await server.ssrLoadModule("/api/agentops/workflows/workflow-events.ts");
            response = await mod.handleWorkflowEventsRequest(request);
          } else if (isWorkflowDebugger) {
            const mod = await server.ssrLoadModule("/api/agentops/workflows/workflow-debugger.ts");
            response = await mod.handleWorkflowDebuggerRequest(request);
          } else if (isInitializeCanonicalAgents) {
            const mod = await server.ssrLoadModule("/api/agentops/initialize-canonical-agents.ts");
            response = await mod.handleInitializeCanonicalAgentsRequest();
          } else if (isMonitoringStatus || isMonitoringDryRun || isMonitoringLatestReport) {
            const mod = await server.ssrLoadModule("/api/agentops/_lib/monitoringRoutes.ts");
            response = await mod.routeMonitoringRequest(request);
          } else if (isSupertonicTts) {
            const mod = await server.ssrLoadModule("/api/agentops/supertonicTtsHandler.ts");
            response = await mod.handleSupertonicTtsRequest(request);
          } else if (isDoubaoAsr) {
            const mod = await server.ssrLoadModule("/api/agentops/doubaoAsrHandler.ts");
            response = await mod.handleDoubaoAsrRequest(request, { ...process.env, ...env });
          } else if (isDoubaoTts) {
            const mod = await server.ssrLoadModule("/api/agentops/doubaoTtsHandler.ts");
            response = await mod.handleDoubaoTtsRequest(request, { ...process.env, ...env });
          } else if (isGlobalMemoryRun) {
            const mod = await server.ssrLoadModule(
              "/api/agentops/global-memory/run-command-handler.ts",
            );
            response = await mod.handleGlobalMemoryRunCommandRequest(request, {
              ...process.env,
              ...env,
            });
          } else if (isEvidenceTools) {
            const mod = await server.ssrLoadModule("/api/agentops/evidence-tools-handler.ts");
            response = await mod.handleEvidenceToolsRequest(request, { ...process.env, ...env });
          } else if (isCodeContextTools) {
            const mod = await server.ssrLoadModule("/api/agentops/code-context-tools-handler.ts");
            response = await mod.handleCodeContextToolsRequest(request, { ...process.env, ...env });
          } else {
            const handler = isGlobalMemoryCandidates
              ? handlers.handleGlobalMemoryGenerateCandidates
              : handlers.handleHermesContextIngestion;
            response = await handler(request);
          }
          await writeFetchResponse(res, response);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: message }));
        }
      });
    },
  };
}
