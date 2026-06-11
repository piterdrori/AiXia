/**
 * Server-only Supabase client for read-only AgentOps Hermes context assembly.
 * Uses backend env vars only — never exposed to the browser.
 * Execution/write routes must pass agentopsStagingGuard before using this client for writes.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { readServerEnv } from "./ollamaProxy.js";

let cachedClient: SupabaseClient | null = null;

export function isAgentOpsServerSupabaseConfigured(): boolean {
  const url = readServerEnv("VITE_SUPABASE_URL");
  const key =
    readServerEnv("SUPABASE_SERVICE_ROLE_KEY") ?? readServerEnv("VITE_SUPABASE_ANON_KEY");
  return Boolean(url && key);
}

export function getAgentOpsServerSupabase(): SupabaseClient | null {
  if (cachedClient) return cachedClient;

  const url = readServerEnv("VITE_SUPABASE_URL");
  const key =
    readServerEnv("SUPABASE_SERVICE_ROLE_KEY") ?? readServerEnv("VITE_SUPABASE_ANON_KEY");
  if (!url || !key) return null;

  cachedClient = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cachedClient;
}
