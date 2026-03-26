// MessageComposer.tsx
import { Send, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/lib/i18n";
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
  const { t } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="p-4 border-t border-slate-800 shrink-0 bg-slate-900/30">
      <div className="space-y-2">
        <div className="flex gap-2 items-end">
          <label className="cursor-pointer shrink-0">
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  onUploadFile(file);
                  e.target.value = "";
                }
              }}
              disabled={isUploadingFile}
            />
            <div className={`h-11 w-11 flex items-center justify-center rounded-md transition-colors ${
              isUploadingFile 
                ? "bg-slate-700 cursor-not-allowed" 
                : "bg-slate-800 hover:bg-slate-700"
            }`}>
              <Paperclip className={`w-4 h-4 ${isUploadingFile ? "text-slate-500 animate-pulse" : "text-white"}`} />
            </div>
          </label>

          <Textarea
            placeholder={t("chat.composer.placeholder")}
            value={messageInput}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                onSend();
              }
            }}
            rows={2}
            disabled={isSending || isUploadingFile}
            className="min-h-[44px] max-h-40 bg-slate-950 border-slate-800 text-white placeholder:text-slate-600 resize-none disabled:opacity-50"
          />

          <Button
            onClick={onSend}
            disabled={isSending || isUploadingFile || !messageInput.trim()}
            className="bg-indigo-600 hover:bg-indigo-700 text-white h-11 shrink-0 disabled:opacity-50"
          >
            <Send className={`w-4 h-4 ${isSending ? "animate-pulse" : ""}`} />
          </Button>
        </div>

        {showMentionDropdown && (
          <div className="rounded-lg border border-slate-800 bg-slate-900 shadow-lg overflow-hidden max-h-48 overflow-y-auto">
            {filteredMentionCandidates.length === 0 ? (
              <div className="px-3 py-2 text-sm text-slate-500">
                {t("chat.composer.noMatchingParticipants")}
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
                      {profile.full_name || t("chat.common.unknown")}
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
        
        {isUploadingFile && (
          <div className="text-xs text-indigo-400 animate-pulse">
            Uploading file...
          </div>
        )}
      </div>
    </div>
  );
}
