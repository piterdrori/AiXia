import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileWarning, RefreshCw } from "lucide-react";

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
  createdAt: string;
};

type DraftDecision = "owner_approved" | "rejected" | "deferred";

function severityTone(severity: string): "rose" | "amber" | "cyan" | "neutral" {
  if (severity === "critical" || severity === "high") return "rose";
  if (severity === "medium") return "amber";
  return "neutral";
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
      const response = await fetch("/api/agentops/monitoring/drafts?limit=25");
      const payload = (await response.json()) as {
        ok?: boolean;
        drafts?: MonitoringIssueDraftSummary[];
        error?: string;
      };
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? "Could not load monitoring issue drafts.");
      }
      setDrafts(payload.drafts ?? []);
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
      const response = await fetch("/api/agentops/monitoring/drafts/decision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draftId, decision, ownerId: "owner" }),
      });
      const payload = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? "Decision failed.");
      }
      await loadDrafts();
    } catch (decisionError) {
      setError(decisionError instanceof Error ? decisionError.message : String(decisionError));
    } finally {
      setActionId(null);
    }
  };

  const openDrafts = drafts.filter((draft) => draft.status === "draft");

  return (
    <AixiaSection
      surface="command"
      title="Monitoring issue drafts"
      description="Owner-gated drafts from scheduled monitoring dry-runs. No auto-promotion to live issues."
      icon={FileWarning}
      badge={
        openDrafts.length > 0 ? (
          <AixiaBadge tone="amber">{openDrafts.length} need review</AixiaBadge>
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
                <AixiaBadge tone={severityTone(draft.severity)}>{draft.status}</AixiaBadge>
              </div>
              <p className="text-xs text-white/65 line-clamp-3">{draft.summary}</p>
              <ul className="text-xs text-white/50 space-y-0.5">
                <li>Run: {draft.runId}</li>
                {draft.githubRunId ? <li>GitHub run: {draft.githubRunId}</li> : null}
                <li>Created: {new Date(draft.createdAt).toLocaleString()}</li>
                {typeof draft.browserQaEvidence.scan_mode === "string" ? (
                  <li>Browser QA: {draft.browserQaEvidence.scan_mode as string}</li>
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

      <AixiaInfoBlock tone="cyan" title="Phase 5C safety">
        Approve marks the draft as owner-approved only. Promote to live issue is disabled until Phase 5D.
      </AixiaInfoBlock>
    </AixiaSection>
  );
}
