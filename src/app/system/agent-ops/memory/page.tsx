import { useCallback, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Brain, Database, RefreshCw } from "lucide-react";

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
import {
  fetchRuntimeMemory,
  fetchRuntimeSystemMemory,
} from "@/lib/agentops/runtime/agentOpsRuntimeMirrorClient";
import {
  formatJsonPreview,
  parseEvolutionMemoryContent,
  parseMemoryContent,
} from "@/lib/agentops/runtime/runtimeMirrorUtils";
import { buildRuntimeMirrorMetaItems } from "@/lib/agentops/runtime/runtimeMirrorUiHelpers";
import { useAgentOpsRuntimeMirror } from "@/lib/agentops/runtime/useAgentOpsRuntimeMirror";

type MemoryView = "memory" | "evolution";
type ScopeFilter = "all" | "global" | "agent";

function formatTime(value: string): string {
  return new Date(value).toLocaleString();
}

export default function AgentOpsRuntimeMemoryPage() {
  usePageTitle("Memory observatory");
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const view: MemoryView = searchParams.get("view") === "evolution" ? "evolution" : "memory";
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>("all");

  const memoryFetcher = useCallback(() => fetchRuntimeMemory(), []);
  const evolutionFetcher = useCallback(() => fetchRuntimeSystemMemory(), []);

  const memoryMirror = useAgentOpsRuntimeMirror(memoryFetcher);
  const evolutionMirror = useAgentOpsRuntimeMirror(evolutionFetcher);

  const activeMirror = view === "evolution" ? evolutionMirror : memoryMirror;
  const { loading, refresh } = activeMirror;
  const rows = memoryMirror.data;
  const systemRows = evolutionMirror.data;

  const filtered = useMemo(() => {
    const all = rows ?? [];
    if (scopeFilter === "all") return all;
    return all.filter((row) => row.scope === scopeFilter);
  }, [rows, scopeFilter]);

  const approvedCount = (rows ?? []).filter((row) => row.approved).length;

  const evolutionRows = useMemo(
    () =>
      (systemRows ?? [])
        .map((row) => ({ row, content: parseEvolutionMemoryContent(row) }))
        .filter((entry) => entry.content !== null),
    [systemRows],
  );

  const latest = evolutionRows[0]?.content;

  const setView = (next: MemoryView) => {
    if (next === "memory") {
      setSearchParams({});
    } else {
      setSearchParams({ view: "evolution" });
    }
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
              ? [{ key: "approved", label: "Approved", value: `${approvedCount}` }]
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

      {view === "memory" ? (
        <>
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
              {() => (
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
                    {filtered.map((row) => (
                      <tr key={row.id}>
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
                    ))}
                  </tbody>
                </AixiaTableShell>
              )}
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
