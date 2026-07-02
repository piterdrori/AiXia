/**
 * AgentOps runtime foundation — minimal Supabase data helpers (staging only).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  AGENTOPS_RUNTIME_ENVIRONMENT,
  AGENTOPS_RUNTIME_TABLES,
  type AgentOpsRuntimeAgentLogRow,
  type AgentOpsRuntimeAgentRow,
  type AgentOpsRuntimeIssueRow,
  type AgentOpsRuntimeMemoryRow,
  type AgentOpsRuntimeReadResult,
  type AgentOpsRuntimeSystemConfigRow,
  type CreateAgentOpsRuntimeIssueInput,
  type LogAgentOpsRuntimeActionInput,
  type StoreAgentOpsRuntimeMemoryInput,
} from "./agentOpsRuntimeTypes";

function ok<T>(data: T): AgentOpsRuntimeReadResult<T> {
  return { data, error: null };
}

function fail<T>(error: unknown): AgentOpsRuntimeReadResult<T> {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "Unknown AgentOps runtime data error";
  return { data: null, error: message };
}

function normalizePageUrl(pageUrl: string): string {
  const trimmed = pageUrl.trim();
  if (!trimmed) return "/";
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

function normalizeMemoryContent(
  content: StoreAgentOpsRuntimeMemoryInput["content"],
): Record<string, unknown> | string | number | boolean | null {
  if (content === null) return null;
  if (typeof content === "string") {
    const trimmed = content.trim();
    if (!trimmed) return { text: "" };
    try {
      return JSON.parse(trimmed) as Record<string, unknown>;
    } catch {
      return { text: content };
    }
  }
  return content;
}

function assertMemoryScopeAgent(
  input: StoreAgentOpsRuntimeMemoryInput,
): string | null {
  if (input.scope === "global" && input.agent_id) {
    return "Global memory cannot include agent_id.";
  }
  if (input.scope === "agent" && !input.agent_id) {
    return "Agent-scoped memory requires agent_id.";
  }
  return null;
}

/** Load all active staging agents from agentops_agents. */
export async function listActiveAgents(
  client: SupabaseClient,
): Promise<AgentOpsRuntimeReadResult<AgentOpsRuntimeAgentRow[]>> {
  const { data, error } = await client
    .from(AGENTOPS_RUNTIME_TABLES.agents)
    .select("*")
    .eq("status", "active")
    .eq("environment", AGENTOPS_RUNTIME_ENVIRONMENT)
    .order("name", { ascending: true });

  if (error) return fail(error);
  return ok((data ?? []) as AgentOpsRuntimeAgentRow[]);
}

/** Read the staging singleton system config row. */
export async function getRuntimeSystemConfig(
  client: SupabaseClient,
): Promise<AgentOpsRuntimeReadResult<AgentOpsRuntimeSystemConfigRow | null>> {
  const { data, error } = await client
    .from(AGENTOPS_RUNTIME_TABLES.systemConfig)
    .select("*")
    .eq("environment", AGENTOPS_RUNTIME_ENVIRONMENT)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return fail(error);
  return ok((data as AgentOpsRuntimeSystemConfigRow | null) ?? null);
}

/**
 * Insert a staging issue detected by an autonomous agent.
 * Open/in_progress rows dedupe on (agent_id, page_url) via DB unique index.
 */
export async function createIssue(
  client: SupabaseClient,
  input: CreateAgentOpsRuntimeIssueInput,
): Promise<AgentOpsRuntimeReadResult<AgentOpsRuntimeIssueRow>> {
  const row = {
    title: input.title.trim(),
    description: input.description.trim(),
    severity: input.severity,
    agent_id: input.agent_id,
    page_url: normalizePageUrl(input.page_url),
    evidence: input.evidence ?? {},
    fix_prompt: input.fix_prompt ?? null,
    status: input.status ?? "open",
    environment: AGENTOPS_RUNTIME_ENVIRONMENT,
  };

  if (!row.title || !row.description) {
    return fail("title and description are required");
  }

  const { data, error } = await client
    .from(AGENTOPS_RUNTIME_TABLES.issues)
    .insert(row)
    .select("*")
    .single();

  if (error) return fail(error);
  return ok(data as AgentOpsRuntimeIssueRow);
}

/**
 * Append an agent audit log entry (scan, issue_detected, memory_update).
 */
export async function logAgentAction(
  client: SupabaseClient,
  input: LogAgentOpsRuntimeActionInput,
): Promise<AgentOpsRuntimeReadResult<AgentOpsRuntimeAgentLogRow>> {
  if (!input.agent_id?.trim()) {
    return fail("agent_id is required");
  }

  const { data, error } = await client
    .from(AGENTOPS_RUNTIME_TABLES.agentLogs)
    .insert({
      agent_id: input.agent_id,
      action: input.action,
      payload: input.payload ?? {},
      environment: AGENTOPS_RUNTIME_ENVIRONMENT,
    })
    .select("*")
    .single();

  if (error) return fail(error);
  return ok(data as AgentOpsRuntimeAgentLogRow);
}

/** List open/in-progress staging issues for reasoning pipelines. */
export async function listOpenIssues(
  client: SupabaseClient,
): Promise<AgentOpsRuntimeReadResult<AgentOpsRuntimeIssueRow[]>> {
  const { data, error } = await client
    .from(AGENTOPS_RUNTIME_TABLES.issues)
    .select("*")
    .eq("environment", AGENTOPS_RUNTIME_ENVIRONMENT)
    .in("status", ["open", "in_progress"])
    .order("created_at", { ascending: false });

  if (error) return fail(error);
  return ok((data ?? []) as AgentOpsRuntimeIssueRow[]);
}

export type UpdateIssueReasoningInput = {
  fix_prompt?: string | null;
  severity?: AgentOpsRuntimeIssueRow["severity"];
  evidence?: Record<string, unknown>;
};

/** Persist reasoning enhancements back to agentops_issues. */
export async function updateIssueReasoning(
  client: SupabaseClient,
  issueId: string,
  input: UpdateIssueReasoningInput,
): Promise<AgentOpsRuntimeReadResult<AgentOpsRuntimeIssueRow>> {
  const patch: Record<string, unknown> = {};
  if (input.fix_prompt !== undefined) patch.fix_prompt = input.fix_prompt;
  if (input.severity !== undefined) patch.severity = input.severity;
  if (input.evidence !== undefined) patch.evidence = input.evidence;

  if (Object.keys(patch).length === 0) {
    return fail("No reasoning fields provided for update");
  }

  const { data, error } = await client
    .from(AGENTOPS_RUNTIME_TABLES.issues)
    .update(patch)
    .eq("id", issueId)
    .eq("environment", AGENTOPS_RUNTIME_ENVIRONMENT)
    .select("*")
    .single();

  if (error) return fail(error);
  return ok(data as AgentOpsRuntimeIssueRow);
}

/** Load one staging issue by id. */
export async function getIssueById(
  client: SupabaseClient,
  issueId: string,
): Promise<AgentOpsRuntimeReadResult<AgentOpsRuntimeIssueRow | null>> {
  const { data, error } = await client
    .from(AGENTOPS_RUNTIME_TABLES.issues)
    .select("*")
    .eq("id", issueId)
    .eq("environment", AGENTOPS_RUNTIME_ENVIRONMENT)
    .maybeSingle();

  if (error) return fail(error);
  return ok((data as AgentOpsRuntimeIssueRow | null) ?? null);
}

/** Load one staging agent by id. */
export async function getAgentById(
  client: SupabaseClient,
  agentId: string,
): Promise<AgentOpsRuntimeReadResult<AgentOpsRuntimeAgentRow | null>> {
  const { data, error } = await client
    .from(AGENTOPS_RUNTIME_TABLES.agents)
    .select("*")
    .eq("id", agentId)
    .eq("environment", AGENTOPS_RUNTIME_ENVIRONMENT)
    .maybeSingle();

  if (error) return fail(error);
  return ok((data as AgentOpsRuntimeAgentRow | null) ?? null);
}

export type UpdateIssueFixStatusInput = {
  status: AgentOpsRuntimeIssueRow["status"];
  severity?: AgentOpsRuntimeIssueRow["severity"];
  evidence?: Record<string, unknown>;
  fix_prompt?: string | null;
};

/** Update issue status during fix verification (staging only). */
export async function updateIssueFixStatus(
  client: SupabaseClient,
  issueId: string,
  input: UpdateIssueFixStatusInput,
): Promise<AgentOpsRuntimeReadResult<AgentOpsRuntimeIssueRow>> {
  const patch: Record<string, unknown> = { status: input.status };
  if (input.severity !== undefined) patch.severity = input.severity;
  if (input.evidence !== undefined) patch.evidence = input.evidence;
  if (input.fix_prompt !== undefined) patch.fix_prompt = input.fix_prompt;

  const { data, error } = await client
    .from(AGENTOPS_RUNTIME_TABLES.issues)
    .update(patch)
    .eq("id", issueId)
    .eq("environment", AGENTOPS_RUNTIME_ENVIRONMENT)
    .select("*")
    .single();

  if (error) return fail(error);
  return ok(data as AgentOpsRuntimeIssueRow);
}

/** List all staging issues for evolution/regression analysis. */
export async function listIssuesForEvolution(
  client: SupabaseClient,
  limit = 500,
): Promise<AgentOpsRuntimeReadResult<AgentOpsRuntimeIssueRow[]>> {
  const { data, error } = await client
    .from(AGENTOPS_RUNTIME_TABLES.issues)
    .select("*")
    .eq("environment", AGENTOPS_RUNTIME_ENVIRONMENT)
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) return fail(error);
  return ok((data ?? []) as AgentOpsRuntimeIssueRow[]);
}

/** Load recent Hermes memory rows (global + agent scoped). */
export async function listHermesMemory(
  client: SupabaseClient,
  limit = 100,
): Promise<AgentOpsRuntimeReadResult<AgentOpsRuntimeMemoryRow[]>> {
  const { data, error } = await client
    .from(AGENTOPS_RUNTIME_TABLES.memory)
    .select("*")
    .eq("environment", AGENTOPS_RUNTIME_ENVIRONMENT)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return fail(error);
  return ok((data ?? []) as AgentOpsRuntimeMemoryRow[]);
}

/** Load recent agent audit logs for evolution pattern mining. */
export async function listAgentLogs(
  client: SupabaseClient,
  limit = 300,
): Promise<AgentOpsRuntimeReadResult<AgentOpsRuntimeAgentLogRow[]>> {
  const { data, error } = await client
    .from(AGENTOPS_RUNTIME_TABLES.agentLogs)
    .select("*")
    .eq("environment", AGENTOPS_RUNTIME_ENVIRONMENT)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return fail(error);
  return ok((data ?? []) as AgentOpsRuntimeAgentLogRow[]);
}

export type UpdateAgentConfigurationInput = {
  scope?: string[];
  tools?: string[];
  status?: AgentOpsRuntimeAgentRow["status"];
};

/** Safe agent configuration updates for Hermes evolution (mode is never changed here). */
export async function updateAgentConfiguration(
  client: SupabaseClient,
  agentId: string,
  input: UpdateAgentConfigurationInput,
): Promise<AgentOpsRuntimeReadResult<AgentOpsRuntimeAgentRow>> {
  const patch: Record<string, unknown> = {};
  if (input.scope !== undefined) patch.scope = input.scope;
  if (input.tools !== undefined) patch.tools = input.tools;
  if (input.status !== undefined) patch.status = input.status;

  if (Object.keys(patch).length === 0) {
    return fail("No agent configuration fields provided for update");
  }

  const { data, error } = await client
    .from(AGENTOPS_RUNTIME_TABLES.agents)
    .update(patch)
    .eq("id", agentId)
    .eq("environment", AGENTOPS_RUNTIME_ENVIRONMENT)
    .select("*")
    .single();

  if (error) return fail(error);
  return ok(data as AgentOpsRuntimeAgentRow);
}

/**
 * Store Hermes memory (global or per-agent). Default approved=false until owner review.
 */
export async function storeMemory(
  client: SupabaseClient,
  input: StoreAgentOpsRuntimeMemoryInput,
): Promise<AgentOpsRuntimeReadResult<AgentOpsRuntimeMemoryRow>> {
  const scopeError = assertMemoryScopeAgent(input);
  if (scopeError) return fail(scopeError);

  const { data, error } = await client
    .from(AGENTOPS_RUNTIME_TABLES.memory)
    .insert({
      scope: input.scope,
      agent_id: input.scope === "agent" ? input.agent_id ?? null : null,
      content: normalizeMemoryContent(input.content),
      source: input.source,
      approved: input.approved ?? false,
      environment: AGENTOPS_RUNTIME_ENVIRONMENT,
    })
    .select("*")
    .single();

  if (error) return fail(error);
  return ok(data as AgentOpsRuntimeMemoryRow);
}
