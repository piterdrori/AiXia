// CreateGroupDialog.tsx
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Search, Users } from "lucide-react";
import type { ProfileRow } from "../types";

type Props = {
  open: boolean;
  currentUserId: string | null;
  profiles: ProfileRow[];
  isCreating: boolean;
  error?: string;
  onOpenChange: (open: boolean) => void;
  onCreate: (name: string, memberIds: string[]) => void;
};

export default function CreateGroupDialog({
  open,
  currentUserId,
  profiles,
  isCreating,
  error,
  onOpenChange,
  onCreate,
}: Props) {
  const [name, setName] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const availableProfiles = profiles.filter(p => 
    p.user_id !== currentUserId && 
    p.status === "active" &&
    (p.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
     p.role.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const toggleMember = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleCreate = () => {
    if (!name.trim() || selectedIds.length === 0) return;
    onCreate(name.trim(), selectedIds);
    setName("");
    setSelectedIds([]);
    setSearchQuery("");
  };

  const handleCancel = () => {
    onOpenChange(false);
    setName("");
    setSelectedIds([]);
    setSearchQuery("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-md max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            New Group Chat
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <Input
            placeholder="Group name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="bg-slate-800 border-slate-700 text-white"
          />

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input
              placeholder="Add members..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-slate-800 border-slate-700 text-white"
            />
          </div>

          <div className="text-sm text-slate-400">
            Selected: {selectedIds.length} members
          </div>

          <div className="overflow-y-auto max-h-60 space-y-1 pr-1">
            {availableProfiles.map(profile => (
              <label
                key={profile.user_id}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <Checkbox
                  checked={selectedIds.includes(profile.user_id)}
                  onCheckedChange={() => toggleMember(profile.user_id)}
                />
                <Avatar className="w-8 h-8">
                  <AvatarFallback className="bg-indigo-600 text-white text-xs">
                    {(profile.full_name || "U").split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="text-sm text-white">{profile.full_name || "Unknown"}</div>
                  <div className="text-xs text-slate-500 capitalize">{profile.role}</div>
                </div>
              </label>
            ))}
            
            {availableProfiles.length === 0 && (
              <div className="text-center py-4 text-slate-500 text-sm">
                No members found
              </div>
            )}
          </div>

          {error && (
            <div className="text-sm text-red-400 bg-red-900/20 p-2 rounded">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={handleCancel} className="text-slate-400">
              Cancel
            </Button>
            <Button 
              onClick={handleCreate} 
              disabled={isCreating || !name.trim() || selectedIds.length === 0}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {isCreating ? "Creating..." : "Create Group"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
