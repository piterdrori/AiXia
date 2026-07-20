/**
 * Phase D-C — private staging artifact upload + redaction helpers (worker-side).
 * Browser never receives service role. Bucket must stay private.
 */

import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import { basename, isAbsolute, join, relative, resolve } from "node:path";

export const DEFAULT_ARTIFACT_BUCKET = "agentops-artifacts-staging";
export const REDACTION_VERSION = "d-c-1";
export const SIGNED_URL_TTL_SECONDS = 10 * 60;
export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

const FORBIDDEN_NAME_RE =
  /storage[-_]?state|\.env|service[_-]?role|cookie|password|secret|token\.json|auth\.json/i;

const SECRET_VALUE_RE =
  /(authorization\s*[:=]\s*bearer\s+)[^\s"',}\\]+|(api[_-]?key|access[_-]?token|refresh[_-]?token|service[_-]?role|supabase[_-]?key|password|secret)\s*[:=]\s*["']?[^"',\\\s}]+/gi;

const COOKIE_RE = /(cookie\s*[:=]\s*)[^"',\\\n]+/gi;
const QUERY_SECRET_RE = /([?&](?:token|access_token|refresh_token|key|apikey|password|secret)=)[^&"'\s]+/gi;

export function resolveArtifactBucket(env = process.env) {
  return (env.AGENTOPS_ARTIFACT_BUCKET || DEFAULT_ARTIFACT_BUCKET).trim() || DEFAULT_ARTIFACT_BUCKET;
}

export function isArtifactUploadEnabled(env = process.env) {
  return String(env.AGENTOPS_ARTIFACT_UPLOAD_ENABLED || "").toLowerCase() === "true";
}

export function safeFilename(name) {
  const base = basename(String(name || "artifact")).replace(/[^a-zA-Z0-9._-]+/g, "_");
  return base.slice(0, 120) || "artifact.bin";
}

export function buildObjectPath(runId, artifactType, filename) {
  const rid = String(runId || "")
    .trim()
    .replace(/[^a-zA-Z0-9._:-]+/g, "_")
    .slice(0, 180);
  const type = String(artifactType || "evidence")
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .slice(0, 64);
  if (!rid || !type) throw new Error("runId and artifactType are required for object path.");
  return `agentops/${rid}/${type}/${safeFilename(filename)}`;
}

export function isForbiddenUploadPath(localPath) {
  const p = String(localPath || "");
  if (!p) return true;
  if (FORBIDDEN_NAME_RE.test(p)) return true;
  if (p.includes("..")) return true;
  return false;
}

export function redactSensitiveText(input) {
  if (input == null) return input;
  if (typeof input !== "string") {
    try {
      return JSON.parse(redactSensitiveText(JSON.stringify(input)));
    } catch {
      return input;
    }
  }
  return input
    .replace(SECRET_VALUE_RE, "$1[redacted]")
    .replace(COOKIE_RE, "$1[redacted]")
    .replace(QUERY_SECRET_RE, "$1[redacted]")
    .replace(/storage[-_]?state[^\s"',}]*/gi, "[redacted-storage-state]")
    .replace(/[A-Za-z]:\\Users\\[^\\/]+/g, "[redacted-home]")
    .replace(/\/Users\/[^/]+/g, "[redacted-home]")
    .replace(/\/home\/[^/]+/g, "[redacted-home]");
}

export function sanitizeEvidenceJson(value) {
  return redactSensitiveText(value);
}

export function validateArtifactPathForRun(runId, artifactPath, bucket = DEFAULT_ARTIFACT_BUCKET) {
  const errors = [];
  const path = String(artifactPath || "").trim();
  const rid = String(runId || "").trim();
  if (!rid) errors.push("runId required");
  if (!path) errors.push("artifactPath required");
  if (path.includes("..") || path.includes("\\") || path.startsWith("/")) {
    errors.push("path traversal rejected");
  }
  if (bucket !== DEFAULT_ARTIFACT_BUCKET && bucket !== resolveArtifactBucket()) {
    // allow configured staging bucket only
  }
  if (bucket && !String(bucket).includes("staging")) {
    errors.push("production bucket rejected");
  }
  if (bucket === "agentops-artifacts" || /prod/i.test(String(bucket))) {
    errors.push("non-staging bucket rejected");
  }
  const prefix = `agentops/${rid}/`;
  if (path && !path.startsWith(prefix)) {
    errors.push("artifactPath must belong to run");
  }
  if (path && !/^agentops\/[a-zA-Z0-9._:-]+\/[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+$/.test(path)) {
    errors.push("artifactPath shape invalid");
  }
  return { ok: errors.length === 0, errors, path, prefix };
}

export function extractStoragePathsFromSummary(summary) {
  const paths = new Set();
  const visit = (item) => {
    if (!item) return;
    if (typeof item === "string") return;
    if (typeof item === "object") {
      if (
        item.provider === "supabase_storage" &&
        typeof item.path === "string" &&
        item.path.startsWith("agentops/")
      ) {
        paths.add(item.path);
      }
      if (Array.isArray(item)) item.forEach(visit);
      else Object.values(item).forEach(visit);
    }
  };
  visit(summary?.artifactRefs);
  visit(summary?.screenshotRefs);
  visit(summary?.uploadedArtifacts);
  return [...paths];
}

export function guessContentType(filename) {
  const lower = String(filename || "").toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".json")) return "application/json";
  if (lower.endsWith(".html") || lower.endsWith(".htm")) return "text/html";
  if (lower.endsWith(".txt")) return "text/plain";
  return "application/octet-stream";
}

function resolveLocalFile(localPath, repoRoot = process.cwd()) {
  if (!localPath || typeof localPath !== "string") return null;
  if (isForbiddenUploadPath(localPath)) return null;
  const abs = isAbsolute(localPath) ? localPath : join(repoRoot, localPath);
  const resolved = resolve(abs);
  if (!existsSync(resolved)) return null;
  try {
    const st = statSync(resolved);
    if (!st.isFile() || st.size <= 0 || st.size > MAX_UPLOAD_BYTES) return null;
  } catch {
    return null;
  }
  return resolved;
}

export function buildStorageRef({
  bucket,
  path,
  localFallback,
  artifactType,
  contentType,
  uploadedAt = new Date().toISOString(),
}) {
  return {
    provider: "supabase_storage",
    bucket,
    path,
    localFallback: localFallback
      ? redactSensitiveText(String(localFallback).replace(/\\/g, "/").split("/").slice(-4).join("/"))
      : null,
    visibility: "private",
    signedUrlAvailable: true,
    artifactType: artifactType || "evidence",
    contentType: contentType || "application/octet-stream",
    uploadedAt,
    redactionVersion: REDACTION_VERSION,
    environment: "staging",
  };
}

/**
 * Upload allowed local files + sanitized JSON summary for a completed run.
 * Never uploads storage_state / secrets. Upload failure does not throw run failure.
 */
export async function uploadRunArtifacts({
  client,
  runId,
  agentSlug,
  workType,
  trigger,
  summary,
  env = process.env,
  repoRoot = process.cwd(),
}) {
  const enabled = isArtifactUploadEnabled(env);
  const bucket = resolveArtifactBucket(env);
  const baseMeta = {
    runId,
    agentSlug: agentSlug || null,
    workType: workType || null,
    trigger: trigger || null,
    environment: "staging",
    uploadedAt: new Date().toISOString(),
    redactionVersion: REDACTION_VERSION,
  };

  if (!enabled) {
    return {
      enabled: false,
      artifactUploadStatus: "disabled",
      artifactVisibility: "local_worker_only",
      artifactNote:
        "Local worker artifact — available on the worker host, not uploaded to public storage.",
      uploadedRefs: [],
      errors: [],
    };
  }

  if (!client) {
    return {
      enabled: true,
      artifactUploadStatus: "failed",
      artifactVisibility: "local_worker_only",
      artifactNote: "Artifact upload failed; local fallback retained.",
      uploadedRefs: [],
      errors: ["missing_supabase_client"],
    };
  }

  const uploadedRefs = [];
  const errors = [];
  const localCandidates = [];

  for (const ref of summary?.screenshotRefs || []) {
    if (typeof ref === "string") localCandidates.push({ localPath: ref, artifactType: "screenshots" });
    else if (ref && typeof ref.localFallback === "string") {
      localCandidates.push({ localPath: ref.localFallback, artifactType: "screenshots" });
    }
  }
  for (const ref of summary?.artifactRefs || []) {
    if (typeof ref === "string") localCandidates.push({ localPath: ref, artifactType: "evidence" });
    else if (ref && typeof ref.localFallback === "string" && ref.provider !== "supabase_storage") {
      localCandidates.push({ localPath: ref.localFallback, artifactType: "evidence" });
    }
  }

  const seen = new Set();
  for (const candidate of localCandidates) {
    const abs = resolveLocalFile(candidate.localPath, repoRoot);
    if (!abs) {
      if (candidate.localPath && isForbiddenUploadPath(candidate.localPath)) {
        errors.push("forbidden_path_skipped");
      }
      continue;
    }
    if (seen.has(abs)) continue;
    seen.add(abs);

    const filename = safeFilename(basename(abs));
    const objectPath = buildObjectPath(runId, candidate.artifactType, filename);
    const contentType = guessContentType(filename);
    const body = readFileSync(abs);

    const { error } = await client.storage.from(bucket).upload(objectPath, body, {
      contentType,
      upsert: true,
      cacheControl: "private, max-age=60",
    });
    if (error) {
      errors.push(error.message || "upload_failed");
      continue;
    }
    uploadedRefs.push(
      buildStorageRef({
        bucket,
        path: objectPath,
        localFallback: relative(repoRoot, abs) || abs,
        artifactType: candidate.artifactType,
        contentType,
        uploadedAt: baseMeta.uploadedAt,
      }),
    );
  }

  // Sanitized evidence summary JSON (never includes storage_state).
  const evidencePayload = sanitizeEvidenceJson({
    ...baseMeta,
    contentType: "application/json",
    result: summary?.result ?? null,
    routesScanned: summary?.routesScanned ?? summary?.selectedRoutes ?? null,
    evidenceSummary: summary?.evidenceSummary ?? null,
    rawObservations: Array.isArray(summary?.rawObservations)
      ? summary.rawObservations.slice(0, 40)
      : null,
    consoleFindings: summary?.consoleFindings ?? null,
    networkFindings: summary?.networkFindings ?? null,
    accessibilityFindings: summary?.accessibilityFindings ?? null,
    findingsCount: summary?.findingsCount ?? null,
  });
  const summaryBytes = Buffer.from(JSON.stringify(evidencePayload, null, 2), "utf8");
  const summaryPath = buildObjectPath(runId, "evidence", "summary.json");
  const { error: summaryError } = await client.storage.from(bucket).upload(summaryPath, summaryBytes, {
    contentType: "application/json",
    upsert: true,
    cacheControl: "private, max-age=60",
  });
  if (summaryError) {
    errors.push(summaryError.message || "summary_upload_failed");
  } else {
    uploadedRefs.push(
      buildStorageRef({
        bucket,
        path: summaryPath,
        localFallback: null,
        artifactType: "evidence",
        contentType: "application/json",
        uploadedAt: baseMeta.uploadedAt,
      }),
    );
  }

  const failed = errors.length > 0 && uploadedRefs.length === 0;
  const partial = errors.length > 0 && uploadedRefs.length > 0;
  return {
    enabled: true,
    artifactUploadStatus: failed ? "failed" : partial ? "partial" : "uploaded",
    artifactVisibility: uploadedRefs.length > 0 ? "private_staging_storage" : "local_worker_only",
    artifactNote:
      uploadedRefs.length > 0
        ? "Private staging storage — open via short-lived signed link (owner only)."
        : "Artifact upload failed; local fallback retained.",
    uploadedRefs,
    errors,
    bucket,
    meta: baseMeta,
    contentHash: createHash("sha256").update(summaryBytes).digest("hex").slice(0, 16),
  };
}

export async function createSignedArtifactUrl(client, bucket, path, expiresIn = SIGNED_URL_TTL_SECONDS) {
  const validation = validateArtifactPathForRun(
    path.split("/")[1] || "",
    path,
    bucket,
  );
  // path shape check without run ownership (caller must validate run)
  if (path.includes("..") || !path.startsWith("agentops/")) {
    return { ok: false, error: "Invalid artifact path", signedUrl: null, expiresIn: 0 };
  }
  const { data, error } = await client.storage.from(bucket).createSignedUrl(path, expiresIn);
  if (error || !data?.signedUrl) {
    return { ok: false, error: error?.message || "Signed URL failed", signedUrl: null, expiresIn: 0 };
  }
  return {
    ok: true,
    signedUrl: data.signedUrl,
    expiresIn,
    expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
    validation,
  };
}

export async function probeArtifactBucket(client, bucket = DEFAULT_ARTIFACT_BUCKET) {
  if (!client) return { ok: false, exists: false, public: null, error: "missing_client" };
  try {
    const { data, error } = await client.storage.getBucket(bucket);
    if (error) return { ok: false, exists: false, public: null, error: error.message };
    return {
      ok: true,
      exists: true,
      public: Boolean(data?.public),
      id: data?.id ?? bucket,
      error: null,
    };
  } catch (error) {
    return {
      ok: false,
      exists: false,
      public: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
