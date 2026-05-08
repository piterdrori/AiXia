import type { HTMLAttributes, ReactNode } from "react";

type AixiaActionStackProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
};

export function AixiaActionStack({
  className = "",
  children,
  ...props
}: AixiaActionStackProps) {
  return (
    <div {...props} className={`aixia-action-stack ${className}`}>
      {children}
    </div>
  );
}

type AixiaAlertTextProps = {
  title: ReactNode;
  description?: ReactNode;
};

export function AixiaAlertText({ title, description }: AixiaAlertTextProps) {
  return (
    <div className="aixia-alert-text">
      <div className="aixia-alert-title">{title}</div>
      {description ? (
        <div className="aixia-alert-description">{description}</div>
      ) : null}
    </div>
  );
}