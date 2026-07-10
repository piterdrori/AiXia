import { useCallback, useEffect, useState } from "react";
import { Brain, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";

import { AixiaBadge, AixiaButton, AixiaInfoBlock, AixiaSection } from "@/components/aixia";

export type MonitoringMemoryProposalSummary = {
  id: string;
  runId: string;
  githubRunId: string | null;
  status: string;
  agentSlug: string | null;
  memoryScope: string;
  memoryType: string;
  title: string;
  proposal: string;
  rationale: string;
  evidence: Record<string, unknown>;
  confidence: number | null;
  appliedMemoryId?: string | null;
  createdAt: string;
};

type ProposalDecision = "owner_approved" | "rejected" | "deferred";

function statusTone(status: string): "emerald" | "amber" | "rose" | "cyan" | "neutral" {
  if (status === "owner_approved") return "emerald";
  if (status === "applied") return "cyan";
  if (status === "rejected") return "rose";
  if (status === "deferred") return "neutral";
  return "amber";
}

function resolveTargetStore(_scope: string): string {
  return "agentops_memory";
}

function evidenceSummary(evidence: Record<string, unknown>): string {
  const routes = evidence.routes;
  const agents = evidence.agent_slugs;
  const parts: string[] = [];
  if (Array.isArray(routes) && routes.length > 0) {
    parts.push(`Routes: ${routes.slice(0, 3).join(", ")}${routes.length > 3 ? "…" : ""}`);
  }
  if (Array.isArray(agents) && agents.length > 0) {
    parts.push(`Agents: ${agents.join(", ")}`);
  }
  if (typeof evidence.category === "string") {
    parts.push(`Category: ${evidence.category}`);
  }
  return parts.length > 0 ? parts.join(" · ") : "Evidence attached in proposal record.";
}

export function MonitoringMemoryProposalsReview({
  statusFilter = "all",
}: {
  statusFilter?: "pending" | "approved" | "applied" | "all";
}) {
  const [proposals, setProposals] = useState<MonitoringMemoryProposalSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const [confirmApplyId, setConfirmApplyId] = useState<string | null>(null);

  const loadProposals = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/agentops/monitoring/memory-proposals?limit=25");
      const payload = (await response.json()) as {
        ok?: boolean;
        proposals?: MonitoringMemoryProposalSummary[];
        error?: string;
      };
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? "Could not load monitoring memory proposals.");
      }
      setProposals(payload.proposals ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : String(loadError));
      setProposals([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProposals();
  }, [loadProposals]);

  const applyDecision = async (proposalId: string, decision: ProposalDecision) => {
    setActionId(proposalId);
    try {
      const response = await fetch("/api/agentops/monitoring/memory-proposals/decision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proposalId, decision, ownerId: "owner" }),
      });
      const payload = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? "Decision failed.");
      }
      await loadProposals();
    } catch (decisionError) {
      setError(decisionError instanceof Error ? decisionError.message : String(decisionError));
    } finally {
      setActionId(null);
    }
  };

  const applyToMemory = async (proposalId: string) => {
    setActionId(proposalId);
    setConfirmApplyId(null);
    try {
      const response = await fetch("/api/agentops/monitoring/memory-proposals/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proposalId, ownerId: "owner" }),
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        error?: string;
        memoryId?: string;
        alreadyApplied?: boolean;
      };
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? "Apply to memory failed.");
      }
      await loadProposals();
    } catch (applyError) {
      setError(applyError instanceof Error ? applyError.message : String(applyError));
    } finally {
      setActionId(null);
    }
  };

  const openProposals = proposals.filter((row) => row.status === "proposal");

  const visibleProposals = proposals.filter((row) => {
    if (statusFilter === "all") return true;
    if (statusFilter === "pending") return row.status === "proposal" || row.status === "deferred";
    if (statusFilter === "approved") return row.status === "owner_approved";
    if (statusFilter === "applied") return row.status === "applied";
    return true;
  });

  return (
    <AixiaSection
      surface="command"
      title="Memory proposals"
      description="Review what AgentOps wants to remember. Approval records intent; Apply to Memory is a separate owner action."
      icon={Brain}
      badge={
        openProposals.length > 0 ? (
          <AixiaBadge tone="amber">{openProposals.length} open</AixiaBadge>
        ) : (
          <AixiaBadge tone="neutral">Owner-click apply</AixiaBadge>
        )
      }
    >
      {loading ? (
        <p className="text-sm text-white/55">Loading memory proposals…</p>
      ) : error ? (
        <AixiaInfoBlock title="Memory proposals unavailable" tone="gold">
          {error}
        </AixiaInfoBlock>
      ) : visibleProposals.length === 0 ? (
        <AixiaInfoBlock title="No memory proposals in this view" tone="cyan">
          Switch tabs or refresh when new proposals arrive from scheduled reviews.
        </AixiaInfoBlock>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <AixiaButton type="button" variant="secondary" disabled={loading} onClick={() => void loadProposals()}>
              <RefreshCw className={`mr-1.5 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </AixiaButton>
          </div>

          {visibleProposals.map((row) => (
            <div
              key={row.id}
              className="rounded-lg border border-white/10 bg-white/[0.02] p-4 space-y-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-white/90">{row.title}</p>
                  <p className="mt-1 text-xs text-white/55">
                    Scope: {row.memoryScope} · Type: {row.memoryType}
                    {row.agentSlug ? ` · Agent: ${row.agentSlug}` : ""}
                  </p>
                </div>
                <AixiaBadge tone={statusTone(row.status)}>{row.status}</AixiaBadge>
              </div>

              <p className="text-xs text-white/70">{row.proposal}</p>
              <p className="text-xs text-white/55">{row.rationale}</p>
              <p className="text-xs text-white/45">{evidenceSummary(row.evidence)}</p>

              <ul className="text-xs text-white/50 space-y-1">
                <li>Source run: {row.runId}</li>
                {row.githubRunId ? <li>GitHub run: {row.githubRunId}</li> : null}
                {row.confidence != null ? <li>Confidence: {row.confidence.toFixed(2)}</li> : null}
              </ul>

              {row.status === "owner_approved" ? (
                <AixiaInfoBlock title="Approved — not active memory yet" tone="emerald">
                  Owner approval recorded. Active memory is not created until you click Apply to
                  Memory below.
                </AixiaInfoBlock>
              ) : null}

              {row.status === "applied" && row.appliedMemoryId ? (
                <AixiaInfoBlock title="Applied to active memory" tone="cyan">
                  Memory id: {row.appliedMemoryId}.{" "}
                  <Link
                    to={`/system/agent-ops/runtime/memory?memoryId=${row.appliedMemoryId}`}
                    className="underline text-cyan-300/90 hover:text-cyan-200"
                  >
                    View active memory
                  </Link>
                  .
                </AixiaInfoBlock>
              ) : null}

              {row.status === "proposal" ? (
                <div className="flex flex-wrap gap-2">
                  <AixiaButton
                    type="button"
                    variant="primary"
                    className="text-xs px-3 py-1.5"
                    disabled={actionId === row.id}
                    onClick={() => void applyDecision(row.id, "owner_approved")}
                  >
                    Approve proposal
                  </AixiaButton>
                  <AixiaButton
                    type="button"
                    variant="secondary"
                    className="text-xs px-3 py-1.5"
                    disabled={actionId === row.id}
                    onClick={() => void applyDecision(row.id, "rejected")}
                  >
                    Reject
                  </AixiaButton>
                  <AixiaButton
                    type="button"
                    variant="secondary"
                    className="text-xs px-3 py-1.5"
                    disabled={actionId === row.id}
                    onClick={() => void applyDecision(row.id, "deferred")}
                  >
                    Defer
                  </AixiaButton>
                </div>
              ) : null}

              {row.status === "owner_approved" ? (
                <div className="space-y-2">
                  {confirmApplyId === row.id ? (
                    <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3 space-y-2">
                      <p className="text-xs text-white/80 font-medium">Confirm apply to memory</p>
                      <ul className="text-xs text-white/60 space-y-1">
                        <li>Title: {row.title}</li>
                        <li>Scope: {row.memoryScope}</li>
                        <li>Target store: {resolveTargetStore(row.memoryScope)}</li>
                      </ul>
                      <p className="text-xs text-amber-200/80">
                        Creates one active memory record on staging. This cannot be undone from this
                        panel.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <AixiaButton
                          type="button"
                          variant="primary"
                          className="text-xs px-3 py-1.5"
                          disabled={actionId === row.id}
                          onClick={() => void applyToMemory(row.id)}
                        >
                          Confirm Apply to Memory
                        </AixiaButton>
                        <AixiaButton
                          type="button"
                          variant="secondary"
                          className="text-xs px-3 py-1.5"
                          disabled={actionId === row.id}
                          onClick={() => setConfirmApplyId(null)}
                        >
                          Cancel
                        </AixiaButton>
                      </div>
                    </div>
                  ) : (
                    <AixiaButton
                      type="button"
                      variant="primary"
                      className="text-xs px-3 py-1.5"
                      disabled={actionId === row.id}
                      onClick={() => setConfirmApplyId(row.id)}
                    >
                      Apply to Memory
                    </AixiaButton>
                  )}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </AixiaSection>
  );
}
