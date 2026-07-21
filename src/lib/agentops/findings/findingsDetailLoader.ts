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
  fetchMonitoringDraftById,
  mapDraftToCanonical,
  promoteMonitoringDraft,
  saveMonitoringDraftFixPrompt,
  type MonitoringDraftApiRow,
} from "@/lib/agentops/findings/findingsOwnerCatalog";
import { classifyLikelyShellNoiseDraft } from "@/lib/agentops/findings/issueDraftNoise";
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
  likelyShellNoise: boolean;
  noiseReason: string | null;
  workSourceLabel: string | null;
  rawObservations: string[];
  promptSavedAt: string | null;
  artifactNotes: string[];
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
    likelyShellNoise: false,
    noiseReason: null,
    workSourceLabel: "Promoted issue",
    rawObservations: [],
    promptSavedAt: metaString(finding.metadata, "fix_prompt_saved_at"),
    artifactNotes: [],
  };
}

function buildInitialFixPrompt(draft: MonitoringDraftApiRow): string {
  return [
    "Fix / investigate this AgentOps staging issue.",
    "",
    `Issue summary: ${draft.title}`,
    `Description: ${draft.summary}`,
    `Reporting agent: ${draft.agentSlug}`,
    `Route / module: ${draft.route ?? "—"} / ${draft.module ?? "—"}`,
    `Severity: ${draft.severity}`,
    `Source run: ${draft.runId}`,
    draft.browserQaEvidence?.evidence
      ? `Evidence: ${String(draft.browserQaEvidence.evidence)}`
      : draft.evidence?.evidence
        ? `Evidence: ${String(draft.evidence.evidence)}`
        : null,
    "",
    "What to inspect:",
    "- Reproduce on staging only",
    "- Confirm whether this is a real product defect or shell/noise",
    "- Identify the owner-readable root cause",
    "",
    "Constraints:",
    "- Staging only — do not touch production",
    "- Do not create a PR, deploy, or auto-fix unless the owner later approves",
    "",
    "Expected output:",
    "- Clear diagnosis",
    "- Minimal safe fix plan for staging",
    "- Verification steps on the affected route",
  ]
    .filter((line): line is string => line != null)
    .join("\n");
}

function extractDraftObservations(draft: MonitoringDraftApiRow): string[] {
  const out: string[] = [];
  const push = (value: unknown) => {
    if (typeof value === "string" && value.trim()) out.push(value.trim());
  };
  push(draft.browserQaEvidence?.evidence);
  push(draft.evidence?.evidence);
  const raw = draft.browserQaEvidence?.rawObservations ?? draft.evidence?.rawObservations;
  if (Array.isArray(raw)) {
    for (const item of raw) push(item);
  }
  return out.slice(0, 12);
}

function extractDraftEvidenceLinks(draft: MonitoringDraftApiRow): Array<{
  id: string;
  label: string;
  href: string;
}> {
  const links: Array<{ id: string; label: string; href: string }> = [];
  const candidates = [
    draft.browserQaEvidence?.screenshot_path,
    draft.browserQaEvidence?.screenshotPath,
    draft.evidence?.screenshotPath,
    draft.evidence?.screenshot_path,
  ];
  candidates.forEach((path, index) => {
    if (typeof path === "string" && path.trim()) {
      links.push({
        id: `local-${index}`,
        label: "Local screenshot / artifact path",
        href: path.trim(),
      });
    }
  });
  return links;
}

function fromDraft(draft: MonitoringDraftApiRow): CanonicalFindingDetailView | null {
  const canonical = mapDraftToCanonical({
    ...draft,
    suggestedFixPrompt: draft.suggestedFixPrompt,
  } as MonitoringDraftApiRow);
  if (!canonical) return null;

  const noise = classifyLikelyShellNoiseDraft({
    title: draft.title,
    summary: draft.summary,
    route: draft.route,
    module: draft.module,
    evidence: draft.evidence,
    browserQaEvidence: draft.browserQaEvidence,
  });

  const explanation = ownerReadableExplanation(draft.summary);
  const initialPrompt = draft.suggestedFixPrompt?.trim()
    ? draft.suggestedFixPrompt
    : buildInitialFixPrompt(draft);
  const prompt = resolveSuggestedFixPrompt({
    suggestedFixPrompt: initialPrompt,
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
      : typeof draft.browserQaEvidence?.evidence === "string"
        ? draft.browserQaEvidence.evidence
        : typeof draft.evidence?.evidence === "string"
          ? draft.evidence.evidence
          : draft.summary;

  const observed =
    typeof draft.browserQaEvidence?.observed === "string"
      ? draft.browserQaEvidence.observed
      : typeof draft.evidence?.observed === "string"
        ? draft.evidence.observed
        : typeof draft.browserQaEvidence?.evidence === "string"
          ? draft.browserQaEvidence.evidence
          : null;
  const expected =
    typeof draft.browserQaEvidence?.expected === "string"
      ? draft.browserQaEvidence.expected
      : typeof draft.evidence?.expected === "string"
        ? draft.evidence.expected
        : null;

  const promptSavedAt =
    typeof draft.evidence?.fix_prompt_saved_at === "string"
      ? draft.evidence.fix_prompt_saved_at
      : null;

  const history = buildHistory({
    createdAt: draft.createdAt,
    updatedAt: draft.updatedAt ?? draft.createdAt,
    feedback: [],
  });
  if (draft.ownerDecisionAt) {
    history.unshift({
      id: `owner-decision-${draft.ownerDecisionAt}`,
      at: draft.ownerDecisionAt,
      actor: "Owner",
      label: `Owner decision: ${draft.status}`,
      note: draft.ownerDecisionBy ? `Actor: ${draft.ownerDecisionBy}` : null,
    });
  }
  if (promptSavedAt) {
    history.unshift({
      id: `prompt-saved-${promptSavedAt}`,
      at: promptSavedAt,
      actor: "Owner",
      label: "Fix Issue Prompt saved",
      note: "Prompt draft only — no code, PR, or deploy.",
    });
  }

  const artifactNotes: string[] = [];
  if (extractDraftEvidenceLinks(draft).length === 0) {
    artifactNotes.push(
      "No signed storage artifact is linked on this draft yet. Local worker paths appear when available.",
    );
  } else {
    artifactNotes.push(
      "Local artifact path shown below. Signed URLs are available for storage-backed runs via the monitoring artifact API (owner-only).",
    );
  }

  return {
    source: "draft",
    type: canonical.type,
    typeLabel: typeAndStatusLabels(canonical.type, canonical.ownerStatus).typeLabel,
    ownerStatus: canonical.ownerStatus,
    ownerStatusLabel: canonical.ownerStatusLabel,
    statusRaw: draft.status,
    title: draft.title,
    explanationDisplay: noise.likelyShellNoise
      ? `${explanation.display} This may be known AgentOps shell noise (calendar/tasks prefetch abort) rather than a product defect.`
      : explanation.display,
    explanationTechnical: explanation.technical,
    explanationInferred: explanation.inferred || noise.likelyShellNoise,
    whyItMatters: [
      ...buildWhyItMatters({
        problem: draft.summary,
        severity: draft.severity,
      }),
      {
        label: "Likely real vs noise",
        text: noise.likelyShellNoise
          ? noise.reason ??
            "Likely shell noise from calendar/tasks HEAD abort on AgentOps routes."
          : "Treat as a real review candidate until evidence says otherwise.",
        inferred: noise.likelyShellNoise,
      },
      {
        label: "What should be checked",
        text: `Confirm the failure on ${draft.route ?? "the reported route"} and whether it still reproduces after a clean reload.`,
        inferred: true,
      },
      {
        label: "Risk if ignored",
        text: noise.likelyShellNoise
          ? "Low — if confirmed shell noise, defer or reject after a quick check."
          : "Medium — unresolved staging defects can block owner trust in agent monitoring.",
        inferred: true,
      },
    ],
    evidenceSummary: evidenceText,
    expectedResult: expected,
    actualResult: observed,
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
    likelyRootCause: noise.likelyShellNoise
      ? "Known app-shell calendar/tasks HEAD abort on AgentOps pages."
      : null,
    promptText: prompt.text,
    originalPrompt: prompt.originalText,
    promptSource: prompt.source,
    promptSafetyHits: inspectPromptSafety(prompt.text ?? ""),
    canSavePrompt: true,
    validActions: actions,
    actionMeta: actions.map((id) => ({ id, label: actionLabel(id), help: actionHelp(id) })),
    history: history.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()),
    evidenceLinks: extractDraftEvidenceLinks(draft),
    pendingVerificationId: null,
    technical: {
      draftId: draft.id,
      runId: draft.runId,
      githubRunId: draft.githubRunId,
      statusRaw: draft.status,
      duplicateKey: draft.duplicateKey,
      promotedIssueId: draft.promotedIssueId,
      suggestedFixPrompt: draft.suggestedFixPrompt,
      source: draft.source,
    },
    nextAction: canonical.nextAction,
    likelyShellNoise: noise.likelyShellNoise,
    noiseReason: noise.reason,
    workSourceLabel: canonical.workSourceLabel,
    rawObservations: extractDraftObservations(draft),
    promptSavedAt,
    artifactNotes,
  };
}

async function loadDraftById(draftId: string): Promise<MonitoringDraftApiRow | null> {
  const result = await fetchMonitoringDraftById(draftId);
  if (result.error || result.notFound) return null;
  return result.data;
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
  fetchMonitoringDraftById,
  promoteMonitoringDraft,
  saveMonitoringDraftFixPrompt,
  decodeRouteParam,
};
