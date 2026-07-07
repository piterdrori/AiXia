import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Brain, Database, RefreshCw, Search } from "lucide-react";

import { MonitoringMemoryProposalsReview } from "@/app/system/agent-ops/memory/MonitoringMemoryProposalsReview";
import {
  AgentOpsRuntimeMirrorGate,
  AgentOpsRuntimeNoDataState,
} from "@/components/agentops/runtime/AgentOpsRuntimeMirrorStates";
import { AgentOpsRuntimeMirrorShell } from "@/components/agentops/runtime/AgentOpsRuntimeMirrorShell";
import {
  AixiaBadge,
  AixiaButton,
  AixiaCommandHubMetaStrip,
  AixiaHero,
  AixiaInfoBlock,
  AixiaSection,
  AixiaTableBadgeCell,
  AixiaTableHeaderCell,
  AixiaTableShell,
  AixiaTableTextCell,
} from "@/components/aixia";
import { usePageTitle } from "@/hooks/usePageTitle";
import type { AgentOpsRuntimeMemoryRow } from "@/lib/agentops/db/agentOpsRuntimeTypes";
import {
  fetchRuntimeMemory,
  fetchRuntimeMemoryById,
  fetchRuntimeMonitoringMemory,
  fetchRuntimeSystemMemory,
  lookupRuntimeMemoryDirect,
} from "@/lib/agentops/runtime/agentOpsRuntimeMirrorClient";
import {
  formatJsonPreview,
  isMonitoringMemoryProposalRow,
  memoryRowMatchesSearch,
  parseEvolutionMemoryContent,
  parseMemoryContent,
  readMonitoringMemoryContentFields,
} from "@/lib/agentops/runtime/runtimeMirrorUtils";
import { buildRuntimeMirrorMetaItems } from "@/lib/agentops/runtime/runtimeMirrorUiHelpers";
import { useAgentOpsRuntimeMirror } from "@/lib/agentops/runtime/useAgentOpsRuntimeMirror";

type MemoryView = "memory" | "evolution";
type ScopeFilter = "all" | "global" | "agent";
type MemorySourceFilter = "all" | "monitoring";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function formatTime(value: string): string {
  return new Date(value).toLocaleString();
}

function shortId(value: string | null | undefined): string {
  if (!value) return "—";
  return value.length > 12 ? `${value.slice(0, 8)}…` : value;
}

function MemoryFocusedCard({
  row,
  title,
  highlight = false,
}: {
  row: AgentOpsRuntimeMemoryRow;
  title: string;
  highlight?: boolean;
}) {
  const fields = readMonitoringMemoryContentFields(row);
  return (
    <AixiaInfoBlock
      title={title}
      tone={highlight ? "cyan" : "indigo"}
      className={highlight ? "ring-1 ring-cyan-400/40" : undefined}
    >
      <div className="grid gap-2 text-xs text-white/70 md:grid-cols-2">
        <p>
          <span className="text-white/45">Memory id:</span> {row.id}
        </p>
        <p>
          <span className="text-white/45">Scope:</span> {row.scope}
        </p>
        <p>
          <span className="text-white/45">Approved:</span> {row.approved ? "yes" : "no"}
        </p>
        <p>
          <span className="text-white/45">Row source:</span> {row.source}
        </p>
        <p>
          <span className="text-white/45">Content source:</span>{" "}
          {fields.contentSource ?? "—"}
        </p>
        <p>
          <span className="text-white/45">Source proposal id:</span>{" "}
          {fields.sourceProposalId ?? "—"}
        </p>
        <p>
          <span className="text-white/45">Source run id:</span> {fields.sourceRunId ?? "—"}
        </p>
        <p>
          <span className="text-white/45">Applied at:</span>{" "}
          {fields.appliedAt ? formatTime(fields.appliedAt) : formatTime(row.created_at)}
        </p>
        {fields.title ? (
          <p className="md:col-span-2">
            <span className="text-white/45">Title:</span> {fields.title}
          </p>
        ) : null}
        {fields.text ? (
          <p className="md:col-span-2">
            <span className="text-white/45">Content:</span> {fields.text}
          </p>
        ) : null}
      </div>
    </AixiaInfoBlock>
  );
}

export default function AgentOpsRuntimeMemoryPage() {
  usePageTitle("Memory observatory");
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const highlightRowRef = useRef<HTMLTableRowElement | null>(null);

  const view: MemoryView = searchParams.get("view") === "evolution" ? "evolution" : "memory";
  const panel = searchParams.get("panel");
  const memoryIdParam = searchParams.get("memoryId");
  const showMonitoringProposals = panel === "monitoring-proposals";

  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>("all");
  const [sourceFilter, setSourceFilter] = useState<MemorySourceFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [focusedMemory, setFocusedMemory] = useState<AgentOpsRuntimeMemoryRow | null>(null);
  const [focusedMemoryError, setFocusedMemoryError] = useState<string | null>(null);
  const [focusedMemoryLoading, setFocusedMemoryLoading] = useState(false);
  const [searchLookupMemory, setSearchLookupMemory] = useState<AgentOpsRuntimeMemoryRow | null>(
    null,
  );

  const memoryFetcher = useCallback(() => {
    return sourceFilter === "monitoring"
      ? fetchRuntimeMonitoringMemory(200)
      : fetchRuntimeMemory(200);
  }, [sourceFilter]);

  const evolutionFetcher = useCallback(() => fetchRuntimeSystemMemory(), []);

  const memoryMirror = useAgentOpsRuntimeMirror(memoryFetcher);
  const evolutionMirror = useAgentOpsRuntimeMirror(evolutionFetcher);

  const activeMirror = view === "evolution" ? evolutionMirror : memoryMirror;
  const { loading, refresh } = activeMirror;
  const rows = memoryMirror.data;
  const systemRows = evolutionMirror.data;

  useEffect(() => {
    if (!memoryIdParam) {
      setFocusedMemory(null);
      setFocusedMemoryError(null);
      setFocusedMemoryLoading(false);
      return;
    }

    let cancelled = false;
    setFocusedMemoryLoading(true);
    void fetchRuntimeMemoryById(memoryIdParam).then((result) => {
      if (cancelled) return;
      if (result.error) {
        setFocusedMemory(null);
        setFocusedMemoryError(result.error);
      } else if (!result.data) {
        setFocusedMemory(null);
        setFocusedMemoryError("Memory record not found");
      } else {
        setFocusedMemory(result.data);
        setFocusedMemoryError(null);
      }
      setFocusedMemoryLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [memoryIdParam]);

  useEffect(() => {
    const query = searchQuery.trim();
    if (!query) {
      setSearchLookupMemory(null);
      return;
    }

    const inLoadedRows = (rows ?? []).some((row) => memoryRowMatchesSearch(row, query));
    if (inLoadedRows) {
      setSearchLookupMemory(null);
      return;
    }

    const shouldLookup = UUID_PATTERN.test(query) || query.length >= 32;
    if (!shouldLookup) {
      setSearchLookupMemory(null);
      return;
    }

    let cancelled = false;
    void lookupRuntimeMemoryDirect(query).then((result) => {
      if (cancelled) return;
      setSearchLookupMemory(result.data);
    });

    return () => {
      cancelled = true;
    };
  }, [searchQuery, rows]);

  useEffect(() => {
    if (!memoryIdParam || !highlightRowRef.current) return;
    highlightRowRef.current.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [memoryIdParam, rows, focusedMemory]);

  const filtered = useMemo(() => {
    let list = rows ?? [];
    if (scopeFilter !== "all") {
      list = list.filter((row) => row.scope === scopeFilter);
    }
    if (searchQuery.trim()) {
      list = list.filter((row) => memoryRowMatchesSearch(row, searchQuery));
    }
    return list;
  }, [rows, scopeFilter, searchQuery]);

  const highlightMemoryId = memoryIdParam ?? focusedMemory?.id ?? searchLookupMemory?.id ?? null;

  const approvedCount = (rows ?? []).filter((row) => row.approved).length;
  const monitoringCount = (rows ?? []).filter((row) => isMonitoringMemoryProposalRow(row)).length;

  const evolutionRows = useMemo(
    () =>
      (systemRows ?? [])
        .map((row) => ({ row, content: parseEvolutionMemoryContent(row) }))
        .filter((entry) => entry.content !== null),
    [systemRows],
  );

  const latest = evolutionRows[0]?.content;

  const preserveMemoryQueryParams = useCallback(() => {
    const nextParams = new URLSearchParams();
    if (memoryIdParam) nextParams.set("memoryId", memoryIdParam);
    if (panel) nextParams.set("panel", panel);
    return nextParams;
  }, [memoryIdParam, panel]);

  const setView = (next: MemoryView) => {
    if (next === "memory") {
      setSearchParams(preserveMemoryQueryParams());
    } else {
      setSearchParams({ view: "evolution" });
    }
  };

  const renderMemoryRow = (row: AgentOpsRuntimeMemoryRow, highlight: boolean) => {
    const fields = readMonitoringMemoryContentFields(row);
    const isMonitoring = isMonitoringMemoryProposalRow(row);

    if (sourceFilter === "monitoring" || isMonitoring) {
      return (
        <tr
          key={row.id}
          ref={highlight ? highlightRowRef : undefined}
          className={highlight ? "bg-cyan-500/10 ring-1 ring-inset ring-cyan-400/40" : undefined}
        >
          <AixiaTableTextCell tier="medium" primary={shortId(row.id)} />
          <AixiaTableTextCell tier="status" primary={row.scope} />
          <AixiaTableBadgeCell tier="status">
            <AixiaBadge tone={row.approved ? "emerald" : "amber"}>
              {row.approved ? "yes" : "no"}
            </AixiaBadge>
          </AixiaTableBadgeCell>
          <AixiaTableTextCell tier="flex" primary={fields.title ?? "—"} />
          <AixiaTableTextCell tier="medium" primary={shortId(fields.sourceProposalId)} />
          <AixiaTableTextCell tier="medium" primary={shortId(fields.sourceRunId)} />
          <AixiaTableTextCell tier="medium" primary={formatTime(row.created_at)} />
        </tr>
      );
    }

    return (
      <tr
        key={row.id}
        ref={highlight ? highlightRowRef : undefined}
        className={highlight ? "bg-cyan-500/10 ring-1 ring-inset ring-cyan-400/40" : undefined}
      >
        <AixiaTableTextCell tier="status" primary={row.scope} />
        <AixiaTableTextCell tier="status" primary={row.source} />
        <AixiaTableBadgeCell tier="status">
          <AixiaBadge tone={row.approved ? "emerald" : "amber"}>
            {row.approved ? "yes" : "no"}
          </AixiaBadge>
        </AixiaTableBadgeCell>
        <AixiaTableTextCell
          tier="medium"
          primary={row.agent_id ? `${row.agent_id.slice(0, 8)}…` : "—"}
        />
        <AixiaTableTextCell tier="medium" primary={formatTime(row.created_at)} />
        <AixiaTableTextCell
          tier="flex"
          primary={formatJsonPreview(parseMemoryContent(row), 120)}
        />
      </tr>
    );
  };

  return (
    <AgentOpsRuntimeMirrorShell
      active="memory"
      scrollLead={
        <AixiaCommandHubMetaStrip
          variant="command"
          items={buildRuntimeMirrorMetaItems([
            { key: "table", label: "Table", value: "agentops_memory" },
            {
              key: "view",
              label: "View",
              value: view === "evolution" ? "Evolution mirror" : "Memory rows",
            },
            {
              key: "rows",
              label: "Rows",
              value: view === "evolution" ? `${evolutionRows.length}` : `${rows?.length ?? 0}`,
            },
            ...(view === "memory"
              ? [
                  { key: "approved", label: "Approved", value: `${approvedCount}` },
                  { key: "monitoring", label: "Monitoring", value: `${monitoringCount}` },
                ]
              : []),
          ])}
        />
      }
      hero={
        <AixiaHero
          surface="command"
          gradientTitle="Memory"
          title="Memory observatory"
          subtitle="Runtime mirror · developer diagnostics"
          description="Unified read-only observability for agentops_memory — all rows and evolution mirror cycles."
          actions={
            <>
              <AixiaButton
                variant="secondary"
                onClick={() => navigate("/system/agent-ops/runtime")}
              >
                Diagnostics hub
              </AixiaButton>
              <AixiaButton variant="secondary" onClick={() => void refresh()} disabled={loading}>
                <RefreshCw className="mr-1.5 h-4 w-4" />
                Refresh
              </AixiaButton>
            </>
          }
          badges={[
            { label: "Runtime / debug", tone: "neutral" },
            { label: "Observatory", tone: "cyan" },
          ]}
        />
      }
    >
      <div className="flex flex-wrap gap-2">
        <AixiaButton
          variant={view === "memory" ? "primary" : "secondary"}
          onClick={() => setView("memory")}
        >
          Memory
        </AixiaButton>
        <AixiaButton
          variant={view === "evolution" ? "primary" : "secondary"}
          onClick={() => setView("evolution")}
        >
          Evolution mirror
        </AixiaButton>
      </div>

      {showMonitoringProposals ? (
        <MonitoringMemoryProposalsReview />
      ) : view === "memory" ? (
        <>
          <div className="flex flex-wrap gap-2">
            <AixiaButton
              variant={sourceFilter === "all" ? "primary" : "secondary"}
              onClick={() => setSourceFilter("all")}
            >
              All memory
            </AixiaButton>
            <AixiaButton
              variant={sourceFilter === "monitoring" ? "primary" : "secondary"}
              onClick={() => setSourceFilter("monitoring")}
            >
              Monitoring memory proposals
            </AixiaButton>
          </div>

          <div className="flex flex-wrap gap-2">
            {(["all", "global", "agent"] as ScopeFilter[]).map((filter) => (
              <AixiaButton
                key={filter}
                variant={scopeFilter === filter ? "primary" : "secondary"}
                onClick={() => setScopeFilter(filter)}
              >
                {filter}
              </AixiaButton>
            ))}
          </div>

          <label className="flex max-w-xl items-center gap-2 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2">
            <Search className="h-4 w-4 text-white/45" />
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search memory id, proposal id, title, agent slug…"
              className="w-full bg-transparent text-sm text-white/85 placeholder:text-white/40 focus:outline-none"
            />
          </label>

          {memoryIdParam ? (
            focusedMemoryLoading ? (
              <AixiaInfoBlock title="Loading memory record" tone="indigo">
                Fetching memory id {memoryIdParam}…
              </AixiaInfoBlock>
            ) : focusedMemoryError ? (
              <AixiaInfoBlock title="Memory record not found" tone="gold">
                {focusedMemoryError} — id: {memoryIdParam}
              </AixiaInfoBlock>
            ) : focusedMemory ? (
              <MemoryFocusedCard
                row={focusedMemory}
                title="Direct memory lookup (bypasses 200-row cap)"
                highlight
              />
            ) : null
          ) : null}

          {searchLookupMemory &&
          !filtered.some((row) => row.id === searchLookupMemory.id) &&
          searchLookupMemory.id !== focusedMemory?.id ? (
            <MemoryFocusedCard row={searchLookupMemory} title="Direct search match" highlight />
          ) : null}

          <AixiaSection title="Memory entries">
            <AgentOpsRuntimeMirrorGate
              loading={memoryMirror.loading}
              error={memoryMirror.error}
              data={rows}
              tableName="agentops_memory"
              isEmpty={(entries) => entries.length === 0}
              emptyIcon={Database}
              emptyFix="Reasoning pipelines write to agentops_memory after processing issues."
              onRetry={() => void memoryMirror.refresh()}
            >
              {() =>
                filtered.length === 0 ? (
                  <AgentOpsRuntimeNoDataState
                    tableName="agentops_memory"
                    title="No memory rows match the current filters"
                    description="Try All memory, clear search, or open a direct memoryId link."
                    suggestedFix="Owner-applied monitoring memory uses content.source = monitoring_memory_proposal."
                    icon={Database}
                  />
                ) : sourceFilter === "monitoring" ? (
                  <AixiaTableShell
                    variant="registry"
                    columns={[
                      { id: "memoryId", tier: "medium" },
                      { id: "scope", tier: "status" },
                      { id: "approved", tier: "status" },
                      { id: "title", tier: "flex" },
                      { id: "proposalId", tier: "medium" },
                      { id: "runId", tier: "medium" },
                      { id: "time", tier: "medium" },
                    ]}
                  >
                    <thead>
                      <tr>
                        <AixiaTableHeaderCell tier="medium">Memory id</AixiaTableHeaderCell>
                        <AixiaTableHeaderCell tier="status">Scope</AixiaTableHeaderCell>
                        <AixiaTableHeaderCell tier="status">Approved</AixiaTableHeaderCell>
                        <AixiaTableHeaderCell tier="flex">Title</AixiaTableHeaderCell>
                        <AixiaTableHeaderCell tier="medium">Proposal id</AixiaTableHeaderCell>
                        <AixiaTableHeaderCell tier="medium">Run id</AixiaTableHeaderCell>
                        <AixiaTableHeaderCell tier="medium">Created</AixiaTableHeaderCell>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((row) =>
                        renderMemoryRow(row, row.id === highlightMemoryId),
                      )}
                    </tbody>
                  </AixiaTableShell>
                ) : (
                  <AixiaTableShell
                    variant="registry"
                    columns={[
                      { id: "scope", tier: "status" },
                      { id: "source", tier: "status" },
                      { id: "approved", tier: "status" },
                      { id: "agent", tier: "medium" },
                      { id: "time", tier: "medium" },
                      { id: "preview", tier: "flex" },
                    ]}
                  >
                    <thead>
                      <tr>
                        <AixiaTableHeaderCell tier="status">Scope</AixiaTableHeaderCell>
                        <AixiaTableHeaderCell tier="status">Source</AixiaTableHeaderCell>
                        <AixiaTableHeaderCell tier="status">Approved</AixiaTableHeaderCell>
                        <AixiaTableHeaderCell tier="medium">Agent</AixiaTableHeaderCell>
                        <AixiaTableHeaderCell tier="medium">Created</AixiaTableHeaderCell>
                        <AixiaTableHeaderCell tier="flex">Content preview</AixiaTableHeaderCell>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((row) =>
                        renderMemoryRow(row, row.id === highlightMemoryId),
                      )}
                    </tbody>
                  </AixiaTableShell>
                )
              }
            </AgentOpsRuntimeMirrorGate>
          </AixiaSection>
        </>
      ) : (
        <AgentOpsRuntimeMirrorGate
          loading={evolutionMirror.loading}
          error={evolutionMirror.error}
          data={systemRows}
          tableName='agentops_memory (source = "system")'
          isEmpty={(r) => r.length === 0}
          emptyIcon={Brain}
          emptyFix='Run node scripts/agentops-evolution-cycle.mjs to populate agentops_memory with source="system".'
          onRetry={() => void evolutionMirror.refresh()}
        >
          {() => (
            <>
              {latest?.system_health_trends ? (
                <AixiaSection title="Stored evolution artifact (developer diagnostic)">
                  <div className="grid gap-3 md:grid-cols-3">
                    <AixiaInfoBlock title="Stored score field">
                      {String(latest.system_health_trends.health_score ?? "—")}
                    </AixiaInfoBlock>
                    <AixiaInfoBlock title="Stored label field">
                      {String(latest.system_health_trends.label ?? "—")}
                    </AixiaInfoBlock>
                    <AixiaInfoBlock title="Open issue count (raw)">
                      {String(latest.system_health_trends.open_issue_count ?? "—")}
                    </AixiaInfoBlock>
                  </div>
                </AixiaSection>
              ) : null}

              <AixiaSection title="Evolution mirror cycles">
                {evolutionRows.length === 0 ? (
                  <AgentOpsRuntimeNoDataState
                    tableName='agentops_memory (source = "system")'
                    title="No parseable evolution mirror cycles"
                    description="Rows exist in agentops_memory but none contain evolution cycle content."
                    suggestedFix="Run node scripts/agentops-evolution-cycle.mjs to write structured evolution payloads."
                    icon={Brain}
                  />
                ) : (
                  <div className="space-y-4">
                    {evolutionRows.map(({ row, content }) => (
                      <div
                        key={row.id}
                        className="rounded-lg border border-white/10 bg-white/[0.02] p-4"
                      >
                        <div className="mb-3 flex flex-wrap items-center gap-2">
                          <AixiaBadge tone={row.approved ? "emerald" : "amber"}>
                            {row.approved ? "approved" : "pending"}
                          </AixiaBadge>
                          <span className="aixia-caption text-white/55">
                            {formatTime(row.created_at)}
                          </span>
                        </div>

                        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                          <AixiaInfoBlock title="Patterns">
                            {(content?.system_patterns as unknown[])?.length ?? 0}
                          </AixiaInfoBlock>
                          <AixiaInfoBlock title="Mutations">
                            {(content?.agent_mutations as unknown[])?.length ?? 0}
                          </AixiaInfoBlock>
                          <AixiaInfoBlock title="Regressions">
                            {(content?.regressions as unknown[])?.length ?? 0}
                          </AixiaInfoBlock>
                          <AixiaInfoBlock title="Predictions">
                            {(content?.predictions as unknown[])?.length ?? 0}
                          </AixiaInfoBlock>
                        </div>

                        <pre className="aixia-code-block mt-3 whitespace-pre-wrap text-xs text-white/75">
                          {formatJsonPreview(content, 4000)}
                        </pre>
                      </div>
                    ))}
                  </div>
                )}
              </AixiaSection>
            </>
          )}
        </AgentOpsRuntimeMirrorGate>
      )}
    </AgentOpsRuntimeMirrorShell>
  );
}
