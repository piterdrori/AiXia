import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { addDays, format, isBefore, parseISO } from "date-fns";
import { supabase } from "@/lib/supabase";
import {
  removeRealtimeChannel,
  subscribeToDashboardActivity,
  subscribeToDashboardTasks,
  subscribeToDashboardProjects,
} from "@/lib/realtime";
import { createRequestTracker } from "@/lib/safeAsync";
import { useRequest } from "@/lib/useRequest";
import { useLanguage } from "@/lib/i18n";
import { useAppClock } from "@/lib/clock/provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PageError } from "@/components/ui/PageError";
import { PageLoader } from "@/components/ui/PageLoader";
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

type Role = "admin" | "manager" | "employee" | "guest";

type ProfileRow = {
  user_id: string;
  full_name: string | null;
  role: Role;
  status: "active" | "pending" | "inactive" | "denied";
  created_at: string;
};

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
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-muted/50 animate-pulse shrink-0" />
        <div className="w-full space-y-2">
          <div className="h-6 w-16 rounded bg-muted/50 animate-pulse" />
          <div className="h-4 w-28 rounded bg-muted/50 animate-pulse" />
        </div>
      </CardContent>
    </Card>
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
    <Card className="flex flex-col overflow-hidden">
      <CardHeader className="shrink-0 pb-4">
        <CardTitle className="text-foreground flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden">
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              key={index}
              className="p-3 rounded-xl border border-border bg-background/60 backdrop-blur-md"
            >
              <div className="h-4 w-2/3 rounded bg-muted/50 animate-pulse mb-2" />
              <div className="h-3 w-1/3 rounded bg-muted/50 animate-pulse" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const requestTracker = useRef(createRequestTracker());
  const { t } = useLanguage();
  const clock = useAppClock();

  const dashboardRequest = useRequest<boolean>();
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false); 

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserName, setCurrentUserName] = useState("");
  const [currentUserRole, setCurrentUserRole] = useState<Role | null>(null);

  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [projectMembers, setProjectMembers] = useState<ProjectMemberRow[]>([]);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEventRow[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLogRow[]>([]);

  const loadDashboard = async () => {
    const requestId = requestTracker.current.next();

        try {
      await dashboardRequest.run(async () => {
        const session = await supabase.auth.getSession();
const user = session.data.session?.user;

if (!requestTracker.current.isLatest(requestId)) return true;

if (!user) {
  navigate("/login");
  return true;
}

      const { data, error } = await supabase.functions.invoke("dashboard-summary");

        if (!requestTracker.current.isLatest(requestId)) return true;

        if (error || !data?.payload) {
          throw new Error(
            t("dashboard.someDataCouldNotBeLoaded", "Some dashboard data could not be loaded.")
          );
        }

        const {
          currentUser,
          projects,
          projectMembers,
          tasks,
          profiles,
          calendarEvents,
          activityLogs,
        } = data.payload;

        setCurrentUserId(currentUser?.id || user.id);
        setCurrentUserName(currentUser?.full_name || t("common.user", "User"));
        setCurrentUserRole((currentUser?.role as Role) || null);
        setProjects((projects || []) as ProjectRow[]);
        setProjectMembers((projectMembers || []) as ProjectMemberRow[]);
        setTasks((tasks || []) as TaskRow[]);
        setProfiles((profiles || []) as ProfileRow[]);
        setCalendarEvents((calendarEvents || []) as CalendarEventRow[]);
        setActivityLogs((activityLogs || []) as ActivityLogRow[]);
        setHasLoadedOnce(true);

        return true;
      }, "dashboard:load");
    } catch (error) {
      if (!requestTracker.current.isLatest(requestId)) return;
      console.error("Dashboard load error:", error);
    }
  };

    useEffect(() => {
    void loadDashboard();
  }, []);

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

    if (currentUserRole === "admin") {
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
    if (currentUserRole === "admin") return projects;
    return projects.filter((project) => visibleProjectIds.has(project.id));
  }, [currentUserRole, projects, visibleProjectIds]);

  const visibleTasks = useMemo(() => {
    if (!currentUserId) return [];
    if (currentUserRole === "admin") return tasks;

    return tasks.filter(
      (task) =>
        task.created_by === currentUserId ||
        task.assignee_id === currentUserId ||
        (task.project_id ? visibleProjectIds.has(task.project_id) : false)
    );
  }, [currentUserId, currentUserRole, tasks, visibleProjectIds]);

  const visibleEvents = useMemo(() => {
    if (!currentUserId) return [];
    if (currentUserRole === "admin") return calendarEvents;

    return calendarEvents.filter(
      (event) =>
        event.created_by === currentUserId ||
        (event.project_id ? visibleProjectIds.has(event.project_id) : false)
    );
  }, [calendarEvents, currentUserId, currentUserRole, visibleProjectIds]);

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
      if (currentUserRole === "admin") return true;
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

  return (
    <div className="min-h-[calc(100vh-126px)] flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-3xl font-semibold tracking-[-0.02em] text-foreground">
                        {dashboardRequest.status === "loading" && !hasLoadedOnce
              ? t("dashboard.welcome", "Welcome,")
              : t("dashboard.welcomeUser", "Welcome, {{name}}", {
                  name: currentUserName || t("common.user", "User"),
                })}
          </h1>
          <p className="text-muted-foreground">
            {t(
              "dashboard.subtitle",
              "Here is a live overview of your projects, tasks, and events"
            )}
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            className=""
            onClick={() => navigate("/projects/new")}
          >
            <Plus className="w-4 h-4 mr-2" />
            {t("dashboard.newProject", "New Project")}
          </Button>

          <Button
            variant="outline"
            className=""
            onClick={() => navigate("/calendar/new")}
          >
            <CalendarDays className="w-4 h-4 mr-2" />
            {t("dashboard.newEvent", "New Event")}
          </Button>

                    <Button
            variant="outline"
            className=""
            onClick={() => void loadDashboard()}
            disabled={dashboardRequest.status === "loading"}
          >
            {dashboardRequest.status === "loading"
              ? t("dashboard.refreshing", "Refreshing...")
              : t("dashboard.refresh", "Refresh")}
          </Button>
        </div>
      </div>

      <PageError message={dashboardRequest.error || ""} />

      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4 shrink-0">
  <PageLoader
    loading={dashboardRequest.status === "loading" && !hasLoadedOnce}
    fallback={
      <>
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </>
    }
  >
    <>
      <Card>
        <CardContent className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <FolderKanban className="w-5 h-5 text-primary" />
          </div>
          <div>
            <div className="text-xl font-bold text-foreground">
              {activeProjectsForProgress.length}
            </div>
            <div className="text-sm text-muted-foreground">
              {t("dashboard.activeProjects", "Active Projects")}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <CheckSquare className="w-5 h-5 text-primary" />
          </div>
          <div>
            <div className="text-xl font-bold text-foreground">
              {activeTasksForCompletion.length}
            </div>
            <div className="text-sm text-muted-foreground">
              {t("dashboard.activeTasks", "Active Tasks")}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5 text-primary" />
          </div>
          <div>
            <div className="text-xl font-bold text-foreground">{profiles.length}</div>
            <div className="text-sm text-muted-foreground">
              {t("dashboard.activeMembers", "Active Members")}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <TrendingUp className="w-5 h-5 text-primary" />
          </div>
          <div className="w-full">
            <div className="text-xl font-bold text-foreground">{averageProgress}%</div>
            <div className="text-sm text-muted-foreground mb-2">
              {t("dashboard.averageProjectProgress", "Average Project Progress")}
            </div>
            <Progress value={averageProgress} />
          </div>
        </CardContent>
      </Card>
    </>
  </PageLoader>
</div>

      <div className="grid xl:grid-cols-2 gap-6 min-h-[1100px]">
        <div className="grid gap-6 content-start" style={{ gridTemplateRows: "520px 520px" }}>
                    {dashboardRequest.status === "loading" && !hasLoadedOnce ? (
            <>
              <PanelSkeleton
                title={t("dashboard.upcomingDeadlines", "Upcoming Deadlines")}
                icon={<AlertCircle className="w-5 h-5 text-primary" />}
              />
              <PanelSkeleton title={t("dashboard.projectProgress", "Project Progress")} />
            </>
          ) : (
            <>
              <Card className="flex flex-col overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between shrink-0 pb-4">
                  <CardTitle className="text-foreground flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-primary" />
                    {t("dashboard.upcomingDeadlines", "Upcoming Deadlines")}
                  </CardTitle>
                  <Button
                    variant="ghost"
                    className="text-muted-foreground hover:text-foreground"
                    onClick={() => navigate("/calendar")}
                  >
                    {t("dashboard.viewCalendar", "View Calendar")}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </CardHeader>

                <CardContent className="flex-1 overflow-hidden">
                  {upcomingItems.length === 0 ? (
                    <div className="text-muted-foreground">
                      {t(
                        "dashboard.noUpcomingDeadlinesOrEvents",
                        "No upcoming deadlines or events."
                      )}
                    </div>
                  ) : (
                    <ScrollArea className="h-full pr-3">
                      <div className="space-y-3">
                        {upcomingItems.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => navigate(item.link)}
                            className="w-full text-left p-4 rounded-xl border border-border bg-background/60 backdrop-blur-md hover:border-primary/30 transition"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <div className="text-foreground font-medium truncate">
                                  {item.title}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {format(parseISO(item.date), "MMM d, yyyy")}
                                </div>
                              </div>

                              <div className="shrink-0">
                                <Badge
                                                                    className="bg-primary/10 text-primary"
                                >
                                  {item.meta || item.type}
                                </Badge>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>

              <Card className="flex flex-col overflow-hidden">
                <CardHeader className="shrink-0 pb-4">
                  <CardTitle className="text-foreground">
                    {t("dashboard.projectProgress", "Project Progress")}
                  </CardTitle>
                </CardHeader>

                <CardContent className="flex-1 overflow-hidden">
                  {activeProjectsForProgress.length === 0 ? (
                    <div className="text-muted-foreground">
                      {t("dashboard.noActiveProjectsAvailable", "No active projects available.")}
                    </div>
                  ) : (
                    <ScrollArea className="h-full pr-3">
                      <div className="space-y-4">
                        {activeProjectsForProgress.map((project) => (
                          <div key={project.id} className="space-y-2">
                            <div className="flex items-center justify-between gap-3">
                              <button
                                className="text-foreground hover:text-primary truncate"
                                onClick={() => navigate(`/projects/${project.id}`)}
                              >
                                {project.name}
                              </button>
                              <span className="text-sm text-muted-foreground">
                                {project.progress || 0}%
                              </span>
                            </div>
                            <Progress value={project.progress || 0} />
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>

        <div className="grid gap-6 content-start" style={{ gridTemplateRows: "520px 520px" }}>
                    {dashboardRequest.status === "loading" && !hasLoadedOnce ? (
            <>
              <PanelSkeleton
                title={t("dashboard.activityFeed", "Activity Feed")}
                icon={<Activity className="w-5 h-5 text-primary" />}
              />
              <PanelSkeleton title={t("dashboard.taskCompletion", "Task Completion")} />
            </>
          ) : (
            <>
              <Card className="flex flex-col overflow-hidden">
                <CardHeader className="shrink-0 pb-4">
                  <CardTitle className="text-foreground flex items-center gap-2">
                    <Activity className="w-5 h-5 text-primary" />
                    {t("dashboard.activityFeed", "Activity Feed")}
                  </CardTitle>
                </CardHeader>

                <CardContent className="flex-1 overflow-hidden">
                  {visibleActivity.length === 0 ? (
                    <div className="text-muted-foreground">
                      {t("dashboard.noRecentActivityYet", "No recent activity yet.")}
                    </div>
                  ) : (
                    <ScrollArea className="h-full pr-3">
                      <div className="space-y-3">
                        {visibleActivity.map((log) => (
                          <div
                            key={log.id}
                            className="p-3 rounded-xl border border-border bg-background/60 backdrop-blur-md"
                          >
                            <div className="text-foreground text-sm">{log.message}</div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {format(parseISO(log.created_at), "MMM d, yyyy h:mm a")}
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>

              <Card className="flex flex-col overflow-hidden">
                <CardHeader className="shrink-0 pb-3">
                  <CardTitle className="text-foreground">
                    {t("dashboard.taskCompletion", "Task Completion")}
                  </CardTitle>
                </CardHeader>

                <CardContent className="flex flex-col flex-1 overflow-hidden">
                  <div className="shrink-0 space-y-3 pb-3">
                    <div className="text-foreground text-lg font-semibold">
                      {t("dashboard.completedSummary", "{{completed}} / {{total}} completed", {
                        completed: completedTasks,
                        total: totalRelevantTasks,
                      })}
                    </div>

                    <Progress value={completionPercent} />

                    <div className="text-sm text-muted-foreground">
                      {totalRelevantTasks === 0
                        ? t("dashboard.noRelevantTasksYet", "No relevant tasks yet.")
                        : t(
                            "dashboard.percentTasksComplete",
                            "{{percent}}% of tasks are complete",
                            { percent: completionPercent }
                          )}
                    </div>
                  </div>

                  <div className="flex-1 overflow-hidden">
                    {activeTasksForCompletion.length > 0 ? (
                      <ScrollArea className="h-full pr-3">
                        <div className="space-y-3">
                          {activeTasksForCompletion.map((task) => (
                            <button
                              key={task.id}
                              type="button"
                              onClick={() => navigate(`/tasks/${task.id}`)}
                              className="w-full text-left p-3 rounded-xl border border-border bg-background/60 backdrop-blur-md hover:border-primary/30 transition"
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="text-foreground truncate">{task.title}</div>
                                  {task.due_date && (
                                    <div className="text-xs text-muted-foreground">
                                      {t("dashboard.dueLabel", "Due")}{" "}
                                      {format(parseISO(task.due_date), "MMM d, yyyy")}
                                    </div>
                                  )}
                                </div>

                                <Badge className="bg-primary/10 text-primary shrink-0">
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
                      <div className="text-muted-foreground">
                        {t("dashboard.noActiveTasksToDisplay", "No active tasks to display.")}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
