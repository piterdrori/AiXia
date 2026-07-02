/**
 * AgentOps runtime foundation — Supabase row types (staging only).
 * Physical tables: agentops_agents, agentops_issues, agentops_memory,
 * agentops_system_config, agentops_agent_logs.
 */

export const AGENTOPS_RUNTIME_ENVIRONMENT = "staging" as const;

export type AgentOpsRuntimeEnvironment = typeof AGENTOPS_RUNTIME_ENVIRONMENT;

export type AgentOpsAgentMode = "scheduled" | "continuous";

export type AgentOpsAgentStatus = "active" | "paused" | "blocked";

export type AgentOpsIssueSeverity = "low" | "medium" | "high" | "critical";

export type AgentOpsIssueStatus = "open" | "in_progress" | "fixed" | "verified";

export type AgentOpsMemoryScope = "global" | "agent";

export type AgentOpsMemorySource = "agent" | "system" | "user";

export type AgentOpsRuntimeMode = "scheduled" | "continuous";

export type AgentOpsAgentLogAction =
  | "scan"
  | "issue_detected"
  | "memory_update"
  | "cycle_complete";

/** Supabase table: agentops_agents */
export type AgentOpsRuntimeAgentRow = {
  id: string;
  name: string;
  role: string;
  scope: string[];
  mode: AgentOpsAgentMode;
  status: AgentOpsAgentStatus;
  tools: string[];
  environment: AgentOpsRuntimeEnvironment;
  created_at: string;
  updated_at: string;
};

/** Supabase table: agentops_issues */
export type AgentOpsRuntimeIssueRow = {
  id: string;
  title: string;
  description: string;
  severity: AgentOpsIssueSeverity;
  agent_id: string;
  page_url: string;
  evidence: Record<string, unknown>;
  fix_prompt: string | null;
  status: AgentOpsIssueStatus;
  environment: AgentOpsRuntimeEnvironment;
  created_at: string;
  updated_at: string;
};

/** Supabase table: agentops_memory */
export type AgentOpsRuntimeMemoryRow = {
  id: string;
  scope: AgentOpsMemoryScope;
  agent_id: string | null;
  content: Record<string, unknown> | string | number | boolean | null;
  source: AgentOpsMemorySource;
  approved: boolean;
  environment: AgentOpsRuntimeEnvironment;
  created_at: string;
};

/** Supabase table: agentops_system_config */
export type AgentOpsRuntimeSystemConfigRow = {
  id: string;
  runtime_mode: AgentOpsRuntimeMode;
  staging_url: string;
  supabase_project: string;
  github_repo: string;
  tools_enabled: Record<string, unknown>;
  environment: AgentOpsRuntimeEnvironment;
  created_at: string;
};

/** Supabase table: agentops_agent_logs */
export type AgentOpsRuntimeAgentLogRow = {
  id: string;
  agent_id: string;
  action: AgentOpsAgentLogAction;
  payload: Record<string, unknown>;
  environment: AgentOpsRuntimeEnvironment;
  created_at: string;
};

export type AgentOpsRuntimeReadResult<T> = {
  data: T | null;
  error: string | null;
};

export type CreateAgentOpsRuntimeAgentInput = {
  name: string;
  role: string;
  scope?: string[];
  mode?: AgentOpsAgentMode;
  status?: AgentOpsAgentStatus;
  tools?: string[];
};

export type CreateAgentOpsRuntimeIssueInput = {
  title: string;
  description: string;
  severity: AgentOpsIssueSeverity;
  agent_id: string;
  page_url: string;
  evidence?: Record<string, unknown>;
  fix_prompt?: string | null;
  status?: AgentOpsIssueStatus;
};

export type StoreAgentOpsRuntimeMemoryInput = {
  scope: AgentOpsMemoryScope;
  agent_id?: string | null;
  content: Record<string, unknown> | string | number | boolean | null;
  source: AgentOpsMemorySource;
  approved?: boolean;
};

export type LogAgentOpsRuntimeActionInput = {
  agent_id: string;
  action: AgentOpsAgentLogAction;
  payload?: Record<string, unknown>;
};

export const AGENTOPS_RUNTIME_TABLES = {
  agents: "agentops_agents",
  issues: "agentops_issues",
  memory: "agentops_memory",
  systemConfig: "agentops_system_config",
  agentLogs: "agentops_agent_logs",
} as const;
