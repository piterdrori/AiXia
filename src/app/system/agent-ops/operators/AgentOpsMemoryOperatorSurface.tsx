import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, ClipboardList, FileText, RefreshCw, ShieldCheck } from "lucide-react";

import {
  AixiaBadge,
  AixiaButton,
  AixiaInfoBlock,
  AixiaSection,
  AixiaTableShell,
} from "@/components/aixia";
import {
  getAgentOpsAgentMemoryFileReview,
  getAgentOpsAgentMemoryRefreshPlan,
  getAgentOpsOwnerStatus,
  recordAgentOpsAgentStatusReview,
  recordAgentOpsMemoryRefreshDecision,
  type AgentOpsAgentMemoryFileReviewItem,
  type AgentOpsAgentMemoryFileReviewSummary,
  type AgentOpsMemoryRefreshDecision,
  type AgentOpsMemoryRefreshPlan,
} from "@/lib/agentops";

import { memoryReviewFileStatusTone, memoryReviewSafetyTone } from "./agentOpsOperatorLabels";

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
}

export type AgentOpsMemoryOperatorSurfaceProps = {
  onRefresh?: () => void | Promise<void>;
  disabled?: boolean;
};

export function AgentOpsMemoryOperatorSurface({
  onRefresh,
  disabled = false,
}: AgentOpsMemoryOperatorSurfaceProps) {
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; message: string } | null>(
    null,
  );
  const [reviewSummary, setReviewSummary] = useState<AgentOpsAgentMemoryFileReviewSummary | null>(
    null,
  );
  const [reviewItems, setReviewItems] = useState<AgentOpsAgentMemoryFileReviewItem[]>([]);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [refreshPlan, setRefreshPlan] = useState<AgentOpsMemoryRefreshPlan | null>(null);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [statusSubmitting, setStatusSubmitting] = useState(false);
  const [refreshSubmitting, setRefreshSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setReviewError(null);
    setRefreshError(null);

    const [ownerResult, reviewResult, refreshResult] = await Promise.all([
      getAgentOpsOwnerStatus(),
      getAgentOpsAgentMemoryFileReview(),
      getAgentOpsAgentMemoryRefreshPlan(),
    ]);

    if (ownerResult.error || !ownerResult.data?.isOwner) {
      setReviewSummary(null);
      setReviewItems([]);
      setRefreshPlan(null);
      setReviewError(ownerResult.error ?? "Owner access required.");
      setLoading(false);
      return;
    }

    if (reviewResult.error) setReviewError(reviewResult.error);
    if (refreshResult.error) setRefreshError(refreshResult.error);
    setReviewSummary(reviewResult.data?.summary ?? null);
    setReviewItems(reviewResult.data?.items ?? []);
    setRefreshPlan(refreshResult.data ?? null);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const submitStatusReview = useCallback(
    async (
      decision: "reviewed" | "needs_memory" | "needs_focus" | "needs_cleanup" | "hold",
      agentId: string,
    ) => {
      setStatusSubmitting(true);
      setFeedback(null);
      const result = await recordAgentOpsAgentStatusReview({
        decision,
        agentId,
        note: `Knowledge route memory review decision: ${decision.replaceAll("_", " ")}.`,
      });
      setStatusSubmitting(false);
      if (result.error) {
        setFeedback({ tone: "error", message: result.error });
        return;
      }
      setFeedback({
        tone: "success",
        message: `Agent status review recorded: ${decision.replaceAll("_", " ")}.`,
      });
      await loadData();
      await onRefresh?.();
    },
    [loadData, onRefresh],
  );

  const submitRefreshDecision = useCallback(
    async (decision: AgentOpsMemoryRefreshDecision, agentId: string) => {
      setRefreshSubmitting(true);
      setFeedback(null);
      const result = await recordAgentOpsMemoryRefreshDecision({
        decision,
        agentId,
        note: `Knowledge route refresh decision: ${decision.replaceAll("_", " ")}.`,
      });
      setRefreshSubmitting(false);
      if (result.error) {
        setFeedback({ tone: "error", message: result.error });
        return;
      }
      setFeedback({
        tone: "success",
        message: `Memory refresh decision recorded: ${decision.replaceAll("_", " ")}.`,
      });
      await loadData();
      await onRefresh?.();
    },
    [loadData, onRefresh],
  );

  return (
    <>
      {feedback ? (
        <AixiaInfoBlock
          tone={feedback.tone === "success" ? "emerald" : "rose"}
          icon={feedback.tone === "success" ? ShieldCheck : AlertTriangle}
          title="Memory operator"
        >
          {feedback.message}
        </AixiaInfoBlock>
      ) : null}

      <AixiaSection
        surface="command"
        title="Memory file review decisions"
        description="G12 operator parity — status review actions per agent memory file."
        icon={FileText}
      >
        <AixiaInfoBlock tone="cyan" icon={ShieldCheck} title="Review mode">
          Static memory file exports only. Record owner review decisions; no live sync or runtime activation.
        </AixiaInfoBlock>
        {reviewError ? (
          <AixiaInfoBlock tone="rose" icon={AlertTriangle} title="Memory file review unavailable">
            {reviewError}
          </AixiaInfoBlock>
        ) : null}
        {loading ? (
          <p className="text-sm text-slate-400">Loading memory file review…</p>
        ) : reviewItems.length > 0 ? (
          <div className="aixia-scrollbar w-full max-w-full overflow-x-auto pb-3">
            <AixiaTableShell variant="registry" minWidthClassName="min-w-[1100px]">
              <thead className="aixia-table-head">
                <tr>
                  <th>Agent</th>
                  <th>File status</th>
                  <th>Safety</th>
                  <th>Path</th>
                  <th>Review actions</th>
                </tr>
              </thead>
              <tbody>
                {reviewItems.slice(0, 24).map((item) => (
                  <tr key={`mem-review-${item.agentId}`}>
                    <td>
                      <div className="font-medium text-white">{item.displayName}</div>
                      <div className="text-xs text-slate-400">{item.agentId}</div>
                    </td>
                    <td>
                      <AixiaBadge tone={memoryReviewFileStatusTone(item.fileStatus)}>
                        {item.fileStatus.replaceAll("_", " ")}
                      </AixiaBadge>
                    </td>
                    <td>
                      <AixiaBadge tone={memoryReviewSafetyTone(item.safetyStatus)}>
                        {item.safetyStatus}
                      </AixiaBadge>
                    </td>
                    <td className="max-w-[240px] truncate text-xs text-slate-300">{item.targetFilePath}</td>
                    <td>
                      <div className="flex flex-wrap justify-center gap-1">
                        {(
                          [
                            ["reviewed", "Reviewed"],
                            ["needs_focus", "Needs Focus"],
                            ["needs_cleanup", "Needs Cleanup"],
                          ] as const
                        ).map(([decision, label]) => (
                          <AixiaButton
                            key={decision}
                            variant="secondary"
                            className="text-xs px-2 py-1"
                            disabled={disabled || statusSubmitting}
                            onClick={() => void submitStatusReview(decision, item.agentId)}
                          >
                            {label}
                          </AixiaButton>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </AixiaTableShell>
          </div>
        ) : reviewSummary ? (
          <p className="text-sm text-slate-400">No per-agent memory file rows in snapshot.</p>
        ) : null}
      </AixiaSection>

      <AixiaSection
        surface="command"
        title="Memory refresh plan decisions"
        description="G13 operator parity — per-agent refresh workflow decisions."
        icon={RefreshCw}
      >
        <AixiaInfoBlock tone="violet" icon={AlertTriangle} title="Manual workflow">
          UI records decisions only. Run draft generation commands in terminal manually.
        </AixiaInfoBlock>
        <AixiaInfoBlock tone="cyan" icon={ClipboardList} title="Command examples">
          <code className="text-sm">npm run qa:agentops-agent-memory-refresh-plan</code>
        </AixiaInfoBlock>
        {refreshError ? (
          <AixiaInfoBlock tone="rose" icon={AlertTriangle} title="Refresh plan unavailable">
            {refreshError}
          </AixiaInfoBlock>
        ) : null}
        {refreshPlan ? (
          <p className="text-sm text-slate-300">
            Generated: {formatDateTime(refreshPlan.generatedAt)} · Agents with changes:{" "}
            {refreshPlan.summary.agentsWithChanges}
          </p>
        ) : null}
        {loading ? (
          <p className="text-sm text-slate-400">Loading refresh plan…</p>
        ) : refreshPlan?.agents?.length ? (
          <div className="aixia-scrollbar mt-3 w-full max-w-full overflow-x-auto pb-3">
            <AixiaTableShell variant="registry" minWidthClassName="min-w-[1000px]">
              <thead className="aixia-table-head">
                <tr>
                  <th>Agent</th>
                  <th>Changes</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {refreshPlan.agents.map((item) => (
                  <tr key={`refresh-${item.agentId}`}>
                    <td>
                      <div className="font-medium text-white">{item.displayName}</div>
                      <div className="text-xs text-slate-400">{item.agentId}</div>
                    </td>
                    <td>{item.proposedChangeCount}</td>
                    <td>
                      <AixiaBadge tone={memoryReviewFileStatusTone(item.refreshStatus)}>
                        {item.refreshStatus.replaceAll("_", " ")}
                      </AixiaBadge>
                    </td>
                    <td>
                      <div className="flex flex-wrap justify-center gap-1">
                        {(
                          [
                            ["review_later", "Review Later"],
                            ["needs_cleanup", "Needs Cleanup"],
                            ["approve_draft_generation", "Approve Draft"],
                            ["reject_refresh", "Reject"],
                          ] as const
                        ).map(([decision, label]) => (
                          <AixiaButton
                            key={decision}
                            variant="secondary"
                            className="text-xs px-2 py-1"
                            disabled={disabled || refreshSubmitting}
                            onClick={() => void submitRefreshDecision(decision, item.agentId)}
                          >
                            {label}
                          </AixiaButton>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </AixiaTableShell>
          </div>
        ) : null}
      </AixiaSection>
    </>
  );
}
