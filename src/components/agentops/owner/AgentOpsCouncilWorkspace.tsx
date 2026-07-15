import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronRight, Expand, MessageSquare, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";

import {
  AixiaButton,
  AixiaChatParticipantPicker,
  AixiaMessengerComposer,
  AixiaMessengerToolbar,
} from "@/components/aixia";
import { AgentOpsCouncilAgentResponseRow } from "@/components/agentops/owner/AgentOpsCouncilAgentResponseRow";
import { useAixiaVoiceChat } from "@/hooks/useAixiaVoiceChat";
import type { CouncilTurnView } from "@/lib/agentops/council/councilTurnModel";
import { priorCouncilTurns } from "@/lib/agentops/council/councilTurnModel";

export type CouncilRosterMode = "canonical" | "custom";

type Participant = {
  agentId: string;
  displayName: string;
  appRole: string;
  qaSpecialty: string;
  status: string;
};

type VoiceApi = ReturnType<typeof useAixiaVoiceChat>;

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

function TurnSummaryCard({
  turn,
  defaultExpanded,
  voice,
}: {
  turn: CouncilTurnView;
  defaultExpanded: boolean;
  voice: VoiceApi;
}) {
  const [open, setOpen] = useState(defaultExpanded);
  const [expandedReplyId, setExpandedReplyId] = useState<string | null>(null);

  useEffect(() => {
    setOpen(defaultExpanded);
    setExpandedReplyId(null);
  }, [turn.turnId, defaultExpanded]);

  return (
    <article
      className="agentops-council-turn"
      data-testid="agentops-council-turn"
      data-turn-id={turn.turnId}
    >
      <button
        type="button"
        className="agentops-council-turn__toggle"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        <span className="agentops-council-turn__toggle-icon" aria-hidden>
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </span>
        <span className="agentops-council-turn__question">{turn.question}</span>
        <span className="agentops-council-turn__progress">
          {turn.repliedCount} of {Math.max(turn.requestedCount, turn.repliedCount)} replied
        </span>
      </button>

      {open ? (
        <div className="agentops-council-turn__body">
          <div className="agentops-council-turn__summary" data-testid="agentops-council-turn-summary">
            <p className="agentops-council-turn__summary-label">{turn.summaryLabel}</p>
            <p className="agentops-council-turn__summary-text">{turn.summary}</p>
            {turn.agreements.length > 0 ? (
              <ul className="agentops-council-turn__list">
                {turn.agreements.map((item) => (
                  <li key={`agree-${item}`}>{item}</li>
                ))}
              </ul>
            ) : null}
            {turn.disagreements.length > 0 ? (
              <>
                <p className="agentops-council-turn__subhead">Different perspectives</p>
                <ul className="agentops-council-turn__list">
                  {turn.disagreements.map((item) => (
                    <li key={`diff-${item}`}>{item}</li>
                  ))}
                </ul>
              </>
            ) : null}
            {turn.recommendedNextStep ? (
              <p className="agentops-council-turn__next">Next: {turn.recommendedNextStep}</p>
            ) : null}
          </div>

          <div className="agentops-council-turn__responses" data-testid="agentops-council-turn-responses">
            {turn.replies.map((reply) => (
              <AgentOpsCouncilAgentResponseRow
                key={reply.messageId}
                reply={reply}
                expanded={expandedReplyId === reply.messageId}
                onToggle={() =>
                  setExpandedReplyId((current) =>
                    current === reply.messageId ? null : reply.messageId,
                  )
                }
                onSpeak={(text, messageId) => void voice.speakAgentMessage(text, messageId)}
                speaking={voice.isSpeaking}
                onStopSpeak={voice.stopVoiceOutput}
              />
            ))}
          </div>
        </div>
      ) : null}
    </article>
  );
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
  statusText,
}: AgentOpsCouncilWorkspaceProps) {
  const navigate = useNavigate();
  const voice = useAixiaVoiceChat();
  const [rosterOpen, setRosterOpen] = useState(false);
  const history = useMemo(() => priorCouncilTurns(turns), [turns]);
  const composerRef = useRef(composerValue);
  const sttBaselineRef = useRef("");
  composerRef.current = composerValue;

  const toolbarStatus =
    voice.voiceStatus ??
    statusText ??
    `${rosterMode === "canonical" ? "AgentOps Council" : "Custom Council"} · ${selectedParticipantIds.length} selected`;

  const progressLabel = sending
    ? `${latestTurn && latestTurn.question === inFlightQuestion ? latestTurn.repliedCount : 0} of ${selectedParticipantIds.length} agents replied`
    : latestTurn
      ? `${latestTurn.repliedCount} of ${Math.max(latestTurn.requestedCount, latestTurn.repliedCount)} agents replied`
      : "Ready for a Council question";

  return (
    <section
      className={[
        "agentops-council-workspace",
        density === "embedded"
          ? "agentops-council-workspace--embedded"
          : "agentops-council-workspace--full",
      ].join(" ")}
      data-testid={testId}
      data-messenger-layout={density === "embedded" ? "embedded" : "full"}
      data-roster-mode={rosterMode}
    >
      <AixiaMessengerToolbar
        roomTitle="Council Chat"
        ttsEnabled={voice.ttsEnabled}
        onTtsToggle={() => {
          if (voice.ttsEnabled) voice.stopVoiceOutput();
          voice.toggleTts();
        }}
        ttsAvailable={voice.ttsAvailable}
        ttsProvider={voice.ttsProvider}
        isSpeaking={voice.isSpeaking}
        onStopSpeech={voice.stopVoiceOutput}
        statusText={toolbarStatus}
        actions={
          <div className="agentops-council-workspace__toolbar-actions">
            <AixiaButton
              type="button"
              variant="secondary"
              className="text-xs"
              onClick={() => navigate("/system/agent-ops/council")}
            >
              <Expand className="mr-1.5 h-3.5 w-3.5" aria-hidden />
              Open full Council
            </AixiaButton>
          </div>
        }
      />

      <div className="agentops-council-workspace__meta" data-testid="agentops-council-workspace-meta">
        <div className="agentops-council-workspace__roster-mode" role="tablist" aria-label="Council roster">
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
            Custom Council
          </button>
        </div>
        <p className="agentops-council-workspace__roster-label">
          <Users className="mr-1.5 h-3.5 w-3.5" aria-hidden />
          {rosterMode === "canonical"
            ? `Canonical 12 · ${selectedParticipantIds.length} selected`
            : `Custom roster · ${selectedParticipantIds.length} selected`}
        </p>
        <p className="agentops-council-workspace__progress" data-testid="agentops-council-progress">
          {progressLabel}
        </p>
        <AixiaButton
          type="button"
          variant="secondary"
          className="text-xs px-2.5 py-1"
          disabled={sending}
          onClick={() => setRosterOpen((value) => !value)}
        >
          {rosterOpen ? "Hide roster" : "Edit roster"}
        </AixiaButton>
      </div>

      <div
        className="agentops-council-workspace__viewport"
        data-testid="agentops-messenger-viewport"
      >
        {!latestTurn && !sending && !inFlightQuestion ? (
          <div className="agentops-council-workspace__empty">
            <MessageSquare className="h-8 w-8 text-white/35" aria-hidden />
            <p className="text-sm font-medium text-white/85">Ask the Council</p>
            <p className="text-xs text-white/55">
              One question → combined summary → expand individual agents only when needed.
            </p>
          </div>
        ) : null}

        {sending && inFlightQuestion ? (
          <div className="agentops-council-turn agentops-council-turn--pending" data-testid="agentops-council-inflight">
            <p className="agentops-council-turn__question">{inFlightQuestion}</p>
            <p className="agentops-council-turn__progress">
              0 of {selectedParticipantIds.length} agents replied — Council agents are thinking…
            </p>
            <div className="agentops-council-turn__responses">
              {selectedParticipantIds.map((agentId) => {
                const participant = participants.find((item) => item.agentId === agentId);
                return (
                  <AgentOpsCouncilAgentResponseRow
                    key={`pending-${agentId}`}
                    reply={{
                      messageId: `pending-${agentId}`,
                      agentId,
                      agentName: participant?.displayName ?? agentId,
                      jobTitle: participant?.appRole ?? null,
                      content: "",
                      preview: "Waiting for reply…",
                      createdAt: new Date().toISOString(),
                      source: "owner",
                      status: "pending",
                      skippedAsNonConversational: false,
                    }}
                    expanded={false}
                    onToggle={() => undefined}
                  />
                );
              })}
            </div>
          </div>
        ) : null}

        {latestTurn ? (
          <TurnSummaryCard
            turn={latestTurn}
            defaultExpanded={!sending}
            voice={voice}
          />
        ) : null}

        {history.length > 0 ? (
          <div className="agentops-council-workspace__history">
            <p className="agentops-council-workspace__history-label">Earlier Council turns</p>
            {history.map((turn) => (
              <TurnSummaryCard key={turn.turnId} turn={turn} defaultExpanded={false} voice={voice} />
            ))}
          </div>
        ) : null}
      </div>

      <div className="agentops-council-workspace__dock" data-testid="agentops-messenger-dock">
        <AixiaChatParticipantPicker
          participants={participants}
          selectedIds={selectedParticipantIds}
          onChange={onSelectedParticipantIdsChange}
          disabled={sending}
          expanded={rosterOpen}
          onExpandedChange={setRosterOpen}
        />
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
                onComposerChange(
                  voice.appendTranscript(sttBaselineRef.current, transcript),
                );
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
