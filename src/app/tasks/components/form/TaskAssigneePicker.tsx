import { useMemo } from "react";
import { Label } from "@/components/ui/label";
import type { ProfileRow, ProjectMemberRow } from "../../lib/task.types";
import { useLanguage } from "@/lib/i18n";

interface TaskAssigneePickerProps {
  projectId: string;
  projectMembers: ProjectMemberRow[];
  profiles: ProfileRow[];
  selectedAssignees: string[];
  toggleAssignee: (userId: string) => void;
  isLoading: boolean;
  disabled?: boolean;
  label?: string;
  helperText?: string;
  selectProjectFirstText?: string;
  loadingText?: string;
  noAvailableText?: string;
}

export function TaskAssigneePicker({
  projectId,
  projectMembers,
  profiles,
  selectedAssignees,
  toggleAssignee,
  isLoading,
  disabled = false,
  label,
  helperText,
  selectProjectFirstText,
  loadingText,
  noAvailableText,
}: TaskAssigneePickerProps) {
  const { t } = useLanguage();

  const availableAssignees = useMemo(() => {
    return projectMembers
      .map((member) => profiles.find((profile) => profile.user_id === member.user_id))
      .filter((profile): profile is ProfileRow => Boolean(profile));
  }, [projectMembers, profiles]);

  const defaultLabel = label || t("taskNew.form.assignMembers");
  const defaultHelper = helperText || t("taskNew.form.visibilityNote");
  const defaultSelectFirst = selectProjectFirstText || t("taskNew.assignees.selectProjectFirst");
  const defaultLoading = loadingText || t("taskNew.assignees.loadingProjectMembers");
  const defaultNoAvailable = noAvailableText || t("taskNew.assignees.noAvailableMembers");

  return (
    <div className="flex h-full min-h-0 flex-col">
      <Label className="shrink-0 text-slate-300">{defaultLabel}</Label>

      <div className="mt-3 flex-1 min-h-0">
        {!projectId ? (
          <div className="text-slate-500 text-sm">{defaultSelectFirst}</div>
        ) : isLoading ? (
          <div className="text-slate-500 text-sm">{defaultLoading}</div>
        ) : availableAssignees.length === 0 ? (
          <div className="text-slate-500 text-sm">{defaultNoAvailable}</div>
        ) : (
          <div className="h-full min-h-0 rounded-lg border border-slate-800 bg-slate-950 p-2 overflow-y-auto">
            <div className="space-y-2">
              {availableAssignees.map((member) => (
                <label
                  key={member.user_id}
                  className="flex items-center justify-between gap-3 rounded-md px-3 py-2 hover:bg-slate-900 cursor-pointer"
                >
                  <div>
                    <div className="text-white text-sm font-medium">
                      {member.full_name || t("taskNew.assignees.unnamedUser")}
                    </div>
                    <div className="text-slate-500 text-xs">{member.role.toUpperCase()}</div>
                  </div>

                  <input
                    type="checkbox"
                    checked={selectedAssignees.includes(member.user_id)}
                    onChange={() => toggleAssignee(member.user_id)}
                    disabled={disabled}
                    className="h-4 w-4"
                  />
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      <p className="mt-3 shrink-0 text-slate-500 text-xs">{defaultHelper}</p>
    </div>
  );
}
