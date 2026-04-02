import { useCallback, useMemo, useState } from "react";
import type React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageError } from "@/components/ui/PageError";
import { PageLoader } from "@/components/ui/PageLoader";

import { CheckSquare, Plus } from "lucide-react";

import { useLanguage } from "@/lib/i18n";
import { useAppClock } from "@/lib/clock/provider";
import { canEditTaskEntity } from "@/lib/permissions";

import { useTasksPageData } from "./hooks/useTasksPageData";
import { useTaskActions } from "./hooks/useTaskActions";
import { useTaskPermissions } from "./hooks/useTaskPermissions";

import { TaskPageHeader } from "./components/list/TaskPageHeader";
import { TaskFiltersBar } from "./components/list/TaskFiltersBar";
import { TaskBoardView } from "./components/list/TaskBoardView";
import { TaskListView } from "./components/list/TaskListView";

import { sortTasksByPriority } from "./lib/task.utils";
import type { TaskMemberRow, TaskRow, TaskStatus } from "./lib/task.types";

export default function TasksPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const clock = useAppClock();
  const [searchParams] = useSearchParams();

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

  const { actionError, draggedTask, handleDragStart, handleDrop, handleDelete } =
    useTaskActions();

  const [viewMode, setViewMode] = useState<"board" | "list">("board");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [projectFilter, setProjectFilter] = useState(
    searchParams.get("projectId") || "ALL",
  );

  const filteredTasks = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    const nextTasks = tasks.filter((task: TaskRow) => {
      const title = (task.title || "").toLowerCase();
      const description = (task.description || "").toLowerCase();

      const matchesSearch =
        query.length === 0 || title.includes(query) || description.includes(query);
      const matchesStatus =
        statusFilter === "ALL" || (task.status || "").toUpperCase() === statusFilter;
      const matchesPriority =
        priorityFilter === "ALL" ||
        (task.priority || "").toUpperCase() === priorityFilter;
      const matchesProject =
        projectFilter === "ALL" || task.project_id === projectFilter;

      return matchesSearch && matchesStatus && matchesPriority && matchesProject;
    });

    return sortTasksByPriority(nextTasks, clock.todayKey);
  }, [
    tasks,
    searchQuery,
    statusFilter,
    priorityFilter,
    projectFilter,
    clock.todayKey,
  ]);

  const noopSetTasks: React.Dispatch<React.SetStateAction<TaskRow[]>> = () => {};
  const noopSetTaskMembers: React.Dispatch<
    React.SetStateAction<{ task_id: string }[]>
  > = () => {};

  const handleDeleteTask = useCallback(
    async (taskId: string) => {
      await handleDelete(taskId, {
        tasks,
        taskMembers: taskMembers as { task_id: string }[],
        setTasks: noopSetTasks,
        setTaskMembers: noopSetTaskMembers,
        confirmText: t("tasks.confirmations.deleteTask"),
        errorText: t("tasks.errors.deleteTask"),
      });

      await refresh();
    },
    [handleDelete, tasks, taskMembers, t, refresh],
  );

  const handleDropTask = useCallback(
    async (e: React.DragEvent, nextStatus: string) => {
      const draggedTaskItem = tasks.find((task) => task.id === draggedTask) || null;

      const canMoveDraggedTask =
        !!draggedTaskItem &&
        !!currentUserId &&
        !!currentUserRole &&
        canEditTaskEntity(draggedTaskItem, currentUserId, currentUserRole);

      await handleDrop(e, nextStatus as TaskStatus, {
        draggedTaskId: draggedTask,
        canMove: canMoveDraggedTask,
        tasks,
        setTasks: noopSetTasks,
        nowIso: new Date().toISOString(),
      });

      await refresh();
    },
    [
      handleDrop,
      draggedTask,
      tasks,
      currentUserId,
      currentUserRole,
      refresh,
    ],
  );

  const renderBoardSkeleton = () => (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
      {["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"].map((column) => (
        <div
          key={column}
          className="rounded-lg border border-slate-800 bg-slate-900/30"
        >
          <div className="border-b border-slate-800 p-3">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-slate-500" />
              <div className="h-4 w-24 animate-pulse rounded bg-slate-800" />
            </div>
          </div>

          <div className="min-h-[220px] space-y-3 p-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="rounded-lg border border-slate-800 bg-slate-900 p-4 animate-pulse"
              >
                <div className="mb-2 h-6 w-16 rounded bg-slate-800" />
                <div className="mb-2 h-4 w-3/4 rounded bg-slate-800" />
                <div className="h-4 w-full rounded bg-slate-800" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  const renderListSkeleton = () => (
    <Card className="border-slate-800 bg-slate-900/50">
      <CardContent className="p-0">
        <div className="divide-y divide-slate-800">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="animate-pulse p-4">
              <div className="flex items-center gap-4">
                <div className="h-5 w-5 rounded bg-slate-800" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-48 rounded bg-slate-800" />
                  <div className="h-4 w-72 rounded bg-slate-800" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );

  const isEmpty = filteredTasks.length === 0;
  const isFiltered =
    !!searchQuery ||
    statusFilter !== "ALL" ||
    priorityFilter !== "ALL" ||
    projectFilter !== "ALL";

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

      <PageLoader
        loading={isLoading && !hasLoadedOnce}
        fallback={viewMode === "board" ? renderBoardSkeleton() : renderListSkeleton()}
      >
        {viewMode === "board" ? (
          <TaskBoardView
            tasks={filteredTasks}
            projects={projects}
            profiles={profiles}
            taskMembers={taskMembers as TaskMemberRow[]}
            currentUserId={currentUserId}
            currentUserRole={currentUserRole}
            onDelete={handleDeleteTask}
            onDragStart={handleDragStart}
            onDragOver={(e: React.DragEvent) => e.preventDefault()}
            onDrop={handleDropTask}
          />
        ) : (
          <TaskListView
            tasks={filteredTasks}
            projects={projects}
            profiles={profiles}
            taskMembers={taskMembers as TaskMemberRow[]}
            currentUserId={currentUserId}
            currentUserRole={currentUserRole}
            onDelete={handleDeleteTask}
          />
        )}
      </PageLoader>

      {isEmpty && (
        <div className="py-12 text-center">
          <CheckSquare className="mx-auto mb-4 h-12 w-12 text-slate-600" />
          <h3 className="mb-2 text-lg font-medium text-white">
            {t("tasks.empty.title")}
          </h3>
          <p className="mb-4 text-slate-500">
            {isFiltered
              ? t("tasks.empty.adjustFilters")
              : t("tasks.empty.noVisibleTasks")}
          </p>

          {!isFiltered && canCreate && (
            <Button
              className="bg-indigo-600 text-white hover:bg-indigo-700"
              onClick={() => navigate("/tasks/new")}
            >
              <Plus className="mr-2 h-4 w-4" />
              {t("tasks.actions.createTask")}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
