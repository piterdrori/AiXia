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

  const voice = useAixiaVoiceChat();
  const {
    ttsEnabled,
    toggleTts,
    ttsAvailable,
    speakAgentMessage,
    stopVoiceOutput,
    listening,
    voiceStatus,
    sttAvailable,
    toggleMic,
    stopListening,
  } = voice;

  useLayoutEffect(() => {
    const dock = dockRef.current;
    if (!dock) return;
    requestAnimationFrame(() => {
      dock.scrollIntoView({ block: "end", inline: "nearest" });
    });
  }, []);

  useEffect(() => {
    const node = viewportRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
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

    handledMessageIdsRef.current.add(candidate.messageId);

    if (!ttsEnabled) return;
    speakAgentMessage(candidate.content);
  }, [messages, sending, speakAgentMessage, ttsEnabled]);

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

  const shellClassName = ["aixia-messenger-shell", className].filter(Boolean).join(" ");

  return (
    <section className={shellClassName} data-testid={testId} data-chat-scope={chatScope}>
      <AixiaMessengerToolbar
        roomTitle={roomTitle}
        ttsEnabled={ttsEnabled}
        onTtsToggle={handleTtsToggle}
        ttsAvailable={ttsAvailable}
        statusText={statusText}
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
          voiceStatus={voiceStatus}
          sttAvailable={sttAvailable}
          toggleMic={toggleMic}
          stopListening={stopListening}
        />
      </div>
    </section>
  );
}
