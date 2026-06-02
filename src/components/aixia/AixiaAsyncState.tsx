import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";

import { AixiaProgressBar } from "./AixiaProgressBar";

export type AixiaAsyncStateVariant = "inline" | "compact" | "panel";

export type AixiaAsyncStateProps = {
  loading: boolean;
  children: ReactNode;
  /** When provided, shown while loading (preserves PageLoader call-site behavior). */
  fallback?: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
  variant?: AixiaAsyncStateVariant;
  /** Optional progress bar under title/description when no custom fallback. */
  progress?: boolean;
  progressValue?: number;
  progressMax?: number;
  className?: string;
};

export function AixiaAsyncState({
  loading,
  children,
  fallback,
  title = "Loading",
  description,
  variant = "inline",
  progress = false,
  progressValue = 0,
  progressMax = 100,
  className = "",
}: AixiaAsyncStateProps) {
  if (!loading) {
    return <>{children}</>;
  }

  if (fallback !== undefined) {
    return <>{fallback}</>;
  }

  const classNames = [
    "aixia-async-state",
    variant === "compact" ? "aixia-async-state--compact" : "",
    variant === "panel" ? "aixia-async-state--panel" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <section
      className={classNames}
      aria-busy="true"
      aria-live="polite"
      data-async-state={variant}
    >
      <div className="aixia-async-state__icon" aria-hidden>
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
      <div className="aixia-async-state__copy">
        <div className="aixia-async-state__title">{title}</div>
        {description ? (
          <p className="aixia-async-state__description">{description}</p>
        ) : null}
        {progress ? (
          <AixiaProgressBar
            value={progressValue}
            max={progressMax}
            className="aixia-async-state__progress"
          />
        ) : null}
      </div>
    </section>
  );
}
