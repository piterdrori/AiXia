#!/usr/bin/env node
/**
 * Stage 9 foundation runner.
 * Creates browser QA foundation run artifacts without requiring Playwright.
 */

import fs from "fs";
import path from "path";
import process from "process";

const ROOT = process.cwd();
const QA_ROOT = path.join(ROOT, "qa-agent");
const BROWSER_QA_ROOT = path.join(QA_ROOT, "browser-qa");
const REPORT_DIR = path.join(QA_ROOT, "reports", "browser-qa");

const SCOPE_PATH = path.join(BROWSER_QA_ROOT, "browser-qa-scope.json");
const USERS_PATH = path.join(BROWSER_QA_ROOT, "synthetic-browser-users.json");
const MAP_PATH = path.join(BROWSER_QA_ROOT, "route-workflow-map.md");

const OUTPUT_MD = path.join(REPORT_DIR, "browser-qa-foundation-run.md");
const OUTPUT_JSON = path.join(REPORT_DIR, "browser-qa-foundation-run.json");

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function boolLabel(value) {
  return value ? "Yes" : "No";
}

function detectPlaywright(pkg) {
  const deps = pkg?.dependencies ?? {};
  const devDeps = pkg?.devDependencies ?? {};
  const hasDependency =
    "@playwright/test" in deps ||
    "@playwright/test" in devDeps ||
    "playwright" in deps ||
    "playwright" in devDeps;
  return hasDependency;
}

function detectChromiumInstall() {
  const chromiumPaths = [
    path.join(ROOT, "node_modules", ".cache", "ms-playwright"),
    path.join(process.env.LOCALAPPDATA || "", "ms-playwright"),
  ];
  return chromiumPaths.some((candidate) => candidate && fs.existsSync(candidate));
}

function main() {
  const startedAt = new Date().toISOString();
  const runId = `browser-qa-foundation-${Date.now()}`;

  const scopeLoaded = fs.existsSync(SCOPE_PATH);
  const usersLoaded = fs.existsSync(USERS_PATH);
  const workflowLoaded = fs.existsSync(MAP_PATH);

  if (!scopeLoaded || !usersLoaded || !workflowLoaded) {
    throw new Error("Missing one or more browser QA foundation inputs.");
  }

  const scope = readJson(SCOPE_PATH);
  const users = readJson(USERS_PATH);
  const pkg = readJson(path.join(ROOT, "package.json"));

  const playwrightAvailable = detectPlaywright(pkg);
  const chromiumInstalled = playwrightAvailable ? detectChromiumInstall() : false;
  const smokeCommandAvailable = playwrightAvailable;
  const result = playwrightAvailable ? "PASS" : "PASS WITH FOLLOW-UP";
  const followUpMessage = playwrightAvailable
    ? "Playwright dependency detected. Readonly browser smoke command is available."
    : "Playwright not installed. Browser QA foundation created. Install/configure Playwright in a future stage to execute real browser tests.";

  fs.mkdirSync(REPORT_DIR, { recursive: true });

  const reportJson = {
    runId,
    createdAt: startedAt,
    scopeLoaded,
    syntheticUsersLoaded: usersLoaded,
    routeWorkflowMapLoaded: workflowLoaded,
    playwrightAvailable,
    chromiumInstalled: playwrightAvailable ? (chromiumInstalled ? "Yes" : "Unknown/No") : "No",
    smokeCommandAvailable,
    environmentPolicy: {
      allowedEnvironments: scope.allowedEnvironments,
      productionPolicy: scope.productionPolicy,
    },
    totals: {
      syntheticUsers: Array.isArray(users.users) ? users.users.length : 0,
      routeGroups: Array.isArray(scope.routeGroups) ? scope.routeGroups.length : 0,
      allowedTestModes: Array.isArray(scope.allowedTestModes)
        ? scope.allowedTestModes.length
        : 0,
    },
    reportsWritten: {
      markdown: path.relative(ROOT, OUTPUT_MD),
      json: path.relative(ROOT, OUTPUT_JSON),
    },
    result,
    message: followUpMessage,
  };

  const markdownLines = [
    "# AgentOps Browser QA Foundation Run",
    "",
    `- Run ID: \`${runId}\``,
    `- Created at: ${startedAt}`,
    `- Scope loaded: ${boolLabel(scopeLoaded)}`,
    `- Synthetic users loaded: ${boolLabel(usersLoaded)}`,
    `- Route workflow map loaded: ${boolLabel(workflowLoaded)}`,
    `- Playwright available: ${boolLabel(playwrightAvailable)}`,
    `- Chromium installed/runnable: ${
      playwrightAvailable ? (chromiumInstalled ? "Yes" : "Unknown/No") : "No"
    }`,
    `- Smoke test command available: ${
      smokeCommandAvailable ? "`npm run qa:agentops-browser-smoke`" : "No"
    }`,
    "",
    "## Summary",
    "",
    `- Allowed environments: ${(scope.allowedEnvironments ?? []).join(", ")}`,
    `- Allowed test modes: ${(scope.allowedTestModes ?? []).join(", ")}`,
    `- Synthetic users configured: ${
      Array.isArray(users.users) ? users.users.length : 0
    }`,
    "",
    "## Result",
    "",
    `- ${result}`,
    `- ${followUpMessage}`,
    "",
    "## Reports written",
    "",
    `- \`${path.relative(ROOT, OUTPUT_MD)}\``,
    `- \`${path.relative(ROOT, OUTPUT_JSON)}\``,
    "",
  ];

  fs.writeFileSync(OUTPUT_JSON, `${JSON.stringify(reportJson, null, 2)}\n`, "utf8");
  fs.writeFileSync(OUTPUT_MD, markdownLines.join("\n"), "utf8");

  console.log("AgentOps Browser QA Foundation");
  console.log("------------------------------");
  console.log(`Scope loaded: ${boolLabel(scopeLoaded)}`);
  console.log(`Synthetic users loaded: ${boolLabel(usersLoaded)}`);
  console.log(`Route workflow map loaded: ${boolLabel(workflowLoaded)}`);
  console.log(`Playwright available: ${boolLabel(playwrightAvailable)}`);
  console.log(
    `Chromium installed/runnable: ${
      playwrightAvailable ? (chromiumInstalled ? "Yes" : "Unknown/No") : "No"
    }`,
  );
  console.log(
    `Smoke test command available: ${
      smokeCommandAvailable ? "npm run qa:agentops-browser-smoke" : "No"
    }`,
  );
  console.log(
    `Reports written: ${path.relative(ROOT, OUTPUT_MD)}, ${path.relative(
      ROOT,
      OUTPUT_JSON,
    )}`,
  );
  console.log(`Result: ${result}`);
}

main();
