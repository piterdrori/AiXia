/**
 * D-G0 — longer-wait probe for overview + agents list load truthfulness.
 */
import fs from "fs";
import path from "path";
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

const outDir = path.join("qa-agent", "browser-qa-artifacts", "phase-d-g0-pre-issues");
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const apiHits = [];

page.on("response", (res) => {
  if (/\/api\/agentops\//i.test(res.url())) {
    apiHits.push({ url: res.url().replace(base, ""), status: res.status(), ok: res.ok() });
  }
});

await page.goto(`${base}/login`, { waitUntil: "domcontentloaded", timeout: 60_000 });
await page.fill('input[type="email"], input[name="email"]', email);
await page.fill('input[type="password"], input[name="password"]', password);
await page.click('button[type="submit"]');
await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 60_000 });

async function probe(route, name) {
  apiHits.length = 0;
  await page.goto(`${base}${route}`, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await page.waitForTimeout(12_000);
  const text = await page.evaluate(() => document.body.innerText.replace(/\s+/g, " "));
  const openAgent = await page.getByRole("button", { name: /Open agent/i }).count();
  const loadingCount = (text.match(/Loading…|Loading\.\.\./g) || []).length;
  await page.screenshot({ path: path.join(outDir, `${name}-after-wait.png`), fullPage: true });
  return {
    route,
    openAgent,
    loadingCount,
    hasDesign: /Design Agent/i.test(text),
    hasSystem: /System Agent/i.test(text),
    hasNeedsAttention: /Needs your attention/i.test(text),
    hasRecentActivity: /Recent activity/i.test(text),
    hasWorker: /Worker online|Worker offline|Staging worker/i.test(text),
    hasUnavailable: /unavailable|Failed to load/i.test(text),
    snippet: text.slice(0, 1600),
    apiHits: apiHits.slice(0, 40),
  };
}

const agents = await probe("/system/agent-ops/agents", "agents-list");
const overview = await probe("/system/agent-ops", "overview");
console.log(JSON.stringify({ agents, overview }, null, 2));
await browser.close();
process.exit(0);
