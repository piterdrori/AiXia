/**
 * Staging URL guard — runtime Playwright scans may only target approved staging hosts.
 */

export type StagingScanUrlGuardResult =
  | { ok: true; normalizedUrl: string }
  | { ok: false; error: string };

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

function readAllowRemoteStaging(): boolean {
  return process.env.AGENTOPS_RUNTIME_ALLOW_REMOTE_STAGING === "true";
}

function isProductionHostname(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  if (lower.includes("production")) return true;
  if (lower === "aixia.app" || lower.endsWith(".aixia.app")) return true;
  return false;
}

function isAllowedStagingHostname(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  if (LOCAL_HOSTS.has(lower)) return true;
  if (lower.includes("staging")) return true;
  if (lower.endsWith(".vercel.app")) return true;
  return false;
}

export function assertStagingScanUrl(stagingUrl: string): StagingScanUrlGuardResult {
  const trimmed = stagingUrl?.trim();
  if (!trimmed) {
    return { ok: false, error: "staging_url is required for Playwright scanning." };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { ok: false, error: `Invalid staging_url: ${trimmed}` };
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { ok: false, error: "staging_url must use http or https." };
  }

  if (isProductionHostname(parsed.hostname)) {
    return { ok: false, error: "Production hosts are blocked for AgentOps runtime scanning." };
  }

  if (!readAllowRemoteStaging() && !isAllowedStagingHostname(parsed.hostname)) {
    return {
      ok: false,
      error:
        "staging_url host is not allowed. Use localhost/127.0.0.1 or set AGENTOPS_RUNTIME_ALLOW_REMOTE_STAGING=true.",
    };
  }

  if (process.env.VERCEL_ENV === "production") {
    return { ok: false, error: "AgentOps Playwright runtime is blocked on production deployments." };
  }

  return { ok: true, normalizedUrl: trimmed.replace(/\/+$/, "") };
}
