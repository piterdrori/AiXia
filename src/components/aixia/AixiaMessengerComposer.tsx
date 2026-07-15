import { useCallback, useState } from "react";
import { Mic, MicOff, Plus, Send, Square } from "lucide-react";

import type {
  AgentOpsSttPhase,
  AgentOpsSttProviderStatus,
} from "@/hooks/useAixiaVoiceChat";
import { AixiaButton } from "./AixiaButton";
import { AixiaMessengerAttachmentSheet } from "./AixiaMessengerAttachmentSheet";
import type { AixiaMessengerAttachment, AixiaMessengerComposerPreset } from "./AixiaMessengerConfig";
import { AixiaTextareaField } from "./AixiaFormFields";

export type AixiaMessengerComposerProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  disabled?: boolean;
  placeholder?: string;
  statusText?: string;
  errorText?: string | null;
  presets?: AixiaMessengerComposerPreset[];
  onPresetSelect?: (value: string) => void;
  pendingAttachments?: AixiaMessengerAttachment[];
  onAddAttachments?: (files: FileList | File[]) => void;
  onRemoveAttachment?: (attachmentId: string) => void;
  onAgentReplySpoken?: (text: string) => void;
  /** Voice controller owned by AixiaMessengerShell — do not call useAixiaVoiceChat here. */
  listening?: boolean;
  sttPhase?: AgentOpsSttPhase;
  recordingElapsedMs?: number;
  voiceStatus?: string | null;
  sttAvailable?: boolean;
  sttProvider?: AgentOpsSttProviderStatus;
  toggleMic?: (onTranscript: (transcript: string, isFinal: boolean) => void) => void;
  stopListening?: () => void;
  cancelStt?: () => void;
};

function sttProviderLabel(provider: AgentOpsSttProviderStatus | undefined, available: boolean) {
  if (!available) return "Mic unavailable";
  if (provider === "doubao") return "Mic · Doubao";
  if (provider === "browser") return "Mic · Browser fallback";
  return "Mic unavailable";
}

function sttProviderTitle(provider: AgentOpsSttProviderStatus | undefined, available: boolean) {
  if (!available) return "Speech input unavailable";
  if (provider === "doubao") return "Cloud speech recognition";
  if (provider === "browser") return "Using this browser’s built-in speech recognition";
  return "No speech recognition provider is available";
}

function formatElapsed(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function AixiaMessengerComposer({
  value,
  onChange,
  onSubmit,
  disabled = false,
  placeholder = "Type a message…",
  statusText,
  errorText,
  presets = [],
  onPresetSelect,
  pendingAttachments = [],
  onAddAttachments,
  onRemoveAttachment,
  listening = false,
  sttPhase = "idle",
  recordingElapsedMs = 0,
  voiceStatus = null,
  sttAvailable = false,
  sttProvider = "unavailable",
  toggleMic,
  stopListening,
  cancelStt,
}: AixiaMessengerComposerProps) {
  const [attachmentSheetOpen, setAttachmentSheetOpen] = useState(false);

  const canSubmit = !disabled && value.trim().length > 0;
  const processing = sttPhase === "processing" || sttPhase === "requesting";
  const recording = listening || sttPhase === "recording";

  const sendMessage = useCallback(() => {
    if (!canSubmit) return;
    stopListening?.();
    onSubmit?.();
  }, [canSubmit, onSubmit, stopListening]);

  const handleMicClick = useCallback(() => {
    if (!toggleMic || processing) return;
    toggleMic((_transcript, _isFinal) => {
      // Shell applies finals into composer.
    });
  }, [processing, toggleMic]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  };

  const micTitle = !sttAvailable
    ? "Mic unavailable — enable voice in AI Management"
    : processing
      ? "Processing speech…"
      : recording
        ? "Stop recording"
        : "Start voice input";

  return (
    <div
      className="aixia-messenger-composer"
      role="group"
      aria-label="Message composer"
      data-testid="agentops-messenger-composer"
      data-chat-composer-disabled={disabled ? "true" : "false"}
    >
      {presets.length > 0 ? (
        <div className="aixia-messenger-composer__presets">
          {presets.map((preset) => (
            <AixiaButton
              key={`${preset.label}-${preset.value}`}
              type="button"
              variant="secondary"
              className="aixia-messenger-composer__preset-btn"
              disabled={disabled}
              onClick={() => onPresetSelect?.(preset.value)}
            >
              {preset.label}
            </AixiaButton>
          ))}
        </div>
      ) : null}

      {onAddAttachments && onRemoveAttachment ? (
        <AixiaMessengerAttachmentSheet
          open={attachmentSheetOpen}
          onClose={() => setAttachmentSheetOpen(false)}
          attachments={pendingAttachments}
          onPickFiles={onAddAttachments}
          onRemoveAttachment={onRemoveAttachment}
          disabled={disabled}
        />
      ) : null}

      <div className="aixia-messenger-composer__dock">
        <AixiaButton
          type="button"
          variant="secondary"
          className={[
            "aixia-messenger-composer__mic-btn",
            recording ? "aixia-messenger-composer__mic-btn--active" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          disabled={disabled || !sttAvailable || !toggleMic || processing}
          onClick={handleMicClick}
          title={micTitle}
          aria-label={micTitle}
          aria-pressed={recording}
          data-testid="agentops-messenger-mic"
          data-stt-provider={sttProvider}
        >
          {recording ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
        </AixiaButton>

        <AixiaTextareaField
          className="aixia-messenger-composer__input"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          rows={2}
          maxLength={20000}
        />

        {onAddAttachments ? (
          <AixiaButton
            type="button"
            variant="secondary"
            className="aixia-messenger-composer__plus-btn"
            disabled={disabled}
            onClick={() => setAttachmentSheetOpen((open) => !open)}
            title="Add attachment"
          >
            <Plus className="h-5 w-5" />
          </AixiaButton>
        ) : (
          <AixiaButton
            type="button"
            variant="secondary"
            className="aixia-messenger-composer__plus-btn"
            disabled={disabled}
            title="Attachments"
          >
            <Plus className="h-5 w-5" />
          </AixiaButton>
        )}

        <AixiaButton
          type="button"
          variant="primary"
          className="aixia-messenger-composer__send-btn"
          disabled={!canSubmit}
          title="Send (Enter)"
          onClick={sendMessage}
        >
          <Send className="h-4 w-4" />
        </AixiaButton>
      </div>

      <div className="aixia-messenger-composer__meta">
        <span
          className="aixia-messenger-composer__stt-provider"
          title={sttProviderTitle(sttProvider, sttAvailable)}
          data-testid="agentops-stt-provider"
          data-stt-provider={sttAvailable ? sttProvider : "unavailable"}
        >
          {sttProviderLabel(sttProvider, sttAvailable)}
        </span>
        {recording ? (
          <span className="aixia-messenger-composer__recording" data-testid="agentops-stt-recording">
            Recording {formatElapsed(recordingElapsedMs)}
          </span>
        ) : null}
        {recording || processing ? (
          <AixiaButton
            type="button"
            variant="secondary"
            className="aixia-messenger-composer__cancel-stt"
            onClick={() => cancelStt?.()}
            aria-label="Cancel voice input"
            title="Cancel voice input"
            data-testid="agentops-stt-cancel"
          >
            <Square className="h-3.5 w-3.5" />
            <span>Cancel</span>
          </AixiaButton>
        ) : null}
        {errorText ? (
          <span className="aixia-messenger-composer__error">{errorText}</span>
        ) : voiceStatus ? (
          <span className="aixia-messenger-composer__status">{voiceStatus}</span>
        ) : statusText ? (
          <span className="aixia-messenger-composer__status">{statusText}</span>
        ) : (
          <span className="aixia-messenger-composer__hint">Enter to send · Shift+Enter for newline</span>
        )}
      </div>
    </div>
  );
}
