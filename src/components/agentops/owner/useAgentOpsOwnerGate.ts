import { useCallback, useEffect, useState } from "react";

import { getAgentOpsOwnerStatus } from "@/lib/agentops";

export function useAgentOpsOwnerGate() {
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await getAgentOpsOwnerStatus();
    if (result.error) {
      setError(result.error);
      setIsOwner(false);
    } else {
      setIsOwner(Boolean(result.data?.isOwner));
      if (!result.data?.isOwner) {
        setError("AgentOps owner access required.");
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
    const timer = window.setTimeout(() => {
      setLoading((current) => {
        if (!current) return current;
        setError((existing) => existing ?? "Owner gate timed out. Retry.");
        return false;
      });
    }, 20_000);
    return () => window.clearTimeout(timer);
  }, [refresh]);

  return { loading, isOwner, error, refresh };
}
