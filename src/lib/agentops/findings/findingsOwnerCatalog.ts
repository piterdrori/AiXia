import {
  listAgentOpsFindingsCatalog,
  type AgentOpsFinding,
  type AgentOpsReadResult,
} from "@/lib/agentops";
import {
  dedupeCanonicalFindings,
  toCanonicalFindingView,
  type CanonicalFindingView,
} from "@/lib/agentops/findings/findingsLifecycleModel";
import { classifyLikelyShellNoiseDraft } from "@/lib/agentops/findings/issueDraftNoise";
import { supabase } from "@/lib/supabase";

function workSourceLabelForDraft(source: string | null | undefined): string {
  const value = (source ?? "").toLowerCase();
  if (value.includes("browser_qa")) return "Browser QA";
  if (value.includes("website_audit")) return "Website audit";
  if (value.includes("daily") || value.includes("scheduled")) return "Scheduled";
  if (value.includes("owner_manual") || value.includes("manual")) return "Manual";
  if (value.includes("monitoring")) return "Monitoring";
  return "Monitoring";
}

function evidenceIndicatorForDraft(draft: MonitoringDraftApiRow): string {
  const bqa = draft.browserQaEvidence ?? {};
  const evidence = draft.evidence ?? {};
  const hasSignedHint =
    evidence.provider === "supabase_storage" ||
    bqa.provider === "supabase_storage" ||
    (Array.isArray(evidence.artifactRefs) && evidence.artifactRefs.length > 0) ||
    (Array.isArray(bqa.artifactRefs) && bqa.artifactRefs.length > 0);
  if (hasSignedHint) return "Signed artifact";
  const hasLocal =
    typeof bqa.screenshot_path === "string" ||
    typeof evidence.screenshotPath === "string" ||
    typeof bqa.evidence === "string" ||
    typeof evidence.evidence === "string";
  if (hasLocal) return "Has evidence";
  if ((draft.summary ?? "").trim()) return "Summary only";
  return "No artifact";
}

export type MonitoringDraftApiRow = {
  id: string;
  runId: string;
  githubRunId: string | null;
  source?: string | null;
  status: string;
  agentSlug: string;
  module?: string | null;
  route: string | null;
  severity: string;
  title: string;
  summary: string;
  issueType?: string | null;
  confidence?: number | null;
  duplicateKey?: string | null;
  evidence?: Record<string, unknown>;
  browserQaEvidence?: Record<string, unknown>;
  suggestedFixPrompt?: string | null;
  promotedIssueId?: string | null;
  issueDisplayCode?: string | null;
  createdAt: string;
  updatedAt?: string;
  ownerDecisionBy?: string | null;
  ownerDecisionAt?: string | null;
};

export type FindingsCatalogLoadResult = {
  items: CanonicalFindingView[];
  draftsError: string | null;
  findingsError: string | null;
  /** True when both primary sources failed — summary must show Unavailable. */
  allSourcesUnavailable: boolean;
};

async function ownerAuthHeaders(): Promise<HeadersInit> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) {
    throw new Error("You must be signed in as AgentOps Owner.");
  }
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

function findingTypeRaw(finding: AgentOpsFinding): string {
  const meta = finding.metadata ?? {};
  if (typeof meta.issue_type === "string") return meta.issue_type;
  if (typeof meta.finding_type === "string") return meta.finding_type;
  if (typeof meta.type === "string") return meta.type;
  return finding.category;
}

function supportingAgentsFromFinding(finding: AgentOpsFinding): string[] {
  const meta = finding.metadata ?? {};
  const raw = meta.supporting_agents ?? meta.supportingAgents;
  if (!Array.isArray(raw)) return [];
  return raw.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

export function mapDraftToCanonical(draft: MonitoringDraftApiRow): CanonicalFindingView | null {
  const noise = classifyLikelyShellNoiseDraft({
    title: draft.title,
    summary: draft.summary,
    route: draft.route,
    module: draft.module,
    evidence: draft.evidence,
    browserQaEvidence: draft.browserQaEvidence,
  });
  return toCanonicalFindingView({
    source: "draft",
    id: draft.id,
    draftId: draft.id,
    title: draft.title,
    summary: draft.summary,
    typeRaw: draft.issueType ?? null,
    statusRaw: draft.status,
    severity: draft.severity,
    confidence: draft.confidence ?? null,
    agentSlug: draft.agentSlug,
    route: draft.route,
    module: draft.module ?? null,
    createdAt: draft.createdAt,
    updatedAt: draft.updatedAt ?? draft.createdAt,
    issueCode: draft.issueDisplayCode ?? null,
    promotedIssueId: draft.promotedIssueId ?? null,
    duplicateKey: draft.duplicateKey ?? null,
    workSourceLabel: workSourceLabelForDraft(draft.source),
    likelyShellNoise: noise.likelyShellNoise,
    evidenceIndicator: evidenceIndicatorForDraft(draft),
  });
}

export function mapFindingToCanonical(finding: AgentOpsFinding): CanonicalFindingView | null {
  return toCanonicalFindingView({
    source: "finding",
    id: finding.id,
    findingId: finding.id,
    title: finding.title,
    summary: finding.evidence_summary ?? finding.problem,
    typeRaw: findingTypeRaw(finding),
    statusRaw: finding.status,
    severity: finding.severity,
    confidence: null,
    agentSlug: finding.agent_id,
    supportingAgentSlugs: supportingAgentsFromFinding(finding),
    route: finding.route,
    module: finding.module,
    createdAt: finding.created_at,
    updatedAt: finding.updated_at,
    issueCode: finding.issue_code,
    promotedIssueId: null,
    duplicateKey:
      typeof finding.metadata?.duplicate_key === "string"
        ? finding.metadata.duplicate_key
        : null,
  });
}

export async function fetchMonitoringDrafts(
  limit = 100,
): Promise<{ data: MonitoringDraftApiRow[]; error: string | null }> {
  try {
    const headers = await ownerAuthHeaders();
    const response = await fetch(`/api/agentops/monitoring/drafts?limit=${limit}`, {
      headers,
    });
    const payload = (await response.json()) as {
      ok?: boolean;
      drafts?: MonitoringDraftApiRow[];
      error?: string;
    };
    if (!response.ok || payload.ok === false) {
      return { data: [], error: payload.error ?? "Could not load monitoring drafts." };
    }
    return { data: payload.drafts ?? [], error: null };
  } catch (error) {
    return {
      data: [],
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function fetchMonitoringDraftById(
  draftId: string,
): Promise<{ data: MonitoringDraftApiRow | null; error: string | null; notFound: boolean }> {
  try {
    const headers = await ownerAuthHeaders();
    const response = await fetch(
      `/api/agentops/monitoring/drafts?id=${encodeURIComponent(draftId)}`,
      { headers },
    );
    const payload = (await response.json()) as {
      ok?: boolean;
      draft?: MonitoringDraftApiRow;
      error?: string;
    };
    if (response.status === 404) {
      return { data: null, error: null, notFound: true };
    }
    if (!response.ok || payload.ok === false) {
      return {
        data: null,
        error: payload.error ?? "Could not load monitoring draft.",
        notFound: false,
      };
    }
    return { data: payload.draft ?? null, error: null, notFound: !payload.draft };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : String(error),
      notFound: false,
    };
  }
}

export async function loadFindingsOwnerCatalog(): Promise<FindingsCatalogLoadResult> {
  const [draftsResult, findingsResult] = await Promise.all([
    fetchMonitoringDrafts(100),
    listAgentOpsFindingsCatalog(200) as Promise<AgentOpsReadResult<AgentOpsFinding[]>>,
  ]);

  const mapped: CanonicalFindingView[] = [];

  for (const draft of draftsResult.data) {
    const view = mapDraftToCanonical(draft);
    if (view) mapped.push(view);
  }

  for (const finding of findingsResult.data ?? []) {
    const view = mapFindingToCanonical(finding);
    if (view) mapped.push(view);
  }

  const items = dedupeCanonicalFindings(mapped);
  const draftsError = draftsResult.error;
  const findingsError = findingsResult.error;
  const allSourcesUnavailable = Boolean(draftsError) && Boolean(findingsError);

  return {
    items: allSourcesUnavailable ? [] : items,
    draftsError,
    findingsError,
    allSourcesUnavailable,
  };
}

export async function applyMonitoringDraftDecision(
  draftId: string,
  decision: "owner_approved" | "rejected" | "deferred",
  note?: string | null,
): Promise<{ ok: boolean; error: string | null }> {
  try {
    const headers = await ownerAuthHeaders();
    const response = await fetch("/api/agentops/monitoring/drafts/decision", {
      method: "POST",
      headers,
      body: JSON.stringify({
        draftId,
        decision,
        ...(note?.trim() ? { note: note.trim() } : {}),
      }),
    });
    const payload = (await response.json()) as { ok?: boolean; error?: string };
    if (!response.ok || !payload.ok) {
      return { ok: false, error: payload.error ?? "Decision failed." };
    }
    return { ok: true, error: null };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export async function promoteMonitoringDraft(
  draftId: string,
): Promise<{ ok: boolean; error: string | null; issueDisplayCode?: string | null }> {
  try {
    const headers = await ownerAuthHeaders();
    const response = await fetch("/api/agentops/monitoring/drafts/promote", {
      method: "POST",
      headers,
      body: JSON.stringify({ draftId }),
    });
    const payload = (await response.json()) as {
      ok?: boolean;
      error?: string;
      issueDisplayCode?: string;
    };
    if (!response.ok || !payload.ok) {
      return { ok: false, error: payload.error ?? "Promotion failed." };
    }
    return { ok: true, error: null, issueDisplayCode: payload.issueDisplayCode ?? null };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export async function saveMonitoringDraftFixPrompt(
  draftId: string,
  promptText: string,
): Promise<{ ok: boolean; error: string | null; savedAt?: string | null; message?: string | null }> {
  try {
    const headers = await ownerAuthHeaders();
    const response = await fetch("/api/agentops/monitoring/drafts/prompt", {
      method: "POST",
      headers,
      body: JSON.stringify({ draftId, promptText }),
    });
    const payload = (await response.json()) as {
      ok?: boolean;
      error?: string;
      savedAt?: string;
      message?: string;
    };
    if (!response.ok || !payload.ok) {
      return { ok: false, error: payload.error ?? "Could not save Fix Issue Prompt." };
    }
    return {
      ok: true,
      error: null,
      savedAt: payload.savedAt ?? null,
      message: payload.message ?? null,
    };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}
