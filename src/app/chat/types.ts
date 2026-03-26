// types.ts
import type React from "react";

export type Role = "admin" | "manager" | "employee" | "guest";
export type ChatGroupType = "DIRECT" | "GROUP" | "PROJECT" | "TASK";
export type UserStatus = "online" | "offline" | "away" | "busy";

export type ProfileRow = {
  user_id: string;
  full_name: string | null;
  role: Role;
  status: "active" | "pending" | "inactive" | "denied";
  last_seen?: string | null;
  avatar_url?: string | null;
};

export type ChatGroupRow = {
  id: string;
  name: string | null;
  type: ChatGroupType;
  project_id: string | null;
  task_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  direct_key?: string | null;
  last_message?: string | null;
  last_message_at?: string | null;
};

export type ChatGroupMemberRow = {
  id: string;
  group_id: string;
  user_id: string;
  role: string;
  invited_by: string | null;
  created_at: string;
};

export type ChatAttachmentRow = {
  id: string;
  message_id: string | null;
  group_id: string;
  uploaded_by: string;
  file_name: string;
  file_path: string;
  mime_type: string | null;
  file_size: number | null;
  created_at: string;
};

export type ChatMessageRow = {
  id: string;
  group_id: string;
  user_id: string;
  content: string;
  created_at: string;
  attachments?: ChatAttachmentRow[];
};

export type MessagesByGroup = Record<string, ChatMessageRow[]>;
export type HasMoreByGroup = Record<string, boolean>;
export type UnreadCounts = Record<string, number>;
export type OnlineStatus = Record<string, UserStatus>;

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
  highlightedMessageIds: string[];
  onLoadOlder: () => void;
  onToggleSelection: (message: ChatMessageRow) => void;
  onStartEdit: (message: ChatMessageRow) => void;
  onEditTextChange: (value: string) => void;
  onSaveEdit: (message: ChatMessageRow) => void;
  onCancelEdit: () => void;
  onDeleteMessage: (message: ChatMessageRow) => void;
};
