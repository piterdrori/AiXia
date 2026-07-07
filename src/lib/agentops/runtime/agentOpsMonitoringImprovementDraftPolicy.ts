/**
 * Phase 5G — weekly improvement proposals via issue draft queue (draft_kind=improvement).
 */

import { createHash } from "node:crypto";

import {
  canCreateMonitoringIssueDraft,
  mapFindingToResponsibleAgent,
  resolveModuleFromRoute,
  sanitizeFindingEvidence,
  type MonitoringIssueDraftCandidate,
} from "./agentOpsMonitoringIssueDraftPolicy";
import {
  classifyMonitoringFindingKind,
  improvementPriorityFromSeverity,
  mapImprovementCategory,
  type ImprovementProposalCategory,
} from "./agentOpsMonitoringFindingClassifier";
import type { MonitoringScheduledRunReport } from "./agentOpsMonitoringScheduledReport";
import type { StagingScanFinding } from "./stagingScanTypes";

export function buildImprovementDuplicateKey(input: {
  route: string;
  category: ImprovementProposalCategory;
  normalizedTitle: string;
}): string {
  const raw = `improvement|${input.route}|${input.category}|${input.normalizedTitle}`.toLowerCase();
  return createHash("sha256").update(raw).digest("hex");
}

function readRouteFromFinding(finding: StagingScanFinding): string {
  const fromEvidence = finding.evidence.route;
  if (typeof fromEvidence === "string" && fromEvidence.trim()) {
    return fromEvidence.startsWith("/") ? fromEvidence : `/${fromEvidence}`;
  }
  return finding.page_url.startsWith("/") ? finding.page_url : `/${finding.page_url}`;
}

export function canCreateMonitoringImprovementDraft(context: {
  report: MonitoringScheduledRunReport;
  finding: StagingScanFinding;
  agentSlug?: string;
}): string | null {
  const baseError = canCreateMonitoringIssueDraft({
    report: context.report,
    finding: context.finding,
    agentSlug: context.agentSlug ?? "qa-agent",
  });
  if (baseError) return baseError;

  if (context.report.scheduleMeta?.monitoringMode !== "weekly_improvement") {
    return "Improvement drafts require weekly_improvement monitoring mode.";
  }

  if (classifyMonitoringFindingKind(context.finding) !== "improvement") {
    return "Finding is classified as an operational error, not an improvement opportunity.";
  }

  return null;
}

export function buildMonitoringImprovementDraftCandidate(
  finding: StagingScanFinding,
  runContext: {
    report: MonitoringScheduledRunReport;
    agentSlug: string;
  },
): MonitoringIssueDraftCandidate {
  const route = readRouteFromFinding(finding);
  const agentSlug = mapFindingToResponsibleAgent(finding, runContext.agentSlug);
  const module = resolveModuleFromRoute(route);
  const proposalCategory = mapImprovementCategory(finding);
  const severity = finding.severity ?? "low";
  const priority = improvementPriorityFromSeverity(severity);
  const compactEvidence = sanitizeFindingEvidence(finding.evidence);
  const normalizedTitle = finding.issue.trim().slice(0, 180);

  const browserQaEvidence = {
    scan_mode: compactEvidence.scan_mode ?? "playwright",
    route: compactEvidence.route ?? route,
    absolute_url: compactEvidence.absolute_url ?? null,
    http_status: compactEvidence.http_status ?? null,
    screenshot_path: compactEvidence.screenshot_path ?? null,
    category: proposalCategory,
    scanned_at: compactEvidence.scanned_at ?? runContext.report.endedAt,
  };

  const evidence = {
    ...compactEvidence,
    draftKind: "improvement",
    proposalCategory,
    currentProblemOrOpportunity: finding.issue,
    observation: finding.issue,
    expectedBenefit: `Improve ${proposalCategory.replace(/_/g, " ")} on ${route}.`,
    suggestedImplementation: `Review evidence on ${route} and propose a focused AiXia-standard improvement.`,
    risk: "Low — proposal only; no automatic code change.",
    priority,
    reportingAgents: [agentSlug],
    sourceMonitoringRun: runContext.report.runId,
    reproductionSummary: `Observed during weekly improvement review on ${route}.`,
    likelyCause: "Opportunity identified from staging scan heuristics — not a confirmed defect.",
    suggestedFix: null,
  };

  const title = `[Improvement proposal] ${normalizedTitle}`.slice(0, 240);
  const summary = [
    `Weekly improvement proposal for ${route} (${proposalCategory}).`,
    finding.issue,
    `Expected benefit: clearer, faster, or more consistent experience.`,
    runContext.report.targetBaseUrl ? `Target: ${runContext.report.targetBaseUrl}` : null,
  ]
    .filter(Boolean)
    .join(" ");

  const candidate: MonitoringIssueDraftCandidate = {
    agentSlug,
    module,
    route,
    issueType: proposalCategory,
    severity,
    title,
    summary,
    evidence,
    browserQaEvidence,
    suggestedFixPrompt: `Propose a staging-safe improvement for ${route}: ${finding.issue}. Use AiXia shared components and design-system standards. Do not treat this as a confirmed bug unless evidence shows failure.`,
    confidence: priority === "high" ? 0.75 : priority === "medium" ? 0.6 : 0.45,
    duplicateKey: "",
    draftKind: "improvement",
  };

  candidate.duplicateKey = buildImprovementDuplicateKey({
    route,
    category: proposalCategory,
    normalizedTitle,
  });
  return candidate;
}

export function buildMonitoringErrorDraftCandidateEnhanced(
  finding: StagingScanFinding,
  runContext: {
    report: MonitoringScheduledRunReport;
    agentSlug: string;
  },
  base: MonitoringIssueDraftCandidate,
): MonitoringIssueDraftCandidate {
  const route = base.route;
  return {
    ...base,
    evidence: {
      ...base.evidence,
      draftKind: "error",
      reproductionSummary: `Detected during operational monitoring on ${route}.`,
      likelyCause:
        typeof finding.evidence.likely_cause === "string"
          ? finding.evidence.likely_cause
          : "See Browser QA evidence and HTTP/DOM signals.",
      suggestedFix:
        typeof finding.evidence.suggested_fix === "string"
          ? finding.evidence.suggested_fix
          : `Investigate and fix ${finding.issue} on ${route}.`,
      reportingAgents: [base.agentSlug],
      sourceMonitoringRun: runContext.report.runId,
      duplicateKey: base.duplicateKey,
    },
    suggestedFixPrompt:
      base.suggestedFixPrompt ??
      `Fix staging issue on ${route}: ${finding.issue}. Preserve business logic and AiXia design standards.`,
    draftKind: "error",
  };
}
