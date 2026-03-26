// ChatSidebar.tsx
import { CheckSquare, FolderKanban, Plus, Search, Trash2, Users, MessageCircle } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useLanguage } from "@/lib/i18n";
import type { ChatGroupRow, ChatGroupMemberRow, ProfileRow, UnreadCounts } from "../types";
import {
  getConversationInitials,
  getConversationName,
  getMembersForGroup,
} from "../utils";
import { useMemo } from "react";

type Props = {
  currentUserId: string | null;
  currentUserRole: string | null;
  groups: ChatGroupRow[];
  groupMembers: ChatGroupMemberRow[];
  profiles: ProfileRow[];
  searchQuery: string;
  selectedConversationId: string | null;
  groupActionLoading: string | null;
  unreadCounts: UnreadCounts; // New
  onSearchChange: (value: string) => void;
  onOpenCreateGroup: () => void;
  onOpenConversation: (groupId: string) => void;
  onDeleteChat: (group: ChatGroupRow) => void;
};

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
  onSearchChange,
  onOpenCreateGroup,
  onOpenConversation,
  onDeleteChat,
}: Props) {
  const { t } = useLanguage();
  const q = searchQuery.trim().toLowerCase();

  const filteredConversations = useMemo(() => {
    return groups.filter((group) =>
      getConversationName(group, currentUserId, profiles, groupMembers, t)
        .toLowerCase()
        .includes(q)
    );
  }, [groups, q, currentUserId, profiles, groupMembers, t]);

  const directConversations = filteredConversations.filter((group) => group.type === "DIRECT");
  const projectConversations = filteredConversations.filter((group) => group.type === "PROJECT");
  const taskConversations = filteredConversations.filter((group) => group.type === "TASK");
  const groupConversations = filteredConversations.filter((group) => group.type === "GROUP");

  const canDeleteChat = (group: ChatGroupRow) => {
    if (!currentUserId) return false;
    if (currentUserRole === "admin") return true;
    if (group.type === "DIRECT") {
      return groupMembers.some(
        (member) => member.group_id === group.id && member.user_id === currentUserId
      );
    }
    return group.created_by === currentUserId;
  };

  const renderConversationButton = (
    group: ChatGroupRow,
    iconType?: "project" | "task" | "group"
  ) => {
    const unreadCount = unreadCounts[group.id] || 0;
    const hasUnread = unreadCount > 0;
    const isSelected = selectedConversationId === group.id;
    
    return (
      <div
        key={group.id}
        className={`w-full rounded-lg transition-all ${
          isSelected
            ? "bg-indigo-600/20 border border-indigo-500/30"
            : hasUnread 
              ? "bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/20" 
              : "hover:bg-slate-800/50"
        }`}
      >
        <div className="flex items-center gap-3 p-3 relative">
          <button
            onClick={() => onOpenConversation(group.id)}
            className="flex items-center gap-3 flex-1 text-left min-w-0"
          >
            {iconType ? (
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                hasUnread ? "bg-indigo-500/20" : "bg-indigo-500/10"
              }`}>
                {iconType === "project" && <FolderKanban className={`w-5 h-5 ${hasUnread ? "text-indigo-300" : "text-indigo-400"}`} />}
                {iconType === "task" && <CheckSquare className={`w-5 h-5 ${hasUnread ? "text-indigo-300" : "text-indigo-400"}`} />}
                {iconType === "group" && <Users className={`w-5 h-5 ${hasUnread ? "text-indigo-300" : "text-indigo-400"}`} />}
              </div>
            ) : (
              <Avatar className={`w-10 h-10 shrink-0 ${hasUnread ? "ring-2 ring-indigo-400" : ""}`}>
                <AvatarFallback className={`text-white ${hasUnread ? "bg-indigo-500" : "bg-indigo-600"}`}>
                  {getConversationInitials(group, currentUserId, profiles, groupMembers, t)}
                </AvatarFallback>
              </Avatar>
            )}

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className={`font-medium text-sm truncate ${
                  hasUnread ? "text-white font-semibold" : "text-slate-200"
                }`}>
                  {getConversationName(group, currentUserId, profiles, groupMembers, t)}
                </p>
                {hasUnread && (
                  <span className="flex-shrink-0 inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-bold leading-none text-white bg-red-500 rounded-full min-w-[18px]">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </div>
              <p className="text-slate-500 text-xs">
                {t("chat.sidebar.participantsCount", undefined, {
                  total: getMembersForGroup(groupMembers, group.id).length,
                })}
              </p>
            </div>
          </button>

          {/* New Message Indicator Pulse */}
          {hasUnread && !isSelected && (
            <div className="absolute left-1 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-indigo-400 rounded-full animate-pulse" />
          )}

          {canDeleteChat(group) && (
            <Button
              variant="ghost"
              size="icon"
              className="text-slate-400 hover:text-red-400 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                onDeleteChat(group);
              }}
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

        <ScrollArea className="flex-1 min-h-0 -mx-2">
          <div className="space-y-1 px-2">
            {directConversations.length > 0 && (
              <>
                <h3 className="text-xs font-medium text-slate-500 uppercase mb-2">
                  {t("chat.sidebar.directMessages")}
                </h3>
                <div className="space-y-1">
                  {directConversations.map((group) => renderConversationButton(group))}
                </div>
              </>
            )}

            {projectConversations.length > 0 && (
              <>
                <Separator className="my-3 bg-slate-800" />
                <h3 className="text-xs font-medium text-slate-500 uppercase mb-2">
                  {t("chat.sidebar.projectChats")}
                </h3>
                <div className="space-y-1">
                  {projectConversations.map((group) => renderConversationButton(group, "project"))}
                </div>
              </>
            )}

            {taskConversations.length > 0 && (
              <>
                <Separator className="my-3 bg-slate-800" />
                <h3 className="text-xs font-medium text-slate-500 uppercase mb-2">
                  {t("chat.sidebar.taskChats")}
                </h3>
                <div className="space-y-1">
                  {taskConversations.map((group) => renderConversationButton(group, "task"))}
                </div>
              </>
            )}

            {groupConversations.length > 0 && (
              <>
                <Separator className="my-3 bg-slate-800" />
                <h3 className="text-xs font-medium text-slate-500 uppercase mb-2">
                  {t("chat.sidebar.groupChats")}
                </h3>
                <div className="space-y-1">
                  {groupConversations.map((group) => renderConversationButton(group, "group"))}
                </div>
              </>
            )}

            {filteredConversations.length === 0 && (
              <div className="text-center py-8 text-slate-500 text-sm">
                <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                {t("chat.sidebar.noConversations")}
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
