import { ArrowDownAZ, ArrowUpAZ, MessageCircle, Search, Shield, UserCog, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useMemo, useState } from "react";
import type { ProfileRow } from "../types";

type Props = {
  profiles: ProfileRow[];
  currentUserId: string | null;
  onlineUsers: Record<string, boolean>;
  onStartDM: (userId: string) => void;
};

type SortMode = "name-asc" | "name-desc" | "role";

function getInitials(name: string | null | undefined) {
  return (name || "U")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function getRoleWeight(role: string) {
  if (role === "admin") return 0;
  if (role === "manager") return 1;
  if (role === "employee") return 2;
  return 3;
}

export default function TeamMembersSidebar({
  profiles,
  currentUserId,
  onlineUsers,
  onStartDM,
}: Props) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("name-asc");

  const filteredProfiles = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    const result = profiles.filter((profile) => {
      if (profile.user_id === currentUserId) return false;
      if (profile.status !== "active") return false;

      if (!q) return true;

      return (
        (profile.full_name || "").toLowerCase().includes(q) ||
        profile.role.toLowerCase().includes(q)
      );
    });

    result.sort((a, b) => {
      const aOnline = onlineUsers[a.user_id] ? 1 : 0;
      const bOnline = onlineUsers[b.user_id] ? 1 : 0;

      if (bOnline !== aOnline) {
        return bOnline - aOnline;
      }

      if (sortMode === "role") {
        const roleDiff = getRoleWeight(a.role) - getRoleWeight(b.role);
        if (roleDiff !== 0) return roleDiff;
        return (a.full_name || "").localeCompare(b.full_name || "");
      }

      if (sortMode === "name-desc") {
        return (b.full_name || "").localeCompare(a.full_name || "");
      }

      return (a.full_name || "").localeCompare(b.full_name || "");
    });

    return result;
  }, [profiles, currentUserId, searchQuery, sortMode, onlineUsers]);

  return (
    <aside className="aixia-chat-panel aixia-chat-panel--team aixia-dash-panel aixia-dash-glass aixia-projects-panel-card flex min-h-0 flex-col">
      <div className="aixia-chat-panel-hd">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h2 className="aixia-dash-panel-title text-base">Team Members</h2>
            <p className="aixia-dash-list-row-meta truncate">
              {filteredProfiles.length} members
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <Button
              type="button"
              variant={sortMode === "name-asc" ? "default" : "outline"}
              className={
                sortMode === "name-asc"
                  ? "aixia-dash-action aixia-dash-action--primary h-8 w-8 p-0"
                  : "aixia-dash-action h-8 w-8 p-0"
              }
              size="sm"
              onClick={() => setSortMode("name-asc")}
            >
              <ArrowDownAZ className="h-4 w-4" />
            </Button>

            <Button
              type="button"
              variant={sortMode === "name-desc" ? "default" : "outline"}
              className={
                sortMode === "name-desc"
                  ? "aixia-dash-action aixia-dash-action--primary h-8 w-8 p-0"
                  : "aixia-dash-action h-8 w-8 p-0"
              }
              size="sm"
              onClick={() => setSortMode("name-desc")}
            >
              <ArrowUpAZ className="h-4 w-4" />
            </Button>

            <Button
              type="button"
              variant={sortMode === "role" ? "default" : "outline"}
              className={
                sortMode === "role"
                  ? "aixia-dash-action aixia-dash-action--primary h-8 w-8 p-0"
                  : "aixia-dash-action h-8 w-8 p-0"
              }
              size="sm"
              onClick={() => setSortMode("role")}
            >
              <Users className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search team..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="aixia-projects-input pl-9"
          />
        </div>
      </div>

      <div className="aixia-chat-panel-body flex min-h-0 flex-1 flex-col">
        <ScrollArea className="aixia-chat-panel-scroll min-h-0 flex-1">
          <div className="space-y-1 p-2">
          {filteredProfiles.map((profile) => (
            <button
              key={profile.user_id}
              type="button"
              onClick={() => onStartDM(profile.user_id)}
              className="aixia-chat-team-row group"
            >
              <div className="relative shrink-0">
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
              </div>

              <span className="aixia-projects-member-tile-meta min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2">
                  <span className="aixia-dash-list-row-title truncate">
                    {profile.full_name || "Unknown"}
                  </span>
                  <MessageCircle className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition group-hover:opacity-100" />
                </span>

                <span className="flex items-center gap-1 text-xs capitalize aixia-dash-list-row-meta">
                  {profile.role === "admin" ? (
                    <Shield className="h-3 w-3" />
                  ) : profile.role === "manager" ? (
                    <UserCog className="h-3 w-3" />
                  ) : (
                    <Users className="h-3 w-3" />
                  )}
                  <span>{profile.role}</span>
                  <span>•</span>
                  <span>{onlineUsers[profile.user_id] ? "online" : "offline"}</span>
                </span>
              </span>
            </button>
          ))}

          {filteredProfiles.length === 0 && (
            <div className="py-6 text-center text-sm aixia-projects-muted">
              No team members found
            </div>
          )}
        </div>
        </ScrollArea>
      </div>
    </aside>
  );
}
