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
import {
  mapDraftStatusWithEvidence,
} from "@/lib/agentops/findings/draftOwnerLifecycle";
import { classifyLikelyShellNoiseDraft } from "@/lib/agentops/findings/issueDraftNoise";
import { supabase } from "@/lib/supabase";
import type { OwnerFindingStatus } from "@/lib/agentops/findings/findingsLifecycleModel";

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
  duplicateOf?: string | null;
};

export type MonitoringDraftOwnerDecision =
  | "owner_approved"
  | "rejected"
  | "deferred"
  | "needs_more_info"
  | "mark_duplicate"
  | "mark_fixing"
  | "mark_fixed"
  | "delete_issue";

export type FindingsCatalogLoadResult = {
  items: CanonicalFindingView[];
  draftsError: string | null;
  findingsError: string | null;
  /** True when both primary sources failed — summary must show Unavailable. */
  allSourcesUnavailable: boolean;
};

async function ownerAuthHeaders(): Promise<HeadersInit> {
  let token = (await supabase.auth.getSession()).data.session?.access_token ?? null;
  if (!token) {
    // Owner gate can resolve slightly before the session token is readable.
    for (let attempt = 0; attempt < 8 && !token; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 200 * (attempt + 1)));
      token = (await supabase.auth.getSession()).data.session?.access_token ?? null;
    }
  }
  if (!token) {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      throw new Error("You must be signed in as AgentOps Owner.");
    }
    token = (await supabase.auth.getSession()).data.session?.access_token ?? null;
  }
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
  const mapped = mapDraftStatusWithEvidence(draft.status, draft.evidence ?? {});
  if (mapped === "superseded") return null;
  const ownerStatusOverride =
    mapped === "needs_more_info" ||
    mapped === "duplicate" ||
    mapped === "fixing" ||
    mapped === "fixed" ||
    mapped === "deleted"
      ? (mapped as OwnerFindingStatus)
      : null;
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
    ownerStatusOverride,
    runId: draft.runId,
    duplicateOf: draft.duplicateOf ?? null,
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
    runId: finding.run_id ?? null,
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

async function withCatalogTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  onTimeout: () => T,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((resolve) => {
        timer = setTimeout(() => resolve(onTimeout()), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export type FindingsCatalogProgress = {
  items: CanonicalFindingView[];
  draftsError: string | null;
  findingsPending: boolean;
};

/**
 * Load Issues catalog. Drafts are awaited first so the list can paint quickly;
 * promoted findings merge afterward (short timeout so they cannot block forever).
 */
export async function loadFindingsOwnerCatalog(options?: {
  onDraftsReady?: (progress: FindingsCatalogProgress) => void;
}): Promise<FindingsCatalogLoadResult> {
  // Start findings in parallel, but do not wait on them before first paint.
  const findingsPromise = withCatalogTimeout(
    listAgentOpsFindingsCatalog(200) as Promise<AgentOpsReadResult<AgentOpsFinding[]>>,
    6_000,
    () => ({
      data: null,
      error: "Promoted findings timed out. Drafts may still be available.",
    }),
  );

  const draftsResult = await withCatalogTimeout(fetchMonitoringDrafts(100), 18_000, () => ({
    data: [] as MonitoringDraftApiRow[],
    error: "Monitoring drafts timed out. Retry.",
  }));

  const draftMapped: CanonicalFindingView[] = [];
  for (const draft of draftsResult.data) {
    const view = mapDraftToCanonical(draft);
    if (view) draftMapped.push(view);
  }
  const draftItems = dedupeCanonicalFindings(draftMapped);
  options?.onDraftsReady?.({
    items: draftItems,
    draftsError: draftsResult.error,
    findingsPending: true,
  });

  const findingsResult = await findingsPromise;
  const mapped = [...draftMapped];
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
  decision: MonitoringDraftOwnerDecision,
  note?: string | null,
  options?: { duplicateOf?: string | null },
): Promise<{ ok: boolean; error: string | null; message?: string | null }> {
  try {
    const headers = await ownerAuthHeaders();
    const response = await fetch("/api/agentops/monitoring/drafts/decision", {
      method: "POST",
      headers,
      body: JSON.stringify({
        draftId,
        decision,
        ...(note?.trim() ? { note: note.trim() } : {}),
        ...(options?.duplicateOf?.trim()
          ? { duplicateOf: options.duplicateOf.trim() }
          : {}),
      }),
    });
    const payload = (await response.json()) as {
      ok?: boolean;
      error?: string;
      message?: string;
    };
    if (!response.ok || !payload.ok) {
      return { ok: false, error: payload.error ?? "Decision failed.", message: null };
    }
    return { ok: true, error: null, message: payload.message ?? null };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
      message: null,
    };
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
