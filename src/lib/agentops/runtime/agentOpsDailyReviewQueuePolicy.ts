/**
 * Phase 5H-C — daily review queue quality policy.
 * Accountability via execution rows; owner queue via ranked, capped drafts only.
 */

import type { DailyFindingKind } from "./canonicalAgentDailyReview";
import type { DailyReviewFinding } from "./agentOpsDailyReviewFindingPolicy";
import { dailyFindingToIssueDraftCandidate } from "./agentOpsDailyReviewFindingPolicy";

export const DAILY_IMPROVEMENT_MAX_PER_AGENT = 1;
export const DAILY_IMPROVEMENT_MAX_PER_RUN = 8;
export const DAILY_FEATURE_MAX_PER_AGENT = 1;
export const DAILY_FEATURE_MAX_PER_RUN = 3;
export const DAILY_MIN_CONFIDENCE_IMPROVEMENT = 0.55;
export const DAILY_MIN_CONFIDENCE_FEATURE = 0.7;

export type DailyDraftCandidate = NonNullable<ReturnType<typeof dailyFindingToIssueDraftCandidate>>;

export type DailyQueueInput = {
  agentSlug: string;
  finding: DailyReviewFinding;
  candidate: DailyDraftCandidate;
};

export type CandidateNotQueued = {
  agentSlug: string;
  route: string;
  title: string;
  findingKind: DailyFindingKind;
  reason:
    | "below_daily_quality_threshold"
    | "exceeded_agent_cap"
    | "exceeded_run_cap"
    | "near_duplicate"
    | "cross_agent_consolidated"
    | "weak_evidence"
    | "low_value_suggestion";
  rankingScore: number;
};

export type DailyQueueRunSummary = {
  candidatesDetected: number;
  candidatesQueued: number;
  candidatesNotQueued: number;
  duplicatesConsolidated: number;
  consolidationGroups: number;
  queuedByKind: { error: number; improvement: number; new_feature: number };
};

export type DailyQueueResult = {
  queued: DailyDraftCandidate[];
  notQueued: CandidateNotQueued[];
  summary: DailyQueueRunSummary;
  perAgentQueued: Map<string, number>;
};

function draftKindOf(
  candidate: DailyDraftCandidate,
): "error" | "improvement" | "new_feature" {
  return candidate.draftKind ?? "improvement";
}

export function normalizeIssuePattern(text: string): string {
  return text
    .toLowerCase()
    .replace(/\[improvement proposal\]/gi, "")
    .replace(/\[monitoring draft\]/gi, "")
    .replace(/\(\d+ms\)/g, "")
    .replace(/\b\d+ms\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function buildConsolidationKey(candidate: DailyDraftCandidate): string {
  const kind = draftKindOf(candidate);
  const pattern = normalizeIssuePattern(candidate.summary || candidate.title);
  return `${kind}|${candidate.route}|${pattern}`;
}

function agentRouteRelevance(agentSlug: string, route: string): number {
  if (agentSlug === "qa-agent") return route.startsWith("/system/agent-ops") || route.startsWith("/finance") ? 8 : 4;
  if (agentSlug === "design-agent") return route.includes("agent-ops") || route === "/dashboard" ? 8 : 5;
  if (agentSlug === "analytics-agent") return route.includes("finance") || route === "/dashboard" ? 8 : 5;
  if (agentSlug === "config-agent") return route.includes("agent-ops") || route.includes("finance") ? 7 : 4;
  if (agentSlug === "chat-agent") return route === "/dashboard" || route.includes("agent-ops") ? 7 : 3;
  if (agentSlug.includes("agent-ops") || route.includes("agent-ops")) return 6;
  return 4;
}

export function rankDailyQueueCandidate(input: DailyQueueInput): number {
  const { finding, agentSlug, candidate } = input;
  let score = 0;

  score += finding.confidence * 25;
  score += finding.evidenceQuality === "high" ? 15 : finding.evidenceQuality === "medium" ? 8 : 3;
  score += finding.priority === "high" ? 15 : finding.priority === "medium" ? 8 : 3;
  score += agentRouteRelevance(agentSlug, candidate.route);
  if (candidate.suggestedFixPrompt && candidate.suggestedFixPrompt.length > 30) score += 5;
  if (finding.findingKind === "ERROR") score += 20;
  if (finding.findingKind === "NEW_FEATURE") score += 10;
  if (finding.expectedBenefit) score += 4;
  if (finding.implementationComplexity === "low") score += 3;

  return Math.round(Math.min(100, Math.max(0, score)) * 100) / 100;
}

function passesQualityThreshold(input: DailyQueueInput): boolean {
  const kind = input.finding.findingKind;
  if (kind === "ERROR") return input.finding.confidence >= 0.55;
  if (kind === "NEW_FEATURE") return input.finding.confidence >= DAILY_MIN_CONFIDENCE_FEATURE;
  if (kind === "IMPROVEMENT") return input.finding.confidence >= DAILY_MIN_CONFIDENCE_IMPROVEMENT;
  return false;
}

function mergeConsolidatedCandidate(
  canonical: DailyQueueInput,
  merged: DailyQueueInput[],
): DailyDraftCandidate {
  const reportingAgents = [
    canonical.agentSlug,
    ...merged.map((item) => item.agentSlug),
  ].filter((slug, index, list) => list.indexOf(slug) === index);

  const boostedConfidence = Math.min(
    0.95,
    canonical.finding.confidence + Math.min(0.15, (reportingAgents.length - 1) * 0.05),
  );

  return {
    ...canonical.candidate,
    confidence: boostedConfidence,
    evidence: {
      ...canonical.candidate.evidence,
      reportingAgents,
      consolidatedFromAgents: merged.map((item) => item.agentSlug),
      consolidationGroupSize: reportingAgents.length,
    },
  };
}

export function consolidateDailyQueueInputs(inputs: DailyQueueInput[]): {
  consolidated: DailyQueueInput[];
  notQueued: CandidateNotQueued[];
  duplicatesConsolidated: number;
  consolidationGroups: number;
} {
  const groups = new Map<string, DailyQueueInput[]>();
  for (const input of inputs) {
    const key = buildConsolidationKey(input.candidate);
    const bucket = groups.get(key) ?? [];
    bucket.push(input);
    groups.set(key, bucket);
  }

  const consolidated: DailyQueueInput[] = [];
  const notQueued: CandidateNotQueued[] = [];
  let duplicatesConsolidated = 0;

  for (const members of groups.values()) {
    const ranked = [...members].sort(
      (a, b) => rankDailyQueueCandidate(b) - rankDailyQueueCandidate(a),
    );
    const canonical = ranked[0];
    const merged = ranked.slice(1);
    duplicatesConsolidated += merged.length;

    for (const dropped of merged) {
      notQueued.push({
        agentSlug: dropped.agentSlug,
        route: dropped.candidate.route,
        title: dropped.candidate.title,
        findingKind: dropped.finding.findingKind,
        reason: "cross_agent_consolidated",
        rankingScore: rankDailyQueueCandidate(dropped),
      });
    }

    consolidated.push({
      ...canonical,
      candidate: mergeConsolidatedCandidate(canonical, merged),
    });
  }

  return {
    consolidated,
    notQueued,
    duplicatesConsolidated,
    consolidationGroups: groups.size,
  };
}

export function applyDailyDraftQueueCaps(inputs: DailyQueueInput[]): DailyQueueResult {
  const detected = inputs.length;
  const { consolidated, notQueued: consolidationDropped, duplicatesConsolidated, consolidationGroups } =
    consolidateDailyQueueInputs(inputs);

  const queued: DailyDraftCandidate[] = [];
  const notQueued: CandidateNotQueued[] = [...consolidationDropped];
  const perAgentQueued = new Map<string, number>();
  const perAgentImprovement = new Map<string, number>();
  const perAgentFeature = new Map<string, number>();

  const errors = consolidated
    .filter((item) => item.finding.findingKind === "ERROR")
    .sort((a, b) => rankDailyQueueCandidate(b) - rankDailyQueueCandidate(a));

  for (const item of errors) {
    if (!passesQualityThreshold(item)) {
      notQueued.push({
        agentSlug: item.agentSlug,
        route: item.candidate.route,
        title: item.candidate.title,
        findingKind: item.finding.findingKind,
        reason: "below_daily_quality_threshold",
        rankingScore: rankDailyQueueCandidate(item),
      });
      continue;
    }
    queued.push(item.candidate);
    perAgentQueued.set(item.agentSlug, (perAgentQueued.get(item.agentSlug) ?? 0) + 1);
  }

  const improvements = consolidated
    .filter((item) => item.finding.findingKind === "IMPROVEMENT")
    .sort((a, b) => rankDailyQueueCandidate(b) - rankDailyQueueCandidate(a));

  let improvementRunCount = 0;
  for (const item of improvements) {
    const score = rankDailyQueueCandidate(item);
    if (!passesQualityThreshold(item)) {
      notQueued.push({
        agentSlug: item.agentSlug,
        route: item.candidate.route,
        title: item.candidate.title,
        findingKind: item.finding.findingKind,
        reason: "below_daily_quality_threshold",
        rankingScore: score,
      });
      continue;
    }
    if (item.finding.evidenceQuality === "low") {
      notQueued.push({
        agentSlug: item.agentSlug,
        route: item.candidate.route,
        title: item.candidate.title,
        findingKind: item.finding.findingKind,
        reason: "weak_evidence",
        rankingScore: score,
      });
      continue;
    }

    const agentCount = perAgentImprovement.get(item.agentSlug) ?? 0;
    if (agentCount >= DAILY_IMPROVEMENT_MAX_PER_AGENT) {
      notQueued.push({
        agentSlug: item.agentSlug,
        route: item.candidate.route,
        title: item.candidate.title,
        findingKind: item.finding.findingKind,
        reason: "exceeded_agent_cap",
        rankingScore: score,
      });
      continue;
    }
    if (improvementRunCount >= DAILY_IMPROVEMENT_MAX_PER_RUN) {
      notQueued.push({
        agentSlug: item.agentSlug,
        route: item.candidate.route,
        title: item.candidate.title,
        findingKind: item.finding.findingKind,
        reason: "exceeded_run_cap",
        rankingScore: score,
      });
      continue;
    }

    queued.push(item.candidate);
    perAgentImprovement.set(item.agentSlug, agentCount + 1);
    perAgentQueued.set(item.agentSlug, (perAgentQueued.get(item.agentSlug) ?? 0) + 1);
    improvementRunCount += 1;
  }

  const features = consolidated
    .filter((item) => item.finding.findingKind === "NEW_FEATURE")
    .sort((a, b) => rankDailyQueueCandidate(b) - rankDailyQueueCandidate(a));

  let featureRunCount = 0;
  for (const item of features) {
    const score = rankDailyQueueCandidate(item);
    if (!passesQualityThreshold(item)) {
      notQueued.push({
        agentSlug: item.agentSlug,
        route: item.candidate.route,
        title: item.candidate.title,
        findingKind: item.finding.findingKind,
        reason: "below_daily_quality_threshold",
        rankingScore: score,
      });
      continue;
    }

    const agentCount = perAgentFeature.get(item.agentSlug) ?? 0;
    if (agentCount >= DAILY_FEATURE_MAX_PER_AGENT) {
      notQueued.push({
        agentSlug: item.agentSlug,
        route: item.candidate.route,
        title: item.candidate.title,
        findingKind: item.finding.findingKind,
        reason: "exceeded_agent_cap",
        rankingScore: score,
      });
      continue;
    }
    if (featureRunCount >= DAILY_FEATURE_MAX_PER_RUN) {
      notQueued.push({
        agentSlug: item.agentSlug,
        route: item.candidate.route,
        title: item.candidate.title,
        findingKind: item.finding.findingKind,
        reason: "exceeded_run_cap",
        rankingScore: score,
      });
      continue;
    }

    queued.push(item.candidate);
    perAgentFeature.set(item.agentSlug, agentCount + 1);
    perAgentQueued.set(item.agentSlug, (perAgentQueued.get(item.agentSlug) ?? 0) + 1);
    featureRunCount += 1;
  }

  const queuedByKind = {
    error: queued.filter((c) => draftKindOf(c) === "error").length,
    improvement: queued.filter((c) => draftKindOf(c) === "improvement").length,
    new_feature: queued.filter((c) => draftKindOf(c) === "new_feature").length,
  };

  return {
    queued,
    notQueued,
    perAgentQueued,
    summary: {
      candidatesDetected: detected,
      candidatesQueued: queued.length,
      candidatesNotQueued: notQueued.length,
      duplicatesConsolidated,
      consolidationGroups,
      queuedByKind,
    },
  };
}

export function buildDailyQueueInputs(
  perAgentResults: Array<{
    agentSlug: string;
    findings: DailyReviewFinding[];
  }>,
): DailyQueueInput[] {
  const inputs: DailyQueueInput[] = [];
  for (const result of perAgentResults) {
    for (const finding of result.findings) {
      const candidate = dailyFindingToIssueDraftCandidate(finding, result.agentSlug);
      if (!candidate) continue;
      inputs.push({ agentSlug: result.agentSlug, finding, candidate });
    }
  }
  return inputs;
}
