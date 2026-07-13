/**
 * AgentOps Findings lifecycle — owner-facing type/status/tab model.
 * Read-only mappers over existing stored draft + finding states. No DB writes.
 */

export type OwnerFindingType = "issue" | "improvement" | "feature";

export type OwnerFindingStatus =
  | "needs_review"
  | "approved"
  | "active"
  | "in_progress"
  | "fixed"
  | "waiting_for_verification"
  | "verified"
  | "deferred"
  | "rejected"
  | "duplicate"
  | "archived"
  | "unknown";

export type FindingsTabId =
  | "needs-review"
  | "active"
  | "improvements"
  | "new-features"
  | "verification"
  | "fixed"
  | "deferred"
  | "rejected"
  | "all";

export const FINDINGS_TABS: Array<{ id: FindingsTabId; label: string }> = [
  { id: "needs-review", label: "Needs review" },
  { id: "active", label: "Active" },
  { id: "improvements", label: "Improvements" },
  { id: "new-features", label: "New features" },
  { id: "verification", label: "Verification" },
  { id: "fixed", label: "Fixed" },
  { id: "deferred", label: "Deferred" },
  { id: "rejected", label: "Rejected" },
  { id: "all", label: "All" },
];

export const OWNER_FINDING_STATUS_LABEL: Record<OwnerFindingStatus, string> = {
  needs_review: "Needs review",
  approved: "Approved",
  active: "Active",
  in_progress: "In progress",
  fixed: "Fixed",
  waiting_for_verification: "Waiting for verification",
  verified: "Verified",
  deferred: "Deferred",
  rejected: "Rejected",
  duplicate: "Duplicate",
  archived: "Archived",
  unknown: "Unknown",
};

/** Map stored categories / draft issue_type into Issue / Improvement / New feature. */
export function mapOwnerFindingType(raw: string | null | undefined): OwnerFindingType {
  const value = (raw ?? "").trim().toLowerCase();
  if (!value) return "issue";
  if (
    value.includes("feature") ||
    value === "new_feature" ||
    value === "feature_idea" ||
    value === "new feature"
  ) {
    return "feature";
  }
  if (value.includes("improvement") || value === "enhance" || value === "enhancement") {
    return "improvement";
  }
  // error / bug / issue / functional / design / technical / etc. → Issue
  return "issue";
}

export function ownerFindingTypeLabel(type: OwnerFindingType): string {
  if (type === "improvement") return "Improvement";
  if (type === "feature") return "New feature";
  return "Issue";
}

/** Map monitoring draft status → owner status (or null when draft is superseded by promotion). */
export function mapDraftOwnerStatus(status: string | null | undefined): OwnerFindingStatus | "superseded" {
  switch ((status ?? "").trim().toLowerCase()) {
    case "draft":
      return "needs_review";
    case "owner_approved":
      return "approved";
    case "promoted":
      return "superseded";
    case "rejected":
      return "rejected";
    case "deferred":
      return "deferred";
    default:
      return "unknown";
  }
}

/** Map agentops_findings.status → owner status. */
export function mapFindingOwnerStatus(status: string | null | undefined): OwnerFindingStatus {
  switch ((status ?? "").trim()) {
    case "New":
    case "Backlog":
      return "needs_review";
    case "Owner Reviewed":
    case "Approved for Fix":
      return "approved";
    case "Active Top 10":
      return "active";
    case "In Progress":
    case "Still Broken":
    case "Needs Follow-Up Fix":
      return "in_progress";
    case "Marked Fixed by Piter":
      // Fixed by owner; still distinguishable from Verified in the Fixed tab.
      return "fixed";
    case "Verification Running":
    case "Verification Blocked":
      return "waiting_for_verification";
    case "Verified Fixed":
      return "verified";
    case "Deferred":
      return "deferred";
    case "Rejected":
    case "False Positive":
      return "rejected";
    case "Archived":
      return "archived";
    default:
      return "unknown";
  }
}

export type CanonicalFindingSource = "draft" | "finding";

export type CanonicalFindingInput = {
  source: CanonicalFindingSource;
  id: string;
  title: string;
  summary?: string | null;
  typeRaw?: string | null;
  statusRaw: string;
  severity?: string | null;
  confidence?: number | string | null;
  agentSlug?: string | null;
  supportingAgentSlugs?: string[];
  route?: string | null;
  module?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  issueCode?: string | null;
  promotedIssueId?: string | null;
  duplicateKey?: string | null;
  findingId?: string | null;
  draftId?: string | null;
};

export type CanonicalFindingView = {
  key: string;
  source: CanonicalFindingSource;
  type: OwnerFindingType;
  ownerStatus: OwnerFindingStatus;
  ownerStatusLabel: string;
  title: string;
  summary: string;
  severity: string | null;
  confidence: string | null;
  agentSlug: string | null;
  supportingAgentSlugs: string[];
  route: string | null;
  module: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  issueCode: string | null;
  promotedIssueId: string | null;
  duplicateKey: string | null;
  findingId: string | null;
  draftId: string | null;
  statusRaw: string;
  nextAction: string;
  openPath: string | null;
};

function normalizeConfidence(value: number | string | null | undefined): string | null {
  if (value == null || value === "") return null;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return null;
    return value <= 1 ? `${Math.round(value * 100)}%` : String(value);
  }
  return String(value);
}

export function buildCanonicalFindingKey(input: CanonicalFindingInput): string {
  if (input.promotedIssueId?.trim()) return `promoted:${input.promotedIssueId.trim()}`;
  if (input.issueCode?.trim()) return `code:${input.issueCode.trim().toLowerCase()}`;
  if (input.draftId?.trim() && input.source === "draft") return `draft:${input.draftId.trim()}`;
  if (input.findingId?.trim()) return `finding:${input.findingId.trim()}`;
  if (input.duplicateKey?.trim()) return `dup:${input.duplicateKey.trim()}`;
  return `${input.source}:${input.id}`;
}

export function nextOwnerActionFor(
  status: OwnerFindingStatus,
  source: CanonicalFindingSource,
): string {
  if (status === "needs_review") return "Approve, defer, or reject this finding.";
  if (status === "approved" && source === "draft") return "Promote to an active issue when ready.";
  if (status === "waiting_for_verification") return "Review verification evidence.";
  if (status === "verified" || status === "fixed") return "Open finding for history.";
  if (status === "deferred") return "Re-open later if still relevant.";
  if (status === "rejected") return "No action required.";
  if (status === "active" || status === "in_progress" || status === "approved") {
    return "Open issue to continue work.";
  }
  return "Open finding for details.";
}

export function toCanonicalFindingView(input: CanonicalFindingInput): CanonicalFindingView | null {
  const draftStatus =
    input.source === "draft" ? mapDraftOwnerStatus(input.statusRaw) : null;
  if (draftStatus === "superseded") return null;

  const ownerStatus =
    input.source === "draft"
      ? (draftStatus as OwnerFindingStatus)
      : mapFindingOwnerStatus(input.statusRaw);

  const type = mapOwnerFindingType(input.typeRaw);
  const issueCode = input.issueCode?.trim() || null;
  const openPath =
    issueCode != null
      ? `/system/agent-ops/issues/${encodeURIComponent(issueCode)}`
      : input.draftId
        ? null
        : null;

  return {
    key: buildCanonicalFindingKey(input),
    source: input.source,
    type,
    ownerStatus,
    ownerStatusLabel: OWNER_FINDING_STATUS_LABEL[ownerStatus],
    title: input.title.trim() || "Untitled finding",
    summary: (input.summary ?? "").trim(),
    severity: input.severity?.trim() || null,
    confidence: normalizeConfidence(input.confidence),
    agentSlug: input.agentSlug?.trim() || null,
    supportingAgentSlugs: (input.supportingAgentSlugs ?? [])
      .map((slug) => slug.trim())
      .filter(Boolean),
    route: input.route?.trim() || null,
    module: input.module?.trim() || null,
    createdAt: input.createdAt ?? null,
    updatedAt: input.updatedAt ?? null,
    issueCode,
    promotedIssueId: input.promotedIssueId?.trim() || null,
    duplicateKey: input.duplicateKey?.trim() || null,
    findingId: input.findingId?.trim() || (input.source === "finding" ? input.id : null),
    draftId: input.draftId?.trim() || (input.source === "draft" ? input.id : null),
    statusRaw: input.statusRaw,
    nextAction: nextOwnerActionFor(ownerStatus, input.source),
    openPath,
  };
}

/**
 * Deduplicate canonical findings. Prefer finding rows over drafts for the same key.
 * Promoted drafts that map to a finding are dropped via superseded mapping.
 */
export function dedupeCanonicalFindings(items: CanonicalFindingView[]): CanonicalFindingView[] {
  const byKey = new Map<string, CanonicalFindingView>();
  for (const item of items) {
    const existing = byKey.get(item.key);
    if (!existing) {
      byKey.set(item.key, item);
      continue;
    }
    // Prefer finding over draft; otherwise prefer newer updatedAt.
    const preferIncoming =
      (existing.source === "draft" && item.source === "finding") ||
      (existing.source === item.source &&
        (item.updatedAt ?? item.createdAt ?? "") > (existing.updatedAt ?? existing.createdAt ?? ""));
    if (preferIncoming) byKey.set(item.key, item);
  }
  return [...byKey.values()].sort((a, b) => {
    const aTime = a.updatedAt ?? a.createdAt ?? "";
    const bTime = b.updatedAt ?? b.createdAt ?? "";
    return bTime.localeCompare(aTime);
  });
}

export function isNonRejected(status: OwnerFindingStatus): boolean {
  return status !== "rejected" && status !== "duplicate";
}

export function findingMatchesTab(item: CanonicalFindingView, tab: FindingsTabId): boolean {
  switch (tab) {
    case "needs-review":
      return item.ownerStatus === "needs_review";
    case "active":
      return (
        item.type === "issue" &&
        (item.ownerStatus === "active" ||
          item.ownerStatus === "approved" ||
          item.ownerStatus === "in_progress")
      );
    case "improvements":
      return item.type === "improvement" && isNonRejected(item.ownerStatus);
    case "new-features":
      return item.type === "feature" && isNonRejected(item.ownerStatus);
    case "verification":
      return item.ownerStatus === "waiting_for_verification";
    case "fixed":
      return item.ownerStatus === "fixed" || item.ownerStatus === "verified";
    case "deferred":
      return item.ownerStatus === "deferred";
    case "rejected":
      return item.ownerStatus === "rejected" || item.ownerStatus === "duplicate";
    case "all":
      return true;
    default:
      return false;
  }
}

export type FindingsSummaryCounts = {
  needsReview: number | "Unavailable";
  activeIssues: number | "Unavailable";
  improvements: number | "Unavailable";
  newFeatures: number | "Unavailable";
  waitingVerification: number | "Unavailable";
  fixed: number | "Unavailable";
};

export function buildFindingsSummaryCounts(
  items: CanonicalFindingView[] | null,
  sourcesUnavailable: boolean,
): FindingsSummaryCounts {
  if (sourcesUnavailable || items == null) {
    return {
      needsReview: "Unavailable",
      activeIssues: "Unavailable",
      improvements: "Unavailable",
      newFeatures: "Unavailable",
      waitingVerification: "Unavailable",
      fixed: "Unavailable",
    };
  }
  return {
    needsReview: items.filter((item) => findingMatchesTab(item, "needs-review")).length,
    activeIssues: items.filter((item) => findingMatchesTab(item, "active")).length,
    improvements: items.filter((item) => findingMatchesTab(item, "improvements")).length,
    newFeatures: items.filter((item) => findingMatchesTab(item, "new-features")).length,
    waitingVerification: items.filter((item) => findingMatchesTab(item, "verification")).length,
    fixed: items.filter((item) => findingMatchesTab(item, "fixed")).length,
  };
}

export function parseFindingsTab(raw: string | null | undefined): FindingsTabId {
  const value = (raw ?? "").trim().toLowerCase();
  const match = FINDINGS_TABS.find((tab) => tab.id === value);
  if (match) return match.id;
  // Legacy aliases from Phase A/B UI
  if (value === "needs_review") return "needs-review";
  if (value === "features") return "new-features";
  if (value === "completed") return "fixed";
  return "needs-review";
}

export function findingMatchesSearch(item: CanonicalFindingView, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = [
    item.title,
    item.summary,
    item.route,
    item.module,
    item.agentSlug,
    item.issueCode,
    item.ownerStatusLabel,
    ownerFindingTypeLabel(item.type),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(q);
}

export type FindingsFilterState = {
  agent?: string | null;
  type?: OwnerFindingType | null;
  priority?: string | null;
  route?: string | null;
  status?: OwnerFindingStatus | null;
  /** Rolling window, e.g. "7d" | "30d" | "90d". */
  date?: string | null;
  q?: string | null;
};

function agentSlugMatches(itemSlug: string | null, filterAgent: string): boolean {
  const needle = filterAgent.trim().toLowerCase();
  if (!needle) return true;
  const slug = (itemSlug ?? "").trim().toLowerCase();
  if (!slug) return false;
  return (
    slug === needle ||
    slug.endsWith(`.${needle}`) ||
    slug.includes(needle) ||
    needle.includes(slug)
  );
}

export function applyFindingsFilters(
  items: CanonicalFindingView[],
  filters: FindingsFilterState,
): CanonicalFindingView[] {
  return items.filter((item) => {
    if (filters.agent && !agentSlugMatches(item.agentSlug, filters.agent)) return false;
    if (filters.type && item.type !== filters.type) return false;
    if (filters.priority && (item.severity ?? "").toLowerCase() !== filters.priority.toLowerCase()) {
      return false;
    }
    if (filters.route) {
      const routeNeedle = filters.route.toLowerCase();
      const routeHay = `${item.route ?? ""} ${item.module ?? ""}`.toLowerCase();
      if (!routeHay.includes(routeNeedle)) return false;
    }
    if (filters.status && item.ownerStatus !== filters.status) return false;
    if (filters.q && !findingMatchesSearch(item, filters.q)) return false;
    if (filters.date) {
      const days = Number.parseInt(filters.date.replace(/d$/i, ""), 10);
      if (Number.isFinite(days) && days > 0) {
        const stamp = Date.parse(item.updatedAt ?? item.createdAt ?? "");
        if (!Number.isFinite(stamp)) return false;
        const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
        if (stamp < cutoff) return false;
      }
    }
    return true;
  });
}
