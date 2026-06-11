/**
 * STAGING-TOOLS-1 — staging Supabase ref guard for AgentOps runner scripts (.mjs).
 * Mirrors api/agentops/agentopsStagingGuard.ts (env-only, no secrets).
 */

export const AGENTOPS_STAGING_GUARD_ERROR =
  "AgentOps is staging-only. Supabase project ref does not match configured staging project.";

function readEnv(env, name) {
  const value = env[name] ?? process.env[name];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export function extractSupabaseProjectRefFromUrl(supabaseUrl) {
  if (!supabaseUrl || typeof supabaseUrl !== "string") return null;
  const trimmed = supabaseUrl.trim();
  if (!trimmed) return null;
  try {
    const host = new URL(trimmed).hostname.toLowerCase();
    const match = host.match(/^([a-z0-9]+)\.supabase\.co$/i);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

export function evaluateAgentOpsStagingGuard(env = process.env) {
  const allowNonStaging = readEnv(env, "AGENTOPS_ALLOW_NON_STAGING") === "true";
  const expectedProjectRef = readEnv(env, "AGENTOPS_STAGING_SUPABASE_PROJECT_REF") ?? null;
  const configuredUrl = readEnv(env, "VITE_SUPABASE_URL");
  const configuredProjectRef = extractSupabaseProjectRefFromUrl(configuredUrl);
  const environment = readEnv(env, "AGENTOPS_ENVIRONMENT") ?? null;
  const vercelEnv = readEnv(env, "VERCEL_ENV");
  const productionBlocked = vercelEnv === "production";

  if (productionBlocked) {
    return {
      ok: false,
      blocked: true,
      reason: "AgentOps execution is blocked on production deployments.",
      expectedProjectRef,
      configuredProjectRef,
      allowNonStaging,
      productionBlocked: true,
      environment,
    };
  }

  if (allowNonStaging) {
    return {
      ok: true,
      blocked: false,
      reason: null,
      expectedProjectRef,
      configuredProjectRef,
      allowNonStaging: true,
      productionBlocked: false,
      environment,
    };
  }

  if (!expectedProjectRef) {
    return {
      ok: false,
      blocked: true,
      reason:
        "AGENTOPS_STAGING_SUPABASE_PROJECT_REF is not configured. Set it to the staging Supabase project ref.",
      expectedProjectRef: null,
      configuredProjectRef,
      allowNonStaging: false,
      productionBlocked: false,
      environment,
    };
  }

  if (!configuredProjectRef) {
    return {
      ok: false,
      blocked: true,
      reason: "VITE_SUPABASE_URL is missing or does not contain a valid Supabase project ref.",
      expectedProjectRef,
      configuredProjectRef: null,
      allowNonStaging: false,
      productionBlocked: false,
      environment,
    };
  }

  if (configuredProjectRef !== expectedProjectRef) {
    return {
      ok: false,
      blocked: true,
      reason: AGENTOPS_STAGING_GUARD_ERROR,
      expectedProjectRef,
      configuredProjectRef,
      allowNonStaging: false,
      productionBlocked: false,
      environment,
    };
  }

  return {
    ok: true,
    blocked: false,
    reason: null,
    expectedProjectRef,
    configuredProjectRef,
    allowNonStaging: false,
    productionBlocked: false,
    environment,
  };
}

export function stagingGuardStatusPayload(env = process.env) {
  const guard = evaluateAgentOpsStagingGuard(env);
  return { stagingGuard: { ...guard, ok: guard.ok } };
}

export function guardAgentOpsExecutionResponse(env = process.env) {
  const guard = evaluateAgentOpsStagingGuard(env);
  if (guard.ok) return null;

  return Response.json(
    {
      ok: false,
      status: "blocked",
      error: guard.reason ?? AGENTOPS_STAGING_GUARD_ERROR,
      stagingGuard: {
        blocked: true,
        expectedProjectRef: guard.expectedProjectRef,
        configuredProjectRef: guard.configuredProjectRef,
        allowNonStaging: guard.allowNonStaging,
        productionBlocked: guard.productionBlocked,
        environment: guard.environment,
      },
    },
    { status: 403 },
  );
}
