/**
 * Phase E-A7 — local Cursor bridge verify (static + dynamic).
 * Usage: npm run agentops:cursor-bridge-verify
 * Starts the bridge on a test port with launch skipped, then proves the security model.
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const REPO_ROOT = process.cwd();
const BRIDGE_SRC = path.join(REPO_ROOT, "scripts", "agentops-cursor-bridge.mjs");
const TOKEN_FILE = path.join(REPO_ROOT, ".agentops", "cursor-bridge-token.txt");
const PROMPT_DIR = path.join(REPO_ROOT, ".agentops", "fix-prompts");
const PORT = 17911;
const BASE = `http://127.0.0.1:${PORT}`;
const STAGING_ORIGIN = "https://ai-xia-staging.vercel.app";

const failures = [];
function fail(message) {
  failures.push(message);
}

// ── Static source assertions ────────────────────────────────────────────────
const source = fs.readFileSync(BRIDGE_SRC, "utf8");
const staticChecks = [
  ['binds 127.0.0.1 only', source.includes('const HOST = "127.0.0.1"') && source.includes("server.listen(PORT, HOST")],
  ["never binds 0.0.0.0", !source.includes("0.0.0.0")],
  ["requires X-Bridge-Token", source.includes('x-bridge-token')],
  ["origin allowlist", source.includes("allowedOrigin") && source.includes("ai-xia-staging.vercel.app")],
  ["rejects command payload keys", source.includes("FORBIDDEN_BODY_KEYS")],
  ["rejects secret-looking prompts", source.includes("SECRET_PATTERNS")],
  ["staging branch gate", source.includes('!== "staging"')],
  ["sanitized issue id", source.includes("a-zA-Z0-9_-]{1,80}")],
  ["fixed prompt dir", source.includes("fix-prompts")],
  ["honest auto-fix status", source.includes("not_supported_by_cursor")],
  // Token IS printed once at startup by design (owner pairing). The request handler
  // must never log tokens or prompt bodies.
  [
    "request handler logs no token/prompt",
    (() => {
      const handler = source.split("async function handleFixIssue")[1]?.split("const server")[0] ?? "";
      const logs = handler.match(/console\.(log|error|warn)\([^)]*\)/g) ?? [];
      return logs.every((line) => !/token|prompt\b/i.test(line));
    })(),
  ],
  ["private network preflight header", source.includes("Access-Control-Allow-Private-Network")],
];
for (const [label, ok] of staticChecks) {
  if (!ok) fail(`static: ${label}`);
}

// ── Dynamic checks ──────────────────────────────────────────────────────────
const child = spawn(process.execPath, [BRIDGE_SRC], {
  cwd: REPO_ROOT,
  env: {
    ...process.env,
    AGENTOPS_CURSOR_BRIDGE_PORT: String(PORT),
    AGENTOPS_BRIDGE_SKIP_LAUNCH: "1",
  },
  stdio: ["ignore", "pipe", "pipe"],
});
let bridgeOut = "";
child.stdout.on("data", (chunk) => (bridgeOut += chunk.toString()));
child.stderr.on("data", (chunk) => (bridgeOut += chunk.toString()));

async function waitForHealth(timeoutMs = 15_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${BASE}/health`);
      if (res.ok) return true;
    } catch {
      // not up yet
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  return false;
}

function readToken() {
  return fs.readFileSync(TOKEN_FILE, "utf8").trim();
}

async function post(bodyObj, { token = null, origin = STAGING_ORIGIN } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (origin) headers.Origin = origin;
  if (token) headers["X-Bridge-Token"] = token;
  const res = await fetch(`${BASE}/fix-issue`, {
    method: "POST",
    headers,
    body: JSON.stringify(bodyObj),
  });
  return { status: res.status, json: await res.json().catch(() => ({})) };
}

const validBody = (issueId) => ({
  issueId,
  issueTitle: "E-A7 verify",
  prompt:
    "AGENTOPS ISSUE FIX — STAGING ONLY\n\nIssue:\nE-A7 verify\n\nTask:\nInvestigate and fix this issue on staging only.\n",
  branch: "staging",
  stagingUrl: `${STAGING_ORIGIN}/system/agent-ops/issues`,
});

try {
  if (!(await waitForHealth())) {
    fail(`dynamic: bridge did not become healthy. Output: ${bridgeOut.slice(0, 400)}`);
  } else {
    const token = readToken();

    const health = await fetch(`${BASE}/health`, { headers: { Origin: STAGING_ORIGIN } });
    const healthJson = await health.json();
    if (healthJson.service !== "agentops-cursor-bridge") fail("dynamic: health service name");
    if (health.headers.get("access-control-allow-origin") !== STAGING_ORIGIN) {
      fail("dynamic: CORS header missing for staging origin");
    }

    const evilOrigin = await fetch(`${BASE}/health`, {
      headers: { Origin: "https://evil.example.com" },
    });
    if (evilOrigin.status !== 403) fail(`dynamic: evil origin not rejected (${evilOrigin.status})`);

    const noToken = await post(validBody("e-a7-no-token"));
    if (noToken.status !== 401) fail(`dynamic: missing token accepted (${noToken.status})`);

    const badBranch = await post({ ...validBody("e-a7-branch"), branch: "main" }, { token });
    if (badBranch.status !== 400) fail(`dynamic: branch=main accepted (${badBranch.status})`);

    const badUrl = await post(
      { ...validBody("e-a7-produrl"), stagingUrl: "https://aixia-production.example.com/x" },
      { token },
    );
    if (badUrl.status !== 400) fail(`dynamic: production URL accepted (${badUrl.status})`);

    const traversal = await post({ ...validBody("ok"), issueId: "../../etc/passwd" }, { token });
    if (traversal.status !== 400) fail(`dynamic: path traversal accepted (${traversal.status})`);

    const command = await post({ ...validBody("e-a7-cmd"), command: "rm -rf /" }, { token });
    if (command.status !== 400) fail(`dynamic: command payload accepted (${command.status})`);

    const secret = await post(
      { ...validBody("e-a7-secret"), prompt: "use SUPABASE_SERVICE_ROLE_KEY=abc" },
      { token },
    );
    if (secret.status !== 400) fail(`dynamic: secret prompt accepted (${secret.status})`);

    const good = await post(validBody("e-a7-verify-ok"), { token });
    if (good.status !== 200 || good.json.accepted !== true) {
      fail(`dynamic: valid request rejected (${good.status} ${JSON.stringify(good.json)})`);
    } else {
      if (good.json.autoFixStart !== "not_supported_by_cursor") {
        fail("dynamic: autoFixStart must be honest not_supported_by_cursor");
      }
      const promptFile = path.join(PROMPT_DIR, "agentops-fix-e-a7-verify-ok.md");
      if (!fs.existsSync(promptFile)) fail("dynamic: prompt file not written");
      else fs.unlinkSync(promptFile);
      if (good.json.cursorLaunched !== false) {
        fail("dynamic: skip-launch run must report cursorLaunched=false honestly");
      }
    }
  }
} finally {
  child.kill();
}

if (failures.length > 0) {
  console.error("AGENTOPS CURSOR BRIDGE VERIFY — FAILED");
  for (const item of failures) console.error(`  - ${item}`);
  process.exit(1);
}
console.log(
  JSON.stringify({
    ok: true,
    command: "agentops:cursor-bridge-verify",
    checks: [
      "localhost_only",
      "token_required",
      "origin_allowlist",
      "staging_branch_only",
      "production_url_rejected",
      "path_traversal_rejected",
      "command_payload_rejected",
      "secret_prompt_rejected",
      "prompt_file_written",
      "honest_auto_fix_status",
      "cors_private_network",
    ],
  }),
);
