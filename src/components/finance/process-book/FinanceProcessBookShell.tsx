import type { ReactNode } from "react";

import {
  AixiaProcessBook,
  type AixiaProcessStageItem,
  type AixiaProcessSummaryItem,
} from "@/components/aixia";
import { useProcessBookNavigation } from "@/hooks/useProcessBookNavigation";
import type { ProcessBookProcessKey } from "@/lib/finance/processBook/resolveExpenseStage";

export type FinanceProcessBookShellProps = {
  processKey: ProcessBookProcessKey;
  eyebrow: string;
  title: string;
  subtitle?: string;
  statusLabel?: string;
  progressLabel?: string;
  recordLabel?: string;
  summaryItems: AixiaProcessSummaryItem[];
  stages: Array<Pick<AixiaProcessStageItem, "id" | "title" | "description"> & { content: ReactNode }>;
  initialStageId?: string;
  finalAction?: ReactNode;
  onSaveDraft?: () => void;
  saveDisabled?: boolean;
};

export function FinanceProcessBookShell({
  processKey,
  eyebrow,
  title,
  subtitle,
  statusLabel,
  progressLabel,
  recordLabel,
  summaryItems,
  stages,
  initialStageId,
  finalAction,
  onSaveDraft,
  saveDisabled,
}: FinanceProcessBookShellProps) {
  const {
    stageId,
    currentIndex,
    setStageId,
    goPrevious,
    goNext,
    previousDisabled,
    nextDisabled,
  } = useProcessBookNavigation({
    processKey,
    stages,
    initialStageId,
  });

  const bookStages: AixiaProcessStageItem[] = stages.map((stage, index) => ({
    ...stage,
    status: stage.id === stageId ? "current" : index < currentIndex ? "complete" : "locked",
    disabled: index > currentIndex,
    content: stage.content,
  }));

  return (
    <AixiaProcessBook
      eyebrow={eyebrow}
      title={title}
      subtitle={subtitle}
      statusLabel={statusLabel}
      progressLabel={progressLabel}
      recordLabel={recordLabel}
      stages={bookStages}
      currentStageId={stageId}
      summaryItems={summaryItems}
      onStageChange={setStageId}
      onPrevious={goPrevious}
      onNext={goNext}
      onSaveDraft={onSaveDraft}
      previousDisabled={previousDisabled}
      nextDisabled={nextDisabled}
      saveDisabled={saveDisabled}
      finalAction={currentIndex >= stages.length - 1 ? finalAction : null}
    />
  );
}
