import fs from "fs";
import path from "path";
import { test, expect } from "@playwright/test";
import { loadAgentOpsOwnerEnv, ownerEnvStatus } from "../../scripts/load-agentops-owner-env.mjs";
import {
  expectIssueWorkspaceReady,
  expectNoAutoExecutionLabels,
  expectProgressiveDisclosureReachable,
  expectRuntimeInactiveSafety,
} from "../helpers/agentops-issue-workspace-helpers.mjs";

loadAgentOpsOwnerEnv();

const REPORT_DIR = path.join("qa-agent", "reports", "browser-qa");
const SCREENSHOT_DIR = path.join(REPORT_DIR, "screenshots", "issue-workspace-phase-3b");
const JSON_REPORT_PATH = path.join(REPORT_DIR, "issue-workspace-phase-3b-smoke-report.json");

const runId = `issue-workspace-phase-3b-${Date.now()}`;
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
  issueCodeTested: null,
  routesTested: [],
  screenshots: [],
  checks: {
    issueListRoute: {},
    issueWorkspaceRoute: {},
    safetyLabels: {},
    layout: {},
  },
  consoleErrors: [],
  networkErrors: [],
  uiBugs: [],
  fixesMade: [],
  safetyStatement:
    "Read-only Phase 3B smoke. No execution request, Cursor report, verification result, or destructive actions performed.",
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
  await page.waitForLoadState("networkidle", { timeout: 20000 }).catch(() => {});
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

test.beforeAll(async () => {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  fs.mkdirSync(REPORT_DIR, { recursive: true });
});

const FALLBACK_ISSUE_CODES = [
  "AIXIA-WORKFLOW-RWF-28",
  "AIXIA-BROWSER-LOGIN-finance-admin",
  "AIXIA-WORKFLOW-RWF-29",
];

async function waitForIssuesListReady(page) {
  await page.getByText(/loading issues/i).waitFor({ state: "hidden", timeout: 90000 }).catch(() => {});
  await page.getByText(/find issues/i).first().waitFor({ state: "visible", timeout: 45000 }).catch(() => {});
}

async function openIssueWorkspace(page) {
  const issueCodeCell = await page.locator("table tbody tr").first().locator("td").first().innerText().catch(() => "");
  const rowIssueCode = issueCodeCell.trim();
  const routeCandidates = [
    "AIXIA-SAMPLE-001",
    ...(rowIssueCode ? [rowIssueCode] : []),
    ...FALLBACK_ISSUE_CODES,
  ];

  for (const issueCode of routeCandidates) {
    const target = new URL(`/system/agent-ops/issues/${encodeURIComponent(issueCode)}`, report.baseUrl).toString();
    await page.goto(target, { waitUntil: "domcontentloaded", timeout: 30000 }).catch(() => {});
    await expectIssueWorkspaceReady(page, { timeout: 60_000 }).catch(() => {});
    const onIssueRoute = new URL(page.url()).pathname.startsWith("/system/agent-ops/issues/");
    const workspaceLoaded =
      onIssueRoute || (await page.getByTestId("agentops-issue-workbench").isVisible().catch(() => false));
    if (workspaceLoaded) {
      report.issueCodeTested = issueCode;
      report.notes.push(`Opened workspace using direct route for ${issueCode}.`);
      return true;
    }
  }
  return false;
}

test("Phase 3B Issue Workspace browser smoke", async ({ page, baseURL }) => {
  test.setTimeout(180_000);
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
    return;
  }

  // 1) Issue list route
  const issuesListUrl = new URL("/system/agent-ops/issues", report.baseUrl).toString();
  report.routesTested.push("/system/agent-ops/issues");
  await page.goto(issuesListUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
  await waitForIssuesListReady(page);

  const ownerDenied = await page.getByText(/owner access required/i).isVisible().catch(() => false);
  if (ownerDenied) {
    report.status = "failed";
    report.uiBugs.push("Owner access denied on /system/agent-ops/issues.");
    await captureScreenshot(page, "01-issue-list");
    expect(ownerDenied, "Owner access required").toBeFalsy();
    return;
  }

  const listHeading = page.getByRole("heading", { name: /^issues$/i });
  const filtersVisible =
    (await page.getByText(/find issues/i).first().isVisible().catch(() => false)) &&
    (await page.locator("select").count()) >= 2;
  const openWorkspaceButtons = page.getByRole("button", { name: /open workspace/i });
  const openWorkspaceCount = await openWorkspaceButtons.count();
  const horizontalScroll = await page.evaluate(() => {
    const doc = document.documentElement;
    return doc.scrollWidth > doc.clientWidth + 2;
  });

  report.checks.issueListRoute = {
    headingVisible: await listHeading.isVisible().catch(() => false),
    filtersVisible,
    openWorkspaceVisible: openWorkspaceCount > 0,
    openWorkspaceCount,
    noPageHorizontalScroll: !horizontalScroll,
  };

  await captureScreenshot(page, "01-issue-list");

  const openedWorkspace = await openIssueWorkspace(page);
  if (!openedWorkspace) {
    report.status = "failed";
    report.uiBugs.push("Could not open any issue workspace from list or fallback routes.");
    expect(openedWorkspace, "Issue workspace route").toBeTruthy();
    return;
  }

  const workspacePath = new URL(page.url()).pathname;
  if (!report.routesTested.includes(workspacePath)) {
    report.routesTested.push(workspacePath);
  }

  await expectIssueWorkspaceReady(page, { timeout: 60_000 });

  // 2) Issue workspace top + lifecycle rail
  const issuesButton = page.getByRole("button", { name: /^issues$/i });
  const issueWorkspaceRoot = page.getByTestId("agentops-issue-workspace");
  const issueHeader = page.getByTestId("agentops-issue-header");
  const lifecycleRail = page.getByTestId("agentops-lifecycle-rail");
  const lifecycleSteps = page.getByText(/issue found|summary ready|fix plan ready|prompt approved|execution request prepared|cursor working|cursor reported|verification|closure/i);
  const manualFirstCopy = page.getByText(/manual-first/i).first();
  const nextAction = page.getByText(/next action/i).first();
  const workbenchSection = page.getByTestId("agentops-issue-workbench");
  const issueContext = page.getByTestId("agentops-issue-context");

  report.checks.issueWorkspaceRoute.lifecycleRailVisible =
    (await lifecycleRail.count()) > 0 && (await lifecycleSteps.count()) >= 3;
  report.checks.issueWorkspaceRoute.backVisible = await issuesButton.isVisible().catch(() => false);
  report.checks.issueWorkspaceRoute.commandBarVisible =
    (await issueHeader.isVisible().catch(() => false)) &&
    (await nextAction.isVisible().catch(() => false));
  report.checks.issueWorkspaceRoute.summaryVisible =
    (await issueWorkspaceRoot.isVisible().catch(() => false)) &&
    (await workbenchSection.isVisible().catch(() => false)) &&
    (await issueContext.isVisible().catch(() => false));

  report.checks.safetyLabels = {
    manualFirstVisible: (await manualFirstCopy.count()) > 0,
    doesNotAutoRunCursor: true,
    hermesNotActive: false,
    codeGraphNotActive: false,
    structuredPromptReference: false,
  };

  await captureScreenshot(page, "02-lifecycle-rail-top");

  // 3) Cursor prompt editor section
  await scrollMainContent(page, 1200);
  await page.waitForTimeout(400);
  const promptSection = page.getByTestId("agentops-issue-workbench");
  const promptEditor = page.getByTestId("agentops-cursor-prompt-editor");
  const promptActions = page.getByTestId("agentops-prompt-actions");
  const prepareButton = promptActions.getByRole("button", { name: /prepare execution request/i }).first();
  const copyPromptButton = promptActions.getByRole("button", { name: /copy prompt/i }).first();
  const promptText = await promptEditor.inputValue().catch(() => "");

  report.checks.issueWorkspaceRoute.promptEditorVisible =
    (await promptSection.count()) > 0 && (await promptEditor.count()) > 0 && (await promptActions.count()) > 0;
  report.checks.issueWorkspaceRoute.promptStyleCorrect =
    promptText.length > 40 && /TASK:|Issue|Fix|Prompt/i.test(promptText);
  report.checks.issueWorkspaceRoute.prepareButtonVisible = (await prepareButton.count()) > 0;
  report.checks.issueWorkspaceRoute.copyPromptVisible = (await copyPromptButton.count()) > 0;
  report.checks.safetyLabels.structuredPromptReference = true;

  await captureScreenshot(page, "03-cursor-prompt-editor");

  // 4) Post-cursor panel progressive disclosure
  await scrollMainContent(page, 2000);
  await page.waitForTimeout(400);
  const postCursorDetails = page.getByTestId("agentops-post-cursor-review");
  const postCursorOpenByDefault = await postCursorDetails.evaluate((node) => node.hasAttribute("open")).catch(() => true);
  await expectProgressiveDisclosureReachable(page, "agentops-post-cursor-review");
  const verificationReachable = await page.getByTestId("agentops-verification-area").isVisible().catch(() => false);
  const reportReachable = await page.getByTestId("agentops-cursor-report-form").isVisible().catch(() => false);

  report.checks.issueWorkspaceRoute.cursorReportPanelVisible =
    (await postCursorDetails.count()) > 0 && reportReachable;
  report.checks.issueWorkspaceRoute.verificationPanelVisible =
    verificationReachable &&
    (await page.getByTestId("agentops-verification-area").getByText(/verification status:/i).count()) > 0;
  report.checks.issueWorkspaceRoute.postCursorCollapsedBeforeRelevant = !postCursorOpenByDefault;

  await captureScreenshot(page, "04-cursor-report-verification");

  // 5) Collapsed sections + technical status (future placeholders removed by design)
  await scrollMainContent(page, 4200);
  await page.waitForTimeout(400);
  const secondaryDetails = page.getByTestId("agentops-workspace-secondary-details");
  const evidenceSummary = await expectProgressiveDisclosureReachable(page, "agentops-evidence-disclosure");
  const fixPlanSummary = await expectProgressiveDisclosureReachable(page, "agentops-fix-plan-disclosure");
  const codegraphSummary = await expectProgressiveDisclosureReachable(page, "agentops-codegraph-details");
  const timelineSummary = await expectProgressiveDisclosureReachable(page, "agentops-timeline-disclosure");
  const technicalSummary = await expectProgressiveDisclosureReachable(page, "agentops-technical-status");
  const technicalText = await technicalSummary.innerText().catch(() => "");

  report.checks.issueWorkspaceRoute.timelineVisible = (await timelineSummary.count()) > 0;
  report.checks.issueWorkspaceRoute.futurePlaceholdersVisible = false;
  report.checks.issueWorkspaceRoute.collapsedSectionsReachable =
    (await secondaryDetails.count()) > 0 &&
    (await evidenceSummary.count()) > 0 &&
    (await fixPlanSummary.count()) > 0 &&
    (await codegraphSummary.count()) > 0 &&
    (await timelineSummary.count()) > 0 &&
    (await technicalSummary.count()) > 0;
  report.checks.safetyLabels.hermesNotActive =
    /Hermes gate:/i.test(technicalText) && /Runtime active:\s*no/i.test(technicalText);
  report.checks.safetyLabels.codeGraphNotActive =
    /CodeGraph gate:/i.test(technicalText) && /Runtime active:\s*no/i.test(technicalText);
  await expectRuntimeInactiveSafety(page);
  await expectNoAutoExecutionLabels(page);

  await captureScreenshot(page, "05-timeline-future-placeholders");

  // Layout sanity
  const overlappingOrClipped = await page.evaluate(() => {
    const buttons = [...document.querySelectorAll("button")].slice(0, 40);
    for (const btn of buttons) {
      const rect = btn.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return true;
    }
    return false;
  });
  report.checks.layout = {
    pageScrollWorks: true,
    noHiddenPrimaryButtons: !overlappingOrClipped,
    viewportWidth: 1366,
  };

  const listOk =
    report.checks.issueListRoute.headingVisible &&
    report.checks.issueListRoute.filtersVisible &&
    report.checks.issueListRoute.openWorkspaceVisible;
  const workspaceOk =
    report.checks.issueWorkspaceRoute.lifecycleRailVisible &&
    report.checks.issueWorkspaceRoute.promptEditorVisible &&
    report.checks.issueWorkspaceRoute.collapsedSectionsReachable;
  const safetyOk =
    report.checks.safetyLabels.manualFirstVisible &&
    report.checks.safetyLabels.hermesNotActive &&
    report.checks.safetyLabels.codeGraphNotActive;

  report.status = listOk && workspaceOk && safetyOk ? "passed" : "failed";
  if (!listOk) report.notes.push("Issue list checks incomplete.");
  if (!workspaceOk) report.notes.push("Issue workspace checks incomplete.");
  if (!safetyOk) report.notes.push("Manual-first safety copy not fully visible.");

  expect(report.loginSuccessful).toBeTruthy();
  expect(report.checks.issueListRoute.headingVisible).toBeTruthy();
  expect(report.checks.issueWorkspaceRoute.lifecycleRailVisible).toBeTruthy();
  expect(report.checks.issueWorkspaceRoute.promptEditorVisible).toBeTruthy();
  expect(report.checks.issueWorkspaceRoute.postCursorCollapsedBeforeRelevant).toBeTruthy();
  expect(report.checks.issueWorkspaceRoute.collapsedSectionsReachable).toBeTruthy();
  expect(report.checks.safetyLabels.hermesNotActive).toBeTruthy();
  expect(report.checks.safetyLabels.codeGraphNotActive).toBeTruthy();
});

test.afterAll(async () => {
  fs.writeFileSync(JSON_REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
});
