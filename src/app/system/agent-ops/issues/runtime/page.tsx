import { useCallback, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ListChecks, RefreshCw, Wrench } from "lucide-react";

import {
  AgentOpsRuntimeMirrorGate,
  AgentOpsRuntimeNoDataState,
} from "@/components/agentops/runtime/AgentOpsRuntimeMirrorStates";
import { AgentOpsRuntimeMirrorShell } from "@/components/agentops/runtime/AgentOpsRuntimeMirrorShell";
import {
  AixiaBadge,
  AixiaButton,
  AixiaCommandHubMetaStrip,
  AixiaHero,
  AixiaSection,
  AixiaTableBadgeCell,
  AixiaTableHeaderCell,
  AixiaTableShell,
  AixiaTableTextCell,
} from "@/components/aixia";
import { usePageTitle } from "@/hooks/usePageTitle";
import { parseRouteFromPageUrl } from "@/lib/agentops/issues/productIssueMappers";
import type { AgentOpsRuntimeIssueRow } from "@/lib/agentops/db/agentOpsRuntimeTypes";
import { fetchRuntimeIssues } from "@/lib/agentops/runtime/agentOpsRuntimeMirrorClient";
import {
  issueHasFixPipelineEvidence,
  readFixPipelineEvidence,
  readFixValidationEvidence,
  readIssueReasoning,
} from "@/lib/agentops/runtime/runtimeMirrorUtils";
import { buildRuntimeMirrorMetaItems } from "@/lib/agentops/runtime/runtimeMirrorUiHelpers";
import { useAgentOpsRuntimeMirror } from "@/lib/agentops/runtime/useAgentOpsRuntimeMirror";

type IssueView = "all" | "diagnostic-trace";
type StatusFilter = "all" | "open" | "in_progress" | "fixed" | "verified";

function severityTone(
  severity: AgentOpsRuntimeIssueRow["severity"],
): "rose" | "amber" | "cyan" | "neutral" {
  if (severity === "critical" || severity === "high") return "rose";
  if (severity === "medium") return "amber";
  if (severity === "low") return "cyan";
  return "neutral";
}

function statusTone(
  status: AgentOpsRuntimeIssueRow["status"],
): "emerald" | "amber" | "cyan" | "neutral" {
  if (status === "verified") return "emerald";
  if (status === "open") return "amber";
  if (status === "in_progress") return "cyan";
  return "neutral";
}

function storedTraceOutcome(
  issueStatus: string,
  validationStatus: string | undefined,
  pipelineValidationStatus: string | undefined,
): string {
  return validationStatus ?? pipelineValidationStatus ?? issueStatus;
}

function traceStatusTone(value: string): "emerald" | "amber" | "rose" | "neutral" {
  const normalized = value.toLowerCase();
  if (normalized.includes("verified") || normalized.includes("fixed") || normalized.includes("pass")) {
    return "emerald";
  }
  if (normalized.includes("partial") || normalized.includes("progress") || normalized.includes("pending")) {
    return "amber";
  }
  if (normalized.includes("fail") || normalized.includes("reject") || normalized.includes("open")) {
    return "rose";
  }
  return "neutral";
}

export default function AgentOpsRuntimeIssuesMirrorPage() {
  usePageTitle("Issues observatory");
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const view: IssueView =
    searchParams.get("filter") === "diagnostic-trace" ? "diagnostic-trace" : "all";
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const fetcher = useCallback(() => fetchRuntimeIssues(), []);
  const { data: issues, error, loading, refresh } = useAgentOpsRuntimeMirror(fetcher);

  const traceIssues = useMemo(
    () => (issues ?? []).filter(issueHasFixPipelineEvidence),
    [issues],
  );

  const filteredAll = useMemo(() => {
    const rows = issues ?? [];
    if (statusFilter === "all") return rows;
    return rows.filter((issue) => issue.status === statusFilter);
  }, [issues, statusFilter]);

  const setView = (next: IssueView) => {
    if (next === "all") {
      setSearchParams({});
    } else {
      setSearchParams({ filter: "diagnostic-trace" });
    }
  };

  return (
    <AgentOpsRuntimeMirrorShell
      active="issues"
      scrollLead={
        <AixiaCommandHubMetaStrip
          variant="command"
          items={buildRuntimeMirrorMetaItems([
            { key: "table", label: "Table", value: "agentops_issues" },
            {
              key: "view",
              label: "View",
              value: view === "diagnostic-trace" ? "Diagnostic trace" : "All issues",
            },
            {
              key: "rows",
              label: "Rows",
              value:
                view === "diagnostic-trace"
                  ? `${traceIssues.length}`
                  : `${issues?.length ?? 0}`,
            },
          ])}
        />
      }
      hero={
        <AixiaHero
          surface="command"
          gradientTitle="Issues"
          title="Issues observatory"
          subtitle="Developer diagnostics · agentops_issues"
          description="Unified read-only issue mirror — all rows and diagnostic trace evidence views."
          actions={
            <>
              <AixiaButton
                variant="secondary"
                onClick={() => navigate("/system/agent-ops/runtime")}
              >
                Diagnostics hub
              </AixiaButton>
              <AixiaButton variant="secondary" onClick={() => navigate("/system/agent-ops/issues")}>
                Product Issues Hub
              </AixiaButton>
              <AixiaButton variant="secondary" onClick={() => void refresh()} disabled={loading}>
                <RefreshCw className="mr-1.5 h-4 w-4" />
                Refresh
              </AixiaButton>
            </>
          }
          badges={[{ label: "Runtime / debug", tone: "neutral" }]}
        />
      }
    >
      <div className="flex flex-wrap gap-2">
        <AixiaButton
          variant={view === "all" ? "primary" : "secondary"}
          onClick={() => setView("all")}
        >
          All issues
        </AixiaButton>
        <AixiaButton
          variant={view === "diagnostic-trace" ? "primary" : "secondary"}
          onClick={() => setView("diagnostic-trace")}
        >
          Diagnostic trace evidence
        </AixiaButton>
      </div>

      {view === "all" ? (
        <>
          <div className="flex flex-wrap gap-2">
            {(["all", "open", "in_progress", "fixed", "verified"] as StatusFilter[]).map(
              (filter) => (
                <AixiaButton
                  key={filter}
                  variant={statusFilter === filter ? "primary" : "secondary"}
                  onClick={() => setStatusFilter(filter)}
                >
                  {filter}
                </AixiaButton>
              ),
            )}
          </div>

          <AixiaSection title="Issue registry">
            <AgentOpsRuntimeMirrorGate
              loading={loading}
              error={error}
              data={issues}
              tableName="agentops_issues"
              isEmpty={(rows) => rows.length === 0}
              emptyIcon={ListChecks}
              emptyFix="Run node scripts/agentops-runtime-worker.mjs --once or scripts/agentops-reasoning-pipeline.mjs."
              onRetry={() => void refresh()}
            >
              {() => (
                <AixiaTableShell
                  variant="registry"
                  columns={[
                    { id: "title", tier: "flex" },
                    { id: "severity", tier: "status" },
                    { id: "status", tier: "status" },
                    { id: "page", tier: "medium" },
                    { id: "cluster", tier: "medium" },
                    { id: "impact", tier: "count" },
                  ]}
                >
                  <thead>
                    <tr>
                      <AixiaTableHeaderCell tier="flex">Title</AixiaTableHeaderCell>
                      <AixiaTableHeaderCell tier="status">Severity</AixiaTableHeaderCell>
                      <AixiaTableHeaderCell tier="status">Status</AixiaTableHeaderCell>
                      <AixiaTableHeaderCell tier="medium">Route</AixiaTableHeaderCell>
                      <AixiaTableHeaderCell tier="medium">Cluster</AixiaTableHeaderCell>
                      <AixiaTableHeaderCell tier="count">Impact</AixiaTableHeaderCell>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAll.map((issue) => {
                      const reasoning = readIssueReasoning(issue);
                      return (
                        <tr
                          key={issue.id}
                          className="cursor-pointer hover:bg-white/[0.03]"
                          onClick={() => navigate(`/system/agent-ops/issues/id/${issue.id}`)}
                        >
                          <AixiaTableTextCell tier="flex" primary={issue.title} />
                          <AixiaTableBadgeCell tier="status">
                            <AixiaBadge tone={severityTone(issue.severity)}>
                              {issue.severity}
                            </AixiaBadge>
                          </AixiaTableBadgeCell>
                          <AixiaTableBadgeCell tier="status">
                            <AixiaBadge tone={statusTone(issue.status)}>{issue.status}</AixiaBadge>
                          </AixiaTableBadgeCell>
                          <AixiaTableTextCell
                            tier="medium"
                            primary={parseRouteFromPageUrl(issue.page_url)}
                          />
                          <AixiaTableTextCell tier="medium" primary={reasoning.cluster_id ?? "—"} />
                          <AixiaTableTextCell tier="count" primary={reasoning.impact_score ?? "—"} />
                        </tr>
                      );
                    })}
                  </tbody>
                </AixiaTableShell>
              )}
            </AgentOpsRuntimeMirrorGate>
          </AixiaSection>
        </>
      ) : (
        <AixiaSection title="Diagnostic trace evidence">
          <AgentOpsRuntimeMirrorGate
            loading={loading}
            error={error}
            data={issues}
            tableName="agentops_issues"
            isEmpty={(rows) => rows.length === 0}
            emptyIcon={Wrench}
            emptyFix="Populate agentops_issues first, then run node scripts/agentops-fix-pipeline.mjs --issue-id=<uuid>."
            onRetry={() => void refresh()}
          >
            {() =>
              traceIssues.length === 0 ? (
                <AgentOpsRuntimeNoDataState
                  tableName="agentops_issues (diagnostic trace evidence)"
                  title="No diagnostic trace evidence yet"
                  description="Issues exist in agentops_issues but none contain stored diagnostic trace evidence."
                  suggestedFix="Run node scripts/agentops-fix-pipeline.mjs --issue-id=<uuid> to attach trace evidence."
                  icon={Wrench}
                />
              ) : (
                <AixiaTableShell
                  variant="registry"
                  columns={[
                    { id: "title", tier: "flex" },
                    { id: "status", tier: "status" },
                    { id: "outcome", tier: "status" },
                    { id: "pr", tier: "medium" },
                    { id: "validation", tier: "medium" },
                  ]}
                >
                  <thead>
                    <tr>
                      <AixiaTableHeaderCell tier="flex">Issue</AixiaTableHeaderCell>
                      <AixiaTableHeaderCell tier="status">Status</AixiaTableHeaderCell>
                      <AixiaTableHeaderCell tier="status">Stored validation</AixiaTableHeaderCell>
                      <AixiaTableHeaderCell tier="medium">PR</AixiaTableHeaderCell>
                      <AixiaTableHeaderCell tier="medium">Validation</AixiaTableHeaderCell>
                    </tr>
                  </thead>
                  <tbody>
                    {traceIssues.map((issue) => {
                      const pipeline = readFixPipelineEvidence(issue);
                      const validation = readFixValidationEvidence(issue);
                      const storedOutcome = storedTraceOutcome(
                        issue.status,
                        validation.status,
                        pipeline.validation_status ?? undefined,
                      );

                      return (
                        <tr
                          key={issue.id}
                          className="cursor-pointer hover:bg-white/[0.03]"
                          onClick={() => navigate(`/system/agent-ops/issues/id/${issue.id}`)}
                        >
                          <AixiaTableTextCell tier="flex" primary={issue.title} />
                          <AixiaTableTextCell tier="status" primary={issue.status} />
                          <AixiaTableBadgeCell tier="status">
                            <AixiaBadge tone={traceStatusTone(storedOutcome)}>{storedOutcome}</AixiaBadge>
                          </AixiaTableBadgeCell>
                          <AixiaTableTextCell
                            tier="medium"
                            primary={pipeline.pr_url ? "created" : "—"}
                          />
                          <AixiaTableTextCell
                            tier="medium"
                            primary={
                              validation.details ??
                              validation.status ??
                              pipeline.validation_status ??
                              "—"
                            }
                          />
                        </tr>
                      );
                    })}
                  </tbody>
                </AixiaTableShell>
              )
            }
          </AgentOpsRuntimeMirrorGate>
        </AixiaSection>
      )}
    </AgentOpsRuntimeMirrorShell>
  );
}
