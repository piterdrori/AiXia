/**
 * Phase D-E6 — live Agent Detail status-strip alignment QA (staging).
 * Does not commit storage_state; does not log secrets.
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
  "design-agent",
  "system-agent",
  "qa-agent",
  "analytics-agent",
  "runtime-agent",
  "logs-agent",
];

const outDir = path.join("qa-agent", "browser-qa-artifacts", "phase-d-e6-status-strip");
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();

await page.goto(`${base}/login`, { waitUntil: "domcontentloaded", timeout: 60_000 });
await page.fill('input[type="email"], input[name="email"]', email);
await page.fill('input[type="password"], input[name="password"]', password);
await page.click('button[type="submit"]');
await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 60_000 });

const results = [];

async function waitForStripSettled() {
  await page.waitForSelector('[data-testid="agentops-agent-status-strip"]', { timeout: 90_000 });
  await page.waitForFunction(
    () => {
      const last = document.querySelector('[data-testid="strip-last-scan"]');
      const text = (last?.textContent || "").replace(/\s+/g, " ").trim();
      // monitoringResolving shows "Not recorded" + "…"
      if (!text) return false;
      if (/Not recorded/i.test(text) && /…|\.\.\./.test(text)) return false;
      return true;
    },
    { timeout: 90_000 },
  );
  // Memory + capability settle
  await page.waitForTimeout(1500);
}

for (const slug of agents) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${base}/system/agent-ops/agents/${slug}`, {
    waitUntil: "domcontentloaded",
    timeout: 90_000,
  });
  await waitForStripSettled();
  await page.evaluate(() => window.scrollTo(0, 0));

  const probe = await page.evaluate(() => {
    const strip = document.querySelector('[data-testid="agentops-agent-status-strip"]');
    const ownerWork = document.querySelector('[data-testid="agentops-owner-work-status"]');
    const worker = document.querySelector('[data-testid="agentops-execution-worker-status"]');
    const scheduler = document.querySelector('[data-testid="agentops-scheduler-status"]');
    const engines = document.querySelector('[data-testid="agentops-engines-ready"]');
    const findings =
      document.querySelector('[data-testid="agentops-findings-panel"]') ||
      document.querySelector('[data-testid="agentops-results-panel"]') ||
      Array.from(document.querySelectorAll("section,div")).find((el) =>
        /Findings|Latest run result/i.test(el.textContent || ""),
      );
    const findingsBody = findings?.textContent || "";
    const runtimeTab = document.querySelector('[data-testid="agentops-memory-tab-runtime"]');
    const diagToggle = document.querySelector('[data-testid="agentops-diagnostics-toggle"]');

    const badgeOf = (root, id) => {
      const cell = root?.querySelector(`[data-testid="${id}"]`);
      if (!cell) return "";
      const badge = cell.querySelector("[class*='badge'], span, [data-tone]");
      // Prefer the first non-label line that looks like the value
      const label = cell.querySelector("p")?.textContent || "";
      const full = (cell.textContent || "").replace(/\s+/g, " ").trim();
      const withoutLabel = full.replace(new RegExp(`^${label.replace(/\s+/g, "\\s+")}`, "i"), "").trim();
      return (badge?.textContent || withoutLabel || full).replace(/\s+/g, " ").trim();
    };

    const detailOf = (root, id) => {
      const cell = root?.querySelector(`[data-testid="${id}"]`);
      if (!cell) return "";
      const ps = [...cell.querySelectorAll("p")];
      // label + optional detail after badge
      return (ps[1]?.textContent || "").replace(/\s+/g, " ").trim();
    };

    const stripOwnerStatus = badgeOf(strip, "strip-agent-status");
    const lastRunValue = badgeOf(strip, "strip-last-scan");
    const lastRunDetail = detailOf(strip, "strip-last-scan");
    const stripMem = badgeOf(strip, "strip-memory-status");
    const stripSched = badgeOf(strip, "strip-schedule-status");
    const stripHermes = badgeOf(strip, "strip-hermes-status");
    const stripActivity = badgeOf(strip, "strip-current-activity");

    const headerOwner = (ownerWork?.textContent || "").replace(/\s+/g, " ").trim();
    const headerOwnerStatus =
      headerOwner.match(/\b(Active|Paused|Unknown|Error|Blocked)\b/i)?.[1] || headerOwner.slice(0, 80);

    const runtimeText = (runtimeTab?.textContent || "").replace(/\s+/g, " ").trim();
    const bodyText = document.body.innerText.replace(/\s+/g, " ");
    const findingsText = findingsBody.replace(/\s+/g, " ").trim();
    const findingsLatest = findingsText.match(/Latest run(?: result)?:\s*([^\n.]+)/i)?.[1]?.trim() || "";

    return {
      headerOwner,
      headerOwnerStatus,
      stripOwnerStatus,
      lastRunValue,
      lastRunDetail,
      stripLast: `${lastRunValue} ${lastRunDetail}`.trim(),
      stripMem,
      stripSched,
      stripHermes,
      stripActivity,
      worker: (worker?.textContent || "").replace(/\s+/g, " ").trim(),
      scheduler: (scheduler?.textContent || "").replace(/\s+/g, " ").trim(),
      engines: (engines?.textContent || "").replace(/\s+/g, " ").trim(),
      findingsLatest,
      findingsSnippet: findingsText.slice(0, 500),
      runtimeText: runtimeText.slice(0, 500),
      diagnosticsCollapsedDefault: !diagToggle || /Expand/i.test(diagToggle.textContent || ""),
      bodyHasOwnerStatusError: /OWNER STATUS:\s*ERROR/i.test(bodyText),
      bodyHasLastScanFailed: /LAST SCAN:\s*FAILED/i.test(bodyText),
      usefulEmptyMentionsDiagnostics:
        /owner-useful runtime memory|diagnostic\/runtime-history|under Diagnostics/i.test(
          runtimeText || bodyText,
        ),
      bareNoRuntimeMemory: /No runtime memory records for this agent\.?/i.test(runtimeText),
      stripHasError: /^Error$/i.test(stripOwnerStatus),
      stripHasFailedPrime: /^Failed$/i.test(lastRunValue),
      stripFleetFallback: /Fleet fallback failed/i.test(lastRunValue),
    };
  });

  const checks = {
    headerStripOwnerAligned:
      String(probe.headerOwnerStatus).toLowerCase() === String(probe.stripOwnerStatus).toLowerCase(),
    noFalseOwnerError:
      !(
        /active/i.test(probe.headerOwnerStatus) &&
        (probe.stripHasError || probe.bodyHasOwnerStatusError)
      ),
    noPrimeLastScanFailedLabel: !probe.bodyHasLastScanFailed,
    lastRunSettled: !/Not recorded/i.test(probe.lastRunValue),
    staleFleetNotPrimeFailed: !(probe.stripHasFailedPrime && /fleet|daily review fallback/i.test(probe.lastRunDetail)),
    fleetFailedLabeledIfUsed: !probe.stripFleetFallback || /fallback/i.test(probe.stripLast),
    findingsAligned:
      !probe.findingsLatest ||
      new RegExp(probe.lastRunValue.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i").test(probe.findingsLatest) ||
      /fleet fallback|fallback/i.test(probe.findingsLatest + " " + probe.stripLast),
    workerOnline: /Worker online|online/i.test(probe.worker),
    scheduleExecutable: /executable|Schedule executable/i.test(probe.stripSched + " " + probe.scheduler),
    auditToolsReady: /Audit tools ready|engines ready|ready/i.test(probe.engines + " " + probe.worker),
    diagnosticsCollapsed: probe.diagnosticsCollapsedDefault,
    memoryCopyOk:
      !probe.bareNoRuntimeMemory || probe.usefulEmptyMentionsDiagnostics || /0 records/i.test(probe.stripMem),
  };

  const shotDesktop = path.join(outDir, `${slug}-1440.png`);
  await page.screenshot({ path: shotDesktop, fullPage: false });

  let shotMobile = null;
  if (slug === "design-agent" || slug === "system-agent") {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(800);
    await page.evaluate(() => window.scrollTo(0, 0));
    shotMobile = path.join(outDir, `${slug}-390.png`);
    await page.screenshot({ path: shotMobile, fullPage: false });
  }

  const pass = Object.values(checks).every(Boolean);
  results.push({
    slug,
    pass,
    checks,
    probe,
    shots: { desktop: shotDesktop, mobile: shotMobile },
  });
  console.log(
    JSON.stringify(
      {
        slug,
        pass,
        headerOwnerStatus: probe.headerOwnerStatus,
        stripOwnerStatus: probe.stripOwnerStatus,
        lastRunValue: probe.lastRunValue,
        lastRunDetail: probe.lastRunDetail?.slice(0, 80),
        findingsLatest: probe.findingsLatest?.slice(0, 80),
        stripMem: probe.stripMem,
        runtimeHint: probe.usefulEmptyMentionsDiagnostics || !probe.bareNoRuntimeMemory,
        worker: probe.worker.slice(0, 80),
        failedChecks: Object.entries(checks)
          .filter(([, v]) => !v)
          .map(([k]) => k),
      },
      null,
      2,
    ),
  );
}

await browser.close();

const summary = {
  base,
  at: new Date().toISOString(),
  allPass: results.every((r) => r.pass),
  results,
};
const summaryPath = path.join("qa-agent", "reports", "runtime", `phase-d-e6-status-strip-live-${Date.now()}.json`);
fs.mkdirSync(path.dirname(summaryPath), { recursive: true });
fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
console.log(JSON.stringify({ summaryPath, allPass: summary.allPass, agents: results.map((r) => ({ slug: r.slug, pass: r.pass })) }, null, 2));
process.exit(summary.allPass ? 0 : 1);
