import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { AixiaBadge, AixiaButton, AixiaInfoBlock } from "@/components/aixia";
import { AgentDetailPanelShell } from "@/components/agentops/owner/agent-detail/AgentDetailPanelShell";
import { AGENT_DETAIL_CC_COPY } from "@/lib/agentops/agents/agentDetailControlCenter";
import {
  buildHermesConnectionModel,
  evaluateHermesSafeConnectionTest,
  hermesStatusForStrip,
  type HermesTestResult,
} from "@/lib/agentops/agents/agentDetailHermesConnection";
import {
  AGENT_DETAIL_MEMORY_COPY,
  MEMORY_LIST_PAGE_SIZE,
  MEMORY_LOAD_TIMEOUT_MS,
  partitionRuntimeMemory,
  resolveAgentHermesConnectionLabel,
  usefulRuntimeEmptyCopy,
  resolveFleetHermesTransportLabel,
  runtimeMemoryPreview,
  withTimeout,
} from "@/lib/agentops/agents/agentDetailMemoryModel";
import { fetchAgentScopedMemory } from "@/app/system/agent-ops/agents/agentIntelligenceClient";
import type { AgentOpsRuntimeMemoryRow } from "@/lib/agentops/db/agentOpsRuntimeTypes";
import {
  AGENTOPS_RUNTIME_ENVIRONMENT,
  AGENTOPS_RUNTIME_TABLES,
} from "@/lib/agentops/db/agentOpsRuntimeTypes";
import { supabase } from "@/lib/supabase";
import {
  addAgentOpsAgentMemory,
  getAgentOpsAgentMemory,
  getAgentOpsHermesRuntimeHealth,
  setAgentOpsAgentMemoryActive,
  updateAgentOpsAgentMemory,
  uploadAgentOpsChatAttachment,
  type AgentOpsManagedAgentMemoryItem,
  type AgentOpsMemoryOwnerFacingType,
  type AgentOpsMemoryScope,
} from "@/lib/agentops";

const OWNER_TYPES: AgentOpsMemoryOwnerFacingType[] = [
  "instruction",
  "approved_fact",
  "procedure",
  "preference",
  "website_architecture_note",
  "qa_rule",
  "known_issue",
  "lesson_learned",
  "reference_file",
];

/** D-E3 — first-paint agent memory page size (Shared/global loads on tab open). */
const INITIAL_RUNTIME_MEMORY_LIMIT = 120;

type TabId =
  | "runtime"
  | "approved"
  | "shared"
  | "pending"
  | "files"
  | "diagnostics";

type AgentMemoryHermesPanelProps = {
  agentSlug: string;
  /** Runtime UUID for agentops_memory — never a synthetic persona id. */
  runtimeAgentId: string | null;
  /** Canonical slug — used for owner-draft writes to agentops_agent_memory. */
  ownerDraftAgentId: string;
  /**
   * False while Agent Detail is still resolving runtime identity.
   * Prevents a false “identity missing” flash before the UUID arrives.
   */
  identityReady?: boolean;
  onMemoryStats?: (stats: {
    assigned: number | null;
    enabled: number | null;
    pending: number | null;
    diagnostic: number | null;
    timedOut: boolean;
    error: string | null;
    hermesStatus: string;
    hermesDetail: string;
  }) => void;
  onHermesTestEvent?: (summary: string) => void;
};

function mapOwnerTypeToInput(
  type: AgentOpsMemoryOwnerFacingType,
): "instruction" | "preference" | "focus" | "correction" | "feature_idea" | "blocked_behavior" {
  if (type === "preference") return "preference";
  if (type === "known_issue" || type === "lesson_learned") return "correction";
  if (type === "qa_rule" || type === "procedure") return "focus";
  return "instruction";
}

function SummaryCard({
  label,
  value,
  testId,
}: {
  label: string;
  value: string;
  testId?: string;
}) {
  return (
    <div
      className="rounded-lg border border-white/10 bg-white/[0.02] p-3"
      data-testid={testId}
    >
      <p className="text-[11px] uppercase tracking-wide text-white/40">{label}</p>
      <p className="mt-1 text-sm text-white/85">{value}</p>
    </div>
  );
}

function RuntimeMemoryList({
  rows,
  emptyLabel,
  badgeFor,
}: {
  rows: AgentOpsRuntimeMemoryRow[];
  emptyLabel: string;
  badgeFor?: (row: AgentOpsRuntimeMemoryRow) => { label: string; tone: "emerald" | "amber" | "neutral" };
}) {
  const [visible, setVisible] = useState(MEMORY_LIST_PAGE_SIZE);
  useEffect(() => {
    setVisible(MEMORY_LIST_PAGE_SIZE);
  }, [rows]);

  if (rows.length === 0) {
    return <p className="text-sm text-white/60">{emptyLabel}</p>;
  }

  const slice = rows.slice(0, visible);
  return (
    <div className="space-y-2">
      <ul className="divide-y divide-white/10">
        {slice.map((item) => {
          const badge = badgeFor?.(item);
          return (
            <li key={item.id} className="space-y-2 py-3 text-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="mb-1 flex flex-wrap gap-2">
                    <AixiaBadge tone="neutral">
                      {item.scope === "global" ? "Shared/global" : "Runtime memory"}
                    </AixiaBadge>
                    <AixiaBadge tone={item.approved ? "emerald" : "amber"}>
                      {item.approved ? "Enabled" : "Inactive"}
                    </AixiaBadge>
                    {badge ? <AixiaBadge tone={badge.tone}>{badge.label}</AixiaBadge> : null}
                  </div>
                  <p className="font-medium text-white/90 line-clamp-2">
                    {runtimeMemoryPreview(item.content)}
                  </p>
                  <p className="mt-1 text-xs text-white/45">
                    source: {item.source} · {new Date(item.created_at).toLocaleString()}
                  </p>
                </div>
                <AixiaBadge tone="neutral">Read-only</AixiaBadge>
              </div>
            </li>
          );
        })}
      </ul>
      {rows.length > visible ? (
        <AixiaButton variant="secondary" onClick={() => setVisible((n) => n + MEMORY_LIST_PAGE_SIZE)}>
          Load more ({rows.length - visible} remaining)
        </AixiaButton>
      ) : null}
      {rows.length > MEMORY_LIST_PAGE_SIZE && visible >= rows.length ? (
        <p className="text-xs text-white/40">Showing all {rows.length} records</p>
      ) : null}
    </div>
  );
}

export function AgentMemoryHermesPanel({
  agentSlug,
  runtimeAgentId,
  ownerDraftAgentId,
  identityReady = true,
  onMemoryStats,
  onHermesTestEvent,
}: AgentMemoryHermesPanelProps) {
  const draftAgentId = ownerDraftAgentId || agentSlug;
  const [tab, setTab] = useState<TabId>("runtime");
  const [agentRuntimeRows, setAgentRuntimeRows] = useState<AgentOpsRuntimeMemoryRow[]>([]);
  const [globalRows, setGlobalRows] = useState<AgentOpsRuntimeMemoryRow[]>([]);
  const [draftItems, setDraftItems] = useState<AgentOpsManagedAgentMemoryItem[]>([]);
  const [runtimeError, setRuntimeError] = useState<string | null>(null);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [timedOut, setTimedOut] = useState(false);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<HermesTestResult | null>(null);
  const [testing, setTesting] = useState(false);
  const [fleetTransportLabel, setFleetTransportLabel] = useState("Unknown");
  const [diagnosticsOpen, setDiagnosticsOpen] = useState(false);
  const [globalLoaded, setGlobalLoaded] = useState(false);
  const [globalLoading, setGlobalLoading] = useState(false);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [ownerFacingType, setOwnerFacingType] =
    useState<AgentOpsMemoryOwnerFacingType>("instruction");
  const [scope, setScope] = useState<AgentOpsMemoryScope>("private");
  const [editingId, setEditingId] = useState<string | null>(null);
  const onMemoryStatsRef = useRef(onMemoryStats);
  onMemoryStatsRef.current = onMemoryStats;
  const loadGenerationRef = useRef(0);

  const agentHermesLabel = resolveAgentHermesConnectionLabel({
    agentSpecificRecordExists: false,
    runtimeAgentId,
    retrievalError: runtimeError,
    identityReady,
  });

  const load = useCallback(async () => {
    if (!identityReady) {
      setLoading(true);
      setRuntimeError(null);
      setTimedOut(false);
      onMemoryStatsRef.current?.({
        assigned: null,
        enabled: null,
        pending: null,
        diagnostic: null,
        timedOut: false,
        error: null,
        hermesStatus: "Unknown",
        hermesDetail: "Waiting for runtime agent identity…",
      });
      return;
    }

    const generation = ++loadGenerationRef.current;
    setLoading(true);
    setRuntimeError(null);
    setDraftError(null);
    setTimedOut(false);

    // D-E3: defer shared/global fetch until Shared tab — keep first paint lighter.
    const loadWork = Promise.all([
      getAgentOpsHermesRuntimeHealth(),
      getAgentOpsAgentMemory(draftAgentId),
      runtimeAgentId
        ? fetchAgentScopedMemory(runtimeAgentId, INITIAL_RUNTIME_MEMORY_LIMIT)
        : Promise.resolve({
            data: [] as AgentOpsRuntimeMemoryRow[],
            error: "Agent runtime identity missing",
          }),
    ]);

    const raced = await withTimeout(
      loadWork,
      MEMORY_LOAD_TIMEOUT_MS,
      AGENT_DETAIL_MEMORY_COPY.memoryLoadSlow,
    );

    if (generation !== loadGenerationRef.current) return;

    if (!raced.ok) {
      setAgentRuntimeRows([]);
      setDraftItems([]);
      setRuntimeError(raced.error);
      setTimedOut(raced.timedOut);
      setFleetTransportLabel("Unknown");
      onMemoryStatsRef.current?.({
        assigned: null,
        enabled: null,
        pending: null,
        diagnostic: null,
        timedOut: raced.timedOut,
        error: raced.error,
        hermesStatus: "Unknown",
        hermesDetail: "Hermes status not loaded (memory load timed out or failed).",
      });
      setLoading(false);
      return;
    }

    const [healthResult, draftResult, runtimeResult] = raced.value;

    const fleetLabel = resolveFleetHermesTransportLabel({
      loaded: true,
      ok: healthResult?.ok,
      transportReachable: healthResult?.transportReachable,
      error: healthResult?.loadError ?? null,
    });
    setFleetTransportLabel(fleetLabel);

    if (runtimeResult.error) {
      setAgentRuntimeRows([]);
      setRuntimeError(runtimeResult.error);
    } else {
      setAgentRuntimeRows(runtimeResult.data ?? []);
    }

    if (draftResult.error) {
      setDraftItems([]);
      setDraftError(draftResult.error);
    } else {
      setDraftItems(draftResult.data ?? []);
    }

    const agentRowsOnly = runtimeResult.error ? [] : (runtimeResult.data ?? []);
    const partitioned = partitionRuntimeMemory(agentRowsOnly, []);
    const assigned = runtimeResult.error ? null : partitioned.counts.runtimeTotal;
    const enabled = runtimeResult.error ? null : partitioned.counts.enabledRuntime;
    const diagnostic = runtimeResult.error ? null : partitioned.counts.diagnostic;
    const pendingDraftCount = draftResult.error
      ? null
      : (draftResult.data ?? []).filter((row) => row.approvalStatus === "pending_approval").length;

    const model = buildHermesConnectionModel({
      agentId: runtimeAgentId ?? draftAgentId,
      health: healthResult,
      healthError: null,
      assignedMemoryCount: assigned,
      enabledMemoryCount: enabled,
      pendingApprovalCount: pendingDraftCount,
      retrievalError: runtimeResult.error,
      lastSuccessfulRetrievalAt: runtimeResult.error ? null : new Date().toISOString(),
      tested: true,
      agentSpecificRecordExists: false,
      runtimeAgentId,
    });
    const stripHermes = hermesStatusForStrip(model);

    onMemoryStatsRef.current?.({
      assigned,
      enabled,
      pending: pendingDraftCount,
      diagnostic,
      timedOut: false,
      error: runtimeResult.error,
      hermesStatus: stripHermes.status,
      hermesDetail: stripHermes.detail,
    });
    setLoading(false);
  }, [draftAgentId, identityReady, runtimeAgentId]);

  const loadSharedGlobal = useCallback(async () => {
    if (globalLoaded || globalLoading) return;
    setGlobalLoading(true);
    const globalResult = await supabase
      .from(AGENTOPS_RUNTIME_TABLES.memory)
      .select("*")
      .eq("environment", AGENTOPS_RUNTIME_ENVIRONMENT)
      .eq("scope", "global")
      .eq("approved", true)
      .order("created_at", { ascending: false })
      .limit(50);
    if (globalResult.error) {
      setGlobalRows([]);
      setRuntimeError((prev) => prev ?? `Global memory: ${globalResult.error.message}`);
    } else {
      setGlobalRows((globalResult.data ?? []) as AgentOpsRuntimeMemoryRow[]);
    }
    setGlobalLoaded(true);
    setGlobalLoading(false);
  }, [globalLoaded, globalLoading]);

  useEffect(() => {
    setGlobalRows([]);
    setGlobalLoaded(false);
    setGlobalLoading(false);
  }, [draftAgentId, runtimeAgentId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (tab === "shared") {
      void loadSharedGlobal();
    }
  }, [tab, loadSharedGlobal]);

  const partition = useMemo(
    () => partitionRuntimeMemory(agentRuntimeRows, globalRows),
    [agentRuntimeRows, globalRows],
  );

  const pendingDrafts = useMemo(
    () => draftItems.filter((item) => item.approvalStatus === "pending_approval"),
    [draftItems],
  );

  const fileDrafts = useMemo(
    () =>
      draftItems.filter(
        (item) => Boolean(item.fileStoragePath) || item.ownerFacingType === "reference_file",
      ),
    [draftItems],
  );

  const approvedOwnerMemory = useMemo(
    () =>
      draftItems.filter(
        (item) => item.approvalStatus === "active" || (item.active && item.approvalStatus !== "pending_approval"),
      ),
    [draftItems],
  );

  const showFleetBanner =
    identityReady &&
    fleetTransportLabel === "Available" &&
    (agentHermesLabel === "Not configured" ||
      (agentHermesLabel === "Unknown" && !runtimeAgentId));

  const saveDraft = async (approve: boolean) => {
    setFeedback(null);
    if (!title.trim() || !content.trim()) {
      setFeedback("Title and content are required.");
      return;
    }

    if (editingId) {
      const result = await updateAgentOpsAgentMemory({
        memoryId: editingId,
        agentId: draftAgentId,
        title: title.trim(),
        content: content.trim(),
        scope,
        ownerFacingType,
        approvalStatus: approve ? "active" : "pending_approval",
        active: approve,
      });
      if (result.error) {
        setFeedback(result.error);
        return;
      }
      setFeedback(approve ? "Owner draft approved and activated." : "Owner draft saved (pending approval).");
    } else {
      const result = await addAgentOpsAgentMemory({
        agentId: draftAgentId,
        memoryType: mapOwnerTypeToInput(ownerFacingType),
        content: content.trim(),
        source: "piter",
        priority: "medium",
        title: title.trim(),
        ownerFacingType,
        scope,
        activateImmediately: approve,
        approvalStatus: approve ? "active" : "pending_approval",
        note: "Created from Agent Detail memory panel (owner draft).",
      });
      if (result.error) {
        setFeedback(result.error);
        return;
      }
      setFeedback(
        approve
          ? "Owner draft approved and activated."
          : "Draft saved pending owner approval. Hermes will not use it until promoted.",
      );
    }

    setTitle("");
    setContent("");
    setEditingId(null);
    await load();
  };

  const uploadFile = async (file: File | null) => {
    if (!file) return;
    setFeedback(null);
    const upload = await uploadAgentOpsChatAttachment({
      file,
      chatScope: "individual_agent",
      roomId: agentSlug,
    });
    if (upload.error || !upload.data) {
      setFeedback(upload.error ?? "File upload failed.");
      return;
    }
    const result = await addAgentOpsAgentMemory({
      agentId: draftAgentId,
      memoryType: "instruction",
      content: `Reference file: ${upload.data.fileName}`,
      source: "piter",
      priority: "medium",
      title: upload.data.fileName,
      ownerFacingType: "reference_file",
      scope: "private",
      activateImmediately: false,
      approvalStatus: "pending_approval",
      fileStoragePath: upload.data.storagePath,
      fileName: upload.data.fileName,
      note: "File uploaded — pending owner approval before Hermes use.",
    });
    if (result.error) {
      setFeedback(result.error);
      return;
    }
    setFeedback(AGENT_DETAIL_CC_COPY.fileMemoryPending);
    setTab("pending");
    await load();
  };

  const testHermes = async () => {
    setTesting(true);
    setTestResult(null);
    const health = await getAgentOpsHermesRuntimeHealth();
    const memoryResult = runtimeAgentId
      ? await fetchAgentScopedMemory(runtimeAgentId, 500)
      : { data: [] as AgentOpsRuntimeMemoryRow[], error: "Agent runtime identity missing" };
    const result = evaluateHermesSafeConnectionTest({
      health,
      healthError: null,
      runtimeAgentId,
      memoryQueryOk: !memoryResult.error,
      memoryError: memoryResult.error,
      assignedMemoryCount: memoryResult.data?.length ?? 0,
      agentSpecificRecordExists: false,
    });
    setTestResult(result);
    onHermesTestEvent?.(result.detail);
    setTesting(false);
  };

  const fleetCardValue = loading
    ? "…"
    : fleetTransportLabel === "Available"
      ? "Available"
      : fleetTransportLabel === "Unavailable"
        ? "Unavailable"
        : "Unknown";

  const agentHermesCardValue =
    agentHermesLabel === "Connected"
      ? "Connected"
      : agentHermesLabel === "Error"
        ? "Error"
        : agentHermesLabel === "Unknown"
          ? "Unknown"
          : "Not configured";

  return (
    <AgentDetailPanelShell
      title="Memory and Hermes"
      id="agent-memory-hermes"
      description="What this agent remembers, and whether Hermes transport is available for the fleet vs this agent."
      testId="agentops-agent-memory-hermes-panel"
    >
      <div
        className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4"
        data-testid="agentops-hermes-summary"
      >
        <SummaryCard
          label="Fleet Hermes"
          value={fleetCardValue}
          testId="memory-summary-fleet-hermes"
        />
        <SummaryCard
          label="Agent Hermes"
          value={agentHermesCardValue}
          testId="memory-summary-agent-hermes"
        />
        <SummaryCard
          label="Runtime memory"
          value={
            loading
              ? "…"
              : runtimeError
                ? "Unavailable"
                : `${partition.counts.runtimeTotal} records, ${partition.counts.enabledRuntime} enabled`
          }
          testId="memory-summary-runtime"
        />
        <SummaryCard
          label="Pending drafts"
          value={
            loading
              ? "…"
              : draftError
                ? "Unavailable"
                : pendingDrafts.length === 0
                  ? "None"
                  : String(pendingDrafts.length)
          }
          testId="memory-summary-pending"
        />
      </div>

      {showFleetBanner ? (
        <AixiaInfoBlock tone="cyan" title="Fleet transport ≠ agent connection">
          <p className="text-sm text-white/75" data-testid="agentops-hermes-no-per-agent-banner">
            {AGENT_DETAIL_MEMORY_COPY.noPerAgentBanner}
          </p>
        </AixiaInfoBlock>
      ) : null}

      {(timedOut || (runtimeError && !loading)) && (
        <AixiaInfoBlock tone="gold" title="Memory load issue">
          <p className="text-sm text-white/75" data-testid="agentops-memory-load-error">
            {timedOut ? AGENT_DETAIL_MEMORY_COPY.memoryLoadSlow : runtimeError}
          </p>
          <div className="mt-2">
            <AixiaButton variant="secondary" onClick={() => void load()}>
              Refresh memory
            </AixiaButton>
          </div>
        </AixiaInfoBlock>
      )}

      <div className="flex flex-wrap gap-2">
        <AixiaButton disabled={testing} onClick={() => void testHermes()}>
          {testing ? "Testing…" : "Test Hermes connection"}
        </AixiaButton>
        <AixiaButton variant="secondary" disabled={loading} onClick={() => void load()}>
          {loading ? "Refreshing…" : "Refresh memory"}
        </AixiaButton>
      </div>

      {testResult ? (
        <div
          className="rounded-lg border border-white/10 p-3 text-sm"
          data-testid="agentops-hermes-test-result"
        >
          <AixiaBadge
            tone={
              testResult.status.includes("failed") ||
              testResult.status.includes("unavailable") ||
              testResult.status.includes("missing")
                ? "amber"
                : "emerald"
            }
          >
            {testResult.status}
          </AixiaBadge>
          <p className="mt-2 text-white/75">{testResult.detail}</p>
          <p className="mt-1 text-xs text-white/45">
            Agent Hermes: {testResult.agentHermesLabel}
            {" · "}
            Fleet transport: {testResult.fleetTransportAvailable ? "Available" : "Unavailable"}
          </p>
          <p className="mt-1 text-xs text-white/45">
            {new Date(testResult.checkedAt).toLocaleString()}
            {testResult.error ? ` · ${testResult.error}` : ""}
          </p>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2" data-testid="agentops-memory-tabs">
        {(
          [
            ["runtime", `Runtime (${partition.counts.runtimeTotal})`],
            [
              "approved",
              `Approved (${partition.counts.approvedUseful + approvedOwnerMemory.length})`,
            ],
            [
              "shared",
              `Shared (${globalLoaded ? partition.counts.globalApproved : "…"})`,
            ],
            ["pending", `Pending (${pendingDrafts.length})`],
            ["files", `Files (${fileDrafts.length})`],
            ["diagnostics", `Diagnostics (${partition.counts.diagnostic})`],
          ] as const
        ).map(([id, label]) => (
          <AixiaButton
            key={id}
            variant={tab === id ? "primary" : "secondary"}
            onClick={() => setTab(id)}
          >
            {label}
          </AixiaButton>
        ))}
      </div>

      {!identityReady ? (
        <p className="text-sm text-white/50" role="status" data-testid="agentops-memory-waiting-identity">
          Waiting for runtime agent identity…
        </p>
      ) : null}

      {identityReady && loading && !timedOut ? (
        <p className="text-sm text-white/50" role="status" data-testid="agentops-memory-loading">
          Loading memory sections…
        </p>
      ) : null}

      {!loading && tab === "runtime" ? (
        <div data-testid="agentops-memory-tab-runtime">
          <p className="mb-2 text-xs text-white/45">
            Records in agentops_memory for this runtime UUID. Enabled ≠ owner-approved active memory.
            {partition.lastRuntimeUpdateAt
              ? ` Last runtime memory update: ${new Date(partition.lastRuntimeUpdateAt).toLocaleString()}.`
              : ""}
          </p>
          {runtimeError ? (
            <AixiaInfoBlock tone="gold" title={AGENT_DETAIL_MEMORY_COPY.runtimeUnavailable}>
              <p className="text-sm text-white/75">{runtimeError}</p>
            </AixiaInfoBlock>
          ) : (
            <RuntimeMemoryList
              rows={partition.usefulAgentRows}
              emptyLabel={usefulRuntimeEmptyCopy({
                runtimeTotal: partition.counts.runtimeTotal,
                diagnosticCount: partition.counts.diagnostic,
              })}
            />
          )}
          {partition.counts.diagnostic > 0 && partition.usefulAgentRows.length > 0 ? (
            <p className="mt-2 text-xs text-white/40">
              {partition.counts.diagnostic} diagnostic/noisy records are under Diagnostics (collapsed by
              default).
            </p>
          ) : null}
        </div>
      ) : null}

      {!loading && tab === "approved" ? (
        <div data-testid="agentops-memory-tab-approved" className="space-y-4">
          <div>
            <p className="mb-2 text-xs text-white/45">
              Useful runtime rows marked enabled/approved (excludes diagnostic markers).
            </p>
            <RuntimeMemoryList
              rows={partition.approvedUsefulRows}
              emptyLabel={AGENT_DETAIL_MEMORY_COPY.noApprovedMemory}
              badgeFor={() => ({ label: "Approved runtime", tone: "emerald" })}
            />
          </div>
          <div>
            <p className="mb-2 text-xs text-white/45">
              Owner-approved drafts in agentops_agent_memory (active).
            </p>
            {approvedOwnerMemory.length === 0 ? (
              <p className="text-sm text-white/60">No active owner-approved drafts for this agent.</p>
            ) : (
              <ul className="divide-y divide-white/10">
                {approvedOwnerMemory.slice(0, MEMORY_LIST_PAGE_SIZE).map((item) => (
                  <li key={item.id} className="space-y-1 py-3 text-sm">
                    <AixiaBadge tone="emerald">Owner approved</AixiaBadge>
                    <p className="font-medium text-white/90">
                      {item.title || item.note || item.memoryType}
                    </p>
                    <p className="text-white/55 line-clamp-2">{item.memoryText}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}

      {!loading && tab === "shared" ? (
        <div data-testid="agentops-memory-tab-shared">
          <p className="mb-2 text-xs text-white/45">
            {AGENT_DETAIL_MEMORY_COPY.sharedGlobalLabel} — not agent-specific. Loaded on demand.
          </p>
          {globalLoading && !globalLoaded ? (
            <p className="text-sm text-white/50" role="status">
              Loading shared/global memory…
            </p>
          ) : (
            <RuntimeMemoryList
              rows={partition.globalRows}
              emptyLabel="No shared/global approved memory loaded."
              badgeFor={() => ({ label: "Shared/global", tone: "neutral" })}
            />
          )}
        </div>
      ) : null}

      {!loading && tab === "pending" ? (
        <div data-testid="agentops-memory-tab-pending">
          {draftError ? (
            <AixiaInfoBlock tone="gold" title="Owner drafts unavailable">
              <p className="text-sm text-white/75">{draftError}</p>
            </AixiaInfoBlock>
          ) : pendingDrafts.length === 0 ? (
            <p className="text-sm text-white/60">{AGENT_DETAIL_MEMORY_COPY.noPendingDrafts}</p>
          ) : (
            <ul className="divide-y divide-white/10">
              {pendingDrafts.map((item) => (
                <li key={item.id} className="space-y-2 py-3 text-sm">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="mb-1 flex flex-wrap gap-2">
                        <AixiaBadge tone="amber">Pending owner draft</AixiaBadge>
                        {item.scope === "global" ? (
                          <AixiaBadge tone="neutral">Global</AixiaBadge>
                        ) : item.scope === "shared" ? (
                          <AixiaBadge tone="neutral">Shared</AixiaBadge>
                        ) : null}
                      </div>
                      <p className="font-medium text-white/90">
                        {item.title || item.note || item.memoryType}
                      </p>
                      <p className="text-white/55 line-clamp-2">{item.memoryText}</p>
                      <p className="mt-1 text-xs text-white/45">
                        {item.ownerFacingType ?? item.inputMemoryType ?? item.memoryType} ·{" "}
                        {new Date(item.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <AixiaButton
                        variant="secondary"
                        onClick={() => {
                          setEditingId(item.id);
                          setTitle(item.title ?? "");
                          setContent(item.memoryText);
                          setOwnerFacingType(item.ownerFacingType ?? "instruction");
                          setScope(item.scope ?? "private");
                        }}
                      >
                        Edit
                      </AixiaButton>
                      <AixiaButton
                        onClick={() =>
                          void updateAgentOpsAgentMemory({
                            memoryId: item.id,
                            agentId: draftAgentId,
                            approvalStatus: "active",
                            active: true,
                          }).then(async (result) => {
                            setFeedback(result.error ?? "Approved and activated.");
                            await load();
                          })
                        }
                      >
                        Approve
                      </AixiaButton>
                      <AixiaButton
                        variant="secondary"
                        onClick={() =>
                          void setAgentOpsAgentMemoryActive({
                            memoryId: item.id,
                            agentId: draftAgentId,
                            active: !item.active,
                            approvalStatus: item.active ? "disabled" : "active",
                          }).then(async (result) => {
                            setFeedback(result.error ?? (item.active ? "Disabled." : "Enabled."));
                            await load();
                          })
                        }
                      >
                        {item.active ? "Disable" : "Enable"}
                      </AixiaButton>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      {!loading && tab === "files" ? (
        <div data-testid="agentops-memory-tab-files">
          {fileDrafts.length === 0 ? (
            <p className="text-sm text-white/60">No files/drafts for this agent.</p>
          ) : (
            <ul className="divide-y divide-white/10">
              {fileDrafts.map((item) => (
                <li key={item.id} className="space-y-1 py-3 text-sm">
                  <AixiaBadge tone="neutral">
                    {item.approvalStatus === "pending_approval" ? "Owner draft" : "File/draft"}
                  </AixiaBadge>
                  <p className="font-medium text-white/90">
                    {item.title || item.fileName || item.memoryType}
                  </p>
                  {item.fileName ? (
                    <p className="text-xs text-white/45">
                      File: {item.fileName} (path stored securely)
                    </p>
                  ) : null}
                  <p className="text-white/55 line-clamp-2">{item.memoryText}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      {!loading && tab === "diagnostics" ? (
        <div data-testid="agentops-memory-tab-diagnostics">
          <button
            type="button"
            className="mb-2 text-left text-sm text-white/70 underline-offset-2 hover:underline"
            onClick={() => setDiagnosticsOpen((open) => !open)}
            data-testid="agentops-diagnostics-toggle"
          >
            {diagnosticsOpen ? "Collapse" : "Expand"} {AGENT_DETAIL_MEMORY_COPY.diagnosticsCollapsed} (
            {partition.counts.diagnostic})
          </button>
          {!diagnosticsOpen ? (
            <p className="text-sm text-white/55">
              Diagnostic/noisy runtime history is collapsed. These are not active approved memory.
            </p>
          ) : (
            <RuntimeMemoryList
              rows={partition.diagnosticAgentRows}
              emptyLabel="No diagnostic runtime history for this agent."
              badgeFor={() => ({ label: "Diagnostic", tone: "amber" })}
            />
          )}
        </div>
      ) : null}

      <div className="space-y-2 rounded-lg border border-white/10 p-3">
        <p className="text-sm font-medium text-white/85">
          {editingId ? "Edit owner draft" : "Create owner draft"}
        </p>
        <p className="text-xs text-white/45">
          Writes to agentops_agent_memory only. Does not auto-promote or apply into Hermes runtime
          memory.
        </p>
        <input
          className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white"
          placeholder="Title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
        <textarea
          className="min-h-[88px] w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white"
          placeholder="Content"
          value={content}
          onChange={(event) => setContent(event.target.value)}
        />
        <div className="grid gap-2 sm:grid-cols-2">
          <select
            className="rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white"
            value={ownerFacingType}
            onChange={(event) =>
              setOwnerFacingType(event.target.value as AgentOpsMemoryOwnerFacingType)
            }
          >
            {OWNER_TYPES.map((type) => (
              <option key={type} value={type}>
                {type.replace(/_/g, " ")}
              </option>
            ))}
          </select>
          <select
            className="rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white"
            value={scope}
            onChange={(event) => setScope(event.target.value as AgentOpsMemoryScope)}
          >
            <option value="private">Private to this agent</option>
            <option value="shared">Shared with selected agents</option>
            <option value="global">Global approved memory</option>
          </select>
        </div>
        <div className="flex flex-wrap gap-2">
          <AixiaButton variant="secondary" onClick={() => void saveDraft(false)}>
            Save draft
          </AixiaButton>
          <AixiaButton onClick={() => void saveDraft(true)}>Approve and activate</AixiaButton>
          {editingId ? (
            <AixiaButton
              variant="secondary"
              onClick={() => {
                setEditingId(null);
                setTitle("");
                setContent("");
              }}
            >
              Cancel edit
            </AixiaButton>
          ) : null}
        </div>
        <label className="block text-sm text-white/70">
          Add file (creates pending owner draft)
          <input
            type="file"
            className="mt-1 block w-full text-xs text-white/60"
            onChange={(event) => void uploadFile(event.target.files?.[0] ?? null)}
          />
        </label>
      </div>

      {feedback ? (
        <p className="text-sm text-white/70" role="status" data-testid="agentops-memory-feedback">
          {feedback}
        </p>
      ) : null}
    </AgentDetailPanelShell>
  );
}
