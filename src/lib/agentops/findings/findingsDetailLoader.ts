/**
 * Canonical finding-detail loader (Phase D).
 * Resolves issue codes, finding ids, and draft ids into one owner detail view.
 */

import {
  getAgentOpsFindingById,
  getAgentOpsFindingByIssueCode,
  getAgentOpsFindingDetail,
  type AgentOpsFinding,
  type AgentOpsFindingDetail,
  type AgentOpsOwnerFeedback,
  type AgentOpsPromptLibraryEntry,
  type AgentOpsVerification,
} from "@/lib/agentops";
import {
  applyMonitoringDraftDecision,
  fetchMonitoringDrafts,
  mapDraftToCanonical,
  promoteMonitoringDraft,
  type MonitoringDraftApiRow,
} from "@/lib/agentops/findings/findingsOwnerCatalog";
import {
  actionHelp,
  actionLabel,
  buildWhyItMatters,
  inspectPromptSafety,
  mapFeedbackToHistoryLabel,
  mapOwnerStatusFromSources,
  metaString,
  ownerReadableExplanation,
  resolveSuggestedFixPrompt,
  typeAndStatusLabels,
  validOwnerActionsFor,
  type HistoryEvent,
  type OwnerDetailAction,
  type PromptSourceField,
} from "@/lib/agentops/findings/findingsDetailModel";
import {
  mapOwnerFindingType,
  type CanonicalFindingSource,
  type OwnerFindingStatus,
  type OwnerFindingType,
} from "@/lib/agentops/findings/findingsLifecycleModel";

export type CanonicalFindingDetailView = {
  source: CanonicalFindingSource;
  type: OwnerFindingType;
  typeLabel: string;
  ownerStatus: OwnerFindingStatus;
  ownerStatusLabel: string;
  statusRaw: string;
  title: string;
  explanationDisplay: string;
  explanationTechnical: string | null;
  explanationInferred: boolean;
  whyItMatters: Array<{ label: string; text: string; inferred: boolean }>;
  evidenceSummary: string | null;
  expectedResult: string | null;
  actualResult: string | null;
  route: string | null;
  module: string | null;
  severity: string | null;
  confidence: string | null;
  agentSlug: string | null;
  supportingAgentSlugs: string[];
  createdAt: string | null;
  updatedAt: string | null;
  issueCode: string | null;
  findingId: string | null;
  draftId: string | null;
  promotedIssueId: string | null;
  duplicateKey: string | null;
  runId: string | null;
  suggestedSolution: string | null;
  likelyRootCause: string | null;
  promptText: string | null;
  originalPrompt: string | null;
  promptSource: PromptSourceField;
  promptSafetyHits: ReturnType<typeof inspectPromptSafety>;
  canSavePrompt: boolean;
  validActions: OwnerDetailAction[];
  actionMeta: Array<{ id: OwnerDetailAction; label: string; help: string }>;
  history: HistoryEvent[];
  evidenceLinks: Array<{ id: string; label: string; href: string }>;
  pendingVerificationId: string | null;
  technical: Record<string, unknown>;
  nextAction: string;
};

export type FindingDetailLoadResult = {
  detail: CanonicalFindingDetailView | null;
  notFound: boolean;
  error: string | null;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function decodeRouteParam(value: string | undefined): string {
  if (!value) return "";
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function parseRouteKey(raw: string): {
  kind: "issue_code" | "finding_id" | "draft_id";
  value: string;
} {
  const value = raw.trim();
  if (value.toLowerCase().startsWith("draft-")) {
    return { kind: "draft_id", value: value.slice(6) };
  }
  if (value.toLowerCase().startsWith("draft:")) {
    return { kind: "draft_id", value: value.slice(6) };
  }
  if (UUID_RE.test(value)) {
    // Prefer finding id first; draft fallback handled by loader.
    return { kind: "finding_id", value };
  }
  return { kind: "issue_code", value };
}

function confidenceLabel(value: unknown, severity: string | null): string | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value <= 1 ? `${Math.round(value * 100)}%` : String(value);
  }
  if (typeof value === "string" && value.trim()) return value.trim();
  return severity;
}

function supportingFromMeta(metadata: Record<string, unknown> | null | undefined): string[] {
  const raw = metadata?.supporting_agents ?? metadata?.supportingAgents;
  if (!Array.isArray(raw)) return [];
  return raw.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function latestApprovedPrompt(
  prompts: AgentOpsPromptLibraryEntry[] | undefined,
): string | null {
  const approved = (prompts ?? []).filter(
    (entry) =>
      entry.approved_by_owner &&
      (entry.prompt_type === "fix" || entry.prompt_type === "implementation") &&
      entry.prompt_text.trim(),
  );
  if (approved.length === 0) return null;
  return approved.sort((a, b) => b.created_at.localeCompare(a.created_at))[0]?.prompt_text ?? null;
}

function pendingVerificationId(verifications: AgentOpsVerification[] | undefined): string | null {
  const pending = (verifications ?? []).find((item) =>
    ["pending", "running"].includes(item.verification_status),
  );
  return pending?.id ?? null;
}

function buildHistory(input: {
  createdAt: string | null;
  updatedAt: string | null;
  feedback: AgentOpsOwnerFeedback[];
}): HistoryEvent[] {
  const events: HistoryEvent[] = [];
  if (input.createdAt) {
    events.push({
      id: `created-${input.createdAt}`,
      at: input.createdAt,
      actor: "System",
      label: "Finding created",
      note: null,
    });
  }
  for (const entry of input.feedback) {
    events.push({
      id: entry.id,
      at: entry.created_at,
      actor: "Owner",
      label: mapFeedbackToHistoryLabel(entry.feedback_type, entry.metadata),
      note: entry.remark,
    });
  }
  if (input.updatedAt && input.updatedAt !== input.createdAt) {
    events.push({
      id: `updated-${input.updatedAt}`,
      at: input.updatedAt,
      actor: "System",
      label: "Updated",
      note: null,
    });
  }
  return events.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}

function fromFinding(
  finding: AgentOpsFinding,
  detail: AgentOpsFindingDetail | null,
): CanonicalFindingDetailView {
  const type = mapOwnerFindingType(
    metaString(finding.metadata, "issue_type") ??
      metaString(finding.metadata, "finding_type") ??
      finding.category,
  );
  const ownerStatus = mapOwnerStatusFromSources({
    source: "finding",
    statusRaw: finding.status,
  });
  const labels = typeAndStatusLabels(type, ownerStatus);
  const explanation = ownerReadableExplanation(finding.problem);
  const promptLibraryText = latestApprovedPrompt(detail?.prompts);
  const prompt = resolveSuggestedFixPrompt({
    ownerEditedPrompt: metaString(finding.metadata, "owner_edited_prompt"),
    promptLibraryText,
    cursorPrompt: finding.cursor_prompt,
    suggestedFixPrompt: metaString(finding.metadata, "suggested_fix_prompt"),
    remediationPrompt: metaString(finding.metadata, "remediation_prompt"),
    implementationPrompt: metaString(finding.metadata, "implementation_prompt"),
  });
  const pendingId = pendingVerificationId(detail?.verifications);
  const actions = validOwnerActionsFor({
    source: "finding",
    ownerStatus,
    hasFindingId: true,
    hasDraftId: false,
    hasPendingVerification: Boolean(pendingId),
  });

  return {
    source: "finding",
    type,
    typeLabel: labels.typeLabel,
    ownerStatus,
    ownerStatusLabel: labels.statusLabel,
    statusRaw: finding.status,
    title: finding.title,
    explanationDisplay: explanation.display,
    explanationTechnical: explanation.technical,
    explanationInferred: explanation.inferred,
    whyItMatters: buildWhyItMatters({
      saas: finding.saas_impact,
      aiMcp: finding.ai_mcp_impact,
      personalAi: finding.personal_ai_impact,
      hr: finding.hr_impact,
      security: finding.security_impact,
      problem: finding.problem,
      severity: finding.severity,
    }),
    evidenceSummary: finding.evidence_summary,
    expectedResult: finding.expected_result,
    actualResult: finding.actual_result,
    route: finding.route,
    module: finding.module,
    severity: finding.severity,
    confidence: confidenceLabel(finding.metadata?.confidence, finding.severity),
    agentSlug: finding.agent_id,
    supportingAgentSlugs: supportingFromMeta(finding.metadata),
    createdAt: finding.created_at,
    updatedAt: finding.updated_at,
    issueCode: finding.issue_code,
    findingId: finding.id,
    draftId: metaString(finding.metadata, "source_draft_id"),
    promotedIssueId: finding.id,
    duplicateKey: metaString(finding.metadata, "duplicate_key"),
    runId: finding.run_id,
    suggestedSolution: finding.recommended_fix_strategy,
    likelyRootCause: finding.likely_root_cause,
    promptText: prompt.text,
    originalPrompt:
      metaString(finding.metadata, "original_cursor_prompt") ?? prompt.originalText,
    promptSource: prompt.source,
    promptSafetyHits: inspectPromptSafety(prompt.text ?? ""),
    canSavePrompt: true,
    validActions: actions,
    actionMeta: actions.map((id) => ({ id, label: actionLabel(id), help: actionHelp(id) })),
    history: buildHistory({
      createdAt: finding.created_at,
      updatedAt: finding.updated_at,
      feedback: detail?.ownerFeedback ?? [],
    }),
    evidenceLinks: (detail?.evidenceFiles ?? []).map((file) => ({
      id: file.id,
      label: file.summary ?? file.evidence_type,
      href: file.file_path,
    })),
    pendingVerificationId: pendingId,
    technical: {
      findingId: finding.id,
      issueCode: finding.issue_code,
      runId: finding.run_id,
      queueState: finding.queue_state,
      top10Rank: finding.top10_rank,
      statusRaw: finding.status,
      promptSource: prompt.source,
      duplicateKey: metaString(finding.metadata, "duplicate_key"),
      originalPrompt:
        metaString(finding.metadata, "original_cursor_prompt") ?? finding.cursor_prompt,
      nonChangeRules: finding.non_change_rules,
    },
    nextAction: actionLabel(
      actions.find((action) => !["open_agent", "chat_agent"].includes(action)) ?? "open_agent",
    ),
  };
}

function fromDraft(draft: MonitoringDraftApiRow): CanonicalFindingDetailView | null {
  const canonical = mapDraftToCanonical({
    ...draft,
    suggestedFixPrompt: draft.suggestedFixPrompt,
  } as MonitoringDraftApiRow);
  if (!canonical) return null;

  const explanation = ownerReadableExplanation(draft.summary);
  const prompt = resolveSuggestedFixPrompt({
    suggestedFixPrompt: draft.suggestedFixPrompt ?? null,
  });
  const actions = validOwnerActionsFor({
    source: "draft",
    ownerStatus: canonical.ownerStatus,
    hasFindingId: false,
    hasDraftId: true,
    hasPendingVerification: false,
  });

  const evidenceText =
    typeof draft.browserQaEvidence?.summary === "string"
      ? draft.browserQaEvidence.summary
      : draft.summary;

  return {
    source: "draft",
    type: canonical.type,
    typeLabel: typeAndStatusLabels(canonical.type, canonical.ownerStatus).typeLabel,
    ownerStatus: canonical.ownerStatus,
    ownerStatusLabel: canonical.ownerStatusLabel,
    statusRaw: draft.status,
    title: draft.title,
    explanationDisplay: explanation.display,
    explanationTechnical: explanation.technical,
    explanationInferred: explanation.inferred,
    whyItMatters: buildWhyItMatters({
      problem: draft.summary,
      severity: draft.severity,
    }),
    evidenceSummary: evidenceText,
    expectedResult: null,
    actualResult: null,
    route: draft.route,
    module: draft.module ?? null,
    severity: draft.severity,
    confidence: confidenceLabel(draft.confidence, draft.severity),
    agentSlug: draft.agentSlug,
    supportingAgentSlugs: [],
    createdAt: draft.createdAt,
    updatedAt: draft.updatedAt ?? draft.createdAt,
    issueCode: draft.issueDisplayCode ?? null,
    findingId: null,
    draftId: draft.id,
    promotedIssueId: draft.promotedIssueId ?? null,
    duplicateKey: draft.duplicateKey ?? null,
    runId: draft.runId,
    suggestedSolution: null,
    likelyRootCause: null,
    promptText: prompt.text,
    originalPrompt: prompt.originalText,
    promptSource: prompt.source,
    promptSafetyHits: inspectPromptSafety(prompt.text ?? ""),
    canSavePrompt: false,
    validActions: actions,
    actionMeta: actions.map((id) => ({ id, label: actionLabel(id), help: actionHelp(id) })),
    history: buildHistory({
      createdAt: draft.createdAt,
      updatedAt: draft.updatedAt ?? draft.createdAt,
      feedback: [],
    }),
    evidenceLinks: [],
    pendingVerificationId: null,
    technical: {
      draftId: draft.id,
      runId: draft.runId,
      githubRunId: draft.githubRunId,
      statusRaw: draft.status,
      duplicateKey: draft.duplicateKey,
      promotedIssueId: draft.promotedIssueId,
      suggestedFixPrompt: draft.suggestedFixPrompt,
    },
    nextAction: canonical.nextAction,
  };
}

async function loadDraftById(draftId: string): Promise<MonitoringDraftApiRow | null> {
  const listed = await fetchMonitoringDrafts(50);
  if (listed.error) return null;
  return listed.data.find((draft) => draft.id === draftId) ?? null;
}

export async function loadCanonicalFindingDetail(
  routeParam: string | undefined,
): Promise<FindingDetailLoadResult> {
  const decoded = decodeRouteParam(routeParam);
  if (!decoded) {
    return { detail: null, notFound: true, error: null };
  }

  const key = parseRouteKey(decoded);

  try {
    if (key.kind === "issue_code") {
      const findingResult = await getAgentOpsFindingByIssueCode(key.value);
      if (findingResult.error) {
        return { detail: null, notFound: false, error: findingResult.error };
      }
      if (findingResult.data) {
        const detailResult = await getAgentOpsFindingDetail(findingResult.data.id);
        return {
          detail: fromFinding(findingResult.data, detailResult.data),
          notFound: false,
          error: detailResult.error,
        };
      }
      return { detail: null, notFound: true, error: null };
    }

    if (key.kind === "finding_id") {
      const findingResult = await getAgentOpsFindingById(key.value);
      if (findingResult.error) {
        return { detail: null, notFound: false, error: findingResult.error };
      }
      if (findingResult.data) {
        const detailResult = await getAgentOpsFindingDetail(findingResult.data.id);
        return {
          detail: fromFinding(findingResult.data, detailResult.data),
          notFound: false,
          error: detailResult.error,
        };
      }
      const draft = await loadDraftById(key.value);
      if (draft) {
        const detail = fromDraft(draft);
        return { detail, notFound: !detail, error: null };
      }
      return { detail: null, notFound: true, error: null };
    }

    // draft_id
    const draft = await loadDraftById(key.value);
    if (!draft) return { detail: null, notFound: true, error: null };
    if (draft.promotedIssueId) {
      const findingResult = await getAgentOpsFindingById(draft.promotedIssueId);
      if (findingResult.data) {
        const detailResult = await getAgentOpsFindingDetail(findingResult.data.id);
        return {
          detail: fromFinding(findingResult.data, detailResult.data),
          notFound: false,
          error: detailResult.error,
        };
      }
    }
    const detail = fromDraft(draft);
    return { detail, notFound: !detail, error: null };
  } catch (error) {
    return {
      detail: null,
      notFound: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export {
  applyMonitoringDraftDecision,
  promoteMonitoringDraft,
  decodeRouteParam,
};
