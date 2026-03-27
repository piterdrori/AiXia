import { useEffect, useMemo, useRef, useState } from "react";
import { CheckSquare, FolderKanban, Plus, Search, Trash2, Users } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLanguage } from "@/lib/i18n";
import type { ChatGroupRow, ChatGroupMemberRow, ChatMessageRow, ProfileRow } from "../types";
import {
  getConversationInitials,
  getConversationName,
  getMembersForGroup,
} from "../utils";

type Props = {
  currentUserId: string | null;
  currentUserRole: string | null;
  groups: ChatGroupRow[];
  groupMembers: ChatGroupMemberRow[];
  profiles: ProfileRow[];
  searchQuery: string;
  selectedConversationId: string | null;
  groupActionLoading: string | null;
  unreadCounts: Record<string, number>;
  latestMessageByGroup: Record<string, ChatMessageRow | null>;
  onSearchChange: (value: string) => void;
  onOpenCreateGroup: () => void;
  onOpenConversation: (groupId: string) => void;
  onDeleteChat: (group: ChatGroupRow) => void;
};

const MIN_SECTION_PERCENT = 20;
const MAX_SECTION_PERCENT = 80;

function getLatestPreview(
  message: ChatMessageRow | null | undefined,
  currentUserId: string | null
) {
  if (!message) return "";

  const hasText = Boolean(message.content?.trim());
  const hasAttachment = Boolean(message.attachments?.length);

  if (hasText && hasAttachment) {
    return message.user_id === currentUserId
      ? `You: ${message.content}`
      : message.content;
  }

  if (hasText) {
    return message.user_id === currentUserId
      ? `You: ${message.content}`
      : message.content;
  }

  if (hasAttachment) {
    const fileName = message.attachments?.[0]?.file_name || "Attachment";
    return message.user_id === currentUserId
      ? `You: 📎 ${fileName}`
      : `📎 ${fileName}`;
  }

  return "";
}

export default function ChatSidebar({
  currentUserId,
  currentUserRole,
  groups,
  groupMembers,
  profiles,
  searchQuery,
  selectedConversationId,
  groupActionLoading,
  unreadCounts,
  latestMessageByGroup,
  onSearchChange,
  onOpenCreateGroup,
  onOpenConversation,
  onDeleteChat,
}: Props) {
  const { t } = useLanguage();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [topSectionPercent, setTopSectionPercent] = useState(45);
  const [isDragging, setIsDragging] = useState(false);

  const q = searchQuery.trim().toLowerCase();

  const filteredConversations = useMemo(() => {
    return groups.filter((group) => {
      const name = getConversationName(group, currentUserId, profiles, groupMembers, t)
        .toLowerCase();
      const latestPreview = getLatestPreview(latestMessageByGroup[group.id], currentUserId)
        .toLowerCase();

      return name.includes(q) || latestPreview.includes(q);
    });
  }, [currentUserId, groupMembers, groups, latestMessageByGroup, profiles, q, t]);

  const directConversations = filteredConversations.filter(
    (group) => group.type === "DIRECT"
  );

  const groupChats = filteredConversations.filter(
    (group) => group.type !== "DIRECT"
  );

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (event: MouseEvent) => {
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const offsetY = event.clientY - rect.top;
      const nextPercent = (offsetY / rect.height) * 100;

      const clamped = Math.max(
        MIN_SECTION_PERCENT,
        Math.min(MAX_SECTION_PERCENT, nextPercent)
      );

      setTopSectionPercent(clamped);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  const canDeleteChat = (group: ChatGroupRow) => {
    if (!currentUserId) return false;

    if (currentUserRole === "admin") {
      return true;
    }

    if (group.type === "DIRECT") {
      return groupMembers.some(
        (member) =>
          member.group_id === group.id && member.user_id === currentUserId
      );
    }

    return group.created_by === currentUserId;
  };

  const renderConversationButton = (group: ChatGroupRow) => {
    const iconType =
      group.type === "PROJECT"
        ? "project"
        : group.type === "TASK"
          ? "task"
          : group.type === "GROUP"
            ? "group"
            : null;

    const unreadCount = unreadCounts[group.id] || 0;
    const hasUnread = unreadCount > 0 && selectedConversationId !== group.id;
    const preview = getLatestPreview(latestMessageByGroup[group.id], currentUserId);

    return (
      <div
        key={group.id}
        className={`w-full rounded-lg transition-all ${
          selectedConversationId === group.id
            ? "bg-indigo-600/20 border border-indigo-500/30"
            : hasUnread
              ? "bg-indigo-500/10 border border-indigo-500/20 shadow-[0_0_18px_rgba(99,102,241,0.18)]"
              : "hover:bg-slate-800/50 border border-transparent"
        }`}
      >
        <div className="flex items-center gap-3 p-3">
          <button
            type="button"
            onClick={() => onOpenConversation(group.id)}
            className="flex items-center gap-3 flex-1 text-left min-w-0"
          >
            {iconType ? (
              <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center shrink-0">
                {iconType === "project" && (
                  <FolderKanban className="w-5 h-5 text-indigo-400" />
                )}
                {iconType === "task" && (
                  <CheckSquare className="w-5 h-5 text-indigo-400" />
                )}
                {iconType === "group" && (
                  <Users className="w-5 h-5 text-indigo-400" />
                )}
              </div>
            ) : (
              <Avatar className="w-10 h-10 shrink-0">
                <AvatarFallback className="bg-indigo-600 text-white">
                  {getConversationInitials(
                    group,
                    currentUserId,
                    profiles,
                    groupMembers,
                    t
                  )}
                </AvatarFallback>
              </Avatar>
            )}

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p
                  className={`truncate text-sm ${
                    hasUnread ? "text-white font-semibold" : "text-white font-medium"
                  }`}
                >
                  {getConversationName(
                    group,
                    currentUserId,
                    profiles,
                    groupMembers,
                    t
                  )}
                </p>

                {hasUnread ? (
                  <div className="min-w-5 h-5 px-1 rounded-full bg-indigo-500 text-white text-[10px] font-semibold flex items-center justify-center shrink-0">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </div>
                ) : null}
              </div>

              <p
                className={`truncate text-xs ${
                  hasUnread ? "text-indigo-200" : "text-slate-500"
                }`}
              >
                {preview || t("chat.sidebar.participantsCount", undefined, {
                  total: getMembersForGroup(groupMembers, group.id).length,
                })}
              </p>
            </div>
          </button>

          {canDeleteChat(group) && (
            <Button
              variant="ghost"
              size="icon"
              className="text-slate-400 hover:text-red-400 shrink-0"
              onClick={() => onDeleteChat(group)}
              disabled={groupActionLoading === group.id}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    );
  };

  return (
    <Card className="w-80 bg-slate-900/50 border-slate-800 flex flex-col h-full overflow-hidden min-h-0 shrink-0">
      <CardContent className="p-4 flex flex-col h-full min-h-0">
        <div className="relative mb-4 shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <Input
            placeholder={t("chat.sidebar.searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 bg-slate-950 border-slate-800 text-white placeholder:text-slate-600"
          />
        </div>

        <div className="mb-3 shrink-0">
          <Button
            onClick={onOpenCreateGroup}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            {t("chat.sidebar.newGroupChat")}
          </Button>
        </div>

        <div
          ref={containerRef}
          className="flex-1 min-h-0 flex flex-col rounded-lg border border-slate-800 bg-slate-950/40 overflow-hidden"
        >
          <div
            className="min-h-0 flex flex-col"
            style={{ height: `${topSectionPercent}%` }}
          >
            <div className="px-4 py-3 border-b border-slate-800 shrink-0">
              <h3 className="text-xs font-medium text-slate-500 uppercase">
                {t("chat.sidebar.directMessages")}
              </h3>
            </div>

            <ScrollArea className="flex-1 min-h-0">
              <div className="p-2 space-y-1">
                {directConversations.length > 0 ? (
                  directConversations.map((group) => renderConversationButton(group))
                ) : (
                  <div className="px-2 py-6 text-center text-sm text-slate-500">
                    No direct messages
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>

          <div
            role="separator"
            aria-orientation="horizontal"
            onMouseDown={() => setIsDragging(true)}
            className="h-3 shrink-0 cursor-row-resize bg-slate-900 border-y border-slate-700 relative group"
          >
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-px bg-slate-600 group-hover:bg-indigo-500" />
          </div>

          <div className="flex-1 min-h-0 flex flex-col">
            <div className="px-4 py-3 border-b border-slate-800 shrink-0">
              <h3 className="text-xs font-medium text-slate-500 uppercase">
                {t("chat.sidebar.groupChats")}
              </h3>
            </div>

            <ScrollArea className="flex-1 min-h-0">
              <div className="p-2 space-y-1">
                {groupChats.length > 0 ? (
                  groupChats.map((group) => renderConversationButton(group))
                ) : (
                  <div className="px-2 py-6 text-center text-sm text-slate-500">
                    No group chats
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
