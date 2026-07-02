/**
 * Legacy health adapter — canonical probes live in agentOpsSupabaseConnection.ts.
 */

import { supabase } from "@/lib/supabase";

import { AGENTOPS_RUNTIME_TABLES } from "../db/agentOpsRuntimeTypes";
import {
  isAgentOpsSchemaReady,
  readSupabaseProjectRef,
  verifySupabaseProjectHealth,
} from "./agentOpsSupabaseConnection";

export type AgentOpsSystemHealthErrorType =
  | "missing_table"
  | "schema_cache"
  | "network"
  | "auth"
  | "unknown";

export type AgentOpsRuntimeTableProbe = {
  table: string;
  ok: boolean;
  error?: string;
  errorType?: AgentOpsSystemHealthErrorType;
};

export type AgentOpsSystemHealth = {
  connected: boolean;
  missingTables: string[];
  error?: string;
  errorType?: AgentOpsSystemHealthErrorType;
  projectRef?: string;
  runtimeMode?: string | null;
  tables: AgentOpsRuntimeTableProbe[];
};

export { readSupabaseProjectRef };

export function classifySupabaseError(message: string): AgentOpsSystemHealthErrorType {
  const lower = message.toLowerCase();

  if (
    lower.includes("schema cache") ||
    lower.includes("could not find the table") ||
    lower.includes("could not find a relationship")
  ) {
    return "schema_cache";
  }

  if (
    lower.includes("does not exist") ||
    (lower.includes("relation") && lower.includes("not exist"))
  ) {
    return "missing_table";
  }

  if (
    lower.includes("failed to fetch") ||
    lower.includes("network") ||
    lower.includes("fetch error") ||
    lower.includes("networkerror")
  ) {
    return "network";
  }

  if (
    lower.includes("jwt") ||
    lower.includes("not authenticated") ||
    lower.includes("permission denied") ||
    lower.includes("row-level security")
  ) {
    return "auth";
  }

  return "unknown";
}

/** Legacy wrapper — prefer verifySupabaseProjectHealth(). */
export async function checkAgentOpsSystemHealth(): Promise<AgentOpsSystemHealth> {
  const project = await verifySupabaseProjectHealth();
  let runtimeMode: string | null = null;

  if (isAgentOpsSchemaReady(project)) {
    const { data, error } = await supabase
      .from(AGENTOPS_RUNTIME_TABLES.systemConfig)
      .select("runtime_mode")
      .limit(1)
      .maybeSingle();
    if (!error && data && typeof data.runtime_mode === "string") {
      runtimeMode = data.runtime_mode;
    }
  }

  return {
    connected: project.connected,
    missingTables: Object.entries(project.table_status)
      .filter(([, status]) => status !== "ok")
      .map(([table]) => table),
    error: project.error,
    errorType: project.project_ref_mismatch
      ? "schema_cache"
      : Object.values(project.table_status).some((s) => s === "missing")
        ? "schema_cache"
        : undefined,
    projectRef: project.project_ref,
    runtimeMode,
    tables: Object.entries(project.table_status).map(([table, status]) => ({
      table,
      ok: status === "ok",
      error: status === "ok" ? undefined : project.error,
      errorType:
        status === "missing"
          ? "schema_cache"
          : status === "error"
            ? "unknown"
            : undefined,
    })),
  };
}

/** @deprecated Use verifySupabaseProjectHealth table probes instead. */
export async function probeRuntimeTable(table: string): Promise<AgentOpsRuntimeTableProbe> {
  const project = await verifySupabaseProjectHealth();
  const status = project.table_status[table as keyof typeof project.table_status];
  if (status === "ok") return { table, ok: true };
  return {
    table,
    ok: false,
    error: project.error,
    errorType: status === "missing" ? "schema_cache" : "unknown",
  };
}
