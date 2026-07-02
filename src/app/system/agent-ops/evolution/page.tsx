import { Navigate } from "react-router-dom";

/** Redirect-only — evolution mirror lives on /runtime/memory?view=evolution */
export default function AgentOpsRuntimeEvolutionRedirectPage() {
  return <Navigate to="/system/agent-ops/runtime/memory?view=evolution" replace />;
}
