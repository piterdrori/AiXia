import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bot } from "lucide-react";

import {
  AixiaBadge,
  AixiaButton,
  AixiaCommandPageLayout,
  AixiaHero,
  AixiaPageState,
  AixiaSection,
  AixiaWorkspaceCard,
} from "@/components/aixia";
import { usePageTitle } from "@/hooks/usePageTitle";
import type { AgentRuntimeState } from "@/lib/agentops/agentRuntimeState";
import {
  ensureCanonicalAgentsInitialized,
  isInitializerSuccess,
} from "@/lib/agentops/initializeCanonicalAgents";

import { AgentHealthPanel, type InitializerState } from "../AgentHealthPanel";
import {
  runAgentRegistryHealthCheck,
  type AgentRegistryHealthResult,
} from "../agentHealthCheck";

function runtimeTone(state: AgentRuntimeState): "emerald" | "neutral" | "rose" {
  if (state === "ACTIVE") return "emerald";
  if (state === "BLOCKED") return "rose";
  return "neutral";
}

function cardClassName(state: AgentRuntimeState): string {
  if (state === "MISSING") {
    return "border border-dashed border-white/20 opacity-75";
  }
  return "";
}

/** Developer/runtime registry mirror — not the primary product Agents hub. */
export default function AgentOpsAgentsRuntimePage() {
  usePageTitle("Operator registry (staging only)");

  const navigate = useNavigate();
  const [result, setResult] = useState<AgentRegistryHealthResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [initializerState, setInitializerState] = useState<InitializerState>({ status: "idle" });

  const loadRegistry = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) setLoading(true);
    const healthResult = await runAgentRegistryHealthCheck();
    setResult(healthResult);
    if (!options?.silent) setLoading(false);
    return healthResult;
  }, []);

  useEffect(() => {
    void loadRegistry();
  }, [loadRegistry]);

  const health = result?.health;
  const showInitializeButton = Boolean(
    health && (health.loaded < health.expectedTotal || health.active < health.expectedTotal),
  );

  const handleInitializeAgents = async () => {
    setInitializerState({ status: "running" });

    const { result: initResult, httpStatus } = await ensureCanonicalAgentsInitialized();

    if (isInitializerSuccess(initResult) && initResult.success) {
      const healthResult = await loadRegistry({ silent: true });

      if (
        healthResult.health.loaded < healthResult.health.expectedTotal ||
        healthResult.health.missing > 0 ||
        healthResult.health.active < healthResult.health.expectedTotal
      ) {
        setInitializerState({
          status: "error",
          httpStatus,
          error: "Initializer returned success but verification failed.",
          result: initResult,
        });
        return;
      }

      setInitializerState({ status: "success", result: initResult });
      return;
    }

    const errorSummary =
      initResult.error ??
      initResult.errors[0] ??
      `Initialization incomplete — loaded ${initResult.totalAfter}/${initResult.expected}, verified logs ${initResult.verifiedLogs}.`;

    setInitializerState({
      status: "error",
      httpStatus,
      error: errorSummary,
      result: initResult,
    });
  };

  const agents = result?.agents ?? [];

  return (
    <AixiaCommandPageLayout
      hero={
        <AixiaHero
          surface="command"
          parentLabel="Developer diagnostics"
          parentPath="/system/agent-ops/runtime"
          gradientTitle="Operator registry"
          title="Operator registry (staging only)"
          subtitle="Registry status · missing agent initialization · inspection only"
          description="Canonical verification and Initialize Missing Agents. Registry rows and stored status fields only — not the product Agents hub."
          actions={
            <AixiaButton variant="secondary" onClick={() => navigate("/system/agent-ops/runtime")}>
              Diagnostics hub
            </AixiaButton>
          }
          badges={[
            { label: "Operator tool", tone: "neutral" },
            { label: "Staging only", tone: "cyan" },
          ]}
        />
      }
    >
      {loading ? (
        <AixiaPageState
          stateType="loading"
          loading
          title="Loading runtime registry"
          description="Reconciling registry and loading runtime logs…"
        />
      ) : result ? (
        <>
          <AgentHealthPanel
            result={result}
            showInitializeButton={showInitializeButton}
            initializerState={initializerState}
            onInitializeAgents={() => void handleInitializeAgents()}
          />

          <AixiaSection
            title="Registry roster"
            description="Stored runtime state labels: ACTIVE · IDLE · BLOCKED · MISSING"
          >
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {agents.map((agent) => (
                <AixiaWorkspaceCard
                  key={agent.canonicalId}
                  as="div"
                  className={cardClassName(agent.runtimeState)}
                  icon={Bot}
                  label={agent.name}
                  eyebrow={agent.role}
                  description={agent.displayMode}
                  tone={agent.runtimeState === "MISSING" ? "neutral" : "indigo"}
                  statusLabel={
                    <AixiaBadge tone={runtimeTone(agent.runtimeState)}>{agent.displayStatus}</AixiaBadge>
                  }
                  summary={
                    <span className="text-xs text-white/50">
                      Last log activity: {agent.last_activity}
                      {agent.runtimeState === "MISSING" ? " · Not in Supabase" : ""}
                      {agent.runtimeState === "IDLE" ? " · No logs in last 10 min" : ""}
                      {!agent.isMissing && agent.missingFields.length > 0
                        ? ` · Config gaps: ${agent.missingFields.join(", ")}`
                        : ""}
                    </span>
                  }
                  actionLabel={agent.runtimeState === "MISSING" ? "Unavailable" : "Open"}
                  actionDisabled={agent.runtimeState === "MISSING"}
                  onActionClick={
                    agent.runtimeState === "MISSING"
                      ? undefined
                      : () => navigate(`/system/agent-ops/agents/${agent.canonicalId}`)
                  }
                />
              ))}
            </div>
          </AixiaSection>
        </>
      ) : null}
    </AixiaCommandPageLayout>
  );
}
