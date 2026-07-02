import { Navigate } from "react-router-dom";

/** Redirect-only — system config snapshot lives on /runtime#system-config */
export default function AgentOpsRuntimeConfigRedirectPage() {
  return <Navigate to="/system/agent-ops/runtime#system-config" replace />;
}
