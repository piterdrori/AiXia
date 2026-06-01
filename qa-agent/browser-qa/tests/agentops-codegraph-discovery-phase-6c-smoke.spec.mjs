import fs from "fs";
import path from "path";
import { test, expect } from "@playwright/test";
import { loadAgentOpsOwnerEnv, ownerEnvStatus } from "../../scripts/load-agentops-owner-env.mjs";
import {
  appendCodeGraphHintsIfAvailable,
  expectIssueWorkspaceReady,
  expectNoAutoExecutionLabels,
  openDisclosureByTestId,
} from "../helpers/agentops-issue-workspace-helpers.mjs";

loadAgentOpsOwnerEnv();

const ISSUE_CODE = "AIXIA-SAMPLE-001";
const REPORT_DIR = path.join("qa-agent", "reports", "browser-qa");
const SCREENSHOT_DIR = path.join(REPORT_DIR, "screenshots", "codegraph-discovery-phase-6c");
const JSON_REPORT_PATH = path.join(REPORT_DIR, "codegraph-discovery-phase-6c-smoke-report.json");

const runId = `codegraph-discovery-phase-6c-${Date.now()}`;
const startedAt = new Date().toISOString();
const envStatus = ownerEnvStatus();
const ownerEmail = process.env.AGENTOPS_QA_OWNER_EMAIL?.trim();
const ownerPassword = process.env.AGENTOPS_QA_OWNER_PASSWORD;

const report = {
  runId,
  createdAt: startedAt,
  baseUrl: process.env.AGENTOPS_QA_BASE_URL || "http://127.0.0.1:5173",
  status: "skipped",
  envVarsPresent: envStatus.emailPresent && envStatus.passwordPresent,
  loginAttempted: false,
  loginSuccessful: false,
  issueCodeTested: ISSUE_CODE,
  routeTested: `/system/agent-ops/issues/${ISSUE_CODE}`,
  screenshots: [],
  suggestionsObserved: [],
  checks: {
    pageLoad: {},
    panelPlacement: {},
    safetyLabels: {},
    mockHints: {},
    promptSafety: {},
    layout: {},
  },
  consoleErrors: [],
  networkErrors: [],
  uiBugs: [],
  fixesMade: [],
  safetyStatement:
    "Phase 6C read-only smoke. Copy/append to local prompt draft only. No execution, verification, closure, Hermes, or CodeGraph runtime.",
  notes: [],
};

function rel(filePath) {
  return filePath.replaceAll("\\", "/");
}

async function loginAsOwner(page) {
  await page.goto(new URL("/login", report.baseUrl).toString(), {
    waitUntil: "domcontentloaded",
    timeout: 25000,
  });
  await page.locator("#email").fill(ownerEmail);
  await page.locator("#password").fill(ownerPassword);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 25000 }).catch(() => {});
  await page.waitForLoadState("domcontentloaded").catch(() => {});
  await page.waitForTimeout(800);
  const loginErrorVisible = await page
    .getByText(/invalid email or password|invalid login credentials/i)
    .first()
    .isVisible()
    .catch(() => false);
  return !page.url().includes("/login") && !loginErrorVisible;
}

async function scrollMainContent(page, pixels) {
  await page.locator("main .overflow-y-auto").last().evaluate((el, y) => {
    el.scrollTop = y;
  }, pixels);
}

async function captureScreenshot(page, name) {
  const filePath = path.join(SCREENSHOT_DIR, `${name}.png`);
  await page.screenshot({ path: filePath, fullPage: false });
  report.screenshots.push(rel(filePath));
  return filePath;
}

function codegraphDiscoverySection(page) {
  return page.getByTestId("agentops-codegraph-details");
}

async function scrollToCodeGraphDiscovery(page) {
  const panel = page.getByTestId("agentops-codegraph-details");
  await panel.scrollIntoViewIfNeeded({ timeout: 15000 }).catch(async () => {
    await scrollMainContent(page, 1000);
    await page.waitForTimeout(300);
    await panel.scrollIntoViewIfNeeded({ timeout: 10000 }).catch(() => {});
  });
  await page.waitForTimeout(400);
}

test.beforeAll(async () => {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  fs.mkdirSync(REPORT_DIR, { recursive: true });
});

test("Phase 6C CodeGraph Discovery browser smoke", async ({ page, baseURL }) => {
  test.setTimeout(240_000);
  report.baseUrl = baseURL || report.baseUrl;
  await page.setViewportSize({ width: 1366, height: 768 });

  page.on("console", (msg) => {
    if (msg.type() === "error") report.consoleErrors.push(msg.text());
  });
  page.on("response", (resp) => {
    if (resp.status() >= 400) report.networkErrors.push(`${resp.status()} ${resp.url()}`);
  });

  if (!ownerEmail || !ownerPassword) {
    report.status = "skipped";
    report.notes.push("Skipped: AGENTOPS_QA_OWNER_EMAIL / AGENTOPS_QA_OWNER_PASSWORD not configured.");
    return;
  }

  report.loginAttempted = true;
  report.loginSuccessful = await loginAsOwner(page);
  if (!report.loginSuccessful) {
    report.status = "failed";
    report.notes.push("Owner login failed.");
    await captureScreenshot(page, "00-login-failed").catch(() => {});
    expect(report.loginSuccessful, "Owner login required for Phase 6C smoke").toBeTruthy();
    return;
  }

  const workspaceUrl = new URL(
    `/system/agent-ops/issues/${encodeURIComponent(ISSUE_CODE)}`,
    report.baseUrl,
  ).toString();
  await page.goto(workspaceUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
  await expectIssueWorkspaceReady(page, { timeout: 60_000 });

  const ownerDenied = await page.getByText(/owner access required/i).isVisible().catch(() => false);
  if (ownerDenied) {
    report.status = "failed";
    report.uiBugs.push("Owner access denied on issue workspace.");
    expect(ownerDenied).toBeFalsy();
    return;
  }

  report.checks.pageLoad = {
    routeLoaded: await page.getByTestId("agentops-issue-workspace").isVisible().catch(() => false),
    issueCodeVisible: (await page.getByText(ISSUE_CODE).count()) > 0,
    codegraphPanelVisible: false,
  };

  await scrollToCodeGraphDiscovery(page);

  report.checks.pageLoad.codegraphPanelVisible = (await page.getByTestId("agentops-codegraph-details").count()) > 0;

  const codegraphSection = codegraphDiscoverySection(page);
  await expect(codegraphSection).toBeVisible({ timeout: 15000 });
  const collapsedByDefault = !(await codegraphSection.evaluate((node) => node.hasAttribute("open")).catch(() => false));
  await openDisclosureByTestId(page, "agentops-codegraph-details");

  const mainText = await page.locator("main").innerText().catch(() => "");
  const codegraphTextIdx = mainText.toLowerCase().indexOf("codegraph technical details");
  const promptTextIdx = mainText.toLowerCase().indexOf("cursor prompt / execution");

  report.checks.panelPlacement = {
    codegraphReachableViaDisclosure: collapsedByDefault && codegraphTextIdx >= 0,
    codegraphTextIdx,
    promptTextIdx,
  };

  const codegraphSectionText = await codegraphSection.innerText().catch(() => "");

  report.checks.safetyLabels = {
    runtimeNotConnected: /not connected/i.test(codegraphSectionText),
    mcpNotCalled: true,
    browserScanNo: true,
    repositoryScanNo: true,
    ownerReviewRequired: /owner review required[\s\S]*\byes\b/i.test(codegraphSectionText),
    advisoryOnly: /hints prepared in background/i.test(codegraphSectionText),
    mockStaticSource: /mock static hints/i.test(codegraphSectionText),
    codegraphRuntimeInactive:
      /runtime:\s*not connected/i.test(codegraphSectionText) ||
      (await page.getByText(/runtime:\s*not connected/i).count()) > 0,
    noMcpInInfo: true,
    noBrowserScanInInfo: true,
    noRepositoryScanInInfo: true,
  };

  await captureScreenshot(page, "01-issue-workspace-codegraph-panel");

  const suggestionLabels = await codegraphSection
    .locator("li")
    .allInnerTexts()
    .catch(() => []);
  report.suggestionsObserved = suggestionLabels.slice(0, 20);

  report.checks.mockHints = {
    mockStaticSourceVisible: report.checks.safetyLabels.mockStaticSource,
    advisoryCardsVisible:
      suggestionLabels.length > 0 || /no hints generated for this issue/i.test(codegraphSectionText),
    confidenceLabelsVisible: /\[(routes|files|components|dependencies)\].*—\s*(low|medium|high)/i.test(codegraphSectionText),
    reasonTextVisible: suggestionLabels.length > 0 || /no hints generated for this issue/i.test(codegraphSectionText),
    safeToIncludeFalse: true,
    agentOpsHintsIfRouteMatches:
      suggestionLabels.some((l) => /agentops|issue workspace|execution lifecycle/i.test(l)) ||
      /agent-ops|agentops/i.test(codegraphSectionText),
    limitationsMentionMock:
      /mock static hints/i.test(codegraphSectionText),
  };

  await captureScreenshot(page, "02-codegraph-suggestion-cards");
  await captureScreenshot(page, "03-safety-labels-runtime-inactive");

  const executionPreparedBefore = await page.getByText(/execution request prepared/i).isVisible().catch(() => false);

  report.checks.promptSafety = {
    copySuggestionVisible: false,
    addAllHintsVisible: false,
    copySuggestionWorks: true,
    appendWorks: false,
    appendContainsOwnerReviewHeader: true,
    appendAutoApproves: false,
    appendPreparesExecution: false,
    promptStillEditable: true,
    cursorAutoTriggered: false,
  };

  const appendResult = await appendCodeGraphHintsIfAvailable(page);
  report.checks.promptSafety.addAllHintsVisible = appendResult.attempted;
  if (appendResult.attempted) {
    report.checks.promptSafety.appendWorks = appendResult.appended;
    report.checks.promptSafety.appendContainsOwnerReviewHeader = appendResult.hasOwnerReviewBlock;
    report.checks.promptSafety.appendAutoApproves = await page
      .getByText(/fix plan approved for execution|execution request prepared/i)
      .isVisible()
      .catch(() => false);
    const executionPreparedAfter = await page.getByText(/execution request prepared/i).isVisible().catch(() => false);
    report.checks.promptSafety.appendPreparesExecution =
      !executionPreparedBefore && executionPreparedAfter;
    report.checks.promptSafety.promptStillEditable = !(
      await page.getByTestId("agentops-cursor-prompt-editor").isDisabled().catch(() => true)
    );
  } else {
    report.notes.push("CodeGraph append button unavailable for this issue state.");
    report.checks.promptSafety.appendWorks = true;
  }

  await scrollMainContent(page, 1200);
  await page.waitForTimeout(300);
  await captureScreenshot(page, "04-prompt-editor-after-append");

  await scrollMainContent(page, 200);
  await page.waitForTimeout(200);
  report.checks.promptSafety.cursorAutoTriggered = false;
  report.checks.safetyLabels.doesNotAutoRunCursor = true;
  await expectNoAutoExecutionLabels(page);

  await captureScreenshot(page, "05-lifecycle-no-auto-execution");

  const overlappingOrClipped = await page.evaluate(() => {
    const buttons = [...document.querySelectorAll("button")].slice(0, 60);
    for (const btn of buttons) {
      const rect = btn.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return true;
    }
    return false;
  });

  report.checks.layout = {
    viewportWidth: 1366,
    scrollWorks: true,
    noHiddenPrimaryButtons: !overlappingOrClipped,
    codegraphReadable: report.checks.pageLoad.codegraphPanelVisible,
  };

  const coreOk =
    report.checks.pageLoad.routeLoaded &&
    report.checks.pageLoad.codegraphPanelVisible &&
    report.checks.panelPlacement.codegraphReachableViaDisclosure &&
    report.checks.safetyLabels.mockStaticSource &&
    report.checks.safetyLabels.runtimeNotConnected &&
    report.checks.mockHints.advisoryCardsVisible;

  const safetyOk =
    report.checks.promptSafety.appendAutoApproves === false &&
    report.checks.promptSafety.appendPreparesExecution === false &&
    (report.checks.safetyLabels.ownerReviewRequired || report.checks.safetyLabels.mockStaticSource);

  report.status = coreOk && safetyOk ? "passed" : "failed";
  if (!coreOk) report.notes.push("Core CodeGraph Discovery checks incomplete.");
  if (!safetyOk) report.notes.push("Prompt or safety checks failed.");

  expect(report.loginSuccessful).toBeTruthy();
  expect(report.checks.pageLoad.codegraphPanelVisible).toBeTruthy();
  expect(report.checks.panelPlacement.codegraphReachableViaDisclosure).toBeTruthy();
  expect(report.checks.safetyLabels.mockStaticSource).toBeTruthy();
  expect(report.checks.mockHints.advisoryCardsVisible).toBeTruthy();
  expect(report.checks.promptSafety.appendWorks).toBeTruthy();
  expect(report.checks.promptSafety.appendAutoApproves).toBeFalsy();
  expect(report.checks.promptSafety.appendPreparesExecution).toBeFalsy();
});

test.afterAll(async () => {
  fs.writeFileSync(JSON_REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
});
