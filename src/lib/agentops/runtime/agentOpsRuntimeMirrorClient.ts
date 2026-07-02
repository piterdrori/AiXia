/**

 * Browser-safe read-only client for AgentOps runtime mirror UI.

 * All queries target staging runtime Supabase tables only.

 */



import { supabase } from "@/lib/supabase";

import {

  AGENTOPS_RUNTIME_ENVIRONMENT,

  AGENTOPS_RUNTIME_TABLES,

  type AgentOpsRuntimeAgentLogRow,

  type AgentOpsRuntimeAgentRow,

  type AgentOpsRuntimeIssueRow,

  type AgentOpsRuntimeMemoryRow,

  type AgentOpsRuntimeSystemConfigRow,

} from "../db/agentOpsRuntimeTypes";



export type AgentOpsRuntimeMirrorResult<T> = {

  data: T;

  error: string | null;

};



function toError(error: unknown): string {

  if (error instanceof Error) return error.message;

  if (typeof error === "object" && error !== null && "message" in error) {

    return String((error as { message: unknown }).message);

  }

  return "Unknown AgentOps runtime mirror error";

}



export async function fetchRuntimeAgents(): Promise<

  AgentOpsRuntimeMirrorResult<AgentOpsRuntimeAgentRow[]>

> {

  const { data, error } = await supabase

    .from(AGENTOPS_RUNTIME_TABLES.agents)

    .select("*")

    .eq("environment", AGENTOPS_RUNTIME_ENVIRONMENT)

    .order("name", { ascending: true });



  if (error) return { data: [], error: toError(error) };

  return { data: (data ?? []) as AgentOpsRuntimeAgentRow[], error: null };

}



export async function fetchRuntimeAgentById(

  agentId: string,

): Promise<AgentOpsRuntimeMirrorResult<AgentOpsRuntimeAgentRow | null>> {

  const { data, error } = await supabase

    .from(AGENTOPS_RUNTIME_TABLES.agents)

    .select("*")

    .eq("id", agentId)

    .eq("environment", AGENTOPS_RUNTIME_ENVIRONMENT)

    .maybeSingle();



  if (error) return { data: null, error: toError(error) };

  return { data: (data as AgentOpsRuntimeAgentRow | null) ?? null, error: null };

}



export async function fetchRuntimeIssues(

  limit = 500,

): Promise<AgentOpsRuntimeMirrorResult<AgentOpsRuntimeIssueRow[]>> {

  const { data, error } = await supabase

    .from(AGENTOPS_RUNTIME_TABLES.issues)

    .select("*")

    .eq("environment", AGENTOPS_RUNTIME_ENVIRONMENT)

    .order("updated_at", { ascending: false })

    .limit(limit);



  if (error) return { data: [], error: toError(error) };

  return { data: (data ?? []) as AgentOpsRuntimeIssueRow[], error: null };

}



export async function fetchRuntimeIssueById(

  issueId: string,

): Promise<AgentOpsRuntimeMirrorResult<AgentOpsRuntimeIssueRow | null>> {

  const { data, error } = await supabase

    .from(AGENTOPS_RUNTIME_TABLES.issues)

    .select("*")

    .eq("id", issueId)

    .eq("environment", AGENTOPS_RUNTIME_ENVIRONMENT)

    .maybeSingle();



  if (error) return { data: null, error: toError(error) };

  return { data: (data as AgentOpsRuntimeIssueRow | null) ?? null, error: null };

}



export async function fetchRuntimeMemory(

  limit = 200,

): Promise<AgentOpsRuntimeMirrorResult<AgentOpsRuntimeMemoryRow[]>> {

  const { data, error } = await supabase

    .from(AGENTOPS_RUNTIME_TABLES.memory)

    .select("*")

    .eq("environment", AGENTOPS_RUNTIME_ENVIRONMENT)

    .order("created_at", { ascending: false })

    .limit(limit);



  if (error) return { data: [], error: toError(error) };

  return { data: (data ?? []) as AgentOpsRuntimeMemoryRow[], error: null };

}



export async function fetchRuntimeSystemMemory(

  limit = 50,

): Promise<AgentOpsRuntimeMirrorResult<AgentOpsRuntimeMemoryRow[]>> {

  const { data, error } = await supabase

    .from(AGENTOPS_RUNTIME_TABLES.memory)

    .select("*")

    .eq("environment", AGENTOPS_RUNTIME_ENVIRONMENT)

    .eq("source", "system")

    .order("created_at", { ascending: false })

    .limit(limit);



  if (error) return { data: [], error: toError(error) };

  return { data: (data ?? []) as AgentOpsRuntimeMemoryRow[], error: null };

}



export async function fetchRuntimeAgentLogs(

  limit = 300,

): Promise<AgentOpsRuntimeMirrorResult<AgentOpsRuntimeAgentLogRow[]>> {

  const { data, error } = await supabase

    .from(AGENTOPS_RUNTIME_TABLES.agentLogs)

    .select("*")

    .eq("environment", AGENTOPS_RUNTIME_ENVIRONMENT)

    .order("created_at", { ascending: false })

    .limit(limit);



  if (error) return { data: [], error: toError(error) };

  return { data: (data ?? []) as AgentOpsRuntimeAgentLogRow[], error: null };

}



export async function fetchRuntimeAgentLogsForAgent(

  agentId: string,

  limit = 100,

): Promise<AgentOpsRuntimeMirrorResult<AgentOpsRuntimeAgentLogRow[]>> {

  const { data, error } = await supabase

    .from(AGENTOPS_RUNTIME_TABLES.agentLogs)

    .select("*")

    .eq("environment", AGENTOPS_RUNTIME_ENVIRONMENT)

    .eq("agent_id", agentId)

    .order("created_at", { ascending: false })

    .limit(limit);



  if (error) return { data: [], error: toError(error) };

  return { data: (data ?? []) as AgentOpsRuntimeAgentLogRow[], error: null };

}



export async function fetchRuntimeSystemConfig(): Promise<

  AgentOpsRuntimeMirrorResult<AgentOpsRuntimeSystemConfigRow | null>

> {

  const { data, error } = await supabase

    .from(AGENTOPS_RUNTIME_TABLES.systemConfig)

    .select("*")

    .eq("environment", AGENTOPS_RUNTIME_ENVIRONMENT)

    .order("created_at", { ascending: false })

    .limit(1)

    .maybeSingle();



  if (error) return { data: null, error: toError(error) };

  return { data: (data as AgentOpsRuntimeSystemConfigRow | null) ?? null, error: null };

}



export type AgentOpsRuntimeDashboardBundle = {

  agents: AgentOpsRuntimeAgentRow[];

  issues: AgentOpsRuntimeIssueRow[];

  memory: AgentOpsRuntimeMemoryRow[];

  logs: AgentOpsRuntimeAgentLogRow[];

  config: AgentOpsRuntimeSystemConfigRow | null;

};



export function isRuntimeDashboardBundleEmpty(bundle: AgentOpsRuntimeDashboardBundle): boolean {

  return (

    bundle.agents.length === 0 &&

    bundle.issues.length === 0 &&

    bundle.memory.length === 0 &&

    bundle.logs.length === 0 &&

    bundle.config == null

  );

}



export async function fetchRuntimeDashboardBundle(): Promise<

  AgentOpsRuntimeMirrorResult<AgentOpsRuntimeDashboardBundle>

> {

  const emptyBundle: AgentOpsRuntimeDashboardBundle = {

    agents: [],

    issues: [],

    memory: [],

    logs: [],

    config: null,

  };



  const [agents, issues, memory, logs, config] = await Promise.all([

    fetchRuntimeAgents(),

    fetchRuntimeIssues(200),

    fetchRuntimeMemory(50),

    fetchRuntimeAgentLogs(50),

    fetchRuntimeSystemConfig(),

  ]);



  const errors = [agents, issues, memory, logs, config]

    .map((result) => result.error)

    .filter((value): value is string => Boolean(value));



  if (errors.length > 0) {

    return {

      data: emptyBundle,

      error: errors.join(" · "),

    };

  }



  return {

    data: {

      agents: agents.data,

      issues: issues.data,

      memory: memory.data,

      logs: logs.data,

      config: config.data,

    },

    error: null,

  };

}

