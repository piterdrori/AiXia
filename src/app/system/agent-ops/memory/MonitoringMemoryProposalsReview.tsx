import { useCallback, useEffect, useState } from "react";
import { Brain, RefreshCw } from "lucide-react";

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

export function MonitoringMemoryProposalsReview() {
  const [proposals, setProposals] = useState<MonitoringMemoryProposalSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);

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

  const openProposals = proposals.filter((row) => row.status === "proposal");

  return (
    <AixiaSection
      surface="command"
      title="Monitoring memory proposals"
      description="Owner-gated memory proposals from scheduled monitoring dry-runs. Approve records owner intent only — no active memory is written in Phase 5E."
      icon={Brain}
      badge={
        openProposals.length > 0 ? (
          <AixiaBadge tone="amber">{openProposals.length} open</AixiaBadge>
        ) : (
          <AixiaBadge tone="neutral">Proposal-only</AixiaBadge>
        )
      }
    >
      {loading ? (
        <p className="text-sm text-white/55">Loading memory proposals…</p>
      ) : error ? (
        <AixiaInfoBlock title="Memory proposals unavailable" tone="gold">
          {error}
        </AixiaInfoBlock>
      ) : proposals.length === 0 ? (
        <AixiaInfoBlock title="No monitoring memory proposals yet" tone="cyan">
          GitHub Actions dry-runs create proposals only when repeated or high-signal patterns are
          detected. Zero proposals is acceptable when policy finds no eligible signals.
        </AixiaInfoBlock>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <AixiaButton type="button" variant="secondary" disabled={loading} onClick={() => void loadProposals()}>
              <RefreshCw className={`mr-1.5 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </AixiaButton>
          </div>

          {proposals.map((row) => (
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
            </div>
          ))}
        </div>
      )}
    </AixiaSection>
  );
}
