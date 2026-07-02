#!/usr/bin/env node
/**
 * Set GitHub repository secrets for AgentOps monitoring GHA dry-run.
 * Never prints secret values. Requires: gh auth login, AGENTOPS_QA_BASE_URL.
 *
 * Usage:
 *   AGENTOPS_QA_BASE_URL=https://your-staging.vercel.app node scripts/agentops-monitoring-gha-secrets-setup.mjs
 */
import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = join(root, ".env.local");

function parseEnvFile(text) {
  const out = {};
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

function fail(message) {
  console.error(`[gha-secrets-setup] ${message}`);
  process.exit(1);
}

function validateStagingUrl(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    fail("AGENTOPS_QA_BASE_URL is not a valid URL.");
  }
  if (parsed.protocol !== "https:") {
    fail("AGENTOPS_QA_BASE_URL must use https://");
  }
  const host = parsed.hostname.toLowerCase();
  if (host === "localhost" || host === "127.0.0.1") {
    fail("AGENTOPS_QA_BASE_URL cannot be localhost.");
  }
  const productionLike =
    host === "aixia.app" ||
    host.endsWith(".aixia.app") ||
    host.includes("production");
  if (productionLike && !host.includes("staging")) {
    fail("AGENTOPS_QA_BASE_URL looks like production — blocked.");
  }
  const allowed =
    host.includes("staging") || host.endsWith(".vercel.app") || host.includes("preview");
  if (!allowed) {
    fail(`AGENTOPS_QA_BASE_URL host not approved: ${host}`);
  }
  return parsed.href.replace(/\/+$/, "");
}

function ghSecretSet(name, value, repo) {
  const args = ["secret", "set", name, "--repo", repo];
  const result = spawnSync("gh", args, {
    input: value,
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"],
  });
  if (result.status !== 0) {
    fail(`Failed to set secret ${name}: ${result.stderr?.trim() || "unknown error"}`);
  }
  console.log(`[gha-secrets-setup] Set secret: ${name}`);
}

function ghSecretList(repo) {
  const result = spawnSync("gh", ["secret", "list", "--repo", repo], {
    encoding: "utf8",
  });
  if (result.status !== 0) {
    fail(`gh secret list failed: ${result.stderr?.trim() || "unknown error"}`);
  }
  return result.stdout;
}

const auth = spawnSync("gh", ["auth", "status"], { encoding: "utf8" });
if (auth.status !== 0) {
  fail("GitHub CLI not authenticated. Run: gh auth login");
}

const remote = spawnSync("gh", ["repo", "view", "--json", "nameWithOwner", "-q", ".nameWithOwner"], {
  cwd: root,
  encoding: "utf8",
});
const repo = remote.stdout?.trim();
if (!repo) fail("Could not resolve GitHub repository from gh repo view.");

const fileEnv = existsSync(envPath) ? parseEnvFile(readFileSync(envPath, "utf8")) : {};

const qaBaseUrl = (
  process.env.AGENTOPS_QA_BASE_URL ||
  fileEnv.AGENTOPS_QA_BASE_URL ||
  ""
).trim();
if (!qaBaseUrl) {
  fail(
    "AGENTOPS_QA_BASE_URL missing. Set env or add to .env.local — must be a public deployed staging URL.",
  );
}

const stagingSupabaseUrl = (fileEnv.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL || "").trim();
const anonKey = (
  fileEnv.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || ""
).trim();
const serviceRoleKey = (
  fileEnv.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || ""
).trim();

if (!stagingSupabaseUrl) fail("STAGING_SUPABASE_URL source missing (VITE_SUPABASE_URL in .env.local).");
if (!anonKey) fail("STAGING_SUPABASE_ANON_KEY source missing.");
if (!serviceRoleKey) fail("STAGING_SUPABASE_SERVICE_ROLE_KEY source missing.");

if (!stagingSupabaseUrl.includes("ydppcpbxrvvardeslzrk")) {
  fail("Supabase URL does not match staging project ref ydppcpbxrvvardeslzrk.");
}

const normalizedUrl = validateStagingUrl(qaBaseUrl);

ghSecretSet("AGENTOPS_QA_BASE_URL", normalizedUrl, repo);
ghSecretSet("STAGING_SUPABASE_URL", stagingSupabaseUrl, repo);
ghSecretSet("STAGING_SUPABASE_ANON_KEY", anonKey, repo);
ghSecretSet("STAGING_SUPABASE_SERVICE_ROLE_KEY", serviceRoleKey, repo);

console.log("\n[gha-secrets-setup] Configured secrets (names only):");
console.log(ghSecretList(repo));
console.log(`\n[gha-secrets-setup] Staging target host: ${new URL(normalizedUrl).hostname}`);
