/**
 * D-E5 — live online-state QA on staging alias (local Playwright, not Vercel).
 * Requires durable staging worker heartbeats fresh on the host.
 */
import fs from "fs";
import path from "path";
import { chromium } from "@playwright/test";
import { loadAgentOpsOwnerEnv } from "./load-agentops-owner-env.mjs";

loadAgentOpsOwnerEnv();

const base = process.env.AGENTOPS_QA_BASE_URL || "https://ai-xia-staging.vercel.app";
const email = process.env.AGENTOPS_QA_OWNER_EMAIL?.trim();
const password = process.env.AGENTOPS_QA_OWNER_PASSWORD;
const shotDir = path.join("qa-agent", "browser-qa-artifacts", "phase-d-e5-online-state");
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

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitForRunTerminal(page, timeoutMs = 240_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const body = await page.locator("body").innerText();
    if (/\b(completed|failed|canceled)\b/i.test(body) && /run/i.test(body)) {
      const drawer = page.locator('[data-testid="agentops-run-detail-drawer"], [role="dialog"]');
      if ((await drawer.count()) > 0) return true;
    }
    const activity = await page
      .locator('[data-testid="agentops-manual-run-activity"]')
      .innerText()
      .catch(() => "");
    if (/completed|failed|canceled/i.test(activity)) return true;
    await sleep(4000);
    await page.reload({ waitUntil: "domcontentloaded" }).catch(() => null);
    await page
      .waitForSelector('[data-testid="agentops-agent-control-header"]', { timeout: 30_000 })
      .catch(() => null);
  }
  return false;
}

const report = {
  base,
  agents: [],
  runAudit: null,
  runBrowserQa: null,
  onlinePrime: null,
  ok: false,
};

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

try {
  await page.goto(`${base}/login`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.fill('input[type="email"], input[name="email"]', email);
  await page.fill('input[type="password"], input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 60_000 });

  for (const slug of agents) {
    const row = {
      slug,
      loaded: false,
      workerOnline: false,
      scheduleExecutableOrManual: false,
      auditToolsReady: false,
      runAuditEnabled: false,
      runBrowserQaEnabled: false,
      memorySummary: false,
      diagnosticsCollapsed: true,
      promptLikeInMainRuntime: false,
      mobileOk: true,
      noGithub: true,
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
      row.loaded = true;

      const headerText = await page
        .locator('[data-testid="agentops-agent-control-header"]')
        .innerText();
      row.workerOnline = /Worker online/i.test(headerText);
      row.scheduleExecutableOrManual =
        /Schedule executable|Manual only|Scheduler offline/i.test(headerText);
      row.auditToolsReady = /Audit tools ready/i.test(headerText);
      row.noGithub = !/GitHub Actions|workflow_dispatch/i.test(headerText);

      const auditBtn = page.locator('[data-testid="agentops-run-audit-now"]');
      const bqBtn = page.locator('[data-testid="agentops-run-browser-qa-now"]');
      row.runAuditEnabled = (await auditBtn.count()) > 0 && (await auditBtn.isEnabled());
      row.runBrowserQaEnabled = (await bqBtn.count()) > 0 && (await bqBtn.isEnabled());

      await page
        .waitForSelector('[data-testid="agentops-hermes-summary"]', { timeout: 45_000 })
        .catch(() => null);
      row.memorySummary = Boolean(await page.$('[data-testid="memory-summary-runtime"]'));

      const diagDetails = page.locator(
        '[data-testid="agentops-memory-diagnostics"], details:has-text("Diagnostics")',
      );
      if ((await diagDetails.count()) > 0) {
        row.diagnosticsCollapsed = !(await diagDetails.first().evaluate((el) =>
          el.tagName === "DETAILS" ? el.open : false,
        ));
      }

      const runtimeTab = page.locator('button:has-text("Runtime"), [role="tab"]:has-text("Runtime")');
      if ((await runtimeTab.count()) > 0) {
        await runtimeTab.first().click().catch(() => null);
        await sleep(500);
        const runtimeText = await page
          .locator('[data-testid="agentops-agent-memory-hermes-panel"]')
          .innerText()
          .catch(() => "");
        row.promptLikeInMainRuntime =
          /Inspect this page|remember this test rule|hello,\s*describe your role/i.test(
            runtimeText,
          ) && !/Diagnostics/i.test(runtimeText.slice(0, 200));
        // If diagnostics section contains them but main list shouldn't — check useful list only.
        const usefulList = page.locator(
          '[data-testid="agentops-runtime-useful-list"], [data-testid="agentops-memory-runtime-list"]',
        );
        if ((await usefulList.count()) > 0) {
          const usefulText = await usefulList.first().innerText();
          row.promptLikeInMainRuntime =
            /Inspect this page|remember this test rule|hello,\s*describe your role/i.test(
              usefulText,
            );
        }
      }

      await page.screenshot({
        path: path.join(shotDir, `${slug}-1440.png`),
        fullPage: true,
      });

      await page.setViewportSize({ width: 390, height: 844 });
      await sleep(300);
      await page.screenshot({ path: path.join(shotDir, `${slug}-390.png`), fullPage: true });
      const overflow = await page.evaluate(() => {
        const doc = document.documentElement;
        return doc.scrollWidth > doc.clientWidth + 8;
      });
      row.mobileOk = !overflow;
    } catch (err) {
      row.error = String(err?.message || err);
    }
    report.agents.push(row);
  }

  report.onlinePrime = {
    design: report.agents.find((a) => a.slug === "design-agent") || null,
    system: report.agents.find((a) => a.slug === "system-agent") || null,
    qa: report.agents.find((a) => a.slug === "qa-agent") || null,
  };

  // Run audit now + Browser QA now on design-agent
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${base}/system/agent-ops/agents/design-agent`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await page.waitForSelector('[data-testid="agentops-run-audit-now"]', { timeout: 45_000 });

  const auditEnabled = await page.locator('[data-testid="agentops-run-audit-now"]').isEnabled();
  report.runAudit = { started: false, confirmed: false, finished: false, enabled: auditEnabled };
  if (auditEnabled) {
    await page.locator('[data-testid="agentops-run-audit-now"]').click();
    await page.waitForSelector('[data-testid="agentops-manual-run-confirm"]', { timeout: 15_000 });
    report.runAudit.started = true;
    await page.screenshot({ path: path.join(shotDir, "design-run-audit-confirm.png") });
    await page
      .locator('[data-testid="agentops-manual-run-confirm"] button:has-text("Start")')
      .first()
      .click();
    report.runAudit.confirmed = true;
    report.runAudit.finished = await waitForRunTerminal(page, 300_000);
    await page.screenshot({
      path: path.join(shotDir, "design-run-audit-after.png"),
      fullPage: true,
    });
  }

  await page.goto(`${base}/system/agent-ops/agents/design-agent`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await page.waitForSelector('[data-testid="agentops-run-browser-qa-now"]', { timeout: 45_000 });
  // Wait until previous run clears if needed
  for (let i = 0; i < 30; i++) {
    if (await page.locator('[data-testid="agentops-run-browser-qa-now"]').isEnabled()) break;
    await sleep(5000);
    await page.reload({ waitUntil: "domcontentloaded" });
  }
  const bqEnabled = await page.locator('[data-testid="agentops-run-browser-qa-now"]').isEnabled();
  report.runBrowserQa = { started: false, confirmed: false, finished: false, enabled: bqEnabled };
  if (bqEnabled) {
    await page.locator('[data-testid="agentops-run-browser-qa-now"]').click();
    await page.waitForSelector('[data-testid="agentops-manual-run-confirm"]', { timeout: 15_000 });
    report.runBrowserQa.started = true;
    await page.screenshot({ path: path.join(shotDir, "design-run-browser-qa-confirm.png") });
    await page
      .locator('[data-testid="agentops-manual-run-confirm"] button:has-text("Start")')
      .first()
      .click();
    report.runBrowserQa.confirmed = true;
    report.runBrowserQa.finished = await waitForRunTerminal(page, 300_000);
    await page.screenshot({
      path: path.join(shotDir, "design-run-browser-qa-after.png"),
      fullPage: true,
    });
  }

  const allLoaded = report.agents.every((a) => a.loaded);
  const onlineOk = report.agents.every(
    (a) => a.workerOnline && a.auditToolsReady && a.runAuditEnabled && a.runBrowserQaEnabled,
  );
  const memoryOk = report.agents.every(
    (a) => a.memorySummary && a.diagnosticsCollapsed && !a.promptLikeInMainRuntime,
  );
  report.ok =
    allLoaded &&
    onlineOk &&
    memoryOk &&
    report.runAudit?.confirmed &&
    report.runAudit?.finished &&
    report.runBrowserQa?.confirmed &&
    report.runBrowserQa?.finished;

  const outPath = path.join(
    "qa-agent",
    "reports",
    "runtime",
    `phase-d-e5-online-state-live-${Date.now()}.json`,
  );
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ ...report, reportPath: outPath }, null, 2));
  process.exit(report.ok ? 0 : 1);
} catch (err) {
  console.error(String(err?.stack || err));
  process.exit(1);
} finally {
  await browser.close();
}
