import { useEffect, useState } from "react";

import {
  getAgentOpsLocalLlmStatus,
  probeAgentOpsLocalLlmRuntime,
} from "@/lib/agentops/localLlmAdapter";
import type { AgentOpsLocalLlmStatus } from "@/lib/agentops/types";

/** Probe Ollama via /api/agentops/llm on mount and refresh status for UI badges. */
export function useAgentOpsLlmProbe(): AgentOpsLocalLlmStatus {
  const [status, setStatus] = useState<AgentOpsLocalLlmStatus>(() => getAgentOpsLocalLlmStatus());

  useEffect(() => {
    let cancelled = false;
    void probeAgentOpsLocalLlmRuntime(true).then(() => {
      if (!cancelled) setStatus(getAgentOpsLocalLlmStatus());
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return status;
}
