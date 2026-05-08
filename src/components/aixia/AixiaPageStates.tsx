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
  className?: string;
};

export function AixiaPageState({
  icon: Icon = AlertTriangle,
  title,
  description,
  action,
  fullPage = false,
  loading = false,
  className = "",
}: AixiaPageStateProps) {
  const content = (
    <section className={`aixia-page-state ${className}`}>
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
  className?: string;
};

export function AixiaLoadingState({
  title = "Loading",
  description = "The page data and permission state are being checked.",
  fullPage = true,
  className = "",
}: AixiaLoadingStateProps) {
  return (
    <AixiaPageState
      title={title}
      description={description}
      fullPage={fullPage}
      loading
      className={className}
    />
  );
}

type AixiaNotFoundStateProps = {
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  fullPage?: boolean;
  className?: string;
};

export function AixiaNotFoundState({
  title = "Record not found",
  description = "The requested record could not be found or is no longer available.",
  action,
  fullPage = false,
  className = "",
}: AixiaNotFoundStateProps) {
  return (
    <AixiaPageState
      icon={SearchX}
      title={title}
      description={description}
      action={action}
      fullPage={fullPage}
      className={className}
    />
  );
}

type AixiaAccessDeniedStateProps = {
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  fullPage?: boolean;
  className?: string;
};

export function AixiaAccessDeniedState({
  title = "Access denied",
  description = "You do not have permission to access this page or run this action.",
  action,
  fullPage = false,
  className = "",
}: AixiaAccessDeniedStateProps) {
  return (
    <AixiaPageState
      icon={LockKeyhole}
      title={title}
      description={description}
      action={action}
      fullPage={fullPage}
      className={className}
    />
  );
}