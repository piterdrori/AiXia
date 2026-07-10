import type { ReactNode } from "react";

type AgentOpsPageHeaderProps = {
  title: string;
  subtitle: string;
  actions?: ReactNode;
};

export function AgentOpsPageHeader({ title, subtitle, actions }: AgentOpsPageHeaderProps) {
  return (
    <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-white md:text-3xl">{title}</h1>
        <p className="max-w-3xl text-sm leading-relaxed text-white/65 md:text-base">{subtitle}</p>
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </header>
  );
}
