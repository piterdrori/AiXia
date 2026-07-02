import { Navigate } from "react-router-dom";

/** Redirect-only — diagnostic trace evidence lives on /issues/runtime?filter=diagnostic-trace */
export default function AgentOpsRuntimeFixRedirectPage() {
  return (
    <Navigate to="/system/agent-ops/issues/runtime?filter=diagnostic-trace" replace />
  );
}
