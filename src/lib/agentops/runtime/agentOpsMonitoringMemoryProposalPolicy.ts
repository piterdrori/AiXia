/**
 * Phase 5E — owner-gated monitoring memory proposal policy.
 * Proposals only from dry-run reports on staging Supabase — never active memory.
 */

import { createHash } from "node:crypto";

import { extractSupabaseProjectRefFromUrl } from "../execution/agentOpsStagingGuard";
import { AGENTOPS_MONITORING_STAGING_PROJECT_REF } from "./agentOpsMonitoringRunIndex";
import type { MonitoringScheduledRunReport } from "./agentOpsMonitoringScheduledReport";

export type MemoryProposalScope = "global" | "agent" | "module" | "route";

export type MemoryProposalType =
  | "repeated_issue_pattern"
  | "design_rule_signal"
  | "route_regression_signal"
  | "tool_behavior_signal"
  | "monitoring_observation";

export type MonitoringMemoryProposalCandidate = {
  agentSlug: string | null;
  memoryScope: MemoryProposalScope;
  memoryType: MemoryProposalType;
  title: string;
  proposal: string;
  rationale: string;
  evidence: Record<string, unknown>;
  confidence: number;
  duplicateKey: string;
};

export type MonitoringMemoryProposalPolicyContext = {
  report: MonitoringScheduledRunReport;
  supabaseProjectRef?: string | null;
};

export type MonitoringMemoryProposalDecision = "owner_approved" | "rejected" | "deferred";

const ALLOWED_TARGET_CLASSES = new Set(["staging", "preview", "local"]);

const MODULE_ROUTE_PREFIX: Array<{ prefix: string; module: string }> = [
  { prefix: "/system/agent-ops", module: "agent-ops" },
  { prefix: "/finance", module: "finance" },
  { prefix: "/dashboard", module: "dashboard" },
  { prefix: "/calendar", module: "calendar" },
  { prefix: "/projects", module: "projects" },
  { prefix: "/tasks", module: "tasks" },
];

export function resolveModuleFromRoute(route: string): string | null {
  for (const entry of MODULE_ROUTE_PREFIX) {
    if (route === entry.prefix || route.startsWith(`${entry.prefix}/`)) {
      return entry.module;
    }
  }
  const segment = route.split("/").filter(Boolean)[0];
  return segment ?? null;
}

export function normalizeIssuePattern(issue: string): string {
  return issue
    .trim()
    .toLowerCase()
    .replace(/\(\d+\)/g, "(n)")
    .replace(/\s+/g, " ");
}

export function classifyMemoryProposalType(input: {
  category: string;
  issuePattern: string;
  agentCount: number;
  routeCount: number;
}): MemoryProposalType {
  const category = input.category.toLowerCase();
  const pattern = input.issuePattern.toLowerCase();

  if (category.includes("timeout") || pattern.includes("timeout")) {
    return "tool_behavior_signal";
  }
  if (category.includes("navigation") || pattern.includes("navigation") || pattern.includes("broken link")) {
    return input.routeCount >= 2 ? "design_rule_signal" : "route_regression_signal";
  }
  if (input.agentCount >= 2 || input.routeCount >= 2) {
    return "repeated_issue_pattern";
  }
  return "monitoring_observation";
}

export function mapMemoryProposalScope(input: {
  agentSlugs: string[];
  routes: string[];
  memoryType: MemoryProposalType;
}): MemoryProposalScope {
  if (input.memoryType === "design_rule_signal" && input.routes.length >= 2) {
    const modules = new Set(
      input.routes.map((route) => resolveModuleFromRoute(route)).filter(Boolean) as string[],
    );
    if (modules.size === 1) return "module";
    return "global";
  }
  if (input.agentSlugs.length === 1 && input.routes.length <= 1) {
    return input.routes.length === 1 ? "route" : "agent";
  }
  if (input.routes.length === 1) return "route";
  if (input.routes.length >= 2) {
    const modules = new Set(
      input.routes.map((route) => resolveModuleFromRoute(route)).filter(Boolean) as string[],
    );
    if (modules.size === 1) return "module";
  }
  return "global";
}

export function buildMemoryProposalDuplicateKey(
  candidate: Pick<
    MonitoringMemoryProposalCandidate,
    "memoryScope" | "memoryType" | "title" | "agentSlug"
  >,
): string {
  const raw = [
    candidate.memoryScope,
    candidate.memoryType,
    candidate.agentSlug ?? "none",
    candidate.title,
  ]
    .join("|")
    .toLowerCase();
  return createHash("sha256").update(raw).digest("hex");
}

export function canCreateMonitoringMemoryProposal(
  context: MonitoringMemoryProposalPolicyContext,
): string | null {
  const { report, supabaseProjectRef } = context;

  if (!report.dryRun) return "Memory proposals require dry-run monitoring.";
  if (!report.productionBlocked) return "Memory proposals require productionBlocked=true.";
  if (report.actualMemoryWrites > 0) return "Active memory writes detected — proposal pipeline blocked.";
  if (report.actualIssuesCreated > 0) {
    return "Live issues were created — memory proposal pipeline blocked.";
  }

  if (!ALLOWED_TARGET_CLASSES.has(report.targetClass)) {
    return `Target class ${report.targetClass} is not staging/preview/local.`;
  }

  const ref = supabaseProjectRef ?? null;
  if (ref && ref !== AGENTOPS_MONITORING_STAGING_PROJECT_REF) {
    return `Supabase project ref ${ref} is not staging.`;
  }

  return null;
}

export function buildMonitoringMemoryProposalCandidate(
  signal: {
    category: string;
    issuePattern: string;
    agentSlugs: string[];
    routes: string[];
    severities: string[];
    sampleIssues: string[];
    evidence: Record<string, unknown>;
  },
  runContext: { report: MonitoringScheduledRunReport },
): MonitoringMemoryProposalCandidate | null {
  const agentCount = signal.agentSlugs.length;
  const routeCount = signal.routes.length;

  if (agentCount < 2 && routeCount < 2) return null;

  const memoryType = classifyMemoryProposalType({
    category: signal.category,
    issuePattern: signal.issuePattern,
    agentCount,
    routeCount,
  });

  const memoryScope = mapMemoryProposalScope({
    agentSlugs: signal.agentSlugs,
    routes: signal.routes,
    memoryType,
  });

  const hasHighSeverity = signal.severities.some((s) => s === "critical" || s === "high");
  let confidence = 0.62;
  if (agentCount >= 2 && routeCount >= 2) confidence = 0.82;
  else if (agentCount >= 2) confidence = 0.76;
  else if (routeCount >= 2) confidence = 0.72;
  if (hasHighSeverity) confidence = Math.min(0.95, confidence + 0.05);

  if (confidence < 0.68) return null;

  const title = `[Monitoring memory proposal] ${signal.issuePattern}`.slice(0, 240);
  const proposal = [
    `Observed ${signal.issuePattern} across ${agentCount} agent(s) and ${routeCount} route(s) during dry-run monitoring.`,
    `Category: ${signal.category}.`,
    memoryScope === "global"
      ? "Consider a global memory note for cross-module monitoring signal."
      : memoryScope === "module"
        ? `Consider module-scoped memory for ${resolveModuleFromRoute(signal.routes[0] ?? "/") ?? "affected module"}.`
        : `Consider route-scoped memory for ${signal.routes.join(", ") || "affected route"}.`,
  ].join(" ");

  const rationale = [
    "Conservative memory proposal from scheduled monitoring dry-run.",
    `${agentCount} agent(s): ${signal.agentSlugs.join(", ")}.`,
    `${routeCount} route(s): ${signal.routes.join(", ") || "—"}.`,
    `Run ${runContext.report.runId} · target ${runContext.report.targetBaseUrl}.`,
    "Owner must approve before any active memory application (Phase 5E — proposal only).",
  ].join(" ");

  if (!proposal.trim() || !rationale.trim()) return null;

  const candidate: MonitoringMemoryProposalCandidate = {
    agentSlug: agentCount === 1 ? signal.agentSlugs[0] : null,
    memoryScope,
    memoryType,
    title,
    proposal,
    rationale,
    evidence: {
      ...signal.evidence,
      category: signal.category,
      issue_pattern: signal.issuePattern,
      agent_slugs: signal.agentSlugs,
      routes: signal.routes,
      sample_issues: signal.sampleIssues.slice(0, 5),
      run_id: runContext.report.runId,
      target_base_url: runContext.report.targetBaseUrl,
      target_class: runContext.report.targetClass,
      dry_run: runContext.report.dryRun,
      production_blocked: runContext.report.productionBlocked,
    },
    confidence,
    duplicateKey: "",
  };
  candidate.duplicateKey = buildMemoryProposalDuplicateKey(candidate);
  return candidate;
}

export function assertStagingSupabaseForMemoryProposals(
  env: NodeJS.ProcessEnv = process.env,
): string | null {
  const url = env.VITE_SUPABASE_URL ?? env.SUPABASE_URL;
  const ref = extractSupabaseProjectRefFromUrl(url);
  if (!ref) return "Missing staging Supabase URL.";
  if (ref !== AGENTOPS_MONITORING_STAGING_PROJECT_REF) {
    return `Memory proposal inserts blocked: Supabase ref ${ref} is not staging.`;
  }
  return null;
}
