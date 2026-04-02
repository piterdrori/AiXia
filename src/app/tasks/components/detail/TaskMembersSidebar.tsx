import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserPlus, UserMinus } from "lucide-react";
import type { TaskMemberRow, ProfileRow } from "../../lib/task.types";
import { getProfileName } from "../../lib/task.utils";
import { useLanguage } from "@/lib/i18n";

interface TaskMembersSidebarProps {
  taskMembers: TaskMemberRow[];
  profiles: ProfileRow[];
  availableEmployees: ProfileRow[];
  canManageMembers: boolean;
  memberSaving: boolean;
  memberActionLoading: string | null;
  showManageMembers: boolean;
  onShowManageMembersChange: (show: boolean) => void;
  onAddMember: (employeeId: string) => void;
  onRemoveMember: (member: TaskMemberRow) => void;
}

export function TaskMembersSidebar({
  taskMembers,
  profiles,
  availableEmployees,
  canManageMembers,
  memberSaving,
  memberActionLoading,
  showManageMembers,
  onShowManageMembersChange,
  onAddMember,
  onRemoveMember,
}: TaskMembersSidebarProps) {
  const { t } = useLanguage();
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");

  return (
    <Card className="bg-slate-900/50 border-slate-800 min-h-0 lg:min-h-0 lg:flex lg:flex-1 lg:flex-col overflow-hidden">
      <CardHeader className="shrink-0">
        <div className="flex items-center justify-between gap-4">
          <CardTitle className="text-white">{t("taskDetail.members.title")}</CardTitle>

          {canManageMembers && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-slate-700 text-slate-300 hover:bg-slate-800"
              onClick={() => onShowManageMembersChange(!showManageMembers)}
            >
              <UserPlus className="w-4 h-4 mr-2" />
              {showManageMembers
                ? t("taskDetail.members.actions.close")
                : t("taskDetail.members.actions.addRemove")}
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex flex-1 min-h-0 flex-col space-y-3">
        {canManageMembers && showManageMembers && (
          <div className="shrink-0 rounded-lg border border-slate-800 bg-slate-950/50 p-3 space-y-3">
            <div className="space-y-2">
              <div className="text-sm font-medium text-slate-300">
                {t("taskDetail.members.actions.addMember")}
              </div>

              <div className="flex flex-col gap-2">
                <Select
                  value={selectedEmployeeId}
                  onValueChange={setSelectedEmployeeId}
                  disabled={memberSaving}
                >
                  <SelectTrigger className="w-full bg-slate-900 border-slate-700 text-white">
                    <SelectValue placeholder={t("taskDetail.members.actions.selectMember")} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableEmployees.length === 0 ? (
                      <SelectItem value="__no_employees__" disabled>
                        {t("taskDetail.members.actions.noAvailableMembers")}
                      </SelectItem>
                    ) : (
                      availableEmployees.map((profile) => (
                        <SelectItem key={profile.user_id} value={profile.user_id}>
                          {profile.full_name || t("taskDetail.fallbacks.unknown")}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>

                <Button
                  type="button"
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
                  onClick={() => {
                    if (selectedEmployeeId) {
                      onAddMember(selectedEmployeeId);
                      setSelectedEmployeeId("");
                    }
                  }}
                  disabled={memberSaving || !selectedEmployeeId}
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  {memberSaving ? t("taskDetail.members.actions.adding") : t("taskDetail.members.actions.add")}
                </Button>
              </div>
            </div>
          </div>
        )}

        {taskMembers.length === 0 ? (
          <p className="text-slate-500">{t("taskDetail.members.empty")}</p>
        ) : (
          <div className="flex-1 min-h-0 overflow-y-auto pb-6 pr-1 space-y-3 scrollbar-thin scrollbar-thumb-slate-700 hover:scrollbar-thumb-slate-600">
            {taskMembers.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-950/40 p-3"
              >
                <div className="min-w-0">
                  <span className="text-white">{getProfileName(member.user_id, profiles, t("taskDetail.fallbacks.unknown"))}</span>
                </div>

                <div className="flex items-center gap-2">
                  <Badge className="bg-slate-800 text-slate-300">{member.role}</Badge>

                  {canManageMembers && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="border-red-800 text-red-400 hover:bg-red-900/20"
                      onClick={() => onRemoveMember(member)}
                      disabled={memberActionLoading === member.id}
                    >
                      <UserMinus className="w-3 h-3 mr-1" />
                      {t("taskDetail.members.actions.remove")}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
