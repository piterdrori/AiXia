/**
 * E-A7 — Local Cursor bridge for AgentOps "Fix with Cursor".
 * Runs on the OWNER machine only. Staging-only by design.
 *
 * Usage: npm run agentops:cursor-bridge
 *
 * Security model:
 * - Binds 127.0.0.1 only (never all interfaces).
 * - Browser callers must come from the staging alias or an ai-* Vercel Preview origin.
 * - POST /fix-issue requires the X-Bridge-Token printed on startup
 *   (persisted in .agentops/cursor-bridge-token.txt, gitignored).
 * - No arbitrary commands: the ONLY process this bridge ever starts is the local
 *   Cursor CLI with fixed arguments (repo root + prompt file path).
 * - No arbitrary paths: prompt files are written ONLY to <repo>/.agentops/fix-prompts/
 *   with a sanitized issue-id filename.
 * - Rejects non-staging branches, production URLs, secret-looking prompt content,
 *   and command-shaped payloads.
 * - Never logs tokens or prompt bodies.
 */
import { execFileSync, spawn } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";

const HOST = "127.0.0.1";
const PORT = Number(process.env.AGENTOPS_CURSOR_BRIDGE_PORT || 17876);
const SKIP_LAUNCH = process.env.AGENTOPS_BRIDGE_SKIP_LAUNCH === "1";
const VERSION = "e-a7.1";

const REPO_ROOT = process.cwd();
const AGENTOPS_DIR = path.join(REPO_ROOT, ".agentops");
const PROMPT_DIR = path.join(AGENTOPS_DIR, "fix-prompts");
const TOKEN_FILE = path.join(AGENTOPS_DIR, "cursor-bridge-token.txt");

const STAGING_ALIAS = "https://ai-xia-staging.vercel.app";
const PREVIEW_ORIGIN_RE = /^https:\/\/ai-[a-z0-9]+-piterdrori-gmailcoms-projects\.vercel\.app$/;

function allowedOrigin(origin) {
  if (!origin) return false;
  if (origin === STAGING_ALIAS) return true;
  if (PREVIEW_ORIGIN_RE.test(origin)) return true;
  const extras = (process.env.AGENTOPS_CURSOR_BRIDGE_EXTRA_ORIGINS || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  return extras.includes(origin);
}

// ── Startup checks ───────────────────────────────────────────────────────────

function gitBranch() {
  try {
    return execFileSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
      cwd: REPO_ROOT,
      encoding: "utf8",
    }).trim();
  } catch {
    return null;
  }
}

function resolveCursorCli() {
  const candidates =
    process.platform === "win32"
      ? [
          "C:\\Program Files\\cursor\\resources\\app\\bin\\cursor.cmd",
          path.join(
            process.env.LOCALAPPDATA || "",
            "Programs",
            "cursor",
            "resources",
            "app",
            "bin",
            "cursor.cmd",
          ),
        ]
      : ["/usr/local/bin/cursor", "/usr/bin/cursor"];
  for (const candidate of candidates) {
    if (candidate && fs.existsSync(candidate)) return candidate;
  }
  try {
    const found = execFileSync(
      process.platform === "win32" ? "where" : "which",
      ["cursor"],
      { encoding: "utf8" },
    )
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find((line) => line.length > 0);
    return found || null;
  } catch {
    return null;
  }
}

function ensureToken() {
  fs.mkdirSync(AGENTOPS_DIR, { recursive: true });
  if (fs.existsSync(TOKEN_FILE)) {
    const existing = fs.readFileSync(TOKEN_FILE, "utf8").trim();
    if (existing.length >= 24) return existing;
  }
  const token = crypto.randomBytes(24).toString("base64url");
  fs.writeFileSync(TOKEN_FILE, `${token}\n`, { encoding: "utf8" });
  return token;
}

const branch = gitBranch();
const cursorCli = resolveCursorCli();
const token = ensureToken();

if (branch !== "staging") {
  console.error(
    `[cursor-bridge] Refusing to start: repo branch is "${branch ?? "unknown"}", expected "staging".`,
  );
  process.exit(1);
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const SECRET_PATTERNS = [
  /service[_-]?role/i,
  /sb_secret/i,
  /SUPABASE_SERVICE_ROLE/i,
  /storage[_-]?state/i,
  /eyJ[A-Za-z0-9_-]{80,}/, // JWT-looking blobs
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
];

const FORBIDDEN_BODY_KEYS = ["command", "cmd", "shell", "exec", "args", "script", "spawn"];

function corsHeaders(origin) {
  const headers = {
    "Content-Type": "application/json",
    Vary: "Origin",
  };
  if (allowedOrigin(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS";
    headers["Access-Control-Allow-Headers"] = "Content-Type, X-Bridge-Token";
    headers["Access-Control-Max-Age"] = "600";
    // Chrome Private Network Access preflight from public HTTPS → localhost.
    headers["Access-Control-Allow-Private-Network"] = "true";
  }
  return headers;
}

function send(res, status, origin, payload) {
  res.writeHead(status, corsHeaders(origin));
  res.end(JSON.stringify(payload));
}

function readBody(req, limitBytes = 200_000) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > limitBytes) {
        reject(new Error("Payload too large."));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function validHost(req) {
  const host = (req.headers.host || "").toLowerCase();
  return host === `${HOST}:${PORT}` || host === `localhost:${PORT}`;
}

// ── Request handling ─────────────────────────────────────────────────────────

async function handleFixIssue(req, res, origin) {
  if ((req.headers["x-bridge-token"] || "") !== token) {
    send(res, 401, origin, { ok: false, accepted: false, error: "Bridge token required." });
    return;
  }

  let body;
  try {
    body = JSON.parse(await readBody(req));
  } catch {
    send(res, 400, origin, { ok: false, accepted: false, error: "Invalid JSON body." });
    return;
  }

  for (const key of Object.keys(body)) {
    if (FORBIDDEN_BODY_KEYS.includes(key.toLowerCase())) {
      send(res, 400, origin, {
        ok: false,
        accepted: false,
        error: "Command-shaped payloads are rejected. This bridge never runs browser commands.",
      });
      return;
    }
  }

  const issueId = typeof body.issueId === "string" ? body.issueId.trim() : "";
  const issueTitle = typeof body.issueTitle === "string" ? body.issueTitle.slice(0, 200) : "";
  const prompt = typeof body.prompt === "string" ? body.prompt : "";
  const requestedBranch = typeof body.branch === "string" ? body.branch.trim() : "";
  const stagingUrl = typeof body.stagingUrl === "string" ? body.stagingUrl.trim() : "";

  if (!/^[a-zA-Z0-9_-]{1,80}$/.test(issueId)) {
    send(res, 400, origin, {
      ok: false,
      accepted: false,
      error: "issueId must be 1-80 chars of [a-zA-Z0-9_-]. Path traversal is rejected.",
    });
    return;
  }
  if (requestedBranch !== "staging") {
    send(res, 400, origin, {
      ok: false,
      accepted: false,
      error: "Only branch=staging is accepted.",
    });
    return;
  }
  let stagingOriginOk = false;
  try {
    const parsed = new URL(stagingUrl);
    stagingOriginOk =
      parsed.origin === STAGING_ALIAS || PREVIEW_ORIGIN_RE.test(parsed.origin);
  } catch {
    stagingOriginOk = false;
  }
  if (!stagingUrl || !stagingOriginOk) {
    send(res, 400, origin, {
      ok: false,
      accepted: false,
      error: "stagingUrl must be the staging alias or an ai-* Vercel Preview. Production is rejected.",
    });
    return;
  }
  if (!prompt.trim() || prompt.length > 100_000) {
    send(res, 400, origin, {
      ok: false,
      accepted: false,
      error: "prompt is required and must be under 100000 characters.",
    });
    return;
  }
  for (const pattern of SECRET_PATTERNS) {
    if (pattern.test(prompt)) {
      send(res, 400, origin, {
        ok: false,
        accepted: false,
        error: "Prompt looks like it contains secret material — rejected.",
      });
      return;
    }
  }
  // Live branch re-check: the bridge only serves a staging checkout.
  if (gitBranch() !== "staging") {
    send(res, 409, origin, {
      ok: false,
      accepted: false,
      error: "Bridge repo is no longer on the staging branch.",
    });
    return;
  }

  fs.mkdirSync(PROMPT_DIR, { recursive: true });
  const fileName = `agentops-fix-${issueId}.md`;
  const promptPath = path.resolve(PROMPT_DIR, fileName);
  if (!promptPath.startsWith(path.resolve(PROMPT_DIR) + path.sep)) {
    send(res, 400, origin, { ok: false, accepted: false, error: "Unsafe path rejected." });
    return;
  }
  fs.writeFileSync(promptPath, prompt, "utf8");

  let cursorLaunched = false;
  let mode = "prompt_file";
  let reason = null;
  if (!cursorCli) {
    reason = "Cursor CLI not found on this machine.";
  } else if (SKIP_LAUNCH) {
    mode = "cursor_cli";
    reason = "Launch skipped (AGENTOPS_BRIDGE_SKIP_LAUNCH=1 — verify mode).";
  } else {
    try {
      // Fixed arguments only: open this repo + the prompt file in Cursor.
      const child =
        process.platform === "win32"
          ? spawn("cmd.exe", ["/c", cursorCli, REPO_ROOT, promptPath, "--reuse-window"], {
              detached: true,
              stdio: "ignore",
              windowsHide: true,
            })
          : spawn(cursorCli, [REPO_ROOT, promptPath, "--reuse-window"], {
              detached: true,
              stdio: "ignore",
            });
      child.unref();
      cursorLaunched = true;
      mode = "cursor_cli";
    } catch (error) {
      reason = `Cursor launch failed: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  console.log(
    `[cursor-bridge] fix-issue accepted issueId=${issueId} mode=${mode} launched=${cursorLaunched}`,
  );
  send(res, 200, origin, {
    ok: true,
    accepted: true,
    mode,
    promptFile: path.relative(REPO_ROOT, promptPath).replace(/\\/g, "/"),
    cursorLaunched,
    // Honest: Cursor CLI 3.5.x has no flag to auto-start a chat/agent with a prompt.
    autoFixStart: "not_supported_by_cursor",
    issueTitle,
    reason,
  });
}

const server = http.createServer(async (req, res) => {
  const origin = req.headers.origin || "";
  try {
    if (!validHost(req)) {
      send(res, 403, origin, { ok: false, error: "Localhost only." });
      return;
    }
    // Browser callers must be allowlisted; non-browser local callers have no Origin.
    if (origin && !allowedOrigin(origin)) {
      send(res, 403, origin, { ok: false, error: "Origin not allowed." });
      return;
    }
    const url = new URL(req.url || "/", `http://${HOST}:${PORT}`);

    if (req.method === "OPTIONS") {
      res.writeHead(204, corsHeaders(origin));
      res.end();
      return;
    }
    if (req.method === "GET" && url.pathname === "/health") {
      send(res, 200, origin, {
        ok: true,
        service: "agentops-cursor-bridge",
        version: VERSION,
        branch: "staging",
        cursorCliAvailable: Boolean(cursorCli),
        needsToken: true,
        autoFixStart: "not_supported_by_cursor",
      });
      return;
    }
    if (req.method === "POST" && url.pathname === "/fix-issue") {
      await handleFixIssue(req, res, origin);
      return;
    }
    send(res, 404, origin, { ok: false, error: "Not found." });
  } catch (error) {
    send(res, 500, origin, {
      ok: false,
      error: error instanceof Error ? error.message : "Bridge error.",
    });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`[cursor-bridge] listening on http://${HOST}:${PORT} (localhost only)`);
  console.log(`[cursor-bridge] repo: ${REPO_ROOT}`);
  console.log(`[cursor-bridge] branch: staging ✓`);
  console.log(`[cursor-bridge] cursor CLI: ${cursorCli ? "available" : "NOT FOUND"}`);
  console.log(`[cursor-bridge] bridge token (paste once into the Issues page):`);
  console.log(`[cursor-bridge]   ${token}`);
  console.log(`[cursor-bridge] token file: ${path.relative(REPO_ROOT, TOKEN_FILE)}`);
});
