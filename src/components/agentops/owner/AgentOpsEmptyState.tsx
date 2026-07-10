import type { ReactNode } from "react";

type AgentOpsEmptyStateProps = {
  title: string;
  description: string;
  icon?: ReactNode;
};

export function AgentOpsEmptyState({ title, description, icon }: AgentOpsEmptyStateProps) {
  return (
    <div className="rounded-xl border border-dashed border-white/15 bg-white/[0.02] px-6 py-10 text-center">
      {icon ? <div className="mb-3 flex justify-center text-white/45">{icon}</div> : null}
      <h3 className="text-base font-medium text-white">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-white/60">{description}</p>
    </div>
  );
}
