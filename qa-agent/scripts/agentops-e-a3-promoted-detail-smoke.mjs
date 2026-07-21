/**
 * Post-deploy smoke: promoted BQA detail must load (not "Finding not found").
 */
import fs from "fs";
import path from "path";
import { chromium } from "@playwright/test";
import { loadAgentOpsOwnerEnv } from "./load-agentops-owner-env.mjs";

loadAgentOpsOwnerEnv();

const base = process.env.AGENTOPS_QA_BASE_URL || "https://ai-xia-staging.vercel.app";
const email = process.env.AGENTOPS_QA_OWNER_EMAIL?.trim();
const password = process.env.AGENTOPS_QA_OWNER_PASSWORD;
const routes = (
  process.env.AGENTOPS_E_A3_PROMOTED_ROUTES ||
  "/system/agent-ops/issues/BQA-F956B002,/system/agent-ops/issues/BQA-659157F4"
).split(",");
const outDir = path.join("qa-agent", "browser-qa-artifacts", "phase-e-a3-promoted-smoke");
fs.mkdirSync(outDir, { recursive: true });

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
await page.waitForTimeout(2500);

const results = [];
for (const route of routes.map((r) => r.trim()).filter(Boolean)) {
  await page.goto(`${base}${route}`, { waitUntil: "domcontentloaded", timeout: 90_000 });
  await page
    .waitForFunction(
      () => {
        const text = (document.body?.innerText || "").trim();
        if (text.length < 40) return false;
        if (/Finding not found|Could not load this page|Owner gate timed out/i.test(text)) {
          return true;
        }
        if (/Fix Issue Prompt|Reported by|Promoted issue|E-A2 TEST|E-A3 TEST/i.test(text)) {
          return true;
        }
        if (/Loading finding|\bLoading\b/i.test(text) && !/Reported by/i.test(text)) {
          return false;
        }
        return true;
      },
      { timeout: 120_000 },
    )
    .catch(() => null);
  await page.waitForTimeout(1500);
  const snap = await page.evaluate(() => {
    const text = document.body?.innerText || "";
    return {
      url: location.href,
      notFound: /Finding not found/i.test(text),
      hasReportedBy: /Reported by/i.test(text),
      hasFixPrompt: /Fix Issue Prompt|Suggested fix/i.test(text),
      hasFound: /\bFound\b/i.test(text),
      titleOk: /E-A2 TEST|E-A3 TEST|Promote|BQA-/i.test(text),
      loadError: /Could not load this page|Owner gate timed out/i.test(text),
      snippet: text.replace(/\s+/g, " ").trim().slice(0, 400),
    };
  });
  const safeName = route.replace(/[^\w.-]+/g, "_");
  await page.screenshot({ path: path.join(outDir, `${safeName}.png`), fullPage: true });
  results.push({
    route,
    ...snap,
    pass: !snap.notFound && !snap.loadError && (snap.hasReportedBy || snap.hasFixPrompt),
  });
}

await browser.close();
const ok = results.some((r) => r.pass);
const report = { at: new Date().toISOString(), base, ok, results };
fs.writeFileSync(path.join(outDir, "smoke.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
process.exit(ok ? 0 : 2);
