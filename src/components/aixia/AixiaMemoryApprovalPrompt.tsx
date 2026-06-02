import { AixiaBadge } from "./AixiaBadge";
import { AixiaButton } from "./AixiaButton";

export type AixiaMemoryApprovalStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "disabled"
  | "saved"
  | "error";

export type AixiaMemoryApprovalScope =
  | "agent"
  | "issue"
  | "shared"
  | "design_system"
  | "prompt";

export type AixiaMemoryApprovalDensity = "comfortable" | "compact" | "inline";

export type AixiaMemoryApprovalPromptProps = {
  suggestedMemoryText: string;
  onApprove?: () => void;
  onReject?: () => void;
  disabled?: boolean;
  status?: AixiaMemoryApprovalStatus;
  scope?: AixiaMemoryApprovalScope;
  agentName?: string;
  contextLabel?: string;
  helperText?: string;
  approveLabel?: string;
  rejectLabel?: string;
  density?: AixiaMemoryApprovalDensity;
  className?: string;
};

function formatScope(scope: AixiaMemoryApprovalScope) {
  return scope.replace(/_/g, " ");
}

function getStatusTone(
  status: AixiaMemoryApprovalStatus,
): "neutral" | "emerald" | "rose" | "gold" | "cyan" {
  if (status === "approved" || status === "saved") return "emerald";
  if (status === "rejected" || status === "error") return "rose";
  if (status === "pending") return "gold";
  if (status === "disabled") return "neutral";
  return "cyan";
}

function getStatusLabel(status: AixiaMemoryApprovalStatus) {
  if (status === "approved") return "Approved";
  if (status === "rejected") return "Rejected";
  if (status === "saved") return "Saved";
  if (status === "disabled") return "Disabled";
  if (status === "error") return "Error";
  return "Pending approval";
}

export function AixiaMemoryApprovalPrompt({
  suggestedMemoryText,
  onApprove,
  onReject,
  disabled = false,
  status = "pending",
  scope,
  agentName,
  contextLabel,
  helperText = "Memory updates require Piter approval.",
  approveLabel = "Yes",
  rejectLabel = "No",
  density = "comfortable",
  className = "",
}: AixiaMemoryApprovalPromptProps) {
  const promptClassName = [
    "aixia-memory-approval",
    density === "compact" ? "aixia-memory-approval--compact" : "",
    density === "inline" ? "aixia-memory-approval--inline" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const interactionsLocked =
    disabled || status === "approved" || status === "rejected" || status === "saved";

  const hasMeta = Boolean(scope || agentName || contextLabel);
  const isInline = density === "inline";

  return (
    <section
      className={promptClassName}
      data-memory-approval-status={status}
      data-memory-approval-density={density}
      data-memory-approval-disabled={interactionsLocked ? "true" : "false"}
    >
      {isInline ? (
        <div className="aixia-memory-approval__inline">
          <p className="aixia-memory-approval__question">
            Do you want me to update my memory with this?
          </p>
          <p className="aixia-memory-approval__suggestion">{suggestedMemoryText}</p>
          <div className="aixia-memory-approval__actions">
            <AixiaButton
              type="button"
              variant="primary"
              disabled={interactionsLocked}
              onClick={() => onApprove?.()}
            >
              {approveLabel}
            </AixiaButton>
            <AixiaButton
              type="button"
              variant="secondary"
              disabled={interactionsLocked}
              onClick={() => onReject?.()}
            >
              {rejectLabel}
            </AixiaButton>
          </div>
        </div>
      ) : (
        <>
          <div className="aixia-memory-approval__header">
            <p className="aixia-memory-approval__question">
              Do you want me to update my memory with this?
            </p>
            <div className="aixia-memory-approval__status">
              <AixiaBadge tone={getStatusTone(status)}>{getStatusLabel(status)}</AixiaBadge>
            </div>
          </div>

          <div className="aixia-memory-approval__content">
            <div className="aixia-memory-approval__suggestion">{suggestedMemoryText}</div>

            {hasMeta ? (
              <div className="aixia-memory-approval__meta">
                {agentName ? <span>Agent: {agentName}</span> : null}
                {scope ? <span>Scope: {formatScope(scope)}</span> : null}
                {contextLabel ? <span>Context: {contextLabel}</span> : null}
              </div>
            ) : null}

            <div className="aixia-memory-approval__actions">
              <AixiaButton
                type="button"
                variant="primary"
                disabled={interactionsLocked}
                onClick={() => onApprove?.()}
              >
                {approveLabel}
              </AixiaButton>
              <AixiaButton
                type="button"
                variant="secondary"
                disabled={interactionsLocked}
                onClick={() => onReject?.()}
              >
                {rejectLabel}
              </AixiaButton>
            </div>

            {helperText ? <p className="aixia-memory-approval__helper">{helperText}</p> : null}
          </div>
        </>
      )}
    </section>
  );
}
