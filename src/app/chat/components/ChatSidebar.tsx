import { Plus, Search, Trash2, MoreHorizontal } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import type { ChatGroupRow, ChatGroupMemberRow, ProfileRow, UnreadCounts } from "../types";
import { getConversationName, getConversationInitials, getMembersForGroup, formatLastMessageTime } from "../utils";
import { useMemo, useState } from "react";

type Props = {
  currentUserId: string | null;
  currentUserRole: string | null;
  groups: ChatGroupRow[];
  groupMembers: ChatGroupMemberRow[];
  profiles: ProfileRow[];
  searchQuery: string;
  selectedConversationId: string | null;
  groupActionLoading: string | null;
  unreadCounts: UnreadCounts;
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
  const [filter, setFilter] = useState<"all" | "direct" | "group">("all");
  
  const filteredGroups = useMemo(() => {
    let result = groups;
    
    // Apply search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(g => 
        getConversationName(g, currentUserId, profiles, groupMembers).toLowerCase().includes(q)
      );
    }
    
    // Apply type filter
    if (filter === "direct") {
      result = result.filter(g => g.type === "DIRECT");
    } else if (filter === "group") {
      result = result.filter(g => g.type === "GROUP" || g.type === "PROJECT" || g.type === "TASK");
    }
    
    return result;
  }, [groups, searchQuery, filter, currentUserId, profiles, groupMembers]);

  const canDeleteChat = (group: ChatGroupRow) => {
    if (!currentUserId) return false;
    if (currentUserRole === "admin") return true;
    if (group.type === "DIRECT") {
      return groupMembers.some(m => m.group_id === group.id && m.user_id === currentUserId);
    }
    return group.created_by === currentUserId;
  };

  return (
    <Card className="w-80 bg-slate-900 border-slate-800 flex flex-col h-full overflow-hidden min-h-0 rounded-none border-y-0 border-l-0">
      <CardContent className="p-0 flex flex-col h-full min-h-0">
        {/* Header */}
        <div className="p-4 border-b border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Messages</h2>
            <Button size="icon" variant="ghost" onClick={onOpenCreateGroup} className="text-slate-400 hover:text-white">
              <Plus className="w-5 h-5" />
            </Button>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
            />
          </div>
          
          {/* Filter tabs */}
          <div className="flex gap-1 mt-3">
            {(["all", "direct", "group"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 text-xs rounded-full capitalize ${
                  filter === f ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Conversations list */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="divide-y divide-slate-800/50">
            {filteredGroups.map((group) => {
              const unread = unreadCounts[group.id] || 0;
              const isSelected = selectedConversationId === group.id;
              const name = getConversationName(group, currentUserId, profiles, groupMembers);
              const memberCount = getMembersForGroup(groupMembers, group.id).length;
              const lastMsg = group.last_message;
              const lastTime = group.last_message_at ? formatLastMessageTime(group.last_message_at) : "";
              
              return (
                <div
                  key={group.id}
                  onClick={() => onOpenConversation(group.id)}
                  className={`group flex items-center gap-3 p-3 cursor-pointer transition-colors ${
                    isSelected ? "bg-indigo-600/20 border-l-2 border-indigo-500" : "hover:bg-slate-800/50 border-l-2 border-transparent"
                  } ${unread > 0 ? "bg-slate-800/30" : ""}`}
                >
                  <Avatar className={`w-12 h-12 shrink-0 ${unread > 0 ? "ring-2 ring-indigo-500" : ""}`}>
                    <AvatarFallback className="bg-indigo-600 text-white text-sm">
                      {getConversationInitials(group, currentUserId, profiles, groupMembers)}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <h3 className={`font-medium truncate ${unread > 0 ? "text-white" : "text-slate-200"}`}>
                        {name}
                      </h3>
                      {lastTime && (
                        <span className="text-xs text-slate-500 shrink-0 ml-2">{lastTime}</span>
                      )}
                    </div>
                    
                    <p className={`text-sm truncate ${unread > 0 ? "text-slate-300 font-medium" : "text-slate-500"}`}>
                      {lastMsg || (group.type === "DIRECT" ? "Direct Message" : `${memberCount} members`)}
                    </p>
                  </div>
                  
                  {unread > 0 && (
                    <Badge className="bg-red-500 text-white border-0 shrink-0 min-w-[20px] flex justify-center">
                      {unread > 99 ? "99+" : unread}
                    </Badge>
                  )}
                  
                  {canDeleteChat(group) && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteChat(group);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-red-400 transition-opacity"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              );
            })}
            
            {filteredGroups.length === 0 && (
              <div className="text-center py-8 text-slate-500">
                <p>No conversations found</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
