import fs from "fs";
import path from "path";
import { test, expect } from "@playwright/test";
import { loadAgentOpsOwnerEnv, ownerEnvStatus } from "../../scripts/load-agentops-owner-env.mjs";

loadAgentOpsOwnerEnv();

const REPORT_DIR = path.join("qa-agent", "reports", "browser-qa");
const SCREENSHOT_DIR = path.join(REPORT_DIR, "screenshots");
const JSON_REPORT_PATH = path.join(REPORT_DIR, "monitoring-phase5d-promote-smoke-report.json");

const ownerEmail = process.env.AGENTOPS_QA_OWNER_EMAIL?.trim();
const ownerPassword = process.env.AGENTOPS_QA_OWNER_PASSWORD;
const baseUrl = process.env.AGENTOPS_QA_BASE_URL || "https://ai-xia-staging.vercel.app";
const configDraftId = "a27a8ba8-7ba5-4f50-958d-e0ba189eeea4";
const expectedExistingIssue = "BQA-0B036BE3";

const report = {
  baseUrl,
  startedAt: new Date().toISOString(),
  loginSuccessful: false,
  monitoringDraftsReached: false,
  configDraftApproved: false,
  configDraftPromoted: false,
  promotedIssueCode: null,
  existingIssueVisibleInHub: false,
  screenshots: [],
  notes: [],
};

function shot(name) {
  const filePath = path.join(SCREENSHOT_DIR, `phase5d-${name}.png`);
  report.screenshots.push(filePath.replaceAll("\\", "/"));
  return filePath;
}

test.beforeAll(() => {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
});

test("Phase 5D staging — approve config-agent draft, promote, verify BQA in hub", async ({ page }) => {
  test.setTimeout(180_000);

  const env = ownerEnvStatus();
  if (!env.emailPresent || !env.passwordPresent) {
    report.notes.push("Skipped: owner credentials not configured.");
    fs.writeFileSync(JSON_REPORT_PATH, JSON.stringify(report, null, 2));
    test.skip();
    return;
  }

  await page.goto(new URL("/login", baseUrl).toString(), {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });
  await page.locator("#email").fill(ownerEmail);
  await page.locator("#password").fill(ownerPassword);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 30000 });
  await page.waitForLoadState("networkidle", { timeout: 20000 }).catch(() => {});

  const loginError = await page
    .getByText(/invalid email or password|invalid login credentials/i)
    .first()
    .isVisible()
    .catch(() => false);
  report.loginSuccessful = !loginError && !page.url().includes("/login");
  expect(report.loginSuccessful, "Owner sign-in failed").toBe(true);
  await page.screenshot({ path: shot("01-after-login"), fullPage: true });

  await page.goto(new URL("/system/agent-ops/issues?panel=monitoring-drafts", baseUrl).toString(), {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });
  await expect(page.getByRole("heading", { name: "Monitoring issue drafts" })).toBeVisible({
    timeout: 20000,
  });
  await expect(page.getByText("Loading monitoring issue drafts")).toHaveCount(0, { timeout: 20000 });
  await expect(page.getByText("config-agent")).toBeVisible({ timeout: 20000 });
  report.monitoringDraftsReached = true;
  await page.screenshot({ path: shot("02-monitoring-drafts"), fullPage: true });

  const approveBtn = page.getByRole("button", { name: "Approve draft" }).first();
  if (await approveBtn.isVisible().catch(() => false)) {
    await approveBtn.click();
    await page.waitForTimeout(1500);
    report.configDraftApproved = true;
    await page.screenshot({ path: shot("03-after-approve"), fullPage: true });
  } else {
    report.notes.push("Approve button not visible — draft may already be approved.");
    report.configDraftApproved = true;
  }

  await expect(page.getByRole("button", { name: "Promote to Issue" }).first()).toBeVisible({
    timeout: 15000,
  });
  const promoteBtn = page.getByRole("button", { name: "Promote to Issue" }).first();
  await promoteBtn.click();
  await expect(page.getByRole("button", { name: "Open issue workspace" }).first()).toBeVisible({
    timeout: 20000,
  });
  report.configDraftPromoted = true;

  const issueLink = page.locator('a[href*="/system/agent-ops/issues/BQA-"]').first();
  if (await issueLink.isVisible().catch(() => false)) {
    const href = await issueLink.getAttribute("href");
    const match = href?.match(/BQA-[A-F0-9]+/i);
    report.promotedIssueCode = match?.[0] ?? null;
  }
  await page.screenshot({ path: shot("04-after-promote"), fullPage: true });

  await page.goto(new URL("/system/agent-ops/issues", baseUrl).toString(), {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });
  await page.waitForLoadState("networkidle", { timeout: 20000 }).catch(() => {});
  await page.screenshot({ path: shot("05-issues-hub"), fullPage: true });

  const pageText = await page.locator("body").innerText();
  report.existingIssueVisibleInHub = pageText.includes(expectedExistingIssue);

  expect(report.configDraftPromoted, "Config-agent draft should show promoted state").toBe(true);
  expect(report.existingIssueVisibleInHub, `${expectedExistingIssue} should appear in Issues hub`).toBe(true);

  report.endedAt = new Date().toISOString();
  report.status = "passed";
  fs.writeFileSync(JSON_REPORT_PATH, JSON.stringify(report, null, 2));
});
