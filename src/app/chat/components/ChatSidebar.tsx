import { CheckSquare, FolderKanban, Plus, Search, Trash2, Users } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useLanguage } from "@/lib/i18n";
import type { ChatGroupRow, ChatGroupMemberRow, ProfileRow } from "../types";
import {
  getConversationInitials,
  getConversationName,
  getMembersForGroup,
  getUserInitials,
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
  onSearchChange: (value: string) => void;
  onOpenCreateGroup: () => void;
  onOpenConversation: (groupId: string) => void;
  onStartDirectMessage: (userId: string) => void;
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
  onSearchChange,
  onOpenCreateGroup,
  onOpenConversation,
  onStartDirectMessage,
  onDeleteChat,
}: Props) {
  const { t } = useLanguage();
  const q = searchQuery.trim().toLowerCase();

  const filteredConversations = groups.filter((group) =>
    getConversationName(group, currentUserId, profiles, groupMembers, t)
      .toLowerCase()
      .includes(q)
  );

  const directConversations = filteredConversations.filter((group) => group.type === "DIRECT");
  const projectConversations = filteredConversations.filter((group) => group.type === "PROJECT");
  const taskConversations = filteredConversations.filter((group) => group.type === "TASK");
  const groupConversations = filteredConversations.filter((group) => group.type === "GROUP");

  const canDeleteChat = (group: ChatGroupRow) => {
    if (!currentUserId) return false;
    return currentUserRole === "admin" || group.created_by === currentUserId;
  };

  const renderConversationButton = (
    group: ChatGroupRow,
    iconType?: "project" | "task" | "group"
  ) => {
    return (
      <div
        key={group.id}
        className={`w-full rounded-lg transition-all ${
          selectedConversationId === group.id
            ? "bg-indigo-600/20 border border-indigo-500/30"
            : "hover:bg-slate-800/50"
        }`}
      >
        <div className="flex items-center gap-3 p-3">
          <button
            onClick={() => onOpenConversation(group.id)}
            className="flex items-center gap-3 flex-1 text-left min-w-0"
          >
            {iconType ? (
              <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center shrink-0">
                {iconType === "project" && <FolderKanban className="w-5 h-5 text-indigo-400" />}
                {iconType === "task" && <CheckSquare className="w-5 h-5 text-indigo-400" />}
                {iconType === "group" && <Users className="w-5 h-5 text-indigo-400" />}
              </div>
            ) : (
              <Avatar className="w-10 h-10 shrink-0">
                <AvatarFallback className="bg-indigo-600 text-white">
                  {getConversationInitials(group, currentUserId, profiles, groupMembers, t)}
                </AvatarFallback>
              </Avatar>
            )}

            <div className="flex-1 min-w-0">
              <p className="text-white font-medium text-sm truncate">
                {getConversationName(group, currentUserId, profiles, groupMembers, t)}
              </p>
              <p className="text-slate-500 text-xs">
                {t("chat.sidebar.participantsCount", undefined, {
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

        <ScrollArea className="flex-1 min-h-0 -mx-2">
          <div className="space-y-1 px-2">
            <h3 className="text-xs font-medium text-slate-500 uppercase mb-2">
              {t("chat.sidebar.directMessages")}
            </h3>
            {directConversations.map((group) => renderConversationButton(group))}

            {projectConversations.length > 0 && (
              <>
                <Separator className="my-3 bg-slate-800" />
                <h3 className="text-xs font-medium text-slate-500 uppercase mb-2">
                  {t("chat.sidebar.projectChats")}
                </h3>
                {projectConversations.map((group) => renderConversationButton(group, "project"))}
              </>
            )}

            {taskConversations.length > 0 && (
              <>
                <Separator className="my-3 bg-slate-800" />
                <h3 className="text-xs font-medium text-slate-500 uppercase mb-2">
                  {t("chat.sidebar.taskChats")}
                </h3>
                {taskConversations.map((group) => renderConversationButton(group, "task"))}
              </>
            )}

            {groupConversations.length > 0 && (
              <>
                <Separator className="my-3 bg-slate-800" />
                <h3 className="text-xs font-medium text-slate-500 uppercase mb-2">
                  {t("chat.sidebar.groupChats")}
                </h3>
                {groupConversations.map((group) => renderConversationButton(group, "group"))}
              </>
            )}

            <Separator className="my-3 bg-slate-800" />
            <h3 className="text-xs font-medium text-slate-500 uppercase mb-2">
              {t("chat.sidebar.teamMembers")}
            </h3>

            {profiles
              .filter((user) => user.user_id !== currentUserId && user.status === "active")
              .map((user) => (
                <button
                  key={user.user_id}
                  onClick={() => onStartDirectMessage(user.user_id)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-slate-800/50 transition-all"
                >
                  <Avatar className="w-10 h-10 shrink-0">
                    <AvatarFallback className="bg-indigo-600 text-white">
                      {getUserInitials(user.full_name)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 text-left min-w-0">
                    <p className="text-white font-medium text-sm truncate">
                      {user.full_name || t("chat.common.unknown")}
                    </p>
                    <p className="text-slate-500 text-xs">{user.role}</p>
                  </div>

                  <div className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                </button>
              ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
