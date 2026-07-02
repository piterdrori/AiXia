import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, ClipboardCheck, Copy, FileText, GitBranch, Save, Sparkles, X } from "lucide-react";

import { AixiaBadge, AixiaButton } from "@/components/aixia";
import { HermesAdvisoryAuthorityBanner } from "@/components/agentops/AcdlAuthorityLabel";
import { UslDisplayText } from "@/components/agentops/UslDisplayText";
import { normalizeDisplayString } from "@/lib/agentops/usl";
import {
  buildHermesRecommendationResponsePreview,
  extractHermesRecommendationVerdict,
  extractImprovedCursorPromptFromHermesReview,
  formatHermesRecommendationAdvisoryTypeLabel,
  getAgentOpsHermesRecommendationArtifacts,
  getAgentOpsHermesRuntimeHealth,
  recordAgentOpsHermesRecommendationArtifact,
  requestAgentOpsHermesIssueAdvisory,
  requestAgentOpsHermesIssueCursorPromptReview,
  requestAgentOpsHermesIssueFixReportReview,
  type AgentOpsFinding,
  type AgentOpsGeneratedFixPlan,
  type AgentOpsHermesIssueAdvisoryResult,
  type AgentOpsHermesRecommendationArtifactRecord,
  type AgentOpsHermesRecommendationAdvisoryType,
  type AgentOpsHermesRecommendationWorkflowSource,
  type AgentOpsHermesRuntimeHealth,
} from "@/lib/agentops";
import {
  IssueHermesPromptCoordinatorPanel,
  type IssueHermesPromptWorkflowSource,
} from "./IssueHermesPromptCoordinatorPanel";
import { IssueHermesVerificationReviewerPanel } from "./IssueHermesVerificationReviewerPanel";

const HERMES_LABEL_WRITE_PROTECTED = "Write Protected";
const HERMES_LABEL_READ_ONLY_ACTIVE = "Read-Only Active";
const HERMES_LABEL_MANUAL_HANDOFF = "Manual Handoff Active";

type IssueHermesAdvisoryAssistProps = {
  issueCode: string;
  finding: AgentOpsFinding;
  fixPlan: AgentOpsGeneratedFixPlan | null;
  approvedCursorPrompt: string;
  executionStateLabel: string;
};

type HermesAssistWorkflow =
  | "advisory"
  | "cursor_prompt_review"
  | "fix_report_review"
  | "prompt_drafts";

function workflowArtifactMeta(workflow: HermesAssistWorkflow): {
  advisoryType: AgentOpsHermesRecommendationAdvisoryType;
  workflowSource: AgentOpsHermesRecommendationWorkflowSource;
} {
  switch (workflow) {
    case "cursor_prompt_review":
      return { advisoryType: "cursor_prompt_review", workflowSource: "workflow_2" };
    case "fix_report_review":
      return { advisoryType: "fix_report_review", workflowSource: "workflow_3" };
    case "prompt_drafts":
      return { advisoryType: "issue_advisory", workflowSource: "workflow_1" };
    default:
      return { advisoryType: "issue_advisory", workflowSource: "workflow_1" };
  }
}

function buildRecommendationSaveKey(
  workflow: HermesAssistWorkflow,
  result: AgentOpsHermesIssueAdvisoryResult,
): string {
  return `${workflow}:${result.checkedAt}:${result.response?.slice(0, 96) ?? ""}`;
}

function formatProviderLabel(health: AgentOpsHermesRuntimeHealth | null): string {
  if (health?.provider === "doubao_ark") return "Doubao Ark";
  return health?.provider ?? "Doubao Ark";
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
        <dd>Advisory transport</dd>
      </div>
      <div>
        <dt>Writes</dt>
        <dd>{HERMES_LABEL_WRITE_PROTECTED}</dd>
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
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedArtifactKeys, setSavedArtifactKeys] = useState<Record<string, true>>({});
  const [savedArtifacts, setSavedArtifacts] = useState<AgentOpsHermesRecommendationArtifactRecord[]>(
    [],
  );
  const [savedArtifactsLoading, setSavedArtifactsLoading] = useState(false);
  const [savedArtifactsError, setSavedArtifactsError] = useState<string | null>(null);
  const [expandedArtifactId, setExpandedArtifactId] = useState<string | null>(null);
  const [promptDraftWorkflowSource, setPromptDraftWorkflowSource] =
    useState<IssueHermesPromptWorkflowSource>("prompt_drafts");
  const [promptAutoGenerateToken, setPromptAutoGenerateToken] = useState(0);

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

  const loadSavedArtifacts = useCallback(async () => {
    setSavedArtifactsLoading(true);
    setSavedArtifactsError(null);
    try {
      const result = await getAgentOpsHermesRecommendationArtifacts(issueCode);
      if (result.error) {
        setSavedArtifactsError(result.error);
        return;
      }
      setSavedArtifacts(result.data ?? []);
    } finally {
      setSavedArtifactsLoading(false);
    }
  }, [issueCode]);

  useEffect(() => {
    void loadSavedArtifacts();
  }, [loadSavedArtifacts]);

  const openPromptDrafts = useCallback((source: IssueHermesPromptWorkflowSource) => {
    setPromptDraftWorkflowSource(source);
    setWorkflow("prompt_drafts");
    setPromptAutoGenerateToken((current) => current + 1);
  }, []);

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
    setSaveFeedback(null);
    setSaveError(null);
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
    setSaveFeedback(null);
    setSaveError(null);
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
    setSaveFeedback(null);
    setSaveError(null);
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
      setCopyFeedback("Verification advisory note copied.");
    } catch {
      setCopyFeedback("Copy failed — select text manually.");
    }
  }, [fixReportResult]);

  const buildRequestTextForWorkflow = useCallback(
    (targetWorkflow: HermesAssistWorkflow): string => {
      switch (targetWorkflow) {
        case "cursor_prompt_review":
          return [
            `Cursor prompt review for ${issueCode}`,
            approvedCursorPrompt
              ? `Proposed prompt:\n${approvedCursorPrompt}`
              : "No proposed Cursor prompt supplied.",
          ].join("\n\n");
        case "fix_report_review":
          return fixReportText.trim()
            ? `Fix report review for ${issueCode}\n\n${fixReportText.trim()}`
            : `Fix report review for ${issueCode}`;
        default:
          return `Issue advisory review for ${issueCode}`;
      }
    },
    [issueCode, approvedCursorPrompt, fixReportText],
  );

  const handleSaveRecommendation = useCallback(async () => {
    const recommendationResult =
      workflow === "advisory"
        ? advisoryResult
        : workflow === "cursor_prompt_review"
          ? reviewResult
          : fixReportResult;
    if (!recommendationResult?.ok || !recommendationResult.response) return;

    const saveKey = buildRecommendationSaveKey(workflow, recommendationResult);
    if (savedArtifactKeys[saveKey]) return;

    const { advisoryType, workflowSource } = workflowArtifactMeta(workflow);
    setSaveLoading(true);
    setSaveFeedback(null);
    setSaveError(null);

    try {
      const saveResult = await recordAgentOpsHermesRecommendationArtifact({
        issueCode,
        findingId: finding.id,
        advisoryType,
        workflowSource,
        requestText: buildRequestTextForWorkflow(workflow),
        responseText: recommendationResult.response,
        verdict:
          workflow === "fix_report_review"
            ? extractHermesRecommendationVerdict(recommendationResult.response)
            : null,
        contextIncluded: recommendationResult.contextIncluded === true,
        provider: formatProviderLabel(health),
        source: recommendationResult.source ?? null,
        safetyFlags: recommendationResult.safetyFlags ?? [],
        responseCheckedAt: recommendationResult.checkedAt,
      });

      if (saveResult.error || !saveResult.data) {
        setSaveError(saveResult.error ?? "Could not save Hermes suggested text draft.");
        return;
      }

      setSavedArtifactKeys((current) => ({ ...current, [saveKey]: true }));
      setSaveFeedback(saveResult.data.message);
      await loadSavedArtifacts();
    } finally {
      setSaveLoading(false);
    }
  }, [
    workflow,
    advisoryResult,
    reviewResult,
    fixReportResult,
    savedArtifactKeys,
    issueCode,
    finding.id,
    buildRequestTextForWorkflow,
    health,
    loadSavedArtifacts,
  ]);

  const contextAssemblerAvailable = health?.contextAssemblerAvailable !== false;
  const workflowLoading =
    workflow === "prompt_drafts"
      ? false
      : workflow === "advisory"
        ? advisoryLoading
        : workflow === "cursor_prompt_review"
          ? reviewLoading
          : fixReportLoading;
  const activeResult =
    workflow === "prompt_drafts"
      ? null
      : workflow === "advisory"
        ? advisoryResult
        : workflow === "cursor_prompt_review"
          ? reviewResult
          : fixReportResult;
  const hasFixReportText = fixReportText.trim().length > 0;
  const currentSaveKey =
    activeResult?.ok && activeResult.response
      ? buildRecommendationSaveKey(workflow, activeResult)
      : null;
  const currentResponseAlreadySaved = Boolean(
    currentSaveKey && savedArtifactKeys[currentSaveKey],
  );
  const canSaveCurrentRecommendation = Boolean(
    activeResult?.ok && activeResult.response && !currentResponseAlreadySaved,
  );

  return (
    <div className="aixia-issue-hermes-advisory" data-testid="issue-hermes-advisory-assist">
      <HermesAdvisoryAuthorityBanner />
      <p className="aixia-issue-hermes-advisory-lead mt-3">
        {workflow === "prompt_drafts"
          ? `${HERMES_LABEL_READ_ONLY_ACTIVE} · ${HERMES_LABEL_WRITE_PROTECTED} · ${HERMES_LABEL_MANUAL_HANDOFF} · Stage C3 prompt drafts · No auto-dispatch`
          : `Advisory transport · ${HERMES_LABEL_WRITE_PROTECTED} · No issue status change · No verification · No automatic tool runs${workflow === "fix_report_review" ? " · Suggested text draft only" : ""}`}
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
        <button
          type="button"
          role="tab"
          aria-selected={workflow === "prompt_drafts"}
          className={`aixia-issue-hermes-advisory-tab${workflow === "prompt_drafts" ? " is-active" : ""}`}
          disabled={workflowLoading}
          onClick={() => {
            setPromptDraftWorkflowSource("prompt_drafts");
            setWorkflow("prompt_drafts");
          }}
          data-testid="issue-hermes-tab-prompt-drafts"
        >
          <GitBranch className="h-3.5 w-3.5" aria-hidden />
          Prompt Drafts
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
        {workflow !== "prompt_drafts" ? (
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
        ) : null}
        {!contextAssemblerAvailable && workflow !== "prompt_drafts" ? (
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
              onClick={() => openPromptDrafts("workflow_1")}
              data-testid="issue-hermes-w1-generate-prompt"
            >
              <GitBranch className="h-4 w-4" aria-hidden />
              Generate Hermes Prompt
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
              onClick={() => openPromptDrafts("workflow_2")}
              data-testid="issue-hermes-w2-generate-prompt"
            >
              <GitBranch className="h-4 w-4" aria-hidden />
              Generate Hermes Prompt
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
              onClick={() => openPromptDrafts("workflow_3")}
              disabled={!hasFixReportText}
              data-testid="issue-hermes-w3-generate-prompt"
            >
              <GitBranch className="h-4 w-4" aria-hidden />
              Generate Hermes Prompt
            </AixiaButton>
            <AixiaButton
              variant="secondary"
              onClick={() => void handleCopyFixReportRecommendation()}
              disabled={fixReportLoading || !fixReportResult?.ok}
              data-testid="issue-hermes-copy-fix-report-button"
            >
              <Copy className="h-4 w-4" aria-hidden />
              Copy verification advisory note
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

        {activeResult?.ok && activeResult.response && workflow !== "prompt_drafts" ? (
          <AixiaButton
            variant="secondary"
            onClick={() => void handleSaveRecommendation()}
            disabled={saveLoading || workflowLoading || !canSaveCurrentRecommendation}
            data-testid="issue-hermes-save-recommendation-button"
          >
            <Save className={`h-4 w-4 ${saveLoading ? "animate-pulse" : ""}`} aria-hidden />
            {currentResponseAlreadySaved ? "Saved" : "Save suggested text draft"}
          </AixiaButton>
        ) : null}
      </div>

      {workflow === "fix_report_review" && !hasFixReportText ? (
        <p className="aixia-issue-hermes-advisory-hint" data-testid="issue-hermes-fix-report-empty-hint">
          Paste a report first.
        </p>
      ) : null}

      {workflow === "fix_report_review" ? (
        <p className="aixia-issue-hermes-advisory-hint">
          Suggested text draft only — no issue status changes are made.
        </p>
      ) : null}

      {!advisoryReachable && !healthLoading && workflow !== "prompt_drafts" ? (
        <p className="aixia-issue-hermes-advisory-error" data-testid="issue-hermes-unavailable">
          Hermes advisory runtime unavailable. Refresh health or check staging gates.
        </p>
      ) : null}

      {workflow === "fix_report_review" ? (
        <IssueHermesVerificationReviewerPanel
          issueCode={issueCode}
          finding={finding}
          fixPlan={fixPlan}
          approvedCursorPrompt={approvedCursorPrompt}
          executionStateLabel={executionStateLabel}
          pastedCursorReport={fixReportText}
        />
      ) : null}

      {workflow === "prompt_drafts" ? (
        <IssueHermesPromptCoordinatorPanel
          issueCode={issueCode}
          finding={finding}
          fixPlan={fixPlan}
          approvedCursorPrompt={approvedCursorPrompt}
          executionStateLabel={executionStateLabel}
          workflowSource={promptDraftWorkflowSource}
          pastedCursorReport={fixReportText}
          autoGenerateToken={promptAutoGenerateToken}
        />
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
          <p className="aixia-issue-hermes-advisory-response">
            <UslDisplayText as="span">{advisoryResult.response}</UslDisplayText>
          </p>
          <HermesResultMeta result={advisoryResult} health={health} />
        </div>
      ) : null}

      {workflow === "cursor_prompt_review" && reviewResult?.ok && reviewResult.response ? (
        <div
          className="aixia-issue-hermes-advisory-result"
          data-testid="issue-hermes-cursor-review-result"
        >
          <p className="aixia-issue-hermes-advisory-response">
            <UslDisplayText as="span">{reviewResult.response}</UslDisplayText>
          </p>
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
          <p className="aixia-issue-hermes-advisory-response">
            <UslDisplayText as="span">{fixReportResult.response}</UslDisplayText>
          </p>
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

      {saveFeedback ? (
        <p
          className="aixia-issue-hermes-advisory-copy-feedback"
          data-testid="issue-hermes-save-feedback"
        >
          {saveFeedback}
        </p>
      ) : null}

      {saveError ? (
        <div
          className="aixia-issue-hermes-advisory-error-block"
          data-testid="issue-hermes-save-error"
        >
          <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
          <p>{saveError}</p>
        </div>
      ) : null}

      <details
        className="aixia-issue-hermes-advisory-saved-history"
        data-testid="issue-hermes-saved-artifacts"
      >
        <summary>
          Saved Hermes suggested text drafts
          {savedArtifacts.length > 0 ? ` (${savedArtifacts.length})` : ""}
        </summary>
        <p className="aixia-issue-hermes-advisory-saved-history-lead">
          Advisory artifact only · No issue status change · No memory write · No SOT write · No automatic tool runs
        </p>
        {savedArtifactsLoading ? (
          <p className="aixia-issue-hermes-advisory-hint">Loading saved suggested text drafts…</p>
        ) : null}
        {savedArtifactsError ? (
          <p className="aixia-issue-hermes-advisory-hint" data-testid="issue-hermes-saved-error">
            Saved suggested text drafts unavailable: {savedArtifactsError}
          </p>
        ) : null}
        {!savedArtifactsLoading && !savedArtifactsError && savedArtifacts.length === 0 ? (
          <p className="aixia-issue-hermes-advisory-hint">No saved suggested text drafts for this issue yet.</p>
        ) : null}
        {!savedArtifactsLoading && savedArtifacts.length > 0 ? (
          <ul className="aixia-issue-hermes-advisory-saved-history-list">
            {savedArtifacts.map((artifact) => {
              const isExpanded = expandedArtifactId === artifact.id;
              return (
                <li key={artifact.id} className="aixia-issue-hermes-advisory-saved-history-item">
                  <div className="aixia-issue-hermes-advisory-saved-history-item-head">
                    <span className="aixia-issue-hermes-advisory-saved-history-type">
                      {formatHermesRecommendationAdvisoryTypeLabel(artifact.advisoryType)}
                    </span>
                    <span className="aixia-issue-hermes-advisory-saved-history-date">
                      {new Date(artifact.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <dl className="aixia-issue-hermes-advisory-saved-history-meta">
                    <div>
                      <dt>Source</dt>
                      <dd>{artifact.source ?? "—"}</dd>
                    </div>
                    <div>
                      <dt>Provider</dt>
                      <dd>{artifact.provider ?? "—"}</dd>
                    </div>
                    <div>
                      <dt>Context</dt>
                      <dd>{artifact.contextIncluded ? "Yes" : "No"}</dd>
                    </div>
                    {artifact.verdict ? (
                      <div>
                        <dt>Advisory note (draft)</dt>
                        <dd>{normalizeDisplayString(artifact.verdict)}</dd>
                      </div>
                    ) : null}
                  </dl>
                  <p className="aixia-issue-hermes-advisory-saved-history-preview">
                    {normalizeDisplayString(buildHermesRecommendationResponsePreview(artifact.responseText))}
                  </p>
                  <AixiaButton
                    variant="secondary"
                    onClick={() =>
                      setExpandedArtifactId(isExpanded ? null : artifact.id)
                    }
                    data-testid={`issue-hermes-saved-expand-${artifact.id}`}
                  >
                    {isExpanded ? "Hide full text" : "View full text"}
                  </AixiaButton>
                  {isExpanded ? (
                    <p className="aixia-issue-hermes-advisory-saved-history-full">
                      {normalizeDisplayString(artifact.responseText)}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : null}
      </details>

      <div className="aixia-issue-hermes-advisory-badges">
        {workflow === "prompt_drafts" ? (
          <>
            <AixiaBadge tone="cyan">{HERMES_LABEL_READ_ONLY_ACTIVE}</AixiaBadge>
            <AixiaBadge tone="violet">{HERMES_LABEL_WRITE_PROTECTED}</AixiaBadge>
            <AixiaBadge tone="amber">{HERMES_LABEL_MANUAL_HANDOFF}</AixiaBadge>
          </>
        ) : (
          <>
            <AixiaBadge tone="amber">Advisory only</AixiaBadge>
            <AixiaBadge tone="violet">{HERMES_LABEL_WRITE_PROTECTED}</AixiaBadge>
            <AixiaBadge tone={advisoryReachable ? "emerald" : "rose"}>
              {advisoryReachable ? "Runtime reachable" : "Runtime unavailable"}
            </AixiaBadge>
          </>
        )}
      </div>
    </div>
  );
}
