#!/usr/bin/env node
/**
 * GitHub Actions preflight — validate staging secrets and block production targets.
 */

const target =
  process.env.AGENTOPS_MONITORING_TARGET_BASE_URL?.trim() ||
  process.env.AGENTOPS_QA_BASE_URL?.trim() ||
  "";

if (!target) {
  console.error(
    "[agentops-monitoring-gha] Missing AGENTOPS_QA_BASE_URL repository secret (maps to monitoring target).",
  );
  process.exit(1);
}

if (!process.env.VITE_SUPABASE_URL?.trim()) {
  console.error(
    "[agentops-monitoring-gha] Missing STAGING_SUPABASE_URL repository secret (maps to VITE_SUPABASE_URL).",
  );
  process.exit(1);
}

const hasSupabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
  process.env.VITE_SUPABASE_ANON_KEY?.trim();
if (!hasSupabaseKey) {
  console.error(
    "[agentops-monitoring-gha] Missing STAGING_SUPABASE_ANON_KEY or STAGING_SUPABASE_SERVICE_ROLE_KEY.",
  );
  process.exit(1);
}

if (process.env.AGENTOPS_MONITORING_DRY_RUN?.trim().toLowerCase() !== "true") {
  console.error("[agentops-monitoring-gha] AGENTOPS_MONITORING_DRY_RUN must be true for Phase 5A.");
  process.exit(1);
}

if (process.env.AGENTOPS_OWNER_APPROVED_MONITORING_WRITE?.trim().toLowerCase() === "true") {
  console.error(
    "[agentops-monitoring-gha] AGENTOPS_OWNER_APPROVED_MONITORING_WRITE must not be set in Phase 5A.",
  );
  process.exit(1);
}

let parsed;
try {
  parsed = new URL(target);
} catch {
  console.error(`[agentops-monitoring-gha] Invalid target URL: ${target}`);
  process.exit(1);
}

const host = parsed.hostname.toLowerCase();
const productionBlocked =
  host === "aixia.app" ||
  host.endsWith(".aixia.app") ||
  host.includes("production") ||
  parsed.hostname === "localhost" ||
  parsed.hostname === "127.0.0.1";

if (productionBlocked && !host.includes("staging")) {
  if (host === "aixia.app" || host.endsWith(".aixia.app") || host.includes("production")) {
    console.error(
      `[agentops-monitoring-gha] Production-like target blocked: ${parsed.hostname}`,
    );
    process.exit(1);
  }
}

if (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") {
  console.error(
    "[agentops-monitoring-gha] Localhost target is not valid in GitHub Actions — set AGENTOPS_QA_BASE_URL to deployed staging.",
  );
  process.exit(1);
}

const allowed =
  host.includes("staging") || host.endsWith(".vercel.app") || host.includes("preview");
if (!allowed) {
  console.error(
    `[agentops-monitoring-gha] Target host not approved for cloud dry-run: ${parsed.hostname}`,
  );
  process.exit(1);
}

console.log("[agentops-monitoring-gha] Preflight OK — target host:", parsed.hostname);
console.log("[agentops-monitoring-gha] Dry-run:", process.env.AGENTOPS_MONITORING_DRY_RUN);
console.log("[agentops-monitoring-gha] Continuous:", process.env.AGENTOPS_MONITORING_CONTINUOUS_ENABLED);
