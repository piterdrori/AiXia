import { Card, CardContent } from "@/components/ui/card";
import type { TaskRow, ProjectRow, ProfileRow, TaskMemberRow, Role } from "../../lib/task.types";
import { TaskListRow } from "./TaskListRow";
import { getTaskMemberProfiles, getProjectName } from "../../lib/task.utils";
import { canEditTaskEntity, canDeleteTaskEntity } from "@/lib/permissions";
import { useLanguage } from "@/lib/i18n";

interface TaskListViewProps {
  tasks: TaskRow[];
  projects: ProjectRow[];
  profiles: ProfileRow[];
  taskMembers: TaskMemberRow[];
  currentUserId: string | null;
  currentUserRole: Role | null;
  onDelete: (taskId: string) => void;
}

export function TaskListView({
  tasks,
  projects,
  profiles,
  taskMembers,
  currentUserId,
  currentUserRole,
  onDelete,
}: TaskListViewProps) {
  const { t } = useLanguage();

  return (
    <Card className="bg-slate-900/50 border-slate-800">
      <CardContent className="p-0">
        <div className="divide-y divide-slate-800">
          {tasks.map((task) => {
            const assigneeProfiles = getTaskMemberProfiles(task.id, taskMembers, profiles);
            const canEdit = canEditTaskEntity(task, currentUserId, currentUserRole as Role);
            const canDelete = canDeleteTaskEntity(task, currentUserId, currentUserRole as Role);

            return (
              <TaskListRow
                key={task.id}
                task={task}
                assigneeProfiles={assigneeProfiles}
                projectName={getProjectName(task.project_id, projects, t("tasks.fallbacks.noProject"))}
                canEdit={canEdit}
                canDelete={canDelete}
                onDelete={onDelete}
              />
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
