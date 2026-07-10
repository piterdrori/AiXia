import fs from "fs";
import path from "path";
import { chromium } from "@playwright/test";
import { loadAgentOpsOwnerEnv } from "./load-agentops-owner-env.mjs";

loadAgentOpsOwnerEnv();

const base = process.env.AGENTOPS_QA_BASE_URL || "https://ai-xia-staging.vercel.app";
const email = process.env.AGENTOPS_QA_OWNER_EMAIL?.trim();
const password = process.env.AGENTOPS_QA_OWNER_PASSWORD;
const shotDir = path.join("qa-agent", "browser-qa-artifacts", "overview-refinement");
const reportPath = path.join("qa-agent", "reports", "browser-qa", "agentops-overview-refinement-smoke-report.json");

const report = {
  baseUrl: base,
  startedAt: new Date().toISOString(),
  loginSuccessful: false,
  checks: {},
  viewports: {},
  errors: [],
  screenshots: [],
};

async function screenshot(page, name) {
  fs.mkdirSync(shotDir, { recursive: true });
  const file = path.join(shotDir, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  report.screenshots.push(file.replaceAll("\\", "/"));
}

async function auditOverview(page) {
  await page.goto(`${base}/system/agent-ops`, { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.getByRole("heading", { name: "AgentOps", level: 1 }).waitFor({ timeout: 90000 });

  const body = await page.locator("body").innerText();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2);

  const hasSecretLeak =
    /SUPABASE_SERVICE_ROLE_KEY|STAGING_SUPABASE_SERVICE_ROLE_KEY|service.role/i.test(body);
  const hasMoreLabel = /\bMORE\b/.test(body) || (await page.getByText(/^More$/i).count()) > 0;
  const hasActiveIssuesInMemory = /Active issues:\s*9/i.test(body);
  const hasFalseHealthyWithDegraded =
    body.includes("Some AgentOps data is temporarily unavailable") && /\bHealthy\b/.test(body);
  const hasEnvironmentBar = body.includes("Environment:") && body.includes("Owner approval required");
  const hasAttentionSection = body.includes("Needs your attention");
  const hasRecentActivity = body.includes("Recent activity");
  const hasMonitoringHistoryLink = body.includes("View monitoring history");

  return {
    hasSecretLeak,
    hasMoreLabel,
    hasActiveIssuesInMemory,
    hasFalseHealthyWithDegraded,
    hasEnvironmentBar,
    hasAttentionSection,
    hasRecentActivity,
    hasMonitoringHistoryLink,
    horizontalOverflow: overflow,
    bodySample: body.slice(0, 500),
  };
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
    await page.goto(`${base}/login`, { waitUntil: "domcontentloaded" });
    await page.locator("#email").fill(email);
    await page.locator("#password").fill(password);
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 60000 });
    report.loginSuccessful = true;

    report.checks = await auditOverview(page);
    await screenshot(page, "overview-desktop");

    for (const [label, width] of [
      ["desktop1440", 1440],
      ["tablet1024", 1024],
      ["tablet768", 768],
      ["mobile390", 390],
    ]) {
      await page.setViewportSize({ width, height: 900 });
      report.viewports[label] = await auditOverview(page);
      await screenshot(page, `overview-${label}`);
    }
  } catch (error) {
    report.errors.push(error instanceof Error ? error.message : String(error));
  } finally {
    report.finishedAt = new Date().toISOString();
    const checks = report.checks;
    report.status =
      report.loginSuccessful &&
      report.errors.length === 0 &&
      checks &&
      !checks.hasSecretLeak &&
      !checks.hasMoreLabel &&
      !checks.hasActiveIssuesInMemory &&
      !checks.hasFalseHealthyWithDegraded &&
      checks.hasEnvironmentBar &&
      checks.hasAttentionSection &&
      checks.hasRecentActivity &&
      !checks.horizontalOverflow
        ? "passed"
        : "failed";
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    await browser.close();
  }

  console.log(JSON.stringify(report, null, 2));
  process.exit(report.status === "passed" ? 0 : 1);
}

main();
