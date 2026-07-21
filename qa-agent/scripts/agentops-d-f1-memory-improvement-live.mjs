import { chromium } from "@playwright/test";
import { loadAgentOpsOwnerEnv } from "./load-agentops-owner-env.mjs";

loadAgentOpsOwnerEnv();
const base = process.env.AGENTOPS_QA_BASE_URL || "https://ai-xia-staging.vercel.app";
const email = process.env.AGENTOPS_QA_OWNER_EMAIL?.trim();
const password = process.env.AGENTOPS_QA_OWNER_PASSWORD;
if (!email || !password) process.exit(2);

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(`${base}/login`, { waitUntil: "domcontentloaded", timeout: 60_000 });
await page.fill('input[type="email"], input[name="email"]', email);
await page.fill('input[type="password"], input[name="password"]', password);
await page.click('button[type="submit"]');
await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 60_000 });

async function openDesign() {
  await page.goto(`${base}/system/agent-ops/agents/design-agent`, {
    waitUntil: "domcontentloaded",
    timeout: 90_000,
  });
  await page.waitForSelector('[data-testid="memory-summary-agent-hermes"]', { timeout: 90_000 });
  await page.waitForFunction(
    () => /Connected/i.test(document.querySelector('[data-testid="memory-summary-agent-hermes"]')?.textContent || ""),
    { timeout: 120_000 },
  );
}

await openDesign();
await page.getByRole("button", { name: /Pending improvements/i }).click();
await page.waitForSelector('[data-testid="agentops-memory-improvement-input"]');

const mark = `D-F1-IMP-${Date.now()}`;
const text = `Design Agent should remember that Agent Detail UI must prioritize owner-readable status over raw diagnostics. [${mark}]`;
await page.fill('[data-testid="agentops-memory-improvement-input"]', text);
await page.click('[data-testid="agentops-propose-memory-improvement"]');
await page.waitForFunction((m) => document.body.innerText.includes(m), mark, { timeout: 60_000 });
const pending = await page.evaluate((m) => document.body.innerText.includes(m), mark);

await page.getByRole("button", { name: /Approved memory/i }).click();
await page.waitForTimeout(1000);
const inApprovedBefore = await page.evaluate((m) => document.body.innerText.includes(m), mark);

await page.getByRole("button", { name: /Pending improvements/i }).click();
await page.waitForTimeout(1000);
await page.evaluate((m) => {
  const items = [...document.querySelectorAll('[data-testid="agentops-memory-tab-pending"] li')];
  const hit = items.find((li) => (li.textContent || "").includes(m));
  const btn = [...(hit?.querySelectorAll("button") || [])].find((b) =>
    /Approve/i.test(b.textContent || ""),
  );
  btn?.click();
}, mark);
await page.waitForTimeout(3000);
await page.getByRole("button", { name: /Approved memory/i }).click();
await page.waitForTimeout(1500);
const inApprovedAfter = await page.evaluate((m) => document.body.innerText.includes(m), mark);

const rejectMark = `D-F1-REJ-${Date.now()}`;
await page.getByRole("button", { name: /Pending improvements/i }).click();
await page.fill(
  '[data-testid="agentops-memory-improvement-input"]',
  `Reject candidate [${rejectMark}]`,
);
await page.click('[data-testid="agentops-propose-memory-improvement"]');
await page.waitForFunction((m) => document.body.innerText.includes(m), rejectMark, {
  timeout: 60_000,
});
await page.evaluate((m) => {
  const items = [...document.querySelectorAll('[data-testid="agentops-memory-tab-pending"] li')];
  const hit = items.find((li) => (li.textContent || "").includes(m));
  const btn = [...(hit?.querySelectorAll("button") || [])].find((b) =>
    /Reject/i.test(b.textContent || ""),
  );
  btn?.click();
}, rejectMark);
await page.waitForTimeout(3000);
const stillRejectPending = await page.evaluate((m) => {
  const tab = document.querySelector('[data-testid="agentops-memory-tab-pending"]');
  return (tab?.innerText || "").includes(m);
}, rejectMark);

await page.goto(`${base}/system/agent-ops/agents/qa-agent`, {
  waitUntil: "domcontentloaded",
  timeout: 90_000,
});
await page.waitForSelector('[data-testid="memory-summary-agent-hermes"]', { timeout: 90_000 });
await page.waitForFunction(
  () => /Connected/i.test(document.querySelector('[data-testid="memory-summary-agent-hermes"]')?.textContent || ""),
  { timeout: 120_000 },
);
await page.getByRole("button", { name: /Approved memory/i }).click();
await page.waitForTimeout(1500);
const qaHas = await page.evaluate((m) => document.body.innerText.includes(m), mark);

const pass =
  pending && !inApprovedBefore && inApprovedAfter && !stillRejectPending && !qaHas;
console.log(
  JSON.stringify(
    { pending, inApprovedBefore, inApprovedAfter, stillRejectPending, qaHas, pass },
    null,
    2,
  ),
);
await browser.close();
process.exit(pass ? 0 : 1);
