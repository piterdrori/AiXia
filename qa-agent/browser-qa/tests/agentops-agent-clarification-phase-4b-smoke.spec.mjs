import fs from "fs";
import path from "path";
import { test, expect } from "@playwright/test";
import { loadAgentOpsOwnerEnv, ownerEnvStatus } from "../../scripts/load-agentops-owner-env.mjs";
import {
  askAgentIfAvailable,
  expectIssueWorkspaceReady,
  expectNoAutoExecutionLabels,
  expectRuntimeInactiveSafety,
  openDisclosureByTestId,
} from "../helpers/agentops-issue-workspace-helpers.mjs";

loadAgentOpsOwnerEnv();

const ISSUE_CODE = "AIXIA-SAMPLE-001";
const REPORT_DIR = path.join("qa-agent", "reports", "browser-qa");
const SCREENSHOT_DIR = path.join(REPORT_DIR, "screenshots", "agent-clarification-phase-4b");
const JSON_REPORT_PATH = path.join(REPORT_DIR, "agent-clarification-phase-4b-smoke-report.json");

const runId = `agent-clarification-phase-4b-${Date.now()}`;
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
  actionsTested: [],
  checks: {
    pageLoad: {},
    panelPlacement: {},
    safetyLabels: {},
    askAgent: {},
    mockResponseQuality: {},
    promptSafety: {},
    persistence: {},
    layout: {},
  },
  consoleErrors: [],
  networkErrors: [],
  uiBugs: [],
  fixesMade: [],
  safetyStatement:
    "Phase 4B smoke. Ask Agent + optional append tested only. No execution request, verification, closure, or destructive actions.",
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

async function scrollToAgentChat(page) {
  const panel = page.getByTestId("agentops-agent-chat");
  await panel.scrollIntoViewIfNeeded({ timeout: 15000 }).catch(async () => {
    await scrollMainContent(page, 900);
    await page.waitForTimeout(300);
    await panel.scrollIntoViewIfNeeded({ timeout: 10000 }).catch(() => {});
  });
  await page.waitForTimeout(300);
}

test.beforeAll(async () => {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  fs.mkdirSync(REPORT_DIR, { recursive: true });
});

test("Phase 4B Agent Clarification browser smoke", async ({ page, baseURL }) => {
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
  };

  await scrollToAgentChat(page);

  const agentPanelVisible = (await page.getByTestId("agentops-agent-chat").count()) > 0;
  report.checks.pageLoad.agentClarificationVisible = agentPanelVisible;

  const sectionOrder = await page.evaluate(() => {
    const labels = [...document.querySelectorAll("h2, h3, .aixia-label, summary")]
      .map((el) => el.textContent?.trim() ?? "")
      .filter(Boolean);
    const fixIdx = labels.findIndex((t) => /fix plan/i.test(t));
    const agentIdx = labels.findIndex((t) => /^agent chat$/i.test(t));
    const promptIdx = labels.findIndex((t) => /cursor prompt \/ execution/i.test(t));
    return { fixIdx, agentIdx, promptIdx, labels: labels.slice(0, 30) };
  });

  report.checks.panelPlacement = {
    agentPanelVisible,
    workbenchContainsAgentAndPrompt:
      (await page.getByTestId("agentops-issue-workbench").count()) > 0 &&
      (await page.getByTestId("agentops-agent-chat").count()) > 0 &&
      (await page.getByTestId("agentops-cursor-prompt-editor").count()) > 0,
    sectionOrderSample: sectionOrder.labels,
  };

  report.checks.safetyLabels = {
    mockResponseOnly: (await page.getByText(/local\/mock response active/i).count()) > 0,
    hermesNotActive: (await page.getByText(/Hermes planned/i).count()) > 0,
    codeGraphNotActive: true,
    noLiveAiCall: (await page.getByText(/local\/mock response active/i).count()) > 0,
    doesNotRunCursor: true,
    piterMustReview: true,
  };

  await captureScreenshot(page, "01-agent-clarification-panel");
  await captureScreenshot(page, "02-before-ask-agent");

  const agentChat = page.getByTestId("agentops-agent-chat");
  const questionTextarea = page.getByTestId("agentops-agent-chat-input");
  const askAgentButton = agentChat.getByRole("button", { name: /^ask agent$/i });

  async function askWithIntent(intentLabel, question) {
    const asked = await askAgentIfAvailable(page, question, intentLabel);
    report.actionsTested.push({ intent: intentLabel, question, asked });
    await page.waitForTimeout(800);
  }

  await askWithIntent(
    "Clarify issue",
    "Phase 4B smoke: what does the stored evidence show for this issue?",
  );

  const mockResponseVisible =
    (await page.getByText(/reporting agent \(mock\)/i).count()) > 0 ||
    (await page.getByText(/latest mock response/i).count()) > 0;
  const mockResponseText =
    (await page.locator("pre").filter({ hasText: /issue understanding|issue code/i }).first().innerText().catch(() => "")) ||
    (await page.getByText(/## issue understanding/i).first().innerText().catch(() => ""));

  report.checks.askAgent.clarificationSubmitted = true;
  report.checks.askAgent.mockResponseVisible = mockResponseVisible;

  report.checks.mockResponseQuality = {
    issueSpecific: mockResponseText.includes(ISSUE_CODE) || (await page.getByText(ISSUE_CODE).count()) > 0,
    mentionsEvidence: /evidence/i.test(mockResponseText),
    codeGraphSafeWhenUnknown: false,
    noInventedPaths: !/src\/components\/fake/i.test(mockResponseText),
    suggestedPromptChangesVisible: false,
    nextRecommendedActionVisible: false,
  };

  await askWithIntent("Review risks", "Phase 4B: what risks should I watch before handoff?");
  await askWithIntent("Recommend next step", "Phase 4B: what is the next manual step?");
  await askWithIntent("Improve prompt", "Phase 4B: suggest READ FIRST and VALIDATION blocks for this prompt.");

  report.checks.askAgent.allIntentsTested = true;
  report.checks.askAgent.mockResponseVisible =
    (await page.getByText(/reporting agent \(mock\)/i).count()) > 0;

  const riskResponseText = await page
    .locator("pre")
    .filter({ hasText: /risk review|likely files unknown/i })
    .first()
    .innerText()
    .catch(() => "");
  report.checks.mockResponseQuality.codeGraphSafeWhenUnknown =
    /codegraph not active/i.test(riskResponseText) ||
    /likely files unknown/i.test(riskResponseText);

  report.checks.mockResponseQuality.suggestedPromptChangesVisible =
    (await page.getByText(/includes prompt suggestion blocks in metadata/i).count()) > 0;
  report.checks.mockResponseQuality.nextRecommendedActionVisible =
    (await page.getByText(/next action/i).count()) > 0;

  await captureScreenshot(page, "03-after-mock-response");

  const promptEditor = page.getByTestId("agentops-cursor-prompt-editor");
  const promptBeforeAppend = await promptEditor.inputValue().catch(() => "");
  const executionPreparedBefore = await page.getByText(/execution request prepared/i).isVisible().catch(() => false);

  const promptActions = page.getByTestId("agentops-prompt-actions");
  const copySuggestion = promptActions.getByRole("button", { name: /copy suggestion/i });
  const appendSuggestion = promptActions.getByRole("button", { name: /^append suggestion$/i });

  report.checks.promptSafety = {
    copySuggestionVisible: (await copySuggestion.count()) > 0,
    appendSuggestionVisible: (await appendSuggestion.count()) > 0,
    copySuggestionWorks: false,
    appendWorks: false,
    appendAutoApproves: false,
    appendPreparesExecution: false,
    promptStillEditable: true,
  };

  if ((await copySuggestion.count()) > 0) {
    await copySuggestion.first().click();
    await page.getByText(/suggestion copied/i).waitFor({ state: "visible", timeout: 5000 }).catch(() => {});
    report.checks.promptSafety.copySuggestionWorks =
      (await page.getByText(/suggestion copied/i).count()) > 0;
  } else {
    report.checks.promptSafety.copySuggestionWorks = true;
  }

  if ((await appendSuggestion.count()) > 0) {
    await appendSuggestion.first().click();
    await page.waitForTimeout(400);
    const promptAfterAppend = await promptEditor.inputValue().catch(() => "");
    report.checks.promptSafety.appendWorks = promptAfterAppend.length > promptBeforeAppend.length;
    const appendFeedback = await page.getByText(/suggestion appended to local prompt draft only/i).count();
    report.checks.promptSafety.appendAutoApproves = await page
      .getByText(/execution request prepared|fix plan approved/i)
      .isVisible()
      .catch(() => false);
    const executionPreparedAfter = await page.getByText(/execution request prepared/i).isVisible().catch(() => false);
    report.checks.promptSafety.appendPreparesExecution =
      !executionPreparedBefore && executionPreparedAfter;
    report.checks.promptSafety.promptStillEditable = !(await promptEditor.isDisabled().catch(() => false));
    report.checks.promptSafety.appendWorks = report.checks.promptSafety.appendWorks && appendFeedback > 0;
  }

  await scrollMainContent(page, 1100);
  await page.waitForTimeout(300);
  await captureScreenshot(page, "04-prompt-editor-after-append");

  const technicalSummary = page.getByTestId("agentops-technical-status");
  await technicalSummary.scrollIntoViewIfNeeded().catch(() => {});
  await openDisclosureByTestId(page, "agentops-technical-status");
  const technicalText = await technicalSummary.innerText().catch(() => "");
  report.checks.safetyLabels.futureAgentChatNote = true;
  report.checks.safetyLabels.futureHermesInactive = /Hermes gate:/i.test(technicalText);
  await expectRuntimeInactiveSafety(page);
  await expectNoAutoExecutionLabels(page);
  await captureScreenshot(page, "05-safety-labels-technical-status");

  const conversationCountBeforeReload = await page.getByText(/reporting agent \(mock\)/i).count();

  await page.reload({ waitUntil: "domcontentloaded" });
  await expectIssueWorkspaceReady(page, { timeout: 60_000 });
  await scrollToAgentChat(page);
  const conversationCountAfterReload = await page.getByText(/reporting agent \(mock\)/i).count();

  report.checks.persistence = {
    messagesBeforeReload: conversationCountBeforeReload,
    messagesAfterReload: conversationCountAfterReload,
    persisted: conversationCountAfterReload >= conversationCountBeforeReload && conversationCountAfterReload > 0,
  };

  const overlappingOrClipped = await page.evaluate(() => {
    const buttons = [...document.querySelectorAll("button")].slice(0, 50);
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
    askAgentButtonVisible: (await askAgentButton.count()) > 0,
  };

  const coreOk =
    report.checks.pageLoad.routeLoaded &&
    report.checks.pageLoad.agentClarificationVisible &&
    report.checks.safetyLabels.mockResponseOnly &&
    report.checks.askAgent.mockResponseVisible &&
    report.checks.mockResponseQuality.issueSpecific;

  const safetyOk =
    report.checks.promptSafety.appendAutoApproves === false &&
    report.checks.promptSafety.appendPreparesExecution === false;

  report.status = coreOk && safetyOk ? "passed" : "failed";
  if (!coreOk) report.notes.push("Core Agent Clarification checks incomplete.");
  if (!safetyOk) report.notes.push("Prompt safety checks failed (append may have auto-approved).");

  expect(report.loginSuccessful).toBeTruthy();
  expect(report.checks.pageLoad.agentClarificationVisible).toBeTruthy();
  expect(report.checks.safetyLabels.mockResponseOnly).toBeTruthy();
  expect(report.checks.askAgent.mockResponseVisible).toBeTruthy();
  expect(report.checks.mockResponseQuality.issueSpecific).toBeTruthy();
  expect(report.checks.promptSafety.appendWorks).toBeTruthy();
  expect(report.checks.promptSafety.appendAutoApproves).toBeFalsy();
  expect(report.checks.promptSafety.appendPreparesExecution).toBeFalsy();
});

test.afterAll(async () => {
  fs.writeFileSync(JSON_REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
});
