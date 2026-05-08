import type { ReactNode } from "react";

type AixiaMetricGridProps = {
  children: ReactNode;
  className?: string;
};

export function AixiaMetricGrid({
  children,
  className = "",
}: AixiaMetricGridProps) {
  return (
    <section className={`aixia-smart-grid ${className}`} data-mode="metrics">
      {children}
    </section>
  );
}
