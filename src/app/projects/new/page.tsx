import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
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
} from "lucide-react";
import { format, isBefore, addDays, parseISO } from "date-fns";

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

export default function DashboardPage() {
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserName, setCurrentUserName] = useState<string>("");
  const [currentUserRole, setCurrentUserRole] = useState<Role | null>(null);

  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [projectMembers, setProjectMembers] = useState<ProjectMemberRow[]>([]);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);

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
          { data: projectsData, error: projectsError },
          { data: projectMembersData, error: membersError },
          { data: tasksData, error: tasksError },
          { data: profilesData, error: profilesError },
        ] = await Promise.all([
          supabase
            .from("profiles")
            .select("full_name, role")
            .eq("user_id", user.id)
            .single(),
          supabase
            .from("projects")
            .select("id, name, description, status, progress, created_by, created_at")
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
            .order("created_at", { ascending: false }),
        ]);

        if (myProfileError) {
          console.error("Load current profile error:", myProfileError);
        } else {
          setCurrentUserName(myProfile?.full_name || "User");
          setCurrentUserRole((myProfile?.role as Role) || null);
        }

        if (projectsError) {
          console.error("Load projects error:", projectsError);
          setProjects([]);
        } else {
          setProjects((projectsData || []) as ProjectRow[]);
        }

        if (membersError) {
          console.error("Load project members error:", membersError);
          setProjectMembers([]);
        } else {
          setProjectMembers((projectMembersData || []) as ProjectMemberRow[]);
        }

        if (tasksError) {
          console.error("Load tasks error:", tasksError);
          setTasks([]);
        } else {
          setTasks((tasksData || []) as TaskRow[]);
        }

        if (profilesError) {
          console.error("Load profiles error:", profilesError);
          setProfiles([]);
        } else {
          setProfiles((profilesData || []) as ProfileRow[]);
        }
      } catch (error) {
        console.error("Dashboard load error:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboard();
  }, [navigate]);

  const activeProfiles = useMemo(
    () => profiles.filter((p) => p.status === "active"),
    [profiles]
  );

  const pendingProfiles = useMemo(
    () => profiles.filter((p) => p.status === "pending"),
    [profiles]
  );

  const visibleProjects = useMemo(() => {
    if (!currentUserId || !currentUserRole) return [];

    if (currentUserRole === "admin") {
      return projects;
    }

    const memberProjectIds = new Set(
      projectMembers
        .filter((member) => member.user_id === currentUserId)
        .map((member) => member.project_id)
    );

    return projects.filter((project) => {
      const isCreator = project.created_by === currentUserId;
      const isAssignedMember = memberProjectIds.has(project.id);
      return isCreator || isAssignedMember;
    });
  }, [projects, projectMembers, currentUserId, currentUserRole]);

  const visibleProjectIds = useMemo(
    () => new Set(visibleProjects.map((project) => project.id)),
    [visibleProjects]
  );

  const visibleTasks = useMemo(() => {
    if (!currentUserId || !currentUserRole) return [];

    if (currentUserRole === "admin") {
      return tasks;
    }

    return tasks.filter((task) => {
      const isCreator = task.created_by === currentUserId;
      const isAssignee = task.assignee_id === currentUserId;
      const isInsideVisibleProject =
        !!task.project_id && visibleProjectIds.has(task.project_id);

      return isCreator || isAssignee || isInsideVisibleProject;
    });
  }, [tasks, currentUserId, currentUserRole, visibleProjectIds]);

  const activeProjects = useMemo(
    () =>
      visibleProjects.filter(
        (p) => p.status && !["done", "completed", "cancelled"].includes(p.status.toLowerCase())
      ),
    [visibleProjects]
  );

  const activeTasks = useMemo(
    () =>
      visibleTasks.filter(
        (t) => t.status && !["done", "completed"].includes(t.status.toLowerCase())
      ),
    [visibleTasks]
  );

  const completedTasks = useMemo(
    () =>
      visibleTasks.filter(
        (t) => t.status && ["done", "completed"].includes(t.status.toLowerCase())
      ),
    [visibleTasks]
  );

  const recentProjects = useMemo(() => visibleProjects.slice(0, 5), [visibleProjects]);

  const myTasks = useMemo(() => {
    if (!currentUserId) return [];
    return visibleTasks.filter((t) => t.assignee_id === currentUserId);
  }, [visibleTasks, currentUserId]);

  const upcomingDeadlines = useMemo(() => {
    const today = new Date();
    const nextWeek = addDays(today, 7);

    return myTasks
      .filter((t) => t.status && !["done", "completed"].includes(t.status.toLowerCase()))
      .filter((t) => t.due_date)
      .filter((t) => {
        const dueDate = parseISO(t.due_date as string);
        return isBefore(dueDate, nextWeek) || dueDate.getTime() === nextWeek.getTime();
      })
      .sort(
        (a, b) =>
          parseISO(a.due_date as string).getTime() - parseISO(b.due_date as string).getTime()
      )
      .slice(0, 5);
  }, [myTasks]);

  const completionRate =
    visibleTasks.length > 0
      ? Math.round((completedTasks.length / visibleTasks.length) * 100)
      : 0;

  const getPriorityColor = (priority: string | null) => {
    switch ((priority || "").toUpperCase()) {
      case "URGENT":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      case "HIGH":
        return "bg-orange-500/20 text-orange-400 border-orange-500/30";
      case "MEDIUM":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      default:
        return "bg-slate-500/20 text-slate-400 border-slate-500/30";
    }
  };

  const getStatusColor = (status: string | null) => {
    switch ((status || "").toUpperCase()) {
      case "DONE":
      case "COMPLETED":
        return "bg-green-500/20 text-green-400";
      case "IN_PROGRESS":
        return "bg-blue-500/20 text-blue-400";
      case "IN_REVIEW":
        return "bg-purple-500/20 text-purple-400";
      default:
        return "bg-slate-500/20 text-slate-400";
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-slate-400">Welcome back, {currentUserName}</p>
        </div>

        <div className="flex items-center gap-2">
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
            onClick={() => navigate("/tasks/new")}
          >
            <Plus className="w-4 h-4 mr-2" />
            New Task
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Total Projects</p>
                <p className="text-2xl font-bold text-white">{visibleProjects.length}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                <FolderKanban className="w-6 h-6 text-indigo-400" />
              </div>
            </div>
            <div className="flex items-center gap-1 mt-4 text-sm">
              <TrendingUp className="w-4 h-4 text-green-400" />
              <span className="text-green-400">{activeProjects.length}</span>
              <span className="text-slate-500">active</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Active Tasks</p>
                <p className="text-2xl font-bold text-white">{activeTasks.length}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <CheckSquare className="w-6 h-6 text-blue-400" />
              </div>
            </div>
            <div className="flex items-center gap-1 mt-4 text-sm">
              <TrendingUp className="w-4 h-4 text-green-400" />
              <span className="text-green-400">{completedTasks.length}</span>
              <span className="text-slate-500">completed</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Team Members</p>
                <p className="text-2xl font-bold text-white">{activeProfiles.length}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <Users className="w-6 h-6 text-purple-400" />
              </div>
            </div>
            <div className="flex items-center gap-1 mt-4 text-sm">
              {pendingProfiles.length > 0 ? (
                <>
                  <AlertCircle className="w-4 h-4 text-amber-400" />
                  <span className="text-amber-400">{pendingProfiles.length}</span>
                  <span className="text-slate-500">pending</span>
                </>
              ) : (
                <span className="text-slate-500">No pending approvals</span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Completion Rate</p>
                <p className="text-2xl font-bold text-white">{completionRate}%</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-400" />
              </div>
            </div>
            <div className="mt-4">
              <Progress value={completionRate} className="h-2 bg-slate-800" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="bg-slate-900/50 border-slate-800 lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-white">Recent Projects</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              className="text-indigo-400 hover:text-indigo-300"
              onClick={() => navigate("/projects")}
            >
              View All
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentProjects.length === 0 ? (
                <p className="text-slate-500 text-center py-8">No projects yet</p>
              ) : (
                recentProjects.map((project) => (
                  <div
                    key={project.id}
                    className="flex items-center gap-4 p-4 rounded-lg bg-slate-950/50 border border-slate-800 hover:border-indigo-500/30 cursor-pointer transition-all"
                    onClick={() => navigate(`/projects/${project.id}`)}
                  >
                    <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center flex-shrink-0">
                      <FolderKanban className="w-5 h-5 text-indigo-400" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <h4 className="text-white font-medium truncate">{project.name}</h4>
                      <p className="text-slate-500 text-sm truncate">
                        {project.description || "No description"}
                      </p>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="hidden sm:block">
                        <Progress
                          value={project.progress || 0}
                          className="w-24 h-2 bg-slate-800"
                        />
                      </div>
                      <Badge className={getStatusColor(project.status)}>
                        {project.status || "UNKNOWN"}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white">Upcoming Deadlines</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {upcomingDeadlines.length === 0 ? (
                <p className="text-slate-500 text-center py-8">No upcoming deadlines</p>
              ) : (
                upcomingDeadlines.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-slate-950/50 border border-slate-800 hover:border-indigo-500/30 cursor-pointer transition-all"
                    onClick={() => navigate(`/tasks/${task.id}`)}
                  >
                    <div
                      className={`w-2 h-2 rounded-full ${
                        task.due_date && isBefore(parseISO(task.due_date), new Date())
                          ? "bg-red-500"
                          : "bg-amber-500"
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm truncate">{task.title}</p>
                      <p className="text-slate-500 text-xs">
                        Due {task.due_date ? format(parseISO(task.due_date), "MMM d") : "-"}
                      </p>
                    </div>
                    <Badge className={getPriorityColor(task.priority)}>
                      {task.priority || "NORMAL"}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-white">My Tasks</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              className="text-indigo-400 hover:text-indigo-300"
              onClick={() => navigate("/tasks")}
            >
              View All
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {myTasks.slice(0, 5).map((task) => (
                <div
                  key={task.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-slate-950/50 border border-slate-800"
                  onClick={() => navigate(`/tasks/${task.id}`)}
                >
                  <CheckSquare
                    className={`w-5 h-5 ${
                      task.status &&
                      ["done", "completed"].includes(task.status.toLowerCase())
                        ? "text-green-400"
                        : "text-slate-500"
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm truncate ${
                        task.status &&
                        ["done", "completed"].includes(task.status.toLowerCase())
                          ? "text-slate-500 line-through"
                          : "text-white"
                      }`}
                    >
                      {task.title}
                    </p>
                  </div>
                  <Badge className={getPriorityColor(task.priority)}>
                    {task.priority || "NORMAL"}
                  </Badge>
                </div>
              ))}
              {myTasks.length === 0 && (
                <p className="text-slate-500 text-center py-8">No tasks assigned to you</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white">Activity Feed</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              <div className="space-y-4">
                <p className="text-slate-500 text-center py-8">
                  Activity feed will be connected later
                </p>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
