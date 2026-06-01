import fs from "fs";
import path from "path";
import { test, expect } from "@playwright/test";
import { loadAgentOpsOwnerEnv, ownerEnvStatus } from "../../scripts/load-agentops-owner-env.mjs";

loadAgentOpsOwnerEnv();

const REPORT_DIR = path.join("qa-agent", "reports", "browser-qa");
const SCREENSHOT_DIR = path.join(REPORT_DIR, "screenshots");
const JSON_REPORT_PATH = path.join(REPORT_DIR, "owner-agentops-smoke-report.json");
const MD_REPORT_PATH = path.join(REPORT_DIR, "owner-agentops-smoke-report.md");

const runId = `owner-agentops-smoke-${Date.now()}`;
const startedAt = new Date().toISOString();
const envStatus = ownerEnvStatus();
const ownerEmail = process.env.AGENTOPS_QA_OWNER_EMAIL?.trim();
const ownerPassword = process.env.AGENTOPS_QA_OWNER_PASSWORD;

const report = {
  runId,
  createdAt: startedAt,
  baseUrl: process.env.AGENTOPS_QA_BASE_URL || "http://localhost:5173",
  status: "skipped",
  envVarsPresent: envStatus.emailPresent && envStatus.passwordPresent,
  loginAttempted: false,
  loginSuccessful: false,
  routeReached: false,
  accessDenied: false,
  agentOpsHeadingVisible: false,
  hermesVisible: false,
  activeTop10Visible: false,
  refillButtonVisible: false,
  importButtonVisible: false,
  generateTabImportVisible: false,
  fixWorkflowTabVisible: false,
  systemTabHermesVisible: false,
  rowActionMenuVisible: false,
  screenshotPath: null,
  consoleErrors: [],
  networkErrors: [],
  safetyStatement:
    "Read-only owner smoke only. No AgentOps write/destructive actions performed.",
  notes: [],
};

function rel(filePath) {
  return filePath.replaceAll("\\", "/");
}

test.beforeAll(async () => {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
});

test("owner authenticated readonly smoke for /system/agent-ops", async ({ page, baseURL }) => {
  test.setTimeout(120_000);
  report.baseUrl = baseURL || report.baseUrl;

  if (!ownerEmail || !ownerPassword) {
    report.status = "skipped";
    report.notes.push("Owner smoke skipped because credentials are not configured.");
    return;
  }

  const consoleErrors = [];
  const networkErrors = [];

  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("response", (resp) => {
    if (resp.status() >= 400) {
      networkErrors.push(`${resp.status()} ${resp.url()}`);
    }
  });

  report.loginAttempted = true;

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
  const leftLoginRoute = !page.url().includes("/login");
  report.loginSuccessful = leftLoginRoute && !loginErrorVisible;

  await page.goto(new URL("/system/agent-ops", report.baseUrl).toString(), {
    waitUntil: "domcontentloaded",
    timeout: 25000,
  });

  await page
    .getByText(/checking agentops access/i)
    .waitFor({ state: "hidden", timeout: 45000 })
    .catch(() => {});

  const ownerDenied = page.getByText(/agentops is owner-only|not on the agentops owner allowlist/i);
  const controlCenter = page.getByText(/agentops control center/i);

  await Promise.race([
    ownerDenied.waitFor({ state: "visible", timeout: 45000 }).catch(() => {}),
    controlCenter.waitFor({ state: "visible", timeout: 45000 }).catch(() => {}),
  ]);

  await page
    .getByText(/loading agentops dashboard/i)
    .waitFor({ state: "hidden", timeout: 30000 })
    .catch(() => {});

  const finalUrl = page.url();
  report.routeReached = finalUrl.includes("/system/agent-ops");
  report.accessDenied = await ownerDenied.isVisible().catch(() => false);
  report.agentOpsHeadingVisible = await controlCenter.isVisible().catch(() => false);
  report.hermesVisible = await page
    .getByText(/hermes score|hermes memory support meter|hermes readiness/i)
    .first()
    .isVisible()
    .catch(() => false);
  report.refillButtonVisible = await page.getByRole("button", { name: /refill queue/i }).isVisible().catch(() => false);
  report.importButtonVisible = await page.getByRole("button", { name: /import static findings/i }).isVisible().catch(() => false);
  report.rowActionMenuVisible = (await page.getByRole("button", { name: /more actions/i }).count()) > 0;

  await page.getByRole("button", { name: /generate issues/i }).click();
  await page.getByText(/manual import plans/i).waitFor({ state: "visible", timeout: 15000 }).catch(() => {});
  report.generateTabImportVisible = await page
    .getByRole("button", { name: /import static findings/i })
    .isVisible()
    .catch(() => false);

  await page.getByRole("button", { name: /fix workflow/i }).first().click();
  await page.getByText(/fix plan review/i).waitFor({ state: "visible", timeout: 15000 }).catch(() => {});
  report.fixWorkflowTabVisible = await page
    .getByText(/fix plan review/i)
    .isVisible()
    .catch(() => false);

  await page.getByRole("button", { name: /system & readiness/i }).click();
  await page.getByText(/hermes memory support meter/i).waitFor({ state: "visible", timeout: 15000 }).catch(() => {});
  report.systemTabHermesVisible = await page
    .getByText(/hermes memory support meter/i)
    .isVisible()
    .catch(() => false);
  report.hermesVisible = report.hermesVisible || report.systemTabHermesVisible;

  report.activeTop10Visible =
    (await page
      .getByText(/^active top 10$/i)
      .first()
      .isVisible()
      .catch(() => false)) ||
    report.rowActionMenuVisible ||
    (await page
      .getByText(/no active findings yet/i)
      .isVisible()
      .catch(() => false));

  const screenshotPath = path.join(
    SCREENSHOT_DIR,
    `owner-agentops-smoke-${Date.now()}.png`,
  );
  await page.screenshot({ path: screenshotPath, fullPage: true });
  report.screenshotPath = rel(screenshotPath);

  report.consoleErrors = consoleErrors;
  report.networkErrors = networkErrors;

  if (
    report.routeReached &&
    report.agentOpsHeadingVisible &&
    report.activeTop10Visible &&
    report.generateTabImportVisible &&
    report.fixWorkflowTabVisible &&
    report.systemTabHermesVisible
  ) {
    report.status = "passed";
  } else {
    report.status = "failed";
    report.notes.push("Expected AgentOps tabbed dashboard signals were not all visible.");
  }
});

test.afterAll(async () => {
  const lines = [
    "# AgentOps Owner Auth Smoke Report",
    "",
    `- Run ID: \`${report.runId}\``,
    `- Created at: ${report.createdAt}`,
    `- Status: ${report.status}`,
    `- Base URL: ${report.baseUrl}`,
    `- Env vars present: ${report.envVarsPresent ? "yes" : "no"}`,
    `- Login attempted: ${report.loginAttempted ? "yes" : "no"}`,
    `- Login successful: ${report.loginSuccessful ? "yes" : "no"}`,
    `- Route reached (/system/agent-ops): ${report.routeReached ? "yes" : "no"}`,
    `- Access denied shown: ${report.accessDenied ? "yes" : "no"}`,
    `- AgentOps heading visible: ${report.agentOpsHeadingVisible ? "yes" : "no"}`,
    `- Hermes visible: ${report.hermesVisible ? "yes" : "no"}`,
    `- Active Top 10 visible: ${report.activeTop10Visible ? "yes" : "no"}`,
    `- Refill button visible: ${report.refillButtonVisible ? "yes" : "no"}`,
    `- Import button visible (legacy): ${report.importButtonVisible ? "yes" : "no"}`,
    `- Generate tab import visible: ${report.generateTabImportVisible ? "yes" : "no"}`,
    `- Fix workflow tab visible: ${report.fixWorkflowTabVisible ? "yes" : "no"}`,
    `- System tab Hermes visible: ${report.systemTabHermesVisible ? "yes" : "no"}`,
    `- Row action menu visible: ${report.rowActionMenuVisible ? "yes" : "no"}`,
    `- Screenshot: ${report.screenshotPath ?? "none"}`,
    `- Console errors: ${report.consoleErrors.length}`,
    `- Network errors: ${report.networkErrors.length}`,
    "",
    "## Safety Statement",
    "",
    report.safetyStatement,
    "",
    "## Notes",
    "",
    ...(report.notes.length > 0 ? report.notes.map((n) => `- ${n}`) : ["- None"]),
    "",
  ];

  fs.writeFileSync(JSON_REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  fs.writeFileSync(MD_REPORT_PATH, lines.join("\n"), "utf8");
});

