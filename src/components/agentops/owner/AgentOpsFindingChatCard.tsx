import { useId, useState } from "react";
import { Copy, MessageSquare, RefreshCw } from "lucide-react";

import {
  AixiaButton,
  AixiaInfoBlock,
  AixiaMessengerShell,
  AixiaSection,
} from "@/components/aixia";
import type { AgentOpsAgentChatIdentity } from "@/components/agentops/owner/useAgentOpsAgentChat";
import { useAgentOpsFindingChat } from "@/components/agentops/owner/useAgentOpsFindingChat";
import type { CanonicalFindingDetailView } from "@/lib/agentops/findings/findingsDetailLoader";
import type { PromptRewriteProposal } from "@/lib/agentops/findings/findingChatModel";

type AgentOpsFindingChatCardProps = {
  enabled?: boolean;
  identity: AgentOpsAgentChatIdentity | null;
  detail: CanonicalFindingDetailView;
  agentHref?: string | null;
  continueInAgentChatHref?: string | null;
  onUsePromptRewrite: (prompt: string) => void;
  onOpenAgent?: () => void;
  onContinueInAgentChat?: () => void;
};

function PromptRewriteProposalCard({
  messageId,
  proposal,
  uiState,
  currentPrompt,
  canSavePrompt,
  onUse,
  onCompare,
  onCopy,
  onAskAnother,
  onDismiss,
  comparing,
  comparisonSummary,
  comparisonCurrent,
  comparisonProposed,
  onCloseCompare,
}: {
  messageId: string;
  proposal: PromptRewriteProposal;
  uiState: string;
  currentPrompt: string;
  canSavePrompt: boolean;
  onUse: () => void;
  onCompare: () => void;
  onCopy: () => void;
  onAskAnother: () => void;
  onDismiss: () => void;
  comparing: boolean;
  comparisonSummary?: string[];
  comparisonCurrent?: string;
  comparisonProposed?: string;
  onCloseCompare: () => void;
}) {
  const headingId = useId();
  const [copyNote, setCopyNote] = useState<string | null>(null);

  return (
    <article
      className="mt-3 rounded-xl border border-cyan-400/25 bg-cyan-400/[0.06] p-4"
      aria-labelledby={headingId}
      data-testid={`finding-chat-prompt-rewrite-${messageId}`}
      data-proposal-state={uiState}
    >
      <h3 id={headingId} className="text-sm font-semibold text-cyan-100">
        Suggested Fix Prompt
      </h3>
      <p className="mt-2 text-sm text-white/75">{proposal.explanation}</p>
      {proposal.parseSource === "deterministic_fallback" ? (
        <p className="mt-1 text-xs text-amber-200/80" data-testid="agentops-fix-prompt-fallback-note">
          Built from issue fields (LLM structured rewrite unavailable).
        </p>
      ) : null}

      {proposal.safetyHits.length > 0 || proposal.safetyNotes.length > 0 ? (
        <div className="mt-3" role="status" aria-live="polite">
          <AixiaInfoBlock tone="gold" title="Safety review">
            <p className="text-sm text-white/75">
              {proposal.safetyHits.length > 0
                ? `Detected: ${proposal.safetyHits.map((hit) => hit.label).join(", ")}.`
                : null}{" "}
              {proposal.safetyNotes.length > 0 ? proposal.safetyNotes.join(" ") : null}
            </p>
          </AixiaInfoBlock>
        </div>
      ) : null}

      <div className="mt-3">
        <p className="text-xs text-white/45">Suggested prompt text</p>
        <pre
          className="mt-1 max-h-56 overflow-auto whitespace-pre-wrap rounded-lg bg-black/40 p-3 text-xs text-white/80"
          data-testid="agentops-suggested-fix-prompt-text"
        >
          {proposal.rewrittenPrompt}
        </pre>
      </div>

      {proposal.changesMade.length > 0 ? (
        <div className="mt-3">
          <p className="text-xs text-white/45">Changes made</p>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-white/75">
            {proposal.changesMade.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {proposal.validationSteps.length > 0 ? (
        <div className="mt-3">
          <p className="text-xs text-white/45">Validation steps</p>
          <ol className="mt-1 list-decimal space-y-1 pl-5 text-sm text-white/75">
            {proposal.validationSteps.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ol>
        </div>
      ) : null}

      {!canSavePrompt ? (
        <p className="mt-3 text-xs text-white/50">
          This draft must be promoted before prompt changes can be saved. You can still load the
          rewrite into the editor for review.
        </p>
      ) : null}

      {uiState === "accepted" ? (
        <p className="mt-3 text-sm text-emerald-300" role="status">
          Loaded into the prompt editor — not saved yet. Review and use Save changes.
        </p>
      ) : null}
      {uiState === "dismissed" ? (
        <p className="mt-3 text-sm text-white/55" role="status">
          Proposal dismissed.
        </p>
      ) : null}

      {comparing ? (
        <div className="mt-4 space-y-3 rounded-lg border border-white/10 bg-black/30 p-3">
          <p className="text-sm font-medium text-white">Prompt comparison</p>
          {comparisonSummary && comparisonSummary.length > 0 ? (
            <ul className="list-disc space-y-1 pl-5 text-xs text-white/65">
              {comparisonSummary.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : null}
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <p className="text-xs text-white/45">Current prompt</p>
              <pre className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap text-xs text-white/70">
                {comparisonCurrent || currentPrompt || "(empty)"}
              </pre>
            </div>
            <div>
              <p className="text-xs text-white/45">Proposed rewrite</p>
              <pre className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap text-xs text-white/70">
                {comparisonProposed || proposal.rewrittenPrompt}
              </pre>
            </div>
          </div>
          <AixiaButton variant="secondary" onClick={onCloseCompare}>
            Close comparison
          </AixiaButton>
        </div>
      ) : null}

      {copyNote ? (
        <p className="mt-2 text-xs text-white/55" role="status">
          {copyNote}
        </p>
      ) : null}

      {uiState !== "dismissed" ? (
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <AixiaButton
            aria-label="Use as Fix Issue Prompt"
            onClick={onUse}
            className="w-full sm:w-auto"
            data-testid="agentops-use-as-fix-prompt"
          >
            Use as Fix Issue Prompt
          </AixiaButton>
          <AixiaButton
            variant="secondary"
            aria-label="Compare rewrite with current prompt"
            onClick={onCompare}
            className="w-full sm:w-auto"
          >
            Compare with current
          </AixiaButton>
          <AixiaButton
            variant="secondary"
            aria-label="Copy rewritten prompt"
            onClick={() => {
              onCopy();
              setCopyNote("Copied rewritten prompt.");
            }}
            className="w-full sm:w-auto"
          >
            <Copy className="mr-1.5 h-4 w-4" />
            Copy
          </AixiaButton>
          <AixiaButton
            variant="secondary"
            aria-label="Ask for another prompt version"
            onClick={onAskAnother}
            className="w-full sm:w-auto"
          >
            Ask for another version
          </AixiaButton>
          <AixiaButton
            variant="secondary"
            aria-label="Dismiss prompt rewrite proposal"
            onClick={onDismiss}
            className="w-full sm:w-auto"
          >
            Dismiss
          </AixiaButton>
        </div>
      ) : null}
    </article>
  );
}

/**
 * Owner-facing finding discussion chat — reuses Agent Chat persistence + /api/agentops/llm (issue scope).
 */
export function AgentOpsFindingChatCard({
  enabled = true,
  identity,
  detail,
  agentHref,
  continueInAgentChatHref,
  onUsePromptRewrite,
  onOpenAgent,
  onContinueInAgentChat,
}: AgentOpsFindingChatCardProps) {
  const chat = useAgentOpsFindingChat({ enabled, identity, detail });
  const agentName = identity?.displayName ?? "reporting agent";
  const [supportingOpen, setSupportingOpen] = useState(false);

  const lifecycleClosed =
    detail.ownerStatus === "rejected" ||
    detail.ownerStatus === "fixed" ||
    detail.ownerStatus === "verified";

  return (
    <AixiaSection
      surface="command"
      title={`Discuss with ${agentName}`}
      description="Ask the reporting agent about this finding, its evidence, and the suggested fix."
      icon={MessageSquare}
      bodyClassName="aixia-section-body--messenger"
    >
      <div className="space-y-3" data-testid="agentops-finding-chat">
        <div className="flex flex-wrap gap-2 text-xs text-white/55">
          <span className="rounded-full border border-white/10 px-2 py-1">{detail.typeLabel}</span>
          <span className="rounded-full border border-white/10 px-2 py-1">
            {detail.ownerStatusLabel}
          </span>
          <span className="rounded-full border border-white/10 px-2 py-1">{detail.title}</span>
        </div>

        {lifecycleClosed ? (
          <AixiaInfoBlock tone="cyan" title={`Finding is ${detail.ownerStatusLabel}`}>
            <p className="text-sm text-white/75">
              Discussion remains available. Chat does not reopen or change lifecycle — only Owner
              decision controls do.
            </p>
          </AixiaInfoBlock>
        ) : null}

        {!detail.canSavePrompt ? (
          <p className="text-xs text-white/50">
            This draft must be promoted before prompt changes can be saved.
          </p>
        ) : null}

        {detail.supportingAgentSlugs.length > 0 ? (
          <div>
            <button
              type="button"
              className="text-xs text-indigo-300 hover:text-indigo-200"
              aria-expanded={supportingOpen}
              onClick={() => setSupportingOpen((open) => !open)}
            >
              {supportingOpen ? "Hide" : "Show"} supporting agents (
              {detail.supportingAgentSlugs.length})
            </button>
            {supportingOpen ? (
              <p className="mt-1 text-xs text-white/55">
                {detail.supportingAgentSlugs.join(", ")}. Default chat stays with {agentName}.
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          {agentHref || onOpenAgent ? (
            <AixiaButton
              variant="secondary"
              onClick={() => {
                if (onOpenAgent) onOpenAgent();
              }}
            >
              Open agent
            </AixiaButton>
          ) : null}
          {continueInAgentChatHref || onContinueInAgentChat ? (
            <AixiaButton
              variant="secondary"
              onClick={() => {
                if (onContinueInAgentChat) onContinueInAgentChat();
              }}
            >
              Continue in Agent Chat
            </AixiaButton>
          ) : null}
        </div>
        <p className="text-[11px] text-white/40">
          Finding Chat is a separate thread from Agent Detail chat. Agent Chat does not yet ingest
          finding query context as the same room.
        </p>

        {chat.error ? (
          <AixiaInfoBlock tone="gold" title="Chat history temporarily unavailable">
            <p className="text-sm text-white/75">{chat.error}</p>
            <div className="mt-3">
              <AixiaButton variant="secondary" onClick={() => void chat.refresh()}>
                <RefreshCw className="mr-1.5 h-4 w-4" />
                Retry history
              </AixiaButton>
            </div>
          </AixiaInfoBlock>
        ) : null}

        {chat.chatFeedback ? (
          <p className="text-sm text-white/65" role="status">
            {chat.chatFeedback}
          </p>
        ) : null}

        {chat.loading && chat.messengerMessages.length === 0 ? (
          <div className="space-y-2" aria-busy="true">
            {[0, 1, 2].map((slot) => (
              <div
                key={slot}
                className="h-12 animate-pulse rounded-lg border border-white/10 bg-white/[0.04]"
              />
            ))}
          </div>
        ) : null}

        <AixiaMessengerShell
          roomTitle={`Discuss with ${agentName}`}
          chatScope="issue"
          testId="agentops-finding-messenger"
          messages={chat.messengerMessages}
          composerValue={chat.composerValue}
          onComposerChange={chat.setComposerValue}
          onSend={() => void chat.send()}
          sending={chat.chatSubmitting}
          statusText={chat.statusText}
          errorText={chat.chatError ?? undefined}
          emptyTitle={`Ask ${agentName} about this finding.`}
          emptyDescription="History is saved for this finding and reporting agent. Chat never changes lifecycle."
          showTypingIndicator={chat.chatSubmitting}
          typingLabel={`${agentName} is thinking…`}
          composerPresets={chat.quickQuestions.map((item) => ({
            label: item.label,
            value: item.message,
          }))}
          onPresetSelect={(value) => chat.handleQuickQuestion(value, "send")}
          className="min-h-[360px] max-h-[640px]"
        />

        {chat.canRetry ? (
          <AixiaButton variant="secondary" onClick={() => void chat.retry()}>
            Retry
          </AixiaButton>
        ) : null}

        {Object.entries(chat.proposalsByMessageId).map(([messageId, entry]) =>
          entry.uiState === "dismissed" ? null : (
            <PromptRewriteProposalCard
              key={messageId}
              messageId={messageId}
              proposal={entry.proposal}
              uiState={entry.uiState}
              currentPrompt={detail.promptText ?? ""}
              canSavePrompt={detail.canSavePrompt}
              comparing={chat.compareMessageId === messageId}
              comparisonSummary={
                chat.compareMessageId === messageId ? chat.compareView?.summary : undefined
              }
              comparisonCurrent={
                chat.compareMessageId === messageId
                  ? chat.compareView?.currentLines.join("\n")
                  : undefined
              }
              comparisonProposed={
                chat.compareMessageId === messageId
                  ? chat.compareView?.proposedLines.join("\n")
                  : undefined
              }
              onCloseCompare={() => chat.setCompareMessageId(null)}
              onUse={() => {
                onUsePromptRewrite(entry.proposal.rewrittenPrompt);
                void chat.markProposalAccepted(messageId);
              }}
              onCompare={() => chat.setProposalComparing(messageId)}
              onCopy={() => {
                void navigator.clipboard?.writeText(entry.proposal.rewrittenPrompt);
              }}
              onAskAnother={() =>
                chat.handleQuickQuestion(
                  "Please propose another version of the suggested fix prompt with a clearer staging-only scope.",
                  "send",
                )
              }
              onDismiss={() => void chat.markProposalDismissed(messageId)}
            />
          ),
        )}
      </div>
    </AixiaSection>
  );
}
