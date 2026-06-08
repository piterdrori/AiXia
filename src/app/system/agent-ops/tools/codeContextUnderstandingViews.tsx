import {
  CheckCircle2,
  Code2,
  GitBranch,
  Lock,
  MapPin,
  Search,
  Shield,
  Sparkles,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import {
  AixiaBadge,
  AixiaButton,
  AixiaInfoBlock,
  AixiaNavigationCard,
  AixiaNavigationGrid,
  AixiaSection,
} from "@/components/aixia";

import { getToolRegistryCategoryRoute } from "@/lib/agentops/tools/toolRegistry";

import { ToolsHubShell } from "./toolsHubViews";

const AGENT_BRAIN_CATEGORY_ID = "agent-brain-memory";
const CODE_CONTEXT_GROUP_ID = "code-context-understanding";
const CODE_CONTEXT_PATH = `/system/agent-ops/tools/${AGENT_BRAIN_CATEGORY_ID}/${CODE_CONTEXT_GROUP_ID}`;
const HERMES_PATH = `/system/agent-ops/tools/${AGENT_BRAIN_CATEGORY_ID}/memory-coordination-tools/hermes`;

const CODEGRAPH_PATH = `${CODE_CONTEXT_PATH}/codegraph`;
const UNDERSTAND_ANYTHING_PATH = `${CODE_CONTEXT_PATH}/understand-anything`;
const CLAUDE_CONTEXT_PATH = `${CODE_CONTEXT_PATH}/claude-context`;

type FoundationStatusItem = {
  label: string;
  value: string;
  tone: "emerald" | "amber" | "rose" | "neutral" | "cyan" | "violet";
};

type CodeContextToolFoundationConfig = {
  testId: string;
  title: string;
  subtitle: string;
  badges: { label: string; tone: FoundationStatusItem["tone"] }[];
  intro: string;
  moduleStatus: FoundationStatusItem[];
  helpsWithTitle: string;
  helpsWith: string[];
  safeSourcesTitle: string;
  safeSources: string[];
  hermesIntegration: string[];
  safetyGates: string[];
  futurePath: string[];
  safetyBanner: string;
};

function FoundationStatusGrid({ items }: { items: FoundationStatusItem[] }) {
  return (
    <div className="aixia-tools-hub-hermes-memory-grid">
      {items.map((item) => (
        <div key={item.label} className="aixia-tools-hub-hermes-memory-card">
          <div className="aixia-tools-hub-hermes-memory-card-head">
            <div className="aixia-tools-hub-hermes-memory-card-title-row">
              <CheckCircle2 className="aixia-tools-hub-hermes-memory-card-icon" />
              <h3 className="aixia-tools-hub-hermes-memory-card-title">{item.label}</h3>
            </div>
            <AixiaBadge tone={item.tone}>{item.value}</AixiaBadge>
          </div>
        </div>
      ))}
    </div>
  );
}

function FoundationTopicGrid({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="aixia-tools-hub-hermes-foundation-topic-block">
      <h3 className="aixia-tools-hub-hermes-foundation-topic-title">{title}</h3>
      <ul className="aixia-tools-hub-hermes-steps-list">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function FoundationStagePath({ stages }: { stages: string[] }) {
  return (
    <ol className="aixia-tools-hub-hermes-foundation-path">
      {stages.map((stage) => (
        <li key={stage}>{stage}</li>
      ))}
    </ol>
  );
}

function CodeContextToolFoundationPage({ config }: { config: CodeContextToolFoundationConfig }) {
  const navigate = useNavigate();

  return (
    <ToolsHubShell
      title={config.title}
      subtitle={config.subtitle}
      parentLabel="Code / Context Understanding Tools"
      parentPath={CODE_CONTEXT_PATH}
      badges={config.badges}
    >
      <div
        className="aixia-tools-hub-hermes-page aixia-tools-hub-hermes-foundation-layer-page"
        data-testid={config.testId}
      >
        <AixiaSection
          surface="command"
          title="Module status"
          description="Safe foundation only — no website execution, code changes, or production access."
          icon={Code2}
          bodyClassName="aixia-dash-panel-body aixia-tools-hub-hermes-panel-body"
        >
          <p className="aixia-tools-hub-hermes-memory-intro">{config.intro}</p>
          <FoundationStatusGrid items={config.moduleStatus} />
        </AixiaSection>

        <AixiaSection
          surface="command"
          title={`What ${config.title} helps with`}
          description="Planned context support — execution blocked in v1."
          icon={Search}
          bodyClassName="aixia-dash-panel-body aixia-tools-hub-hermes-panel-body"
        >
          <FoundationTopicGrid title={config.helpsWithTitle} items={config.helpsWith} />
        </AixiaSection>

        <AixiaSection
          surface="command"
          title="Current safe source"
          description="Honest runtime/source status — verified from repo audit."
          icon={Shield}
          bodyClassName="aixia-dash-panel-body aixia-tools-hub-hermes-panel-body"
        >
          <FoundationTopicGrid title={config.safeSourcesTitle} items={config.safeSources} />
        </AixiaSection>

        <AixiaSection
          surface="command"
          title="Hermes integration"
          description="Future context enrichment for Hermes — no execution today."
          icon={Sparkles}
          bodyClassName="aixia-dash-panel-body aixia-tools-hub-hermes-panel-body"
        >
          <FoundationTopicGrid title="Hermes relationship" items={config.hermesIntegration} />
        </AixiaSection>

        <AixiaSection
          surface="command"
          title="Safety gates"
          description="Every execution path requires explicit owner approval."
          icon={Lock}
          bodyClassName="aixia-dash-panel-body aixia-tools-hub-hermes-panel-body"
        >
          <FoundationTopicGrid title="Gates" items={config.safetyGates} />
        </AixiaSection>

        <AixiaSection
          surface="command"
          title="Future activation path"
          description="Staged rollout — v1 foundation with execution blocked."
          icon={MapPin}
          bodyClassName="aixia-dash-panel-body aixia-tools-hub-hermes-panel-body"
        >
          <FoundationStagePath stages={config.futurePath} />
        </AixiaSection>

        <AixiaInfoBlock tone="gold" icon={Shield} title="Safety boundaries">
          {config.safetyBanner}
        </AixiaInfoBlock>

        <div className="aixia-tools-hub-hermes-foundation-layer-actions">
          <AixiaButton variant="secondary" onClick={() => navigate(CODE_CONTEXT_PATH)}>
            Back to Code / Context hub
          </AixiaButton>
          <AixiaButton variant="primary" onClick={() => navigate(HERMES_PATH)}>
            Open Hermes
          </AixiaButton>
        </div>
      </div>
    </ToolsHubShell>
  );
}

export function ToolsHubCodeContextUnderstandingPage() {
  const navigate = useNavigate();
  const categoryPath = getToolRegistryCategoryRoute(AGENT_BRAIN_CATEGORY_ID);

  return (
    <ToolsHubShell
      title="Code / Context Understanding Tools"
      subtitle="Structural and semantic code intelligence for Hermes, agents, and owners. All tools are foundation-active read-only context sources — execution blocked."
      parentLabel="Agent Brain & Memory"
      parentPath={categoryPath}
      badges={[
        { label: "3 tools · foundation active", tone: "emerald" },
        { label: "Read-only context", tone: "cyan" },
        { label: "Execution blocked", tone: "rose" },
        { label: "Production off", tone: "neutral" },
      ]}
    >
      <AixiaSection
        surface="command"
        className="aixia-non-cropping-grid-section"
        title="Code & context tools"
        description="3 tools · CodeGraph Cursor MCP local · Understand-Anything & claude-context local clone reference · Hermes context-only · execution blocked"
        icon={Code2}
        bodyClassName="aixia-dash-panel-body aixia-tools-hub-hermes-panel-body"
      >
        <AixiaNavigationGrid className="aixia-tools-hub-level3-grid">
          <div className="aixia-tools-hub-level3-cell" data-tool-id="ccu-codegraph">
            <AixiaNavigationCard
              className="aixia-tools-hub-level3-card"
              eyebrow="Tool"
              title="CodeGraph"
              description="Code relationship and dependency context for Hermes, agents, and Cursor planning. No code changes are executed from this page."
              icon={GitBranch}
              tone="emerald"
              statusLabel="Foundation active"
              actionLabel="Open"
              summary="Cursor MCP local / read-only context"
              meta={[
                {
                  label: "Runtime",
                  value: "Cursor MCP local / read-only context",
                },
              ]}
              onClick={() => navigate(CODEGRAPH_PATH)}
            />
          </div>
          <div className="aixia-tools-hub-level3-cell" data-tool-id="ccu-understand-anything">
            <AixiaNavigationCard
              className="aixia-tools-hub-level3-card"
              eyebrow="Tool"
              title="Understand-Anything"
              description="Codebase understanding reference for future project-level context. It is available as a cloned/reference tool but not executed by Hermes today."
              icon={Search}
              tone="emerald"
              statusLabel="Foundation active"
              actionLabel="Open"
              summary="Local clone / not runtime-connected"
              meta={[
                {
                  label: "Runtime",
                  value: "Local clone / not runtime-connected",
                },
                {
                  label: "Source",
                  value: "../tools/understand-anything/",
                },
              ]}
              onClick={() => navigate(UNDERSTAND_ANYTHING_PATH)}
            />
          </div>
          <div className="aixia-tools-hub-level3-cell" data-tool-id="ccu-claude-context">
            <AixiaNavigationCard
              className="aixia-tools-hub-level3-card"
              eyebrow="Tool"
              title="claude-context"
              description="Semantic code context reference for future retrieval workflows. Not connected to Hermes runtime execution today."
              icon={Code2}
              tone="emerald"
              statusLabel="Foundation active"
              actionLabel="Open"
              summary="Local clone / semantic context planned"
              meta={[
                {
                  label: "Runtime",
                  value: "Local clone / semantic context planned",
                },
                {
                  label: "Source",
                  value: "../tools/claude-context/",
                },
              ]}
              onClick={() => navigate(CLAUDE_CONTEXT_PATH)}
            />
          </div>
        </AixiaNavigationGrid>
      </AixiaSection>
    </ToolsHubShell>
  );
}

const CODEGRAPH_CONFIG: CodeContextToolFoundationConfig = {
  testId: "codegraph-foundation",
  title: "CodeGraph",
  subtitle: "Foundation active — Cursor MCP local read-only context for Hermes and agents.",
  badges: [
    { label: "Foundation active", tone: "emerald" },
    { label: "Read-only context", tone: "cyan" },
    { label: "Cursor MCP local", tone: "neutral" },
    { label: "Execution blocked", tone: "rose" },
    { label: "Production off", tone: "neutral" },
  ],
  intro:
    "CodeGraph provides AST-based code relationship context via Cursor MCP. This foundation page documents safe read-only context paths only — the AiXia website does not execute CodeGraph MCP calls.",
  moduleStatus: [
    { label: "Foundation", value: "Active", tone: "emerald" },
    { label: "Runtime", value: "Local / Cursor MCP", tone: "cyan" },
    { label: "Website execution", value: "Blocked", tone: "rose" },
    { label: "Hermes access", value: "Context-only", tone: "neutral" },
    { label: "Production", value: "Off", tone: "rose" },
  ],
  helpsWithTitle: "Context capabilities",
  helpsWith: [
    "Dependency relationships",
    "File relationships",
    "Route/component understanding",
    "Impact analysis",
    "Change planning",
    "Guardrail investigation",
    "Cursor prompt support",
    "Hermes context support",
  ],
  safeSourcesTitle: "Verified sources",
  safeSources: [
    ".cursor/mcp.json — codegraph MCP server configured for Cursor",
    ".codegraph/ — local index present (Cursor-side)",
    "Local codebase metadata via Cursor agents only",
    "No browser execution from AiXia website",
    "No production execution from this app",
    "CODEGRAPH_RUNTIME_ACTIVE false in app — not callable from website",
  ],
  hermesIntegration: [
    "Hermes can use CodeGraph context later",
    "Hermes cannot execute CodeGraph today",
    "Stage C safe-read only",
    "Future Stage D may include read-only context injection",
    "No code changes by Hermes",
  ],
  safetyGates: [
    "No code modification",
    "No tool execution from website",
    "No production access",
    "No automatic route scanning",
    "No SOT writes",
    "Owner approval required for any future execution",
  ],
  futurePath: [
    "v1 — foundation active / local context",
    "v2 — read-only context summary",
    "v3 — Hermes context injection",
    "v4 — approved analysis runs",
    "v5 — tool-assisted planning with logs",
  ],
  safetyBanner:
    "CodeGraph is foundation-active only. No MCP execution from the website, no code changes, no automatic scans, and no production access.",
};

const UNDERSTAND_ANYTHING_CONFIG: CodeContextToolFoundationConfig = {
  testId: "understand-anything-foundation",
  title: "Understand-Anything",
  subtitle: "Foundation active — local clone documented as reference-only context.",
  badges: [
    { label: "Foundation active", tone: "emerald" },
    { label: "Local clone", tone: "neutral" },
    { label: "Not runtime-connected", tone: "amber" },
    { label: "Execution blocked", tone: "rose" },
    { label: "Production off", tone: "neutral" },
  ],
  intro:
    "Understand-Anything is a cloned reference tool for future project-level codebase understanding. It is not runtime-connected to Hermes or the AiXia website today.",
  moduleStatus: [
    { label: "Foundation", value: "Active", tone: "emerald" },
    { label: "Source", value: "Local clone", tone: "neutral" },
    { label: "Runtime", value: "Not connected", tone: "rose" },
    { label: "Hermes access", value: "Reference only", tone: "amber" },
    { label: "Production", value: "Off", tone: "rose" },
  ],
  helpsWithTitle: "Future context capabilities",
  helpsWith: [
    "Broad codebase understanding",
    "Project-level knowledge graph",
    "File/context summarization",
    "Cross-module relationships",
    "Future agent research support",
  ],
  safeSourcesTitle: "Verified sources",
  safeSources: [
    "../tools/understand-anything/ — local clone present (sibling tools folder)",
    "https://github.com/Lum1104/Understand-Anything.git — upstream reference",
    "No node_modules / plugin runtime verified in clone",
    "No website runtime call from AiXia app",
    "No Hermes execution path today",
    "No production execution",
  ],
  hermesIntegration: [
    "Future reference/context source for Hermes",
    "No runtime link today",
    "No automatic analysis",
    "No writes to memory or source-of-truth",
  ],
  safetyGates: [
    "Owner approval before execution",
    "No automatic indexing",
    "No production runtime",
    "No code changes",
    "No SOT writes",
  ],
  futurePath: [
    "v1 — foundation active / local clone documented",
    "v2 — read-only indexing plan",
    "v3 — owner-approved scan",
    "v4 — Hermes summary injection",
    "v5 — scheduled context refresh only after approval",
  ],
  safetyBanner:
    "Understand-Anything is foundation-active only. No runtime execution, automatic indexing, or production analysis is active.",
};

const CLAUDE_CONTEXT_CONFIG: CodeContextToolFoundationConfig = {
  testId: "claude-context-foundation",
  title: "claude-context",
  subtitle: "Foundation active — local clone documented for future semantic retrieval.",
  badges: [
    { label: "Foundation active", tone: "emerald" },
    { label: "Local clone", tone: "neutral" },
    { label: "Semantic context planned", tone: "amber" },
    { label: "Execution blocked", tone: "rose" },
    { label: "Production off", tone: "neutral" },
  ],
  intro:
    "claude-context is a cloned semantic code search reference for future retrieval workflows. Vector DB, embeddings, and MCP runtime are planned only — not connected to Hermes today.",
  moduleStatus: [
    { label: "Foundation", value: "Active", tone: "emerald" },
    { label: "Source", value: "Local clone", tone: "neutral" },
    { label: "Runtime", value: "Not connected", tone: "rose" },
    { label: "Semantic retrieval", value: "Planned", tone: "amber" },
    { label: "Production", value: "Off", tone: "rose" },
  ],
  helpsWithTitle: "Future semantic capabilities",
  helpsWith: [
    "Semantic code search",
    "Embeddings/vector context",
    "Relevant file retrieval",
    "Future Hermes context enhancement",
    "Agent prompt support",
  ],
  safeSourcesTitle: "Verified sources",
  safeSources: [
    "../tools/claude-context/ — local clone present (sibling tools folder)",
    "https://github.com/zilliztech/claude-context.git — upstream reference",
    "Not listed in AiXia .cursor/mcp.json",
    "Vector DB / embeddings planned only — no active index verified",
    "No website runtime from AiXia app",
    "No production runtime",
  ],
  hermesIntegration: [
    "Future semantic context provider for Hermes",
    "No active Hermes execution today",
    "No automatic embedding job",
    "No memory or SOT writes",
  ],
  safetyGates: [
    "Owner approval required",
    "No automatic embedding/indexing",
    "No production execution",
    "No secrets in foundation page",
    "No SOT writes",
  ],
  futurePath: [
    "v1 — foundation active / local clone documented",
    "v2 — semantic indexing plan",
    "v3 — owner-approved test index",
    "v4 — Hermes read-only retrieval",
    "v5 — scheduled refresh only after approval",
  ],
  safetyBanner:
    "claude-context is foundation-active only. No semantic retrieval, embedding jobs, MCP execution, or production runtime is active.",
};

export function ToolsHubCodeGraphFoundationPage() {
  return <CodeContextToolFoundationPage config={CODEGRAPH_CONFIG} />;
}

export function ToolsHubUnderstandAnythingFoundationPage() {
  return <CodeContextToolFoundationPage config={UNDERSTAND_ANYTHING_CONFIG} />;
}

export function ToolsHubClaudeContextFoundationPage() {
  return <CodeContextToolFoundationPage config={CLAUDE_CONTEXT_CONFIG} />;
}
