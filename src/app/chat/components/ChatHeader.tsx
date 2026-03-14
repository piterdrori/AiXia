import { CheckSquare, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

type Props = {
  title: string;
  participantCount: number;
  initials: string;
  isSelectionMode: boolean;
  onToggleSelectionMode: () => void;
};

export default function ChatHeader({
  title,
  participantCount,
  initials,
  isSelectionMode,
  onToggleSelectionMode,
}: Props) {
  return (
    <div className="flex items-center justify-between p-4 border-b border-slate-800 shrink-0">
      <div className="flex items-center gap-3 min-w-0">
        <Avatar className="w-10 h-10 shrink-0">
          <AvatarFallback className="bg-indigo-600 text-white">
            {initials}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0">
          <h3 className="text-white font-medium truncate">{title}</h3>
          <p className="text-slate-500 text-sm">{participantCount} participants</p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Button
          type="button"
          variant="outline"
          className="border-slate-700 text-slate-200 hover:bg-slate-800"
          onClick={onToggleSelectionMode}
        >
          {isSelectionMode ? (
            <>
              <X className="w-4 h-4 mr-2" />
              Cancel Selection
            </>
          ) : (
            <>
              <CheckSquare className="w-4 h-4 mr-2" />
              Select Messages
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
