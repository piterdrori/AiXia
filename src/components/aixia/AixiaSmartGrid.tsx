import type { HTMLAttributes, ReactNode } from "react";

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
};

export function AixiaSmartGrid({
  children,
  mode = "auto",
  className = "",
  ...props
}: AixiaSmartGridProps) {
  return (
    <div className={`aixia-smart-grid ${className}`} data-mode={mode} {...props}>
      {children}
    </div>
  );
}