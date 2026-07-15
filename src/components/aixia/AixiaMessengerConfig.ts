import type { ReactNode } from "react";

import type { AgentOpsChatScope } from "@/lib/agentops";

export type AixiaMessengerAttachment = {
  id: string;
  fileName: string;
  fileType: string;
  storagePath?: string | null;
  previewUrl?: string | null;
  uploading?: boolean;
  error?: string | null;
};

export type AixiaMessengerParticipant = {
  agentId: string;
  displayName: string;
  appRole?: string;
  qaSpecialty?: string;
  status?: string;
};

export type AixiaMessengerMessage = {
  id: string;
  senderType: "user" | "agent" | "system";
  senderName: string;
  senderRole?: string;
  content: string;
  avatarInitials?: string;
  badges?: ReactNode;
  footer?: ReactNode;
  attachments?: AixiaMessengerAttachment[];
  planned?: boolean;
  /** When true, messenger TTS must not auto-speak this bubble (fallback/error/system). */
  skipAutoSpeak?: boolean;
};

export type AixiaMessengerComposerPreset = {
  label: string;
  value: string;
};

export type AixiaMessengerLayoutMode = "default" | "embedded" | "full";

export type AixiaMessengerShellConfig = {
  roomTitle: string;
  chatScope: AgentOpsChatScope;
  showParticipantPicker?: boolean;
  showIssueContext?: boolean;
  testId?: string;
  /**
   * Layout contract for shell height.
   * - embedded: Agents (and similar) embed — tall fixed shell, large message viewport
   * - full: dedicated Council route — fills available viewport independently
   * - default: legacy shared sizing
   */
  layoutMode?: AixiaMessengerLayoutMode;
};

import type { AgentOpsOllamaModelOption } from "@/lib/agentops/ollamaModelCatalog";

export type AixiaMessengerShellProps = AixiaMessengerShellConfig & {
  messages: AixiaMessengerMessage[];
  composerValue: string;
  onComposerChange: (value: string) => void;
  onSend: () => void;
  sending?: boolean;
  statusText?: string;
  errorText?: string | null;
  emptyTitle?: string;
  emptyDescription?: string;
  participants?: AixiaMessengerParticipant[];
  selectedParticipantIds?: string[];
  onSelectedParticipantIdsChange?: (ids: string[]) => void;
  pendingAttachments?: AixiaMessengerAttachment[];
  onAddAttachments?: (files: FileList | File[]) => void;
  onRemoveAttachment?: (attachmentId: string) => void;
  composerPresets?: AixiaMessengerComposerPreset[];
  onPresetSelect?: (value: string) => void;
  toolbarActions?: ReactNode;
  creativityMode?: boolean;
  onCreativityModeChange?: (enabled: boolean) => void;
  showTypingIndicator?: boolean;
  typingLabel?: string;
  className?: string;
  llmModelOptions?: AgentOpsOllamaModelOption[];
  selectedLlmModel?: string;
  onLlmModelChange?: (modelId: string) => void;
  onLlmModelRefresh?: () => void;
  llmModelLoading?: boolean;
  llmModelRefreshing?: boolean;
  llmInstalledCount?: number;
};
