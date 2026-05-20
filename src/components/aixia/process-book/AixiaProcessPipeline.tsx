import type { ProcessPipelineStep } from "@/lib/finance/processBook/types";

export type AixiaProcessPipelineProps = {
  steps: ProcessPipelineStep[];
  activeStepKey?: string;
  onStepClick?: (step: ProcessPipelineStep) => void;
  ariaLabel?: string;
};

export function AixiaProcessPipeline({
  steps,
  activeStepKey,
  onStepClick,
  ariaLabel = "Process pipeline",
}: AixiaProcessPipelineProps) {
  return (
    <nav className="aixia-process-pipeline" aria-label={ariaLabel}>
      <ol className="aixia-process-pipeline__track">
        {steps.map((step, index) => {
          const isActive = step.key === activeStepKey;
          const isClickable = Boolean(onStepClick && (step.route || step.processKey));

          return (
            <li className="aixia-process-pipeline__item" key={step.key}>
              <button
                type="button"
                className="aixia-process-pipeline__step"
                data-active={isActive ? "true" : "false"}
                disabled={!isClickable}
                onClick={() => {
                  if (isClickable) {
                    onStepClick?.(step);
                  }
                }}
              >
                <span className="aixia-process-pipeline__index">{String(index + 1).padStart(2, "0")}</span>
                <span className="aixia-process-pipeline__content">
                  <span className="aixia-process-pipeline__label">{step.label}</span>
                  {step.description ? (
                    <span className="aixia-process-pipeline__description">{step.description}</span>
                  ) : null}
                </span>
                {typeof step.count === "number" ? (
                  <span className="aixia-process-pipeline__count">{step.count}</span>
                ) : null}
              </button>
              {index < steps.length - 1 ? <span className="aixia-process-pipeline__connector" aria-hidden="true" /> : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
