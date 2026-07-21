/**
 * E-A2 — owner lifecycle overlays on monitoring drafts.
 * DB status stays within draft|owner_approved|rejected|deferred|promoted.
 * needs_more_info / marked_duplicate are stored as deferred + evidence metadata.
 */

export type DraftOwnerDecisionKind =
  | "owner_approved"
  | "rejected"
  | "deferred"
  | "needs_more_info"
  | "marked_duplicate"
  | "save_fix_prompt"
  | "promote";

export type DraftOwnerActionHistoryEntry = {
  action: DraftOwnerDecisionKind | string;
  previousStatus: string;
  newStatus: string;
  ownerId?: string | null;
  ownerEmail?: string | null;
  at: string;
  note?: string | null;
  runId?: string | null;
  agentSlug?: string | null;
  duplicateOf?: string | null;
};

export function readOwnerDecisionKind(
  evidence: Record<string, unknown> | null | undefined,
): DraftOwnerDecisionKind | null {
  const kind = evidence?.ownerDecisionKind;
  if (typeof kind !== "string") return null;
  if (
    kind === "needs_more_info" ||
    kind === "marked_duplicate" ||
    kind === "deferred" ||
    kind === "owner_approved" ||
    kind === "rejected"
  ) {
    return kind;
  }
  return null;
}

export function readOwnerActionHistory(
  evidence: Record<string, unknown> | null | undefined,
): DraftOwnerActionHistoryEntry[] {
  const raw = evidence?.ownerActionHistory;
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    .map((item) => ({
      action: typeof item.action === "string" ? item.action : "unknown",
      previousStatus: typeof item.previousStatus === "string" ? item.previousStatus : "—",
      newStatus: typeof item.newStatus === "string" ? item.newStatus : "—",
      ownerId: typeof item.ownerId === "string" ? item.ownerId : null,
      ownerEmail: typeof item.ownerEmail === "string" ? item.ownerEmail : null,
      at: typeof item.at === "string" ? item.at : new Date(0).toISOString(),
      note: typeof item.note === "string" ? item.note : null,
      runId: typeof item.runId === "string" ? item.runId : null,
      agentSlug: typeof item.agentSlug === "string" ? item.agentSlug : null,
      duplicateOf: typeof item.duplicateOf === "string" ? item.duplicateOf : null,
    }))
    .filter((item) => item.at);
}

export function appendOwnerActionHistory(
  evidence: Record<string, unknown>,
  entry: DraftOwnerActionHistoryEntry,
): DraftOwnerActionHistoryEntry[] {
  const prior = readOwnerActionHistory(evidence);
  return [...prior, entry].slice(-40);
}

export function mapDraftStatusWithEvidence(
  status: string | null | undefined,
  evidence: Record<string, unknown> | null | undefined,
): "needs_review" | "approved" | "rejected" | "deferred" | "duplicate" | "needs_more_info" | "superseded" | "unknown" {
  const raw = (status ?? "").trim().toLowerCase();
  if (raw === "promoted") return "superseded";
  if (raw === "owner_approved") return "approved";
  if (raw === "rejected") return "rejected";
  if (raw === "draft") return "needs_review";
  if (raw === "deferred") {
    const kind = readOwnerDecisionKind(evidence);
    if (kind === "needs_more_info") return "needs_more_info";
    if (kind === "marked_duplicate") return "duplicate";
    return "deferred";
  }
  return "unknown";
}

export function collectStorageArtifactPaths(
  evidence: Record<string, unknown> | null | undefined,
  browserQaEvidence: Record<string, unknown> | null | undefined,
): string[] {
  const paths = new Set<string>();
  const visit = (item: unknown): void => {
    if (!item) return;
    if (Array.isArray(item)) {
      item.forEach(visit);
      return;
    }
    if (typeof item === "object") {
      const rec = item as Record<string, unknown>;
      if (
        (rec.provider === "supabase_storage" || typeof rec.path === "string") &&
        typeof rec.path === "string" &&
        rec.path.startsWith("agentops/")
      ) {
        paths.add(rec.path);
      }
      if (typeof rec.storagePath === "string" && rec.storagePath.startsWith("agentops/")) {
        paths.add(rec.storagePath);
      }
      Object.values(rec).forEach(visit);
    }
  };
  visit(evidence);
  visit(browserQaEvidence);
  return [...paths];
}
