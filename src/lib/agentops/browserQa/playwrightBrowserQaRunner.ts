/**
 * Real Playwright browser QA runner — Node.js only (API / SSR), not for browser bundles.
 */

import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join } from "node:path";
import { fileURLToPath } from "node:url";

import type { Browser, BrowserContext, Page, Response } from "playwright";

import {
  createDefaultBrowserQaAuthState,
  formatBrowserQaError,
  type BrowserQaAuthState,
  type BrowserQaFinding,
  type BrowserQaRunResult,
} from "@/lib/agentops/browserQa/browserQaRunResult";
import {
  buildControlCockpitSuggestions,
  evaluateRoutePageIdentity,
  resolveRouteExpectation,
  collectControlCockpitFindings,
  auditControlCockpitModules,
} from "@/lib/agentops/browserQa/browserQaRouteExpectations";
import {
  isUncertainBrowserQaScan,
  readBodyTextWithSpaRetry,
  waitForRouteSpaReadiness,
} from "@/lib/agentops/browserQa/browserQaSpaReadiness";
import type { BrowserQaReadinessEvidence } from "@/lib/agentops/browserQa/browserQaRunResult";
import { honorCancelCheckpoint } from "@/lib/agentops/runtime/agentOpsCancelCheckpoint";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const ARTIFACT_DIR = join(REPO_ROOT, "qa-agent", "browser-qa-artifacts");
const PAGE_TIMEOUT_MS = 15_000;
const ERROR_TEXT_PATTERN =
  /\b(failed to load|network error|something went wrong|error loading|page not found|404|500 internal)\b/i;

export type PlaywrightBrowserQaInput = {
  targetUrl: string;
  agentId: string;
  canonicalAgentId: string;
  /** Staging worker cancel probe — throw AgentOpsCancelRequestedError when true. */
  cancelCheck?: (phase: string) => Promise<boolean> | boolean;
};

type StorageStateConfig = {
  path: string | null;
  auth: BrowserQaAuthState;
};

function resolveStorageStateConfig(): StorageStateConfig {
  const raw =
    process.env.AGENTOPS_BROWSER_QA_STORAGE_STATE?.trim() ||
    "qa-agent/browser-qa-auth/storage-state.json";
  const resolvedPath = isAbsolute(raw) ? raw : join(REPO_ROOT, raw);

  if (existsSync(resolvedPath)) {
    return {
      path: resolvedPath,
      auth: createDefaultBrowserQaAuthState({
        attempted: true,
        method: "storage_state",
      }),
    };
  }

  return {
    path: null,
    auth: createDefaultBrowserQaAuthState({
      attempted: false,
      method: "none",
      authenticated: false,
    }),
  };
}

function isLoginUrl(url: string): boolean {
  try {
    return new URL(url).pathname.includes("/login");
  } catch {
    return url.includes("/login");
  }
}

function buildFailedResult(
  targetUrl: string,
  error: unknown,
  partial?: Partial<BrowserQaRunResult>,
): BrowserQaRunResult {
  const message = formatBrowserQaError(error);
  return {
    realBrowserUsed: false,
    executionType: "failed",
    targetUrl,
    auth: partial?.auth ?? createDefaultBrowserQaAuthState(),
    findings: [
      {
        severity: "high",
        type: "browser_qa_runtime_failure",
        title: "Real browser QA failed",
        description: message,
      },
    ],
    suggestions: [
      "Check Playwright installation (`npx playwright install chromium`).",
      "Check target URL availability.",
      "Check local dev server is running.",
    ],
    evidence: {
      consoleErrors: partial?.evidence?.consoleErrors ?? [],
      failedRequests: partial?.evidence?.failedRequests ?? [],
      scannedLinks: partial?.evidence?.scannedLinks ?? [],
      screenshotPath: partial?.evidence?.screenshotPath,
      visibleTextSample: partial?.evidence?.visibleTextSample,
    },
    error: message,
  };
}

function buildAuthRedirectResult(input: {
  targetUrl: string;
  finalUrl: string;
  title?: string;
  status?: number | null;
  auth: BrowserQaAuthState;
  screenshotPath?: string;
  visibleTextSample?: string;
  consoleErrors: string[];
  failedRequests: string[];
}): BrowserQaRunResult {
  return {
    realBrowserUsed: true,
    executionType: "failed",
    targetUrl: input.targetUrl,
    finalUrl: input.finalUrl,
    title: input.title,
    status: input.status ?? null,
    auth: {
      ...input.auth,
      authenticated: false,
      redirectedToLogin: true,
      loginUrl: input.finalUrl,
    },
    findings: [
      {
        severity: "medium",
        type: "auth_required",
        title: "Browser QA redirected to login",
        description:
          "Playwright could not access protected route because no authenticated browser state was available.",
        evidence: `${input.targetUrl} -> ${input.finalUrl}`,
      },
    ],
    suggestions: [
      "Run `npm run agentops:capture-browser-qa-auth` and log in once to save storage state.",
      "Ensure AGENTOPS_BROWSER_QA_STORAGE_STATE points to qa-agent/browser-qa-auth/storage-state.json.",
      "Restart dev server after capturing auth state.",
    ],
    evidence: {
      screenshotPath: input.screenshotPath,
      consoleErrors: input.consoleErrors,
      failedRequests: input.failedRequests,
      scannedLinks: [],
      visibleTextSample: input.visibleTextSample,
    },
    error: "Protected route was not tested because Playwright was redirected to login.",
  };
}

async function captureScreenshot(
  page: Page,
  canonicalAgentId: string,
): Promise<string | undefined> {
  const timestamp = Date.now();
  const filename = `agentops-browser-qa-${canonicalAgentId}-${timestamp}.png`;
  const screenshotPath = join(ARTIFACT_DIR, filename);
  await mkdir(ARTIFACT_DIR, { recursive: true });
  const buffer = await page.screenshot({
    type: "png",
    fullPage: false,
    timeout: 8_000,
  });
  await writeFile(screenshotPath, buffer);
  return screenshotPath;
}

async function collectAuthenticatedShellChecks(
  page: Page,
  bodySample: string,
  options?: { skipContentSparseChecks?: boolean; skipShellChecks?: boolean },
): Promise<BrowserQaFinding[]> {
  const findings: BrowserQaFinding[] = [];
  const skipContentSparseChecks = options?.skipContentSparseChecks ?? false;
  const skipShellChecks = options?.skipShellChecks ?? false;

  if (!skipShellChecks) {
    const sidebarCount = await page
      .locator('nav, aside, [class*="sidebar"], [data-testid="sidebar"]')
      .count();
    if (sidebarCount === 0) {
      findings.push({
        severity: "medium",
        type: "missing_app_shell",
        title: "Application sidebar not detected",
        description: "Expected authenticated app shell navigation was not visible.",
        evidence: bodySample.slice(0, 240) || undefined,
      });
    }
  }

  if (!skipContentSparseChecks) {
    const mainText = await page
      .locator("main, [role='main']")
      .first()
      .innerText()
      .catch(() => "");
    if (!mainText || mainText.replace(/\s+/g, "").length < 24) {
      findings.push({
        severity: "high",
        type: "protected_content_missing",
        title: "Protected route content not visible",
        description: "Authenticated page loaded but main protected content appears missing or uninitialized.",
        evidence: mainText.slice(0, 200) || bodySample.slice(0, 200) || undefined,
      });
    }
  }

  return findings;
}

async function collectPageChecks(
  page: Page,
  response: Response | null,
  absoluteUrl: string,
  bodySample: string,
  options?: { skipGenericStructureChecks?: boolean; skipEmptyBody?: boolean },
): Promise<{ findings: BrowserQaFinding[]; suggestions: string[]; scannedLinks: string[] }> {
  const findings: BrowserQaFinding[] = [];
  const suggestions: string[] = [];
  const status = response?.status() ?? null;
  const skipGenericStructureChecks = options?.skipGenericStructureChecks ?? false;
  const skipEmptyBody = options?.skipEmptyBody ?? false;

  if (status != null && status >= 400) {
    findings.push({
      severity: status >= 500 ? "critical" : "high",
      type: "http_status",
      title: `HTTP ${status} response`,
      description: `The page returned HTTP ${status} for ${absoluteUrl}.`,
      evidence: `HTTP ${status}`,
    });
    suggestions.push("Verify the route exists and the dev server is serving this path.");
  }

  if (!skipEmptyBody && !bodySample.trim()) {
    findings.push({
      severity: "high",
      type: "empty_body",
      title: "Empty page body",
      description: "The page rendered with no visible body text.",
    });
  }

  const headingCount = await page.locator("h1").count();
  if (!skipGenericStructureChecks && headingCount === 0) {
    findings.push({
      severity: "medium",
      type: "missing_h1",
      title: "Missing primary heading (h1)",
      description: "No h1 element was found on the page.",
      evidence: bodySample.slice(0, 240) || undefined,
    });
    suggestions.push("Add a primary h1 heading for page structure and accessibility.");
  }

  const emptyMainCount = await page.locator("main:empty, [role='main']:empty").count();
  if (!skipGenericStructureChecks && emptyMainCount > 0) {
    findings.push({
      severity: "medium",
      type: "empty_main",
      title: "Empty main container",
      description: "The main content region appears empty.",
    });
  }

  const mainText = await page
    .locator("main, [role='main']")
    .first()
    .innerText()
    .catch(() => "");
  if (!skipGenericStructureChecks && mainText && mainText.replace(/\s+/g, "").length < 24) {
    findings.push({
      severity: "low",
      type: "sparse_main",
      title: "Sparse main content",
      description: "Main content region has very little visible text.",
      evidence: mainText.slice(0, 200),
    });
  }

  const brokenLinks = await page.evaluate(() => {
    return Array.from(document.querySelectorAll("a[href]"))
      .slice(0, 20)
      .map((anchor) => anchor.getAttribute("href") ?? "")
      .filter((href) => href === "#" || href.trim() === "" || href.trim() === "javascript:void(0)");
  });
  if (brokenLinks.length > 0) {
    findings.push({
      severity: "medium",
      type: "broken_links",
      title: "Broken navigation links detected",
      description: `${brokenLinks.length} anchor(s) use empty, hash-only, or javascript:void(0) href values.`,
      evidence: brokenLinks.slice(0, 8).join(", "),
    });
  }

  const disabledButtons = await page.locator("button:disabled").count();
  if (!skipGenericStructureChecks && disabledButtons > 0) {
    findings.push({
      severity: disabledButtons >= 4 ? "medium" : "low",
      type: "disabled_buttons",
      title: "Disabled buttons on page",
      description: `${disabledButtons} disabled button(s) were detected.`,
      evidence: String(disabledButtons),
    });
  }

  const errorTextCount = await page.getByText(ERROR_TEXT_PATTERN).count().catch(() => 0);
  const bodyHasErrorText = ERROR_TEXT_PATTERN.test(bodySample);
  if (errorTextCount > 0 || bodyHasErrorText) {
    findings.push({
      severity: "high",
      type: "visible_error_copy",
      title: "Visible error text on page",
      description: "The page shows load failure or error messaging to the user.",
      evidence: bodySample.match(ERROR_TEXT_PATTERN)?.[0] ?? "error pattern matched",
    });
    suggestions.push("Inspect network/API failures causing visible error copy.");
  }

  const scannedLinks = await page.evaluate(() => {
    return Array.from(document.querySelectorAll("a[href^='/']"))
      .slice(0, 12)
      .map((anchor) => anchor.getAttribute("href"))
      .filter((href): href is string => Boolean(href));
  });

  return { findings, suggestions, scannedLinks };
}

function attachPageListeners(
  page: Page,
  consoleErrors: string[],
  failedRequests: string[],
): void {
  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text().slice(0, 500));
    }
  });

  page.on("pageerror", (error) => {
    consoleErrors.push(error.message.slice(0, 500));
  });

  page.on("requestfailed", (request) => {
    const failure = request.failure()?.errorText ?? "request failed";
    failedRequests.push(`${request.method()} ${request.url()} — ${failure}`.slice(0, 500));
  });

  page.on("response", (response) => {
    const status = response.status();
    if (status >= 400) {
      failedRequests.push(
        `${response.request().method()} ${response.url()} — HTTP ${status}`.slice(0, 500),
      );
    }
  });
}

function buildSpaReadinessTimeoutFinding(
  readiness: BrowserQaReadinessEvidence,
  screenshotPath?: string,
): BrowserQaFinding {
  return {
    severity: "medium",
    type: "spa_readiness_timeout",
    title: "Page did not reach expected ready state before Browser QA timeout",
    description:
      "Authenticated route loaded but the SPA did not hydrate to the expected ready state before the scan deadline.",
    evidence: [
      `bodyTextLength=${readiness.bodyTextLength}`,
      `matchedSignals=${readiness.matchedSignals.join(", ") || "none"}`,
      `missingSignals=${readiness.missingSignals.join(", ") || "none"}`,
      `retryUsed=${readiness.retryUsed}`,
      `reloadUsed=${readiness.reloadUsed}`,
      screenshotPath ? `screenshot=${screenshotPath}` : null,
    ]
      .filter((line): line is string => Boolean(line))
      .join("; "),
  };
}

function buildSpaReadinessSuggestions(readiness: BrowserQaReadinessEvidence): string[] {
  return [
    "Re-run Browser QA after the SPA finishes hydrating — the first scan may have started before React rendered.",
    readiness.reloadUsed
      ? "A reload was attempted but the page still did not reach ready state — check dev server performance and console errors."
      : "If this persists, inspect Vite HMR, Supabase auth bootstrap, and route-level loading gates.",
    `Body text length at scan time: ${readiness.bodyTextLength} characters.`,
  ];
}

async function scanSinglePage(
  context: BrowserContext,
  input: PlaywrightBrowserQaInput,
  storageConfig: StorageStateConfig,
): Promise<BrowserQaRunResult> {
  const consoleErrors: string[] = [];
  const failedRequests: string[] = [];
  const page = await context.newPage();
  attachPageListeners(page, consoleErrors, failedRequests);

  try {
    await honorCancelCheckpoint(input.cancelCheck, "before_navigation");
    let response: Response | null = null;
    try {
      response = await page.goto(input.targetUrl, {
        waitUntil: "domcontentloaded",
        timeout: PAGE_TIMEOUT_MS,
      });
    } catch (error) {
      return buildFailedResult(input.targetUrl, error, {
        auth: storageConfig.auth,
        evidence: { consoleErrors, failedRequests, scannedLinks: [] },
      });
    }
    await honorCancelCheckpoint(input.cancelCheck, "after_navigation");

    let readiness = await waitForRouteSpaReadiness(page, input.targetUrl);
    const bodyRead = await readBodyTextWithSpaRetry(page, input.targetUrl, readiness);
    let bodySample = bodyRead.bodySample;
    readiness = bodyRead.readiness;

    const title = (await page.title().catch(() => "")) || undefined;
    const finalUrl = page.url();
    const status = response?.status() ?? null;
    const visibleTextSample = bodySample.slice(0, 500);

    await honorCancelCheckpoint(input.cancelCheck, "before_screenshot");
    let screenshotPath: string | undefined;
    try {
      screenshotPath = await captureScreenshot(page, input.canonicalAgentId);
    } catch (error) {
      consoleErrors.push(`Screenshot capture failed: ${formatBrowserQaError(error)}`);
    }
    await honorCancelCheckpoint(input.cancelCheck, "after_screenshot");
    await honorCancelCheckpoint(input.cancelCheck, "before_analysis");

    if (isLoginUrl(finalUrl)) {
      return buildAuthRedirectResult({
        targetUrl: input.targetUrl,
        finalUrl,
        title,
        status,
        auth: storageConfig.auth,
        screenshotPath,
        visibleTextSample,
        consoleErrors,
        failedRequests,
      });
    }

    const auth: BrowserQaAuthState = {
      ...storageConfig.auth,
      authenticated: true,
      redirectedToLogin: false,
    };

    const uncertainScan = isUncertainBrowserQaScan(readiness);
    const routeExpectation = resolveRouteExpectation(input.targetUrl);
    const pageIdentity =
      routeExpectation && readiness.ready
        ? await evaluateRoutePageIdentity(page, routeExpectation)
        : undefined;

    let routeFindings: BrowserQaFinding[] = [];
    let routeSuggestions: string[] = [];

    if (uncertainScan) {
      routeFindings = [buildSpaReadinessTimeoutFinding(readiness, screenshotPath)];
      routeSuggestions = buildSpaReadinessSuggestions(readiness);
    } else if (routeExpectation && pageIdentity) {
      if (routeExpectation.route === "/system/agent-ops") {
        routeFindings = await collectControlCockpitFindings(
          page,
          pageIdentity,
          routeExpectation,
          bodySample,
          { spaReady: readiness.ready },
        );
        routeSuggestions = buildControlCockpitSuggestions({
          pageIdentity,
          findings: routeFindings,
          bodySample,
          moduleAudit: await auditControlCockpitModules(page),
          consoleErrors,
          failedRequests,
        });
      }
    }

    const shellFindings = uncertainScan
      ? []
      : await collectAuthenticatedShellChecks(page, bodySample, {
          skipContentSparseChecks: Boolean(pageIdentity?.passed),
          skipShellChecks: uncertainScan,
        });
    const skipGenericStructureChecks = Boolean(pageIdentity?.passed) || uncertainScan;
    const checks = await collectPageChecks(
      page,
      response,
      input.targetUrl,
      bodySample,
      {
        skipGenericStructureChecks,
        skipEmptyBody: uncertainScan,
      },
    );
    const findings = [...routeFindings, ...shellFindings, ...checks.findings];
    const suggestions = [...routeSuggestions, ...checks.suggestions];

    if (consoleErrors.length > 0) {
      findings.push({
        severity: "high",
        type: "console_errors",
        title: "Browser console errors detected",
        description: `${consoleErrors.length} console error(s) were captured during the page load.`,
        evidence: consoleErrors.slice(0, 3).join(" | "),
      });
      suggestions.push("Open DevTools console and resolve JavaScript errors.");
    }

    if (failedRequests.length > 0) {
      findings.push({
        severity: "medium",
        type: "failed_requests",
        title: "Failed or errored network requests",
        description: `${failedRequests.length} failed or HTTP-error network request(s) were captured.`,
        evidence: failedRequests.slice(0, 3).join(" | "),
      });
      suggestions.push("Inspect network tab for failing API or asset requests.");
    }

    if (findings.length === 0) {
      findings.push({
        severity: "low",
        type: "clean_scan",
        title: "No critical issues detected",
        description: "Authenticated real browser scan completed without high-severity findings.",
      });
    }

    if (suggestions.length === 0) {
      suggestions.push("Re-run browser QA after significant UI or routing changes.");
    }

    return {
      realBrowserUsed: true,
      executionType: "real_browser",
      targetUrl: input.targetUrl,
      finalUrl,
      title,
      status,
      auth,
      findings,
      suggestions,
      readiness,
      evidence: {
        screenshotPath,
        consoleErrors,
        failedRequests,
        scannedLinks: checks.scannedLinks,
        visibleTextSample,
        readiness,
        pageIdentity: pageIdentity
          ? {
              passed: pageIdentity.passed,
              route: pageIdentity.route,
              matchedHeading: pageIdentity.matchedHeading,
              matchedSubtitle: pageIdentity.matchedSubtitle,
              matchedSignals: pageIdentity.matchedSignals,
              missingSignals: pageIdentity.missingSignals,
            }
          : undefined,
      },
    };
  } finally {
    await page.close().catch(() => undefined);
  }
}

export async function runPlaywrightBrowserQA(
  input: PlaywrightBrowserQaInput,
): Promise<BrowserQaRunResult> {
  const targetUrl = input.targetUrl.trim();
  if (!targetUrl) {
    return buildFailedResult("", "Target URL is required for real browser QA.");
  }

  const storageConfig = resolveStorageStateConfig();
  let browser: Browser | null = null;
  let context: BrowserContext | null = null;

  try {
    await honorCancelCheckpoint(input.cancelCheck, "before_browser_launch");
    const { chromium } = await import("playwright");
    browser = await chromium.launch({ headless: true });
    context = storageConfig.path
      ? await browser.newContext({ storageState: storageConfig.path })
      : await browser.newContext();
    return await scanSinglePage(context, { ...input, targetUrl }, storageConfig);
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      (error as { code?: string }).code === "AGENTOPS_CANCEL_REQUESTED"
    ) {
      throw error;
    }
    return buildFailedResult(targetUrl, error, { auth: storageConfig.auth });
  } finally {
    await context?.close().catch(() => undefined);
    await browser?.close().catch(() => undefined);
  }
}
