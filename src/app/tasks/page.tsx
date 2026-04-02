import { useMemo, useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { PageError } from "@/components/ui/PageError";
import { PageLoader } from "@/components/ui/PageLoader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import { CheckSquare, Plus } from "lucide-react";

import { useLanguage } from "@/lib/i18n";
import { useAppClock } from "@/lib/clock/provider";

import { useTasksPageData } from "@/features/tasks/hooks/useTasksPageData";
import { useTaskActions } from "@/features/tasks/hooks/useTaskActions";
import { useTaskPermissions } from "@/features/tasks/hooks/useTaskPermissions";

import { TaskPageHeader } from "@/features/tasks/components/list/TaskPageHeader";
import { TaskFiltersBar } from "@/features/tasks/components/list/TaskFiltersBar";
import { TaskBoardView } from "@/features/tasks/components/list/TaskBoardView";
import { TaskListView } from "@/features/tasks/components/list/TaskListView";

import { sortTasksByPriority } from "@/features/tasks/lib/task.utils";

export default function TasksPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const clock = useAppClock();
  const [searchParams] = useSearchParams();

  // =========================
  // DATA
  // =========================

  const {
    currentUserId,
    currentUserRole,
    tasks,
    projects,
    profiles,
    taskMembers,
    hasLoadedOnce,
    isLoading,
    error,
    refresh,
  } = useTasksPageData();

  const { canCreate } = useTaskPermissions({
    task: null,
    currentUserId,
    currentUserRole,
  });

  const {
    actionError,
    setActionError,
    draggedTask,
    handleDragStart,
    handleDrop,
    handleDelete,
  } = useTaskActions();

  // =========================
  // UI STATE
  // =========================

  const [viewMode, setViewMode] = useState<"board" | "list">("board");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [projectFilter, setProjectFilter] = useState(
    searchParams.get("projectId") || "ALL"
  );

  // =========================
  // FILTERING (VIEW MODEL)
  // =========================

  const filteredTasks = useMemo(() => {
    const query = searchQuery.toLowerCase();

    return sortTasksByPriority(
      tasks.filter((task) => {
        const title = (task.title || "").toLowerCase();
        const description = (task.description || "").toLowerCase();

        return (
          (title.includes(query) || description.includes(query)) &&
          (statusFilter === "ALL" ||
            (task.status || "").toUpperCase() === statusFilter) &&
          (priorityFilter === "ALL" ||
            (task.priority || "").toUpperCase() === priorityFilter) &&
          (projectFilter === "ALL" ||
            task.project_id === projectFilter)
        );
      }),
      clock.todayKey
    );
  }, [
    tasks,
    searchQuery,
    statusFilter,
    priorityFilter,
    projectFilter,
    clock.todayKey,
  ]);

  // =========================
  // ACTION WRAPPERS (IMPORTANT)
  // =========================

  const handleDeleteTask = useCallback(
    async (taskId: string) => {
      await handleDelete(taskId, {
        tasks,
        taskMembers,
        setTasks: () => {},
        setTaskMembers: () => {},
        confirmText: t("tasks.confirm.delete"),
        errorText: t("tasks.errors.delete"),
      });

      await refresh(); // server-first sync
    },
    [handleDelete, tasks, taskMembers, t, refresh]
  );

  const handleDropTask = useCallback(
    async (e: React.DragEvent, status: string) => {
      await handleDrop(e, status, {
        draggedTaskId: draggedTask,
        canMove: true,
        tasks,
        setTasks: () => {},
        nowIso: new Date().toISOString(),
      });

      await refresh();
    },
    [handleDrop, draggedTask, tasks, refresh]
  );

  // =========================
  // EMPTY STATE
  // =========================

  const isEmpty = filteredTasks.length === 0;
  const isFiltered =
    searchQuery ||
    statusFilter !== "ALL" ||
    priorityFilter !== "ALL" ||
    projectFilter !== "ALL";

  // =========================
  // RENDER
  // =========================

  return (
    <div className="space-y-6">
      <TaskPageHeader
        canCreate={canCreate}
        isRefreshing={isLoading && hasLoadedOnce}
        onRefresh={refresh}
      />

      <PageError message={actionError || error || ""} />

      <TaskFiltersBar
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        priorityFilter={priorityFilter}
        setPriorityFilter={setPriorityFilter}
        projectFilter={projectFilter}
        setProjectFilter={setProjectFilter}
        viewMode={viewMode}
        setViewMode={setViewMode}
        projects={projects}
      />

      <PageLoader loading={isLoading && !hasLoadedOnce}>
        {viewMode === "board" ? (
          <TaskBoardView
            tasks={filteredTasks}
            projects={projects}
            profiles={profiles}
            taskMembers={taskMembers}
            currentUserId={currentUserId}
            currentUserRole={currentUserRole}
            onDelete={handleDeleteTask}
            onDragStart={handleDragStart}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDropTask}
          />
        ) : (
          <TaskListView
            tasks={filteredTasks}
            projects={projects}
            profiles={profiles}
            taskMembers={taskMembers}
            currentUserId={currentUserId}
            currentUserRole={currentUserRole}
            onDelete={handleDeleteTask}
          />
        )}
      </PageLoader>

      {isEmpty && (
        <div className="text-center py-12">
          <CheckSquare className="w-12 h-12 text-slate-600 mx-auto mb-4" />

          <h3 className="text-lg font-medium text-white mb-2">
            {t("tasks.empty.title")}
          </h3>

          <p className="text-slate-500 mb-4">
            {isFiltered
              ? t("tasks.empty.adjustFilters")
              : t("tasks.empty.noVisibleTasks")}
          </p>

          {!isFiltered && canCreate && (
            <Button onClick={() => navigate("/tasks/new")}>
              <Plus className="w-4 h-4 mr-2" />
              {t("tasks.actions.createTask")}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
