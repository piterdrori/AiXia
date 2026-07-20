/**
 * Phase D-E3 — live Agent Detail polish smoke on staging alias.
 * Local Playwright only (not on Vercel).
 */
import fs from "fs";
import path from "path";
import { chromium } from "@playwright/test";
import { loadAgentOpsOwnerEnv } from "./load-agentops-owner-env.mjs";

loadAgentOpsOwnerEnv();

const base = process.env.AGENTOPS_QA_BASE_URL || "https://ai-xia-staging.vercel.app";
const email = process.env.AGENTOPS_QA_OWNER_EMAIL?.trim();
const password = process.env.AGENTOPS_QA_OWNER_PASSWORD;
const shotDir = path.join("qa-agent", "browser-qa-artifacts", "phase-d-e3-polish");
const agents = [
  "system-agent",
  "qa-agent",
  "design-agent",
  "analytics-agent",
  "runtime-agent",
  "logs-agent",
];

fs.mkdirSync(shotDir, { recursive: true });

if (!email || !password) {
  console.error("Missing AGENTOPS_QA_OWNER_EMAIL / AGENTOPS_QA_OWNER_PASSWORD");
  process.exit(2);
}

const results = [];

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
const page = await context.newPage();

await page.setViewportSize({ width: 1440, height: 900 });
await page.goto(`${base}/login`, { waitUntil: "domcontentloaded", timeout: 60_000 });
await page.fill('input[type="email"], input[name="email"]', email);
await page.fill('input[type="password"], input[name="password"]', password);
await page.click('button[type="submit"]');
await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 60_000 });

for (const slug of agents) {
  const row = {
    slug,
    loadMs: null,
    header: false,
    strip: false,
    queueCompact: false,
    chat: false,
    schedule: false,
    memory: false,
    issuesPreviewOnly: false,
    drawerOk: false,
    noNotRecordedSpam: true,
    noLegacyGithub: true,
    noApproveReject: true,
    mobileOk: true,
    error: null,
  };
  try {
    const t0 = Date.now();
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${base}/system/agent-ops/agents/${slug}`, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    await page.waitForSelector('[data-testid="agentops-agent-detail-page"]', {
      timeout: 45_000,
    });
    await page.waitForSelector('[data-testid="agentops-agent-control-header"]', {
      timeout: 45_000,
    });
    row.loadMs = Date.now() - t0;
    row.header = true;
    row.strip = Boolean(await page.$('[data-testid="agentops-agent-status-strip"]'));
    row.queueCompact = Boolean(
      await page.$('[data-testid="agentops-staging-worker-queue-panel"]'),
    );
    row.chat = Boolean(await page.$('[data-testid="agentops-agent-chat-workspace"]'));

    await page
      .waitForSelector('[data-testid="agentops-agent-schedule-panel"]', { timeout: 30_000 })
      .catch(() => null);
    row.schedule = Boolean(await page.$('[data-testid="agentops-agent-schedule-panel"]'));

    await page
      .waitForSelector('[data-testid="agentops-agent-memory-hermes-panel"]', { timeout: 45_000 })
      .catch(() => null);
    row.memory = Boolean(await page.$('[data-testid="agentops-agent-memory-hermes-panel"]'));

    row.issuesPreviewOnly = Boolean(
      await page.$('[data-testid="agentops-issues-preview-only"]'),
    );

    const bodyText = await page.locator("body").innerText();
    if (/GitHub Actions|daily-agent execution/i.test(bodyText)) {
      row.noLegacyGithub = false;
    }
    const notRecordedCount = (bodyText.match(/Not recorded/gi) || []).length;
    if (notRecordedCount > 2) {
      row.noNotRecordedSpam = false;
    }
    if (/Approve finding|Reject finding|Promote finding/i.test(bodyText)) {
      row.noApproveReject = false;
    }

    const viewLatest = page.getByRole("button", { name: /View latest run/i }).first();
    if (await viewLatest.count()) {
      await viewLatest.click();
      await page.waitForSelector('[data-testid="agentops-run-detail-drawer"]', {
        timeout: 15_000,
      });
      row.drawerOk = Boolean(await page.$('[data-testid="agentops-drawer-close"]'));
      const drawerText = await page
        .locator('[data-testid="agentops-run-detail-drawer"]')
        .innerText();
      if ((drawerText.match(/Not recorded/gi) || []).length > 0) {
        row.noNotRecordedSpam = false;
      }
      await page.locator('[data-testid="agentops-drawer-close"]').click();
    } else {
      row.drawerOk = true;
    }

    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(400);
    const overflow = await page.evaluate(() => {
      const doc = document.documentElement;
      return doc.scrollWidth > doc.clientWidth + 2;
    });
    row.mobileOk = !overflow;
    await page.screenshot({
      path: path.join(shotDir, `${slug}-390.png`),
      fullPage: true,
    });

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.screenshot({
      path: path.join(shotDir, `${slug}-1440.png`),
      fullPage: false,
    });
  } catch (error) {
    row.error = error instanceof Error ? error.message : String(error);
  }
  results.push(row);
  console.log(JSON.stringify(row));
}

await browser.close();

const pass = results.every(
  (r) =>
    r.header &&
    r.queueCompact &&
    r.issuesPreviewOnly &&
    r.drawerOk &&
    r.noNotRecordedSpam &&
    r.noLegacyGithub &&
    r.noApproveReject &&
    r.mobileOk &&
    !r.error,
);

const outPath = path.join("qa-agent", "reports", "agentops-phase-d-e3-live-qa.json");
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify({ base, pass, results }, null, 2));
console.log(pass ? "D-E3 live polish PASS" : "D-E3 live polish FAIL");
process.exit(pass ? 0 : 1);
