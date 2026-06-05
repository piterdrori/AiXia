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
 * Serves AgentOps API routes during `npm run dev` (Vite) so LLM proxy works locally
 * without requiring a separate `vercel dev` process.
 */
export function agentOpsApiDevPlugin(): Plugin {
  return {
    name: "agentops-api-dev",
    configureServer(server) {
      const env = loadEnv(server.config.mode, process.cwd(), "");
      Object.assign(process.env, env);
      const handlers = createAgentOpsDevApiHandlers(env);

      server.middlewares.use(async (req, res, next) => {
        const pathname = req.url?.split("?")[0] ?? "";
        const isGlobalMemoryRun =
          pathname === "/api/agentops/global-memory/run-command";
        const isGlobalMemoryCandidates =
          pathname === "/api/agentops/global-memory/generate-candidates";
        if (
          pathname !== "/api/agentops/llm" &&
          pathname !== "/api/agentops/hermes" &&
          !isGlobalMemoryRun &&
          !isGlobalMemoryCandidates
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
            const mod = await server.ssrLoadModule("/api/agentops/hermesHandler.ts");
            response = await mod.handleAgentOpsHermesRequest(request);
          } else {
            const handler = isGlobalMemoryRun
              ? handlers.handleGlobalMemoryRunCommand
              : isGlobalMemoryCandidates
                ? handlers.handleGlobalMemoryGenerateCandidates
                : handlers.handleLlm;
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
