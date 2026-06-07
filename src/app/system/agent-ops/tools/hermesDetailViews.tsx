import {
  AlertTriangle,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Database,
  Eye,
  FileText,
  RefreshCw,
  GitBranch,
  Layers,
  LineChart,
  Lock,
  MapPin,
  MessageSquare,
  Search,
  Server,
  Shield,
  Sparkles,
  Users,
  Wrench,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  AixiaBadge,
  AixiaButton,
  AixiaCommandHubMetaStrip,
  AixiaCommandPageLayout,
  AixiaEmptyState,
  AixiaHero,
  AixiaInfoBlock,
  AixiaModal,
  AixiaTextareaField,
  AixiaNavigationCard,
  AixiaNavigationGrid,
  AixiaNavigationStatBlock,
  AixiaProgressiveDisclosureGroup,
  AixiaSection,
} from "@/components/aixia";
import {
  AGENTOPS_GLOBAL_MEMORY_SCAN_FREQUENCIES,
  AGENTOPS_HERMES_ADAPTER_READINESS,
  assembleAgentOpsHermesPreviewContext,
  getAgentOpsHermesRuntimeHealth,
  probeAgentOpsHermesAdvisoryRuntime,
  type AgentOpsHermesContextAssemblerPreview,
  type AgentOpsHermesContextAssemblerSection,
  type AgentOpsHermesContextAssemblerSectionStatus,
  type AgentOpsHermesToolRegistryPreview,
  type AgentOpsHermesToolRegistryRelevantTool,
  type AgentOpsHermesRuntimeHealth,
  type AgentOpsHermesEnvGateStatus,
  buildAgentOpsGlobalMemoryPartialSnapshot,
  createDefaultAgentOpsGlobalMemorySourcePriority,
  formatAgentOpsGlobalMemoryScanFrequency,
  getAgentOpsGlobalMemoryCommandRunnerStatus,
  getAgentOpsGlobalMemoryPreferences,
  getAgentOpsOwnerStatus,
  GLOBAL_MEMORY_READ_ONLY_CLI_COMMANDS,
  recordAgentOpsGlobalMemoryCommandRun,
  recordAgentOpsGlobalMemoryPartialSnapshot,
  recordAgentOpsGlobalMemoryScanFrequencyPreference,
  recordAgentOpsGlobalMemoryScanPausePreference,
  recordAgentOpsGlobalMemoryScanRequested,
  recordAgentOpsGlobalMemorySourcePriorityPreference,
  runAgentOpsGlobalMemoryCommand,
  generateAgentOpsGlobalMemoryCandidatesFromLastScan,
  getAgentOpsGlobalMemoryCandidates,
  getAgentOpsGlobalMemoryApprovedRecords,
  formatAgentOpsGlobalMemoryForHermesContext,
  getAgentOpsGlobalMemoryCandidateGeneratorStatus,
  recordAgentOpsGlobalMemoryCandidateDecision,
  recordAgentOpsGlobalMemoryCandidateEdit,
  type AgentOpsGlobalMemoryApprovedRecord,
  type AgentOpsGlobalMemoryApprovedRecordStatus,
  type AgentOpsGlobalMemoryHermesPreviewResult,
  type AgentOpsGlobalMemoryCandidate,
  type AgentOpsGlobalMemoryCandidateDecision,
  type AgentOpsGlobalMemoryCandidateStatus,
  type AgentOpsGlobalMemoryCommandId,
  type AgentOpsGlobalMemoryCommandRunResult,
  type AgentOpsGlobalMemoryPartialSnapshot,
  type AgentOpsGlobalMemoryPreferences,
  type AgentOpsGlobalMemoryScanFrequency,
  type AgentOpsGlobalMemoryScanPausePreference,
  type AgentOpsGlobalMemorySourcePriorityPreference,
} from "@/lib/agentops";
import {
  getToolRegistryEntry,
  getToolRegistryGroupRoute,
  type ToolRegistryEntry,
} from "@/lib/agentops/tools/toolRegistry";

import { PER_AGENT_MEMORY_HUB_PATH } from "./perAgentMemoryHubViews";
import { ToolsHubShell } from "./toolsHubViews";

const MEMORY_COORDINATION_GROUP_ID = "memory-coordination-tools";
const AGENT_BRAIN_CATEGORY_ID = "agent-brain-memory";
const HERMES_TOOL_SLUG = "hermes";

/** Hermes main page panel bodies — paired with non-cropping CSS on `.aixia-tools-hub-hermes-page`. */
const HERMES_MAIN_PANEL_BODY_CLASS = "aixia-dash-panel-body aixia-tools-hub-hermes-panel-body";

/** Hermes layer 1 — Global Website Memory read index (H2). */
const HERMES_GLOBAL_WEBSITE_MEMORY_PATH = `/system/agent-ops/tools/${AGENT_BRAIN_CATEGORY_ID}/${MEMORY_COORDINATION_GROUP_ID}/${HERMES_TOOL_SLUG}/global-website-memory`;

function getHermesDetailPath(): string {
  return `/system/agent-ops/tools/${AGENT_BRAIN_CATEGORY_ID}/${MEMORY_COORDINATION_GROUP_ID}/${HERMES_TOOL_SLUG}`;
}

const HERMES_STATUS_BADGES = [
  { label: "Advisory runtime active", tone: "emerald" as const },
  { label: "Context active", tone: "cyan" as const },
  { label: "Workflows 1–3 active", tone: "emerald" as const },
  { label: "Coordinator not active", tone: "rose" as const },
  { label: "Writes blocked", tone: "violet" as const },
];

const HERMES_MODULE_READINESS_CARDS = [
  {
    label: "Runtime",
    value: "Active on staging",
    description: "Doubao Ark advisory transport",
    tone: "emerald" as const,
  },
  {
    label: "Context",
    value: "Active",
    description: "Read-only AiXia context injection",
    tone: "cyan" as const,
  },
  {
    label: "Issue workflows",
    value: "1–3 accepted",
    description: "Advisory, prompt review, fix report review",
    tone: "emerald" as const,
  },
  {
    label: "Coordinator",
    value: "Not active",
    description: "No automation, writes, tools, or production",
    tone: "rose" as const,
  },
] as const;

const HERMES_STAGE_ROADMAP = {
  completed: [
    "A1 Runtime Health",
    "A2 Context injection",
    "Doubao Ark provider",
    "Workflow 1 — Issue Advisory Assist",
    "Workflow 2 — Cursor Prompt Reviewer",
    "Workflow 3 — Fix Report / Verification Reviewer",
  ],
  inProgress: ["Stage B Recommendation Artifact Store final QA"],
  notStarted: [
    "Automation",
    "Scheduler",
    "AgentMemory",
    "User Usage Learning",
    "MCP / avatar",
    "Production activation",
    "Full coordinator",
  ],
} as const;

const HERMES_NEXT_ACTIVATION_STEP =
  "Next: finish Stage B save/refresh QA, then align readiness docs. After that, design controlled automation.";

const HERMES_ADVISORY_SAFETY_LINE =
  "Hermes is advisory-active only. Coordinator automation, memory writes, source-of-truth writes, tool execution, and production activation remain blocked.";

const HERMES_LAYERS = [
  {
    id: "global-website-memory",
    title: "Global Website Memory",
    icon: Layers,
    tone: "amber" as const,
    status: "Partial foundation / read-only",
    purpose: "Read-only global memory index, scans, and approved metadata preview.",
    missing: "Not a full Hermes memory coordinator.",
    detailPath: HERMES_GLOBAL_WEBSITE_MEMORY_PATH,
    actionLabel: "Open",
    disabled: false,
  },
  {
    id: "per-agent-memory",
    title: "Per-Agent Memory Support",
    icon: Users,
    tone: "cyan" as const,
    status: "Read-only hub started",
    purpose: "Read-only hub for 12 agents and Supabase memory rows.",
    missing: "AgentMemory not connected. Full coordination not active.",
    detailPath: PER_AGENT_MEMORY_HUB_PATH,
    actionLabel: "Open hub",
    disabled: false,
  },
  {
    id: "usage-learning",
    title: "User Usage Learning",
    icon: LineChart,
    tone: "neutral" as const,
    status: "Not started",
    purpose: "Piter/user usage learning — not connected.",
    missing: "Privacy rules and analytics read path not defined.",
    actionLabel: "Planned",
    disabled: true,
  },
  {
    id: "mcp-avatar",
    title: "MCP / Avatar Task Agent Support",
    icon: Sparkles,
    tone: "violet" as const,
    status: "Not started",
    purpose: "Future permission-bound task agent layer.",
    missing: "Architecture only — no execution layer built.",
    actionLabel: "Planned",
    disabled: true,
  },
];

const HERMES_STAGE_ROADMAP_TOTAL =
  HERMES_STAGE_ROADMAP.completed.length +
  HERMES_STAGE_ROADMAP.inProgress.length +
  HERMES_STAGE_ROADMAP.notStarted.length;

type ConnectionRow = {
  system: string;
  status: string;
  detail: string;
  connected: boolean;
};

const HERMES_CONNECTIONS: ConnectionRow[] = [
  {
    system: "Issue Workspace",
    status: "Workflows 1–3 active",
    detail:
      "Issue Hermes Advisory Assist: W1 advisory, W2 cursor prompt review, W3 fix report review accepted on staging. Stage B artifacts built — final save/refresh QA pending. Not coordinator recall.",
    connected: true,
  },
  {
    system: "Doubao Ark / advisory transport",
    status: "Advisory active on staging",
    detail:
      "/api/agentops/hermes and /api/agentops/llm are shared proxies — read-only advisory via Doubao Ark, not coordinator.",
    connected: true,
  },
  {
    system: "Agent memory snippets",
    status: "UI pass-through only",
    detail:
      "Issue UI may pass active agentops_agent_memory rows; Hermes runtime does not load them.",
    connected: true,
  },
  {
    system: "AgentMemory",
    status: "Not connected · not installed",
    detail: "External package not cloned; qa-agent/hermes/.agentmemory-local/ empty.",
    connected: false,
  },
  {
    system: "Source-of-truth files",
    status: "Not connected",
    detail: "aixia-global/ and qa-agent mirrors are not read by the Hermes adapter.",
    connected: false,
  },
  {
    system: "Analytics / usage learning",
    status: "Scripts only · not connected",
    detail: "export-analytics-for-hermes.mjs and analytics:hermes are manual CLI tools.",
    connected: false,
  },
  {
    system: "CodeGraph",
    status: "Planned · not connected to Hermes runtime",
    detail: "Separate MCP; sanitized hints planned in specs only.",
    connected: false,
  },
  {
    system: "Browser QA / reports",
    status: "Not connected to Hermes runtime",
    detail: "Evidence tools are separate; no Hermes ingestion of QA artifacts.",
    connected: false,
  },
  {
    system: "Tools Hub registry",
    status: "Metadata display only",
    detail: "Registry entry and Tools Hub UI — no live coordinator or runtime writes.",
    connected: true,
  },
];

function formatHermesGateLabel(gate: AgentOpsHermesEnvGateStatus): string {
  switch (gate) {
    case "enabled":
      return "Enabled";
    case "disabled":
      return "Disabled";
    default:
      return "Unknown";
  }
}

function formatHermesTransportMode(health: AgentOpsHermesRuntimeHealth | null): string {
  if (!health) return "Health unknown";
  if (health.productionBlocked) return "Blocked (production)";
  switch (health.mode) {
    case "advisory_transport":
      return health.transportReachable ? "Advisory runtime reachable" : "Advisory transport";
    case "blocked":
      return "Blocked";
    default:
      return "Unavailable";
  }
}

function hermesHealthTone(
  health: AgentOpsHermesRuntimeHealth | null,
): "emerald" | "amber" | "rose" | "neutral" | "violet" {
  if (!health || health.status === "unavailable") return "rose";
  if (health.status === "blocked" || health.productionBlocked) return "amber";
  if (health.status === "ok" && health.transportReachable) return "emerald";
  return "neutral";
}

function contextSectionStatusTone(
  status: AgentOpsHermesContextAssemblerSectionStatus,
): "emerald" | "amber" | "rose" | "neutral" | "violet" | "cyan" {
  switch (status) {
    case "included":
      return "emerald";
    case "preview_only":
      return "cyan";
    case "not_connected":
      return "neutral";
    case "unavailable":
      return "rose";
    case "empty":
    default:
      return "amber";
  }
}

function formatContextSectionStatus(status: AgentOpsHermesContextAssemblerSectionStatus): string {
  switch (status) {
    case "included":
      return "Included";
    case "preview_only":
      return "Preview only";
    case "not_connected":
      return "Not connected";
    case "unavailable":
      return "Unavailable";
    case "empty":
    default:
      return "Empty";
  }
}

type HermesRelevantToolFamilyId =
  | "memory"
  | "code-context"
  | "evidence"
  | "build"
  | "runtime";

const HERMES_RELEVANT_TOOL_FAMILIES: {
  id: HermesRelevantToolFamilyId;
  title: string;
  hint: string;
}[] = [
  {
    id: "memory",
    title: "Memory & Coordination",
    hint: "Metadata only · preview only · coordinator not active",
  },
  {
    id: "code-context",
    title: "Code / Context",
    hint: "Read-only context tools · no execution from Hermes",
  },
  {
    id: "evidence",
    title: "Evidence / QA",
    hint: "QA evidence metadata · not live tool execution",
  },
  {
    id: "build",
    title: "Build / Development",
    hint: "Dev toolchain display · no MCP execution",
  },
  {
    id: "runtime",
    title: "Runtime / Platform",
    hint: "Platform awareness · not connected for coordinator use",
  },
];

const HERMES_RELEVANT_TOOL_FAMILY_BY_ID: Record<string, HermesRelevantToolFamilyId> = {
  "mct-hermes": "memory",
  "mct-agentmemory": "memory",
  "global-memory": "memory",
  "per-agent-memory": "memory",
  "memory-coordination-tools": "memory",
  "gm-tool-registry": "memory",
  "ccu-codegraph": "code-context",
  "ccu-understand-anything": "code-context",
  "ccu-claude-context": "code-context",
  "build-codegraph-mcp": "code-context",
  "et-browser-qa": "evidence",
  "et-playwright": "evidence",
  "et-reports": "evidence",
  "et-guardrails": "evidence",
  "et-verification-results": "evidence",
  "qa-browser-runner": "evidence",
  "qa-playwright-runner": "evidence",
  "qa-verification-runner": "evidence",
  "build-cursor": "build",
  "build-github-tools": "build",
  "build-supabase-mcp": "build",
  "build-vercel-mcp": "build",
  "build-local-scripts": "build",
  "runtime-supabase": "runtime",
  "runtime-vercel": "runtime",
  "runtime-auth": "runtime",
  "runtime-database": "runtime",
  "runtime-storage": "runtime",
  "runtime-realtime": "runtime",
  "runtime-edge-functions": "runtime",
  "runtime-background-workers": "runtime",
};

function truncateHermesPreviewLine(text: string, max = 88): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}

function groupHermesRelevantToolsByFamily(
  tools: AgentOpsHermesToolRegistryRelevantTool[],
): { family: (typeof HERMES_RELEVANT_TOOL_FAMILIES)[number]; tools: AgentOpsHermesToolRegistryRelevantTool[] }[] {
  const buckets = new Map<HermesRelevantToolFamilyId, AgentOpsHermesToolRegistryRelevantTool[]>();

  for (const tool of tools) {
    const familyId = HERMES_RELEVANT_TOOL_FAMILY_BY_ID[tool.id] ?? "runtime";
    const list = buckets.get(familyId) ?? [];
    list.push(tool);
    buckets.set(familyId, list);
  }

  return HERMES_RELEVANT_TOOL_FAMILIES.filter((family) => (buckets.get(family.id)?.length ?? 0) > 0).map(
    (family) => ({
      family,
      tools: buckets.get(family.id) ?? [],
    }),
  );
}

function HermesRelevantToolPreviewRow({ tool }: { tool: AgentOpsHermesToolRegistryRelevantTool }) {
  const pathLabel = [tool.groupTitle, tool.categoryTitle].filter(Boolean).join(" · ");

  return (
    <article className="aixia-tools-hub-hermes-tool-registry-preview-tool-row">
      <div className="aixia-tools-hub-hermes-tool-registry-preview-tool-row-top">
        <div className="aixia-tools-hub-hermes-tool-registry-preview-tool-row-title-wrap">
          <span className="aixia-tools-hub-hermes-tool-registry-preview-tool-row-name">
            {tool.title}
          </span>
          {pathLabel ? (
            <span className="aixia-tools-hub-hermes-tool-registry-preview-tool-row-path">
              {pathLabel}
            </span>
          ) : null}
        </div>
        <AixiaBadge tone="neutral">{tool.statusLabel}</AixiaBadge>
      </div>
      <div className="aixia-tools-hub-hermes-tool-registry-preview-tool-row-chips">
        <span
          className="aixia-tools-hub-hermes-tool-registry-preview-chip"
          title={tool.installedStatus}
        >
          Install · {truncateHermesPreviewLine(tool.installedStatus, 52)}
        </span>
        <span
          className="aixia-tools-hub-hermes-tool-registry-preview-chip"
          title={tool.configuredStatus}
        >
          Config · {truncateHermesPreviewLine(tool.configuredStatus, 52)}
        </span>
        <span
          className="aixia-tools-hub-hermes-tool-registry-preview-chip"
          title={tool.currentRuntime}
        >
          Runtime · {truncateHermesPreviewLine(tool.currentRuntime, 52)}
        </span>
      </div>
      <div className="aixia-tools-hub-hermes-tool-registry-preview-tool-row-use">
        <p>
          <span className="aixia-tools-hub-hermes-tool-registry-preview-use-label">Today</span>{" "}
          {tool.hermesUseToday}
        </p>
        <p>
          <span className="aixia-tools-hub-hermes-tool-registry-preview-use-label">Future</span>{" "}
          {tool.futureHermesUse}
        </p>
      </div>
    </article>
  );
}

function HermesToolRegistryContextPreview({
  registryPreview,
}: {
  registryPreview: AgentOpsHermesToolRegistryPreview | null;
}) {
  const relevantToolFamilies = useMemo(
    () => groupHermesRelevantToolsByFamily(registryPreview?.relevantTools ?? []),
    [registryPreview?.relevantTools],
  );

  if (!registryPreview) return null;

  const { summary, categories, safetyBanner } = registryPreview;

  const summaryCards = [
    {
      label: "Registry nodes",
      value: String(summary.totalRegistryNodes),
      description: "Tools Hub metadata — no writes",
      tone: "neutral" as const,
    },
    {
      label: "Main categories",
      value: String(summary.mainCategories),
      description: "Seven Tools Hub categories",
      tone: "cyan" as const,
    },
    {
      label: "Hermes-related",
      value: String(summary.hermesRelatedNodes),
      description: "Display only — not coordinator-connected",
      tone: "violet" as const,
    },
    {
      label: "Existing / partial",
      value: String(summary.existingOrPartialCount),
      description: "Honest registry status mix",
      tone: "amber" as const,
    },
    {
      label: "Planned / not connected",
      value: String(summary.plannedOrNotConnectedCount),
      description: "Not installed or not wired",
      tone: "rose" as const,
    },
    {
      label: "Execution enabled",
      value: "No",
      description: "No tool execution from Hermes preview",
      tone: "rose" as const,
    },
  ];

  return (
    <div
      className="aixia-tools-hub-hermes-tool-registry-preview"
      data-testid="hermes-tool-registry-context-preview"
    >
      <h4 className="aixia-tools-hub-hermes-tool-registry-preview-heading">
        Tool Registry Context Preview
      </h4>

      <AixiaInfoBlock tone="rose" icon={Lock} title="Registry preview only">
        {safetyBanner} No tool activation, configuration, agent assignment changes, or MCP
        execution.
      </AixiaInfoBlock>

      <div className="aixia-tools-hub-hermes-tool-registry-preview-summary">
        {summaryCards.map((card) => (
          <AixiaNavigationStatBlock
            key={card.label}
            label={card.label}
            value={card.value}
            description={card.description}
            tone={card.tone}
          />
        ))}
      </div>

      <AixiaProgressiveDisclosureGroup
        title="Tool registry details"
        description="Seven categories and Hermes-relevant tools — metadata only, collapsed by default."
        defaultOpen={false}
        density="compact"
        className="aixia-progressive-disclosure--secondary"
        icon={<Wrench className="h-4 w-4" />}
        badge={<AixiaBadge tone="neutral">{summary.mainCategories} categories</AixiaBadge>}
        testId="hermes-tool-registry-details"
      >
        <div className="aixia-tools-hub-hermes-tool-registry-preview-categories">
          <p className="aixia-tools-hub-hermes-tool-registry-preview-subheading">
            Seven Tools Hub categories
          </p>
          <div className="aixia-tools-hub-hermes-tool-registry-preview-category-grid">
            {categories.map((category) => (
              <article
                key={category.categoryId}
                className="aixia-tools-hub-hermes-tool-registry-preview-category-card"
              >
                <div className="aixia-tools-hub-hermes-tool-registry-preview-category-head">
                  <h5 className="aixia-tools-hub-hermes-tool-registry-preview-category-title">
                    {category.title}
                  </h5>
                  <AixiaBadge tone="neutral">{category.nodeCount} nodes</AixiaBadge>
                </div>
                <p className="aixia-tools-hub-hermes-tool-registry-preview-category-meta">
                  {category.directChildCount} group(s) · {category.statusMix}
                </p>
                <p className="aixia-tools-hub-hermes-tool-registry-preview-category-keys">
                  Key: {category.keyTools.join(" · ") || "—"}
                </p>
                <p className="aixia-tools-hub-hermes-tool-registry-preview-category-relevance">
                  {category.hermesRelevance}
                </p>
                <p className="aixia-tools-hub-hermes-tool-registry-preview-category-safety">
                  {category.safetyStatus}
                </p>
              </article>
            ))}
          </div>
        </div>

        <div className="aixia-tools-hub-hermes-tool-registry-preview-relevant">
          <p className="aixia-tools-hub-hermes-tool-registry-preview-subheading">
            Hermes-relevant tools (metadata only)
          </p>
          <p className="aixia-tools-hub-hermes-tool-registry-preview-relevant-lead">
            Preview only · no tool execution · no registry writes · coordinator not active
          </p>
          <div
            className="aixia-tools-hub-hermes-tool-registry-preview-relevant-panel"
            data-testid="hermes-tool-registry-relevant-panel"
          >
            {relevantToolFamilies.map(({ family, tools }) => (
              <section
                key={family.id}
                className="aixia-tools-hub-hermes-tool-registry-preview-family-group"
              >
                <div className="aixia-tools-hub-hermes-tool-registry-preview-family-head">
                  <h6 className="aixia-tools-hub-hermes-tool-registry-preview-family-title">
                    {family.title}
                  </h6>
                  <span className="aixia-tools-hub-hermes-tool-registry-preview-family-count">
                    {tools.length} tool{tools.length === 1 ? "" : "s"}
                  </span>
                </div>
                <p className="aixia-tools-hub-hermes-tool-registry-preview-family-hint">
                  {family.hint}
                </p>
                <div className="aixia-tools-hub-hermes-tool-registry-preview-family-tools">
                  {tools.map((tool) => (
                    <HermesRelevantToolPreviewRow key={tool.id} tool={tool} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </AixiaProgressiveDisclosureGroup>
    </div>
  );
}

function HermesContextAssemblerPreviewPanel() {
  const [preview, setPreview] = useState<AgentOpsHermesContextAssemblerPreview | null>(null);
  const [loading, setLoading] = useState(false);

  const refreshPreview = useCallback(async () => {
    setLoading(true);
    try {
      const next = await assembleAgentOpsHermesPreviewContext({
        globalLimit: 10,
        perAgentSnippetLimit: 3,
      });
      setPreview(next);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshPreview();
  }, [refreshPreview]);

  const assembledLabel = preview?.assembledAt
    ? new Date(preview.assembledAt).toLocaleString()
    : "Not assembled yet";

  const summaryCards = preview
    ? [
        {
          label: "Global memory lines",
          value: String(preview.stats.globalMemoryCount),
          description: "Included in preview (metadata only)",
          tone: "amber" as const,
        },
        {
          label: "Per-agent active rows",
          value: String(preview.stats.perAgentMemoryCount),
          description: "Active Supabase rows across 12 agents",
          tone: "cyan" as const,
        },
        {
          label: "Registry nodes",
          value: String(preview.stats.toolRegistryCount),
          description: "Tools Hub metadata display only",
          tone: "neutral" as const,
        },
        {
          label: "Issue context",
          value: preview.stats.issueContextIncluded ? "Provided" : "None",
          description: preview.stats.issueContextIncluded
            ? "Issue code only — not full payload"
            : "No issue selected",
          tone: "violet" as const,
        },
        {
          label: "Coordinator",
          value: "Not active",
          description: "Preview not sent to Hermes runtime",
          tone: "rose" as const,
        },
        {
          label: "Writes",
          value: "Blocked",
          description: "No memory or SOT writes",
          tone: "rose" as const,
        },
      ]
    : [];

  return (
    <div
      className="aixia-tools-hub-hermes-context-assembler"
      data-testid="hermes-context-assembler-preview"
    >
      <div className="aixia-tools-hub-hermes-context-assembler-actions">
        <AixiaInfoBlock tone="indigo" icon={FileText} title="Preview only — not sent to Hermes">
          Read-only context assembly for what Hermes would receive later. Coordinator not active.
          AgentMemory not connected. Official law remains aixia-global only.
        </AixiaInfoBlock>
        <AixiaButton
          variant="secondary"
          onClick={() => void refreshPreview()}
          disabled={loading}
          className="aixia-tools-hub-hermes-context-assembler-refresh"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} aria-hidden />
          Refresh context preview
        </AixiaButton>
      </div>

      <p className="aixia-tools-hub-hermes-context-assembler-meta">
        Assembled: {assembledLabel} · Mode: preview only · Not sent to Hermes runtime
      </p>

      {preview?.loadErrors.length ? (
        <AixiaInfoBlock tone="gold" icon={AlertTriangle} title="Partial load">
          {preview.loadErrors.join(" ")}
        </AixiaInfoBlock>
      ) : null}

      {summaryCards.length > 0 ? (
        <div className="aixia-tools-hub-hermes-context-assembler-summary">
          {summaryCards.map((card) => (
            <AixiaNavigationStatBlock
              key={card.label}
              label={card.label}
              value={card.value}
              description={card.description}
              tone={card.tone}
            />
          ))}
        </div>
      ) : null}

      <HermesToolRegistryContextPreview registryPreview={preview?.toolRegistryPreview ?? null} />

      <AixiaProgressiveDisclosureGroup
        title="Assembler section payloads"
        description="Raw assembled context sections — preview only, not sent to runtime."
        defaultOpen={false}
        density="compact"
        className="aixia-progressive-disclosure--secondary"
        icon={<FileText className="h-4 w-4" />}
        badge={
          <AixiaBadge tone="neutral">{preview?.sections.length ?? 0} sections</AixiaBadge>
        }
        testId="hermes-assembler-section-payloads"
      >
        <div className="aixia-tools-hub-hermes-context-assembler-sections">
          {(preview?.sections ?? []).map((section) => (
            <HermesContextAssemblerSectionCard key={section.sectionId} section={section} />
          ))}
        </div>
      </AixiaProgressiveDisclosureGroup>
    </div>
  );
}

function HermesContextAssemblerSectionCard({
  section,
}: {
  section: AgentOpsHermesContextAssemblerSection;
}) {
  return (
    <article className="aixia-tools-hub-hermes-context-assembler-card">
      <div className="aixia-tools-hub-hermes-context-assembler-card-head">
        <h4 className="aixia-tools-hub-hermes-context-assembler-card-title">{section.title}</h4>
        <AixiaBadge tone={contextSectionStatusTone(section.status)}>
          {formatContextSectionStatus(section.status)}
        </AixiaBadge>
      </div>
      <p className="aixia-tools-hub-hermes-context-assembler-card-source">
        Source: <code>{section.source}</code>
      </p>
      {section.safetyNote ? (
        <p className="aixia-tools-hub-hermes-context-assembler-card-note">{section.safetyNote}</p>
      ) : null}
      <ul className="aixia-tools-hub-hermes-context-assembler-card-entries">
        {section.entries.map((entry, index) => (
          <li key={`${section.sectionId}-${index}`}>{entry}</li>
        ))}
      </ul>
    </article>
  );
}

function formatLlmProviderLabel(provider?: AgentOpsHermesRuntimeHealth["provider"]): string {
  if (provider === "doubao_ark") return "Doubao Ark";
  if (provider === "ollama") return "Ollama";
  return "Unknown";
}

type HermesControlPanelProps = {
  onHealthChange?: (health: AgentOpsHermesRuntimeHealth | null) => void;
};

function HermesControlPanel({ onHealthChange }: HermesControlPanelProps) {
  const [health, setHealth] = useState<AgentOpsHermesRuntimeHealth | null>(null);
  const [loading, setLoading] = useState(false);
  const [probeLoading, setProbeLoading] = useState(false);
  const [probeResult, setProbeResult] = useState<string | null>(null);
  const [probeError, setProbeError] = useState<string | null>(null);
  const [probeContextIncluded, setProbeContextIncluded] = useState<boolean | null>(null);
  const [probeSource, setProbeSource] = useState<string | null>(null);
  const [includeReadOnlyContext, setIncludeReadOnlyContext] = useState(false);

  const refreshHealth = useCallback(async () => {
    setLoading(true);
    try {
      const next = await getAgentOpsHermesRuntimeHealth();
      setHealth(next);
      onHealthChange?.(next);
    } finally {
      setLoading(false);
    }
  }, [onHealthChange]);

  const runAdvisoryProbe = useCallback(async () => {
    setProbeLoading(true);
    setProbeResult(null);
    setProbeError(null);
    setProbeContextIncluded(null);
    setProbeSource(null);
    try {
      const probe = await probeAgentOpsHermesAdvisoryRuntime({
        includeContext: includeReadOnlyContext,
      });
      if (probe.ok && probe.response) {
        setProbeResult(probe.response);
        setProbeContextIncluded(probe.contextIncluded === true);
        setProbeSource(probe.source ?? null);
      } else {
        setProbeError(
          probe.error ??
            "Advisory probe failed. If HERMES_INTERNAL_SECRET is set on server, use curl with x-agentops-hermes-secret.",
        );
      }
    } finally {
      setProbeLoading(false);
    }
  }, [includeReadOnlyContext]);

  useEffect(() => {
    void refreshHealth();
  }, [refreshHealth]);

  const advisoryReachable = Boolean(health?.transportReachable && health.mode === "advisory_transport");

  return (
    <div className="aixia-tools-hub-hermes-control" data-testid="hermes-control">
      <p className="aixia-tools-hub-hermes-control-lead">
        Hermes can answer advisory questions using Doubao Ark. When enabled, read-only AiXia context
        is included. No writes or tool execution are allowed.
      </p>

      <div className="aixia-tools-hub-hermes-runtime-health-action-row">
        <AixiaButton
          variant="secondary"
          onClick={() => void refreshHealth()}
          disabled={loading}
          className="aixia-tools-hub-hermes-runtime-health-refresh"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} aria-hidden />
          Refresh health
        </AixiaButton>
        <label
          className="aixia-tools-hub-hermes-runtime-health-context-toggle"
          data-testid="hermes-include-readonly-context-toggle"
        >
          <input
            type="checkbox"
            checked={includeReadOnlyContext}
            disabled={probeLoading}
            onChange={(event) => setIncludeReadOnlyContext(event.target.checked)}
          />
          <span>Include read-only Hermes context</span>
        </label>
        <AixiaButton
          variant="secondary"
          onClick={() => void runAdvisoryProbe()}
          disabled={probeLoading || !advisoryReachable}
          className="aixia-tools-hub-hermes-runtime-health-probe"
          data-testid="hermes-advisory-runtime-probe"
        >
          <Sparkles className={`h-4 w-4 ${probeLoading ? "animate-pulse" : ""}`} aria-hidden />
          Test advisory response
        </AixiaButton>
      </div>

      {probeResult || probeError ? (
        <div
          className="aixia-tools-hub-hermes-control-probe-result"
          data-testid="hermes-advisory-probe-result"
        >
          {probeResult ? (
            <>
              <p className="aixia-tools-hub-hermes-runtime-health-probe-result">
                <span className="aixia-tools-hub-hermes-control-probe-label">Response:</span>{" "}
                {probeResult}
              </p>
              {probeSource ? (
                <p className="aixia-tools-hub-hermes-control-probe-meta">
                  <span className="aixia-tools-hub-hermes-control-probe-label">Source:</span>{" "}
                  {probeSource}
                  {health?.provider ? (
                    <>
                      {" "}
                      · <span className="aixia-tools-hub-hermes-control-probe-label">Provider:</span>{" "}
                      {formatLlmProviderLabel(health.provider)}
                    </>
                  ) : null}
                </p>
              ) : null}
              {probeContextIncluded !== null ? (
                <p className="aixia-tools-hub-hermes-control-probe-meta">
                  <span className="aixia-tools-hub-hermes-control-probe-label">Context included:</span>{" "}
                  {probeContextIncluded ? "Yes" : "No"}
                </p>
              ) : null}
            </>
          ) : null}
          {probeError ? (
            <p className="aixia-tools-hub-hermes-runtime-health-probe-error">{probeError}</p>
          ) : null}
        </div>
      ) : null}

      <dl className="aixia-tools-hub-hermes-control-compact-status" data-testid="hermes-runtime-health">
        <div className="aixia-tools-hub-hermes-status-row">
          <dt>Advisory runtime</dt>
          <dd>
            <AixiaBadge tone={advisoryReachable ? "emerald" : "rose"}>
              {advisoryReachable ? "Reachable" : "Unavailable"}
            </AixiaBadge>
          </dd>
        </div>
        <div className="aixia-tools-hub-hermes-status-row">
          <dt>Provider</dt>
          <dd>
            <AixiaBadge tone="neutral">{formatLlmProviderLabel(health?.provider)}</AixiaBadge>
          </dd>
        </div>
        <div className="aixia-tools-hub-hermes-status-row">
          <dt>Context assembler</dt>
          <dd>
            <AixiaBadge
              tone={
                health?.contextAssemblerAvailable === true
                  ? "emerald"
                  : health?.contextAssemblerAvailable === false
                    ? "amber"
                    : "neutral"
              }
            >
              {health?.contextAssemblerAvailable === true
                ? "Available"
                : health?.contextAssemblerAvailable === false
                  ? "Unavailable"
                  : "Unknown"}
            </AixiaBadge>
          </dd>
        </div>
        <div className="aixia-tools-hub-hermes-status-row">
          <dt>Coordinator</dt>
          <dd>
            <AixiaBadge tone="rose">Not active</AixiaBadge>
          </dd>
        </div>
        <div className="aixia-tools-hub-hermes-status-row">
          <dt>Writes</dt>
          <dd>
            <AixiaBadge tone="rose">Blocked</AixiaBadge>
          </dd>
        </div>
      </dl>
    </div>
  );
}

function HermesTechnicalHealthDetails({ health }: { health: AgentOpsHermesRuntimeHealth | null }) {
  const transportTone = hermesHealthTone(health);
  const lastChecked = health?.checkedAt
    ? new Date(health.checkedAt).toLocaleString()
    : "Not checked yet";

  return (
    <dl className="aixia-tools-hub-hermes-status-rows" data-testid="hermes-technical-health-details">
      <div className="aixia-tools-hub-hermes-status-row">
        <dt>Transport mode</dt>
        <dd>
          <AixiaBadge tone={transportTone}>{formatHermesTransportMode(health)}</AixiaBadge>
        </dd>
      </div>
      <div className="aixia-tools-hub-hermes-status-row">
        <dt>Runtime gate</dt>
        <dd>
          <AixiaBadge tone="neutral">
            {health ? formatHermesGateLabel(health.runtimeGate) : "Unknown"}
          </AixiaBadge>
        </dd>
      </div>
      <div className="aixia-tools-hub-hermes-status-row">
        <dt>Owner approval</dt>
        <dd>
          <AixiaBadge tone="neutral">
            {health ? formatHermesGateLabel(health.ownerApproved) : "Unknown"}
          </AixiaBadge>
        </dd>
      </div>
      <div className="aixia-tools-hub-hermes-status-row">
        <dt>LLM runtime gate</dt>
        <dd>
          <AixiaBadge tone="neutral">
            {health ? formatHermesGateLabel(health.llmRuntimeGate) : "Unknown"}
          </AixiaBadge>
        </dd>
      </div>
      <div className="aixia-tools-hub-hermes-status-row">
        <dt>Provider configured</dt>
        <dd>
          <AixiaBadge tone={health?.providerConfigured ? "emerald" : "amber"}>
            {health?.providerConfigured ? "Yes" : health ? "No" : "Unknown"}
          </AixiaBadge>
        </dd>
      </div>
      {health?.providerModel ? (
        <div className="aixia-tools-hub-hermes-status-row">
          <dt>Provider model</dt>
          <dd>
            <span className="aixia-tools-hub-hermes-runtime-health-checked">{health.providerModel}</span>
          </dd>
        </div>
      ) : null}
      <div className="aixia-tools-hub-hermes-status-row">
        <dt>Hermes endpoint</dt>
        <dd>
          <AixiaBadge tone={health?.hermesEndpointReachable ? "emerald" : "rose"}>
            {health?.hermesEndpointReachable ? "Reachable" : "Unavailable"}
          </AixiaBadge>
        </dd>
      </div>
      <div className="aixia-tools-hub-hermes-status-row">
        <dt>LLM fallback</dt>
        <dd>
          <AixiaBadge tone={health?.llmFallbackReachable ? "emerald" : "amber"}>
            {health?.llmFallbackReachable ? "Available" : health ? "Unavailable" : "Unknown"}
          </AixiaBadge>
        </dd>
      </div>
      <div className="aixia-tools-hub-hermes-status-row">
        <dt>Fallback layer</dt>
        <dd>
          <AixiaBadge tone="violet">
            {health?.fallbackAvailable !== false ? "Available" : "Unknown"}
          </AixiaBadge>
        </dd>
      </div>
      <div className="aixia-tools-hub-hermes-status-row">
        <dt>Source-of-truth writes</dt>
        <dd>
          <AixiaBadge tone="rose">Blocked</AixiaBadge>
        </dd>
      </div>
      <div className="aixia-tools-hub-hermes-status-row">
        <dt>Last checked</dt>
        <dd>
          <span className="aixia-tools-hub-hermes-runtime-health-checked">{lastChecked}</span>
        </dd>
      </div>
      {health?.message ? (
        <div className="aixia-tools-hub-hermes-status-row aixia-tools-hub-hermes-status-row-wide">
          <dt>Health message</dt>
          <dd>{health.message}</dd>
        </div>
      ) : null}
    </dl>
  );
}

function HermesAdvancedDetailsSection({ health }: { health: AgentOpsHermesRuntimeHealth | null }) {
  return (
    <AixiaProgressiveDisclosureGroup
      title="Advanced details"
      description="Technical previews, roadmap, gates, and reference material — collapsed by default."
      defaultOpen={false}
      density="compact"
      className="aixia-progressive-disclosure--secondary aixia-tools-hub-hermes-advanced-details"
      icon={<Eye className="h-4 w-4" />}
      badge={<AixiaBadge tone="neutral">Reference</AixiaBadge>}
      testId="hermes-advanced-details"
    >
      <div className="aixia-tools-hub-hermes-advanced-stack">
        <AixiaProgressiveDisclosureGroup
          title="Context assembler preview"
          description="Read-only preview of assembled context — not the live advisory POST unless toggled in Hermes Control."
          defaultOpen={false}
          density="compact"
          className="aixia-progressive-disclosure--secondary"
          icon={<FileText className="h-4 w-4" />}
          testId="hermes-advanced-context-assembler"
        >
          <HermesContextAssemblerPreviewPanel />
        </AixiaProgressiveDisclosureGroup>

        <AixiaProgressiveDisclosureGroup
          title="Roadmap / status"
          description="Current Hermes module truth — advisory active, coordinator blocked."
          defaultOpen={false}
          density="compact"
          className="aixia-progressive-disclosure--secondary"
          icon={<MapPin className="h-4 w-4" />}
          badge={<AixiaBadge tone="amber">{HERMES_STAGE_ROADMAP_TOTAL} items</AixiaBadge>}
          testId="hermes-build-roadmap"
        >
          <div className="aixia-tools-hub-hermes-stage-roadmap">
            <div className="aixia-tools-hub-hermes-stage-roadmap-group">
              <div className="aixia-tools-hub-hermes-stage-roadmap-head">
                <span className="aixia-tools-hub-hermes-stage-roadmap-title">Completed</span>
                <AixiaBadge tone="emerald">{HERMES_STAGE_ROADMAP.completed.length}</AixiaBadge>
              </div>
              <ul className="aixia-tools-hub-hermes-steps-list">
                {HERMES_STAGE_ROADMAP.completed.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div className="aixia-tools-hub-hermes-stage-roadmap-group">
              <div className="aixia-tools-hub-hermes-stage-roadmap-head">
                <span className="aixia-tools-hub-hermes-stage-roadmap-title">In progress</span>
                <AixiaBadge tone="amber">{HERMES_STAGE_ROADMAP.inProgress.length}</AixiaBadge>
              </div>
              <ul className="aixia-tools-hub-hermes-steps-list">
                {HERMES_STAGE_ROADMAP.inProgress.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div className="aixia-tools-hub-hermes-stage-roadmap-group">
              <div className="aixia-tools-hub-hermes-stage-roadmap-head">
                <span className="aixia-tools-hub-hermes-stage-roadmap-title">Not started</span>
                <AixiaBadge tone="neutral">{HERMES_STAGE_ROADMAP.notStarted.length}</AixiaBadge>
              </div>
              <ul className="aixia-tools-hub-hermes-steps-list">
                {HERMES_STAGE_ROADMAP.notStarted.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        </AixiaProgressiveDisclosureGroup>

        <AixiaProgressiveDisclosureGroup
          title="Next activation step"
          description="Advisory foundation is complete — coordinator and automation remain blocked."
          defaultOpen={false}
          density="compact"
          className="aixia-progressive-disclosure--secondary"
          icon={<MessageSquare className="h-4 w-4" />}
          badge={<AixiaBadge tone="amber">1 step</AixiaBadge>}
          testId="hermes-next-steps"
        >
          <p className="aixia-tools-hub-hermes-activation-next">{HERMES_NEXT_ACTIVATION_STEP}</p>
          <div className="aixia-tools-hub-hermes-doc-links">
            <AixiaInfoBlock tone="indigo" icon={Database} title="Reference artifacts">
              Adapter: <code>src/lib/agentops/hermesAdapter.ts</code> · Contracts:{" "}
              <code>qa-agent/hermes/</code> · Readiness:{" "}
              <code>{AGENTOPS_HERMES_ADAPTER_READINESS.contractPath}</code>
            </AixiaInfoBlock>
          </div>
        </AixiaProgressiveDisclosureGroup>

        <AixiaProgressiveDisclosureGroup
          title="Current connections"
          description="What Hermes touches today versus what remains separate."
          defaultOpen={false}
          density="compact"
          className="aixia-progressive-disclosure--secondary"
          icon={<GitBranch className="h-4 w-4" />}
          badge={<AixiaBadge tone="neutral">{HERMES_CONNECTIONS.length} systems</AixiaBadge>}
          testId="hermes-connections"
        >
          <div className="aixia-tools-hub-hermes-connections">
            {HERMES_CONNECTIONS.map((row) => (
              <div
                key={row.system}
                className="aixia-tools-hub-hermes-connection-row"
                data-connected={row.connected ? "true" : "false"}
              >
                <div className="aixia-tools-hub-hermes-connection-head">
                  <span className="aixia-tools-hub-hermes-connection-system">{row.system}</span>
                  <AixiaBadge tone={row.connected ? "emerald" : "neutral"}>{row.status}</AixiaBadge>
                </div>
                <p className="aixia-tools-hub-hermes-connection-detail">{row.detail}</p>
              </div>
            ))}
          </div>
        </AixiaProgressiveDisclosureGroup>

        <AixiaProgressiveDisclosureGroup
          title="Runtime gates"
          description="Informational env requirements — secret values are never shown."
          defaultOpen={false}
          density="compact"
          className="aixia-progressive-disclosure--secondary"
          icon={<Server className="h-4 w-4" />}
          badge={<AixiaBadge tone="cyan">{RUNTIME_GATE_VARS.length} vars</AixiaBadge>}
          testId="hermes-runtime-gates"
        >
          <AixiaInfoBlock tone="cyan" icon={Lock} title="Env-gated advisory transport">
            Server runtime requires explicit flags and owner approval. This is not coordinator
            activation.
          </AixiaInfoBlock>
          <dl className="aixia-tools-hub-hermes-gates">
            {RUNTIME_GATE_VARS.map((gate) => (
              <div key={gate.name} className="aixia-tools-hub-hermes-gate-row">
                <dt>
                  <code>{gate.name}</code>
                </dt>
                <dd>{gate.role}</dd>
              </div>
            ))}
          </dl>
        </AixiaProgressiveDisclosureGroup>

        <AixiaProgressiveDisclosureGroup
          title="Safety rules"
          description="Hermes safety policy and AgentOps governance boundaries."
          defaultOpen={false}
          density="compact"
          className="aixia-progressive-disclosure--secondary"
          icon={<Shield className="h-4 w-4" />}
          badge={<AixiaBadge tone="violet">{HERMES_SAFETY_RULES.length} rules</AixiaBadge>}
          testId="hermes-safety-rules"
        >
          <ul className="aixia-tools-hub-hermes-safety-list">
            {HERMES_SAFETY_RULES.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ul>
        </AixiaProgressiveDisclosureGroup>

        <AixiaProgressiveDisclosureGroup
          title="Technical health details"
          description="Extended transport and gate diagnostics from /api/agentops/hermes."
          defaultOpen={false}
          density="compact"
          className="aixia-progressive-disclosure--secondary"
          icon={<Server className="h-4 w-4" />}
          testId="hermes-technical-health"
        >
          <HermesTechnicalHealthDetails health={health} />
        </AixiaProgressiveDisclosureGroup>
      </div>
    </AixiaProgressiveDisclosureGroup>
  );
}

const RUNTIME_GATE_VARS = [
  {
    name: "VITE_AGENTOPS_HERMES_ENABLED",
    role: "Client flag — enables adapter route calls when true (unset defaults permissive on client).",
  },
  {
    name: "HERMES_RUNTIME_ACTIVE",
    role: "Server master switch for Hermes/Ollama proxy.",
  },
  {
    name: "HERMES_OWNER_APPROVED",
    role: "Owner signoff gate; false blocks server runtime.",
  },
  {
    name: "AGENTOPS_LLM_RUNTIME_ACTIVE",
    role: "Shared LLM runtime gate with local LLM routes.",
  },
  {
    name: "AGENTOPS_LLM_PROVIDER",
    role: "Server LLM provider: ollama (local) or doubao_ark (Volcano Ark cloud).",
  },
  {
    name: "ARK_API_KEY",
    role: "Doubao Ark API key — server-side only, never exposed to browser.",
  },
  {
    name: "ARK_BASE_URL",
    role: "Doubao Ark API base URL (default https://ark.cn-beijing.volces.com/api/v3).",
  },
  {
    name: "ARK_MODEL",
    role: "Doubao Ark model id (default doubao-seed-2-0-pro-260215).",
  },
  {
    name: "HERMES_STAGING_ENDPOINT",
    role: "Optional Ollama base URL override.",
  },
  {
    name: "AGENTOPS_LLM_BASE_URL",
    role: "Fallback Ollama base URL.",
  },
  {
    name: "HERMES_LLM_MODEL",
    role: "Hermes chat model name.",
  },
  {
    name: "AGENTOPS_LLM_MODEL",
    role: "Fallback model name.",
  },
  {
    name: "HERMES_INTERNAL_SECRET",
    role: "If set, POST requires x-agentops-hermes-secret header (values never shown here).",
  },
];

const HERMES_SAFETY_RULES = [
  "Hermes cannot directly change code.",
  "Hermes cannot bypass Piter approval.",
  "Hermes cannot silently update source-of-truth files.",
  "Hermes cannot execute risky actions without confirmation.",
  "Hermes cannot replace AgentMemory storage.",
  "Hermes cannot replace Browser QA.",
  "Hermes cannot replace CodeGraph.",
  "Hermes cannot make agents act outside their permissions.",
  "Memory writeback requires owner approval.",
];

type HermesMemorySourceState = "Existing" | "Partial" | "Not connected";

type HermesMemorySourceCard = {
  id: string;
  title: string;
  path: string;
  sourceType: string;
  currentState: HermesMemorySourceState | "Existing, reports missing";
  stateTone: "emerald" | "amber" | "neutral";
  hermesReadsToday: string;
  futureRole: string;
  writePolicy: string;
  notes: string;
  icon: typeof BookOpen;
};

const HERMES_GLOBAL_MEMORY_SOURCES: HermesMemorySourceCard[] = [
  {
    id: "design-law",
    title: "Design law / global source of truth",
    path: "src/design-system/aixia-global/**",
    sourceType: "Official source of truth",
    currentState: "Existing",
    stateTone: "emerald",
    hermesReadsToday: "No",
    futureRole: "Read-only source, summarize, propose memory candidates",
    writePolicy: "Never auto-write. Piter approval required for any source-of-truth change.",
    notes: "Highest-priority global memory source.",
    icon: BookOpen,
  },
  {
    id: "tools-hub-registry",
    title: "Tools Hub registry",
    path: "src/lib/agentops/tools/toolRegistry.ts",
    sourceType: "Official Tools Hub registry",
    currentState: "Existing",
    stateTone: "emerald",
    hermesReadsToday: "No",
    futureRole: "Read tool relationships, categories, status, current runtime, target runtime",
    writePolicy: "Do not auto-write. Registry changes require build approval.",
    notes: "Current source for Tools Hub page hierarchy.",
    icon: Wrench,
  },
  {
    id: "agentops-data",
    title: "AgentOps operational data",
    path:
      "agentops_findings, agentops_owner_feedback, agentops_verifications, agentops_focus_directives, agentops_agent_memory",
    sourceType: "Runtime data / operational truth",
    currentState: "Existing",
    stateTone: "emerald",
    hermesReadsToday: "Indirect only through issue chat payloads",
    futureRole:
      "Read issue history, owner feedback, verified fixes, focus directives, and lesson candidates",
    writePolicy: "Only through approved existing workflows.",
    notes: "Hermes must not bypass queue, approval, or verification rules.",
    icon: Database,
  },
  {
    id: "routes-structure",
    title: "Website routes / structure",
    path: "src/App.tsx, src/app/**, static discovery reports later",
    sourceType: "Runtime structure",
    currentState: "Existing, reports missing",
    stateTone: "amber",
    hermesReadsToday: "No",
    futureRole: "Understand modules, routes, pages, and page relationships",
    writePolicy: "Never auto-write.",
    notes: "Live routes should be derived from App.tsx and page files; generated reports may drift.",
    icon: MapPin,
  },
  {
    id: "guardrails",
    title: "Guardrails / build rules",
    path:
      "scripts/aixia-guardrails.mjs, scripts/guardrails/**, src/design-system/aixia-global/15-guardrail-rules.md",
    sourceType: "Rule enforcement / official guardrail law",
    currentState: "Existing",
    stateTone: "emerald",
    hermesReadsToday: "No",
    futureRole: "Read violations, summarize rule failures, help agents avoid repeated mistakes",
    writePolicy: "Never auto-write guardrail law. Propose changes only.",
    notes: "Guardrail outputs are evidence, not source-of-truth by themselves.",
    icon: Shield,
  },
  {
    id: "verified-lessons",
    title: "Verified fixes / lessons",
    path: "agentops_owner_feedback metadata, agentops_verifications, lesson candidate flows",
    sourceType: "Runtime learning / approval-based lessons",
    currentState: "Partial",
    stateTone: "amber",
    hermesReadsToday: "No",
    futureRole: "Read verified fixes, lesson candidates, and owner-approved learning",
    writePolicy: "Only create memory proposals; Piter approval required.",
    notes: "This should become one of Hermes’ strongest learning sources later.",
    icon: CheckCircle2,
  },
  {
    id: "qa-mirrors",
    title: "QA memory mirrors / advisory docs",
    path: "qa-agent/design-system/memory/**, qa-agent/agentops/**, qa-agent/agent-memory/**",
    sourceType: "Advisory / mirror / generated memory",
    currentState: "Partial",
    stateTone: "amber",
    hermesReadsToday: "No",
    futureRole: "Use as lower-priority briefing source only",
    writePolicy: "Do not treat as law. Do not auto-write.",
    notes: "These files can lag official source-of-truth.",
    icon: FileText,
  },
  {
    id: "analytics",
    title: "Analytics / usage learning",
    path: "src/lib/analytics/**, app_analytics_* tables, scripts/export-analytics-for-hermes.mjs",
    sourceType: "Usage data / future learning layer",
    currentState: "Not connected",
    stateTone: "neutral",
    hermesReadsToday: "No",
    futureRole: "Piter-only usage learning first; later privacy-controlled user usage learning",
    writePolicy:
      "No writes. Aggregated/read-only only until privacy and permission rules are defined.",
    notes: "Do not expose private user data or secrets.",
    icon: LineChart,
  },
];

const HERMES_GLOBAL_MEMORY_SOURCE_TITLES = Object.fromEntries(
  HERMES_GLOBAL_MEMORY_SOURCES.map((source) => [source.id, source.title]),
) as Record<string, string>;

const GLOBAL_MEMORY_CLI_COPY_LABELS: Record<(typeof GLOBAL_MEMORY_READ_ONLY_CLI_COMMANDS)[number], string> =
  {
    "npm run qa:static-discovery": "Copy static discovery command",
    "npm run qa:static-design-guardrails": "Copy design guardrails command",
    "npm run qa:guardrail-action-plan": "Copy guardrail action plan command",
  };

type FeedbackTone = "success" | "warning" | "error";
type CommandUiPhase = "ready" | "running" | "success" | "failed" | "rejected";

const GLOBAL_MEMORY_COMMAND_ACTIONS: Array<{
  id: AgentOpsGlobalMemoryCommandId;
  label: string;
  npmCommand?: (typeof GLOBAL_MEMORY_READ_ONLY_CLI_COMMANDS)[number];
  primary?: boolean;
}> = [
  { id: "full_read_only_scan", label: "Run full read-only scan", primary: true },
  {
    id: "static_discovery",
    label: "Run static discovery",
    npmCommand: "npm run qa:static-discovery",
  },
  {
    id: "static_design_guardrails",
    label: "Run design guardrails",
    npmCommand: "npm run qa:static-design-guardrails",
  },
  {
    id: "guardrail_action_plan",
    label: "Run guardrail action plan",
    npmCommand: "npm run qa:guardrail-action-plan",
  },
];

function formatGlobalMemoryDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
}

function formatDurationMs(durationMs: number): string {
  if (durationMs < 1000) return `${durationMs} ms`;
  return `${(durationMs / 1000).toFixed(1)} s`;
}

function commandPhaseLabel(phase: CommandUiPhase): string {
  switch (phase) {
    case "running":
      return "Running";
    case "success":
      return "Success";
    case "failed":
      return "Failed";
    case "rejected":
      return "Rejected";
    default:
      return "Ready";
  }
}

function commandPhaseTone(
  phase: CommandUiPhase,
): "neutral" | "cyan" | "emerald" | "rose" | "amber" {
  if (phase === "running") return "cyan";
  if (phase === "success") return "emerald";
  if (phase === "failed") return "rose";
  if (phase === "rejected") return "amber";
  return "neutral";
}

function commandRunStatusTone(
  status: AgentOpsGlobalMemoryCommandRunResult["status"],
): "emerald" | "rose" | "amber" {
  if (status === "success") return "emerald";
  if (status === "failed") return "rose";
  return "amber";
}

function HermesGlobalWebsiteMemoryControlsPanel() {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [preferences, setPreferences] = useState<AgentOpsGlobalMemoryPreferences | null>(null);
  const [frequencyDraft, setFrequencyDraft] = useState<AgentOpsGlobalMemoryScanFrequency>("manual_only");
  const [sourcePriorityDraft, setSourcePriorityDraft] =
    useState<AgentOpsGlobalMemorySourcePriorityPreference>(
      createDefaultAgentOpsGlobalMemorySourcePriority(),
    );
  const [localSnapshot, setLocalSnapshot] = useState<AgentOpsGlobalMemoryPartialSnapshot | null>(
    null,
  );
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: FeedbackTone; message: string } | null>(null);
  const [scanModalOpen, setScanModalOpen] = useState(false);
  const [scanModalSubmitting, setScanModalSubmitting] = useState(false);
  const [snapshotDetailsOpen, setSnapshotDetailsOpen] = useState(false);
  const [runnerAvailable, setRunnerAvailable] = useState<boolean | null>(null);
  const [commandPhases, setCommandPhases] = useState<
    Partial<Record<AgentOpsGlobalMemoryCommandId, CommandUiPhase>>
  >({});
  const [lastCommandRun, setLastCommandRun] =
    useState<AgentOpsGlobalMemoryCommandRunResult | null>(null);
  const [commandRunning, setCommandRunning] = useState(false);
  const [copyFallbackOpen, setCopyFallbackOpen] = useState(false);

  const setResult = useCallback((tone: FeedbackTone, message: string) => {
    setFeedback({ tone, message });
  }, []);

  const applyPreferences = useCallback((next: AgentOpsGlobalMemoryPreferences) => {
    setPreferences(next);
    setFrequencyDraft(next.frequency);
    setSourcePriorityDraft(next.sourcePriority);
    if (next.lastSnapshot) setLocalSnapshot(next.lastSnapshot);
    if (next.lastCommandRun) setLastCommandRun(next.lastCommandRun);
  }, []);

  const loadPreferences = useCallback(async () => {
    setLoading(true);
    setLoadError(null);

    const ownerResult = await getAgentOpsOwnerStatus();
    if (ownerResult.error || !ownerResult.data?.isOwner) {
      setIsOwner(false);
      setLoadError(ownerResult.error ?? "AgentOps Owner access required for global memory controls.");
      setLoading(false);
      return;
    }

    setIsOwner(true);
    const prefsResult = await getAgentOpsGlobalMemoryPreferences();
    if (prefsResult.error) {
      setLoadError(prefsResult.error);
      setLoading(false);
      return;
    }

    if (prefsResult.data) applyPreferences(prefsResult.data);
    setLoading(false);
  }, [applyPreferences]);

  useEffect(() => {
    let active = true;
    void (async () => {
      setLoading(true);
      setLoadError(null);

      const ownerResult = await getAgentOpsOwnerStatus();
      if (!active) return;
      if (ownerResult.error || !ownerResult.data?.isOwner) {
        setIsOwner(false);
        setLoadError(
          ownerResult.error ?? "AgentOps Owner access required for global memory controls.",
        );
        setLoading(false);
        return;
      }

      setIsOwner(true);
      const prefsResult = await getAgentOpsGlobalMemoryPreferences();
      if (!active) return;
      if (prefsResult.error) {
        setLoadError(prefsResult.error);
        setLoading(false);
        return;
      }

      if (prefsResult.data) applyPreferences(prefsResult.data);
      setLoading(false);

      const runnerResult = await getAgentOpsGlobalMemoryCommandRunnerStatus();
      if (!active) return;
      setRunnerAvailable(runnerResult.data?.available ?? false);
    })();

    return () => {
      active = false;
    };
  }, [applyPreferences]);

  const controlsDisabled = !isOwner || submitting || loading || commandRunning;

  const displaySnapshot = localSnapshot ?? preferences?.lastSnapshot ?? null;
  const pausePreference = preferences?.pausePreference ?? "active";
  const schedulerStatusLabel =
    pausePreference === "paused"
      ? "Paused — not scheduled"
      : preferences?.nextScanLabel ?? "Not scheduled";

  const copyText = useCallback(
    async (value: string, successMessage: string) => {
      try {
        await navigator.clipboard.writeText(value);
        setResult("success", successMessage);
        return true;
      } catch {
        setResult("error", "Could not copy to clipboard.");
        return false;
      }
    },
    [setResult],
  );

  const handleSaveFrequency = useCallback(async () => {
    setSubmitting(true);
    const result = await recordAgentOpsGlobalMemoryScanFrequencyPreference({
      frequency: frequencyDraft,
    });
    setSubmitting(false);
    if (result.error) {
      setResult("error", result.error);
      return;
    }
    setResult("success", result.data?.message ?? "Frequency preference saved.");
    await loadPreferences();
  }, [frequencyDraft, loadPreferences, setResult]);

  const handleSaveSourcePriority = useCallback(async () => {
    setSubmitting(true);
    const result = await recordAgentOpsGlobalMemorySourcePriorityPreference({
      preference: sourcePriorityDraft,
    });
    setSubmitting(false);
    if (result.error) {
      setResult("error", result.error);
      return;
    }
    setResult("success", result.data?.message ?? "Source priority preference saved.");
    await loadPreferences();
  }, [loadPreferences, setResult, sourcePriorityDraft]);

  const handleTogglePause = useCallback(async () => {
    const next: AgentOpsGlobalMemoryScanPausePreference =
      pausePreference === "paused" ? "active" : "paused";
    setSubmitting(true);
    const result = await recordAgentOpsGlobalMemoryScanPausePreference({
      pausePreference: next,
    });
    setSubmitting(false);
    if (result.error) {
      setResult("error", result.error);
      return;
    }
    setResult("success", result.data?.message ?? "Pause preference saved.");
    await loadPreferences();
  }, [loadPreferences, pausePreference, setResult]);

  const handleConfirmReadOnlyScan = useCallback(async () => {
    setScanModalSubmitting(true);
    const requestResult = await recordAgentOpsGlobalMemoryScanRequested();
    if (requestResult.error) {
      setScanModalSubmitting(false);
      setResult("error", requestResult.error);
      return;
    }

    const snapshot = buildAgentOpsGlobalMemoryPartialSnapshot(
      HERMES_GLOBAL_MEMORY_SOURCE_TITLES,
      sourcePriorityDraft,
      "requested",
    );
    const snapshotResult = await recordAgentOpsGlobalMemoryPartialSnapshot({ snapshot });
    setScanModalSubmitting(false);

    if (snapshotResult.error) {
      setResult("error", snapshotResult.error);
      return;
    }

    setLocalSnapshot(snapshot);
    setResult(
      "success",
      "Partial read-only snapshot generated from current UI registry. Full source scan requires local CLI command.",
    );
    setScanModalOpen(false);
    await loadPreferences();
  }, [loadPreferences, setResult, sourcePriorityDraft]);

  const toggleSourceEnabled = useCallback((sourceId: string, enabled: boolean) => {
    setSourcePriorityDraft((current) => ({
      ...current,
      sources: { ...current.sources, [sourceId]: enabled },
    }));
  }, []);

  const handleRunCommand = useCallback(
    async (commandId: AgentOpsGlobalMemoryCommandId) => {
      if (!runnerAvailable) {
        setResult("warning", "Local command runner unavailable. Use copy command fallback.");
        return;
      }
      if (!isOwner) {
        setResult("error", "AgentOps Owner access required.");
        return;
      }

      setCommandRunning(true);
      setCommandPhases((current) => ({ ...current, [commandId]: "running" }));

      const result = await runAgentOpsGlobalMemoryCommand(commandId);
      setCommandRunning(false);

      if (result.error || !result.data) {
        setCommandPhases((current) => ({ ...current, [commandId]: "failed" }));
        setResult("error", result.error ?? "Command run failed.");
        return;
      }

      const run = result.data;
      setLastCommandRun(run);
      setCommandPhases((current) => ({
        ...current,
        [commandId]:
          run.status === "success"
            ? "success"
            : run.status === "rejected"
              ? "rejected"
              : "failed",
      }));

      if (run.status === "success") {
        setResult(
          "success",
          run.outputSummary ||
            "Read-only scan command completed. Reports were generated/updated. Hermes memory was not updated automatically.",
        );
      } else {
        setResult("error", run.errorMessage ?? run.outputSummary ?? "Command run failed.");
      }

      const recordResult = await recordAgentOpsGlobalMemoryCommandRun({ run });
      if (recordResult.error) {
        setResult("warning", `${run.outputSummary} (Could not persist run record: ${recordResult.error})`);
      } else {
        await loadPreferences();
      }
    },
    [isOwner, loadPreferences, runnerAvailable, setResult],
  );

  const getCommandPhase = useCallback(
    (commandId: AgentOpsGlobalMemoryCommandId): CommandUiPhase =>
      commandPhases[commandId] ?? "ready",
    [commandPhases],
  );

  const sourcePriorityRows = useMemo(
    () =>
      sourcePriorityDraft.orderedIds.map((sourceId, index) => {
        const meta = HERMES_GLOBAL_MEMORY_SOURCES.find((source) => source.id === sourceId);
        return {
          sourceId,
          priority: index + 1,
          title: meta?.title ?? HERMES_GLOBAL_MEMORY_SOURCE_TITLES[sourceId] ?? sourceId,
          enabled: sourcePriorityDraft.sources[sourceId] !== false,
        };
      }),
    [sourcePriorityDraft],
  );

  if (loading) {
    return (
      <div className="aixia-tools-hub-hermes-controls-body" data-testid="hermes-global-memory-controls">
        <p className="aixia-tools-hub-hermes-memory-intro">Loading global memory controls…</p>
      </div>
    );
  }

  return (
    <div className="aixia-tools-hub-hermes-controls-body" data-testid="hermes-global-memory-controls">
      {!isOwner ? (
        <AixiaInfoBlock tone="gold" icon={Lock} title="Owner-gated controls">
          {loadError ??
            "AgentOps Owner access is required to save scan preferences or record scan intent."}
        </AixiaInfoBlock>
      ) : null}

      {feedback ? (
        <AixiaInfoBlock
          tone={feedback.tone === "error" ? "rose" : feedback.tone === "warning" ? "gold" : "emerald"}
          title={feedback.tone === "error" ? "Action failed" : "Preference recorded"}
        >
          {feedback.message}
        </AixiaInfoBlock>
      ) : null}

      <div className="aixia-tools-hub-hermes-controls-workflow">
        <div className="aixia-tools-hub-hermes-controls-col">
          <article
            className="aixia-tools-hub-hermes-control-card"
            data-testid="hermes-control-status"
          >
            <h3 className="aixia-tools-hub-hermes-control-title">Current status</h3>
            <dl className="aixia-tools-hub-hermes-status-rows">
              <div className="aixia-tools-hub-hermes-status-row">
                <dt>Scan mode</dt>
                <dd>
                  <AixiaBadge tone="amber">Manual / not active</AixiaBadge>
                </dd>
              </div>
              <div className="aixia-tools-hub-hermes-status-row">
                <dt>Scheduler</dt>
                <dd>
                  <AixiaBadge tone="neutral">{schedulerStatusLabel}</AixiaBadge>
                </dd>
              </div>
              <div className="aixia-tools-hub-hermes-status-row">
                <dt>Writeback</dt>
                <dd>
                  <AixiaBadge tone="violet">Blocked without approval</AixiaBadge>
                </dd>
              </div>
              <div className="aixia-tools-hub-hermes-status-row">
                <dt>Hermes runtime</dt>
                <dd>
                  <AixiaBadge tone="neutral">Not active</AixiaBadge>
                </dd>
              </div>
            </dl>
          </article>

          <article
            className="aixia-tools-hub-hermes-control-card aixia-tools-hub-hermes-control-card-sources"
            data-testid="hermes-control-sources"
          >
            <h3 className="aixia-tools-hub-hermes-control-title">Memory sources to include</h3>
            <ul className="aixia-tools-hub-hermes-source-priority-list">
              {sourcePriorityRows.map((row) => (
                <li key={row.sourceId}>
                  <label className="aixia-tools-hub-hermes-source-priority-item">
                    <input
                      type="checkbox"
                      checked={row.enabled}
                      disabled={controlsDisabled}
                      onChange={(event) => toggleSourceEnabled(row.sourceId, event.target.checked)}
                    />
                    <span className="aixia-tools-hub-hermes-source-priority-rank">{row.priority}</span>
                    <span className="aixia-tools-hub-hermes-source-priority-label">{row.title}</span>
                  </label>
                </li>
              ))}
            </ul>
            <div className="aixia-tools-hub-hermes-control-actions aixia-tools-hub-hermes-control-actions-primary">
              <AixiaButton
                variant="secondary"
                disabled={controlsDisabled}
                onClick={() => void handleSaveSourcePriority()}
              >
                Save source selection
              </AixiaButton>
            </div>
            <p className="aixia-tools-hub-hermes-control-helper">
              This saves preference only. It does not start a scan.
            </p>
          </article>
        </div>

        <div className="aixia-tools-hub-hermes-controls-col">
          <article
            className="aixia-tools-hub-hermes-control-card"
            data-testid="hermes-control-schedule"
          >
            <h3 className="aixia-tools-hub-hermes-control-title">Scan schedule preference</h3>
            {preferences?.frequencySavedAt ? (
              <p className="aixia-tools-hub-hermes-control-meta">
                Saved: {formatAgentOpsGlobalMemoryScanFrequency(preferences.frequency)} ·{" "}
                {formatGlobalMemoryDateTime(preferences.frequencySavedAt)}
              </p>
            ) : (
              <p className="aixia-tools-hub-hermes-control-meta">No schedule preference saved yet.</p>
            )}
            <div
              className="aixia-tools-hub-hermes-frequency-segments"
              role="group"
              aria-label="Scan schedule preference"
            >
              {AGENTOPS_GLOBAL_MEMORY_SCAN_FREQUENCIES.map((frequency) => {
                const selected = frequencyDraft === frequency;
                return (
                  <button
                    key={frequency}
                    type="button"
                    className={
                      selected
                        ? "aixia-tools-hub-hermes-frequency-segment is-selected"
                        : "aixia-tools-hub-hermes-frequency-segment"
                    }
                    disabled={controlsDisabled}
                    onClick={() => setFrequencyDraft(frequency)}
                  >
                    {formatAgentOpsGlobalMemoryScanFrequency(frequency)}
                  </button>
                );
              })}
            </div>
            <div className="aixia-tools-hub-hermes-control-actions">
              <AixiaButton
                variant="secondary"
                disabled={controlsDisabled}
                onClick={() => void handleSaveFrequency()}
              >
                Save schedule preference
              </AixiaButton>
            </div>
            <p className="aixia-tools-hub-hermes-control-helper">
              This stores the intended schedule only. No live scheduler or cron is active yet.
            </p>
            <label className="aixia-tools-hub-hermes-pause-toggle">
              <input
                type="checkbox"
                checked={pausePreference === "paused"}
                disabled={controlsDisabled}
                onChange={() => void handleTogglePause()}
              />
              <span>
                <span className="aixia-tools-hub-hermes-pause-toggle-title">
                  Pause future scan preference
                </span>
                <span className="aixia-tools-hub-hermes-pause-toggle-note">
                  No live scheduler is running. This only records owner intent for later.
                </span>
              </span>
            </label>
          </article>

          <article
            className="aixia-tools-hub-hermes-control-card"
            data-testid="hermes-control-scan"
          >
            <h3 className="aixia-tools-hub-hermes-control-title">Run read-only scan</h3>
            {runnerAvailable === false ? (
              <AixiaInfoBlock tone="gold" title="Local command runner unavailable">
                Local command runner unavailable. Use copy command fallback below, or run commands in
                your terminal.
              </AixiaInfoBlock>
            ) : null}
            <ul className="aixia-tools-hub-hermes-command-actions">
              {GLOBAL_MEMORY_COMMAND_ACTIONS.map((action) => {
                const phase = getCommandPhase(action.id);
                return (
                  <li key={action.id} className="aixia-tools-hub-hermes-command-action-row">
                    <AixiaButton
                      variant={action.primary ? "primary" : "secondary"}
                      className="aixia-tools-hub-hermes-command-run-btn"
                      disabled={controlsDisabled || !runnerAvailable}
                      onClick={() => void handleRunCommand(action.id)}
                    >
                      {action.label}
                    </AixiaButton>
                    <AixiaBadge tone={commandPhaseTone(phase)}>{commandPhaseLabel(phase)}</AixiaBadge>
                  </li>
                );
              })}
            </ul>
            <p className="aixia-tools-hub-hermes-control-helper">
              Approved read-only QA scripts run locally via the dev server. Reports update under
              qa-agent/reports only. Hermes memory is not updated automatically.
            </p>
            <AixiaButton
              variant="secondary"
              className="aixia-tools-hub-hermes-copy-fallback-toggle"
              onClick={() => setCopyFallbackOpen((open) => !open)}
            >
              {copyFallbackOpen ? "Hide copy command fallback" : "Show copy command fallback"}
            </AixiaButton>
            {copyFallbackOpen ? (
              <div className="aixia-tools-hub-hermes-copy-fallback">
                {GLOBAL_MEMORY_COMMAND_ACTIONS.filter((action) => action.npmCommand).map(
                  (action) => (
                    <AixiaButton
                      key={`copy-${action.id}`}
                      variant="secondary"
                      className="aixia-tools-hub-hermes-cli-copy-btn"
                      disabled={!isOwner}
                      onClick={() =>
                        void copyText(action.npmCommand!, `Copied: ${action.npmCommand}`)
                      }
                    >
                      {GLOBAL_MEMORY_CLI_COPY_LABELS[action.npmCommand!]}
                    </AixiaButton>
                  ),
                )}
              </div>
            ) : null}
            <div className="aixia-tools-hub-hermes-partial-snapshot-block">
              <p className="aixia-tools-hub-hermes-control-meta">UI registry snapshot (no CLI)</p>
              <AixiaButton
                variant="secondary"
                disabled={controlsDisabled}
                onClick={() => setScanModalOpen(true)}
              >
                Generate partial snapshot
              </AixiaButton>
            </div>
          </article>

          <article
            className="aixia-tools-hub-hermes-control-card"
            data-testid="hermes-control-snapshot"
          >
            <h3 className="aixia-tools-hub-hermes-control-title">Last snapshot</h3>
            {lastCommandRun ? (
              <>
                <dl className="aixia-tools-hub-hermes-snapshot-summary">
                  <div>
                    <dt>Last command</dt>
                    <dd>{lastCommandRun.label ?? lastCommandRun.commandId}</dd>
                  </div>
                  <div>
                    <dt>Status</dt>
                    <dd>
                      <AixiaBadge tone={commandRunStatusTone(lastCommandRun.status)}>
                        {lastCommandRun.status === "success"
                          ? "Success"
                          : lastCommandRun.status === "failed"
                            ? "Failed"
                            : "Rejected"}
                      </AixiaBadge>
                    </dd>
                  </div>
                  <div>
                    <dt>Finished</dt>
                    <dd>{formatGlobalMemoryDateTime(lastCommandRun.finishedAt)}</dd>
                  </div>
                  <div>
                    <dt>Duration</dt>
                    <dd>{formatDurationMs(lastCommandRun.durationMs)}</dd>
                  </div>
                  <div>
                    <dt>Mode</dt>
                    <dd>Partial read-only</dd>
                  </div>
                  <div>
                    <dt>Full CLI scan</dt>
                    <dd>
                      {lastCommandRun.fullCliScanConfirmed ? "Confirmed" : "Not confirmed"}
                    </dd>
                  </div>
                </dl>
                <p className="aixia-tools-hub-hermes-command-output-summary">
                  {lastCommandRun.outputSummary}
                </p>
                {lastCommandRun.reportPaths && lastCommandRun.reportPaths.length > 0 ? (
                  <ul className="aixia-tools-hub-hermes-report-paths">
                    {lastCommandRun.reportPaths.map((reportPath) => (
                      <li key={reportPath}>
                        <code>{reportPath}</code>
                      </li>
                    ))}
                  </ul>
                ) : null}
                <AixiaButton
                  variant="secondary"
                  className="aixia-tools-hub-hermes-snapshot-details-btn"
                  onClick={() => setSnapshotDetailsOpen((open) => !open)}
                >
                  {snapshotDetailsOpen ? "Hide run details" : "View snapshot details"}
                </AixiaButton>
                {snapshotDetailsOpen && lastCommandRun.errorMessage ? (
                  <p className="aixia-tools-hub-hermes-control-note">{lastCommandRun.errorMessage}</p>
                ) : null}
              </>
            ) : (
              <p className="aixia-tools-hub-hermes-control-note">
                No global memory scan command run recorded yet.
              </p>
            )}
            {displaySnapshot ? (
              <div className="aixia-tools-hub-hermes-partial-snapshot-summary">
                <p className="aixia-tools-hub-hermes-control-meta">Partial UI snapshot</p>
                <dl className="aixia-tools-hub-hermes-snapshot-summary">
                  <div>
                    <dt>Generated</dt>
                    <dd>{formatGlobalMemoryDateTime(displaySnapshot.generatedAt)}</dd>
                  </div>
                  <div>
                    <dt>Sources</dt>
                    <dd>
                      {displaySnapshot.enabledSourceCount} enabled / {displaySnapshot.sourceCount}
                    </dd>
                  </div>
                </dl>
              </div>
            ) : null}
          </article>
        </div>
      </div>

      <div className="aixia-tools-hub-hermes-safety-banner" data-testid="hermes-control-safety">
        <ul className="aixia-tools-hub-hermes-safety-badges">
          <li>
            <AixiaBadge tone="amber">Read-only</AixiaBadge>
          </li>
          <li>
            <AixiaBadge tone="violet">Approval required</AixiaBadge>
          </li>
          <li>
            <AixiaBadge tone="neutral">No automatic writeback</AixiaBadge>
          </li>
          <li>
            <AixiaBadge tone="cyan">Full CLI scan required for complete source scan</AixiaBadge>
          </li>
        </ul>
        <p className="aixia-tools-hub-hermes-safety-banner-text">
          Hermes cannot write source-of-truth files, registry entries, analytics, or AgentOps records from
          this page.
        </p>
      </div>

      {scanModalOpen ? (
        <AixiaModal
          open
          title="Confirm read-only scan request"
          description="Records owner intent and generates a partial UI snapshot only. Does not run cloud automation or local scripts from the browser."
          onClose={() => {
            if (scanModalSubmitting) return;
            setScanModalOpen(false);
          }}
          maxWidthClassName="max-w-xl"
          footer={
            <div className="flex flex-wrap justify-end gap-2">
              <AixiaButton
                variant="secondary"
                onClick={() => setScanModalOpen(false)}
                disabled={scanModalSubmitting}
              >
                Cancel
              </AixiaButton>
              <AixiaButton
                variant="primary"
                onClick={() => void handleConfirmReadOnlyScan()}
                disabled={scanModalSubmitting || controlsDisabled}
              >
                {scanModalSubmitting ? "Recording…" : "Generate partial snapshot"}
              </AixiaButton>
            </div>
          }
        >
          <p className="aixia-tools-hub-hermes-control-note">
            After confirming, run these commands locally for a full static scan:
          </p>
          <ul className="aixia-tools-hub-hermes-cli-list">
            {GLOBAL_MEMORY_READ_ONLY_CLI_COMMANDS.map((command) => (
              <li key={`modal-${command}`}>
                <code>{command}</code>
                <AixiaButton
                  variant="secondary"
                  className="mt-2 px-3 py-1 text-xs"
                  onClick={() => void copyText(command, `Copied: ${command}`)}
                >
                  Copy
                </AixiaButton>
              </li>
            ))}
          </ul>
        </AixiaModal>
      ) : null}
    </div>
  );
}

const GLOBAL_MEMORY_CANDIDATES_VISIBLE_DEFAULT = 5;

function globalMemoryCandidateStatusTone(
  status: AgentOpsGlobalMemoryCandidateStatus,
): "emerald" | "rose" | "amber" | "neutral" | "violet" | "cyan" {
  if (status === "approved") return "emerald";
  if (status === "rejected") return "rose";
  if (status === "needs_cleanup") return "amber";
  if (status === "review_later") return "violet";
  return "cyan";
}

function globalMemoryCandidateStatusLabel(status: AgentOpsGlobalMemoryCandidateStatus): string {
  if (status === "approved") return "Approved for global memory";
  if (status === "rejected") return "Rejected";
  if (status === "review_later") return "Review later";
  if (status === "needs_cleanup") return "Needs cleanup";
  if (status === "draft") return "Draft";
  return "Pending review";
}

function formatCandidateTypeLabel(type: AgentOpsGlobalMemoryCandidate["candidateType"]): string {
  return type.replaceAll("_", " ");
}

type HermesGlobalMemoryCandidatesPanelProps = {
  onApprovedMemoryChange?: () => void;
};

function HermesGlobalMemoryCandidatesPanel({
  onApprovedMemoryChange,
}: HermesGlobalMemoryCandidatesPanelProps) {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [generatorAvailable, setGeneratorAvailable] = useState<boolean | null>(null);
  const [candidates, setCandidates] = useState<AgentOpsGlobalMemoryCandidate[]>([]);
  const [lastBatch, setLastBatch] = useState<{
    batchId: string;
    sourceReport: string;
    generatedAt: string;
    candidateCount: number;
  } | null>(null);
  const [counts, setCounts] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    reviewLater: 0,
    needsCleanup: 0,
  });
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: FeedbackTone; message: string } | null>(null);
  const [showAllCandidates, setShowAllCandidates] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editCandidate, setEditCandidate] = useState<AgentOpsGlobalMemoryCandidate | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editSummary, setEditSummary] = useState("");
  const [editProposedText, setEditProposedText] = useState("");

  const setResult = useCallback((tone: FeedbackTone, message: string) => {
    setFeedback({ tone, message });
  }, []);

  const loadCandidates = useCallback(async () => {
    const overview = await getAgentOpsGlobalMemoryCandidates();
    if (overview.error) {
      setLoadError(overview.error);
      return;
    }
    setCandidates(overview.data?.candidates ?? []);
    setLastBatch(overview.data?.lastBatch ?? null);
    setCounts(
      overview.data?.counts ?? {
        total: 0,
        pending: 0,
        approved: 0,
        rejected: 0,
        reviewLater: 0,
        needsCleanup: 0,
      },
    );
  }, []);

  useEffect(() => {
    let active = true;
    void (async () => {
      setLoading(true);
      setLoadError(null);

      const ownerResult = await getAgentOpsOwnerStatus();
      if (!active) return;
      if (ownerResult.error || !ownerResult.data?.isOwner) {
        setIsOwner(false);
        setLoadError(
          ownerResult.error ?? "AgentOps Owner access required for global memory candidates.",
        );
        setLoading(false);
        return;
      }

      setIsOwner(true);
      const generatorResult = await getAgentOpsGlobalMemoryCandidateGeneratorStatus();
      if (!active) return;
      setGeneratorAvailable(generatorResult.data?.available ?? false);

      await loadCandidates();
      if (!active) return;
      setLoading(false);
    })();

    return () => {
      active = false;
    };
  }, [loadCandidates]);

  const controlsDisabled = !isOwner || submitting || loading;

  const visibleCandidates = useMemo(() => {
    if (showAllCandidates) return candidates;
    return candidates.slice(0, GLOBAL_MEMORY_CANDIDATES_VISIBLE_DEFAULT);
  }, [candidates, showAllCandidates]);

  const handleGenerate = useCallback(async () => {
    setSubmitting(true);
    setFeedback(null);
    const result = await generateAgentOpsGlobalMemoryCandidatesFromLastScan();
    setSubmitting(false);
    if (result.error) {
      setResult("error", result.error);
      return;
    }
    setResult("success", result.data?.message ?? "Candidates generated.");
    await loadCandidates();
  }, [loadCandidates, setResult]);

  const handleDecision = useCallback(
    async (candidateId: string, decision: AgentOpsGlobalMemoryCandidateDecision) => {
      setActionId(`${candidateId}:${decision}`);
      const result = await recordAgentOpsGlobalMemoryCandidateDecision({ candidateId, decision });
      setActionId(null);
      if (result.error) {
        setResult("error", result.error);
        return;
      }
      setResult("success", result.data?.message ?? "Decision recorded.");
      await loadCandidates();
      if (decision === "approve_for_future_memory") {
        onApprovedMemoryChange?.();
      }
    },
    [loadCandidates, onApprovedMemoryChange, setResult],
  );

  const openEditModal = useCallback((candidate: AgentOpsGlobalMemoryCandidate) => {
    setEditCandidate(candidate);
    setEditTitle(candidate.title);
    setEditSummary(candidate.summary);
    setEditProposedText(candidate.proposedMemoryText);
    setEditModalOpen(true);
  }, []);

  const handleSaveEdit = useCallback(async () => {
    if (!editCandidate) return;
    setSubmitting(true);
    const result = await recordAgentOpsGlobalMemoryCandidateEdit({
      candidateId: editCandidate.candidateId,
      title: editTitle,
      summary: editSummary,
      proposedMemoryText: editProposedText,
    });
    setSubmitting(false);
    if (result.error) {
      setResult("error", result.error);
      return;
    }
    setEditModalOpen(false);
    setEditCandidate(null);
    setResult("success", result.data?.message ?? "Edited draft saved.");
    await loadCandidates();
  }, [editCandidate, editProposedText, editSummary, editTitle, loadCandidates, setResult]);

  if (loading) {
    return (
      <div className="aixia-tools-hub-hermes-candidates-body" data-testid="hermes-global-memory-candidates">
        <p className="aixia-tools-hub-hermes-control-meta">Loading global memory candidates…</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="aixia-tools-hub-hermes-candidates-body" data-testid="hermes-global-memory-candidates">
        <AixiaInfoBlock tone="rose" title="Owner access required">
          {loadError}
        </AixiaInfoBlock>
      </div>
    );
  }

  return (
    <div className="aixia-tools-hub-hermes-candidates-body" data-testid="hermes-global-memory-candidates">
      <AixiaInfoBlock tone="gold" icon={Lock} title="Metadata only">
        Generate and review proposed memory updates from read-only scan reports. Approval records intent
        only; it does not write memory or source-of-truth files.
      </AixiaInfoBlock>

      {feedback ? (
        <AixiaInfoBlock
          tone={feedback.tone === "success" ? "emerald" : feedback.tone === "warning" ? "gold" : "rose"}
          title="Candidate workflow"
        >
          {feedback.message}
        </AixiaInfoBlock>
      ) : null}

      <div className="aixia-tools-hub-hermes-candidates-status-row">
        <div className="aixia-tools-hub-hermes-candidates-stat">
          <span className="aixia-tools-hub-hermes-candidates-stat-label">Last batch</span>
          <span className="aixia-tools-hub-hermes-candidates-stat-value">
            {lastBatch ? formatGlobalMemoryDateTime(lastBatch.generatedAt) : "—"}
          </span>
        </div>
        <div className="aixia-tools-hub-hermes-candidates-stat">
          <span className="aixia-tools-hub-hermes-candidates-stat-label">Candidates</span>
          <span className="aixia-tools-hub-hermes-candidates-stat-value">{counts.total}</span>
        </div>
        <div className="aixia-tools-hub-hermes-candidates-stat">
          <span className="aixia-tools-hub-hermes-candidates-stat-label">Source report</span>
          <span className="aixia-tools-hub-hermes-candidates-stat-value">
            {lastBatch?.sourceReport ?? "qa-agent/reports/guardrail-action-plan.json"}
          </span>
        </div>
        <div className="aixia-tools-hub-hermes-candidates-stat">
          <span className="aixia-tools-hub-hermes-candidates-stat-label">Decisions</span>
          <span className="aixia-tools-hub-hermes-candidates-stat-value">
            {counts.approved} approved · {counts.rejected} rejected · {counts.pending} pending
          </span>
        </div>
      </div>

      <div className="aixia-tools-hub-hermes-candidates-actions">
        <AixiaButton
          variant="primary"
          disabled={controlsDisabled || generatorAvailable === false}
          onClick={() => void handleGenerate()}
        >
          Generate candidates from last scan
        </AixiaButton>
        {generatorAvailable === false ? (
          <p className="aixia-tools-hub-hermes-control-helper">
            Local report reader unavailable. Run scan via dev server, or ensure
            qa-agent/reports/guardrail-action-plan.json exists.
          </p>
        ) : null}
      </div>

      {candidates.length === 0 ? (
        <AixiaEmptyState
          icon={Sparkles}
          title="No global memory candidates generated yet"
          description="Run a read-only scan, then generate candidates from the report."
        />
      ) : (
        <>
          <div
            className={
              showAllCandidates && candidates.length > GLOBAL_MEMORY_CANDIDATES_VISIBLE_DEFAULT
                ? "aixia-tools-hub-hermes-candidates-list aixia-tools-hub-hermes-candidates-list-scroll"
                : "aixia-tools-hub-hermes-candidates-list"
            }
          >
            {visibleCandidates.map((candidate) => (
              <article
                key={candidate.candidateId}
                className="aixia-tools-hub-hermes-candidate-card"
                data-testid="hermes-global-memory-candidate-card"
              >
                <div className="aixia-tools-hub-hermes-candidate-card-head">
                  <div>
                    <p className="aixia-tools-hub-hermes-candidate-type">
                      {formatCandidateTypeLabel(candidate.candidateType)}
                    </p>
                    <h3 className="aixia-tools-hub-hermes-candidate-title">{candidate.title}</h3>
                  </div>
                  <AixiaBadge tone={globalMemoryCandidateStatusTone(candidate.status)}>
                    {globalMemoryCandidateStatusLabel(candidate.status)}
                  </AixiaBadge>
                </div>
                <p className="aixia-tools-hub-hermes-candidate-summary">{candidate.summary}</p>
                <div className="aixia-tools-hub-hermes-candidate-proposed">
                  <p className="aixia-tools-hub-hermes-candidate-proposed-label">Proposed memory text</p>
                  <p className="aixia-tools-hub-hermes-candidate-proposed-text">
                    {candidate.proposedMemoryText}
                  </p>
                </div>
                <dl className="aixia-tools-hub-hermes-candidate-meta">
                  <div>
                    <dt>Source report</dt>
                    <dd>
                      <code>{candidate.sourceReport}</code>
                    </dd>
                  </div>
                  {candidate.sourcePath ? (
                    <div>
                      <dt>Source path</dt>
                      <dd>
                        <code>{candidate.sourcePath}</code>
                      </dd>
                    </div>
                  ) : null}
                  {candidate.sourceFindingId ? (
                    <div>
                      <dt>Finding id</dt>
                      <dd>
                        <code>{candidate.sourceFindingId}</code>
                      </dd>
                    </div>
                  ) : null}
                  <div>
                    <dt>Target level</dt>
                    <dd>{candidate.targetMemoryLevel}</dd>
                  </div>
                  {candidate.targetOwnerFile ? (
                    <div>
                      <dt>Target owner file</dt>
                      <dd>
                        <code>{candidate.targetOwnerFile}</code>
                      </dd>
                    </div>
                  ) : null}
                  <div>
                    <dt>Confidence / risk</dt>
                    <dd>
                      {candidate.confidence} / {candidate.risk}
                    </dd>
                  </div>
                </dl>
                <div className="aixia-tools-hub-hermes-candidate-badges">
                  <AixiaBadge tone="rose">Requires Piter approval</AixiaBadge>
                  <AixiaBadge tone="neutral">No durable memory write</AixiaBadge>
                  <AixiaBadge tone="amber">No SOT file write</AixiaBadge>
                </div>
                <div className="aixia-tools-hub-hermes-candidate-card-actions">
                  <AixiaButton
                    variant="secondary"
                    className="text-xs px-3 py-1.5"
                    disabled={controlsDisabled}
                    onClick={() => openEditModal(candidate)}
                  >
                    Edit
                  </AixiaButton>
                  <AixiaButton
                    variant="secondary"
                    className="text-xs px-3 py-1.5"
                    disabled={
                      controlsDisabled ||
                      actionId === `${candidate.candidateId}:approve_for_future_memory`
                    }
                    onClick={() =>
                      void handleDecision(candidate.candidateId, "approve_for_future_memory")
                    }
                  >
                    Approve for global memory
                  </AixiaButton>
                  <AixiaButton
                    variant="secondary"
                    className="text-xs px-3 py-1.5"
                    disabled={controlsDisabled || actionId === `${candidate.candidateId}:reject`}
                    onClick={() => void handleDecision(candidate.candidateId, "reject")}
                  >
                    Reject
                  </AixiaButton>
                  <AixiaButton
                    variant="secondary"
                    className="text-xs px-3 py-1.5"
                    disabled={
                      controlsDisabled || actionId === `${candidate.candidateId}:review_later`
                    }
                    onClick={() => void handleDecision(candidate.candidateId, "review_later")}
                  >
                    Review later
                  </AixiaButton>
                  <AixiaButton
                    variant="secondary"
                    className="text-xs px-3 py-1.5"
                    disabled={
                      controlsDisabled || actionId === `${candidate.candidateId}:needs_cleanup`
                    }
                    onClick={() => void handleDecision(candidate.candidateId, "needs_cleanup")}
                  >
                    Needs cleanup
                  </AixiaButton>
                </div>
              </article>
            ))}
          </div>
          {candidates.length > GLOBAL_MEMORY_CANDIDATES_VISIBLE_DEFAULT ? (
            <AixiaButton
              variant="secondary"
              className="aixia-tools-hub-hermes-candidates-show-more"
              onClick={() => setShowAllCandidates((open) => !open)}
            >
              {showAllCandidates
                ? "Show fewer candidates"
                : `Show more (${candidates.length - GLOBAL_MEMORY_CANDIDATES_VISIBLE_DEFAULT} more)`}
            </AixiaButton>
          ) : null}
        </>
      )}

      {editModalOpen && editCandidate ? (
        <AixiaModal
          open
          title="Edit global memory candidate"
          description="Edits save as metadata only. No memory or source-of-truth files are written."
          onClose={() => {
            if (submitting) return;
            setEditModalOpen(false);
            setEditCandidate(null);
          }}
          maxWidthClassName="max-w-xl"
          footer={
            <div className="flex flex-wrap justify-end gap-2">
              <AixiaButton
                variant="secondary"
                disabled={submitting}
                onClick={() => setEditModalOpen(false)}
              >
                Cancel
              </AixiaButton>
              <AixiaButton variant="primary" disabled={submitting} onClick={() => void handleSaveEdit()}>
                {submitting ? "Saving…" : "Save edited draft"}
              </AixiaButton>
            </div>
          }
        >
          <div className="aixia-tools-hub-hermes-candidate-edit-form">
            <label className="aixia-tools-hub-hermes-candidate-edit-field">
              <span>Title</span>
              <input
                className="aixia-tools-hub-hermes-candidate-edit-input"
                value={editTitle}
                onChange={(event) => setEditTitle(event.target.value)}
              />
            </label>
            <label className="aixia-tools-hub-hermes-candidate-edit-field">
              <span>Summary</span>
              <input
                className="aixia-tools-hub-hermes-candidate-edit-input"
                value={editSummary}
                onChange={(event) => setEditSummary(event.target.value)}
              />
            </label>
            <label className="aixia-tools-hub-hermes-candidate-edit-field">
              <span>Proposed memory text</span>
              <AixiaTextareaField
                value={editProposedText}
                onChange={(event) => setEditProposedText(event.target.value)}
                rows={8}
              />
            </label>
          </div>
        </AixiaModal>
      ) : null}
    </div>
  );
}

const HERMES_READER_PREVIEW_LIMIT_OPTIONS = [5, 10, 20] as const;

type HermesGlobalMemoryReaderPreviewPanelProps = {
  refreshKey?: number;
};

function HermesGlobalMemoryReaderPreviewPanel({
  refreshKey = 0,
}: HermesGlobalMemoryReaderPreviewPanelProps) {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [records, setRecords] = useState<AgentOpsGlobalMemoryApprovedRecord[]>([]);
  const [previewLimit, setPreviewLimit] = useState<number>(10);
  const [detailsExpanded, setDetailsExpanded] = useState(true);
  const [refreshNonce, setRefreshNonce] = useState(0);

  const loadRecords = useCallback(async () => {
    const overview = await getAgentOpsGlobalMemoryApprovedRecords();
    if (overview.error) {
      setLoadError(overview.error);
      return;
    }
    setLoadError(null);
    setRecords(overview.data?.records ?? []);
  }, []);

  useEffect(() => {
    let active = true;
    void (async () => {
      setLoading(true);
      const ownerResult = await getAgentOpsOwnerStatus();
      if (!active) return;
      if (ownerResult.error || !ownerResult.data?.isOwner) {
        setLoadError(
          ownerResult.error ?? "AgentOps Owner access required for Hermes memory reader preview.",
        );
        setLoading(false);
        return;
      }
      await loadRecords();
      if (!active) return;
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [loadRecords, refreshKey, refreshNonce]);

  const preview = useMemo((): AgentOpsGlobalMemoryHermesPreviewResult => {
    return formatAgentOpsGlobalMemoryForHermesContext(records, { limit: previewLimit });
  }, [records, previewLimit]);

  const handleRefresh = () => {
    setRefreshNonce((current) => current + 1);
  };

  if (loading) {
    return (
      <div
        className="aixia-tools-hub-hermes-reader-preview-body"
        data-testid="hermes-global-memory-reader-preview"
      >
        <p className="aixia-tools-hub-hermes-control-meta">Loading Hermes memory reader preview…</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div
        className="aixia-tools-hub-hermes-reader-preview-body"
        data-testid="hermes-global-memory-reader-preview"
      >
        <AixiaInfoBlock tone="rose" title="Owner access required">
          {loadError}
        </AixiaInfoBlock>
      </div>
    );
  }

  return (
    <div
      className="aixia-tools-hub-hermes-reader-preview-body"
      data-testid="hermes-global-memory-reader-preview"
    >
      <AixiaInfoBlock tone="gold" icon={Eye} title="Hermes Memory Reader Preview">
        This preview shows the approved global memory context Hermes may receive later. It is
        metadata-only and read-only. Issue Chat can attach a separate preview block when
        VITE_AGENTOPS_ISSUE_CHAT_GLOBAL_MEMORY=true; Hermes coordinator runtime is not active.
        Chat runtime reliability is deferred to the LLM/TTS/STT phase.
      </AixiaInfoBlock>

      <ul className="aixia-tools-hub-hermes-reader-preview-disclaimer">
        {preview.safetyDisclaimer.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>

      <div className="aixia-tools-hub-hermes-reader-preview-toolbar">
        <div className="aixia-tools-hub-hermes-reader-preview-limit">
          <span className="aixia-tools-hub-hermes-reader-preview-limit-label">Preview limit</span>
          <div className="aixia-tools-hub-hermes-reader-preview-limit-options" role="group">
            {HERMES_READER_PREVIEW_LIMIT_OPTIONS.map((limit) => (
              <AixiaButton
                key={limit}
                type="button"
                variant={previewLimit === limit ? "primary" : "secondary"}
                onClick={() => setPreviewLimit(limit)}
              >
                {limit}
              </AixiaButton>
            ))}
          </div>
        </div>
        <div className="aixia-tools-hub-hermes-reader-preview-actions">
          <AixiaButton type="button" variant="secondary" onClick={handleRefresh}>
            <RefreshCw className="size-3.5" aria-hidden />
            Refresh preview
          </AixiaButton>
          <AixiaButton
            type="button"
            variant="secondary"
            onClick={() => setDetailsExpanded((current) => !current)}
          >
            {detailsExpanded ? (
              <>
                <ChevronUp className="size-3.5" aria-hidden />
                Collapse details
              </>
            ) : (
              <>
                <ChevronDown className="size-3.5" aria-hidden />
                Expand details
              </>
            )}
          </AixiaButton>
        </div>
      </div>

      <div className="aixia-tools-hub-hermes-candidates-status-row aixia-tools-hub-hermes-reader-preview-stats">
        <div className="aixia-tools-hub-hermes-candidates-stat">
          <span className="aixia-tools-hub-hermes-candidates-stat-label">Included</span>
          <span className="aixia-tools-hub-hermes-candidates-stat-value">
            {preview.stats.includedCount}
          </span>
        </div>
        <div className="aixia-tools-hub-hermes-candidates-stat">
          <span className="aixia-tools-hub-hermes-candidates-stat-label">Excluded</span>
          <span className="aixia-tools-hub-hermes-candidates-stat-value">
            {preview.stats.excludedCount}
          </span>
        </div>
        <div className="aixia-tools-hub-hermes-candidates-stat">
          <span className="aixia-tools-hub-hermes-candidates-stat-label">Total approved</span>
          <span className="aixia-tools-hub-hermes-candidates-stat-value">
            {preview.stats.totalApprovedRecords}
          </span>
        </div>
        <div className="aixia-tools-hub-hermes-candidates-stat">
          <span className="aixia-tools-hub-hermes-candidates-stat-label">Preview limit</span>
          <span className="aixia-tools-hub-hermes-candidates-stat-value">
            {preview.stats.previewLimit}
          </span>
        </div>
        <div className="aixia-tools-hub-hermes-candidates-stat">
          <span className="aixia-tools-hub-hermes-candidates-stat-label">Mode</span>
          <span className="aixia-tools-hub-hermes-candidates-stat-value">Preview only</span>
        </div>
      </div>

      {preview.exclusions.length > 0 ? (
        <AixiaInfoBlock tone="indigo" title="Exclusions summary">
          <ul className="aixia-tools-hub-hermes-reader-preview-exclusions">
            {preview.exclusions.map((item) => (
              <li key={item.reason}>
                <strong>{item.count}</strong> — {item.detail}
              </li>
            ))}
          </ul>
          <p className="aixia-tools-hub-hermes-control-meta">
            Candidate drafts, decisions, duplicate warnings, and SOT sidecars are not loaded into this
            preview. Only approved metadata records are considered.
          </p>
        </AixiaInfoBlock>
      ) : null}

      {detailsExpanded ? (
        preview.entries.length === 0 ? (
          <AixiaEmptyState
            icon={Eye}
            title="No preview entries yet"
            description="No approved global memory records are available for Hermes preview yet."
          />
        ) : (
          <div className="aixia-tools-hub-hermes-reader-preview-list">
            {preview.entries.map((entry) => (
              <article
                key={entry.memoryId}
                className="aixia-tools-hub-hermes-reader-preview-card"
                data-testid="hermes-global-memory-reader-preview-card"
              >
                <div className="aixia-tools-hub-hermes-reader-preview-card-head">
                  <div>
                    <p className="aixia-tools-hub-hermes-reader-preview-order">#{entry.order}</p>
                    <h3 className="aixia-tools-hub-hermes-candidate-title">{entry.title}</h3>
                    <p className="aixia-tools-hub-hermes-candidate-type">
                      {entry.memoryType.replaceAll("_", " ")} · {entry.scope} ·{" "}
                      {entry.status.replaceAll("_", " ")}
                    </p>
                  </div>
                  <div className="aixia-tools-hub-hermes-reader-preview-badges">
                    <AixiaBadge tone="neutral">Preview only</AixiaBadge>
                    <AixiaBadge tone="rose">Not sent to Hermes</AixiaBadge>
                    {entry.sotProposalPending ? (
                      <AixiaBadge tone="amber">SOT proposal pending — not official law</AixiaBadge>
                    ) : null}
                  </div>
                </div>
                <p className="aixia-tools-hub-hermes-reader-preview-text">{entry.compactMemoryText}</p>
                <p className="aixia-tools-hub-hermes-reader-preview-line">
                  <span className="aixia-tools-hub-hermes-reader-preview-line-label">Compact line</span>
                  {entry.previewLine}
                </p>
              </article>
            ))}
          </div>
        )
      ) : (
        <p className="aixia-tools-hub-hermes-control-meta">
          {preview.stats.includedCount} preview {preview.stats.includedCount === 1 ? "entry" : "entries"}{" "}
          ready — expand details to view formatted context.
        </p>
      )}
    </div>
  );
}

const GLOBAL_MEMORY_APPROVED_VISIBLE_DEFAULT = 5;

function globalMemoryApprovedStatusTone(
  status: AgentOpsGlobalMemoryApprovedRecordStatus,
): "emerald" | "rose" | "amber" | "neutral" | "violet" | "cyan" {
  if (status === "approved_memory") return "emerald";
  if (status === "sot_proposal_pending") return "amber";
  return "violet";
}

function globalMemoryApprovedStatusLabel(
  status: AgentOpsGlobalMemoryApprovedRecordStatus,
): string {
  if (status === "approved_memory") return "Approved global memory";
  if (status === "sot_proposal_pending") return "SOT proposal pending";
  return "Advisory only";
}

function formatApprovedMemoryTypeLabel(
  type: AgentOpsGlobalMemoryApprovedRecord["memoryType"],
): string {
  return type.replaceAll("_", " ");
}

type HermesGlobalMemoryApprovedPanelProps = {
  refreshKey?: number;
};

function HermesGlobalMemoryApprovedPanel({ refreshKey = 0 }: HermesGlobalMemoryApprovedPanelProps) {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [records, setRecords] = useState<AgentOpsGlobalMemoryApprovedRecord[]>([]);
  const [counts, setCounts] = useState({
    total: 0,
    approvedMemory: 0,
    advisoryOnly: 0,
    sotProposalPending: 0,
  });
  const [showAllApproved, setShowAllApproved] = useState(false);

  const loadApproved = useCallback(async () => {
    const overview = await getAgentOpsGlobalMemoryApprovedRecords();
    if (overview.error) {
      setLoadError(overview.error);
      return;
    }
    setLoadError(null);
    setRecords(overview.data?.records ?? []);
    setCounts(
      overview.data?.counts ?? {
        total: 0,
        approvedMemory: 0,
        advisoryOnly: 0,
        sotProposalPending: 0,
      },
    );
  }, []);

  useEffect(() => {
    let active = true;
    void (async () => {
      setLoading(true);
      const ownerResult = await getAgentOpsOwnerStatus();
      if (!active) return;
      if (ownerResult.error || !ownerResult.data?.isOwner) {
        setLoadError(
          ownerResult.error ?? "AgentOps Owner access required for approved global memory.",
        );
        setLoading(false);
        return;
      }
      await loadApproved();
      if (!active) return;
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [loadApproved, refreshKey]);

  const visibleRecords = useMemo(() => {
    if (showAllApproved) return records;
    return records.slice(0, GLOBAL_MEMORY_APPROVED_VISIBLE_DEFAULT);
  }, [records, showAllApproved]);

  if (loading) {
    return (
      <div
        className="aixia-tools-hub-hermes-approved-body"
        data-testid="hermes-global-memory-approved"
      >
        <p className="aixia-tools-hub-hermes-control-meta">Loading approved global memory…</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div
        className="aixia-tools-hub-hermes-approved-body"
        data-testid="hermes-global-memory-approved"
      >
        <AixiaInfoBlock tone="rose" title="Owner access required">
          {loadError}
        </AixiaInfoBlock>
      </div>
    );
  }

  return (
    <div className="aixia-tools-hub-hermes-approved-body" data-testid="hermes-global-memory-approved">
      <AixiaInfoBlock tone="emerald" icon={CheckCircle2} title="Metadata-only approved store">
        Approved global memory is stored in AgentOps feedback metadata only. It does not update
        Hermes runtime, AgentMemory, registry files, or design source-of-truth owner files.
      </AixiaInfoBlock>

      <div className="aixia-tools-hub-hermes-candidates-status-row">
        <div className="aixia-tools-hub-hermes-candidates-stat">
          <span className="aixia-tools-hub-hermes-candidates-stat-label">Approved records</span>
          <span className="aixia-tools-hub-hermes-candidates-stat-value">{counts.total}</span>
        </div>
        <div className="aixia-tools-hub-hermes-candidates-stat">
          <span className="aixia-tools-hub-hermes-candidates-stat-label">Global memory</span>
          <span className="aixia-tools-hub-hermes-candidates-stat-value">
            {counts.approvedMemory}
          </span>
        </div>
        <div className="aixia-tools-hub-hermes-candidates-stat">
          <span className="aixia-tools-hub-hermes-candidates-stat-label">SOT proposal pending</span>
          <span className="aixia-tools-hub-hermes-candidates-stat-value">
            {counts.sotProposalPending}
          </span>
        </div>
        <div className="aixia-tools-hub-hermes-candidates-stat">
          <span className="aixia-tools-hub-hermes-candidates-stat-label">Advisory only</span>
          <span className="aixia-tools-hub-hermes-candidates-stat-value">{counts.advisoryOnly}</span>
        </div>
      </div>

      {records.length === 0 ? (
        <AixiaEmptyState
          icon={CheckCircle2}
          title="No approved global memory yet"
          description="Approve a candidate above with “Approve for global memory” to add a metadata-only approved record."
        />
      ) : (
        <>
          <div
            className={
              showAllApproved && records.length > GLOBAL_MEMORY_APPROVED_VISIBLE_DEFAULT
                ? "aixia-tools-hub-hermes-candidates-list aixia-tools-hub-hermes-candidates-list-scroll"
                : "aixia-tools-hub-hermes-candidates-list"
            }
          >
            {visibleRecords.map((record) => (
              <article
                key={record.memoryId}
                className="aixia-tools-hub-hermes-candidate-card aixia-tools-hub-hermes-approved-card"
                data-testid="hermes-global-memory-approved-card"
              >
                <div className="aixia-tools-hub-hermes-candidate-card-head">
                  <div>
                    <p className="aixia-tools-hub-hermes-candidate-type">
                      {formatApprovedMemoryTypeLabel(record.memoryType)} · {record.scope}
                    </p>
                    <h3 className="aixia-tools-hub-hermes-candidate-title">{record.title}</h3>
                  </div>
                  <AixiaBadge tone={globalMemoryApprovedStatusTone(record.status)}>
                    {globalMemoryApprovedStatusLabel(record.status)}
                  </AixiaBadge>
                </div>
                <div className="aixia-tools-hub-hermes-candidate-proposed">
                  <p className="aixia-tools-hub-hermes-candidate-proposed-label">Approved memory text</p>
                  <p className="aixia-tools-hub-hermes-candidate-proposed-text">{record.memoryText}</p>
                </div>
                <dl className="aixia-tools-hub-hermes-candidate-meta">
                  <div>
                    <dt>Source candidate</dt>
                    <dd>
                      <code>{record.sourceCandidateId}</code>
                    </dd>
                  </div>
                  {record.sourceReport ? (
                    <div>
                      <dt>Source report</dt>
                      <dd>
                        <code>{record.sourceReport}</code>
                      </dd>
                    </div>
                  ) : null}
                  {record.sourceFindingId ? (
                    <div>
                      <dt>Finding id</dt>
                      <dd>
                        <code>{record.sourceFindingId}</code>
                      </dd>
                    </div>
                  ) : null}
                  {record.targetOwnerFile ? (
                    <div>
                      <dt>Target owner file</dt>
                      <dd>
                        <code>{record.targetOwnerFile}</code>
                      </dd>
                    </div>
                  ) : null}
                  <div>
                    <dt>Approved at</dt>
                    <dd>{formatGlobalMemoryDateTime(record.approvedAt)}</dd>
                  </div>
                </dl>
                <div className="aixia-tools-hub-hermes-candidate-badges">
                  <AixiaBadge tone="neutral">Metadata only</AixiaBadge>
                  <AixiaBadge tone="rose">No Hermes runtime write</AixiaBadge>
                  <AixiaBadge tone="rose">No AgentMemory write</AixiaBadge>
                  <AixiaBadge tone="amber">No SOT file write</AixiaBadge>
                  {record.hasSotProposal ? (
                    <AixiaBadge tone="amber">SOT proposal queued</AixiaBadge>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
          {records.length > GLOBAL_MEMORY_APPROVED_VISIBLE_DEFAULT ? (
            <AixiaButton
              variant="secondary"
              className="aixia-tools-hub-hermes-candidates-show-more"
              onClick={() => setShowAllApproved((open) => !open)}
            >
              {showAllApproved
                ? "Show fewer approved records"
                : `Show more (${records.length - GLOBAL_MEMORY_APPROVED_VISIBLE_DEFAULT} more)`}
            </AixiaButton>
          ) : null}
        </>
      )}
    </div>
  );
}

function HermesGlobalWebsiteMemoryReadIndexPanel() {
  return (
    <div className="aixia-tools-hub-hermes-memory-index-body" data-testid="hermes-global-memory-index">
      <AixiaInfoBlock tone="gold" icon={Lock} title="Read-only index">
        Read-only index. Hermes does not write source-of-truth files, registry entries, analytics, or
        AgentOps records. Any future memory update requires Piter approval.
      </AixiaInfoBlock>
      <p className="aixia-tools-hub-hermes-memory-intro">
        Hermes will eventually use this index to understand AiXia’s global website memory. Today this is a
        read-only map of sources; Hermes does not automatically read, write, or sync these sources yet.
        Audit-based map — not connected to runtime memory ingestion.
      </p>
      <div className="aixia-tools-hub-hermes-memory-grid">
        {HERMES_GLOBAL_MEMORY_SOURCES.map((source) => {
          const SourceIcon = source.icon;
          return (
            <article
              key={source.id}
              className="aixia-tools-hub-hermes-memory-card"
              data-testid={`hermes-memory-source-${source.id}`}
            >
              <div className="aixia-tools-hub-hermes-memory-card-head">
                <div className="aixia-tools-hub-hermes-memory-card-title-row">
                  <SourceIcon className="aixia-tools-hub-hermes-memory-card-icon" aria-hidden />
                  <h3 className="aixia-tools-hub-hermes-memory-card-title">{source.title}</h3>
                </div>
                <AixiaBadge tone={source.stateTone}>{source.currentState}</AixiaBadge>
              </div>
              <dl className="aixia-tools-hub-hermes-memory-meta">
                <div>
                  <dt>Type</dt>
                  <dd>{source.sourceType}</dd>
                </div>
                <div>
                  <dt>Path / table</dt>
                  <dd>
                    <code>{source.path}</code>
                  </dd>
                </div>
                <div>
                  <dt>Hermes reads today</dt>
                  <dd>{source.hermesReadsToday}</dd>
                </div>
                <div>
                  <dt>Future Hermes role</dt>
                  <dd>{source.futureRole}</dd>
                </div>
                <div className="aixia-tools-hub-hermes-memory-meta-wide">
                  <dt>Write policy</dt>
                  <dd>{source.writePolicy}</dd>
                </div>
              </dl>
              <p className="aixia-tools-hub-hermes-memory-notes">{source.notes}</p>
            </article>
          );
        })}
      </div>
    </div>
  );
}

type ToolsHubHermesDetailPageProps = {
  registryEntry: ToolRegistryEntry;
};

export function ToolsHubHermesGlobalWebsiteMemoryPage() {
  const [approvedMemoryRefreshKey, setApprovedMemoryRefreshKey] = useState(0);
  const hermesParentPath = getHermesDetailPath();

  const hero = (
    <AixiaHero
      surface="command"
      className="shrink-0 space-y-4"
      gradientTitle="Hermes"
      title="Global Website Memory"
      subtitle="Read-only global memory source index for Hermes."
      parentLabel="Hermes"
      parentPath={hermesParentPath}
      badges={[
        { label: "Partial foundation", tone: "amber" as const },
        { label: "Hermes not ready", tone: "neutral" as const },
        { label: "Read-only controls", tone: "violet" as const },
        { label: "Runtime not active", tone: "rose" as const },
      ]}
    >
      <p className="aixia-tools-hub-hermes-hero-note">
        Partial working foundation for Hermes layer 1 only. Owner-gated scan preferences, candidate
        workflow, approved metadata store, and reader preview. Hermes does not ingest, write, sync, or
        schedule cloud scans from this page. Issue Chat global memory is preview-only and flag-controlled.
      </p>
    </AixiaHero>
  );

  const metaStrip = (
    <AixiaCommandHubMetaStrip
      variant="command"
      items={[
        {
          key: "sources",
          label: "Sources",
          value: String(HERMES_GLOBAL_MEMORY_SOURCES.length),
          detail: "Indexed memory sources",
          tone: "amber",
        },
        {
          key: "hermes",
          label: "Hermes",
          value: "Preview only",
          detail: "Issue Chat flag-controlled · runtime not active",
          tone: "neutral",
        },
        {
          key: "writes",
          label: "Writes",
          value: "Blocked",
          detail: "Piter approval required",
          tone: "violet",
        },
        {
          key: "phase",
          label: "Phase",
          value: "H2-F3B-1 reader preview",
          detail: "Metadata approved memory · preview not runtime",
          tone: "cyan",
        },
      ]}
    />
  );

  const globalMemorySectionBodyClass =
    "aixia-dash-panel-body aixia-tools-hub-hermes-global-memory-body";

  return (
    <AixiaCommandPageLayout hero={hero} scrollLead={metaStrip}>
      <div
        className="aixia-tools-hub-hermes-page aixia-tools-hub-hermes-global-memory-page"
        data-testid="agentops-tools-hermes-global-website-memory"
      >
        <AixiaSection
          surface="command"
          className="aixia-non-cropping-grid-section aixia-tools-hub-hermes-global-memory-section aixia-tools-hub-hermes-controls-section"
          title="Global Memory Controls"
          description="Owner-gated read-only controls for scan preference, source selection, and partial snapshot generation. No cron, no writeback, no automatic memory updates."
          icon={CalendarClock}
          bodyClassName={globalMemorySectionBodyClass}
        >
          <HermesGlobalWebsiteMemoryControlsPanel />
        </AixiaSection>

        <AixiaSection
          surface="command"
          className="aixia-non-cropping-grid-section aixia-tools-hub-hermes-global-memory-section aixia-tools-hub-hermes-candidates-section"
          title="Global Memory Candidates"
          description="Generate and review proposed memory updates from read-only scan reports. Approval records intent only; it does not write memory or source-of-truth files."
          icon={Sparkles}
          bodyClassName={globalMemorySectionBodyClass}
        >
          <HermesGlobalMemoryCandidatesPanel
            onApprovedMemoryChange={() =>
              setApprovedMemoryRefreshKey((current) => current + 1)
            }
          />
        </AixiaSection>

        <AixiaSection
          surface="command"
          className="aixia-non-cropping-grid-section aixia-tools-hub-hermes-global-memory-section aixia-tools-hub-hermes-approved-section"
          title="Approved Global Memory"
          description="Metadata-only store for candidates you approved for global memory. Not Hermes runtime, AgentMemory, or official source-of-truth law until separately promoted."
          icon={CheckCircle2}
          bodyClassName={globalMemorySectionBodyClass}
        >
          <HermesGlobalMemoryApprovedPanel refreshKey={approvedMemoryRefreshKey} />
        </AixiaSection>

        <AixiaSection
          surface="command"
          className="aixia-non-cropping-grid-section aixia-tools-hub-hermes-global-memory-section aixia-tools-hub-hermes-reader-preview-section"
          title="Hermes Memory Reader Preview"
          description="Read-only preview of approved global memory context. Issue Chat injection is flag-controlled preview only; Hermes coordinator runtime is not active."
          icon={Eye}
          bodyClassName={globalMemorySectionBodyClass}
        >
          <HermesGlobalMemoryReaderPreviewPanel refreshKey={approvedMemoryRefreshKey} />
        </AixiaSection>

        <AixiaSection
          surface="command"
          className="aixia-non-cropping-grid-section aixia-tools-hub-hermes-global-memory-section aixia-tools-hub-hermes-read-index-section"
          title="Global Website Memory — Read Index"
          description="Reference map of global memory sources (read-only). Use controls above to set preferences and generate a partial snapshot."
          icon={Layers}
          bodyClassName={globalMemorySectionBodyClass}
        >
          <HermesGlobalWebsiteMemoryReadIndexPanel />
        </AixiaSection>
      </div>
    </AixiaCommandPageLayout>
  );
}

export function ToolsHubHermesDetailPage({ registryEntry }: ToolsHubHermesDetailPageProps) {
  void registryEntry;
  const navigate = useNavigate();
  const group = getToolRegistryEntry(MEMORY_COORDINATION_GROUP_ID);
  const parentPath = getToolRegistryGroupRoute(
    AGENT_BRAIN_CATEGORY_ID,
    MEMORY_COORDINATION_GROUP_ID,
  );
  const parentLabel = group?.title ?? "Memory & Coordination Tools";
  const [health, setHealth] = useState<AgentOpsHermesRuntimeHealth | null>(null);

  const advisoryActive = Boolean(health?.transportReachable && health.mode === "advisory_transport");
  const contextActive = health?.contextAssemblerAvailable === true;

  const hermesHero = (
    <AixiaHero
      surface="command"
      className="shrink-0 space-y-4"
      gradientTitle="AgentOps"
      title="Hermes"
      subtitle="Advisory runtime is active with Doubao Ark and read-only AiXia context. Full coordinator automation is still blocked."
      parentLabel={parentLabel}
      parentPath={parentPath}
      badges={HERMES_STATUS_BADGES}
    >
      <p className="aixia-tools-hub-hermes-hero-note">{HERMES_NEXT_ACTIVATION_STEP}</p>
    </AixiaHero>
  );

  const hermesMetaStrip = (
    <AixiaCommandHubMetaStrip
      variant="command"
      items={[
        {
          key: "runtime",
          label: "Runtime",
          value: advisoryActive ? "Advisory active" : health ? "Unavailable" : "Checking…",
          detail: "Doubao Ark advisory transport",
          tone: advisoryActive ? "emerald" : "rose",
        },
        {
          key: "context",
          label: "Context",
          value: contextActive ? "Read-only active" : health ? "Unavailable" : "Checking…",
          detail: "Read-only AiXia context injection",
          tone: contextActive ? "cyan" : "amber",
        },
        {
          key: "workflows",
          label: "Workflows",
          value: "1–3 active",
          detail: "Issue Advisory, prompt review, fix report review",
          tone: "emerald",
        },
        {
          key: "coordinator",
          label: "Coordinator",
          value: "Not active",
          detail: "No automation or memory coordinator",
          tone: "neutral",
        },
        {
          key: "production",
          label: "Production",
          value: "Off",
          detail: "Staging advisory only",
          tone: "rose",
        },
      ]}
    />
  );

  return (
    <AixiaCommandPageLayout hero={hermesHero} scrollLead={hermesMetaStrip}>
      <div
        className="aixia-tools-hub-hermes-page aixia-fab-safe-scroll"
        data-testid="agentops-tools-hermes-detail"
      >
        <AixiaSection
          surface="command"
          className="aixia-tools-hub-hermes-section aixia-tools-hub-hermes-control-section"
          title="Hermes Control"
          description="Test the live advisory runtime and optional read-only AiXia context."
          icon={Sparkles}
          bodyClassName={HERMES_MAIN_PANEL_BODY_CLASS}
        >
          <HermesControlPanel onHealthChange={setHealth} />
        </AixiaSection>

        <AixiaSection
          surface="command"
          className="aixia-tools-hub-hermes-section aixia-tools-hub-hermes-readiness-section"
          title="Module readiness"
          description="Advisory module status on staging — coordinator and automation remain blocked."
          icon={CheckCircle2}
          bodyClassName={HERMES_MAIN_PANEL_BODY_CLASS}
        >
          <div
            className="aixia-tools-hub-hermes-readiness-grid"
            data-testid="hermes-module-readiness"
          >
            {HERMES_MODULE_READINESS_CARDS.map((card) => (
              <AixiaNavigationStatBlock
                key={card.label}
                label={card.label}
                value={card.value}
                description={card.description}
                tone={card.tone}
              />
            ))}
          </div>
          <p className="aixia-tools-hub-hermes-readiness-note">
            Stage B recommendation artifacts are built and awaiting final save/refresh QA.
          </p>
          <p className="aixia-tools-hub-hermes-safety-line" data-testid="hermes-advisory-safety-line">
            {HERMES_ADVISORY_SAFETY_LINE}
          </p>
        </AixiaSection>

        <AixiaSection
          surface="command"
          className="aixia-tools-hub-hermes-section aixia-non-cropping-grid-section"
          title="Four Hermes layers"
          description="Memory layers — partial, read-only, or not started."
          icon={Layers}
          bodyClassName={HERMES_MAIN_PANEL_BODY_CLASS}
        >
          <AixiaNavigationGrid className="aixia-tools-hub-hermes-layer-grid">
            {HERMES_LAYERS.map((layer) => (
              <AixiaNavigationCard
                key={layer.id}
                title={layer.title}
                description={layer.purpose}
                icon={layer.icon}
                tone={layer.tone}
                statusLabel={layer.status}
                actionLabel={layer.actionLabel}
                disabled={layer.disabled}
                onClick={
                  layer.detailPath ? () => navigate(layer.detailPath) : undefined
                }
                meta={[
                  {
                    label: "Details",
                    value: layer.disabled ? "Planned" : "Open layer",
                    description: layer.missing,
                  },
                ]}
              />
            ))}
          </AixiaNavigationGrid>
        </AixiaSection>

        <HermesAdvancedDetailsSection health={health} />
      </div>
    </AixiaCommandPageLayout>
  );
}

export function ToolsHubHermesDetailNotFound({
  categoryId,
  groupId,
  toolSlug,
}: {
  categoryId: string;
  groupId: string;
  toolSlug: string;
}) {
  const group = getToolRegistryEntry(groupId);
  const parentPath = getToolRegistryGroupRoute(categoryId, groupId);

  return (
    <ToolsHubShell
      title="Tool not found"
      subtitle="This Tools Hub tool detail page is not in the registry."
      parentLabel={group?.title ?? "Tools group"}
      parentPath={parentPath}
    >
      <AixiaInfoBlock tone="rose" icon={Search} title="Unknown tool">
        No registry entry for <code>{categoryId}/{groupId}/{toolSlug}</code>.
      </AixiaInfoBlock>
    </ToolsHubShell>
  );
}
