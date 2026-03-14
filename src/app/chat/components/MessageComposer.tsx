import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { ProfileRow } from "../types";

type Props = {
  messageInput: string;
  isSending: boolean;
  showMentionDropdown: boolean;
  filteredMentionCandidates: ProfileRow[];
  onChange: (value: string) => void;
  onSend: () => void;
  onInsertMention: (fullName: string) => void;
};

export default function MessageComposer({
  messageInput,
  isSending,
  showMentionDropdown,
  filteredMentionCandidates,
  onChange,
  onSend,
  onInsertMention,
}: Props) {
  return (
    <div className="p-4 border-t border-slate-800 shrink-0">
      <div className="space-y-2">
        <div className="flex gap-2 items-end">
          <Textarea
            placeholder="Type a message..."
            value={messageInput}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                onSend();
              }
            }}
            rows={2}
            className="min-h-[44px] max-h-40 bg-slate-950 border-slate-800 text-white placeholder:text-slate-600 resize-none"
          />

          <Button
            onClick={onSend}
            disabled={isSending || !messageInput.trim()}
            className="bg-indigo-600 hover:bg-indigo-700 text-white h-11"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>

        {showMentionDropdown && (
          <div className="rounded-lg border border-slate-800 bg-slate-900 shadow-lg overflow-hidden">
            {filteredMentionCandidates.length === 0 ? (
              <div className="px-3 py-2 text-sm text-slate-500">
                No matching participants
              </div>
            ) : (
              filteredMentionCandidates.map((profile) => (
                <button
                  key={profile.user_id}
                  type="button"
                  onClick={() => onInsertMention(profile.full_name || "")}
                  className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-slate-800 transition-colors"
                >
                  <div>
                    <div className="text-sm font-medium text-white">
                      {profile.full_name || "Unknown"}
                    </div>
                    <div className="text-xs text-slate-500">
                      {profile.role.toUpperCase()}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
