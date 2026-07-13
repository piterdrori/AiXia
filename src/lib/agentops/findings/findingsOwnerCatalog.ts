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

export type MonitoringDraftApiRow = {
  id: string;
  runId: string;
  githubRunId: string | null;
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
  browserQaEvidence?: Record<string, unknown>;
  suggestedFixPrompt?: string | null;
  promotedIssueId?: string | null;
  issueDisplayCode?: string | null;
  createdAt: string;
  updatedAt?: string;
};

export type FindingsCatalogLoadResult = {
  items: CanonicalFindingView[];
  draftsError: string | null;
  findingsError: string | null;
  /** True when both primary sources failed — summary must show Unavailable. */
  allSourcesUnavailable: boolean;
};

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
  limit = 50,
): Promise<{ data: MonitoringDraftApiRow[]; error: string | null }> {
  try {
    const response = await fetch(`/api/agentops/monitoring/drafts?limit=${limit}`);
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

export async function loadFindingsOwnerCatalog(): Promise<FindingsCatalogLoadResult> {
  const [draftsResult, findingsResult] = await Promise.all([
    fetchMonitoringDrafts(50),
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
): Promise<{ ok: boolean; error: string | null }> {
  try {
    const response = await fetch("/api/agentops/monitoring/drafts/decision", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ draftId, decision, ownerId: "owner" }),
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
    const response = await fetch("/api/agentops/monitoring/drafts/promote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ draftId, ownerId: "owner" }),
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
