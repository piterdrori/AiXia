import type { HTMLAttributes, ReactNode } from "react";

type AixiaActionAlign = "start" | "end" | "between";
type AixiaActionDensity = "compact" | "normal";

type AixiaActionSystemProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  align?: AixiaActionAlign;
  density?: AixiaActionDensity;
};

export function AixiaActionSystem({
  children,
  align = "end",
  density = "normal",
  className = "",
  ...props
}: AixiaActionSystemProps) {
  return (
    <div
      className={`aixia-action-system ${className}`}
      data-align={align}
      data-density={density}
      {...props}
    >
      {children}
    </div>
  );
}