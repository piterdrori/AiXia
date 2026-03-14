import type React from "react";

export type Role = "admin" | "manager" | "employee" | "guest";
export type ChatGroupType = "DIRECT" | "GROUP" | "PROJECT" | "TASK";

export type ProfileRow = {
  user_id: string;
  full_name: string | null;
  role: Role;
  status: "active" | "pending" | "inactive" | "denied";
};

export type ChatGroupRow = {
  id: string;
  name: string | null;
  type: ChatGroupType;
  project_id: string | null;
  task_id: string | null;
  created_by: string | null;
  created_at: string;
  direct_key?: string | null;
};

export type ChatGroupMemberRow = {
  id: string;
  group_id: string;
  user_id: string;
  role: string;
  created_at: string;
};

export type ChatMessageRow = {
  id: string;
  group_id: string;
  user_id: string;
  content: string;
  created_at: string;
};

export type MessagesByGroup = Record<string, ChatMessageRow[]>;
export type HasMoreByGroup = Record<string, boolean>;

export type ChatBootstrapResult = {
  currentUserId: string | null;
  currentUserRole: Role | null;
  profiles: ProfileRow[];
  groups: ChatGroupRow[];
  groupMembers: ChatGroupMemberRow[];
};

export type ConversationBuckets = {
  direct: ChatGroupRow[];
  project: ChatGroupRow[];
  task: ChatGroupRow[];
  group: ChatGroupRow[];
};

export type MessageListProps = {
  currentUserId: string | null;
  currentUserRole: Role | null;
  messages: ChatMessageRow[];
  profiles: ProfileRow[];
  isSelectionMode: boolean;
  selectedMessageIds: string[];
  editingMessageId: string | null;
  editingMessageText: string;
  messageActionLoading: string | null;
  hasMore: boolean;
  isLoadingOlder: boolean;
  scrollAreaRef: React.RefObject<HTMLDivElement | null>;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  onLoadOlder: () => void;
  onToggleSelection: (message: ChatMessageRow) => void;
  onStartEdit: (message: ChatMessageRow) => void;
  onEditTextChange: (value: string) => void;
  onSaveEdit: (message: ChatMessageRow) => void;
  onCancelEdit: () => void;
  onDeleteMessage: (message: ChatMessageRow) => void;
};
