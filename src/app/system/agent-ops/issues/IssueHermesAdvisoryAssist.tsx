import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Sparkles, X } from "lucide-react";

import { AixiaBadge, AixiaButton } from "@/components/aixia";
import {
  getAgentOpsHermesRuntimeHealth,
  requestAgentOpsHermesIssueAdvisory,
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

function formatProviderLabel(health: AgentOpsHermesRuntimeHealth | null): string {
  if (health?.provider === "doubao_ark") return "Doubao Ark";
  if (health?.provider === "ollama") return "Ollama";
  return health?.provider ?? "—";
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
  const [includeReadOnlyContext, setIncludeReadOnlyContext] = useState(true);
  const [advisoryLoading, setAdvisoryLoading] = useState(false);
  const [advisoryResult, setAdvisoryResult] = useState<AgentOpsHermesIssueAdvisoryResult | null>(
    null,
  );

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

  const handleClearAdvice = useCallback(() => {
    setAdvisoryResult(null);
  }, []);

  const contextAssemblerAvailable = health?.contextAssemblerAvailable !== false;

  return (
    <div className="aixia-issue-hermes-advisory" data-testid="issue-hermes-advisory-assist">
      <p className="aixia-issue-hermes-advisory-lead">
        Advisory only · Coordinator not active · Writes blocked · No issue status change · No
        verification · No tool execution
      </p>

      <div className="aixia-issue-hermes-advisory-actions">
        <label
          className="aixia-issue-hermes-advisory-toggle"
          data-testid="issue-hermes-include-context-toggle"
        >
          <input
            type="checkbox"
            checked={includeReadOnlyContext}
            disabled={advisoryLoading || !contextAssemblerAvailable}
            onChange={(event) => setIncludeReadOnlyContext(event.target.checked)}
          />
          <span>Include read-only AiXia context</span>
        </label>
        {!contextAssemblerAvailable ? (
          <span className="aixia-issue-hermes-advisory-hint">Context assembler unavailable</span>
        ) : null}
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
      </div>

      {!advisoryReachable && !healthLoading ? (
        <p className="aixia-issue-hermes-advisory-error" data-testid="issue-hermes-unavailable">
          Hermes advisory runtime unavailable. Refresh health or check staging gates.
        </p>
      ) : null}

      {advisoryLoading ? (
        <p className="aixia-issue-hermes-advisory-loading" data-testid="issue-hermes-loading">
          Hermes is reviewing this issue (advisory only)…
        </p>
      ) : null}

      {advisoryResult?.ok && advisoryResult.response ? (
        <div className="aixia-issue-hermes-advisory-result" data-testid="issue-hermes-advisory-result">
          <p className="aixia-issue-hermes-advisory-response">{advisoryResult.response}</p>
          <dl className="aixia-issue-hermes-advisory-meta">
            <div>
              <dt>Source</dt>
              <dd>{advisoryResult.source ?? "—"}</dd>
            </div>
            <div>
              <dt>Provider</dt>
              <dd>{formatProviderLabel(health)}</dd>
            </div>
            <div>
              <dt>Context included</dt>
              <dd>{advisoryResult.contextIncluded ? "Yes" : "No"}</dd>
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
        </div>
      ) : null}

      {advisoryResult && !advisoryResult.ok ? (
        <div
          className="aixia-issue-hermes-advisory-error-block"
          data-testid="issue-hermes-advisory-error"
        >
          <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
          <p>{advisoryResult.error ?? "Hermes advisory request failed."}</p>
        </div>
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
