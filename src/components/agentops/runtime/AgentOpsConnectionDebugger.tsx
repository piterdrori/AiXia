import { useMemo, useState } from "react";
import { ExternalLink, FileCode2, RefreshCw, ServerCrash } from "lucide-react";

import {
  AixiaBadge,
  AixiaButton,
  AixiaInfoBlock,
  AixiaPageState,
} from "@/components/aixia";
import {
  AGENTOPS_RUNTIME_MIGRATION_FILE,
  getAgentOpsConnectionDebugInfo,
  getSupabaseSqlEditorUrl,
  type AgentOpsSupabaseProjectHealth,
} from "@/lib/agentops/runtime/agentOpsSupabaseConnection";

type AgentOpsConnectionDebuggerProps = {
  projectHealth?: AgentOpsSupabaseProjectHealth | null;
};

export function AgentOpsConnectionDebugger({
  projectHealth,
}: AgentOpsConnectionDebuggerProps) {
  if (!import.meta.env.DEV) return null;

  const debug = useMemo(() => getAgentOpsConnectionDebugInfo(), []);

  return (
    <div className="rounded-lg border border-amber-400/25 bg-amber-500/5 p-4">
      <div className="mb-2 aixia-caption font-medium uppercase tracking-wide text-amber-200/80">
        Dev — AgentOps connection debugger
      </div>

      <div className="grid gap-2 text-sm text-white/80 md:grid-cols-2">
        <div>
          <span className="text-white/50">SUPABASE_URL:</span> {debug.supabaseUrlMasked}
        </div>
        <div>
          <span className="text-white/50">Project ref:</span> {debug.projectRef ?? "—"}
        </div>
        <div>
          <span className="text-white/50">Schema:</span> {debug.schema}
        </div>
        <div>
          <span className="text-white/50">Anon key:</span>{" "}
          {debug.anonKeyPresent ? "present" : "missing"}
        </div>
        <div>
          <span className="text-white/50">Service role (browser):</span>{" "}
          {debug.serviceRoleKeyPresent ? "present (unexpected)" : "not exposed (expected)"}
        </div>
        <div>
          <span className="text-white/50">Migration target:</span>{" "}
          {debug.migrationTargetRef ?? "not configured"}
        </div>
        <div className="md:col-span-2">
          <span className="text-white/50">Client:</span> {debug.clientSource}
        </div>
      </div>

      {projectHealth ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {Object.entries(projectHealth.table_status).map(([table, status]) => (
            <AixiaBadge
              key={table}
              tone={status === "ok" ? "emerald" : status === "missing" ? "rose" : "amber"}
            >
              {table}: {status}
            </AixiaBadge>
          ))}
        </div>
      ) : null}
    </div>
  );
}

type AgentOpsRuntimeSystemBlockStateProps = {
  projectHealth: AgentOpsSupabaseProjectHealth;
  onRecheck: () => void;
  rechecking?: boolean;
};

export function AgentOpsRuntimeSystemBlockState({
  projectHealth,
  onRecheck,
  rechecking = false,
}: AgentOpsRuntimeSystemBlockStateProps) {
  const [showMigration, setShowMigration] = useState(false);
  const missingTables = Object.entries(projectHealth.table_status)
    .filter(([, status]) => status !== "ok")
    .map(([table, status]) => `${table} (${status})`);

  const sqlEditorUrl = getSupabaseSqlEditorUrl(projectHealth.project_ref);

  return (
    <div className="space-y-4">
      <AixiaPageState
        icon={ServerCrash}
        title="Connected Supabase project does not contain AgentOps schema"
        description="The runtime mirror cannot load until agentops_* tables exist in the connected project. Apply migrations to THIS project, then re-check connection."
        action={
          <div className="flex flex-wrap gap-2">
            <AixiaButton variant="secondary" onClick={onRecheck} disabled={rechecking}>
              <RefreshCw className={`mr-1.5 h-4 w-4 ${rechecking ? "animate-spin" : ""}`} />
              Re-check connection
            </AixiaButton>
            <AixiaButton
              variant="secondary"
              onClick={() => window.open(sqlEditorUrl, "_blank", "noopener,noreferrer")}
            >
              <ExternalLink className="mr-1.5 h-4 w-4" />
              Open Supabase SQL Editor
            </AixiaButton>
            <AixiaButton variant="secondary" onClick={() => setShowMigration((value) => !value)}>
              <FileCode2 className="mr-1.5 h-4 w-4" />
              Show migration file needed
            </AixiaButton>
          </div>
        }
      />

      <AixiaInfoBlock title="Detected project ref" tone="cyan">
        {projectHealth.project_ref}
      </AixiaInfoBlock>

      {projectHealth.migration_target_ref ? (
        <AixiaInfoBlock
          title="Migration target project ref"
          tone={projectHealth.project_ref_mismatch ? "rose" : "emerald"}
        >
          {projectHealth.migration_target_ref}
          {projectHealth.project_ref_mismatch ? (
            <p className="mt-2 text-rose-100/90">
              You are connected to a different Supabase project than migrations were applied to.
              Update VITE_SUPABASE_URL in .env.local to point at{" "}
              {projectHealth.migration_target_ref}, or run migrations on {projectHealth.project_ref}.
            </p>
          ) : null}
        </AixiaInfoBlock>
      ) : null}

      <AixiaInfoBlock title="Schema" tone="cyan">
        {projectHealth.schema} (PostgREST default)
      </AixiaInfoBlock>

      {missingTables.length > 0 ? (
        <AixiaInfoBlock title="Missing or broken tables" tone="rose">
          <ul className="mt-1 list-inside list-disc space-y-1">
            {missingTables.map((entry) => (
              <li key={entry}>{entry}</li>
            ))}
          </ul>
        </AixiaInfoBlock>
      ) : null}

      {projectHealth.error ? (
        <AixiaInfoBlock title="Probe error" tone="rose">
          {projectHealth.error}
        </AixiaInfoBlock>
      ) : null}

      {showMigration ? (
        <AixiaInfoBlock title="Migration file" tone="gold">
          <p className="mb-2 font-mono text-sm">{AGENTOPS_RUNTIME_MIGRATION_FILE}</p>
          <p className="text-white/75">
            In Supabase Dashboard → SQL Editor for project{" "}
            <strong>{projectHealth.project_ref}</strong>, paste and run the migration SQL from that
            file in this repo. Or use Supabase CLI:{" "}
            <code className="text-xs">supabase db push</code> against the linked project.
          </p>
        </AixiaInfoBlock>
      ) : null}

      <AgentOpsConnectionDebugger projectHealth={projectHealth} />
    </div>
  );
}
