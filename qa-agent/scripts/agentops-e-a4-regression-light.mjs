/**
 * E-A4 — light previous-page regression after Issues polish.
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

const routes = [
  "/system/agent-ops",
  "/system/agent-ops/agents",
  "/system/agent-ops/agents/design-agent",
];

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(`${base}/login`, { waitUntil: "domcontentloaded", timeout: 60_000 });
await page.fill('input[type="email"], input[name="email"]', email);
await page.fill('input[type="password"], input[name="password"]', password);
await page.click('button[type="submit"]');
await page.waitForURL((u) => !u.pathname.includes("/login"), { timeout: 90_000 });
await page.waitForTimeout(2000);

const results = {};
for (const route of routes) {
  await page.goto(`${base}${route}`, { waitUntil: "domcontentloaded", timeout: 90_000 });
  await page.waitForTimeout(4000);
  results[route] = await page.evaluate(() => {
    const text = document.body.innerText || "";
    return {
      loaded: text.length > 200,
      noApprovePromote: !/Approve finding|Reject finding|Promote finding/i.test(text),
      hasHermesOrWorker: /Hermes|Worker online|Worker offline|Staging worker/i.test(text),
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 2,
    };
  });
}
await browser.close();
const ok = Object.values(results).every((r) => r.loaded && r.noApprovePromote && !r.overflow);
console.log(JSON.stringify({ at: new Date().toISOString(), base, ok, results }, null, 2));
process.exit(ok ? 0 : 2);
