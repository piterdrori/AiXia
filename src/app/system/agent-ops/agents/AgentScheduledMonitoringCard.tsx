import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarClock, RefreshCw, Play, FileText } from "lucide-react";

import {
  AixiaBadge,
  AixiaButton,
  AixiaInfoBlock,
  AixiaProgressiveDisclosureGroup,
  AixiaSection,
} from "@/components/aixia";
import {
  MONITORING_OWNER_DISPLAY,
  formatEligibleSummary,
} from "@/lib/agentops/agents/monitoringOwnerDisplayCopy";
import type {
  AgentMonitoringEligibilityRow,
  MonitoringOwnerStatusPayload,
  MonitoringRunIndexSummary,
} from "@/lib/agentops/runtime/agentOpsMonitoringStatusService";
import type { MonitoringReportSummary } from "@/lib/agentops/runtime/agentOpsMonitoringReportReader";

type MonitoringIssueDraftSummary = {
  id: string;
  title: string;
  route: string | null;
  severity: string;
  status: string;
  runId: string;
  githubRunId: string | null;
  createdAt: string;
};

type ExtendedMonitoringStatus = MonitoringOwnerStatusPayload & {
  latestIssueDrafts?: MonitoringIssueDraftSummary[];
  issueDraftCounts?: Record<string, number>;
};

type StatusRowProps = {
  label: string;
  value: string;
  detail?: string;
};

function StatusRow({ label, value, detail }: StatusRowProps) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-white/45">{label}</p>
      <p className="mt-1 text-sm font-medium text-white/90">{value}</p>
      {detail ? <p className="mt-1 text-xs text-white/55">{detail}</p> : null}
    </div>
  );
}

function formatTimestamp(iso: string | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function IndexedCloudRunBlock({ run }: { run: MonitoringRunIndexSummary | null }) {
  if (!run) {
    return (
      <StatusRow
        label="Latest cloud dry-run (Supabase index)"
        value="No indexed cloud runs yet"
        detail="GitHub Actions dry-runs will appear here after Phase 5B index insert."
      />
    );
  }

  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3 space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-white/45">
        Latest cloud dry-run (Supabase index)
      </p>
      <p className="text-sm font-medium text-white/90">{formatTimestamp(run.endedAt ?? run.createdAt)}</p>
      <ul className="text-xs text-white/60 space-y-1">
        <li>Source: {run.source}</li>
        <li>Target class: {run.targetClass}</li>
        <li>Status: {run.status}</li>
        <li>Agents considered: {run.agentsConsidered}</li>
        <li>Agents run: {run.agentsRun}</li>
        <li>Findings: {run.findingsCount}</li>
        <li>Issue writes: {run.actualIssuesCreated}</li>
        <li>Memory writes: {run.actualMemoryWrites}</li>
        <li>Production blocked: {run.productionBlocked ? "yes" : "no"}</li>
        {run.githubRunId ? (
          <li>
            GitHub run:{" "}
            {run.githubRunUrl ? (
              <a
                href={run.githubRunUrl}
                target="_blank"
                rel="noreferrer"
                className="text-cyan-300/90 underline underline-offset-2"
              >
                {run.githubRunId}
              </a>
            ) : (
              run.githubRunId
            )}
          </li>
        ) : null}
      </ul>
    </div>
  );
}

function IssueDraftsBlock({
  drafts,
  draftCount,
  onReview,
}: {
  drafts: MonitoringIssueDraftSummary[];
  draftCount: number;
  onReview: () => void;
}) {
  const latest = drafts[0] ?? null;
  if (!latest && draftCount === 0) {
    return (
      <StatusRow
        label="Issue drafts from monitoring"
        value="No monitoring issue drafts yet"
      />
    );
  }

  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3 space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-white/45">
        Issue drafts from monitoring
      </p>
      <p className="text-sm font-medium text-white/90">
        {draftCount} open draft{draftCount === 1 ? "" : "s"} · Needs owner review
      </p>
      {latest ? (
        <ul className="text-xs text-white/60 space-y-1">
          <li>Latest: {latest.title}</li>
          <li>Route: {latest.route ?? "—"} · Severity: {latest.severity}</li>
          <li>Run: {latest.runId}</li>
          {latest.githubRunId ? <li>GitHub run: {latest.githubRunId}</li> : null}
        </ul>
      ) : null}
      <AixiaButton type="button" variant="secondary" className="text-xs px-3 py-1.5" onClick={onReview}>
        Review drafts
      </AixiaButton>
    </div>
  );
}

function LastRunBlock({ report }: { report: MonitoringReportSummary | null }) {
  if (!report) {
    return (
      <StatusRow
        label={MONITORING_OWNER_DISPLAY.lastRunAt}
        value={MONITORING_OWNER_DISPLAY.lastRunNone}
      />
    );
  }

  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3 space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-white/45">
        {MONITORING_OWNER_DISPLAY.lastRunAt}
      </p>
      <p className="text-sm font-medium text-white/90">{formatTimestamp(report.endedAt)}</p>
      <ul className="text-xs text-white/60 space-y-1">
        <li>Dry-run: {report.dryRun ? "yes" : "no"}</li>
        <li>Agents considered: {report.agentsConsidered}</li>
        <li>Agents run: {report.agentsRunCount}</li>
        <li>Findings: {report.findingsCount}</li>
        <li>Issues created: {report.actualIssuesCreated}</li>
        <li>Memory writes: {report.actualMemoryWrites}</li>
      </ul>
    </div>
  );
}

function EligibilityTable({ rows }: { rows: AgentMonitoringEligibilityRow[] }) {
  if (rows.length === 0) return null;

  return (
    <div className="overflow-x-auto rounded-lg border border-white/10">
      <table className="min-w-full text-left text-xs text-white/70">
        <thead className="border-b border-white/10 bg-white/[0.03] text-white/45 uppercase tracking-wide">
          <tr>
            <th className="px-3 py-2 font-semibold">Agent</th>
            <th className="px-3 py-2 font-semibold">Scheduled</th>
            <th className="px-3 py-2 font-semibold">Blocked reason</th>
            <th className="px-3 py-2 font-semibold">Browse</th>
            <th className="px-3 py-2 font-semibold">Issue draft</th>
            <th className="px-3 py-2 font-semibold">Memory</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.agentSlug} className="border-b border-white/5">
              <td className="px-3 py-2 font-medium text-white/85">{row.agentSlug}</td>
              <td className="px-3 py-2">{row.scheduledEligible ? "Yes" : "No"}</td>
              <td className="px-3 py-2 text-white/55">{row.scheduledEligible ? "—" : row.reason}</td>
              <td className="px-3 py-2">{row.canBrowseWebsite ? "Yes" : "No"}</td>
              <td className="px-3 py-2">{row.canCreateIssueDraft ? "Yes" : "No"}</td>
              <td className="px-3 py-2">{row.memoryMode}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function AgentScheduledMonitoringCard() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<ExtendedMonitoringStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dryRunLoading, setDryRunLoading] = useState(false);
  const [dryRunMessage, setDryRunMessage] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [inlineReport, setInlineReport] = useState<MonitoringReportSummary | null>(null);

  const loadStatus = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/agentops/monitoring/status");
      const payload = (await response.json()) as {
        ok?: boolean;
        error?: string;
        status?: ExtendedMonitoringStatus;
      };
      if (!response.ok || !payload.ok || !payload.status) {
        throw new Error(payload.error ?? "Could not load monitoring status.");
      }
      setStatus(payload.status);
      setInlineReport(payload.status.lastReport);
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : String(loadError);
      setError(message);
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  const runDryRun = async () => {
    setDryRunLoading(true);
    setDryRunMessage(null);
    try {
      const response = await fetch("/api/agentops/monitoring/dry-run", { method: "POST" });
      const payload = (await response.json()) as {
        ok?: boolean;
        summary?: MonitoringReportSummary;
        forcedDryRun?: boolean;
        writesSafe?: boolean;
        error?: string;
      };
      if (payload.summary) {
        setInlineReport(payload.summary);
        setReportOpen(true);
      }
      if (payload.writesSafe && payload.forcedDryRun) {
        setDryRunMessage(MONITORING_OWNER_DISPLAY.dryRunComplete);
      } else if (!response.ok) {
        setDryRunMessage(payload.error ?? MONITORING_OWNER_DISPLAY.dryRunFailed);
      } else {
        setDryRunMessage(MONITORING_OWNER_DISPLAY.dryRunComplete);
      }
      await loadStatus();
    } catch (runError) {
      setDryRunMessage(
        runError instanceof Error ? runError.message : MONITORING_OWNER_DISPLAY.dryRunFailed,
      );
    } finally {
      setDryRunLoading(false);
    }
  };

  const openLastReport = async () => {
    try {
      const response = await fetch("/api/agentops/monitoring/reports/latest");
      const payload = (await response.json()) as { summary?: MonitoringReportSummary | null };
      setInlineReport(payload.summary ?? status?.lastReport ?? null);
      setReportOpen(true);
    } catch {
      setInlineReport(status?.lastReport ?? null);
      setReportOpen(true);
    }
  };

  return (
    <AixiaSection
      title={MONITORING_OWNER_DISPLAY.sectionTitle}
      description={MONITORING_OWNER_DISPLAY.sectionDescription}
      icon={CalendarClock}
    >
      {loading ? (
        <p className="text-sm text-white/55">Loading monitoring status…</p>
      ) : error ? (
        <AixiaInfoBlock title="Monitoring status unavailable" tone="gold">
          {error}
        </AixiaInfoBlock>
      ) : status ? (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <AixiaBadge tone="neutral">{status.activationLabel}</AixiaBadge>
            <AixiaBadge tone="cyan">{status.writeModeLabel}</AixiaBadge>
            <AixiaBadge tone="neutral">{status.targetLabel}</AixiaBadge>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <StatusRow label="Monitoring level" value={status.monitoringLevelLabel} />
            <StatusRow
              label="Current activation"
              value={status.activationLabel}
              detail={status.activationDetail}
            />
            <StatusRow
              label="Write mode"
              value={status.writeModeLabel}
              detail={status.writeModeDetail}
            />
            <StatusRow label="Target" value={status.targetLabel} />
            <StatusRow label="Continuous mode" value={status.continuousLabel} />
            <IndexedCloudRunBlock run={status.latestIndexedRun} />
            <IssueDraftsBlock
              drafts={status.latestIssueDrafts ?? []}
              draftCount={status.issueDraftCounts?.draft ?? 0}
              onReview={() => navigate("/system/agent-ops/issues?panel=monitoring-drafts")}
            />
            <LastRunBlock report={inlineReport ?? status.lastReport} />
          </div>

          <StatusRow
            label="Eligible agents"
            value={formatEligibleSummary(status.eligibleCount)}
            detail={
              status.eligibleAgentSlugs.length > 0
                ? status.eligibleAgentSlugs.join(", ")
                : undefined
            }
          />

          <div className="rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-white/45">
              {MONITORING_OWNER_DISPLAY.safetyTitle}
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-white/65">
              <li>{MONITORING_OWNER_DISPLAY.safetyProductionBlocked}</li>
              <li>{MONITORING_OWNER_DISPLAY.safetyAutoFixBlocked}</li>
              <li>{MONITORING_OWNER_DISPLAY.safetyMemoryProposal}</li>
              <li>{MONITORING_OWNER_DISPLAY.safetyEvidenceRequired}</li>
            </ul>
          </div>

          {status.configError ? (
            <AixiaInfoBlock title="Configuration note" tone="gold">
              {status.configError}
            </AixiaInfoBlock>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <AixiaButton
              type="button"
              variant="primary"
              disabled={dryRunLoading}
              onClick={() => void runDryRun()}
            >
              <Play className="mr-1.5 h-4 w-4" />
              {dryRunLoading
                ? MONITORING_OWNER_DISPLAY.runningDryRun
                : MONITORING_OWNER_DISPLAY.runDryRunNow}
            </AixiaButton>
            <AixiaButton type="button" variant="secondary" onClick={() => void openLastReport()}>
              <FileText className="mr-1.5 h-4 w-4" />
              {MONITORING_OWNER_DISPLAY.openLastReport}
            </AixiaButton>
            <AixiaButton
              type="button"
              variant="secondary"
              disabled={loading}
              onClick={() => void loadStatus()}
            >
              <RefreshCw className={`mr-1.5 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              {MONITORING_OWNER_DISPLAY.refreshStatus}
            </AixiaButton>
          </div>

          {dryRunMessage ? (
            <p className="text-xs text-white/60">{dryRunMessage}</p>
          ) : null}

          <AixiaProgressiveDisclosureGroup
            title={MONITORING_OWNER_DISPLAY.reportPanelTitle}
            description="Summary from the latest scheduled monitoring JSON report"
            defaultOpen={reportOpen}
            tone="neutral"
            density="compact"
          >
            <div className="space-y-2 text-xs text-white/65">
              {inlineReport ?? status.lastReport ? (
                <pre className="max-h-64 overflow-auto rounded border border-white/10 bg-black/30 p-3 text-[11px] leading-relaxed">
                  {JSON.stringify(inlineReport ?? status.lastReport, null, 2)}
                </pre>
              ) : (
                <p>{MONITORING_OWNER_DISPLAY.lastRunNone}</p>
              )}
            </div>
          </AixiaProgressiveDisclosureGroup>

          <AixiaProgressiveDisclosureGroup
            title={MONITORING_OWNER_DISPLAY.eligibilityTitle}
            description="Per-agent scheduled eligibility from policy + DB schedule fields"
            defaultOpen={false}
            tone="neutral"
            density="compact"
          >
            <EligibilityTable rows={status.eligibility} />
          </AixiaProgressiveDisclosureGroup>
        </div>
      ) : null}
    </AixiaSection>
  );
}
