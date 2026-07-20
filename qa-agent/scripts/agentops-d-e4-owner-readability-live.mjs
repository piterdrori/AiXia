/**
 * Phase D-E4 — live owner-readability smoke on staging alias.
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
const shotDir = path.join("qa-agent", "browser-qa-artifacts", "phase-d-e4-owner-readability");
const agents = [
  "system-agent",
  "design-agent",
  "qa-agent",
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
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

await page.goto(`${base}/login`, { waitUntil: "domcontentloaded", timeout: 60_000 });
await page.fill('input[type="email"], input[name="email"]', email);
await page.fill('input[type="password"], input[name="password"]', password);
await page.click('button[type="submit"]');
await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 60_000 });

for (const slug of agents) {
  const row = {
    slug,
    header: false,
    badgesMax3: false,
    globalCollapsed: false,
    queueCompact: false,
    scheduleBanner: false,
    memoryCards: false,
    findingsCompact: false,
    noWorkerStale: true,
    noLegacyGithub: true,
    mobileOk: true,
    error: null,
  };
  try {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${base}/system/agent-ops/agents/${slug}`, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    await page.waitForSelector('[data-testid="agentops-agent-control-header"]', {
      timeout: 45_000,
    });
    row.header = true;

    const badgeCount = await page
      .locator('[data-testid="agentops-owner-status-badges"] .aixia-badge, [data-testid="agentops-owner-status-badges"] [class*="badge"]')
      .count()
      .catch(async () =>
        page.locator('[data-testid="agentops-owner-status-badges"] > span').count(),
      );
    row.badgesMax3 = badgeCount > 0 && badgeCount <= 3;

    const details = page.locator('[data-testid="agentops-global-worker-details"]');
    row.globalCollapsed = (await details.count()) > 0 && !(await details.evaluate((el) => el.open));

    await page
      .waitForSelector('[data-testid="agentops-staging-worker-queue-panel"]', { timeout: 20_000 })
      .catch(() => null);
    row.queueCompact = Boolean(
      (await page.$('[data-testid="agentops-queue-empty-compact"]')) ||
        (await page.$('[data-testid="agentops-staging-worker-queue-panel"]')),
    );

    await page
      .waitForSelector('[data-testid="agentops-schedule-summary-banner"]', { timeout: 30_000 })
      .catch(() => null);
    row.scheduleBanner = Boolean(await page.$('[data-testid="agentops-schedule-summary-banner"]'));

    await page
      .waitForSelector('[data-testid="agentops-hermes-summary"]', { timeout: 45_000 })
      .catch(() => null);
    row.memoryCards = Boolean(await page.$('[data-testid="memory-summary-agent-hermes"]'));

    await page
      .waitForSelector('[data-testid="agentops-agent-results-panel"]', { timeout: 20_000 })
      .catch(() => null);
    row.findingsCompact = Boolean(
      (await page.$('[data-testid="agentops-findings-empty-compact"]')) ||
        (await page.$('[data-testid="agentops-issues-preview-only"]')),
    );

    const body = await page.locator("body").innerText();
    if (/Worker stale|Scheduler not executable|Engines not ready/i.test(body)) {
      // allowed only inside expanded global details
      const open = await details.evaluate((el) => el.open).catch(() => false);
      if (!open) row.noWorkerStale = false;
    }
    if (/GitHub Actions|daily-agent execution/i.test(body)) row.noLegacyGithub = false;

    await page.screenshot({
      path: path.join(shotDir, `${slug}-1440.png`),
      fullPage: false,
    });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(350);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2,
    );
    row.mobileOk = !overflow;
    await page.screenshot({
      path: path.join(shotDir, `${slug}-390.png`),
      fullPage: true,
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
    r.badgesMax3 &&
    r.globalCollapsed &&
    r.queueCompact &&
    r.scheduleBanner &&
    r.memoryCards &&
    r.findingsCompact &&
    r.noWorkerStale &&
    r.noLegacyGithub &&
    r.mobileOk &&
    !r.error,
);

const outPath = path.join("qa-agent", "reports", "agentops-phase-d-e4-live-qa.json");
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify({ base, pass, results }, null, 2));
console.log(pass ? "D-E4 live owner-readability PASS" : "D-E4 live owner-readability FAIL");
process.exit(pass ? 0 : 1);
