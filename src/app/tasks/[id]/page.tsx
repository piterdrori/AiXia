import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { logActivity } from "@/lib/activity";
import { createNotification } from "@/lib/notifications";
import {
  uploadProjectOrTaskFile,
  getSignedFileUrl,
  deleteUploadedFile,
} from "@/lib/file-upload";
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
  Upload,
  FileText,
  Download,
  MessageSquare,
  Clock3,
  Save,
  X,
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

type FileUploadRow = {
  id: string;
  project_id: string | null;
  task_id: string | null;
  user_id: string | null;
  file_name: string;
  file_path: string;
  file_size: number | null;
  mime_type: string | null;
  entity_type: "project" | "task";
  created_at: string;
};

export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const taskFileInputRef = useRef<HTMLInputElement | null>(null);

  const [task, setTask] = useState<TaskRow | null>(null);
  const [project, setProject] = useState<ProjectRow | null>(null);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [taskMembers, setTaskMembers] = useState<TaskMemberRow[]>([]);
  const [comments, setComments] = useState<TaskCommentRow[]>([]);
  const [files, setFiles] = useState<FileUploadRow[]>([]);

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<Role | null>(null);

  const [newComment, setNewComment] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState("");
  const [statusSaving, setStatusSaving] = useState(false);
  const [commentSaving, setCommentSaving] = useState(false);
  const [commentActionLoading, setCommentActionLoading] = useState<string | null>(null);
  const [deleteSaving, setDeleteSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

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
          { data: filesData },
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
          supabase
            .from("file_uploads")
            .select(
              "id, project_id, task_id, user_id, file_name, file_path, file_size, mime_type, entity_type, created_at"
            )
            .eq("task_id", id)
            .eq("entity_type", "task")
            .order("created_at", { ascending: false }),
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
        setFiles((filesData || []) as FileUploadRow[]);
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

  const canDeleteThisFile = (file: FileUploadRow) => {
    if (!currentUserId) return false;

    return (
      currentUserRole === "admin" ||
      task?.created_by === currentUserId ||
      file.user_id === currentUserId
    );
  };

  const canManageComment = (comment: TaskCommentRow) => {
    if (!currentUserId) return false;
    return currentUserRole === "admin" || comment.user_id === currentUserId;
  };

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

  const getProfileRole = (userId: string | null) => {
    if (!userId) return "";
    return profiles.find((profile) => profile.user_id === userId)?.role || "";
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

  const getInitials = (fullName: string | null) => {
    if (!fullName) return "U";
    return fullName
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
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

    const commentText = newComment.trim();

    const { data, error: commentError } = await supabase
      .from("task_comments")
      .insert({
        task_id: task.id,
        user_id: currentUserId,
        content: commentText,
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

    const recipientIds = Array.from(
      new Set([
        ...(task.created_by ? [task.created_by] : []),
        ...taskMembers.map((member) => member.user_id),
      ])
    ).filter((userId) => userId !== currentUserId);

    for (const userId of recipientIds) {
      await createNotification({
        userId,
        actorUserId: currentUserId,
        type: "COMMENT",
        title: "New Task Comment",
        message: `New comment on task "${task.title}"`,
        link: `/tasks/${task.id}`,
        entityType: "task_comment",
        entityId: data.id,
      });
    }

    setComments((prev) => [...prev, data as TaskCommentRow]);
    setNewComment("");
    setCommentSaving(false);
  };

  const startEditingComment = (comment: TaskCommentRow) => {
    setEditingCommentId(comment.id);
    setEditingCommentText(comment.content);
  };

  const cancelEditingComment = () => {
    setEditingCommentId(null);
    setEditingCommentText("");
  };

  const handleSaveEditedComment = async (comment: TaskCommentRow) => {
    if (!editingCommentText.trim()) {
      setError("Comment cannot be empty.");
      return;
    }

    setCommentActionLoading(comment.id);
    setError("");

    const { error: updateError } = await supabase
      .from("task_comments")
      .update({
        content: editingCommentText.trim(),
      })
      .eq("id", comment.id);

    if (updateError) {
      setError(updateError.message || "Failed to update comment.");
      setCommentActionLoading(null);
      return;
    }

    await logActivity({
      projectId: task?.project_id,
      taskId: task?.id,
      actionType: "task_comment_edited",
      entityType: "comment",
      entityId: comment.id,
      message: `Edited a comment in task "${task?.title || ""}"`,
    });

    setComments((prev) =>
      prev.map((item) =>
        item.id === comment.id
          ? {
              ...item,
              content: editingCommentText.trim(),
            }
          : item
      )
    );

    setEditingCommentId(null);
    setEditingCommentText("");
    setCommentActionLoading(null);
  };

  const handleDeleteComment = async (comment: TaskCommentRow) => {
    const confirmed = window.confirm("Are you sure you want to delete this comment?");
    if (!confirmed) return;

    setCommentActionLoading(comment.id);
    setError("");

    const { error: deleteError } = await supabase
      .from("task_comments")
      .delete()
      .eq("id", comment.id);

    if (deleteError) {
      setError(deleteError.message || "Failed to delete comment.");
      setCommentActionLoading(null);
      return;
    }

    await logActivity({
      projectId: task?.project_id,
      taskId: task?.id,
      actionType: "task_comment_deleted",
      entityType: "comment",
      entityId: comment.id,
      message: `Deleted a comment in task "${task?.title || ""}"`,
    });

    setComments((prev) => prev.filter((item) => item.id !== comment.id));

    if (editingCommentId === comment.id) {
      setEditingCommentId(null);
      setEditingCommentText("");
    }

    setCommentActionLoading(null);
  };

  const handleTaskFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (!task || !project || !e.target.files || e.target.files.length === 0) return;

    const file = e.target.files[0];
    setError("");
    setIsUploading(true);

    try {
      const uploaded = (await uploadProjectOrTaskFile({
        file,
        entityType: "task",
        projectId: project.id,
        taskId: task.id,
      })) as FileUploadRow;

      setFiles((prev) => [uploaded, ...prev]);
    } catch (err: any) {
      console.error("Task file upload error:", err);
      setError(err?.message || "Failed to upload file.");
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  const handleDownloadFile = async (filePath: string) => {
    try {
      const signedUrl = await getSignedFileUrl(filePath);
      window.open(signedUrl, "_blank");
    } catch (err: any) {
      console.error("Download file error:", err);
      setError(err?.message || "Failed to open file.");
    }
  };

  const handleDeleteFile = async (fileId: string, filePath: string, fileName: string) => {
    if (!task) return;

    const confirmed = window.confirm("Are you sure you want to delete this file?");
    if (!confirmed) return;

    try {
      await deleteUploadedFile(fileId, filePath, {
        projectId: task.project_id,
        taskId: task.id,
        fileName,
      });
      setFiles((prev) => prev.filter((file) => file.id !== fileId));
    } catch (err: any) {
      console.error("Delete task file error:", err);
      setError(err?.message || "Failed to delete file.");
    }
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
              <div className="flex items-center justify-between gap-4">
                <CardTitle className="text-white">Task Files</CardTitle>

                <>
                  <input
                    ref={taskFileInputRef}
                    type="file"
                    className="hidden"
                    onChange={handleTaskFileUpload}
                    disabled={isUploading}
                  />

                  <Button
                    type="button"
                    className="bg-indigo-600 hover:bg-indigo-700 text-white"
                    disabled={isUploading}
                    onClick={() => taskFileInputRef.current?.click()}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {isUploading ? "Uploading..." : "Upload File"}
                  </Button>
                </>
              </div>
            </CardHeader>
            <CardContent>
              {files.length === 0 ? (
                <p className="text-slate-500">No task files uploaded yet.</p>
              ) : (
                <div className="space-y-3">
                  {files.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center justify-between gap-4 rounded-lg border border-slate-800 bg-slate-950/50 p-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <FileText className="w-5 h-5 text-indigo-400" />
                        <div className="min-w-0">
                          <p className="text-white text-sm truncate">{file.file_name}</p>
                          <p className="text-slate-500 text-xs">
                            {getProfileName(file.user_id)} •{" "}
                            {format(new Date(file.created_at), "MMM d, yyyy h:mm a")}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          className="border-slate-700 text-slate-300 hover:bg-slate-800"
                          onClick={() => handleDownloadFile(file.file_path)}
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Open
                        </Button>

                        {canDeleteThisFile(file) && (
                          <Button
                            variant="outline"
                            className="border-red-800 text-red-400 hover:bg-red-900/20"
                            onClick={() =>
                              handleDeleteFile(file.id, file.file_path, file.file_name)
                            }
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader>
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-indigo-400" />
                <CardTitle className="text-white">Task Discussion</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                <div className="mb-2">
                  <p className="text-sm font-medium text-white">Add Update</p>
                  <p className="text-xs text-slate-500">
                    Share progress, blockers, approvals, or notes with the team
                  </p>
                </div>

                <Textarea
                  placeholder="Write an update, status note, blocker, or team comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  rows={4}
                  className="bg-slate-900 border-slate-800 text-white placeholder:text-slate-600 resize-none"
                />

                <div className="mt-3 flex items-center justify-between gap-3">
                  <p className="text-xs text-slate-500">
                    This update will be visible to people who can access this task.
                  </p>

                  <Button
                    type="button"
                    onClick={handleAddComment}
                    disabled={commentSaving || !newComment.trim()}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    {commentSaving ? "Posting..." : "Post Update"}
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                {comments.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-800 bg-slate-950/40 p-8 text-center">
                    <MessageSquare className="mx-auto mb-3 h-10 w-10 text-slate-600" />
                    <p className="text-white font-medium">No discussion yet</p>
                    <p className="mt-1 text-sm text-slate-500">
                      Start the thread with the first progress update or note.
                    </p>
                  </div>
                ) : (
                  comments.map((comment) => {
                    const isMine = comment.user_id === currentUserId;
                    const authorName = getProfileName(comment.user_id);
                    const authorRole = getProfileRole(comment.user_id);
                    const isEditing = editingCommentId === comment.id;

                    return (
                      <div
                        key={comment.id}
                        className={`rounded-xl border p-4 ${
                          isMine
                            ? "border-indigo-800/40 bg-indigo-950/20"
                            : "border-slate-800 bg-slate-950/50"
                        }`}
                      >
                        <div className="mb-3 flex items-start justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-600 text-xs font-medium text-white">
                              {getInitials(authorName)}
                            </div>

                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-sm font-medium text-white">{authorName}</p>

                                {authorRole && (
                                  <Badge className="bg-slate-800 text-slate-300 text-[10px] px-2 py-0.5">
                                    {authorRole.toUpperCase()}
                                  </Badge>
                                )}

                                {isMine && (
                                  <Badge className="bg-indigo-500/20 text-indigo-300 text-[10px] px-2 py-0.5">
                                    YOU
                                  </Badge>
                                )}
                              </div>

                              <div className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                                <Clock3 className="h-3 w-3" />
                                <span>
                                  {format(new Date(comment.created_at), "MMM d, yyyy • h:mm a")}
                                </span>
                              </div>
                            </div>
                          </div>

                          {canManageComment(comment) && (
                            <div className="flex items-center gap-2">
                              {!isEditing && (
                                <>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="border-slate-700 text-slate-300 hover:bg-slate-800"
                                    onClick={() => startEditingComment(comment)}
                                    disabled={commentActionLoading === comment.id}
                                  >
                                    <Edit className="w-3 h-3 mr-1" />
                                    Edit
                                  </Button>

                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="border-red-800 text-red-400 hover:bg-red-900/20"
                                    onClick={() => handleDeleteComment(comment)}
                                    disabled={commentActionLoading === comment.id}
                                  >
                                    <Trash2 className="w-3 h-3 mr-1" />
                                    Delete
                                  </Button>
                                </>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="pl-12">
                          {isEditing ? (
                            <div className="space-y-3">
                              <Textarea
                                value={editingCommentText}
                                onChange={(e) => setEditingCommentText(e.target.value)}
                                rows={4}
                                className="bg-slate-900 border-slate-800 text-white resize-none"
                              />

                              <div className="flex items-center gap-2">
                                <Button
                                  type="button"
                                  size="sm"
                                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                                  onClick={() => handleSaveEditedComment(comment)}
                                  disabled={
                                    commentActionLoading === comment.id ||
                                    !editingCommentText.trim()
                                  }
                                >
                                  <Save className="w-3 h-3 mr-1" />
                                  Save
                                </Button>

                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  className="border-slate-700 text-slate-300 hover:bg-slate-800"
                                  onClick={cancelEditingComment}
                                  disabled={commentActionLoading === comment.id}
                                >
                                  <X className="w-3 h-3 mr-1" />
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <p className="whitespace-pre-wrap text-sm leading-6 text-slate-200">
                              {comment.content}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })
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
