/**
 * AgentOps runtime mirror — Supabase connection truth (browser client only).
 * Single client: @/lib/supabase (VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY).
 */

import { supabase } from "@/lib/supabase";

import { AGENTOPS_RUNTIME_TABLES } from "../db/agentOpsRuntimeTypes";

export const AGENTOPS_RUNTIME_SCHEMA = "public" as const;

export const AGENTOPS_RUNTIME_MIGRATION_FILE =
  "supabase/migrations/20260616120000_agentops_runtime_foundation.sql";

const RUNTIME_TABLES = [
  AGENTOPS_RUNTIME_TABLES.agents,
  AGENTOPS_RUNTIME_TABLES.issues,
  AGENTOPS_RUNTIME_TABLES.memory,
  AGENTOPS_RUNTIME_TABLES.agentLogs,
  AGENTOPS_RUNTIME_TABLES.systemConfig,
] as const;

export type AgentOpsTableConnectionStatus = "ok" | "missing" | "error";

export type AgentOpsSupabaseProjectHealth = {
  connected: boolean;
  project_ref: string;
  schema: string;
  table_status: Record<(typeof RUNTIME_TABLES)[number], AgentOpsTableConnectionStatus>;
  error?: string;
  migration_target_ref?: string;
  project_ref_mismatch: boolean;
};

export type AgentOpsConnectionDebugInfo = {
  supabaseUrlMasked: string;
  projectRef: string | undefined;
  schema: string;
  anonKeyPresent: boolean;
  serviceRoleKeyPresent: boolean;
  migrationTargetRef: string | undefined;
  clientSource: string;
  singleClientVerified: true;
};

let cachedProjectHealth: AgentOpsSupabaseProjectHealth | null = null;
let cachedProjectHealthAt = 0;

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return "Unknown Supabase error";
}

export function readSupabaseProjectRef(): string | undefined {
  const url = import.meta.env.VITE_SUPABASE_URL;
  if (typeof url !== "string" || !url.trim()) return undefined;

  try {
    const hostname = new URL(url.trim()).hostname.toLowerCase();
    const match = hostname.match(/^([a-z0-9]+)\.supabase\.co$/i);
    return match?.[1] ?? (hostname.split(".")[0] || undefined);
  } catch {
    return undefined;
  }
}

export function readMigrationTargetProjectRef(): string | undefined {
  const value = import.meta.env.VITE_AGENTOPS_STAGING_SUPABASE_PROJECT_REF;
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export function maskSupabaseUrl(url: string | undefined): string {
  if (!url || !url.trim()) return "(missing VITE_SUPABASE_URL)";

  try {
    const parsed = new URL(url.trim());
    const ref = parsed.hostname.split(".")[0] ?? "";
    if (ref.length <= 8) return `${parsed.protocol}//${ref}.supabase.co`;
    return `${parsed.protocol}//${ref.slice(0, 4)}…${ref.slice(-4)}.supabase.co`;
  } catch {
    return "(invalid VITE_SUPABASE_URL)";
  }
}

export function getAgentOpsConnectionDebugInfo(): AgentOpsConnectionDebugInfo {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  return {
    supabaseUrlMasked: maskSupabaseUrl(typeof url === "string" ? url : undefined),
    projectRef: readSupabaseProjectRef(),
    schema: AGENTOPS_RUNTIME_SCHEMA,
    anonKeyPresent: typeof anonKey === "string" && anonKey.trim().length > 0,
    serviceRoleKeyPresent: false,
    migrationTargetRef: readMigrationTargetProjectRef(),
    clientSource: "@/lib/supabase.ts → createClient(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)",
    singleClientVerified: true,
  };
}

export function getSupabaseSqlEditorUrl(projectRef: string): string {
  return `https://supabase.com/dashboard/project/${projectRef}/sql/new`;
}

function classifyTableStatus(message: string): AgentOpsTableConnectionStatus {
  const lower = message.toLowerCase();
  if (
    lower.includes("schema cache") ||
    lower.includes("could not find the table") ||
    lower.includes("does not exist") ||
    (lower.includes("relation") && lower.includes("not exist"))
  ) {
    return "missing";
  }
  return "error";
}

async function probeTableStatus(
  table: (typeof RUNTIME_TABLES)[number],
): Promise<AgentOpsTableConnectionStatus> {
  try {
    const { error } = await supabase.from(table).select("*").limit(1);
    if (!error) return "ok";
    return classifyTableStatus(toErrorMessage(error));
  } catch (caught) {
    return classifyTableStatus(toErrorMessage(caught));
  }
}

/**
 * Verify live Supabase project + all AgentOps runtime tables (LIMIT 1 each).
 */
export async function verifySupabaseProjectHealth(
  options: { bypassCache?: boolean; cacheTtlMs?: number } = {},
): Promise<AgentOpsSupabaseProjectHealth> {
  const cacheTtlMs = options.cacheTtlMs ?? 8_000;
  if (
    !options.bypassCache &&
    cachedProjectHealth &&
    Date.now() - cachedProjectHealthAt < cacheTtlMs
  ) {
    return cachedProjectHealth;
  }

  const project_ref = readSupabaseProjectRef() ?? "unknown";
  const migration_target_ref = readMigrationTargetProjectRef();
  const project_ref_mismatch = Boolean(
    migration_target_ref && project_ref !== "unknown" && project_ref !== migration_target_ref,
  );

  const probes = await Promise.all(
    RUNTIME_TABLES.map(async (table) => [table, await probeTableStatus(table)] as const),
  );

  const table_status = Object.fromEntries(probes) as AgentOpsSupabaseProjectHealth["table_status"];

  const statuses = Object.values(table_status);
  const hasMissing = statuses.some((status) => status === "missing");
  const hasError = statuses.some((status) => status === "error");
  const allOk = statuses.every((status) => status === "ok");

  let connected = allOk;
  let error: string | undefined;

  if (hasMissing) {
    connected = false;
    error = "Could not find AgentOps runtime tables in Supabase schema cache.";
  } else if (hasError) {
    connected = false;
    error = "AgentOps runtime table probes returned errors.";
  }

  if (project_ref_mismatch) {
    error = error
      ? `${error} Connected project ref (${project_ref}) does not match migration target (${migration_target_ref}).`
      : `Connected project ref (${project_ref}) does not match migration target (${migration_target_ref}).`;
    connected = false;
  }

  const result: AgentOpsSupabaseProjectHealth = {
    connected,
    project_ref,
    schema: AGENTOPS_RUNTIME_SCHEMA,
    table_status,
    error,
    migration_target_ref,
    project_ref_mismatch,
  };

  cachedProjectHealth = result;
  cachedProjectHealthAt = Date.now();
  return result;
}

export function isAgentOpsSchemaReady(health: AgentOpsSupabaseProjectHealth | null): boolean {
  if (!health) return false;
  return health.connected && Object.values(health.table_status).every((status) => status === "ok");
}

export function listMissingRuntimeTables(
  health: AgentOpsSupabaseProjectHealth,
): string[] {
  return Object.entries(health.table_status)
    .filter(([, status]) => status === "missing" || status === "error")
    .map(([table]) => table);
}

export function invalidateAgentOpsProjectHealthCache(): void {
  cachedProjectHealth = null;
  cachedProjectHealthAt = 0;
}
