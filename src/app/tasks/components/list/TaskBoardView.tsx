import { useMemo, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/lib/i18n";
import {
  canEditTaskEntity,
  canDeleteTaskEntity,
} from "@/lib/permissions";

import { TaskCard } from "./TaskCard";
import { STATUS_COLUMNS } from "../../lib/task.constants";
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

interface TaskBoardViewProps {
  tasks: TaskRow[];
  projects: ProjectRow[];
  profiles: ProfileRow[];
  taskMembers: TaskMemberRow[];
  currentUserId: string | null;
  currentUserRole: Role | null;
  onDelete: (taskId: string) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, status: string) => void;
}

export function TaskBoardView(props: TaskBoardViewProps) {
  const {
    tasks,
    projects,
    profiles,
    taskMembers,
    currentUserId,
    currentUserRole,
    onDelete,
    onDragOver,
    onDrop,
  } = props;

  const { t } = useLanguage();

  // =========================
  // PRE-COMPUTE TASKS BY STATUS
  // =========================

  const tasksByStatus = useMemo(() => {
    const map: Record<string, TaskRow[]> = {};

    for (const column of STATUS_COLUMNS) {
      map[column.id] = [];
    }

    for (const task of tasks) {
      const status = (task.status || "").toUpperCase();
      if (map[status]) {
        map[status].push(task);
      }
    }

    return map;
  }, [tasks]);

  // =========================
  // HELPERS
  // =========================

  const handleDropColumn = useCallback(
    (status: string) => (e: React.DragEvent) => {
      onDrop(e, status);
    },
    [onDrop]
  );

  const renderTaskCard = useCallback(
    (task: TaskRow) => {
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

      return (
        <TaskCard
          key={task.id}
          task={task}
          assigneeProfiles={assigneeProfiles}
          projectName={projectName}
          canEdit={canEdit}
          canDelete={canDelete}
          onDelete={onDelete}
        />
      );
    },
    [
      taskMembers,
      profiles,
      projects,
      currentUserId,
      currentUserRole,
      onDelete,
      t,
    ]
  );

  // =========================
  // RENDER
  // =========================

  return (
    <div className="h-[calc(100vh-260px)] min-h-0">
      <div className="grid h-full min-h-0 grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {STATUS_COLUMNS.map((column) => {
          const columnTasks = tasksByStatus[column.id] || [];

          return (
            <div
              key={column.id}
              className="flex h-full min-h-0 flex-col rounded-lg border border-slate-800 bg-slate-900/30"
              onDragOver={onDragOver}
              onDrop={handleDropColumn(column.id)}
            >
              {/* HEADER */}
              <div className="shrink-0 border-b border-slate-800 p-3">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-3 h-3 rounded-full ${column.color}`}
                  />
                  <h3 className="font-medium text-white">
                    {t(column.label)}
                  </h3>
                  <Badge className="bg-slate-800 text-slate-400">
                    {columnTasks.length}
                  </Badge>
                </div>
              </div>

              {/* LIST */}
              <div className="flex-1 min-h-0 overflow-y-auto p-3">
                <div className="flex flex-col gap-3">
                  {columnTasks.map(renderTaskCard)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
