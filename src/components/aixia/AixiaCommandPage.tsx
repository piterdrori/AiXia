import type { ReactNode } from "react";

import { AixiaPage } from "./AixiaPage";

type AixiaCommandPageProps = {
  children: ReactNode;
  /** Optional module hook (e.g. `aixia-finance-page`) for module-specific bridge CSS. */
  moduleClassName?: string;
  className?: string;
  scrollClassName?: string;
};

/**
 * Global command-module page shell — dark glass 3D stack, fixed hero + scroll body.
 * Finance uses this via `FinancePage` with `aixia-finance-page`. AgentOps and other
 * command hubs should use `AixiaCommandPage` directly unless they need finance bridge CSS.
 */
export function AixiaCommandPage({
  children,
  moduleClassName = "",
  className = "",
  scrollClassName = "aixia-command-page-scroll",
}: AixiaCommandPageProps) {
  const pageClassName = ["aixia-command-page", moduleClassName, className]
    .filter(Boolean)
    .join(" ");

  return (
    <AixiaPage surface="command" className={pageClassName} scrollClassName={scrollClassName}>
      {children}
    </AixiaPage>
  );
}
