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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ArrowLeft,
  Edit,
  Trash2,
  Plus,
  CheckSquare,
  Calendar,
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

type ProfileRow = {
  user_id: string;
  full_name: string | null;
  role: Role;
  status: "active" | "pending" | "inactive" | "denied";
};

type ProjectRow = {
  id: string;
  name: string;
  description: string | null;
  status: string | null;
  progress: number | null;
  created_by: string | null;
  start_date: string | null;
  end_date: string | null;
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
  description: string | null;
  status: string | null;
  priority: string | null;
  due_date: string | null;
  project_id: string | null;
  assignee_id: string | null;
  created_by: string | null;
  created_at: string;
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

type ProjectCommentRow = {
  id: string;
  project_id: string;
  user_id: string;
  content: string;
  created_at: string;
};

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const projectFileInputRef = useRef<HTMLInputElement | null>(null);

  const [activeTab, setActiveTab] = useState("overview");
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<Role | null>(null);

  const [project, setProject] = useState<ProjectRow | null>(null);
  const [projectMembers, setProjectMembers] = useState<ProjectMemberRow[]>([]);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLogRow[]>([]);
  const [files, setFiles] = useState<FileUploadRow[]>([]);
  const [comments, setComments] = useState<ProjectCommentRow[]>([]);

  const [newComment, setNewComment] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState("");
  const [commentSaving, setCommentSaving] = useState(false);
  const [commentActionLoading, setCommentActionLoading] = useState<string | null>(null);

  useEffect(() => {
    const loadProjectPage = async () => {
      if (!id) {
        navigate("/projects");
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

        const [
          { data: myProfile, error: myProfileError },
          { data: projectData, error: projectError },
          { data: membersData },
          { data: profilesData },
          { data: tasksData },
          { data: logsData },
          { data: filesData },
          { data: commentsData },
        ] = await Promise.all([
          supabase
            .from("profiles")
            .select("role")
            .eq("user_id", user.id)
            .single(),
          supabase
            .from("projects")
            .select(
              "id, name, description, status, progress, created_by, start_date, end_date, created_at"
            )
            .eq("id", id)
            .single(),
          supabase
            .from("project_members")
            .select("id, project_id, user_id, role, created_at")
            .eq("project_id", id),
          supabase
            .from("profiles")
            .select("user_id, full_name, role, status")
            .eq("status", "active"),
          supabase
            .from("tasks")
            .select(
              "id, title, description, status, priority, due_date, project_id, assignee_id, created_by, created_at"
            )
            .eq("project_id", id)
            .order("created_at", { ascending: false }),
          supabase
            .from("activity_logs")
            .select(
              "id, project_id, task_id, user_id, action_type, entity_type, entity_id, message, created_at"
            )
            .eq("project_id", id)
            .order("created_at", { ascending: false })
            .limit(50),
          supabase
            .from("file_uploads")
            .select(
              "id, project_id, task_id, user_id, file_name, file_path, file_size, mime_type, entity_type, created_at"
            )
            .eq("project_id", id)
            .is("task_id", null)
            .eq("entity_type", "project")
            .order("created_at", { ascending: false }),
          supabase
            .from("project_comments")
            .select("id, project_id, user_id, content, created_at")
            .eq("project_id", id)
            .order("created_at", { ascending: true }),
        ]);

        if (myProfileError || !myProfile) {
          navigate("/projects");
          return;
        }

        const role = myProfile.role as Role;
        setCurrentUserRole(role);

        if (projectError || !projectData) {
          setError("Project not found.");
          setIsLoading(false);
          return;
        }

        const loadedProject = projectData as ProjectRow;
        const loadedMembers = (membersData || []) as ProjectMemberRow[];
        const loadedProfiles = (profilesData || []) as ProfileRow[];
        const loadedTasks = (tasksData || []) as TaskRow[];
        const loadedLogs = (logsData || []) as ActivityLogRow[];
        const loadedFiles = (filesData || []) as FileUploadRow[];
        const loadedComments = (commentsData || []) as ProjectCommentRow[];

        const isAdmin = role === "admin";
        const isCreator = loadedProject.created_by === user.id;
        const isAssignedMember = loadedMembers.some((member) => member.user_id === user.id);

        if (!isAdmin && !isCreator && !isAssignedMember) {
          navigate("/projects");
          return;
        }

        setProject(loadedProject);
        setProjectMembers(loadedMembers);
        setProfiles(loadedProfiles);
        setTasks(loadedTasks);
        setActivityLogs(loadedLogs);
        setFiles(loadedFiles);
        setComments(loadedComments);
      } catch (err) {
        console.error("Load project page error:", err);
        setError("Something went wrong while loading the project.");
      } finally {
        setIsLoading(false);
      }
    };

    loadProjectPage();
  }, [id, navigate]);

  const canEdit = useMemo(() => {
    if (!project || !currentUserId || !currentUserRole) return false;
    return currentUserRole === "admin" || project.created_by === currentUserId;
  }, [project, currentUserId, currentUserRole]);

  const canDelete = useMemo(() => {
    if (!project || !currentUserId || !currentUserRole) return false;
    return currentUserRole === "admin" || project.created_by === currentUserId;
  }, [project, currentUserId, currentUserRole]);

  const canDeleteThisProjectFile = (file: FileUploadRow) => {
    if (!currentUserId) return false;

    return (
      currentUserRole === "admin" ||
      project?.created_by === currentUserId ||
      file.user_id === currentUserId
    );
  };

  const canManageComment = (comment: ProjectCommentRow) => {
    if (!currentUserId) return false;
    return currentUserRole === "admin" || comment.user_id === currentUserId;
  };

  const getStatusColor = (status: string | null) => {
    switch ((status || "").toUpperCase()) {
      case "ACTIVE":
        return "bg-green-500/20 text-green-400 border-green-500/30";
      case "PLANNING":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "ON_HOLD":
        return "bg-amber-500/20 text-amber-400 border-amber-500/30";
      case "COMPLETED":
        return "bg-purple-500/20 text-purple-400 border-purple-500/30";
      case "CANCELLED":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      default:
        return "bg-slate-500/20 text-slate-400 border-slate-500/30";
    }
  };

  const getTaskStatusColor = (status: string | null) => {
    switch ((status || "").toUpperCase()) {
      case "DONE":
        return "bg-green-500/20 text-green-400";
      case "IN_PROGRESS":
        return "bg-blue-500/20 text-blue-400";
      case "IN_REVIEW":
        return "bg-purple-500/20 text-purple-400";
      default:
        return "bg-slate-500/20 text-slate-400";
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

  const getProfileByUserId = (userId: string) => {
    return profiles.find((profile) => profile.user_id === userId);
  };

  const getProfileName = (userId: string | null) => {
    if (!userId) return "Unknown";
    return profiles.find((profile) => profile.user_id === userId)?.full_name || "Unknown";
  };

  const getProfileRole = (userId: string | null) => {
    if (!userId) return "";
    return profiles.find((profile) => profile.user_id === userId)?.role || "";
  };

const handleDelete = async () => {
    if (!project) return;

    const confirmed = window.confirm("Are you sure you want to delete this project?");
    if (!confirmed) return;

    setIsDeleting(true);

    try {
      const { error: deleteMembersError } = await supabase
        .from("project_members")
        .delete()
        .eq("project_id", project.id);

      if (deleteMembersError) {
        console.error("Delete project members error:", deleteMembersError);
      }

      const { error: deleteTasksError } = await supabase
        .from("tasks")
        .delete()
        .eq("project_id", project.id);

      if (deleteTasksError) {
        console.error("Delete tasks error:", deleteTasksError);
      }

      const { error: deleteProjectError } = await supabase
        .from("projects")
        .delete()
        .eq("id", project.id);

      if (deleteProjectError) {
        setError(deleteProjectError.message || "Failed to delete project.");
        setIsDeleting(false);
        return;
      }

      navigate("/projects");
    } catch (err) {
      console.error("Delete project error:", err);
      setError("Something went wrong while deleting the project.");
      setIsDeleting(false);
    }
  };

  const handleProjectFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (!project || !e.target.files || e.target.files.length === 0) return;

    const file = e.target.files[0];
    setError("");
    setIsUploading(true);

    try {
      const uploaded = (await uploadProjectOrTaskFile({
        file,
        entityType: "project",
        projectId: project.id,
      })) as FileUploadRow;

      setFiles((prev) => [uploaded, ...prev]);

      const { data: newLogs } = await supabase
        .from("activity_logs")
        .select(
          "id, project_id, task_id, user_id, action_type, entity_type, entity_id, message, created_at"
        )
        .eq("project_id", project.id)
        .order("created_at", { ascending: false })
        .limit(50);

      setActivityLogs((newLogs || []) as ActivityLogRow[]);
    } catch (err: any) {
      console.error("Project file upload error:", err);
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

  const handleDeleteFile = async (
    fileId: string,
    filePath: string,
    fileName: string
  ) => {
    const confirmed = window.confirm("Are you sure you want to delete this file?");
    if (!confirmed) return;

    try {
      await deleteUploadedFile(fileId, filePath, {
        projectId: project?.id || null,
        taskId: null,
        fileName,
      });

      setFiles((prev) => prev.filter((file) => file.id !== fileId));

      if (project) {
        const { data: newLogs } = await supabase
          .from("activity_logs")
          .select(
            "id, project_id, task_id, user_id, action_type, entity_type, entity_id, message, created_at"
          )
          .eq("project_id", project.id)
          .order("created_at", { ascending: false })
          .limit(50);

        setActivityLogs((newLogs || []) as ActivityLogRow[]);
      }
    } catch (err: any) {
      console.error("Delete file error:", err);
      setError(err?.message || "Failed to delete file.");
    }
  };

  const handleAddComment = async () => {
    if (!project || !currentUserId || !newComment.trim()) return;

    setCommentSaving(true);
    setError("");

    const commentText = newComment.trim();

    const { data, error: commentError } = await supabase
      .from("project_comments")
      .insert({
        project_id: project.id,
        user_id: currentUserId,
        content: commentText,
      })
      .select("id, project_id, user_id, content, created_at")
      .single();

    if (commentError) {
      setError(commentError.message || "Failed to add comment.");
      setCommentSaving(false);
      return;
    }

    await logActivity({
      projectId: project.id,
      taskId: null,
      actionType: "project_comment_added",
      entityType: "comment",
      entityId: data.id,
      message: `Added an update to project "${project.name}"`,
    });

    const recipientIds = Array.from(
      new Set([
        ...(project.created_by ? [project.created_by] : []),
        ...projectMembers.map((member) => member.user_id),
      ])
    ).filter((userId) => userId !== currentUserId);

    for (const userId of recipientIds) {
      await createNotification({
        userId,
        actorUserId: currentUserId,
        type: "COMMENT",
        title: "New Project Comment",
        message: `New comment on project "${project.name}"`,
        link: `/projects/${project.id}`,
        entityType: "project_comment",
        entityId: data.id,
      });
    }

    setComments((prev) => [...prev, data as ProjectCommentRow]);
    setNewComment("");
    setCommentSaving(false);
  };

  const startEditingComment = (comment: ProjectCommentRow) => {
    setEditingCommentId(comment.id);
    setEditingCommentText(comment.content);
  };

  const cancelEditingComment = () => {
    setEditingCommentId(null);
    setEditingCommentText("");
  };

  const handleSaveEditedComment = async (comment: ProjectCommentRow) => {
    if (!editingCommentText.trim()) {
      setError("Comment cannot be empty.");
      return;
    }

    setCommentActionLoading(comment.id);
    setError("");

    const { error: updateError } = await supabase
      .from("project_comments")
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
      projectId: project?.id,
      taskId: null,
      actionType: "project_comment_edited",
      entityType: "comment",
      entityId: comment.id,
      message: `Edited a comment in project "${project?.name || ""}"`,
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

  const handleDeleteComment = async (comment: ProjectCommentRow) => {
    const confirmed = window.confirm("Are you sure you want to delete this comment?");
    if (!confirmed) return;

    setCommentActionLoading(comment.id);
    setError("");

    const { error: deleteError } = await supabase
      .from("project_comments")
      .delete()
      .eq("id", comment.id);

    if (deleteError) {
      setError(deleteError.message || "Failed to delete comment.");
      setCommentActionLoading(null);
      return;
    }

    await logActivity({
      projectId: project?.id,
      taskId: null,
      actionType: "project_comment_deleted",
      entityType: "comment",
      entityId: comment.id,
      message: `Deleted a comment in project "${project?.name || ""}"`,
    });

    setComments((prev) => prev.filter((item) => item.id !== comment.id));

    if (editingCommentId === comment.id) {
      setEditingCommentId(null);
      setEditingCommentText("");
    }

    setCommentActionLoading(null);
  };

  const taskStats = {
    total: tasks.length,
    todo: tasks.filter((t) => (t.status || "").toUpperCase() === "TODO").length,
    inProgress: tasks.filter((t) => (t.status || "").toUpperCase() === "IN_PROGRESS").length,
    inReview: tasks.filter((t) => (t.status || "").toUpperCase() === "IN_REVIEW").length,
    done: tasks.filter((t) => (t.status || "").toUpperCase() === "DONE").length,
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="space-y-4">
        {error && (
          <Alert className="bg-red-900/20 border-red-800 text-red-300">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <div className="text-center text-slate-400">Project not found.</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert className="bg-red-900/20 border-red-800 text-red-300">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/projects")}
            className="text-slate-400 hover:text-white"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>

          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-white">{project.name}</h1>
              <Badge className={getStatusColor(project.status)}>
                {project.status || "UNKNOWN"}
              </Badge>
            </div>
            <p className="text-slate-400">{project.description || "No description"}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {canEdit && (
            <Button
              variant="outline"
              className="border-slate-700 text-slate-300 hover:bg-slate-800"
              onClick={() => navigate(`/projects/${project.id}/edit`)}
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Button>
          )}

          {canDelete && (
            <Button
              variant="outline"
              className="border-red-800 text-red-400 hover:bg-red-900/20"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          )}
        </div>
      </div>

      <Card className="bg-slate-900/50 border-slate-800">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-slate-400">Project Progress</span>
            <span className="text-white font-medium">{project.progress || 0}%</span>
          </div>

          <Progress value={project.progress || 0} className="h-3 bg-slate-800" />

          <div className="grid grid-cols-5 gap-4 mt-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-white">{taskStats.total}</p>
              <p className="text-xs text-slate-500">Total</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-slate-400">{taskStats.todo}</p>
              <p className="text-xs text-slate-500">To Do</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-400">{taskStats.inProgress}</p>
              <p className="text-xs text-slate-500">In Progress</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-400">{taskStats.inReview}</p>
              <p className="text-xs text-slate-500">In Review</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-400">{taskStats.done}</p>
              <p className="text-xs text-slate-500">Done</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-slate-900 border border-slate-800">
          <TabsTrigger value="overview" className="data-[state=active]:bg-slate-800">
            Overview
          </TabsTrigger>
          <TabsTrigger value="tasks" className="data-[state=active]:bg-slate-800">
            Tasks
          </TabsTrigger>
          <TabsTrigger value="team" className="data-[state=active]:bg-slate-800">
            Team
          </TabsTrigger>
          <TabsTrigger value="files" className="data-[state=active]:bg-slate-800">
            Files
          </TabsTrigger>
          <TabsTrigger value="discussion" className="data-[state=active]:bg-slate-800">
            Discussion
          </TabsTrigger>
          <TabsTrigger value="activity" className="data-[state=active]:bg-slate-800">
            Activity
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="bg-slate-900/50 border-slate-800">
              <CardHeader>
                <CardTitle className="text-white text-lg">Project Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-slate-400">Status</span>
                  <Badge className={getStatusColor(project.status)}>
                    {project.status || "UNKNOWN"}
                  </Badge>
                </div>

                <div className="flex justify-between">
                  <span className="text-slate-400">Start Date</span>
                  <span className="text-white">
                    {project.start_date
                      ? format(new Date(project.start_date), "MMM d, yyyy")
                      : "Not set"}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-slate-400">End Date</span>
                  <span className="text-white">
                    {project.end_date
                      ? format(new Date(project.end_date), "MMM d, yyyy")
                      : "Not set"}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-slate-400">Created</span>
                  <span className="text-white">
                    {format(new Date(project.created_at), "MMM d, yyyy")}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-slate-400">Assigned Members</span>
                  <span className="text-white">{projectMembers.length}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900/50 border-slate-800">
              <CardHeader>
                <CardTitle className="text-white text-lg">Team Members</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {projectMembers.length === 0 ? (
                    <p className="text-slate-500">No team members assigned</p>
                  ) : (
                    projectMembers.map((member) => {
                      const profile = getProfileByUserId(member.user_id);

                      return (
                        <div key={member.id} className="flex items-center gap-3">
                          <Avatar className="w-8 h-8">
                            <AvatarFallback className="bg-indigo-600 text-white text-xs">
                              {getInitials(profile?.full_name || null)}
                            </AvatarFallback>
                          </Avatar>

                          <div className="flex-1">
                            <p className="text-white text-sm">
                              {profile?.full_name || "Unnamed user"}
                            </p>
                            <p className="text-slate-500 text-xs">{member.role}</p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="tasks" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-white">Project Tasks</h3>

            <Button
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
              onClick={() => navigate(`/tasks/new?projectId=${project.id}`)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Task
            </Button>
          </div>

          <div className="space-y-3">
            {tasks.map((task) => {
              const assignee = task.assignee_id ? getProfileByUserId(task.assignee_id) : null;

              return (
                <Card
                  key={task.id}
                  className="bg-slate-900/50 border-slate-800 hover:border-indigo-500/30 cursor-pointer transition-all"
                  onClick={() => navigate(`/tasks/${task.id}`)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <CheckSquare
                          className={`w-5 h-5 ${
                            (task.status || "").toUpperCase() === "DONE"
                              ? "text-green-400"
                              : "text-slate-500"
                          }`}
                        />

                        <div className="min-w-0">
                          <p
                            className={`font-medium truncate ${
                              (task.status || "").toUpperCase() === "DONE"
                                ? "text-slate-500 line-through"
                                : "text-white"
                            }`}
                          >
                            {task.title}
                          </p>

                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <Badge className={getTaskStatusColor(task.status)}>
                              {task.status || "TODO"}
                            </Badge>
                            <Badge className={getPriorityColor(task.priority)}>
                              {task.priority || "LOW"}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        {assignee && (
                          <div className="flex items-center gap-2">
                            <Avatar className="w-7 h-7">
                              <AvatarFallback className="bg-indigo-600 text-white text-xs">
                                {getInitials(assignee.full_name)}
                              </AvatarFallback>
                            </Avatar>
                          </div>
                        )}

                        {task.due_date && (
                          <span className="text-sm text-slate-500 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {format(new Date(task.due_date), "MMM d")}
                          </span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {tasks.length === 0 && (
              <div className="text-center py-12">
                <CheckSquare className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-500">No tasks yet</p>
                <Button
                  className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white"
                  onClick={() => navigate(`/tasks/new?projectId=${project.id}`)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add First Task
                </Button>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="team" className="space-y-4">
          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white">Team Members</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="divide-y divide-slate-800">
                {projectMembers.length === 0 ? (
                  <p className="text-slate-500 py-4">No team members assigned</p>
                ) : (
                  projectMembers.map((member) => {
                    const profile = getProfileByUserId(member.user_id);

                    return (
                      <div key={member.id} className="flex items-center gap-4 py-4">
                        <Avatar className="w-10 h-10">
                          <AvatarFallback className="bg-indigo-600 text-white">
                            {getInitials(profile?.full_name || null)}
                          </AvatarFallback>
                        </Avatar>

                        <div className="flex-1">
                          <p className="text-white font-medium">
                            {profile?.full_name || "Unnamed user"}
                          </p>
                          <p className="text-slate-500 text-sm">
                            {profile?.role?.toUpperCase() || "USER"}
                          </p>
                        </div>

                        <Badge className="bg-slate-800 text-slate-300">{member.role}</Badge>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="files" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-white">Project Files</h3>

            <>
              <input
                ref={projectFileInputRef}
                type="file"
                className="hidden"
                onChange={handleProjectFileUpload}
                disabled={isUploading}
              />

              <Button
                type="button"
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
                disabled={isUploading}
                onClick={() => projectFileInputRef.current?.click()}
              >
                <Upload className="w-4 h-4 mr-2" />
                {isUploading ? "Uploading..." : "Upload File"}
              </Button>
            </>
          </div>

          <Card className="bg-slate-900/50 border-slate-800">
            <CardContent className="p-4">
              {files.length === 0 ? (
                <p className="text-slate-500">No project files uploaded yet.</p>
              ) : (
                <div className="space-y-3">
                  {files.map((file) => {
                    const uploader = file.user_id
                      ? getProfileByUserId(file.user_id)
                      : null;

                    return (
                      <div
                        key={file.id}
                        className="flex items-center justify-between gap-4 rounded-lg border border-slate-800 bg-slate-950/50 p-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <FileText className="w-5 h-5 text-indigo-400" />
                          <div className="min-w-0">
                            <p className="text-white text-sm truncate">{file.file_name}</p>
                            <p className="text-slate-500 text-xs">
                              {uploader?.full_name || "Unknown user"} •{" "}
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

                          {canDeleteThisProjectFile(file) && (
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
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="discussion" className="space-y-4">
          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader>
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-indigo-400" />
                <CardTitle className="text-white">Project Discussion</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                <div className="mb-2">
                  <p className="text-sm font-medium text-white">Add Update</p>
                  <p className="text-xs text-slate-500">
                    Share project-wide updates, blockers, notes, and decisions
                  </p>
                </div>

                <Textarea
                  placeholder="Write a project update, decision, blocker, or note..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  rows={4}
                  className="bg-slate-900 border-slate-800 text-white placeholder:text-slate-600 resize-none"
                />

                <div className="mt-3 flex items-center justify-between gap-3">
                  <p className="text-xs text-slate-500">
                    This update will be visible to people who can access this project.
                  </p>

                  <Button
                    type="button"
                    onClick={handleAddComment}
                    disabled={commentSaving || !newComment.trim()}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white"
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
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
                      Start the thread with the first project-wide update.
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
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white">Project Activity</CardTitle>
            </CardHeader>
            <CardContent>
              {activityLogs.length === 0 ? (
                <p className="text-slate-500">No activity yet.</p>
              ) : (
                <div className="space-y-4">
                  {activityLogs.map((log) => {
                    const actor = log.user_id ? getProfileByUserId(log.user_id) : null;

                    return (
                      <div
                        key={log.id}
                        className="flex items-start justify-between gap-4 border-b border-slate-800 pb-4 last:border-b-0"
                      >
                        <div>
                          <p className="text-white text-sm">
                            {actor?.full_name ? (
                              <>
                                <span className="font-medium">{actor.full_name}</span>{" "}
                                <span className="text-slate-300">{log.message}</span>
                              </>
                            ) : (
                              <span className="text-slate-300">{log.message}</span>
                            )}
                          </p>
                          <p className="text-xs text-slate-500 mt-1">
                            {log.action_type} • {log.entity_type}
                          </p>
                        </div>

                        <div className="text-xs text-slate-500 whitespace-nowrap">
                          {format(new Date(log.created_at), "MMM d, h:mm a")}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
