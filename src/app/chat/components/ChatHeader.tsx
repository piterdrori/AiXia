// ChatHeader.tsx
import { CheckSquare, PanelRight, Users, X, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useLanguage } from "@/lib/i18n";

type Props = {
  title: string;
  participantCount: number;
  initials: string;
  isSelectionMode: boolean;
  isDetailsPanelOpen: boolean;
  unreadCount?: number; // New
  onToggleSelectionMode: () => void;
  onToggleDetailsPanel: () => void;
};

export default function ChatHeader({
  title,
  participantCount,
  initials,
  isSelectionMode,
  isDetailsPanelOpen,
  unreadCount = 0,
  onToggleSelectionMode,
  onToggleDetailsPanel,
}: Props) {
  const { t } = useLanguage();

  return (
    <div className="flex items-center justify-between gap-3 p-4 border-b border-slate-800 shrink-0 bg-slate-900/30">
      <div className="flex items-center gap-3 min-w-0">
        <div className="relative">
          <Avatar className="w-10 h-10 shrink-0">
            <AvatarFallback className="bg-indigo-600 text-white">
              {initials}
            </AvatarFallback>
          </Avatar>
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center border-2 border-slate-900">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </div>

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
          size="sm"
          className={`border-slate-700 text-slate-200 hover:bg-slate-800 ${
            isDetailsPanelOpen ? "bg-slate-800 border-indigo-500/50" : ""
          }`}
          onClick={onToggleDetailsPanel}
        >
          <PanelRight className="w-4 h-4 mr-2" />
          {t("chat.header.details", "Details")}
        </Button>

        <Button
          type="button"
          variant="outline"
          size="sm"
          className={`border-slate-700 text-slate-200 hover:bg-slate-800 ${
            isSelectionMode ? "bg-indigo-600/20 border-indigo-500/50" : ""
          }`}
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
