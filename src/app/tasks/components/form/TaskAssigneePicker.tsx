import { useMemo, useCallback } from "react";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/lib/i18n";

import type {
  ProfileRow,
  ProjectMemberRow,
} from "../../lib/task.types";

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

  // =========================
  // MAP FOR PERFORMANCE (O(1) lookup)
  // =========================

  const profileMap = useMemo(() => {
    const map = new Map<string, ProfileRow>();
    for (const p of profiles) {
      map.set(p.user_id, p);
    }
    return map;
  }, [profiles]);

  // =========================
  // DERIVED ASSIGNEES (O(n))
  // =========================

  const availableAssignees = useMemo(() => {
    return projectMembers
      .map((member) => profileMap.get(member.user_id))
      .filter((p): p is ProfileRow => Boolean(p));
  }, [projectMembers, profileMap]);

  // =========================
  // TEXT CONFIG (CENTRALIZED)
  // =========================

  const text = useMemo(() => {
    return {
      label: label || t("taskNew.form.assignMembers"),
      helper:
        helperText || t("taskNew.form.visibilityNote"),
      selectFirst:
        selectProjectFirstText ||
        t("taskNew.assignees.selectProjectFirst"),
      loading:
        loadingText ||
        t("taskNew.assignees.loadingProjectMembers"),
      noAvailable:
        noAvailableText ||
        t("taskNew.assignees.noAvailableMembers"),
      unnamed:
        t("taskNew.assignees.unnamedUser"),
    };
  }, [
    t,
    label,
    helperText,
    selectProjectFirstText,
    loadingText,
    noAvailableText,
  ]);

  // =========================
  // HANDLERS
  // =========================

  const handleToggle = useCallback(
    (userId: string) => {
      if (disabled) return;
      toggleAssignee(userId);
    },
    [toggleAssignee, disabled]
  );

  // =========================
  // EMPTY STATES
  // =========================

  const renderEmptyState = () => {
    if (!projectId) return text.selectFirst;
    if (isLoading) return text.loading;
    if (availableAssignees.length === 0)
      return text.noAvailable;
    return null;
  };

  const emptyState = renderEmptyState();

  // =========================
  // RENDER
  // =========================

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* LABEL */}
      <Label className="shrink-0 text-slate-300">
        {text.label}
      </Label>

      {/* BODY */}
      <div className="mt-3 flex-1 min-h-0">
        {emptyState ? (
          <div className="text-slate-500 text-sm">
            {emptyState}
          </div>
        ) : (
          <div className="h-full min-h-0 overflow-y-auto rounded-lg border border-slate-800 bg-slate-950 p-2">
            <div className="space-y-2">
              {availableAssignees.map((member) => {
                const isChecked =
                  selectedAssignees.includes(member.user_id);

                return (
                  <label
                    key={member.user_id}
                    className="flex items-center justify-between gap-3 rounded-md px-3 py-2 hover:bg-slate-900 cursor-pointer"
                  >
                    <div>
                      <div className="text-white text-sm font-medium">
                        {member.full_name || text.unnamed}
                      </div>

                      <div className="text-slate-500 text-xs">
                        {member.role.toUpperCase()}
                      </div>
                    </div>

                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() =>
                        handleToggle(member.user_id)
                      }
                      disabled={disabled}
                      className="h-4 w-4"
                    />
                  </label>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* FOOTER */}
      <p className="mt-3 shrink-0 text-slate-500 text-xs">
        {text.helper}
      </p>
    </div>
  );
}
