import { RefreshCw } from "lucide-react";

import { AixiaBadge, AixiaButton } from "@/components/aixia";

type AgentOpsRuntimeSystemStatusBarProps = {
  connected?: boolean;
  runtimeMode?: string | null;
  projectRef?: string | null;
  loading?: boolean;
  onRefresh?: () => void;
};

export function AgentOpsRuntimeSystemStatusBar({
  connected = false,
  runtimeMode,
  projectRef,
  loading = false,
  onRefresh,
}: AgentOpsRuntimeSystemStatusBarProps) {
  const mode = runtimeMode?.trim() || "unknown";
  const ref = projectRef?.trim() || "unknown";

  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4 backdrop-blur-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="aixia-caption font-medium uppercase tracking-wide text-white/55">
          System status
        </div>
        {onRefresh ? (
          <AixiaButton variant="secondary" onClick={onRefresh} disabled={loading}>
            <RefreshCw className={`mr-1.5 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </AixiaButton>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        <AixiaBadge tone={connected ? "emerald" : "rose"}>
          {connected ? "System alive" : "Connection unavailable"}
        </AixiaBadge>
        <AixiaBadge tone="neutral">Runtime: {mode}</AixiaBadge>
        <AixiaBadge tone="cyan">Project: {ref}</AixiaBadge>
      </div>
    </div>
  );
}
