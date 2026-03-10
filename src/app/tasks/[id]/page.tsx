import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { logActivity } from "@/lib/activity";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Edit,
  Trash2,
  Send,
  Calendar,
  FolderKanban,
  Flag,
  CheckSquare,
} from "lucide-react";
import { format } from "date-fns";

type Role = "admin" | "manager" | "employee" | "guest";

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
  description: string | null;
  status: string | null;
  progress: number | null;
  created_by: string | null;
};

type ProfileRow = {
  user_id: string;
  full_name: string | null;
  role: Role;
  status: "active" | "pending" | "inactive" | "denied";
};

type TaskMemberRow = {
  id: string;
  task_id: string;
  user_id: string;
  role: string;
  created_at: string;
};

type ProjectMemberRow = {
  id: string;
  project_id: string;
  user_id: string;
  role: string;
  created_at: string;
};

type TaskCommentRow = {
  id: string;
  task_id: string;
  user_id: string;
  content: string;
  created_at: string;
};

export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [task, setTask] = useState<TaskRow | null>(null);
  const [project, setProject] = useState<ProjectRow | null>(null);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [taskMembers, setTaskMembers] = useState<TaskMemberRow[]>([]);
  const [comments, setComments] = useState<TaskCommentRow[]>([]);

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<Role | null>(null);

  const [newComment, setNewComment] = useState("");
  const [statusSaving, setStatusSaving] = useState(false);
  const [commentSaving, setCommentSaving] = useState(false);
  const [deleteSaving, setDeleteSaving] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadTaskPage = async () => {
      if (!id) {
        navigate("/tasks");
        return;
      }

      setIsLoading(true);
      setError("");

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          navigate("/login");
          return;
        }

        setCurrentUserId(user.id);

        const { data: myProfile, error: myProfileError } = await supabase
          .from("profiles")
          .select("role")
          .eq("user_id", user.id)
          .single();

        if (myProfileError || !myProfile) {
          navigate("/tasks");
          return;
        }

        const role = myProfile.role as Role;
        setCurrentUserRole(role);

        const { data: taskData, error: taskError } = await supabase
          .from("tasks")
          .select("*")
          .eq("id", id)
          .single();

        if (taskError || !taskData) {
          navigate("/tasks");
          return;
        }

        const loadedTask = taskData as TaskRow;

        const [
          { data: projectData },
          { data: profilesData },
          { data: taskMembersData },
          { data: projectMembersData },
          { data: commentsData },
        ] = await Promise.all([
          loadedTask.project_id
            ? supabase.from("projects").select("*").eq("id", loadedTask.project_id).single()
            : Promise.resolve({ data: null }),
          supabase
            .from("profiles")
            .select("user_id, full_name, role, status")
            .order("full_name", { ascending: true }),
          supabase
            .from("task_members")
            .select("id, task_id, user_id, role, created_at")
            .eq("task_id", id),
          loadedTask.project_id
            ? supabase
                .from("project_members")
                .select("id, project_id, user_id, role, created_at")
                .eq("project_id", loadedTask.project_id)
            : Promise.resolve({ data: [] }),
          supabase
            .from("task_comments")
            .select("id, task_id, user_id, content, created_at")
            .eq("task_id", id)
            .order("created_at", { ascending: true }),
        ]);

        const loadedTaskMembers = (taskMembersData || []) as TaskMemberRow[];
        const loadedProjectMembers = (projectMembersData || []) as ProjectMemberRow[];

        const isAdmin = role === "admin";
        const isTaskCreator = loadedTask.created_by === user.id;
        const isProjectCreator = (projectData as ProjectRow | null)?.created_by === user.id;
        const isTaskAssigned = loadedTaskMembers.some((member) => member.user_id === user.id);
        const isProjectAssigned = loadedProjectMembers.some((member) => member.user_id === user.id);

        const canSee =
          isAdmin || isTaskCreator || isProjectCreator || isTaskAssigned || isProjectAssigned;

        if (!canSee) {
          navigate("/tasks");
          return;
        }

        setTask(loadedTask);
        setProject((projectData || null) as ProjectRow | null);
        setProfiles((profilesData || []) as ProfileRow[]);
        setTaskMembers(loadedTaskMembers);
        setComments((commentsData || []) as TaskCommentRow[]);
      } catch (err) {
        console.error("Load task detail error:", err);
        setError("Failed to load task.");
      } finally {
        setIsLoading(false);
      }
    };

    loadTaskPage();
  }, [id, navigate]);

  const canEditTask = useMemo(() => {
    if (!task || !currentUserId) return false;
    return currentUserRole === "admin" || task.created_by === currentUserId;
  }, [task, currentUserId, currentUserRole]);

  const canDeleteTask = canEditTask;

  const canUpdateStatus = useMemo(() => {
    if (!task || !currentUserId) return false;
    const isAssigned = taskMembers.some((member) => member.user_id === currentUserId);
    return currentUserRole === "admin" || task.created_by === currentUserId || isAssigned;
  }, [task, currentUserId, currentUserRole, taskMembers]);

  const progressValue = useMemo(() => {
    const value = (task?.status || "").toUpperCase();
    if (value === "DONE") return 100;
    if (value === "IN_REVIEW") return 75;
    if (value === "IN_PROGRESS") return 50;
    return 0;
  }, [task]);

  const getProfileName = (userId: string | null) => {
    if (!userId) return "Unknown";
    return profiles.find((profile) => profile.user_id === userId)?.full_name || "Unknown";
  };

  const getStatusColor = (status: string | null) => {
    switch ((status || "").toUpperCase()) {
      case "DONE":
        return "bg-green-500/20 text-green-400 border-green-500/30";
      case "IN_PROGRESS":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "IN_REVIEW":
        return "bg-purple-500/20 text-purple-400 border-purple-500/30";
      default:
        return "bg-slate-500/20 text-slate-400 border-slate-500/30";
    }
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

  const handleStatusUpdate = async (newStatus: string) => {
    if (!task || !canUpdateStatus) return;

    setStatusSaving(true);
    setError("");

    try {
      const { error: updateError } = await supabase
        .from("tasks")
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", task.id);

      if (updateError) {
        setError(updateError.message || "Failed to update task status.");
        setStatusSaving(false);
        return;
      }

      await logActivity({
        projectId: task.project_id,
        taskId: task.id,
        actionType: "task_status_changed",
        entityType: "task",
        entityId: task.id,
        message: `Changed task "${task.title}" status to ${newStatus}`,
      });

      setTask((prev) =>
        prev
          ? {
              ...prev,
              status: newStatus,
            }
          : prev
      );
    } catch (err) {
      console.error("Status update error:", err);
      setError("Failed to update task status.");
    } finally {
      setStatusSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!task || !canDeleteTask) return;

    const confirmed = window.confirm("Are you sure you want to delete this task?");
    if (!confirmed) return;

    setDeleteSaving(true);
    setError("");

    const { error: deleteError } = await supabase.from("tasks").delete().eq("id", task.id);

    if (deleteError) {
      setError(deleteError.message || "Failed to delete task.");
      setDeleteSaving(false);
      return;
    }

    navigate("/tasks");
  };

  const handleAddComment = async () => {
    if (!task || !currentUserId || !newComment.trim()) return;

    setCommentSaving(true);
    setError("");

    const { data, error: commentError } = await supabase
      .from("task_comments")
      .insert({
        task_id: task.id,
        user_id: currentUserId,
        content: newComment.trim(),
      })
      .select("id, task_id, user_id, content, created_at")
      .single();

    if (commentError) {
      setError(commentError.message || "Failed to add comment.");
      setCommentSaving(false);
      return;
    }

    await logActivity({
      projectId: task.project_id,
      taskId: task.id,
      actionType: "task_comment_added",
      entityType: "comment",
      entityId: task.id,
      message: `Added an update to task "${task.title}"`,
    });

    setComments((prev) => [...prev, data as TaskCommentRow]);
    setNewComment("");
    setCommentSaving(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (!task) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/tasks")}
          className="text-slate-400 hover:text-white"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>

        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white">{task.title}</h1>
          <p className="text-slate-400">
            {project ? `Project: ${project.name}` : "Task details"}
          </p>
        </div>

        {canEditTask && (
          <Button
            variant="outline"
            onClick={() => navigate(`/tasks/${task.id}/edit`)}
            className="border-slate-700 text-slate-300 hover:bg-slate-800"
          >
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </Button>
        )}

        {canDeleteTask && (
          <Button
            variant="outline"
            onClick={handleDelete}
            disabled={deleteSaving}
            className="border-red-800 text-red-400 hover:bg-red-900/20"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </Button>
        )}
      </div>

      {error && (
        <Alert className="bg-red-900/20 border-red-800 text-red-300">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white">Task Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex flex-wrap gap-2">
                <Badge className={getStatusColor(task.status)}>{task.status || "TODO"}</Badge>
                <Badge className={getPriorityColor(task.priority)}>{task.priority || "LOW"}</Badge>
              </div>

              <div>
                <p className="text-slate-300 whitespace-pre-wrap">
                  {task.description || "No description"}
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-400 text-sm">Progress</span>
                  <span className="text-white text-sm">{progressValue}%</span>
                </div>
                <Progress value={progressValue} className="h-2 bg-slate-800" />
              </div>

              {canUpdateStatus && (
                <div className="space-y-2">
                  <div className="text-slate-300 text-sm font-medium">Update Status</div>
                  <Select
                    value={(task.status || "TODO").toUpperCase()}
                    onValueChange={handleStatusUpdate}
                    disabled={statusSaving}
                  >
                    <SelectTrigger className="w-56 bg-slate-900 border-slate-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TODO">To Do</SelectItem>
                      <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                      <SelectItem value="IN_REVIEW">In Review</SelectItem>
                      <SelectItem value="DONE">Done</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white">Task Updates</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3">
                <Textarea
                  placeholder="Write an update or comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  rows={3}
                  className="bg-slate-950 border-slate-800 text-white placeholder:text-slate-600 resize-none"
                />
                <Button
                  type="button"
                  onClick={handleAddComment}
                  disabled={commentSaving || !newComment.trim()}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white self-end"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>

              <div className="space-y-3">
                {comments.length === 0 ? (
                  <p className="text-slate-500">No updates yet.</p>
                ) : (
                  comments.map((comment) => (
                    <div
                      key={comment.id}
                      className="rounded-lg border border-slate-800 bg-slate-950/50 p-3"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-white font-medium">
                          {getProfileName(comment.user_id)}
                        </span>
                        <span className="text-slate-500 text-xs">
                          {format(new Date(comment.created_at), "MMM d, yyyy h:mm a")}
                        </span>
                      </div>
                      <p className="text-slate-300 whitespace-pre-wrap">{comment.content}</p>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <InfoRow
                icon={<FolderKanban className="w-4 h-4 text-indigo-400" />}
                label="Project"
                value={project?.name || "No project"}
              />
              <InfoRow
                icon={<Flag className="w-4 h-4 text-amber-400" />}
                label="Priority"
                value={task.priority || "LOW"}
              />
              <InfoRow
                icon={<CheckSquare className="w-4 h-4 text-blue-400" />}
                label="Status"
                value={task.status || "TODO"}
              />
              <InfoRow
                icon={<Calendar className="w-4 h-4 text-green-400" />}
                label="Due Date"
                value={
                  task.due_date
                    ? format(new Date(task.due_date), "MMM d, yyyy")
                    : "No due date"
                }
              />
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white">Assigned Members</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {taskMembers.length === 0 ? (
                <p className="text-slate-500">No assigned members.</p>
              ) : (
                taskMembers.map((member) => (
                  <div key={member.id} className="flex items-center justify-between">
                    <span className="text-white">{getProfileName(member.user_id)}</span>
                    <Badge className="bg-slate-800 text-slate-300">{member.role}</Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div>{icon}</div>
      <div>
        <p className="text-slate-500 text-xs">{label}</p>
        <p className="text-white text-sm">{value}</p>
      </div>
    </div>
  );
}
