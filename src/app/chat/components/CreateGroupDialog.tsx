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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="aixia-dash-panel border-[var(--aixia-dash-border)] bg-[var(--aixia-dash-surface)] text-[var(--aixia-dash-title)] max-w-lg">
        <DialogHeader>
          <DialogTitle className="aixia-dash-panel-title">
            {t("chat.createGroupDialog.title")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="aixia-projects-label mb-2 block text-sm">
              {t("chat.createGroupDialog.groupName")}
            </label>
            <Input
              value={groupName}
              onChange={(e) => onGroupNameChange(e.target.value)}
              placeholder={t("chat.createGroupDialog.groupNamePlaceholder")}
              className="aixia-projects-input"
            />
          </div>

          <div>
            <label className="aixia-projects-label mb-2 block text-sm">
              {t("chat.createGroupDialog.selectMembers")}
            </label>
            <div className="aixia-projects-member-list max-h-64 overflow-y-auto p-2 space-y-2">
              {profiles
                .filter((user) => user.user_id !== currentUserId && user.status === "active")
                .map((user) => (
                  <label
                    key={user.user_id}
                    className="aixia-projects-member-row aixia-projects-member-row--pick cursor-pointer rounded-md px-3 py-2"
                  >
                    <span className="aixia-projects-member-tile-meta flex-1">
                      <span className="aixia-dash-list-row-title">
                        {user.full_name || t("chat.common.unknown")}
                      </span>
                      <span className="aixia-dash-pill">{user.role}</span>
                    </span>

                    <Checkbox
                      checked={selectedGroupMembers.includes(user.user_id)}
                      onCheckedChange={() => onToggleMember(user.user_id)}
                    />
                  </label>
                ))}
            </div>
          </div>

          {error ? <div className="aixia-chat-error">{error}</div> : null}

          <div className="aixia-projects-new-form-footer">
            <Button
              variant="outline"
              className="aixia-dash-action h-9"
              onClick={onCancel}
            >
              {t("chat.createGroupDialog.cancel")}
            </Button>

            <Button
              onClick={onCreate}
              disabled={isCreatingGroup}
              className="aixia-dash-action aixia-dash-action--primary h-9"
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
