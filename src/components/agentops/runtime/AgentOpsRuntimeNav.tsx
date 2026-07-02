import { NavLink } from "react-router-dom";
import { ArrowLeft, Bot, Database, Gauge, ListChecks, type LucideIcon } from "lucide-react";

export type AgentOpsRuntimeMirrorSection = "dashboard" | "agents" | "issues" | "memory";

type MirrorNavItem = {
  id: AgentOpsRuntimeMirrorSection;
  label: string;
  path: string;
  icon: LucideIcon;
};

const MIRROR_NAV: MirrorNavItem[] = [
  { id: "dashboard", label: "Diagnostics hub", path: "/system/agent-ops/runtime", icon: Gauge },
  {
    id: "memory",
    label: "Memory observatory",
    path: "/system/agent-ops/runtime/memory",
    icon: Database,
  },
  {
    id: "issues",
    label: "Issues observatory",
    path: "/system/agent-ops/issues/runtime",
    icon: ListChecks,
  },
  {
    id: "agents",
    label: "Operator registry",
    path: "/system/agent-ops/agents/runtime",
    icon: Bot,
  },
];

type AgentOpsRuntimeNavProps = {
  active: AgentOpsRuntimeMirrorSection;
};

export function AgentOpsRuntimeNav({ active }: AgentOpsRuntimeNavProps) {
  return (
    <nav
      className="aixia-card-shell aixia-dash-panel aixia-dash-glass flex shrink-0 flex-col gap-1 p-2 lg:w-56"
      aria-label="AgentOps runtime diagnostics"
    >
      <NavLink
        to="/system/agent-ops"
        className="mb-1 flex items-center gap-2 rounded-[var(--aixia-dash-radius-sm)] border border-transparent px-2.5 py-2 text-[13px] font-medium text-white/60 transition-colors hover:bg-white/[0.06] hover:text-white"
      >
        <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
        <span>Back to product AgentOps</span>
      </NavLink>

      <p className="aixia-caption px-2 pb-1 pt-1 uppercase tracking-wide text-white/45">
        Developer diagnostics
      </p>
      {MIRROR_NAV.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.id}
            to={item.path}
            end={item.id === "dashboard"}
            className={({ isActive }) =>
              [
                "flex items-center gap-2 rounded-[var(--aixia-dash-radius-sm)] px-2.5 py-2 text-[13px] font-medium transition-colors",
                isActive || item.id === active
                  ? "border border-primary/25 bg-primary/[0.09] text-primary"
                  : "border border-transparent text-white/70 hover:bg-white/[0.06] hover:text-white",
              ].join(" ")
            }
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden />
            <span>{item.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}
