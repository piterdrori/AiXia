/**
 * USL v1 — dynamic/runtime display normalization (display layer only).
 */

import type { IssueTimelineEvent, LifecycleRailStep } from "@/lib/agentops/executionLifecycle";

import { normalizeDisplayString } from "./uslDisplayNormalizer";

export function normalizeLifecycleStepsForDisplay(steps: LifecycleRailStep[]): LifecycleRailStep[] {
  return steps.map((step) => ({
    ...step,
    label: normalizeDisplayString(step.label),
    explanation: normalizeDisplayString(step.explanation),
    nextAction: normalizeDisplayString(step.nextAction),
  }));
}

export function normalizeTimelineEventsForDisplay(
  events: IssueTimelineEvent[],
): IssueTimelineEvent[] {
  return events.map((event) => ({
    ...event,
    title: normalizeDisplayString(event.title),
    summary: normalizeDisplayString(event.summary),
    source: normalizeDisplayString(event.source),
  }));
}

export function normalizeRuntimeDisplayText(text: string): string {
  return normalizeDisplayString(text);
}
