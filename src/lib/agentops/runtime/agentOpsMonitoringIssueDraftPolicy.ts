/**
 * Phase 5C — owner-gated monitoring issue draft policy.
 * Drafts only from dry-run findings with Browser QA evidence on staging Supabase.
 */

import { createHash } from "node:crypto";

import { AGENTOPS_MONITORING_STAGING_PROJECT_REF } from "./agentOpsMonitoringRunIndex";
import { extractSupabaseProjectRefFromUrl } from "../execution/agentOpsStagingGuard";
import type { MonitoringScheduledRunReport } from "./agentOpsMonitoringScheduledReport";
import type { StagingScanFinding, StagingScanSeverity } from "./stagingScanTypes";

export type MonitoringIssueDraftCandidate = {
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
};

export type MonitoringIssueDraftPolicyContext = {
  report: MonitoringScheduledRunReport;
  finding: StagingScanFinding;
  agentSlug: string;
  supabaseProjectRef?: string | null;
};

export type MonitoringIssueDraftDecision = "owner_approved" | "rejected" | "deferred";

const MODULE_ROUTE_PREFIX: Array<{ prefix: string; module: string }> = [
  { prefix: "/system/agent-ops", module: "agent-ops" },
  { prefix: "/finance", module: "finance" },
  { prefix: "/dashboard", module: "dashboard" },
  { prefix: "/calendar", module: "calendar" },
  { prefix: "/projects", module: "projects" },
  { prefix: "/tasks", module: "tasks" },
];

function readRouteFromFinding(finding: StagingScanFinding): string {
  const fromEvidence = finding.evidence.route;
  if (typeof fromEvidence === "string" && fromEvidence.trim()) {
    return fromEvidence.startsWith("/") ? fromEvidence : `/${fromEvidence}`;
  }
  return finding.page_url.startsWith("/") ? finding.page_url : `/${finding.page_url}`;
}

function hasBrowserQaEvidence(finding: StagingScanFinding): boolean {
  const evidence = finding.evidence ?? {};
  const scanMode = evidence.scan_mode;
  const hasRoute =
    (typeof evidence.route === "string" && evidence.route.length > 0) ||
    (typeof evidence.absolute_url === "string" && evidence.absolute_url.length > 0);
  return scanMode === "playwright" && hasRoute;
}

export function classifyDraftSeverity(finding: StagingScanFinding): StagingScanSeverity {
  return finding.severity ?? "medium";
}

export function mapFindingToResponsibleAgent(finding: StagingScanFinding, fallbackSlug: string): string {
  const agentFromEvidence = finding.evidence.agent_slug ?? finding.evidence.agentSlug;
  if (typeof agentFromEvidence === "string" && agentFromEvidence.trim()) {
    return agentFromEvidence.trim();
  }
  return fallbackSlug;
}

export function resolveModuleFromRoute(route: string): string | null {
  for (const entry of MODULE_ROUTE_PREFIX) {
    if (route === entry.prefix || route.startsWith(`${entry.prefix}/`)) {
      return entry.module;
    }
  }
  const segment = route.split("/").filter(Boolean)[0];
  return segment ?? null;
}

export function buildDuplicateKey(candidate: Pick<MonitoringIssueDraftCandidate, "agentSlug" | "route" | "title">): string {
  const raw = `${candidate.agentSlug}|${candidate.route}|${candidate.title}`.toLowerCase();
  return createHash("sha256").update(raw).digest("hex");
}

export function sanitizeFindingEvidence(evidence: Record<string, unknown>): Record<string, unknown> {
  const sanitized = { ...evidence };
  delete sanitized.screenshot_base64;
  if (typeof sanitized.dom_snapshot === "string" && sanitized.dom_snapshot.length > 2_000) {
    sanitized.dom_snapshot = sanitized.dom_snapshot.slice(0, 2_000);
  }
  return sanitized;
}

export function canCreateMonitoringIssueDraft(context: MonitoringIssueDraftPolicyContext): string | null {
  const { report, finding, supabaseProjectRef } = context;

  if (!report.dryRun) return "Drafts require dry-run monitoring.";
  if (!report.productionBlocked) return "Drafts require productionBlocked=true.";
  if (report.actualIssuesCreated > 0) return "Live issues were created — draft pipeline blocked.";
  if (report.actualMemoryWrites > 0) return "Memory writes detected — draft pipeline blocked.";

  const ref = supabaseProjectRef ?? null;
  if (ref && ref !== AGENTOPS_MONITORING_STAGING_PROJECT_REF) {
    return `Supabase project ref ${ref} is not staging.`;
  }

  if (!hasBrowserQaEvidence(finding)) {
    return "Finding lacks Browser QA (Playwright) evidence.";
  }

  if (!finding.issue?.trim()) return "Finding issue text is empty.";
  return null;
}

export function buildMonitoringIssueDraftCandidate(
  finding: StagingScanFinding,
  runContext: {
    report: MonitoringScheduledRunReport;
    agentSlug: string;
  },
): MonitoringIssueDraftCandidate {
  const route = readRouteFromFinding(finding);
  const severity = classifyDraftSeverity(finding);
  const agentSlug = mapFindingToResponsibleAgent(finding, runContext.agentSlug);
  const module = resolveModuleFromRoute(route);
  const issueType =
    typeof finding.evidence.category === "string" ? finding.evidence.category : "monitoring_finding";
  const compactEvidence = sanitizeFindingEvidence(finding.evidence);
  const browserQaEvidence = {
    scan_mode: compactEvidence.scan_mode ?? "playwright",
    route: compactEvidence.route ?? route,
    absolute_url: compactEvidence.absolute_url ?? null,
    http_status: compactEvidence.http_status ?? null,
    screenshot_path: compactEvidence.screenshot_path ?? null,
    category: compactEvidence.category ?? issueType,
    scanned_at: compactEvidence.scanned_at ?? runContext.report.endedAt,
  };

  const title = `[Monitoring draft] ${finding.issue}`.slice(0, 240);
  const summary = [
    `Dry-run monitoring finding on ${route}.`,
    finding.issue,
    runContext.report.targetBaseUrl ? `Target: ${runContext.report.targetBaseUrl}` : null,
  ]
    .filter(Boolean)
    .join(" ");

  const candidate: MonitoringIssueDraftCandidate = {
    agentSlug,
    module,
    route,
    issueType,
    severity,
    title,
    summary,
    evidence: compactEvidence,
    browserQaEvidence,
    suggestedFixPrompt: `Review Browser QA evidence for ${route}: ${finding.issue}`,
    confidence: severity === "critical" ? 0.9 : severity === "high" ? 0.8 : severity === "medium" ? 0.65 : 0.5,
    duplicateKey: "",
  };
  candidate.duplicateKey = buildDuplicateKey(candidate);
  return candidate;
}

export function assertStagingSupabaseForDrafts(env: NodeJS.ProcessEnv = process.env): string | null {
  const url = env.VITE_SUPABASE_URL ?? env.SUPABASE_URL;
  const ref = extractSupabaseProjectRefFromUrl(url);
  if (!ref) return "Missing staging Supabase URL.";
  if (ref !== AGENTOPS_MONITORING_STAGING_PROJECT_REF) {
    return `Draft inserts blocked: Supabase ref ${ref} is not staging.`;
  }
  return null;
}
