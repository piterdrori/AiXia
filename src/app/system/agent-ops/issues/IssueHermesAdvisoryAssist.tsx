import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Copy, FileText, Sparkles, X } from "lucide-react";

import { AixiaBadge, AixiaButton } from "@/components/aixia";
import {
  extractImprovedCursorPromptFromHermesReview,
  getAgentOpsHermesRuntimeHealth,
  requestAgentOpsHermesIssueAdvisory,
  requestAgentOpsHermesIssueCursorPromptReview,
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

type HermesAssistWorkflow = "advisory" | "cursor_prompt_review";

function formatProviderLabel(health: AgentOpsHermesRuntimeHealth | null): string {
  if (health?.provider === "doubao_ark") return "Doubao Ark";
  if (health?.provider === "ollama") return "Ollama";
  return health?.provider ?? "—";
}

function HermesResultMeta({
  result,
  health,
}: {
  result: AgentOpsHermesIssueAdvisoryResult;
  health: AgentOpsHermesRuntimeHealth | null;
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

  const issueContext = useMemo(
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
        issueContext,
        includeContext: includeReadOnlyContext,
      });
      setAdvisoryResult(result);
    } finally {
      setAdvisoryLoading(false);
    }
  }, [issueContext, includeReadOnlyContext]);

  const handleReviewCursorPrompt = useCallback(async () => {
    setReviewLoading(true);
    setReviewResult(null);
    setCopyFeedback(null);
    try {
      const result = await requestAgentOpsHermesIssueCursorPromptReview({
        issueContext,
        includeContext: includeReadOnlyContext,
      });
      setReviewResult(result);
    } finally {
      setReviewLoading(false);
    }
  }, [issueContext, includeReadOnlyContext]);

  const handleClearAdvice = useCallback(() => {
    setAdvisoryResult(null);
  }, []);

  const handleClearReview = useCallback(() => {
    setReviewResult(null);
    setCopyFeedback(null);
  }, []);

  const improvedPromptText = useMemo(() => {
    if (!reviewResult?.ok || !reviewResult.response) return null;
    return extractImprovedCursorPromptFromHermesReview(reviewResult.response);
  }, [reviewResult]);

  const handleCopyReview = useCallback(async () => {
    if (!reviewResult?.ok || !reviewResult.response) return;
    const textToCopy = improvedPromptText ?? reviewResult.response;
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopyFeedback(improvedPromptText ? "Improved prompt copied." : "Hermes review copied.");
    } catch {
      setCopyFeedback("Copy failed — select text manually.");
    }
  }, [reviewResult, improvedPromptText]);

  const contextAssemblerAvailable = health?.contextAssemblerAvailable !== false;
  const workflowLoading = workflow === "advisory" ? advisoryLoading : reviewLoading;
  const activeResult = workflow === "advisory" ? advisoryResult : reviewResult;

  return (
    <div className="aixia-issue-hermes-advisory" data-testid="issue-hermes-advisory-assist">
      <p className="aixia-issue-hermes-advisory-lead">
        Advisory only · Coordinator not active · Writes blocked · No issue status change · No
        verification · No tool execution
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
      </div>

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
        ) : (
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
              onClick={() => void handleCopyReview()}
              disabled={reviewLoading || !reviewResult?.ok}
              data-testid="issue-hermes-copy-review-button"
            >
              <Copy className="h-4 w-4" aria-hidden />
              {improvedPromptText ? "Copy improved prompt" : "Copy Hermes review"}
            </AixiaButton>
            <AixiaButton
              variant="secondary"
              onClick={handleClearReview}
              disabled={reviewLoading || !reviewResult}
              data-testid="issue-hermes-clear-review-button"
            >
              <X className="h-4 w-4" aria-hidden />
              Clear review
            </AixiaButton>
          </>
        )}
      </div>

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
            <p className="aixia-issue-hermes-advisory-hint" data-testid="issue-hermes-improved-prompt-detected">
              Improved Cursor prompt block detected — use Copy improved prompt.
            </p>
          ) : null}
          <HermesResultMeta result={reviewResult} health={health} />
        </div>
      ) : null}

      {activeResult && !activeResult.ok ? (
        <div
          className="aixia-issue-hermes-advisory-error-block"
          data-testid={
            workflow === "advisory" ? "issue-hermes-advisory-error" : "issue-hermes-review-error"
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
