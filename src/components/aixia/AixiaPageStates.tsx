import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { AlertTriangle, Loader2, LockKeyhole, SearchX } from "lucide-react";

import { AixiaPage } from "./AixiaPage";

type AixiaPageStateProps = {
  icon?: LucideIcon;
  title: ReactNode;
  description: ReactNode;
  action?: ReactNode;
  fullPage?: boolean;
  loading?: boolean;
  stateType?: "generic" | "loading" | "not-found" | "access-denied";
  refreshSafe?: boolean;
  className?: string;
};

export function AixiaPageState({
  icon: Icon = AlertTriangle,
  title,
  description,
  action,
  fullPage = false,
  loading = false,
  stateType = "generic",
  refreshSafe = false,
  className = "",
}: AixiaPageStateProps) {
  const stateVariantClassName =
    stateType === "loading"
      ? "aixia-page-state--loading"
      : stateType === "not-found"
        ? "aixia-page-state--not-found"
        : stateType === "access-denied"
          ? "aixia-page-state--access-denied"
          : "aixia-page-state--generic";

  const stateClassName = [
    "aixia-card-shell",
    "aixia-page-state",
    loading ? "aixia-page-state--loading" : "",
    stateVariantClassName,
    fullPage ? "aixia-page-state--full-page" : "",
    refreshSafe ? "aixia-page-state--refresh-safe" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const content = (
    <section
      className={stateClassName}
      aria-busy={loading ? "true" : undefined}
      aria-live={loading ? "polite" : undefined}
      data-page-state={stateType}
      data-page-state-layout={fullPage ? "full-page" : "inline"}
      data-page-state-loading={loading ? "true" : "false"}
      data-refresh-safe={refreshSafe ? "true" : "false"}
    >
      <div className="aixia-page-state-icon">
        {loading ? (
          <Loader2 className="h-6 w-6 animate-spin" />
        ) : (
          <Icon className="h-6 w-6" />
        )}
      </div>

      <div className="aixia-page-state-title">{title}</div>
      <p className="aixia-page-state-description">{description}</p>

      {action ? <div className="aixia-page-state-action">{action}</div> : null}
    </section>
  );

  if (!fullPage) {
    return content;
  }

  return <AixiaPage>{content}</AixiaPage>;
}

type AixiaLoadingStateProps = {
  title?: ReactNode;
  description?: ReactNode;
  fullPage?: boolean;
  refreshSafe?: boolean;
  className?: string;
};

export function AixiaLoadingState({
  title = "Loading",
  description = "The page data and permission state are being checked.",
  fullPage = true,
  refreshSafe = true,
  className = "",
}: AixiaLoadingStateProps) {
  return (
    <AixiaPageState
      title={title}
      description={description}
      fullPage={fullPage}
      loading
      stateType="loading"
      refreshSafe={refreshSafe}
      className={className}
    />
  );
}

type AixiaNotFoundStateProps = {
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  fullPage?: boolean;
  refreshSafe?: boolean;
  className?: string;
};

export function AixiaNotFoundState({
  title = "Record not found",
  description = "The requested record could not be found or is no longer available.",
  action,
  fullPage = false,
  refreshSafe = false,
  className = "",
}: AixiaNotFoundStateProps) {
  return (
    <AixiaPageState
      icon={SearchX}
      title={title}
      description={description}
      action={action}
      fullPage={fullPage}
      stateType="not-found"
      refreshSafe={refreshSafe}
      className={className}
    />
  );
}

type AixiaAccessDeniedStateProps = {
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  fullPage?: boolean;
  refreshSafe?: boolean;
  className?: string;
};

export function AixiaAccessDeniedState({
  title = "Access denied",
  description = "You do not have permission to access this page or run this action.",
  action,
  fullPage = false,
  refreshSafe = false,
  className = "",
}: AixiaAccessDeniedStateProps) {
  return (
    <AixiaPageState
      icon={LockKeyhole}
      title={title}
      description={description}
      action={action}
      fullPage={fullPage}
      stateType="access-denied"
      refreshSafe={refreshSafe}
      className={className}
    />
  );
}