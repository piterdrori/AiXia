import { useEffect } from "react";
import { supabase } from "@/lib/supabase";

const INTERVAL_MS = 30_000;
const DELTA_SECONDS = 30;

/**
 * Records visible-tab time via `record_platform_usage_delta` (UTC day buckets).
 * Safe if migration not yet applied (errors ignored).
 */
export function usePlatformUsageHeartbeat(enabled: boolean): void {
  useEffect(() => {
    if (!enabled || typeof document === "undefined") return;

    let cancelled = false;

    const tick = async () => {
      if (cancelled || document.visibilityState !== "visible") return;

      const { error } = await supabase.rpc("record_platform_usage_delta", {
        p_delta_seconds: DELTA_SECONDS,
      });

      if (error && error.code !== "PGRST202" && error.code !== "42883") {
        // PGRST202 / 42883: function missing in some environments during rollout
        console.warn("Platform usage heartbeat:", error.message);
      }
    };

    const id = window.setInterval(() => void tick(), INTERVAL_MS);
    void tick();

    const onVisibility = () => {
      if (document.visibilityState === "visible") void tick();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [enabled]);
}
