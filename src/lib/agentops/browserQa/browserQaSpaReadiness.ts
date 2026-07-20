/**
 * SPA hydration readiness waits for Browser QA — avoids false empty-page findings.
 */

import type { Page } from "playwright";

import type { BrowserQaReadinessEvidence } from "@/lib/agentops/browserQa/browserQaRunResult";
import { resolveRouteExpectation } from "@/lib/agentops/browserQa/browserQaRouteExpectations";

export const SPA_READINESS_TIMEOUT_MS = 15_000;
const BODY_EMPTY_THRESHOLD = 20;

export function buildRouteReadinessSignals(targetUrl: string): string[] {
  const expectation = resolveRouteExpectation(targetUrl);
  if (!expectation) return [];

  return [
    expectation.expectedHeading,
    expectation.expectedSubtitle,
    ...expectation.expectedSignals,
  ];
}

function countMatchedSignals(bodyText: string, signals: string[]): {
  matchedSignals: string[];
  missingSignals: string[];
} {
  const matchedSignals: string[] = [];
  const missingSignals: string[] = [];
  const normalizedBody = bodyText.toLowerCase();

  for (const signal of signals) {
    if (normalizedBody.includes(signal.toLowerCase())) {
      matchedSignals.push(signal);
    } else {
      missingSignals.push(signal);
    }
  }

  return { matchedSignals, missingSignals };
}

export function finalizeReadinessFromBody(
  readiness: BrowserQaReadinessEvidence,
  bodyText: string,
  targetUrl: string,
): BrowserQaReadinessEvidence {
  const expectation = resolveRouteExpectation(targetUrl);
  const signals = buildRouteReadinessSignals(targetUrl);
  const { matchedSignals, missingSignals } = countMatchedSignals(bodyText, signals);

  if (!expectation || signals.length === 0) {
    return {
      ...readiness,
      ready: bodyText.length >= BODY_EMPTY_THRESHOLD,
      matchedSignals,
      missingSignals,
      bodyTextLength: bodyText.length,
    };
  }

  const minRequired = expectation.minSignalsRequired ?? 4;
  const headingMatched = matchedSignals.includes(expectation.expectedHeading);
  const subtitleMatched = matchedSignals.includes(expectation.expectedSubtitle);
  const ready =
    headingMatched && subtitleMatched && matchedSignals.length >= minRequired;

  return {
    ...readiness,
    ready,
    matchedSignals,
    missingSignals,
    bodyTextLength: bodyText.length,
  };
}

async function readRawBodyText(page: Page): Promise<string> {
  return ((await page.locator("body").innerText().catch(() => "")) ?? "").replace(/\s+/g, " ").trim();
}

export function formatBodySample(bodyText: string): string {
  return bodyText.slice(0, 1_200);
}

type PageReadinessArgs = {
  signalList: string[];
  bodyEmptyThreshold: number;
};

async function waitForPageReadiness(
  page: Page,
  signals: string[],
  timeoutMs: number,
): Promise<boolean> {
  try {
    await page.waitForFunction(
      ({ signalList, bodyEmptyThreshold }: PageReadinessArgs) => {
        const text = (document.body?.innerText || "").toLowerCase();
        const navVisible = Boolean(
          document.querySelector('nav, aside, [class*="sidebar"], [data-testid="sidebar"]'),
        );

        if (signalList.length > 0) {
          const matchedCount = signalList.filter((signal) =>
            text.includes(signal.toLowerCase()),
          ).length;
          return matchedCount >= 4 || navVisible;
        }

        return text.trim().length >= bodyEmptyThreshold || navVisible;
      },
      { signalList: signals, bodyEmptyThreshold: BODY_EMPTY_THRESHOLD },
      { timeout: timeoutMs },
    );
    return true;
  } catch {
    return false;
  }
}

export async function waitForRouteSpaReadiness(
  page: Page,
  targetUrl: string,
  timeoutMs: number = SPA_READINESS_TIMEOUT_MS,
): Promise<BrowserQaReadinessEvidence> {
  const signals = buildRouteReadinessSignals(targetUrl);
  const expectation = resolveRouteExpectation(targetUrl);
  let ready = false;

  await page.waitForLoadState("domcontentloaded").catch(() => undefined);
  await page.waitForLoadState("networkidle", { timeout: 4_000 }).catch(() => undefined);

  if (expectation) {
    try {
      await page
        .getByRole("heading", {
          name: new RegExp(expectation.expectedHeading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"),
        })
        .first()
        .waitFor({ state: "visible", timeout: timeoutMs });
      ready = true;
    } catch {
      ready = await waitForPageReadiness(page, signals, Math.min(timeoutMs, 8_000));
    }
  } else if (signals.length > 0) {
    ready = await waitForPageReadiness(page, signals, timeoutMs);
  } else {
    ready = await waitForPageReadiness(page, [], timeoutMs);
  }

  const bodyText = await readRawBodyText(page);
  return finalizeReadinessFromBody(
    {
      waitedForSpa: true,
      ready,
      timeoutMs,
      matchedSignals: [],
      missingSignals: [],
      bodyTextLength: bodyText.length,
      retryUsed: false,
      reloadUsed: false,
    },
    bodyText,
    targetUrl,
  );
}

export async function readBodyTextWithSpaRetry(
  page: Page,
  targetUrl: string,
  readiness: BrowserQaReadinessEvidence,
): Promise<{ bodySample: string; readiness: BrowserQaReadinessEvidence }> {
  let bodyText = await readRawBodyText(page);
  let retryUsed = readiness.retryUsed;
  let currentReadiness = finalizeReadinessFromBody(
    { ...readiness, retryUsed },
    bodyText,
    targetUrl,
  );

  if (currentReadiness.ready && currentReadiness.bodyTextLength >= BODY_EMPTY_THRESHOLD) {
    return {
      bodySample: formatBodySample(bodyText),
      readiness: currentReadiness,
    };
  }

  if (bodyText.length < BODY_EMPTY_THRESHOLD) {
    await page.waitForTimeout(2_000);
    bodyText = await readRawBodyText(page);
    retryUsed = true;
    currentReadiness = finalizeReadinessFromBody(
      { ...readiness, retryUsed, reloadUsed: readiness.reloadUsed },
      bodyText,
      targetUrl,
    );

    if (currentReadiness.ready || bodyText.length >= BODY_EMPTY_THRESHOLD) {
      return {
        bodySample: formatBodySample(bodyText),
        readiness: currentReadiness,
      };
    }

    const bodyBeforeReload = bodyText;
    try {
      await page.reload({ waitUntil: "domcontentloaded", timeout: 8_000 });
      await page.waitForLoadState("networkidle", { timeout: 4_000 }).catch(() => undefined);

      const reReadiness = await waitForRouteSpaReadiness(page, targetUrl, readiness.timeoutMs);
      bodyText = await readRawBodyText(page);
      currentReadiness = finalizeReadinessFromBody(
        { ...reReadiness, retryUsed: true, reloadUsed: true },
        bodyText,
        targetUrl,
      );
    } catch {
      const fallbackBody =
        bodyBeforeReload.length > 0
          ? bodyBeforeReload
          : ((await readRawBodyText(page).catch(() => "")) ?? "");
      bodyText = fallbackBody;
      currentReadiness = finalizeReadinessFromBody(
        {
          ...currentReadiness,
          retryUsed: true,
          reloadUsed: true,
        },
        fallbackBody,
        targetUrl,
      );
    }
  }

  return {
    bodySample: formatBodySample(bodyText),
    readiness: finalizeReadinessFromBody(currentReadiness, bodyText, targetUrl),
  };
}

export function isUncertainBrowserQaScan(readiness?: BrowserQaReadinessEvidence): boolean {
  if (!readiness) return false;
  return !readiness.ready && readiness.bodyTextLength < 50;
}

export const UNCERTAIN_SCAN_SKIP_PROMOTION_TYPES = new Set([
  "page_identity_failed",
  "missing_app_shell",
  "empty_body",
  "protected_content_missing",
  "empty_main",
  "sparse_main",
  "missing_h1",
]);
