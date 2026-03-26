// CreateGroupDialog.tsx
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/lib/i18n";
import type { ProfileRow } from "../types";
import { useMemo } from "react";

type Props = {
  open: boolean;
  currentUserId: string | null;
  groupName: string;
  selectedGroupMembers: string[];
  profiles: ProfileRow[];
  isCreatingGroup: boolean;
  error?: string;
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
  error,
  onOpenChange,
  onGroupNameChange,
  onToggleMember,
  onCreate,
  onCancel,
}: Props) {
  const { t } = useLanguage();

  const availableProfiles = useMemo(() => {
    return profiles.filter((user) => user.user_id !== currentUserId && user.status === "active");
  }, [profiles, currentUserId]);

  const isValid = groupName.trim().length > 0 && selectedGroupMembers.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-950 border-slate-800 text-white max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{t("chat.createGroupDialog.title")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto pr-1">
          <div>
            <label className="text-sm text-slate-300 mb-2 block">
              {t("chat.createGroupDialog.groupName")} *
            </label>
            <Input
              value={groupName}
              onChange={(e) => onGroupNameChange(e.target.value)}
              placeholder={t("chat.createGroupDialog.groupNamePlaceholder")}
              className="bg-slate-900 border-slate-800 text-white"
              autoFocus
            />
          </div>

          <div>
            <label className="text-sm text-slate-300 mb-2 block">
              {t("chat.createGroupDialog.selectMembers")} *
              <span className="text-slate-500 ml-1">
                ({selectedGroupMembers.length} selected)
              </span>
            </label>
            <div className="max-h-64 overflow-y-auto rounded-lg border border-slate-800 bg-slate-900 p-2 space-y-1">
              {availableProfiles.length === 0 ? (
                <div className="text-center py-4 text-slate-500 text-sm">
                  No active users available
                </div>
              ) : (
                availableProfiles.map((user) => (
                  <label
                    key={user.user_id}
                    className="flex items-center justify-between gap-3 rounded-md px-3 py-2 hover:bg-slate-800 cursor-pointer transition-colors"
                  >
                    <div>
                      <div className="text-white text-sm font-medium">
                        {user.full_name || t("chat.common.unknown")}
                      </div>
                      <div className="text-slate-500 text-xs capitalize">{user.role}</div>
                    </div>

                    <Checkbox
                      checked={selectedGroupMembers.includes(user.user_id)}
                      onCheckedChange={() => onToggleMember(user.user_id)}
                    />
                  </label>
                ))
              )}
            </div>
          </div>

          {error ? (
            <div className="rounded-md border border-red-800 bg-red-900/20 px-3 py-2 text-sm text-red-300">
              {error}
            </div>
          ) : null}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              className="border-slate-700 text-slate-300 hover:bg-slate-800"
              onClick={onCancel}
              disabled={isCreatingGroup}
            >
              {t("chat.createGroupDialog.cancel")}
            </Button>

            <Button
              onClick={onCreate}
              disabled={isCreatingGroup || !isValid}
              className="bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50"
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
