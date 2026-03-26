import { Users, PanelRight, CheckSquare, X, Phone, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { ChatGroupRow, ChatGroupMemberRow, ProfileRow } from "../types";
import { getConversationName, getConversationInitials, getMembersForGroup } from "../utils";

type Props = {
  group: ChatGroupRow | null;
  currentUserId: string | null;
  profiles: ProfileRow[];
  groupMembers: ChatGroupMemberRow[];
  isSelectionMode: boolean;
  onToggleSelectionMode: () => void;
};

export default function ChatHeader({
  group,
  currentUserId,
  profiles,
  groupMembers,
  isSelectionMode,
  onToggleSelectionMode,
}: Props) {
  if (!group) return null;
  
  const name = getConversationName(group, currentUserId, profiles, groupMembers);
  const initials = getConversationInitials(group, currentUserId, profiles, groupMembers);
  const members = getMembersForGroup(groupMembers, group.id);
  const otherMember = group.type === "DIRECT" ? members.find(m => m.user_id !== currentUserId) : null;
  const otherProfile = otherMember ? profiles.find(p => p.user_id === otherMember.user_id) : null;

  return (
    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50 shrink-0">
      <div className="flex items-center gap-4">
        <Avatar className="w-10 h-10">
          <AvatarFallback className="bg-indigo-600 text-white">
            {initials}
          </AvatarFallback>
        </Avatar>
        
        <div>
          <h2 className="text-lg font-semibold text-white">{name}</h2>
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Users className="w-4 h-4" />
            <span>{members.length} {members.length === 1 ? "member" : "members"}</span>
            {otherProfile && (
              <>
                <span>•</span>
                <span className="capitalize">{otherProfile.role}</span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
          <Phone className="w-5 h-5" />
        </Button>
        <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
          <Video className="w-5 h-5" />
        </Button>
        <div className="w-px h-6 bg-slate-700 mx-2" />
        <Button 
          variant="ghost" 
          size="sm" 
          className={`text-slate-400 hover:text-white ${isSelectionMode ? "bg-indigo-600/20 text-indigo-400" : ""}`}
          onClick={onToggleSelectionMode}
        >
          {isSelectionMode ? (
            <>
              <X className="w-4 h-4 mr-2" />
              Cancel
            </>
          ) : (
            <>
              <CheckSquare className="w-4 h-4 mr-2" />
              Select
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
