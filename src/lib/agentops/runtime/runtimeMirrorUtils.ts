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

export const MONITORING_MEMORY_CONTENT_SOURCE = "monitoring_memory_proposal";

export type MonitoringMemoryContentFields = {
  contentSource: string | null;
  title: string | null;
  text: string | null;
  sourceProposalId: string | null;
  sourceRunId: string | null;
  duplicateKey: string | null;
  agentSlug: string | null;
  appliedAt: string | null;
};

export function readMonitoringMemoryContentFields(
  row: AgentOpsRuntimeMemoryRow,
): MonitoringMemoryContentFields {
  const content = parseMemoryContent(row);
  if (!content) {
    return {
      contentSource: null,
      title: null,
      text: null,
      sourceProposalId: null,
      sourceRunId: null,
      duplicateKey: null,
      agentSlug: null,
      appliedAt: null,
    };
  }

  return {
    contentSource: typeof content.source === "string" ? content.source : null,
    title: typeof content.title === "string" ? content.title : null,
    text: typeof content.text === "string" ? content.text : null,
    sourceProposalId:
      typeof content.source_proposal_id === "string" ? content.source_proposal_id : null,
    sourceRunId: typeof content.source_run_id === "string" ? content.source_run_id : null,
    duplicateKey: typeof content.duplicate_key === "string" ? content.duplicate_key : null,
    agentSlug: typeof content.agent_slug === "string" ? content.agent_slug : null,
    appliedAt: typeof content.applied_at === "string" ? content.applied_at : null,
  };
}

export function isMonitoringMemoryProposalRow(row: AgentOpsRuntimeMemoryRow): boolean {
  return readMonitoringMemoryContentFields(row).contentSource === MONITORING_MEMORY_CONTENT_SOURCE;
}

export function memoryRowMatchesSearch(row: AgentOpsRuntimeMemoryRow, query: string): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;

  if (row.id.toLowerCase().includes(normalized)) return true;
  if (row.agent_id?.toLowerCase().includes(normalized)) return true;

  const fields = readMonitoringMemoryContentFields(row);
  const haystack = [
    fields.title,
    fields.text,
    fields.sourceProposalId,
    fields.sourceRunId,
    fields.duplicateKey,
    fields.agentSlug,
    row.source,
    row.scope,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(normalized);
}
