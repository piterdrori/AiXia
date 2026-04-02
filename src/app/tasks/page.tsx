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
import { sortTasksByPriority } from "@/features/tasks/lib/task.utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckSquare, Plus } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { useAppClock } from "@/lib/clock/provider";
import { useSearchParams } from "react-router-dom";

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

    setActionError("");
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
                <div className="h-6 w-16
