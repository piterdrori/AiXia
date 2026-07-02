import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Bot } from "lucide-react";

import {
  AixiaCommandPageLayout,
  AixiaInfoBlock,
  AixiaPageState,
  AixiaProgressiveDisclosureGroup,
} from "@/components/aixia";
import { usePageTitle } from "@/hooks/usePageTitle";
import {
  computeAgentRuntimeState,
  resolveAgentLastActivity,
  type AgentRuntimeState,
} from "@/lib/agentops/agentRuntimeState";
import { countHighSeverityOpenIssues, countOpenIssuesForAgent } from "@/lib/agentops/agents/productAgentIssues";
import { getAgentOpsProductIssues } from "@/lib/agentops/issues/productIssuesService";
import type { AgentOpsRuntimeAgentLogRow, AgentOpsRuntimeAgentRow } from "@/lib/agentops/db/agentOpsRuntimeTypes";
import { resolveCanonicalIdFromRouteParam } from "@/lib/agentops/agents/agentRouteResolver";
import { resolveCanonicalIdFromTools } from "@/lib/agentops/agentSeedMemoryLoader";

import { AgentChatPanel } from "../AgentChatPanel";
import { AgentConfigPanel } from "../AgentConfigPanel";
import { AgentHeader } from "../AgentHeader";
import { AgentMemoryPanel } from "../AgentMemoryPanel";
import { AgentProductIssuesSection } from "../AgentProductIssuesSection";
import { AgentProductMemoryUpdate } from "../AgentProductMemoryUpdate";
import { AgentProductPermissionsCard } from "../AgentProductPermissionsCard";
import { AgentProductToolsCard } from "../AgentProductToolsCard";
import { AgentProductWorkModeCard } from "../AgentProductWorkModeCard";
import { resetAgentMemory } from "../agentMemoryService";
import { useAgentBrain } from "../useAgentBrain";
import {
  fetchAgentByRouteParam,
  fetchAgentRuntimeLogs,
  setAgentBlocked,
} from "../agentIntelligenceClient";

export default function AgentOpsAgentDetailPage() {
  const { agentId = "" } = useParams();
  const navigate = useNavigate();
  const chatAnchorRef = useRef<HTMLDivElement | null>(null);
  const [memoryProposalDraft, setMemoryProposalDraft] = useState("");

  useEffect(() => {
    if (agentId === "council") {
      navigate("/system/agent-ops/council", { replace: true });
    }
  }, [agentId, navigate]);

  const [agent, setAgent] = useState<AgentOpsRuntimeAgentRow | null>(null);
  const [logs, setLogs] = useState<AgentOpsRuntimeAgentLogRow[]>([]);
  const [runtimeState, setRuntimeState] = useState<AgentRuntimeState>("MISSING");
  const [lastLogActivity, setLastLogActivity] = useState("never");
  const [agentError, setAgentError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [openIssues, setOpenIssues] = useState<Awaited<ReturnType<typeof getAgentOpsProductIssues>>["data"]>(null);

  const [resolvedDbAgentId, setResolvedDbAgentId] = useState<string>("");

  const routeCanonicalId = useMemo(
    () => resolveCanonicalIdFromRouteParam(agentId),
    [agentId],
  );

  const canonicalId = useMemo(
    () => routeCanonicalId ?? resolveCanonicalIdFromTools(agent?.tools) ?? null,
    [agent?.tools, routeCanonicalId],
  );

  const effectiveAgentId = resolvedDbAgentId || agent?.id || "";

  const brainContext = useMemo(
    () => ({
      agentName: agent?.name,
      role: agent?.role,
      canonicalId: canonicalId ?? undefined,
    }),
    [agent?.name, agent?.role, canonicalId],
  );

  const { brain, loading: brainLoading, error: brainError, rehydrate, memoryRows } = useAgentBrain(
    effectiveAgentId || agentId,
    brainContext,
  );

  const agentRowForIssues = useMemo(
    () =>
      agent
        ? {
            canonicalId: canonicalId ?? agent.name.toLowerCase().replace(/\s+/g, "-"),
            id: agent.id,
            name: agent.name,
            role: agent.role,
            tools: agent.tools ?? [],
          }
        : null,
    [agent, canonicalId],
  );

  const issueCounts = useMemo(() => {
    if (!agentRowForIssues || !openIssues?.active) {
      return { open: 0, high: 0 };
    }
    const reconciled = {
      ...agentRowForIssues,
      runtimeState: runtimeState,
      displayStatus: "",
      mode: agent?.mode ?? null,
      displayMode: "",
      last_activity: lastLogActivity,
      scope: agent?.scope ?? [],
      isMissing: false,
      blocked: agent?.status === "blocked",
      dbAgentId: agent?.id ?? null,
      missingFields: [],
      hasError: false,
      dbRow: agent,
    };
    return {
      open: countOpenIssuesForAgent(openIssues.active, reconciled),
      high: countHighSeverityOpenIssues(openIssues.active, reconciled),
    };
  }, [agent, agentRowForIssues, lastLogActivity, openIssues?.active, runtimeState]);

  const refreshRuntimeState = useCallback(
    (loadedAgent: AgentOpsRuntimeAgentRow | null, loadedLogs: AgentOpsRuntimeAgentLogRow[]) => {
      const runtimeInput = {
        isMissing: !loadedAgent,
        blocked: loadedAgent?.status === "blocked",
        dbAgentId: loadedAgent?.id ?? null,
      };
      setRuntimeState(computeAgentRuntimeState(runtimeInput, loadedLogs));
      setLastLogActivity(resolveAgentLastActivity(runtimeInput, loadedLogs));
    },
    [],
  );

  const loadLogs = useCallback(async () => {
    const dbId = resolvedDbAgentId || agent?.id;
    if (!dbId) return;
    const result = await fetchAgentRuntimeLogs(dbId);
    setLogs(result.data);
    return result.data;
  }, [agent?.id, resolvedDbAgentId]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!agentId) {
        setLoading(false);
        setAgentError("Missing agent id.");
        return;
      }

      setLoading(true);
      const [agentResult, issuesResult] = await Promise.all([
        fetchAgentByRouteParam(agentId),
        getAgentOpsProductIssues(),
      ]);

      if (cancelled) return;

      const loadedAgent = agentResult.data;
      const dbId = agentResult.dbAgentId ?? loadedAgent?.id ?? "";
      setResolvedDbAgentId(dbId);

      const logsResult = dbId ? await fetchAgentRuntimeLogs(dbId) : { data: [], error: null };

      if (cancelled) return;

      setAgent(loadedAgent);
      setAgentError(agentResult.error ?? (loadedAgent ? null : "Agent not found."));
      setLogs(logsResult.data);
      setOpenIssues(issuesResult.data);
      refreshRuntimeState(loadedAgent, logsResult.data);
      setLoading(false);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [agentId, refreshRuntimeState]);

  usePageTitle(agent?.name ? `Agent ${agent.name}` : "Agent detail");

  const handleAgentSaved = (updated: AgentOpsRuntimeAgentRow) => {
    setAgent(updated);
    refreshRuntimeState(updated, logs);
  };

  const handleActivityLogged = () => {
    void loadLogs().then((loadedLogs) => {
      if (agent) refreshRuntimeState(agent, loadedLogs ?? logs);
    });
  };

  const handleBrainRehydrate = useCallback(async () => {
    await rehydrate();
  }, [rehydrate]);

  const handleSendMessage = () => {
    setActionError(null);
    chatAnchorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleToggleBlock = async () => {
    if (!agent) return;
    setActionBusy(true);
    setActionError(null);
    const blocked = agent.status !== "blocked";
    const result = await setAgentBlocked(agent.id, blocked);
    setActionBusy(false);
    if (result.error || !result.data) {
      setActionError(result.error ?? "Failed to update block state.");
      return;
    }
    setAgent(result.data);
    refreshRuntimeState(result.data, logs);
  };

  const handleResetMemory = async () => {
    if (!agent) return;
    setActionBusy(true);
    setActionError(null);
    const result = await resetAgentMemory(agent.id);
    setActionBusy(false);
    if (result.error) {
      setActionError(result.error);
      return;
    }
    await rehydrate();
  };

  return (
    <AixiaCommandPageLayout
      hero={
        agent && !loading ? (
          <AgentHeader
            agent={agent}
            canonicalId={canonicalId}
            runtimeState={runtimeState}
            lastActivity={lastLogActivity}
            openIssueCount={issueCounts.open}
            highSeverityOpenCount={issueCounts.high}
            onBack={() => navigate("/system/agent-ops/agents")}
            onSendMessage={handleSendMessage}
            onToggleBlock={() => void handleToggleBlock()}
            onResetMemory={() => void handleResetMemory()}
            actionBusy={actionBusy}
            actionError={actionError}
          />
        ) : (
          <div />
        )
      }
    >
      {loading ? (
        <AixiaPageState
          stateType="loading"
          loading
          title="Loading agent"
          description="Fetching agent configuration, issues, and memory…"
        />
      ) : agentError && !agent ? (
        <AixiaInfoBlock title="Agent unavailable" tone="rose">
          {agentError}
        </AixiaInfoBlock>
      ) : !agent ? (
        <AixiaPageState
          icon={Bot}
          stateType="not-found"
          title="Agent not found"
          description={`No row with id ${agentId} in agentops_agents.`}
        />
      ) : (
        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <AgentProductPermissionsCard canonicalId={canonicalId} agent={agent} />
            <AgentProductWorkModeCard
              agent={agent}
              runtimeState={runtimeState}
              openIssueCount={issueCounts.open}
              highSeverityOpenCount={issueCounts.high}
              onCycleComplete={handleActivityLogged}
            />
          </div>

          <AgentProductToolsCard
            agent={agent}
            canonicalId={canonicalId}
            lastActivity={lastLogActivity}
          />

          <AgentMemoryPanel
            agentId={effectiveAgentId}
            brain={brain}
            loading={brainLoading}
            error={brainError}
            onRehydrate={handleBrainRehydrate}
            readOnly
          />

          <AgentProductMemoryUpdate
            agentId={effectiveAgentId}
            onSaved={() => void rehydrate()}
            proposalDraft={memoryProposalDraft}
            sectionId="agent-memory-proposal"
            onDiscard={() => setMemoryProposalDraft("")}
          />

          {agentRowForIssues ? (
            <AgentProductIssuesSection agentRow={agentRowForIssues} />
          ) : null}

          <div ref={chatAnchorRef}>
            <AgentChatPanel
              agent={agent}
              brain={brain}
              memoryRows={memoryRows}
              onBrainRehydrate={handleBrainRehydrate}
              onMemoryStored={() => void rehydrate()}
              onActivityLogged={handleActivityLogged}
              onProposeMemoryDraft={setMemoryProposalDraft}
            />
          </div>

          <AixiaProgressiveDisclosureGroup
            title="Developer configuration"
            description="Runtime role, mode, and scope editing"
            defaultOpen={false}
            tone="neutral"
            density="compact"
          >
            <AgentConfigPanel agent={agent} onSaved={handleAgentSaved} />
          </AixiaProgressiveDisclosureGroup>
        </div>
      )}
    </AixiaCommandPageLayout>
  );
}
