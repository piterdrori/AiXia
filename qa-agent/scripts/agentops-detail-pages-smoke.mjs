import fs from "fs";
import path from "path";
import { chromium } from "@playwright/test";
import { loadAgentOpsOwnerEnv } from "./load-agentops-owner-env.mjs";

loadAgentOpsOwnerEnv();

const base = process.env.AGENTOPS_QA_BASE_URL || "https://ai-xia-staging.vercel.app";
const email = process.env.AGENTOPS_QA_OWNER_EMAIL?.trim();
const password = process.env.AGENTOPS_QA_OWNER_PASSWORD;
const shotDir = path.join("qa-agent", "browser-qa-artifacts", "detail-pages");
const reportPath = path.join("qa-agent", "reports", "browser-qa", "agentops-detail-pages-smoke-report.json");

const agentSlugs = ["system-agent", "design-agent", "qa-agent", "analytics-agent"];

const report = {
  baseUrl: base,
  startedAt: new Date().toISOString(),
  loginSuccessful: false,
  agents: {},
  findings: {},
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

async function checkAgentDetail(page, slug) {
  await page.goto(`${base}/system/agent-ops/agents/${slug}`, {
    waitUntil: "domcontentloaded",
    timeout: 45000,
  });
  await page.getByRole("heading", { name: "Role", level: 2 }).waitFor({ timeout: 90000 });
  const notFound = await page.getByText(/Agent not found/i).isVisible().catch(() => false);
  const role = await page.getByRole("heading", { name: "Role", level: 2 }).isVisible().catch(() => false);
  const advanced = await page.getByText("Advanced details").isVisible().catch(() => false);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2);
  return { ok: !notFound && role, notFound, roleSection: role, advancedCollapsed: advanced, horizontalOverflow: overflow };
}

async function checkFindingDetail(page, issueCode) {
  await page.goto(`${base}/system/agent-ops/issues/${encodeURIComponent(issueCode)}`, {
    waitUntil: "domcontentloaded",
    timeout: 45000,
  });
  await page
    .getByRole("heading", { name: "Summary", level: 2 })
    .or(page.getByText(/Finding not found/i))
    .waitFor({ timeout: 90000 });
  const notFound = await page.getByText(/Finding not found/i).isVisible().catch(() => false);
  const summary = await page.getByRole("heading", { name: "Summary", level: 2 }).isVisible().catch(() => false);
  const technical = await page.getByText("Technical details").isVisible().catch(() => false);
  const messenger = await page.getByText(/Hermes|Messenger|CodeGraph discovery/i).isVisible().catch(() => false);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2);
  return {
    ok: !notFound && summary && !messenger,
    notFound,
    summarySection: summary,
    technicalCollapsed: technical,
    densePanelsHidden: !messenger,
    horizontalOverflow: overflow,
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

    for (const slug of agentSlugs) {
      report.agents[slug] = await checkAgentDetail(page, slug);
      await screenshot(page, `agent-${slug}`);
    }

    const candidateCodes = ["BQA-0B036BE3", "BQA-7121AF8F"];
    const codes = [...candidateCodes];

    await page.goto(`${base}/system/agent-ops/issues?tab=active`, { waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: "Findings", level: 1 }).waitFor({ timeout: 30000 });
    const openButtons = page.getByRole("button", { name: /open details/i });
    const openCount = await openButtons.count();
    for (let i = 0; i < Math.min(openCount, 3); i++) {
      await openButtons.nth(i).click();
      await page.waitForLoadState("domcontentloaded");
      const code = decodeURIComponent(new URL(page.url()).pathname.split("/").pop() ?? "");
      if (code && !codes.includes(code)) codes.push(code);
      await page.goBack({ waitUntil: "domcontentloaded" });
    }

    const uniqueCodes = [...new Set(codes)].slice(0, 4);
    if (uniqueCodes.length === 0) {
      report.errors.push("No finding codes available for detail QA");
    }

    for (const code of uniqueCodes) {
      report.findings[code] = await checkFindingDetail(page, code);
      await screenshot(page, `finding-${code.replace(/[^a-zA-Z0-9-]/g, "_")}`);
    }

    for (const [label, width] of [
      ["desktop1440", 1440],
      ["tablet1024", 1024],
      ["mobile390", 390],
    ]) {
      await page.setViewportSize({ width, height: 900 });
      report.agents[`viewport-${label}`] = await checkAgentDetail(page, "design-agent");
      await screenshot(page, `viewport-${label}`);
    }
  } catch (error) {
    report.errors.push(error instanceof Error ? error.message : String(error));
  } finally {
    report.finishedAt = new Date().toISOString();
    const agentsOk = Object.entries(report.agents)
      .filter(([key]) => !key.startsWith("viewport-"))
      .every(([, value]) => value.ok);
    const findingEntries = Object.values(report.findings);
    const findingsOk =
      findingEntries.length > 0 &&
      findingEntries.some((value) => value.ok) &&
      findingEntries.filter((value) => value.notFound).every((value) => value.densePanelsHidden);
    report.status =
      report.loginSuccessful && agentsOk && findingsOk && report.errors.length === 0
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
