/**
 * Staging monitoring status read client — service role required (no anon/RLS silent empty reads).
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const MONITORING_STAGING_PROJECT_REF = "ydppcpbxrvvardeslzrk";

export type MonitoringReadClientErrorReason =
  | "missing_url"
  | "missing_service_role_key"
  | "wrong_project_ref"
  | "anon_key_rejected";

export type MonitoringReadClientResult =
  | { ok: true; client: SupabaseClient; projectRef: string; authMode: "service_role" }
  | { ok: false; error: string; reason: MonitoringReadClientErrorReason; projectRef: string | null };

function readEnv(env: NodeJS.ProcessEnv, name: string): string | undefined {
  const value = env[name];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export function resolveMonitoringSupabaseUrl(env: NodeJS.ProcessEnv = process.env): string | undefined {
  return (
    readEnv(env, "VITE_SUPABASE_URL") ??
    readEnv(env, "SUPABASE_URL") ??
    readEnv(env, "STAGING_SUPABASE_URL")
  );
}

export function resolveMonitoringServiceRoleKey(env: NodeJS.ProcessEnv = process.env): string | undefined {
  return (
    readEnv(env, "SUPABASE_SERVICE_ROLE_KEY") ??
    readEnv(env, "STAGING_SUPABASE_SERVICE_ROLE_KEY") ??
    readEnv(env, "VITE_SUPABASE_SERVICE_ROLE_KEY")
  );
}

export function extractSupabaseProjectRef(url: string | undefined): string | null {
  if (!url) return null;
  try {
    const host = new URL(url).hostname.toLowerCase();
    const match = host.match(/^([a-z0-9]+)\.supabase\.co$/i);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

export function decodeSupabaseJwtRole(key: string): string | null {
  try {
    const segment = key.split(".")[1];
    if (!segment) return null;
    const normalized = segment.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const json =
      typeof Buffer !== "undefined"
        ? Buffer.from(padded, "base64").toString("utf8")
        : atob(padded);
    const payload = JSON.parse(json) as { role?: string };
    return typeof payload.role === "string" ? payload.role : null;
  } catch {
    return null;
  }
}

export function createMonitoringReadClient(
  env: NodeJS.ProcessEnv = process.env,
): MonitoringReadClientResult {
  const url = resolveMonitoringSupabaseUrl(env);
  if (!url) {
    return {
      ok: false,
      error:
        "Staging Supabase URL is not configured (VITE_SUPABASE_URL, SUPABASE_URL, or STAGING_SUPABASE_URL).",
      reason: "missing_url",
      projectRef: null,
    };
  }

  const projectRef = extractSupabaseProjectRef(url);
  if (projectRef !== MONITORING_STAGING_PROJECT_REF) {
    return {
      ok: false,
      error: `Monitoring status reads require staging Supabase ref ${MONITORING_STAGING_PROJECT_REF}; configured ref is ${projectRef ?? "invalid"}.`,
      reason: "wrong_project_ref",
      projectRef,
    };
  }

  const key = resolveMonitoringServiceRoleKey(env);
  if (!key) {
    return {
      ok: false,
      error:
        "SUPABASE_SERVICE_ROLE_KEY (or STAGING_SUPABASE_SERVICE_ROLE_KEY) is required for monitoring status reads on Vercel.",
      reason: "missing_service_role_key",
      projectRef,
    };
  }

  const role = decodeSupabaseJwtRole(key);
  if (role && role !== "service_role") {
    return {
      ok: false,
      error: `Monitoring status reads require a service_role Supabase key; configured key role is '${role}'.`,
      reason: "anon_key_rejected",
      projectRef,
    };
  }

  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return { ok: true, client, projectRef, authMode: "service_role" };
}
