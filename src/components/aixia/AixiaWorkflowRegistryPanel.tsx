import type { ReactNode } from "react";

type AixiaWorkflowRegistryPanelProps = {
  pipeline: ReactNode;
  tabs: ReactNode;
  toolbar: ReactNode;
  content: ReactNode;
  banner?: ReactNode;
  className?: string;
  compactPipeline?: boolean;
};

export function AixiaWorkflowRegistryPanel({
  pipeline,
  tabs,
  toolbar,
  content,
  banner,
  className = "",
  compactPipeline = true,
}: AixiaWorkflowRegistryPanelProps) {
  return (
    <div className={`aixia-workflow-registry-panel ${className}`.trim()}>
      <div
        className={`aixia-workflow-registry-panel__pipeline ${
          compactPipeline ? "aixia-process-pipeline--compact" : ""
        }`.trim()}
      >
        {pipeline}
      </div>

      <div className="aixia-workflow-registry-panel__tabs">{tabs}</div>

      {banner ? <div className="aixia-workflow-registry-panel__banner">{banner}</div> : null}

      <div className="aixia-workflow-registry-panel__toolbar">{toolbar}</div>

      <div className="aixia-workflow-registry-panel__content">{content}</div>
    </div>
  );
}
