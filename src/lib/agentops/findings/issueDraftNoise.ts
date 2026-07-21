/**
 * Phase E-A1 — classify known AgentOps shell-noise drafts for owner review UI.
 * Does not delete rows. Creation-time filtering lives in Browser QA engine + shell noise helpers.
 */

import {
  classifyBrowserQaShellNoise,
  isAgentOpsBrowserQaRoute,
} from "@/lib/agentops/browserQa/browserQaShellNoise";

const SHELL_PROBE_RE =
  /\/(calendar_events|calendar\/events|tasks|api\/tasks|api\/calendar)/i;
const ABORT_RE = /abort|net::err_aborted|cancelled|canceled/i;

export type DraftNoiseView = {
  likelyShellNoise: boolean;
  reason: string | null;
  badgeLabel: string | null;
};

function collectEvidenceLines(input: {
  title?: string | null;
  summary?: string | null;
  evidence?: Record<string, unknown> | null;
  browserQaEvidence?: Record<string, unknown> | null;
}): string[] {
  const lines: string[] = [];
  const push = (value: unknown) => {
    if (typeof value === "string" && value.trim()) lines.push(value.trim());
  };
  push(input.title);
  push(input.summary);
  const evidence = input.evidence ?? {};
  const bqa = input.browserQaEvidence ?? {};
  push(evidence.evidence);
  push(bqa.evidence);
  push(evidence.failedRequests);
  push(bqa.failedRequests);
  for (const key of ["rawObservations", "failed_requests", "network"]) {
    const raw = evidence[key] ?? bqa[key];
    if (Array.isArray(raw)) {
      for (const item of raw) push(item);
    } else {
      push(raw);
    }
  }
  return lines;
}

/**
 * True when a draft looks like the known calendar/tasks HEAD abort shell probe
 * on an AgentOps route (or AgentOps-scoped module).
 */
export function classifyLikelyShellNoiseDraft(input: {
  title?: string | null;
  summary?: string | null;
  route?: string | null;
  module?: string | null;
  evidence?: Record<string, unknown> | null;
  browserQaEvidence?: Record<string, unknown> | null;
}): DraftNoiseView {
  const route =
    input.route ??
    (typeof input.browserQaEvidence?.route === "string"
      ? input.browserQaEvidence.route
      : null) ??
    (typeof input.evidence?.route === "string" ? input.evidence.route : null);
  const pageUrl =
    route ||
    (input.module === "agent-ops" ? "/system/agent-ops" : null) ||
    null;

  const lines = collectEvidenceLines(input);
  for (const line of lines) {
    const classified = classifyBrowserQaShellNoise({
      pageUrl,
      failedRequestLine: line,
    });
    if (classified.isShellNoise) {
      return {
        likelyShellNoise: true,
        reason: classified.reason,
        badgeLabel: "Likely shell noise",
      };
    }
  }

  // Fallback: title/summary patterns when evidence is collapsed into one string.
  const blob = lines.join("\n");
  const onAgentOps =
    isAgentOpsBrowserQaRoute(pageUrl) || input.module === "agent-ops";
  if (
    onAgentOps &&
    SHELL_PROBE_RE.test(blob) &&
    ABORT_RE.test(blob) &&
    /failed or errored network|network request/i.test(
      `${input.title ?? ""} ${input.summary ?? ""}`,
    )
  ) {
    return {
      likelyShellNoise: true,
      reason:
        "Known app-shell calendar/tasks abort pattern on AgentOps route — likely not a product defect.",
      badgeLabel: "Likely shell noise",
    };
  }

  return { likelyShellNoise: false, reason: null, badgeLabel: null };
}

/** Reject creating a network-failure draft when remaining evidence is empty after shell filter. */
export function shouldSkipFailedRequestDraft(input: {
  pageUrl: string | null | undefined;
  findingType: string;
  evidenceText: string | null | undefined;
}): boolean {
  if (input.findingType !== "failed_requests") return false;
  const text = (input.evidenceText ?? "").trim();
  if (!text) return true;
  const parts = text.split(/\s*\|\s*/).map((part) => part.trim()).filter(Boolean);
  if (parts.length === 0) return true;
  return parts.every(
    (line) =>
      classifyBrowserQaShellNoise({
        pageUrl: input.pageUrl,
        failedRequestLine: line,
      }).isShellNoise,
  );
}
