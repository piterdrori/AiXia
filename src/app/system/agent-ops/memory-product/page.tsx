import { useSearchParams } from "react-router-dom";
import { RefreshCw } from "lucide-react";

import { AixiaButton } from "@/components/aixia";
import {
  AgentOpsAdvancedDisclosure,
  AgentOpsOwnerPageShell,
  AgentOpsPageHeader,
  useAgentOpsOwnerGate,
} from "@/components/agentops/owner";
import { MonitoringMemoryProposalsReview } from "@/app/system/agent-ops/memory/MonitoringMemoryProposalsReview";
import { AgentOpsMemoryOperatorSurface } from "@/app/system/agent-ops/operators/AgentOpsMemoryOperatorSurface";
import { usePageTitle } from "@/hooks/usePageTitle";

type MemoryTab = "needs_review" | "approved" | "applied" | "all";

const TABS: Array<{ id: MemoryTab; label: string }> = [
  { id: "needs_review", label: "Needs review" },
  { id: "approved", label: "Approved" },
  { id: "applied", label: "Applied" },
  { id: "all", label: "All memory" },
];

export default function AgentOpsMemoryProductPage() {
  usePageTitle("AgentOps Memory");
  const [searchParams, setSearchParams] = useSearchParams();
  const { loading, error, refresh } = useAgentOpsOwnerGate();

  const tab = (searchParams.get("tab") as MemoryTab | null) ?? "needs_review";
  const setTab = (next: MemoryTab) => {
    setSearchParams(next === "needs_review" ? {} : { tab: next });
  };

  const statusFilter =
    tab === "needs_review"
      ? "pending"
      : tab === "approved"
        ? "approved"
        : tab === "applied"
          ? "applied"
          : "all";

  return (
    <AgentOpsOwnerPageShell loading={loading} error={error} onRetry={() => void refresh()}>
      <AgentOpsPageHeader
        title="Memory"
        subtitle="Understand and control what AgentOps learns from staging reviews."
        actions={
          <AixiaButton variant="secondary" onClick={() => void refresh()} disabled={loading}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </AixiaButton>
        }
      />

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Memory tabs">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            onClick={() => setTab(item.id)}
            className={[
              "rounded-lg px-3 py-1.5 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400",
              tab === item.id
                ? "bg-indigo-500/20 text-white"
                : "text-white/60 hover:bg-white/5 hover:text-white",
            ].join(" ")}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="space-y-8">
        <MonitoringMemoryProposalsReview statusFilter={statusFilter} />

        <AgentOpsAdvancedDisclosure title="Advanced memory tools">
          <AgentOpsMemoryOperatorSurface />
        </AgentOpsAdvancedDisclosure>
      </div>
    </AgentOpsOwnerPageShell>
  );
}
