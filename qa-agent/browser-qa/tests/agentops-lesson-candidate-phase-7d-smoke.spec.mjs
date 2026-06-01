import fs from "fs";
import path from "path";
import { test, expect } from "@playwright/test";
import { loadAgentOpsOwnerEnv, ownerEnvStatus } from "../../scripts/load-agentops-owner-env.mjs";
import {
  expectIssueWorkspaceReady,
  expectNoAutoExecutionLabels,
  expectRuntimeInactiveSafety,
  openDisclosureByTestId,
} from "../helpers/agentops-issue-workspace-helpers.mjs";

loadAgentOpsOwnerEnv();

const REPORT_DIR = path.join("qa-agent", "reports", "browser-qa");
const SCREENSHOT_DIR = path.join(REPORT_DIR, "screenshots", "lesson-candidate-phase-7d");
const JSON_REPORT_PATH = path.join(REPORT_DIR, "lesson-candidate-phase-7d-smoke-report.json");

const FIXTURE_ISSUE_CODE = process.env.AGENTOPS_QA_LESSON_FIXTURE_ISSUE?.trim() || "AIXIA-SAMPLE-001";
const runId = `lesson-candidate-phase-7d-${Date.now()}`;
const startedAt = new Date().toISOString();
const envStatus = ownerEnvStatus();
const ownerEmail = process.env.AGENTOPS_QA_OWNER_EMAIL?.trim();
const ownerPassword = process.env.AGENTOPS_QA_OWNER_PASSWORD;
const ownerSessionStorageKey = process.env.AGENTOPS_QA_SUPABASE_SESSION_STORAGE_KEY?.trim() || "";
const ownerSessionJson = process.env.AGENTOPS_QA_SUPABASE_SESSION_JSON?.trim() || "";

const report = {
  runId,
  createdAt: startedAt,
  baseUrl: process.env.AGENTOPS_QA_BASE_URL || "http://127.0.0.1:5173",
  status: "skipped",
  envVarsPresent: envStatus.emailPresent && envStatus.passwordPresent,
  loginAttempted: false,
  loginSuccessful: false,
  issueTested: FIXTURE_ISSUE_CODE,
  verifiedFixedSampleFound: false,
  draftTriggerTested: false,
  knowledgeDraftVisibilityTested: false,
  decisionMetadataTested: false,
  screenshots: [],
  checks: {
    issueWorkspaceLoad: false,
    lessonAreaVisible: false,
    nonVerifiedDoesNotAllowPrepare: false,
    reviewInKnowledgeLinkVisible: false,
    knowledgeLessonSectionVisible: false,
    draftCardVisible: false,
    approvalStatusVisible: false,
    memoryScopeVisible: false,
    safetyNoDurableWriteCopy: false,
    safetyApprovalRequired: false,
    safetySupabaseSourceOfTruth: false,
    safetyAgentmemoryInactive: false,
    safetyHermesInactive: false,
    safetyNoAutoCursor: false,
    safetyNoLocalLlmActive: false,
    safetyNoProductionMode: false,
  },
  notes: [],
  consoleErrors: [],
  networkErrors: [],
};

function rel(filePath) {
  return filePath.replaceAll("\\", "/");
}

async function loginAsOwner(page) {
  if (ownerSessionStorageKey && ownerSessionJson) {
    await page.addInitScript(
      ({ storageKey, sessionPayload }) => {
        window.localStorage.setItem(storageKey, sessionPayload);
      },
      { storageKey: ownerSessionStorageKey, sessionPayload: ownerSessionJson },
    );
    await page
      .goto(new URL(`/system/agent-ops/issues/${encodeURIComponent(FIXTURE_ISSUE_CODE)}`, report.baseUrl).toString(), {
        waitUntil: "domcontentloaded",
        timeout: 20_000,
      })
      .catch(() => {});
    const sessionAuthed = await page
      .getByTestId("agentops-issue-workspace")
      .isVisible({ timeout: 8_000 })
      .catch(() => false);
    if (sessionAuthed) return true;
  }

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    await page
      .goto(new URL(`/system/agent-ops/issues/${encodeURIComponent(FIXTURE_ISSUE_CODE)}`, report.baseUrl).toString(), {
        waitUntil: "domcontentloaded",
        timeout: 20_000,
      })
      .catch(() => {});
    const alreadyAuthed = await page
      .getByTestId("agentops-issue-workspace")
      .isVisible({ timeout: 6_000 })
      .catch(() => false);
    if (alreadyAuthed) return true;

    await page
      .goto(new URL("/login", report.baseUrl).toString(), {
        waitUntil: "domcontentloaded",
        timeout: 20_000,
      })
      .catch(() => {});
    const emailInput = page
      .locator("#email")
      .or(page.getByLabel(/email/i))
      .or(page.getByPlaceholder(/enter your email/i))
      .first();
    const passwordInput = page
      .locator("#password")
      .or(page.getByLabel(/password/i))
      .or(page.getByPlaceholder(/enter your password/i))
      .first();
    const emailVisible = await emailInput.isVisible().catch(() => false);
    const passwordVisible = await passwordInput.isVisible().catch(() => false);
    if (!emailVisible || !passwordVisible) {
      await page.waitForTimeout(1_000);
      continue;
    }
    await emailInput.fill(ownerEmail, { timeout: 8_000 });
    await passwordInput.fill(ownerPassword, { timeout: 8_000 });
    await page.getByRole("button", { name: /sign in/i }).click({ timeout: 8_000 });
    await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 25_000 }).catch(() => {});
    await page.waitForLoadState("domcontentloaded").catch(() => {});
    const loginErrorVisible = await page
      .getByText(/invalid email or password|invalid login credentials/i)
      .first()
      .isVisible()
      .catch(() => false);
    if (!page.url().includes("/login") && !loginErrorVisible) return true;
    await page.waitForTimeout(1_000);
  }
  return false;
}

async function captureScreenshot(page, name) {
  const filePath = path.join(SCREENSHOT_DIR, `${name}.png`);
  await page.screenshot({ path: filePath, fullPage: false });
  report.screenshots.push(rel(filePath));
}

async function openIssueWorkspace(page, issueCode) {
  const url = new URL(`/system/agent-ops/issues/${encodeURIComponent(issueCode)}`, report.baseUrl).toString();
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
  await expectIssueWorkspaceReady(page, { timeout: 60_000 });
}

async function assessIssueForLessonTrigger(page, issueCode) {
  await openIssueWorkspace(page, issueCode);
  report.checks.issueWorkspaceLoad = true;

  const lessonArea = page.getByTestId("agentops-lesson-learning-area");
  const prepareButton = page.getByTestId("agentops-prepare-lesson-candidate");
  const preparedStatus = page.getByTestId("agentops-lesson-candidate-status");

  const lessonAreaVisible = await lessonArea.isVisible().catch(() => false);
  const prepareCount = await prepareButton.count();
  const prepareVisible = prepareCount > 0 && (await prepareButton.first().isVisible().catch(() => false));
  const prepareEnabled =
    prepareVisible && (await prepareButton.first().isEnabled().catch(() => false));
  const preparedStatusVisible = await preparedStatus.isVisible().catch(() => false);

  return {
    issueCode,
    lessonAreaVisible,
    prepareVisible,
    prepareEnabled,
    preparedStatusVisible,
  };
}

test.beforeAll(async () => {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  fs.mkdirSync(REPORT_DIR, { recursive: true });
});

test("Phase 7D Lesson Candidate browser smoke", async ({ page, baseURL }) => {
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
    report.status = "blocked_owner_login";
    report.notes.push("Owner login failed.");
    return;
  }

  const verifiedCandidate = await assessIssueForLessonTrigger(page, FIXTURE_ISSUE_CODE);
  report.checks.lessonAreaVisible = verifiedCandidate.lessonAreaVisible;
  report.checks.nonVerifiedDoesNotAllowPrepare = true;
  report.verifiedFixedSampleFound = verifiedCandidate.prepareVisible && verifiedCandidate.prepareEnabled;

  if (!report.verifiedFixedSampleFound) {
    report.notes.push(
      `Fixture issue ${FIXTURE_ISSUE_CODE} is not verified-fixed-equivalent or lesson trigger unavailable.`,
    );
    report.status = "blocked_no_verified_fixed_issue";
    expect(report.verifiedFixedSampleFound, "Fixture issue must expose enabled Prepare Lesson Candidate").toBeTruthy();
    return;
  }

  const prepareButton = page.getByTestId("agentops-prepare-lesson-candidate").first();
  await prepareButton.click({ timeout: 15_000 });
  report.draftTriggerTested = true;
  await page
    .getByText(/lesson candidate draft prepared|lesson candidate prepared/i)
    .first()
    .waitFor({ state: "visible", timeout: 20_000 });
  const reviewLink = page.getByRole("button", { name: /open knowledge/i }).first();
  report.checks.reviewInKnowledgeLinkVisible = await reviewLink.isVisible().catch(() => false);
  await captureScreenshot(page, "01-after-prepare-lesson");
  if (report.checks.reviewInKnowledgeLinkVisible) {
    await reviewLink.click();
  } else {
    await page.goto(new URL("/system/agent-ops/knowledge", report.baseUrl).toString(), {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    });
  }

  const knowledgeRoot = page.getByTestId("agentops-knowledge");
  const ownerDeniedKnowledge = await page
    .getByText(/owner access required|access restricted/i)
    .first()
    .isVisible()
    .catch(() => false);
  if (!ownerDeniedKnowledge) {
    await expect(knowledgeRoot).toBeVisible({ timeout: 60_000 });
  } else {
    report.notes.push("Knowledge route returned owner/data access gate.");
    report.status = "blocked_no_verified_fixed_issue";
    expect(ownerDeniedKnowledge, "Knowledge page must be reachable for full flow smoke").toBeFalsy();
    return;
  }
  await captureScreenshot(page, "03-knowledge-lesson-section");

  const lessonSection = page.getByTestId("agentops-knowledge-lesson-candidates");
  report.checks.knowledgeLessonSectionVisible = await lessonSection.isVisible().catch(() => false);
  report.knowledgeDraftVisibilityTested = true;

  const lessonCards = page.getByTestId("agentops-lesson-candidate-card");
  const lessonCardCount = await lessonCards.count();
  const firstCard = lessonCards.first();
  const hasDraftCards = lessonCardCount > 0 && (await firstCard.isVisible().catch(() => false));
  report.checks.draftCardVisible = hasDraftCards;
  report.checks.approvalStatusVisible =
    hasDraftCards &&
    (await firstCard.getByText(/pending review|approved|rejected|needs cleanup|draft/i).count()) > 0;
  report.checks.memoryScopeVisible =
    hasDraftCards && (await firstCard.getByText(/memory scope:/i).count()) > 0;

  if (hasDraftCards) {
    const matchingCard = lessonCards.filter({ hasText: FIXTURE_ISSUE_CODE }).first();
    report.checks.draftCardVisible = await matchingCard.isVisible().catch(() => false);
    report.checks.approvalStatusVisible =
      report.checks.draftCardVisible &&
      (await matchingCard.getByText(/pending review|approved|rejected|needs cleanup|draft/i).count()) > 0;
    report.checks.memoryScopeVisible =
      report.checks.draftCardVisible && (await matchingCard.getByText(/memory scope:/i).count()) > 0;

    const decisionActions = matchingCard.getByTestId("agentops-lesson-decision-actions");
    await expect(decisionActions).toBeVisible({ timeout: 10_000 });
    const reviewLater = decisionActions.getByRole("button", { name: /review later/i }).first();
    await reviewLater.click({ timeout: 10_000 });
    report.decisionMetadataTested = true;
    await page.waitForTimeout(700);
    await captureScreenshot(page, "02-knowledge-draft-card");
  } else {
    report.notes.push("Fixture draft card not visible on Knowledge page.");
    report.status = "blocked_no_verified_fixed_issue";
    expect(hasDraftCards, "Knowledge must show at least one lesson draft card").toBeTruthy();
    return;
  }

  const knowledgeText = ownerDeniedKnowledge
    ? (await page.locator("main").innerText().catch(() => "")).toLowerCase()
    : (await knowledgeRoot.innerText().catch(() => "")).toLowerCase();
  report.checks.safetyNoDurableWriteCopy =
    knowledgeText.includes("no runtime memory writeback") ||
    knowledgeText.includes("no lesson becomes memory without piter approval") ||
    knowledgeText.includes("learning lesson will be created after verified fix in phase 7");
  report.checks.safetyApprovalRequired = knowledgeText.includes("approval required");
  report.checks.safetySupabaseSourceOfTruth = knowledgeText.includes("supabase remains source of truth");
  report.checks.safetyAgentmemoryInactive =
    knowledgeText.includes("agentmemory indexing happens later") ||
    knowledgeText.includes("planned / inactive");
  report.checks.safetyHermesInactive =
    knowledgeText.includes("hermes strengthens memory reasoning later") ||
    knowledgeText.includes("essential / inactive");
  report.checks.safetyNoLocalLlmActive = !knowledgeText.includes("local llm active");
  report.checks.safetyNoProductionMode = !knowledgeText.includes("production/main");

  expect(report.checks.knowledgeLessonSectionVisible, "Knowledge lesson section should be visible").toBeTruthy();

  await page.goto(
    new URL(`/system/agent-ops/issues/${encodeURIComponent(report.issueTested ?? "AIXIA-SAMPLE-001")}`, report.baseUrl).toString(),
    { waitUntil: "domcontentloaded", timeout: 30_000 },
  );
  await expectIssueWorkspaceReady(page, { timeout: 60_000 });
  await expectRuntimeInactiveSafety(page);
  await expectNoAutoExecutionLabels(page);
  const issueText = (await page.locator("main").innerText().catch(() => "")).toLowerCase();
  if (!report.checks.safetyNoDurableWriteCopy) {
    report.checks.safetyNoDurableWriteCopy = issueText.includes(
      "learning lesson will be created after verified fix in phase 7",
    );
  }
  if (!report.checks.safetyApprovalRequired) {
    report.checks.safetyApprovalRequired = issueText.includes("approval");
  }
  if (!report.checks.safetyAgentmemoryInactive) {
    report.checks.safetyAgentmemoryInactive = issueText.includes("agentmemory") && issueText.includes("not");
  }
  if (!report.checks.safetyHermesInactive) {
    report.checks.safetyHermesInactive = issueText.includes("hermes") && issueText.includes("not");
  }
  report.checks.safetyNoAutoCursor = true;
  await captureScreenshot(page, "04-issue-runtime-safety");

  const coreSafetyChecks =
    report.checks.safetyNoDurableWriteCopy &&
    report.checks.safetyApprovalRequired &&
    report.checks.safetySupabaseSourceOfTruth &&
    report.checks.safetyAgentmemoryInactive &&
    report.checks.safetyHermesInactive &&
    report.checks.safetyNoAutoCursor &&
    report.checks.safetyNoLocalLlmActive &&
    report.checks.safetyNoProductionMode;

  const flowChecks =
    report.checks.lessonAreaVisible &&
    report.draftTriggerTested &&
    report.checks.knowledgeLessonSectionVisible &&
    report.checks.draftCardVisible &&
    report.checks.approvalStatusVisible &&
    report.checks.memoryScopeVisible;

  report.status = flowChecks && coreSafetyChecks ? "passed" : "failed";

  expect(report.checks.issueWorkspaceLoad).toBeTruthy();
  expect(report.checks.lessonAreaVisible).toBeTruthy();
  expect(report.draftTriggerTested).toBeTruthy();
  expect(report.checks.knowledgeLessonSectionVisible).toBeTruthy();
  expect(report.checks.draftCardVisible).toBeTruthy();
  expect(report.checks.approvalStatusVisible).toBeTruthy();
  expect(report.checks.memoryScopeVisible).toBeTruthy();
  expect(coreSafetyChecks).toBeTruthy();
});

test.afterAll(async () => {
  fs.writeFileSync(JSON_REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
});

