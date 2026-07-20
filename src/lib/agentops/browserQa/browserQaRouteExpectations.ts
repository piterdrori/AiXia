/**
 * Locked page specifications for Browser QA route identity checks.
 * Each protected route is judged by its product spec — not generic heuristics.
 */

import type { Page } from "playwright";

import type { BrowserQaFinding } from "@/lib/agentops/browserQa/browserQaRunResult";

export type BrowserQaRouteExpectation = {
  route: string;
  expectedHeading: string;
  expectedSubtitle: string;
  expectedSignals: string[];
  /** Minimum expectedSignals that must appear in visible body text (default 4). */
  minSignalsRequired?: number;
};

export type BrowserQaPageIdentity = {
  passed: boolean;
  route: string;
  matchedHeading?: string;
  matchedSubtitle?: string;
  matchedSignals: string[];
  missingSignals: string[];
};

const LOADING_TEXT_PATTERN = /\b(loading\.\.\.|loading data|please wait|fetching)\b/i;

export const BROWSER_QA_ROUTE_EXPECTATIONS: BrowserQaRouteExpectation[] = [
  {
    route: "/system/agent-ops",
    expectedHeading: "Control Cockpit",
    expectedSubtitle: "AgentOps product entry",
    expectedSignals: [
      "Supabase",
      "Agents",
      "Issues",
      "Council",
      "Tools",
      "Staging only",
      "Product hub",
      "Main AgentOps actions",
    ],
    minSignalsRequired: 4,
  },
];

/** Primary product navigation cards on the Control Cockpit (not runtime mirrors). */
export const CONTROL_COCKPIT_PRODUCT_CARDS = [
  "Agents",
  "Issues",
  "Council",
  "Tools",
] as const;

/** Finding types that must never be promoted when page identity already passed. */
export const BROWSER_QA_FALSE_POSITIVE_FINDING_TYPES = new Set([
  "missing_agentops_heading",
]);

function normalizeRoutePath(pathname: string): string {
  const trimmed = pathname.trim();
  if (!trimmed || trimmed === "/") return "/";
  const withSlash = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return withSlash.replace(/\/+$/, "") || "/";
}

export function extractRoutePathFromUrl(targetUrl: string): string {
  try {
    return normalizeRoutePath(new URL(targetUrl).pathname);
  } catch {
    const trimmed = targetUrl.trim();
    if (!trimmed) return "/";
    const pathOnly = trimmed.split("?")[0]?.split("#")[0] ?? trimmed;
    return normalizeRoutePath(pathOnly);
  }
}

export function resolveRouteExpectation(targetUrl: string): BrowserQaRouteExpectation | null {
  const route = extractRoutePathFromUrl(targetUrl);
  return BROWSER_QA_ROUTE_EXPECTATIONS.find((entry) => entry.route === route) ?? null;
}

function signalPattern(signal: string): RegExp {
  const escaped = signal.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(escaped, "i");
}

export async function evaluateRoutePageIdentity(
  page: Page,
  expectation: BrowserQaRouteExpectation,
): Promise<BrowserQaPageIdentity> {
  const headingCount = await page
    .getByRole("heading", { name: signalPattern(expectation.expectedHeading) })
    .count();
  const headingTextCount =
    headingCount > 0
      ? headingCount
      : await page.getByText(signalPattern(expectation.expectedHeading)).count();

  const subtitleCount = await page
    .getByText(signalPattern(expectation.expectedSubtitle))
    .count();

  const bodyText = ((await page.locator("body").innerText().catch(() => "")) ?? "").replace(
    /\s+/g,
    " ",
  );

  const matchedSignals: string[] = [];
  const missingSignals: string[] = [];

  for (const signal of expectation.expectedSignals) {
    if (signalPattern(signal).test(bodyText)) {
      matchedSignals.push(signal);
    } else {
      missingSignals.push(signal);
    }
  }

  const minRequired = expectation.minSignalsRequired ?? 4;
  const headingMatched = headingTextCount > 0;
  const subtitleMatched = subtitleCount > 0;
  const passed =
    headingMatched && subtitleMatched && matchedSignals.length >= minRequired;

  return {
    passed,
    route: expectation.route,
    matchedHeading: headingMatched ? expectation.expectedHeading : undefined,
    matchedSubtitle: subtitleMatched ? expectation.expectedSubtitle : undefined,
    matchedSignals,
    missingSignals,
  };
}

type ControlCockpitModuleAudit = {
  title: string;
  hasOpenButton: boolean;
  openDisabled: boolean;
  hasStatusBadge: boolean;
  statusLabel: string | null;
};

export async function auditControlCockpitModules(page: Page): Promise<ControlCockpitModuleAudit[]> {
  return page.evaluate(() => {
    const shells = Array.from(document.querySelectorAll(".aixia-navigation-card-shell"));
    const cards =
      shells.length > 0
        ? shells
        : Array.from(document.querySelectorAll(".aixia-navigation-card, .aixia-workspace-card"));

    if (cards.length === 0) {
      return Array.from(document.querySelectorAll("article.module-card")).map((card) => {
        const title = card.querySelector(".title")?.textContent?.trim() ?? "";
        const buttons = Array.from(card.querySelectorAll("button"));
        const openButton = buttons.find((button) => /open/i.test(button.textContent ?? ""));
        const badge = card.querySelector("[class*='badge'], .aixia-badge");
        const statusLabel = badge?.textContent?.trim() ?? null;
        return {
          title,
          hasOpenButton: Boolean(openButton),
          openDisabled: openButton ? openButton.hasAttribute("disabled") : false,
          hasStatusBadge: Boolean(statusLabel),
          statusLabel,
        };
      });
    }

    return cards.map((card) => {
      const title =
        card.querySelector(".aixia-workspace-card-title")?.textContent?.trim() ??
        card.querySelector("h3")?.textContent?.trim() ??
        "";
      const buttons = Array.from(card.querySelectorAll("button"));
      const openButton = buttons.find((button) => /open|access/i.test(button.textContent ?? ""));
      const interactiveRoot =
        card.matches("button, [role='button']") ||
        card.querySelector("button.aixia-workspace-card-action-btn, .aixia-workspace-card-action-btn");
      const badge = card.querySelector(
        ".aixia-workspace-card-status, [class*='badge'], .aixia-badge",
      );
      const statusLabel = badge?.textContent?.trim() ?? null;
      return {
        title,
        hasOpenButton: Boolean(openButton || interactiveRoot),
        openDisabled: openButton ? openButton.hasAttribute("disabled") : false,
        hasStatusBadge: Boolean(statusLabel),
        statusLabel,
      };
    });
  });
}

export async function collectControlCockpitFindings(
  page: Page,
  pageIdentity: BrowserQaPageIdentity,
  expectation: BrowserQaRouteExpectation,
  bodySample: string,
  options?: { spaReady?: boolean },
): Promise<BrowserQaFinding[]> {
  const findings: BrowserQaFinding[] = [];
  const spaReady = options?.spaReady ?? true;

  if (!pageIdentity.passed) {
    if (spaReady) {
      findings.push({
        severity: "high",
        type: "page_identity_failed",
        title: "Control Cockpit page identity check failed",
        description:
          "The route loaded but did not match the locked Control Cockpit specification (heading, subtitle, or module signals).",
        evidence: [
          `expectedHeading=${expectation.expectedHeading}`,
          `matchedHeading=${pageIdentity.matchedHeading ?? "missing"}`,
          `matchedSubtitle=${pageIdentity.matchedSubtitle ?? "missing"}`,
          `matchedSignals=${pageIdentity.matchedSignals.join(", ") || "none"}`,
          `missingSignals=${pageIdentity.missingSignals.join(", ") || "none"}`,
        ].join("; "),
      });
    }
    return findings;
  }

  const loadingCount = await page.getByText(LOADING_TEXT_PATTERN).count().catch(() => 0);
  if (loadingCount > 0 || LOADING_TEXT_PATTERN.test(bodySample)) {
    findings.push({
      severity: "medium",
      type: "stale_loading_text",
      title: "Loading text still visible after network idle",
      description:
        "Control Cockpit still shows loading copy after the page reached network idle — content may be stuck or slow to hydrate.",
      evidence: bodySample.match(LOADING_TEXT_PATTERN)?.[0] ?? "loading pattern matched",
    });
  }

  const moduleAudit = await auditControlCockpitModules(page);
  const expectedModules = [...CONTROL_COCKPIT_PRODUCT_CARDS];

  for (const moduleTitle of expectedModules) {
    const card = moduleAudit.find((entry) =>
      entry.title.toLowerCase().includes(moduleTitle.toLowerCase()),
    );
    if (!card) {
      findings.push({
        severity: "medium",
        type: "missing_module_card",
        title: `Module card missing: ${moduleTitle}`,
        description: `Expected Control Cockpit module card "${moduleTitle}" was not found in the module grid.`,
      });
      continue;
    }

    if (!card.hasOpenButton) {
      findings.push({
        severity: "medium",
        type: "missing_module_open_action",
        title: `Open action missing on ${moduleTitle}`,
        description: `Module card "${moduleTitle}" has no Open button — the route may be unreachable from Control Cockpit.`,
        evidence: card.title,
      });
    } else if (card.openDisabled) {
      findings.push({
        severity: "medium",
        type: "inaccessible_module_open",
        title: `Open button disabled on ${moduleTitle}`,
        description: `Module card "${moduleTitle}" shows a disabled Open button — operators cannot reach this module.`,
        evidence: card.title,
      });
    }

    if (!card.hasStatusBadge) {
      findings.push({
        severity: "low",
        type: "missing_module_status_badge",
        title: `Status badge missing on ${moduleTitle}`,
        description: `Product card "${moduleTitle}" has no visible readiness badge (optional on product hub cards).`,
        evidence: card.title,
      });
    }
  }

  const overflow = await page.evaluate(() => {
    const root = document.documentElement;
    return root.scrollWidth - root.clientWidth;
  });
  if (overflow > 24) {
    findings.push({
      severity: "medium",
      type: "layout_overflow",
      title: "Horizontal layout overflow detected",
      description: `Control Cockpit content overflows horizontally by ~${overflow}px — cards or status bar may be clipped.`,
      evidence: String(overflow),
    });
  }

  const mainText = await page
    .locator("main, [role='main'], .page-container")
    .first()
    .innerText()
    .catch(() => "");
  if (!mainText || mainText.replace(/\s+/g, "").length < 48) {
    findings.push({
      severity: "high",
      type: "empty_main_area",
      title: "Control Cockpit main area appears empty",
      description:
        "Page identity passed but the main content region has very little visible text — module grid may not have rendered.",
      evidence: mainText.slice(0, 200) || bodySample.slice(0, 200) || undefined,
    });
  }

  return findings;
}

export function buildControlCockpitSuggestions(input: {
  pageIdentity: BrowserQaPageIdentity;
  findings: BrowserQaFinding[];
  bodySample: string;
  moduleAudit: ControlCockpitModuleAudit[];
  consoleErrors: string[];
  failedRequests: string[];
}): string[] {
  const suggestions: string[] = [];
  const { pageIdentity, findings, bodySample, moduleAudit, consoleErrors, failedRequests } =
    input;

  if (!pageIdentity.passed) {
    suggestions.push(
      "Restore Control Cockpit heading (Control Cockpit), subtitle, and four product cards (Agents, Issues, Council, Tools) per the locked /system/agent-ops spec before re-running Browser QA.",
    );
    return suggestions;
  }

  suggestions.push(
    `Page identity verified (${pageIdentity.matchedHeading} + ${pageIdentity.matchedSignals.length} product/status signals) — use product cards as the primary navigation hub.`,
  );

  if (/supabase:\s*not\s*ready/i.test(bodySample)) {
    suggestions.push(
      "Supabase badge shows NOT READY — verify VITE_SUPABASE_URL and connection before relying on AgentOps runtime data.",
    );
  } else if (/supabase:\s*connected/i.test(bodySample)) {
    suggestions.push(
      "Supabase shows CONNECTED — add explicit session/auth status beside Supabase so operators can distinguish DB reachability from signed-in state.",
    );
  }

  if (/runtime:\s*scheduled/i.test(bodySample)) {
    suggestions.push(
      "Runtime badge is SCHEDULED — expose next run time or last successful agent cycle on Control Cockpit for operator clarity.",
    );
  }

  if (!/browser\s*qa/i.test(bodySample)) {
    suggestions.push(
      'Add a "Last Browser QA" status chip on Control Cockpit so operators see scan freshness without opening Memory Agent chat.',
    );
  }

  const notReadyModules = moduleAudit
    .filter((card) => card.statusLabel && /not\s*ready|broken|degraded/i.test(card.statusLabel))
    .map((card) => card.title)
    .filter(Boolean);

  if (notReadyModules.length > 0) {
    suggestions.push(
      `Modules not fully ready (${notReadyModules.join(", ")}) — show a guided next action (setup link, doc, or blocker reason) on each card.`,
    );
  } else if (moduleAudit.length > 0) {
    suggestions.push(
      "All module cards show OK — add per-module readiness hints (e.g. active agent count, open issue count) where data is available.",
    );
  }

  if (pageIdentity.matchedSignals.some((signal) => /issues/i.test(signal))) {
    suggestions.push(
      "Issues module is reachable — surface open issue counts on the card only when the Issues registry is production-ready to avoid misleading zeros.",
    );
  }

  if (findings.some((finding) => finding.type === "stale_loading_text")) {
    suggestions.push(
      "Resolve stale loading copy on Control Cockpit — ensure module grid and status bar finish hydrating before network idle.",
    );
  }

  if (findings.some((finding) => finding.type.startsWith("missing_module"))) {
    suggestions.push(
      "Restore missing module cards and Open actions so every AgentOps submodule is reachable from Control Cockpit.",
    );
  }

  if (consoleErrors.length > 0) {
    suggestions.push(
      "Fix JavaScript console errors on Control Cockpit — they may prevent module cards or status badges from updating.",
    );
  }

  if (failedRequests.length > 0) {
    suggestions.push(
      "Investigate failing network requests on Control Cockpit — API failures can leave status badges stale or modules NOT_READY.",
    );
  }

  return suggestions.slice(0, 8);
}
