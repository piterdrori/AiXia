import type { ReactNode } from "react";

type AixiaValueBlockProps = {
  label: ReactNode;
  value: ReactNode;
  detail?: ReactNode;
  className?: string;
};

export function AixiaValueBlock({
  label,
  value,
  detail,
  className = "",
}: AixiaValueBlockProps) {
  return (
    <div className={`aixia-value-block ${className}`}>
      <div className="aixia-value-block-label">{label}</div>
      <div className="aixia-value-block-value">{value}</div>
      {detail ? <div className="aixia-value-block-detail">{detail}</div> : null}
    </div>
  );
}
