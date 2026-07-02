import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  Database,
  Loader2,
  ServerCrash,
  WifiOff,
} from "lucide-react";

import { AixiaBadge, AixiaButton, AixiaInfoBlock, AixiaPageState } from "@/components/aixia";
import type {
  AgentOpsSystemHealth,
  AgentOpsSystemHealthErrorType,
} from "@/lib/agentops/runtime/agentOpsSystemHealth";

function errorTypeLabel(errorType: AgentOpsSystemHealthErrorType | undefined): string {
  if (errorType === "missing_table") return "Missing table";
  if (errorType === "schema_cache") return "Schema cache error";
  if (errorType === "network") return "Network failure";
  if (errorType === "auth") return "Authentication / RLS";
  return "Supabase error";
}

function errorTypeIcon(errorType: AgentOpsSystemHealthErrorType | undefined): LucideIcon {
  if (errorType === "network") return WifiOff;
  if (errorType === "missing_table" || errorType === "schema_cache") return ServerCrash;
  return AlertTriangle;
}

type AgentOpsRuntimeSystemErrorPanelProps = {
  error?: string | null;
  errorType?: AgentOpsSystemHealthErrorType;
  health?: AgentOpsSystemHealth | null;
  onRetry?: () => void;
};

export function AgentOpsRuntimeSystemErrorPanel({
  error,
  errorType,
  health,
  onRetry,
}: AgentOpsRuntimeSystemErrorPanelProps) {
  const resolvedError = error ?? health?.error ?? "Supabase runtime mirror is unavailable.";
  const resolvedType = errorType ?? health?.errorType;
  const missingTables = health?.missingTables ?? [];
  const Icon = errorTypeIcon(resolvedType);

  return (
    <div className="space-y-4">
      <AixiaPageState
        icon={Icon}
        title="System error — runtime mirror unavailable"
        description={`${resolvedError} Fix the Supabase project connection or run migrations before using AgentOps.`}
        action={
          onRetry ? (
            <AixiaButton variant="secondary" onClick={onRetry}>
              Retry connection
            </AixiaButton>
          ) : null
        }
      />

      <AixiaInfoBlock title="Error type" tone="rose">
        {errorTypeLabel(resolvedType)}
      </AixiaInfoBlock>

      <AixiaInfoBlock title="Connection status" tone="rose">
        {health?.connected ? "Partial — some tables failed" : "Not connected"}
      </AixiaInfoBlock>

      {health?.projectRef ? (
        <AixiaInfoBlock title="Project reference" tone="cyan">
          {health.projectRef}
        </AixiaInfoBlock>
      ) : null}

      {missingTables.length > 0 ? (
        <AixiaInfoBlock title="Missing tables" tone="rose">
          <ul className="mt-1 list-inside list-disc space-y-1">
            {missingTables.map((table) => (
              <li key={table}>{table}</li>
            ))}
          </ul>
        </AixiaInfoBlock>
      ) : null}

      {health?.tables?.length ? (
        <div className="flex flex-wrap gap-2">
          {health.tables.map((probe) => (
            <AixiaBadge key={probe.table} tone={probe.ok ? "emerald" : "rose"}>
              {probe.table}: {probe.ok ? "ok" : "error"}
            </AixiaBadge>
          ))}
        </div>
      ) : null}
    </div>
  );
}

type AgentOpsRuntimeLoadingStateProps = {
  title?: string;
  description?: string;
};

export function AgentOpsRuntimeLoadingState({
  title = "Loading Supabase runtime data",
  description = "Probing agentops_* tables…",
}: AgentOpsRuntimeLoadingStateProps) {
  return (
    <AixiaPageState
      icon={Loader2}
      title={title}
      description={description}
      loading
      stateType="loading"
    />
  );
}

type AgentOpsRuntimeNoDataStateProps = {
  tableName: string;
  title?: string;
  description?: string;
  suggestedFix?: string;
  icon?: LucideIcon;
};

export function AgentOpsRuntimeNoDataState({
  tableName,
  title,
  description,
  suggestedFix,
  icon = Database,
}: AgentOpsRuntimeNoDataStateProps) {
  const baseDescription =
    description ?? `Connected to Supabase, but ${tableName} has zero rows.`;
  const fullDescription = suggestedFix
    ? `${baseDescription} Static reference: ${suggestedFix}`
    : baseDescription;

  return (
    <AixiaPageState
      icon={icon}
      title={title ?? `No data in ${tableName}`}
      description={fullDescription}
      stateType="not-found"
    />
  );
}

type AgentOpsRuntimeMirrorGateProps<T> = {
  loading: boolean;
  error: string | null;
  data: T | null;
  tableName: string;
  isEmpty: (data: T) => boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyFix?: string;
  emptyIcon?: LucideIcon;
  onRetry?: () => void;
  children: (data: T) => ReactNode;
};

export function AgentOpsRuntimeMirrorGate<T>({
  loading,
  error,
  data,
  tableName,
  isEmpty,
  emptyTitle,
  emptyDescription,
  emptyFix,
  emptyIcon,
  onRetry,
  children,
}: AgentOpsRuntimeMirrorGateProps<T>) {
  if (loading) {
    return <AgentOpsRuntimeLoadingState />;
  }

  if (error) {
    return (
      <AgentOpsRuntimeSystemErrorPanel
        error={error}
        onRetry={onRetry}
      />
    );
  }

  if (data == null || isEmpty(data)) {
    return (
      <AgentOpsRuntimeNoDataState
        tableName={tableName}
        title={emptyTitle}
        description={emptyDescription}
        suggestedFix={emptyFix}
        icon={emptyIcon}
      />
    );
  }

  return <>{children(data)}</>;
}
