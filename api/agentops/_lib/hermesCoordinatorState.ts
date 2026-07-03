/**
 * Stage C — server-safe Hermes coordinator activation reader.
 * Reads owner preference from agentops_owner_feedback metadata only.
 * Never activates on production. No memory, SOT, registry, or tool writes.
 */

import {
  getAgentOpsServerSupabase,
  isAgentOpsServerSupabaseConfigured,
} from "./agentopsServerSupabase.js";
import { isAgentOpsProductionBlocked, readServerEnv } from "./ollamaProxy.js";

export const HERMES_COORDINATOR_ACTIVATION_ACTION = "hermes_coordinator_activation";

export type HermesCoordinatorActivationSource =
  | "owner_preference"
  | "env_fallback"
  | "production_blocked"
  | "default_off";

export interface HermesCoordinatorActivationState {
  coordinatorActive: boolean;
  source: HermesCoordinatorActivationSource;
  ownerApprovedAt: string | null;
  stagingOnly: true;
  writesBlocked: true;
  advisoryOnly: true;
}

function defaultOff(source: HermesCoordinatorActivationSource): HermesCoordinatorActivationState {
  return {
    coordinatorActive: false,
    source,
    ownerApprovedAt: null,
    stagingOnly: true,
    writesBlocked: true,
    advisoryOnly: true,
  };
}

/** Resolve coordinator activation for staging advisory runtime health and POST safety metadata. */
export async function readHermesCoordinatorActivationState(): Promise<HermesCoordinatorActivationState> {
  if (isAgentOpsProductionBlocked()) {
    return defaultOff("production_blocked");
  }

  const envFlag = readServerEnv("HERMES_COORDINATOR_ACTIVE");
  if (envFlag === "true") {
    return {
      coordinatorActive: true,
      source: "env_fallback",
      ownerApprovedAt: null,
      stagingOnly: true,
      writesBlocked: true,
      advisoryOnly: true,
    };
  }
  if (envFlag === "false") {
    return defaultOff("default_off");
  }

  if (!isAgentOpsServerSupabaseConfigured()) {
    return defaultOff("default_off");
  }

  const supabase = getAgentOpsServerSupabase();
  if (!supabase) {
    return defaultOff("default_off");
  }

  try {
    const { data, error } = await supabase
      .from("agentops_owner_feedback")
      .select("metadata, created_at")
      .eq("feedback_type", "remark")
      .order("created_at", { ascending: false })
      .limit(40);

    if (error || !data?.length) {
      return defaultOff("default_off");
    }

    for (const row of data) {
      const meta =
        row.metadata && typeof row.metadata === "object"
          ? (row.metadata as Record<string, unknown>)
          : null;
      if (!meta || meta.action !== HERMES_COORDINATOR_ACTIVATION_ACTION) continue;

      const coordinatorActive = meta.coordinatorActive === true;
      return {
        coordinatorActive,
        source: "owner_preference",
        ownerApprovedAt: typeof row.created_at === "string" ? row.created_at : null,
        stagingOnly: true,
        writesBlocked: true,
        advisoryOnly: true,
      };
    }

    return defaultOff("default_off");
  } catch {
    return defaultOff("default_off");
  }
}
