const PROOF_READY_DOCUMENTATION_STATUSES = new Set([
  "uploaded",
  "linked",
  "files_and_links",
  "verified",
]);

function normalize(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function readDocumentationLink(metadata: Record<string, unknown> | null | undefined) {
  const value = metadata?.documentation_link;
  if (typeof value !== "string") return "";
  return value.trim();
}

export type DocumentationProofInput = {
  documentation_status?: string | null;
  metadata?: Record<string, unknown> | null;
  attachmentCount?: number | null;
};

export function hasDocumentationProof(input: DocumentationProofInput): boolean {
  const normalizedStatus = normalize(input.documentation_status);
  if (PROOF_READY_DOCUMENTATION_STATUSES.has(normalizedStatus)) return true;

  const documentationLink = readDocumentationLink(input.metadata);
  if (documentationLink) return true;

  return Number(input.attachmentCount ?? 0) > 0;
}
