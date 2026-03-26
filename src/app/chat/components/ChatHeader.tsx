import { CheckSquare, PanelRight, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useLanguage } from "@/lib/i18n";

type Props = {
  title: string;
  participantCount: number;
  initials: string;
  isSelectionMode: boolean;
  isDetailsPanelOpen: boolean;
  onToggleSelectionMode: () => void;
  onToggleDetailsPanel: () => void;
};

export default function ChatHeader({
  title,
  participantCount,
  initials,
  isSelectionMode,
  isDetailsPanelOpen,
  onToggleSelectionMode,
  onToggleDetailsPanel,
}: Props) {
  const { t } = useLanguage();

  return (
    <div className="flex items-center justify-between gap-3 p-4 border-b border-slate-800 shrink-0">
      <div className="flex items-center gap-3 min-w-0">
        <Avatar className="w-10 h-10 shrink-0">
          <AvatarFallback className="bg-indigo-600 text-white">
            {initials}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0">
          <h3 className="text-white font-medium truncate">{title}</h3>
          <div className="flex items-center gap-2 text-slate-500 text-sm">
            <Users className="w-4 h-4 shrink-0" />
            <span>
              {t("chat.header.participantsCount", undefined, {
                total: participantCount,
              })}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Button
          type="button"
          variant="outline"
          className={`border-slate-700 text-slate-200 hover:bg-slate-800 ${
            isDetailsPanelOpen ? "bg-slate-800" : ""
          }`}
          onClick={onToggleDetailsPanel}
        >
          <PanelRight className="w-4 h-4 mr-2" />
          {t("chat.header.details", "Details")}
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
  );
}
