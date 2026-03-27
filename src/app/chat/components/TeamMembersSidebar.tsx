import { Search, MessageCircle } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useMemo, useState } from "react";
import type { ProfileRow } from "../types";

type Props = {
  profiles: ProfileRow[];
  currentUserId: string | null;
  onStartDM: (userId: string) => void;
};

export default function TeamMembersSidebar({
  profiles,
  currentUserId,
  onStartDM,
}: Props) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredProfiles = useMemo(() => {
    let result = profiles.filter(
      (p) => p.user_id !== currentUserId && p.status === "active"
    );

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          (p.full_name || "").toLowerCase().includes(q) ||
          p.role.toLowerCase().includes(q)
      );
    }

    return result;
  }, [profiles, currentUserId, searchQuery]);

  return (
    <Card className="w-80 bg-slate-900/50 border-slate-800 flex flex-col h-full overflow-hidden min-h-0 shrink-0">
      <CardContent className="p-0 flex flex-col h-full min-h-0">
        
        {/* HEADER */}
        <div className="p-4 border-b border-slate-800">
          <h2 className="text-white font-medium mb-3">Team Members</h2>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input
              placeholder="Search team..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-slate-900 border-slate-800 text-white"
            />
          </div>
        </div>

        {/* LIST */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="p-2 space-y-1">
            {filteredProfiles.map((profile) => (
              <div
                key={profile.user_id}
                onClick={() => onStartDM(profile.user_id)}
                className="group flex items-center gap-3 p-2 rounded-lg hover:bg-slate-800/60 cursor-pointer"
              >
                <Avatar className="w-10 h-10 shrink-0">
                  <AvatarFallback className="bg-indigo-600 text-white text-sm">
                    {(profile.full_name || "U")
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()
                      .slice(0, 2)}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-white text-sm truncate">
                      {profile.full_name || "Unknown"}
                    </p>

                    <MessageCircle className="w-4 h-4 text-slate-600 opacity-0 group-hover:opacity-100 transition" />
                  </div>

                  <p className="text-xs text-slate-500 capitalize">
                    {profile.role}
                  </p>
                </div>
              </div>
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
