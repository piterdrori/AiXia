import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { addDays, format, isBefore, parseISO } from "date-fns";
import { supabase } from "@/lib/supabase";

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

export default function DashboardPage() {
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserName, setCurrentUserName] = useState("");
  const [currentUserRole, setCurrentUserRole] = useState<Role | null>(null);

  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [projectMembers, setProjectMembers] = useState<ProjectMemberRow[]>([]);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEventRow[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLogRow[]>([]);

  useEffect(() => {
    const loadDashboard = async () => {
      setIsLoading(true);

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          navigate("/login");
          return;
        }

        setCurrentUserId(user.id);

        const [
          { data: myProfile, error: myProfileError },
          { data: projectsData },
          { data: projectMembersData },
          { data: tasksData },
          { data: profilesData },
          { data: eventsData },
          { data: logsData },
        ] = await Promise.all([
          supabase.from("profiles").select("full_name, role").eq("user_id", user.id).single(),
          supabase
            .from("projects")
            .select("id, name, description, status, progress, created_by, end_date, created_at")
            .order("created_at", { ascending: false }),
          supabase
            .from("project_members")
            .select("id, project_id, user_id, role, created_at"),
          supabase
            .from("tasks")
            .select("id, title, status, priority, due_date, assignee_id, project_id, created_by, created_at")
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
            .select("id, project_id, task_id, user_id, action_type, entity_type, entity_id, message, created_at")
            .order("created_at", { ascending: false })
            .limit(20),
        ]);

        if (myProfileError || !myProfile) {
          navigate("/login");
          return;
        }

        setCurrentUserName(myProfile.full_name || "User");
        setCurrentUserRole((myProfile.role as Role) || null);
        setProjects((projectsData || []) as ProjectRow[]);
        setProjectMembers((projectMembersData || []) as ProjectMemberRow[]);
        setTasks((tasksData || []) as TaskRow[]);
        setProfiles((profilesData || []) as ProfileRow[]);
        setCalendarEvents((eventsData || []) as CalendarEventRow[]);
        setActivityLogs((logsData || []) as ActivityLogRow[]);
      } catch (error) {
        console.error("Dashboard load error:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboard();
  }, [navigate]);

  const visibleProjectIds = useMemo(() => {
    if (!currentUserId) return new Set<string>();
    if (currentUserRole === "admin") return new Set(projects.map((p) => p.id));

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
  }, [currentUserId, currentUserRole, projectMembers, projects]);

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

  const totalTasks = visibleTasks.length;
  const completedTasks = visibleTasks.filter((t) => t.status === "DONE").length;
  const totalProjects = visibleProjects.length;
  const averageProgress =
    totalProjects > 0
      ? Math.round(
          visibleProjects.reduce((sum, project) => sum + (project.progress || 0), 0) /
            totalProjects
        )
      : 0;

  const upcomingItems = useMemo<UpcomingItem[]>(() => {
    const today = new Date();
    const next30Days = addDays(today, 30);

    const items: UpcomingItem[] = [];

    for (const task of visibleTasks) {
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

    for (const project of visibleProjects) {
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
      .slice(0, 8);
  }, [visibleEvents, visibleProjects, visibleTasks]);

  const visibleActivity = useMemo(() => {
    if (currentUserRole === "admin") return activityLogs;

    return activityLogs.filter((log) => {
      if (log.project_id && visibleProjectIds.has(log.project_id)) return true;
      if (log.user_id && log.user_id === currentUserId) return true;
      if (log.task_id && visibleTasks.some((task) => task.id === log.task_id)) return true;
      return false;
    });
  }, [activityLogs, currentUserId, currentUserRole, visibleProjectIds, visibleTasks]);

  const userCount = profiles.length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Welcome, {currentUserName}</h1>
          <p className="text-slate-400">Here is a live overview of your projects, tasks, and events</p>
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
        </div>
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/15 flex items-center justify-center">
              <FolderKanban className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{totalProjects}</div>
              <div className="text-sm text-slate-400">Visible Projects</div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/15 flex items-center justify-center">
              <CheckSquare className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{totalTasks}</div>
              <div className="text-sm text-slate-400">Visible Tasks</div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/15 flex items-center justify-center">
              <Users className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{userCount}</div>
              <div className="text-sm text-slate-400">Active Members</div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-500/15 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-blue-400" />
            </div>
            <div className="w-full">
              <div className="text-2xl font-bold text-white">{averageProgress}%</div>
              <div className="text-sm text-slate-400 mb-2">Average Project Progress</div>
              <Progress value={averageProgress} />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid xl:grid-cols-[1.2fr,1fr] gap-6">
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between">
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
          <CardContent>
            {upcomingItems.length === 0 ? (
              <div className="text-slate-400">No upcoming deadlines or events.</div>
            ) : (
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
            )}
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-indigo-400" />
              Activity Feed
            </CardTitle>
          </CardHeader>
          <CardContent>
            {visibleActivity.length === 0 ? (
              <div className="text-slate-400">No recent activity yet.</div>
            ) : (
              <ScrollArea className="h-[360px] pr-3">
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
      </div>

      <div className="grid xl:grid-cols-2 gap-6">
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white">Project Progress</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {visibleProjects.slice(0, 6).map((project) => (
              <div key={project.id} className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <button
                    className="text-white hover:text-indigo-300 truncate"
                    onClick={() => navigate(`/projects/${project.id}`)}
                  >
                    {project.name}
                  </button>
                  <span className="text-sm text-slate-400">{project.progress || 0}%</span>
                </div>
                <Progress value={project.progress || 0} />
              </div>
            ))}
            {visibleProjects.length === 0 && (
              <div className="text-slate-400">No projects available.</div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white">Task Completion</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-white text-lg font-semibold">
              {completedTasks} / {totalTasks} completed
            </div>
            <Progress value={totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100)} />
            <div className="text-sm text-slate-400">
              {totalTasks === 0
                ? "No visible tasks yet."
                : `${Math.round((completedTasks / totalTasks) * 100)}% of tasks are complete`}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
