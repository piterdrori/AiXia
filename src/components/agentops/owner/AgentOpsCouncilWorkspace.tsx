/**
 * Phase A.3 — conversational Council workspace.
 * Left: conversation + overview + selected agent detail.
 * Right: compact agent status panel. Composer dock is fixed.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Clock3,
  Expand,
  ExternalLink,
  History,
  MessageSquare,
  Users,
  Volume2,
  X,
} from "lucide-react";

import {
  AixiaButton,
  AixiaChatParticipantPicker,
  AixiaMessengerComposer,
} from "@/components/aixia";
import { AgentOpsCouncilAgentPanelRow } from "@/components/agentops/owner/AgentOpsCouncilAgentPanelRow";
import { useAixiaVoiceChat } from "@/hooks/useAixiaVoiceChat";
import type { CouncilAgentReplyView, CouncilTurnView } from "@/lib/agentops/council/councilTurnModel";
import { priorCouncilTurns } from "@/lib/agentops/council/councilTurnModel";

export type CouncilRosterMode = "canonical" | "custom";

type Participant = {
  agentId: string;
  displayName: string;
  appRole: string;
  qaSpecialty: string;
  status: string;
};

type AgentOpsCouncilWorkspaceProps = {
  density?: "embedded" | "full";
  testId?: string;
  turns: CouncilTurnView[];
  latestTurn: CouncilTurnView | null;
  inFlightQuestion?: string | null;
  rosterMode: CouncilRosterMode;
  onRosterModeChange: (mode: CouncilRosterMode) => void;
  participants: Participant[];
  selectedParticipantIds: string[];
  onSelectedParticipantIdsChange: (ids: string[]) => void;
  composerValue: string;
  onComposerChange: (value: string) => void;
  onSend: () => void;
  sending?: boolean;
  errorText?: string | null;
  statusText?: string;
};

function buildPendingReplies(
  selectedParticipantIds: string[],
  participants: Participant[],
): CouncilAgentReplyView[] {
  return selectedParticipantIds.map((agentId) => {
    const participant = participants.find((item) => item.agentId === agentId);
    return {
      messageId: `pending-${agentId}`,
      agentId,
      agentName: participant?.displayName ?? agentId,
      jobTitle: participant?.appRole ?? null,
      content: "",
      preview: "Waiting…",
      createdAt: new Date().toISOString(),
      source: "owner" as const,
      status: "pending" as const,
      skippedAsNonConversational: false,
    };
  });
}

export function AgentOpsCouncilWorkspace({
  density = "embedded",
  testId = "agentops-agents-council-messenger",
  turns,
  latestTurn,
  inFlightQuestion = null,
  rosterMode,
  onRosterModeChange,
  participants,
  selectedParticipantIds,
  onSelectedParticipantIdsChange,
  composerValue,
  onComposerChange,
  onSend,
  sending = false,
  errorText = null,
}: AgentOpsCouncilWorkspaceProps) {
  const navigate = useNavigate();
  const voice = useAixiaVoiceChat();
  const [rosterOpen, setRosterOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [agentsPanelOpen, setAgentsPanelOpen] = useState(false);
  const [selectedReplyId, setSelectedReplyId] = useState<string | null>(null);
  const [viewingHistoryTurnId, setViewingHistoryTurnId] = useState<string | null>(null);
  const composerRef = useRef(composerValue);
  const sttBaselineRef = useRef("");
  composerRef.current = composerValue;

  const history = useMemo(() => priorCouncilTurns(turns), [turns]);

  const activeTurn = useMemo(() => {
    if (viewingHistoryTurnId) {
      return turns.find((turn) => turn.turnId === viewingHistoryTurnId) ?? latestTurn;
    }
    return latestTurn;
  }, [latestTurn, turns, viewingHistoryTurnId]);

  const panelReplies = useMemo(() => {
    if (sending && inFlightQuestion && !viewingHistoryTurnId) {
      return buildPendingReplies(selectedParticipantIds, participants);
    }
    return activeTurn?.replies ?? [];
  }, [
    activeTurn?.replies,
    inFlightQuestion,
    participants,
    selectedParticipantIds,
    sending,
    viewingHistoryTurnId,
  ]);

  const selectedReply = useMemo(
    () => panelReplies.find((reply) => reply.messageId === selectedReplyId) ?? null,
    [panelReplies, selectedReplyId],
  );

  useEffect(() => {
    setSelectedReplyId(null);
  }, [activeTurn?.turnId, sending]);

  const progressCompact = sending
    ? `0/${selectedParticipantIds.length}`
    : activeTurn
      ? `${activeTurn.repliedCount}/${Math.max(activeTurn.requestedCount, activeTurn.repliedCount)}`
      : `0/${selectedParticipantIds.length}`;

  const progressLabel = sending
    ? `Running · ${progressCompact} replied`
    : activeTurn
      ? `${progressCompact} replied`
      : `${selectedParticipantIds.length} agents`;

  const questionText =
    sending && inFlightQuestion && !viewingHistoryTurnId
      ? inFlightQuestion
      : activeTurn?.question ?? null;

  const showEmpty = !questionText && !sending;

  return (
    <section
      className={[
        "agentops-council-workspace",
        "agentops-council-workspace--chat",
        density === "embedded"
          ? "agentops-council-workspace--embedded"
          : "agentops-council-workspace--full",
      ].join(" ")}
      data-testid={testId}
      data-messenger-layout={density === "embedded" ? "embedded" : "full"}
      data-roster-mode={rosterMode}
      data-phase="a3"
    >
      <header className="agentops-council-workspace__toolbar" data-testid="agentops-council-toolbar">
        <div className="agentops-council-workspace__toolbar-left">
          <span className="agentops-council-workspace__title">Council Chat</span>
          <div
            className="agentops-council-workspace__roster-mode"
            role="tablist"
            aria-label="Council roster"
          >
            <button
              type="button"
              role="tab"
              aria-selected={rosterMode === "canonical"}
              className={
                rosterMode === "canonical"
                  ? "agentops-council-workspace__mode-btn is-active"
                  : "agentops-council-workspace__mode-btn"
              }
              onClick={() => onRosterModeChange("canonical")}
              disabled={sending}
            >
              AgentOps Council
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={rosterMode === "custom"}
              className={
                rosterMode === "custom"
                  ? "agentops-council-workspace__mode-btn is-active"
                  : "agentops-council-workspace__mode-btn"
              }
              onClick={() => onRosterModeChange("custom")}
              disabled={sending}
            >
              Custom
            </button>
          </div>
          <span
            className="agentops-council-workspace__progress"
            data-testid="agentops-council-progress"
          >
            {progressLabel}
          </span>
        </div>

        <div className="agentops-council-workspace__toolbar-right">
          <AixiaButton
            type="button"
            variant="secondary"
            className="text-xs px-2.5 py-1"
            onClick={() => {
              if (voice.ttsEnabled) voice.stopVoiceOutput();
              voice.toggleTts();
            }}
            aria-label={voice.ttsEnabled ? "Turn text-to-speech off" : "Turn text-to-speech on"}
          >
            TTS {voice.ttsEnabled ? "On" : "Off"}
            {voice.ttsProvider ? ` · ${voice.ttsProvider}` : ""}
          </AixiaButton>
          {voice.isSpeaking ? (
            <AixiaButton
              type="button"
              variant="secondary"
              className="text-xs px-2.5 py-1"
              onClick={voice.stopVoiceOutput}
              data-testid="agentops-tts-stop"
            >
              Stop
            </AixiaButton>
          ) : null}
          <AixiaButton
            type="button"
            variant="secondary"
            className="text-xs px-2.5 py-1"
            onClick={() => setHistoryOpen((value) => !value)}
            data-testid="agentops-council-history-toggle"
          >
            <History className="mr-1 h-3.5 w-3.5" aria-hidden />
            History
            {history.length > 0 ? ` (${history.length})` : ""}
          </AixiaButton>
          <AixiaButton
            type="button"
            variant="secondary"
            className="text-xs px-2.5 py-1"
            disabled={sending}
            onClick={() => setRosterOpen((value) => !value)}
          >
            <Users className="mr-1 h-3.5 w-3.5" aria-hidden />
            {rosterOpen ? "Hide roster" : "Edit roster"}
          </AixiaButton>
          <AixiaButton
            type="button"
            variant="secondary"
            className="text-xs px-2.5 py-1 agentops-council-workspace__agents-mobile"
            onClick={() => setAgentsPanelOpen(true)}
            data-testid="agentops-council-agents-sheet-open"
          >
            {panelReplies.length || selectedParticipantIds.length} responses
          </AixiaButton>
          <AixiaButton
            type="button"
            variant="secondary"
            className="text-xs px-2.5 py-1"
            onClick={() => navigate("/system/agent-ops/council")}
          >
            <Expand className="mr-1 h-3.5 w-3.5" aria-hidden />
            Full
          </AixiaButton>
        </div>
      </header>

      {historyOpen ? (
        <div
          className="agentops-council-workspace__history-drawer"
          data-testid="agentops-council-history-drawer"
        >
          <div className="agentops-council-workspace__history-drawer-head">
            <span>Earlier questions</span>
            <button
              type="button"
              className="agentops-council-workspace__icon-btn"
              onClick={() => setHistoryOpen(false)}
              aria-label="Close history"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          {history.length === 0 ? (
            <p className="agentops-council-workspace__history-empty">No earlier Council turns yet.</p>
          ) : (
            <ul className="agentops-council-workspace__history-list">
              {history.map((turn) => (
                <li key={turn.turnId}>
                  <button
                    type="button"
                    className={
                      viewingHistoryTurnId === turn.turnId
                        ? "agentops-council-workspace__history-item is-active"
                        : "agentops-council-workspace__history-item"
                    }
                    onClick={() => {
                      setViewingHistoryTurnId(turn.turnId);
                      setHistoryOpen(false);
                      setSelectedReplyId(null);
                    }}
                  >
                    <span className="agentops-council-workspace__history-q">{turn.question}</span>
                    <span className="agentops-council-workspace__history-meta">
                      <Clock3 className="h-3 w-3" aria-hidden />
                      {turn.createdAt ? new Date(turn.createdAt).toLocaleString() : "—"}
                      {" · "}
                      {turn.repliedCount}/{Math.max(turn.requestedCount, turn.repliedCount)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {viewingHistoryTurnId ? (
            <AixiaButton
              type="button"
              variant="secondary"
              className="text-xs mt-2"
              onClick={() => setViewingHistoryTurnId(null)}
            >
              Back to latest
            </AixiaButton>
          ) : null}
        </div>
      ) : null}

      <div className="agentops-council-workspace__body" data-testid="agentops-messenger-viewport">
        <div className="agentops-council-workspace__conversation" data-testid="agentops-council-conversation">
          {showEmpty ? (
            <div className="agentops-council-workspace__empty">
              <MessageSquare className="h-7 w-7 text-white/35" aria-hidden />
              <p className="text-sm font-medium text-white/85">Ask the Council</p>
              <p className="text-xs text-white/55">
                One question. Overview on the left. Agents on the right. Composer stays here.
              </p>
            </div>
          ) : null}

          {questionText ? (
            <article
              className="agentops-council-msg agentops-council-msg--owner"
              data-testid="agentops-council-turn"
              data-turn-id={activeTurn?.turnId ?? "inflight"}
            >
              <p className="agentops-council-msg__label">You</p>
              <p className="agentops-council-msg__text">{questionText}</p>
            </article>
          ) : null}

          {sending && inFlightQuestion && !viewingHistoryTurnId ? (
            <div
              className="agentops-council-msg agentops-council-msg--system"
              data-testid="agentops-council-inflight"
            >
              <p className="agentops-council-msg__text">
                Council agents are responding… {progressLabel}
              </p>
            </div>
          ) : null}

          {activeTurn && !sending ? (
            <article
              className="agentops-council-overview"
              data-testid="agentops-council-turn-summary"
            >
              <p className="agentops-council-overview__title">Council overview</p>
              <p className="agentops-council-overview__sub">
                Generated from the individual agent responses.
              </p>
              <p className="agentops-council-overview__text">{activeTurn.summary}</p>
              {activeTurn.agreements.length > 0 ? (
                <div className="agentops-council-overview__block">
                  <p className="agentops-council-overview__heading">Agreements</p>
                  <ul>
                    {activeTurn.agreements.slice(0, 2).map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {activeTurn.disagreements.length > 0 ? (
                <div className="agentops-council-overview__block">
                  <p className="agentops-council-overview__heading">Different viewpoints</p>
                  <ul>
                    {activeTurn.disagreements.slice(0, 2).map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {activeTurn.recommendedNextStep ? (
                <p className="agentops-council-overview__next">
                  Suggested next: {activeTurn.recommendedNextStep}
                </p>
              ) : null}
            </article>
          ) : null}

          {selectedReply && selectedReply.status === "replied" ? (
            <article
              className="agentops-council-msg agentops-council-msg--agent"
              data-testid="agentops-council-selected-response"
              data-agent-id={selectedReply.agentId ?? undefined}
            >
              <div className="agentops-council-msg__agent-head">
                <p className="agentops-council-msg__label">{selectedReply.agentName}</p>
                {selectedReply.jobTitle ? (
                  <p className="agentops-council-msg__role">{selectedReply.jobTitle}</p>
                ) : null}
              </div>
              <p className="agentops-council-msg__full">{selectedReply.content}</p>
              <div className="agentops-council-msg__actions">
                {selectedReply.content && voice.ttsEnabled ? (
                  voice.isSpeaking ? (
                    <AixiaButton
                      type="button"
                      variant="secondary"
                      className="text-xs px-2.5 py-1"
                      onClick={voice.stopVoiceOutput}
                      data-testid="agentops-tts-stop"
                    >
                      Stop
                    </AixiaButton>
                  ) : (
                    <AixiaButton
                      type="button"
                      variant="secondary"
                      className="text-xs px-2.5 py-1"
                      onClick={() =>
                        void voice.speakAgentMessage(selectedReply.content, selectedReply.messageId)
                      }
                    >
                      <Volume2 className="mr-1 h-3.5 w-3.5" aria-hidden />
                      Speak
                    </AixiaButton>
                  )
                ) : null}
                {selectedReply.agentId ? (
                  <AixiaButton
                    type="button"
                    variant="secondary"
                    className="text-xs px-2.5 py-1"
                    onClick={() =>
                      navigate(
                        `/system/agent-ops/agents/${encodeURIComponent(selectedReply.agentId!)}`,
                      )
                    }
                  >
                    <ExternalLink className="mr-1 h-3.5 w-3.5" aria-hidden />
                    Open agent
                  </AixiaButton>
                ) : null}
                <AixiaButton
                  type="button"
                  variant="secondary"
                  className="text-xs px-2.5 py-1"
                  onClick={() => {
                    const prompt = `Follow-up for ${selectedReply.agentName}: `;
                    onComposerChange(
                      composerValue.trim() ? `${composerValue.trim()}\n${prompt}` : prompt,
                    );
                  }}
                >
                  Ask follow-up
                </AixiaButton>
              </div>
            </article>
          ) : activeTurn && !sending && !selectedReply ? (
            <p className="agentops-council-workspace__hint">
              Select an agent on the right to read their full response.
            </p>
          ) : null}
        </div>

        <aside
          className={[
            "agentops-council-workspace__agents",
            agentsPanelOpen ? "is-open" : "",
          ].join(" ")}
          data-testid="agentops-council-agents-panel"
        >
          <div className="agentops-council-workspace__agents-head">
            <span>Agents</span>
            <button
              type="button"
              className="agentops-council-workspace__icon-btn agentops-council-workspace__agents-close"
              onClick={() => setAgentsPanelOpen(false)}
              aria-label="Close agent list"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="agentops-council-workspace__agents-list">
            {panelReplies.length === 0
              ? selectedParticipantIds.map((agentId) => {
                  const participant = participants.find((item) => item.agentId === agentId);
                  const stub: CouncilAgentReplyView = {
                    messageId: `idle-${agentId}`,
                    agentId,
                    agentName: participant?.displayName ?? agentId,
                    jobTitle: participant?.appRole ?? null,
                    content: "",
                    preview: "Not asked yet",
                    createdAt: "",
                    source: "owner",
                    status: "unavailable",
                    skippedAsNonConversational: false,
                  };
                  return (
                    <AgentOpsCouncilAgentPanelRow
                      key={stub.messageId}
                      reply={stub}
                      selected={false}
                      onSelect={() => undefined}
                    />
                  );
                })
              : panelReplies.map((reply) => (
                  <AgentOpsCouncilAgentPanelRow
                    key={reply.messageId}
                    reply={reply}
                    selected={selectedReplyId === reply.messageId}
                    onSelect={() => {
                      setSelectedReplyId(reply.messageId);
                      setAgentsPanelOpen(false);
                    }}
                  />
                ))}
          </div>
        </aside>
        {agentsPanelOpen ? (
          <button
            type="button"
            className="agentops-council-workspace__agents-backdrop"
            aria-label="Close agent panel"
            onClick={() => setAgentsPanelOpen(false)}
          />
        ) : null}
      </div>

      <div className="agentops-council-workspace__dock" data-testid="agentops-messenger-dock">
        {rosterOpen ? (
          <AixiaChatParticipantPicker
            participants={participants}
            selectedIds={selectedParticipantIds}
            onChange={onSelectedParticipantIdsChange}
            disabled={sending}
            expanded={rosterOpen}
            onExpandedChange={setRosterOpen}
          />
        ) : null}
        <AixiaMessengerComposer
          value={composerValue}
          onChange={onComposerChange}
          onSubmit={onSend}
          disabled={sending}
          placeholder="Ask all selected agents…"
          errorText={errorText}
          listening={voice.listening}
          sttPhase={voice.sttPhase}
          recordingElapsedMs={voice.recordingElapsedMs}
          voiceStatus={null}
          sttAvailable={voice.sttAvailable}
          sttProvider={voice.sttProvider}
          toggleMic={(onTranscript) => {
            if (voice.sttPhase === "idle" && !voice.listening) {
              sttBaselineRef.current = composerRef.current;
            }
            voice.toggleMic((transcript, isFinal) => {
              if (isFinal) {
                onComposerChange(voice.appendTranscript(sttBaselineRef.current, transcript));
              }
              onTranscript(transcript, isFinal);
            });
          }}
          stopListening={voice.stopListening}
          cancelStt={voice.cancelStt}
        />
      </div>
    </section>
  );
}
