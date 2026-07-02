/**
 * Phase 3 local/staging target URL validation — stricter than general runtime guard.
 */

import { assertStagingScanUrl } from "./stagingScanUrlGuard";

const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost", "::1"]);
const DEFAULT_LOCAL_PORT = "5173";

export type Phase3TargetValidationResult =
  | { ok: true; normalizedUrl: string; kind: "local" | "staging" }
  | { ok: false; error: string };

function isApprovedStagingHost(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  if (lower.includes("staging")) return true;
  if (lower.endsWith(".vercel.app")) return true;
  return false;
}

/** Validate monitoring target for Phase 3 local/staging activation commands. */
export function validatePhase3MonitoringTarget(url: string | undefined): Phase3TargetValidationResult {
  const trimmed = url?.trim();
  if (!trimmed) {
    return { ok: false, error: "Missing AGENTOPS_MONITORING_TARGET_BASE_URL." };
  }

  const guard = assertStagingScanUrl(trimmed);
  if (!guard.ok) {
    return { ok: false, error: guard.error };
  }

  let parsed: URL;
  try {
    parsed = new URL(guard.normalizedUrl);
  } catch {
    return { ok: false, error: `Invalid monitoring target URL: ${trimmed}` };
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { ok: false, error: "Monitoring target must use http or https." };
  }

  const host = parsed.hostname.toLowerCase();
  if (LOCAL_HOSTS.has(host)) {
    if (parsed.port && parsed.port !== DEFAULT_LOCAL_PORT) {
      return {
        ok: false,
        error: `Local Phase 3 target must use port ${DEFAULT_LOCAL_PORT} (got ${parsed.port}).`,
      };
    }
    if (!parsed.port && parsed.protocol === "http:") {
      return {
        ok: true,
        normalizedUrl: `${guard.normalizedUrl}:${DEFAULT_LOCAL_PORT}`,
        kind: "local",
      };
    }
    return { ok: true, normalizedUrl: guard.normalizedUrl, kind: "local" };
  }

  if (isApprovedStagingHost(host)) {
    return { ok: true, normalizedUrl: guard.normalizedUrl, kind: "staging" };
  }

  return {
    ok: false,
    error:
      "Phase 3 target must be http://127.0.0.1:5173, http://localhost:5173, or an approved staging host.",
  };
}
