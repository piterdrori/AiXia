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

type TabId = "agent" | "shared" | "pending" | "files";

type AgentMemoryHermesPanelProps = {
  agentSlug: string;
  managedAgentId: string | null;
  onMemoryStats?: (stats: {
    assigned: number | null;
    enabled: number | null;
    pending: number | null;
    error: string | null;
    hermesStatus: string;
    hermesDetail: string;
  }) => void;
};

function mapOwnerTypeToInput(
  type: AgentOpsMemoryOwnerFacingType,
): "instruction" | "preference" | "focus" | "correction" | "feature_idea" | "blocked_behavior" {
  if (type === "preference") return "preference";
  if (type === "known_issue" || type === "lesson_learned") return "correction";
  if (type === "qa_rule" || type === "procedure") return "focus";
  return "instruction";
}

export function AgentMemoryHermesPanel({
  agentSlug,
  managedAgentId,
  onMemoryStats,
}: AgentMemoryHermesPanelProps) {
  const agentId = managedAgentId || agentSlug;
  const [tab, setTab] = useState<TabId>("agent");
  const [items, setItems] = useState<AgentOpsManagedAgentMemoryItem[]>([]);
  const [error, setError] = useState<string | null>(null);
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
    setError(null);
    const [memoryResult, healthResult] = await Promise.all([
      getAgentOpsAgentMemory(agentId),
      getAgentOpsHermesRuntimeHealth(),
    ]);

    if (memoryResult.error) {
      setItems([]);
      setError(memoryResult.error);
      onMemoryStatsRef.current?.({
        assigned: null,
        enabled: null,
        pending: null,
        error: memoryResult.error,
        hermesStatus: "Unknown",
        hermesDetail: memoryResult.error,
      });
      setLoading(false);
      return;
    }

    const rows = memoryResult.data ?? [];
    setItems(rows);
    const assigned = rows.length;
    const enabled = rows.filter((row) => row.active).length;
    const pending = rows.filter((row) => row.approvalStatus === "pending_approval").length;
    const model = buildHermesConnectionModel({
      agentId,
      health: healthResult,
      healthError: null,
      assignedMemoryCount: assigned,
      enabledMemoryCount: enabled,
      pendingApprovalCount: pending,
      retrievalError: null,
      lastSuccessfulRetrievalAt: new Date().toISOString(),
    });
    onMemoryStatsRef.current?.({
      assigned,
      enabled,
      pending,
      error: null,
      hermesStatus: model.connectionStatus,
      hermesDetail: model.notes[0] ?? "",
    });
    setLoading(false);
  }, [agentId]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    if (tab === "pending") {
      return items.filter((item) => item.approvalStatus === "pending_approval");
    }
    if (tab === "shared") {
      return items.filter((item) => item.scope === "shared" || item.scope === "global");
    }
    if (tab === "files") {
      return items.filter((item) => Boolean(item.fileStoragePath) || item.ownerFacingType === "reference_file");
    }
    return items.filter((item) => item.scope !== "shared" && item.scope !== "global");
  }, [items, tab]);

  const summary = useMemo(() => {
    const pending = items.filter((item) => item.approvalStatus === "pending_approval").length;
    const enabled = items.filter((item) => item.active).length;
    return { assigned: items.length, enabled, pending };
  }, [items]);

  const saveDraft = async (approve: boolean) => {
    setFeedback(null);
    if (!title.trim() || !content.trim()) {
      setFeedback("Title and content are required.");
      return;
    }

    if (editingId) {
      const result = await updateAgentOpsAgentMemory({
        memoryId: editingId,
        agentId,
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
      setFeedback(approve ? "Memory approved and activated." : "Draft saved (pending approval).");
    } else {
      const result = await addAgentOpsAgentMemory({
        agentId,
        memoryType: mapOwnerTypeToInput(ownerFacingType),
        content: content.trim(),
        source: "piter",
        priority: "medium",
        title: title.trim(),
        ownerFacingType,
        scope,
        activateImmediately: approve,
        approvalStatus: approve ? "active" : "pending_approval",
        note: "Created from Agent Detail memory panel.",
      });
      if (result.error) {
        setFeedback(result.error);
        return;
      }
      setFeedback(
        approve
          ? "Memory approved and activated by owner."
          : "Draft saved pending owner approval. Hermes will not use it until approved.",
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
      agentId,
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
    const [health, memoryResult] = await Promise.all([
      getAgentOpsHermesRuntimeHealth(),
      getAgentOpsAgentMemory(agentId),
    ]);
    const result = evaluateHermesSafeConnectionTest({
      health,
      healthError: null,
      memoryQueryOk: !memoryResult.error,
      memoryError: memoryResult.error,
      assignedMemoryCount: memoryResult.data?.length ?? 0,
    });
    setTestResult(result);
    setTesting(false);
  };

  return (
    <AgentDetailPanelShell
      title="Memory and Hermes"
      id="agent-memory-hermes"
      description="Owner-controlled memory for this agent. Permanent Hermes use requires approval."
      testId="agentops-agent-memory-hermes-panel"
    >
      <div className="grid gap-2 text-sm sm:grid-cols-2" data-testid="agentops-hermes-summary">
        <div>
          <p className="text-white/45">Hermes status</p>
          <p className="text-white/85">See live status strip · fleet transport health</p>
        </div>
        <div>
          <p className="text-white/45">Assigned memory</p>
          <p className="text-white/85">
            {loading ? "…" : error ? "Unavailable" : summary.assigned}
          </p>
        </div>
        <div>
          <p className="text-white/45">Enabled</p>
          <p className="text-white/85">
            {loading ? "…" : error ? "Unavailable" : summary.enabled}
          </p>
        </div>
        <div>
          <p className="text-white/45">Pending approval</p>
          <p className="text-white/85">
            {loading ? "…" : error ? "Unavailable" : summary.pending}
          </p>
        </div>
      </div>

      <AixiaInfoBlock tone="cyan" title="Hermes connection model">
        <p className="text-sm text-white/75">{AGENT_DETAIL_CC_COPY.hermesNoAgentSpecificRecord}</p>
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
          <AixiaBadge tone={testResult.status === "Failed" ? "amber" : "emerald"}>
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
            ["agent", "Agent memory"],
            ["shared", "Shared memory"],
            ["pending", "Pending approval"],
            ["files", "Files"],
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

      {error ? (
        <AixiaInfoBlock tone="gold" title="Memory unavailable">
          <p className="text-sm text-white/75">{error}</p>
        </AixiaInfoBlock>
      ) : loading ? (
        <p className="text-sm text-white/50" role="status">
          Loading memory…
        </p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-white/60">No items in this view.</p>
      ) : (
        <ul className="divide-y divide-white/10">
          {filtered.map((item) => (
            <li key={item.id} className="space-y-2 py-3 text-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-white/90">
                    {item.title || item.note || item.memoryType}
                  </p>
                  <p className="text-white/55 line-clamp-2">{item.memoryText}</p>
                  <p className="mt-1 text-xs text-white/45">
                    {item.ownerFacingType ?? item.inputMemoryType ?? item.memoryType} ·{" "}
                    {item.scope ?? "private"} · {item.approvalStatus ?? (item.active ? "active" : "disabled")} ·{" "}
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
                      setTab("agent");
                    }}
                  >
                    Edit
                  </AixiaButton>
                  {item.approvalStatus === "pending_approval" ? (
                    <AixiaButton
                      onClick={() =>
                        void updateAgentOpsAgentMemory({
                          memoryId: item.id,
                          agentId,
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
                        agentId,
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

      <div className="space-y-2 rounded-lg border border-white/10 p-3">
        <p className="text-sm font-medium text-white/85">
          {editingId ? "Edit memory" : "Create text memory"}
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
          Add file (creates pending memory)
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
