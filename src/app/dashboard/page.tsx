import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { addDays, format, isBefore, parseISO } from "date-fns";
import { supabase } from "@/lib/supabase";
import { registerRealtimeChannel, removeRealtimeChannel } from "@/lib/realtime";
import { createRequestTracker } from "@/lib/safeAsync";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
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
    <Card className="bg-slate-900/50 border-slate-800">
      <CardContent className="p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-slate-800 animate-pulse shrink-0" />
        <div className="w-full space-y-2">
          <div className="h-6 w-16 rounded bg-slate-800 animate-pulse" />
          <div className="h-4 w-28 rounded bg-slate-800 animate-pulse" />
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
  icon?: React.ReactNode;
}) {
  return (
    <Card className="bg-slate-900/50 border-slate-800 flex flex-col overflow-hidden">
      <CardHeader className="shrink-0 pb-4">
        <CardTitle className="text-white flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden">
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              key={index}
              className="p-3 rounded-lg border border-slate-800 bg-slate-950/40"
            >
              <div className="h-4 w-2/3 rounded bg-slate-800 animate-pulse mb-2" />
              <div className="h-3 w-1/3 rounded bg-slate-800 animate-pulse" />
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

  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState("");

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserName, setCurrentUserName] = useState("");
  const [currentUserRole, setCurrentUserRole] = useState<Role | null>(null);

  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [projectMembers, setProjectMembers] = useState<ProjectMemberRow[]>([]);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEventRow[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLogRow[]>([]);

  const loadDashboard = async (mode: "initial" | "refresh" = "initial") => {
    const requestId = requestTracker.current.next();

    if (mode === "initial") {
      setIsBootstrapping(true);
    } else {
      setIsRefreshing(true);
    }

    setLoadError("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!requestTracker.current.isLatest(requestId)) return;

      if (!user) {
        navigate("/login");
        return;
      }

      const [
        { data: myProfile, error: myProfileError },
        { data: projectsData, error: projectsError },
        { data: projectMembersData, error: projectMembersError },
        { data: tasksData, error: tasksError },
        { data: profilesData, error: profilesError },
        { data: eventsData, error: eventsError },
        { data: logsData, error: logsError },
      ] = await Promise.all([
        supabase.from("profiles").select("full_name, role").eq("user_id", user.id).single(),
        supabase
          .from("projects")
          .select("id, name, description, status, progress, created_by, end_date, created_at")
          .order("created_at", { ascending: false }),
        supabase.from("project_members").select("id, project_id, user_id, role, created_at"),
        supabase
          .from("tasks")
          .select(
            "id, title, status, priority, due_date, assignee_id, project_id, created_by, created_at"
          )
          .order("created_at", { ascending: false }),
        supabase
          .from("profiles")
          .select("user_id, full_name, role, status, created_at")
          .eq("status", "active"),
        supabase
          .from("calendar_events")
          .select("id, title, event_type, start_date, project_id, task_id, created_by")
          .order("start_date", { ascending: true }),
        supabase
          .from("activity_logs")
          .select(
            "id, project_id, task_id, user_id, action_type, entity_type, entity_id, message, created_at"
          )
          .order("created_at", { ascending: false })
          .limit(50),
      ]);

      if (!requestTracker.current.isLatest(requestId)) return;

      if (myProfileError || !myProfile) {
        navigate("/login");
        return;
      }

      if (projectsError) console.error("Dashboard projects load error:", projectsError);
      if (projectMembersError) {
        console.error("Dashboard project members load error:", projectMembersError);
      }
      if (tasksError) console.error("Dashboard tasks load error:", tasksError);
      if (profilesError) console.error("Dashboard profiles load error:", profilesError);
      if (eventsError) console.error("Dashboard events load error:", eventsError);
      if (logsError) console.error("Dashboard activity load error:", logsError);

      setCurrentUserId(user.id);
      setCurrentUserName(myProfile.full_name || "User");
      setCurrentUserRole((myProfile.role as Role) || null);
      setProjects((projectsData || []) as ProjectRow[]);
      setProjectMembers((projectMembersData || []) as ProjectMemberRow[]);
      setTasks((tasksData || []) as TaskRow[]);
      setProfiles((profilesData || []) as ProfileRow[]);
      setCalendarEvents((eventsData || []) as CalendarEventRow[]);
      setActivityLogs((logsData || []) as ActivityLogRow[]);

      if (
        projectsError ||
        projectMembersError ||
        tasksError ||
        profilesError ||
        eventsError ||
        logsError
      ) {
        setLoadError("Some dashboard data could not be loaded.");
      }
    } catch (error) {
      if (!requestTracker.current.isLatest(requestId)) return;
      console.error("Dashboard load error:", error);
      setLoadError("Failed to load dashboard.");
    } finally {
      if (!requestTracker.current.isLatest(requestId)) return;
      setIsBootstrapping(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    void loadDashboard("initial");
  }, []);

  useEffect(() => {
    if (!currentUserId) return;

    const channelKey = `dashboard-activity:${currentUserId}`;

    registerRealtimeChannel(
      channelKey,
      supabase
        .channel(channelKey)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "activity_logs" },
          (payload) => {
            const newLog = payload.new as ActivityLogRow;

            setActivityLogs((prev) => {
              const alreadyExists = prev.some((log) => log.id === newLog.id);
              if (alreadyExists) return prev;
              return [newLog, ...prev].slice(0, 50);
            });
          }
        )
        .on(
          "postgres_changes",
          { event: "DELETE", schema: "public", table: "activity_logs" },
          (payload) => {
            const deletedId = (payload.old as { id?: string } | null)?.id;
            if (!deletedId) return;
            setActivityLogs((prev) => prev.filter((log) => log.id !== deletedId));
          }
        )
        .subscribe()
    );

    return () => {
      void removeRealtimeChannel(channelKey);
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
              (member) => member.project_id === project.id && member.user_id === currentUserId
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
    const today = new Date();
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
        meta: task.status || "Task",
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
        meta: event.event_type || "Event",
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
        meta: "Project deadline",
      });
    }

    return items
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 12);
  }, [activeProjectsForProgress, activeTasksForCompletion, visibleEvents]);

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

  return (
    <div className="min-h-[calc(100vh-126px)] flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-3xl font-bold text-white">
            {isBootstrapping ? "Welcome," : `Welcome, ${currentUserName}`}
          </h1>
          <p className="text-slate-400">
            Here is a live overview of your projects, tasks, and events
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
            onClick={() => navigate("/projects/new")}
          >
            <Plus className="w-4 h-4 mr-2" />
            New Project
          </Button>

          <Button
            variant="outline"
            className="border-slate-700 text-slate-300 hover:bg-slate-800"
            onClick={() => navigate("/calendar/new")}
          >
            <CalendarDays className="w-4 h-4 mr-2" />
            New Event
          </Button>

          <Button
            variant="outline"
            className="border-slate-700 text-slate-300 hover:bg-slate-800"
            onClick={() => void loadDashboard("refresh")}
            disabled={isRefreshing}
          >
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </Button>
        </div>
      </div>

      {loadError && (
        <Card className="bg-red-950/20 border-red-900/40">
          <CardContent className="p-4 text-sm text-red-300">{loadError}</CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4 shrink-0">
        {isBootstrapping ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <Card className="bg-slate-900/50 border-slate-800">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/15 flex items-center justify-center shrink-0">
                  <FolderKanban className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                  <div className="text-xl font-bold text-white">
                    {activeProjectsForProgress.length}
                  </div>
                  <div className="text-sm text-slate-400">Active Projects</div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900/50 border-slate-800">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center shrink-0">
                  <CheckSquare className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <div className="text-xl font-bold text-white">
                    {activeTasksForCompletion.length}
                  </div>
                  <div className="text-sm text-slate-400">Active Tasks</div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900/50 border-slate-800">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <div className="text-xl font-bold text-white">{profiles.length}</div>
                  <div className="text-sm text-slate-400">Active Members</div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900/50 border-slate-800">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/15 flex items-center justify-center shrink-0">
                  <TrendingUp className="w-5 h-5 text-blue-400" />
                </div>
                <div className="w-full">
                  <div className="text-xl font-bold text-white">{averageProgress}%</div>
                  <div className="text-sm text-slate-400 mb-2">Average Project Progress</div>
                  <Progress value={averageProgress} />
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <div className="grid xl:grid-cols-2 gap-5 min-h-[1100px]">
        <div className="grid gap-5 content-start" style={{ gridTemplateRows: "520px 520px" }}>
          {isBootstrapping ? (
            <>
              <PanelSkeleton
                title="Upcoming Deadlines"
                icon={<AlertCircle className="w-5 h-5 text-amber-400" />}
              />
              <PanelSkeleton title="Project Progress" />
            </>
          ) : (
            <>
              <Card className="bg-slate-900/50 border-slate-800 flex flex-col overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between shrink-0 pb-4">
                  <CardTitle className="text-white flex items-center gap-2">
  <AlertCircle className="w-5 h-5 text-amber-400" />
  Upcoming Deadlines
</CardTitle>
<Button
  variant="ghost"
  className="text-slate-400 hover:text-white"
  onClick={() => navigate("/calendar")}
>
  View Calendar
  <ArrowRight className="w-4 h-4 ml-2" />
</Button>
</CardHeader>

<CardContent className="flex-1 overflow-hidden">
  {upcomingItems.length === 0 ? (
    <div className="text-slate-400">No upcoming deadlines or events.</div>
  ) : (
    <ScrollArea className="h-full pr-3">
      <div className="space-y-3">
        {upcomingItems.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => navigate(item.link)}
            className="w-full text-left p-4 rounded-lg border border-slate-800 bg-slate-950/40 hover:border-indigo-500/30 transition"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-white font-medium truncate">{item.title}</div>
                <div className="text-sm text-slate-400">
                  {format(parseISO(item.date), "MMM d, yyyy")}
                </div>
              </div>

              <div className="shrink-0">
                <Badge
                  className={
                    item.type === "task"
                      ? "bg-emerald-500/20 text-emerald-300"
                      : item.type === "event"
                      ? "bg-indigo-500/20 text-indigo-300"
                      : "bg-amber-500/20 text-amber-300"
                  }
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

<Card className="bg-slate-900/50 border-slate-800 flex flex-col overflow-hidden">
  <CardHeader className="shrink-0 pb-4">
    <CardTitle className="text-white">Project Progress</CardTitle>
  </CardHeader>

  <CardContent className="flex-1 overflow-hidden">
    {activeProjectsForProgress.length === 0 ? (
      <div className="text-slate-400">No active projects available.</div>
    ) : (
      <ScrollArea className="h-full pr-3">
        <div className="space-y-4">
          {activeProjectsForProgress.map((project) => (
            <div key={project.id} className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <button
                  className="text-white hover:text-indigo-300 truncate"
                  onClick={() => navigate(`/projects/${project.id}`)}
                >
                  {project.name}
                </button>
                <span className="text-sm text-slate-400">
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

<div className="grid gap-5 content-start" style={{ gridTemplateRows: "520px 520px" }}>
  {isBootstrapping ? (
    <>
      <PanelSkeleton
        title="Activity Feed"
        icon={<Activity className="w-5 h-5 text-indigo-400" />}
      />
      <PanelSkeleton title="Task Completion" />
    </>
  ) : (
    <>
      <Card className="bg-slate-900/50 border-slate-800 flex flex-col overflow-hidden">
        <CardHeader className="shrink-0 pb-4">
          <CardTitle className="text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-400" />
            Activity Feed
          </CardTitle>
        </CardHeader>

        <CardContent className="flex-1 overflow-hidden">
          {visibleActivity.length === 0 ? (
            <div className="text-slate-400">No recent activity yet.</div>
          ) : (
            <ScrollArea className="h-full pr-3">
              <div className="space-y-3">
                {visibleActivity.map((log) => (
                  <div
                    key={log.id}
                    className="p-3 rounded-lg border border-slate-800 bg-slate-950/40"
                  >
                    <div className="text-white text-sm">{log.message}</div>
                    <div className="text-xs text-slate-500 mt-1">
                      {format(parseISO(log.created_at), "MMM d, yyyy h:mm a")}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      <Card className="bg-slate-900/50 border-slate-800 flex flex-col overflow-hidden">
        <CardHeader className="shrink-0 pb-3">
          <CardTitle className="text-white">Task Completion</CardTitle>
        </CardHeader>

        <CardContent className="flex flex-col flex-1 overflow-hidden">
          <div className="shrink-0 space-y-3 pb-3">
            <div className="text-white text-lg font-semibold">
              {completedTasks} / {totalRelevantTasks} completed
            </div>

            <Progress
              value={
                totalRelevantTasks === 0
                  ? 0
                  : Math.round((completedTasks / totalRelevantTasks) * 100)
              }
            />

            <div className="text-sm text-slate-400">
              {totalRelevantTasks === 0
                ? "No relevant tasks yet."
                : `${Math.round((completedTasks / totalRelevantTasks) * 100)}% of tasks are complete`}
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
                      className="w-full text-left p-3 rounded-lg border border-slate-800 bg-slate-950/40 hover:border-indigo-500/30 transition"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-white truncate">{task.title}</div>
                          {task.due_date && (
                            <div className="text-xs text-slate-400">
                              Due {format(parseISO(task.due_date), "MMM d, yyyy")}
                            </div>
                          )}
                        </div>

                        <Badge className="bg-emerald-500/20 text-emerald-300 shrink-0">
                          {(task.status || "task").replaceAll("_", " ")}
                        </Badge>
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="text-slate-400">No active tasks to display.</div>
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
