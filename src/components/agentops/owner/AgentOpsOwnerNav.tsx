import { NavLink } from "react-router-dom";

const PRIMARY_NAV = [
  { to: "/system/agent-ops", label: "Overview", end: true },
  { to: "/system/agent-ops/agents", label: "Agents" },
  { to: "/system/agent-ops/issues", label: "Findings" },
  { to: "/system/agent-ops/monitoring", label: "Monitoring" },
  { to: "/system/agent-ops/memory", label: "Memory" },
] as const;

export function AgentOpsOwnerNav() {
  return (
    <nav aria-label="AgentOps" className="border-b border-white/10 pb-3">
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
    </nav>
  );
}
