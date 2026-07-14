import type { ReactNode } from "react";
import { Loader2, Volume2, VolumeX } from "lucide-react";

import { AixiaButton } from "./AixiaButton";
import { AixiaMessengerModelSelect } from "./AixiaMessengerModelSelect";
import type { AgentOpsOllamaModelOption } from "@/lib/agentops/ollamaModelCatalog";

export type AixiaMessengerToolbarProps = {
  roomTitle: string;
  ttsEnabled: boolean;
  onTtsToggle: () => void;
  ttsAvailable?: boolean;
  statusText?: string;
  actions?: ReactNode;
  creativityMode?: boolean;
  onCreativityModeChange?: (enabled: boolean) => void;
  llmModelOptions?: AgentOpsOllamaModelOption[];
  selectedLlmModel?: string;
  onLlmModelChange?: (modelId: string) => void;
  onLlmModelRefresh?: () => void;
  llmModelLoading?: boolean;
  llmModelRefreshing?: boolean;
  llmInstalledCount?: number;
};

export function AixiaMessengerToolbar({
  roomTitle,
  ttsEnabled,
  onTtsToggle,
  ttsAvailable = true,
  statusText,
  actions,
  creativityMode = false,
  onCreativityModeChange,
  llmModelOptions,
  selectedLlmModel,
  onLlmModelChange,
  onLlmModelRefresh,
  llmModelLoading = false,
  llmModelRefreshing = false,
  llmInstalledCount,
}: AixiaMessengerToolbarProps) {
  const ariaLabel = ttsEnabled ? "Turn text-to-speech off" : "Turn text-to-speech on";
  const title = !ttsAvailable
    ? ttsEnabled
      ? "TTS On — browser speech unavailable (preference kept on)"
      : "TTS unavailable — enable voice in AI Management"
    : ttsEnabled
      ? "TTS On"
      : "TTS Off";

  return (
    <header className="aixia-messenger-toolbar" data-testid="agentops-messenger-toolbar">
      <div className="aixia-messenger-toolbar__left">
        <AixiaButton
          type="button"
          variant="secondary"
          className="aixia-messenger-toolbar__tts-btn"
          onClick={onTtsToggle}
          aria-pressed={ttsEnabled}
          aria-label={ariaLabel}
          title={title}
        >
          {ttsEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          <span className="aixia-messenger-toolbar__tts-label">
            {ttsEnabled ? "TTS On" : "TTS Off"}
          </span>
          {ttsEnabled && !ttsAvailable ? (
            <span className="aixia-messenger-toolbar__tts-unavailable" aria-live="polite">
              Unavailable
            </span>
          ) : null}
        </AixiaButton>
        <div className="aixia-messenger-toolbar__title-wrap">
          <h3 className="aixia-messenger-toolbar__title">{roomTitle}</h3>
          {statusText ? <p className="aixia-messenger-toolbar__status">{statusText}</p> : null}
        </div>
      </div>
      <div className="aixia-messenger-toolbar__right">
        {onLlmModelChange && selectedLlmModel && llmModelOptions?.length ? (
          <AixiaMessengerModelSelect
            models={llmModelOptions}
            value={selectedLlmModel}
            onChange={onLlmModelChange}
            onRefresh={onLlmModelRefresh}
            loading={llmModelLoading}
            refreshing={llmModelRefreshing}
            installedCount={llmInstalledCount}
          />
        ) : null}
        {onCreativityModeChange ? (
          <AixiaButton
            type="button"
            variant={creativityMode ? "primary" : "secondary"}
            className="aixia-messenger-toolbar__creativity-btn"
            onClick={() => onCreativityModeChange(!creativityMode)}
          >
            Hunt for problems
          </AixiaButton>
        ) : null}
        {actions}
      </div>
    </header>
  );
}

export function AixiaMessengerTypingIndicator({ label = "Thinking…" }: { label?: string }) {
  return (
    <div className="aixia-messenger-typing" data-testid="agentops-messenger-typing">
      <Loader2 className="h-4 w-4 animate-spin" />
      <span>{label}</span>
    </div>
  );
}
