import { useState } from "react";

import { AixiaBadge } from "./AixiaBadge";
import { AixiaButton } from "./AixiaButton";
import type { AixiaMessengerParticipant } from "./AixiaMessengerConfig";

export type AixiaChatParticipantPickerProps = {
  participants: AixiaMessengerParticipant[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
  className?: string;
  defaultExpanded?: boolean;
  /** Controlled expansion (embedded Council workspace). */
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
};

export function AixiaChatParticipantPicker({
  participants,
  selectedIds,
  onChange,
  disabled = false,
  className = "",
  defaultExpanded = false,
  expanded: expandedProp,
  onExpandedChange,
}: AixiaChatParticipantPickerProps) {
  const [expandedInternal, setExpandedInternal] = useState(defaultExpanded);
  const expanded = expandedProp ?? expandedInternal;
  const setExpanded = (next: boolean) => {
    if (expandedProp === undefined) setExpandedInternal(next);
    onExpandedChange?.(next);
  };
  const selectedSet = new Set(selectedIds);
  const count = selectedIds.length;

  const toggleAgent = (agentId: string) => {
    if (disabled) return;
    if (selectedSet.has(agentId)) {
      onChange(selectedIds.filter((id) => id !== agentId));
      return;
    }
    onChange([...selectedIds, agentId]);
  };

  return (
    <div
      className={[
        "aixia-messenger-participant-picker",
        expanded ? "" : "aixia-messenger-participant-picker--collapsed",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      data-testid="agentops-messenger-participant-picker"
      data-expanded={expanded ? "true" : "false"}
    >
      <div className="aixia-messenger-participant-picker__header">
        <p className="aixia-messenger-participant-picker__title">
          Talking to {count} agent{count === 1 ? "" : "s"}
        </p>
        <div className="aixia-messenger-participant-picker__actions">
          <AixiaButton
            type="button"
            variant="secondary"
            className="aixia-messenger-participant-picker__toggle-btn"
            disabled={disabled}
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? "Hide roster" : "Edit roster"}
          </AixiaButton>
          <div className="aixia-messenger-participant-picker__bulk-actions">
            <AixiaButton
              type="button"
              variant="secondary"
              className="aixia-messenger-participant-picker__action-btn"
              disabled={disabled || participants.length === 0}
              onClick={() => onChange(participants.map((item) => item.agentId))}
            >
              All team
            </AixiaButton>
            <AixiaButton
              type="button"
              variant="secondary"
              className="aixia-messenger-participant-picker__action-btn"
              disabled={disabled || selectedIds.length === 0}
              onClick={() => onChange([])}
            >
              Clear
            </AixiaButton>
          </div>
        </div>
      </div>
      <div className="aixia-messenger-participant-picker__chips">
        {participants.map((participant) => {
          const selected = selectedSet.has(participant.agentId);
          return (
            <button
              key={participant.agentId}
              type="button"
              className={[
                "aixia-messenger-participant-picker__chip",
                selected ? "aixia-messenger-participant-picker__chip--selected" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              disabled={disabled}
              onClick={() => toggleAgent(participant.agentId)}
            >
              <span>{participant.displayName}</span>
              {selected ? <AixiaBadge tone="cyan">Selected</AixiaBadge> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
