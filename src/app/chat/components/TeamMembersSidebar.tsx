import { ArrowDownAZ, ArrowUpAZ, MessageCircle, Search, Shield, UserCog, Users } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
    <Card className="w-80 bg-slate-900/50 border-slate-800 flex flex-col h-full overflow-hidden min-h-0 shrink-0">
      <CardContent className="p-0 flex flex-col h-full min-h-0">
        <div className="p-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="min-w-0">
              <h2 className="text-white font-medium">Team Members</h2>
              <p className="text-xs text-slate-500 truncate">
                {filteredProfiles.length} members
              </p>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <Button
                type="button"
                variant={sortMode === "name-asc" ? "default" : "outline"}
                className={
                  sortMode === "name-asc"
                    ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                    : "border-slate-700 text-slate-300 hover:bg-slate-800"
                }
                size="sm"
                onClick={() => setSortMode("name-asc")}
              >
                <ArrowDownAZ className="w-4 h-4" />
              </Button>

              <Button
                type="button"
                variant={sortMode === "name-desc" ? "default" : "outline"}
                className={
                  sortMode === "name-desc"
                    ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                    : "border-slate-700 text-slate-300 hover:bg-slate-800"
                }
                size="sm"
                onClick={() => setSortMode("name-desc")}
              >
                <ArrowUpAZ className="w-4 h-4" />
              </Button>

              <Button
                type="button"
                variant={sortMode === "role" ? "default" : "outline"}
                className={
                  sortMode === "role"
                    ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                    : "border-slate-700 text-slate-300 hover:bg-slate-800"
                }
                size="sm"
                onClick={() => setSortMode("role")}
              >
                <Users className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input
              placeholder="Search team..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-slate-900 border-slate-800 text-white placeholder:text-slate-500"
            />
          </div>
        </div>

        <ScrollArea className="flex-1 min-h-0">
          <div className="p-2 space-y-1">
            {filteredProfiles.map((profile) => (
              <button
                key={profile.user_id}
                type="button"
                onClick={() => onStartDM(profile.user_id)}
                className="w-full group flex items-center gap-3 p-2 rounded-lg hover:bg-slate-800/60 transition text-left"
              >
                <div className="relative">
                  <Avatar className="w-10 h-10 shrink-0">
                    <AvatarFallback className="bg-indigo-600 text-white text-sm">
                      {getInitials(profile.full_name)}
                    </AvatarFallback>
                  </Avatar>

                  <span
                    className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border border-slate-900 ${
                      onlineUsers[profile.user_id] ? "bg-green-500" : "bg-slate-500"
                    }`}
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-white text-sm truncate">
                      {profile.full_name || "Unknown"}
                    </p>
                    <MessageCircle className="w-4 h-4 text-slate-600 opacity-0 group-hover:opacity-100 transition shrink-0" />
                  </div>

                  <div className="flex items-center gap-1 text-xs text-slate-500 capitalize">
                    {profile.role === "admin" ? (
                      <Shield className="w-3 h-3" />
                    ) : profile.role === "manager" ? (
                      <UserCog className="w-3 h-3" />
                    ) : (
                      <Users className="w-3 h-3" />
                    )}
                    <span>{profile.role}</span>
                    <span>•</span>
                    <span>{onlineUsers[profile.user_id] ? "online" : "offline"}</span>
                  </div>
                </div>
              </button>
            ))}

            {filteredProfiles.length === 0 && (
              <div className="text-center py-6 text-slate-500 text-sm">
                No team members found
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
