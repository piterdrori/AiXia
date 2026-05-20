import { useCallback, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

import type { AixiaProcessStageItem } from "@/components/aixia";

import {
  getDefaultStageForProcess,
  type ProcessBookProcessKey,
} from "@/lib/finance/processBook/resolveExpenseStage";

type UseProcessBookNavigationOptions = {
  processKey: ProcessBookProcessKey;
  stages: Array<Pick<AixiaProcessStageItem, "id" | "title" | "description">>;
  initialStageId?: string;
  syncUrl?: boolean;
};

export function useProcessBookNavigation({
  processKey,
  stages,
  initialStageId,
  syncUrl = true,
}: UseProcessBookNavigationOptions) {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlStage = syncUrl ? searchParams.get("stage") : null;
  const defaultStageId = initialStageId ?? getDefaultStageForProcess(processKey);

  const [stageId, setStageIdState] = useState<string>(() => {
    if (urlStage && stages.some((stage) => stage.id === urlStage)) {
      return urlStage;
    }

    return defaultStageId;
  });

  const setStageId = useCallback(
    (nextStageId: string) => {
      setStageIdState(nextStageId);

      if (!syncUrl) {
        return;
      }

      setSearchParams(
        (current) => {
          const params = new URLSearchParams(current);
          params.set("stage", nextStageId);
          return params;
        },
        { replace: true },
      );
    },
    [setSearchParams, syncUrl],
  );

  const currentIndex = useMemo(() => {
    const index = stages.findIndex((stage) => stage.id === stageId);
    return index >= 0 ? index : 0;
  }, [stageId, stages]);

  const goPrevious = useCallback(() => {
    const previousStage = stages[currentIndex - 1];
    if (previousStage) {
      setStageId(previousStage.id);
    }
  }, [currentIndex, setStageId, stages]);

  const goNext = useCallback(() => {
    const nextStage = stages[currentIndex + 1];
    if (nextStage) {
      setStageId(nextStage.id);
    }
  }, [currentIndex, setStageId, stages]);

  return {
    stageId,
    currentIndex,
    setStageId,
    goPrevious,
    goNext,
    previousDisabled: currentIndex === 0,
    nextDisabled: currentIndex >= stages.length - 1,
  };
}
