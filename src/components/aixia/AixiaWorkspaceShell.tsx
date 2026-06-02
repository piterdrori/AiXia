import type { ReactNode } from "react";

import { AixiaCommandPage } from "./AixiaCommandPage";
import { AixiaSmartLayout } from "./AixiaSmartLayout";

export type AixiaWorkspaceShellVariant = "standard" | "compact" | "wide";
export type AixiaWorkspaceShellDensity = "comfortable" | "compact";

export type AixiaWorkspaceShellProps = {
  hero: ReactNode;
  statusStrip?: ReactNode;
  overview?: ReactNode;
  children: ReactNode;
  secondary?: ReactNode;
  details?: ReactNode;
  timeline?: ReactNode;
  footer?: ReactNode;
  className?: string;
  contentClassName?: string;
  variant?: AixiaWorkspaceShellVariant;
  density?: AixiaWorkspaceShellDensity;
};

export function AixiaWorkspaceShell({
  hero,
  statusStrip,
  overview,
  children,
  secondary,
  details,
  timeline,
  footer,
  className = "",
  contentClassName = "",
  variant = "standard",
  density = "comfortable",
}: AixiaWorkspaceShellProps) {
  const bodyClassName = [
    "aixia-workspace-shell__body",
    density === "compact" ? "aixia-workspace-shell__body--compact" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const primaryClassName = ["aixia-workspace-shell__primary", contentClassName]
    .filter(Boolean)
    .join(" ");

  const shellClassName = ["aixia-workspace-shell", className]
    .filter(Boolean)
    .join(" ");

  const mainContent = <div className={primaryClassName}>{children}</div>;

  return (
    <AixiaCommandPage
      className="aixia-workspace-shell-page"
      scrollClassName="aixia-workspace-shell-scroll"
    >
      <div
        className={shellClassName}
        data-workspace-shell-variant={variant}
        data-workspace-shell-density={density}
      >
        <div className="aixia-workspace-shell__hero">{hero}</div>

        <div className={bodyClassName}>
          {statusStrip ? (
            <div className="aixia-workspace-shell__status-strip">
              {statusStrip}
            </div>
          ) : null}

          {overview ? (
            <div className="aixia-workspace-shell__overview">{overview}</div>
          ) : null}

          {secondary ? (
            <AixiaSmartLayout
              className="aixia-workspace-shell__layout"
              main={mainContent}
              side={
                <div className="aixia-workspace-shell__secondary">
                  {secondary}
                </div>
              }
              balance={variant === "wide" ? "equal" : "main"}
              sidebar={variant === "compact" ? "narrow" : "normal"}
              matchColumns={density !== "compact"}
            />
          ) : (
            mainContent
          )}

          {details ? (
            <div className="aixia-workspace-shell__details">{details}</div>
          ) : null}

          {timeline ? (
            <div className="aixia-workspace-shell__timeline">{timeline}</div>
          ) : null}

          {footer ? (
            <div className="aixia-workspace-shell__footer">{footer}</div>
          ) : null}
        </div>
      </div>
    </AixiaCommandPage>
  );
}
