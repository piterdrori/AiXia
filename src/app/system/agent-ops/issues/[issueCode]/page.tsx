import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, RefreshCw } from "lucide-react";

import { AixiaBadge, AixiaButton, AixiaInfoBlock } from "@/components/aixia";
import {
  AgentOpsAdvancedDisclosure,
  AgentOpsEmptyState,
  AgentOpsFindingChatCard,
  AgentOpsOwnerPageShell,
  AgentOpsPageHeader,
  getAgentOwnerMeta,
  useAgentOpsOwnerGate,
  type AgentOpsAgentChatIdentity,
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
import { MANUAL_RUN_ARTIFACT_URL } from "@/lib/agentops/agents/agentManualRunClient";
import {
  applyMonitoringDraftDecision,
  loadCanonicalFindingDetail,
  promoteMonitoringDraft,
  saveMonitoringDraftFixPrompt,
  type CanonicalFindingDetailView,
} from "@/lib/agentops/findings/findingsDetailLoader";
import {
  inspectPromptSafety,
  type OwnerDetailAction,
} from "@/lib/agentops/findings/findingsDetailModel";
import {
  CURSOR_BRIDGE_START_COMMAND,
  probeCursorBridge,
  readStoredBridgeToken,
  sendFixIssueToBridge,
  storeBridgeToken,
} from "@/lib/agentops/findings/cursorBridgeClient";
import {
  buildOwnerSuggestedSolution,
  buildStructuredFixIssuePrompt,
  isStructuredFixPrompt,
  stagingPageUrl,
} from "@/lib/agentops/findings/issueFixWorkflow";
import { normalizeReportingAgent } from "@/lib/agentops/findings/reportingAgentIdentity";
import { supabase } from "@/lib/supabase";

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

function findingsBackHref(searchParams: URLSearchParams): string {
  const next = new URLSearchParams();
  const from = searchParams.get("from");
  const agent = searchParams.get("agent");
  if (from) next.set("tab", from);
  if (agent) next.set("agent", agent);
  const query = next.toString();
  return query ? `/system/agent-ops/issues?${query}` : "/system/agent-ops/issues";
}

/** E-A6 — owner-facing labels. Workflow words stay only inside collapsed Advanced actions. */
function advancedActionLabel(action: OwnerDetailAction): string {
  switch (action) {
    case "approve":
      return "Accept as real issue";
    case "defer":
      return "Review later";
    case "reject":
      return "Dismiss";
    case "needs_more_info":
      return "Needs more info";
    case "mark_duplicate":
      return "Mark duplicate";
    case "promote":
      return "Promote approved issue";
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
  const [needsMoreInfoNote, setNeedsMoreInfoNote] = useState("");
  const [duplicateOfInput, setDuplicateOfInput] = useState("");
  const [signedLinkFeedback, setSignedLinkFeedback] = useState<string | null>(null);
  const [openingSignedPath, setOpeningSignedPath] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmMarkFixed, setConfirmMarkFixed] = useState(false);
  const [markFixedNote, setMarkFixedNote] = useState("");
  const [handoffFeedback, setHandoffFeedback] = useState<string | null>(null);
  const [bridgeState, setBridgeState] = useState<"checking" | "online" | "offline">("checking");
  const [bridgeCliAvailable, setBridgeCliAvailable] = useState(false);
  const [bridgeNeedsToken, setBridgeNeedsToken] = useState(false);
  const [bridgeTokenInput, setBridgeTokenInput] = useState("");
  const [showBridgeHelp, setShowBridgeHelp] = useState(false);

  usePageTitle(
    detail?.issueCode ? `Issue ${detail.issueCode}` : detail?.title ? detail.title : "Issue",
  );

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
    setPromptSaveState("idle");
    setPromptError(null);
    setLoading(false);
  }, [isOwner, params.issueCode]);

  useEffect(() => {
    if (!gateLoading) void loadDetail();
  }, [gateLoading, loadDetail]);

  useEffect(() => {
    if (searchParams.get("mode") === "edit-prompt") {
      setEditingPrompt(true);
    }
  }, [searchParams]);

  const reporter = useMemo(
    () => normalizeReportingAgent(detail?.agentSlug),
    [detail?.agentSlug],
  );
  const slug = reporter.canonicalId;
  const agentMeta = getAgentOwnerMeta(slug ?? "unknown", {
    username: reporter.kind === "external" ? reporter.originalLabel : undefined,
  });
  const agentName =
    reporter.kind === "external"
      ? reporter.displayName
      : (CANONICAL_AGENTS.find((agent) => agent.id === slug)?.name ??
        reporter.displayName);
  const agentHref = slug ? `/system/agent-ops/agents/${slug}` : null;
  const chatHref = slug
    ? `/system/agent-ops/agents/${slug}?finding=${encodeURIComponent(
        detail?.issueCode ?? detail?.draftId ?? detail?.findingId ?? "",
      )}`
    : null;

  const findingChatIdentity = useMemo((): AgentOpsAgentChatIdentity | null => {
    if (!reporter.canChat || !slug) return null;
    return {
      agentId: slug,
      displayName: agentName,
      username: agentMeta.username,
      jobTitle: agentMeta.jobTitle,
      responsibility: agentMeta.responsibility,
      statusLabel: detail?.ownerStatusLabel ?? "Finding discussion",
      qaSpecialty: agentMeta.jobTitle,
      currentFocus: detail?.title ?? null,
      contextNotes: [
        detail?.issueCode ? `Finding ${detail.issueCode}` : null,
        detail?.route ? `Route ${detail.route}` : null,
        reporter.kind === "alias" ? `Imported as ${reporter.originalLabel}` : null,
      ].filter(Boolean) as string[],
    };
  }, [agentMeta, agentName, detail, reporter, slug]);

  const safetyHits = useMemo(
    () => inspectPromptSafety(editingPrompt ? promptDraft : detail?.promptText ?? ""),
    [editingPrompt, promptDraft, detail?.promptText],
  );

  const applyPromptRewriteToEditor = useCallback(
    (prompt: string) => {
      setPromptDraft(prompt);
      setEditingPrompt(true);
      setPromptSaveState("dirty");
      setPromptError(null);
      setFeedback("Prompt rewrite loaded into the editor — not saved yet.");
      const next = new URLSearchParams(searchParams);
      next.set("mode", "edit-prompt");
      setSearchParams(next, { replace: true });
      window.requestAnimationFrame(() => {
        const editor = document.getElementById("suggested-fix-prompt");
        editor?.focus();
        editor?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    },
    [searchParams, setSearchParams],
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
      if (action === "needs_more_info") {
        await runAction(
          "Marked as needs more info. Follow-up execution is not automatic yet.",
          () =>
            applyMonitoringDraftDecision(
              detail.draftId!,
              "needs_more_info",
              needsMoreInfoNote || "Owner requested more information.",
            ),
        );
        return;
      }
      if (action === "mark_duplicate") {
        const target = duplicateOfInput.trim();
        if (!target) {
          setFeedback("Enter the duplicate target draft id (draft-<uuid> or uuid).");
          return;
        }
        await runAction("Marked as duplicate. Original rows are retained.", () =>
          applyMonitoringDraftDecision(detail.draftId!, "mark_duplicate", null, {
            duplicateOf: target,
          }),
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
    const text = restoreOriginal ? detail?.originalPrompt ?? "" : promptDraft;
    if (!text.trim()) {
      setPromptError("Prompt text is required.");
      setPromptSaveState("failed");
      return;
    }
    setPromptSaveState("saving");
    setPromptError(null);

    if (detail?.draftId && !detail.findingId) {
      const result = await saveMonitoringDraftFixPrompt(detail.draftId, text);
      if (!result.ok) {
        setPromptError(result.error ?? "Could not save Fix Issue Prompt.");
        setPromptSaveState("failed");
        return;
      }
      setPromptSaveState("saved");
      setFeedback(
        result.message ??
          "Fix Issue Prompt saved on this draft. No code, PR, or deploy was created.",
      );
      setEditingPrompt(false);
      const next = new URLSearchParams(searchParams);
      next.delete("mode");
      setSearchParams(next, { replace: true });
      await loadDetail();
      return;
    }

    if (!detail?.findingId) {
      setPromptError("No draft or issue id is available to save this prompt.");
      setPromptSaveState("failed");
      return;
    }

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

  // ── E-A6 — Fix with Cursor workflow ────────────────────────────────────────

  const pageCheckedUrl = useMemo(() => stagingPageUrl(detail?.route), [detail?.route]);

  const artifactNoteForPrompt =
    detail && detail.storageArtifacts.length > 0
      ? `Storage artifacts (owner-only signed links on the issue page): ${detail.storageArtifacts
          .map((artifact) => artifact.path)
          .join(", ")}`
      : null;

  const buildHandoffPrompt = useCallback((): string => {
    const current = (editingPrompt ? promptDraft : detail?.promptText ?? "").trim();
    if (isStructuredFixPrompt(current)) return current;
    if (!detail) return current;
    return buildStructuredFixIssuePrompt({
      title: detail.title,
      agentName,
      agentSlug: detail.agentSlug,
      route: detail.route,
      module: detail.module,
      createdAt: detail.createdAt,
      runId: detail.runId,
      severity: detail.severity,
      explanation: detail.explanationDisplay,
      evidenceSummary: detail.evidenceSummary,
      rawObservations: detail.rawObservations,
      artifactNote: artifactNoteForPrompt,
      ownerNotes: current || null,
    });
  }, [agentName, artifactNoteForPrompt, detail, editingPrompt, promptDraft]);

  const insertStructuredTemplate = () => {
    if (!detail) return;
    const template = buildStructuredFixIssuePrompt({
      title: detail.title,
      agentName,
      agentSlug: detail.agentSlug,
      route: detail.route,
      module: detail.module,
      createdAt: detail.createdAt,
      runId: detail.runId,
      severity: detail.severity,
      explanation: detail.explanationDisplay,
      evidenceSummary: detail.evidenceSummary,
      rawObservations: detail.rawObservations,
      artifactNote: artifactNoteForPrompt,
      ownerNotes: (editingPrompt ? promptDraft : detail.promptText ?? "").trim() || null,
    });
    setPromptDraft(template);
    setEditingPrompt(true);
    setPromptSaveState("dirty");
    setPromptError(null);
    setFeedback("Structured template loaded into the editor — review and save.");
  };

  const downloadPromptFile = (text: string) => {
    const safeCode = (detail?.issueCode ?? detail?.draftId ?? "issue").replace(
      /[^a-zA-Z0-9_-]/g,
      "-",
    );
    const blob = new Blob([text], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `agentops-fix-${safeCode}.md`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  const canMarkFixing =
    detail?.source === "draft" &&
    Boolean(detail?.draftId) &&
    detail?.ownerStatus !== "fixing" &&
    detail?.ownerStatus !== "fixed" &&
    detail?.ownerStatus !== "deleted";

  // ── E-A7 — local Cursor bridge detection ──────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    setBridgeState("checking");
    void probeCursorBridge().then((health) => {
      if (cancelled) return;
      setBridgeState(health.online ? "online" : "offline");
      setBridgeCliAvailable(health.cursorCliAvailable);
    });
    return () => {
      cancelled = true;
    };
  }, [params.issueCode]);

  const markFixingAfterHandoff = async (message: string) => {
    if (!detail) return;
    if (canMarkFixing && detail.draftId) {
      const result = await applyMonitoringDraftDecision(detail.draftId, "mark_fixing");
      if (!result.ok) {
        setHandoffFeedback(result.error ?? "Could not mark this issue as Fixing.");
        return;
      }
      setHandoffFeedback(`${message} Status is now Fixing. Mark as fixed after you verify the fix on staging.`);
      await loadDetail();
      return;
    }
    setHandoffFeedback(message);
  };

  const fixWithCursor = async () => {
    if (!detail) return;
    setHandoffFeedback(null);
    setShowBridgeHelp(false);
    const prompt = buildHandoffPrompt();
    if (!prompt.trim()) {
      setHandoffFeedback("No Fix Issue Prompt is available yet — edit the prompt first.");
      return;
    }

    if (bridgeState === "online") {
      // Bridge path: no download dialog — the bridge writes the prompt file locally.
      const issueId = (detail.issueCode ?? detail.draftId ?? detail.findingId ?? "issue")
        .replace(/[^a-zA-Z0-9_-]/g, "-")
        .slice(0, 80);
      const token = bridgeTokenInput.trim() || readStoredBridgeToken();
      const result = await sendFixIssueToBridge({
        issueId,
        issueTitle: detail.title,
        prompt,
        token,
      });
      if (result.needsToken) {
        setBridgeNeedsToken(true);
        setShowBridgeHelp(true);
        setHandoffFeedback(
          "Local bridge connected, but it needs the bridge token. Paste the token printed by npm run agentops:cursor-bridge.",
        );
        return;
      }
      if (!result.accepted) {
        setShowBridgeHelp(true);
        setHandoffFeedback(result.error ?? "Local bridge rejected the request.");
        return;
      }
      if (bridgeTokenInput.trim()) {
        storeBridgeToken(bridgeTokenInput);
        setBridgeTokenInput("");
        setBridgeNeedsToken(false);
      }
      const message = result.cursorLaunched
        ? "Cursor opened with this fix prompt."
        : `Prompt file written locally (${result.promptFile ?? ".agentops/fix-prompts"}) — waiting for owner/Cursor work.`;
      await markFixingAfterHandoff(message);
      return;
    }

    // Bridge offline: honest fallback — no automatic download dialog.
    setShowBridgeHelp(true);
    setHandoffFeedback(
      "Local Cursor bridge is not running. Start it once, or use Download prompt / Copy prompt below.",
    );
  };

  const copyBridgeCommand = async () => {
    try {
      await navigator.clipboard.writeText(CURSOR_BRIDGE_START_COMMAND);
      setHandoffFeedback("Bridge start command copied. Run it in the repo terminal, then retry Fix with Cursor.");
    } catch {
      setHandoffFeedback(`Copy failed — run manually: ${CURSOR_BRIDGE_START_COMMAND}`);
    }
  };

  const copyHandoffPrompt = async () => {
    const prompt = buildHandoffPrompt();
    try {
      await navigator.clipboard.writeText(prompt);
      setHandoffFeedback("Fix prompt copied — open Cursor and paste this prompt.");
    } catch {
      setHandoffFeedback("Could not copy the prompt.");
    }
  };

  const markFixedByOwner = async () => {
    if (!detail) return;
    if (detail.source === "draft" && detail.draftId) {
      await runAction("Marked as Fixed. This issue leaves the active list.", () =>
        applyMonitoringDraftDecision(
          detail.draftId!,
          "mark_fixed",
          markFixedNote.trim() || "Owner verified the fix on staging.",
        ),
      );
    } else if (detail.findingId) {
      await runAction("Marked as Fixed.", () => markAgentOpsFixed(detail.findingId!));
    }
    setConfirmMarkFixed(false);
    setMarkFixedNote("");
  };

  const deleteIssueByOwner = async () => {
    if (!detail) return;
    if (detail.source === "draft" && detail.draftId) {
      await runAction(
        "Issue deleted from the active list. The record is archived for audit.",
        () => applyMonitoringDraftDecision(detail.draftId!, "delete_issue"),
      );
    } else if (detail.findingId) {
      // Promoted issue records have no separate delete — Dismiss keeps the record for audit.
      await runAction(
        "Promoted issue dismissed from the active list. The record is kept for audit.",
        () =>
          detail.ownerStatus === "needs_review"
            ? markAgentOpsFalsePositive(detail.findingId!)
            : rejectAgentOpsFinding(detail.findingId!),
      );
    }
    setConfirmDelete(false);
  };

  const advancedActions = (detail?.validActions ?? []).filter(
    (action) =>
      !["open_agent", "chat_agent", "needs_more_info", "mark_duplicate"].includes(action),
  );
  const hasNeedsMoreInfo = (detail?.validActions ?? []).includes("needs_more_info");
  const hasMarkDuplicate = (detail?.validActions ?? []).includes("mark_duplicate");

  const openSignedArtifact = async (runId: string, artifactPath: string) => {
    setOpeningSignedPath(artifactPath);
    setSignedLinkFeedback(null);
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) {
        setSignedLinkFeedback("Owner session required for signed artifact links.");
        return;
      }
      const url = new URL(MANUAL_RUN_ARTIFACT_URL, window.location.origin);
      url.searchParams.set("runId", runId);
      url.searchParams.set("artifactPath", artifactPath);
      url.searchParams.set("bucket", "agentops-artifacts-staging");
      const response = await fetch(url.toString(), {
        headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        signedUrl?: string;
        expiresIn?: number;
        error?: string;
        note?: string;
      };
      if (!response.ok || !payload.ok || !payload.signedUrl) {
        setSignedLinkFeedback(payload.error ?? "Could not create a signed artifact URL.");
        return;
      }
      setSignedLinkFeedback(
        payload.note ??
          `Signed link opens in a new tab and expires in about ${Math.round((payload.expiresIn ?? 600) / 60)} minutes.`,
      );
      window.open(payload.signedUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      setSignedLinkFeedback(error instanceof Error ? error.message : String(error));
    } finally {
      setOpeningSignedPath(null);
    }
  };

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
            Back to Issues
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
            Back to Issues
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
            <AgentOpsPageHeader
              title={
                detail?.title ||
                (params.issueCode ? decodeURIComponent(params.issueCode) : "Issue detail")
              }
              subtitle="Loading issue…"
            />
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
                  {detail.workSourceLabel ? (
                    <AixiaBadge tone="cyan">{detail.workSourceLabel}</AixiaBadge>
                  ) : null}
                  {detail.likelyShellNoise ? (
                    <AixiaBadge tone="amber">Likely shell noise</AixiaBadge>
                  ) : null}
                </div>
                <AgentOpsPageHeader
                  title={detail.title}
                  subtitle={detail.issueCode ?? detail.draftId ?? "Issue detail"}
                />
                <dl className="grid gap-3 text-sm sm:grid-cols-2" data-testid="agentops-issue-header-meta">
                  <div>
                    <dt className="text-white/45">Reported by</dt>
                    <dd className="text-white/85">
                      {agentHref ? (
                        <Link to={agentHref} className="text-cyan-300/90 hover:text-cyan-200">
                          {agentName}
                        </Link>
                      ) : (
                        agentName
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-white/45">Found</dt>
                    <dd className="text-white/85">{formatDateTime(detail.createdAt)}</dd>
                  </div>
                  <div data-testid="agentops-page-checked">
                    <dt className="text-white/45">Page checked by the agent</dt>
                    <dd className="text-white/85">
                      {pageCheckedUrl ? (
                        <a
                          href={pageCheckedUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="break-all text-cyan-300/90 hover:text-cyan-200"
                        >
                          {pageCheckedUrl}
                        </a>
                      ) : (
                        detail.route ?? detail.module ?? "Route not recorded"
                      )}
                      {detail.module ? (
                        <span className="block text-xs text-white/45">
                          Module: {detail.module}
                        </span>
                      ) : null}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-white/45">Technical source run</dt>
                    <dd className="break-all text-white/85">{detail.runId ?? "—"}</dd>
                  </div>
                </dl>
                <div className="flex flex-wrap gap-2" data-testid="agentops-prime-actions">
                  <AixiaButton
                    variant="primary"
                    disabled={submitting}
                    onClick={() => void fixWithCursor()}
                    data-testid="agentops-fix-with-cursor"
                  >
                    Fix with Cursor
                  </AixiaButton>
                  <AixiaButton
                    variant="secondary"
                    disabled={submitting || detail.ownerStatus === "deleted"}
                    onClick={() => setConfirmDelete(true)}
                    data-testid="agentops-delete-issue"
                  >
                    Delete issue
                  </AixiaButton>
                  <AixiaButton variant="secondary" onClick={() => navigate(backHref)}>
                    Back to Issues
                  </AixiaButton>
                </div>
                <p className="text-xs text-white/45">
                  Fix with Cursor uses the Fix Issue Prompt on staging only. It does not touch
                  production.
                </p>
                <p className="text-xs text-white/45">
                  Delete issue removes this issue from the active list. It does not fix code.
                </p>
                <p className="text-xs" data-testid="agentops-bridge-status">
                  {bridgeState === "checking" ? (
                    <span className="text-white/45">Checking local Cursor bridge…</span>
                  ) : bridgeState === "online" ? (
                    <span className="text-emerald-300/90">
                      Local bridge connected
                      {bridgeCliAvailable ? " · Cursor CLI ready" : " · Cursor CLI not found"}
                    </span>
                  ) : (
                    <span className="text-white/50">
                      Local Cursor bridge is not running. If it is running, allow local network
                      access when Chrome asks.
                    </span>
                  )}
                </p>
                {handoffFeedback ? (
                  <AixiaInfoBlock tone="cyan" title="Cursor handoff">
                    <p className="text-sm text-white/80" data-testid="agentops-handoff-status">
                      {handoffFeedback}
                    </p>
                  </AixiaInfoBlock>
                ) : null}
                {showBridgeHelp ? (
                  <div
                    className="space-y-2 rounded-lg border border-white/10 bg-white/[0.03] p-3"
                    data-testid="agentops-bridge-help"
                  >
                    {bridgeState !== "online" ? (
                      <>
                        <p className="text-sm text-white/80">
                          Start the local bridge once on this computer, then click Fix with Cursor
                          again:
                        </p>
                        <pre className="rounded bg-black/40 p-2 text-xs text-white/80">
                          {CURSOR_BRIDGE_START_COMMAND}
                        </pre>
                      </>
                    ) : null}
                    {bridgeNeedsToken ? (
                      <label className="block space-y-1 text-sm">
                        <span className="text-white/55">
                          Bridge token (printed in the bridge terminal)
                        </span>
                        <input
                          className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white/90"
                          value={bridgeTokenInput}
                          onChange={(event) => setBridgeTokenInput(event.target.value)}
                          placeholder="Paste bridge token"
                          data-testid="agentops-bridge-token-input"
                        />
                      </label>
                    ) : null}
                    <div className="flex flex-wrap gap-2">
                      {bridgeState !== "online" ? (
                        <AixiaButton variant="secondary" onClick={() => void copyBridgeCommand()}>
                          Copy bridge command
                        </AixiaButton>
                      ) : null}
                      {bridgeNeedsToken ? (
                        <AixiaButton
                          variant="primary"
                          disabled={!bridgeTokenInput.trim()}
                          onClick={() => void fixWithCursor()}
                        >
                          Save token and retry
                        </AixiaButton>
                      ) : null}
                      <AixiaButton
                        variant="secondary"
                        onClick={() => downloadPromptFile(buildHandoffPrompt())}
                        data-testid="agentops-download-prompt"
                      >
                        Download prompt
                      </AixiaButton>
                      <AixiaButton variant="secondary" onClick={() => void copyHandoffPrompt()}>
                        Copy prompt
                      </AixiaButton>
                    </div>
                  </div>
                ) : null}
                {confirmDelete ? (
                  <div
                    className="space-y-2 rounded-lg border border-rose-400/30 bg-rose-500/5 p-3"
                    data-testid="agentops-delete-confirm"
                  >
                    <p className="text-sm text-white/85">
                      Delete this issue from the active list? This does not fix code. The record
                      will be archived for audit.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <AixiaButton
                        variant="secondary"
                        disabled={submitting}
                        onClick={() => void deleteIssueByOwner()}
                      >
                        Confirm delete
                      </AixiaButton>
                      <AixiaButton variant="secondary" onClick={() => setConfirmDelete(false)}>
                        Cancel
                      </AixiaButton>
                    </div>
                  </div>
                ) : null}
              </header>

              <OwnerSection title="What happened" id="finding-summary">
                <p className="text-sm leading-relaxed text-white/80">{detail.explanationDisplay}</p>
                {detail.explanationInferred ? (
                  <p className="text-xs text-white/45">
                    Owner-readable summary derived from technical text.
                  </p>
                ) : null}
                <dl className="grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-white/45">Type</dt>
                    <dd className="text-white/85">{detail.typeLabel}</dd>
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
                {detail.artifactNotes.map((note) => (
                  <p key={note} className="text-xs text-white/45">
                    {note}
                  </p>
                ))}
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
                    <dt className="text-white/45">Classification</dt>
                    <dd className="text-white/85">{detail.evidenceClassification ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-white/45">Source run</dt>
                    <dd className="text-white/85">{detail.runId ?? "—"}</dd>
                  </div>
                  {detail.duplicateOf ? (
                    <div className="sm:col-span-2">
                      <dt className="text-white/45">Duplicate of</dt>
                      <dd className="text-white/85">
                        <Link
                          to={`/system/agent-ops/issues/draft-${detail.duplicateOf}`}
                          className="text-cyan-300/90 hover:text-cyan-200"
                        >
                          draft-{detail.duplicateOf}
                        </Link>
                      </dd>
                    </div>
                  ) : null}
                </dl>
                {detail.storageArtifacts.length > 0 ? (
                  <ul className="space-y-2 text-sm" data-testid="agentops-signed-artifacts">
                    {detail.storageArtifacts.map((artifact) => (
                      <li
                        key={artifact.path}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 p-3"
                      >
                        <div>
                          <p className="text-white/85">{artifact.label}</p>
                          <p className="break-all text-xs text-white/45">{artifact.path}</p>
                        </div>
                        <AixiaButton
                          variant="secondary"
                          disabled={openingSignedPath === artifact.path}
                          onClick={() => void openSignedArtifact(artifact.runId, artifact.path)}
                        >
                          {openingSignedPath === artifact.path ? "Signing…" : "Open signed link"}
                        </AixiaButton>
                      </li>
                    ))}
                  </ul>
                ) : null}
                {signedLinkFeedback ? (
                  <p className="text-xs text-white/55" role="status">
                    {signedLinkFeedback}
                  </p>
                ) : null}
                {detail.evidenceLinks.length > 0 ? (
                  <ul className="space-y-2 text-sm">
                    {detail.evidenceLinks.map((file) => (
                      <li key={file.id}>
                        {file.href.startsWith("http") ? (
                          <a
                            href={file.href}
                            className="text-indigo-300 hover:text-indigo-200"
                            title={file.href}
                          >
                            {file.label}
                          </a>
                        ) : (
                          <div>
                            <p className="text-white/80">{file.label}</p>
                            <p className="break-all text-xs text-white/45">
                              Local worker artifact: {file.href}
                            </p>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : detail.storageArtifacts.length === 0 ? (
                  <p className="text-sm text-white/55">
                    No artifact links are available for this issue. The issue was created from text
                    evidence only.
                  </p>
                ) : null}
                {detail.rawObservations.length > 0 ? (
                  <details className="rounded-lg border border-white/10 p-3">
                    <summary className="cursor-pointer text-sm text-white/70">
                      Raw observations ({detail.rawObservations.length})
                    </summary>
                    <ul className="mt-2 space-y-1 text-xs text-white/55">
                      {detail.rawObservations.map((line) => (
                        <li key={line} className="break-all">
                          {line}
                        </li>
                      ))}
                    </ul>
                  </details>
                ) : null}
              </OwnerSection>

              {findingChatIdentity ? (
                <AgentOpsFindingChatCard
                  identity={findingChatIdentity}
                  detail={detail}
                  agentHref={agentHref}
                  continueInAgentChatHref={chatHref}
                  onUsePromptRewrite={applyPromptRewriteToEditor}
                  onOpenAgent={() => {
                    if (agentHref) navigate(agentHref);
                  }}
                  onContinueInAgentChat={() => {
                    if (chatHref) navigate(chatHref);
                  }}
                />
              ) : (
                <OwnerSection title="Finding chat" id="finding-chat-unavailable">
                  <p className="text-sm text-white/60">
                    {reporter.kind === "external"
                      ? `External / imported reporter (${reporter.originalLabel}). Finding Chat is disabled so AiXia does not pretend to be a different agent.`
                      : "Reporting agent identity is unavailable, so finding chat cannot start yet."}
                  </p>
                </OwnerSection>
              )}

              <OwnerSection title="Suggested solution" id="finding-solution">
                <p
                  className="text-sm leading-relaxed text-white/80"
                  data-testid="agentops-suggested-solution"
                >
                  {buildOwnerSuggestedSolution({
                    suggestedSolution: detail.suggestedSolution,
                    route: detail.route,
                    module: detail.module,
                    typeLabel: detail.typeLabel,
                    hasEvidence: Boolean(
                      detail.evidenceSummary?.trim() ||
                        detail.storageArtifacts.length > 0 ||
                        detail.evidenceLinks.length > 0,
                    ),
                    likelyShellNoise: detail.likelyShellNoise,
                  })}
                </p>
                {detail.likelyRootCause ? (
                  <p className="text-xs text-white/50">
                    Likely root cause: {detail.likelyRootCause}
                  </p>
                ) : null}
              </OwnerSection>

              <OwnerSection title="Fix Issue Prompt" id="finding-prompt">
                <p className="text-xs text-white/45">
                  Edit and save a prompt draft for investigating/fixing this issue. Saving does not
                  modify code, create a PR, deploy, or auto-fix.
                  {detail.promptSavedAt
                    ? ` Last saved ${formatDateTime(detail.promptSavedAt)}.`
                    : ""}
                </p>
                {!detail.canSavePrompt ? (
                  <p className="text-xs text-white/45">Prompt editing is unavailable for this item.</p>
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
                    Fix Issue Prompt
                    {detail.promptSource !== "none" ? ` · source: ${detail.promptSource}` : ""}
                  </span>
                  <textarea
                    id="suggested-fix-prompt"
                    data-testid="agentops-fix-issue-prompt"
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
                  {detail.canSavePrompt ? (
                    <AixiaButton
                      variant="secondary"
                      onClick={insertStructuredTemplate}
                      data-testid="agentops-structured-template"
                    >
                      Use structured template
                    </AixiaButton>
                  ) : null}
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
                  Prompt rewrites from chat load into this editor only after you click Use as Fix
                  Issue Prompt. Nothing auto-saves or executes.
                </p>
              </OwnerSection>

              <OwnerSection title="Issue actions" id="finding-decision">
                <p className="text-sm text-white/70">
                  Current status: <span className="text-white">{detail.ownerStatusLabel}</span>
                </p>
                <p className="text-sm text-white/60">Recommended next step: {detail.nextAction}</p>
                <AixiaInfoBlock tone="cyan" title="How this works">
                  Understand the issue, improve the fix prompt, then Fix with Cursor. Cursor works
                  on staging only. After you verify the fix, mark the issue as Fixed. Delete issue
                  removes it from the active list without fixing code.
                </AixiaInfoBlock>
                <div className="flex flex-wrap gap-2">
                  <AixiaButton
                    variant="primary"
                    disabled={submitting}
                    onClick={() => void fixWithCursor()}
                  >
                    Fix with Cursor
                  </AixiaButton>
                  <AixiaButton
                    variant="secondary"
                    disabled={submitting || detail.ownerStatus === "deleted"}
                    onClick={() => setConfirmDelete(true)}
                  >
                    Delete issue
                  </AixiaButton>
                  {detail.ownerStatus === "fixing" ||
                  (detail.source === "draft" &&
                    detail.ownerStatus !== "fixed" &&
                    detail.ownerStatus !== "deleted") ||
                  (detail.source === "finding" &&
                    (detail.ownerStatus === "active" || detail.ownerStatus === "in_progress")) ? (
                    <AixiaButton
                      variant="secondary"
                      disabled={submitting}
                      onClick={() => setConfirmMarkFixed(true)}
                      data-testid="agentops-mark-as-fixed"
                    >
                      Mark as fixed
                    </AixiaButton>
                  ) : null}
                  <AixiaButton variant="secondary" onClick={() => void copyPrompt()}>
                    Copy fix prompt
                  </AixiaButton>
                  <AixiaButton variant="secondary" onClick={() => navigate(backHref)}>
                    Back to Issues
                  </AixiaButton>
                </div>
                {confirmMarkFixed ? (
                  <div
                    className="space-y-2 rounded-lg border border-emerald-400/30 bg-emerald-500/5 p-3"
                    data-testid="agentops-mark-fixed-confirm"
                  >
                    <p className="text-sm text-white/85">
                      Mark this issue as Fixed? Do this only after you verified the fix on staging.
                      The issue leaves the active list; the record is kept.
                    </p>
                    <label className="block space-y-1 text-sm">
                      <span className="text-white/55">Optional note / evidence</span>
                      <textarea
                        className="min-h-[60px] w-full rounded-lg border border-white/10 bg-black/30 p-2 text-sm text-white/90"
                        value={markFixedNote}
                        onChange={(event) => setMarkFixedNote(event.target.value)}
                        placeholder="Example: Verified on staging — issue no longer reproduces after commit abc1234."
                      />
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <AixiaButton
                        variant="primary"
                        disabled={submitting}
                        onClick={() => void markFixedByOwner()}
                      >
                        Confirm mark as fixed
                      </AixiaButton>
                      <AixiaButton
                        variant="secondary"
                        onClick={() => setConfirmMarkFixed(false)}
                      >
                        Cancel
                      </AixiaButton>
                    </div>
                  </div>
                ) : null}

                <AgentOpsAdvancedDisclosure title="Advanced actions">
                  <p className="mb-3 text-xs text-white/50">
                    Workflow controls for special cases. The normal owner path is: understand →
                    improve prompt → Fix with Cursor → verify → Fixed.
                  </p>
                  <ul className="space-y-3" data-testid="agentops-advanced-actions">
                    {advancedActions.map((action) => {
                      const meta = detail.actionMeta.find((item) => item.id === action);
                      return (
                        <li key={action} className="rounded-lg border border-white/10 p-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-sm font-medium text-white">
                              {advancedActionLabel(action)}
                            </p>
                            <AixiaButton
                              variant="secondary"
                              disabled={submitting}
                              onClick={() => void handleOwnerAction(action)}
                            >
                              {advancedActionLabel(action)}
                            </AixiaButton>
                          </div>
                          <p className="mt-2 text-xs text-white/50">{meta?.help}</p>
                        </li>
                      );
                    })}
                    {hasNeedsMoreInfo ? (
                      <li
                        className="space-y-2 rounded-lg border border-white/10 p-3"
                        data-testid="agentops-needs-more-info"
                      >
                        <p className="text-sm font-medium text-white">Needs more info</p>
                        <p className="text-xs text-white/50">
                          Keeps the issue open but moves it out of the normal review queue.
                          Follow-up agent execution is not automatic yet.
                        </p>
                        <label className="block space-y-1 text-sm">
                          <span className="text-white/55">What information do you need?</span>
                          <textarea
                            className="min-h-[80px] w-full rounded-lg border border-white/10 bg-black/30 p-2 text-sm text-white/90"
                            value={needsMoreInfoNote}
                            onChange={(event) => setNeedsMoreInfoNote(event.target.value)}
                            placeholder="Example: Need a screenshot of the failing console error and the exact route steps."
                          />
                        </label>
                        <AixiaButton
                          variant="secondary"
                          disabled={submitting}
                          onClick={() => void handleOwnerAction("needs_more_info")}
                        >
                          Mark needs more info
                        </AixiaButton>
                      </li>
                    ) : null}
                    {hasMarkDuplicate ? (
                      <li
                        className="space-y-2 rounded-lg border border-white/10 p-3"
                        data-testid="agentops-mark-duplicate"
                      >
                        <p className="text-sm font-medium text-white">Mark duplicate</p>
                        <p className="text-xs text-white/50">
                          Use this only when two issue records describe the same problem. Neither
                          row is deleted.
                        </p>
                        <label className="block space-y-1 text-sm">
                          <span className="text-white/55">Duplicate target draft id</span>
                          <input
                            className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white/90"
                            value={duplicateOfInput}
                            onChange={(event) => setDuplicateOfInput(event.target.value)}
                            placeholder="draft-<uuid> or <uuid>"
                          />
                        </label>
                        <AixiaButton
                          variant="secondary"
                          disabled={submitting}
                          onClick={() => void handleOwnerAction("mark_duplicate")}
                        >
                          Mark duplicate
                        </AixiaButton>
                      </li>
                    ) : null}
                    {advancedActions.length === 0 && !hasNeedsMoreInfo && !hasMarkDuplicate ? (
                      <li className="text-sm text-white/55">
                        No workflow actions are available for this status.
                      </li>
                    ) : null}
                  </ul>
                </AgentOpsAdvancedDisclosure>
              </OwnerSection>

              <OwnerSection title="Activity log" id="finding-history">
                <p className="text-xs text-white/50">
                  Records what happened to this issue: when it was created, prompt changes, owner
                  actions, and fix status.
                </p>
                {detail.history.length === 0 ? (
                  <p className="text-sm text-white/60">No activity recorded yet.</p>
                ) : detail.history.length > 6 ? (
                  <details className="rounded-lg border border-white/10 p-3">
                    <summary className="cursor-pointer text-sm text-white/70">
                      Show {detail.history.length} activity entries
                    </summary>
                    <ul className="mt-2 divide-y divide-white/10">
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
                  </details>
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
                {reporter.kind === "alias" ? (
                  <p className="text-xs text-white/45">
                    Stored reporter: {reporter.originalLabel} (mapped to {slug} for display and chat)
                  </p>
                ) : null}
                {reporter.kind === "external" ? (
                  <p className="text-xs text-white/45">
                    Original label: {reporter.originalLabel}. Not treated as a canonical AgentOps agent.
                  </p>
                ) : null}
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
                      Continue in Agent Chat
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

              <OwnerSection title="Links" id="finding-links">
                <ul className="space-y-2 text-sm">
                  <li>
                    <Link className="text-cyan-300 hover:text-cyan-200" to={backHref}>
                      Back to Issues
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
