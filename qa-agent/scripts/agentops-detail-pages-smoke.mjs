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

    const api = await page.request.get(`${base}/api/agentops/monitoring/status`);
    void api;

    await page.goto(`${base}/system/agent-ops/issues`, { waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: "Findings", level: 1 }).waitFor({ timeout: 30000 });

    const issueLinks = await page.locator('a[href*="/system/agent-ops/issues/"]').all();
    const codes = [];
    for (const link of issueLinks.slice(0, 5)) {
      const href = await link.getAttribute("href");
      const match = href?.match(/issues\/([^/?#]+)/);
      if (match?.[1]) codes.push(decodeURIComponent(match[1]));
    }

    if (codes.length === 0) {
      await page.goto(`${base}/system/agent-ops/issues?tab=active`, { waitUntil: "domcontentloaded" });
      const activeLinks = await page.locator('button:has-text("Open details")').all();
      if (activeLinks[0]) {
        await activeLinks[0].click();
        await page.waitForLoadState("domcontentloaded");
        const url = new URL(page.url());
        const code = url.pathname.split("/").pop();
        if (code) codes.push(decodeURIComponent(code));
      }
    }

    const uniqueCodes = [...new Set(codes)].slice(0, 3);
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
    const findingsOk =
      Object.keys(report.findings).length === 0
        ? report.errors.length === 0
        : Object.values(report.findings).every((value) => value.ok);
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
