import type { HTMLAttributes, ReactNode } from "react";

type AixiaReviewGridProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
};

export function AixiaReviewGrid({
  className = "",
  children,
  ...props
}: AixiaReviewGridProps) {
  return (
    <div {...props} className={`aixia-review-grid ${className}`}>
      {children}
    </div>
  );
}

type AixiaReviewBlockProps = {
  label: ReactNode;
  value: ReactNode;
  description?: ReactNode;
  className?: string;
};

export function AixiaReviewBlock({
  label,
  value,
  description,
  className = "",
}: AixiaReviewBlockProps) {
  return (
    <div className={`aixia-review-block ${className}`}>
      <div className="aixia-review-block-label">{label}</div>
      <div className="aixia-review-block-value">{value || "—"}</div>
      {description ? (
        <div className="aixia-review-block-description">{description}</div>
      ) : null}
    </div>
  );
}