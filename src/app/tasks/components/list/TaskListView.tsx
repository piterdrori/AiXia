import { useMemo, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useLanguage } from "@/lib/i18n";
import {
  canEditTaskEntity,
  canDeleteTaskEntity,
} from "@/lib/permissions";

import { TaskListRow } from "./TaskListRow";
import {
  getTaskMemberProfiles,
  getProjectName,
} from "../../lib/task.utils";

import type {
  TaskRow,
  ProjectRow,
  ProfileRow,
  TaskMemberRow,
  Role,
} from "../../lib/task.types";

interface TaskListViewProps {
  tasks: TaskRow[];
  projects: ProjectRow[];
  profiles: ProfileRow[];
  taskMembers: TaskMemberRow[];
  currentUserId: string | null;
  currentUserRole: Role | null;
  onDelete: (taskId: string) => void;
}

export function TaskListView(props: TaskListViewProps) {
  const {
    tasks,
    projects,
    profiles,
    taskMembers,
    currentUserId,
    currentUserRole,
    onDelete,
  } = props;

  const { t } = useLanguage();

  // =========================
  // PRECOMPUTE VIEW MODEL
  // =========================

  const preparedTasks = useMemo(() => {
    return tasks.map((task) => {
      const assigneeProfiles = getTaskMemberProfiles(
        task.id,
        taskMembers,
        profiles
      );

      const canEdit = currentUserRole
        ? canEditTaskEntity(task, currentUserId, currentUserRole)
        : false;

      const canDelete = currentUserRole
        ? canDeleteTaskEntity(task, currentUserId, currentUserRole)
        : false;

      const projectName = getProjectName(
        task.project_id,
        projects,
        t("tasks.fallbacks.noProject")
      );

      return {
        task,
        assigneeProfiles,
        canEdit,
        canDelete,
        projectName,
      };
    });
  }, [
    tasks,
    taskMembers,
    profiles,
    projects,
    currentUserId,
    currentUserRole,
    t,
  ]);

  // =========================
  // RENDER HELPERS
  // =========================

  const renderRow = useCallback(
    (item: (typeof preparedTasks)[number]) => {
      return (
        <TaskListRow
          key={item.task.id}
          task={item.task}
          assigneeProfiles={item.assigneeProfiles}
          projectName={item.projectName}
          canEdit={item.canEdit}
          canDelete={item.canDelete}
          onDelete={onDelete}
        />
      );
    },
    [onDelete]
  );

  // =========================
  // EMPTY STATE
  // =========================

  const isEmpty = preparedTasks.length === 0;

  // =========================
  // RENDER
  // =========================

  return (
    <Card className="bg-slate-900/50 border-slate-800">
      <CardContent className="p-0">
        {isEmpty ? (
          <div className="p-6 text-center text-slate-500">
            {t("tasks.empty.noTasks")}
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {preparedTasks.map(renderRow)}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
