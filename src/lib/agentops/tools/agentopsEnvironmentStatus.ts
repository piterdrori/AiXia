/**
 * STAGING-TOOLS-1 — client-safe AgentOps environment status for Tools Hub badge.
 */

export type AgentOpsEnvironmentBadgeTone = "emerald" | "amber" | "rose" | "neutral" | "cyan";

export type AgentOpsEnvironmentStatus = {
  environmentLabel: string;
  environmentTone: AgentOpsEnvironmentBadgeTone;
  supabaseMatchLabel: string;
  supabaseMatchTone: AgentOpsEnvironmentBadgeTone;
  executionLabel: string;
  executionTone: AgentOpsEnvironmentBadgeTone;
  localDependencyWarning: string | null;
  configuredProjectRef: string | null;
  expectedProjectRef: string | null;
  supabaseMatch: boolean | null;
};

function extractSupabaseProjectRefFromUrl(url: string | undefined): string | null {
  if (!url?.trim()) return null;
  try {
    const host = new URL(url.trim()).hostname.toLowerCase();
    const match = host.match(/^([a-z0-9]+)\.supabase\.co$/i);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

export function getAgentOpsEnvironmentStatus(): AgentOpsEnvironmentStatus {
  const environment =
    import.meta.env.VITE_AGENTOPS_ENVIRONMENT?.trim() ||
    import.meta.env.VITE_VERCEL_ENV?.trim() ||
    "unknown";
  const expectedProjectRef =
    import.meta.env.VITE_AGENTOPS_STAGING_SUPABASE_PROJECT_REF?.trim() || null;
  const configuredProjectRef = extractSupabaseProjectRefFromUrl(
    import.meta.env.VITE_SUPABASE_URL,
  );
  const productionBlockedFlag =
    import.meta.env.VITE_AGENTOPS_PRODUCTION_BLOCKED?.trim() === "true";
  const isProductionEnv =
    environment === "production" || import.meta.env.VITE_VERCEL_ENV === "production";

  let environmentLabel = "Environment: unknown";
  let environmentTone: AgentOpsEnvironmentBadgeTone = "neutral";
  if (isProductionEnv || productionBlockedFlag) {
    environmentLabel = "Environment: production-blocked";
    environmentTone = "rose";
  } else if (environment === "staging" || environment === "preview" || environment === "development") {
    environmentLabel = `Environment: ${environment}`;
    environmentTone = "emerald";
  } else if (environment !== "unknown") {
    environmentLabel = `Environment: ${environment}`;
    environmentTone = "cyan";
  }

  let supabaseMatch: boolean | null = null;
  let supabaseMatchLabel = "Supabase target: unknown";
  let supabaseMatchTone: AgentOpsEnvironmentBadgeTone = "neutral";

  if (expectedProjectRef && configuredProjectRef) {
    supabaseMatch = configuredProjectRef === expectedProjectRef;
    supabaseMatchLabel = supabaseMatch
      ? `Supabase target: staging ref match (${configuredProjectRef})`
      : `Supabase target: mismatch (configured ${configuredProjectRef})`;
    supabaseMatchTone = supabaseMatch ? "emerald" : "rose";
  } else if (configuredProjectRef) {
    supabaseMatchLabel = `Supabase target: ${configuredProjectRef} (expected ref not set in client env)`;
    supabaseMatchTone = "amber";
  }

  let executionLabel = "AgentOps execution: UI read-only on this surface";
  let executionTone: AgentOpsEnvironmentBadgeTone = "cyan";
  if (isProductionEnv) {
    executionLabel = "AgentOps execution: blocked on production";
    executionTone = "rose";
  } else if (supabaseMatch === false) {
    executionLabel = "AgentOps execution: blocked by Supabase mismatch (server routes)";
    executionTone = "rose";
  } else if (supabaseMatch === true) {
    executionLabel = "AgentOps execution: enabled on staging (server-gated)";
    executionTone = "emerald";
  }

  const localDependencyWarning =
    "Some tools require staging workers; local-only tools will not run when Piter's computer is off.";

  return {
    environmentLabel,
    environmentTone,
    supabaseMatchLabel,
    supabaseMatchTone,
    executionLabel,
    executionTone,
    localDependencyWarning,
    configuredProjectRef,
    expectedProjectRef,
    supabaseMatch,
  };
}
