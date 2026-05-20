import { Send, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/lib/i18n";
import type { ProfileRow } from "../types";

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

  return (
    <footer className="aixia-chat-composer">
      <div className="space-y-2">
        <div className="aixia-chat-composer-row">
          <label className="aixia-chat-composer-attach cursor-pointer">
            <input
              type="file"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  onUploadFile(file);
                  e.target.value = "";
                }
              }}
            />
            <Paperclip className="h-4 w-4" />
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
            className="aixia-projects-textarea min-h-[44px] max-h-40 flex-1 resize-none"
          />

          <Button
            onClick={onSend}
            disabled={isSending || isUploadingFile || !messageInput.trim()}
            className="aixia-dash-action aixia-dash-action--primary h-11 shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>

        {showMentionDropdown && (
          <div className="aixia-chat-mention-menu">
            {filteredMentionCandidates.length === 0 ? (
              <div className="px-3 py-2 text-sm aixia-projects-muted">
                {t("chat.composer.noMatchingParticipants")}
              </div>
            ) : (
              filteredMentionCandidates.map((profile) => (
                <button
                  key={profile.user_id}
                  type="button"
                  onClick={() => onInsertMention(profile.full_name || "")}
                  className="aixia-chat-mention-item"
                >
                  <span className="aixia-projects-member-tile-meta">
                    <span className="aixia-dash-list-row-title">
                      {profile.full_name || t("chat.common.unknown")}
                    </span>
                    <span className="aixia-dash-pill">{profile.role.toUpperCase()}</span>
                  </span>
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </footer>
  );
}
