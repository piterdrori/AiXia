import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, RefreshCw } from "lucide-react";

import { AixiaBadge, AixiaButton } from "@/components/aixia";
import {
  AgentOpsAdvancedDisclosure,
  AgentOpsEmptyState,
  AgentOpsOwnerPageShell,
  AgentOpsPageHeader,
  getAgentOwnerMeta,
  type FindingType,
} from "@/components/agentops/owner";
import { usePageTitle } from "@/hooks/usePageTitle";
import {
  deferAgentOpsFinding,
  getAgentOpsActiveTop10,
  getAgentOpsBacklogSummary,
  getAgentOpsFindingDetail,
  getAgentOpsOwnerStatus,
  markAgentOpsFalsePositive,
  markAgentOpsInProgress,
  type AgentOpsFinding,
  type AgentOpsFindingDetail,
  type AgentOpsOwnerFeedback,
} from "@/lib/agentops";

function OwnerSection({
  title,
  id,
  children,
}: {
  title: string;
  id: string;
  children: ReactNode;
}) {
  return (
    <section
      aria-labelledby={id}
      className="rounded-xl border border-white/10 bg-white/[0.03] p-5"
    >
      <h2 id={id} className="text-lg font-semibold text-white">
        {title}
      </h2>
      <div className="mt-4 space-y-3">{children}</div>
    </section>
  );
}

function decodeIssueCode(value: string | undefined): string {
  if (!value) return "";
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function findingType(finding: AgentOpsFinding): FindingType {
  const category = finding.category.toLowerCase();
  if (category.includes("improvement")) return "improvement";
  if (category.includes("feature")) return "feature";
  return "error";
}

function typeLabel(type: FindingType): string {
  if (type === "improvement") return "Improvement";
  if (type === "feature") return "New feature";
  return "Error";
}

function typeTone(type: FindingType): "rose" | "amber" | "cyan" {
  if (type === "error") return "rose";
  if (type === "improvement") return "amber";
  return "cyan";
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
}

function ownerStatusLabel(status: string): string {
  return status
    .replace("Active Top 10", "Active issue")
    .replace("Owner Reviewed", "Reviewed")
    .replace("False Positive", "Rejected");
}

function feedbackLabel(feedback: AgentOpsOwnerFeedback): string {
  const type = feedback.feedback_type.replaceAll("_", " ");
  if (feedback.feedback_type === "false_positive") return "Rejected";
  if (feedback.feedback_type === "defer") return "Deferred";
  return type.charAt(0).toUpperCase() + type.slice(1);
}

function impactSummary(finding: AgentOpsFinding): string {
  const parts = [
    finding.saas_impact,
    finding.ai_mcp_impact,
    finding.personal_ai_impact,
    finding.hr_impact,
    finding.security_impact,
  ].filter(Boolean);
  if (parts.length > 0) return parts.join(" ");
  return finding.problem || "This finding may affect staging quality or owner workflows.";
}

function canDefer(status: string): boolean {
  return !["Deferred", "Archived", "False Positive", "Rejected", "Verified Fixed"].includes(status);
}

function canReject(status: string): boolean {
  return !["False Positive", "Rejected", "Archived", "Verified Fixed"].includes(status);
}

function canStartWork(status: string): boolean {
  return ["New", "Backlog", "Active Top 10", "Owner Reviewed", "Approved for Fix"].includes(status);
}

export default function AgentOpsFindingDetailPage() {
  const params = useParams<{ issueCode: string }>();
  const navigate = useNavigate();
  const issueCode = decodeIssueCode(params.issueCode);

  usePageTitle(issueCode ? `Finding ${issueCode}` : "Finding");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [finding, setFinding] = useState<AgentOpsFinding | null>(null);
  const [detail, setDetail] = useState<AgentOpsFindingDetail | null>(null);

  const loadFinding = useCallback(async () => {
    if (!issueCode) {
      setError("Missing finding code.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    setFeedback(null);

    const ownerResult = await getAgentOpsOwnerStatus();
    if (ownerResult.error || !ownerResult.data?.isOwner) {
      setError(ownerResult.error ?? "AgentOps owner access required.");
      setLoading(false);
      return;
    }

    const [activeResult, backlogResult] = await Promise.all([
      getAgentOpsActiveTop10(),
      getAgentOpsBacklogSummary(),
    ]);

    if (activeResult.error || backlogResult.error) {
      setError(activeResult.error ?? backlogResult.error ?? "Could not load finding.");
      setLoading(false);
      return;
    }

    const selected =
      (activeResult.data ?? []).find((item) => item.issue_code === issueCode) ??
      (backlogResult.data?.preview ?? []).find((item) => item.issue_code === issueCode) ??
      null;

    if (!selected?.id) {
      setFinding(null);
      setDetail(null);
      setLoading(false);
      return;
    }

    const detailResult = await getAgentOpsFindingDetail(selected.id);
    if (detailResult.error) {
      setError(detailResult.error);
      setLoading(false);
      return;
    }

    setDetail(detailResult.data ?? null);
    setFinding(detailResult.data?.finding ?? selected);
    setLoading(false);
  }, [issueCode]);

  useEffect(() => {
    void loadFinding();
  }, [loadFinding]);

  const runAction = async (label: string, action: () => Promise<{ error?: string | null }>) => {
    setSubmitting(true);
    setFeedback(null);
    const result = await action();
    setSubmitting(false);
    if (result.error) {
      setFeedback(result.error);
      return;
    }
    setFeedback(label);
    await loadFinding();
  };

  const type = finding ? findingType(finding) : "error";
  const agentMeta = finding?.agent_id ? getAgentOwnerMeta(finding.agent_id) : null;
  const confidence =
    typeof finding?.metadata?.confidence === "string"
      ? finding.metadata.confidence
      : finding?.severity ?? null;

  const historyItems = useMemo(() => {
    const items: Array<{ label: string; at: string }> = [];
    if (finding?.created_at) {
      items.push({ label: "Created", at: finding.created_at });
    }
    for (const entry of detail?.ownerFeedback ?? []) {
      items.push({ label: feedbackLabel(entry), at: entry.created_at });
    }
    if (finding?.updated_at && finding.updated_at !== finding.created_at) {
      items.push({ label: "Updated", at: finding.updated_at });
    }
    return items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()).slice(0, 8);
  }, [detail?.ownerFeedback, finding]);

  const notFound = !loading && !error && !finding;

  if (notFound) {
    return (
      <AgentOpsOwnerPageShell loading={false}>
        <div className="space-y-6">
          <AgentOpsEmptyState
            title="Finding not found"
            description={`No finding matches “${issueCode}” in staging active or backlog lists.`}
          />
          <AixiaButton variant="secondary" onClick={() => navigate("/system/agent-ops/issues")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Findings
          </AixiaButton>
        </div>
      </AgentOpsOwnerPageShell>
    );
  }

  return (
    <AgentOpsOwnerPageShell loading={loading} error={error} onRetry={() => void loadFinding()}>
      <div className="space-y-8">
        <div className="flex flex-wrap items-center gap-3">
          <AixiaButton variant="secondary" onClick={() => navigate("/system/agent-ops/issues")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Findings
          </AixiaButton>
          <AixiaButton variant="secondary" onClick={() => void loadFinding()} disabled={loading}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </AixiaButton>
        </div>

        {finding ? (
          <>
            <header className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <AixiaBadge tone={typeTone(type)}>{typeLabel(type)}</AixiaBadge>
                <AixiaBadge tone="neutral">{finding.severity}</AixiaBadge>
                {confidence ? <AixiaBadge tone="neutral">{confidence} confidence</AixiaBadge> : null}
                <AixiaBadge tone="neutral">{ownerStatusLabel(finding.status)}</AixiaBadge>
              </div>
              <AgentOpsPageHeader
                title={finding.title}
                subtitle={finding.issue_code}
              />
            </header>

            {feedback ? (
              <p className="text-sm text-white/70" role="status">
                {feedback}
              </p>
            ) : null}

            <OwnerSection title="Summary" id="finding-summary">
              <p className="text-sm leading-relaxed text-white/80">{finding.problem}</p>
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-white/45">Affected route</dt>
                  <dd className="text-white/85">{finding.route ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-white/45">Module</dt>
                  <dd className="text-white/85">{finding.module ?? "—"}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-white/45">Why it matters</dt>
                  <dd className="text-white/85">{impactSummary(finding)}</dd>
                </div>
              </dl>
            </OwnerSection>

            <OwnerSection title="Evidence" id="finding-evidence">
              <p className="text-sm text-white/75">
                {finding.evidence_summary ?? finding.actual_result ?? "No short evidence summary recorded."}
              </p>
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-white/45">Agent</dt>
                  <dd className="text-white/85">
                    {agentMeta?.jobTitle ?? finding.agent_id ?? "Supporting agents"}
                  </dd>
                </div>
                <div>
                  <dt className="text-white/45">Source review</dt>
                  <dd className="text-white/85">{finding.run_id ? "Daily staging review" : "AgentOps review"}</dd>
                </div>
              </dl>
              {(detail?.evidenceFiles ?? []).length > 0 ? (
                <ul className="space-y-2 text-sm">
                  {(detail?.evidenceFiles ?? []).slice(0, 3).map((file) => (
                    <li key={file.id}>
                      <a
                        href={file.file_path}
                        target="_blank"
                        rel="noreferrer"
                        className="text-indigo-300 hover:text-indigo-200"
                      >
                        {file.summary ?? file.evidence_type} — view evidence
                      </a>
                    </li>
                  ))}
                </ul>
              ) : null}
            </OwnerSection>

            <OwnerSection title="Recommendation" id="finding-recommendation">
              {type === "error" ? (
                <dl className="grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-white/45">Suggested fix</dt>
                    <dd className="text-white/85">
                      {finding.recommended_fix_strategy ?? finding.expected_result ?? "Review and approve a safe fix path."}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-white/45">Likely cause</dt>
                    <dd className="text-white/85">{finding.likely_root_cause ?? "Under investigation"}</dd>
                  </div>
                </dl>
              ) : null}
              {type === "improvement" ? (
                <dl className="grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-white/45">Expected benefit</dt>
                    <dd className="text-white/85">{finding.expected_result ?? finding.problem}</dd>
                  </div>
                  <div>
                    <dt className="text-white/45">Suggested implementation</dt>
                    <dd className="text-white/85">
                      {finding.recommended_fix_strategy ?? "Small, owner-approved improvement on staging."}
                    </dd>
                  </div>
                </dl>
              ) : null}
              {type === "feature" ? (
                <dl className="grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-white/45">Problem solved</dt>
                    <dd className="text-white/85">{finding.problem}</dd>
                  </div>
                  <div>
                    <dt className="text-white/45">Value</dt>
                    <dd className="text-white/85">{finding.expected_result ?? "Improves owner or user workflow"}</dd>
                  </div>
                  <div>
                    <dt className="text-white/45">Scope</dt>
                    <dd className="text-white/85">{finding.module ?? finding.route ?? "Staging module"}</dd>
                  </div>
                  <div>
                    <dt className="text-white/45">Risk</dt>
                    <dd className="text-white/85">{finding.security_impact ?? "Owner approval required before build"}</dd>
                  </div>
                </dl>
              ) : null}
            </OwnerSection>

            <OwnerSection title="Owner actions" id="finding-actions">
              <p className="text-sm text-white/60">
                Choose one action. Promotions and memory changes always require your explicit approval.
              </p>
              <div className="flex flex-wrap gap-2">
                {canStartWork(finding.status) ? (
                  <AixiaButton
                    disabled={submitting}
                    onClick={() =>
                      void runAction("Marked as in progress.", () =>
                        markAgentOpsInProgress(finding.id),
                      )
                    }
                  >
                    Approve
                  </AixiaButton>
                ) : null}
                {canDefer(finding.status) ? (
                  <AixiaButton
                    variant="secondary"
                    disabled={submitting}
                    onClick={() =>
                      void runAction("Finding deferred.", () => deferAgentOpsFinding(finding.id))
                    }
                  >
                    Defer
                  </AixiaButton>
                ) : null}
                {canReject(finding.status) ? (
                  <AixiaButton
                    variant="secondary"
                    disabled={submitting}
                    onClick={() =>
                      void runAction("Finding rejected.", () =>
                        markAgentOpsFalsePositive(finding.id),
                      )
                    }
                  >
                    Reject
                  </AixiaButton>
                ) : null}
                {finding.status === "Active Top 10" || finding.status === "In Progress" ? (
                  <AixiaButton
                    variant="secondary"
                    onClick={() => navigate("/system/agent-ops/issues?tab=active")}
                  >
                    View active issues
                  </AixiaButton>
                ) : null}
                {type !== "error" ? (
                  <AixiaButton
                    variant="secondary"
                    onClick={() => navigate("/system/agent-ops/issues?tab=improvements")}
                  >
                    Add to roadmap
                  </AixiaButton>
                ) : null}
              </div>
            </OwnerSection>

            <OwnerSection title="History" id="finding-history">
              {historyItems.length === 0 ? (
                <p className="text-sm text-white/60">No history recorded yet.</p>
              ) : (
                <ul className="divide-y divide-white/10">
                  {historyItems.map((item) => (
                    <li
                      key={`${item.label}-${item.at}`}
                      className="flex flex-wrap items-baseline justify-between gap-2 py-3 text-sm"
                    >
                      <span className="text-white/85">{item.label}</span>
                      <time className="text-white/45">{formatDateTime(item.at)}</time>
                    </li>
                  ))}
                </ul>
              )}
            </OwnerSection>

            <AgentOpsAdvancedDisclosure title="Technical details">
              <pre className="max-h-96 overflow-auto rounded-lg bg-black/40 p-3 text-xs text-white/60">
                {JSON.stringify(
                  {
                    id: finding.id,
                    issue_code: finding.issue_code,
                    run_id: finding.run_id,
                    queue_state: finding.queue_state,
                    top10_rank: finding.top10_rank,
                    metadata: finding.metadata,
                    evidence_files: finding.evidence_files,
                    cursor_prompt: finding.cursor_prompt,
                    non_change_rules: finding.non_change_rules,
                  },
                  null,
                  2,
                )}
              </pre>
              {(detail?.ownerFeedback?.length ?? 0) > 0 ? (
                <pre className="mt-4 max-h-48 overflow-auto rounded-lg bg-black/40 p-3 text-xs text-white/60">
                  {JSON.stringify(detail?.ownerFeedback, null, 2)}
                </pre>
              ) : null}
            </AgentOpsAdvancedDisclosure>
          </>
        ) : null}
      </div>
    </AgentOpsOwnerPageShell>
  );
}
