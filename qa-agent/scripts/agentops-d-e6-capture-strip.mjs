import path from "path";
import { chromium } from "@playwright/test";
import { loadAgentOpsOwnerEnv } from "./load-agentops-owner-env.mjs";

loadAgentOpsOwnerEnv();
const base = process.env.AGENTOPS_QA_BASE_URL || "https://ai-xia-staging.vercel.app";
const email = process.env.AGENTOPS_QA_OWNER_EMAIL?.trim();
const password = process.env.AGENTOPS_QA_OWNER_PASSWORD;
if (!email || !password) process.exit(2);

const outDir = path.join("qa-agent", "browser-qa-artifacts", "phase-d-e6-status-strip");
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(`${base}/login`, { waitUntil: "domcontentloaded", timeout: 60_000 });
await page.fill('input[type="email"], input[name="email"]', email);
await page.fill('input[type="password"], input[name="password"]', password);
await page.click('button[type="submit"]');
await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 60_000 });

for (const slug of ["design-agent", "system-agent", "runtime-agent"]) {
  await page.goto(`${base}/system/agent-ops/agents/${slug}`, {
    waitUntil: "domcontentloaded",
    timeout: 90_000,
  });
  await page.waitForSelector('[data-testid="strip-last-scan"]', { timeout: 90_000 });
  await page.waitForFunction(() => {
    const t = document.querySelector('[data-testid="strip-last-scan"]')?.textContent || "";
    return t && !(/Not recorded/i.test(t) && /…|\.\.\./.test(t));
  }, { timeout: 90_000 });
  await page.waitForTimeout(1000);
  await page.evaluate(() => {
    const el =
      document.querySelector('[data-testid="agentops-agent-control-header"]') ||
      document.querySelector('[data-testid="agentops-agent-status-strip"]');
    el?.scrollIntoView({ block: "start" });
  });
  await page.screenshot({
    path: path.join(outDir, `${slug}-header-strip-1440.png`),
    fullPage: false,
  });
  await page.locator('[data-testid="agentops-agent-status-strip"]').screenshot({
    path: path.join(outDir, `${slug}-strip-only.png`),
  });
  console.log("captured", slug);
}
await browser.close();
