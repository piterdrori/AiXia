import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Clock, Gauge, History, ListChecks, PlayCircle, RefreshCw, Route, ShieldCheck } from "lucide-react";

import {
  AixiaAsyncState,
  AixiaBadge,
  AixiaButton,
  AixiaCommandHubMetaStrip,
  AixiaCommandMetrics,
  AixiaCommandPageLayout,
  AixiaEmptyState,
  AixiaHero,
  AixiaInfoBlock,
  AixiaSection,
} from "@/components/aixia";
import { usePageTitle } from "@/hooks/usePageTitle";
import {
  getAgentOpsAutomationControlRequests,
  getAgentOpsDashboardSummary,
  getAgentOpsManualScanWorkflow,
  getAgentOpsOwnerStatus,
  getAgentOpsQueueHealth,
  getAgentOpsSchedulerPreparationStatus,
  getAgentOpsVerificationRequests,
  markAgentOpsScanNeeded,
  recordAgentOpsAutomationControlRequest,
  recordAgentOpsManualScanStep,
  recordAgentOpsQueueHealthDecision,
  refillAgentOpsActiveTop10FromBacklog,
  type AgentOpsAutomationControlRequestItem,
  type AgentOpsAutomationControlRequestType,
  type AgentOpsManualScanWorkflow,
  type AgentOpsManualScanWorkflowStep,
  type AgentOpsQueueHealth,
  type AgentOpsQueueHealthDecision,
  type AgentOpsQueueHealthRecommendedAction,
  type AgentOpsSchedulerPreparationStatus,
  type AgentOpsVerificationRequestItem,
} from "@/lib/agentops";
import { AgentOpsAutomationRequestOperatorSurface } from "@/app/system/agent-ops/operators/AgentOpsAutomationRequestOperatorSurface";

type FeedbackTone = "success" | "warning" | "error";

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
}

function formatQueueHealthAction(action: AgentOpsQueueHealthRecommendedAction): string {
  switch (action) {
    case "no_action":
      return "No action";
    case "refill_from_backlog":
      return "Refill from backlog";
    case "generate_more_candidates":
      return "Generate more candidates";
    case "refill_and_generate_more_candidates":
      return "Refill and generate more candidates";
    case "run_scan_import_plan":
      return "Run scan / import plan";
    default:
      return action;
  }
}

function formatWorkflowStepStatus(status: AgentOpsManualScanWorkflowStep["status"]): string {
  switch (status) {
    case "not_started":
      return "Not started";
    case "copied":
      return "Copied";
    case "owner_marked_running":
      return "Running";
    case "owner_marked_completed":
      return "Completed";
    case "blocked":
      return "Blocked";
    default:
      return status;
  }
}

function workflowStepStatusTone(
  status: AgentOpsManualScanWorkflowStep["status"],
): "neutral" | "cyan" | "amber" | "emerald" | "rose" {
  if (status === "owner_marked_completed") return "emerald";
  if (status === "owner_marked_running" || status === "copied") return "cyan";
  if (status === "blocked") return "rose";
  if (status === "not_started") return "neutral";
  return "amber";
}

function formatAutomationRequestType(type: AgentOpsAutomationControlRequestType): string {
  return type.replaceAll("_", " ");
}

export default function AgentOpsAutomationPage() {
  usePageTitle("AgentOps Automation");

  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [queueHealth, setQueueHealth] = useState<AgentOpsQueueHealth | null>(null);
  const [manualScanWorkflow, setManualScanWorkflow] = useState<AgentOpsManualScanWorkflow | null>(null);
  const [schedulerPrep, setSchedulerPrep] = useState<AgentOpsSchedulerPreparationStatus | null>(null);
  const [automationRequests, setAutomationRequests] = useState<AgentOpsAutomationControlRequestItem[]>([]);
  const [verificationRequests, setVerificationRequests] = useState<AgentOpsVerificationRequestItem[]>([]);
  const [latestRunStatus, setLatestRunStatus] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: FeedbackTone; message: string } | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const [
      ownerResult,
      queueHealthResult,
      workflowResult,
      schedulerResult,
      automationRequestsResult,
      verificationResult,
      dashboardResult,
    ] = await Promise.all([
      getAgentOpsOwnerStatus(),
      getAgentOpsQueueHealth(),
      getAgentOpsManualScanWorkflow(),
      getAgentOpsSchedulerPreparationStatus(),
      getAgentOpsAutomationControlRequests(12),
      getAgentOpsVerificationRequests(),
      getAgentOpsDashboardSummary(),
    ]);

    if (ownerResult.error || !ownerResult.data?.isOwner) {
      setIsOwner(false);
      setError(ownerResult.error ?? "AgentOps Owner access required.");
      setLoading(false);
      return;
    }

    setIsOwner(true);
    setQueueHealth(queueHealthResult.data ?? null);
    setManualScanWorkflow(workflowResult.data ?? null);
    setSchedulerPrep(schedulerResult.data ?? null);
    setAutomationRequests(automationRequestsResult.data ?? []);
    setVerificationRequests(verificationResult.data ?? []);
    setLatestRunStatus(dashboardResult.data?.latestRun?.status ?? null);

    const firstError =
      queueHealthResult.error ??
      workflowResult.error ??
      schedulerResult.error ??
      automationRequestsResult.error ??
      verificationResult.error ??
      dashboardResult.error ??
      null;
    if (firstError) setError(firstError);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const setResult = useCallback((tone: FeedbackTone, message: string) => {
    setFeedback({ tone, message });
  }, []);

  const copyText = useCallback(async (value: string, successMessage: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setResult("success", successMessage);
      return true;
    } catch {
      setResult("error", "Could not copy to clipboard.");
      return false;
    }
  }, [setResult]);

  const recordRequest = useCallback(
    async (
      requestType: AgentOpsAutomationControlRequestType,
      note: string,
      status: AgentOpsAutomationControlRequestItem["status"] = "requested",
      commandOrPrompt?: string | null,
    ) => {
      setSubmitting(true);
      const result = await recordAgentOpsAutomationControlRequest({
        requestType,
        status,
        note,
        commandOrPrompt: commandOrPrompt ?? undefined,
      });
      setSubmitting(false);
      if (result.error) {
        setResult("error", result.error);
        return;
      }
      setResult("success", result.data?.message ?? "Automation request recorded.");
      await loadData();
    },
    [loadData, setResult],
  );

  const handleRefillQueue = useCallback(async () => {
    setSubmitting(true);
    const result = await refillAgentOpsActiveTop10FromBacklog();
    setSubmitting(false);
    if (result.error) {
      setResult("error", result.error);
      return;
    }
    setResult("success", result.data?.message ?? "Queue refill completed.");
    await loadData();
  }, [loadData, setResult]);

  const handleMarkScanNeeded = useCallback(async () => {
    if (!queueHealth) return;
    setSubmitting(true);
    const result = await markAgentOpsScanNeeded({
      note: "Marked from Automation route shell.",
      recommendedAction: queueHealth.recommendedAction,
      activeOpenCount: queueHealth.activeOpenCount,
      backlogCount: queueHealth.backlogCount,
    });
    setSubmitting(false);
    if (result.error) {
      setResult("error", result.error);
      return;
    }
    setResult("success", result.data?.message ?? "Scan needed recorded.");
    await loadData();
  }, [loadData, queueHealth, setResult]);

  const handleQueueHealthDecision = useCallback(
    async (decision: AgentOpsQueueHealthDecision) => {
      if (!queueHealth) return;
      setSubmitting(true);
      const result = await recordAgentOpsQueueHealthDecision({
        decision,
        note: `Recorded from Automation route (${decision}).`,
        recommendedAction: queueHealth.recommendedAction,
        activeOpenCount: queueHealth.activeOpenCount,
        backlogCount: queueHealth.backlogCount,
      });
      setSubmitting(false);
      if (result.error) {
        setResult("error", result.error);
        return;
      }
      setResult("success", result.data?.message ?? "Queue health decision recorded.");
      await loadData();
    },
    [loadData, queueHealth, setResult],
  );

  const queueHealthSnapshot = useMemo(
    () => manualScanWorkflow?.currentQueueHealth ?? queueHealth,
    [manualScanWorkflow?.currentQueueHealth, queueHealth],
  );

  const recordManualStepAction = useCallback(
    async (
      step: AgentOpsManualScanWorkflowStep,
      action: "copied_command" | "marked_running" | "marked_completed" | "blocked",
      note?: string,
    ) => {
      if (!queueHealthSnapshot) return;
      setSubmitting(true);
      const result = await recordAgentOpsManualScanStep({
        stepId: step.stepId,
        action,
        note,
        command: step.command,
        queueHealthSnapshot,
      });
      setSubmitting(false);
      if (result.error) {
        setResult("error", result.error);
        return;
      }
      setResult("success", result.data?.message ?? "Workflow step recorded.");
      await loadData();
    },
    [loadData, queueHealthSnapshot, setResult],
  );

  const copyAndRecordStepCommand = useCallback(
    async (step: AgentOpsManualScanWorkflowStep) => {
      if (!step.command?.trim()) {
        setResult("warning", "No CLI command for this step.");
        return;
      }
      const copied = await copyText(step.command, "Step command copied. No execution performed.");
      if (!copied) return;
      await recordManualStepAction(step, "copied_command");
    },
    [copyText, recordManualStepAction, setResult],
  );

  const pendingVerificationCount = useMemo(
    () => verificationRequests.filter((item) => item.requestStatus !== "verification_passed").length,
    [verificationRequests],
  );

  const latestAutomationRequest = automationRequests[0] ?? null;
  const latestRequestLabel = latestAutomationRequest
    ? `${formatAutomationRequestType(latestAutomationRequest.requestType)} (${latestAutomationRequest.status})`
    : "No request yet";

  const automationMetaStripItems = useMemo(
    () => [
      {
        key: "staging",
        label: "Environment",
        value: "Staging only",
        detail: "Manual-first AgentOps staging surface.",
        tone: "amber" as const,
      },
      {
        key: "mode",
        label: "Control mode",
        value: "Manual-first",
        detail: "Owner records decisions — no runtime activation.",
        tone: "cyan" as const,
      },
      {
        key: "scheduler",
        label: "Scheduler posture",
        value: schedulerPrep?.active ? "Flagged (still manual)" : "Inactive",
        detail: "Scheduler preparation only — not activated.",
        tone: "rose" as const,
      },
      {
        key: "latest",
        label: "Latest activity",
        value: latestRunStatus ?? "No run",
        detail: latestRequestLabel,
        tone: "neutral" as const,
      },
    ],
    [latestRequestLabel, latestRunStatus, schedulerPrep?.active],
  );

  const automationCommandMetrics = useMemo(
    () => [
      {
        key: "active-top-10",
        title: "Active Top 10",
        value: loading
          ? "Checking…"
          : queueHealth
            ? `${queueHealth.activeOpenCount}/${queueHealth.activeTarget}`
            : "—",
        subtitle: queueHealth ? formatQueueHealthAction(queueHealth.recommendedAction) : "Queue health",
        icon: Gauge,
        tone: "emerald" as const,
      },
      {
        key: "open-slots",
        title: "Open slots",
        value: loading ? "Checking…" : queueHealth ? String(queueHealth.openSlots) : "—",
        subtitle: "Active Top 10 capacity",
        icon: Gauge,
        tone: "cyan" as const,
      },
      {
        key: "backlog",
        title: "Backlog",
        value: loading ? "Checking…" : queueHealth ? String(queueHealth.backlogCount) : "—",
        subtitle: "Backlog candidates available",
        icon: Route,
        tone: "violet" as const,
      },
      {
        key: "pending-verification",
        title: "Pending verification",
        value: loading ? "Checking…" : String(pendingVerificationCount),
        subtitle: "Verification queue rows",
        icon: ShieldCheck,
        tone: "amber" as const,
      },
      {
        key: "control-requests",
        title: "Control requests",
        value: loading ? "Checking…" : String(automationRequests.length),
        subtitle: "Recent automation request log",
        icon: History,
        tone: "indigo" as const,
      },
      {
        key: "workflow-steps",
        title: "Workflow steps",
        value: loading ? "Checking…" : String(manualScanWorkflow?.steps.length ?? 0),
        subtitle: "Manual scan/import workflow",
        icon: PlayCircle,
        tone: "rose" as const,
      },
    ],
    [
      automationRequests.length,
      loading,
      manualScanWorkflow?.steps.length,
      pendingVerificationCount,
      queueHealth,
    ],
  );

  const automationHero = (
    <AixiaHero
      surface="command"
      className="shrink-0 space-y-4"
      gradientTitle="AgentOps"
      title="Automation"
      subtitle="Manual-first run controls and scheduler readiness"
      parentLabel="Control Center"
      parentPath="/system/agent-ops"
      actions={
        <>
          <AixiaButton variant="secondary" onClick={() => navigate("/system/agent-ops")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Control Center
          </AixiaButton>
          <AixiaButton variant="secondary" onClick={() => navigate("/system/agent-ops/issues")}>
            <ListChecks className="mr-2 h-4 w-4" />
            Issues
          </AixiaButton>
          <AixiaButton variant="secondary" disabled={loading || submitting} onClick={() => void loadData()}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </AixiaButton>
        </>
      }
    >
      <AixiaCommandMetrics items={automationCommandMetrics} />
    </AixiaHero>
  );

  if (!loading && (!isOwner || error?.toLowerCase().includes("owner access required"))) {
    return (
      <AixiaCommandPageLayout hero={automationHero}>
        <AixiaSection
          surface="command"
          title="AgentOps Automation"
          description="Owner access required"
          icon={ShieldCheck}
        >
          <AixiaInfoBlock tone="rose" icon={ShieldCheck} title="Access restricted">
            {error ?? "Only AgentOps owner users can view this page."}
          </AixiaInfoBlock>
        </AixiaSection>
      </AixiaCommandPageLayout>
    );
  }

  return (
    <AixiaCommandPageLayout
      hero={automationHero}
      scrollLead={<AixiaCommandHubMetaStrip variant="command" items={automationMetaStripItems} />}
    >
      <div data-testid="agentops-automation">
        <AixiaSection
          surface="command"
          title="Safety boundaries"
          description="Manual-first guardrails for automation controls."
          icon={ShieldCheck}
        >
          <AixiaInfoBlock tone="gold" icon={ShieldCheck} title="Safety boundaries">
            This route records owner decisions and copies commands only. UI does not execute shell commands, does not run
            scheduler/cron, does not trigger Cursor, and does not activate Hermes/CodeGraph/local LLM runtimes.
          </AixiaInfoBlock>
        </AixiaSection>

        {feedback ? (
          <AixiaInfoBlock
            tone={feedback.tone === "success" ? "emerald" : feedback.tone === "warning" ? "gold" : "rose"}
            icon={feedback.tone === "success" ? ShieldCheck : Clock}
            title={
              feedback.tone === "success" ? "Update recorded" : feedback.tone === "warning" ? "Notice" : "Action failed"
            }
          >
            {feedback.message}
          </AixiaInfoBlock>
        ) : null}

        <AixiaAsyncState
          loading={loading}
          fallback={
            <AixiaSection
              surface="command"
              title="Automation controls"
              description="Loading queue health, workflow, and scheduler readiness."
              icon={PlayCircle}
            >
              <AixiaEmptyState
                icon={PlayCircle}
                title="Loading automation controls"
                description="Queue health, manual workflow, and scheduler preparation are being prepared."
              />
            </AixiaSection>
          }
        >
          <>
            {error && !error.toLowerCase().includes("owner access required") ? (
              <AixiaInfoBlock tone="rose" icon={ShieldCheck} title="Data issue">
                {error}
              </AixiaInfoBlock>
            ) : null}

            <AixiaSection
              surface="command"
              title="Primary manual controls"
              description="Owner-controlled actions only. No automation runtime is activated."
              icon={PlayCircle}
            >
              <div className="flex flex-wrap gap-2">
                <AixiaButton
                  variant="primary"
                  disabled={submitting || !queueHealth?.canRefillNow}
                  onClick={() => void handleRefillQueue()}
                >
                  Refill Queue
                </AixiaButton>
                <AixiaButton
                  variant="secondary"
                  disabled={submitting || !queueHealth}
                  onClick={() => void handleMarkScanNeeded()}
                >
                  Mark Scan Needed
                </AixiaButton>
                <AixiaButton
                  variant="secondary"
                  disabled={submitting || !queueHealth}
                  onClick={() => void handleQueueHealthDecision("hold")}
                >
                  Record Queue Hold
                </AixiaButton>
                <AixiaButton
                  variant="secondary"
                  disabled={submitting || !queueHealth}
                  onClick={() => void handleQueueHealthDecision("run_manual_scan")}
                >
                  Record Manual Scan Decision
                </AixiaButton>
                <AixiaButton
                  variant="secondary"
                  disabled={submitting}
                  onClick={() =>
                    void recordRequest("request_verification_pass", "Requested manual verification pass from Automation.")
                  }
                >
                  Request Verification Pass
                </AixiaButton>
                <AixiaButton
                  variant="secondary"
                  disabled={submitting}
                  onClick={() => void recordRequest("request_quiet_mode", "Requested quiet mode constraints remain active.")}
                >
                  Request Quiet Mode
                </AixiaButton>
              </div>
            </AixiaSection>

            <AixiaSection
              surface="command"
              title="Queue health & scan trigger"
              description="Active/backlog capacity with safe copy-only command guidance."
              icon={Gauge}
            >
              {!queueHealth ? (
                <AixiaEmptyState
                  icon={Gauge}
                  title="Queue health unavailable"
                  description="Refresh to retry loading queue health signals."
                />
              ) : (
                <div className="space-y-4">
                  <AixiaInfoBlock tone="cyan" icon={Gauge} title="Queue recommendation">
                    {queueHealth.explanation}
                  </AixiaInfoBlock>

                  <details className="agentops-disclosure rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <summary className="cursor-pointer text-sm font-semibold text-slate-200">
                      Show suggested copy-only commands
                    </summary>
                    <div className="mt-3 space-y-3">
                      {queueHealth.recommendedCommands.length === 0 ? (
                        <p className="text-xs text-slate-400">No suggested commands for current recommendation.</p>
                      ) : (
                        <ul className="space-y-1 text-xs text-slate-300">
                          {queueHealth.recommendedCommands.map((command) => (
                            <li key={command}>
                              <code>{command}</code>
                            </li>
                          ))}
                        </ul>
                      )}
                      {queueHealth.recommendedCommands.length > 0 ? (
                        <AixiaButton
                          variant="secondary"
                          onClick={() =>
                            void copyText(
                              queueHealth.recommendedCommands.join("\n"),
                              "Suggested commands copied. Run manually in terminal.",
                            )
                          }
                        >
                          Copy Suggested Commands
                        </AixiaButton>
                      ) : null}
                    </div>
                  </details>
                </div>
              )}
            </AixiaSection>

            <AixiaSection
              surface="command"
              title="Manual scan / import workflow"
              description="Copy-and-record workflow steps — no automatic execution."
              icon={Route}
            >
              <details className="agentops-disclosure rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <summary className="cursor-pointer text-sm font-semibold text-slate-200">
                  Manual scan / import workflow
                </summary>
                <div className="mt-4 space-y-4">
                  {!manualScanWorkflow ? (
                    <AixiaEmptyState
                      icon={Route}
                      title="Workflow unavailable"
                      description="Manual scan/import workflow snapshot is not available."
                    />
                  ) : (
                    <>
                      <AixiaInfoBlock tone="gold" icon={ShieldCheck} title="Copy and record only">
                        Workflow steps remain manual. UI records progress and copies commands only.
                      </AixiaInfoBlock>
                      <div className="rounded-xl border border-cyan-400/20 bg-cyan-500/10 px-4 py-3">
                        <p className="text-sm font-medium text-cyan-100">{manualScanWorkflow.workflowTitle}</p>
                        <p className="mt-1 text-xs text-slate-400">{manualScanWorkflow.recommendation}</p>
                      </div>
                      <div className="space-y-2">
                        {manualScanWorkflow.steps.map((step) => (
                          <div key={step.stepId} className="rounded-xl border border-white/10 bg-black/20 p-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="text-sm font-medium text-white">{step.label}</p>
                              <AixiaBadge tone={workflowStepStatusTone(step.status)}>
                                {formatWorkflowStepStatus(step.status)}
                              </AixiaBadge>
                            </div>
                            <p className="mt-1 text-xs text-slate-400">{step.description}</p>
                            {step.command ? (
                              <pre className="mt-2 overflow-x-auto rounded-lg bg-black/30 p-2 text-xs text-slate-300 whitespace-pre-wrap">
                                {step.command}
                              </pre>
                            ) : (
                              <p className="mt-2 text-xs text-amber-200/90">UI action step — no CLI command.</p>
                            )}
                            <div className="mt-3 flex flex-wrap gap-2">
                              {step.command ? (
                                <AixiaButton
                                  variant="secondary"
                                  className="text-xs px-3 py-1.5"
                                  disabled={submitting}
                                  onClick={() => void copyAndRecordStepCommand(step)}
                                >
                                  Copy Command
                                </AixiaButton>
                              ) : null}
                              <AixiaButton
                                variant="secondary"
                                className="text-xs px-3 py-1.5"
                                disabled={submitting}
                                onClick={() => void recordManualStepAction(step, "marked_running")}
                              >
                                Mark Running
                              </AixiaButton>
                              <AixiaButton
                                variant="secondary"
                                className="text-xs px-3 py-1.5"
                                disabled={submitting}
                                onClick={() => void recordManualStepAction(step, "marked_completed")}
                              >
                                Mark Completed
                              </AixiaButton>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </details>
            </AixiaSection>

            <AgentOpsAutomationRequestOperatorSurface
              schedulerPrep={schedulerPrep}
              disabled={loading || submitting}
              onRefresh={loadData}
            />

            <AixiaSection
              surface="command"
              title="Manual run tools"
              description="Copy-only command shortcuts and latest request log."
              icon={History}
            >
              <details className="agentops-disclosure rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <summary className="cursor-pointer text-sm font-semibold text-slate-200">Manual run tools</summary>
                <div className="mt-4 space-y-4">
                  <AixiaInfoBlock tone="cyan" icon={History} title="Latest request log">
                    {latestAutomationRequest ? (
                      <>
                        <p>
                          <strong>{formatAutomationRequestType(latestAutomationRequest.requestType)}</strong> ·{" "}
                          {latestAutomationRequest.status}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          {formatDateTime(latestAutomationRequest.createdAt)}
                        </p>
                        {latestAutomationRequest.note ? (
                          <p className="mt-1 text-xs text-slate-300">{latestAutomationRequest.note}</p>
                        ) : null}
                      </>
                    ) : (
                      <p>No automation request log entries yet.</p>
                    )}
                  </AixiaInfoBlock>

                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {[
                      { title: "Build", value: "npm run build", type: "copy_manual_command" as const },
                      {
                        title: "Validate Foundation",
                        value: "npm run qa:validate-foundation",
                        type: "copy_manual_command" as const,
                      },
                      {
                        title: "Static Design Guardrails",
                        value: "npm run qa:static-design-guardrails",
                        type: "copy_manual_command" as const,
                      },
                      {
                        title: "Guardrail Action Plan",
                        value: "npm run qa:guardrail-action-plan",
                        type: "copy_manual_command" as const,
                      },
                      {
                        title: "Issue Workspace Smoke",
                        value: "npm run qa:agentops-issue-workspace-smoke",
                        type: "copy_manual_command" as const,
                      },
                      {
                        title: "Fix Plan Generator Prompt",
                        value: "npm run qa:agentops-fix-plans -- --issue <ISSUE_CODE>",
                        type: "copy_cursor_prompt" as const,
                      },
                    ].map((item) => (
                      <div key={item.title} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                        <p className="text-sm font-medium text-white">{item.title}</p>
                        <p className="mt-1 text-xs font-mono text-slate-400">{item.value}</p>
                        <AixiaButton
                          variant="secondary"
                          className="mt-3 text-xs px-3 py-1.5"
                          disabled={submitting}
                          onClick={async () => {
                            const copied = await copyText(item.value, `${item.title} copied. No execution performed.`);
                            if (!copied) return;
                            await recordRequest(
                              item.type,
                              `Copied from Automation route: ${item.title}`,
                              "copied",
                              item.value,
                            );
                          }}
                        >
                          Copy Only
                        </AixiaButton>
                      </div>
                    ))}
                  </div>
                </div>
              </details>
            </AixiaSection>

            <AixiaSection
              surface="command"
              title="Quiet mode / pause / resume controls"
              description="Owner intent logging only. No automatic runtime behavior is activated."
              icon={ShieldCheck}
            >
              <div className="flex flex-wrap gap-2">
                <AixiaButton
                  variant="secondary"
                  disabled={submitting}
                  onClick={() => void recordRequest("request_quiet_mode", "Requested quiet mode from Automation route.")}
                >
                  Record Quiet Mode
                </AixiaButton>
                <AixiaButton
                  variant="secondary"
                  disabled={submitting}
                  onClick={() => void recordRequest("request_pause", "Requested pause from Automation route.")}
                >
                  Record Pause
                </AixiaButton>
                <AixiaButton
                  variant="secondary"
                  disabled={submitting}
                  onClick={() =>
                    void recordRequest(
                      "request_resume_preparation",
                      "Requested resume preparation from Automation route.",
                    )
                  }
                >
                  Record Resume Preparation
                </AixiaButton>
              </div>
            </AixiaSection>
          </>
        </AixiaAsyncState>
      </div>
    </AixiaCommandPageLayout>
  );
}
