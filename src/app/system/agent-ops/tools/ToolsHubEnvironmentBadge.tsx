import { Shield } from "lucide-react";

import { AixiaBadge, AixiaInfoBlock } from "@/components/aixia";
import { getAgentOpsEnvironmentStatus } from "@/lib/agentops/tools/agentopsEnvironmentStatus";

export function ToolsHubEnvironmentBadge() {
  const status = getAgentOpsEnvironmentStatus();
  const allOk =
    status.environmentTone === "emerald" &&
    (status.supabaseMatchTone === "emerald" || status.supabaseMatch === null) &&
    status.executionTone !== "rose";

  return (
    <div data-testid="tools-hub-environment-badge">
      <AixiaInfoBlock
        tone={allOk ? "cyan" : "gold"}
        icon={Shield}
        title="AgentOps environment"
      >
      <div className="flex flex-wrap gap-2 pb-2">
        <AixiaBadge tone={status.environmentTone}>{status.environmentLabel}</AixiaBadge>
        <AixiaBadge tone={status.supabaseMatchTone}>{status.supabaseMatchLabel}</AixiaBadge>
        <AixiaBadge tone={status.executionTone}>{status.executionLabel}</AixiaBadge>
      </div>
      <p className="text-sm text-muted-foreground">{status.localDependencyWarning}</p>
      </AixiaInfoBlock>
    </div>
  );
}
