import type { Session } from "@supabase/supabase-js";

import { supabase } from "@/lib/supabase";
import {
  AUTH_BOOTSTRAP_TIMEOUT_MS,
  clearAuthStorageKeys,
} from "@/lib/safeBrowserStorage";
import { TimeoutError, withTimeout } from "@/lib/withTimeout";

export type AuthSessionBootstrapResult =
  | { ok: true; session: Session | null }
  | { ok: false; reason: "timeout" | "error"; message: string; diagnosticCode: string };

export async function getSessionWithBootstrapTimeout(
  timeoutMs = AUTH_BOOTSTRAP_TIMEOUT_MS,
): Promise<AuthSessionBootstrapResult> {
  try {
    const { data, error } = await withTimeout(
      supabase.auth.getSession(),
      timeoutMs,
      "Auth session bootstrap timed out",
    );

    if (error) {
      return {
        ok: false,
        reason: "error",
        message: error.message,
        diagnosticCode: "AUTH_SESSION_ERROR",
      };
    }

    return { ok: true, session: data.session ?? null };
  } catch (error) {
    if (error instanceof TimeoutError) {
      return {
        ok: false,
        reason: "timeout",
        message: "Session bootstrap timed out. Your browser may be blocking storage or holding a stale session.",
        diagnosticCode: "AUTH_SESSION_TIMEOUT",
      };
    }

    return {
      ok: false,
      reason: "error",
      message: error instanceof Error ? error.message : "Auth session bootstrap failed.",
      diagnosticCode: "AUTH_SESSION_BOOTSTRAP_FAILED",
    };
  }
}

export async function resetAuthSessionStorage(): Promise<void> {
  clearAuthStorageKeys("taskflow-auth");
  try {
    await supabase.auth.signOut({ scope: "local" });
  } catch {
    // ignore — storage already cleared
  }
}
