import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/lib/i18n";
import type { ProfileRow } from "../types";

type Props = {
  open: boolean;
  currentUserId: string | null;
  groupName: string;
  selectedGroupMembers: string[];
  profiles: ProfileRow[];
  isCreatingGroup: boolean;
  onOpenChange: (open: boolean) => void;
  onGroupNameChange: (value: string) => void;
  onToggleMember: (userId: string) => void;
  onCreate: () => void;
  onCancel: () => void;
};

export default function CreateGroupDialog({
  open,
  currentUserId,
  groupName,
  selectedGroupMembers,
  profiles,
  isCreatingGroup,
  onOpenChange,
  onGroupNameChange,
  onToggleMember,
  onCreate,
  onCancel,
}: Props) {
  const { t } = useLanguage();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-950 border-slate-800 text-white max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("chat.createGroupDialog.title")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-sm text-slate-300 mb-2 block">
              {t("chat.createGroupDialog.groupName")}
            </label>
            <Input
              value={groupName}
              onChange={(e) => onGroupNameChange(e.target.value)}
              placeholder={t("chat.createGroupDialog.groupNamePlaceholder")}
              className="bg-slate-900 border-slate-800 text-white"
            />
          </div>

          <div>
            <label className="text-sm text-slate-300 mb-2 block">
              {t("chat.createGroupDialog.selectMembers")}
            </label>
            <div className="max-h-64 overflow-y-auto rounded-lg border border-slate-800 bg-slate-900 p-2 space-y-2">
              {profiles
                .filter((user) => user.user_id !== currentUserId && user.status === "active")
                .map((user) => (
                  <label
                    key={user.user_id}
                    className="flex items-center justify-between gap-3 rounded-md px-3 py-2 hover:bg-slate-800 cursor-pointer"
                  >
                    <div>
                      <div className="text-white text-sm font-medium">
                        {user.full_name || t("chat.common.unknown")}
                      </div>
                      <div className="text-slate-500 text-xs">{user.role}</div>
                    </div>

                    <Checkbox
                      checked={selectedGroupMembers.includes(user.user_id)}
                      onCheckedChange={() => onToggleMember(user.user_id)}
                    />
                  </label>
                ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              className="border-slate-700 text-slate-300 hover:bg-slate-800"
              onClick={onCancel}
            >
              {t("chat.createGroupDialog.cancel")}
            </Button>

            <Button
              onClick={onCreate}
              disabled={isCreatingGroup}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {isCreatingGroup
                ? t("chat.createGroupDialog.creating")
                : t("chat.createGroupDialog.createGroup")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
