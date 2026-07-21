/**
 * Shared owner auth for AgentOps monitoring write/list routes.
 * Staging guard remains separate — this is real session + agentops_is_owner RPC.
 */

import { createClient } from "@supabase/supabase-js";

import { resolveMonitoringSupabaseUrl } from "./monitoringReadClient.js";

export type OwnerAuthOk = { ok: true; userId: string; email: string | null };
export type OwnerAuthFail = { ok: false; error: string; status: number };
export type OwnerAuthResult = OwnerAuthOk | OwnerAuthFail;

/**
 * Require Authorization: Bearer <supabase access token> and agentops_is_owner().
 * Never trusts body.ownerId.
 */
export async function assertOwnerFromRequest(
  request: Request,
): Promise<OwnerAuthResult> {
  const auth = request.headers.get("Authorization") ?? "";
  if (!auth.startsWith("Bearer ")) {
    return { ok: false, error: "Authorization Bearer token required.", status: 401 };
  }
  const supabaseUrl = resolveMonitoringSupabaseUrl(process.env);
  const anonKey =
    process.env.VITE_SUPABASE_ANON_KEY?.trim() ||
    process.env.SUPABASE_ANON_KEY?.trim() ||
    "";
  if (!supabaseUrl || !anonKey) {
    return { ok: false, error: "Staging Supabase auth is not configured.", status: 503 };
  }
  const client = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: auth } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userError } = await client.auth.getUser();
  if (userError || !userData.user?.id) {
    return { ok: false, error: "You must be signed in.", status: 401 };
  }
  const { data: isOwner, error: ownerError } = await client.rpc("agentops_is_owner");
  if (ownerError) {
    return { ok: false, error: ownerError.message, status: 503 };
  }
  if (!isOwner) {
    return { ok: false, error: "AgentOps Owner access required.", status: 403 };
  }
  return {
    ok: true,
    userId: userData.user.id,
    email: typeof userData.user.email === "string" ? userData.user.email : null,
  };
}

/** Stable actor marker for owner_decision_by / audit fields. */
export function ownerActorMarker(owner: OwnerAuthOk): string {
  return owner.userId;
}
