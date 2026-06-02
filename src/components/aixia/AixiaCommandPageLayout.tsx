import type { ReactNode } from "react";

import { AixiaCommandPage } from "./AixiaCommandPage";

export type AixiaCommandPageLayoutProps = {
  hero: ReactNode;
  children: ReactNode;
  /** Rendered at top of scroll body (meta strip, runtime strip, alerts). */
  scrollLead?: ReactNode;
  moduleClassName?: string;
  className?: string;
  scrollClassName?: string;
};

/**
 * Locked command-page composition: command shell → hero → scroll region.
 * Matches Finance hub / AgentOps Control Center rhythm without finance-only CSS.
 */
export function AixiaCommandPageLayout({
  hero,
  children,
  scrollLead,
  moduleClassName = "",
  className = "",
  scrollClassName = "aixia-command-scroll flex min-h-0 flex-1 flex-col gap-6",
}: AixiaCommandPageLayoutProps) {
  return (
    <AixiaCommandPage moduleClassName={moduleClassName} className={className}>
      {hero}
      <div className={scrollClassName}>
        {scrollLead}
        {children}
      </div>
    </AixiaCommandPage>
  );
}
