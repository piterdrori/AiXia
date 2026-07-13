import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, RefreshCw } from "lucide-react";

import { AixiaBadge, AixiaButton, AixiaInfoBlock } from "@/components/aixia";
import {
  AgentOpsAdvancedDisclosure,
  AgentOpsEmptyState,
  AgentOpsOwnerPageShell,
  AgentOpsPageHeader,
  getAgentOwnerMeta,
  useAgentOpsOwnerGate,
} from "@/components/agentops/owner";
import { usePageTitle } from "@/hooks/usePageTitle";
import { CANONICAL_AGENTS } from "@/lib/agentops/canonicalAgents";
import {
  approveAgentOpsFinding,
  deferAgentOpsFinding,
  markAgentOpsFalsePositive,
  markAgentOpsFixed,
  recordAgentOpsVerificationResult,
  rejectAgentOpsFinding,
  reopenAgentOpsFinding,
  requestAgentOpsVerification,
  saveAgentOpsSuggestedFixPrompt,
} from "@/lib/agentops";
import {
  applyMonitoringDraftDecision,
  loadCanonicalFindingDetail,
  promoteMonitoringDraft,
  type CanonicalFindingDetailView,
} from "@/lib/agentops/findings/findingsDetailLoader";
import {
  inspectPromptSafety,
  type OwnerDetailAction,
} from "@/lib/agentops/findings/findingsDetailModel";

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

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
}

function resolveAgentSlug(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const key = raw.trim().toLowerCase();
  const match = CANONICAL_AGENTS.find(
    (agent) =>
      agent.id === key ||
      key.endsWith(`.${agent.id}`) ||
      key === agent.name.toLowerCase().replace(/\s+/g, "-"),
  );
  return match?.id ?? (key.includes("agent") ? key : null);
}

function findingsBackHref(searchParams: URLSearchParams): string {
  const next = new URLSearchParams();
  const from = searchParams.get("from");
  const agent = searchParams.get("agent");
  if (from) next.set("tab", from);
  if (agent) next.set("agent", agent);
  const query = next.toString();
  return query ? `/system/agent-ops/issues?${query}` : "/system/agent-ops/issues";
}

function actionLabelSafe(action: OwnerDetailAction): string {
  switch (action) {
    case "approve":
      return "Approve";
    case "defer":
      return "Defer";
    case "reject":
      return "Reject";
    case "promote":
      return "Promote to issue";
    case "mark_fixed":
      return "Mark fixed";
    case "request_verification":
      return "Request verification";
    case "verify":
      return "Verify";
    case "reopen":
      return "Reopen";
    default:
      return action;
  }
}

export default function AgentOpsFindingDetailPage() {
  const params = useParams<{ issueCode: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { loading: gateLoading, isOwner, error: gateError, refresh: refreshGate } =
    useAgentOpsOwnerGate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [detail, setDetail] = useState<CanonicalFindingDetailView | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [editingPrompt, setEditingPrompt] = useState(false);
  const [promptDraft, setPromptDraft] = useState("");
  const [promptSaveState, setPromptSaveState] = useState<
    "idle" | "dirty" | "saving" | "saved" | "failed"
  >("idle");
  const [promptError, setPromptError] = useState<string | null>(null);
  const [copyAnnounce, setCopyAnnounce] = useState<string | null>(null);
  const [showOriginal, setShowOriginal] = useState(false);

  usePageTitle(detail?.issueCode ? `Finding ${detail.issueCode}` : "Finding");

  const backHref = useMemo(() => findingsBackHref(searchParams), [searchParams]);

  const loadDetail = useCallback(async () => {
    if (!isOwner) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const result = await loadCanonicalFindingDetail(params.issueCode);
    setDetail(result.detail);
    setNotFound(result.notFound);
    setError(result.error);
    setPromptDraft(result.detail?.promptText ?? "");
    setEditingPrompt(searchParams.get("mode") === "edit-prompt");
    setPromptSaveState("idle");
    setPromptError(null);
    setLoading(false);
  }, [isOwner, params.issueCode, searchParams]);

  useEffect(() => {
    if (!gateLoading) void loadDetail();
  }, [gateLoading, loadDetail]);

  const slug = resolveAgentSlug(detail?.agentSlug);
  const agentMeta = getAgentOwnerMeta(slug ?? detail?.agentSlug ?? "unknown");
  const agentName =
    CANONICAL_AGENTS.find((agent) => agent.id === slug)?.name ??
    agentMeta.username ??
    detail?.agentSlug ??
    "Unknown agent";
  const agentHref = slug ? `/system/agent-ops/agents/${slug}` : null;
  const chatHref = slug
    ? `/system/agent-ops/agents/${slug}?finding=${encodeURIComponent(
        detail?.issueCode ?? detail?.draftId ?? "",
      )}`
    : null;

  const safetyHits = useMemo(
    () => inspectPromptSafety(editingPrompt ? promptDraft : detail?.promptText ?? ""),
    [editingPrompt, promptDraft, detail?.promptText],
  );

  const runAction = async (
    label: string,
    action: () => Promise<{ error?: string | null; ok?: boolean }>,
  ) => {
    setSubmitting(true);
    setFeedback(null);
    const result = await action();
    setSubmitting(false);
    if (result.error || result.ok === false) {
      setFeedback(result.error ?? "Action failed.");
      return;
    }
    setFeedback(label);
    await loadDetail();
  };

  const handleOwnerAction = async (action: OwnerDetailAction) => {
    if (!detail) return;
    if (action === "open_agent" && agentHref) {
      navigate(agentHref);
      return;
    }
    if (action === "chat_agent" && chatHref) {
      navigate(chatHref);
      return;
    }

    if (detail.source === "draft" && detail.draftId) {
      if (action === "approve") {
        await runAction("Draft approved.", () =>
          applyMonitoringDraftDecision(detail.draftId!, "owner_approved"),
        );
        return;
      }
      if (action === "defer") {
        await runAction("Draft deferred.", () =>
          applyMonitoringDraftDecision(detail.draftId!, "deferred"),
        );
        return;
      }
      if (action === "reject") {
        await runAction("Draft rejected.", () =>
          applyMonitoringDraftDecision(detail.draftId!, "rejected"),
        );
        return;
      }
      if (action === "promote") {
        setSubmitting(true);
        setFeedback(null);
        const result = await promoteMonitoringDraft(detail.draftId);
        setSubmitting(false);
        if (!result.ok) {
          setFeedback(result.error ?? "Promotion failed.");
          return;
        }
        setFeedback(
          result.issueDisplayCode
            ? `Draft promoted to ${result.issueDisplayCode}.`
            : "Draft promoted.",
        );
        if (result.issueDisplayCode) {
          navigate(`/system/agent-ops/issues/${encodeURIComponent(result.issueDisplayCode)}`, {
            replace: true,
          });
          return;
        }
        await loadDetail();
        return;
      }
    }

    if (!detail.findingId) {
      setFeedback("This action requires a promoted finding.");
      return;
    }

    if (action === "approve") {
      await runAction("Finding approved.", () => approveAgentOpsFinding(detail.findingId!));
      return;
    }
    if (action === "defer") {
      await runAction("Finding deferred.", () => deferAgentOpsFinding(detail.findingId!));
      return;
    }
    if (action === "reject") {
      await runAction("Finding rejected.", () =>
        detail.ownerStatus === "needs_review"
          ? markAgentOpsFalsePositive(detail.findingId!)
          : rejectAgentOpsFinding(detail.findingId!),
      );
      return;
    }
    if (action === "mark_fixed") {
      await runAction("Finding marked fixed.", () => markAgentOpsFixed(detail.findingId!));
      return;
    }
    if (action === "request_verification") {
      await runAction("Verification requested.", () =>
        requestAgentOpsVerification(detail.findingId!),
      );
      return;
    }
    if (action === "verify") {
      if (!detail.pendingVerificationId) {
        setFeedback("No pending verification record is available.");
        return;
      }
      await runAction("Finding verified fixed.", () =>
        recordAgentOpsVerificationResult({
          verificationId: detail.pendingVerificationId!,
          findingId: detail.findingId!,
          verificationStatus: "verified_fixed",
          actualResult: "Owner verified fixed from Finding Detail.",
        }),
      );
      return;
    }
    if (action === "reopen") {
      await runAction("Finding reopened.", () => reopenAgentOpsFinding(detail.findingId!));
    }
  };

  const startEditPrompt = () => {
    setPromptDraft(detail?.promptText ?? "");
    setEditingPrompt(true);
    setPromptSaveState("idle");
    setPromptError(null);
    const next = new URLSearchParams(searchParams);
    next.set("mode", "edit-prompt");
    setSearchParams(next, { replace: true });
  };

  const cancelEditPrompt = () => {
    setEditingPrompt(false);
    setPromptDraft(detail?.promptText ?? "");
    setPromptSaveState("idle");
    setPromptError(null);
    const next = new URLSearchParams(searchParams);
    next.delete("mode");
    setSearchParams(next, { replace: true });
  };

  const savePrompt = async (restoreOriginal = false) => {
    if (!detail?.findingId) {
      setPromptError("Promote this draft to an issue before saving an edited prompt.");
      setPromptSaveState("failed");
      return;
    }
    const text = restoreOriginal ? detail.originalPrompt ?? "" : promptDraft;
    if (!text.trim()) {
      setPromptError("Prompt text is required.");
      setPromptSaveState("failed");
      return;
    }
    setPromptSaveState("saving");
    setPromptError(null);
    const result = await saveAgentOpsSuggestedFixPrompt({
      findingId: detail.findingId,
      promptText: text,
      originalPrompt: detail.originalPrompt,
      restoreOriginal,
    });
    if (result.error) {
      setPromptError(result.error);
      setPromptSaveState("failed");
      return;
    }
    setPromptSaveState("saved");
    setFeedback(result.data?.message ?? "Prompt saved.");
    setEditingPrompt(false);
    const next = new URLSearchParams(searchParams);
    next.delete("mode");
    setSearchParams(next, { replace: true });
    await loadDetail();
  };

  const copyPrompt = async () => {
    const text = editingPrompt ? promptDraft : detail?.promptText ?? "";
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopyAnnounce("Prompt copied to clipboard.");
    } catch {
      setCopyAnnounce("Could not copy prompt.");
    }
  };

  const primaryActions = (detail?.validActions ?? []).filter(
    (action) => !["open_agent", "chat_agent"].includes(action),
  );

  if (!gateLoading && notFound) {
    return (
      <AgentOpsOwnerPageShell loading={false}>
        <div className="space-y-6">
          <AgentOpsEmptyState
            title="Finding not found"
            description={`No finding matches “${params.issueCode ?? ""}”.`}
          />
          <AixiaButton variant="secondary" onClick={() => navigate(backHref)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Findings
          </AixiaButton>
        </div>
      </AgentOpsOwnerPageShell>
    );
  }

  return (
    <AgentOpsOwnerPageShell
      loading={gateLoading}
      error={gateError}
      onRetry={() => void Promise.all([refreshGate(), loadDetail()])}
    >
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <AixiaButton variant="secondary" onClick={() => navigate(backHref)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Findings
          </AixiaButton>
          <AixiaButton
            variant="secondary"
            onClick={() => void loadDetail()}
            disabled={loading || submitting}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </AixiaButton>
        </div>

        {loading ? (
          <div className="space-y-3" aria-busy="true">
            <p className="text-sm text-white/55" role="status">
              Loading finding…
            </p>
            {[0, 1, 2, 3].map((slot) => (
              <div
                key={slot}
                className="h-28 animate-pulse rounded-xl border border-white/10 bg-white/[0.04]"
              />
            ))}
          </div>
        ) : null}

        {error ? (
          <AixiaInfoBlock tone="gold" title="Some detail data is unavailable">
            {error}
          </AixiaInfoBlock>
        ) : null}

        {feedback ? (
          <p className="text-sm text-white/70" role="status">
            {feedback}
          </p>
        ) : null}

        {detail && !loading ? (
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              <header className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <AixiaBadge tone="cyan">{detail.typeLabel}</AixiaBadge>
                  <AixiaBadge tone="neutral">{detail.ownerStatusLabel}</AixiaBadge>
                  {detail.severity ? <AixiaBadge tone="neutral">{detail.severity}</AixiaBadge> : null}
                  {detail.confidence ? (
                    <AixiaBadge tone="neutral">{detail.confidence} confidence</AixiaBadge>
                  ) : null}
                </div>
                <AgentOpsPageHeader
                  title={detail.title}
                  subtitle={detail.issueCode ?? detail.draftId ?? "Finding detail"}
                />
                <div className="flex flex-wrap gap-2">
                  {primaryActions.map((action) => (
                    <AixiaButton
                      key={action}
                      variant={
                        action === "approve" || action === "verify" ? "primary" : "secondary"
                      }
                      disabled={submitting}
                      onClick={() => void handleOwnerAction(action)}
                      aria-label={`${actionLabelSafe(action)} for ${detail.title}`}
                    >
                      {actionLabelSafe(action)}
                    </AixiaButton>
                  ))}
                </div>
              </header>

              <OwnerSection title="What was found" id="finding-summary">
                <p className="text-sm leading-relaxed text-white/80">{detail.explanationDisplay}</p>
                {detail.explanationInferred ? (
                  <p className="text-xs text-white/45">
                    Owner-readable summary derived from technical text.
                  </p>
                ) : null}
                <dl className="grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-white/45">Route / module</dt>
                    <dd className="text-white/85">{detail.route ?? detail.module ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-white/45">Type</dt>
                    <dd className="text-white/85">{detail.typeLabel}</dd>
                  </div>
                  <div>
                    <dt className="text-white/45">First detected</dt>
                    <dd className="text-white/85">{formatDateTime(detail.createdAt)}</dd>
                  </div>
                  <div>
                    <dt className="text-white/45">Latest update</dt>
                    <dd className="text-white/85">{formatDateTime(detail.updatedAt)}</dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-white/45">Lifecycle</dt>
                    <dd className="text-white/85">{detail.ownerStatusLabel}</dd>
                  </div>
                </dl>
              </OwnerSection>

              <OwnerSection title="Why it matters" id="finding-why">
                {detail.whyItMatters.length === 0 ? (
                  <p className="text-sm text-white/60">No impact fields are available for this finding.</p>
                ) : (
                  <ul className="space-y-3">
                    {detail.whyItMatters.map((row) => (
                      <li key={row.label} className="text-sm">
                        <p className="text-white/45">
                          {row.label}
                          {row.inferred ? " (inferred)" : ""}
                        </p>
                        <p className="text-white/80">{row.text}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </OwnerSection>

              <OwnerSection title="Evidence" id="finding-evidence">
                <p className="text-sm text-white/75">
                  {detail.evidenceSummary ?? "No short evidence summary recorded."}
                </p>
                <dl className="grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-white/45">Observed</dt>
                    <dd className="text-white/85">{detail.actualResult ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-white/45">Expected</dt>
                    <dd className="text-white/85">{detail.expectedResult ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-white/45">Reporting agent</dt>
                    <dd className="text-white/85">{agentName}</dd>
                  </div>
                  <div>
                    <dt className="text-white/45">Monitoring run</dt>
                    <dd className="text-white/85">{detail.runId ?? "—"}</dd>
                  </div>
                </dl>
                {detail.evidenceLinks.length > 0 ? (
                  <ul className="space-y-2 text-sm">
                    {detail.evidenceLinks.map((file) => (
                      <li key={file.id}>
                        <a
                          href={file.href}
                          target="_blank"
                          rel="noreferrer"
                          className="text-indigo-300 hover:text-indigo-200"
                        >
                          {file.label} — view evidence
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </OwnerSection>

              <OwnerSection title="Suggested solution" id="finding-solution">
                {detail.suggestedSolution || detail.likelyRootCause ? (
                  <dl className="grid gap-3 text-sm sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <dt className="text-white/45">Recommended approach</dt>
                      <dd className="text-white/85">
                        {detail.suggestedSolution ?? "No suggested solution has been generated yet."}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-white/45">Likely root cause</dt>
                      <dd className="text-white/85">{detail.likelyRootCause ?? "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-white/45">Validation</dt>
                      <dd className="text-white/85">
                        Re-test the affected route on staging after an owner-approved fix.
                      </dd>
                    </div>
                  </dl>
                ) : (
                  <p className="text-sm text-white/60">
                    No suggested solution has been generated yet.
                  </p>
                )}
              </OwnerSection>

              <OwnerSection title="Suggested fix prompt" id="finding-prompt">
                {!detail.canSavePrompt ? (
                  <p className="text-xs text-white/45">
                    Prompt edits can be saved after this draft is promoted to an issue.
                  </p>
                ) : null}
                {safetyHits.length > 0 ? (
                  <AixiaInfoBlock
                    tone="gold"
                    title="This prompt may conflict with AgentOps safety rules."
                  >
                    <p className="text-sm text-white/75">
                      Detected: {safetyHits.map((hit) => hit.label).join(", ")}. Review carefully.
                      Phase D does not execute prompts.
                    </p>
                  </AixiaInfoBlock>
                ) : null}
                <label className="block space-y-2" htmlFor="suggested-fix-prompt">
                  <span className="text-sm text-white/55">
                    Suggested fix prompt
                    {detail.promptSource !== "none" ? ` · source: ${detail.promptSource}` : ""}
                  </span>
                  <textarea
                    id="suggested-fix-prompt"
                    className="min-h-[220px] w-full rounded-lg border border-white/10 bg-black/30 p-3 text-sm text-white/90"
                    value={editingPrompt ? promptDraft : detail.promptText ?? ""}
                    readOnly={!editingPrompt}
                    onChange={(event) => {
                      setPromptDraft(event.target.value);
                      setPromptSaveState("dirty");
                    }}
                    placeholder="No suggested fix prompt is available yet."
                  />
                </label>
                <p className="text-xs text-white/45">
                  {(editingPrompt ? promptDraft : detail.promptText ?? "").length} characters
                  {promptSaveState === "dirty" ? " · Unsaved changes" : ""}
                  {promptSaveState === "saving" ? " · Saving…" : ""}
                  {promptSaveState === "saved" ? " · Saved" : ""}
                  {promptSaveState === "failed" ? " · Save failed" : ""}
                </p>
                {promptError ? (
                  <p className="text-sm text-rose-300" role="alert">
                    {promptError}
                  </p>
                ) : null}
                {copyAnnounce ? (
                  <p className="text-sm text-white/60" role="status">
                    {copyAnnounce}
                  </p>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  {!editingPrompt ? (
                    <AixiaButton onClick={startEditPrompt}>Edit prompt</AixiaButton>
                  ) : (
                    <>
                      <AixiaButton
                        disabled={promptSaveState === "saving"}
                        onClick={() => void savePrompt(false)}
                      >
                        Save changes
                      </AixiaButton>
                      <AixiaButton variant="secondary" onClick={cancelEditPrompt}>
                        Cancel
                      </AixiaButton>
                    </>
                  )}
                  <AixiaButton variant="secondary" onClick={() => void copyPrompt()}>
                    Copy prompt
                  </AixiaButton>
                  {detail.originalPrompt ? (
                    <>
                      <AixiaButton
                        variant="secondary"
                        onClick={() => setShowOriginal((open) => !open)}
                      >
                        {showOriginal ? "Hide original" : "View original"}
                      </AixiaButton>
                      {detail.canSavePrompt ? (
                        <AixiaButton
                          variant="secondary"
                          disabled={promptSaveState === "saving"}
                          onClick={() => void savePrompt(true)}
                        >
                          Restore original
                        </AixiaButton>
                      ) : null}
                    </>
                  ) : null}
                </div>
                {showOriginal && detail.originalPrompt ? (
                  <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap rounded-lg bg-black/40 p-3 text-xs text-white/65">
                    {detail.originalPrompt}
                  </pre>
                ) : null}
                <p className="text-xs text-white/40">
                  Ask for a future rewrite in Phase E — this page does not auto-run Cursor prompts.
                </p>
              </OwnerSection>

              <OwnerSection title="History" id="finding-history">
                {detail.history.length === 0 ? (
                  <p className="text-sm text-white/60">No history recorded yet.</p>
                ) : (
                  <ul className="divide-y divide-white/10">
                    {detail.history.map((item) => (
                      <li
                        key={item.id}
                        className="flex flex-wrap items-baseline justify-between gap-2 py-3 text-sm"
                      >
                        <div>
                          <p className="text-white/85">{item.label}</p>
                          <p className="text-xs text-white/45">
                            {item.actor}
                            {item.note ? ` · ${item.note}` : ""}
                          </p>
                        </div>
                        <time className="text-white/45">{formatDateTime(item.at)}</time>
                      </li>
                    ))}
                  </ul>
                )}
              </OwnerSection>

              <AgentOpsAdvancedDisclosure title="Technical details">
                {detail.explanationTechnical ? (
                  <div className="mb-4">
                    <p className="text-xs text-white/45">Raw explanation</p>
                    <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap rounded-lg bg-black/40 p-3 text-xs text-white/60">
                      {detail.explanationTechnical}
                    </pre>
                  </div>
                ) : null}
                <pre className="max-h-96 overflow-auto rounded-lg bg-black/40 p-3 text-xs text-white/60">
                  {JSON.stringify(detail.technical, null, 2)}
                </pre>
              </AgentOpsAdvancedDisclosure>
            </div>

            <aside className="space-y-6">
              <OwnerSection title="Reporting agent" id="finding-agent">
                <p className="text-base font-medium text-white">{agentName}</p>
                <p className="text-sm text-white/60">{agentMeta.username}</p>
                <p className="text-sm text-white/50">{agentMeta.jobTitle}</p>
                <p className="text-sm text-white/65">
                  This agent reported the finding from its staging review perspective.
                </p>
                {detail.supportingAgentSlugs.length > 0 ? (
                  <p className="text-xs text-white/45">
                    +{detail.supportingAgentSlugs.length} supporting agent
                    {detail.supportingAgentSlugs.length === 1 ? "" : "s"}
                  </p>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  {agentHref ? (
                    <AixiaButton variant="secondary" onClick={() => navigate(agentHref)}>
                      Open agent
                    </AixiaButton>
                  ) : null}
                  {chatHref ? (
                    <AixiaButton variant="secondary" onClick={() => navigate(chatHref)}>
                      Chat with agent
                    </AixiaButton>
                  ) : null}
                  {slug ? (
                    <AixiaButton
                      variant="secondary"
                      onClick={() =>
                        navigate(
                          `/system/agent-ops/issues?tab=all&agent=${encodeURIComponent(slug)}`,
                        )
                      }
                    >
                      View all findings from this agent
                    </AixiaButton>
                  ) : null}
                </div>
              </OwnerSection>

              <OwnerSection title="Owner decision" id="finding-decision">
                <p className="text-sm text-white/70">
                  Current status: <span className="text-white">{detail.ownerStatusLabel}</span>
                </p>
                <p className="text-sm text-white/60">Recommended next step: {detail.nextAction}</p>
                <ul className="space-y-3">
                  {primaryActions.map((action) => {
                    const meta = detail.actionMeta.find((item) => item.id === action);
                    return (
                      <li key={action} className="rounded-lg border border-white/10 p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-sm font-medium text-white">{meta?.label ?? action}</p>
                          <AixiaButton
                            variant="secondary"
                            disabled={submitting}
                            onClick={() => void handleOwnerAction(action)}
                          >
                            {meta?.label ?? action}
                          </AixiaButton>
                        </div>
                        <p className="mt-2 text-xs text-white/50">{meta?.help}</p>
                      </li>
                    );
                  })}
                </ul>
                {primaryActions.length === 0 ? (
                  <p className="text-sm text-white/55">No lifecycle actions are available right now.</p>
                ) : null}
              </OwnerSection>

              <OwnerSection title="Links" id="finding-links">
                <ul className="space-y-2 text-sm">
                  <li>
                    <Link className="text-cyan-300 hover:text-cyan-200" to={backHref}>
                      Back to Findings
                    </Link>
                  </li>
                  {detail.runId ? (
                    <li>
                      <Link
                        className="text-cyan-300 hover:text-cyan-200"
                        to="/system/agent-ops/monitoring"
                      >
                        Open monitoring
                      </Link>
                    </li>
                  ) : null}
                </ul>
              </OwnerSection>
            </aside>
          </div>
        ) : null}
      </div>
    </AgentOpsOwnerPageShell>
  );
}
