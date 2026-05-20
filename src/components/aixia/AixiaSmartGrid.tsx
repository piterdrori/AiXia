import type { HTMLAttributes, ReactNode } from "react";

import type { AixiaCommandSurface } from "./commandSurface";

type AixiaSmartGridMode =
  | "auto"
  | "hero-stats"
  | "metrics"
  | "cards"
  | "compact"
  | "wide";

type AixiaSmartGridProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  mode?: AixiaSmartGridMode;
  surface?: AixiaCommandSurface;
};

export function AixiaSmartGrid({
  children,
  mode = "auto",
  surface = "default",
  className = "",
  ...props
}: AixiaSmartGridProps) {
  if (surface === "command" && (mode === "metrics" || mode === "hero-stats")) {
    return (
      <div className={`aixia-dash-bento ${className}`.trim()} data-mode={mode} {...props}>
        {children}
      </div>
    );
  }

  return (
    <div className={`aixia-smart-grid ${className}`} data-mode={mode} {...props}>
      {children}
    </div>
  );
}
