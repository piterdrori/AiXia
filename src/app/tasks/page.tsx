import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { createRequestTracker } from "@/lib/safeAsync";
import { useRequest } from "@/lib/useRequest";
import { useLanguage } from "@/lib/i18n";
import { useUserPreferences } from "@/lib/useUserPreferences";
import { formatDateInTimezone } from "@/lib/datetime";
import { useAppClock } from "@/lib/clock/provider";
import {
  canCreateTask,
  canDeleteTaskEntity,
  canEditTaskEntity,
  canMoveTask,
  canViewTask,
  getVisibleProjectIds,
} from "@/lib/permissions";

import { AixiaButton, AixiaCommandMetrics, AixiaHero, AixiaPage, AixiaWorkspaceCard } from "@/components/aixia";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { PageError } from "@/components/ui/PageError";
import { PageLoader } from "@/components/ui/PageLoader";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  archiveTask,
  getParentTaskId,
  isSubtask,
  isTaskActive,
  isTaskArchived,
  isTaskDeleted,
  isTopLevelTask,
  restoreTask,
  softDeleteTask,
} from "@/lib/tasks/taskLifecycle";
import {
  getTaskCardDescription,
  getTaskCardTitle,
} from "@/lib/tasks/display";
import type { TaskRegistryFilter, TaskRowExtended } from "@/lib/tasks/types";
import {
  CheckSquare,
  Plus,
  RefreshCw,
  Search,
  Grid3X3,
  List,
  MoreVertical,
  Edit,
  Trash2,
  Calendar,
  Activity,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

import "@/styles/tasks/tasks-visual.css";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";

type Role = "admin" | "manager" | "employee" | "guest";
type TaskStatus = "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";

type TaskRow = TaskRowExtended;

type ProjectRow = {
  id: string;
  name: string;
  created_by: string | null;
};

type ProjectMemberRow = {
  id: string;
  project_id: string;
  user_id: string;
  role: string;
  created_at: string;
};

type TaskMemberRow = {
  id: string;
  task_id: string;
  user_id: string;
  role: string;
  created_at: string;
};

type ProfileRow = {
  user_id: string;
  full_name: string | null;
  role: Role;
  status: "active" | "pending" | "inactive" | "denied";
};

type TasksListTab = "ALL" | "ACTIVE" | "MINE" | "COMPLETED";

const CHINA_TIMEZONE = "Asia/Shanghai";

function registryFilterFromTab(tab: TasksListTab): TaskRegistryFilter {
  switch (tab) {
    case "ALL":
      return "all";
    case "ACTIVE":
      return "main";
    case "MINE":
      return "my";
    case "COMPLETED":
      return "completed";
  }
}

function MemberStack({
  profiles,
  size = "small",
}: {
  profiles: ProfileRow[];
  size?: "small" | "medium";
}) {
  const { t } = useLanguage();

  const avatarClass =
    size === "medium"
      ? "w-7 h-7 aixia-tasks-member-avatar"
      : "w-6 h-6 aixia-tasks-member-avatar";
  const textClass = size === "medium" ? "text-xs" : "text-[10px]";

  return (
    <div className="aixia-tasks-member-stack flex -space-x-2">
      {profiles.slice(0, 3).map((profile) => (
        <Avatar key={profile.user_id} className={avatarClass}>
          <AvatarFallback className={`bg-indigo-600 text-white ${textClass}`}>
            {(profile.full_name || t("tasks.fallbacks.userInitial"))
              .split(" ")
              .map((n) => n[0])
              .join("")
              .toUpperCase()}
          </AvatarFallback>
        </Avatar>
      ))}

      {profiles.length > 3 && (
        <div
          className={`${
            size === "medium"
              ? "w-7 h-7 text-xs"
              : "w-6 h-6 text-[10px]"
          } aixia-tasks-member-stack-more`}
        >
          +{profiles.length - 3}
        </div>
      )}
    </div>
  );
}

export default function TasksPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestTracker = useRef(createRequestTracker());
  const { t, language } = useLanguage();
  const { timezone } = useUserPreferences();
  const clock = useAppClock();

  const tasksPageRequest = useRequest<boolean>();
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [actionError, setActionError] = useState("");

 
  const getTaskDateStatus = (dueDate: string | null) => {
    if (!dueDate) return "none";

    const today = clock.todayKey;

    if (dueDate < today) return "overdue";
    if (dueDate === today) return "today";
    return "upcoming";
  };

  const getCheckpointState = (task: TaskRow) => {
    const status = (task.status || "").toUpperCase();
    const startDate = task.start_date;
    const dueDate = task.due_date;
    const lastStatusUpdateAt = task.last_status_update_at;

    if (!startDate || !dueDate || status === "DONE") {
      return {
        behindSchedule: false,
        updateRequired: false,
      };
    }

    const totalMs =
      new Date(`${dueDate}T00:00:00`).getTime() -
      new Date(`${startDate}T00:00:00`).getTime();

    if (totalMs <= 0) {
      return {
        behindSchedule: false,
        updateRequired: false,
      };
    }

    const elapsedMs =
      new Date(`${clock.todayKey}T00:00:00`).getTime() -
      new Date(`${startDate}T00:00:00`).getTime();

    const progressRatio = Math.min(Math.max(elapsedMs / totalMs, 0), 1);

    let expectedStatus: "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE" = "TODO";

    if (progressRatio >= 1) {
      expectedStatus = "DONE";
    } else if (progressRatio >= 0.66) {
      expectedStatus = "IN_REVIEW";
    } else if (progressRatio >= 0.33) {
      expectedStatus = "IN_PROGRESS";
    }

    const statusRank: Record<string, number> = {
      TODO: 0,
      IN_PROGRESS: 1,
      IN_REVIEW: 2,
      DONE: 3,
    };

    const behindSchedule =
      (statusRank[status] ?? 0) < (statusRank[expectedStatus] ?? 0);

    const updateRequired = lastStatusUpdateAt
      ? Date.now() - new Date(lastStatusUpdateAt).getTime() >
        1000 * 60 * 60 * 24 * 2
      : true;

    return {
      behindSchedule,
      updateRequired,
    };
  };

  const initialProjectId = searchParams.get("projectId") || "ALL";

  const [viewMode, setViewMode] = useState<"board" | "list">("board");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [priorityFilter, setPriorityFilter] = useState<string>("ALL");
  const [projectFilter, setProjectFilter] = useState<string>(initialProjectId);
  const [activeTab, setActiveTab] = useState<TasksListTab>("ACTIVE");
  const registryFilter = registryFilterFromTab(activeTab);

  const [draggedTask, setDraggedTask] = useState<string | null>(null);

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<Role | null>(null);

  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [subtaskStatsByParentId, setSubtaskStatsByParentId] = useState<
    Map<string, { total: number; completed: number }>
  >(new Map());
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [taskMembers, setTaskMembers] = useState<TaskMemberRow[]>([]);

  const columns: { id: TaskStatus; label: string }[] = [
    { id: "TODO", label: t("tasks.columns.todo") },
    { id: "IN_PROGRESS", label: t("tasks.columns.inProgress") },
    { id: "IN_REVIEW", label: t("tasks.columns.inReview") },
    { id: "DONE", label: t("tasks.columns.done") },
  ];

  const loadTasksPage = async () => {
    const requestId = requestTracker.current.next();
    setActionError("");

    try {
      await tasksPageRequest.run(async () => {
        const session = await supabase.auth.getSession();
const user = session.data.session?.user;

        if (!requestTracker.current.isLatest(requestId)) return true;

        if (!user) {
          navigate("/login");
          return true;
        }

        setCurrentUserId(user.id);

        const [
          { data: myProfile, error: myProfileError },
          { data: visibleTasksData, error: tasksError },
          { data: allProjects, error: projectsError },
          { data: allProfiles, error: profilesError },
          { data: allProjectMembers, error: projectMembersError },
          { data: allTaskMembers, error: taskMembersError },
        ] = await Promise.all([
          supabase.from("profiles").select("role").eq("user_id", user.id).single(),
          supabase
            .from("tasks")
            .select(
              "id, title, description, status, priority, start_date, due_date, project_id, parent_task_id, assignee_id, created_by, created_at, updated_at, last_status_update_at, archived_at, archived_by, deleted_at, deleted_by"
            )
            .order("created_at", { ascending: false }),
          supabase
            .from("projects")
            .select("id, name, created_by")
            .order("created_at", { ascending: false }),
          supabase
  .from("profiles")
  .select("user_id, full_name")
  .eq("status", "active"),
                    supabase
            .from("project_members")
            .select("id, project_id, user_id, role, created_at"),
                    supabase
            .from("task_members")
            .select("id, task_id, user_id, role, created_at"),
        ]);

        if (!requestTracker.current.isLatest(requestId)) return true;

        if (myProfileError || !myProfile) {
          navigate("/login");
          return true;
        }

        const role = myProfile.role as Role;
        setCurrentUserRole(role);

        if (tasksError) throw tasksError;
        if (projectsError) throw projectsError;
        if (profilesError) throw profilesError;
        if (projectMembersError) throw projectMembersError;
        if (taskMembersError) throw taskMembersError;

        const tasksData = (visibleTasksData || []) as TaskRow[];
        const projectsData = (allProjects || []) as ProjectRow[];
        const profilesData = (allProfiles || []) as ProfileRow[];
        const projectMembersData = (allProjectMembers || []) as ProjectMemberRow[];
        const taskMembersData = (allTaskMembers || []) as TaskMemberRow[];

        const visibleProjectIds = getVisibleProjectIds(
          user.id,
          role,
          projectsData,
          projectMembersData
        );

        const visibleProjects =
          role === "admin"
            ? projectsData
            : projectsData.filter((project) => visibleProjectIds.has(project.id));

        const visibleTasks = tasksData.filter((task) =>
          canViewTask(task, user.id, role, taskMembersData, visibleProjectIds)
        );

        const parentIds = visibleTasks
          .filter((task) => isTopLevelTask(task))
          .map((task) => task.id);

        let loadedSubtaskStats = new Map<string, { total: number; completed: number }>();
        if (parentIds.length > 0) {
          const { data: subtaskRows, error: subtaskStatsError } = await supabase
            .from("tasks")
            .select("parent_task_id, status, deleted_at, archived_at")
            .in("parent_task_id", parentIds);

          if (subtaskStatsError) {
            console.error("Load subtask stats error:", subtaskStatsError);
          } else {
            for (const row of subtaskRows || []) {
              if (row.deleted_at || row.archived_at) continue;
              const parentId = getParentTaskId(row as TaskRow);
              if (!parentId) continue;
              const current = loadedSubtaskStats.get(parentId) || {
                total: 0,
                completed: 0,
              };
              current.total += 1;
              if ((row.status || "").toUpperCase() === "DONE") {
                current.completed += 1;
              }
              loadedSubtaskStats.set(parentId, current);
            }
          }
        }

        setTasks(visibleTasks);
        setSubtaskStatsByParentId(loadedSubtaskStats);
        setProjects(visibleProjects);
        setProfiles(profilesData);
        setTaskMembers(taskMembersData);
        setHasLoadedOnce(true);

        if (
          initialProjectId !== "ALL" &&
          !visibleProjects.some((project) => project.id === initialProjectId)
        ) {
          setProjectFilter("ALL");
        }

        return true;
      });
    } catch (err) {
      if (!requestTracker.current.isLatest(requestId)) return;
      console.error("Load tasks page error:", err);
      setTasks([]);
      setSubtaskStatsByParentId(new Map());
      setProjects([]);
      setProfiles([]);
      setTaskMembers([]);
    }
  };

    useEffect(() => {
    void loadTasksPage();
  }, []);

  const tasksById = useMemo(
    () => new Map(tasks.map((task) => [task.id, task])),
    [tasks]
  );

  const subtaskStatsFromTasks = useMemo(() => {
    const map = new Map<string, { total: number; completed: number }>();
    for (const task of tasks) {
      if (!isTaskActive(task)) continue;
      const parentId = getParentTaskId(task);
      if (!parentId) continue;
      const current = map.get(parentId) || { total: 0, completed: 0 };
      current.total += 1;
      if ((task.status || "").toUpperCase() === "DONE") {
        current.completed += 1;
      }
      map.set(parentId, current);
    }
    return map;
  }, [tasks]);

  const subtaskStats = useMemo(() => {
    const merged = new Map(subtaskStatsByParentId);
    for (const [parentId, stats] of subtaskStatsFromTasks) {
      merged.set(parentId, stats);
    }
    return merged;
  }, [subtaskStatsByParentId, subtaskStatsFromTasks]);

  const isMyTask = (task: TaskRow) => {
    if (!currentUserId) return false;
    if (task.assignee_id === currentUserId) return true;
    return taskMembers.some(
      (member) => member.task_id === task.id && member.user_id === currentUserId
    );
  };

  const filteredTasks = useMemo(() => {
    const result = tasks.filter((task) => {
      const title = (task.title || "").toLowerCase();
      const description = (task.description || "").toLowerCase();
      const query = searchQuery.toLowerCase();

      const matchesRegistry = (() => {
        switch (registryFilter) {
          case "all":
            return !isTaskDeleted(task);
          case "main":
            return isTaskActive(task) && isTopLevelTask(task);
          case "subtasks":
            return isTaskActive(task) && isSubtask(task);
          case "my":
            return isTaskActive(task) && isMyTask(task);
          case "overdue": {
            if (!isTaskActive(task)) return false;
            const status = (task.status || "").toUpperCase();
            if (status === "DONE" || !task.due_date) return false;
            return task.due_date < clock.todayKey;
          }
          case "completed":
            return isTaskActive(task) && (task.status || "").toUpperCase() === "DONE";
          case "archived":
            return isTaskArchived(task);
          default:
            return true;
        }
      })();

      const matchesSearch = title.includes(query) || description.includes(query);
      const matchesStatus =
        statusFilter === "ALL" ||
        (task.status || "").toUpperCase() === statusFilter;
      const matchesPriority =
        priorityFilter === "ALL" ||
        (task.priority || "").toUpperCase() === priorityFilter;
      const matchesProject =
        projectFilter === "ALL" || task.project_id === projectFilter;

      return (
        matchesRegistry &&
        matchesSearch &&
        matchesStatus &&
        matchesPriority &&
        matchesProject
      );
    });

    return result.sort((a, b) => {
      const getDatePriority = (task: TaskRow) => {
        const status = getTaskDateStatus(task.due_date);
        if (status === "overdue") return 0;
        if (status === "today") return 1;
        return 2;
      };

      const priorityDiff = getDatePriority(a) - getDatePriority(b);
      if (priorityDiff !== 0) return priorityDiff;

      if (!a.due_date && !b.due_date) return 0;
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;

      return a.due_date.localeCompare(b.due_date);
    });
  }, [
    tasks,
    searchQuery,
    statusFilter,
    priorityFilter,
    projectFilter,
    registryFilter,
    clock.todayKey,
    currentUserId,
    taskMembers,
  ]);

  const boardTasks = useMemo(
    () => filteredTasks.filter((task) => isTopLevelTask(task)),
    [filteredTasks]
  );

  const listTasks = useMemo(() => {
    if (registryFilter === "subtasks" || registryFilter === "all") {
      return filteredTasks;
    }
    return filteredTasks.filter((task) => isTopLevelTask(task));
  }, [filteredTasks, registryFilter]);

  const getSubtaskSummary = (parentId: string) => {
    const stats = subtaskStats.get(parentId);
    if (!stats || stats.total === 0) return null;
    return {
      countLabel: t("tasks.hierarchy.subtaskCount", "{{count}} subtasks", {
        count: stats.total,
      }),
      progressLabel: t(
        "tasks.hierarchy.subtaskProgress",
        "{{completed}}/{{total}} completed",
        {
          completed: stats.completed,
          total: stats.total,
        }
      ),
    };
  };

  const renderSubtaskBadges = (parentId: string) => {
    const summary = getSubtaskSummary(parentId);
    if (!summary) return null;
    return (
      <>
        <span className="aixia-dash-pill aixia-projects-pill--planning aixia-tasks-subtask-badge">
          {summary.countLabel}
        </span>
        <span className="aixia-dash-pill aixia-projects-pill--progress aixia-tasks-subtask-badge">
          {summary.progressLabel}
        </span>
      </>
    );
  };

  const getParentTaskTitle = (parentId: string | null) => {
    if (!parentId) return null;
    return tasksById.get(parentId)?.title || t("tasks.fallbacks.unknownParent", "Parent task");
  };

  const getProjectName = (projectId: string | null) => {
    if (!projectId) return t("tasks.fallbacks.noProject");
    return (
      projects.find((project) => project.id === projectId)?.name ||
      t("tasks.fallbacks.unknownProject")
    );
  };

  const getPriorityPillClass = (priority: string | null) => {
    switch ((priority || "").toUpperCase()) {
      case "URGENT":
        return "aixia-projects-pill--danger";
      case "HIGH":
        return "aixia-projects-pill--priority-high";
      case "MEDIUM":
        return "aixia-projects-pill--priority-medium";
      default:
        return "aixia-projects-pill--planning";
    }
  };

  const getTaskUrgency = (task: TaskRow) => {
    if (!task.due_date) return null;

    const today = clock.todayKey;
    if (task.due_date < today) return "OVERDUE";

    const dueMs = new Date(`${task.due_date}T00:00:00`).getTime();
    const todayMs = new Date(`${today}T00:00:00`).getTime();
    const diffDays = (dueMs - todayMs) / (1000 * 60 * 60 * 24);

    if (diffDays <= 3) return "SOON";
    return null;
  };

  const getTaskDisplayProgress = (task: TaskRow) => {
    const stats = subtaskStats.get(task.id);
    if (stats && stats.total > 0) {
      return Math.round((stats.completed / stats.total) * 100);
    }

    switch ((task.status || "").toUpperCase()) {
      case "DONE":
        return 100;
      case "IN_REVIEW":
        return 75;
      case "IN_PROGRESS":
        return 50;
      default:
        return 0;
    }
  };

  const kpi = useMemo(() => {
    let active = 0;
    let completed = 0;
    let overdue = 0;

    for (const task of tasks) {
      if (!isTaskActive(task)) continue;

      const status = (task.status || "").toUpperCase();
      if (status === "DONE") {
        completed++;
      } else {
        active++;
        if (task.due_date && task.due_date < clock.todayKey) {
          overdue++;
        }
      }
    }

    const total = tasks.filter((task) => !isTaskDeleted(task)).length;

    return { total, active, completed, overdue };
  }, [tasks, clock.todayKey]);

  const taskMetricItems = useMemo(
    () => [
      { key: "total", title: "Total", value: String(kpi.total), icon: CheckSquare, tone: "indigo" as const },
      { key: "active", title: "Active", value: String(kpi.active), icon: Activity, tone: "emerald" as const },
      { key: "completed", title: "Completed", value: String(kpi.completed), icon: CheckCircle2, tone: "violet" as const },
      { key: "overdue", title: "Overdue", value: String(kpi.overdue), icon: AlertTriangle, tone: "rose" as const },
    ],
    [kpi]
  );

  const getTaskMemberProfiles = (taskId: string) => {
    const memberUserIds = taskMembers
      .filter((member) => member.task_id === taskId)
      .map((member) => member.user_id);

    return profiles.filter((profile) =>
      memberUserIds.includes(profile.user_id)
    );
  };

  const canEditTask = (task: TaskRow) => {
    return canEditTaskEntity(task, currentUserId, currentUserRole as Role);
  };

  const canDeleteTask = (task: TaskRow) => {
    return canDeleteTaskEntity(task, currentUserId, currentUserRole as Role);
  };

  const canCreateTasks = currentUserRole
    ? canCreateTask(currentUserRole)
    : false;

  const handleDragStart = (taskId: string) => {
    setDraggedTask(taskId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, nextStatus: TaskStatus) => {
    e.preventDefault();

    if (!draggedTask) return;
    if (!currentUserId || !currentUserRole) {
      setDraggedTask(null);
      return;
    }

    const task = tasks.find((item) => item.id === draggedTask);
    if (!task) {
      setDraggedTask(null);
      return;
    }

    const canMove = canMoveTask(
      task,
      currentUserId,
      currentUserRole,
      taskMembers
    );

    if (!canMove) {
      setDraggedTask(null);
      return;
    }

    setActionError("");

    const previousTasks = tasks;
    setTasks((prev) =>
      prev.map((item) =>
        item.id === draggedTask ? { ...item, status: nextStatus } : item
      )
    );

    const { error: updateError } = await supabase
      .from("tasks")
      .update({
        status: nextStatus,
        updated_at: clock.nowIso,
      })
      .eq("id", draggedTask);

    if (updateError) {
      console.error("Move task error:", updateError);
      setTasks(previousTasks);
      setActionError(updateError.message || t("tasks.errors.updateTaskStatus"));
    }

    setDraggedTask(null);
  };

  const handleSoftDelete = async (taskId: string) => {
    const confirmed = window.confirm(t("tasks.confirmations.deleteTask"));
    if (!confirmed || !currentUserId) return;

    setActionError("");
    const previousTasks = tasks;

    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId
          ? {
              ...task,
              deleted_at: clock.nowIso,
              deleted_by: currentUserId,
            }
          : task
      )
    );

    try {
      await softDeleteTask(taskId, currentUserId);
    } catch (deleteError) {
      console.error("Delete task error:", deleteError);
      setTasks(previousTasks);
      setActionError(
        deleteError instanceof Error
          ? deleteError.message
          : t("tasks.errors.deleteTask")
      );
    }
  };

  const handleArchive = async (taskId: string) => {
    if (!currentUserId) return;
    const confirmed = window.confirm("Archive this task?");
    if (!confirmed) return;

    setActionError("");
    const previousTasks = tasks;

    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId
          ? { ...task, archived_at: clock.nowIso, archived_by: currentUserId }
          : task
      )
    );

    try {
      await archiveTask(taskId, currentUserId);
    } catch (err) {
      setTasks(previousTasks);
      setActionError(err instanceof Error ? err.message : "Failed to archive task.");
    }
  };

  const handleRestore = async (taskId: string) => {
    setActionError("");
    const previousTasks = tasks;

    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId
          ? {
              ...task,
              archived_at: null,
              archived_by: null,
              deleted_at: null,
              deleted_by: null,
            }
          : task
      )
    );

    try {
      await restoreTask(taskId);
    } catch (err) {
      setTasks(previousTasks);
      setActionError(err instanceof Error ? err.message : "Failed to restore task.");
    }
  };

  const renderBoardSkeleton = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {columns.map((column) => (
        <div
          key={column.id}
          className="bg-slate-900/30 rounded-lg border border-slate-800"
        >
          <div className="p-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <div className={`aixia-tasks-board-column-dot aixia-tasks-board-column-dot--${column.id}`} />
              <div className="h-4 w-24 rounded bg-slate-800 animate-pulse" />
            </div>
          </div>

          <div className="p-3 space-y-3 min-h-[220px]">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="aixia-workspace-card aixia-workspace-card-neutral aixia-workspace-card--compact animate-pulse"
              >
                <div className="aixia-workspace-card-body">
                  <div className="h-3 w-16 rounded bg-slate-800 mb-2" />
                  <div className="h-4 w-3/4 rounded bg-slate-800 mb-2" />
                  <div className="h-4 w-full rounded bg-slate-800" />
                </div>
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
            <div key={index} className="p-4">
              <div className="animate-pulse flex items-center gap-4">
                <div className="w-5 h-5 rounded bg-slate-800" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-48 rounded bg-slate-800" />
                  <div className="h-4 w-72 rounded bg-slate-800" />
                </div>
                <div className="hidden sm:block h-6 w-20 rounded bg-slate-800" />
                <div className="hidden sm:block h-4 w-24 rounded bg-slate-800" />
                <div className="hidden sm:flex gap-1">
                  <div className="w-7 h-7 rounded-full bg-slate-800" />
                  <div className="w-7 h-7 rounded-full bg-slate-800" />
                </div>
                <div className="hidden sm:block h-4 w-14 rounded bg-slate-800" />
                <div className="h-8 w-8 rounded bg-slate-800" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <AixiaPage
      surface="command"
      className="aixia-command-page aixia-tasks-page"
    >
      <AixiaHero
        surface="command"
        className="shrink-0 space-y-4"
        gradientTitle={t("tasks.header.title")}
        title={t("tasks.header.title")}
        subtitle={t("tasks.header.subtitle")}
        actions={
          <>
            <AixiaButton
              type="button"
              className="h-9"
              onClick={() => void loadTasksPage()}
              disabled={tasksPageRequest.status === "loading"}
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${tasksPageRequest.status === "loading" ? "animate-spin" : ""}`}
              />
              {tasksPageRequest.status === "loading"
                ? t("tasks.actions.refreshing")
                : t("tasks.actions.refresh")}
            </AixiaButton>

            {canCreateTasks ? (
              <AixiaButton
                variant="primary"
                type="button"
                className="h-9"
                onClick={() =>
                  navigate(
                    `/tasks/new${
                      projectFilter !== "ALL" ? `?projectId=${projectFilter}` : ""
                    }`
                  )
                }
              >
                <Plus className="h-4 w-4 mr-2" />
                {t("tasks.actions.newTask")}
              </AixiaButton>
            ) : null}
          </>
        }
      >
        <AixiaCommandMetrics items={taskMetricItems} />

        <div className="aixia-command-tabs">
          {(
            [
              { key: "ALL", label: t("tasks.filters.allTasks", "All") },
              { key: "ACTIVE", label: t("tasks.filters.mainTasks", "Active") },
              { key: "MINE", label: t("tasks.filters.myTasks", "My Projects") },
              { key: "COMPLETED", label: t("tasks.filters.completed", "Completed") },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`aixia-command-tab ${
                activeTab === tab.key ? "aixia-command-tab--active" : ""
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="aixia-command-toolbar">
            <div className="relative flex-1 min-w-[12rem]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 aixia-projects-muted" />
              <Input
                placeholder={t("tasks.filters.searchPlaceholder")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 aixia-projects-input"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40 aixia-projects-select-trigger">
                <SelectValue placeholder={t("tasks.filters.status")} />
              </SelectTrigger>
              <SelectContent
                position="popper"
                side="bottom"
                align="start"
                sideOffset={6}
                avoidCollisions={false}
                className="aixia-projects-select-content"
              >
                <SelectItem value="ALL">{t("tasks.filters.allStatus")}</SelectItem>
                <SelectItem value="TODO">{t("tasks.status.todo")}</SelectItem>
                <SelectItem value="IN_PROGRESS">
                  {t("tasks.status.inProgress")}
                </SelectItem>
                <SelectItem value="IN_REVIEW">
                  {t("tasks.status.inReview")}
                </SelectItem>
                <SelectItem value="DONE">{t("tasks.status.done")}</SelectItem>
              </SelectContent>
            </Select>

            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-full sm:w-40 aixia-projects-select-trigger">
                <SelectValue placeholder={t("tasks.filters.priority")} />
              </SelectTrigger>
              <SelectContent
                position="popper"
                side="bottom"
                align="start"
                sideOffset={6}
                avoidCollisions={false}
                className="aixia-projects-select-content"
              >
                <SelectItem value="ALL">
                  {t("tasks.filters.allPriorities")}
                </SelectItem>
                <SelectItem value="URGENT">{t("tasks.priority.urgent")}</SelectItem>
                <SelectItem value="HIGH">{t("tasks.priority.high")}</SelectItem>
                <SelectItem value="MEDIUM">{t("tasks.priority.medium")}</SelectItem>
                <SelectItem value="LOW">{t("tasks.priority.low")}</SelectItem>
              </SelectContent>
            </Select>

            <ToggleGroup
            type="single"
            value={viewMode}
            onValueChange={(value) =>
              value && setViewMode(value as "board" | "list")
            }
          >
            <ToggleGroupItem value="board">
              <Grid3X3 className="w-4 h-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="list">
              <List className="w-4 h-4" />
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

        <PageError message={actionError || tasksPageRequest.error || ""} />
      </AixiaHero>

        <div className="aixia-command-scroll">
          <PageLoader
            loading={tasksPageRequest.status === "loading" && !hasLoadedOnce}
            fallback={viewMode === "board" ? renderBoardSkeleton() : renderListSkeleton()}
          >
            {viewMode === "board" ? (
              <div className="aixia-tasks-board">
                <div className="aixia-tasks-board-grid">
      {columns.map((column) => {
        const columnTasks = boardTasks.filter(
          (task) => (task.status || "").toUpperCase() === column.id
        );

        return (
          <div
  key={column.id}
  className="aixia-tasks-board-column"
  onDragOver={handleDragOver}
  onDrop={(e) => void handleDrop(e, column.id)}
>
            <div className="aixia-tasks-board-column-hd">
              <div className="aixia-tasks-board-column-hd-inner">
                <div className={`aixia-tasks-board-column-dot aixia-tasks-board-column-dot--${column.id}`} />
                <h3 className="aixia-dash-list-row-title">{column.label}</h3>
                <span className="aixia-dash-pill aixia-tasks-pill--planning">{columnTasks.length}</span>
              </div>
            </div>

            <div className="aixia-tasks-board-column-body">
              <div className="aixia-tasks-board-column-cards">
              {columnTasks.map((task) => {
                const taskProgress = getTaskDisplayProgress(task);
                const taskUrgency = getTaskUrgency(task);

                return (
                  <AixiaWorkspaceCard
                    key={task.id}
                    as="div"
                    size="compact"
                    className="aixia-tasks-board-card"
                    draggable
                    onDragStart={() => handleDragStart(task.id)}
                    label={getTaskCardTitle(
                      task,
                      t("taskDetail.fallbacks.untitled", "Untitled task"),
                    )}
                    eyebrow={column.label}
                    description={`${getTaskCardDescription(
                      task,
                      t("tasks.fallbacks.noDescription"),
                    )}${task.project_id ? ` · ${getProjectName(task.project_id)}` : ""}`}
                    icon={CheckSquare}
                    statusLabel={
                      taskUrgency === "OVERDUE"
                        ? "OVERDUE"
                        : (task.status || column.id).toUpperCase()
                    }
                    summary={`${task.priority || t("tasks.priority.low")} • ${taskProgress}% • ${
                      task.due_date
                        ? format(clock.shiftDate(task.due_date), "MMM d")
                        : t("projects.noDate", "No date")
                    }`}
                    tone={
                      taskUrgency === "OVERDUE"
                        ? "rose"
                        : column.id === "DONE"
                          ? "emerald"
                          : column.id === "IN_PROGRESS"
                            ? "cyan"
                            : "indigo"
                    }
                    onClick={() => navigate(`/tasks/${task.id}`)}
                    topRightSlot={
                      (canEditTask(task) || canDeleteTask(task)) ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            asChild
                            onClick={(event) => event.stopPropagation()}
                          >
                            <AixiaButton variant="icon" className="h-8 w-8">
                              <MoreVertical className="w-4 h-4" />
                            </AixiaButton>
                          </DropdownMenuTrigger>

                          <DropdownMenuContent
                            align="end"
                            className="aixia-projects-select-content"
                          >
                            {canEditTask(task) && (
                              <DropdownMenuItem
                                onClick={(event) => {
                                  event.stopPropagation();
                                  navigate(`/tasks/${task.id}/edit`);
                                }}
                              >
                                <Edit className="w-4 h-4 mr-2" />
                                {t("tasks.actions.edit")}
                              </DropdownMenuItem>
                            )}

                            {canEditTask(task) && isTaskActive(task) && (
                              <DropdownMenuItem
                                onClick={(event) => {
                                  event.stopPropagation();
                                  void handleArchive(task.id);
                                }}
                              >
                                Archive
                              </DropdownMenuItem>
                            )}

                            {canEditTask(task) && (isTaskArchived(task) || isTaskDeleted(task)) && (
                              <DropdownMenuItem
                                onClick={(event) => {
                                  event.stopPropagation();
                                  void handleRestore(task.id);
                                }}
                              >
                                Restore
                              </DropdownMenuItem>
                            )}

                            {canDeleteTask(task) && (
                              <DropdownMenuItem
                                onClick={(event) => {
                                  event.stopPropagation();
                                  void handleSoftDelete(task.id);
                                }}
                                className="text-red-400"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                {t("tasks.actions.delete")}
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : null
                    }
                  />
                );
              })}
            </div>
          </div>
        </div>
        );
      })}
    </div>
  </div>
) : (
    <Card className="aixia-dash-panel aixia-dash-glass aixia-dash-tilt-panel aixia-tasks-panel-card">
      <CardContent className="p-0">
        <div className="aixia-tasks-list-divider">
          {listTasks.map((task) => {
            const assigneeProfiles = getTaskMemberProfiles(task.id);
            const parentTitle = getParentTaskTitle(getParentTaskId(task));

            return (
              <div
                key={task.id}
                onClick={() => navigate(`/tasks/${task.id}`)}
                className={`aixia-tasks-list-row flex items-center gap-4 p-4 cursor-pointer transition-colors ${
                  isSubtask(task) ? "pl-8 border-l-2 border-indigo-500/30" : ""
                }`}
              >
                <CheckSquare
                  className={`w-5 h-5 ${
                    (task.status || "").toUpperCase() === "DONE"
                      ? "aixia-tasks-task-icon--done"
                      : "aixia-tasks-task-icon--pending"
                  }`}
                />

                <div className="flex-1 min-w-0">
                  <h4
                    className={`aixia-dash-list-row-title truncate ${
                      (task.status || "").toUpperCase() === "DONE"
                        ? "aixia-tasks-task-title--done"
                        : ""
                    }`}
                  >
                    {getTaskCardTitle(
                      task,
                      t("taskDetail.fallbacks.untitled", "Untitled task"),
                    )}
                  </h4>
                  <p className="aixia-dash-list-row-meta truncate">
                    {parentTitle
                      ? `${t("tasks.hierarchy.subtaskOf", "Subtask of")} ${parentTitle} · `
                      : ""}
                    {getTaskCardDescription(
                      task,
                      t("tasks.fallbacks.noDescription"),
                    )}
                  </p>
                </div>

                <div className="hidden sm:flex items-center gap-4">
                  <div className="flex flex-col gap-2">
                    <span className={`aixia-dash-pill ${getPriorityPillClass(task.priority)}`}>
                      {task.priority || t("tasks.priority.low")}
                    </span>

                    {(() => {
                      const checkpoint = getCheckpointState(task);

                      return (
                        <div className="flex flex-wrap gap-2">
                          {isTopLevelTask(task) ? renderSubtaskBadges(task.id) : null}

                          {checkpoint.behindSchedule && (
                            <span className="aixia-dash-pill aixia-tasks-pill--danger">
                              Behind Schedule
                            </span>
                          )}

                          {checkpoint.updateRequired && (
                            <span className="aixia-dash-pill aixia-tasks-pill--warning">
                              Update Required
                            </span>
                          )}
                        </div>
                      );
                    })()}
                  </div>

                  <span className="aixia-dash-list-row-meta text-sm">
                    {getProjectName(task.project_id)}
                  </span>

                  <MemberStack profiles={assigneeProfiles} size="medium" />

                  {task.due_date &&
                    (() => {
                      const status = getTaskDateStatus(task.due_date);

                      const dueClass =
                        status === "overdue"
                          ? "aixia-tasks-due--overdue"
                          : status === "today"
                            ? "aixia-tasks-due--today"
                            : "aixia-tasks-due--upcoming";

                      return (
                        <div className={`text-xs ${dueClass}`}>
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            <span>
                              {formatDateInTimezone(
                                clock.shiftDate(task.due_date),
                                language,
                                timezone
                              )}
                              {status === "overdue" && " • Overdue"}
                              {status === "today" && " • Today"}
                            </span>
                          </div>
                          <div className="pl-4 text-[10px] aixia-tasks-muted">
                            {t("timezone.chinaTimeLabel", "China")}:{" "}
                            {formatDateInTimezone(
                              clock.shiftDate(task.due_date),
                              language,
                              CHINA_TIMEZONE
                            )}
                          </div>
                        </div>
                      );
                    })()}
                </div>

                {(canEditTask(task) || canDeleteTask(task)) && (
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      asChild
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button variant="ghost" size="icon" className="aixia-dash-action h-8 w-8">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>

                    <DropdownMenuContent
                      align="end"
                      className="aixia-tasks-select-content"
                    >
                      {canEditTask(task) && (
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/tasks/${task.id}/edit`);
                          }}
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          {t("tasks.actions.edit")}
                        </DropdownMenuItem>
                      )}

                      {canDeleteTask(task) && (
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                                    void handleSoftDelete(task.id);
                          }}
                          className="text-red-400"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          {t("tasks.actions.delete")}
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  )}
</PageLoader>

      {(viewMode === "board" ? boardTasks.length : listTasks.length) === 0 && (
        <div className="text-center py-12 aixia-tasks-empty">
          <CheckSquare className="w-12 h-12 aixia-tasks-empty-icon mx-auto mb-4" />
          <h3 className="text-lg font-medium aixia-tasks-title-inline mb-2">
            {t("tasks.empty.title")}
          </h3>
          <p className="aixia-tasks-muted mb-4">
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
            canCreateTasks && (
              <AixiaButton
                variant="primary"
                type="button"
                onClick={() => navigate("/tasks/new")}
              >
                <Plus className="w-4 h-4 mr-2" />
                {t("tasks.actions.createTask")}
              </AixiaButton>
            )}
        </div>
      )}
        </div>
    </AixiaPage>
  );
}
