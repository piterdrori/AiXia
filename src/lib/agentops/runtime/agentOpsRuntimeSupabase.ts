/**
 * Server-side Supabase client for AgentOps runtime engine (staging only).
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { evaluateAgentOpsStagingGuard } from "../execution/agentOpsStagingGuard";

let cachedClient: SupabaseClient | null = null;

function readEnv(name: string): string | undefined {
  const value = process.env[name];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export type AgentOpsRuntimeSupabaseBootstrapResult =
  | { ok: true; client: SupabaseClient }
  | { ok: false; error: string };

export function assertAgentOpsRuntimeStagingAllowed(): string | null {
  const guard = evaluateAgentOpsStagingGuard(process.env);
  if (!guard.ok) {
    return guard.reason ?? "AgentOps runtime blocked by staging guard.";
  }
  return null;
}

export function createAgentOpsRuntimeSupabaseClient(): AgentOpsRuntimeSupabaseBootstrapResult {
  const guardError = assertAgentOpsRuntimeStagingAllowed();
  if (guardError) return { ok: false, error: guardError };

  const url = readEnv("VITE_SUPABASE_URL") ?? readEnv("SUPABASE_URL");
  const key =
    readEnv("SUPABASE_SERVICE_ROLE_KEY") ?? readEnv("VITE_SUPABASE_ANON_KEY");

  if (!url || !key) {
    return {
      ok: false,
      error: "Missing VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or anon key).",
    };
  }

  if (!cachedClient) {
    cachedClient = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  return { ok: true, client: cachedClient };
}

export function resetAgentOpsRuntimeSupabaseClientForTests(): void {
  cachedClient = null;
}
