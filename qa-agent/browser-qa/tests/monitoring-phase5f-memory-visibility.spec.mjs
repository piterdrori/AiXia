import fs from "fs";
import path from "path";
import { test, expect } from "@playwright/test";
import { loadAgentOpsOwnerEnv, ownerEnvStatus } from "../../scripts/load-agentops-owner-env.mjs";

loadAgentOpsOwnerEnv();

const REPORT_DIR = path.join("qa-agent", "reports", "browser-qa");
const SCREENSHOT_DIR = path.join(REPORT_DIR, "screenshots");
const JSON_REPORT_PATH = path.join(
  REPORT_DIR,
  "monitoring-phase5f-memory-visibility-report.json",
);

const ownerEmail = process.env.AGENTOPS_QA_OWNER_EMAIL?.trim();
const ownerPassword = process.env.AGENTOPS_QA_OWNER_PASSWORD;
const baseUrl = process.env.AGENTOPS_QA_BASE_URL || "https://ai-xia-staging.vercel.app";
const appliedMemoryId = "4910f6d1-251a-4fc6-8a0d-a83f4809f9ea";
const sourceProposalId = "ed559d6a-c4cd-48c3-8edf-1c92c3ce03fd";

const report = {
  baseUrl,
  appliedMemoryId,
  startedAt: new Date().toISOString(),
  loginSuccessful: false,
  deepLinkVisible: false,
  monitoringSourceFilterVisible: false,
  proposalDeepLinkWorks: false,
  screenshots: [],
  notes: [],
};

function shot(name) {
  const filePath = path.join(SCREENSHOT_DIR, `phase5f-vis-${name}.png`);
  report.screenshots.push(filePath.replaceAll("\\", "/"));
  return filePath;
}

test.beforeAll(() => {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
});

test("Phase 5F visibility — memory deep link, monitoring filter, proposal review link", async ({
  page,
}) => {
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
  report.loginSuccessful = !page.url().includes("/login");
  expect(report.loginSuccessful).toBe(true);

  await page.goto(
    new URL(
      `/system/agent-ops/runtime/memory?memoryId=${appliedMemoryId}`,
      baseUrl,
    ).toString(),
    { waitUntil: "domcontentloaded", timeout: 30000 },
  );

  await expect(page.getByText("Direct memory lookup")).toBeVisible({ timeout: 20000 });
  await expect(page.getByText(appliedMemoryId)).toBeVisible({ timeout: 20000 });
  await expect(page.getByText("monitoring_memory_proposal")).toBeVisible({ timeout: 20000 });
  await expect(page.getByText(sourceProposalId)).toBeVisible({ timeout: 20000 });
  report.deepLinkVisible = true;
  await page.screenshot({ path: shot("01-deep-link"), fullPage: true });

  await page.getByRole("button", { name: "Monitoring memory proposals" }).click();
  await expect(page.getByText(appliedMemoryId.slice(0, 8))).toBeVisible({ timeout: 20000 });
  report.monitoringSourceFilterVisible = true;
  await page.screenshot({ path: shot("02-monitoring-filter"), fullPage: true });

  await page.goto(
    new URL("/system/agent-ops/memory?panel=monitoring-proposals", baseUrl).toString(),
    { waitUntil: "domcontentloaded", timeout: 30000 },
  );
  await expect(page.getByText("Monitoring memory proposals").first()).toBeVisible({
    timeout: 20000,
  });

  const viewLink = page.getByRole("link", { name: "View active memory" }).first();
  await expect(viewLink).toBeVisible({ timeout: 20000 });
  await viewLink.click();
  await page.waitForURL((url) => url.searchParams.get("memoryId") === appliedMemoryId, {
    timeout: 20000,
  });
  await expect(page.getByText("Direct memory lookup")).toBeVisible({ timeout: 20000 });
  report.proposalDeepLinkWorks = true;
  await page.screenshot({ path: shot("03-proposal-deep-link"), fullPage: true });

  report.status = "passed";
  fs.writeFileSync(JSON_REPORT_PATH, JSON.stringify(report, null, 2));
});

test.afterAll(() => {
  report.endedAt = new Date().toISOString();
  fs.writeFileSync(JSON_REPORT_PATH, JSON.stringify(report, null, 2));
});
