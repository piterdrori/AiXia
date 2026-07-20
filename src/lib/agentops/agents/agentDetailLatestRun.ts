/**
 * Phase D-E1 — Agent Detail latest-run selection and drawer honesty helpers.
 * Prefer staging-worker runs over fleet daily review. Pure helpers only.
 */

import type { AgentManualRunResult } from "@/lib/agentops/agents/agentManualRunContract";
import { AGENT_MANUAL_RUN_COPY } from "@/lib/agentops/agents/agentManualRunContract";

export const FLEET_DAILY_FALLBACK_BANNER =
  "Fleet daily review fallback — no newer staging-worker run exists for this agent.";

export type AgentDetailDrawerArtifactRef = {
  provider: "supabase_storage";
  bucket: string;
  path: string;
  localFallback?: string | null;
  visibility?: string;
  signedUrlAvailable?: boolean;
  artifactType?: string;
  contentType?: string;
  retentionClass?: string;
  retentionDays?: number;
  expiresAt?: string;
  cleanupEligible?: boolean;
  cleaned?: boolean;
  cleanedAt?: string | null;
};

export type AgentRunDrawerModel = {
  open: boolean;
  executionStatus: string;
  workType: string;
  trigger: string;
  startedAt: string | null;
  endedAt: string | null;
  duration: string;
  reviewDepth: string;
  authenticationDepth: string;
  routesModules: string;
  browserToolUsage: string;
  rawObservations: string;
  filteredObservations: string;
  queuedFindings: string;
  duplicates: string;
  evidence: string;
  limitations: string;
  failureReason: string;
  runId?: string | null;
  stale?: boolean;
  cancelRequested?: boolean;
  cancelAcknowledged?: boolean;
  lockExpiresAt?: string | null;
  canCancel?: boolean;
  storageArtifacts?: AgentDetailDrawerArtifactRef[];
  isFleetFallback?: boolean;
  banner?: string | null;
  workerPhase?: string | null;
  executionEngine?: string | null;
};

function listDrawerStorageArtifacts(
  refs: unknown[] | undefined | null,
): AgentDetailDrawerArtifactRef[] {
  if (!Array.isArray(refs)) return [];
  return refs.filter((ref): ref is AgentDetailDrawerArtifactRef => {
    if (!ref || typeof ref !== "object") return false;
    const row = ref as Record<string, unknown>;
    return (
      row.provider === "supabase_storage" &&
      typeof row.bucket === "string" &&
      typeof row.path === "string"
    );
  });
}

function formatDrawerEvidence(
  result: Pick<
    AgentManualRunResult,
    "evidenceAvailable" | "artifactRefs" | "screenshotRefs" | "artifactVisibility" | "artifactNote"
  >,
): string {
  if (!result.evidenceAvailable) return "No evidence linked";
  const storageRefs = [
    ...listDrawerStorageArtifacts(result.artifactRefs as unknown[]),
    ...listDrawerStorageArtifacts(result.screenshotRefs as unknown[]),
  ];
  const parts: string[] = [];
  if (storageRefs.length > 0) {
    parts.push(
      `${storageRefs.length} private staging artifact(s) — Open signed link (expires shortly).`,
    );
  }
  if (result.artifactVisibility === "local_worker_only") {
    parts.push(
      "Local worker artifact — available on the worker host, not uploaded to public storage.",
    );
  } else if (result.artifactVisibility === "private_staging_storage") {
    parts.push("Uploaded/private — signed link required (owner only).");
  }
  if (result.artifactNote) parts.push(result.artifactNote);
  return parts.join(" · ") || "Evidence available";
}

export type LatestRunCandidate = {
  runId: string;
  agentSlug?: string | null;
  workType?: string | null;
  trigger?: string | null;
  status: string;
  mode?: string | null;
  createdAt?: string | null;
  startedAt?: string | null;
  endedAt?: string | null;
  ageMs?: number | null;
};

export function selectLatestAgentRun(input: {
  queued: LatestRunCandidate[];
  running: LatestRunCandidate[];
  recentTerminal: LatestRunCandidate[];
}): LatestRunCandidate | null {
  if (input.running.length > 0) return input.running[0];
  if (input.queued.length > 0) return input.queued[0];

  const terminal = input.recentTerminal.filter(
    (row) => row.status === "completed" || row.status === "failed" || row.status === "canceled",
  );

  const ownerManual = terminal.find(
    (row) =>
      row.trigger === "owner_manual" || row.mode === "owner_manual_single_agent",
  );
  if (ownerManual) return ownerManual;

  const scheduled = terminal.find(
    (row) => row.trigger === "schedule" || row.mode === "scheduled_single_agent",
  );
  if (scheduled) return scheduled;

  if (terminal[0]) return terminal[0];
  return null;
}

function formatDurationMs(durationMs: number | null | undefined): string {
  if (durationMs == null || !Number.isFinite(durationMs) || durationMs < 0) {
    return "";
  }
  if (durationMs < 1000) return `${Math.round(durationMs)}ms`;
  const seconds = Math.round(durationMs / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const rem = seconds % 60;
  return rem ? `${minutes}m ${rem}s` : `${minutes}m`;
}

function triggerLabel(trigger: string | null | undefined, mode?: string | null): string {
  if (trigger === "owner_manual" || mode === "owner_manual_single_agent") {
    return "owner_manual";
  }
  if (trigger === "schedule" || mode === "scheduled_single_agent") {
    return "schedule";
  }
  if (trigger === "fleet_daily_review") return "fleet_daily_review";
  return trigger || "staging_worker";
}

function workTypeLabel(
  workType: string | null | undefined,
  trigger: string,
  status: string,
): string {
  if (workType === "browser_qa") {
    if (trigger === "schedule") return "browser_qa";
    if (status === "queued" || status === "running") return "browser_qa";
    return "browser_qa";
  }
  if (workType === "website_audit") return "website_audit";
  if (trigger === "fleet_daily_review") return "fleet_daily_review";
  return workType || "staging_worker_run";
}

/** Build drawer from a worker/manual/scheduled run status payload. */
export function drawerFromWorkerRunResult(
  result: AgentManualRunResult & {
    trigger?: string | null;
    mode?: string | null;
    workerPhase?: string | null;
    executionEngine?: string | null;
  },
  open: boolean,
): AgentRunDrawerModel {
  const trigger = triggerLabel(result.trigger, result.mode);
  const workType = workTypeLabel(result.workType ?? null, trigger, result.status);
  const routesLabel =
    result.routesChecked && result.routesChecked.length > 0
      ? result.routesChecked.join(", ")
      : result.status === "queued"
        ? "Queued — waiting for staging worker"
        : result.status === "running"
          ? result.workType === "browser_qa"
            ? "Browser QA running on staging worker"
            : "Website audit running on staging worker"
          : "";
  const canCancel = result.status === "queued" || result.status === "running";
  const duration =
    result.status === "queued"
      ? "Not started"
      : formatDurationMs(result.durationMs ?? null);

  const failureReason =
    result.status === "failed" || result.status === "rejected"
      ? result.failurePhase
        ? `${result.message} (${result.failurePhase})`
        : result.message
      : result.status === "canceled"
        ? result.message || "Canceled by owner"
        : "";

  const evidence =
    result.status === "queued"
      ? "No evidence yet — waiting for staging worker"
      : result.status === "running"
        ? result.workType === "browser_qa"
          ? "Evidence pending while Browser QA runs"
          : "Evidence pending while website audit runs"
        : formatDrawerEvidence(result);

  return {
    open,
    executionStatus: result.status,
    workType,
    trigger,
    startedAt: result.startedAt ?? null,
    endedAt: result.completedAt ?? null,
    duration,
    reviewDepth:
      result.workType === "browser_qa"
        ? "Limited routes (Browser QA)"
        : result.routesChecked && result.routesChecked.length > 0
          ? `Limited routes (${result.routesChecked.length})`
          : "Limited AgentOps route scope",
    authenticationDepth: "Staging worker (off Vercel)",
    routesModules: routesLabel,
    browserToolUsage: "Staging worker Playwright (not on Vercel)",
    rawObservations:
      result.status === "queued"
        ? "None yet — run is queued only"
        : result.rawObservations != null
          ? String(result.rawObservations)
          : "",
    filteredObservations: "Owner drafts only — no auto-promotion",
    queuedFindings:
      result.status === "queued"
        ? "None yet — run is queued only"
        : result.queuedFindings != null
          ? result.queuedFindings > 0
            ? String(result.queuedFindings)
            : AGENT_MANUAL_RUN_COPY.zeroFindings
          : "",
    duplicates: "",
    evidence,
    limitations:
      "Dry-run / drafts only. Staging worker execution. No GitHub dispatch. No code changes, PRs, deploys, or automatic memory apply.",
    failureReason,
    runId: result.runId ?? null,
    stale: Boolean(result.stale),
    cancelRequested: Boolean(result.cancelRequested),
    cancelAcknowledged:
      result.status === "canceled" ||
      Boolean(result.cancelAcknowledgedAt),
    lockExpiresAt: result.lockExpiresAt ?? null,
    canCancel,
    storageArtifacts: [
      ...listDrawerStorageArtifacts(result.artifactRefs as unknown[]),
      ...listDrawerStorageArtifacts(result.screenshotRefs as unknown[]),
    ].filter(
      (ref, index, all) => all.findIndex((other) => other.path === ref.path) === index,
    ),
    isFleetFallback: false,
    banner: null,
    workerPhase: result.workerPhase ?? null,
    executionEngine: result.executionEngine ?? null,
  };
}

export function buildFleetFallbackDrawer(input: {
  open: boolean;
  executionStatus: string;
  startedAt: string | null;
  endedAt: string | null;
  duration: string;
  routesModules: string;
  queuedFindings: string;
  failureReason: string;
}): AgentRunDrawerModel {
  return {
    open: input.open,
    executionStatus: input.executionStatus,
    workType: "fleet_daily_review",
    trigger: "fleet_daily_review",
    startedAt: input.startedAt,
    endedAt: input.endedAt,
    duration: input.duration === "Not recorded" ? "" : input.duration,
    reviewDepth: "",
    authenticationDepth: "",
    routesModules: input.routesModules === "Not recorded" ? "" : input.routesModules,
    browserToolUsage: "",
    rawObservations: "",
    filteredObservations: "",
    queuedFindings: input.queuedFindings === "Not recorded" ? "" : input.queuedFindings,
    duplicates: "",
    evidence: "Open Monitoring for fleet evidence",
    limitations: FLEET_DAILY_FALLBACK_BANNER,
    failureReason:
      input.failureReason === "Not recorded" ? "" : input.failureReason,
    runId: null,
    canCancel: false,
    isFleetFallback: true,
    banner: FLEET_DAILY_FALLBACK_BANNER,
    workerPhase: null,
    executionEngine: null,
  };
}

export function drawerFieldRows(
  drawer: AgentRunDrawerModel,
): Array<[string, string]> {
  const rows: Array<[string, string | null | undefined]> = [
    ["Execution status", drawer.executionStatus],
    ["Run id", drawer.runId],
    ["Work type", drawer.workType],
    ["Trigger", drawer.trigger],
    [
      "Started",
      drawer.startedAt ? new Date(drawer.startedAt).toLocaleString() : null,
    ],
    ["Ended", drawer.endedAt ? new Date(drawer.endedAt).toLocaleString() : null],
    ["Duration", drawer.duration],
    [
      "Lock expires",
      drawer.lockExpiresAt ? new Date(drawer.lockExpiresAt).toLocaleString() : null,
    ],
    ["Worker phase", drawer.workerPhase],
    ["Execution engine", drawer.executionEngine],
    ["Review depth", drawer.reviewDepth],
    ["Authentication depth", drawer.authenticationDepth],
    ["Routes / modules", drawer.routesModules],
    ["Browser / tool usage", drawer.browserToolUsage],
    ["Raw observations", drawer.rawObservations],
    ["Filtered observations", drawer.filteredObservations],
    ["Queued findings", drawer.queuedFindings],
    ["Duplicates", drawer.duplicates],
    ["Evidence", drawer.evidence],
    ["Limitations", drawer.limitations],
    ["Failure reason", drawer.failureReason],
  ];

  const alwaysShow = new Set(["Execution status", "Work type", "Trigger"]);
  return rows
    .filter(([label, value]) => {
      if (alwaysShow.has(label)) return Boolean(value);
      if (value == null) return false;
      const trimmed = String(value).trim();
      if (!trimmed) return false;
      if (trimmed === "Not recorded") return false;
      return true;
    })
    .map(([label, value]) => [label, String(value)]);
}
