import { NavLink } from "react-router-dom";

const PRIMARY_NAV = [
  { to: "/system/agent-ops", label: "Overview", end: true },
  { to: "/system/agent-ops/agents", label: "Agents" },
  { to: "/system/agent-ops/issues", label: "Findings" },
  { to: "/system/agent-ops/monitoring", label: "Monitoring" },
  { to: "/system/agent-ops/memory", label: "Memory" },
] as const;

const MORE_NAV = [
  { to: "/system/agent-ops/advanced", label: "Advanced" },
  { to: "/system/agent-ops/history", label: "History" },
  { to: "/system/agent-ops/council", label: "Council" },
  { to: "/system/agent-ops/tools", label: "Tools" },
  { to: "/system/agent-ops/runtime", label: "System details" },
] as const;

export function AgentOpsOwnerNav() {
  return (
    <nav aria-label="AgentOps" className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {PRIMARY_NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={"end" in item ? item.end : false}
            className={({ isActive }) =>
              [
                "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400",
                isActive
                  ? "bg-indigo-500/20 text-white"
                  : "text-white/65 hover:bg-white/5 hover:text-white",
              ].join(" ")
            }
          >
            {item.label}
          </NavLink>
        ))}
      </div>
      <details className="group">
        <summary className="cursor-pointer list-none text-xs font-medium uppercase tracking-wide text-white/45 hover:text-white/70">
          More
        </summary>
        <div className="mt-2 flex flex-wrap gap-2">
          {MORE_NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                [
                  "rounded-lg px-3 py-1.5 text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400",
                  isActive
                    ? "bg-white/10 text-white"
                    : "text-white/55 hover:bg-white/5 hover:text-white/85",
                ].join(" ")
              }
            >
              {item.label}
            </NavLink>
          ))}
        </div>
      </details>
    </nav>
  );
}
