import type { AgentOpsFinding } from "../types";
import type { AgentOpsRuntimeIssueRow } from "../db/agentOpsRuntimeTypes";
import { AGENT_IDENTITY_DEFINITIONS } from "../agents/agentIdentityDefinitions";
import type {
  ProductIssue,
  ProductIssueNormalizedStatus,
  ProductIssueSeverity,
} from "./productIssueTypes";

const SEVERITY_ORDER: Record<ProductIssueSeverity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export function compareProductIssuesBySeverity(a: ProductIssue, b: ProductIssue): number {
  const sev = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
  if (sev !== 0) return sev;
  return (b.priorityScore ?? 0) - (a.priorityScore ?? 0);
}

export function runtimeIssueDisplayCode(issue: AgentOpsRuntimeIssueRow): string {
  return `BQA-${issue.id.replace(/-/g, "").slice(0, 8).toUpperCase()}`;
}

export function parseRouteFromPageUrl(pageUrl: string): string {
  const withoutHash = pageUrl.split("#")[0]?.trim() ?? pageUrl;
  if (withoutHash.startsWith("/")) return withoutHash;
  try {
    return new URL(withoutHash).pathname || "/";
  } catch {
    return withoutHash.startsWith("/") ? withoutHash : `/${withoutHash}`;
  }
}

export function inferModuleFromRoute(route: string): string {
  const segment = route.split("/").filter(Boolean)[0];
  if (!segment) return "App";
  if (segment === "system") return "AgentOps";
  if (segment === "finance") return "Finance";
  return segment.charAt(0).toUpperCase() + segment.slice(1);
}

function normalizeSeverity(value: string | undefined | null): ProductIssueSeverity {
  const v = (value ?? "medium").toLowerCase();
  if (v === "critical") return "critical";
  if (v === "high") return "high";
  if (v === "low" || v === "suggestion") return "low";
  return "medium";
}

function resolveAgentLabel(agentId: string | null | undefined, canonicalId?: string | null): string {
  if (canonicalId && AGENT_IDENTITY_DEFINITIONS[canonicalId]) {
    return AGENT_IDENTITY_DEFINITIONS[canonicalId].displayName;
  }
  if (agentId && AGENT_IDENTITY_DEFINITIONS[agentId]) {
    return AGENT_IDENTITY_DEFINITIONS[agentId].displayName;
  }
  if (canonicalId) return canonicalId;
  if (agentId) return agentId.slice(0, 8);
  return "Unknown agent";
}

export function findingDedupeKey(finding: AgentOpsFinding): string {
  const route = (finding.route ?? "").toLowerCase();
  return `${route}|${finding.title.trim().toLowerCase()}`;
}

export function runtimeDedupeKey(issue: AgentOpsRuntimeIssueRow): string {
  const evidence = issue.evidence ?? {};
  const route =
    typeof evidence.route === "string"
      ? evidence.route
      : parseRouteFromPageUrl(issue.page_url);
  return `${route.toLowerCase()}|${issue.title.trim().toLowerCase()}`;
}

function normalizedStatusFromFinding(finding: AgentOpsFinding): ProductIssueNormalizedStatus {
  const status = finding.status;
  if (status === "Verified Fixed" || finding.queue_state === "archived") return "verified";
  if (
    status === "Rejected" ||
    status === "Deferred" ||
    status === "False Positive" ||
    status === "Archived"
  ) {
    return "closed";
  }
  if (status === "Marked Fixed by Piter" || status === "Verification Running") {
    return "pending_verification";
  }
  if (status === "In Progress") return "in_progress";
  return "open";
}

function normalizedStatusFromRuntime(status: AgentOpsRuntimeIssueRow["status"]): ProductIssueNormalizedStatus {
  if (status === "verified") return "verified";
  if (status === "fixed") return "fixed";
  if (status === "in_progress") return "in_progress";
  return "open";
}

export function mapFindingToProductIssue(
  finding: AgentOpsFinding,
  agentNameById: Map<string, string>,
): ProductIssue {
  const meta =
    finding.metadata && typeof finding.metadata === "object"
      ? (finding.metadata as Record<string, unknown>)
      : {};
  const canonicalId =
    typeof meta.canonicalAgentId === "string" ? meta.canonicalAgentId : null;
  const route = finding.route ?? "/";
  return {
    id: finding.id,
    issueCode: finding.issue_code,
    title: finding.title,
    reportingAgent:
      (finding.agent_id ? agentNameById.get(finding.agent_id) : null) ??
      resolveAgentLabel(finding.agent_id, canonicalId),
    module: finding.module ?? inferModuleFromRoute(route),
    route,
    severity: normalizeSeverity(finding.severity),
    status: finding.status,
    normalizedStatus: normalizedStatusFromFinding(finding),
    shortReason:
      finding.problem?.trim() ||
      finding.evidence_summary?.trim() ||
      finding.title,
    source: "finding",
    evidenceSummary: finding.evidence_summary ?? finding.problem ?? "",
    createdAt: finding.created_at,
    updatedAt: finding.updated_at,
    fixPrompt: finding.cursor_prompt ?? undefined,
    rawSourceId: finding.id,
    findingId: finding.id,
    priorityScore: finding.priority_score,
  };
}

export function mapRuntimeIssueToProductIssue(
  issue: AgentOpsRuntimeIssueRow,
  agentNameById: Map<string, string>,
): ProductIssue {
  const evidence = issue.evidence ?? {};
  const route =
    typeof evidence.route === "string"
      ? evidence.route
      : parseRouteFromPageUrl(issue.page_url);
  const findingType =
    typeof evidence.finding_type === "string" ? evidence.finding_type : null;
  const canonicalId =
    typeof evidence.canonicalAgentId === "string" ? evidence.canonicalAgentId : null;
  const consoleCount = Array.isArray(evidence.consoleErrors) ? evidence.consoleErrors.length : 0;
  const shortReason =
    issue.description?.trim() ||
    (findingType ? `Browser QA: ${findingType.replace(/_/g, " ")}` : issue.title);
  const evidenceSummary = [
    findingType ? `Finding type: ${findingType}` : null,
    consoleCount > 0 ? `${consoleCount} console error(s)` : null,
    typeof evidence.screenshotPath === "string" ? "Screenshot captured" : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return {
    id: issue.id,
    issueCode: runtimeIssueDisplayCode(issue),
    title: issue.title,
    reportingAgent:
      agentNameById.get(issue.agent_id) ?? resolveAgentLabel(issue.agent_id, canonicalId),
    module: inferModuleFromRoute(route),
    route,
    severity: normalizeSeverity(issue.severity),
    status: issue.status,
    normalizedStatus: normalizedStatusFromRuntime(issue.status),
    shortReason,
    source: evidence.source === "browser_qa" ? "browser_qa_issue" : "runtime_issue",
    evidenceSummary: evidenceSummary || shortReason,
    createdAt: issue.created_at,
    updatedAt: issue.updated_at,
    fixPrompt: issue.fix_prompt ?? undefined,
    rawSourceId: issue.id,
    runtimeIssueId: issue.id,
  };
}

export function buildSyntheticFindingFromProductIssue(
  product: ProductIssue,
  runtime?: AgentOpsRuntimeIssueRow | null,
): AgentOpsFinding {
  const now = new Date().toISOString();
  return {
    id: product.findingId ?? product.runtimeIssueId ?? product.id ?? product.issueCode,
    run_id: null,
    issue_code: product.issueCode,
    title: product.title,
    category: "Functional",
    severity:
      product.severity === "critical"
        ? "Critical"
        : product.severity === "high"
          ? "High"
          : product.severity === "low"
            ? "Low"
            : "Medium",
    status: product.normalizedStatus === "verified" ? "Verified Fixed" : "Active Top 10",
    queue_state: product.normalizedStatus === "verified" ? "archived" : "active_top_10",
    top10_rank: null,
    route: product.route,
    module: product.module,
    page_type: null,
    user_role: null,
    browser_flow: null,
    agent_id: runtime?.agent_id ?? null,
    review_panel: null,
    evidence_summary: product.evidenceSummary,
    evidence_files: runtime?.evidence ?? null,
    problem: product.shortReason,
    expected_result: null,
    actual_result: null,
    likely_root_cause: null,
    recommended_fix_strategy: null,
    cursor_prompt: product.fixPrompt ?? runtime?.fix_prompt ?? null,
    non_change_rules: null,
    saas_impact: null,
    ai_mcp_impact: null,
    personal_ai_impact: null,
    hr_impact: null,
    security_impact: null,
    priority_score: product.priorityScore ?? 0,
    piter_priority_override: null,
    metadata: {
      bridgedFromRuntime: true,
      source: product.source,
      runtimeIssueId: product.runtimeIssueId ?? null,
    },
    created_at: product.createdAt,
    updated_at: product.updatedAt ?? now,
  };
}

export function isActiveProductIssue(issue: ProductIssue): boolean {
  return (
    issue.normalizedStatus === "open" ||
    issue.normalizedStatus === "in_progress" ||
    issue.normalizedStatus === "pending_verification" ||
    issue.normalizedStatus === "fixed"
  );
}

export function isHistoryFixedIssue(issue: ProductIssue): boolean {
  return issue.normalizedStatus === "verified" || issue.normalizedStatus === "fixed";
}

export function isHistoryClosedIssue(issue: ProductIssue): boolean {
  return issue.normalizedStatus === "closed";
}
