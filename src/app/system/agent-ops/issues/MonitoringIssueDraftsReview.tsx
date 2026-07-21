import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ExternalLink, FileWarning, RefreshCw } from "lucide-react";

import { AixiaBadge, AixiaButton, AixiaInfoBlock, AixiaSection } from "@/components/aixia";

export type MonitoringIssueDraftSummary = {
  id: string;
  runId: string;
  githubRunId: string | null;
  status: string;
  agentSlug: string;
  route: string | null;
  severity: string;
  title: string;
  summary: string;
  browserQaEvidence: Record<string, unknown>;
  promotedIssueId?: string | null;
  issueDisplayCode?: string | null;
  createdAt: string;
};

type DraftDecision = "owner_approved" | "rejected" | "deferred";

function statusTone(status: string): "emerald" | "amber" | "rose" | "cyan" | "neutral" {
  if (status === "owner_approved") return "emerald";
  if (status === "promoted") return "cyan";
  if (status === "rejected") return "rose";
  if (status === "deferred") return "neutral";
  return "amber";
}

export function MonitoringIssueDraftsReview() {
  const navigate = useNavigate();
  const [drafts, setDrafts] = useState<MonitoringIssueDraftSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);

  const loadDrafts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { fetchMonitoringDrafts } = await import(
        "@/lib/agentops/findings/findingsOwnerCatalog"
      );
      const listed = await fetchMonitoringDrafts(25);
      if (listed.error) {
        throw new Error(listed.error);
      }
      setDrafts(listed.data as MonitoringIssueDraftSummary[]);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : String(loadError));
      setDrafts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDrafts();
  }, [loadDrafts]);

  const applyDecision = async (draftId: string, decision: DraftDecision) => {
    setActionId(draftId);
    try {
      const { applyMonitoringDraftDecision } = await import(
        "@/lib/agentops/findings/findingsOwnerCatalog"
      );
      const result = await applyMonitoringDraftDecision(draftId, decision);
      if (!result.ok) {
        throw new Error(result.error ?? "Decision failed.");
      }
      await loadDrafts();
    } catch (decisionError) {
      setError(decisionError instanceof Error ? decisionError.message : String(decisionError));
    } finally {
      setActionId(null);
    }
  };

  const promoteDraft = async (draftId: string) => {
    setActionId(draftId);
    try {
      const { promoteMonitoringDraft } = await import(
        "@/lib/agentops/findings/findingsOwnerCatalog"
      );
      const result = await promoteMonitoringDraft(draftId);
      if (!result.ok) {
        throw new Error(result.error ?? "Promotion failed.");
      }
      await loadDrafts();
    } catch (promoteError) {
      setError(promoteError instanceof Error ? promoteError.message : String(promoteError));
    } finally {
      setActionId(null);
    }
  };

  const openDrafts = drafts.filter((draft) => draft.status === "draft");
  const approvedDrafts = drafts.filter((draft) => draft.status === "owner_approved");

  return (
    <AixiaSection
      surface="command"
      title="Monitoring issue drafts"
      description="Owner-gated drafts from scheduled monitoring dry-runs. Promote to live issues only by explicit owner click."
      icon={FileWarning}
      badge={
        openDrafts.length > 0 ? (
          <AixiaBadge tone="amber">{openDrafts.length} need review</AixiaBadge>
        ) : approvedDrafts.length > 0 ? (
          <AixiaBadge tone="emerald">{approvedDrafts.length} ready to promote</AixiaBadge>
        ) : (
          <AixiaBadge tone="neutral">Review only</AixiaBadge>
        )
      }
    >
      {loading ? (
        <p className="text-sm text-white/55">Loading monitoring issue drafts…</p>
      ) : error ? (
        <AixiaInfoBlock tone="gold" title="Drafts unavailable">
          {error}
        </AixiaInfoBlock>
      ) : drafts.length === 0 ? (
        <p className="text-sm text-white/60">No monitoring issue drafts yet.</p>
      ) : (
        <div className="space-y-3">
          {drafts.map((draft) => (
            <div
              key={draft.id}
              className="rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3 space-y-2"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-white/90">{draft.title}</p>
                  <p className="mt-1 text-xs text-white/55">
                    {draft.agentSlug} · {draft.route ?? "—"} · {draft.severity}
                  </p>
                </div>
                <AixiaBadge tone={statusTone(draft.status)}>{draft.status}</AixiaBadge>
              </div>
              <p className="text-xs text-white/65 line-clamp-3">{draft.summary}</p>
              <ul className="text-xs text-white/50 space-y-0.5">
                <li>Run: {draft.runId}</li>
                {draft.githubRunId ? <li>GitHub run: {draft.githubRunId}</li> : null}
                <li>Created: {new Date(draft.createdAt).toLocaleString()}</li>
                {typeof draft.browserQaEvidence.scan_mode === "string" ? (
                  <li>Browser QA: {draft.browserQaEvidence.scan_mode as string}</li>
                ) : null}
                {draft.status === "promoted" && draft.issueDisplayCode ? (
                  <li>
                    Promoted issue:{" "}
                    <Link
                      to={`/system/agent-ops/issues/${draft.issueDisplayCode}`}
                      className="text-cyan-300/90 hover:text-cyan-200 inline-flex items-center gap-1"
                    >
                      {draft.issueDisplayCode}
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  </li>
                ) : null}
              </ul>

              {draft.status === "draft" ? (
                <div className="flex flex-wrap gap-2 pt-1">
                  <AixiaButton
                    variant="primary"
                    className="text-xs px-3 py-1.5"
                    disabled={actionId === draft.id}
                    onClick={() => void applyDecision(draft.id, "owner_approved")}
                  >
                    Approve draft
                  </AixiaButton>
                  <AixiaButton
                    variant="secondary"
                    className="text-xs px-3 py-1.5"
                    disabled={actionId === draft.id}
                    onClick={() => void applyDecision(draft.id, "rejected")}
                  >
                    Reject
                  </AixiaButton>
                  <AixiaButton
                    variant="secondary"
                    className="text-xs px-3 py-1.5"
                    disabled={actionId === draft.id}
                    onClick={() => void applyDecision(draft.id, "deferred")}
                  >
                    Defer
                  </AixiaButton>
                </div>
              ) : null}

              {draft.status === "owner_approved" ? (
                <div className="space-y-2 pt-1">
                  <AixiaInfoBlock tone="gold" title="Owner approved">
                    This draft is approved. Promote only when you want a real AgentOps issue on staging.
                  </AixiaInfoBlock>
                  <AixiaButton
                    variant="primary"
                    className="text-xs px-3 py-1.5"
                    disabled={actionId === draft.id}
                    onClick={() => void promoteDraft(draft.id)}
                  >
                    Promote to Issue
                  </AixiaButton>
                  <p className="text-xs text-amber-200/80">
                    Creates a real AgentOps issue on staging. No automatic promotion.
                  </p>
                </div>
              ) : null}

              {draft.status === "promoted" ? (
                <div className="pt-1">
                  <AixiaBadge tone="cyan">Promoted</AixiaBadge>
                  {draft.issueDisplayCode ? (
                    <AixiaButton
                      variant="secondary"
                      className="text-xs px-3 py-1.5 mt-2"
                      onClick={() => navigate(`/system/agent-ops/issues/${draft.issueDisplayCode}`)}
                    >
                      Open issue workspace
                    </AixiaButton>
                  ) : draft.promotedIssueId ? (
                    <p className="mt-2 text-xs text-white/55">Issue id: {draft.promotedIssueId}</p>
                  ) : null}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <AixiaButton variant="secondary" disabled={loading} onClick={() => void loadDrafts()}>
          <RefreshCw className={`mr-1.5 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh drafts
        </AixiaButton>
        <AixiaButton variant="secondary" onClick={() => navigate("/system/agent-ops/agents")}>
          Open Agents monitoring
        </AixiaButton>
      </div>

      <AixiaInfoBlock tone="cyan" title="Phase 5D safety">
        Approve marks the draft as owner-approved only. Promote creates one live staging issue per
        owner click. Repeat promote returns the existing issue — no duplicates.
      </AixiaInfoBlock>
    </AixiaSection>
  );
}
