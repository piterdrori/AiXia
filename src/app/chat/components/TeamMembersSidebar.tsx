// TeamMembersSidebar.tsx
import { Search, MessageCircle } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import type { ProfileRow, OnlineStatus, Role } from "../types";
import { useMemo, useState } from "react";
import { isUserOnline } from "../utils";

type Props = {
  profiles: ProfileRow[];
  currentUserId: string | null;
  onlineStatus: OnlineStatus;
  onStartDM: (userId: string) => void;
};

const roleOrder: Record<Role, number> = {
  admin: 0,
  manager: 1,
  employee: 2,
  guest: 3,
};

export default function TeamMembersSidebar({
  profiles,
  currentUserId,
  onlineStatus,
  onStartDM,
}: Props) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "role" | "status">("status");

  const filteredProfiles = useMemo(() => {
    let result = profiles.filter(p => 
      p.user_id !== currentUserId && 
      p.status === "active"
    );
    
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p => 
        (p.full_name || "").toLowerCase().includes(q) ||
        p.role.toLowerCase().includes(q)
      );
    }
    
    result.sort((a, b) => {
      const aOnline = onlineStatus[a.user_id] === "online" || isUserOnline(a.last_seen);
      const bOnline = onlineStatus[b.user_id] === "online" || isUserOnline(b.last_seen);
      
      if (aOnline && !bOnline) return -1;
      if (!aOnline && bOnline) return 1;
      
      if (sortBy === "name") {
        return (a.full_name || "").localeCompare(b.full_name || "");
      } else if (sortBy === "role") {
        return roleOrder[a.role] - roleOrder[b.role] || (a.full_name || "").localeCompare(b.full_name || "");
      }
      return 0;
    });
    
    return result;
  }, [profiles, currentUserId, searchQuery, onlineStatus, sortBy]);

  const getStatusColor = (profile: ProfileRow) => {
    const status = onlineStatus[profile.user_id];
    if (status === "online" || isUserOnline(profile.last_seen)) return "bg-green-500";
    if (status === "busy") return "bg-red-500";
    if (status === "away") return "bg-yellow-500";
    return "bg-slate-500";
  };

  return (
    <Card className="w-full min-w-0 bg-slate-900 border-slate-800 flex flex-col h-full overflow-hidden min-h-0 rounded-none border-y-0 border-r-0">
      <CardContent className="p-0 flex flex-col h-full min-h-0">
        <div className="p-4 border-b border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-white">Team</h2>
            <Badge variant="secondary" className="bg-slate-800 text-slate-300">
              {filteredProfiles.length}
            </Badge>
          </div>
          
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input
              placeholder="Find colleagues..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 h-9"
            />
          </div>
          
          <div className="flex gap-1">
            {(["status", "name", "role"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSortBy(s)}
                className={`px-2 py-1 text-xs rounded capitalize ${
                  sortBy === s ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <ScrollArea className="flex-1 min-h-0">
          <div className="p-2 space-y-1">
            {filteredProfiles.map((profile) => {
              const isOnline = onlineStatus[profile.user_id] === "online" || isUserOnline(profile.last_seen);
              
              return (
                <div
                  key={profile.user_id}
                  className="group flex items-center gap-3 p-2 rounded-lg hover:bg-slate-800/70 transition-colors cursor-pointer"
                  onClick={() => onStartDM(profile.user_id)}
                >
                  <div className="relative shrink-0">
                    <Avatar className="w-10 h-10">
                      {profile.avatar_url ? (
                        <AvatarImage src={profile.avatar_url} />
                      ) : (
                        <AvatarFallback className="bg-indigo-600 text-white text-sm">
                          {(profile.full_name || "U").split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-slate-900 ${getStatusColor(profile)}`} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium text-slate-200 truncate group-hover:text-white">
                        {profile.full_name || "Unknown"}
                      </h4>
                      <MessageCircle className="w-4 h-4 text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <p className="text-xs text-slate-500 capitalize truncate">
                      {profile.role}
                      {isOnline && <span className="text-green-400 ml-1">• online</span>}
                    </p>
                  </div>
                </div>
              );
            })}
            
            {filteredProfiles.length === 0 && (
              <div className="text-center py-6 text-slate-500 text-sm">
                No colleagues found
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
