import type { ReactNode } from "react";

import type { AixiaCommandSurface } from "./commandSurface";

type AixiaMetricGridProps = {
  children: ReactNode;
  className?: string;
  surface?: AixiaCommandSurface;
};

export function AixiaMetricGrid({
  children,
  className = "",
  surface = "default",
}: AixiaMetricGridProps) {
  if (surface === "command") {
    return (
      <section className={`aixia-dash-bento ${className}`.trim()} data-mode="metrics">
        {children}
      </section>
    );
  }

  return (
    <section className={`aixia-smart-grid ${className}`} data-mode="metrics">
      {children}
    </section>
  );
}
