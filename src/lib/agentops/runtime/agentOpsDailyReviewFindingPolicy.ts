/**
 * Phase 5H — daily review finding classification and quality gates.
 */

import { createHash } from "node:crypto";

import type { DailyFindingKind } from "./canonicalAgentDailyReview";
import { classifyMonitoringFindingKind } from "./agentOpsMonitoringFindingClassifier";
import type { StagingScanFinding, StagingScanSeverity } from "./stagingScanTypes";

export type DailyReviewFinding = {
  findingKind: DailyFindingKind;
  title: string;
  route: string;
  module: string | null;
  issue: string;
  severity: StagingScanSeverity;
  evidence: Record<string, unknown>;
  confidence: number;
  priority: "low" | "medium" | "high";
  expectedBenefit: string | null;
  implementationComplexity: "low" | "medium" | "high";
  suggestedFix: string | null;
  suggestedFixPrompt: string | null;
  duplicateKey: string;
  evidenceQuality: "high" | "medium" | "low";
};

const LOW_VALUE_PATTERNS = [
  /\bmake it more modern\b/i,
  /\badd ai\b/i,
  /\bimprove design\b/i,
  /\bmake it faster\b/i,
  /\blooks better\b/i,
  /\bmore beautiful\b/i,
];

function readRoute(finding: StagingScanFinding): string {
  const route = finding.evidence.route;
  if (typeof route === "string" && route.trim()) {
    return route.startsWith("/") ? route : `/${route}`;
  }
  return finding.page_url.startsWith("/") ? finding.page_url : `/${finding.page_url}`;
}

function hasPlaywrightEvidence(finding: StagingScanFinding): boolean {
  return finding.evidence.scan_mode === "playwright";
}

export function isLowValueSuggestion(text: string): boolean {
  return LOW_VALUE_PATTERNS.some((pattern) => pattern.test(text));
}

export function buildDailyDuplicateKey(input: {
  findingKind: DailyFindingKind;
  route: string;
  category: string;
  normalizedTitle: string;
}): string {
  const raw = `${input.findingKind}|${input.route}|${input.category}|${input.normalizedTitle}`.toLowerCase();
  return createHash("sha256").update(raw).digest("hex");
}

export function classifyScanFindingForDaily(
  finding: StagingScanFinding,
  agentSlug: string,
): DailyReviewFinding | null {
  if (!hasPlaywrightEvidence(finding)) return null;

  const route = readRoute(finding);
  const monitoringKind = classifyMonitoringFindingKind(finding);
  const findingKind: DailyFindingKind = monitoringKind === "error" ? "ERROR" : "IMPROVEMENT";
  const severity = finding.severity ?? "medium";
  const normalizedTitle = finding.issue.trim().slice(0, 180);

  if (isLowValueSuggestion(normalizedTitle)) return null;

  const duplicateKey = buildDailyDuplicateKey({
    findingKind,
    route,
    category: String(finding.evidence.category ?? "daily_review"),
    normalizedTitle,
  });

  const confidence =
    severity === "critical" ? 0.9 : severity === "high" ? 0.8 : severity === "medium" ? 0.65 : 0.5;

  if (findingKind === "ERROR" && confidence < 0.55) return null;

  return {
    findingKind,
    title:
      findingKind === "ERROR"
        ? `[Monitoring draft] ${normalizedTitle}`.slice(0, 240)
        : `[Improvement proposal] ${normalizedTitle}`.slice(0, 240),
    route,
    module: null,
    issue: finding.issue,
    severity,
    evidence: {
      ...finding.evidence,
      findingKind,
      agentPerspective: agentSlug,
      draftKind: findingKind === "ERROR" ? "error" : "improvement",
      reportingAgents: [agentSlug],
      reproductionSummary: `Detected during daily 12-agent review on ${route}.`,
      suggestedFix: `Investigate and fix ${finding.issue} on ${route}.`,
    },
    confidence,
    priority: severity === "high" || severity === "critical" ? "high" : severity === "medium" ? "medium" : "low",
    expectedBenefit:
      findingKind === "ERROR"
        ? `Restore correct behavior on ${route}.`
        : `Improve usability or consistency on ${route}.`,
    implementationComplexity: findingKind === "ERROR" ? "medium" : "low",
    suggestedFix:
      findingKind === "ERROR"
        ? `Fix ${finding.issue} on ${route} using AiXia shared components.`
        : null,
    suggestedFixPrompt:
      findingKind === "ERROR"
        ? `Fix staging issue on ${route}: ${finding.issue}. Preserve business logic and AiXia standards.`
        : `Propose a staging-safe improvement for ${route}: ${finding.issue}.`,
    duplicateKey,
    evidenceQuality: hasPlaywrightEvidence(finding) ? "high" : "medium",
  };
}

export function buildNoFindingDailyResult(input: {
  agentSlug: string;
  routesReviewed: string[];
  note: string;
}): DailyReviewFinding {
  const route = input.routesReviewed[0] ?? "/system/agent-ops";
  return {
    findingKind: "NO_FINDING",
    title: `[Daily review] No credible actionable finding`,
    route,
    module: null,
    issue: input.note,
    severity: "low",
    evidence: {
      findingKind: "NO_FINDING",
      draftKind: "observation",
      routesReviewed: input.routesReviewed,
      agentPerspective: input.agentSlug,
      reviewCompleted: true,
    },
    confidence: 0.4,
    priority: "low",
    expectedBenefit: null,
    implementationComplexity: "low",
    suggestedFix: null,
    suggestedFixPrompt: null,
    duplicateKey: buildDailyDuplicateKey({
      findingKind: "NO_FINDING",
      route,
      category: "no_finding",
      normalizedTitle: `${input.agentSlug}|${input.routesReviewed.join(",")}`,
    }),
    evidenceQuality: "medium",
  };
}

export function dailyFindingToIssueDraftCandidate(
  finding: DailyReviewFinding,
  agentSlug: string,
): {
  agentSlug: string;
  module: string | null;
  route: string;
  issueType: string;
  severity: StagingScanSeverity;
  title: string;
  summary: string;
  evidence: Record<string, unknown>;
  browserQaEvidence: Record<string, unknown>;
  suggestedFixPrompt: string | null;
  confidence: number;
  duplicateKey: string;
  draftKind?: "error" | "improvement" | "new_feature";
} | null {
  if (finding.findingKind === "NO_FINDING" || finding.findingKind === "OBSERVATION") return null;

  const draftKind =
    finding.findingKind === "ERROR"
      ? "error"
      : finding.findingKind === "NEW_FEATURE"
        ? "new_feature"
        : "improvement";

  const browserQaEvidence = {
    scan_mode: finding.evidence.scan_mode ?? "playwright",
    route: finding.route,
    absolute_url: finding.evidence.absolute_url ?? null,
    category: finding.evidence.category ?? draftKind,
    scanned_at: finding.evidence.scanned_at ?? new Date().toISOString(),
  };

  return {
    agentSlug,
    module: finding.module,
    route: finding.route,
    issueType: String(finding.evidence.category ?? draftKind),
    severity: finding.severity,
    title: finding.title,
    summary: finding.issue,
    evidence: finding.evidence,
    browserQaEvidence,
    suggestedFixPrompt: finding.suggestedFixPrompt,
    confidence: finding.confidence,
    duplicateKey: finding.duplicateKey,
    draftKind,
  };
}
