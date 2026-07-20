/**
 * Phase D-E3 — Browser QA shell noise triage for AgentOps routes.
 * Aborted calendar/tasks HEAD probes from the app shell are known noise on
 * AgentOps pages and must not spam draft findings.
 */

const AGENTOPS_ROUTE_RE = /\/system\/agent-ops(?:\/|$)/i;
const SHELL_PROBE_PATH_RE =
  /\/(calendar_events|calendar\/events|tasks|api\/tasks|api\/calendar)(?:\?|\s|—|-|$|\/)/i;
const ABORT_RE = /abort|net::err_aborted|cancelled|canceled/i;

export type ShellNoiseClassification = {
  isShellNoise: boolean;
  reason: string | null;
};

/** True when the page under test is an AgentOps operator route. */
export function isAgentOpsBrowserQaRoute(pageUrl: string | null | undefined): boolean {
  if (!pageUrl) return false;
  try {
    const path = pageUrl.startsWith("http") ? new URL(pageUrl).pathname : pageUrl;
    return AGENTOPS_ROUTE_RE.test(path);
  } catch {
    return AGENTOPS_ROUTE_RE.test(pageUrl);
  }
}

/**
 * Classify a captured failed-request line (e.g. "HEAD https://…/tasks — net::ERR_ABORTED").
 * Only filters known shell probes on AgentOps routes — does not suppress real API failures.
 */
export function classifyBrowserQaShellNoise(input: {
  pageUrl: string | null | undefined;
  failedRequestLine: string;
}): ShellNoiseClassification {
  const line = input.failedRequestLine.trim();
  if (!line) return { isShellNoise: false, reason: null };
  if (!isAgentOpsBrowserQaRoute(input.pageUrl)) {
    return { isShellNoise: false, reason: null };
  }
  const isHead = /^HEAD\s+/i.test(line) || /\bHEAD\b/.test(line.split("—")[0] ?? "");
  const isProbePath = SHELL_PROBE_PATH_RE.test(line);
  const isAbort = ABORT_RE.test(line);
  if (isHead && isProbePath && isAbort) {
    return {
      isShellNoise: true,
      reason:
        "Known app-shell prefetch/probe abort (calendar/tasks HEAD) on AgentOps route — not Agent Detail product failure.",
    };
  }
  if (isProbePath && isAbort) {
    return {
      isShellNoise: true,
      reason:
        "Known app-shell calendar/tasks probe abort on AgentOps route — filtered from Browser QA findings.",
    };
  }
  return { isShellNoise: false, reason: null };
}

export function filterBrowserQaFailedRequests(
  pageUrl: string | null | undefined,
  failedRequests: string[],
): { kept: string[]; filtered: string[]; filteredReasons: string[] } {
  const kept: string[] = [];
  const filtered: string[] = [];
  const filteredReasons: string[] = [];
  for (const line of failedRequests) {
    const classified = classifyBrowserQaShellNoise({ pageUrl, failedRequestLine: line });
    if (classified.isShellNoise) {
      filtered.push(line);
      if (classified.reason) filteredReasons.push(classified.reason);
    } else {
      kept.push(line);
    }
  }
  return { kept, filtered, filteredReasons };
}
