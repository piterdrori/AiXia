/**
 * D-F1 live QA — Agent Hermes connection + memory improvement on staging.
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

const agents = [
  "system-agent",
  "design-agent",
  "qa-agent",
  "analytics-agent",
  "runtime-agent",
  "logs-agent",
];

const outDir = path.join("qa-agent", "browser-qa-artifacts", "phase-d-f1-hermes-memory");
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

await page.goto(`${base}/login`, { waitUntil: "domcontentloaded", timeout: 60_000 });
await page.fill('input[type="email"], input[name="email"]', email);
await page.fill('input[type="password"], input[name="password"]', password);
await page.click('button[type="submit"]');
await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 60_000 });

async function openAgent(slug) {
  await page.goto(`${base}/system/agent-ops/agents/${slug}`, {
    waitUntil: "domcontentloaded",
    timeout: 90_000,
  });
  await page.waitForSelector('[data-testid="agentops-hermes-summary"]', { timeout: 90_000 });
  await page.waitForFunction(() => {
    const el = document.querySelector('[data-testid="memory-summary-agent-hermes"]');
    const t = (el?.textContent || "").trim();
    return t && !t.includes("…");
  }, { timeout: 90_000 });
  await page.waitForTimeout(800);
}

async function probe() {
  return page.evaluate(() => {
    const text = (id) =>
      (document.querySelector(`[data-testid="${id}"]`)?.textContent || "")
        .replace(/\s+/g, " ")
        .trim();
    const body = document.body.innerText.replace(/\s+/g, " ");
    return {
      fleet: text("memory-summary-fleet-hermes"),
      agentHermes: text("memory-summary-agent-hermes"),
      namespace: text("memory-summary-namespace"),
      approved: text("memory-summary-approved"),
      pending: text("memory-summary-pending"),
      diagnostics: text("memory-summary-diagnostics"),
      connectedBanner: Boolean(document.querySelector('[data-testid="agentops-hermes-connected-banner"]')),
      notConfiguredBanner: Boolean(
        document.querySelector('[data-testid="agentops-hermes-no-per-agent-banner"]'),
      ),
      diagnosticsToggle: (document.querySelector('[data-testid="agentops-diagnostics-toggle"]')
        ?.textContent || "").replace(/\s+/g, " ").trim(),
      bodyHasFalseConnectedOnlyFleet: /fleet level.*Connected/i.test(body),
    };
  });
}

const agentResults = [];
const namespaces = [];

for (const slug of agents) {
  await openAgent(slug);
  const p = await probe();
  namespaces.push(p.namespace);
  const checks = {
    agentHermesConnected: /Connected/i.test(p.agentHermes),
    namespaceUniqueShape: new RegExp(`agentops\\.agent\\.${slug}`, "i").test(p.namespace),
    approvedClear: /active|Unavailable|…/i.test(p.approved),
    pendingClear: /None|\d+|Unavailable/i.test(p.pending),
    diagnosticsCollapsedLabel: /collapsed|Diagnostics/i.test(p.diagnostics),
    connectedBanner: p.connectedBanner,
    noNotConfiguredBanner: !p.notConfiguredBanner,
  };
  await page.screenshot({
    path: path.join(outDir, `${slug}-1440.png`),
    fullPage: false,
  });
  if (slug === "design-agent" || slug === "system-agent") {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(outDir, `${slug}-390.png`),
      fullPage: false,
    });
    await page.setViewportSize({ width: 1440, height: 900 });
  }
  agentResults.push({
    slug,
    pass: Object.values(checks).every(Boolean),
    checks,
    probe: p,
  });
  console.log(JSON.stringify({ slug, pass: Object.values(checks).every(Boolean), checks, probe: p }, null, 2));
}

const uniqueNamespaces = new Set(namespaces.map((n) => n.replace(/^Namespace/i, "").trim())).size === namespaces.length;

// Memory improvement live test on design-agent
await openAgent("design-agent");
await page.getByRole("button", { name: /Pending improvements/i }).click();
await page.waitForSelector('[data-testid="agentops-memory-improvement-input"]', { timeout: 30_000 });

const uniqueMark = `D-F1-${Date.now()}`;
const improvementText = `Design Agent should remember that Agent Detail UI must prioritize owner-readable status over raw diagnostics. [${uniqueMark}]`;
await page.fill('[data-testid="agentops-memory-improvement-input"]', improvementText);
await page.click('[data-testid="agentops-propose-memory-improvement"]');
await page.waitForTimeout(2500);

const pendingAfter = await page.evaluate((mark) => {
  const body = document.body.innerText;
  return {
    hasPending: body.includes(mark),
    approvedTabHas: false,
  };
}, uniqueMark);

await page.getByRole("button", { name: /Approved memory/i }).click();
await page.waitForTimeout(800);
const approvedBefore = await page.evaluate((mark) => document.body.innerText.includes(mark), uniqueMark);

await page.getByRole("button", { name: /Pending improvements/i }).click();
await page.waitForTimeout(800);

// Approve the newest pending matching mark
const approveClicked = await page.evaluate(async (mark) => {
  const items = [...document.querySelectorAll('[data-testid="agentops-memory-tab-pending"] li')];
  const hit = items.find((li) => (li.textContent || "").includes(mark));
  if (!hit) return false;
  const btn = hit.querySelector("button");
  // Prefer Approve button
  const approve = [...hit.querySelectorAll("button")].find((b) => /Approve/i.test(b.textContent || ""));
  (approve || btn)?.click();
  return true;
}, uniqueMark);

await page.waitForTimeout(2500);
await page.getByRole("button", { name: /Approved memory/i }).click();
await page.waitForTimeout(1000);
const approvedAfter = await page.evaluate((mark) => document.body.innerText.includes(mark), uniqueMark);

// Cross-agent: qa-agent must not show the design-agent approved text
await openAgent("qa-agent");
await page.getByRole("button", { name: /Approved memory/i }).click();
await page.waitForTimeout(1000);
const qaHasDesignMemory = await page.evaluate((mark) => document.body.innerText.includes(mark), uniqueMark);

// Reject another draft
await openAgent("design-agent");
await page.getByRole("button", { name: /Pending improvements/i }).click();
await page.waitForSelector('[data-testid="agentops-memory-improvement-input"]', { timeout: 30_000 });
const rejectMark = `D-F1-REJECT-${Date.now()}`;
const rejectText = `Temporary reject candidate for D-F1 live test. [${rejectMark}]`;
await page.fill('[data-testid="agentops-memory-improvement-input"]', rejectText);
await page.click('[data-testid="agentops-propose-memory-improvement"]');
await page.waitForTimeout(2500);
const rejected = await page.evaluate(async (mark) => {
  const items = [...document.querySelectorAll('[data-testid="agentops-memory-tab-pending"] li')];
  const hit = items.find((li) => (li.textContent || "").includes(mark));
  if (!hit) return false;
  const reject = [...hit.querySelectorAll("button")].find((b) => /Reject/i.test(b.textContent || ""));
  reject?.click();
  return Boolean(reject);
}, rejectMark);
await page.waitForTimeout(2000);
const stillPendingReject = await page.evaluate((mark) => document.body.innerText.includes(mark), rejectMark);

// Test Hermes
await page.getByRole("button", { name: /Test Hermes connection/i }).click();
await page.waitForSelector('[data-testid="agentops-hermes-test-result"]', { timeout: 60_000 });
const testText = await page.locator('[data-testid="agentops-hermes-test-result"]').innerText();

await page.screenshot({
  path: path.join(outDir, "design-agent-after-memory-test.png"),
  fullPage: false,
});

await browser.close();

const improvementPass =
  pendingAfter.hasPending &&
  !approvedBefore &&
  approveClicked &&
  approvedAfter &&
  !qaHasDesignMemory &&
  rejected &&
  !stillPendingReject &&
  /Agent Hermes:\s*Connected/i.test(testText) &&
  /Namespace:\s*agentops\.agent\.design-agent/i.test(testText);

const summary = {
  base,
  at: new Date().toISOString(),
  uniqueNamespaces,
  agentsPass: agentResults.every((r) => r.pass),
  agentResults,
  improvement: {
    pendingAfter,
    approvedBefore,
    approveClicked,
    approvedAfter,
    qaHasDesignMemory,
    rejected,
    stillPendingReject,
    testText: testText.replace(/\s+/g, " ").slice(0, 400),
    pass: improvementPass,
  },
  allPass: agentResults.every((r) => r.pass) && uniqueNamespaces && improvementPass,
};

const summaryPath = path.join(
  "qa-agent",
  "reports",
  "runtime",
  `phase-d-f1-hermes-memory-live-${Date.now()}.json`,
);
fs.mkdirSync(path.dirname(summaryPath), { recursive: true });
fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
console.log(JSON.stringify({ summaryPath, allPass: summary.allPass, improvementPass, uniqueNamespaces }, null, 2));
process.exit(summary.allPass ? 0 : 1);
