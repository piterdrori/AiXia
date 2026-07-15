import type { ReactNode } from "react";
import { Loader2, Square, Volume2, VolumeX } from "lucide-react";

import { AixiaButton } from "./AixiaButton";
import { AixiaMessengerModelSelect } from "./AixiaMessengerModelSelect";
import type { AgentOpsOllamaModelOption } from "@/lib/agentops/ollamaModelCatalog";
import type { AgentOpsTtsProviderStatus } from "@/lib/agentops/voice/agentOpsTtsProviders";

export type AixiaMessengerToolbarProps = {
  roomTitle: string;
  hideRoomTitle?: boolean;
  ttsEnabled: boolean;
  onTtsToggle: () => void;
  ttsAvailable?: boolean;
  ttsProvider?: AgentOpsTtsProviderStatus;
  isSpeaking?: boolean;
  onStopSpeech?: () => void;
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

function providerLabel(provider: AgentOpsTtsProviderStatus | undefined, ttsEnabled: boolean) {
  if (!ttsEnabled) return null;
  if (provider === "doubao") return "Doubao";
  if (provider === "browser") return "Browser fallback";
  return "Unavailable";
}

function providerTitle(provider: AgentOpsTtsProviderStatus | undefined, ttsEnabled: boolean) {
  if (!ttsEnabled) return undefined;
  if (provider === "doubao") return "Cloud text-to-speech";
  if (provider === "browser") return "Using this browser’s built-in voice";
  return "Text-to-speech is enabled, but no voice provider is available.";
}

export function AixiaMessengerToolbar({
  roomTitle,
  hideRoomTitle = false,
  ttsEnabled,
  onTtsToggle,
  ttsAvailable = true,
  ttsProvider = "unavailable",
  isSpeaking = false,
  onStopSpeech,
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
      ? "TTS On — no voice provider available (preference kept on)"
      : "TTS unavailable — enable voice in AI Management"
    : ttsEnabled
      ? "TTS On"
      : "TTS Off";
  const provider = providerLabel(ttsProvider, ttsEnabled);

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
        </AixiaButton>
        {provider ? (
          <span
            className="aixia-messenger-toolbar__tts-provider"
            title={providerTitle(ttsProvider, ttsEnabled)}
            data-testid="agentops-tts-provider"
            data-tts-provider={ttsProvider}
          >
            {provider}
          </span>
        ) : null}
        {isSpeaking && onStopSpeech ? (
          <AixiaButton
            type="button"
            variant="secondary"
            className="aixia-messenger-toolbar__stop-btn"
            onClick={onStopSpeech}
            aria-label="Stop speaking"
            title="Stop current speech"
            data-testid="agentops-tts-stop"
          >
            <Square className="h-3.5 w-3.5" />
            <span>Stop</span>
          </AixiaButton>
        ) : null}
        <div className="aixia-messenger-toolbar__title-wrap">
          {hideRoomTitle ? (
            <h3 className="sr-only">{roomTitle}</h3>
          ) : (
            <h3 className="aixia-messenger-toolbar__title">{roomTitle}</h3>
          )}
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
