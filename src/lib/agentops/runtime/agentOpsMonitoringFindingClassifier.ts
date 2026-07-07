/**
 * Phase 5G — distinguish operational errors from weekly improvement opportunities.
 */

import type { StagingScanFinding, StagingScanSeverity } from "./stagingScanTypes";

export type MonitoringFindingKind = "error" | "improvement";

export type ImprovementProposalCategory =
  | "ux_improvement"
  | "accessibility_improvement"
  | "navigation_improvement"
  | "content_copy_improvement"
  | "visual_consistency"
  | "workflow_simplification"
  | "performance_improvement"
  | "mobile_responsive_improvement"
  | "empty_state_improvement"
  | "reusable_component_opportunity"
  | "product_capability_suggestion";

const ERROR_ISSUE_PATTERNS =
  /\b(broken|failed|failure|error|404|500|timeout|crash|hydration|unavailable|not found|http\s*[45]\d{2})\b/i;

const IMPROVEMENT_CATEGORY_MAP: Record<string, ImprovementProposalCategory> = {
  ux: "ux_improvement",
  ui: "visual_consistency",
  navigation: "navigation_improvement",
  accessibility: "accessibility_improvement",
  performance: "performance_improvement",
  content: "content_copy_improvement",
  copy: "content_copy_improvement",
  workflow: "workflow_simplification",
  mobile: "mobile_responsive_improvement",
  empty: "empty_state_improvement",
  component: "reusable_component_opportunity",
};

function readCategory(finding: StagingScanFinding): string {
  const raw = finding.evidence?.category;
  return typeof raw === "string" ? raw.toLowerCase() : "";
}

function readSeverity(finding: StagingScanFinding): StagingScanSeverity {
  return finding.severity ?? "medium";
}

export function classifyMonitoringFindingKind(finding: StagingScanFinding): MonitoringFindingKind {
  const category = readCategory(finding);
  const severity = readSeverity(finding);
  const issueText = finding.issue ?? "";

  if (ERROR_ISSUE_PATTERNS.test(issueText)) return "error";
  if (category === "functional" && (severity === "high" || severity === "critical")) {
    return "error";
  }
  if (category === "navigation" && /broken/i.test(issueText)) return "error";
  if (category === "functional") return "error";

  if (category === "ux" || category === "ui") return "improvement";
  if (/\b(slow|inconsistent|unclear|confusing|empty state|accessibility|friction)\b/i.test(issueText)) {
    return "improvement";
  }

  return severity === "low" || severity === "medium" ? "improvement" : "error";
}

export function mapImprovementCategory(finding: StagingScanFinding): ImprovementProposalCategory {
  const category = readCategory(finding);
  const issueText = finding.issue.toLowerCase();

  if (category && IMPROVEMENT_CATEGORY_MAP[category]) {
    return IMPROVEMENT_CATEGORY_MAP[category];
  }
  if (/accessib/i.test(issueText)) return "accessibility_improvement";
  if (/nav/i.test(issueText)) return "navigation_improvement";
  if (/empty|loading|error state/i.test(issueText)) return "empty_state_improvement";
  if (/slow|performance|latency/i.test(issueText)) return "performance_improvement";
  if (/mobile|responsive/i.test(issueText)) return "mobile_responsive_improvement";
  if (/copy|label|text/i.test(issueText)) return "content_copy_improvement";
  if (/workflow|step|wizard/i.test(issueText)) return "workflow_simplification";
  if (/component|pattern|reuse/i.test(issueText)) return "reusable_component_opportunity";
  return "ux_improvement";
}

export function improvementPriorityFromSeverity(
  severity: StagingScanSeverity,
): "low" | "medium" | "high" {
  if (severity === "high" || severity === "critical") return "high";
  if (severity === "medium") return "medium";
  return "low";
}
