import { useEffect, useLayoutEffect, useRef } from "react";
import { MessageSquareText } from "lucide-react";

import { useAixiaVoiceChat } from "@/hooks/useAixiaVoiceChat";
import {
  seedAgentOpsTtsHistoryMessageIds,
  selectNextAgentOpsTtsSpeakCandidate,
} from "@/lib/agentops/agentOpsMessengerTtsEligibility";
import { AixiaChatMessage } from "./AixiaChatMessage";
import { AixiaChatParticipantPicker } from "./AixiaChatParticipantPicker";
import { AixiaEmptyState } from "./AixiaEmptyState";
import { AixiaMessengerComposer } from "./AixiaMessengerComposer";
import type { AixiaMessengerShellProps } from "./AixiaMessengerConfig";
import { AixiaMessengerToolbar, AixiaMessengerTypingIndicator } from "./AixiaMessengerToolbar";

function initialsFromName(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .slice(0, 2)
      .join("") || "AG"
  );
}

export function AixiaMessengerShell({
  roomTitle,
  chatScope,
  showParticipantPicker = false,
  testId = "agentops-messenger-shell",
  layoutMode = "default",
  messages,
  composerValue,
  onComposerChange,
  onSend,
  sending = false,
  statusText,
  errorText,
  emptyTitle = "No messages yet",
  emptyDescription = "Start the conversation when you are ready.",
  participants = [],
  selectedParticipantIds = [],
  onSelectedParticipantIdsChange,
  pendingAttachments = [],
  onAddAttachments,
  onRemoveAttachment,
  composerPresets = [],
  onPresetSelect,
  toolbarActions,
  creativityMode = false,
  onCreativityModeChange,
  showTypingIndicator = false,
  typingLabel = "Thinking…",
  className = "",
  llmModelOptions,
  selectedLlmModel,
  onLlmModelChange,
  onLlmModelRefresh,
  llmModelLoading = false,
  llmModelRefreshing = false,
  llmInstalledCount,
}: AixiaMessengerShellProps) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const dockRef = useRef<HTMLDivElement | null>(null);
  const historySeededRef = useRef(false);
  const handledMessageIdsRef = useRef<Set<string>>(new Set());
  const composerValueRef = useRef(composerValue);
  const sttBaselineRef = useRef("");
  const scrollRafRef = useRef<number | null>(null);
  composerValueRef.current = composerValue;

  const voice = useAixiaVoiceChat();
  const {
    ttsEnabled,
    toggleTts,
    ttsAvailable,
    ttsProvider,
    isSpeaking,
    speakAgentMessage,
    stopVoiceOutput,
    listening,
    sttPhase,
    recordingElapsedMs,
    voiceStatus,
    sttAvailable,
    sttProvider,
    toggleMic,
    stopListening,
    cancelStt,
    appendTranscript,
  } = voice;

  useLayoutEffect(() => {
    // Mount-once only — do not re-scroll the page when message batches arrive.
    const dock = dockRef.current;
    if (!dock) return;
    const frame = requestAnimationFrame(() => {
      dock.scrollIntoView({ block: "nearest", inline: "nearest" });
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const node = viewportRef.current;
    if (!node) return;
    if (scrollRafRef.current != null) {
      cancelAnimationFrame(scrollRafRef.current);
    }
    scrollRafRef.current = requestAnimationFrame(() => {
      scrollRafRef.current = null;
      node.scrollTop = node.scrollHeight;
    });
    return () => {
      if (scrollRafRef.current != null) {
        cancelAnimationFrame(scrollRafRef.current);
        scrollRafRef.current = null;
      }
    };
  }, [messages, showTypingIndicator]);

  // Seed historical IDs while the shell is still in its initial load (`sending` includes
  // history fetch on Agent/Council/Finding cards). Never auto-speak the seeded baseline.
  useEffect(() => {
    if (!historySeededRef.current) {
      seedAgentOpsTtsHistoryMessageIds(messages, handledMessageIdsRef.current);
      if (!sending) {
        historySeededRef.current = true;
      }
      return;
    }

    const candidate = selectNextAgentOpsTtsSpeakCandidate(
      messages,
      handledMessageIdsRef.current,
    );
    if (!candidate) return;

    // Mark handled even when STT is busy so we never replay these later.
    handledMessageIdsRef.current.add(candidate.messageId);

    if (!ttsEnabled) return;
    if (listening || sttPhase === "recording" || sttPhase === "processing" || sttPhase === "requesting") {
      return;
    }
    void speakAgentMessage(candidate.content, candidate.messageId);
  }, [listening, messages, sending, speakAgentMessage, sttPhase, ttsEnabled]);

  // Turning TTS ON must not replay the last existing response.
  const handleTtsToggle = () => {
    const next = !ttsEnabled;
    if (!next) {
      stopVoiceOutput();
    } else {
      seedAgentOpsTtsHistoryMessageIds(messages, handledMessageIdsRef.current);
    }
    toggleTts();
  };

  const handleMic = (onTranscript: (transcript: string, isFinal: boolean) => void) => {
    if (!listening && sttPhase === "idle") {
      sttBaselineRef.current = composerValueRef.current;
    }
    toggleMic((transcript, isFinal) => {
      // Commit finals only — never auto-send; owner reviews in composer.
      if (isFinal) {
        onComposerChange(appendTranscript(sttBaselineRef.current, transcript));
      }
      onTranscript(transcript, isFinal);
    });
  };

  const shellClassName = [
    "aixia-messenger-shell",
    layoutMode === "embedded" ? "aixia-messenger-shell--embedded" : "",
    layoutMode === "full" ? "aixia-messenger-shell--full" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <section
      className={shellClassName}
      data-testid={testId}
      data-chat-scope={chatScope}
      data-messenger-layout={layoutMode}
    >
      <AixiaMessengerToolbar
        roomTitle={roomTitle}
        ttsEnabled={ttsEnabled}
        onTtsToggle={handleTtsToggle}
        ttsAvailable={ttsAvailable}
        ttsProvider={ttsProvider}
        isSpeaking={isSpeaking}
        onStopSpeech={stopVoiceOutput}
        statusText={voiceStatus ?? statusText}
        actions={toolbarActions}
        creativityMode={creativityMode}
        onCreativityModeChange={onCreativityModeChange}
        llmModelOptions={llmModelOptions}
        selectedLlmModel={selectedLlmModel}
        onLlmModelChange={onLlmModelChange}
        onLlmModelRefresh={onLlmModelRefresh}
        llmModelLoading={llmModelLoading}
        llmModelRefreshing={llmModelRefreshing}
        llmInstalledCount={llmInstalledCount}
      />

      <div ref={viewportRef} className="aixia-messenger-shell__viewport" data-testid="agentops-messenger-viewport">
        {messages.length === 0 && !showTypingIndicator ? (
          <AixiaEmptyState
            icon={MessageSquareText}
            title={emptyTitle}
            description={emptyDescription}
            className="aixia-messenger-shell__empty"
          />
        ) : (
          <div className="aixia-messenger-shell__messages">
            {messages.map((message) => (
              <AixiaChatMessage
                key={message.id}
                senderName={message.senderName}
                senderRole={message.senderRole}
                senderType={message.senderType}
                avatarInitials={message.avatarInitials ?? initialsFromName(message.senderName)}
                badges={message.badges}
                footer={message.footer}
                planned={message.planned}
                attachments={message.attachments}
              >
                {message.content}
              </AixiaChatMessage>
            ))}
            {showTypingIndicator ? <AixiaMessengerTypingIndicator label={typingLabel} /> : null}
          </div>
        )}
      </div>

      <div
        ref={dockRef}
        className="aixia-messenger-shell__dock"
        data-testid="agentops-messenger-dock"
      >
        {showParticipantPicker && onSelectedParticipantIdsChange ? (
          <AixiaChatParticipantPicker
            participants={participants}
            selectedIds={selectedParticipantIds}
            onChange={onSelectedParticipantIdsChange}
            disabled={sending}
          />
        ) : null}
        <AixiaMessengerComposer
          value={composerValue}
          onChange={onComposerChange}
          onSubmit={onSend}
          disabled={sending}
          placeholder="Type a message…"
          errorText={errorText}
          presets={composerPresets}
          onPresetSelect={onPresetSelect}
          pendingAttachments={pendingAttachments}
          onAddAttachments={onAddAttachments}
          onRemoveAttachment={onRemoveAttachment}
          listening={listening}
          sttPhase={sttPhase}
          recordingElapsedMs={recordingElapsedMs}
          voiceStatus={voiceStatus}
          sttAvailable={sttAvailable}
          sttProvider={sttProvider}
          toggleMic={handleMic}
          stopListening={stopListening}
          cancelStt={cancelStt}
        />
      </div>
    </section>
  );
}
