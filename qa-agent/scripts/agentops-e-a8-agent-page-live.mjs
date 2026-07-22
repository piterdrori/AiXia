/**
 * E-A8 — agent detail last-run consistency + frequency label live QA.
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

await page.goto(`${base}/system/agent-ops/agents/system-agent`, {
  waitUntil: "domcontentloaded",
  timeout: 90_000,
});
await page
  .waitForSelector('[data-testid="agentops-schedule-summary"]', { timeout: 90_000 })
  .catch(() => null);
// Wait until the Last run strip cell finishes resolving (not the "…" placeholder).
for (let i = 0; i < 45; i += 1) {
  const settled = await page.evaluate(() => {
    const cell = document.querySelector('[data-testid="strip-last-scan"]')?.textContent ?? "";
    return cell.length > 0 && !cell.includes("…") && !/Not recorded/.test(cell);
  });
  if (settled) break;
  await page.waitForTimeout(1000);
}
await page.waitForTimeout(1000);

const result = await page.evaluate(() => {
  const stripLastRun =
    document.querySelector('[data-testid="strip-last-scan"]')?.textContent ?? "";
  const summary =
    document.querySelector('[data-testid="agentops-schedule-summary"]')?.textContent ?? "";
  const frequencyMatch = summary.match(/Frequency(.*?)(Scope|Next due)/s);
  const lastRunMatch = summary.match(/Last run\s*([0-9/,: ]+[AP]M)/);
  const stripDateMatch = stripLastRun.match(/([0-9]{1,2}\/[0-9]{1,2}\/[0-9]{4})/);
  return {
    stripLastRunText: stripLastRun.trim().slice(0, 120),
    stripDate: stripDateMatch ? stripDateMatch[1] : null,
    frequencyText: frequencyMatch ? frequencyMatch[1].trim().slice(0, 60) : null,
    scheduleLastRun: lastRunMatch ? lastRunMatch[1].trim() : null,
    hasEveryHoursBug: /every hours/i.test(summary),
  };
});

// The strip and schedule card must agree on the same calendar day.
const scheduleDate = result.scheduleLastRun
  ? result.scheduleLastRun.split(",")[0].trim()
  : null;
const consistent =
  result.stripDate != null && scheduleDate != null && result.stripDate === scheduleDate;

const ok =
  consistent &&
  !result.hasEveryHoursBug &&
  Boolean(result.frequencyText) &&
  /Every \d+ hour/i.test(result.frequencyText ?? "");

await browser.close();
console.log(JSON.stringify({ at: new Date().toISOString(), base, ok, ...result, scheduleDate, consistent }, null, 2));
process.exit(ok ? 0 : 2);
