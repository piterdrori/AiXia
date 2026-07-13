import fs from "fs";
import path from "path";
import { chromium } from "@playwright/test";
import { loadAgentOpsOwnerEnv } from "./load-agentops-owner-env.mjs";

loadAgentOpsOwnerEnv();

const base = process.env.AGENTOPS_QA_BASE_URL || "https://ai-xia-staging.vercel.app";
const email = process.env.AGENTOPS_QA_OWNER_EMAIL?.trim();
const password = process.env.AGENTOPS_QA_OWNER_PASSWORD;
const shotDir = path.join("qa-agent", "browser-qa-artifacts", "phase-c-findings");
const reportPath = path.join(
  "qa-agent",
  "reports",
  "browser-qa",
  "agentops-core-ux-phase-c-findings-smoke-report.json",
);

const tabs = [
  "Needs review",
  "Active",
  "Improvements",
  "New features",
  "Verification",
  "Fixed",
  "Deferred",
  "Rejected",
  "All",
];

const report = {
  baseUrl: base,
  startedAt: new Date().toISOString(),
  loginSuccessful: false,
  tabs: {},
  checks: {},
  errors: [],
  screenshots: [],
};

async function shot(page, name) {
  fs.mkdirSync(shotDir, { recursive: true });
  const file = path.join(shotDir, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  report.screenshots.push(file.replaceAll("\\", "/"));
}

async function login(page) {
  await page.goto(`${base}/login`, { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign In" }).click();
  await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 90000 });
  report.loginSuccessful = true;
}

async function openFindings(page) {
  await page.goto(`${base}/system/agent-ops/issues`, {
    waitUntil: "domcontentloaded",
    timeout: 45000,
  });
  await page.getByRole("heading", { name: "Findings", level: 1 }).waitFor({ timeout: 90000 });
  await page.getByText("Loading findings…").waitFor({ state: "hidden", timeout: 90000 }).catch(() => {});
  await page.waitForTimeout(1500);
}

async function main() {
  if (!email || !password) {
    report.errors.push("Owner credentials missing");
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    process.exit(1);
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await login(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await openFindings(page);

    const body = await page.locator("body").innerText();
    report.checks.headerOk =
      /Findings/i.test(body) &&
      /Review issues, improvements, fixes, and feature ideas/i.test(body);
    report.checks.noFakeUnavailableMix = !/Needs review\s*0[\s\S]*Unavailable/i.test(body);
    report.checks.hasSummary =
      /Needs review/i.test(body) &&
      /Active issues/i.test(body) &&
      /Waiting for verification/i.test(body);

    for (const label of tabs) {
      const tab = page.getByRole("tab", { name: label });
      await tab.click();
      await page.getByText("Loading findings…").waitFor({ state: "hidden", timeout: 60000 }).catch(() => {});
      await page.waitForTimeout(800);
      const text = await page.locator("body").innerText();
      const emptyOk =
        /No findings are waiting for your review|No active issues|No improvement suggestions|No new feature suggestions|No items are waiting for verification|No fixed findings yet|No deferred findings|No rejected findings|No findings are available/i.test(
          text,
        );
      const hasCards = (await page.locator("article").count()) > 0;
      report.tabs[label] = {
        selected: (await tab.getAttribute("aria-selected")) === "true",
        hasCards,
        emptyOrCards: hasCards || emptyOk,
        url: page.url(),
      };
      await shot(page, `tab-${label.toLowerCase().replace(/\s+/g, "-")}`);
    }

    // URL tab persistence
    await page.goto(`${base}/system/agent-ops/issues?tab=active`, {
      waitUntil: "domcontentloaded",
    });
    await page.waitForTimeout(2000);
    report.checks.urlTabActive =
      (await page.getByRole("tab", { name: "Active" }).getAttribute("aria-selected")) === "true";

    await page.goto(`${base}/system/agent-ops/issues?agent=qa-agent&tab=all`, {
      waitUntil: "domcontentloaded",
    });
    await page.waitForTimeout(2000);
    report.checks.urlAgentFilter = page.url().includes("agent=qa-agent");

    // Open finding if any card exists
    await page.goto(`${base}/system/agent-ops/issues?tab=all`, {
      waitUntil: "domcontentloaded",
    });
    await page.waitForTimeout(2000);
    const openBtn = page.getByRole("button", { name: /Open finding|Open issue/i }).first();
    if ((await openBtn.count()) > 0) {
      await openBtn.click();
      await page.waitForTimeout(2500);
      report.checks.openFindingRoute = /\/system\/agent-ops\/issues\//.test(page.url());
      await shot(page, "open-finding");
    } else {
      report.checks.openFindingRoute = null;
    }

    // Responsive
    await page.goto(`${base}/system/agent-ops/issues`, { waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: "Findings", level: 1 }).waitFor({ timeout: 60000 });

    for (const [name, size] of [
      ["desktop-1440", { width: 1440, height: 900 }],
      ["tablet-1024", { width: 1024, height: 900 }],
      ["tablet-768", { width: 768, height: 900 }],
      ["mobile-390", { width: 390, height: 844 }],
    ]) {
      await page.setViewportSize(size);
      await page.waitForTimeout(800);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth + 2,
      );
      report.checks[`responsive_${name}`] = { horizontalOverflow: overflow };
      await shot(page, `responsive-${name}`);
    }

    report.checks.allTabsPresent = tabs.every((label) => report.tabs[label]?.selected !== undefined);
    report.checks.tabsUsable = tabs.every((label) => report.tabs[label]?.emptyOrCards);
  } catch (error) {
    report.errors.push(error instanceof Error ? error.message : String(error));
  } finally {
    report.finishedAt = new Date().toISOString();
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    await browser.close();
  }

  if (
    report.errors.length > 0 ||
    !report.checks.headerOk ||
    !report.checks.tabsUsable ||
    !report.checks.urlTabActive
  ) {
    console.error(JSON.stringify(report, null, 2));
    process.exit(1);
  }
  console.log(JSON.stringify(report, null, 2));
}

main();
