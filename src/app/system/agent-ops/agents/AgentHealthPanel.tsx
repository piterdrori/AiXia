import {
  AlertTriangle,
  CheckCircle2,
  CircleDot,
  HelpCircle,
  PauseCircle,
  Rocket,
  ShieldAlert,
  XCircle,
} from "lucide-react";

import { AixiaBadge, AixiaCommandMetrics, AixiaInfoBlock, AixiaSection } from "@/components/aixia";
import type { EnsureCanonicalAgentsApiResponse } from "@/lib/agentops/initializeCanonicalAgents";

import type { AgentRegistryHealthResult } from "./agentHealthCheck";

export type InitializerState =
  | { status: "idle" }
  | { status: "running" }
  | { status: "success"; result: EnsureCanonicalAgentsApiResponse }
  | { status: "error"; error: string; httpStatus?: number; result?: EnsureCanonicalAgentsApiResponse };

type AgentHealthPanelProps = {
  result: AgentRegistryHealthResult;
  showInitializeButton?: boolean;
  initializerState?: InitializerState;
  onInitializeAgents?: () => void;
};

function systemStatusBadge(status: AgentRegistryHealthResult["systemStatus"]) {
  if (status === "healthy") {
    return (
      <AixiaBadge tone="neutral">
        <CheckCircle2 className="mr-1 inline h-3.5 w-3.5" />
        Registry complete
      </AixiaBadge>
    );
  }
  if (status === "degraded") {
    return (
      <AixiaBadge tone="amber">
        <AlertTriangle className="mr-1 inline h-3.5 w-3.5" />
        Registry incomplete
      </AixiaBadge>
    );
  }
  return (
    <AixiaBadge tone="rose">
      <XCircle className="mr-1 inline h-3.5 w-3.5" />
      Registry error
    </AixiaBadge>
  );
}

function InitializerResultPanel({ state }: { state: InitializerState }) {
  if (state.status === "idle" || state.status === "running") return null;

  if (state.status === "error") {
    const result = state.result;
    return (
      <AixiaInfoBlock title="Initialization failed" tone="rose">
        <p className="mb-2 text-sm">{state.error}</p>
        {state.httpStatus != null && state.httpStatus > 0 ? (
          <p className="mb-2 text-xs text-white/55">HTTP status: {state.httpStatus}</p>
        ) : null}
        {result ? (
          <ul className="space-y-1 text-xs text-white/65">
            <li>Expected: {result.expected}</li>
            <li>Loaded before: {result.loadedBefore}</li>
            <li>Inserted: {result.inserted}</li>
            <li>Activated: {result.activated}</li>
            <li>Total after (reconciled): {result.totalAfter}</li>
            <li>Raw DB rows: {result.rawDbRowCount}</li>
            <li>Verified recent logs: {result.verifiedLogs}</li>
            {result.error ? <li className="text-rose-200">API error: {result.error}</li> : null}
            {result.errors.length > 0 ? (
              <li className="pt-1 text-rose-200">Errors: {result.errors.join(" · ")}</li>
            ) : null}
          </ul>
        ) : null}
      </AixiaInfoBlock>
    );
  }

  const { result } = state;
  const tone =
    result.success && result.totalAfter === result.expected && result.errors.length === 0
      ? "emerald"
      : "gold";

  return (
    <AixiaInfoBlock title="Initialization completed" tone={tone}>
      <ul className="space-y-1 text-sm text-white/75">
        <li>Expected: {result.expected}</li>
        <li>Loaded before: {result.loadedBefore}</li>
        <li>Inserted: {result.inserted}</li>
        <li>Activated: {result.activated}</li>
        <li>Total after (reconciled): {result.totalAfter}</li>
        <li>Raw DB rows: {result.rawDbRowCount}</li>
        <li>Verified recent logs: {result.verifiedLogs}</li>
        <li>Errors: {result.errors.length > 0 ? result.errors.join(" · ") : "none"}</li>
      </ul>
    </AixiaInfoBlock>
  );
}

function initializeButtonLabel(initializerState: InitializerState, busy: boolean): string {
  if (busy) return "Initializing...";
  if (initializerState.status === "success") return "Initialized";
  if (initializerState.status === "error") return "Initialization failed";
  return "Initialize Missing Agents";
}

export function AgentHealthPanel({
  result,
  showInitializeButton = false,
  initializerState = { status: "idle" },
  onInitializeAgents,
}: AgentHealthPanelProps) {
  const { health, fetchError, logsWarning, registryWarning, systemStatus } = result;
  const initializeBusy = initializerState.status === "running";

  return (
    <AixiaSection
      title="Registry health"
      description="Canonical-first verification — runtime activity from agentops_agent_logs"
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm text-white/60">System status</span>
          {systemStatusBadge(systemStatus)}
          <span className="text-xs text-white/45">
            Loaded {health.loaded} / {health.expectedTotal} · Missing {health.missing} · Active {health.active}
          </span>
        </div>

        {showInitializeButton && onInitializeAgents ? (
          <div className="rounded-lg border border-cyan-400/20 bg-cyan-500/5 p-4">
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                className="inline-flex items-center rounded-md bg-cyan-500 px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={onInitializeAgents}
                disabled={initializeBusy}
              >
                <Rocket className="mr-1.5 h-4 w-4" />
                {initializeButtonLabel(initializerState, initializeBusy)}
              </button>
              <span className="text-xs text-white/55">
                Inserts missing canonical rows into agentops_agents and writes activation logs (idempotent, staging)
              </span>
            </div>
          </div>
        ) : null}

        <InitializerResultPanel state={initializerState} />

        {fetchError ? (
          <AixiaInfoBlock title="Supabase fetch failed" tone="rose">
            {fetchError}
          </AixiaInfoBlock>
        ) : null}

        {logsWarning ? (
          <AixiaInfoBlock title="Runtime logs" tone="gold">
            {logsWarning}
          </AixiaInfoBlock>
        ) : null}

        {registryWarning ? (
          <AixiaInfoBlock title="Registry reconciliation" tone="gold">
            {registryWarning}
          </AixiaInfoBlock>
        ) : null}

        <AixiaCommandMetrics
          items={[
            { key: "total", label: "Canonical agents", value: `${health.total}`, tone: "cyan" },
            {
              key: "loaded",
              label: "Loaded from DB",
              value: `${health.loaded} / ${health.expectedTotal}`,
              tone: "cyan",
            },
            { key: "missing", label: "Missing from DB", value: `${health.missing}`, icon: HelpCircle, tone: "neutral" },
            { key: "active", label: "Active (logs)", value: `${health.active}`, icon: CircleDot, tone: "emerald" },
            { key: "idle", label: "Idle", value: `${health.idle}`, icon: PauseCircle, tone: "neutral" },
            { key: "blocked", label: "Blocked", value: `${health.blocked}`, icon: ShieldAlert, tone: "rose" },
            { key: "errors", label: "Errors", value: `${health.errors}`, icon: XCircle, tone: "rose" },
            {
              key: "missing-fields",
              label: "Missing fields",
              value: `${health.missingFields}`,
              icon: AlertTriangle,
              tone: "gold",
            },
          ]}
        />
      </div>
    </AixiaSection>
  );
}
