import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { AixiaBadge, AixiaButton, AixiaInfoBlock } from "@/components/aixia";
import { AgentDetailPanelShell } from "@/components/agentops/owner/agent-detail/AgentDetailPanelShell";
import { AGENT_DETAIL_CC_COPY } from "@/lib/agentops/agents/agentDetailControlCenter";
import {
  buildHermesConnectionModel,
  evaluateHermesSafeConnectionTest,
  type HermesTestResult,
} from "@/lib/agentops/agents/agentDetailHermesConnection";
import {
  fetchAgentScopedMemory,
} from "@/app/system/agent-ops/agents/agentIntelligenceClient";
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

type TabId = "runtime" | "shared" | "pending" | "files";

type AgentMemoryHermesPanelProps = {
  agentSlug: string;
  /** Runtime UUID for agentops_memory — never a synthetic persona id. */
  runtimeAgentId: string | null;
  /** Canonical slug — used for owner-draft writes to agentops_agent_memory. */
  ownerDraftAgentId: string;
  onMemoryStats?: (stats: {
    assigned: number | null;
    enabled: number | null;
    pending: number | null;
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

function runtimeContentPreview(content: AgentOpsRuntimeMemoryRow["content"]): string {
  if (content == null) return "(empty)";
  if (typeof content === "string") return content;
  if (typeof content === "number" || typeof content === "boolean") return String(content);
  if (typeof content === "object") {
    const record = content as Record<string, unknown>;
    if (typeof record.title === "string") return record.title;
    if (typeof record.text === "string") return record.text;
    if (typeof record.summary === "string") return record.summary;
    try {
      return JSON.stringify(content).slice(0, 160);
    } catch {
      return "(object)";
    }
  }
  return String(content);
}

export function AgentMemoryHermesPanel({
  agentSlug,
  runtimeAgentId,
  ownerDraftAgentId,
  onMemoryStats,
  onHermesTestEvent,
}: AgentMemoryHermesPanelProps) {
  const draftAgentId = ownerDraftAgentId || agentSlug;
  const [tab, setTab] = useState<TabId>("runtime");
  const [runtimeItems, setRuntimeItems] = useState<AgentOpsRuntimeMemoryRow[]>([]);
  const [draftItems, setDraftItems] = useState<AgentOpsManagedAgentMemoryItem[]>([]);
  const [runtimeError, setRuntimeError] = useState<string | null>(null);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<HermesTestResult | null>(null);
  const [testing, setTesting] = useState(false);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [ownerFacingType, setOwnerFacingType] =
    useState<AgentOpsMemoryOwnerFacingType>("instruction");
  const [scope, setScope] = useState<AgentOpsMemoryScope>("private");
  const [editingId, setEditingId] = useState<string | null>(null);
  const onMemoryStatsRef = useRef(onMemoryStats);
  onMemoryStatsRef.current = onMemoryStats;

  const load = useCallback(async () => {
    setLoading(true);
    setRuntimeError(null);
    setDraftError(null);

    const [healthResult, draftResult, runtimeResult, globalResult] = await Promise.all([
      getAgentOpsHermesRuntimeHealth(),
      getAgentOpsAgentMemory(draftAgentId),
      runtimeAgentId
        ? fetchAgentScopedMemory(runtimeAgentId, 500)
        : Promise.resolve({
            data: [] as AgentOpsRuntimeMemoryRow[],
            error: "Agent runtime identity missing",
          }),
      supabase
        .from(AGENTOPS_RUNTIME_TABLES.memory)
        .select("*")
        .eq("environment", AGENTOPS_RUNTIME_ENVIRONMENT)
        .eq("scope", "global")
        .eq("approved", true)
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

    if (runtimeResult.error) {
      setRuntimeItems([]);
      setRuntimeError(runtimeResult.error);
    } else {
      const agentRows = runtimeResult.data ?? [];
      const globalRows = globalResult.error
        ? []
        : ((globalResult.data ?? []) as AgentOpsRuntimeMemoryRow[]);
      setRuntimeItems([...agentRows, ...globalRows]);
      if (globalResult.error) {
        setRuntimeError((prev) => prev ?? `Global memory: ${globalResult.error.message}`);
      }
    }

    if (draftResult.error) {
      setDraftItems([]);
      setDraftError(draftResult.error);
    } else {
      setDraftItems(draftResult.data ?? []);
    }

    const agentRowsOnly = runtimeResult.error ? [] : (runtimeResult.data ?? []);
    const assigned = runtimeResult.error ? null : agentRowsOnly.length;
    const enabled = runtimeResult.error
      ? null
      : agentRowsOnly.filter((row) => row.approved).length;
    const pendingDrafts = draftResult.error
      ? null
      : (draftResult.data ?? []).filter((row) => row.approvalStatus === "pending_approval").length;

    const model = buildHermesConnectionModel({
      agentId: runtimeAgentId ?? draftAgentId,
      health: healthResult,
      healthError: null,
      assignedMemoryCount: assigned,
      enabledMemoryCount: enabled,
      pendingApprovalCount: pendingDrafts,
      retrievalError: runtimeResult.error,
      lastSuccessfulRetrievalAt: runtimeResult.error ? null : new Date().toISOString(),
      tested: true,
    });

    onMemoryStatsRef.current?.({
      assigned,
      enabled,
      pending: pendingDrafts,
      error: runtimeResult.error,
      hermesStatus: model.fleetStatus,
      hermesDetail: model.notes[0] ?? "",
    });
    setLoading(false);
  }, [draftAgentId, runtimeAgentId]);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredRuntime = useMemo(() => {
    if (tab === "shared") {
      return runtimeItems.filter((item) => item.scope === "global");
    }
    return runtimeItems.filter((item) => item.scope === "agent");
  }, [runtimeItems, tab]);

  const filteredDrafts = useMemo(() => {
    if (tab === "pending") {
      return draftItems.filter((item) => item.approvalStatus === "pending_approval");
    }
    if (tab === "files") {
      return draftItems.filter(
        (item) => Boolean(item.fileStoragePath) || item.ownerFacingType === "reference_file",
      );
    }
    return [];
  }, [draftItems, tab]);

  const summary = useMemo(() => {
    const pending = draftItems.filter((item) => item.approvalStatus === "pending_approval").length;
    const agentOnly = runtimeItems.filter((item) => item.scope === "agent");
    const approved = agentOnly.filter((item) => item.approved).length;
    return {
      assigned: agentOnly.length,
      enabled: approved,
      pending,
      runtimeError,
      draftError,
    };
  }, [draftItems, draftError, runtimeError, runtimeItems]);

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
    });
    setTestResult(result);
    onHermesTestEvent?.(result.detail);
    setTesting(false);
  };

  const showRuntimeList = tab === "runtime" || tab === "shared";
  const showDraftList = tab === "pending" || tab === "files";

  return (
    <AgentDetailPanelShell
      title="Memory and Hermes"
      id="agent-memory-hermes"
      description="Runtime/Hermes memory from agentops_memory. Owner drafts stay in agentops_agent_memory until promoted."
      testId="agentops-agent-memory-hermes-panel"
    >
      <div className="grid gap-2 text-sm sm:grid-cols-2" data-testid="agentops-hermes-summary">
        <div>
          <p className="text-white/45">Fleet Hermes</p>
          <p className="text-white/85">See status strip · transport health</p>
        </div>
        <div>
          <p className="text-white/45">Assigned runtime memory</p>
          <p className="text-white/85">
            {loading ? "…" : runtimeError ? "Unavailable" : summary.assigned}
          </p>
        </div>
        <div>
          <p className="text-white/45">Enabled runtime memory</p>
          <p className="text-white/85">
            {loading ? "…" : runtimeError ? "Unavailable" : summary.enabled}
          </p>
        </div>
        <div>
          <p className="text-white/45">Pending owner drafts</p>
          <p className="text-white/85">
            {loading ? "…" : draftError ? "Unavailable" : summary.pending}
          </p>
        </div>
      </div>

      <AixiaInfoBlock tone="cyan" title="Hermes connection model">
        <p className="text-sm text-white/75">{AGENT_DETAIL_CC_COPY.hermesFleetAvailable}</p>
        <p className="mt-2 text-xs text-white/50">
          Per-agent retrieval: {runtimeAgentId ? "queryable via runtime UUID" : "Not measurable (runtime identity missing)"}
        </p>
      </AixiaInfoBlock>

      <div className="flex flex-wrap gap-2">
        <AixiaButton disabled={testing} onClick={() => void testHermes()}>
          {testing ? "Testing…" : "Test Hermes connection"}
        </AixiaButton>
        <AixiaButton variant="secondary" onClick={() => void load()}>
          Refresh memory
        </AixiaButton>
      </div>
      {testResult ? (
        <div className="rounded-lg border border-white/10 p-3 text-sm" data-testid="agentops-hermes-test-result">
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
            {new Date(testResult.checkedAt).toLocaleString()}
            {testResult.error ? ` · ${testResult.error}` : ""}
          </p>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["runtime", "Agent runtime memory"],
            ["shared", "Shared/global memory"],
            ["pending", "Pending owner approval"],
            ["files", "Files/drafts"],
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

      {showRuntimeList ? (
        runtimeError ? (
          <AixiaInfoBlock tone="gold" title="Runtime memory unavailable">
            <p className="text-sm text-white/75">{runtimeError}</p>
          </AixiaInfoBlock>
        ) : loading ? (
          <p className="text-sm text-white/50" role="status">
            Loading runtime memory…
          </p>
        ) : filteredRuntime.length === 0 ? (
          <p className="text-sm text-white/60">No runtime memory in this view.</p>
        ) : (
          <ul className="divide-y divide-white/10">
            {filteredRuntime.map((item) => (
              <li key={item.id} className="space-y-2 py-3 text-sm">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="mb-1 flex flex-wrap gap-2">
                      <AixiaBadge tone="neutral">
                        {item.scope === "global" ? "Global" : "Runtime memory"}
                      </AixiaBadge>
                      <AixiaBadge tone={item.approved ? "emerald" : "amber"}>
                        {item.approved ? "Approved" : "Pending / inactive"}
                      </AixiaBadge>
                    </div>
                    <p className="font-medium text-white/90 line-clamp-2">
                      {runtimeContentPreview(item.content)}
                    </p>
                    <p className="mt-1 text-xs text-white/45">
                      source: {item.source} · {new Date(item.created_at).toLocaleString()}
                    </p>
                  </div>
                  <AixiaBadge tone="neutral">Read-only</AixiaBadge>
                </div>
              </li>
            ))}
          </ul>
        )
      ) : null}

      {showDraftList ? (
        draftError ? (
          <AixiaInfoBlock tone="gold" title="Owner drafts unavailable">
            <p className="text-sm text-white/75">{draftError}</p>
          </AixiaInfoBlock>
        ) : loading ? (
          <p className="text-sm text-white/50" role="status">
            Loading owner drafts…
          </p>
        ) : filteredDrafts.length === 0 ? (
          <p className="text-sm text-white/60">No owner drafts in this view.</p>
        ) : (
          <ul className="divide-y divide-white/10">
            {filteredDrafts.map((item) => (
              <li key={item.id} className="space-y-2 py-3 text-sm">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="mb-1 flex flex-wrap gap-2">
                      <AixiaBadge tone="neutral">Owner draft</AixiaBadge>
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
                      {item.approvalStatus ?? (item.active ? "active" : "disabled")} ·{" "}
                      {new Date(item.createdAt).toLocaleString()}
                    </p>
                    {item.fileName ? (
                      <p className="text-xs text-white/45">File: {item.fileName} (path stored securely)</p>
                    ) : null}
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
                    {item.approvalStatus === "pending_approval" ? (
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
                    ) : null}
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
        )
      ) : null}

      <div className="space-y-2 rounded-lg border border-white/10 p-3">
        <p className="text-sm font-medium text-white/85">
          {editingId ? "Edit owner draft" : "Create owner draft"}
        </p>
        <p className="text-xs text-white/45">
          Writes to agentops_agent_memory only. Does not migrate or dual-write agentops_memory.
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
