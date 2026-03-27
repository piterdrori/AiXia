import { useMemo, useState } from "react";
import { Trash2, UserPlus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ChatGroupMemberRow, ChatGroupRow, ProfileRow } from "../types";

type Props = {
  open: boolean;
  group: ChatGroupRow | null;
  currentUserId: string | null;
  currentUserRole: string | null;
  profiles: ProfileRow[];
  groupMembers: ChatGroupMemberRow[];
  onlineUsers: Record<string, boolean>;
  onAddParticipant: (userId: string) => void;
  onRemoveParticipant: (member: ChatGroupMemberRow) => void;
  memberActionLoading: string | null;
};

function getDisplayName(profile: ProfileRow | undefined) {
  return profile?.full_name || "Unknown";
}

export default function GroupParticipantsPanel({
  open,
  group,
  currentUserId,
  currentUserRole,
  profiles,
  groupMembers,
  onlineUsers,
  onAddParticipant,
  onRemoveParticipant,
  memberActionLoading,
}: Props) {
  const [selectedUserId, setSelectedUserId] = useState("");

  const isGroupChat = group?.type === "GROUP";

  const members = useMemo(() => {
    if (!group) return [];

    const result = groupMembers.filter((member) => member.group_id === group.id);

    result.sort((a, b) => {
      const aOnline = onlineUsers[a.user_id] ? 1 : 0;
      const bOnline = onlineUsers[b.user_id] ? 1 : 0;

      if (bOnline !== aOnline) {
        return bOnline - aOnline;
      }

      const aName = getDisplayName(
        profiles.find((item) => item.user_id === a.user_id)
      );
      const bName = getDisplayName(
        profiles.find((item) => item.user_id === b.user_id)
      );

      return aName.localeCompare(bName);
    });

    return result;
  }, [group, groupMembers, onlineUsers, profiles]);

  const canManageAll =
    currentUserRole === "admin" ||
    (group?.created_by && currentUserId === group.created_by);

  const canAddParticipants =
    isGroupChat &&
    Boolean(
      currentUserRole === "admin" ||
        (group?.created_by && currentUserId === group.created_by) ||
        members.some((member) => member.user_id === currentUserId)
    );

  const availableProfiles = useMemo(() => {
    const memberIds = new Set(members.map((member) => member.user_id));

    const result = profiles.filter((profile) => {
      if (profile.status !== "active") return false;
      if (memberIds.has(profile.user_id)) return false;
      return true;
    });

    result.sort((a, b) => {
      const aOnline = onlineUsers[a.user_id] ? 1 : 0;
      const bOnline = onlineUsers[b.user_id] ? 1 : 0;

      if (bOnline !== aOnline) {
        return bOnline - aOnline;
      }

      return getDisplayName(a).localeCompare(getDisplayName(b));
    });

    return result;
  }, [members, profiles, onlineUsers]);

  const canRemoveMember = (member: ChatGroupMemberRow) => {
    if (!isGroupChat || !group || !currentUserId) return false;

    if (member.user_id === group.created_by) {
      return false;
    }

    if (currentUserRole === "admin") {
      return true;
    }

    if (group.created_by === currentUserId) {
      return true;
    }

    if (member.invited_by === currentUserId) {
      return true;
    }

    return false;
  };

  if (!open) return null;

  return (
    <div className="mx-4 mb-4 rounded-xl border border-slate-800 bg-slate-950/70 overflow-hidden shrink-0">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-800">
        <Users className="w-4 h-4 text-indigo-400" />
        <div className="text-white font-medium">Participants</div>
      </div>

      {!group ? null : !isGroupChat ? (
        <div className="px-4 py-4 text-sm text-slate-400">
          Viewing participants is available here. Add / remove is only enabled for group chats.
        </div>
      ) : (
        <div className="px-4 py-4 border-b border-slate-800">
          <div className="text-xs text-slate-500 mb-3">
            Rules: admin and group creator can add/remove. Participants can add. Participants can remove only people they added.
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="flex-1 h-10 rounded-md border border-slate-800 bg-slate-900 px-3 text-sm text-white outline-none"
              disabled={!canAddParticipants}
            >
              <option value="">Select team member</option>
              {availableProfiles.map((profile) => (
                <option key={profile.user_id} value={profile.user_id}>
                  {getDisplayName(profile)} ({profile.role}) {onlineUsers[profile.user_id] ? "• online" : ""}
                </option>
              ))}
            </select>

            <Button
              type="button"
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
              disabled={!canAddParticipants || !selectedUserId || memberActionLoading === "add"}
              onClick={() => {
                if (!selectedUserId) return;
                onAddParticipant(selectedUserId);
                setSelectedUserId("");
              }}
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Add
            </Button>
          </div>
        </div>
      )}

      <ScrollArea className="max-h-64">
        <div className="p-2 space-y-1">
          {members.map((member) => {
            const profile = profiles.find((item) => item.user_id === member.user_id);
            const invitedByProfile = profiles.find(
              (item) => item.user_id === member.invited_by
            );
            const isCreator = group?.created_by === member.user_id;

            return (
              <div
                key={member.id}
                className="flex items-center justify-between gap-3 rounded-lg p-3 hover:bg-slate-900/70"
              >
                <div className="min-w-0 flex items-center gap-3">
                  <span
                    className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                      onlineUsers[member.user_id] ? "bg-green-500" : "bg-slate-500"
                    }`}
                  />

                  <div className="min-w-0">
                    <div className="text-sm text-white truncate">
                      {getDisplayName(profile)}
                    </div>
                    <div className="text-xs text-slate-500 truncate">
                      {profile?.role || "unknown"}
                      {onlineUsers[member.user_id] ? " • online" : " • offline"}
                      {isCreator ? " • creator" : ""}
                      {member.invited_by
                        ? ` • added by ${getDisplayName(invitedByProfile)}`
                        : ""}
                    </div>
                  </div>
                </div>

                {canRemoveMember(member) ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-slate-400 hover:text-red-400"
                    disabled={memberActionLoading === member.id}
                    onClick={() => onRemoveParticipant(member)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                ) : isCreator ? null : canManageAll ? null : (
                  <div className="text-[11px] text-slate-600">locked</div>
                )}
              </div>
            );
          })}

          {members.length === 0 ? (
            <div className="px-3 py-6 text-center text-sm text-slate-500">
              No participants
            </div>
          ) : null}
        </div>
      </ScrollArea>
    </div>
  );
}
