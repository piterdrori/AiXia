import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { test } from "@playwright/test";
import {
  loadSyntheticUsersEnv,
  resolveUserPassword,
} from "../../scripts/load-agentops-synthetic-users-env.mjs";

loadSyntheticUsersEnv();

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "..",
);
const catalogPath = path.join(repoRoot, "qa-agent", "browser-qa", "synthetic-browser-users.json");
const scopePath = path.join(repoRoot, "qa-agent", "browser-qa", "workflow-scope.json");
const catalog = JSON.parse(fs.readFileSync(catalogPath, "utf8"));
const workflowScope = JSON.parse(fs.readFileSync(scopePath, "utf8"));
const USERS = catalog.users;
const ROUTE_SPECS = workflowScope.routes;

const REPORT_DIR = path.join("qa-agent", "reports", "browser-qa");
const SCREENSHOT_DIR = path.join(REPORT_DIR, "screenshots", "role-workflow-safe");
const JSON_REPORT_PATH = path.join(REPORT_DIR, "role-workflow-safe-report.json");
const MD_REPORT_PATH = path.join(REPORT_DIR, "role-workflow-safe-report.md");

const ROUTE_NAV_TIMEOUT_MS = 12_000;
const ROUTE_HARD_CAP_MS = 35_000;
const AGENTOPS_ROUTE_HARD_CAP_MS = 40_000;
const INTERACTION_CAP_MS = 12_000;
const LOCATOR_TIMEOUT_MS = 2_000;
const AGENTOPS_SETTLE_TIMEOUT_MS = 12_000;
const SCREENSHOT_TIMEOUT_MS = 8_000;
const LOGIN_TIMEOUT_MS = 45_000;
const LOGIN_LOCATOR_TIMEOUT_MS = 8_000;
const PER_USER_TEST_TIMEOUT_MS = 300_000;

const LOGIN_ERROR_PATTERN =
  /invalid email or password|invalid login credentials|unable to load authenticated user|user profile not found|login request timed out|login timeout|too many login attempts/i;

const DANGEROUS_BUTTON_PATTERN =
  /^(save|submit|delete|archive|hard delete|send|invite|pay now|process payment|run payroll|refill|import static|import browser|mark fixed|reject|defer|create record|add vendor|add customer)$/i;

const WRITE_SUBMIT_PATTERN =
  /submit|save changes|save draft|create account|process payment|send invite|run payroll|refill queue/i;

const runId = `role-workflow-safe-${Date.now()}`;
const startedAt = new Date().toISOString();

const report = {
  runId,
  createdAt: startedAt,
  baseUrl: process.env.AGENTOPS_QA_BASE_URL || workflowScope.baseUrlDefault,
  environment: workflowScope.environment,
  stagingProjectRef: workflowScope.stagingProjectRef,
  workflowModesEnabled: Object.entries(workflowScope.workflowModes)
    .filter(([, v]) => v.enabled)
    .map(([k]) => k),
  usersTested: 0,
  usersSkipped: 0,
  loginSuccessCount: 0,
  routesTested: ROUTE_SPECS.length,
  interactionsAttempted: [],
  interactionsSkippedForSafety: [],
  findings: [],
  screenshots: [],
  consoleErrorsSummary: [],
  networkErrorsSummary: [],
  criticalSecurityFindings: [],
  agentOpsIsolation: {
    ownerLoaded: null,
    nonOwnerLeaks: [],
    status: "pending",
  },
  users: [],
  safetyStatement:
    "Stage 10 role-based safe workflow QA: staging-only synthetic users; readonly navigation plus safe UI interactions; no form submits, writes, deletes, payments, emails, or invites.",
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

function recordInteraction(kind, route, qaUserId, outcome, detail = null) {
  report.interactionsAttempted.push({
    kind,
    route,
    qaUserId,
    outcome,
    detail,
    at: new Date().toISOString(),
  });
}

function skipInteraction(reason, route, qaUserId, kind = "safety-skip") {
  report.interactionsSkippedForSafety.push({
    kind,
    route,
    qaUserId,
    reason,
    at: new Date().toISOString(),
  });
}

async function isVisibleQuick(locator) {
  return locator.isVisible({ timeout: LOCATOR_TIMEOUT_MS }).catch(() => false);
}

async function waitForAgentOpsUi(page) {
  await page
    .getByText(/checking agentops access/i)
    .waitFor({ state: "hidden", timeout: AGENTOPS_SETTLE_TIMEOUT_MS })
    .catch(() => {});

  const ownerDenied = page.getByText(/agentops is owner-only|not on the agentops owner allowlist/i);
  const controlCenter = page.getByText(/agentops control center/i);

  await Promise.race([
    ownerDenied.waitFor({ state: "visible", timeout: AGENTOPS_SETTLE_TIMEOUT_MS }).catch(() => {}),
    controlCenter.waitFor({ state: "visible", timeout: AGENTOPS_SETTLE_TIMEOUT_MS }).catch(() => {}),
  ]);
}

async function detectAgentOpsState(page) {
  const ownerDenied = await isVisibleQuick(
    page.getByText(/agentops is owner-only|not on the agentops owner allowlist/i),
  );
  if (ownerDenied) {
    return { controlCenter: false, ownerDenied: true, agentOpsLoaded: false };
  }
  const controlCenter = await isVisibleQuick(page.getByText(/agentops control center/i));
  return { controlCenter, ownerDenied: false, agentOpsLoaded: controlCenter };
}

async function firstHeading(page) {
  return page
    .locator("h1, h2")
    .first()
    .textContent({ timeout: LOCATOR_TIMEOUT_MS })
    .catch(() => null);
}

function normalizeStatus(classifiedStatus) {
  if (classifiedStatus === "loaded") return "loaded";
  if (classifiedStatus === "access-denied") return "access-denied";
  if (classifiedStatus === "redirected") return "redirected";
  if (classifiedStatus === "auth-required") return "auth-required";
  if (classifiedStatus === "timed-out") return "timed-out";
  return "failed";
}

function expectedMatches(actual, expected) {
  if (expected === actual) return true;
  if (expected === "redirected" && (actual === "redirected" || actual === "access-denied")) {
    return true;
  }
  if (expected === "access-denied" && (actual === "access-denied" || actual === "redirected")) {
    return true;
  }
  return false;
}

function normalizePathname(pathname) {
  return pathname.replace(/\/+$/, "") || "/";
}

/** Wait for client-side permission redirects (e.g. guest finance → dashboard) to finish. */
async function settleAfterNavigation(page, route) {
  const requestedPathname = normalizePathname(route);

  for (let attempt = 0; attempt < 30; attempt += 1) {
    const currentPathname = normalizePathname(new URL(page.url()).pathname);

    if (currentPathname === requestedPathname) {
      await page.waitForTimeout(300);
      const afterWaitPathname = normalizePathname(new URL(page.url()).pathname);
      if (afterWaitPathname !== requestedPathname) {
        continue;
      }
      return;
    }

    if (currentPathname !== requestedPathname) {
      await page.waitForTimeout(200);
      const settledPathname = normalizePathname(new URL(page.url()).pathname);
      if (settledPathname === currentPathname) {
        return;
      }
    }

    await page.waitForTimeout(200);
  }
}

function reconcileClassifiedWithFinalUrl(route, classified, finalUrl) {
  try {
    const finalPathname = normalizePathname(new URL(finalUrl).pathname);
    const requestedPathname = normalizePathname(route);
    if (
      finalPathname !== requestedPathname &&
      !finalPathname.startsWith(`${requestedPathname}/`) &&
      classified.status === "loaded"
    ) {
      return { ...classified, status: "redirected" };
    }
  } catch {
    return classified;
  }
  return classified;
}

async function classifyRoute(page, route, responseStatus, gotoError, userSpec) {
  if (gotoError) {
    const lowerError = String(gotoError).toLowerCase();
    if (lowerError.includes("timeout")) {
      return { status: "timed-out", visibleHeading: null, agentOpsLoaded: false };
    }
    return { status: "failed", visibleHeading: null, agentOpsLoaded: false };
  }

  const finalUrl = page.url();
  const lower = finalUrl.toLowerCase();
  const routePath = route.toLowerCase();

  if (route === "/system/agent-ops") {
    await waitForAgentOpsUi(page);
    const agent = await detectAgentOpsState(page);
    if (agent.agentOpsLoaded) {
      return { status: "loaded", visibleHeading: "AgentOps Control Center", agentOpsLoaded: true };
    }
    if (agent.ownerDenied) {
      return { status: "access-denied", visibleHeading: "AgentOps is Owner-only", agentOpsLoaded: false };
    }
    if (lower.includes("login")) {
      return { status: "auth-required", visibleHeading: null, agentOpsLoaded: false };
    }
    if (lower.includes("/system/agent-ops")) {
      const heading = await firstHeading(page);
      return {
        status: "access-denied",
        visibleHeading: heading?.trim() || "blocked-on-agent-ops-route",
        agentOpsLoaded: false,
      };
    }
    return { status: "redirected", visibleHeading: await page.title().catch(() => null), agentOpsLoaded: false };
  }

  if (lower.includes("login") || lower.includes("sign-in") || lower.includes("signin")) {
    return { status: "auth-required", visibleHeading: null, agentOpsLoaded: false };
  }

  if (responseStatus && responseStatus >= 400) {
    return { status: "failed", visibleHeading: null, agentOpsLoaded: false };
  }

  const finalPathname = normalizePathname(new URL(finalUrl).pathname);
  const requestedPathname = normalizePathname(route);

  if (
    finalPathname !== requestedPathname &&
    !finalPathname.startsWith(`${requestedPathname}/`)
  ) {
    return {
      status: "redirected",
      visibleHeading: (await firstHeading(page))?.trim() || (await page.title().catch(() => null)),
      agentOpsLoaded: false,
    };
  }

  const heading = await firstHeading(page);
  return { status: "loaded", visibleHeading: heading?.trim() || null, agentOpsLoaded: false };
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

  const signInButton = page.getByRole("button", { name: /sign in/i });
  await signInButton.click({ timeout: LOGIN_LOCATOR_TIMEOUT_MS });

  await page
    .getByRole("button", { name: /signing in/i })
    .waitFor({ state: "hidden", timeout: LOGIN_TIMEOUT_MS })
    .catch(() => {});

  await page
    .waitForURL((url) => isAuthenticatedAppUrl(url.toString()), { timeout: LOGIN_TIMEOUT_MS })
    .catch(() => {});

  await page.waitForLoadState("domcontentloaded", { timeout: 10_000 }).catch(() => {});
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});

  const loginError = await readLoginFailure(page);
  const authenticated = isAuthenticatedAppUrl(page.url());
  return { authenticated, loginError };
}

async function attemptLogin(page, baseUrl, email, password) {
  let result = await attemptLoginOnce(page, baseUrl, email, password);
  if (result.authenticated && !result.loginError) {
    return true;
  }
  if (!result.loginError && page.url().includes("/login")) {
    await page.waitForTimeout(1_500);
    result = await attemptLoginOnce(page, baseUrl, email, password);
  }
  return result.authenticated && !result.loginError;
}

async function safeSearchFilter(page, route, qaUserId) {
  const inputs = page.locator(
    'input[type="search"], input[placeholder*="search" i], input[aria-label*="search" i], [role="searchbox"]',
  );
  const count = await inputs.count().catch(() => 0);
  if (count === 0) {
    recordInteraction("safe-search-filter-sort", route, qaUserId, "skipped", "no-search-input");
    return;
  }

  const input = inputs.first();
  if (!(await isVisibleQuick(input))) {
    recordInteraction("safe-search-filter-sort", route, qaUserId, "skipped", "search-not-visible");
    return;
  }

  await input.fill("qa-stage10", { timeout: LOCATOR_TIMEOUT_MS }).catch(() => {});
  await input.fill("", { timeout: LOCATOR_TIMEOUT_MS }).catch(() => {});
  recordInteraction("safe-search-filter-sort", route, qaUserId, "ok", "typed-and-cleared");
}

async function safeTabs(page, route, qaUserId) {
  const tabs = page.getByRole("tab");
  const count = await tabs.count().catch(() => 0);
  if (count < 2) {
    recordInteraction("safe-ui-interaction", route, qaUserId, "skipped", "insufficient-tabs");
    return;
  }

  const first = tabs.nth(0);
  const second = tabs.nth(1);
  if (await isVisibleQuick(first)) {
    await first.click({ timeout: LOCATOR_TIMEOUT_MS }).catch(() => {});
    recordInteraction("safe-ui-interaction", route, qaUserId, "ok", "tab-0");
  }
  if (await isVisibleQuick(second)) {
    await second.click({ timeout: LOCATOR_TIMEOUT_MS }).catch(() => {});
    recordInteraction("safe-ui-interaction", route, qaUserId, "ok", "tab-1");
  }
}

async function safeModalOpenClose(page, route, qaUserId) {
  const safeOpeners = page.getByRole("button", { name: /filter|filters|options|columns|view/i });
  const openerCount = await safeOpeners.count().catch(() => 0);
  if (openerCount === 0) {
    recordInteraction("safe-modal-open-close", route, qaUserId, "skipped", "no-safe-modal-opener");
    return;
  }

  const opener = safeOpeners.first();
  if (!(await isVisibleQuick(opener))) {
    recordInteraction("safe-modal-open-close", route, qaUserId, "skipped", "opener-not-visible");
    return;
  }

  const label = (await opener.textContent().catch(() => "")) ?? "";
  if (WRITE_SUBMIT_PATTERN.test(label)) {
    skipInteraction("modal opener looks like write action", route, qaUserId, "safe-modal-open-close");
    return;
  }

  await opener.click({ timeout: LOCATOR_TIMEOUT_MS }).catch(() => {});
  await page.keyboard.press("Escape").catch(() => {});
  const cancel = page.getByRole("button", { name: /cancel|close/i }).first();
  if (await isVisibleQuick(cancel)) {
    await cancel.click({ timeout: LOCATOR_TIMEOUT_MS }).catch(() => {});
  }
  recordInteraction("safe-modal-open-close", route, qaUserId, "ok", "opened-and-closed");
}

async function safeFormOpenNoSubmit(page, route, qaUserId) {
  const submitButtons = page.getByRole("button", { name: WRITE_SUBMIT_PATTERN });
  const submitCount = await submitButtons.count().catch(() => 0);
  for (let i = 0; i < Math.min(submitCount, 3); i += 1) {
    const btn = submitButtons.nth(i);
    if (await isVisibleQuick(btn)) {
      const enabled = await btn.isEnabled().catch(() => true);
      if (enabled) {
        return {
          riskySubmitVisible: true,
          label: (await btn.textContent().catch(() => ""))?.trim() ?? "submit",
        };
      }
    }
  }

  const textInputs = page.locator("form input:not([type='hidden']):not([type='submit']):not([type='button'])");
  const inputCount = await textInputs.count().catch(() => 0);
  if (inputCount > 0 && (await isVisibleQuick(textInputs.first()))) {
    await textInputs.first().fill("qa-stage10", { timeout: LOCATOR_TIMEOUT_MS }).catch(() => {});
    await textInputs.first().fill("", { timeout: LOCATOR_TIMEOUT_MS }).catch(() => {});
    recordInteraction("safe-form-open-no-submit", route, qaUserId, "ok", "typed-and-cleared-form-field");
    return { riskySubmitVisible: false };
  }

  recordInteraction("safe-form-open-no-submit", route, qaUserId, "skipped", "no-safe-form-field");
  return { riskySubmitVisible: false };
}

async function safeRoleVisibility(page, route, qaUserId) {
  const buttons = page.getByRole("button");
  const count = await buttons.count().catch(() => 0);
  const dangerous = [];
  for (let i = 0; i < Math.min(count, 40); i += 1) {
    const btn = buttons.nth(i);
    if (!(await isVisibleQuick(btn))) continue;
    const enabled = await btn.isEnabled().catch(() => false);
    if (!enabled) continue;
    const name = ((await btn.textContent().catch(() => "")) ?? "").trim();
    if (!name) continue;
    if (DANGEROUS_BUTTON_PATTERN.test(name) || WRITE_SUBMIT_PATTERN.test(name)) {
      dangerous.push(name);
    }
  }
  recordInteraction("safe-role-visibility", route, qaUserId, dangerous.length ? "flagged" : "ok", dangerous.join(", "));
  return dangerous;
}

async function runSafeInteractions(page, routeSpec, qaUserId, routeStatus) {
  const route = routeSpec.route;
  const interactions = [];

  if (routeStatus !== "loaded") {
    skipInteraction("route not loaded", route, qaUserId, "all-safe-interactions");
    return interactions;
  }

  try {
    await withHardTimeout(INTERACTION_CAP_MS, `interactions ${route}`, async () => {
      if (routeSpec.safeInteractions.includes("safe-search-filter-sort")) {
        await safeSearchFilter(page, route, qaUserId);
      }
      if (routeSpec.safeInteractions.includes("safe-ui-interaction")) {
        await safeTabs(page, route, qaUserId);
      }
      if (routeSpec.safeInteractions.includes("safe-modal-open-close")) {
        await safeModalOpenClose(page, route, qaUserId);
      }
      if (routeSpec.safeInteractions.includes("safe-form-open-no-submit")) {
        const formResult = await safeFormOpenNoSubmit(page, route, qaUserId);
        if (formResult?.riskySubmitVisible) {
          interactions.push({ type: "risky-submit-visible", label: formResult.label });
        }
      }
      if (routeSpec.safeInteractions.includes("safe-role-visibility")) {
        const dangerous = await safeRoleVisibility(page, route, qaUserId);
        if (dangerous.length > 0) {
          interactions.push({ type: "dangerous-buttons-visible", labels: dangerous });
        }
      }
    });
  } catch (error) {
    interactions.push({ type: "interaction-timeout", error: String(error?.message || error) });
  }

  return interactions;
}

function addFinding(partial) {
  const finding = {
    id: `RWF-${report.findings.length + 1}`,
    runId,
    createdAt: new Date().toISOString(),
    importEligible: false,
    reportOnly: true,
    ...partial,
  };
  report.findings.push(finding);
  if (finding.severity === "Critical") {
    report.criticalSecurityFindings.push(finding);
  }
  return finding;
}

function finalizeReportStatus() {
  const criticalCount = report.criticalSecurityFindings.length;
  const ownerUser = report.users.find((u) => u.agentOpsOwnerAccess && !u.skipped);

  if (report.usersTested === 0) {
    report.status = "skipped";
    report.agentOpsIsolation.status = "skipped";
    return report.status;
  }

  const ownerOk = report.agentOpsIsolation.ownerLoaded === true;
  const leaks = report.agentOpsIsolation.nonOwnerLeaks.length;

  if (criticalCount > 0 || leaks > 0) {
    report.status = "failed";
    report.agentOpsIsolation.status = "failed";
  } else if (ownerUser && !ownerUser.loginSuccessful) {
    report.status = "failed";
    report.agentOpsIsolation.status = "failed";
  } else if (ownerUser && ownerUser.loginSuccessful && !ownerOk) {
    report.status = "failed";
    report.agentOpsIsolation.status = "failed";
  } else {
    report.status = "passed";
    report.agentOpsIsolation.status = "passed";
  }

  return report.status;
}

function writeReports() {
  finalizeReportStatus();

  const md = [
    "# Role Workflow Safe Browser QA Report",
    "",
    `- Run ID: \`${report.runId}\``,
    `- Created at: ${report.createdAt}`,
    `- Base URL: ${report.baseUrl}`,
    `- Environment: ${report.environment}`,
    `- Status: ${report.status}`,
    `- Users tested: ${report.usersTested}`,
    `- Users skipped: ${report.usersSkipped}`,
    `- Routes per user: ${report.routesTested}`,
    `- Interactions attempted: ${report.interactionsAttempted.length}`,
    `- Interactions skipped for safety: ${report.interactionsSkippedForSafety.length}`,
    `- Findings (report-only): ${report.findings.length}`,
    `- Critical security findings: ${report.criticalSecurityFindings.length}`,
    "",
    "## Workflow modes enabled",
    "",
    ...report.workflowModesEnabled.map((m) => `- ${m}`),
    "",
    "## AgentOps isolation",
    "",
    `- Status: ${report.agentOpsIsolation.status}`,
    `- Owner loaded: ${report.agentOpsIsolation.ownerLoaded}`,
    `- Non-owner leaks: ${report.agentOpsIsolation.nonOwnerLeaks.length}`,
    ...(report.agentOpsIsolation.nonOwnerLeaks.length
      ? report.agentOpsIsolation.nonOwnerLeaks.map((e) => `- ${e}`)
      : ["- None"]),
    "",
    "## Users",
    "",
    "| User | Login | Routes | Findings |",
    "| --- | --- | --- | --- |",
    ...report.users.map(
      (u) =>
        `| ${u.qaUserId} | ${u.loginSuccessful ? "yes" : u.skipped ? "skipped" : "no"} | ${u.routes?.length ?? 0} | ${u.findingCount ?? 0} |`,
    ),
    "",
    "## Routes covered",
    "",
    ...ROUTE_SPECS.map((r) => `- \`${r.route}\``),
    "",
    "## Findings",
    "",
    ...(report.findings.length === 0
      ? ["No report-only findings."]
      : report.findings.map((f) => `- **${f.severity}** [${f.category}] ${f.title}`)),
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

  fs.writeFileSync(JSON_REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  fs.writeFileSync(MD_REPORT_PATH, md, "utf8");
}

function evaluateRouteAccess(userSpec, routeSpec, routeEntry) {
  const expected = routeSpec.expectedAccess[userSpec.qaUserId] ?? "loaded";
  const actual = normalizeStatus(routeEntry.status);
  routeEntry.expectedAccess = expected;
  routeEntry.accessMatch = expectedMatches(actual, expected);

  if (routeSpec.agentOpsIsolation) {
    if (userSpec.agentOpsOwnerAccess) {
      report.agentOpsIsolation.ownerLoaded = routeEntry.agentOpsLoaded === true;
      if (!routeEntry.agentOpsLoaded && actual !== "timed-out") {
        addFinding({
          category: "Security/Permission",
          severity: "High",
          title: "Owner cannot load AgentOps in workflow QA",
          problem: `Owner expected loaded AgentOps but got ${actual}`,
          qaUserId: userSpec.qaUserId,
          route: routeSpec.route,
        });
      }
    } else if (routeEntry.agentOpsLoaded) {
      report.agentOpsIsolation.nonOwnerLeaks.push(userSpec.email);
      addFinding({
        category: "Security/Permission",
        severity: "Critical",
        title: "AgentOps visible to non-owner synthetic user",
        problem: `${userSpec.email} reached AgentOps Control Center without allowlist access.`,
        qaUserId: userSpec.qaUserId,
        route: routeSpec.route,
      });
    }
  }

  if (!routeEntry.accessMatch && actual !== "timed-out") {
    if (expected === "loaded" && (actual === "access-denied" || actual === "redirected" || actual === "auth-required")) {
      addFinding({
        category: "Security/Permission",
        severity: "Medium",
        title: `Unexpected access denied for ${userSpec.qaUserId} on ${routeSpec.route}`,
        problem: `Expected ${expected} but got ${actual}`,
        qaUserId: userSpec.qaUserId,
        route: routeSpec.route,
      });
    } else if (
      (expected === "access-denied" || expected === "redirected") &&
      actual === "loaded" &&
      !routeSpec.agentOpsIsolation
    ) {
      addFinding({
        category: "Security/Permission",
        severity: "Medium",
        title: `Unexpected access allowed for ${userSpec.qaUserId} on ${routeSpec.route}`,
        problem: `Expected ${expected} but route loaded`,
        qaUserId: userSpec.qaUserId,
        route: routeSpec.route,
      });
    }
  }

  if (routeEntry.status === "failed") {
    addFinding({
      category: "Functional",
      severity: "High",
      title: `Route failed for ${userSpec.qaUserId} on ${routeSpec.route}`,
      problem: routeEntry.error || "navigation failed",
      qaUserId: userSpec.qaUserId,
      route: routeSpec.route,
    });
  }
}

test.describe.configure({ mode: "serial", retries: 0 });

test.describe("agentops role workflow safe", () => {
  test.beforeAll(async () => {
    fs.mkdirSync(REPORT_DIR, { recursive: true });
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  });

  for (const userSpec of USERS) {
    test(`role workflow safe: ${userSpec.qaUserId}`, async ({ browser, baseURL }) => {
      test.setTimeout(PER_USER_TEST_TIMEOUT_MS);
      report.baseUrl = baseURL || report.baseUrl;

      const cred = resolveUserPassword(userSpec);
      const userResult = {
        qaUserId: userSpec.qaUserId,
        displayName: userSpec.displayName,
        email: userSpec.email,
        profileRole: userSpec.profileRole,
        agentOpsOwnerAccess: userSpec.agentOpsOwnerAccess,
        skipped: false,
        skipReason: null,
        loginSuccessful: false,
        routes: [],
        findingCount: 0,
        screenshots: [],
      };

      if (!cred?.password) {
        userResult.skipped = true;
        userResult.skipReason = `Missing password env: ${userSpec.envVarPasswordName} or AGENTOPS_QA_SYNTHETIC_PASSWORD`;
        report.usersSkipped += 1;
        report.users.push(userResult);
        addFinding({
          category: "Infrastructure",
          severity: "Medium",
          title: `User skipped — no password env (${userSpec.qaUserId})`,
          problem: userResult.skipReason,
          qaUserId: userSpec.qaUserId,
        });
        writeReports();
        return;
      }

      report.usersTested += 1;
      const context = await browser.newContext();
      const page = await context.newPage();
      page.setDefaultTimeout(LOCATOR_TIMEOUT_MS);
      page.setDefaultNavigationTimeout(ROUTE_NAV_TIMEOUT_MS);

      page.on("console", (msg) => {
        if (msg.type() === "error") {
          const line = `${userSpec.qaUserId}: ${msg.text()}`;
          report.consoleErrorsSummary.push(line);
        }
      });
      page.on("response", (resp) => {
        if (resp.status() >= 400) {
          report.networkErrorsSummary.push(`${userSpec.qaUserId}: ${resp.status()} ${resp.url()}`);
        }
      });

      const loginOk = await attemptLogin(page, report.baseUrl, userSpec.email, cred.password);
      userResult.loginSuccessful = loginOk;

      if (!loginOk) {
        addFinding({
          category: "Functional",
          severity: userSpec.agentOpsOwnerAccess ? "High" : "Medium",
          title: `Login failed (${userSpec.qaUserId})`,
          problem: `Could not authenticate ${userSpec.email}`,
          qaUserId: userSpec.qaUserId,
        });
        report.users.push(userResult);
        await context.close();
        writeReports();
        return;
      }

      report.loginSuccessCount += 1;
      const findingsBefore = report.findings.length;

      for (const routeSpec of ROUTE_SPECS) {
        const route = routeSpec.route;
        const url = new URL(route, report.baseUrl).toString();
        const screenshotPath = path.join(
          SCREENSHOT_DIR,
          `${slug(userSpec.qaUserId)}-${route.replace(/\//g, "_").replace(/^_/, "") || "root"}-${Date.now()}.png`,
        );

        let responseStatus = null;
        let gotoError = null;
        let classified = { status: "failed", visibleHeading: null, agentOpsLoaded: false };

        const routeCapMs = route === "/system/agent-ops" ? AGENTOPS_ROUTE_HARD_CAP_MS : ROUTE_HARD_CAP_MS;

        try {
          await withHardTimeout(routeCapMs, `route ${route}`, async () => {
            try {
              const response = await page.goto(url, {
                waitUntil: "domcontentloaded",
                timeout: ROUTE_NAV_TIMEOUT_MS,
              });
              responseStatus = response?.status() ?? null;
            } catch (error) {
              gotoError = String(error?.message || error);
            }
            if (!gotoError) {
              await settleAfterNavigation(page, route);
            }
            classified = await classifyRoute(page, route, responseStatus, gotoError, userSpec);
            await page
              .screenshot({ path: screenshotPath, fullPage: false, timeout: SCREENSHOT_TIMEOUT_MS })
              .catch(() => {});
          });
        } catch (error) {
          const message = String(error?.message || error);
          if (message.toLowerCase().includes("timed out")) {
            classified = { status: "timed-out", visibleHeading: null, agentOpsLoaded: false };
          }
          gotoError = message;
        }

        const finalUrl = page.url();
        classified = reconcileClassifiedWithFinalUrl(route, classified, finalUrl);

        const routeEntry = {
          route,
          requestedUrl: url,
          finalUrl,
          responseStatus,
          status: classified.status,
          visibleHeading: classified.visibleHeading,
          agentOpsLoaded: classified.agentOpsLoaded,
          screenshotPath: rel(screenshotPath),
          error: gotoError,
          safeInteractions: [],
        };

        recordInteraction("readonly-navigation", route, userSpec.qaUserId, classified.status);

        routeEntry.safeInteractions = await runSafeInteractions(
          page,
          routeSpec,
          userSpec.qaUserId,
          classified.status,
        );

        for (const si of routeEntry.safeInteractions) {
          if (si.type === "dangerous-buttons-visible") {
            addFinding({
              category: "Security/Permission",
              severity: "Medium",
              title: `Visible write/destructive actions on ${route} for ${userSpec.qaUserId}`,
              problem: si.labels.join(", "),
              qaUserId: userSpec.qaUserId,
              route,
            });
          }
          if (si.type === "risky-submit-visible") {
            addFinding({
              category: "Security/Permission",
              severity: "Low",
              title: `Enabled submit-style control visible on ${route} for ${userSpec.qaUserId}`,
              problem: si.label,
              qaUserId: userSpec.qaUserId,
              route,
            });
          }
        }

        evaluateRouteAccess(userSpec, routeSpec, routeEntry);
        userResult.routes.push(routeEntry);
        userResult.screenshots.push(routeEntry.screenshotPath);
        report.screenshots.push(routeEntry.screenshotPath);
      }

      userResult.findingCount = report.findings.length - findingsBefore;
      report.users.push(userResult);
      await context.close();
      writeReports();
    });
  }

  test.afterAll(async () => {
    writeReports();
  });
});
