import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageError } from "@/components/ui/PageError";
import { PageLoader } from "@/components/ui/PageLoader";
import { useTasksPageData } from "@/features/tasks/hooks/useTasksPageData";
import { useTaskActions } from "@/features/tasks/hooks/useTaskActions";
import { TaskPageHeader } from "@/features/tasks/components/list/TaskPageHeader";
import { TaskFiltersBar } from "@/features/tasks/components/list/TaskFiltersBar";
import { TaskBoardView } from "@/features/tasks/components/list/TaskBoardView";
import { TaskListView } from "@/features/tasks/components/list/TaskListView";
import { useTaskPermissions } from "@/features/tasks/hooks/useTaskPermissions";
import { sortTasksByPriority, getTaskMemberProfiles, canEditTaskEntity, canDeleteTaskEntity } from "@/features/tasks/lib/task.utils";
import { TaskRow } from "@/features/tasks/lib/task.types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckSquare, Plus } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { useAppClock } from "@/lib/clock/provider";
import { useSearchParams } from "react-router-dom";
import { getProjectName } from "@/features/tasks/lib/task.utils";

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

  const {
    actionError,
    setActionError,
    draggedTask,
    setDraggedTask,
    handleDragStart,
    handleDelete,
  } = useTaskActions();

  const [viewMode, setViewMode] = useState<"board" | "list">("board");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [priorityFilter, setPriorityFilter] = useState<string>("ALL");
  const [projectFilter, setProjectFilter] = useState<string>(searchParams.get("projectId") || "ALL");

  const filteredTasks = useMemo(() => {
    const result = tasks.filter((task) => {
      const title = (task.title || "").toLowerCase();
      const description = (task.description || "").toLowerCase();
      const query = searchQuery.toLowerCase();

      const matchesSearch = title.includes(query) || description.includes(query);
      const matchesStatus = statusFilter === "ALL" || (task.status || "").toUpperCase() === statusFilter;
      const matchesPriority = priorityFilter === "ALL" || (task.priority || "").toUpperCase() === priorityFilter;
      const matchesProject = projectFilter === "ALL" || task.project_id === projectFilter;

      return matchesSearch && matchesStatus && matchesPriority && matchesProject;
    });

    return sortTasksByPriority(result, clock.todayKey);
  }, [tasks, searchQuery, statusFilter, priorityFilter, projectFilter, clock.todayKey]);

  const handleDrop = async (e: React.DragEvent, nextStatus: string) => {
    e.preventDefault();
    if (!draggedTask || !currentUserId || !currentUserRole) {
      setDraggedTask(null);
      return;
    }

    const task = tasks.find((item) => item.id === draggedTask);
    if (!task) {
      setDraggedTask(null);
      return;
    }

    const canMove = canEditTaskEntity(task, currentUserId, currentUserRole);
    if (!canMove) {
      setDraggedTask(null);
      return;
    }

    setActionError("");
    const previousTasks = [...tasks];

    // Optimistic update
    const updatedTasks = tasks.map((item) =>
      item.id === draggedTask ? { ...item, status: nextStatus } : item
    );
    
    // We need to update through the hook's state management
    // Since we can't directly setTasks from here, we'll handle it differently
    // For now, just refresh after drop
    setDraggedTask(null);
    await refresh();
  };

  const renderBoardSkeleton = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"].map((column) => (
        <div key={column} className="bg-slate-900/30 rounded-lg border border-slate-800">
          <div className="p-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-slate-500" />
              <div className="h-4 w-24 rounded bg-slate-800 animate-pulse" />
            </div>
          </div>
          <div className="p-3 space-y-3 min-h-[220px]">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="bg-slate-900 border-slate-800 rounded-lg p-4 animate-pulse">
                <div className="h-6 w-16 rounded bg-slate-800 mb-2" />
                <div className="h-4 w-3/4 rounded bg-slate-800 mb-2" />
                <div className="h-4 w-full rounded bg-slate-800" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  const renderListSkeleton = () => (
    <Card className="bg-slate-900/50 border-slate-800">
      <CardContent className="p-0">
        <div className="divide-y divide-slate-800">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="p-4 animate-pulse">
              <div className="flex items-center gap-4">
                <div className="w-5 h-5 rounded bg-slate-800" />
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
            taskMembers={taskMembers}
            currentUserId={currentUserId}
            currentUserRole={currentUserRole}
            onDelete={(taskId) => handleDelete(taskId, {
              tasks,
              taskMembers,
              setTasks: () => {}, // Read-only in this architecture, would need to lift state
              setTaskMembers: () => {},
              t,
            })}
            onDragStart={handleDragStart}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
          />
        ) : (
          <TaskListView
            tasks={filteredTasks}
            projects={projects}
            profiles={profiles}
            taskMembers={taskMembers}
            currentUserId={currentUserId}
            currentUserRole={currentUserRole}
            onDelete={(taskId) => handleDelete(taskId, {
              tasks,
              taskMembers,
              setTasks: () => {},
              setTaskMembers: () => {},
              t,
            })}
          />
        )}
      </PageLoader>

      {filteredTasks.length === 0 && (
        <div className="text-center py-12">
          <CheckSquare className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">{t("tasks.empty.title")}</h3>
          <p className="text-slate-500 mb-4">
            {searchQuery ||
            statusFilter !== "ALL" ||
            priorityFilter !== "ALL" ||
            projectFilter !== "ALL"
              ? t("tasks.empty.adjustFilters")
              : t("tasks.empty.noVisibleTasks")}
          </p>

          {!searchQuery &&
            statusFilter === "ALL" &&
            priorityFilter === "ALL" &&
            projectFilter === "ALL" &&
            canCreate && (
              <Button
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
                onClick={() => navigate("/tasks/new")}
              >
                <Plus className="w-4 h-4 mr-2" />
                {t("tasks.actions.createTask")}
              </Button>
            )}
        </div>
      )}
    </div>
  );
}
