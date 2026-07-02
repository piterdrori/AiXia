/**
 * Parsing helpers for runtime mirror UI (read-only).
 */

import type { AgentOpsRuntimeIssueRow, AgentOpsRuntimeMemoryRow } from "../db/agentOpsRuntimeTypes";

export type IssueReasoningEvidence = {
  cluster_id?: string;
  impact_score?: number;
  normalized_type?: string;
  systemic?: boolean;
  pattern_summary?: string;
};

export type IssueFixPipelineEvidence = {
  processed_at?: string;
  pr_url?: string | null;
  validation_status?: string | null;
  patch_mode?: string | null;
  errors?: string[];
};

export type IssueValidationEvidence = {
  status?: string;
  details?: string;
  matching_findings?: number;
  scan_findings_count?: number;
  validated_at?: string;
};

export type EvolutionMemoryContent = {
  system_patterns?: unknown[];
  agent_mutations?: unknown[];
  regressions?: unknown[];
  predictions?: unknown[];
  system_health_trends?: Record<string, unknown>;
  processed_at?: string;
  source_layer?: string;
};

export function readIssueReasoning(issue: AgentOpsRuntimeIssueRow): IssueReasoningEvidence {
  const reasoning = issue.evidence?.reasoning;
  if (!reasoning || typeof reasoning !== "object") return {};
  return reasoning as IssueReasoningEvidence;
}

export function readFixPipelineEvidence(issue: AgentOpsRuntimeIssueRow): IssueFixPipelineEvidence {
  const fixPipeline = issue.evidence?.fix_pipeline;
  if (!fixPipeline || typeof fixPipeline !== "object") return {};
  return fixPipeline as IssueFixPipelineEvidence;
}

export function readFixValidationEvidence(issue: AgentOpsRuntimeIssueRow): IssueValidationEvidence {
  const resolution = issue.evidence?.fix_resolution;
  if (resolution && typeof resolution === "object") {
    const validation = (resolution as { validation?: unknown }).validation;
    if (validation && typeof validation === "object") {
      return validation as IssueValidationEvidence;
    }
  }

  const failure = issue.evidence?.fix_failure;
  if (failure && typeof failure === "object") {
    const validation = (failure as { validation?: unknown }).validation;
    if (validation && typeof validation === "object") {
      return validation as IssueValidationEvidence;
    }
  }

  const partial = issue.evidence?.fix_partial;
  if (partial && typeof partial === "object") {
    const validation = (partial as { validation?: unknown }).validation;
    if (validation && typeof validation === "object") {
      return validation as IssueValidationEvidence;
    }
  }

  return {};
}

export function issueHasFixPipelineEvidence(issue: AgentOpsRuntimeIssueRow): boolean {
  return Boolean(issue.evidence?.fix_pipeline || issue.evidence?.fix_resolution || issue.evidence?.fix_failure);
}

export function parseMemoryContent(row: AgentOpsRuntimeMemoryRow): Record<string, unknown> | null {
  if (row.content === null) return null;
  if (typeof row.content === "object" && !Array.isArray(row.content)) {
    return row.content as Record<string, unknown>;
  }
  if (typeof row.content === "string") {
    try {
      return JSON.parse(row.content) as Record<string, unknown>;
    } catch {
      return { text: row.content };
    }
  }
  return { value: row.content };
}

export function parseEvolutionMemoryContent(row: AgentOpsRuntimeMemoryRow): EvolutionMemoryContent | null {
  const content = parseMemoryContent(row);
  if (!content) return null;
  if (content.source_layer === "hermes_evolution_engine" || content.system_patterns) {
    return content as EvolutionMemoryContent;
  }
  return null;
}

export function formatJsonPreview(value: unknown, maxLength = 240): string {
  const text = typeof value === "string" ? value : JSON.stringify(value, null, 2);
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}…`;
}
