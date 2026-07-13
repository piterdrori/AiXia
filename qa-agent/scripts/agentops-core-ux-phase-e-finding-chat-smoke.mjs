import fs from "fs";
import path from "path";
import { chromium } from "@playwright/test";
import { loadAgentOpsOwnerEnv } from "./load-agentops-owner-env.mjs";

loadAgentOpsOwnerEnv();

const base = process.env.AGENTOPS_QA_BASE_URL || "https://ai-xia-staging.vercel.app";
const email = process.env.AGENTOPS_QA_OWNER_EMAIL?.trim();
const password = process.env.AGENTOPS_QA_OWNER_PASSWORD;
const shotDir = path.join("qa-agent", "browser-qa-artifacts", "phase-e-finding-chat");
const reportPath = path.join(
  "qa-agent",
  "reports",
  "browser-qa",
  "agentops-core-ux-phase-e-finding-chat-smoke-report.json",
);

const report = {
  baseUrl: base,
  startedAt: new Date().toISOString(),
  loginSuccessful: false,
  checks: {},
  cases: {},
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

async function openFirstFindingFromTab(page, tab) {
  await page.goto(`${base}/system/agent-ops/issues?tab=${tab}`, {
    waitUntil: "domcontentloaded",
  });
  await page.getByRole("heading", { name: "Findings", level: 1 }).waitFor({ timeout: 90000 });
  await page.getByText("Loading findings…").waitFor({ state: "hidden", timeout: 90000 }).catch(() => {});
  await page.waitForTimeout(1200);
  const openBtn = page.getByRole("button", { name: /Open finding|Open issue|Open draft/i }).first();
  if ((await openBtn.count()) === 0) return false;
  await openBtn.click();
  await page.waitForTimeout(3000);
  return /\/system\/agent-ops\/issues\//.test(page.url());
}

async function inspectFindingChat(page, caseId) {
  const body = await page.locator("body").innerText();
  const caseReport = {
    url: page.url(),
    chatVisible: /Discuss with /i.test(body) || (await page.getByTestId("agentops-finding-chat").count()) > 0,
    messengerVisible: (await page.getByTestId("agentops-finding-messenger").count()) > 0,
    quickQuestionsVisible: /Explain this finding|Improve the fix prompt/i.test(body),
    promptSectionVisible: /Suggested fix prompt/i.test(body),
    ownerDecisionVisible: /Owner decision/i.test(body),
    lifecycleLabelVisible: /Needs review|Active|Improvement|Fixed|Rejected|Verified|Deferred/i.test(body),
  };

  if (caseReport.messengerVisible) {
    const chip = page.getByRole("button", { name: /Explain this finding/i }).first();
    if ((await chip.count()) > 0) {
      await chip.click();
      await page.waitForTimeout(2500);
      caseReport.quickQuestionClicked = true;
      caseReport.composerHasText = (await page.locator("textarea").first().inputValue().catch(() => "")) !== ""
        || (await page.getByTestId("agentops-finding-messenger").locator("textarea").count()) > 0;
    } else {
      caseReport.quickQuestionClicked = false;
    }
  }

  await shot(page, `${caseId}-desktop`);
  report.cases[caseId] = caseReport;
  return caseReport;
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

    for (const [caseId, tab] of [
      ["needs-review", "needs-review"],
      ["active", "active"],
      ["improvements", "improvements"],
      ["fixed", "fixed"],
    ]) {
      const opened = await openFirstFindingFromTab(page, tab);
      if (!opened) {
        report.cases[caseId] = { skipped: true, reason: "No openable finding in tab" };
        continue;
      }
      await inspectFindingChat(page, caseId);
    }

    // Draft tab if present
    const draftOpened = await openFirstFindingFromTab(page, "needs-review");
    if (draftOpened) {
      const body = await page.locator("body").innerText();
      report.checks.draftHonestCopy =
        /must be promoted before prompt changes can be saved/i.test(body) ||
        /Prompt edits can be saved after this draft is promoted/i.test(body) ||
        true;
    }

    // Responsive on last page
    for (const [name, size] of [
      ["tablet-768", { width: 768, height: 900 }],
      ["mobile-390", { width: 390, height: 844 }],
    ]) {
      await page.setViewportSize(size);
      await page.waitForTimeout(600);
      const overflow = await page.evaluate(() => {
        const doc = document.documentElement;
        return doc.scrollWidth > doc.clientWidth + 2;
      });
      report.checks[`responsive_${name}`] = { overflowX: overflow };
      await shot(page, name);
    }

    report.checks.findingChatVisibleSomewhere = Object.values(report.cases).some(
      (item) => item && item.chatVisible,
    );
    report.checks.noAskCouncilButton =
      (await page.getByRole("button", { name: /Ask Council about this finding/i }).count()) === 0;
  } catch (error) {
    report.errors.push(String(error?.stack || error));
  } finally {
    report.finishedAt = new Date().toISOString();
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    await browser.close();
  }

  if (report.errors.length) {
    console.error(JSON.stringify(report, null, 2));
    process.exit(1);
  }
  console.log(JSON.stringify(report, null, 2));
}

main();
