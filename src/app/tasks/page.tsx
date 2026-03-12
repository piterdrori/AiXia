import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { createRequestTracker } from "@/lib/safeAsync";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  CheckSquare,
  Plus,
  Search,
  Grid3X3,
  List,
  MoreVertical,
  Edit,
  Trash2,
  Calendar,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";

type Role = "admin" | "manager" | "employee" | "guest";
type TaskStatus = "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";

type TaskRow = {
  id: string;
  title: string;
  description: string | null;
  status: string | null;
  priority: string | null;
  due_date: string | null;
  project_id: string | null;
  assignee_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

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

const columns: { id: TaskStatus; label: string; color: string }[] = [
  { id: "TODO", label: "To Do", color: "bg-slate-500" },
  { id: "IN_PROGRESS", label: "In Progress", color: "bg-blue-500" },
  { id: "IN_REVIEW", label: "In Review", color: "bg-purple-500" },
  { id: "DONE", label: "Done", color: "bg-green-500" },
];

export default function TasksPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestTracker = useRef(createRequestTracker());

  const initialProjectId = searchParams.get("projectId") || "ALL";

  const [viewMode, setViewMode] = useState<"board" | "list">("board");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [priorityFilter, setPriorityFilter] = useState<string>("ALL");
  const [projectFilter, setProjectFilter] = useState<string>(initialProjectId);

  const [isLoading, setIsLoading] = useState(true);
  const [draggedTask, setDraggedTask] = useState<string | null>(null);
  const [error, setError] = useState("");

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<Role | null>(null);

  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [taskMembers, setTaskMembers] = useState<TaskMemberRow[]>([]);

  useEffect(() => {
    let mounted = true;

    const loadTasksPage = async () => {
      const requestId = requestTracker.current.next();
      setIsLoading(true);
      setError("");

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!mounted || !requestTracker.current.isLatest(requestId)) return;

        if (!user) {
          navigate("/login");
          return;
        }

        setCurrentUserId(user.id);

        const [
          { data: myProfile, error: myProfileError },
          { data: allTasks, error: tasksError },
          { data: allProjects, error: projectsError },
          { data: allProfiles, error: profilesError },
          { data: allProjectMembers, error: projectMembersError },
          { data: allTaskMembers, error: taskMembersError },
        ] = await Promise.all([
          supabase.from("profiles").select("role").eq("user_id", user.id).single(),
          supabase.from("tasks").select("*").order("created_at", { ascending: false }),
          supabase
            .from("projects")
            .select("id, name, created_by")
            .order("created_at", { ascending: false }),
          supabase
            .from("profiles")
            .select("user_id, full_name, role, status")
            .eq("status", "active")
            .order("full_name", { ascending: true }),
          supabase
            .from("project_members")
            .select("id, project_id, user_id, role, created_at"),
          supabase
            .from("task_members")
            .select("id, task_id, user_id, role, created_at"),
        ]);

        if (!mounted || !requestTracker.current.isLatest(requestId)) return;

        if (myProfileError || !myProfile) {
          navigate("/login");
          return;
        }

        const role = myProfile.role as Role;
        setCurrentUserRole(role);

        if (tasksError) throw tasksError;
        if (projectsError) throw projectsError;
        if (profilesError) throw profilesError;
        if (projectMembersError) throw projectMembersError;
        if (taskMembersError) throw taskMembersError;

        const tasksData = (allTasks || []) as TaskRow[];
        const projectsData = (allProjects || []) as ProjectRow[];
        const profilesData = (allProfiles || []) as ProfileRow[];
        const projectMembersData = (allProjectMembers || []) as ProjectMemberRow[];
        const taskMembersData = (allTaskMembers || []) as TaskMemberRow[];

        const visibleProjects =
          role === "admin"
            ? projectsData
            : projectsData.filter((project) => {
                const isCreator = project.created_by === user.id;
                const isAssignedProjectMember = projectMembersData.some(
                  (member) =>
                    member.project_id === project.id && member.user_id === user.id
                );
                return isCreator || isAssignedProjectMember;
              });

        const visibleProjectIds = new Set(visibleProjects.map((project) => project.id));

        const visibleTasks =
          role === "admin"
            ? tasksData
            : tasksData.filter((task) => {
                const isTaskCreator = task.created_by === user.id;
                const isMainAssignee = task.assignee_id === user.id;
                const isTaskMember = taskMembersData.some(
                  (member) => member.task_id === task.id && member.user_id === user.id
                );
                const isInsideVisibleProject =
                  !!task.project_id && visibleProjectIds.has(task.project_id);

                return isTaskCreator || isMainAssignee || isTaskMember || isInsideVisibleProject;
              });

        setTasks(visibleTasks);
        setProjects(visibleProjects);
        setProfiles(profilesData);
        setTaskMembers(taskMembersData);

        if (
          initialProjectId !== "ALL" &&
          !visibleProjects.some((project) => project.id === initialProjectId)
        ) {
          setProjectFilter("ALL");
        }
      } catch (err) {
        if (!mounted || !requestTracker.current.isLatest(requestId)) return;
        console.error("Load tasks page error:", err);
        setError("Failed to load tasks.");
      } finally {
        if (!mounted || !requestTracker.current.isLatest(requestId)) return;
        setIsLoading(false);
      }
    };

    void loadTasksPage();

    return () => {
      mounted = false;
    };
  }, [navigate, initialProjectId]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const title = (task.title || "").toLowerCase();
      const description = (task.description || "").toLowerCase();
      const query = searchQuery.toLowerCase();

      const matchesSearch = title.includes(query) || description.includes(query);
      const matchesStatus =
        statusFilter === "ALL" || (task.status || "").toUpperCase() === statusFilter;
      const matchesPriority =
        priorityFilter === "ALL" || (task.priority || "").toUpperCase() === priorityFilter;
      const matchesProject = projectFilter === "ALL" || task.project_id === projectFilter;

      return matchesSearch && matchesStatus && matchesPriority && matchesProject;
    });
  }, [tasks, searchQuery, statusFilter, priorityFilter, projectFilter]);

  const getProjectName = (projectId: string | null) => {
    if (!projectId) return "No project";
    return projects.find((project) => project.id === projectId)?.name || "Unknown project";
  };

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

  const getTaskMemberProfiles = (taskId: string) => {
    const memberUserIds = taskMembers
      .filter((member) => member.task_id === taskId)
      .map((member) => member.user_id);

    return profiles.filter((profile) => memberUserIds.includes(profile.user_id));
  };

  const canEditTask = (task: TaskRow) => {
    if (!currentUserId || !currentUserRole) return false;
    return currentUserRole === "admin" || task.created_by === currentUserId;
  };

  const canDeleteTask = (task: TaskRow) => {
    if (!currentUserId || !currentUserRole) return false;
    return currentUserRole === "admin" || task.created_by === currentUserId;
  };

  const canCreateTasks =
    currentUserRole === "admin" ||
    currentUserRole === "manager" ||
    currentUserRole === "employee" ||
    currentUserRole === "guest";

  const handleDragStart = (taskId: string) => {
    setDraggedTask(taskId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, nextStatus: TaskStatus) => {
    e.preventDefault();

    if (!draggedTask) return;

    const task = tasks.find((item) => item.id === draggedTask);
    if (!task) {
      setDraggedTask(null);
      return;
    }

    const canMove =
      currentUserRole === "admin" ||
      task.created_by === currentUserId ||
      taskMembers.some(
        (member) => member.task_id === draggedTask && member.user_id === currentUserId
      ) ||
      task.assignee_id === currentUserId;

    if (!canMove) {
      setDraggedTask(null);
      return;
    }

    setError("");

    const { error: updateError } = await supabase
      .from("tasks")
      .update({
        status: nextStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", draggedTask);

    if (updateError) {
      console.error("Move task error:", updateError);
      setError(updateError.message || "Failed to update task status.");
      setDraggedTask(null);
      return;
    }

    setTasks((prev) =>
      prev.map((item) =>
        item.id === draggedTask ? { ...item, status: nextStatus } : item
      )
    );

    setDraggedTask(null);
  };

  const handleDelete = async (taskId: string) => {
    const confirmed = window.confirm("Are you sure you want to delete this task?");
    if (!confirmed) return;

    setError("");

    const { error: deleteError } = await supabase.from("tasks").delete().eq("id", taskId);

    if (deleteError) {
      console.error("Delete task error:", deleteError);
      setError(deleteError.message || "Failed to delete task.");
      return;
    }

    setTasks((prev) => prev.filter((task) => task.id !== taskId));
    setTaskMembers((prev) => prev.filter((member) => member.task_id !== taskId));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Tasks</h1>
          <p className="text-slate-400">Manage and organize your tasks</p>
        </div>

        {canCreateTasks && (
          <Button
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
            onClick={() =>
              navigate(
                `/tasks/new${projectFilter !== "ALL" ? `?projectId=${projectFilter}` : ""}`
              )
            }
          >
            <Plus className="w-4 h-4 mr-2" />
            New Task
          </Button>
        )}
      </div>

      {error && (
        <Alert className="bg-red-900/20 border-red-800 text-red-300">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col lg:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <Input
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-slate-900 border-slate-800 text-white placeholder:text-slate-600"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36 bg-slate-900 border-slate-800 text-white">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-800">
              <SelectItem value="ALL">All Status</SelectItem>
              <SelectItem value="TODO">To Do</SelectItem>
              <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
              <SelectItem value="IN_REVIEW">In Review</SelectItem>
              <SelectItem value="DONE">Done</SelectItem>
            </SelectContent>
          </Select>

          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-36 bg-slate-900 border-slate-800 text-white">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-800">
              <SelectItem value="ALL">All Priorities</SelectItem>
              <SelectItem value="URGENT">Urgent</SelectItem>
              <SelectItem value="HIGH">High</SelectItem>
              <SelectItem value="MEDIUM">Medium</SelectItem>
              <SelectItem value="LOW">Low</SelectItem>
            </SelectContent>
          </Select>

          <Select value={projectFilter} onValueChange={setProjectFilter}>
            <SelectTrigger className="w-44 bg-slate-900 border-slate-800 text-white">
              <SelectValue placeholder="Project" />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-800">
              <SelectItem value="ALL">All Projects</SelectItem>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <ToggleGroup
            type="single"
            value={viewMode}
            onValueChange={(value) => value && setViewMode(value as "board" | "list")}
          >
            <ToggleGroupItem value="board" className="data-[state=on]:bg-slate-800">
              <Grid3X3 className="w-4 h-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="list" className="data-[state=on]:bg-slate-800">
              <List className="w-4 h-4" />
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>

      {viewMode === "board" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {columns.map((column) => {
            const columnTasks = filteredTasks.filter(
              (task) => (task.status || "").toUpperCase() === column.id
            );

            return (
              <div
                key={column.id}
                className="bg-slate-900/30 rounded-lg border border-slate-800"
                onDragOver={handleDragOver}
                onDrop={(e) => void handleDrop(e, column.id)}
              >
                <div className="p-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${column.color}`} />
                    <h3 className="font-medium text-white">{column.label}</h3>
                    <Badge className="bg-slate-800 text-slate-400">{columnTasks.length}</Badge>
                  </div>
                </div>

                <div className="p-3 space-y-3 min-h-[220px]">
                  {columnTasks.map((task) => {
                    const assigneeProfiles = getTaskMemberProfiles(task.id);

                    return (
                      <Card
                        key={task.id}
                        draggable
                        onDragStart={() => handleDragStart(task.id)}
                        className="bg-slate-900 border-slate-800 hover:border-indigo-500/30 cursor-pointer transition-all group"
                        onClick={() => navigate(`/tasks/${task.id}`)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <Badge className={getPriorityColor(task.priority)}>
                              {task.priority || "LOW"}
                            </Badge>

                            {(canEditTask(task) || canDeleteTask(task)) && (
                              <DropdownMenu>
                                <DropdownMenuTrigger
                                  asChild
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 opacity-0 group-hover:opacity-100"
                                  >
                                    <MoreVertical className="w-3 h-3 text-slate-400" />
                                  </Button>
                                </DropdownMenuTrigger>

                                <DropdownMenuContent
                                  align="end"
                                  className="bg-slate-900 border-slate-800"
                                >
                                  {canEditTask(task) && (
                                    <DropdownMenuItem
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        navigate(`/tasks/${task.id}/edit`);
                                      }}
                                    >
                                      <Edit className="w-4 h-4 mr-2" />
                                      Edit
                                    </DropdownMenuItem>
                                  )}

                                  {canDeleteTask(task) && (
                                    <DropdownMenuItem
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        void handleDelete(task.id);
                                      }}
                                      className="text-red-400"
                                    >
                                      <Trash2 className="w-4 h-4 mr-2" />
                                      Delete
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </div>

                          <h4 className="text-white font-medium mb-2">{task.title}</h4>

                          <p className="text-slate-500 text-sm mb-3 line-clamp-2">
                            {task.description || "No description"}
                          </p>

                          <div className="text-xs text-slate-500 mb-3">
                            {getProjectName(task.project_id)}
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="flex -space-x-2">
                              {assigneeProfiles.slice(0, 3).map((profile) => (
                                <Avatar
                                  key={profile.user_id}
                                  className="w-6 h-6 border-2 border-slate-900"
                                >
                                  <AvatarFallback className="bg-indigo-600 text-white text-[10px]">
                                    {(profile.full_name || "U")
                                      .split(" ")
                                      .map((n) => n[0])
                                      .join("")
                                      .toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                              ))}

                              {assigneeProfiles.length > 3 && (
                                <div className="w-6 h-6 rounded-full bg-slate-800 border-2 border-slate-900 flex items-center justify-center text-[10px] text-slate-400">
                                  +{assigneeProfiles.length - 3}
                                </div>
                              )}
                            </div>

                            {task.due_date && (
                              <span className="text-xs text-slate-500 flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {format(new Date(task.due_date), "MMM d")}
                              </span>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-0">
            <div className="divide-y divide-slate-800">
              {filteredTasks.map((task) => {
                const assigneeProfiles = getTaskMemberProfiles(task.id);

                return (
                  <div
                    key={task.id}
                    onClick={() => navigate(`/tasks/${task.id}`)}
                    className="flex items-center gap-4 p-4 hover:bg-slate-800/50 cursor-pointer transition-colors"
                  >
                    <CheckSquare
                      className={`w-5 h-5 ${
                        (task.status || "").toUpperCase() === "DONE"
                          ? "text-green-400"
                          : "text-slate-500"
                      }`}
                    />

                    <div className="flex-1 min-w-0">
                      <h4
                        className={`font-medium truncate ${
                          (task.status || "").toUpperCase() === "DONE"
                            ? "text-slate-500 line-through"
                            : "text-white"
                        }`}
                      >
                        {task.title}
                      </h4>
                      <p className="text-slate-500 text-sm truncate">
                        {task.description || "No description"}
                      </p>
                    </div>

                    <div className="hidden sm:flex items-center gap-4">
                      <Badge className={getPriorityColor(task.priority)}>
                        {task.priority || "LOW"}
                      </Badge>

                      <span className="text-sm text-slate-500">
                        {getProjectName(task.project_id)}
                      </span>

                      <div className="flex -space-x-2">
                        {assigneeProfiles.slice(0, 3).map((profile) => (
                          <Avatar
                            key={profile.user_id}
                            className="w-7 h-7 border-2 border-slate-900"
                          >
                            <AvatarFallback className="bg-indigo-600 text-white text-xs">
                              {(profile.full_name || "U")
                                .split(" ")
                                .map((n) => n[0])
                                .join("")
                                .toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        ))}
                      </div>

                      {task.due_date && (
                        <span className="text-sm text-slate-500">
                          {format(new Date(task.due_date), "MMM d")}
                        </span>
                      )}
                    </div>

                    {(canEditTask(task) || canDeleteTask(task)) && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="w-4 h-4 text-slate-400" />
                          </Button>
                        </DropdownMenuTrigger>

                        <DropdownMenuContent
                          align="end"
                          className="bg-slate-900 border-slate-800"
                        >
                          {canEditTask(task) && (
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/tasks/${task.id}/edit`);
                              }}
                            >
                              <Edit className="w-4 h-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                          )}

                          {canDeleteTask(task) && (
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                void handleDelete(task.id);
                              }}
                              className="text-red-400"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
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

      {filteredTasks.length === 0 && (
        <div className="text-center py-12">
          <CheckSquare className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No tasks found</h3>
          <p className="text-slate-500 mb-4">
            {searchQuery ||
            statusFilter !== "ALL" ||
            priorityFilter !== "ALL" ||
            projectFilter !== "ALL"
              ? "Try adjusting your filters"
              : "No visible tasks for your account yet"}
          </p>

          {!searchQuery &&
            statusFilter === "ALL" &&
            priorityFilter === "ALL" &&
            projectFilter === "ALL" &&
            canCreateTasks && (
              <Button
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
                onClick={() => navigate("/tasks/new")}
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Task
              </Button>
            )}
        </div>
      )}
    </div>
  );
}
