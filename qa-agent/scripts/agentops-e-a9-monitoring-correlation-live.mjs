/**
 * E-A9 — monitoring page correlation live QA.
 * Checks truthful health values, run outcomes with issue counts, cross-links,
 * and that the Open Issues inbox link actually lands on the Issues page.
 */
import { chromium } from "@playwright/test";
import { loadAgentOpsOwnerEnv } from "./load-agentops-owner-env.mjs";

loadAgentOpsOwnerEnv();

const base = process.env.AGENTOPS_QA_BASE_URL || "https://ai-xia-staging.vercel.app";
const email = process.env.AGENTOPS_QA_OWNER_EMAIL?.trim();
const password = process.env.AGENTOPS_QA_OWNER_PASSWORD;
if (!email || !password) {
  console.error("Missing owner credentials");
  process.exit(2);
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(`${base}/login`, { waitUntil: "domcontentloaded", timeout: 60_000 });
await page.fill('input[type="email"], input[name="email"]', email);
await page.fill('input[type="password"], input[name="password"]', password);
await page.click('button[type="submit"]');
await page.waitForURL((u) => !u.pathname.includes("/login"), { timeout: 90_000 });
await page.waitForTimeout(2000);

await page.goto(`${base}/system/agent-ops/monitoring`, {
  waitUntil: "domcontentloaded",
  timeout: 90_000,
});
// Wait for the summary + queue panel + recent runs to fully load.
for (let i = 0; i < 60; i += 1) {
  const ready = await page.evaluate(
    () =>
      /Operational checks/i.test(document.body.innerText || "") &&
      document.querySelectorAll('[data-testid="agentops-recent-runs"] li').length > 0,
  );
  if (ready) break;
  await page.waitForTimeout(1000);
}
await page.waitForTimeout(1500);

const result = await page.evaluate(() => {
  const text = document.body.innerText || "";
  const recentRows = [
    ...document.querySelectorAll('[data-testid="agentops-recent-runs"] li'),
  ].map((li) => li.textContent ?? "");
  const outcomes = [
    ...document.querySelectorAll('[data-testid="agentops-run-outcome"]'),
  ].map((el) => el.textContent ?? "");
  return {
    pageLoaded: /Monitoring/.test(text),
    fleetRunHistory: /Fleet run history/.test(text),
    perAgentNote: /Per-agent hourly scan runs appear in the staging worker queue/.test(text),
    crosslinks: Boolean(
      document.querySelector('[data-testid="agentops-monitoring-crosslinks"]'),
    ),
    recentRunsCount: recentRows.length,
    outcomesCount: outcomes.length,
    sampleOutcomes: outcomes.slice(0, 4),
    hasIssueCounts: outcomes.some((o) => /issue|improvement|findings/i.test(o)),
    operationalValue:
      (text.match(/Operational checks\s*\n?\s*(Healthy|Overdue|No runs recorded)/i) || [])[1] ??
      null,
    weeklyValue:
      (text.match(/Weekly review\s*\n?\s*(Healthy|Overdue|No runs recorded)/i) || [])[1] ?? null,
    hasOpenIssuesInboxRow: /Open Issues inbox/.test(text),
    workerBadges: /Worker (online|offline)/.test(text),
  };
});

// Cross-link navigation: Open Issues inbox from a run row (or crosslinks section).
let issuesNav = { clicked: false, landedOnIssues: false, inboxHelper: false };
const runOpenIssues = page.locator('[data-testid="agentops-run-open-issues"]').first();
const crossLink = page.getByRole("button", { name: "Open Issues inbox" }).first();
const target = (await runOpenIssues.count()) > 0 ? runOpenIssues : crossLink;
if ((await target.count()) > 0) {
  await target.click();
  await page.waitForTimeout(4000);
  issuesNav = await page.evaluate(() => ({
    clicked: true,
    landedOnIssues: location.pathname === "/system/agent-ops/issues",
    inboxHelper: Boolean(
      document.querySelector('[data-testid="agentops-issues-inbox-helper"]'),
    ),
  }));
}

// Agent link from recent runs → agent page (back on monitoring).
await page.goto(`${base}/system/agent-ops/monitoring`, { waitUntil: "domcontentloaded" });
await page
  .waitForSelector('[data-testid="agentops-recent-runs"] li', { timeout: 60_000 })
  .catch(() => null);
let agentNav = { clicked: false, landedOnAgent: false };
const agentLink = page
  .locator('[data-testid="agentops-recent-runs"] li button')
  .filter({ hasText: /agent/ })
  .first();
if ((await agentLink.count()) > 0) {
  await agentLink.click();
  await page.waitForTimeout(4000);
  agentNav = await page.evaluate(() => ({
    clicked: true,
    landedOnAgent: /^\/system\/agent-ops\/agents\/[a-z-]+$/.test(location.pathname),
  }));
}

// Mobile overflow.
await page.setViewportSize({ width: 390, height: 844 });
await page.goto(`${base}/system/agent-ops/monitoring`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(6000);
const mobile = await page.evaluate(() => ({
  overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 2,
}));

await browser.close();

const ok =
  result.pageLoaded &&
  result.fleetRunHistory &&
  result.perAgentNote &&
  result.crosslinks &&
  result.recentRunsCount > 0 &&
  result.hasIssueCounts &&
  Boolean(result.operationalValue) &&
  Boolean(result.weeklyValue) &&
  issuesNav.landedOnIssues &&
  issuesNav.inboxHelper &&
  agentNav.landedOnAgent &&
  !mobile.overflow;

console.log(
  JSON.stringify(
    { at: new Date().toISOString(), base, ok, ...result, issuesNav, agentNav, mobile },
    null,
    2,
  ),
);
process.exit(ok ? 0 : 2);
