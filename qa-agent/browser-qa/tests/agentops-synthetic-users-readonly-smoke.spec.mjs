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
const catalog = JSON.parse(fs.readFileSync(catalogPath, "utf8"));
const USERS = catalog.users;

const REPORT_DIR = path.join("qa-agent", "reports", "browser-qa");
const SCREENSHOT_DIR = path.join(REPORT_DIR, "screenshots", "synthetic-users");
const JSON_REPORT_PATH = path.join(REPORT_DIR, "synthetic-users-smoke-report.json");
const MD_REPORT_PATH = path.join(REPORT_DIR, "synthetic-users-smoke-report.md");

const ROUTES = [
  "/dashboard",
  "/system/agent-ops",
  "/finance",
  "/finance/master-data",
  "/finance/transactions",
  "/finance/reports",
  "/ai-management",
];

const ROUTE_NAV_TIMEOUT_MS = 12_000;
const ROUTE_HARD_CAP_MS = 28_000;
const AGENTOPS_ROUTE_HARD_CAP_MS = 35_000;
const LOCATOR_TIMEOUT_MS = 2_000;
const AGENTOPS_SETTLE_TIMEOUT_MS = 12_000;
const SCREENSHOT_TIMEOUT_MS = 8_000;
const LOGIN_TIMEOUT_MS = 45_000;
const LOGIN_LOCATOR_TIMEOUT_MS = 8_000;
const PER_USER_TEST_TIMEOUT_MS = 180_000;

const LOGIN_ERROR_PATTERN =
  /invalid email or password|invalid login credentials|unable to load authenticated user|user profile not found|login request timed out|login timeout|too many login attempts/i;

const runId = `synthetic-users-smoke-${Date.now()}`;
const startedAt = new Date().toISOString();

const report = {
  runId,
  createdAt: startedAt,
  baseUrl: process.env.AGENTOPS_QA_BASE_URL || "http://localhost:5173",
  environment: "staging-only",
  usersTested: 0,
  usersSkipped: 0,
  loginSuccessCount: 0,
  timedOutRouteCount: 0,
  screenshotFailureCount: 0,
  usedOwnerPasswordFallback: false,
  agentOpsOwnerAccess: null,
  agentOpsNonOwnerAccess: [],
  users: [],
  findings: [],
  screenshots: [],
  consoleErrorsSummary: [],
  networkErrorsSummary: [],
  safetyStatement:
    "Read-only authenticated synthetic user smoke. Login only; no writes, forms, or AgentOps actions.",
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

async function classifyRoute(page, route, responseStatus, gotoError, userSpec) {
  if (gotoError) {
    const lowerError = String(gotoError).toLowerCase();
    if (lowerError.includes("timeout")) {
      return {
        status: "timed-out",
        visibleHeading: null,
        agentOpsLoaded: false,
        expected: false,
      };
    }
    return { status: "failed", visibleHeading: null, agentOpsLoaded: false, expected: false };
  }

  const finalUrl = page.url();
  const lower = finalUrl.toLowerCase();
  const routePath = route.toLowerCase();

  if (route === "/system/agent-ops") {
    await waitForAgentOpsUi(page);
    const agent = await detectAgentOpsState(page);
    if (agent.agentOpsLoaded) {
      return {
        status: "loaded",
        visibleHeading: "AgentOps Control Center",
        agentOpsLoaded: true,
        expected: Boolean(userSpec.agentOpsOwnerAccess),
      };
    }
    if (agent.ownerDenied) {
      return {
        status: "access-denied",
        visibleHeading: "AgentOps is Owner-only",
        agentOpsLoaded: false,
        expected: !userSpec.agentOpsOwnerAccess,
      };
    }
    if (lower.includes("login")) {
      return { status: "auth-required", visibleHeading: null, agentOpsLoaded: false, expected: false };
    }
    if (lower.includes("/system/agent-ops")) {
      const heading = await firstHeading(page);
      return {
        status: "access-denied",
        visibleHeading: heading?.trim() || "blocked-on-agent-ops-route",
        agentOpsLoaded: false,
        expected: !userSpec.agentOpsOwnerAccess,
      };
    }
    return {
      status: "redirected",
      visibleHeading: await page.title().catch(() => null),
      agentOpsLoaded: false,
      expected: !userSpec.agentOpsOwnerAccess,
    };
  }

  if (lower.includes("login") || lower.includes("sign-in") || lower.includes("signin")) {
    return { status: "auth-required", visibleHeading: null, agentOpsLoaded: false, expected: false };
  }

  if (responseStatus && responseStatus >= 400) {
    return { status: "failed", visibleHeading: null, agentOpsLoaded: false, expected: false };
  }

  const routeSegment = routePath.split("/").filter(Boolean)[0];
  if (routeSegment && !lower.includes(routeSegment)) {
    return {
      status: "redirected",
      visibleHeading: await page.title().catch(() => null),
      agentOpsLoaded: false,
      expected: false,
    };
  }

  const heading = await firstHeading(page);
  return { status: "loaded", visibleHeading: heading?.trim() || null, agentOpsLoaded: false, expected: false };
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

async function checkRoute(page, route, baseUrl, userSpec) {
  const url = new URL(route, baseUrl).toString();
  const screenshotPath = path.join(
    SCREENSHOT_DIR,
    `${slug(userSpec.qaUserId)}-${route.replace(/\//g, "_").replace(/^_/, "") || "root"}-${Date.now()}.png`,
  );
  let responseStatus = null;
  let gotoError = null;
  let screenshotError = null;
  let classified = {
    status: "failed",
    visibleHeading: null,
    agentOpsLoaded: false,
    expected: false,
  };

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

      classified = await classifyRoute(page, route, responseStatus, gotoError, userSpec);

      await page
        .screenshot({ path: screenshotPath, fullPage: false, timeout: SCREENSHOT_TIMEOUT_MS })
        .catch((err) => {
          screenshotError = String(err?.message || err);
        });
    });
  } catch (error) {
    const message = String(error?.message || error);
    if (message.toLowerCase().includes("timed out")) {
      classified = {
        status: "timed-out",
        visibleHeading: null,
        agentOpsLoaded: false,
        expected: route === "/system/agent-ops" ? !userSpec.agentOpsOwnerAccess : false,
      };
      gotoError = message;
    } else {
      gotoError = message;
      classified = { status: "failed", visibleHeading: null, agentOpsLoaded: false, expected: false };
    }
    await page
      .screenshot({ path: screenshotPath, fullPage: false, timeout: SCREENSHOT_TIMEOUT_MS })
      .catch((err) => {
        screenshotError = String(err?.message || err);
      });
  }

  return {
    route,
    requestedUrl: url,
    finalUrl: page.url(),
    responseStatus,
    status: classified.status,
    expected: classified.expected,
    visibleHeading: classified.visibleHeading,
    agentOpsLoaded: classified.agentOpsLoaded,
    screenshotPath: rel(screenshotPath),
    error: gotoError,
    screenshotError,
  };
}

function addFinding(partial) {
  const finding = {
    id: `SYN-${report.findings.length + 1}`,
    runId,
    createdAt: new Date().toISOString(),
    importEligible: partial.importEligible ?? false,
    ...partial,
  };
  report.findings.push(finding);
  return finding;
}

function finalizeReportStatus() {
  const criticalCount = report.findings.filter((f) => f.severity === "Critical").length;
  const ownerUser = report.users.find((u) => u.agentOpsOwnerAccess && !u.skipped);
  const ownerOk =
    report.agentOpsOwnerAccess?.agentOpsLoaded === true ||
    ownerUser?.agentOpsRouteStatus === "loaded";

  if (report.usersTested === 0) {
    report.status = "skipped";
  } else if (criticalCount > 0) {
    report.status = "failed";
  } else if (ownerUser && !ownerUser.loginSuccessful) {
    report.status = "failed";
  } else if (ownerUser && ownerUser.loginSuccessful && !ownerOk) {
    report.status = "failed";
  } else {
    report.status = "passed";
  }

  return report.status;
}

function writeReports() {
  finalizeReportStatus();
  const criticalCount = report.findings.filter((f) => f.severity === "Critical").length;

  const md = [
    "# Synthetic Users Browser Smoke Report",
    "",
    `- Run ID: \`${report.runId}\``,
    `- Created at: ${report.createdAt}`,
    `- Base URL: ${report.baseUrl}`,
    `- Status: ${report.status}`,
    `- Users tested: ${report.usersTested}`,
    `- Users skipped: ${report.usersSkipped}`,
    `- Login success count: ${report.loginSuccessCount}`,
    `- Timed-out routes: ${report.timedOutRouteCount}`,
    `- Screenshot failures: ${report.screenshotFailureCount}`,
    `- Owner password fallback used: ${report.usedOwnerPasswordFallback ? "yes" : "no"}`,
    `- Critical findings: ${criticalCount}`,
    "",
    "## AgentOps access isolation",
    "",
    "### Owner",
    report.agentOpsOwnerAccess
      ? `- ${report.agentOpsOwnerAccess.email}: ${report.agentOpsOwnerAccess.status} (loaded=${report.agentOpsOwnerAccess.agentOpsLoaded})`
      : "- Owner not tested",
    "",
    "### Non-owner (expected blocked)",
    ...(report.agentOpsNonOwnerAccess.length > 0
      ? report.agentOpsNonOwnerAccess.map(
          (e) =>
            `- ${e.email}: ${e.status} (agentOpsLoaded=${e.agentOpsLoaded}, expected=${e.expected})`,
        )
      : ["- None tested"]),
    "",
    "## Users",
    "",
    "| User | Role | Login | AgentOps route | Skipped |",
    "| --- | --- | --- | --- | --- |",
    ...report.users.map(
      (u) =>
        `| ${u.qaUserId} | ${u.profileRole} | ${u.loginSuccessful ? "yes" : u.skipped ? "skipped" : "no"} | ${u.agentOpsRouteStatus ?? "-"} | ${u.skipped ? "yes" : "no"} |`,
    ),
    "",
    "## Route coverage",
    "",
    ROUTES.map((r) => `- \`${r}\``).join("\n"),
    "",
    "## Findings",
    "",
    ...(report.findings.length === 0
      ? ["No report-only findings."]
      : report.findings.map(
          (f) =>
            `- **${f.severity}** [${f.category}] ${f.title} (${f.qaUserId ?? "n/a"})`,
        )),
    "",
    "## Screenshots",
    "",
    `- Folder: \`${rel(SCREENSHOT_DIR)}\``,
    `- Count: ${report.screenshots.length}`,
    "",
    "## Console / network errors",
    "",
    `- Console error lines: ${report.consoleErrorsSummary.length}`,
    `- Network error lines: ${report.networkErrorsSummary.length}`,
    "",
    "## Safety statement",
    "",
    report.safetyStatement,
    "",
  ].join("\n");

  fs.writeFileSync(JSON_REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  fs.writeFileSync(MD_REPORT_PATH, md, "utf8");
}

function recordAgentOpsRoute(userSpec, classified) {
  if (userSpec.agentOpsOwnerAccess) {
    report.agentOpsOwnerAccess = {
      email: userSpec.email,
      qaUserId: userSpec.qaUserId,
      status: classified.status,
      agentOpsLoaded: classified.agentOpsLoaded,
      expected: true,
    };
    if (!classified.agentOpsLoaded && classified.status !== "timed-out") {
      addFinding({
        category: "Functional",
        severity: "High",
        title: "Synthetic Owner cannot access AgentOps",
        problem: `Owner QA expected loaded AgentOps but got ${classified.status}`,
        qaUserId: userSpec.qaUserId,
        email: userSpec.email,
        importEligible: true,
      });
    }
  } else {
    report.agentOpsNonOwnerAccess.push({
      email: userSpec.email,
      qaUserId: userSpec.qaUserId,
      status: classified.status,
      agentOpsLoaded: classified.agentOpsLoaded,
      expected: classified.expected,
    });
    if (classified.agentOpsLoaded) {
      addFinding({
        category: "Security/Permission",
        severity: "Critical",
        title: "Non-owner synthetic user can access AgentOps",
        problem: `${userSpec.email} reached AgentOps Control Center without allowlist access.`,
        qaUserId: userSpec.qaUserId,
        email: userSpec.email,
        importEligible: true,
      });
    }
  }
}

test.describe.configure({ mode: "serial", retries: 0 });

test.describe("synthetic users readonly smoke", () => {
  test.beforeAll(async () => {
    fs.mkdirSync(REPORT_DIR, { recursive: true });
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  });

  for (const userSpec of USERS) {
    test(`synthetic user readonly smoke: ${userSpec.qaUserId}`, async ({ browser, baseURL }) => {
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
        passwordConfigured: Boolean(cred),
        passwordSource: cred?.passwordSource ?? null,
        usedOwnerPasswordFallback: cred?.usedOwnerPasswordFallback ?? false,
        loginAttempted: false,
        loginSuccessful: false,
        routes: [],
        agentOpsRouteStatus: null,
        screenshots: [],
      };

      if (cred?.usedOwnerPasswordFallback) {
        report.usedOwnerPasswordFallback = true;
      }

      if (!cred?.password) {
        userResult.skipped = true;
        userResult.skipReason = `Missing password env: ${userSpec.envVarPasswordName} or AGENTOPS_QA_SYNTHETIC_PASSWORD`;
        report.usersSkipped += 1;
        report.users.push(userResult);
        addFinding({
          category: "Functional",
          severity: "Medium",
          title: `Synthetic user skipped — no password env (${userSpec.qaUserId})`,
          problem: userResult.skipReason,
          qaUserId: userSpec.qaUserId,
          email: userSpec.email,
          importEligible: false,
        });
        writeReports();
        return;
      }

      report.usersTested += 1;
      const context = await browser.newContext();
      const page = await context.newPage();
      page.setDefaultTimeout(LOCATOR_TIMEOUT_MS);
      page.setDefaultNavigationTimeout(ROUTE_NAV_TIMEOUT_MS);

      const consoleErrors = [];
      const networkErrors = [];

      page.on("console", (msg) => {
        if (msg.type() === "error") {
          consoleErrors.push(msg.text());
          report.consoleErrorsSummary.push(`${userSpec.qaUserId}: ${msg.text()}`);
        }
      });
      page.on("response", (resp) => {
        if (resp.status() >= 400) {
          networkErrors.push(`${resp.status()} ${resp.url()}`);
          report.networkErrorsSummary.push(`${userSpec.qaUserId}: ${resp.status()} ${resp.url()}`);
        }
      });

      userResult.loginAttempted = true;
      const loginOk = await attemptLogin(page, report.baseUrl, userSpec.email, cred.password);
      userResult.loginSuccessful = loginOk;

      if (loginOk) {
        report.loginSuccessCount += 1;
      } else {
        addFinding({
          category: "Functional",
          severity: userSpec.agentOpsOwnerAccess ? "High" : "Medium",
          title: `Synthetic user login failed (${userSpec.qaUserId})`,
          problem: `Could not authenticate ${userSpec.email}`,
          qaUserId: userSpec.qaUserId,
          email: userSpec.email,
          importEligible: false,
        });
        const loginShot = path.join(
          SCREENSHOT_DIR,
          `${slug(userSpec.qaUserId)}-login-failed-${Date.now()}.png`,
        );
        await page
          .screenshot({ path: loginShot, fullPage: false, timeout: SCREENSHOT_TIMEOUT_MS })
          .catch(() => {});
        userResult.screenshots.push(rel(loginShot));
        report.users.push(userResult);
        await context.close();
        writeReports();
        return;
      }

      for (const route of ROUTES) {
        const routeEntry = await checkRoute(page, route, report.baseUrl, userSpec);
        routeEntry.consoleErrors = [...consoleErrors];
        routeEntry.networkErrors = [...networkErrors];
        userResult.routes.push(routeEntry);
        userResult.screenshots.push(routeEntry.screenshotPath);
        report.screenshots.push(routeEntry.screenshotPath);

        if (routeEntry.status === "timed-out") {
          report.timedOutRouteCount += 1;
        }
        if (routeEntry.screenshotError) {
          report.screenshotFailureCount += 1;
        }

        if (route === "/system/agent-ops") {
          userResult.agentOpsRouteStatus = routeEntry.status;
          recordAgentOpsRoute(userSpec, {
            status: routeEntry.status,
            agentOpsLoaded: routeEntry.agentOpsLoaded,
            expected: routeEntry.expected,
          });
        }
      }

      await context.close();
      report.users.push(userResult);
      writeReports();
    });
  }

  test.afterAll(async () => {
    writeReports();
  });
});
