import fs from "fs";
import path from "path";
import { chromium } from "@playwright/test";
import { loadAgentOpsOwnerEnv } from "./load-agentops-owner-env.mjs";

loadAgentOpsOwnerEnv();

const base = process.env.AGENTOPS_QA_BASE_URL || "https://ai-xia-staging.vercel.app";
const email = process.env.AGENTOPS_QA_OWNER_EMAIL?.trim();
const password = process.env.AGENTOPS_QA_OWNER_PASSWORD;
const shotDir = path.join("qa-agent", "browser-qa-artifacts", "phase-b-agent-detail");
const reportPath = path.join(
  "qa-agent",
  "reports",
  "browser-qa",
  "agentops-core-ux-phase-b-agent-detail-smoke-report.json",
);

const agents = ["system-agent", "design-agent", "qa-agent", "analytics-agent"];

const report = {
  baseUrl: base,
  startedAt: new Date().toISOString(),
  loginSuccessful: false,
  agents: {},
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

async function auditAgent(page, slug, viewportName) {
  await page.goto(`${base}/system/agent-ops/agents/${slug}`, {
    waitUntil: "domcontentloaded",
    timeout: 45000,
  });

  // Wait for either chat mount or not-found / owner error (gate can take a while).
  try {
    await Promise.race([
      page.getByTestId("agentops-agent-detail-chat").waitFor({ timeout: 90000 }),
      page.getByRole("heading", { name: "Agent not found", level: 2 }).waitFor({ timeout: 90000 }),
      page.getByText(/AgentOps owner access required/i).waitFor({ timeout: 90000 }),
      page.getByRole("heading", { name: /Chat with /i }).waitFor({ timeout: 90000 }),
    ]);
  } catch {
    /* fall through to body inspection */
  }
  await page.waitForTimeout(1000);
  const body = await page.locator("body").innerText();

  const notFound = /Agent not found/i.test(body) && /No agent matches/i.test(body);
  const slugWarning = /Agent not found for id/i.test(body);
  const chatVisible =
    (await page.getByTestId("agentops-agent-detail-chat").count()) > 0 ||
    (await page.getByRole("heading", { name: /Chat with /i }).count()) > 0;
  const composerVisible = (await page.locator("textarea, [contenteditable='true']").count()) > 0;
  const scheduleVisible =
    (await page.getByTestId("agentops-agent-detail-schedule").count()) > 0 ||
    (await page.getByRole("heading", { name: /Work mode and schedule/i }).count()) > 0;
  const todayVisible = (await page.getByRole("heading", { name: /Today/i }).count()) > 0;
  const findingsVisible = (await page.getByRole("heading", { name: /Latest findings/i }).count()) > 0;
  const runDisabled =
    /Single-agent run is not connected yet/i.test(body) &&
    (await page.getByRole("button", { name: /Run this agent now/i }).count()) > 0;
  const usernameVisible = /@aixia\./i.test(body) || body.includes("@");
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 2,
  );

  const result = {
    notFound,
    slugWarning,
    chatVisible,
    composerVisible,
    scheduleVisible,
    todayVisible,
    findingsVisible,
    runDisabledHonest: runDisabled,
    usernameVisible,
    horizontalOverflow: overflow,
    hasSecretLeak: /SUPABASE_SERVICE_ROLE_KEY|STAGING_SUPABASE_SERVICE_ROLE_KEY/i.test(body),
  };

  await shot(page, `${slug}-${viewportName}`);
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
    for (const slug of agents) {
      report.agents[slug] = await auditAgent(page, slug, "desktop-1440");
    }

    // history persistence: send on system-agent, navigate away, return
    await page.goto(`${base}/system/agent-ops/agents/system-agent`, {
      waitUntil: "domcontentloaded",
      timeout: 45000,
    });
    await page.waitForTimeout(2000);
    const composer = page.locator("textarea").first();
    const marker = `Phase B smoke ${Date.now()}`;
    if ((await composer.count()) > 0) {
      await composer.fill(marker);
      await page.getByRole("button", { name: /^Send$/i }).first().click();
      await page.waitForTimeout(8000);
      await page.goto(`${base}/system/agent-ops/agents`, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(1500);
      await page.goto(`${base}/system/agent-ops/agents/system-agent`, {
        waitUntil: "domcontentloaded",
      });
      await page.waitForTimeout(2500);
      const body = await page.locator("body").innerText();
      report.checks.historyPreserved = body.includes(marker);
      report.checks.sendAttempted = true;
    } else {
      report.checks.historyPreserved = false;
      report.checks.sendAttempted = false;
      report.errors.push("Composer not found for history check");
    }
    await shot(page, "system-agent-history-return");

    // invalid slug
    await page.goto(`${base}/system/agent-ops/agents/not-a-real-agent`, {
      waitUntil: "domcontentloaded",
    });
    await page.waitForTimeout(1500);
    const invalidBody = await page.locator("body").innerText();
    report.checks.invalidSlug = {
      agentNotFound: /Agent not found/i.test(invalidBody),
      backToAgents: (await page.getByRole("button", { name: /Back to Agents/i }).count()) > 0,
    };
    await shot(page, "invalid-slug");

    // responsive on design-agent
    await page.setViewportSize({ width: 1024, height: 900 });
    report.viewports["tablet-1024"] = await auditAgent(page, "design-agent", "tablet-1024");

    await page.setViewportSize({ width: 768, height: 900 });
    report.viewports["tablet-768"] = await auditAgent(page, "qa-agent", "tablet-768");

    await page.setViewportSize({ width: 390, height: 844 });
    report.viewports["mobile-390"] = await auditAgent(page, "analytics-agent", "mobile-390");

    report.checks.allAgentsPass = agents.every((slug) => {
      const row = report.agents[slug];
      return (
        row &&
        !row.notFound &&
        !row.slugWarning &&
        row.chatVisible &&
        row.composerVisible &&
        row.scheduleVisible &&
        !row.hasSecretLeak
      );
    });
  } catch (error) {
    report.errors.push(error instanceof Error ? error.message : String(error));
  } finally {
    report.finishedAt = new Date().toISOString();
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    await browser.close();
  }

  if (report.errors.length > 0 || !report.checks.allAgentsPass) {
    console.error(JSON.stringify(report, null, 2));
    process.exit(1);
  }
  console.log(JSON.stringify(report, null, 2));
}

main();
