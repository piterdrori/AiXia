import { AixiaBadge } from "@/components/aixia";
import { AgentDetailPanelShell } from "@/components/agentops/owner/agent-detail/AgentDetailPanelShell";
import { AGENT_DETAIL_CC_COPY } from "@/lib/agentops/agents/agentDetailControlCenter";

type PermissionRow = {
  id: string;
  label: string;
  allowed: boolean;
  mode: "read-only" | "editable";
};

const DEFAULT_PERMISSIONS: PermissionRow[] = [
  { id: "browse", label: "Browse staging website", allowed: true, mode: "read-only" },
  { id: "browser_qa", label: "Run Browser QA", allowed: true, mode: "read-only" },
  { id: "screenshots", label: "Capture screenshots", allowed: true, mode: "read-only" },
  { id: "console", label: "Read console/network results", allowed: true, mode: "read-only" },
  { id: "memory_read", label: "Read runtime memory records", allowed: true, mode: "read-only" },
  { id: "finding_drafts", label: "Create finding drafts", allowed: true, mode: "read-only" },
  { id: "propose_memory", label: "Propose memory", allowed: true, mode: "read-only" },
  { id: "verify_fixes", label: "Verify fixes", allowed: true, mode: "read-only" },
  { id: "modify_code", label: "Modify code", allowed: false, mode: "read-only" },
  { id: "create_pr", label: "Create pull request", allowed: false, mode: "read-only" },
  { id: "deploy", label: "Deploy", allowed: false, mode: "read-only" },
];

type AgentPermissionsPanelProps = {
  /** Optional backend-supplied overrides. Missing keys stay on defaults. */
  overrides?: Partial<Record<string, boolean>>;
};

export function AgentPermissionsPanel({ overrides }: AgentPermissionsPanelProps) {
  const rows = DEFAULT_PERMISSIONS.map((row) => ({
    ...row,
    allowed: overrides?.[row.id] ?? row.allowed,
  }));

  return (
    <AgentDetailPanelShell
      title="Permissions and tools"
      id="agent-permissions"
      description={`${AGENT_DETAIL_CC_COPY.permissionsReadOnly}. Agents may inspect and propose — not modify code, open PRs, or deploy automatically.`}
      compact
      defaultCollapsed
      testId="agentops-agent-permissions-panel"
    >
      <ul className="space-y-2">
        {rows.map((row) => (
          <li
            key={row.id}
            className="flex flex-wrap items-center justify-between gap-2 text-sm"
          >
            <span className="text-white/80">{row.label}</span>
            <div className="flex items-center gap-2">
              <AixiaBadge tone={row.allowed ? "emerald" : "amber"}>
                {row.allowed ? "Allowed" : "Blocked"}
              </AixiaBadge>
              <span className="text-xs text-white/45">{row.mode}</span>
            </div>
          </li>
        ))}
      </ul>
    </AgentDetailPanelShell>
  );
}
