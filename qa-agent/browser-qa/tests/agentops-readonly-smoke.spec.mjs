import fs from "fs";
import path from "path";
import { test, expect } from "@playwright/test";

const REPORT_DIR = path.join("qa-agent", "reports", "browser-qa");
const SCREENSHOT_DIR = path.join(REPORT_DIR, "screenshots");
const JSON_REPORT_PATH = path.join(REPORT_DIR, "browser-smoke-report.json");
const MD_REPORT_PATH = path.join(REPORT_DIR, "browser-smoke-report.md");
const ROUTES = [
  "/dashboard",
  "/system/agent-ops",
  "/finance",
  "/finance/master-data",
  "/finance/transactions",
  "/finance/reports",
  "/ai-management",
];

const runId = `browser-smoke-${Date.now()}`;
const routeResults = [];
const findings = [];
const allConsoleErrors = [];

function classifyRouteStatus({ finalUrl, responseStatus, pageErrors }) {
  const lower = String(finalUrl || "").toLowerCase();
  const authHit =
    lower.includes("login") ||
    lower.includes("signin") ||
    lower.includes("sign-in") ||
    lower.includes("auth");

  if (authHit) return "auth-required";
  if (responseStatus && responseStatus >= 400) return "failed";
  if (pageErrors.length > 0) return "loaded";
  if (!finalUrl) return "failed";
  return "loaded";
}

function rel(filePath) {
  return filePath.replaceAll("\\", "/");
}

test.beforeAll(async () => {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
});

test("readonly route smoke coverage", async ({ page, baseURL, browserName }) => {
  expect(baseURL, "Base URL should be configured").toBeTruthy();

  for (const route of ROUTES) {
    const url = new URL(route, baseURL).toString();
    const pageErrors = [];
    const consoleErrors = [];

    const listener = (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
        allConsoleErrors.push(`${route}: ${msg.text()}`);
      }
    };
    page.on("console", listener);
    page.on("pageerror", (err) => {
      pageErrors.push(String(err?.message || err));
    });

    let responseStatus = null;
    let gotoError = null;
    try {
      const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });
      responseStatus = response?.status() ?? null;
      await page.waitForTimeout(250);
    } catch (error) {
      gotoError = String(error?.message || error);
    }

    const finalUrl = page.url();
    const screenshotPath = path.join(
      SCREENSHOT_DIR,
      `${route.replace(/\//g, "_").replace(/^_/, "") || "root"}-${Date.now()}.png`,
    );

    await page.screenshot({ path: screenshotPath, fullPage: true });
    page.off("console", listener);

    const status = gotoError
      ? "failed"
      : classifyRouteStatus({ finalUrl, responseStatus, pageErrors });

    if (gotoError || responseStatus >= 400 || pageErrors.length > 0 || consoleErrors.length > 0) {
      findings.push({
        id: `SMOKE-${findings.length + 1}`,
        runId,
        createdAt: new Date().toISOString(),
        environment: "local-or-staging",
        baseUrl: baseURL,
        route,
        pageTitle: await page.title().catch(() => null),
        userRole: "guest-or-unauthenticated",
        viewport: "default",
        category: "Functional",
        severity: gotoError || responseStatus >= 500 ? "High" : "Low",
        title: `[SMOKE] ${route} ${gotoError ? "navigation error" : "check"}`,
        problem: gotoError || `Route loaded with ${consoleErrors.length + pageErrors.length} error signal(s).`,
        expectedResult: "Readonly route should load or clearly indicate authentication requirement.",
        actualResult: gotoError || `Final URL: ${finalUrl}, status: ${status}.`,
        steps: [`Open ${url}`, "Wait for DOM content loaded", "Capture screenshot and console errors"],
        evidence: {
          screenshotPath: rel(screenshotPath),
          tracePath: null,
          videoPath: null,
          consoleLogPath: null,
          networkLogPath: null,
        },
        consoleErrors,
        networkErrors: [],
        likelyRootCause: gotoError ? "App not reachable or route runtime failure." : null,
        suggestedFixPrompt: null,
        agentReviewNeeded: true,
        importEligible: false,
        metadata: { readonlySmoke: true, authRequiredAllowed: true },
      });
    }

    routeResults.push({
      route,
      requestedUrl: url,
      finalUrl,
      browserName,
      responseStatus,
      status,
      consoleErrors,
      pageErrors,
      screenshotPath: rel(screenshotPath),
      error: gotoError,
    });
  }
});

test.afterAll(async ({ baseURL }) => {
  const report = {
    runId,
    createdAt: new Date().toISOString(),
    baseUrl: baseURL || process.env.AGENTOPS_QA_BASE_URL || "http://localhost:5173",
    environment: "local-or-staging",
    playwrightVersion: "runtime",
    safetyStatement: "Read-only smoke only. No write, destructive, or AgentOps action execution.",
    routesVisited: routeResults.length,
    routes: routeResults,
    consoleErrors: allConsoleErrors,
    findingsGenerated: findings.length,
    findings,
  };

  const md = [
    "# AgentOps Browser Smoke Report",
    "",
    `- Run ID: \`${report.runId}\``,
    `- Base URL: ${report.baseUrl}`,
    `- Environment: ${report.environment}`,
    `- Routes visited: ${report.routesVisited}`,
    `- Findings generated: ${report.findingsGenerated}`,
    "",
    "## Route Results",
    "",
    "| Route | Final URL | Status | Response | Screenshot |",
    "| --- | --- | --- | ---: | --- |",
    ...report.routes.map(
      (r) =>
        `| \`${r.route}\` | \`${r.finalUrl || "-"}\` | ${r.status} | ${
          r.responseStatus ?? "-"
        } | \`${r.screenshotPath}\` |`,
    ),
    "",
    "## Safety Statement",
    "",
    report.safetyStatement,
    "",
    report.findingsGenerated === 0
      ? "## Findings\n\nNo findings detected in readonly smoke checks."
      : `## Findings\n\nGenerated ${report.findingsGenerated} raw smoke finding(s) in JSON report. importEligible is false for all findings.`,
    "",
  ].join("\n");

  fs.writeFileSync(JSON_REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  fs.writeFileSync(MD_REPORT_PATH, md, "utf8");
});

