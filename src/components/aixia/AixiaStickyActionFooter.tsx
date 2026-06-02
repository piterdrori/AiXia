import type { ReactNode } from "react";

type AixiaStickyActionFooterProps = {
  left?: ReactNode;
  right?: ReactNode;
};

export function AixiaStickyActionFooter({ left, right }: AixiaStickyActionFooterProps) {
  return (
    <div className="aixia-sticky-action-footer">
      <div className="aixia-sticky-action-footer__inner">
        <div>{left}</div>
        <div className="aixia-action-system" data-align="end" data-density="compact">
          {right}
        </div>
      </div>
    </div>
  );
}
