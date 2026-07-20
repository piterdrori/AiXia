/**
 * Playwright-based staging website scanner for AgentOps runtime agents.
 * Node.js / worker only — not for browser bundles.
 */

import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import type { Browser, Page, Response } from "playwright";

import type { AgentOpsRuntimeAgentRow } from "../db/agentOpsRuntimeTypes";
import {
  honorCancelCheckpoint,
  type AgentOpsCancelCheck,
} from "./agentOpsCancelCheckpoint";
import { assertStagingScanUrl } from "./stagingScanUrlGuard";
import {
  buildAbsolutePageUrl,
  resolveScopedRoutes,
  type StagingScanFinding,
  type StagingScanSeverity,
} from "./stagingScanTypes";

export type PlaywrightStagingScanOptions = {
  pageTimeoutMs?: number;
  slowLoadThresholdMs?: number;
  screenshotDir?: string;
  maxRoutes?: number;
  /** Staging worker cancel probe — throw AgentOpsCancelRequestedError when true. */
  cancelCheck?: AgentOpsCancelCheck;
};

type PageScanContext = {
  agent: AgentOpsRuntimeAgentRow;
  stagingUrl: string;
  pageUrl: string;
  absoluteUrl: string;
  screenshotDir: string;
};

type DetectorResult = {
  issue: string;
  severity: StagingScanSeverity;
  category: "ui" | "functional" | "ux" | "navigation";
  selector?: string;
  domSnapshot?: string;
};

const DEFAULT_PAGE_TIMEOUT_MS = 8_000;
const DEFAULT_SLOW_LOAD_MS = 3_000;
const HYDRATION_PATTERN =
  /\b(checking\.\.\.|loading issue|loading agent|loading issue workspace|queue summary and issue list are being prepared)\b/i;
const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

function slugify(value: string): string {
  return value.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
}

async function captureIssueScreenshot(
  page: Page,
  context: PageScanContext,
  detector: DetectorResult,
): Promise<Record<string, unknown>> {
  const evidence: Record<string, unknown> = {
    scan_mode: "playwright",
    staging_url: context.stagingUrl,
    agent_id: context.agent.id,
    agent_name: context.agent.name,
    scanned_at: new Date().toISOString(),
    category: detector.category,
    selector: detector.selector ?? null,
    dom_snapshot: detector.domSnapshot?.slice(0, 2_000) ?? null,
    screenshots: true,
  };

  try {
    const screenshotBuffer = await page.screenshot({
      type: "jpeg",
      quality: 55,
      fullPage: false,
      timeout: 4_000,
    });

    const hash = createHash("sha1")
      .update(`${context.agent.id}:${context.pageUrl}:${detector.issue}`)
      .digest("hex")
      .slice(0, 12);
    const filename = `${Date.now()}-${slugify(context.pageUrl)}-${hash}.jpg`;
    const outputDir = join(context.screenshotDir, context.agent.id);
    await mkdir(outputDir, { recursive: true });
    const screenshotPath = join(outputDir, filename);
    await writeFile(screenshotPath, screenshotBuffer);

    evidence.screenshot_path = screenshotPath;
    evidence.screenshot_base64 = screenshotBuffer.toString("base64");
  } catch (error) {
    evidence.screenshot_error =
      error instanceof Error ? error.message : "Screenshot capture failed";
  }

  return evidence;
}

function buildFinding(
  context: PageScanContext,
  detector: DetectorResult,
  evidence: Record<string, unknown>,
  extra?: Record<string, unknown>,
): StagingScanFinding {
  return {
    page_url: context.pageUrl,
    issue: detector.issue,
    severity: detector.severity,
    evidence: {
      ...evidence,
      route: context.pageUrl,
      absolute_url: context.absoluteUrl,
      ...extra,
    },
  };
}

async function detectUiAndUxIssues(page: Page): Promise<DetectorResult[]> {
  const findings: DetectorResult[] = [];
  const bodyText = ((await page.locator("body").innerText().catch(() => "")) ?? "")
    .replace(/\s+/g, " ")
    .trim();
  const bodySnippet = bodyText.slice(0, 2_000);

  if (!bodyText) {
    findings.push({
      issue: "Page rendered an empty body shell",
      severity: "high",
      category: "ui",
      domSnapshot: bodySnippet,
    });
  }

  if (HYDRATION_PATTERN.test(bodyText)) {
    findings.push({
      issue: "Hydration stall detected (persistent loading/checking copy)",
      severity: "medium",
      category: "ux",
      domSnapshot: bodySnippet,
    });
  }

  const headingCount = await page.locator("h1").count();
  if (headingCount === 0) {
    findings.push({
      issue: "Missing primary page header (no h1)",
      severity: "medium",
      category: "ui",
      selector: "h1",
      domSnapshot: bodySnippet,
    });
  }

  const emptyStateNodes = await page
    .locator("main:empty, [role='main']:empty, .aixia-empty-state:visible")
    .count();
  if (emptyStateNodes > 0) {
    findings.push({
      issue: "Empty main container detected",
      severity: "medium",
      category: "ui",
      selector: "main, [role='main']",
      domSnapshot: bodySnippet,
    });
  }

  const sparseMain = await page
    .locator("main, [role='main']")
    .first()
    .innerText()
    .catch(() => "");
  if (sparseMain && sparseMain.replace(/\s+/g, "").length < 24) {
    findings.push({
      issue: "Main content region appears sparse or uninitialized",
      severity: "low",
      category: "ux",
      selector: "main, [role='main']",
      domSnapshot: sparseMain.slice(0, 500),
    });
  }

  return findings;
}

async function detectFunctionalIssues(
  page: Page,
  response: Response | null,
  absoluteUrl: string,
): Promise<DetectorResult[]> {
  const findings: DetectorResult[] = [];
  const status = response?.status() ?? 0;

  if (status >= 400) {
    findings.push({
      issue: `Route returned HTTP ${status}`,
      severity: status >= 500 ? "critical" : "high",
      category: "functional",
      domSnapshot: `HTTP ${status} for ${absoluteUrl}`,
    });
  }

  const disabledButtons = await page.locator("button:disabled").count();
  if (disabledButtons >= 4) {
    findings.push({
      issue: `Multiple disabled buttons detected (${disabledButtons})`,
      severity: "low",
      category: "functional",
      selector: "button:disabled",
    });
  }

  const brokenLinks = await page.evaluate(() => {
    const anchors = Array.from(document.querySelectorAll("a[href]")).slice(0, 12);
    return anchors
      .map((anchor) => anchor.getAttribute("href") ?? "")
      .filter((href) => href === "#" || href.trim() === "" || href.trim() === "javascript:void(0)");
  });

  if (brokenLinks.length > 0) {
    findings.push({
      issue: `Broken navigation links detected (${brokenLinks.length})`,
      severity: "medium",
      category: "navigation",
      selector: "a[href]",
    });
  }

  const apiErrorHints = await page
    .locator("text=/failed to load|network error|something went wrong|error loading/i")
    .count();
  if (apiErrorHints > 0) {
    findings.push({
      issue: "Visible API/load failure copy detected on page",
      severity: "high",
      category: "functional",
      domSnapshot: "API/load failure surface text present",
    });
  }

  return findings;
}

async function probeInternalLinks(
  page: Page,
  stagingUrl: string,
  pagePath: string,
): Promise<DetectorResult[]> {
  const hrefs = await page.evaluate(() => {
    return Array.from(document.querySelectorAll("a[href^='/']"))
      .slice(0, 5)
      .map((anchor) => anchor.getAttribute("href"))
      .filter((href): href is string => Boolean(href))
      .map((href) => (href.startsWith("/") ? href : `/${href}`));
  });

  const findings: DetectorResult[] = [];
  const base = stagingUrl.replace(/\/+$/, "");

  for (const href of hrefs) {
    if (href === pagePath) continue;
    try {
      const target = `${base}${href}`;
      const response = await page.request.get(target, { timeout: 4_000 });
      if (response.status() >= 400) {
        findings.push({
          issue: `Linked route failed with HTTP ${response.status()}: ${href}`,
          severity: response.status() >= 500 ? "high" : "medium",
          category: "navigation",
          selector: `a[href='${href}']`,
        });
      }
    } catch {
      findings.push({
        issue: `Linked route probe failed: ${href}`,
        severity: "medium",
        category: "navigation",
        selector: `a[href='${href}']`,
      });
    }
  }

  return findings;
}

async function scanSingleRoute(
  browser: Browser,
  context: PageScanContext,
  options: PlaywrightStagingScanOptions,
): Promise<StagingScanFinding[]> {
  const pageTimeoutMs = options.pageTimeoutMs ?? DEFAULT_PAGE_TIMEOUT_MS;
  const slowLoadThresholdMs = options.slowLoadThresholdMs ?? DEFAULT_SLOW_LOAD_MS;
  const page = await browser.newPage();
  const findings: StagingScanFinding[] = [];
  const started = Date.now();

  try {
    let response: Response | null = null;
    try {
      response = await page.goto(context.absoluteUrl, {
        waitUntil: "domcontentloaded",
        timeout: pageTimeoutMs,
      });
      await page.waitForLoadState("networkidle", { timeout: 2_500 }).catch(() => undefined);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      const evidence = await captureIssueScreenshot(page, context, {
        issue: `Page failed to load: ${reason}`,
        severity: "critical",
        category: "functional",
      });
      findings.push(
        buildFinding(
          context,
          {
            issue: `Page failed to load: ${reason}`,
            severity: "critical",
            category: "functional",
          },
          evidence,
          { load_error: reason, http_status: response?.status() ?? null },
        ),
      );
      return findings;
    }

    const loadTimeMs = Date.now() - started;
    if (loadTimeMs > slowLoadThresholdMs) {
      const detector: DetectorResult = {
        issue: `Slow page load detected (${loadTimeMs}ms)`,
        severity: "low",
        category: "ux",
      };
      const evidence = await captureIssueScreenshot(page, context, detector);
      findings.push(
        buildFinding(context, detector, evidence, {
          load_time_ms: loadTimeMs,
          http_status: response?.status() ?? null,
        }),
      );
    }

    const detectors = [
      ...(await detectUiAndUxIssues(page)),
      ...(await detectFunctionalIssues(page, response, context.absoluteUrl)),
      ...(await probeInternalLinks(page, context.stagingUrl, context.pageUrl)),
    ];

    for (const detector of detectors) {
      const evidence = await captureIssueScreenshot(page, context, detector);
      findings.push(
        buildFinding(context, detector, evidence, {
          load_time_ms: loadTimeMs,
          http_status: response?.status() ?? null,
        }),
      );
    }
  } finally {
    await page.close().catch(() => undefined);
  }

  return findings;
}

export async function runPlaywrightStagingScan(
  agent: AgentOpsRuntimeAgentRow,
  stagingUrl: string,
  options: PlaywrightStagingScanOptions = {},
): Promise<StagingScanFinding[]> {
  const guard = assertStagingScanUrl(stagingUrl);
  if (!guard.ok) {
    throw new Error(guard.error);
  }

  const normalizedStagingUrl = guard.normalizedUrl;
  const scopedRoutes = resolveScopedRoutes(agent);
  const maxRoutes =
    typeof options.maxRoutes === "number" && options.maxRoutes > 0
      ? options.maxRoutes
      : scopedRoutes.length;
  const routes = scopedRoutes.slice(0, maxRoutes);
  const screenshotDir =
    options.screenshotDir ?? join(REPO_ROOT, "qa-agent", "reports", "runtime-scans");

  await honorCancelCheckpoint(options.cancelCheck, "before_browser_launch");

  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ headless: true });
  const allFindings: StagingScanFinding[] = [];

  try {
    for (const route of routes) {
      await honorCancelCheckpoint(options.cancelCheck, "before_route");
      const pageUrl = route.startsWith("/") ? route : `/${route}`;
      const context: PageScanContext = {
        agent,
        stagingUrl: normalizedStagingUrl,
        pageUrl,
        absoluteUrl: buildAbsolutePageUrl(normalizedStagingUrl, pageUrl),
        screenshotDir,
      };
      const routeFindings = await scanSingleRoute(browser, context, options);
      allFindings.push(...routeFindings);
      await honorCancelCheckpoint(options.cancelCheck, "after_route");
    }
  } finally {
    await browser.close().catch(() => undefined);
  }

  await honorCancelCheckpoint(options.cancelCheck, "after_scan_before_persist");
  return allFindings;
}
