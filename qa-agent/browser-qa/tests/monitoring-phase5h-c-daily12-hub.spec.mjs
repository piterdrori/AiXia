import fs from "fs";
import path from "path";
import { test, expect } from "@playwright/test";
import { loadAgentOpsOwnerEnv, ownerEnvStatus } from "../../scripts/load-agentops-owner-env.mjs";

loadAgentOpsOwnerEnv();

const REPORT_DIR = path.join("qa-agent", "reports", "browser-qa");
const SCREENSHOT_DIR = path.join(REPORT_DIR, "screenshots", "phase5h-e");
const JSON_REPORT_PATH = path.join(REPORT_DIR, "agentops-phase5h-e-daily12-hub-report.json");
const MD_REPORT_PATH = path.join(REPORT_DIR, "agentops-phase5h-e-daily12-hub-report.md");

const runId = `phase5h-e-daily12-${Date.now()}`;
const ownerEmail = process.env.AGENTOPS_QA_OWNER_EMAIL?.trim();
const ownerPassword = process.env.AGENTOPS_QA_OWNER_PASSWORD;
const envStatus = ownerEnvStatus();

const report = {
  runId,
  createdAt: new Date().toISOString(),
  baseUrl: process.env.AGENTOPS_QA_BASE_URL || "https://ai-xia-staging.vercel.app",
  status: "skipped",
  envVarsPresent: envStatus.emailPresent && envStatus.passwordPresent,
  loginSuccessful: false,
  daily12CardVisible: false,
  registeredAgents12: false,
  attempted12: false,
  queueCountsMatch: false,
  apiDaily12Present: false,
  latestRunId: null,
  agentDetailChecks: [],
  screenshots: [],
  notes: [],
};

const AGENT_SLUGS = ["system-agent", "design-agent", "qa-agent", "analytics-agent"];

function rel(filePath) {
  return filePath.replaceAll("\\", "/");
}

test.beforeAll(async () => {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
});

test("Phase 5H-E authenticated Daily 12 hub + agent detail QA", async ({ page, baseURL }) => {
  test.setTimeout(240_000);
  report.baseUrl = baseURL || report.baseUrl;

  if (!ownerEmail || !ownerPassword) {
    report.notes.push("Skipped — owner credentials not configured.");
    return;
  }

  await page.goto(new URL("/login", report.baseUrl).toString(), { waitUntil: "domcontentloaded" });
  await page.getByLabel(/email/i).fill(ownerEmail);
  await page.getByLabel(/^password$/i).fill(ownerPassword);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 60_000 });
  report.loginSuccessful = true;

  const apiResponse = await page.request.get(
    new URL("/api/agentops/monitoring/status", report.baseUrl).toString(),
  );
  const apiPayload = await apiResponse.json();
  report.apiDaily12Present = Boolean(apiPayload?.status?.daily12ReviewStatus);
  if (apiPayload?.status?.daily12ReviewStatus) {
    const d = apiPayload.status.daily12ReviewStatus;
    report.latestRunId = d.latestDailyRunId ?? null;
    report.registeredAgents12 =
      d.registeredAgents === 12 && d.expectedAgents === 12 && d.usernamesConfigured === 12;
    report.attempted12 =
      d.agentsAttemptedToday === 12 &&
      d.agentsCompletedToday === 12 &&
      d.agentsFailedToday === 0 &&
      (d.agentsMissingToday?.length ?? 0) === 0;
    report.queueCountsMatch =
      d.candidatesDetectedToday === 68 &&
      d.draftsQueuedToday === 1 &&
      d.candidatesNotQueuedToday === 67 &&
      d.duplicatesConsolidatedToday === 60;
  }

  await page.goto(new URL("/system/agent-ops/agents", report.baseUrl).toString(), {
    waitUntil: "domcontentloaded",
  });
  await expect(page.getByRole("heading", { name: /Daily 12-Agent Review/i })).toBeVisible({
    timeout: 60_000,
  });
  report.daily12CardVisible = true;

  await expect(page.getByText(/Registered 12\/12/i)).toBeVisible();
  await expect(page.getByText(/Usernames 12\/12/i)).toBeVisible();
  await expect(page.getByText(/Attempted today:\s*12/i)).toBeVisible();
  await expect(page.getByText(/Detected 68/i)).toBeVisible();
  await expect(page.getByText(/Queued 1/i)).toBeVisible();
  await expect(page.getByText(/Not queued 67/i)).toBeVisible();
  await expect(page.getByText(/Consolidated 60/i)).toBeVisible();
  await expect(page.getByRole("columnheader", { name: /^Agent$/i })).toBeVisible();
  await expect(page.getByText("@aixia.system-agent")).toBeVisible();
  await expect(page.getByText("@aixia.analytics-agent")).toBeVisible();

  const hubShot = path.join(SCREENSHOT_DIR, "agents-hub-daily12.png");
  await page.screenshot({ path: hubShot, fullPage: true });
  report.screenshots.push(rel(hubShot));

  for (const slug of AGENT_SLUGS) {
    const detail = {
      slug,
      reached: false,
      usernameVisible: false,
      jobTitleVisible: false,
      jobDescriptionVisible: false,
      perspectiveVisible: false,
      dailyStatusVisible: false,
      routesReviewedVisible: false,
      findingSummaryVisible: false,
      error: null,
    };

    try {
      await page.goto(new URL(`/system/agent-ops/agents/${slug}`, report.baseUrl).toString(), {
        waitUntil: "domcontentloaded",
      });
      detail.reached = true;
      detail.usernameVisible = await page
        .getByText(new RegExp(`@aixia\\.${slug.replace("-", "\\-")}`, "i"))
        .first()
        .isVisible()
        .catch(() => false);
      detail.jobTitleVisible = await page.getByText(/job title/i).isVisible().catch(() => false);
      detail.jobDescriptionVisible = await page
        .getByText(/job description/i)
        .isVisible()
        .catch(() => false);
      detail.perspectiveVisible = await page.getByText(/perspective/i).isVisible().catch(() => false);
      detail.dailyStatusVisible = await page
        .getByText(/daily review|daily website review/i)
        .first()
        .isVisible()
        .catch(() => false);
      detail.routesReviewedVisible = await page
        .getByText(/routes reviewed/i)
        .isVisible()
        .catch(() => false);
      detail.findingSummaryVisible = await page
        .getByText(/findings|no findings|errors|improvements/i)
        .first()
        .isVisible()
        .catch(() => false);

      const shot = path.join(SCREENSHOT_DIR, `agent-${slug}.png`);
      await page.screenshot({ path: shot, fullPage: true });
      report.screenshots.push(rel(shot));
    } catch (error) {
      detail.error = error instanceof Error ? error.message : String(error);
      report.notes.push(`${slug} detail check error: ${detail.error}`);
    }

    report.agentDetailChecks.push(detail);
  }

  const allAgentDetailsPassed = report.agentDetailChecks.every(
    (row) =>
      row.reached &&
      row.usernameVisible &&
      row.jobTitleVisible &&
      row.perspectiveVisible &&
      row.dailyStatusVisible,
  );

  report.status =
    report.daily12CardVisible &&
    report.apiDaily12Present &&
    report.registeredAgents12 &&
    report.attempted12 &&
    report.queueCountsMatch &&
    allAgentDetailsPassed
      ? "passed"
      : "failed";
});

test.afterAll(async () => {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
  fs.writeFileSync(JSON_REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  const lines = [
    "# Phase 5H-E Daily 12 Browser QA",
    "",
    `- Run: ${report.runId}`,
    `- Status: ${report.status}`,
    `- Base URL: ${report.baseUrl}`,
    `- Latest run id: ${report.latestRunId ?? "—"}`,
    `- API daily12ReviewStatus: ${report.apiDaily12Present}`,
    `- Hub card visible: ${report.daily12CardVisible}`,
    `- Registered 12/12: ${report.registeredAgents12}`,
    `- Attempted/completed 12: ${report.attempted12}`,
    `- Queue counts 68/1/67/60: ${report.queueCountsMatch}`,
    "",
    "## Screenshots",
    ...report.screenshots.map((s) => `- ${s}`),
    "",
    "## Agent detail checks",
    ...report.agentDetailChecks.map(
      (row) =>
        `- ${row.slug}: reached=${row.reached} username=${row.usernameVisible} job=${row.jobTitleVisible} description=${row.jobDescriptionVisible} perspective=${row.perspectiveVisible} daily=${row.dailyStatusVisible} routes=${row.routesReviewedVisible} findings=${row.findingSummaryVisible}${row.error ? ` error=${row.error}` : ""}`,
    ),
  ];
  fs.writeFileSync(MD_REPORT_PATH, `${lines.join("\n")}\n`, "utf8");
});
