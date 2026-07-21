/**
 * D-F1 — upsert dedicated Hermes connection rows for all canonical agents (staging).
 * Uses service role locally; does not expose secrets.
 */
import fs from "fs";
import { createClient } from "@supabase/supabase-js";

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvFile(".env.local");
loadEnvFile("qa-agent/browser-qa/.env.owner.local");

const url = process.env.STAGING_SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const key =
  process.env.STAGING_SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing staging Supabase URL/service role");
  process.exit(2);
}

const CANONICAL = [
  "system-agent",
  "memory-agent",
  "issue-agent",
  "evolution-agent",
  "fix-agent",
  "qa-agent",
  "design-agent",
  "runtime-agent",
  "logs-agent",
  "config-agent",
  "chat-agent",
  "analytics-agent",
];

const client = createClient(url, key, { auth: { persistSession: false } });

const { data: agents, error: agentsError } = await client
  .from("agentops_agents")
  .select("id, tools")
  .eq("environment", "staging")
  .limit(100);
if (agentsError) {
  console.error(agentsError.message);
  process.exit(1);
}

const results = [];
for (const slug of CANONICAL) {
  const tag = `canonical:${slug}`;
  const runtime = (agents || []).find((row) => (row.tools || []).includes(tag));
  const namespace = `agentops.agent.${slug}`;

  // Probe retrieval (owner memory + runtime memory) to set honest status.
  const drafts = await client
    .from("agentops_agent_memory")
    .select("id")
    .eq("agent_id", slug)
    .limit(1);
  let runtimeOk = true;
  let runtimeError = null;
  if (runtime?.id) {
    const mem = await client
      .from("agentops_memory")
      .select("id")
      .eq("environment", "staging")
      .eq("scope", "agent")
      .eq("agent_id", runtime.id)
      .limit(1);
    if (mem.error) {
      runtimeOk = false;
      runtimeError = mem.error.message;
    }
  } else {
    runtimeOk = false;
    runtimeError = "runtime agent missing";
  }
  const draftOk = !drafts.error;
  const retrievalOk = draftOk && runtimeOk;
  const status = retrievalOk ? "connected" : runtime?.id ? "error" : "not_configured";
  const now = new Date().toISOString();

  const { data, error } = await client
    .from("agentops_agent_hermes_connections")
    .upsert(
      {
        agent_slug: slug,
        runtime_agent_id: runtime?.id ?? null,
        hermes_namespace: namespace,
        status,
        connection_version: "d-f1",
        last_health_check_at: now,
        last_memory_sync_at: now,
        metadata: {
          phase: "d-f1",
          seededBy: "agentops-d-f1-seed-hermes-connections",
          lastRetrievalOk: retrievalOk,
          lastRetrievalError: draftOk ? runtimeError : drafts.error?.message ?? runtimeError,
        },
      },
      { onConflict: "agent_slug" },
    )
    .select("agent_slug, hermes_namespace, status, runtime_agent_id")
    .single();

  results.push({
    slug,
    ok: !error,
    error: error?.message ?? null,
    row: data ?? null,
    retrievalOk,
  });
}

const namespaces = results.map((r) => r.row?.hermes_namespace).filter(Boolean);
const unique = new Set(namespaces).size === namespaces.length;
const connected = results.filter((r) => r.row?.status === "connected").length;
console.log(
  JSON.stringify(
    {
      ok: results.every((r) => r.ok) && unique,
      upserted: results.filter((r) => r.ok).length,
      connected,
      uniqueNamespaces: unique,
      results,
    },
    null,
    2,
  ),
);
process.exit(results.every((r) => r.ok) && unique ? 0 : 1);
