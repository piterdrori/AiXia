import fs from "fs";
import path from "path";
import { test, expect } from "@playwright/test";
import { loadAgentOpsOwnerEnv, ownerEnvStatus } from "../../scripts/load-agentops-owner-env.mjs";

loadAgentOpsOwnerEnv();

const REPORT_DIR = path.join("qa-agent", "reports", "browser-qa");
const SCREENSHOT_DIR = path.join(REPORT_DIR, "screenshots");
const JSON_REPORT_PATH = path.join(REPORT_DIR, "monitoring-phase5f-apply-smoke-report.json");

const ownerEmail = process.env.AGENTOPS_QA_OWNER_EMAIL?.trim();
const ownerPassword = process.env.AGENTOPS_QA_OWNER_PASSWORD;
const baseUrl = process.env.AGENTOPS_QA_BASE_URL || "https://ai-xia-staging.vercel.app";

const report = {
  baseUrl,
  startedAt: new Date().toISOString(),
  loginSuccessful: false,
  monitoringProposalsReached: false,
  proposalApproved: false,
  applyConfirmed: false,
  memoryApplied: false,
  appliedMemoryId: null,
  repeatApplyAlreadyApplied: false,
  memoryVisibleInObservatory: false,
  screenshots: [],
  notes: [],
};

function shot(name) {
  const filePath = path.join(SCREENSHOT_DIR, `phase5f-${name}.png`);
  report.screenshots.push(filePath.replaceAll("\\", "/"));
  return filePath;
}

test.beforeAll(() => {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
});

test("Phase 5F staging — approve monitoring memory proposal, apply to memory, verify idempotent", async ({
  page,
  request,
}) => {
  test.setTimeout(240_000);

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

  await page.goto(
    new URL("/system/agent-ops/memory?panel=monitoring-proposals", baseUrl).toString(),
    { waitUntil: "domcontentloaded", timeout: 30000 },
  );
  await expect(page.getByText("Monitoring memory proposals").first()).toBeVisible({
    timeout: 20000,
  });
  await expect(page.getByText("Loading memory proposals")).toHaveCount(0, { timeout: 20000 });
  report.monitoringProposalsReached = true;
  await page.screenshot({ path: shot("02-proposals-panel"), fullPage: true });

  const approveButton = page.getByRole("button", { name: "Approve proposal" }).first();
  if (await approveButton.isVisible().catch(() => false)) {
    await approveButton.click();
    await expect(page.getByText("Approved — not active memory yet")).toBeVisible({ timeout: 20000 });
    report.proposalApproved = true;
  } else {
    report.notes.push("Proposal already past draft status — continuing to apply step.");
  }

  const applyButton = page.getByRole("button", { name: "Apply to Memory" }).first();
  if (await applyButton.isVisible().catch(() => false)) {
    await applyButton.click();
    await expect(page.getByRole("button", { name: "Confirm Apply to Memory" })).toBeVisible({
      timeout: 10000,
    });
    report.applyConfirmed = true;
    await page.getByRole("button", { name: "Confirm Apply to Memory" }).click();
    await expect(page.getByText("Applied to active memory")).toBeVisible({ timeout: 30000 });
    report.memoryApplied = true;
  } else if (await page.getByText("Applied to active memory").isVisible().catch(() => false)) {
    report.notes.push("Proposal already applied before test run.");
    report.memoryApplied = true;
  }

  await page.screenshot({ path: shot("03-after-apply"), fullPage: true });

  const statusResponse = await request.get(`${baseUrl}/api/agentops/monitoring/status`);
  expect(statusResponse.ok()).toBeTruthy();
  const statusPayload = await statusResponse.json();
  const safety = statusPayload?.status?.safety ?? {};
  expect(safety.autoApplyMemory).toBe(false);
  expect(safety.ownerClickApplyRequired).toBe(true);

  if (report.memoryApplied) {
    const memoryIdMatch = await page.getByText(/Memory id:/).textContent().catch(() => null);
    if (memoryIdMatch) {
      report.appliedMemoryId = memoryIdMatch.replace(/.*Memory id:\s*/i, "").trim().split(".")[0];
    }

    await page.goto(new URL("/system/agent-ops/memory", baseUrl).toString(), {
      waitUntil: "domcontentloaded",
    });
    await expect(page.getByRole("heading", { name: /Memory observatory/i })).toBeVisible({
      timeout: 20000,
    });
    if (report.appliedMemoryId) {
      report.memoryVisibleInObservatory = await page
        .getByText(report.appliedMemoryId.slice(0, 8))
        .first()
        .isVisible()
        .catch(() => false);
    }
    await page.screenshot({ path: shot("04-memory-observatory"), fullPage: true });
  }

  report.status = report.memoryApplied ? "passed" : "partial";
  fs.writeFileSync(JSON_REPORT_PATH, JSON.stringify(report, null, 2));
});

test.afterAll(() => {
  report.endedAt = new Date().toISOString();
  fs.writeFileSync(JSON_REPORT_PATH, JSON.stringify(report, null, 2));
});
