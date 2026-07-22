/**
 * E-A7 — local Cursor bridge live QA.
 * Starts the real bridge, drives the staging issue detail page through it,
 * proves online + offline behavior, prompt-file safety, and status model.
 */
import { spawn } from "node:child_process";
import fs from "fs";
import path from "path";
import { chromium } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { loadAgentOpsOwnerEnv } from "./load-agentops-owner-env.mjs";

loadAgentOpsOwnerEnv();

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
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
loadEnvFile(".env.local");
loadEnvFile("qa-agent/browser-qa/.env.owner.local");

const base = process.env.AGENTOPS_QA_BASE_URL || "https://ai-xia-staging.vercel.app";
const email = process.env.AGENTOPS_QA_OWNER_EMAIL?.trim();
const password = process.env.AGENTOPS_QA_OWNER_PASSWORD;
const url = process.env.STAGING_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const service =
  process.env.STAGING_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!email || !password || !url || !service) {
  console.error("Missing owner credentials or staging Supabase env.");
  process.exit(2);
}

const REPO_ROOT = process.cwd();
const TOKEN_FILE = path.join(REPO_ROOT, ".agentops", "cursor-bridge-token.txt");
const PROMPT_DIR = path.join(REPO_ROOT, ".agentops", "fix-prompts");
const BRIDGE_PORT = 17876;
const admin = createClient(url, service, { auth: { persistSession: false } });
const stamp = Date.now();
const outDir = path.join("qa-agent", "browser-qa-artifacts", "phase-e-a7-cursor-bridge");
fs.mkdirSync(outDir, { recursive: true });

async function insertDraft(kind) {
  const { data, error } = await admin
    .from("agentops_monitoring_issue_drafts")
    .insert({
      run_id: `e-a7-${kind}-${stamp}`,
      source: "owner_manual_browser_qa",
      status: "draft",
      agent_slug: "qa-agent",
      module: "agent-ops",
      route: "/system/agent-ops/issues",
      issue_type: "failed_requests",
      severity: "low",
      title: `[E-A7 TEST] ${kind} ${stamp}`,
      summary: `E-A7 bridge ${kind}`,
      evidence: { eA7Test: true, evidence: "synthetic" },
      browser_qa_evidence: {
        scan_mode: "playwright",
        route: "/system/agent-ops/issues",
        type: "failed_requests",
        evidence: "synthetic",
        source: "owner_manual_browser_qa",
      },
      suggested_fix_prompt: "Staging-only E-A7 bridge test.",
      confidence: 0.3,
      duplicate_key: `e-a7-${kind}-${stamp}`,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data.id;
}

function startBridge() {
  const child = spawn(process.execPath, ["scripts/agentops-cursor-bridge.mjs"], {
    cwd: REPO_ROOT,
    env: { ...process.env },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  child.stdout.on("data", (chunk) => (output += chunk.toString()));
  child.stderr.on("data", (chunk) => (output += chunk.toString()));
  return { child, getOutput: () => output };
}

async function bridgeHealthy(timeoutMs = 15_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`http://127.0.0.1:${BRIDGE_PORT}/health`);
      if (res.ok) return true;
    } catch {
      // not yet
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  return false;
}

const onlineDraftId = await insertDraft("bridge-online");
const offlineDraftId = await insertDraft("bridge-offline");

const bridge = startBridge();
const report = { at: new Date().toISOString(), base, onlineDraftId, offlineDraftId };

// Headless Chromium auto-denies the Chrome 138+ Local Network Access permission
// prompt. Real owners click "Allow" once in headed Chrome; QA disables the check.
const browser = await chromium.launch({
  headless: true,
  args: ["--disable-features=LocalNetworkAccessChecks"],
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  acceptDownloads: true,
  permissions: ["clipboard-read", "clipboard-write"],
});
const page = await context.newPage();

async function login() {
  await page.goto(`${base}/login`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.fill('input[type="email"], input[name="email"]', email);
  await page.fill('input[type="password"], input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL((u) => !u.pathname.includes("/login"), { timeout: 90_000 });
  await page.waitForTimeout(2000);
}

async function openDetail(draftId) {
  await page.goto(`${base}/system/agent-ops/issues/draft-${draftId}`, {
    waitUntil: "domcontentloaded",
    timeout: 90_000,
  });
  await page
    .waitForFunction(
      () =>
        /Current status:/.test(document.body.innerText || "") &&
        !/Loading finding/.test(document.body.innerText || ""),
      { timeout: 60_000 },
    )
    .catch(() => null);
  await page.waitForTimeout(1000);
}

async function waitForStatus(labelRegex, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const hit = await page.evaluate((pattern) => {
      const match = (document.body.innerText || "").match(/Current status:\s*([A-Za-z ]+)/);
      return match ? new RegExp(pattern, "i").test(match[1]) : false;
    }, labelRegex);
    if (hit) return true;
    await page.waitForTimeout(1000);
  }
  return false;
}

try {
  report.bridgeStarted = await bridgeHealthy();
  if (!report.bridgeStarted) {
    throw new Error(`Bridge did not start: ${bridge.getOutput().slice(0, 500)}`);
  }
  const token = fs.readFileSync(TOKEN_FILE, "utf8").trim();

  await login();
  // Pair the browser with the bridge token (one-time owner step).
  await page.evaluate(
    (value) => window.localStorage.setItem("agentops.cursorBridgeToken", value),
    token,
  );

  // ── Online flow ────────────────────────────────────────────────────────────
  await openDetail(onlineDraftId);
  report.online = {
    statusLine: await page
      .locator('[data-testid="agentops-bridge-status"]')
      .textContent()
      .then((text) => text?.trim() ?? null),
  };
  report.online.detected = /Local bridge connected/.test(report.online.statusLine ?? "");

  let downloadFired = false;
  page.once("download", () => {
    downloadFired = true;
  });
  await page.locator('[data-testid="agentops-fix-with-cursor"]').click();
  report.online.statusFixing = await waitForStatus("Fixing");
  report.online.handoffStatus = await page.evaluate(
    () => document.querySelector('[data-testid="agentops-handoff-status"]')?.textContent ?? null,
  );
  await page.waitForTimeout(1500);
  report.online.noDownloadDialog = !downloadFired;
  report.online.cursorOpened = /Cursor opened with this fix prompt/.test(
    report.online.handoffStatus ?? "",
  );

  const promptFile = path.join(PROMPT_DIR, `agentops-fix-draft-${onlineDraftId}.md`);
  report.online.promptFileWritten = fs.existsSync(promptFile);
  if (report.online.promptFileWritten) {
    const promptText = fs.readFileSync(promptFile, "utf8");
    report.online.promptHasTemplate = promptText.startsWith("AGENTOPS ISSUE FIX — STAGING ONLY");
    report.online.promptHasNoSecrets = ![
      /service[_-]?role/i,
      /sb_secret/i,
      /storage[_-]?state/i,
      /eyJ[A-Za-z0-9_-]{80,}/,
      /Authorization:\s*Bearer/i,
      /cookie/i,
    ].some((pattern) => pattern.test(promptText));
  }
  await page.screenshot({ path: path.join(outDir, "bridge-online-1440.png") });

  // ── Bridge security (direct calls) ────────────────────────────────────────
  async function directPost(body, headers = {}) {
    const res = await fetch(`http://127.0.0.1:${BRIDGE_PORT}/fix-issue`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(body),
    });
    return res.status;
  }
  const validBody = {
    issueId: "e-a7-sec",
    issueTitle: "sec",
    prompt: "AGENTOPS ISSUE FIX — STAGING ONLY\n\nTask:\nInvestigate on staging only.",
    branch: "staging",
    stagingUrl: `${base}/system/agent-ops/issues`,
  };
  report.security = {
    noToken: await directPost(validBody),
    badOrigin: await directPost(validBody, {
      "X-Bridge-Token": token,
      Origin: "https://evil.example.com",
    }),
    productionUrl: await directPost(
      { ...validBody, stagingUrl: "https://aixia-production.example.com/app" },
      { "X-Bridge-Token": token },
    ),
    nonStagingBranch: await directPost(
      { ...validBody, branch: "main" },
      { "X-Bridge-Token": token },
    ),
    pathTraversal: await directPost(
      { ...validBody, issueId: "../../etc/passwd" },
      { "X-Bridge-Token": token },
    ),
    commandPayload: await directPost(
      { ...validBody, command: "rm -rf /" },
      { "X-Bridge-Token": token },
    ),
  };

  // ── Offline flow ──────────────────────────────────────────────────────────
  bridge.child.kill();
  await new Promise((resolve) => setTimeout(resolve, 1500));

  await openDetail(offlineDraftId);
  report.offline = {
    statusLine: await page
      .locator('[data-testid="agentops-bridge-status"]')
      .textContent()
      .then((text) => text?.trim() ?? null),
  };
  report.offline.detected = /not running/i.test(report.offline.statusLine ?? "");

  let offlineDownloadFired = false;
  page.once("download", () => {
    offlineDownloadFired = true;
  });
  await page.locator('[data-testid="agentops-fix-with-cursor"]').click();
  await page.waitForTimeout(2500);
  report.offline.helpShown = await page
    .locator('[data-testid="agentops-bridge-help"]')
    .isVisible()
    .catch(() => false);
  report.offline.noAutoDownload = !offlineDownloadFired;
  report.offline.fallbackButtons = await page.evaluate(() => {
    const text = document.body.innerText || "";
    return {
      copyCommand: /Copy bridge command/.test(text),
      downloadPrompt: /Download prompt/.test(text),
      copyPrompt: /Copy prompt/.test(text),
      startCommandShown: /npm run agentops:cursor-bridge/.test(text),
    };
  });
  report.offline.staysNeedsReview = await waitForStatus("Needs review", 5000);

  // Manual Download prompt still works offline.
  const manualDownload = page.waitForEvent("download", { timeout: 15_000 }).catch(() => null);
  await page.locator('[data-testid="agentops-download-prompt"]').click();
  report.offline.manualDownloadWorks = Boolean(await manualDownload);
  await page.screenshot({ path: path.join(outDir, "bridge-offline-1440.png") });
} finally {
  bridge.child.kill();
  await browser.close();
}

const ok =
  report.bridgeStarted === true &&
  report.online?.detected === true &&
  report.online?.statusFixing === true &&
  report.online?.cursorOpened === true &&
  report.online?.noDownloadDialog === true &&
  report.online?.promptFileWritten === true &&
  report.online?.promptHasTemplate === true &&
  report.online?.promptHasNoSecrets === true &&
  report.security?.noToken === 401 &&
  report.security?.badOrigin === 403 &&
  report.security?.productionUrl === 400 &&
  report.security?.nonStagingBranch === 400 &&
  report.security?.pathTraversal === 400 &&
  report.security?.commandPayload === 400 &&
  report.offline?.detected === true &&
  report.offline?.helpShown === true &&
  report.offline?.noAutoDownload === true &&
  report.offline?.fallbackButtons?.copyCommand === true &&
  report.offline?.fallbackButtons?.downloadPrompt === true &&
  report.offline?.fallbackButtons?.startCommandShown === true &&
  report.offline?.staysNeedsReview === true &&
  report.offline?.manualDownloadWorks === true;

report.ok = ok;
console.log(JSON.stringify(report, null, 2));
process.exit(ok ? 0 : 2);
