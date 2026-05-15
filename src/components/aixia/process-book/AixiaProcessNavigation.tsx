import type { ReactNode } from "react";

import { AixiaButton } from "../AixiaButton";

export type AixiaProcessNavigationProps = {
  onPrevious?: () => void;
  onNext?: () => void;
  onSaveDraft?: () => void;
  finalAction?: ReactNode;
  previousDisabled?: boolean;
  nextDisabled?: boolean;
  saveDisabled?: boolean;
  previousLabel?: string;
  nextLabel?: string;
  saveLabel?: string;
};

export function AixiaProcessNavigation({
  onPrevious,
  onNext,
  onSaveDraft,
  finalAction,
  previousDisabled,
  nextDisabled,
  saveDisabled,
  previousLabel = "Previous",
  nextLabel = "Next",
  saveLabel = "Save Draft",
}: AixiaProcessNavigationProps) {
  return (
    <footer className="aixia-process-navigation" aria-label="Process navigation">
      <div className="aixia-process-navigation__group">
        <AixiaButton type="button" variant="secondary" onClick={onPrevious} disabled={previousDisabled}>
          {previousLabel}
        </AixiaButton>
      </div>

      <div className="aixia-process-navigation__group">
        {onSaveDraft ? (
          <AixiaButton type="button" variant="secondary" onClick={onSaveDraft} disabled={saveDisabled}>
            {saveLabel}
          </AixiaButton>
        ) : null}
        {onNext ? (
          <AixiaButton type="button" variant="primary" onClick={onNext} disabled={nextDisabled}>
            {nextLabel}
          </AixiaButton>
        ) : null}
        {finalAction}
      </div>
    </footer>
  );
}
