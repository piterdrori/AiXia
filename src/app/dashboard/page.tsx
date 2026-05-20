import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { addDays, format, isBefore, parseISO, startOfDay } from "date-fns";
import {
  removeRealtimeChannel,
  subscribeToDashboardActivity,
  subscribeToDashboardTasks,
  subscribeToDashboardProjects,
} from "@/lib/realtime";
import { useRequest } from "@/lib/useRequest";
import { useLanguage } from "@/lib/i18n";
import { useAppClock } from "@/lib/clock/provider";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AixiaButton,
  AixiaCommandMetrics,
  type AixiaCommandMetricItem,
  AixiaHero,
  AixiaPage,
} from "@/components/aixia";
import { PageError } from "@/components/ui/PageError";
import { PageLoader } from "@/components/ui/PageLoader";
import "@/styles/dashboard/tokens.css";
import "@/styles/dashboard/layout.css";
import "@/styles/dashboard/visual.css";
import "@/styles/dashboard/presence.css";
import "@/styles/dashboard/admin-usage.css";
import { subscribeAixiaOnlineUsers } from "@/lib/onlineUsers";
import { loadFullDashboardData } from "@/lib/dashboard/loadDashboardWorkspaceData";
import { supabase } from "@/lib/supabase";
import {
  canViewTask,
  getEffectivePermissions,
  isAdminRole,
  type Permission,
  type Role,
} from "@/lib/permissions";
import { DashboardProjectTeammatesCard } from "@/app/dashboard/components/DashboardProjectTeammatesCard";
import { DashboardAdminEmployeeDirectoryCard } from "@/app/dashboard/components/DashboardAdminEmployeeDirectoryCard";
import { DashboardAdminPlatformUsageCard } from "@/app/dashboard/components/DashboardAdminPlatformUsageCard";
import { DashboardWorkspaceRail } from "@/app/dashboard/components/DashboardWorkspaceRail";
import { DashboardEmailStatusCard } from "@/app/dashboard/components/DashboardEmailStatusCard";
import {
  FolderKanban,
  CheckSquare,
  Users,
  TrendingUp,
  Plus,
  AlertCircle,
  ArrowRight,
  CalendarDays,
  Activity,
} from "lucide-react";

type ProjectRow = {
  id: string;
  name: string;
  description: string | null;
  status: string | null;
  progress: number | null;
  created_by: string | null;
  end_date?: string | null;
  created_at: string;
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

type TaskRow = {
  id: string;
  title: string;
  status: string | null;
  priority: string | null;
  due_date: string | null;
  assignee_id: string | null;
  project_id: string | null;
  created_by: string | null;
  created_at: string;
};

type CalendarEventRow = {
  id: string;
  title: string;
  event_type: string | null;
  start_date: string;
  project_id: string | null;
  task_id: string | null;
  created_by: string | null;
};

type ActivityLogRow = {
  id: string;
  project_id: string | null;
  task_id: string | null;
  user_id: string | null;
  action_type: string;
  entity_type: string;
  entity_id: string | null;
  message: string;
  created_at: string;
};

type UpcomingItem = {
  id: string;
  type: "task" | "event" | "project";
  title: string;
  date: string;
  link: string;
  meta?: string;
};

function StatCardSkeleton() {
  return (
    <div className="aixia-dash-metric aixia-dash-metric--compact aixia-dash-glass">
      <div className="aixia-dash-metric-icon opacity-50">
        <div className="aixia-dash-skel-line !h-4 w-4 rounded-md" />
      </div>
      <div className="min-w-0 flex-1 space-y-2 py-0.5">
        <div className="aixia-dash-skel-line w-10" />
        <div className="aixia-dash-skel-line w-24 h-2.5" />
      </div>
    </div>
  );
}

function PanelSkeleton({
  title,
  icon,
}: {
  title: string;
  icon?: ReactNode;
}) {
  return (
    <div className="aixia-dash-panel">
      <div className="aixia-dash-panel-hd">
        <h3 className="aixia-dash-panel-title">
          {icon}
          {title}
        </h3>
      </div>
      <div className="aixia-dash-panel-body">
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="rounded-lg border border-border/50 p-3">
              <div className="aixia-dash-skel-line mb-2 w-2/3" />
              <div className="aixia-dash-skel-line h-2 w-1/3" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const clock = useAppClock();

  const dashboardRequest = useRequest<boolean>();
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false); 

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserName, setCurrentUserName] = useState("");
  const [currentUserRole, setCurrentUserRole] = useState<Role | null>(null);
  const [userPermissionOverrides, setUserPermissionOverrides] = useState<Partial<
    Record<Permission, boolean>
  > | null>(null);

  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [projectMembers, setProjectMembers] = useState<ProjectMemberRow[]>([]);
  const [taskMembers, setTaskMembers] = useState<TaskMemberRow[]>([]);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [activeMembersCount, setActiveMembersCount] = useState(0);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEventRow[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLogRow[]>([]);

  const [onlineUsers, setOnlineUsers] = useState<Record<string, boolean>>({});

  const applyDashboardData = (data: NonNullable<Awaited<ReturnType<typeof loadFullDashboardData>>>) => {
    setCurrentUserId(data.userId);
    setCurrentUserName(data.fullName || t("common.user", "User"));
    setCurrentUserRole(data.role);
    setUserPermissionOverrides(
      (data.permissions as Partial<Record<Permission, boolean>> | null) ?? null
    );
    setProjects(data.projects as ProjectRow[]);
    setProjectMembers(data.projectMembers as ProjectMemberRow[]);
    setTaskMembers(data.taskMembers as TaskMemberRow[]);
    setTasks(data.tasks as TaskRow[]);
    setActiveMembersCount(data.activeMembersCount);
    setCalendarEvents(data.calendarEvents as CalendarEventRow[]);
    setActivityLogs(data.activityLogs as ActivityLogRow[]);
    setHasLoadedOnce(true);
  };

  const loadDashboard = async () => {
    try {
      await dashboardRequest.run(async () => {
        const data = await loadFullDashboardData();
        if (!data) {
          throw new Error("Not authenticated");
        }
        applyDashboardData(data);
        return true;
      });
    } catch (error) {
      console.error("Dashboard load error:", error);
      const fallback = await loadFullDashboardData();
      if (fallback) {
        applyDashboardData(fallback);
      }
    }
  };

  useEffect(() => {
    void loadDashboard();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        void loadDashboard();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => subscribeAixiaOnlineUsers(setOnlineUsers), []);

    useEffect(() => {
    if (!currentUserId) return;

    subscribeToDashboardActivity({
      userId: currentUserId,
      onInsert: (payload) => {
        const newLog = payload as ActivityLogRow;

        setActivityLogs((prev) => {
          const alreadyExists = prev.some((log) => log.id === newLog.id);
          if (alreadyExists) return prev;
          return [newLog, ...prev].slice(0, 50);
        });
      },
      onDelete: (payload) => {
        const deletedId = (payload as { id?: string } | null)?.id;
        if (!deletedId) return;

        setActivityLogs((prev) => prev.filter((log) => log.id !== deletedId));
      },
    });

    subscribeToDashboardTasks({
      userId: currentUserId,
      onInsert: (payload) => {
        const newTask = payload as TaskRow;

        setTasks((prev) => {
          const alreadyExists = prev.some((task) => task.id === newTask.id);
          if (alreadyExists) return prev;
          return [newTask, ...prev];
        });
      },
      onUpdate: (payload) => {
        const updatedTask = payload as TaskRow;

        setTasks((prev) =>
          prev.map((task) => (task.id === updatedTask.id ? updatedTask : task))
        );
      },
      onDelete: (payload) => {
        const deletedId = (payload as { id?: string } | null)?.id;
        if (!deletedId) return;

        setTasks((prev) => prev.filter((task) => task.id !== deletedId));
      },
    });

    subscribeToDashboardProjects({
      userId: currentUserId,
      onInsert: (payload) => {
        const newProject = payload as ProjectRow;

        setProjects((prev) => {
          const alreadyExists = prev.some((project) => project.id === newProject.id);
          if (alreadyExists) return prev;
          return [newProject, ...prev];
        });
      },
      onUpdate: (payload) => {
        const updatedProject = payload as ProjectRow;

        setProjects((prev) =>
          prev.map((project) =>
            project.id === updatedProject.id ? updatedProject : project
          )
        );
      },
      onDelete: (payload) => {
        const deletedId = (payload as { id?: string } | null)?.id;
        if (!deletedId) return;

        setProjects((prev) => prev.filter((project) => project.id !== deletedId));
      },
    });

    return () => {
      void removeRealtimeChannel(`dashboard:activity:${currentUserId}`);
      void removeRealtimeChannel(`dashboard:tasks:${currentUserId}`);
      void removeRealtimeChannel(`dashboard:projects:${currentUserId}`);
    };
  }, [currentUserId]);

  const visibleProjectIds = useMemo(() => {
    if (!currentUserId) return new Set<string>();

    if (isAdminRole(currentUserRole)) {
      return new Set(projects.map((project) => project.id));
    }

    return new Set(
      projects
        .filter(
          (project) =>
            project.created_by === currentUserId ||
            projectMembers.some(
              (member) =>
                member.project_id === project.id && member.user_id === currentUserId
            )
        )
        .map((project) => project.id)
    );
  }, [currentUserId, currentUserRole, projects, projectMembers]);

  const visibleProjects = useMemo(() => {
    if (isAdminRole(currentUserRole)) return projects;
    return projects.filter((project) => visibleProjectIds.has(project.id));
  }, [currentUserRole, projects, visibleProjectIds]);

  const effectiveRole = currentUserRole ?? "employee";

  const visibleTasks = useMemo(() => {
    if (!currentUserId) return [];
    if (isAdminRole(effectiveRole)) return tasks;

    return tasks.filter((task) =>
      canViewTask(task, currentUserId, effectiveRole, taskMembers, visibleProjectIds)
    );
  }, [currentUserId, effectiveRole, tasks, taskMembers, visibleProjectIds]);

  const visibleEvents = useMemo(() => {
    if (!currentUserId) return [];
    if (isAdminRole(effectiveRole)) return calendarEvents;

    return calendarEvents.filter(
      (event) =>
        event.created_by === currentUserId ||
        (event.project_id ? visibleProjectIds.has(event.project_id) : false)
    );
  }, [calendarEvents, currentUserId, effectiveRole, visibleProjectIds]);

  const activeProjectsForProgress = useMemo(() => {
    return visibleProjects.filter((project) => {
      const status = (project.status || "").toUpperCase();
      return status !== "COMPLETED" && status !== "DONE" && status !== "ARCHIVED";
    });
  }, [visibleProjects]);

  const completedTasks = useMemo(() => {
    return visibleTasks.filter((task) => {
      const status = (task.status || "").toUpperCase();
      return status === "DONE" || status === "COMPLETED";
    }).length;
  }, [visibleTasks]);

  const activeTasksForCompletion = useMemo(() => {
    return visibleTasks.filter((task) => {
      const status = (task.status || "").toUpperCase();
      return status !== "DONE" && status !== "COMPLETED";
    });
  }, [visibleTasks]);

  const totalRelevantTasks = activeTasksForCompletion.length + completedTasks;

  const averageProgress = useMemo(() => {
    if (activeProjectsForProgress.length === 0) return 0;

    return Math.round(
      activeProjectsForProgress.reduce((sum, project) => sum + (project.progress || 0), 0) /
        activeProjectsForProgress.length
    );
  }, [activeProjectsForProgress]);

  const upcomingItems = useMemo<UpcomingItem[]>(() => {
  const today = clock.now;
  const next30Days = addDays(today, 30);
  const items: UpcomingItem[] = [];

    for (const task of activeTasksForCompletion) {
      if (!task.due_date) continue;
      const due = parseISO(task.due_date);
      if (isBefore(due, today) || isBefore(next30Days, due)) continue;

      items.push({
        id: `task-${task.id}`,
        type: "task",
        title: task.title,
        date: task.due_date,
        link: `/tasks/${task.id}`,
        meta: task.status || t("dashboard.taskLabel", "Task"),
      });
    }

    for (const event of visibleEvents) {
      const when = parseISO(event.start_date);
      if (isBefore(when, today) || isBefore(next30Days, when)) continue;

      items.push({
        id: `event-${event.id}`,
        type: "event",
        title: event.title,
        date: event.start_date,
        link: `/calendar/day/${event.start_date}`,
        meta: event.event_type || t("dashboard.eventLabel", "Event"),
      });
    }

    for (const project of activeProjectsForProgress) {
      if (!project.end_date) continue;
      const when = parseISO(project.end_date);
      if (isBefore(when, today) || isBefore(next30Days, when)) continue;

      items.push({
        id: `project-${project.id}`,
        type: "project",
        title: project.name,
        date: project.end_date,
        link: `/projects/${project.id}`,
        meta: t("dashboard.projectDeadline", "Project deadline"),
      });
    }

    return items
      .sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime())
      .slice(0, 12);
  }, [activeProjectsForProgress, activeTasksForCompletion, visibleEvents, t]);

  const visibleActivity = useMemo(() => {
    const filtered = activityLogs.filter((log) => {
      if (isAdminRole(currentUserRole)) return true;
      if (!currentUserId) return false;
      if (log.project_id && visibleProjectIds.has(log.project_id)) return true;
      if (log.user_id && log.user_id === currentUserId) return true;
      if (log.task_id && visibleTasks.some((task) => task.id === log.task_id)) return true;
      return false;
    });

    return filtered.filter((log) => {
      const action = (log.action_type || "").toUpperCase();
      return action !== "VIEW";
    });
  }, [activityLogs, currentUserId, currentUserRole, visibleProjectIds, visibleTasks]);

  const completionPercent =
    totalRelevantTasks === 0
      ? 0
      : Math.round((completedTasks / totalRelevantTasks) * 100);

  const effectivePermissions = useMemo(
    () =>
      currentUserRole
        ? getEffectivePermissions(currentUserRole, userPermissionOverrides)
        : null,
    [currentUserRole, userPermissionOverrides]
  );

  const showAdminDashboardCards = useMemo(
    () =>
      isAdminRole(currentUserRole) || Boolean(effectivePermissions?.manageUsers),
    [currentUserRole, effectivePermissions]
  );

  const presenceOnlineCount = useMemo(() => {
    if (!showAdminDashboardCards) return 0;
    return Object.values(onlineUsers).filter(Boolean).length;
  }, [showAdminDashboardCards, onlineUsers]);

  const overdueOpenTaskCount = useMemo(() => {
    const today = startOfDay(clock.now);
    return activeTasksForCompletion.filter((task) => {
      if (!task.due_date) return false;
      return isBefore(parseISO(task.due_date), today);
    }).length;
  }, [activeTasksForCompletion, clock.now]);

  const eventsNextSevenDaysCount = useMemo(() => {
    const start = startOfDay(clock.now);
    const end = addDays(start, 7);
    return visibleEvents.filter((event) => {
      const when = startOfDay(parseISO(event.start_date));
      return !isBefore(when, start) && isBefore(when, end);
    }).length;
  }, [visibleEvents, clock.now]);

  const highPriorityOpenCount = useMemo(() => {
    return activeTasksForCompletion.filter((task) => {
      const p = (task.priority || "").toUpperCase();
      return p === "HIGH" || p === "URGENT" || p === "CRITICAL";
    }).length;
  }, [activeTasksForCompletion]);

  const liveMetricItems = useMemo<AixiaCommandMetricItem[]>(
    () => [
      {
        key: "upcoming",
        title: t("dashboard.liveChipUpcoming", "upcoming"),
        value: String(upcomingItems.length),
        icon: CalendarDays,
        tone: "indigo",
      },
      {
        key: "activity",
        title: t("dashboard.liveChipActivity", "activity items"),
        value: String(visibleActivity.length),
        icon: Activity,
        tone: "indigo",
      },
      {
        key: "open-tasks",
        title: t("dashboard.liveChipOpenTasks", "open tasks"),
        value: String(activeTasksForCompletion.length),
        icon: CheckSquare,
        tone: "cyan",
      },
      {
        key: "online",
        title: t("dashboard.liveChipOnline", "online"),
        value: String(presenceOnlineCount),
        icon: Users,
        tone: "emerald",
      },
      {
        key: "overdue",
        title: t("dashboard.liveChipOverdue", "overdue"),
        value: String(overdueOpenTaskCount),
        icon: AlertCircle,
        tone: overdueOpenTaskCount > 0 ? "rose" : "neutral",
      },
      {
        key: "events-week",
        title: t("dashboard.liveChipEventsWeek", "events · 7d"),
        value: String(eventsNextSevenDaysCount),
        icon: CalendarDays,
        tone: "violet",
      },
      {
        key: "high-priority",
        title: t("dashboard.liveChipHighPrio", "high priority"),
        value: String(highPriorityOpenCount),
        icon: TrendingUp,
        tone: "amber",
      },
    ],
    [
      t,
      upcomingItems.length,
      visibleActivity.length,
      activeTasksForCompletion.length,
      presenceOnlineCount,
      overdueOpenTaskCount,
      eventsNextSevenDaysCount,
      highPriorityOpenCount,
    ]
  );

  return (
    <AixiaPage surface="command" className="aixia-command-page aixia-dashboard-page">
      <AixiaHero
        surface="command"
        className="shrink-0 space-y-4"
        gradientTitle={t("dashboard.heroKicker", "Live workspace")}
        title={
          dashboardRequest.status === "loading" && !hasLoadedOnce
            ? t("dashboard.welcome", "Welcome,")
            : t("dashboard.welcomeUser", "Welcome, {{name}}", {
                name: currentUserName || t("common.user", "User"),
              })
        }
        subtitle={t(
          "dashboard.subtitle",
          "Here is a live overview of your projects, tasks, and events"
        )}
        actions={
          <>
            <AixiaButton
              variant="primary"
              type="button"
              className="h-9"
              onClick={() => navigate("/projects/new")}
            >
              <Plus className="w-4 h-4 mr-2" />
              {t("dashboard.newProject", "New project")}
            </AixiaButton>
            <AixiaButton
              type="button"
              className="h-9"
              onClick={() => navigate("/calendar/new")}
            >
              <CalendarDays className="w-4 h-4 mr-2" />
              {t("dashboard.newEvent", "New event")}
            </AixiaButton>
            <AixiaButton
              type="button"
              className="h-9"
              onClick={() => void loadDashboard()}
              disabled={dashboardRequest.status === "loading"}
            >
              {dashboardRequest.status === "loading"
                ? t("dashboard.refreshing", "Refreshing…")
                : t("dashboard.refresh", "Refresh")}
            </AixiaButton>
          </>
        }
      >
        <AixiaCommandMetrics items={liveMetricItems} />
      </AixiaHero>

      <div className="aixia-command-scroll">
      <PageError message={dashboardRequest.error || ""} />

      <div className="aixia-dash-widget-shell aixia-dash-glass aixia-dash-tilt-panel">
        <DashboardProjectTeammatesCard
          projects={visibleProjects}
          projectMembers={projectMembers}
          onlineUsers={onlineUsers}
        />
      </div>

      <div className="aixia-dash-widget-shell aixia-dash-glass aixia-dash-tilt-panel">
        <DashboardAdminEmployeeDirectoryCard onlineUsers={onlineUsers} />
      </div>

      <div className="aixia-dash-widget-shell aixia-dash-glass aixia-dash-tilt-panel">
        <DashboardAdminPlatformUsageCard />
      </div>

      <DashboardWorkspaceRail
        role={currentUserRole}
        permissionOverrides={userPermissionOverrides}
      />

      <DashboardEmailStatusCard />

      <PageLoader
        loading={dashboardRequest.status === "loading" && !hasLoadedOnce}
        fallback={
          <div className="aixia-dash-bento">
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </div>
        }
      >
        <div className="aixia-dash-bento">
          <div
            className="aixia-dash-metric aixia-dash-metric--featured aixia-dash-metric--tone-violet aixia-dash-glass aixia-dash-tilt-metric"
            style={{ ["--aixia-dash-foot-pct" as string]: `${Math.min(100, averageProgress)}%` }}
          >
            <span className="aixia-dash-metric-deco" aria-hidden />
            <div className="flex items-start gap-3 flex-1 min-h-0">
              <div className="aixia-dash-metric-icon">
                <FolderKanban />
              </div>
              <div className="min-w-0 flex-1">
                <div className="aixia-dash-metric-val">{activeProjectsForProgress.length}</div>
                <div className="aixia-dash-metric-label">
                  {t("dashboard.activeProjects", "Active Projects")}
                </div>
              </div>
            </div>
            <div className="aixia-dash-metric-foot">
              <span />
            </div>
          </div>
          <div className="aixia-dash-metric aixia-dash-metric--compact aixia-dash-metric--tone-teal aixia-dash-glass aixia-dash-tilt-metric">
            <span className="aixia-dash-metric-deco" aria-hidden />
            <div className="aixia-dash-metric-icon">
              <CheckSquare />
            </div>
            <div className="min-w-0 flex-1">
              <div className="aixia-dash-metric-val">{activeTasksForCompletion.length}</div>
              <div className="aixia-dash-metric-label">
                {t("dashboard.activeTasks", "Active Tasks")}
              </div>
            </div>
          </div>
          <div className="aixia-dash-metric aixia-dash-metric--compact aixia-dash-metric--tone-amber aixia-dash-glass aixia-dash-tilt-metric">
            <span className="aixia-dash-metric-deco" aria-hidden />
            <div className="aixia-dash-metric-icon">
              <Users />
            </div>
            <div className="min-w-0 flex-1">
              <div className="aixia-dash-metric-val">{activeMembersCount}</div>
              <div className="aixia-dash-metric-label">
                {t("dashboard.activeMembers", "Active Members")}
              </div>
            </div>
          </div>
          <div className="aixia-dash-metric aixia-dash-metric--compact aixia-dash-metric--tone-rose aixia-dash-glass aixia-dash-tilt-metric">
            <span className="aixia-dash-metric-deco" aria-hidden />
            <div className="aixia-dash-metric-icon">
              <TrendingUp />
            </div>
            <div className="min-w-0 w-full">
              <div className="aixia-dash-metric-val">{averageProgress}%</div>
              <div className="aixia-dash-metric-label">
                {t("dashboard.averageProjectProgress", "Avg. progress")}
              </div>
              <Progress value={averageProgress} className="h-1 mt-1.5" />
            </div>
          </div>
        </div>
      </PageLoader>

      <div className="aixia-dash-scroll">
        <div className="aixia-dash-main-grid">
          <div className="aixia-dash-col">
            {dashboardRequest.status === "loading" && !hasLoadedOnce ? (
              <>
                <PanelSkeleton
                  title={t("dashboard.upcomingDeadlines", "Upcoming Deadlines")}
                  icon={<AlertCircle className="w-3.5 h-3.5 text-primary" />}
                />
                <PanelSkeleton title={t("dashboard.projectProgress", "Project Progress")} />
              </>
            ) : (
              <>
                <section className="aixia-dash-panel aixia-dash-panel--deadlines aixia-dash-glass aixia-dash-tilt-panel">
                  <div className="aixia-dash-panel-hd">
                    <h2 className="aixia-dash-panel-title">
                      <AlertCircle className="text-primary" />
                      {t("dashboard.upcomingDeadlines", "Upcoming")}
                    </h2>
                    <button
                      type="button"
                      className="aixia-dash-action"
                      onClick={() => navigate("/calendar")}
                    >
                      {t("dashboard.viewCalendar", "Calendar")}
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="aixia-dash-panel-body">
                    {upcomingItems.length === 0 ? (
                      <p className="aixia-dash-empty">
                        {t(
                          "dashboard.noUpcomingDeadlinesOrEvents",
                          "No upcoming deadlines or events."
                        )}
                      </p>
                    ) : (
                      <ScrollArea className="h-[min(62vh,620px)] pr-2">
                        <div className="space-y-0.5">
                          {upcomingItems.map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              className="aixia-dash-list-row"
                              onClick={() => navigate(item.link)}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <div className="aixia-dash-list-row-title">{item.title}</div>
                                  <div className="aixia-dash-list-row-meta">
                                    {format(parseISO(item.date), "MMM d, yyyy")}
                                  </div>
                                </div>
                                <span className="aixia-dash-pill shrink-0">
                                  {String(item.meta || item.type).replaceAll("_", " ")}
                                </span>
                              </div>
                            </button>
                          ))}
                        </div>
                      </ScrollArea>
                    )}
                  </div>
                </section>

                <section className="aixia-dash-panel aixia-dash-panel--progress aixia-dash-glass aixia-dash-tilt-panel">
                  <div className="aixia-dash-panel-hd">
                    <h2 className="aixia-dash-panel-title">
                      {t("dashboard.projectProgress", "Project progress")}
                    </h2>
                  </div>
                  <div className="aixia-dash-panel-body">
                    {activeProjectsForProgress.length === 0 ? (
                      <p className="aixia-dash-empty">
                        {t("dashboard.noActiveProjectsAvailable", "No active projects available.")}
                      </p>
                    ) : (
                      <ScrollArea className="h-[min(62vh,620px)] pr-2">
                        <div className="space-y-3">
                          {activeProjectsForProgress.map((project) => (
                            <div key={project.id} className="space-y-1.5">
                              <div className="flex items-center justify-between gap-2">
                                <button
                                  type="button"
                                  className="aixia-dash-list-row-title hover:text-primary text-left truncate bg-transparent border-none p-0 cursor-pointer"
                                  onClick={() => navigate(`/projects/${project.id}`)}
                                >
                                  {project.name}
                                </button>
                                <span className="text-xs tabular-nums text-muted-foreground shrink-0">
                                  {project.progress || 0}%
                                </span>
                              </div>
                              <Progress value={project.progress || 0} className="h-1" />
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    )}
                  </div>
                </section>
              </>
            )}
          </div>

          <div className="aixia-dash-col">
            {dashboardRequest.status === "loading" && !hasLoadedOnce ? (
              <>
                <PanelSkeleton
                  title={t("dashboard.activityFeed", "Activity")}
                  icon={<Activity className="w-3.5 h-3.5 text-primary" />}
                />
                <PanelSkeleton title={t("dashboard.taskCompletion", "Tasks")} />
              </>
            ) : (
              <>
                <section className="aixia-dash-panel aixia-dash-panel--activity aixia-dash-glass aixia-dash-tilt-panel">
                  <div className="aixia-dash-panel-hd">
                    <h2 className="aixia-dash-panel-title">
                      <Activity className="text-primary" />
                      {t("dashboard.activityFeed", "Activity")}
                    </h2>
                  </div>
                  <div className="aixia-dash-panel-body">
                    {visibleActivity.length === 0 ? (
                      <p className="aixia-dash-empty">
                        {t("dashboard.noRecentActivityYet", "No recent activity yet.")}
                      </p>
                    ) : (
                      <ScrollArea className="h-[min(62vh,620px)] pr-2">
                        <div className="space-y-2">
                          {visibleActivity.map((log) => (
                            <div key={log.id} className="aixia-dash-feed-item">
                              <div className="text-sm text-foreground leading-snug">{log.message}</div>
                              <div className="text-[0.65rem] text-muted-foreground mt-1 tabular-nums">
                                {format(parseISO(log.created_at), "MMM d, yyyy h:mm a")}
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    )}
                  </div>
                </section>

                <section className="aixia-dash-panel aixia-dash-panel--tasks aixia-dash-glass aixia-dash-tilt-panel">
                  <div className="aixia-dash-panel-hd">
                    <h2 className="aixia-dash-panel-title">
                      {t("dashboard.taskCompletion", "Task completion")}
                    </h2>
                  </div>
                  <div className="aixia-dash-panel-body flex flex-col gap-3 min-h-0">
                    <div className="shrink-0 space-y-2">
                      <div className="text-sm font-medium text-foreground">
                        {t("dashboard.completedSummary", "{{completed}} / {{total}} completed", {
                          completed: completedTasks,
                          total: totalRelevantTasks,
                        })}
                      </div>
                      <Progress value={completionPercent} className="h-1" />
                      <p className="text-xs text-muted-foreground">
                        {totalRelevantTasks === 0
                          ? t("dashboard.noRelevantTasksYet", "No relevant tasks yet.")
                          : t(
                              "dashboard.percentTasksComplete",
                              "{{percent}}% of tasks are complete",
                              { percent: completionPercent }
                            )}
                      </p>
                    </div>
                    <div className="flex-1 min-h-0">
                      {activeTasksForCompletion.length > 0 ? (
                        <ScrollArea className="h-[min(44vh,420px)] pr-2">
                          <div className="space-y-0.5">
                            {activeTasksForCompletion.map((task) => (
                              <button
                                key={task.id}
                                type="button"
                                className="aixia-dash-list-row"
                                onClick={() => navigate(`/tasks/${task.id}`)}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0">
                                    <div className="aixia-dash-list-row-title">{task.title}</div>
                                    {task.due_date ? (
                                      <div className="aixia-dash-list-row-meta">
                                        {t("dashboard.dueLabel", "Due")}{" "}
                                        {format(parseISO(task.due_date), "MMM d, yyyy")}
                                      </div>
                                    ) : null}
                                  </div>
                                  <Badge className="bg-primary/12 text-primary text-[0.6rem] shrink-0 h-5 px-2 font-medium border-0">
                                    {(task.status || t("dashboard.taskLabel", "Task")).replaceAll(
                                      "_",
                                      " "
                                    )}
                                  </Badge>
                                </div>
                              </button>
                            ))}
                          </div>
                        </ScrollArea>
                      ) : (
                        <p className="aixia-dash-empty">
                          {t("dashboard.noActiveTasksToDisplay", "No active tasks to display.")}
                        </p>
                      )}
                    </div>
                  </div>
                </section>
              </>
            )}
          </div>
        </div>
      </div>
      </div>
    </AixiaPage>
  );
}
