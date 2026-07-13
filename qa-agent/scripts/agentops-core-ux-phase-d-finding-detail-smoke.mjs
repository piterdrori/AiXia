import fs from "fs";
import path from "path";
import { chromium } from "@playwright/test";
import { loadAgentOpsOwnerEnv } from "./load-agentops-owner-env.mjs";

loadAgentOpsOwnerEnv();

const base = process.env.AGENTOPS_QA_BASE_URL || "https://ai-xia-staging.vercel.app";
const email = process.env.AGENTOPS_QA_OWNER_EMAIL?.trim();
const password = process.env.AGENTOPS_QA_OWNER_PASSWORD;
const shotDir = path.join("qa-agent", "browser-qa-artifacts", "phase-d-finding-detail");
const reportPath = path.join(
  "qa-agent",
  "reports",
  "browser-qa",
  "agentops-core-ux-phase-d-finding-detail-smoke-report.json",
);

const report = {
  baseUrl: base,
  startedAt: new Date().toISOString(),
  loginSuccessful: false,
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

async function main() {
  if (!email || !password) {
    report.errors.push("Owner credentials missing");
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    process.exit(1);
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  try {
    await login(page);

    // Invalid finding
    await page.goto(`${base}/system/agent-ops/issues/DOES-NOT-EXIST-PHASE-D`, {
      waitUntil: "domcontentloaded",
    });
    await page.waitForTimeout(3000);
    const invalidBody = await page.locator("body").innerText();
    report.checks.invalidFindingClear = /Finding not found/i.test(invalidBody);
    report.checks.invalidBackButton =
      (await page.getByRole("button", { name: /Back to Findings/i }).count()) > 0;
    await shot(page, "invalid-finding");

    // Open an active finding via list
    await page.goto(`${base}/system/agent-ops/issues?tab=active`, {
      waitUntil: "domcontentloaded",
    });
    await page.getByRole("heading", { name: "Findings", level: 1 }).waitFor({ timeout: 90000 });
    await page.getByText("Loading findings…").waitFor({ state: "hidden", timeout: 90000 }).catch(() => {});
    await page.waitForTimeout(1500);

    const openBtn = page.getByRole("button", { name: /Open finding|Open issue/i }).first();
    if ((await openBtn.count()) === 0) {
      report.errors.push("No active finding open button available");
    } else {
      await openBtn.click();
      await page.waitForTimeout(3500);
      const body = await page.locator("body").innerText();
      report.checks.detailRoute = /\/system\/agent-ops\/issues\//.test(page.url());
      report.checks.explanationVisible = /What was found/i.test(body);
      report.checks.whyVisible = /Why it matters/i.test(body);
      report.checks.evidenceVisible = /Evidence/i.test(body);
      report.checks.agentVisible = /Reporting agent/i.test(body);
      report.checks.promptSectionVisible = /Suggested fix prompt/i.test(body);
      report.checks.historyVisible = /History/i.test(body);
      report.checks.ownerDecisionVisible = /Owner decision/i.test(body);
      report.checks.technicalCollapsed =
        (await page.getByText("Technical details").count()) > 0;
      await shot(page, "finding-detail-desktop");

      // Prompt editor mode
      const editBtn = page.getByRole("button", { name: "Edit prompt" });
      if ((await editBtn.count()) > 0) {
        await editBtn.click();
        await page.waitForTimeout(500);
        report.checks.editModeUrl = page.url().includes("mode=edit-prompt");
        report.checks.promptTextarea =
          (await page.locator("#suggested-fix-prompt").count()) > 0;
        await page.getByRole("button", { name: "Cancel" }).click();
        await page.waitForTimeout(400);
      } else {
        report.checks.editModeUrl = null;
      }

      // Responsive
      for (const [name, size] of [
        ["tablet-768", { width: 768, height: 900 }],
        ["mobile-390", { width: 390, height: 844 }],
      ]) {
        await page.setViewportSize(size);
        await page.waitForTimeout(700);
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth > window.innerWidth + 2,
        );
        report.checks[`responsive_${name}`] = { horizontalOverflow: overflow };
        await shot(page, `responsive-${name}`);
      }
    }
  } catch (error) {
    report.errors.push(error instanceof Error ? error.message : String(error));
  } finally {
    report.finishedAt = new Date().toISOString();
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    await browser.close();
  }

  const required = [
    report.checks.invalidFindingClear,
    report.checks.invalidBackButton,
    report.checks.detailRoute,
    report.checks.explanationVisible,
    report.checks.promptSectionVisible,
  ];
  if (report.errors.length > 0 || required.some((value) => !value)) {
    console.error(JSON.stringify(report, null, 2));
    process.exit(1);
  }
  console.log(JSON.stringify(report, null, 2));
}

main();
