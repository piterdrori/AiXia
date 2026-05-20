import { CheckSquare, Search, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/lib/i18n";

type Props = {
  title: string;
  participantCount: number;
  initials: string;
  isSelectionMode: boolean;
  onToggleSelectionMode: () => void;
  messageSearchQuery: string;
  onMessageSearchChange: (value: string) => void;
  isParticipantsPanelOpen: boolean;
  onToggleParticipantsPanel: () => void;
};

export default function ChatHeader({
  title,
  participantCount,
  initials,
  isSelectionMode,
  onToggleSelectionMode,
  messageSearchQuery,
  onMessageSearchChange,
  isParticipantsPanelOpen,
  onToggleParticipantsPanel,
}: Props) {
  const { t } = useLanguage();

  return (
    <header className="aixia-chat-thread-hd">
      <div className="aixia-chat-thread-hd-row">
        <div className="flex min-w-0 items-center gap-3">
          <span className="aixia-projects-member-tile-avatar shrink-0">{initials}</span>

          <span className="aixia-projects-member-tile-meta min-w-0">
            <span className="aixia-dash-list-row-title truncate">{title}</span>
            <span className="aixia-dash-list-row-meta">
              {t("chat.header.participantsCount", undefined, {
                total: participantCount,
              })}
            </span>
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Button
            type="button"
            variant="outline"
            className="aixia-dash-action h-9"
            onClick={onToggleParticipantsPanel}
          >
            <Users className="mr-2 h-4 w-4" />
            {isParticipantsPanelOpen
              ? "Hide Participants"
              : `Participants (${participantCount})`}
          </Button>

          <Button
            type="button"
            variant="outline"
            className="aixia-dash-action h-9"
            onClick={onToggleSelectionMode}
          >
            {isSelectionMode ? (
              <>
                <X className="mr-2 h-4 w-4" />
                {t("chat.header.cancelSelection")}
              </>
            ) : (
              <>
                <CheckSquare className="mr-2 h-4 w-4" />
                {t("chat.header.selectMessages")}
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="aixia-chat-thread-search">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={messageSearchQuery}
            onChange={(e) => onMessageSearchChange(e.target.value)}
            placeholder="Search in this chat..."
            className="aixia-projects-input pl-10"
          />
        </div>
      </div>
    </header>
  );
}
