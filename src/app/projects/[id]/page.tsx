import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { format } from "date-fns";
import { supabase } from "@/lib/supabase";
import { logActivity } from "@/lib/activity";
import { createNotification } from "@/lib/notifications";
import {
  uploadProjectOrTaskFile,
  deleteUploadedFile,
} from "@/lib/file-upload";

import {
  canViewProject,
  canEditProject,
  canDeleteProject,
  canPerform,
  type Permission,
} from "@/lib/permissions";

import { createRequestTracker } from "@/lib/safeAsync";
import { useLanguage } from "@/lib/i18n";
import { useAppClock } from "@/lib/clock/provider";
import { smartTranslate } from "@/lib/smartTranslate";
import { openFile, downloadFile } from "@/lib/file-actions";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  ExternalLink,
  MessageSquare,
  Clock3,
  Save,
  X,
} from "lucide-react";

type Role = "admin" | "manager" | "employee" | "guest";

type ProfileRow = {
  user_id: string;
  full_name: string | null;
  role: Role;
  status: "active" | "pending" | "inactive" | "denied";
  permissions?: Partial<Record<Permission, boolean>> | null;
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

type ProjectReportRow = {
  id: string;
  project_id: string;
  report_type: string;
  format: string;
  status: "pending" | "processing" | "completed" | "failed";
  requested_by: string;
  generated_at: string | null;
  storage_bucket: string | null;
  file_path: string | null;
  created_at: string;
};

function ProjectDetailSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 rounded-md bg-slate-800" />
          <div className="space-y-2">
            <div className="h-7 w-56 rounded bg-slate-800" />
            <div className="h-4 w-72 rounded bg-slate-900" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-10 w-24 rounded bg-slate-800" />
          <div className="h-10 w-24 rounded bg-slate-800" />
        </div>
      </div>

      <Card className="bg-slate-900/50 border-slate-800">
        <CardContent className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="h-4 w-28 rounded bg-slate-800" />
            <div className="h-4 w-12 rounded bg-slate-800" />
          </div>
          <div className="h-3 w-full rounded bg-slate-800" />
          <div className="grid grid-cols-5 gap-4">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="text-center space-y-2">
                <div className="h-7 w-10 mx-auto rounded bg-slate-800" />
                <div className="h-3 w-14 mx-auto rounded bg-slate-900" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="h-10 w-full max-w-[720px] rounded-md bg-slate-900 border border-slate-800" />

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-6 space-y-4">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="h-4 w-24 rounded bg-slate-800" />
                <div className="h-4 w-28 rounded bg-slate-900" />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-6 space-y-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-slate-800" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 rounded bg-slate-800" />
                  <div className="h-3 w-20 rounded bg-slate-900" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const requestTracker = useRef(createRequestTracker());
  const projectFileInputRef = useRef<HTMLInputElement | null>(null);
  
  const { t } = useLanguage();
  const clock = useAppClock();

  const [activeTab, setActiveTab] = useState("overview");
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isDragOverUploadZone, setIsDragOverUploadZone] = useState(false);
  const [fileActionLoading, setFileActionLoading] = useState<string | null>(null);
  const [error, setError] = useState("");

    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<Role | null>(null);
  const [currentUserPermissions, setCurrentUserPermissions] = useState<
    Partial<Record<Permission, boolean>> | null
  >(null);

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

  const [translatedComments, setTranslatedComments] = useState<
  Record<string, { text: string; source: string }>
>({});
  const [translatingCommentId, setTranslatingCommentId] = useState<string | null>(null);

    const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [isTeamDialogOpen, setIsTeamDialogOpen] = useState(false);
  const [selectedTeamMembers, setSelectedTeamMembers] = useState<string[]>([]);
  const [isSavingTeamMembers, setIsSavingTeamMembers] = useState(false);
  const [isReportsDialogOpen, setIsReportsDialogOpen] = useState(false);
  const [projectReports, setProjectReports] = useState<ProjectReportRow[]>([]);
  const [reportFileLoadingId, setReportFileLoadingId] = useState<string | null>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  const loadProjectPage = async (mode: "initial" | "refresh" = "initial") => {
    if (!id) {
      navigate("/projects");
      return;
    }

    const requestId = requestTracker.current.next();

    if (mode === "initial" && !hasLoadedOnce) {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }

    setError("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!requestTracker.current.isLatest(requestId)) return;

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
        { data: reportsData },
      ] = await Promise.all([
        supabase
          .from("profiles")
          .select("role, permissions")
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
        supabase
          .from("project_reports")
          .select(
            "id, project_id, report_type, format, status, requested_by, generated_at, storage_bucket, file_path, created_at"
          )
          .eq("project_id", id)
          .order("created_at", { ascending: false }),
      ]);

      if (!requestTracker.current.isLatest(requestId)) return;

      if (myProfileError || !myProfile) {
        navigate("/projects");
        return;
      }

            const role = myProfile.role as Role;
      setCurrentUserRole(role);
      setCurrentUserPermissions(
        ((myProfile as { permissions?: Partial<Record<Permission, boolean>> | null })
          .permissions ?? null)
      );

      if (projectError || !projectData) {
        setProject(null);
        setError(t("projects.projectNotFound", "Project not found."));
        return;
      }

            const loadedProject = projectData as ProjectRow;
      const loadedMembers = (membersData || []) as ProjectMemberRow[];
      const loadedProfiles = (profilesData || []) as ProfileRow[];
      const loadedTasks = (tasksData || []) as TaskRow[];
      const loadedLogs = (logsData || []) as ActivityLogRow[];
      const loadedFiles = (filesData || []) as FileUploadRow[];
      const loadedComments = (commentsData || []) as ProjectCommentRow[];
      const loadedReports = (reportsData || []) as ProjectReportRow[];

      if (
  !canViewProject(
    loadedProject,
    user.id,
    role,
    loadedMembers
  )
) {
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
      setProjectReports(loadedReports);
      setHasLoadedOnce(true);
    } catch (err) {
      if (!requestTracker.current.isLatest(requestId)) return;
      console.error("Load project page error:", err);
      setError(
        t(
          "projects.somethingWentWrongWhileLoadingProject",
          "Something went wrong while loading the project."
        )
      );
    } finally {
      if (!requestTracker.current.isLatest(requestId)) return;
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    void loadProjectPage("initial");
  }, [id, navigate]);

  const canEdit = useMemo(() => {
  if (!project || !currentUserId || !currentUserRole) return false;

  return canEditProject(
    project,
    currentUserId,
    currentUserRole
  );
}, [project, currentUserId, currentUserRole]);

   const canDelete = useMemo(() => {
  if (!project || !currentUserId || !currentUserRole) return false;

  return canDeleteProject(
    project,
    currentUserId,
    currentUserRole
  );
}, [project, currentUserId, currentUserRole]);

  const canGenerateReports = useMemo(() => {
    if (!currentUserRole) return false;

    return canPerform(
      currentUserRole,
      "generateProjectReports",
      currentUserPermissions,
    );
  }, [currentUserRole, currentUserPermissions]);

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

  const openTeamDialog = () => {
    setSelectedTeamMembers(projectMembers.map((member) => member.user_id));
    setIsTeamDialogOpen(true);
  };

  const toggleSelectedTeamMember = (userId: string) => {
    setSelectedTeamMembers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleSaveTeamMembers = async () => {
    if (!id || !project || !canEdit) return;

    setError("");
    setIsSavingTeamMembers(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        navigate("/login");
        return;
      }

      const existingUserIds = projectMembers.map((member) => member.user_id);
      const selectedSet = new Set(selectedTeamMembers);

      const toInsert = selectedTeamMembers.filter(
        (userId) => !existingUserIds.includes(userId)
      );

      const toDelete = projectMembers.filter(
        (member) => !selectedSet.has(member.user_id)
      );

      if (toInsert.length > 0) {
        const rows = toInsert.map((userId) => ({
          project_id: id,
          user_id: userId,
          role: "member",
        }));

        const { error: insertError } = await supabase
          .from("project_members")
          .insert(rows);

        if (insertError) {
          setError(insertError.message || t("projects.failedToAddTeamMembers", "Failed to add team members."));
          return;
        }

        await logActivity({
          projectId: id,
          actionType: "project_members_added",
          entityType: "member",
          entityId: id,
          message: `Added ${toInsert.length} member(s) to project`,
        });

        for (const userId of toInsert) {
          if (userId === user.id) continue;

          await createNotification({
            userId,
            actorUserId: user.id,
            type: "PROJECT_UPDATE",
            title: t("projects.addedToProject", "Added to Project"),
            message: t("projects.youWereAddedToProject", `You were added to project "${project.name}"`),
            link: `/projects/${project.id}`,
            entityType: "project",
            entityId: project.id,
          });
        }
      }

      if (toDelete.length > 0) {
        const idsToDelete = toDelete.map((member) => member.id);

        const { error: deleteError } = await supabase
          .from("project_members")
          .delete()
          .in("id", idsToDelete);

        if (deleteError) {
          setError(deleteError.message || t("projects.failedToRemoveTeamMembers", "Failed to remove team members."));
          return;
        }

        await logActivity({
          projectId: id,
          actionType: "project_members_removed",
          entityType: "member",
          entityId: id,
          message: `Removed ${toDelete.length} member(s) from project`,
        });
      }

      await loadProjectPage("refresh");
      setIsTeamDialogOpen(false);
    } catch (err) {
      console.error("Save team members error:", err);
      setError(
        t(
          "projects.somethingWentWrongWhileUpdatingTeamMembers",
          "Something went wrong while updating team members."
        )
      );
    } finally {
      setIsSavingTeamMembers(false);
    }
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
      .map((name) => name[0])
      .join("")
      .toUpperCase();
  };

  const getProfileByUserId = (userId: string) => {
    return profiles.find((profile) => profile.user_id === userId);
  };

  const getProfileName = (userId: string | null) => {
    if (!userId) return t("projects.unknown", "Unknown");
    return profiles.find((profile) => profile.user_id === userId)?.full_name || t("projects.unknown", "Unknown");
  };

  const getProfileRole = (userId: string | null) => {
    if (!userId) return "";
    return profiles.find((profile) => profile.user_id === userId)?.role || "";
  };

  const mentionCandidates = useMemo(() => {
    const candidateIds = Array.from(
      new Set([
        ...(project?.created_by ? [project.created_by] : []),
        ...projectMembers.map((member) => member.user_id),
      ])
    );

    return candidateIds
      .map((userId) => profiles.find((profile) => profile.user_id === userId))
      .filter((profile): profile is ProfileRow => Boolean(profile))
      .filter((profile) => profile.user_id !== currentUserId);
  }, [project, projectMembers, profiles, currentUserId]);

  const filteredMentionCandidates = useMemo(() => {
    if (!showMentionDropdown) return [];

    const query = mentionQuery.trim().toLowerCase();

    return mentionCandidates.filter((profile) => {
      const name = (profile.full_name || "").toLowerCase();
      if (!query) return true;
      return name.includes(query);
    });
  }, [mentionCandidates, mentionQuery, showMentionDropdown]);

   const handleCommentInputChange = (value: string) => {
    setNewComment(value);

    const matches = value.match(/@([a-zA-Z0-9 _-]*)$/);

    if (matches) {
      setMentionQuery((matches[1] || "").trimStart());
      setShowMentionDropdown(true);
    } else {
      setMentionQuery("");
      setShowMentionDropdown(false);
    }
  };

  const insertMention = (fullName: string) => {
    const safeName = fullName.trim();
    if (!safeName) return;

    const updatedValue = newComment.replace(
      /@([a-zA-Z0-9 _-]*)$/,
      `@${safeName} `,
    );

    setNewComment(updatedValue);
    setMentionQuery("");
    setShowMentionDropdown(false);
  };
    const handleDelete = async () => {
    if (!project) return;

    const confirmed = window.confirm(
      t("projects.deleteProjectConfirm", "Are you sure you want to delete this project?")
    );
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
        setError(
          deleteProjectError.message ||
            t("projects.failedToDeleteProject", "Failed to delete project.")
        );
        setIsDeleting(false);
        return;
      }

      navigate("/projects");
    } catch (err) {
      console.error("Delete project error:", err);
      setError(
        t(
          "projects.somethingWentWrongWhileDeletingProject",
          "Something went wrong while deleting the project."
        )
      );
      setIsDeleting(false);
    }
  };

  const handleGenerateReport = async () => {
    if (!project || !canGenerateReports || isGeneratingReport) return;

    setIsGeneratingReport(true);
    setError("");

    try {
      const { data, error: invokeError } = await supabase.functions.invoke(
        "generate-project-report",
        {
          body: {
            projectId: project.id,
            reportType: "full_snapshot",
            format: "json",
          },
        },
      );

      if (invokeError) {
        setError(
          invokeError.message ||
            t("projects.failedToGenerateReport", "Failed to generate report."),
        );
        return;
      }

      if (!data?.success || !data?.reportId) {
        setError(
          data?.error ||
            t("projects.failedToGenerateReport", "Failed to generate report."),
        );
        return;
      }

      await loadProjectPage("refresh");
      setIsReportsDialogOpen(false);
      navigate(`/projects/${project.id}/reports/${data.reportId}`);
    } catch (err) {
      console.error("Generate project report error:", err);
      setError(
        t(
          "projects.failedToGenerateReport",
          "Failed to generate report.",
        ),
      );
    } finally {
      setIsGeneratingReport(false);
    }
  };

    const refreshActivityLogs = async (projectId: string) => {
    const { data: newLogs } = await supabase
      .from("activity_logs")
      .select(
        "id, project_id, task_id, user_id, action_type, entity_type, entity_id, message, created_at"
      )
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(50);

    setActivityLogs((newLogs || []) as ActivityLogRow[]);
  };

  const handleDownloadReport = async (report: ProjectReportRow) => {
    if (!report.storage_bucket || !report.file_path || reportFileLoadingId) return;

    setReportFileLoadingId(report.id);
    setError("");

    try {
      const { data, error: downloadError } = await supabase.storage
        .from(report.storage_bucket)
        .download(report.file_path);

      if (downloadError || !data) {
        setError(
          downloadError?.message ||
            t("projects.failedToDownloadReport", "Failed to download report."),
        );
        return;
      }

      const url = window.URL.createObjectURL(data);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${project?.name || "project-report"}-${report.id}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download report error:", err);
      setError(
        t("projects.failedToDownloadReport", "Failed to download report."),
      );
    } finally {
      setReportFileLoadingId(null);
    }
  };

   const uploadProjectFile = async (file: File) => {
    if (!project) return;

    setError("");
    setIsUploading(true);

    try {
      const uploaded = (await uploadProjectOrTaskFile({
        file,
        entityType: "project",
        projectId: project.id,
      })) as FileUploadRow;

      setFiles((prev) => [uploaded, ...prev]);

      const recipientIds = Array.from(
        new Set([
          ...(project.created_by ? [project.created_by] : []),
          ...projectMembers.map((member) => member.user_id),
        ])
      ).filter((userId) => userId !== currentUserId);

      for (const userId of recipientIds) {
        await createNotification({
          userId,
          actorUserId: currentUserId || undefined,
          type: "FILE_UPLOAD",
          title: t("projects.newProjectFileUploaded", "New Project File Uploaded"),
          message: t(
            "projects.fileUploadedToProject",
            `A file was uploaded to project "${project.name}": ${uploaded.file_name}`
          ),
          link: `/projects/${project.id}`,
          entityType: "project_file",
          entityId: uploaded.id,
        });
      }

      await refreshActivityLogs(project.id);
      setIsUploadDialogOpen(false);
      setIsDragOverUploadZone(false);
    } catch (err: any) {
      console.error("Project file upload error:", err);
      setError(err?.message || t("projects.failedToUploadFile", "Failed to upload file."));
    } finally {
      setIsUploading(false);
      if (projectFileInputRef.current) {
        projectFileInputRef.current.value = "";
      }
    }
  };

  const handleProjectFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    await uploadProjectFile(e.target.files[0]);
  };

  const handleDeleteFile = async (fileId: string, filePath: string, fileName: string) => {
    const confirmed = window.confirm(
      t("projects.deleteFileConfirm", "Are you sure you want to delete this file?")
    );
    if (!confirmed) return;

    try {
      await deleteUploadedFile(fileId, filePath, {
        projectId: project?.id || null,
        taskId: null,
        fileName,
      });

      setFiles((prev) => prev.filter((file) => file.id !== fileId));

      if (project) {
        await refreshActivityLogs(project.id);
      }
    } catch (err: any) {
      console.error("Delete file error:", err);
      setError(err?.message || t("projects.failedToDeleteFile", "Failed to delete file."));
    }
  };

  const handleAddComment = async () => {
    if (!project || !newComment.trim()) return;

    setCommentSaving(true);
    setError("");

    try {
      const { data, error: invokeError } = await supabase.functions.invoke(
        "project-comment-create",
        {
          body: {
            projectId: project.id,
            content: newComment.trim(),
          },
        }
      );

      if (invokeError) {
        setError(
          invokeError.message ||
            t("projects.failedToAddComment", "Failed to add comment.")
        );
        setCommentSaving(false);
        return;
      }

      if (!data?.success || !data?.comment) {
        setError(
          data?.error ||
            t("projects.failedToAddComment", "Failed to add comment.")
        );
        setCommentSaving(false);
        return;
      }

      setComments((prev) => [...prev, data.comment as ProjectCommentRow]);
      setNewComment("");
setMentionQuery("");
setShowMentionDropdown(false);
await refreshActivityLogs(project.id);
    } catch (err) {
      console.error("Add project comment error:", err);
      setError(t("projects.failedToAddComment", "Failed to add comment."));
    } finally {
      setCommentSaving(false);
    }
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
      setError(t("projects.commentCannotBeEmpty", "Comment cannot be empty."));
      return;
    }

    setCommentActionLoading(comment.id);
    setError("");

    try {
      const nextContent = editingCommentText.trim();

      const { data, error: invokeError } = await supabase.functions.invoke(
        "project-comment-edit",
        {
          body: {
            commentId: comment.id,
            content: nextContent,
          },
        }
      );

      if (invokeError) {
        setError(
          invokeError.message ||
            t("projects.failedToUpdateComment", "Failed to update comment.")
        );
        return;
      }

      if (!data?.success || !data?.comment) {
        setError(
          data?.error ||
            t("projects.failedToUpdateComment", "Failed to update comment.")
        );
        return;
      }

      setComments((prev) =>
        prev.map((item) =>
          item.id === comment.id
            ? {
                ...item,
                content: data.comment.content,
              }
            : item
        )
      );

      setEditingCommentId(null);
      setEditingCommentText("");

      if (project) {
        await refreshActivityLogs(project.id);
      }
    } catch (err) {
      console.error("Edit project comment error:", err);
      setError(t("projects.failedToUpdateComment", "Failed to update comment."));
    } finally {
      setCommentActionLoading(null);
    }
  };

    const handleDeleteComment = async (comment: ProjectCommentRow) => {
    const confirmed = window.confirm(
      t("projects.deleteCommentConfirm", "Are you sure you want to delete this comment?")
    );
    if (!confirmed) return;

    setCommentActionLoading(comment.id);
    setError("");

    try {
      const { data, error: invokeError } = await supabase.functions.invoke(
        "project-comment-delete",
        {
          body: {
            commentId: comment.id,
          },
        }
      );

      if (invokeError) {
        setError(
          invokeError.message ||
            t("projects.failedToDeleteComment", "Failed to delete comment.")
        );
        return;
      }

      if (!data?.success) {
        setError(
          data?.error ||
            t("projects.failedToDeleteComment", "Failed to delete comment.")
        );
        return;
      }

      setComments((prev) => prev.filter((item) => item.id !== comment.id));

      if (editingCommentId === comment.id) {
        setEditingCommentId(null);
        setEditingCommentText("");
      }

      if (project) {
        await refreshActivityLogs(project.id);
      }
    } catch (err) {
      console.error("Delete project comment error:", err);
      setError(t("projects.failedToDeleteComment", "Failed to delete comment."));
    } finally {
      setCommentActionLoading(null);
    }
  };

    const handleTranslateComment = async (comment: ProjectCommentRow) => {
    if (translatedComments[comment.id]) {
      setTranslatedComments((prev) => {
        const next = { ...prev };
        delete next[comment.id];
        return next;
      });
      return;
    }

    try {
      setTranslatingCommentId(comment.id);
      const result = await smartTranslate({
  messageId: comment.id,
  text: comment.content,
});

setTranslatedComments((prev) => ({
  ...prev,
  [comment.id]: {
    text: result.translatedText,
    source: result.source,
  },
}));
    } catch (err) {
      console.error("Project comment translate error:", err);
      setError("Failed to translate comment.");
    } finally {
      setTranslatingCommentId(null);
    }
  };

  const taskStats = {
    total: tasks.length,
    todo: tasks.filter((task) => (task.status || "").toUpperCase() === "TODO").length,
    inProgress: tasks.filter((task) => (task.status || "").toUpperCase() === "IN_PROGRESS").length,
    inReview: tasks.filter((task) => (task.status || "").toUpperCase() === "IN_REVIEW").length,
    done: tasks.filter((task) => (task.status || "").toUpperCase() === "DONE").length,
  };

  if (isLoading && !hasLoadedOnce) {
    return <ProjectDetailSkeleton />;
  }

  if (!project) {
    return (
      <div className="space-y-4">
        {error && (
          <Alert className="bg-red-900/20 border-red-800 text-red-300">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <div className="text-center text-slate-400">
          {t("projects.projectNotFound", "Project not found.")}
        </div>
      </div>
    );
  }

  const pageBusy = isRefreshing && hasLoadedOnce;
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
                {project.status || t("projects.unknownUpper", "UNKNOWN")}
              </Badge>
              {pageBusy && (
                <span className="text-xs text-slate-500">
                  {t("projects.refreshing", "Refreshing...")}
                </span>
              )}
            </div>
            <p className="text-slate-400">
              {project.description || t("projects.noDescription", "No description")}
            </p>
          </div>
        </div>

                <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            className="border-slate-700 text-slate-300 hover:bg-slate-800"
            onClick={() => void loadProjectPage("refresh")}
            disabled={isRefreshing}
          >
            {isRefreshing
              ? t("projects.refreshing", "Refreshing...")
              : t("projects.refresh", "Refresh")}
          </Button>

                    {canGenerateReports && (
            <Button
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
              onClick={() => setIsReportsDialogOpen(true)}
            >
              <FileText className="w-4 h-4 mr-2" />
              {t("projects.reports", "Reports")}
            </Button>
          )}

          {canEdit && (
            <Button
              variant="outline"
              className="border-slate-700 text-slate-300 hover:bg-slate-800"
              onClick={() => navigate(`/projects/${project.id}/edit`)}
            >
              <Edit className="w-4 h-4 mr-2" />
              {t("projects.edit", "Edit")}
            </Button>
          )}

          {canDelete && (
            <Button
              variant="outline"
              className="border-red-800 text-red-400 hover:bg-red-900/20"
              onClick={() => void handleDelete()}
              disabled={isDeleting}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {isDeleting
                ? t("projects.deleting", "Deleting...")
                : t("projects.delete", "Delete")}
            </Button>
          )}
        </div>
      </div>

            <Card className="bg-slate-900/50 border-slate-800">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-slate-400">
              {t("projects.projectProgress", "Project Progress")}
            </span>
            <span className="text-white font-medium">{project.progress || 0}%</span>
          </div>

          <Progress value={project.progress || 0} className="h-3 bg-slate-800" />

          <div className="grid grid-cols-5 gap-4 mt-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-white">{taskStats.total}</p>
              <p className="text-xs text-slate-500">{t("projects.total", "Total")}</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-slate-400">{taskStats.todo}</p>
              <p className="text-xs text-slate-500">{t("projects.toDo", "To Do")}</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-400">{taskStats.inProgress}</p>
              <p className="text-xs text-slate-500">{t("projects.inProgress", "In Progress")}</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-400">{taskStats.inReview}</p>
              <p className="text-xs text-slate-500">{t("projects.inReview", "In Review")}</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-400">{taskStats.done}</p>
              <p className="text-xs text-slate-500">{t("projects.done", "Done")}</p>
            </div>
          </div>
        </CardContent>
      </Card>

            <Dialog open={isReportsDialogOpen} onOpenChange={setIsReportsDialogOpen}>
        <DialogContent className="bg-slate-950 border-slate-800 text-white max-w-6xl p-0 overflow-hidden">
          <DialogHeader className="border-b border-slate-800 px-8 py-6">
            <DialogTitle className="text-2xl font-semibold">
              {t("projects.reports", "Reports")}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 px-8 py-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-2">
                <p className="text-base font-semibold text-white">
                  {t("projects.projectReports", "Project Reports")}
                </p>
                <p className="max-w-2xl text-sm text-slate-400 leading-6">
                  {t(
                    "projects.openPreviousOrGenerateNew",
                    "Open previous reports or generate a new one."
                  )}
                </p>
              </div>

              <Button
                className="bg-indigo-600 hover:bg-indigo-700 text-white h-11 px-5"
                onClick={() => void handleGenerateReport()}
                disabled={isGeneratingReport}
              >
                <FileText className="w-4 h-4 mr-2" />
                {isGeneratingReport
                  ? t("projects.generatingReport", "Generating Report...")
                  : t("projects.generateNewReport", "Generate New Report")}
              </Button>
            </div>

            {projectReports.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-950/40 px-8 py-14 text-center">
                <FileText className="mx-auto mb-4 h-12 w-12 text-slate-600" />
                <p className="text-lg font-medium text-white">
                  {t("projects.noReportsYet", "No reports yet")}
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  {t(
                    "projects.generateFirstReportForProject",
                    "Generate the first report for this project."
                  )}
                </p>
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-800 bg-slate-900/40 overflow-hidden">
                <div className="grid grid-cols-12 gap-6 border-b border-slate-800 bg-slate-900/80 px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  <div className="col-span-3">{t("projects.created", "Created")}</div>
                  <div className="col-span-3">{t("projects.type", "Type")}</div>
                  <div className="col-span-2">{t("projects.format", "Format")}</div>
                  <div className="col-span-2">{t("projects.status", "Status")}</div>
                  <div className="col-span-2 text-right">{t("projects.actions", "Actions")}</div>
                </div>

                <div className="max-h-[520px] overflow-y-auto">
                  {projectReports.map((report) => (
                    <div
                      key={report.id}
                      className="grid grid-cols-12 gap-6 border-b border-slate-800 px-6 py-5 text-sm last:border-b-0"
                    >
                      <div className="col-span-3">
                        <p className="text-slate-200 font-medium">
                          {format(
                            clock.shiftDate(report.generated_at || report.created_at),
                            "MMM d, yyyy"
                          )}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {format(
                            clock.shiftDate(report.generated_at || report.created_at),
                            "h:mm a"
                          )}
                        </p>
                      </div>

                      <div className="col-span-3">
                        <p className="text-slate-200 font-medium break-words">
                          {report.report_type}
                        </p>
                      </div>

                      <div className="col-span-2 flex items-center">
                        <span className="text-slate-300 uppercase">{report.format}</span>
                      </div>

                      <div className="col-span-2 flex items-center">
                        <Badge className="bg-slate-800 text-slate-300 px-3 py-1">
                          {report.status.toUpperCase()}
                        </Badge>
                      </div>

                      <div className="col-span-2 flex items-center justify-end gap-3">
                        <Button
                          type="button"
                          variant="outline"
                          className="border-slate-700 text-slate-300 hover:bg-slate-800 h-10 px-4"
                          onClick={() => {
                            setIsReportsDialogOpen(false);
                            navigate(`/projects/${project.id}/reports/${report.id}`);
                          }}
                        >
                          <ExternalLink className="mr-2 h-4 w-4" />
                          {t("projects.open", "Open")}
                        </Button>

                        <Button
                          type="button"
                          variant="outline"
                          className="border-slate-700 text-green-400 hover:bg-slate-800 h-10 px-4"
                          onClick={() => void handleDownloadReport(report)}
                          disabled={
                            reportFileLoadingId === report.id ||
                            !report.storage_bucket ||
                            !report.file_path
                          }
                        >
                          <Download className="mr-2 h-4 w-4" />
                          {reportFileLoadingId === report.id
                            ? t("projects.downloading", "Downloading...")
                            : t("projects.download", "Download")}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-slate-900 border border-slate-800">
          <TabsTrigger value="overview" className="data-[state=active]:bg-slate-800">
            {t("projects.overview", "Overview")}
          </TabsTrigger>
          <TabsTrigger value="tasks" className="data-[state=active]:bg-slate-800">
            {t("projects.tasks", "Tasks")}
          </TabsTrigger>
          <TabsTrigger value="team" className="data-[state=active]:bg-slate-800">
            {t("projects.team", "Team")}
          </TabsTrigger>
          <TabsTrigger value="files" className="data-[state=active]:bg-slate-800">
            {t("projects.files", "Files")}
          </TabsTrigger>
          <TabsTrigger value="discussion" className="data-[state=active]:bg-slate-800">
            {t("projects.discussion", "Discussion")}
          </TabsTrigger>
          <TabsTrigger value="activity" className="data-[state=active]:bg-slate-800">
            {t("projects.activity", "Activity")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="bg-slate-900/50 border-slate-800">
              <CardHeader>
                <CardTitle className="text-white text-lg">
                  {t("projects.projectDetails", "Project Details")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-slate-400">{t("projects.status", "Status")}</span>
                  <Badge className={getStatusColor(project.status)}>
                    {project.status || t("projects.unknownUpper", "UNKNOWN")}
                  </Badge>
                </div>

                <div className="flex justify-between">
                  <span className="text-slate-400">{t("projects.startDate", "Start Date")}</span>
                  <span className="text-white">
                    {project.start_date
                      ? format(clock.shiftDate(project.start_date), "MMM d, yyyy")
                      : t("projects.notSet", "Not set")}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-slate-400">{t("projects.endDate", "End Date")}</span>
                  <span className="text-white">
                    {project.end_date
                      ? format(clock.shiftDate(project.end_date), "MMM d, yyyy")
                      : t("projects.notSet", "Not set")}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-slate-400">{t("projects.created", "Created")}</span>
                  <span className="text-white">
                    {format(clock.shiftDate(project.created_at), "MMM d, yyyy")}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-slate-400">{t("projects.assignedMembers", "Assigned Members")}</span>
                  <span className="text-white">{projectMembers.length}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900/50 border-slate-800">
              <CardHeader>
                <CardTitle className="text-white text-lg">
                  {t("projects.teamMembers", "Team Members")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {projectMembers.length === 0 ? (
                    <p className="text-slate-500">
                      {t("projects.noTeamMembersAssigned", "No team members assigned")}
                    </p>
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
                              {profile?.full_name || t("projects.unnamedUser", "Unnamed user")}
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
            <h3 className="text-lg font-medium text-white">
              {t("projects.projectTasks", "Project Tasks")}
            </h3>

            <Button
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
              onClick={() => navigate(`/tasks/new?projectId=${project.id}`)}
            >
              <Plus className="w-4 h-4 mr-2" />
              {t("projects.addTask", "Add Task")}
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
                          <Avatar className="w-7 h-7">
                            <AvatarFallback className="bg-indigo-600 text-white text-xs">
                              {getInitials(assignee.full_name)}
                            </AvatarFallback>
                          </Avatar>
                        )}

                        {task.due_date && (
                          <span className="text-sm text-slate-500 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {format(clock.shiftDate(task.due_date), "MMM d")}
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
                <p className="text-slate-500">{t("projects.noTasksYet", "No tasks yet")}</p>
                <Button
                  className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white"
                  onClick={() => navigate(`/tasks/new?projectId=${project.id}`)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {t("projects.addFirstTask", "Add First Task")}
                </Button>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="team" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-white">
              {t("projects.teamMembers", "Team Members")}
            </h3>

            {canEdit && (
              <Button
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
                onClick={openTeamDialog}
              >
                <Plus className="w-4 h-4 mr-2" />
                {t("projects.addTeamMember", "Add Team Member")}
              </Button>
            )}
          </div>

          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white">
                {t("projects.teamMembers", "Team Members")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="divide-y divide-slate-800">
                {projectMembers.length === 0 ? (
                  <p className="text-slate-500 py-4">
                    {t("projects.noTeamMembersAssigned", "No team members assigned")}
                  </p>
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
                            {profile?.full_name || t("projects.unnamedUser", "Unnamed user")}
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

          <Dialog open={isTeamDialogOpen} onOpenChange={setIsTeamDialogOpen}>
            <DialogContent className="bg-slate-950 border-slate-800 text-white max-w-2xl">
              <DialogHeader>
                <DialogTitle>{t("projects.addTeamMembers", "Add Team Members")}</DialogTitle>
              </DialogHeader>

              <div className="space-y-3">
                <div className="text-slate-300 text-sm font-medium">
                  {t("projects.assignTeamMembers", "Assign Team Members")}
                </div>

                {profiles.length === 0 ? (
                  <div className="text-slate-500 text-sm">
                    {t("projects.noActiveTeamMembersFound", "No active team members found.")}
                  </div>
                ) : (
                  <div className="space-y-2 rounded-lg border border-slate-800 bg-slate-950 p-3 max-h-64 overflow-y-auto">
                    {profiles.map((member) => (
                      <label
                        key={member.user_id}
                        className="flex items-center justify-between gap-3 rounded-md px-3 py-2 hover:bg-slate-900 cursor-pointer"
                      >
                        <div>
                          <div className="text-white text-sm font-medium">
                            {member.full_name || t("projects.unnamedUser", "Unnamed user")}
                          </div>
                          <div className="text-slate-500 text-xs">
                            {member.role.toUpperCase()}
                          </div>
                        </div>

                        <input
                          type="checkbox"
                          checked={selectedTeamMembers.includes(member.user_id)}
                          onChange={() => toggleSelectedTeamMember(member.user_id)}
                          className="h-4 w-4"
                        />
                      </label>
                    ))}
                  </div>
                )}

                <p className="text-slate-500 text-xs">
                  {t(
                    "projects.projectVisibilityNote",
                    "Only assigned members, the creator, and admin will be able to see this project."
                  )}
                </p>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsTeamDialogOpen(false)}
                    className="border-slate-700 text-slate-300 hover:bg-slate-800"
                    disabled={isSavingTeamMembers}
                  >
                    {t("projects.cancel", "Cancel")}
                  </Button>

                  <Button
                    type="button"
                    className="bg-indigo-600 hover:bg-indigo-700 text-white"
                    onClick={() => void handleSaveTeamMembers()}
                    disabled={isSavingTeamMembers}
                  >
                    {isSavingTeamMembers
                      ? t("common.saving", "Saving...")
                      : t("projects.saveMembers", "Save Members")}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>

                <TabsContent value="files" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-white">
              {t("projects.projectFiles", "Project Files")}
            </h3>

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
                onClick={() => setIsUploadDialogOpen(true)}
              >
                <Upload className="w-4 h-4 mr-2" />
                {isUploading
                  ? t("projects.uploading", "Uploading...")
                  : t("projects.uploadFile", "Upload File")}
              </Button>

              <Dialog
                open={isUploadDialogOpen}
                onOpenChange={(open) => {
                  if (isUploading) return;
                  setIsUploadDialogOpen(open);
                  if (!open) {
                    setIsDragOverUploadZone(false);
                    if (projectFileInputRef.current) {
                      projectFileInputRef.current.value = "";
                    }
                  }
                }}
              >
                <DialogContent className="bg-slate-950 border-slate-800 text-white max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>
                      {t("projects.uploadProjectFile", "Upload Project File")}
                    </DialogTitle>
                  </DialogHeader>

                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      if (!isUploading) {
                        projectFileInputRef.current?.click();
                      }
                    }}
                    onKeyDown={(e) => {
                      if (isUploading) return;
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        projectFileInputRef.current?.click();
                      }
                    }}
                    onDragEnter={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (!isUploading) {
                        setIsDragOverUploadZone(true);
                      }
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (!isUploading) {
                        setIsDragOverUploadZone(true);
                      }
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const relatedTarget = e.relatedTarget as Node | null;
                      if (!e.currentTarget.contains(relatedTarget)) {
                        setIsDragOverUploadZone(false);
                      }
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsDragOverUploadZone(false);

                      if (isUploading) return;

                      const droppedFile = e.dataTransfer.files?.[0];
                      if (droppedFile) {
                        void uploadProjectFile(droppedFile);
                      }
                    }}
                    className={`rounded-2xl border-2 border-dashed p-10 text-center transition-colors ${
                      isDragOverUploadZone
                        ? "border-indigo-500 bg-indigo-500/10"
                        : "border-slate-700 bg-slate-900/60 hover:border-slate-500 hover:bg-slate-900"
                    } ${isUploading ? "cursor-not-allowed opacity-70" : "cursor-pointer"}`}
                  >
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-800">
                      <Upload className="h-7 w-7 text-indigo-400" />
                    </div>

                    <h4 className="text-xl font-semibold text-white">
                      {t(
                        "projects.dragAndDropFilesHere",
                        "Drag files here to upload"
                      )}
                    </h4>

                    <p className="mt-2 text-sm text-slate-400">
                      {t(
                        "projects.orClickToChooseFile",
                        "Or click to choose a file from your computer"
                      )}
                    </p>

                    <div className="mt-6">
                      <Button
                        type="button"
                        variant="outline"
                        className="border-slate-700 text-slate-300 hover:bg-slate-800"
                        disabled={isUploading}
                        onClick={(e) => {
                          e.stopPropagation();
                          projectFileInputRef.current?.click();
                        }}
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        {t("projects.chooseFile", "Choose File")}
                      </Button>
                    </div>

                    {isUploading && (
                      <p className="mt-4 text-sm text-indigo-300">
                        {t("projects.uploading", "Uploading...")}
                      </p>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            </>
          </div>

          <Card className="bg-slate-900/50 border-slate-800">
            <CardContent className="p-4">
              {files.length === 0 ? (
                <p className="text-slate-500">
                  {t("projects.noProjectFilesUploadedYet", "No project files uploaded yet.")}
                </p>
              ) : (
                <div className="space-y-3">
                  {files.map((file) => {
                    const uploader = file.user_id ? getProfileByUserId(file.user_id) : null;

                    return (
                      <div
                        key={file.id}
                        className="flex items-center gap-4 rounded-lg border border-slate-800 bg-slate-950/50 p-3"
                      >
                        <div className="flex min-w-0 flex-1 items-center gap-3">
                          <FileText className="w-5 h-5 shrink-0 text-indigo-400" />
                          <div className="min-w-0">
                            <p className="truncate text-sm text-white">{file.file_name}</p>
                            <p className="text-xs text-slate-500">
                              {uploader?.full_name || t("projects.unknownUser", "Unknown user")} •{" "}
                              {format(clock.shiftDate(file.created_at), "MMM d, yyyy h:mm a")}
                            </p>
                          </div>
                        </div>

                        <div className="ml-auto flex shrink-0 items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            className="border-slate-700 text-slate-300 hover:bg-slate-800"
                            onClick={async () => {
                              try {
                                setFileActionLoading(file.id);
                                await openFile("project-files", file.file_path, file.id);
                              } catch (err) {
                                console.error("Open file error:", err);
                                setError(t("projects.failedToOpenFile", "Failed to open file."));
                              } finally {
                                setFileActionLoading(null);
                              }
                            }}
                            disabled={fileActionLoading === file.id}
                          >
                            <ExternalLink className="mr-2 h-4 w-4" />
                            {t("projects.open", "Open")}
                          </Button>

                          <Button
                            type="button"
                            variant="outline"
                            className="border-slate-700 text-green-400 hover:bg-slate-800"
                            onClick={async () => {
                              try {
                                setFileActionLoading(file.id);
                                await downloadFile("project-files", file.file_path, file.file_name);
                              } catch (err) {
                                console.error("Download file error:", err);
                                setError(t("projects.failedToDownloadFile", "Failed to download file."));
                              } finally {
                                setFileActionLoading(null);
                              }
                            }}
                            disabled={fileActionLoading === file.id}
                          >
                            <Download className="mr-2 h-4 w-4" />
                            Download
                          </Button>

                          {canDeleteThisProjectFile(file) && (
                            <Button
                              type="button"
                              variant="outline"
                              className="border-red-800 text-red-400 hover:bg-red-900/20"
                              onClick={() =>
                                void handleDeleteFile(file.id, file.file_path, file.file_name)
                              }
                              disabled={fileActionLoading === file.id}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              {t("projects.delete", "Delete")}
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
                <CardTitle className="text-white">
                  {t("projects.projectDiscussion", "Project Discussion")}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                <div className="mb-2">
                  <p className="text-sm font-medium text-white">
                    {t("projects.addUpdate", "Add Update")}
                  </p>
                  <p className="text-xs text-slate-500">
                    {t(
                      "projects.shareProjectWideUpdates",
                      "Share project-wide updates, blockers, notes, and decisions"
                    )}
                  </p>
                </div>

                <Textarea
  placeholder={t(
    "projects.writeProjectUpdatePlaceholder",
    "Write a project update, decision, blocker, or note..."
  )}
  value={newComment}
  onChange={(e) => handleCommentInputChange(e.target.value)}
  onBlur={() => {
    window.setTimeout(() => {
      setShowMentionDropdown(false);
    }, 150);
  }}
  rows={4}
  className="bg-slate-900 border-slate-800 text-white placeholder:text-slate-600 resize-none"
/>

                {showMentionDropdown && (
                  <div className="mt-2 rounded-lg border border-slate-800 bg-slate-900 shadow-lg overflow-hidden">
                    {filteredMentionCandidates.length === 0 ? (
                      <div className="px-3 py-2 text-sm text-slate-500">
                        {t("projects.noMatchingParticipants", "No matching participants")}
                      </div>
                    ) : (
                      filteredMentionCandidates.map((profile) => (
                        <button
  key={profile.user_id}
  type="button"
  onMouseDown={(e) => e.preventDefault()}
  onClick={() => insertMention(profile.full_name || "")}
  className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-slate-800 transition-colors"
>
                          <div>
                            <div className="text-sm font-medium text-white">
                              {profile.full_name || t("projects.unknown", "Unknown")}
                            </div>
                            <div className="text-xs text-slate-500">
                              {profile.role.toUpperCase()}
                            </div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}

                <div className="mt-3 flex items-center justify-between gap-3">
                  <p className="text-xs text-slate-500">
                    {t(
                      "projects.updateVisibilityNote",
                      "This update will be visible to people who can access this project."
                    )}
                  </p>

                  <Button
                    type="button"
                    onClick={() => void handleAddComment()}
                    disabled={commentSaving || !newComment.trim()}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white"
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    {commentSaving
                      ? t("projects.posting", "Posting...")
                      : t("projects.postUpdate", "Post Update")}
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                {comments.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-800 bg-slate-950/40 p-8 text-center">
                    <MessageSquare className="mx-auto mb-3 h-10 w-10 text-slate-600" />
                    <p className="text-white font-medium">
                      {t("projects.noDiscussionYet", "No discussion yet")}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {t(
                        "projects.startThreadWithFirstUpdate",
                        "Start the thread with the first project-wide update."
                      )}
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
                                    {t("projects.youUpper", "YOU")}
                                  </Badge>
                                )}
                              </div>

                              <div className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                                <Clock3 className="h-3 w-3" />
                                <span>
                                  {format(clock.shiftDate(comment.created_at), "MMM d, yyyy • h:mm a")}
                                </span>
                              </div>
                            </div>
                          </div>

                          {canManageComment(comment) && !isEditing && (
                            <div className="flex items-center gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="border-slate-700 text-slate-300 hover:bg-slate-800"
                                onClick={() => startEditingComment(comment)}
                                disabled={commentActionLoading === comment.id}
                              >
                                <Edit className="w-3 h-3 mr-1" />
                                {t("projects.edit", "Edit")}
                              </Button>

                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="border-red-800 text-red-400 hover:bg-red-900/20"
                                onClick={() => void handleDeleteComment(comment)}
                                disabled={commentActionLoading === comment.id}
                              >
                                <Trash2 className="w-3 h-3 mr-1" />
                                {t("projects.delete", "Delete")}
                              </Button>
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
                                  onClick={() => void handleSaveEditedComment(comment)}
                                  disabled={
                                    commentActionLoading === comment.id ||
                                    !editingCommentText.trim()
                                  }
                                >
                                  <Save className="w-3 h-3 mr-1" />
                                  {t("common.save", "Save")}
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
                                  {t("projects.cancel", "Cancel")}
                                </Button>
                              </div>
                            </div>
                                                    ) : (
                            <div className="space-y-2">
  <p className="whitespace-pre-wrap text-sm leading-6 text-slate-200">
    {translatedComments[comment.id]?.text || comment.content}
  </p>

  {translatedComments[comment.id]?.source && (
    <p className="text-[10px] opacity-70 text-slate-400">
      Source: {translatedComments[comment.id].source}
    </p>
  )}

  <button
    type="button"
    className="text-xs text-indigo-400 hover:text-indigo-300"
    onClick={() => void handleTranslateComment(comment)}
    disabled={translatingCommentId === comment.id}
  >
    {translatingCommentId === comment.id
      ? "Translating..."
      : translatedComments[comment.id]
      ? "Original"
      : "Translate"}
  </button>
</div>
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
              <CardTitle className="text-white">
                {t("projects.projectActivity", "Project Activity")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activityLogs.length === 0 ? (
                <p className="text-slate-500">{t("projects.noActivityYet", "No activity yet.")}</p>
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
                          {format(clock.shiftDate(log.created_at), "MMM d, h:mm a")}
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
