import type { ReactNode } from "react";

import { AixiaActionSystem } from "./AixiaActionSystem";
import { AixiaButton } from "./AixiaButton";
import { AixiaTextareaField } from "./AixiaFormFields";

export type AixiaChatComposerPreset = {
  label: string;
  value: string;
};

export type AixiaChatComposerProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
  disabled?: boolean;
  submitLabel?: string;
  helperText?: string;
  statusText?: string;
  minRows?: number;
  maxRows?: number;
  presets?: AixiaChatComposerPreset[];
  onPresetSelect?: (value: string) => void;
  leftAccessory?: ReactNode;
  rightAccessory?: ReactNode;
  className?: string;
};

export function AixiaChatComposer({
  value,
  onChange,
  onSubmit,
  placeholder = "Type your message...",
  disabled = false,
  submitLabel = "Send",
  helperText,
  statusText,
  minRows = 3,
  maxRows = 8,
  presets = [],
  onPresetSelect,
  leftAccessory,
  rightAccessory,
  className = "",
}: AixiaChatComposerProps) {
  const canSubmit = !disabled && value.trim().length > 0;

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;
    onSubmit?.();
  };

  const composerClassName = [
    "aixia-chat-composer",
    disabled ? "aixia-chat-composer--disabled" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <form
      className={composerClassName}
      onSubmit={handleSubmit}
      data-chat-composer-disabled={disabled ? "true" : "false"}
    >
      {presets.length > 0 ? (
        <div className="aixia-chat-composer__presets">
          {presets.map((preset) => (
            <AixiaButton
              key={`${preset.label}-${preset.value}`}
              type="button"
              variant="secondary"
              className="aixia-chat-composer__preset-btn"
              onClick={() => onPresetSelect?.(preset.value)}
              disabled={disabled}
            >
              {preset.label}
            </AixiaButton>
          ))}
        </div>
      ) : null}

      <div className="aixia-chat-composer__input-wrap">
        {leftAccessory ? (
          <div className="aixia-chat-composer__accessory aixia-chat-composer__accessory--left">
            {leftAccessory}
          </div>
        ) : null}

        <AixiaTextareaField
          className="aixia-chat-composer__input"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          minLength={0}
          maxLength={20000}
          disabled={disabled}
          rows={minRows}
          style={{ maxHeight: `${maxRows * 2.25}rem` }}
        />

        {rightAccessory ? (
          <div className="aixia-chat-composer__accessory aixia-chat-composer__accessory--right">
            {rightAccessory}
          </div>
        ) : null}
      </div>

      <AixiaActionSystem
        align="between"
        density="compact"
        className="aixia-chat-composer__actions"
      >
        <div className="aixia-chat-composer__hints">
          {helperText ? (
            <span className="aixia-chat-composer__helper-text">{helperText}</span>
          ) : null}
          {statusText ? (
            <span className="aixia-chat-composer__status-text">{statusText}</span>
          ) : null}
        </div>

        <AixiaButton type="submit" variant="primary" disabled={!canSubmit}>
          {submitLabel}
        </AixiaButton>
      </AixiaActionSystem>
    </form>
  );
}
