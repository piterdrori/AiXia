/**
 * AgentOps staging Supabase project ref guard (server-side).
 * Blocks execution when configured Supabase is not the staging project.
 */

export const AGENTOPS_STAGING_GUARD_ERROR =
  "AgentOps is staging-only. Supabase project ref does not match configured staging project.";

export type AgentOpsStagingGuardResult = {
  ok: boolean;
  blocked: boolean;
  reason: string | null;
  expectedProjectRef: string | null;
  configuredProjectRef: string | null;
  allowNonStaging: boolean;
  productionBlocked: boolean;
  environment: string | null;
};

export function extractSupabaseProjectRefFromUrl(
  supabaseUrl: string | undefined | null,
): string | null {
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

export function readAgentOpsConfiguredSupabaseUrl(
  env: NodeJS.ProcessEnv = process.env,
): string | undefined {
  const value = env.VITE_SUPABASE_URL;
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function readEnvValue(env: NodeJS.ProcessEnv, name: string): string | undefined {
  const value = env[name];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export function evaluateAgentOpsStagingGuard(
  env: NodeJS.ProcessEnv = process.env,
): AgentOpsStagingGuardResult {
  const allowNonStaging = readEnvValue(env, "AGENTOPS_ALLOW_NON_STAGING") === "true";
  const expectedProjectRef = readEnvValue(env, "AGENTOPS_STAGING_SUPABASE_PROJECT_REF") ?? null;
  const configuredUrl = readAgentOpsConfiguredSupabaseUrl(env);
  const configuredProjectRef = extractSupabaseProjectRefFromUrl(configuredUrl);
  const environment = readEnvValue(env, "AGENTOPS_ENVIRONMENT") ?? null;
  const productionBlocked = readEnvValue(env, "VERCEL_ENV") === "production";

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

export function guardAgentOpsExecutionResponse(
  env: NodeJS.ProcessEnv = process.env,
): Response | null {
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

export function stagingGuardStatusPayload(env: NodeJS.ProcessEnv = process.env) {
  const guard = evaluateAgentOpsStagingGuard(env);
  return {
    stagingGuard: {
      ok: guard.ok,
      blocked: guard.blocked,
      reason: guard.reason,
      expectedProjectRef: guard.expectedProjectRef,
      configuredProjectRef: guard.configuredProjectRef,
      allowNonStaging: guard.allowNonStaging,
      productionBlocked: guard.productionBlocked,
      environment: guard.environment,
    },
  };
}
