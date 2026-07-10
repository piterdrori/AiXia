import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { RefreshCw } from "lucide-react";

import { AixiaButton } from "@/components/aixia";
import {
  AgentOpsAdvancedDisclosure,
  AgentOpsEmptyState,
  AgentOpsFindingCard,
  AgentOpsOwnerPageShell,
  AgentOpsPageHeader,
  type FindingType,
} from "@/components/agentops/owner";
import { MonitoringIssueDraftsReview } from "@/app/system/agent-ops/issues/MonitoringIssueDraftsReview";
import { AgentOpsQueueOperatorSurface } from "@/app/system/agent-ops/operators/AgentOpsQueueOperatorSurface";
import { usePageTitle } from "@/hooks/usePageTitle";
import {
  getAgentOpsActiveTop10,
  getAgentOpsOwnerStatus,
  type AgentOpsFinding,
} from "@/lib/agentops";

type FindingsTab =
  | "needs_review"
  | "active"
  | "improvements"
  | "features"
  | "completed"
  | "all";

const TABS: Array<{ id: FindingsTab; label: string }> = [
  { id: "needs_review", label: "Needs review" },
  { id: "active", label: "Active issues" },
  { id: "improvements", label: "Improvements" },
  { id: "features", label: "New features" },
  { id: "completed", label: "Completed" },
  { id: "all", label: "All" },
];

function findingType(finding: AgentOpsFinding): FindingType {
  const category = finding.category.toLowerCase();
  if (category.includes("improvement")) return "improvement";
  if (category.includes("feature")) return "feature";
  return "error";
}

function isCompleted(status: string): boolean {
  return ["Verified Fixed", "Archived", "Rejected"].includes(status);
}

export default function AgentOpsIssuesPage() {
  usePageTitle("Findings");
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [gateLoading, setGateLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [findings, setFindings] = useState<AgentOpsFinding[]>([]);

  const tab = (searchParams.get("tab") as FindingsTab | null) ?? "needs_review";

  const setTab = (next: FindingsTab) => {
    setSearchParams(next === "needs_review" ? {} : { tab: next });
  };

  const loadFindings = useCallback(async () => {
    setLoading(true);
    setError(null);
    const ownerResult = await getAgentOpsOwnerStatus();
    if (ownerResult.error || !ownerResult.data?.isOwner) {
      setError(ownerResult.error ?? "AgentOps owner access required.");
      setLoading(false);
      setGateLoading(false);
      return;
    }
    setGateLoading(false);

    const activeResult = await getAgentOpsActiveTop10();
    if (activeResult.error) {
      setError(activeResult.error);
      setFindings([]);
    } else {
      setFindings(activeResult.data ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadFindings();
  }, [loadFindings]);

  const filteredFindings = useMemo(() => {
    return findings.filter((finding) => {
      const type = findingType(finding);
      if (tab === "active") return !isCompleted(finding.status);
      if (tab === "improvements") return type === "improvement";
      if (tab === "features") return type === "feature";
      if (tab === "completed") return isCompleted(finding.status);
      if (tab === "all") return true;
      return false;
    });
  }, [findings, tab]);

  return (
    <AgentOpsOwnerPageShell
      loading={gateLoading || (tab !== "needs_review" && loading)}
      error={error}
      onRetry={() => void loadFindings()}
    >
      <AgentOpsPageHeader
        title="Findings"
        subtitle="Review errors, improvements, and feature suggestions from your agents in one place."
        actions={
          <AixiaButton variant="secondary" onClick={() => void loadFindings()} disabled={loading}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </AixiaButton>
        }
      />

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Findings tabs">
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

      {tab === "needs_review" ? (
        <MonitoringIssueDraftsReview />
      ) : filteredFindings.length === 0 ? (
        <AgentOpsEmptyState
          title="No findings in this view"
          description="When agents detect something in this category, it will appear here."
        />
      ) : (
        <div className="space-y-3">
          {filteredFindings.map((finding) => (
            <AgentOpsFindingCard
              key={finding.id}
              type={findingType(finding)}
              title={finding.title}
              route={finding.route ?? finding.module}
              agentLabel={finding.agent_id}
              priority={finding.severity}
              confidence={finding.status}
              evidenceSummary={finding.category}
              recommendedAction="Open details to approve, reject, or defer."
              ageLabel={finding.updated_at ? new Date(finding.updated_at).toLocaleDateString() : undefined}
              onOpen={() => navigate(`/system/agent-ops/issues/${finding.issue_code}`)}
            />
          ))}
        </div>
      )}

      <div className="mt-8">
        <AgentOpsAdvancedDisclosure title="Advanced queue details">
          <AgentOpsQueueOperatorSurface />
        </AgentOpsAdvancedDisclosure>
      </div>
    </AgentOpsOwnerPageShell>
  );
}
