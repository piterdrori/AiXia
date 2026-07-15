import type { ReactNode } from "react";

export function AgentDetailPanelShell({
  title,
  id,
  description,
  children,
  compact,
  defaultCollapsed,
  testId,
}: {
  title: string;
  id: string;
  description?: string;
  children: ReactNode;
  compact?: boolean;
  defaultCollapsed?: boolean;
  testId?: string;
}) {
  if (defaultCollapsed) {
    return (
      <details
        className={`rounded-xl border border-white/10 bg-white/[0.03] ${compact ? "p-4" : "p-5"}`}
        data-testid={testId}
      >
        <summary className="cursor-pointer list-none">
          <h2 id={id} className="text-base font-semibold text-white">
            {title}
          </h2>
          {description ? <p className="mt-1 text-sm text-white/55">{description}</p> : null}
        </summary>
        <div className="mt-4 space-y-3">{children}</div>
      </details>
    );
  }

  return (
    <section
      aria-labelledby={id}
      className={`rounded-xl border border-white/10 bg-white/[0.03] ${compact ? "p-4" : "p-5"}`}
      data-testid={testId}
    >
      <h2 id={id} className={`font-semibold text-white ${compact ? "text-base" : "text-lg"}`}>
        {title}
      </h2>
      {description ? <p className="mt-1 text-sm text-white/55">{description}</p> : null}
      <div className="mt-4 space-y-3">{children}</div>
    </section>
  );
}
