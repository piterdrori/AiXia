import { useCallback, useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Bot, Database, ListChecks, Settings2 } from "lucide-react";

import {
  AixiaButton,
  AixiaHero,
  AixiaInfoBlock,
  AixiaNavigationCard,
  AixiaNavigationGrid,
  AixiaProgressiveDisclosureGroup,
  AixiaSection,
} from "@/components/aixia";
import { AgentOpsRuntimeMirrorShell } from "@/components/agentops/runtime/AgentOpsRuntimeMirrorShell";
import { usePageTitle } from "@/hooks/usePageTitle";
import { fetchRuntimeSystemConfig } from "@/lib/agentops/runtime/agentOpsRuntimeMirrorClient";
import { formatJsonPreview } from "@/lib/agentops/runtime/runtimeMirrorUtils";
import { useAgentOpsRuntimeMirror } from "@/lib/agentops/runtime/useAgentOpsRuntimeMirror";

const OBSERVATORY_LINKS = [
  {
    title: "Memory observatory",
    description: "agentops_memory rows and evolution mirror cycles (read-only).",
    route: "/system/agent-ops/runtime/memory",
    icon: Database,
    tone: "cyan" as const,
  },
  {
    title: "Issues observatory",
    description: "agentops_issues table and diagnostic trace evidence (read-only).",
    route: "/system/agent-ops/issues/runtime",
    icon: ListChecks,
    tone: "amber" as const,
  },
  {
    title: "Operator registry",
    description: "Registry health and Initialize Missing Agents (staging only).",
    route: "/system/agent-ops/agents/runtime",
    icon: Bot,
    tone: "indigo" as const,
  },
];

export default function AgentOpsRuntimeDiagnosticsHubPage() {
  usePageTitle("AgentOps Runtime Diagnostics");
  const navigate = useNavigate();
  const location = useLocation();

  const configFetcher = useCallback(() => fetchRuntimeSystemConfig(), []);
  const { data: config, error: configError, loading: configLoading } =
    useAgentOpsRuntimeMirror(configFetcher);

  useEffect(() => {
    if (location.hash === "#system-config") {
      const el = document.getElementById("system-config");
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [location.hash]);

  const configPreview = useMemo(() => {
    if (!config) return null;
    return {
      runtimeMode: config.runtime_mode ?? "—",
      environment: config.environment ?? "—",
      stagingUrl: config.staging_url ?? "—",
      toolsPreview: formatJsonPreview(config.tools_enabled, 240),
    };
  }, [config]);

  return (
    <AgentOpsRuntimeMirrorShell active="dashboard" showNav={false} hero={
        <AixiaHero
          surface="command"
          gradientTitle="Developer diagnostics"
          title="Developer diagnostics"
          subtitle="Minimal observability core · staging inspection only"
          description="Read-only Supabase mirrors and operator registry tools. Not primary product modules."
          actions={
            <AixiaButton variant="secondary" onClick={() => navigate("/system/agent-ops")}>
              Back to product AgentOps
            </AixiaButton>
          }
          badges={[
            { label: "Runtime / debug", tone: "neutral" },
            { label: "Staging only", tone: "cyan" },
          ]}
        />
      }>
      <AixiaSection
        title="Observatory routes"
        description="Three diagnostic surfaces — no production actions from this hub"
      >
        <AixiaNavigationGrid>
          {OBSERVATORY_LINKS.map((link) => (
            <AixiaNavigationCard
              key={link.route}
              title={link.title}
              description={link.description}
              icon={link.icon}
              tone={link.tone}
              onClick={() => navigate(link.route)}
            />
          ))}
        </AixiaNavigationGrid>
      </AixiaSection>

      <div id="system-config">
        <AixiaProgressiveDisclosureGroup
          title="System config snapshot"
          description="Read-only agentops_system_config singleton · developer diagnostics"
          defaultOpen={location.hash === "#system-config"}
          icon={<Settings2 className="h-4 w-4" aria-hidden />}
          tone="neutral"
          density="compact"
        >
          <div className="space-y-3 text-sm text-white/70">
            {configLoading ? (
              <p className="text-white/55">Loading system config snapshot…</p>
            ) : configError ? (
              <p className="text-rose-300/90">{configError}</p>
            ) : configPreview ? (
              <>
                <div className="grid gap-3 md:grid-cols-2">
                  <AixiaInfoBlock title="Runtime mode">{configPreview.runtimeMode}</AixiaInfoBlock>
                  <AixiaInfoBlock title="Environment">{configPreview.environment}</AixiaInfoBlock>
                  <AixiaInfoBlock title="Staging URL">{configPreview.stagingUrl}</AixiaInfoBlock>
                  <AixiaInfoBlock title="GitHub repo">{config?.github_repo ?? "—"}</AixiaInfoBlock>
                </div>
                <AixiaInfoBlock title="Tools enabled (preview)">
                  <pre className="aixia-code-block mt-1 whitespace-pre-wrap text-xs text-white/75">
                    {configPreview.toolsPreview}
                  </pre>
                </AixiaInfoBlock>
              </>
            ) : (
              <p className="text-white/55">No agentops_system_config row loaded.</p>
            )}
          </div>
        </AixiaProgressiveDisclosureGroup>
      </div>

      <p className="text-xs text-white/45">
        Legacy paths <code>/evolution</code>, <code>/fix</code>, and <code>/config</code> redirect
        into the unified observatories above.
      </p>
    </AgentOpsRuntimeMirrorShell>
  );
}
