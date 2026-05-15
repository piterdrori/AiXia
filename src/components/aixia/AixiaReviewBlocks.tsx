import type { HTMLAttributes, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

type AixiaReviewGridVariant = "stack" | "metrics" | "cards" | "compact";
type AixiaReviewBlockTone =
  | "cyan"
  | "emerald"
  | "amber"
  | "violet"
  | "rose"
  | "neutral";

type AixiaReviewGridProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  variant?: AixiaReviewGridVariant;
};

export function AixiaReviewGrid({
  className = "",
  children,
  variant = "stack",
  ...props
}: AixiaReviewGridProps) {
  return (
    <div
      {...props}
      className={`aixia-review-grid ${className}`}
      data-review-grid-variant={variant}
    >
      {children}
    </div>
  );
}

type AixiaReviewBlockProps = {
  label: ReactNode;
  value: ReactNode;
  description?: ReactNode;
  icon?: LucideIcon;
  tone?: AixiaReviewBlockTone;
  className?: string;
};

export function AixiaReviewBlock({
  label,
  value,
  description,
  icon: Icon,
  tone = "neutral",
  className = "",
}: AixiaReviewBlockProps) {
  return (
    <div
      className={`aixia-review-block ${className}`}
      data-review-block-tone={tone}
      data-has-icon={Icon ? "true" : "false"}
    >
      <div className="aixia-review-block-head">
        <div className="aixia-review-block-copy">
          <div className="aixia-review-block-label">{label}</div>
          <div className="aixia-review-block-value">{value || "—"}</div>
        </div>

        {Icon ? (
          <div className="aixia-review-block-icon">
            <Icon className="h-5 w-5" />
          </div>
        ) : null}
      </div>

      {description ? (
        <div className="aixia-review-block-description">{description}</div>
      ) : null}
    </div>
  );
}
