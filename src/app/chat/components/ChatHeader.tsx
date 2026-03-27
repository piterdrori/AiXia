import { CheckSquare, Search, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
    <div className="border-b border-slate-800 shrink-0">
      <div className="flex items-center justify-between gap-3 p-4">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar className="w-10 h-10 shrink-0">
            <AvatarFallback className="bg-indigo-600 text-white">
              {initials}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0">
            <h3 className="text-white font-medium truncate">{title}</h3>
            <p className="text-slate-500 text-sm">
              {t("chat.header.participantsCount", undefined, {
                total: participantCount,
              })}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            type="button"
            variant="outline"
            className="border-slate-700 text-slate-200 hover:bg-slate-800"
            onClick={onToggleParticipantsPanel}
          >
            <Users className="w-4 h-4 mr-2" />
            {isParticipantsPanelOpen ? "Hide Participants" : "Participants"}
          </Button>

          <Button
            type="button"
            variant="outline"
            className="border-slate-700 text-slate-200 hover:bg-slate-800"
            onClick={onToggleSelectionMode}
          >
            {isSelectionMode ? (
              <>
                <X className="w-4 h-4 mr-2" />
                {t("chat.header.cancelSelection")}
              </>
            ) : (
              <>
                <CheckSquare className="w-4 h-4 mr-2" />
                {t("chat.header.selectMessages")}
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="px-4 pb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <Input
            value={messageSearchQuery}
            onChange={(e) => onMessageSearchChange(e.target.value)}
            placeholder="Search in this chat..."
            className="pl-10 bg-slate-950 border-slate-800 text-white placeholder:text-slate-600"
          />
        </div>
      </div>
    </div>
  );
}
