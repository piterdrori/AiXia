/**
 * E-A4 — chat-to-prompt closure live QA on staging.
 * Creates a safe [E-A4 TEST] draft, runs Improve Fix Prompt, Use as, save, refresh.
 */
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
  console.error("MISSING_ENV");
  process.exit(2);
}

const outDir = path.join("qa-agent", "browser-qa-artifacts", "phase-e-a4-chat-to-prompt");
fs.mkdirSync(outDir, { recursive: true });

const admin = createClient(url, service, { auth: { persistSession: false } });
const stamp = Date.now();
const { data: draftRow, error: insertErr } = await admin
  .from("agentops_monitoring_issue_drafts")
  .insert({
    run_id: `e-a4-chat-prompt-${stamp}`,
    source: "owner_manual_browser_qa",
    status: "draft",
    agent_slug: "qa-agent",
    module: "agent-ops",
    route: "/system/agent-ops/issues",
    issue_type: "failed_requests",
    severity: "low",
    title: `[E-A4 TEST] Chat-to-prompt ${stamp}`,
    summary: "Safe E-A4 acceptance draft for deterministic chat-to-prompt closure.",
    evidence: { eA4Test: true, evidence: "synthetic acceptance evidence" },
    browser_qa_evidence: {
      scan_mode: "playwright",
      route: "/system/agent-ops/issues",
      type: "failed_requests",
      evidence: "synthetic acceptance evidence",
      source: "owner_manual_browser_qa",
      summary: "Synthetic evidence for E-A4 chat-to-prompt.",
    },
    suggested_fix_prompt: "Investigate this staging-only AgentOps issue. Do not touch production.",
    confidence: 0.35,
    duplicate_key: `e-a4-chat-prompt-${stamp}`,
  })
  .select("id")
  .single();

if (insertErr || !draftRow?.id) {
  console.error(JSON.stringify({ ok: false, step: "insert", error: insertErr?.message }));
  process.exit(2);
}

const draftRoute = `/system/agent-ops/issues/draft-${draftRow.id}`;
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

await page.goto(`${base}/login`, { waitUntil: "domcontentloaded", timeout: 60_000 });
await page.fill('input[type="email"], input[name="email"]', email);
await page.fill('input[type="password"], input[name="password"]', password);
await page.click('button[type="submit"]');
await page.waitForURL((u) => !u.pathname.includes("/login"), { timeout: 90_000 });
await page.waitForTimeout(2000);

async function waitReady(timeoutMs = 90_000) {
  await page
    .waitForFunction(
      () => {
        const text = document.body.innerText || "";
        if (/Could not load|Finding not found|Owner gate timed out/i.test(text)) return true;
        if (/Fix Issue Prompt|Reported by|Suggested Fix Prompt/i.test(text)) return true;
        if (/Loading finding|\bLoading\b/i.test(text) && !/Reported by/i.test(text)) return false;
        return Boolean(document.querySelector('[data-testid="agentops-page-h1"]'));
      },
      { timeout: timeoutMs },
    )
    .catch(() => null);
  await page.waitForTimeout(800);
}

await page.goto(`${base}${draftRoute}`, { waitUntil: "domcontentloaded", timeout: 90_000 });
await waitReady();

const before = await page.evaluate(() => ({
  h1: document.querySelector('[data-testid="agentops-page-h1"]')?.textContent || null,
  hasChat: /Discuss with QA Agent/i.test(document.body.innerText),
  hasImprove: /Improve Fix Prompt/i.test(document.body.innerText),
}));

const improve = page.getByRole("button", { name: /Improve Fix Prompt/i });
await improve.first().click();
await page
  .waitForSelector(
    '[data-testid="agentops-use-as-fix-prompt"], [data-testid="agentops-suggested-fix-prompt-text"]',
    { timeout: 90_000 },
  )
  .catch(() => null);
await page.waitForTimeout(1500);

const afterImprove = await page.evaluate(() => {
  const text = document.body.innerText || "";
  return {
    hasSuggestionCard: /Suggested Fix Prompt/i.test(text),
    hasUseAs: Boolean(document.querySelector('[data-testid="agentops-use-as-fix-prompt"]')),
    fallbackNote: Boolean(
      document.querySelector('[data-testid="agentops-fix-prompt-fallback-note"]'),
    ),
    suggestionSnippet:
      document.querySelector('[data-testid="agentops-suggested-fix-prompt-text"]')?.textContent?.slice(
        0,
        200,
      ) || null,
  };
});

let promptUpdated = false;
if (afterImprove.hasUseAs) {
  await page.locator('[data-testid="agentops-use-as-fix-prompt"]').first().click();
  await page.waitForTimeout(600);
  const editBtn = page.getByRole("button", { name: /^Edit prompt$/i });
  if (await editBtn.count()) await editBtn.click();
  const ta = page.locator('[data-testid="agentops-fix-issue-prompt"]');
  const val = await ta.inputValue();
  promptUpdated = /Fix AgentOps issue:|staging only|Do not touch main/i.test(val) || val.length > 40;
  const edited = `${val.trim()}\n\n[E-A4 saved ${stamp}]`;
  await ta.fill(edited);
  await page.getByRole("button", { name: /Save changes/i }).click();
  await page.waitForTimeout(2500);
}

const saved = await page.evaluate(() => /saved|Last saved/i.test(document.body.innerText || ""));
await page.reload({ waitUntil: "domcontentloaded" });
await waitReady();
const editBtn2 = page.getByRole("button", { name: /^Edit prompt$/i });
if (await editBtn2.count()) await editBtn2.click();
const afterReload = await page.locator('[data-testid="agentops-fix-issue-prompt"]').inputValue();
const persisted = afterReload.includes(`[E-A4 saved ${stamp}]`);

await page.screenshot({ path: path.join(outDir, "chat-to-prompt-1440.png"), fullPage: true });

// Light checks: list h1, promoted BQA h1
await page.goto(`${base}/system/agent-ops/issues`, { waitUntil: "domcontentloaded", timeout: 90_000 });
await waitReady();
const listH1 = await page.evaluate(
  () => document.querySelector('[data-testid="agentops-page-h1"]')?.textContent || null,
);

await page.goto(`${base}/system/agent-ops/issues/BQA-F956B002`, {
  waitUntil: "domcontentloaded",
  timeout: 90_000,
});
await waitReady();
const promoted = await page.evaluate(() => ({
  h1: document.querySelector('[data-testid="agentops-page-h1"]')?.textContent || null,
  h1Count: document.querySelectorAll("h1").length,
  notFound: /Finding not found/i.test(document.body.innerText || ""),
}));

await browser.close();

const report = {
  at: new Date().toISOString(),
  base,
  draftId: draftRow.id,
  draftRoute,
  before,
  afterImprove,
  promptUpdated,
  saved,
  persisted,
  listH1,
  promoted,
  chatToPromptFullPass:
    afterImprove.hasSuggestionCard &&
    afterImprove.hasUseAs &&
    promptUpdated &&
    saved &&
    persisted,
};

fs.writeFileSync(path.join(outDir, "live.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
process.exit(report.chatToPromptFullPass && !promoted.notFound && promoted.h1Count === 1 ? 0 : 2);
