import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, ClipboardCheck, Copy, FileText, Sparkles, X } from "lucide-react";

import { AixiaBadge, AixiaButton } from "@/components/aixia";
import {
  extractImprovedCursorPromptFromHermesReview,
  getAgentOpsHermesRuntimeHealth,
  requestAgentOpsHermesIssueAdvisory,
  requestAgentOpsHermesIssueCursorPromptReview,
  requestAgentOpsHermesIssueFixReportReview,
  type AgentOpsFinding,
  type AgentOpsGeneratedFixPlan,
  type AgentOpsHermesIssueAdvisoryResult,
  type AgentOpsHermesRuntimeHealth,
} from "@/lib/agentops";

type IssueHermesAdvisoryAssistProps = {
  issueCode: string;
  finding: AgentOpsFinding;
  fixPlan: AgentOpsGeneratedFixPlan | null;
  approvedCursorPrompt: string;
  executionStateLabel: string;
};

type HermesAssistWorkflow = "advisory" | "cursor_prompt_review" | "fix_report_review";

function formatProviderLabel(health: AgentOpsHermesRuntimeHealth | null): string {
  if (health?.provider === "doubao_ark") return "Doubao Ark";
  if (health?.provider === "ollama") return "Ollama";
  return health?.provider ?? "—";
}

function HermesResultMeta({
  result,
  health,
  showStatusMutation = false,
}: {
  result: AgentOpsHermesIssueAdvisoryResult;
  health: AgentOpsHermesRuntimeHealth | null;
  showStatusMutation?: boolean;
}) {
  return (
    <dl className="aixia-issue-hermes-advisory-meta">
      <div>
        <dt>Source</dt>
        <dd>{result.source ?? "—"}</dd>
      </div>
      <div>
        <dt>Provider</dt>
        <dd>{formatProviderLabel(health)}</dd>
      </div>
      <div>
        <dt>Context included</dt>
        <dd>{result.contextIncluded ? "Yes" : "No"}</dd>
      </div>
      <div>
        <dt>Coordinator</dt>
        <dd>Not active</dd>
      </div>
      <div>
        <dt>Writes</dt>
        <dd>Blocked</dd>
      </div>
      {showStatusMutation ? (
        <div>
          <dt>Status mutation</dt>
          <dd>No</dd>
        </div>
      ) : null}
    </dl>
  );
}

export function IssueHermesAdvisoryAssist({
  issueCode,
  finding,
  fixPlan,
  approvedCursorPrompt,
  executionStateLabel,
}: IssueHermesAdvisoryAssistProps) {
  const [health, setHealth] = useState<AgentOpsHermesRuntimeHealth | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const [workflow, setWorkflow] = useState<HermesAssistWorkflow>("advisory");
  const [includeReadOnlyContext, setIncludeReadOnlyContext] = useState(true);
  const [advisoryLoading, setAdvisoryLoading] = useState(false);
  const [advisoryResult, setAdvisoryResult] = useState<AgentOpsHermesIssueAdvisoryResult | null>(
    null,
  );
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewResult, setReviewResult] = useState<AgentOpsHermesIssueAdvisoryResult | null>(null);
  const [fixReportText, setFixReportText] = useState("");
  const [fixReportLoading, setFixReportLoading] = useState(false);
  const [fixReportResult, setFixReportResult] = useState<AgentOpsHermesIssueAdvisoryResult | null>(
    null,
  );
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  const refreshHealth = useCallback(async () => {
    setHealthLoading(true);
    try {
      const next = await getAgentOpsHermesRuntimeHealth();
      setHealth(next);
    } finally {
      setHealthLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshHealth();
  }, [refreshHealth]);

  const advisoryReachable = Boolean(
    health?.transportReachable && health.mode === "advisory_transport",
  );

  const baseIssueContext = useMemo(
    () => ({
      issueCode,
      title: finding.title ?? undefined,
      module: finding.module ?? null,
      route: finding.route ?? null,
      severity: finding.severity ?? null,
      status: finding.status ?? null,
      summary: [finding.title, finding.problem].filter(Boolean).join(" — ") || undefined,
      evidence: finding.evidence_summary ?? undefined,
      proposedCursorPrompt: approvedCursorPrompt || undefined,
      likelyRootCause: finding.likely_root_cause ?? null,
      recommendedFixStrategy:
        finding.recommended_fix_strategy ?? fixPlan?.preferredFixStrategy ?? null,
      executionState: executionStateLabel,
    }),
    [issueCode, finding, fixPlan, approvedCursorPrompt, executionStateLabel],
  );

  const handleAskHermes = useCallback(async () => {
    setAdvisoryLoading(true);
    setAdvisoryResult(null);
    try {
      const result = await requestAgentOpsHermesIssueAdvisory({
        issueContext: baseIssueContext,
        includeContext: includeReadOnlyContext,
      });
      setAdvisoryResult(result);
    } finally {
      setAdvisoryLoading(false);
    }
  }, [baseIssueContext, includeReadOnlyContext]);

  const handleReviewCursorPrompt = useCallback(async () => {
    setReviewLoading(true);
    setReviewResult(null);
    setCopyFeedback(null);
    try {
      const result = await requestAgentOpsHermesIssueCursorPromptReview({
        issueContext: baseIssueContext,
        includeContext: includeReadOnlyContext,
      });
      setReviewResult(result);
    } finally {
      setReviewLoading(false);
    }
  }, [baseIssueContext, includeReadOnlyContext]);

  const handleReviewFixReport = useCallback(async () => {
    setFixReportLoading(true);
    setFixReportResult(null);
    setCopyFeedback(null);
    try {
      const result = await requestAgentOpsHermesIssueFixReportReview({
        issueContext: { ...baseIssueContext, fixReport: fixReportText },
        includeContext: includeReadOnlyContext,
      });
      setFixReportResult(result);
    } finally {
      setFixReportLoading(false);
    }
  }, [baseIssueContext, fixReportText, includeReadOnlyContext]);

  const handleClearAdvice = useCallback(() => {
    setAdvisoryResult(null);
  }, []);

  const handleClearPromptReview = useCallback(() => {
    setReviewResult(null);
    setCopyFeedback(null);
  }, []);

  const handleClearFixReportReview = useCallback(() => {
    setFixReportResult(null);
    setCopyFeedback(null);
  }, []);

  const improvedPromptText = useMemo(() => {
    if (!reviewResult?.ok || !reviewResult.response) return null;
    return extractImprovedCursorPromptFromHermesReview(reviewResult.response);
  }, [reviewResult]);

  const handleCopyPromptReview = useCallback(async () => {
    if (!reviewResult?.ok || !reviewResult.response) return;
    const textToCopy = improvedPromptText ?? reviewResult.response;
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopyFeedback(improvedPromptText ? "Improved prompt copied." : "Hermes review copied.");
    } catch {
      setCopyFeedback("Copy failed — select text manually.");
    }
  }, [reviewResult, improvedPromptText]);

  const handleCopyFixReportRecommendation = useCallback(async () => {
    if (!fixReportResult?.ok || !fixReportResult.response) return;
    try {
      await navigator.clipboard.writeText(fixReportResult.response);
      setCopyFeedback("Verification recommendation copied.");
    } catch {
      setCopyFeedback("Copy failed — select text manually.");
    }
  }, [fixReportResult]);

  const contextAssemblerAvailable = health?.contextAssemblerAvailable !== false;
  const workflowLoading =
    workflow === "advisory"
      ? advisoryLoading
      : workflow === "cursor_prompt_review"
        ? reviewLoading
        : fixReportLoading;
  const activeResult =
    workflow === "advisory"
      ? advisoryResult
      : workflow === "cursor_prompt_review"
        ? reviewResult
        : fixReportResult;
  const hasFixReportText = fixReportText.trim().length > 0;

  return (
    <div className="aixia-issue-hermes-advisory" data-testid="issue-hermes-advisory-assist">
      <p className="aixia-issue-hermes-advisory-lead">
        Advisory only · Coordinator not active · Writes blocked · No issue status change · No
        verification · No tool execution
        {workflow === "fix_report_review" ? " · Recommendation only" : ""}
      </p>

      <div
        className="aixia-issue-hermes-advisory-tabs"
        role="tablist"
        aria-label="Hermes assist workflows"
      >
        <button
          type="button"
          role="tab"
          aria-selected={workflow === "advisory"}
          className={`aixia-issue-hermes-advisory-tab${workflow === "advisory" ? " is-active" : ""}`}
          disabled={workflowLoading}
          onClick={() => setWorkflow("advisory")}
          data-testid="issue-hermes-tab-advisory"
        >
          <Sparkles className="h-3.5 w-3.5" aria-hidden />
          Ask Hermes
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={workflow === "cursor_prompt_review"}
          className={`aixia-issue-hermes-advisory-tab${workflow === "cursor_prompt_review" ? " is-active" : ""}`}
          disabled={workflowLoading}
          onClick={() => setWorkflow("cursor_prompt_review")}
          data-testid="issue-hermes-tab-cursor-review"
        >
          <FileText className="h-3.5 w-3.5" aria-hidden />
          Cursor Prompt Review
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={workflow === "fix_report_review"}
          className={`aixia-issue-hermes-advisory-tab${workflow === "fix_report_review" ? " is-active" : ""}`}
          disabled={workflowLoading}
          onClick={() => setWorkflow("fix_report_review")}
          data-testid="issue-hermes-tab-fix-report-review"
        >
          <ClipboardCheck className="h-3.5 w-3.5" aria-hidden />
          Fix Report Review
        </button>
      </div>

      {workflow === "fix_report_review" ? (
        <label className="aixia-issue-hermes-advisory-report-field">
          <span>Paste Cursor / build / QA report</span>
          <textarea
            className="aixia-issue-hermes-advisory-report-input"
            value={fixReportText}
            disabled={fixReportLoading}
            placeholder="Paste Cursor report, build output, or QA notes here…"
            rows={5}
            onChange={(event) => setFixReportText(event.target.value)}
            data-testid="issue-hermes-fix-report-input"
          />
        </label>
      ) : null}

      <div className="aixia-issue-hermes-advisory-actions">
        <label
          className="aixia-issue-hermes-advisory-toggle"
          data-testid="issue-hermes-include-context-toggle"
        >
          <input
            type="checkbox"
            checked={includeReadOnlyContext}
            disabled={workflowLoading || !contextAssemblerAvailable}
            onChange={(event) => setIncludeReadOnlyContext(event.target.checked)}
          />
          <span>Include read-only AiXia context</span>
        </label>
        {!contextAssemblerAvailable ? (
          <span className="aixia-issue-hermes-advisory-hint">Context assembler unavailable</span>
        ) : null}

        {workflow === "advisory" ? (
          <>
            <AixiaButton
              variant="secondary"
              onClick={() => void handleAskHermes()}
              disabled={advisoryLoading || !advisoryReachable}
              data-testid="issue-hermes-ask-button"
            >
              <Sparkles className={`h-4 w-4 ${advisoryLoading ? "animate-pulse" : ""}`} aria-hidden />
              Ask Hermes
            </AixiaButton>
            <AixiaButton
              variant="secondary"
              onClick={handleClearAdvice}
              disabled={advisoryLoading || !advisoryResult}
              data-testid="issue-hermes-clear-button"
            >
              <X className="h-4 w-4" aria-hidden />
              Clear Hermes advice
            </AixiaButton>
          </>
        ) : null}

        {workflow === "cursor_prompt_review" ? (
          <>
            <AixiaButton
              variant="secondary"
              onClick={() => void handleReviewCursorPrompt()}
              disabled={reviewLoading || !advisoryReachable}
              data-testid="issue-hermes-review-prompt-button"
            >
              <FileText className={`h-4 w-4 ${reviewLoading ? "animate-pulse" : ""}`} aria-hidden />
              Review Cursor prompt
            </AixiaButton>
            <AixiaButton
              variant="secondary"
              onClick={() => void handleCopyPromptReview()}
              disabled={reviewLoading || !reviewResult?.ok}
              data-testid="issue-hermes-copy-review-button"
            >
              <Copy className="h-4 w-4" aria-hidden />
              {improvedPromptText ? "Copy improved prompt" : "Copy Hermes review"}
            </AixiaButton>
            <AixiaButton
              variant="secondary"
              onClick={handleClearPromptReview}
              disabled={reviewLoading || !reviewResult}
              data-testid="issue-hermes-clear-review-button"
            >
              <X className="h-4 w-4" aria-hidden />
              Clear review
            </AixiaButton>
          </>
        ) : null}

        {workflow === "fix_report_review" ? (
          <>
            <AixiaButton
              variant="secondary"
              onClick={() => void handleReviewFixReport()}
              disabled={fixReportLoading || !advisoryReachable || !hasFixReportText}
              data-testid="issue-hermes-review-fix-report-button"
            >
              <ClipboardCheck
                className={`h-4 w-4 ${fixReportLoading ? "animate-pulse" : ""}`}
                aria-hidden
              />
              Review fix report
            </AixiaButton>
            <AixiaButton
              variant="secondary"
              onClick={() => void handleCopyFixReportRecommendation()}
              disabled={fixReportLoading || !fixReportResult?.ok}
              data-testid="issue-hermes-copy-fix-report-button"
            >
              <Copy className="h-4 w-4" aria-hidden />
              Copy verification recommendation
            </AixiaButton>
            <AixiaButton
              variant="secondary"
              onClick={handleClearFixReportReview}
              disabled={fixReportLoading || !fixReportResult}
              data-testid="issue-hermes-clear-fix-report-button"
            >
              <X className="h-4 w-4" aria-hidden />
              Clear review
            </AixiaButton>
          </>
        ) : null}
      </div>

      {workflow === "fix_report_review" && !hasFixReportText ? (
        <p className="aixia-issue-hermes-advisory-hint" data-testid="issue-hermes-fix-report-empty-hint">
          Paste a report first.
        </p>
      ) : null}

      {workflow === "fix_report_review" ? (
        <p className="aixia-issue-hermes-advisory-hint">
          Recommendation only — no issue status changes are made.
        </p>
      ) : null}

      {!advisoryReachable && !healthLoading ? (
        <p className="aixia-issue-hermes-advisory-error" data-testid="issue-hermes-unavailable">
          Hermes advisory runtime unavailable. Refresh health or check staging gates.
        </p>
      ) : null}

      {workflow === "advisory" && advisoryLoading ? (
        <p className="aixia-issue-hermes-advisory-loading" data-testid="issue-hermes-loading">
          Hermes is reviewing this issue (advisory only)…
        </p>
      ) : null}

      {workflow === "cursor_prompt_review" && reviewLoading ? (
        <p className="aixia-issue-hermes-advisory-loading" data-testid="issue-hermes-review-loading">
          Hermes is reviewing the Cursor prompt (advisory only)…
        </p>
      ) : null}

      {workflow === "fix_report_review" && fixReportLoading ? (
        <p
          className="aixia-issue-hermes-advisory-loading"
          data-testid="issue-hermes-fix-report-loading"
        >
          Hermes is reviewing the fix report (advisory only)…
        </p>
      ) : null}

      {workflow === "advisory" && advisoryResult?.ok && advisoryResult.response ? (
        <div className="aixia-issue-hermes-advisory-result" data-testid="issue-hermes-advisory-result">
          <p className="aixia-issue-hermes-advisory-response">{advisoryResult.response}</p>
          <HermesResultMeta result={advisoryResult} health={health} />
        </div>
      ) : null}

      {workflow === "cursor_prompt_review" && reviewResult?.ok && reviewResult.response ? (
        <div
          className="aixia-issue-hermes-advisory-result"
          data-testid="issue-hermes-cursor-review-result"
        >
          <p className="aixia-issue-hermes-advisory-response">{reviewResult.response}</p>
          {improvedPromptText ? (
            <p
              className="aixia-issue-hermes-advisory-hint"
              data-testid="issue-hermes-improved-prompt-detected"
            >
              Improved Cursor prompt block detected — use Copy improved prompt.
            </p>
          ) : null}
          <HermesResultMeta result={reviewResult} health={health} />
        </div>
      ) : null}

      {workflow === "fix_report_review" && fixReportResult?.ok && fixReportResult.response ? (
        <div
          className="aixia-issue-hermes-advisory-result"
          data-testid="issue-hermes-fix-report-review-result"
        >
          <p className="aixia-issue-hermes-advisory-response">{fixReportResult.response}</p>
          <HermesResultMeta result={fixReportResult} health={health} showStatusMutation />
        </div>
      ) : null}

      {activeResult && !activeResult.ok ? (
        <div
          className="aixia-issue-hermes-advisory-error-block"
          data-testid={
            workflow === "advisory"
              ? "issue-hermes-advisory-error"
              : workflow === "cursor_prompt_review"
                ? "issue-hermes-review-error"
                : "issue-hermes-fix-report-error"
          }
        >
          <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
          <p>{activeResult.error ?? "Hermes request failed."}</p>
        </div>
      ) : null}

      {copyFeedback ? (
        <p className="aixia-issue-hermes-advisory-copy-feedback" data-testid="issue-hermes-copy-feedback">
          {copyFeedback}
        </p>
      ) : null}

      <div className="aixia-issue-hermes-advisory-badges">
        <AixiaBadge tone="amber">Advisory only</AixiaBadge>
        <AixiaBadge tone="neutral">Coordinator not active</AixiaBadge>
        <AixiaBadge tone="rose">Writes blocked</AixiaBadge>
        <AixiaBadge tone={advisoryReachable ? "emerald" : "rose"}>
          {advisoryReachable ? "Runtime reachable" : "Runtime unavailable"}
        </AixiaBadge>
      </div>
    </div>
  );
}
