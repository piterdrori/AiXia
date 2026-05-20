import { useEffect, useState } from "react";
import { resolveDashboardAccess } from "@/lib/dashboard/loadDashboardWorkspaceData";

/** Resolves admin access from Supabase profile (independent of dashboard payload timing). */
export function useDashboardAdminAccess() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [resolved, setResolved] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const access = await resolveDashboardAccess();
      if (cancelled) return;
      setIsAdmin(Boolean(access?.isAdmin));
      setResolved(true);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return { isAdmin, resolved };
}
