import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { test } from "@playwright/test";
import {
  loadSyntheticUsersEnv,
  resolveUserPassword,
} from "../../scripts/load-agentops-synthetic-users-env.mjs";

loadSyntheticUsersEnv();

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const catalogPath = path.join(repoRoot, "qa-agent", "browser-qa", "synthetic-browser-users.json");
const scopePath = path.join(repoRoot, "qa-agent", "browser-qa", "write-workflow-scope.json");
const catalog = JSON.parse(fs.readFileSync(catalogPath, "utf8"));
const SCOPE = JSON.parse(fs.readFileSync(scopePath, "utf8"));
const USERS_BY_ID = Object.fromEntries(catalog.users.map((u) => [u.qaUserId, u]));

const REPORT_DIR = path.join("qa-agent", "reports", "browser-qa");
const SCREENSHOT_DIR = path.join(REPORT_DIR, "screenshots", "write-draft-safe");
const JSON_REPORT_PATH = path.join(REPORT_DIR, "write-draft-safe-report.json");
const MD_REPORT_PATH = path.join(REPORT_DIR, "write-draft-safe-report.md");

const SYNTHETIC_PREFIX = SCOPE.allowedRecordPrefix;
const SYNTHETIC_NOTES = `${SYNTHETIC_PREFIX} quotation draft exploration — synthetic QA test`;

const ROUTE_NAV_TIMEOUT_MS = 12_000;
const ROUTE_HARD_CAP_MS = 35_000;
const LOCATOR_TIMEOUT_MS = 2_500;
const LOGIN_TIMEOUT_MS = 45_000;
const LOGIN_LOCATOR_TIMEOUT_MS = 8_000;
const SCREENSHOT_TIMEOUT_MS = 8_000;
const PER_TEST_TIMEOUT_MS = 180_000;

const LOGIN_ERROR_PATTERN =
  /invalid email or password|invalid login credentials|unable to load authenticated user|user profile not found|login request timed out|login timeout|too many login attempts/i;

const DANGEROUS_BUTTON_PATTERN =
  /delete|hard delete|archive|send invite|pay now|process payment|run payroll|refill|import static|import browser|mark fixed/i;

const runId = `write-draft-safe-${Date.now()}`;
const startedAt = new Date().toISOString();

const report = {
  runId,
  createdAt: startedAt,
  baseUrl: process.env.AGENTOPS_QA_BASE_URL || SCOPE.baseUrlDefault,
  environment: SCOPE.environment,
  stagingProjectRef: SCOPE.stagingProjectRef,
  usersTested: 0,
  usersSkipped: 0,
  routesTested: [],
  writeAttempts: 0,
  skippedWriteAttempts: 0,
  recordsCreated: [],
  syntheticRecordIdentifiers: [],
  findings: [],
  criticalFindings: [],
  safetyConfirmations: [],
  workflowsAttempted: [],
  workflowsSkippedForSafety: [],
  screenshots: [],
  users: [],
  safetyStatement: SCOPE.safetyStatement,
  status: "pending",
};

function rel(filePath) {
  return filePath.replaceAll("\\", "/");
}

function slug(value) {
  return String(value).replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase();
}

function withHardTimeout(ms, label, fn) {
  return Promise.race([
    fn(),
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    }),
  ]);
}

function normalizePathname(pathname) {
  return pathname.replace(/\/+$/, "") || "/";
}

function recordWorkflowAttempt(entry) {
  report.workflowsAttempted.push(entry);
}

function recordWorkflowSkipped(entry) {
  report.workflowsSkippedForSafety.push(entry);
  report.skippedWriteAttempts += 1;
}

function addFinding(partial) {
  const finding = {
    id: `WDS-${report.findings.length + 1}`,
    runId,
    createdAt: new Date().toISOString(),
    importEligible: false,
    ...partial,
  };
  report.findings.push(finding);
  if (finding.severity === "Critical") {
    report.criticalFindings.push(finding);
  }
  return finding;
}

function getUserSpec(qaUserId) {
  return USERS_BY_ID[qaUserId] ?? null;
}

function isAuthenticatedAppUrl(urlString) {
  try {
    const pathname = new URL(urlString).pathname.toLowerCase();
    if (pathname.includes("/login")) return false;
    return (
      pathname.includes("/dashboard") ||
      pathname.includes("/onboarding") ||
      pathname.startsWith("/finance") ||
      pathname.startsWith("/system") ||
      pathname.startsWith("/ai-management")
    );
  } catch {
    return false;
  }
}

async function readLoginFailure(page) {
  const alertText = await page
    .getByRole("alert")
    .first()
    .textContent({ timeout: LOGIN_LOCATOR_TIMEOUT_MS })
    .catch(() => "");
  if (LOGIN_ERROR_PATTERN.test(alertText ?? "")) {
    return String(alertText).trim();
  }
  return null;
}

async function attemptLoginOnce(page, baseUrl, email, password) {
  await page.goto(new URL("/login", baseUrl).toString(), {
    waitUntil: "domcontentloaded",
    timeout: LOGIN_TIMEOUT_MS,
  });
  await page.locator("#email").waitFor({ state: "visible", timeout: LOGIN_LOCATOR_TIMEOUT_MS });
  await page.locator("#email").fill(email, { timeout: LOGIN_LOCATOR_TIMEOUT_MS });
  await page.locator("#password").fill(password, { timeout: LOGIN_LOCATOR_TIMEOUT_MS });
  await page.getByRole("button", { name: /sign in/i }).click({ timeout: LOGIN_LOCATOR_TIMEOUT_MS });
  await page
    .getByRole("button", { name: /signing in/i })
    .waitFor({ state: "hidden", timeout: LOGIN_TIMEOUT_MS })
    .catch(() => {});
  await page
    .waitForURL((url) => isAuthenticatedAppUrl(url.toString()), { timeout: LOGIN_TIMEOUT_MS })
    .catch(() => {});
  await page.waitForLoadState("domcontentloaded", { timeout: 10_000 }).catch(() => {});
  const loginError = await readLoginFailure(page);
  return { authenticated: isAuthenticatedAppUrl(page.url()), loginError };
}

async function attemptLogin(page, baseUrl, email, password) {
  let result = await attemptLoginOnce(page, baseUrl, email, password);
  if (result.authenticated && !result.loginError) return true;
  if (!result.loginError && page.url().includes("/login")) {
    await page.waitForTimeout(1_500);
    result = await attemptLoginOnce(page, baseUrl, email, password);
  }
  return result.authenticated && !result.loginError;
}

async function settleAfterNavigation(page, route) {
  const requestedPathname = normalizePathname(route);
  for (let attempt = 0; attempt < 25; attempt += 1) {
    const currentPathname = normalizePathname(new URL(page.url()).pathname);
    if (currentPathname === requestedPathname) {
      await page.waitForTimeout(200);
      return;
    }
    if (currentPathname !== requestedPathname) {
      await page.waitForTimeout(200);
      const settled = normalizePathname(new URL(page.url()).pathname);
      if (settled === currentPathname) return;
    }
    await page.waitForTimeout(200);
  }
}

async function waitForQuotationNewTerminalState(page, route) {
  const requestedPathname = normalizePathname(route);
  const deniedPattern =
    /no permission to create quotations|access denied|not authorized|permission required|you don.?t have access|create access is not enabled/i;
  const saveDraft = page.getByRole("button", { name: /save draft/i });

  for (let attempt = 0; attempt < 60; attempt += 1) {
    const finalPathname = normalizePathname(new URL(page.url()).pathname);
    if (finalPathname !== requestedPathname && !finalPathname.startsWith(`${requestedPathname}/`)) {
      return;
    }

    const deniedVisible = await page
      .getByText(deniedPattern)
      .first()
      .isVisible({ timeout: 400 })
      .catch(() => false);
    if (deniedVisible) {
      return;
    }

    const saveVisible = await saveDraft.isVisible({ timeout: 400 }).catch(() => false);
    if (saveVisible) {
      return;
    }

    const stillChecking = await page
      .getByText(/checking quotation permissions/i)
      .isVisible({ timeout: 400 })
      .catch(() => false);
    const loadingSources = await page
      .getByText(/loading quotation sources/i)
      .isVisible({ timeout: 400 })
      .catch(() => false);
    if (loadingSources || stillChecking) {
      await page.waitForTimeout(250);
      continue;
    }

    const formShellVisible = await page
      .getByText(/document overview/i)
      .first()
      .isVisible({ timeout: 400 })
      .catch(() => false);
    if (formShellVisible) {
      return;
    }

    if (attempt > 8) {
      return;
    }

    await page.waitForTimeout(250);
  }
}

async function classifyWriteRoute(page, route) {
  const finalUrl = page.url();
  const lower = finalUrl.toLowerCase();
  const requestedPathname = normalizePathname(route);
  const finalPathname = normalizePathname(new URL(finalUrl).pathname);

  if (lower.includes("login") || lower.includes("sign-in")) {
    return { status: "auth-required", blocked: true, finalUrl };
  }
  if (finalPathname !== requestedPathname && !finalPathname.startsWith(`${requestedPathname}/`)) {
    return { status: "redirected", blocked: true, finalUrl };
  }

  const stillCheckingPermissions = await page
    .getByText(/checking quotation permissions/i)
    .isVisible({ timeout: 400 })
    .catch(() => false);
  if (stillCheckingPermissions) {
    await page
      .getByText(/checking quotation permissions/i)
      .waitFor({ state: "hidden", timeout: 20_000 })
      .catch(() => {});
  }

  const accessDeniedVisible = await page
    .getByText(
      /no permission to create quotations|access denied|not authorized|permission required|you don.?t have access|create access is not enabled/i,
    )
    .first()
    .isVisible({ timeout: LOCATOR_TIMEOUT_MS })
    .catch(() => false);
  if (accessDeniedVisible) {
    return { status: "access-denied", blocked: true, finalUrl };
  }

  const loadingSourcesVisible = await page
    .getByText(/loading quotation sources/i)
    .isVisible({ timeout: LOCATOR_TIMEOUT_MS })
    .catch(() => false);
  if (loadingSourcesVisible) {
    await page
      .getByText(/loading quotation sources/i)
      .waitFor({ state: "hidden", timeout: 20_000 })
      .catch(() => {});
  }

  const saveDraftVisible = await page
    .getByRole("button", { name: /save draft/i })
    .isVisible({ timeout: LOCATOR_TIMEOUT_MS })
    .catch(() => false);
  const createFormVisible = await page
    .getByText(/document overview/i)
    .first()
    .isVisible({ timeout: LOCATOR_TIMEOUT_MS })
    .catch(() => false);

  if (!saveDraftVisible && !createFormVisible) {
    return { status: "access-denied", blocked: true, finalUrl };
  }

  return { status: "loaded", blocked: false, finalUrl };
}

async function takeScreenshot(page, userSpec, label) {
  const screenshotPath = path.join(
    SCREENSHOT_DIR,
    `${slug(userSpec.qaUserId)}-${slug(label)}-${Date.now()}.png`,
  );
  await page.screenshot({ path: screenshotPath, fullPage: false, timeout: SCREENSHOT_TIMEOUT_MS }).catch(() => {});
  const relPath = rel(screenshotPath);
  report.screenshots.push(relPath);
  return relPath;
}

async function inspectDangerousButtons(page, context) {
  const buttons = page.getByRole("button");
  const count = await buttons.count();
  const visibleDangerous = [];

  for (let i = 0; i < Math.min(count, 40); i += 1) {
    const button = buttons.nth(i);
    const visible = await button.isVisible({ timeout: 500 }).catch(() => false);
    if (!visible) continue;
    const name = ((await button.getAttribute("aria-label")) || (await button.textContent()) || "")
      .trim()
      .slice(0, 120);
    if (!name) continue;
    if (DANGEROUS_BUTTON_PATTERN.test(name)) {
      const disabled = await button.isDisabled().catch(() => false);
      visibleDangerous.push({ name, disabled });
    }
  }

  if (visibleDangerous.some((b) => !b.disabled)) {
    addFinding({
      severity: context.expectBlocked ? "Critical" : "Medium",
      category: "Security/Permission",
      title: `Destructive or blocked action visible for ${context.qaUserId} on ${context.route}`,
      problem: `Visible actions: ${visibleDangerous.map((b) => b.name).join(", ")}`,
      qaUserId: context.qaUserId,
      route: context.route,
    });
  }
}

async function waitForQuotationListReady(page, expectCreateVisible) {
  await page
    .getByText(/loading quotations/i)
    .first()
    .waitFor({ state: "hidden", timeout: 25_000 })
    .catch(() => {});

  await page
    .getByText(/quotation registry/i)
    .first()
    .waitFor({ state: "visible", timeout: 20_000 })
    .catch(() => {});

  if (expectCreateVisible) {
    await page
      .locator('[data-toolbar-has-primary="true"]')
      .first()
      .waitFor({ state: "attached", timeout: 15_000 })
      .catch(() => {});
  }
}

async function checkCreateButtonVisibility(page, userSpec, workflow, expectVisible) {
  await waitForQuotationListReady(page, expectVisible === true);

  const pattern = workflow.createButtonPattern ?? "New Quotation";
  const namePattern = new RegExp(pattern, "i");
  const createButton = page.getByRole("button", { name: namePattern });
  const createLink = page.getByRole("link", { name: namePattern });
  const toolbarCreate = page
    .locator('[data-toolbar-has-primary="true"]')
    .getByRole("button", { name: namePattern });
  const buttonVisible = await createButton.first().isVisible({ timeout: LOCATOR_TIMEOUT_MS }).catch(() => false);
  const linkVisible = await createLink.first().isVisible({ timeout: LOCATOR_TIMEOUT_MS }).catch(() => false);
  const toolbarButtonVisible = await toolbarCreate
    .first()
    .isVisible({ timeout: LOCATOR_TIMEOUT_MS })
    .catch(() => false);
  const visible = buttonVisible || linkVisible || toolbarButtonVisible;
  const matchedLocator = buttonVisible
    ? "role=button"
    : linkVisible
      ? "role=link"
      : toolbarButtonVisible
        ? "toolbar-primary-button"
        : null;
  const disabled = buttonVisible
    ? await createButton.first().isDisabled().catch(() => false)
    : toolbarButtonVisible
      ? await toolbarCreate.first().isDisabled().catch(() => false)
      : linkVisible
        ? false
        : null;

  recordWorkflowAttempt({
    workflowId: workflow.id,
    route: workflow.route,
    qaUserId: userSpec.qaUserId,
    mode: "permission-denied-check",
    outcome: visible ? (disabled ? "create-visible-disabled" : "create-visible-enabled") : "create-hidden",
    createLocator: matchedLocator,
  });

  if (expectVisible === false && visible && !disabled) {
    addFinding({
      severity: "Critical",
      category: "Security/Permission",
      title: `${userSpec.qaUserId} can see enabled create action on ${workflow.route}`,
      problem: `Expected create hidden/disabled but "${pattern}" is visible and enabled.`,
      qaUserId: userSpec.qaUserId,
      route: workflow.route,
    });
  } else if (expectVisible === true && !visible) {
    addFinding({
      severity: "Medium",
      category: "Security/Permission",
      title: `${userSpec.qaUserId} cannot see expected create action on ${workflow.route}`,
      problem: `Expected "${pattern}" visible for authorized role.`,
      qaUserId: userSpec.qaUserId,
      route: workflow.route,
    });
  }

  return { visible, disabled, matchedLocator };
}

async function exploreQuotationNewForm(page, userSpec, baseUrl, workflow) {
  const route = workflow.route;
  const url = new URL(route, baseUrl).toString();

  await withHardTimeout(ROUTE_HARD_CAP_MS, `goto ${route}`, async () => {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: ROUTE_NAV_TIMEOUT_MS });
    await settleAfterNavigation(page, route);
    await page
      .locator('[data-page-state="loading"]')
      .waitFor({ state: "detached", timeout: 20_000 })
      .catch(() => {});
    await waitForQuotationNewTerminalState(page, route);
  });

  const access = await classifyWriteRoute(page, route);
  const screenshot = await takeScreenshot(page, userSpec, "quotations-new");

  recordWorkflowAttempt({
    workflowId: workflow.id,
    route,
    qaUserId: userSpec.qaUserId,
    mode: "create-draft-test-record",
    outcome: access.status,
    finalUrl: access.finalUrl ?? page.url(),
  });

  if (!report.routesTested.includes(route)) report.routesTested.push(route);

  return { access, screenshot };
}

async function runUserWriteQa(page, userSpec, baseUrl, scenarios) {
  const userReport = {
    qaUserId: userSpec.qaUserId,
    displayName: userSpec.displayName,
    email: userSpec.email,
    skipped: false,
    skipReason: null,
    loginSuccessful: false,
    workflows: [],
  };

  const cred = resolveUserPassword(userSpec);
  if (!cred?.password) {
    userReport.skipped = true;
    userReport.skipReason = "credentials not configured";
    report.usersSkipped += 1;
    report.users.push(userReport);
    return;
  }

  const loginOk = await attemptLogin(page, baseUrl, userSpec.email, cred.password);
  userReport.loginSuccessful = loginOk;
  if (!loginOk) {
    userReport.skipReason = "login failed";
    report.usersSkipped += 1;
    report.users.push(userReport);
    addFinding({
      severity: "High",
      category: "Functional",
      title: `Login failed for ${userSpec.qaUserId} write QA`,
      problem: "Could not authenticate synthetic user.",
      qaUserId: userSpec.qaUserId,
    });
    return;
  }

  report.usersTested += 1;

  for (const scenario of scenarios) {
    const workflow = SCOPE.safeCandidateWorkflows.find((w) => w.id === scenario.workflowId);
    if (!workflow) continue;

    if (scenario.type === "list-create-visibility") {
      const listRoute = workflow.route;
      await page.goto(new URL(listRoute, baseUrl).toString(), {
        waitUntil: "domcontentloaded",
        timeout: ROUTE_NAV_TIMEOUT_MS,
      });
      await settleAfterNavigation(page, listRoute);
      if (!report.routesTested.includes(listRoute)) report.routesTested.push(listRoute);

      const result = await checkCreateButtonVisibility(
        page,
        userSpec,
        workflow,
        scenario.expectCreateVisible,
      );
      await takeScreenshot(page, userSpec, `list-${workflow.id}`);
      userReport.workflows.push({
        workflowId: workflow.id,
        type: scenario.type,
        route: listRoute,
        createVisible: result.visible,
        createDisabled: result.disabled,
      });
      continue;
    }

    if (scenario.type === "negative-write-route") {
      const { access, screenshot } = await exploreQuotationNewForm(page, userSpec, baseUrl, workflow);
      userReport.workflows.push({
        workflowId: workflow.id,
        type: scenario.type,
        route: workflow.route,
        accessStatus: access.status,
        blocked: access.blocked,
        screenshot,
      });

      if (!access.blocked) {
        const saveDraft = page.getByRole("button", { name: /save draft/i });
        const saveVisible = await saveDraft.isVisible({ timeout: LOCATOR_TIMEOUT_MS }).catch(() => false);
        const saveEnabled =
          saveVisible && !(await saveDraft.isDisabled().catch(() => true));

        if (saveEnabled) {
          addFinding({
            severity: "Critical",
            category: "Security/Permission",
            title: `${userSpec.qaUserId} can use Save Draft on ${workflow.route}`,
            problem: `Write route loaded with enabled Save Draft at ${page.url()}`,
            qaUserId: userSpec.qaUserId,
            route: workflow.route,
          });
        } else {
          addFinding({
            severity: "Medium",
            category: "Security/Permission",
            title: `${userSpec.qaUserId} can open write route shell on ${workflow.route}`,
            problem: `Route loaded (${access.status}) but Save Draft hidden or disabled.`,
            qaUserId: userSpec.qaUserId,
            route: workflow.route,
          });
        }
        await inspectDangerousButtons(page, {
          qaUserId: userSpec.qaUserId,
          route: workflow.route,
          expectBlocked: true,
        });
      } else {
        report.safetyConfirmations.push(
          `${userSpec.qaUserId} blocked from ${workflow.route} (${access.status})`,
        );
      }
      continue;
    }

    if (scenario.type === "finance-admin-explore") {
      const { access, screenshot } = await exploreQuotationNewForm(page, userSpec, baseUrl, workflow);
      userReport.workflows.push({
        workflowId: workflow.id,
        type: scenario.type,
        route: workflow.route,
        accessStatus: access.status,
        screenshot,
      });

      if (access.status !== "loaded") {
        addFinding({
          severity: "Medium",
          category: "Functional",
          title: `Finance admin could not load ${workflow.route}`,
          problem: `Got ${access.status} at ${page.url()}`,
          qaUserId: userSpec.qaUserId,
          route: workflow.route,
        });
        continue;
      }

      const notesField = page.getByPlaceholder(/add notes/i);
      const notesVisible = await notesField.isVisible({ timeout: LOCATOR_TIMEOUT_MS }).catch(() => false);
      if (notesVisible) {
        await notesField.fill(SYNTHETIC_NOTES);
        recordWorkflowAttempt({
          workflowId: workflow.id,
          route: workflow.route,
          qaUserId: userSpec.qaUserId,
          mode: "create-draft-test-record",
          outcome: "synthetic-notes-filled",
        });
      }

      const saveDraft = page.getByRole("button", { name: /save draft/i });
      const saveVisible = await saveDraft.isVisible({ timeout: LOCATOR_TIMEOUT_MS }).catch(() => false);
      const saveDisabled = saveVisible
        ? await saveDraft.isDisabled().catch(() => false)
        : null;

      recordWorkflowAttempt({
        workflowId: workflow.id,
        route: workflow.route,
        qaUserId: userSpec.qaUserId,
        mode: "validation-error-check",
        outcome: saveVisible
          ? `save-draft-visible${saveDisabled ? "-disabled" : "-enabled"}-not-clicked`
          : "save-draft-not-visible",
      });

      recordWorkflowSkipped({
        workflowId: workflow.id,
        qaUserId: userSpec.qaUserId,
        reason:
          "Save Draft not clicked — requires real counterparty selection; Stage 11 MVP uses cancel-only",
      });

      recordWorkflowAttempt({
        workflowId: workflow.id,
        route: workflow.route,
        qaUserId: userSpec.qaUserId,
        mode: "cancel-form",
        outcome: "navigate-back-to-list",
      });
      await page.goto(new URL("/finance/transactions/quotations", baseUrl).toString(), {
        waitUntil: "domcontentloaded",
        timeout: ROUTE_NAV_TIMEOUT_MS,
      });
      await takeScreenshot(page, userSpec, "after-cancel-quotations-list");

      await inspectDangerousButtons(page, {
        qaUserId: userSpec.qaUserId,
        route: workflow.route,
        expectBlocked: false,
      });
    }

    if (scenario.type === "admin-visibility-only") {
      const listWorkflow = SCOPE.safeCandidateWorkflows.find((w) => w.id === "finance-quotations-list");
      if (!listWorkflow) continue;
      await page.goto(new URL(listWorkflow.route, baseUrl).toString(), {
        waitUntil: "domcontentloaded",
        timeout: ROUTE_NAV_TIMEOUT_MS,
      });
      await checkCreateButtonVisibility(page, userSpec, listWorkflow, true);
      await takeScreenshot(page, userSpec, `visibility-${userSpec.qaUserId}`);
      recordWorkflowSkipped({
        workflowId: "finance-quotations-new",
        qaUserId: userSpec.qaUserId,
        reason: "No submit — visibility check only",
      });
      userReport.workflows.push({
        workflowId: listWorkflow.id,
        type: scenario.type,
        route: listWorkflow.route,
      });
    }
  }

  report.users.push(userReport);
}

function finalizeReportStatus() {
  if (report.usersTested === 0) {
    report.status = "skipped";
  } else if (report.criticalFindings.length > 0) {
    report.status = "failed";
  } else {
    report.status = "passed";
  }
  return report.status;
}

function writeReports() {
  finalizeReportStatus();

  const recordsNote =
    report.recordsCreated.length === 0
      ? "No records created; Stage 11 ran in exploration/cancel/negative mode only."
      : `${report.recordsCreated.length} synthetic record(s) created.`;

  const md = [
    "# Write/Draft Safe Browser QA Report",
    "",
    `- Run ID: \`${report.runId}\``,
    `- Created at: ${report.createdAt}`,
    `- Base URL: ${report.baseUrl}`,
    `- Environment: ${report.environment}`,
    `- Status: ${report.status}`,
    `- Users tested: ${report.usersTested}`,
    `- Users skipped: ${report.usersSkipped}`,
    `- Write attempts: ${report.writeAttempts}`,
    `- Skipped write attempts: ${report.skippedWriteAttempts}`,
    `- Findings: ${report.findings.length}`,
    `- Critical findings: ${report.criticalFindings.length}`,
    "",
    "## Records",
    "",
    recordsNote,
    report.syntheticRecordIdentifiers.length
      ? report.syntheticRecordIdentifiers.map((id) => `- \`${id}\``).join("\n")
      : "- None",
    "",
    "## Routes tested",
    "",
    ...report.routesTested.map((r) => `- \`${r}\``),
    "",
    "## Workflows attempted",
    "",
    ...(report.workflowsAttempted.length
      ? report.workflowsAttempted.map(
          (w) =>
            `- ${w.qaUserId} · ${w.workflowId} · ${w.mode} → ${w.outcome}${w.finalUrl ? ` (${w.finalUrl})` : ""}`,
        )
      : ["- None"]),
    "",
    "## Workflows skipped for safety",
    "",
    ...(report.workflowsSkippedForSafety.length
      ? report.workflowsSkippedForSafety.map(
          (w) => `- ${w.qaUserId ?? "—"} · ${w.workflowId} — ${w.reason}`,
        )
      : ["- None"]),
    "",
    "## Safety confirmations",
    "",
    ...(report.safetyConfirmations.length
      ? report.safetyConfirmations.map((s) => `- ${s}`)
      : ["- None recorded"]),
    "",
    "## Findings",
    "",
    ...(report.findings.length
      ? report.findings.map((f) => `- **${f.severity}** [${f.category}] ${f.title}`)
      : ["- No report-only findings."]),
    "",
    "## Screenshots",
    "",
    `- Folder: \`${rel(SCREENSHOT_DIR)}\``,
    `- Count: ${report.screenshots.length}`,
    "",
    "## Safety statement",
    "",
    report.safetyStatement,
    "",
  ].join("\n");

  fs.mkdirSync(path.dirname(JSON_REPORT_PATH), { recursive: true });
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  fs.writeFileSync(JSON_REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  fs.writeFileSync(MD_REPORT_PATH, md, "utf8");
}

test.describe.configure({ mode: "serial", retries: 0 });

test.afterAll(() => {
  writeReports();
});

test.describe("agentops synthetic write draft safe", () => {
  test("finance-viewer negative write", async ({ browser, baseURL }) => {
    test.setTimeout(PER_TEST_TIMEOUT_MS);
    const userSpec = getUserSpec("finance-viewer");
    const context = await browser.newContext();
    const page = await context.newPage();
    try {
      await runUserWriteQa(page, userSpec, baseURL, [
        { workflowId: "finance-quotations-list", type: "list-create-visibility", expectCreateVisible: false },
        { workflowId: "finance-quotations-new", type: "negative-write-route" },
      ]);
    } finally {
      await context.close();
    }
  });

  test("guest negative write", async ({ browser, baseURL }) => {
    test.setTimeout(PER_TEST_TIMEOUT_MS);
    const userSpec = getUserSpec("guest");
    const context = await browser.newContext();
    const page = await context.newPage();
    try {
      await runUserWriteQa(page, userSpec, baseURL, [
        { workflowId: "finance-quotations-new", type: "negative-write-route" },
      ]);
      recordWorkflowSkipped({
        workflowId: "finance-quotations-list",
        qaUserId: "guest",
        reason: "Guest blocked from finance hub — list create check redundant",
      });
    } finally {
      await context.close();
    }
  });

  test("finance-admin draft-safe exploration", async ({ browser, baseURL }) => {
    test.setTimeout(PER_TEST_TIMEOUT_MS);
    const userSpec = getUserSpec("finance-admin");
    const context = await browser.newContext();
    const page = await context.newPage();
    try {
      await runUserWriteQa(page, userSpec, baseURL, [
        { workflowId: "finance-quotations-list", type: "list-create-visibility", expectCreateVisible: true },
        { workflowId: "finance-quotations-new", type: "finance-admin-explore" },
      ]);
      recordWorkflowSkipped({
        workflowId: "finance-master-data",
        qaUserId: "finance-admin",
        reason: "Master data writes not approved for Stage 11 MVP",
      });
    } finally {
      await context.close();
    }
  });

  test("agentops-owner admin visibility", async ({ browser, baseURL }) => {
    test.setTimeout(PER_TEST_TIMEOUT_MS);
    const userSpec = getUserSpec("agentops-owner");
    const context = await browser.newContext();
    const page = await context.newPage();
    try {
      await runUserWriteQa(page, userSpec, baseURL, [{ type: "admin-visibility-only" }]);
    } finally {
      await context.close();
    }
  });

  test("platform-admin admin visibility", async ({ browser, baseURL }) => {
    test.setTimeout(PER_TEST_TIMEOUT_MS);
    const userSpec = getUserSpec("platform-admin");
    const context = await browser.newContext();
    const page = await context.newPage();
    try {
      await runUserWriteQa(page, userSpec, baseURL, [{ type: "admin-visibility-only" }]);
    } finally {
      await context.close();
    }
  });
});
