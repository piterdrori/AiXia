// MessageComposer.tsx
import { Send, Paperclip, Smile } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { ProfileRow } from "../types";
import { useRef } from "react";

type Props = {
  messageInput: string;
  isSending: boolean;
  showMentionDropdown: boolean;
  filteredMentionCandidates: ProfileRow[];
  onChange: (value: string) => void;
  onSend: () => void;
  onInsertMention: (fullName: string) => void;
  onUploadFile: (file: File) => void;
  isUploadingFile: boolean;
};

export default function MessageComposer({
  messageInput,
  isSending,
  showMentionDropdown,
  filteredMentionCandidates,
  onChange,
  onSend,
  onInsertMention,
  onUploadFile,
  isUploadingFile,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="px-6 py-4 border-t border-slate-800 bg-slate-900 shrink-0">
      <div className="relative">
        {showMentionDropdown && (
          <div className="absolute bottom-full left-0 mb-2 w-64 bg-slate-800 border border-slate-700 rounded-lg shadow-xl overflow-hidden z-50">
            {filteredMentionCandidates.length === 0 ? (
              <div className="px-4 py-2 text-sm text-slate-500">No matches found</div>
            ) : (
              filteredMentionCandidates.map(p => (
                <button
                  key={p.user_id}
                  onClick={() => onInsertMention(p.full_name || "")}
                  className="w-full px-4 py-2 text-left hover:bg-slate-700 flex items-center gap-2"
                >
                  <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center text-xs text-white">
                    {p.full_name?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <div className="text-sm text-white">{p.full_name}</div>
                    <div className="text-xs text-slate-500 capitalize">{p.role}</div>
                  </div>
                </button>
              ))
            )}
          </div>
        )}
        
        <div className="flex items-end gap-2 bg-slate-800/50 rounded-2xl p-2 border border-slate-700 focus-within:border-indigo-500/50 transition-colors">
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                onUploadFile(file);
                e.target.value = "";
              }
            }}
          />
          
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="text-slate-400 hover:text-white shrink-0"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploadingFile}
          >
            <Paperclip className={`w-5 h-5 ${isUploadingFile ? "animate-pulse" : ""}`} />
          </Button>

          <Textarea
            value={messageInput}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                onSend();
              }
            }}
            placeholder="Type a message..."
            className="min-h-[44px] max-h-32 bg-transparent border-0 text-white placeholder:text-slate-500 resize-none focus-visible:ring-0"
            rows={1}
          />

          <Button
            variant="ghost"
            size="icon"
            className="text-slate-400 hover:text-yellow-400 shrink-0"
          >
            <Smile className="w-5 h-5" />
          </Button>

          <Button
            onClick={onSend}
            disabled={isSending || !messageInput.trim()}
            className="bg-indigo-600 hover:bg-indigo-700 text-white shrink-0 rounded-xl"
            size="icon"
          >
            <Send className={`w-4 h-4 ${isSending ? "animate-pulse" : ""}`} />
          </Button>
        </div>
        
        {isUploadingFile && (
          <div className="absolute -top-8 left-0 text-xs text-indigo-400 animate-pulse">
            Uploading file...
          </div>
        )}
      </div>
    </div>
  );
}
