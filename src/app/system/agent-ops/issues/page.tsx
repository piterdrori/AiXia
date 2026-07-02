import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, ClipboardList, ListChecks, RefreshCw, ShieldCheck } from "lucide-react";

import {
  AixiaBadge,
  AixiaButton,
  AixiaCommandHubMetaStrip,
  AixiaCommandMetrics,
  AixiaCommandPageLayout,
  AixiaEmptyState,
  AixiaHero,
  AixiaInfoBlock,
  AixiaSection,
  AixiaTableActionsCell,
  AixiaTableBadgeCell,
  AixiaTableHeaderCell,
  AixiaTableShell,
  AixiaTableTextCell,
} from "@/components/aixia";
import { usePageTitle } from "@/hooks/usePageTitle";
import { IssuesListAuthorityBanner } from "@/components/agentops/AcdlAuthorityLabel";
import { ISSUE_DETAIL_DISPLAY } from "@/lib/agentops/issues/issueDetailDisplayCopy";
import { issueStatusDisplayLabel } from "@/lib/agentops/issues/issueDisplayMappers";
import { getAgentOpsProductIssues } from "@/lib/agentops/issues/productIssuesService";
import type { ProductIssue, ProductIssuesBundle } from "@/lib/agentops/issues/productIssueTypes";

function severityTone(severity: ProductIssue["severity"]): "rose" | "amber" | "cyan" | "neutral" {
  if (severity === "critical" || severity === "high") return "rose";
  if (severity === "medium") return "amber";
  return "cyan";
}

function statusTone(status: ProductIssue["normalizedStatus"]): "emerald" | "amber" | "cyan" | "neutral" {
  if (status === "verified") return "emerald";
  if (status === "pending_verification") return "amber";
  if (status === "in_progress") return "cyan";
  return "neutral";
}

export default function AgentOpsProductIssuesHubPage() {
  usePageTitle("AgentOps Issues");
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bundle, setBundle] = useState<ProductIssuesBundle | null>(null);
  const [showExtended, setShowExtended] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await getAgentOpsProductIssues();
    setLoading(false);
    if (result.error) {
      setError(result.error);
      setBundle(null);
      return;
    }
    setBundle(result.data);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const visibleActive = useMemo(() => {
    const active = bundle?.active ?? [];
    const limit = showExtended ? 20 : 10;
    return active.slice(0, limit);
  }, [bundle?.active, showExtended]);

  const canShowMore = (bundle?.active.length ?? 0) > 10 && !showExtended;
  const counters = bundle?.counters;

  const hero = (
    <AixiaHero
      surface="command"
      gradientTitle="Issues"
      title="Agent issues"
      subtitle="Observations and behavior traces from agents — staging only"
      description="Review active issues by stored severity and status (observed). Open an issue workspace for evidence, diagnostic trace, and stored validation."
      actions={
        <AixiaButton variant="secondary" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={`mr-1.5 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </AixiaButton>
      }
      badges={[
        { label: `${bundle?.active.length ?? 0} active`, tone: "amber" },
        { label: "Staging only", tone: "cyan" },
      ]}
    >
      <AixiaCommandMetrics
        items={[
          {
            key: "open",
            title: ISSUE_DETAIL_DISPLAY.hubStillOpen,
            value: loading ? "…" : String(counters?.stillOpen ?? 0),
            subtitle: "Open + in progress + awaiting stored validation",
            icon: AlertTriangle,
            tone: "amber",
          },
          {
            key: "verify",
            title: ISSUE_DETAIL_DISPLAY.hubAwaitingValidation,
            value: loading ? "…" : String(counters?.waitingVerification ?? 0),
            subtitle: ISSUE_DETAIL_DISPLAY.hubAwaitingValidationDetail,
            icon: ShieldCheck,
            tone: "rose",
          },
          {
            key: "validation-today",
            title: ISSUE_DETAIL_DISPLAY.hubValidationToday,
            value: loading ? "…" : String(counters?.fixedToday ?? 0),
            subtitle: "Stored validation recorded today",
            icon: ClipboardList,
            tone: "emerald",
          },
          {
            key: "validation-week",
            title: ISSUE_DETAIL_DISPLAY.hubValidationWeek,
            value: loading ? "…" : String(counters?.fixedThisWeek ?? 0),
            subtitle: "Stored validation recorded this week",
            icon: ClipboardList,
            tone: "cyan",
          },
          {
            key: "outcomes-total",
            title: ISSUE_DETAIL_DISPLAY.hubOutcomesTotal,
            value: loading ? "…" : String(counters?.totalFixed ?? 0),
            subtitle: "Stored validation + outcome (observed) lifecycle",
            icon: ListChecks,
            tone: "indigo",
          },
        ]}
      />
    </AixiaHero>
  );

  return (
    <AixiaCommandPageLayout
      hero={hero}
      scrollLead={
        <AixiaCommandHubMetaStrip
          variant="command"
          items={[
            { key: "env", label: "Environment", value: "Staging only", detail: "Local/staging AgentOps" },
            {
              key: "sort",
              label: "List order",
              value: showExtended ? "Top 20" : "Top 10",
              detail: "Stored signal strength sort (non-authoritative)",
            },
            {
              key: "sources",
              label: "Sources",
              value: "Findings + Browser QA bridge",
              detail: "agentops_findings + agentops_issues",
            },
          ]}
        />
      }
    >
      {error ? (
        <AixiaInfoBlock tone="rose" icon={AlertTriangle} title="Could not load issues">
          {error}
        </AixiaInfoBlock>
      ) : null}

      <IssuesListAuthorityBanner />

      <AixiaSection
        title="Active issues (stored signal strength sort)"
        description="Open and in-progress issues · sorted by stored severity only · max 10 (expand to 20)"
        icon={ListChecks}
        badge={
          <AixiaBadge tone="amber">{visibleActive.length} shown</AixiaBadge>
        }
      >
        {loading ? (
          <div className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-8 text-sm text-slate-400">
            Loading active issues…
          </div>
        ) : null}

        {!loading && visibleActive.length === 0 ? (
          <AixiaEmptyState
            icon={ListChecks}
            title="No open issues right now"
            description="Issues appear after agent Browser QA scans or imports promote findings. Run a Browser QA scan from an agent chat to create new staging issues."
            refreshSafe
          />
        ) : null}

        {!loading && visibleActive.length > 0 ? (
          <>
            <AixiaTableShell
              variant="registry"
              columns={[
                { id: "title", tier: "flex" },
                { id: "agent", tier: "medium" },
                { id: "module", tier: "status" },
                { id: "route", tier: "medium" },
                { id: "severity", tier: "status" },
                { id: "reason", tier: "medium" },
                { id: "status", tier: "status" },
                { id: "actions", tier: "action" },
              ]}
            >
              <thead>
                <tr>
                  <AixiaTableHeaderCell tier="flex">Title</AixiaTableHeaderCell>
                  <AixiaTableHeaderCell tier="medium">Agent</AixiaTableHeaderCell>
                  <AixiaTableHeaderCell tier="status">Module</AixiaTableHeaderCell>
                  <AixiaTableHeaderCell tier="medium">Route</AixiaTableHeaderCell>
                  <AixiaTableHeaderCell tier="status">Severity</AixiaTableHeaderCell>
                  <AixiaTableHeaderCell tier="medium">Reason</AixiaTableHeaderCell>
                  <AixiaTableHeaderCell tier="status">{ISSUE_DETAIL_DISPLAY.statusObserved}</AixiaTableHeaderCell>
                  <AixiaTableHeaderCell tier="action">Action</AixiaTableHeaderCell>
                </tr>
              </thead>
              <tbody>
                {visibleActive.map((issue) => (
                  <tr key={issue.issueCode}>
                    <AixiaTableTextCell tier="flex" primary={issue.title} />
                    <AixiaTableTextCell tier="medium" primary={issue.reportingAgent} />
                    <AixiaTableTextCell tier="status" primary={issue.module} />
                    <AixiaTableTextCell tier="medium" primary={issue.route} />
                    <AixiaTableBadgeCell tier="status">
                      <AixiaBadge tone={severityTone(issue.severity)}>{issue.severity}</AixiaBadge>
                    </AixiaTableBadgeCell>
                    <AixiaTableTextCell
                      tier="medium"
                      primary={issue.shortReason.slice(0, 120)}
                      secondary={issue.source === "browser_qa_issue" ? "Browser QA" : undefined}
                    />
                    <AixiaTableBadgeCell tier="status">
                      <AixiaBadge tone={statusTone(issue.normalizedStatus)}>
                        {issueStatusDisplayLabel(issue.status)}
                      </AixiaBadge>
                    </AixiaTableBadgeCell>
                    <AixiaTableActionsCell>
                      <AixiaButton
                        variant="primary"
                        className="text-xs px-3 py-1.5"
                        onClick={() =>
                          navigate(
                            `/system/agent-ops/issues/${encodeURIComponent(issue.issueCode)}`,
                          )
                        }
                      >
                        Open Issue
                      </AixiaButton>
                    </AixiaTableActionsCell>
                  </tr>
                ))}
              </tbody>
            </AixiaTableShell>
            {canShowMore ? (
              <div className="mt-3">
                <AixiaButton variant="secondary" onClick={() => setShowExtended(true)}>
                  Show up to 20 active issues
                </AixiaButton>
              </div>
            ) : null}
          </>
        ) : null}
      </AixiaSection>

      <details className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
        <summary className="cursor-pointer text-sm font-semibold text-slate-200">
          {ISSUE_DETAIL_DISPLAY.hubOutcomesHistory} ({bundle?.historyFixed.length ?? 0})
        </summary>
        <div className="mt-4 space-y-2">
          {(bundle?.historyFixed ?? []).slice(0, 20).map((issue) => (
            <div
              key={`fixed-${issue.issueCode}`}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2"
            >
              <div>
                <p className="text-sm text-white">{issue.title}</p>
                <p className="text-xs text-slate-400">
                  {issue.route} · {issue.reportingAgent}
                </p>
              </div>
              <AixiaButton
                variant="secondary"
                className="text-xs px-3 py-1.5"
                onClick={() =>
                  navigate(`/system/agent-ops/issues/${encodeURIComponent(issue.issueCode)}`)
                }
              >
                Open Issue
              </AixiaButton>
            </div>
          ))}
          {(bundle?.historyFixed.length ?? 0) === 0 ? (
            <p className="text-sm text-slate-400">{ISSUE_DETAIL_DISPLAY.hubOutcomesEmpty}</p>
          ) : null}
        </div>
      </details>

      <details className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
        <summary className="cursor-pointer text-sm font-semibold text-slate-200">
          Previous / closed issues ({bundle?.historyClosed.length ?? 0})
        </summary>
        <div className="mt-4 space-y-2">
          {(bundle?.historyClosed ?? []).slice(0, 20).map((issue) => (
            <div
              key={`closed-${issue.issueCode}`}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2"
            >
              <div>
                <p className="text-sm text-white">{issue.title}</p>
                <p className="text-xs text-slate-400">
                  {issueStatusDisplayLabel(issue.status)} · {issue.route}
                </p>
              </div>
              <AixiaButton
                variant="secondary"
                className="text-xs px-3 py-1.5"
                onClick={() =>
                  navigate(`/system/agent-ops/issues/${encodeURIComponent(issue.issueCode)}`)
                }
              >
                Open Issue
              </AixiaButton>
            </div>
          ))}
          {(bundle?.historyClosed.length ?? 0) === 0 ? (
            <p className="text-sm text-slate-400">No closed issues yet.</p>
          ) : null}
        </div>
      </details>
    </AixiaCommandPageLayout>
  );
}
