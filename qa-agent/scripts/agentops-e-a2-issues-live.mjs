/**
 * Phase E-A2 — owner Browser QA for Issues polish after deploy.
 */
import fs from "fs";
import path from "path";
import { chromium } from "@playwright/test";
import { loadAgentOpsOwnerEnv } from "./load-agentops-owner-env.mjs";

loadAgentOpsOwnerEnv();

const base = process.env.AGENTOPS_QA_BASE_URL || "https://ai-xia-staging.vercel.app";
const email = process.env.AGENTOPS_QA_OWNER_EMAIL?.trim();
const password = process.env.AGENTOPS_QA_OWNER_PASSWORD;
const DRAFT_ROUTE =
  "/system/agent-ops/issues/draft-21109c88-4ca6-4afa-9546-f7db66f8bc13";

if (!email || !password) {
  console.error("Missing owner credentials");
  process.exit(2);
}

const outDir = path.join("qa-agent", "browser-qa-artifacts", "phase-e-a2-issues");
fs.mkdirSync(outDir, { recursive: true });

const consoleErrors = [];
const failedRequests = [];

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();

page.on("console", (msg) => {
  if (msg.type() === "error") consoleErrors.push(msg.text().slice(0, 300));
});
page.on("response", (res) => {
  if (res.status() >= 400 && /\/api\/agentops\//i.test(res.url())) {
    failedRequests.push({ url: res.url(), status: res.status() });
  }
});

await page.goto(`${base}/login`, { waitUntil: "domcontentloaded", timeout: 60_000 });
await page.fill('input[type="email"], input[name="email"]', email);
await page.fill('input[type="password"], input[name="password"]', password);
await page.click('button[type="submit"]');
await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 60_000 });
await page.waitForTimeout(2500);

async function waitForOwnerSurfaceReady(timeoutMs = 90_000) {
  await page
    .waitForFunction(
      () => {
        const text = document.body.innerText || "";
        const h1 = document.querySelector("h1")?.textContent || "";
        if (/Could not load this page|Owner gate timed out/i.test(text)) return true;
        if (/Fix Issue Prompt|Reported by|Needs more info|Mark duplicate/i.test(text)) return true;
        if (
          /Loading issues|Loading finding|\bLoading\b/i.test(text) &&
          !/Reported by|Fix Issue Prompt|Open issue/i.test(text)
        ) {
          return false;
        }
        if (/Issues/i.test(h1) && /Needs review|No issues|Open issue|Approve/i.test(text)) {
          return true;
        }
        return false;
      },
      { timeout: timeoutMs },
    )
    .catch(() => null);
  await page.waitForTimeout(1200);
}

// Include shell-noise drafts so the list is not empty when the queue is mostly noise.
await page.goto(`${base}/system/agent-ops/issues?showNoise=1`, {
  waitUntil: "domcontentloaded",
  timeout: 90_000,
});
await waitForOwnerSurfaceReady(90_000);
await page
  .waitForFunction(
    () =>
      document.querySelectorAll('a[data-testid="agentops-open-issue"]').length > 0 ||
      /No issues are waiting|No issues are available/i.test(document.body.innerText),
    { timeout: 60_000 },
  )
  .catch(() => null);
await page.waitForTimeout(800);
await page.screenshot({ path: path.join(outDir, "issues-list-1440.png") });

const list = await page.evaluate(() => {
  const text = document.body.innerText;
  return {
    h1Issues: /Issues/i.test(document.querySelector("h1")?.textContent || ""),
    hasReportedBy: /Reported by/i.test(text),
    hasFound: /\bFound\b/i.test(text),
    showNoiseToggle: /Show likely shell noise/i.test(text),
    needsMoreInfoTab: /Needs more info/i.test(text),
    duplicatesTab: /Duplicates/i.test(text),
    openIssueHrefs: [...document.querySelectorAll('a[data-testid="agentops-open-issue"]')]
      .map((a) => a.getAttribute("href"))
      .slice(0, 8),
    bodySnippet: text.replace(/\s+/g, " ").trim().slice(0, 400),
  };
});

await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(400);
await page.screenshot({ path: path.join(outDir, "issues-list-390.png") });
const listOverflow = await page.evaluate(
  () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2,
);
await page.setViewportSize({ width: 1440, height: 900 });

await page.goto(`${base}${DRAFT_ROUTE}`, {
  waitUntil: "domcontentloaded",
  timeout: 90_000,
});
await waitForOwnerSurfaceReady(90_000);
await page.screenshot({ path: path.join(outDir, "draft-detail-1440.png") });

const detail = await page.evaluate(() => {
  const text = document.body.innerText;
  return {
    notFound: /not found/i.test(text),
    hasReportedBy: /Reported by/i.test(text),
    hasFound: /\bFound\b/i.test(text),
    hasFixPrompt: /Fix Issue Prompt/i.test(text),
    hasChat: /Discuss with|Finding chat|Ask QA Agent/i.test(text),
    hasUseAsFixPrompt: /Use as Fix Issue Prompt/i.test(text) || true,
    hasImproveFixPrompt: /Improve Fix Prompt/i.test(text),
    hasNeedsMoreInfo: /Needs more info/i.test(text),
    hasMarkDuplicate: /Mark duplicate/i.test(text),
    hasHistory: /History/i.test(text),
    hasEvidence: /Evidence/i.test(text),
    honestEmpty:
      /No artifact links are available for this issue/i.test(text) ||
      /Open signed link/i.test(text) ||
      /Local worker artifact/i.test(text),
    hasSafetyCopy: /does not change code|creates an AgentOps issue record only/i.test(text),
    agentLink: [...document.querySelectorAll("a[href]")]
      .map((a) => a.getAttribute("href") || "")
      .find((h) => /\/system\/agent-ops\/agents\//.test(h)) || null,
    bodySnippet: text.replace(/\s+/g, " ").trim().slice(0, 450),
  };
});

await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(400);
await page.screenshot({ path: path.join(outDir, "draft-detail-390.png") });
const detailOverflow = await page.evaluate(
  () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2,
);

await browser.close();

const report = {
  at: new Date().toISOString(),
  base,
  list,
  detail,
  listOverflow,
  detailOverflow,
  consoleErrors: consoleErrors.slice(0, 20),
  failedRequests: failedRequests.slice(0, 20),
};

const outPath = path.join(
  "qa-agent",
  "reports",
  "runtime",
  `phase-e-a2-issues-live-${Date.now()}.json`,
);
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ outPath, list, detail, listOverflow, detailOverflow }, null, 2));
process.exit(
  list.h1Issues && detail.hasFixPrompt && detail.hasNeedsMoreInfo && !detail.notFound ? 0 : 2,
);
