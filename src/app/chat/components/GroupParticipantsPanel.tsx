import { useMemo, useState } from "react";
import { Search, UserMinus, UserPlus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { ChatGroupMemberRow, ChatGroupRow, ProfileRow } from "../types";

type Props = {
  open: boolean;
  onClose: () => void;
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

function getInitials(name: string | null | undefined) {
  return (name || "U")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function matchesSearch(
  query: string,
  name: string,
  role: string | undefined,
  extra?: string
) {
  const q = query.trim().toLowerCase();
  if (!q) return true;

  return (
    name.toLowerCase().includes(q) ||
    (role || "").toLowerCase().includes(q) ||
    (extra || "").toLowerCase().includes(q)
  );
}

export default function GroupParticipantsPanel({
  open,
  onClose,
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
  const [searchQuery, setSearchQuery] = useState("");

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

  const filteredMembers = useMemo(() => {
    return members.filter((member) => {
      const profile = profiles.find((item) => item.user_id === member.user_id);
      const invitedByProfile = profiles.find(
        (item) => item.user_id === member.invited_by
      );
      const isCreator = group?.created_by === member.user_id;

      return matchesSearch(
        searchQuery,
        getDisplayName(profile),
        profile?.role,
        [
          onlineUsers[member.user_id] ? "online" : "offline",
          isCreator ? "creator" : "",
          member.invited_by
            ? `added by ${getDisplayName(invitedByProfile)}`
            : "",
        ].join(" ")
      );
    });
  }, [members, profiles, searchQuery, onlineUsers, group?.created_by]);

  const filteredAvailable = useMemo(() => {
    return availableProfiles.filter((profile) =>
      matchesSearch(searchQuery, getDisplayName(profile), profile.role)
    );
  }, [availableProfiles, searchQuery]);

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

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setSearchQuery("");
      onClose();
    }
  };

  const participantLabel =
    members.length === 1 ? "1 participant" : `${members.length} participants`;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="aixia-chat-participants-dialog border-[var(--aixia-dash-border)] bg-[var(--aixia-dash-surface)] text-[var(--aixia-dash-title)] flex max-h-[85vh] w-full max-w-lg flex-col gap-0 overflow-hidden p-0 shadow-none sm:max-w-lg">
        <DialogHeader className="shrink-0 border-b border-[var(--aixia-dash-border)] px-5 py-4">
          <DialogTitle className="aixia-dash-panel-title flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" aria-hidden />
            Participants
            {members.length > 0 ? (
              <span className="aixia-dash-pill font-normal normal-case tracking-normal">
                {members.length}
              </span>
            ) : null}
          </DialogTitle>
        </DialogHeader>

        {!group ? (
          <p className="px-5 py-6 text-sm aixia-projects-muted">No conversation selected.</p>
        ) : !isGroupChat ? (
          <p className="px-5 py-6 text-sm aixia-projects-muted">
            Viewing participants is available here. Add and remove is only enabled for group
            chats.
          </p>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="shrink-0 border-b border-[var(--aixia-dash-border)] px-5 py-3">
              <div className="relative">
                <Search
                  className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden
                />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search members..."
                  className="aixia-projects-input pl-9"
                />
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              <section className="mb-5">
                <h3 className="aixia-projects-label mb-2 text-sm">
                  Current members ({filteredMembers.length})
                </h3>
                <div className="aixia-projects-member-rows aixia-projects-member-rows--divided">
                  {filteredMembers.length === 0 ? (
                    <p className="aixia-dash-empty m-0 py-4 text-sm">
                      {searchQuery.trim()
                        ? "No members match your search."
                        : "No participants yet."}
                    </p>
                  ) : (
                    filteredMembers.map((member) => {
                      const profile = profiles.find(
                        (item) => item.user_id === member.user_id
                      );
                      const isCreator = group.created_by === member.user_id;
                      const removable = canRemoveMember(member);

                      return (
                        <div
                          key={member.id}
                          className="aixia-projects-member-row gap-3 py-2"
                        >
                          <span className="relative shrink-0">
                            <span className="aixia-projects-member-tile-avatar">
                              {getInitials(profile?.full_name)}
                            </span>
                            <span
                              className={`aixia-chat-online-dot ${
                                onlineUsers[member.user_id]
                                  ? "aixia-chat-online-dot--on"
                                  : "aixia-chat-online-dot--off"
                              }`}
                            />
                          </span>

                          <span className="aixia-projects-member-tile-meta min-w-0 flex-1">
                            <span className="aixia-dash-list-row-title truncate">
                              {getDisplayName(profile)}
                            </span>
                            <span className="flex flex-wrap items-center gap-1.5">
                              <span className="aixia-dash-pill capitalize">
                                {profile?.role || "unknown"}
                              </span>
                              {isCreator ? (
                                <span className="aixia-dash-pill">creator</span>
                              ) : null}
                              <span className="aixia-dash-list-row-meta">
                                {onlineUsers[member.user_id] ? "online" : "offline"}
                              </span>
                            </span>
                          </span>

                          {removable ? (
                            <Button
                              type="button"
                              variant="outline"
                              className="aixia-dash-action aixia-dash-action--danger h-8 shrink-0 px-2.5 text-xs"
                              disabled={memberActionLoading === member.id}
                              onClick={() => onRemoveParticipant(member)}
                            >
                              <UserMinus className="mr-1.5 h-3.5 w-3.5" />
                              Remove
                            </Button>
                          ) : isCreator ? (
                            <span className="shrink-0 text-[11px] aixia-projects-muted">
                              Owner
                            </span>
                          ) : null}
                        </div>
                      );
                    })
                  )}
                </div>
              </section>

              {canAddParticipants ? (
                <section>
                  <h3 className="aixia-projects-label mb-2 text-sm">
                    Add members ({filteredAvailable.length})
                  </h3>
                  <div className="aixia-projects-member-list aixia-projects-member-rows p-0">
                    {filteredAvailable.length === 0 ? (
                      <p className="aixia-dash-empty m-0 py-4 text-sm">
                        {searchQuery.trim()
                          ? "No available members match your search."
                          : "Everyone on the team is already in this group."}
                      </p>
                    ) : (
                      filteredAvailable.map((profile) => (
                        <div
                          key={profile.user_id}
                          className="aixia-projects-member-row aixia-projects-member-row--pick gap-3 rounded-md px-1 py-2"
                        >
                          <span className="relative shrink-0">
                            <span className="aixia-projects-member-tile-avatar">
                              {getInitials(profile.full_name)}
                            </span>
                            <span
                              className={`aixia-chat-online-dot ${
                                onlineUsers[profile.user_id]
                                  ? "aixia-chat-online-dot--on"
                                  : "aixia-chat-online-dot--off"
                              }`}
                            />
                          </span>

                          <span className="aixia-projects-member-tile-meta min-w-0 flex-1">
                            <span className="aixia-dash-list-row-title truncate">
                              {getDisplayName(profile)}
                            </span>
                            <span className="flex flex-wrap items-center gap-1.5">
                              <span className="aixia-dash-pill capitalize">
                                {profile.role}
                              </span>
                              <span className="aixia-dash-list-row-meta">
                                {onlineUsers[profile.user_id] ? "online" : "offline"}
                              </span>
                            </span>
                          </span>

                          <Button
                            type="button"
                            variant="outline"
                            className="aixia-dash-action aixia-dash-action--primary h-8 shrink-0 px-2.5 text-xs"
                            disabled={memberActionLoading === "add"}
                            onClick={() => onAddParticipant(profile.user_id)}
                          >
                            <UserPlus className="mr-1.5 h-3.5 w-3.5" />
                            Add
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </section>
              ) : null}
            </div>
          </div>
        )}

        <div className="aixia-projects-new-form-footer shrink-0 border-t border-[var(--aixia-dash-border)] px-5 py-4">
          <span className="text-sm aixia-projects-muted">{participantLabel}</span>
          <Button
            type="button"
            className="aixia-dash-action aixia-dash-action--primary h-9"
            onClick={() => handleOpenChange(false)}
          >
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
