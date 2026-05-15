import type { AixiaProcessStageItem } from "./AixiaProcessBook";

export type AixiaProcessStepperProps = {
  stages: AixiaProcessStageItem[];
  currentStageId: string;
  onStageChange?: (stageId: string) => void;
};

function formatStatus(status: AixiaProcessStageItem["status"]) {
  return status.replace(/-/g, " ");
}

export function AixiaProcessStepper({ stages, currentStageId, onStageChange }: AixiaProcessStepperProps) {
  return (
    <nav className="aixia-process-stepper" aria-label="Process stages">
      <div className="aixia-process-stepper__track">
        {stages.map((stage, index) => {
          const disabled = stage.disabled || stage.status === "locked";
          const isCurrent = stage.id === currentStageId;

          return (
            <button
              key={stage.id}
              type="button"
              className="aixia-process-step"
              data-status={isCurrent ? "current" : stage.status}
              disabled={disabled}
              aria-current={isCurrent ? "step" : undefined}
              onClick={() => onStageChange?.(stage.id)}
            >
              <span className="aixia-process-step__number">{index + 1}</span>
              <span className="aixia-process-step__label">
                <span className="aixia-process-step__title">{stage.title}</span>
                <span className="aixia-process-step__status">{isCurrent ? "current" : formatStatus(stage.status)}</span>
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
