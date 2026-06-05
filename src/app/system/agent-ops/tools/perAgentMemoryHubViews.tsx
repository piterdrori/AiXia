import {
  AlertTriangle,
  Brain,
  Database,
  FileText,
  Lock,
  Shield,
  Users,
  Wrench,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  AixiaBadge,
  AixiaButton,
  AixiaEmptyState,
  AixiaInfoBlock,
  AixiaNavigationStatBlock,
  AixiaSection,
} from "@/components/aixia";
import {
  getAgentOpsAgentMemory,
  getAgentOpsAgentMemoryFileReview,
  getAgentOpsManagedAgents,
  type AgentOpsAgentMemoryFileReviewItem,
  type AgentOpsManagedAgent,
  type AgentOpsManagedAgentMemoryItem,
} from "@/lib/agentops";
import {
  getToolRegistryCategoryRoute,
  getToolRegistryGroupRoute,
} from "@/lib/agentops/tools/toolRegistry";

import { ToolsHubShell } from "./toolsHubViews";

const AGENT_BRAIN_CATEGORY_ID = "agent-brain-memory";
const PER_AGENT_MEMORY_GROUP_ID = "per-agent-memory";

/** Registry route — read-only Per-Agent Memory Hub v1. */
export const PER_AGENT_MEMORY_HUB_PATH = `/system/agent-ops/tools/${AGENT_BRAIN_CATEGORY_ID}/${PER_AGENT_MEMORY_GROUP_ID}`;

const EXPECTED_AGENT_COUNT = 12;

const HUB_BADGES = [
  { label: "Layer 2", tone: "cyan" as const },
  { label: "Read-only", tone: "neutral" as const },
  { label: "Hermes not active", tone: "rose" as const },
  { label: "AgentMemory not connected", tone: "amber" as const },
];

const MEMORY_SOURCES = [
  {
    id: "manifests",
    title: "Agent manifests",
    detail: "Identity baseline, appRole, qaSpecialty, allowedModules, blockedModules, agentOpsOwnerAccess.",
    state: "Existing",
    tone: "emerald" as const,
  },
  {
    id: "supabase",
    title: "agentops_agent_memory",
    detail: "Approved runtime per-agent memory rows in Supabase (owner-gated reads/writes elsewhere).",
    state: "Existing table",
    tone: "emerald" as const,
  },
  {
    id: "owner-feedback",
    title: "agentops_owner_feedback",
    detail: "Owner decisions, interaction notes, and candidate metadata — not full Hermes candidate workflow.",
    state: "Existing",
    tone: "amber" as const,
  },
  {
    id: "file-mirror",
    title: "qa-agent/agent-memory/**",
    detail: "Advisory/generated file mirrors. Not source of truth. Export dry-run often missing; sync not live.",
    state: "Advisory / stale",
    tone: "amber" as const,
  },
  {
    id: "agentmemory",
    title: "AgentMemory",
    detail: "External recall/index layer — not connected to AiXia runtime.",
    state: "Not connected",
    tone: "neutral" as const,
  },
];

const MISSING_INFRASTRUCTURE = [
  "Per-agent candidate → approval workflow (like Global Website Memory)",
  "Agent performance memory (not calculated)",
  "Agent relationship memory (not built)",
  "Tool allowlists mapped per agent",
  "AgentMemory indexing and recall path",
  "Durable sync/export pipeline (live sync off; dry-run advisory only)",
  "Hermes coordinator read path (UI passes snippets today)",
  "Council/Agent global memory policy coordination",
];

type AgentMemorySnapshot = {
  totalRows: number;
  activeRows: number;
  lastUpdate: string | null;
  rows: AgentOpsManagedAgentMemoryItem[];
};

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
}

function summarizeModules(modules: string[], maxVisible = 4): string {
  if (modules.length === 0) return "None listed";
  if (modules.length <= maxVisible) return modules.join(", ");
  const visible = modules.slice(0, maxVisible).join(", ");
  return `${visible} (+${modules.length - maxVisible} more)`;
}

function buildMemorySnapshot(rows: AgentOpsManagedAgentMemoryItem[]): AgentMemorySnapshot {
  const activeRows = rows.filter((row) => row.active).length;
  const lastUpdate =
    rows.length > 0
      ? rows.reduce((latest, row) => {
          if (!latest) return row.createdAt;
          return new Date(row.createdAt).getTime() > new Date(latest).getTime()
            ? row.createdAt
            : latest;
        }, null as string | null)
      : null;

  return {
    totalRows: rows.length,
    activeRows,
    lastUpdate,
    rows,
  };
}

function resolveFileMirrorLabel(item: AgentOpsAgentMemoryFileReviewItem | undefined): string {
  if (!item) return "Advisory / export not generated";
  if (item.fileExists) return "Advisory file exists (not source of truth)";
  return item.notes || "Advisory / not synced";
}

function agentMemoryDetailPath(agentId: string): string {
  return `/system/agent-ops/agents/${encodeURIComponent(agentId)}?panel=memory&mode=view`;
}

export function ToolsHubPerAgentMemoryHubPage() {
  const navigate = useNavigate();
  const [agents, setAgents] = useState<AgentOpsManagedAgent[]>([]);
  const [memoryByAgent, setMemoryByAgent] = useState<Map<string, AgentMemorySnapshot>>(new Map());
  const [fileReviewByAgent, setFileReviewByAgent] = useState<
    Map<string, AgentOpsAgentMemoryFileReviewItem>
  >(new Map());
  const [fileMirrorSummary, setFileMirrorSummary] = useState<string>(
    "Advisory / stale or not synced",
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    void (async () => {
      setLoading(true);
      setError(null);

      const [agentsResult, fileReviewResult] = await Promise.all([
        getAgentOpsManagedAgents(),
        getAgentOpsAgentMemoryFileReview(),
      ]);

      if (!active) return;

      if (agentsResult.error) {
        setError(agentsResult.error);
        setAgents([]);
        setMemoryByAgent(new Map());
        setLoading(false);
        return;
      }

      const managedAgents = agentsResult.data ?? [];
      const memoryResults = await Promise.all(
        managedAgents.map((agent) => getAgentOpsAgentMemory(agent.agentId)),
      );

      if (!active) return;

      const nextMemoryByAgent = new Map<string, AgentMemorySnapshot>();
      managedAgents.forEach((agent, index) => {
        const rows = memoryResults[index]?.data ?? [];
        nextMemoryByAgent.set(agent.agentId, buildMemorySnapshot(rows));
      });

      const reviewItems = fileReviewResult.data?.items ?? [];
      const reviewSummary = fileReviewResult.data?.summary;
      const nextFileReviewByAgent = new Map(
        reviewItems.map((item) => [item.agentId, item] as const),
      );

      let mirrorLabel = "Advisory / stale or not synced";
      if (reviewSummary) {
        if (reviewSummary.totalAgents === 0) {
          mirrorLabel = "Advisory / export dry-run not generated";
        } else if (reviewSummary.filesCreated > 0 && reviewSummary.filesMissing > 0) {
          mirrorLabel = `Partial — ${reviewSummary.filesCreated}/${reviewSummary.totalAgents} advisory files`;
        } else if (
          reviewSummary.filesCreated === reviewSummary.totalAgents &&
          reviewSummary.totalAgents > 0
        ) {
          mirrorLabel = "Advisory files exist — not live-synced";
        } else if (reviewSummary.filesMissing === reviewSummary.totalAgents) {
          mirrorLabel = "Advisory / files missing from last export";
        }
      }

      setAgents(managedAgents);
      setMemoryByAgent(nextMemoryByAgent);
      setFileReviewByAgent(nextFileReviewByAgent);
      setFileMirrorSummary(mirrorLabel);
      setLoading(false);
    })();

    return () => {
      active = false;
    };
  }, []);

  const summaryStats = useMemo(() => {
    let totalMemoryRows = 0;
    let agentsWithActiveMemory = 0;

    for (const agent of agents) {
      const snapshot = memoryByAgent.get(agent.agentId);
      totalMemoryRows += snapshot?.totalRows ?? 0;
      if ((snapshot?.activeRows ?? 0) > 0) agentsWithActiveMemory += 1;
    }

    return {
      totalAgents: agents.length,
      agentsWithActiveMemory,
      totalMemoryRows,
    };
  }, [agents, memoryByAgent]);

  const categoryPath = getToolRegistryCategoryRoute(AGENT_BRAIN_CATEGORY_ID);
  const groupPath = getToolRegistryGroupRoute(AGENT_BRAIN_CATEGORY_ID, PER_AGENT_MEMORY_GROUP_ID);

  return (
    <ToolsHubShell
      title="Per-Agent Memory Support"
      subtitle="Read-only overview of the 12 AgentOps agents and their current memory status."
      parentLabel="Agent Brain & Memory"
      parentPath={categoryPath}
      description="Per-Agent Memory Support is not active yet. This hub maps existing agent identity, Supabase memory rows, manifest permissions, and missing memory infrastructure before Hermes can coordinate agent-specific memory."
      badges={HUB_BADGES}
    >
      <AixiaSection
        surface="command"
        title="Summary"
        description="Honest counts from existing Supabase reads — no Hermes runtime, no AgentMemory."
        icon={Brain}
        bodyClassName="aixia-dash-panel-body"
      >
        {loading ? (
          <AixiaEmptyState
            icon={Brain}
            title="Loading agent memory status"
            description="Reading managed agents, Supabase memory rows, and file mirror advisory status."
          />
        ) : error ? (
          <AixiaInfoBlock tone="rose" icon={AlertTriangle} title="Unable to load hub data">
            {error}
          </AixiaInfoBlock>
        ) : (
          <div className="aixia-tools-hub-hermes-summary-grid">
            <AixiaNavigationStatBlock
              label="Total agents"
              value={String(summaryStats.totalAgents)}
              description={
                summaryStats.totalAgents === EXPECTED_AGENT_COUNT
                  ? "Matches expected 12-agent AgentOps inventory."
                  : `Expected ${EXPECTED_AGENT_COUNT}; verify manifests and managed agent loader.`
              }
              tone="cyan"
            />
            <AixiaNavigationStatBlock
              label="Agents with active memory"
              value={String(summaryStats.agentsWithActiveMemory)}
              description="Active rows in agentops_agent_memory (active = true)."
              tone="emerald"
            />
            <AixiaNavigationStatBlock
              label="Total memory rows"
              value={String(summaryStats.totalMemoryRows)}
              description="All rows per agent (active + inactive) from Supabase."
              tone="indigo"
            />
            <AixiaNavigationStatBlock
              label="AgentMemory"
              value="Not connected"
              description="No AgentMemory recall/index path in runtime."
              tone="neutral"
            />
            <AixiaNavigationStatBlock
              label="Hermes reads directly"
              value="No"
              description="Chats load snippets through UI; Hermes coordinator read path not built."
              tone="rose"
            />
            <AixiaNavigationStatBlock
              label="File mirrors"
              value={fileMirrorSummary}
              description="qa-agent/agent-memory/** — advisory only, not source of truth."
              tone="amber"
            />
          </div>
        )}
      </AixiaSection>

      <AixiaSection
        surface="command"
        className="aixia-tools-hub-per-agent-cards-section aixia-tools-hub-hermes-section"
        title="Agent memory cards"
        description={
          loading
            ? "Loading…"
            : `${agents.length} agents · read-only status · open existing agent memory panel from each card`
        }
        icon={Users}
        bodyClassName="aixia-tools-hub-per-agent-cards-body aixia-dash-panel-body"
      >
        {loading ? null : error ? null : agents.length === 0 ? (
          <AixiaEmptyState
            icon={Users}
            title="No managed agents found"
            description="getAgentOpsManagedAgents returned an empty list."
          />
        ) : (
          <div className="aixia-tools-hub-per-agent-cards-scroll aixia-fab-safe-scroll aixia-scrollbar">
            <div
              className="aixia-tools-hub-per-agent-cards-grid"
              data-testid="per-agent-memory-hub-grid"
            >
            {agents.map((agent) => {
              const snapshot = memoryByAgent.get(agent.agentId);
              const fileReview = fileReviewByAgent.get(agent.agentId);
              const supabaseLabel =
                (snapshot?.totalRows ?? 0) > 0
                  ? "Supabase rows found"
                  : "No Supabase rows yet";

              return (
                <article
                  key={agent.agentId}
                  className="aixia-tools-hub-hermes-memory-card"
                  data-testid={`per-agent-memory-card-${agent.agentId}`}
                >
                  <div className="aixia-tools-hub-hermes-memory-card-head">
                    <div className="aixia-tools-hub-hermes-memory-card-title-row">
                      <Users
                        className="aixia-tools-hub-hermes-memory-card-icon"
                        aria-hidden
                      />
                      <h3 className="aixia-tools-hub-hermes-memory-card-title">
                        {agent.displayName}
                      </h3>
                    </div>
                    <AixiaBadge tone="neutral">{agent.status}</AixiaBadge>
                  </div>

                  <dl className="aixia-tools-hub-hermes-memory-meta">
                    <div>
                      <dt>Agent ID</dt>
                      <dd>
                        <code>{agent.agentId}</code>
                      </dd>
                    </div>
                    <div>
                      <dt>Role / QA specialty</dt>
                      <dd>{agent.qaSpecialty || "—"}</dd>
                    </div>
                    <div>
                      <dt>Responsibility / purpose</dt>
                      <dd className="aixia-tools-hub-per-agent-card-clamp">
                        {agent.purpose || "—"}
                      </dd>
                    </div>
                    <div className="aixia-tools-hub-hermes-memory-meta-wide">
                      <dt>Memory source</dt>
                      <dd>
                        <span className="aixia-tools-hub-per-agent-card-clamp">
                          agentops_agent_memory · manifest · file mirror advisory
                        </span>
                        <span className="aixia-tools-hub-per-agent-card-subline aixia-tools-hub-per-agent-card-clamp aixia-tools-hub-per-agent-card-clamp-3">
                          Supabase: {supabaseLabel} · Mirror:{" "}
                          {resolveFileMirrorLabel(fileReview)}
                        </span>
                      </dd>
                    </div>
                    <div>
                      <dt>Active memory count</dt>
                      <dd>{snapshot?.activeRows ?? agent.memoryCount ?? 0}</dd>
                    </div>
                    <div>
                      <dt>Total memory rows</dt>
                      <dd>{snapshot?.totalRows ?? 0}</dd>
                    </div>
                    <div>
                      <dt>Last memory update</dt>
                      <dd>{formatDateTime(snapshot?.lastUpdate)}</dd>
                    </div>
                    <div>
                      <dt>Allowed modules</dt>
                      <dd className="aixia-tools-hub-per-agent-card-clamp">
                        {summarizeModules(agent.allowedModules)}
                      </dd>
                    </div>
                    <div>
                      <dt>Blocked modules</dt>
                      <dd className="aixia-tools-hub-per-agent-card-clamp">
                        {summarizeModules(agent.blockedModules)}
                      </dd>
                    </div>
                    <div>
                      <dt>Tools status</dt>
                      <dd>Tools not mapped per agent</dd>
                    </div>
                    <div>
                      <dt>Hermes reads today</dt>
                      <dd>No — chats load snippets through UI</dd>
                    </div>
                    <div>
                      <dt>Chat reads snippets</dt>
                      <dd>Partial — active Supabase rows via Issue/Agent/Council UI</dd>
                    </div>
                    <div>
                      <dt>AgentMemory</dt>
                      <dd>Not connected</dd>
                    </div>
                  </dl>

                  <div className="aixia-tools-hub-per-agent-card-actions">
                    <AixiaButton
                      variant="secondary"
                      onClick={() => navigate(agentMemoryDetailPath(agent.agentId))}
                    >
                      Open Agent Memory
                    </AixiaButton>
                  </div>
                </article>
              );
            })}
            </div>
          </div>
        )}
      </AixiaSection>

      <AixiaSection
        surface="command"
        className="aixia-tools-hub-hermes-section"
        title="Memory sources"
        description="Where per-agent memory comes from today versus what is not connected."
        icon={Database}
        bodyClassName="aixia-dash-panel-body"
      >
        <div className="aixia-tools-hub-hermes-memory-grid">
          {MEMORY_SOURCES.map((source) => (
            <article
              key={source.id}
              className="aixia-tools-hub-hermes-memory-card"
              data-testid={`per-agent-memory-source-${source.id}`}
            >
              <div className="aixia-tools-hub-hermes-memory-card-head">
                <h3 className="aixia-tools-hub-hermes-memory-card-title">{source.title}</h3>
                <AixiaBadge tone={source.tone}>{source.state}</AixiaBadge>
              </div>
              <p className="aixia-tools-hub-hermes-memory-intro">{source.detail}</p>
            </article>
          ))}
        </div>
      </AixiaSection>

      <AixiaSection
        surface="command"
        className="aixia-tools-hub-hermes-section"
        title="What is missing before Hermes can coordinate per-agent memory"
        description="Layer 2 foundation gaps — not started or not connected."
        icon={Wrench}
        bodyClassName="aixia-dash-panel-body"
      >
        <ul className="aixia-tools-hub-hermes-roadmap-list aixia-tools-hub-per-agent-missing-list">
          {MISSING_INFRASTRUCTURE.map((item) => (
            <li key={item} className="aixia-tools-hub-hermes-roadmap-item">
              <p className="aixia-tools-hub-hermes-roadmap-purpose">{item}</p>
            </li>
          ))}
        </ul>
      </AixiaSection>

      <AixiaSection
        surface="command"
        title="Safety"
        description="Read-only hub — no runtime writes."
        icon={Shield}
        bodyClassName="aixia-dash-panel-body"
      >
        <AixiaInfoBlock tone="gold" icon={Lock} title="Read-only hub / Layer 2 foundation">
          This page is read-only. It does not write agent memory, AgentMemory, source-of-truth
          files, registry files, or Hermes runtime memory. Hermes is not active. AgentMemory is not
          connected.
        </AixiaInfoBlock>
      </AixiaSection>

      <AixiaInfoBlock tone="cyan" icon={FileText} title="Registry route">
        Hub path: <code>{groupPath}</code> · Parent Hermes layer card links here for status only.
      </AixiaInfoBlock>
    </ToolsHubShell>
  );
}
