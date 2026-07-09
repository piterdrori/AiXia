import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarClock, Play, RefreshCw, Users } from "lucide-react";

import {
  AixiaBadge,
  AixiaButton,
  AixiaInfoBlock,
  AixiaSection,
  AixiaTableShell,
  AixiaTableHeaderCell,
  AixiaTableTextCell,
  AixiaTableBadgeCell,
  AixiaTableActionsCell,
} from "@/components/aixia";
import { formatTimestamp } from "@/lib/agentops/agents/monitoringOwnerDisplayCopy";
import { FetchTimeoutError, fetchWithTimeout } from "@/lib/fetchWithTimeout";

const MONITORING_STATUS_TIMEOUT_MS = 18_000;

type DailyRosterRow = {
  agentSlug: string;
  displayName: string;
  username: string;
  jobTitle: string;
  agentStatus: string;
  lastDailyRunAt: string | null;
  todayStatus: string;
  todayResult: string;
  errorsFound: number;
  improvementsFound: number;
  featuresFound: number;
  draftsQueued?: number;
  noFindings: boolean;
};

type Daily12ReviewStatus = {
  schedule: string;
  environment: string;
  modeLabel: string;
  registeredAgents: number;
  expectedAgents: number;
  usernamesConfigured: number;
  executionDate: string;
  agentsExpectedToday: number;
  agentsAttemptedToday: number;
  agentsCompletedToday: number;
  agentsFailedToday: number;
  agentsBlockedToday: number;
  agentsMissingToday: string[];
  lastCompletedDailyReviewAt: string | null;
  nextExpectedDailyReviewAt: string | null;
  latestDailyRunId: string | null;
  latestRunStatus: string | null;
  persistenceComplete?: boolean;
  errorsFoundToday: number;
  improvementsSuggestedToday: number;
  newFeaturesSuggestedToday: number;
  candidatesDetectedToday: number;
  draftsQueuedToday: number;
  candidatesNotQueuedToday: number;
  duplicatesConsolidatedToday: number;
  duplicatesSkippedToday: number;
  noFindingsAgentsToday: number;
  allAgentsAccountedFor: boolean;
  healthWarnings: string[];
  roster: DailyRosterRow[];
  githubWorkflowUrl: string;
};

function todayResultTone(
  result: string,
): "emerald" | "amber" | "rose" | "cyan" | "neutral" {
  if (result === "no_findings") return "cyan";
  if (result === "findings") return "amber";
  if (result === "missing" || result === "not_run") return "rose";
  return "neutral";
}

export function AgentDaily12ReviewCard() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<Daily12ReviewStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchWithTimeout("/api/agentops/monitoring/status", {
        timeoutMs: MONITORING_STATUS_TIMEOUT_MS,
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        error?: string;
        status?: {
          daily12ReviewStatus?: Daily12ReviewStatus;
          dailyStatusError?: string | null;
          configError?: string | null;
        };
      };
      if (!response.ok || payload.ok === false) {
        throw new Error(
          payload.error ??
            payload.status?.dailyStatusError ??
            payload.status?.configError ??
            "Could not load daily review status.",
        );
      }
      if (payload.status?.dailyStatusError) {
        setError(payload.status.dailyStatusError);
      }
      setStatus(payload.status?.daily12ReviewStatus ?? null);
    } catch (loadError) {
      if (loadError instanceof FetchTimeoutError) {
        setError("Unable to load monitoring status — request timed out.");
      } else {
        setError(loadError instanceof Error ? loadError.message : String(loadError));
      }
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  const openGithubWorkflow = () => {
    const url =
      status?.githubWorkflowUrl ??
      "https://github.com/piterdrori/AiXia/actions/workflows/agentops-daily-12-agent-review.yml";
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <AixiaSection
      title="Daily 12-Agent Review"
      titleHeadingLevel="h2"
      description="Each canonical agent reviews staging once per UTC day from its professional perspective. Evidence and proposals only — owner gates preserved."
      icon={Users}
    >
      {loading ? (
        <p className="text-sm text-white/55">Loading daily 12-agent review status…</p>
      ) : error && !status ? (
        <div className="space-y-3">
          <AixiaInfoBlock title="Unable to load monitoring status" tone="gold">
            {error}
          </AixiaInfoBlock>
          <div className="flex flex-wrap gap-2">
            <AixiaButton type="button" variant="primary" onClick={() => void loadStatus()}>
              <RefreshCw className="mr-1.5 h-4 w-4" />
              Retry
            </AixiaButton>
            <AixiaButton type="button" variant="secondary" onClick={() => window.location.reload()}>
              Refresh page
            </AixiaButton>
          </div>
        </div>
      ) : status ? (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <AixiaBadge tone="neutral">{status.environment}</AixiaBadge>
            <AixiaBadge tone="cyan">{status.modeLabel}</AixiaBadge>
            <AixiaBadge tone={status.allAgentsAccountedFor ? "emerald" : "amber"}>
              {status.agentsCompletedToday}/{status.expectedAgents} completed today
            </AixiaBadge>
            <AixiaBadge tone={(status.persistenceComplete ?? false) ? "emerald" : "amber"}>
              persistence {(status.persistenceComplete ?? false) ? "complete" : "incomplete"}
            </AixiaBadge>
            <AixiaBadge tone="neutral">
              run {status.latestDailyRunId ? status.latestDailyRunId.slice(0, 8) : "—"}
            </AixiaBadge>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-white/45">Schedule</p>
              <p className="mt-1 text-sm text-white/90">{status.schedule}</p>
              <p className="mt-1 text-xs text-white/55">
                Next expected: {formatTimestamp(status.nextExpectedDailyReviewAt)}
              </p>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-white/45">Coverage</p>
              <p className="mt-1 text-sm text-white/90">
                Registered {status.registeredAgents}/{status.expectedAgents} · Usernames{" "}
                {status.usernamesConfigured}/{status.expectedAgents}
              </p>
              <p className="mt-1 text-xs text-white/55">
                Attempted today: {status.agentsAttemptedToday} · Failed: {status.agentsFailedToday} ·
                Missing: {status.agentsMissingToday.length}
              </p>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-white/45">
                Owner queue (today)
              </p>
              <p className="mt-1 text-sm text-white/90">
                Detected {status.candidatesDetectedToday} · Queued {status.draftsQueuedToday} · Not
                queued {status.candidatesNotQueuedToday}
              </p>
              <p className="mt-1 text-xs text-white/55">
                Consolidated {status.duplicatesConsolidatedToday} · DB duplicates skipped{" "}
                {status.duplicatesSkippedToday} · Run {status.latestDailyRunId ?? "—"}
              </p>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-white/45">
                Today&apos;s findings
              </p>
              <p className="mt-1 text-sm text-white/90">
                Errors {status.errorsFoundToday} · Improvements detected{" "}
                {status.improvementsSuggestedToday} · Features {status.newFeaturesSuggestedToday}
              </p>
              <p className="mt-1 text-xs text-white/55">
                No-findings agents: {status.noFindingsAgentsToday}
              </p>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-white/45">
                Last completed daily review
              </p>
              <p className="mt-1 text-sm text-white/90">
                {formatTimestamp(status.lastCompletedDailyReviewAt)}
              </p>
              <p className="mt-1 text-xs text-white/55">UTC date: {status.executionDate}</p>
            </div>
          </div>

          {status.healthWarnings.length > 0 ? (
            <AixiaInfoBlock title="Monitoring health warnings" tone="gold">
              <ul className="list-disc space-y-1 pl-4">
                {status.healthWarnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </AixiaInfoBlock>
          ) : null}

          <AixiaTableShell
            columns={[
              { id: "agent", tier: "flex" },
              { id: "username", tier: "medium" },
              { id: "job", tier: "medium" },
              { id: "status", tier: "status" },
              { id: "today", tier: "status" },
              { id: "errors", tier: "count" },
              { id: "improvements", tier: "count" },
              { id: "queued", tier: "count" },
              { id: "features", tier: "count" },
              { id: "action", tier: "action" },
            ]}
          >
            <thead>
              <tr>
                <AixiaTableHeaderCell tier="flex">Agent</AixiaTableHeaderCell>
                <AixiaTableHeaderCell tier="medium">Username</AixiaTableHeaderCell>
                <AixiaTableHeaderCell tier="medium">Job title</AixiaTableHeaderCell>
                <AixiaTableHeaderCell tier="status">Status</AixiaTableHeaderCell>
                <AixiaTableHeaderCell tier="status">Today</AixiaTableHeaderCell>
                <AixiaTableHeaderCell tier="count">Errors</AixiaTableHeaderCell>
                <AixiaTableHeaderCell tier="count">Improvements</AixiaTableHeaderCell>
                <AixiaTableHeaderCell tier="count">Queued</AixiaTableHeaderCell>
                <AixiaTableHeaderCell tier="count">Features</AixiaTableHeaderCell>
                <AixiaTableHeaderCell tier="action">Open</AixiaTableHeaderCell>
              </tr>
            </thead>
            <tbody>
              {status.roster.map((row) => (
                <tr key={row.agentSlug}>
                  <AixiaTableTextCell tier="flex" primary={row.displayName} />
                  <AixiaTableTextCell tier="medium" primary={row.username} />
                  <AixiaTableTextCell tier="medium" primary={row.jobTitle} />
                  <AixiaTableBadgeCell tier="status">
                    <AixiaBadge
                      tone={
                        row.todayStatus === "completed"
                          ? "emerald"
                          : row.todayStatus === "failed"
                            ? "rose"
                            : "neutral"
                      }
                    >
                      {row.todayStatus}
                    </AixiaBadge>
                  </AixiaTableBadgeCell>
                  <AixiaTableBadgeCell tier="status">
                    <AixiaBadge tone={todayResultTone(row.todayResult)}>{row.todayResult}</AixiaBadge>
                  </AixiaTableBadgeCell>
                  <AixiaTableTextCell tier="count" primary={String(row.errorsFound)} />
                  <AixiaTableTextCell tier="count" primary={String(row.improvementsFound)} />
                  <AixiaTableTextCell tier="count" primary={String(row.draftsQueued ?? 0)} />
                  <AixiaTableTextCell tier="count" primary={String(row.featuresFound)} />
                  <AixiaTableActionsCell>
                    <AixiaButton
                      type="button"
                      variant="secondary"
                      onClick={() => navigate(`/system/agent-ops/agents/${row.agentSlug}`)}
                    >
                      Open Agent
                    </AixiaButton>
                  </AixiaTableActionsCell>
                </tr>
              ))}
            </tbody>
          </AixiaTableShell>

          <div className="flex flex-wrap gap-2">
            <AixiaButton type="button" variant="primary" onClick={openGithubWorkflow}>
              <Play className="mr-1.5 h-4 w-4" />
              Run all 12 now
            </AixiaButton>
            <AixiaButton type="button" variant="secondary" onClick={() => void loadStatus()}>
              <RefreshCw className="mr-1.5 h-4 w-4" />
              Refresh coverage
            </AixiaButton>
            <AixiaButton
              type="button"
              variant="secondary"
              onClick={() => navigate("/system/agent-ops/issues?panel=monitoring-drafts")}
            >
              Review error drafts
            </AixiaButton>
            <AixiaButton
              type="button"
              variant="secondary"
              onClick={() => navigate("/system/agent-ops/issues?panel=monitoring-drafts&kind=improvement")}
            >
              Review improvement proposals
            </AixiaButton>
            <AixiaButton type="button" variant="secondary" onClick={openGithubWorkflow}>
              <CalendarClock className="mr-1.5 h-4 w-4" />
              Open daily workflow
            </AixiaButton>
          </div>
        </div>
      ) : (
        <AixiaInfoBlock title="Daily review not configured" tone="gold">
          Daily 12-agent review metadata is not available yet.
        </AixiaInfoBlock>
      )}
    </AixiaSection>
  );
}
