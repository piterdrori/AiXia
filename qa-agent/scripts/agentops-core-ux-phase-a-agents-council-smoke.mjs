import fs from "fs";
import path from "path";
import { chromium } from "@playwright/test";
import { loadAgentOpsOwnerEnv } from "./load-agentops-owner-env.mjs";

loadAgentOpsOwnerEnv();

const base = process.env.AGENTOPS_QA_BASE_URL || "https://ai-xia-staging.vercel.app";
const email = process.env.AGENTOPS_QA_OWNER_EMAIL?.trim();
const password = process.env.AGENTOPS_QA_OWNER_PASSWORD;
const shotDir = path.join("qa-agent", "browser-qa-artifacts", "phase-a-agents-council");
const reportPath = path.join(
  "qa-agent",
  "reports",
  "browser-qa",
  "agentops-core-ux-phase-a-agents-council-smoke-report.json",
);

const report = {
  baseUrl: base,
  startedAt: new Date().toISOString(),
  loginSuccessful: false,
  viewports: {},
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

async function auditAgents(page, viewportName) {
  await page.goto(`${base}/system/agent-ops/agents`, {
    waitUntil: "domcontentloaded",
    timeout: 45000,
  });
  await page.getByRole("heading", { name: "Agents", level: 1 }).waitFor({ timeout: 90000 });
  await page.waitForTimeout(2500);

  const body = await page.locator("body").innerText();
  const councilVisible =
    (await page.getByRole("heading", { name: "Council Chat" }).count()) > 0 ||
    (await page.getByTestId("agentops-agents-council-embed").count()) > 0;
  const composerVisible =
    (await page.locator("textarea, [contenteditable='true']").count()) > 0 ||
    /Ask the team|Ask all 12 agents|Council Chat/i.test(body);
  const openCouncilVisible = (await page.getByRole("button", { name: /Open Council|Open full Council/i }).count()) > 0;
  const openAgentVisible = (await page.getByRole("button", { name: /Open agent/i }).count()) >= 1;
  const rosterCount = await page.locator("article").count();
  const scheduleCollapsed =
    (await page.getByText("Team schedule").count()) > 0 &&
    !/0 \*\/6 \* \* \*/.test(body);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 2,
  );

  const result = {
    councilVisible,
    composerVisible,
    openCouncilVisible,
    openAgentVisible,
    rosterCount,
    scheduleCollapsed,
    horizontalOverflow: overflow,
    hasSecretLeak: /SUPABASE_SERVICE_ROLE_KEY|STAGING_SUPABASE_SERVICE_ROLE_KEY/i.test(body),
  };

  await shot(page, `agents-${viewportName}`);
  report.viewports[viewportName] = result;
  return result;
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
    const desktop = await auditAgents(page, "desktop-1440");

    await page.setViewportSize({ width: 1024, height: 900 });
    const tablet = await auditAgents(page, "tablet-1024");

    await page.setViewportSize({ width: 390, height: 844 });
    const mobile = await auditAgents(page, "mobile-390");

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${base}/system/agent-ops/agents`, { waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: "Agents", level: 1 }).waitFor({ timeout: 60000 });
    const openCouncil = page.getByRole("button", { name: /^Open Council$/i }).first();
    if ((await openCouncil.count()) > 0) {
      await openCouncil.click();
      await page.waitForURL(/\/system\/agent-ops\/council/, { timeout: 30000 });
      const backVisible = (await page.getByRole("button", { name: /Back to Agents/i }).count()) > 0;
      report.checks.fullCouncilRoute = {
        url: page.url(),
        backToAgentsVisible: backVisible,
      };
      await shot(page, "full-council");
      if (backVisible) {
        await page.getByRole("button", { name: /Back to Agents/i }).click();
        await page.waitForURL(/\/system\/agent-ops\/agents/, { timeout: 30000 });
      }
    }

    report.checks.desktopPass =
      desktop.councilVisible &&
      desktop.composerVisible &&
      desktop.rosterCount >= 12 &&
      !desktop.horizontalOverflow &&
      !desktop.hasSecretLeak;
    report.checks.tabletPass = tablet.councilVisible && !tablet.horizontalOverflow;
    report.checks.mobilePass = mobile.councilVisible && !mobile.horizontalOverflow;
  } catch (error) {
    report.errors.push(String(error?.message || error));
  } finally {
    await browser.close();
  }

  report.finishedAt = new Date().toISOString();
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));

  const failed =
    report.errors.length > 0 ||
    !report.checks.desktopPass ||
    !report.checks.tabletPass ||
    !report.checks.mobilePass;
  process.exit(failed ? 1 : 0);
}

main();
