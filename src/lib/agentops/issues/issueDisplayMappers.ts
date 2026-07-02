import { normalizeDisplayString } from "@/lib/agentops/usl";
import type { IssueTimelineEvent, LifecycleRailStep } from "@/lib/agentops/executionLifecycle";
import { normalizeLifecycleStepsForDisplay, normalizeTimelineEventsForDisplay } from "@/lib/agentops/usl/uslDynamicDisplay";

/** Issue-surface display shim — vocabulary only; no logic or authority changes. */
const ISSUE_LAYER_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\bexecution state\b/gi, "behavior status"],
  [/\bexecution status\b/gi, "behavior status"],
  [/\bexecution request prepared\b/gi, "handoff request prepared"],
  [/\bexecution request\b/gi, "handoff request"],
  [/\bexecution:\s*/gi, "Behavior status: "],
  [/\bexecution\b/gi, "behavior"],
  [/\bfix plan\b/gi, "diagnostic trace"],
  [/\bfix planning\b/gi, "diagnostic trace review"],
  [/\bfix issue\b/gi, "open issue workspace"],
  [/\bresolution\b/gi, "outcome (observed)"],
  [/\bresolved\b/gi, "outcome recorded"],
  [/\bfixed issues\b/gi, "outcomes recorded (observed)"],
  [/\bfixed today\b/gi, "stored validation today"],
  [/\bfixed this week\b/gi, "stored validation this week"],
  [/\btotal fixed\b/gi, "total outcomes (observed)"],
  [/\bmarked fixed\b/gi, "awaiting stored validation"],
  [/\bverified fixed\b/gi, "stored validation verified"],
  [/\bmark verified fixed\b/gi, "record stored validation"],
  [/\brecommended action\b/gi, "suggested trace"],
  [/\bnext recommended(?: action| step)?\b/gi, "suggested trace"],
  [/\brecommendation\b/gi, "suggested trace"],
  [/\brecommended\b/gi, "suggested"],
  [/\bpriority\b/gi, "signal strength"],
  [/\binsight\b/gi, "observation"],
  [/\bUI helper\b/gi, "display layer"],
  [/\bUI indicator\b/gi, "status (observed)"],
  [/\bpost-fix review\b/gi, "post-cursor behavior trace review"],
];

export function normalizeIssueDisplayString(text: string): string {
  if (!text) return text;
  let out = text;
  for (const [pattern, replacement] of ISSUE_LAYER_REPLACEMENTS) {
    out = out.replace(pattern, replacement);
  }
  return normalizeDisplayString(out);
}

export function issueBehaviorStatusLabel(rawStateLabel: string): string {
  return normalizeIssueDisplayString(rawStateLabel);
}

export function issueStatusDisplayLabel(status: string): string {
  return normalizeIssueDisplayString(status);
}

export function normalizeIssueLifecycleStepsForDisplay(steps: LifecycleRailStep[]): LifecycleRailStep[] {
  return normalizeLifecycleStepsForDisplay(steps).map((step) => ({
    ...step,
    label: normalizeIssueDisplayString(step.label),
    explanation: normalizeIssueDisplayString(step.explanation),
    nextAction: normalizeIssueDisplayString(step.nextAction),
  }));
}

export function normalizeIssueTimelineEventsForDisplay(events: IssueTimelineEvent[]): IssueTimelineEvent[] {
  return normalizeTimelineEventsForDisplay(events).map((event) => ({
    ...event,
    title: normalizeIssueDisplayString(event.title),
    summary: normalizeIssueDisplayString(event.summary),
    source: normalizeIssueDisplayString(event.source),
  }));
}
