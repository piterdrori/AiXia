import type { ReactNode } from "react";

import { AixiaProcessNavigation } from "./AixiaProcessNavigation";
import { AixiaProcessStage } from "./AixiaProcessStage";
import { AixiaProcessStepper } from "./AixiaProcessStepper";
import { AixiaProcessSummaryPanel } from "./AixiaProcessSummaryPanel";

export type AixiaProcessStageStatus =
  | "locked"
  | "current"
  | "complete"
  | "warning"
  | "error"
  | "skipped";

export type AixiaProcessStageItem = {
  id: string;
  title: string;
  description?: string;
  status: AixiaProcessStageStatus;
  disabled?: boolean;
  content: ReactNode;
};

export type AixiaProcessSummaryItem = {
  label: string;
  value: ReactNode;
};

export type AixiaProcessBookProps = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  statusLabel?: string;
  progressLabel?: string;
  recordLabel?: string;
  stages: AixiaProcessStageItem[];
  currentStageId: string;
  summaryTitle?: string;
  summaryItems: AixiaProcessSummaryItem[];
  onStageChange?: (stageId: string) => void;
  onPrevious?: () => void;
  onNext?: () => void;
  onSaveDraft?: () => void;
  finalAction?: ReactNode;
  previousDisabled?: boolean;
  nextDisabled?: boolean;
  saveDisabled?: boolean;
  nextLabel?: string;
  previousLabel?: string;
  saveLabel?: string;
};

export function AixiaProcessBook({
  eyebrow = "Guided Process",
  title,
  subtitle,
  statusLabel,
  progressLabel,
  recordLabel,
  stages,
  currentStageId,
  summaryTitle = "Process Summary",
  summaryItems,
  onStageChange,
  onPrevious,
  onNext,
  onSaveDraft,
  finalAction,
  previousDisabled,
  nextDisabled,
  saveDisabled,
  nextLabel,
  previousLabel,
  saveLabel,
}: AixiaProcessBookProps) {
  const currentIndex = stages.findIndex((stage) => stage.id === currentStageId);
  const safeCurrentIndex = currentIndex >= 0 ? currentIndex : 0;
  const currentStage = stages[safeCurrentIndex];

  return (
    <section className="aixia-process-book" aria-label={title}>
      <div className="aixia-process-book__cover">
        <div className="aixia-process-book__cover-content">
          <div>
            <p className="aixia-process-book__eyebrow">{eyebrow}</p>
            <h1 className="aixia-process-book__title">{title}</h1>
            {subtitle ? <p className="aixia-process-book__subtitle">{subtitle}</p> : null}
          </div>

          <div className="aixia-process-book__meta" aria-label="Process metadata">
            {statusLabel ? (
              <span className="aixia-process-chip" data-tone="cyan">
                {statusLabel}
              </span>
            ) : null}
            {progressLabel ? (
              <span className="aixia-process-chip" data-tone="emerald">
                {progressLabel}
              </span>
            ) : null}
            {recordLabel ? <span className="aixia-process-chip">{recordLabel}</span> : null}
          </div>
        </div>
      </div>

      <AixiaProcessStepper stages={stages} currentStageId={currentStageId} onStageChange={onStageChange} />

      <div className="aixia-process-layout">
        <AixiaProcessStage
          eyebrow={`Stage ${safeCurrentIndex + 1} of ${stages.length}`}
          title={currentStage?.title ?? "Process Stage"}
          description={currentStage?.description}
        >
          {currentStage?.content}
        </AixiaProcessStage>

        <AixiaProcessSummaryPanel title={summaryTitle} items={summaryItems} />
      </div>

      <AixiaProcessNavigation
        onPrevious={onPrevious}
        onNext={onNext}
        onSaveDraft={onSaveDraft}
        finalAction={finalAction}
        previousDisabled={previousDisabled ?? safeCurrentIndex === 0}
        nextDisabled={nextDisabled ?? safeCurrentIndex === stages.length - 1}
        saveDisabled={saveDisabled}
        nextLabel={nextLabel}
        previousLabel={previousLabel}
        saveLabel={saveLabel}
      />
    </section>
  );
}
