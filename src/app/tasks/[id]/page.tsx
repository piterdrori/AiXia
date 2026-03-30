import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { format } from "date-fns";
import { supabase } from "@/lib/supabase";
import { createNotification } from "@/lib/notifications";
import {
  uploadProjectOrTaskFile,
  deleteUploadedFile,
} from "@/lib/file-upload";
import { createRequestTracker } from "@/lib/safeAsync";
import { useLanguage } from "@/lib/i18n";

import {
  canViewTask,
  canEditTaskEntity,
  canDeleteTaskEntity,
  canMoveTask,
} from "@/lib/permissions";

import { useAppClock } from "@/lib/clock/provider";
import { smartTranslate } from "@/lib/smartTranslate";
import { openFile, downloadFile } from "@/lib/file-actions";
import {
  subscribeToTask,
  subscribeToTaskComments,
  subscribeToTaskActivity,
  removeRealtimeChannel,
} from "@/lib/realtime";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  ExternalLink,
  MessageSquare,
  Clock3,
  Save,
  X,
  UserPlus,
  UserMinus,
} from "lucide-react";

type Role = "admin" | "manager" | "employee" | "guest";

type TaskRow = {
  id: string;
  title: string;
  description: string | null;
  status: string | null;
  priority: string | null;
  start_date: string | null;
  due_date: string | null;
  project_id: string | null;
  assignee_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  last_status_update_at: string | null;
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

type TaskActivityRow = {
  id: string;
  project_id: string | null;
  task_id: string | null;
  user_id: string | null;
  action_type: string;
  entity_type: string | null;
  entity_id: string | null;
  message: string | null;
  created_at: string;
};

function InfoRow({
  icon,
  label,
  value,
  valueClassName = "text-white",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div>{icon}</div>
      <div>
        <p className="text-xs text-slate-500">{label}</p>
        <p className={`${valueClassName} text-sm`}>{value}</p>
      </div>
    </div>
  );
}

export default function TaskDetailPage() {
  const { t } = useLanguage();
  const clock = useAppClock();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const requestTracker = useRef(createRequestTracker());
  const taskFileInputRef = useRef<HTMLInputElement | null>(null);

    const [activeTab, setActiveTab] = useState("overview");
  const [task, setTask] = useState<TaskRow | null>(null);
  const [project, setProject] = useState<ProjectRow | null>(null);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [taskMembers, setTaskMembers] = useState<TaskMemberRow[]>([]);
  const [comments, setComments] = useState<TaskCommentRow[]>([]);
  const [files, setFiles] = useState<FileUploadRow[]>([]);
  const [activity, setActivity] = useState<TaskActivityRow[]>([]);

  const [statusModalOpen, setStatusModalOpen] = useState(false);
const [pendingStatus, setPendingStatus] = useState<string | null>(null);
const [statusRemark, setStatusRemark] = useState("");

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
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isDragOverUploadZone, setIsDragOverUploadZone] = useState(false);
  const [fileActionLoading, setFileActionLoading] = useState<string | null>(null);
  const [showManageMembers, setShowManageMembers] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [memberSaving, setMemberSaving] = useState(false);
  const [memberActionLoading, setMemberActionLoading] = useState<string | null>(null);

  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");

  const [translatedComments, setTranslatedComments] = useState<
  Record<string, { text: string; source: string }>
>({});
  const [translatingCommentId, setTranslatingCommentId] = useState<string | null>(null);

  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadTaskPage = async (mode: "initial" | "refresh" = "initial") => {
    if (!id) {
      navigate("/tasks");
      return;
    }

    const requestId = requestTracker.current.next();

    if (mode === "initial") {
      setIsBootstrapping(true);
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

      const { data: myProfile, error: myProfileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("user_id", user.id)
        .single();

      if (!requestTracker.current.isLatest(requestId)) return;

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

      if (!requestTracker.current.isLatest(requestId)) return;

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
        { data: activityData },
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
        supabase
          .from("activity_logs")
          .select(
            "id, project_id, task_id, user_id, action_type, entity_type, entity_id, message, created_at"
          )
          .eq("task_id", id)
          .order("created_at", { ascending: false }),
      ]);

      if (!requestTracker.current.isLatest(requestId)) return;

      const loadedTaskMembers = (taskMembersData || []) as TaskMemberRow[];
      const loadedProjectMembers = (projectMembersData || []) as ProjectMemberRow[];

      const visibleProjectIds = new Set(
  loadedProjectMembers.map((m) => m.project_id)
);

if (
  !canViewTask(
    loadedTask,
    user.id,
    role,
    loadedTaskMembers,
    visibleProjectIds
  )
) {
  navigate("/tasks");
  return;
}

            setTask(loadedTask);
      setProject((projectData || null) as ProjectRow | null);
      setProfiles((profilesData || []) as ProfileRow[]);
      setTaskMembers(loadedTaskMembers);
      setComments((commentsData || []) as TaskCommentRow[]);
      setFiles((filesData || []) as FileUploadRow[]);
      setActivity((activityData || []) as TaskActivityRow[]);
    } catch (err) {
      if (!requestTracker.current.isLatest(requestId)) return;
      console.error("Load task detail error:", err);
      setError(t("taskDetail.errors.loadTask"));
    } finally {
      if (!requestTracker.current.isLatest(requestId)) return;
      setIsBootstrapping(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    void loadTaskPage("initial");
  }, [id]);

useEffect(() => {
  if (!id) return;

  // TASK UPDATE
  subscribeToTask({
    taskId: id,
    onUpdate: (updatedTask) => {
      setTask((prev) =>
        prev
          ? {
              ...prev,
              ...updatedTask,
            }
          : prev
      );
    },
  });

  // COMMENTS (DISCUSSION)
   subscribeToTaskComments({
    taskId: id,
    onInsert: (newComment) => {
      setComments((prev) => {
        if (prev.some((comment) => comment.id === newComment.id)) {
          return prev;
        }
        return [...prev, newComment];
      });
    },
  });

  // ACTIVITY (OPTIONAL FUTURE USE)
    subscribeToTaskActivity({
    taskId: id,
    onInsert: (newActivity) => {
      setActivity((prev) => {
        if (prev.some((item) => item.id === newActivity.id)) {
          return prev;
        }
        return [newActivity, ...prev];
      });
    },
  });

  return () => {
    removeRealtimeChannel(`task:${id}`);
    removeRealtimeChannel(`task:comments:${id}`);
    removeRealtimeChannel(`task:activity:${id}`);
  };
}, [id]);
  
  const canEditTask = useMemo(() => {
  if (!task || !currentUserId || !currentUserRole) return false;

  return canEditTaskEntity(
    task,
    currentUserId,
    currentUserRole
  );
}, [task, currentUserId, currentUserRole]);

  const canDeleteTask = useMemo(() => {
  if (!task || !currentUserId || !currentUserRole) return false;

  return canDeleteTaskEntity(
    task,
    currentUserId,
    currentUserRole
  );
}, [task, currentUserId, currentUserRole]);
  
  const canManageMembers = useMemo(() => {
  if (!task || !currentUserId || !currentUserRole) return false;

  return canEditTaskEntity(
    task,
    currentUserId,
    currentUserRole
  );
}, [task, currentUserId, currentUserRole]);

const canUpdateStatus = useMemo(() => {
  if (!task || !currentUserId || !currentUserRole) return false;

  const visibleProjectIds = new Set(
    project?.id ? [project.id] : []
  );

  return canMoveTask(
    task,
    currentUserId,
    currentUserRole,
    taskMembers,
    visibleProjectIds
  );
}, [task, currentUserId, currentUserRole, taskMembers, project?.id]);

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

  const dueDateKey = useMemo(() => {
  if (!task?.due_date) return null;
  return format(clock.shiftDate(task.due_date), "yyyy-MM-dd");
}, [task?.due_date, clock]);

const dueDateDisplay = useMemo(() => {
  if (!task?.due_date) return t("taskDetail.fallbacks.noDueDate");
  return format(clock.shiftDate(task.due_date), "MMM d, yyyy");
}, [task?.due_date, clock, t]);

const isTaskDone = useMemo(() => {
  return (task?.status || "").toUpperCase() === "DONE";
}, [task?.status]);

const isOverdue = useMemo(() => {
  if (!dueDateKey || isTaskDone) return false;
  return dueDateKey < clock.todayKey;
}, [dueDateKey, isTaskDone, clock.todayKey]);

const isDueToday = useMemo(() => {
  if (!dueDateKey || isTaskDone) return false;
  return dueDateKey === clock.todayKey;
}, [dueDateKey, isTaskDone, clock.todayKey]);

const dueDateBadgeClassName = useMemo(() => {
  if (isOverdue) return "bg-red-500/20 text-red-400 border-red-500/30";
  if (isDueToday) return "bg-amber-500/20 text-amber-400 border-amber-500/30";
  return "bg-slate-500/20 text-slate-400 border-slate-500/30";
}, [isOverdue, isDueToday]);

const dueDateLabel = useMemo(() => {
  if (!task?.due_date) return null;
  if (isOverdue) return "Overdue";
  if (isDueToday) return "Due today";
  return null;
}, [task?.due_date, isOverdue, isDueToday]);

const checkpointState = useMemo(() => {
  const status = (task?.status || "").toUpperCase();
  const startDate = task?.start_date;
  const dueDate = task?.due_date;
  const lastStatusUpdateAt = task?.last_status_update_at;

  if (!task || !startDate || !dueDate || status === "DONE") {
    return {
      behindSchedule: false,
      updateRequired: false,
    };
  }

  const totalMs =
    new Date(`${dueDate}T00:00:00`).getTime() -
    new Date(`${startDate}T00:00:00`).getTime();

  if (totalMs <= 0) {
    return {
      behindSchedule: false,
      updateRequired: false,
    };
  }

  const elapsedMs =
    new Date(`${clock.todayKey}T00:00:00`).getTime() -
    new Date(`${startDate}T00:00:00`).getTime();

  const progressRatio = Math.min(Math.max(elapsedMs / totalMs, 0), 1);

  let expectedStatus: "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE" = "TODO";

  if (progressRatio >= 1) {
    expectedStatus = "DONE";
  } else if (progressRatio >= 0.66) {
    expectedStatus = "IN_REVIEW";
  } else if (progressRatio >= 0.33) {
    expectedStatus = "IN_PROGRESS";
  }

  const statusRank: Record<string, number> = {
    TODO: 0,
    IN_PROGRESS: 1,
    IN_REVIEW: 2,
    DONE: 3,
  };

  const behindSchedule =
    (statusRank[status] ?? 0) < (statusRank[expectedStatus] ?? 0);

  const updateRequired = lastStatusUpdateAt
    ? Date.now() - new Date(lastStatusUpdateAt).getTime() >
      1000 * 60 * 60 * 24 * 2
    : true;

  return {
    behindSchedule,
    updateRequired,
  };
}, [task, clock.todayKey]);
  
  const getProfileName = (userId: string | null) => {
    if (!userId) return t("taskDetail.fallbacks.unknown");
    return profiles.find((profile) => profile.user_id === userId)?.full_name || t("taskDetail.fallbacks.unknown");
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
    if (!fullName) return t("taskDetail.fallbacks.userInitial");
    return fullName
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

    const assignableProfiles = useMemo(() => {
  return profiles.filter(
    (profile) =>
      (profile.role === "employee" || profile.role === "manager") &&
      profile.status === "active"
  );
}, [profiles]);

const availableEmployees = useMemo(() => {
  const existingMemberIds = new Set(taskMembers.map((member) => member.user_id));

  return assignableProfiles.filter((profile) => !existingMemberIds.has(profile.user_id));
}, [assignableProfiles, taskMembers]);

const visibleComments = useMemo(
  () => [...comments].slice(-50).reverse(),
  [comments]
);

const visibleActivity = useMemo(
  () => [...activity].slice(0, 100),
  [activity]
);
  
  const mentionCandidates = useMemo(() => {
    const candidateIds = Array.from(
      new Set([
        ...(task?.created_by ? [task.created_by] : []),
        ...taskMembers.map((member) => member.user_id),
      ])
    );

    return candidateIds
      .map((userId) => profiles.find((profile) => profile.user_id === userId))
      .filter((profile): profile is ProfileRow => Boolean(profile))
      .filter((profile) => profile.user_id !== currentUserId);
  }, [task, taskMembers, profiles, currentUserId]);

  const filteredMentionCandidates = useMemo(() => {
    if (!showMentionDropdown) return [];

    const q = mentionQuery.trim().toLowerCase();

    return mentionCandidates.filter((profile) => {
      const name = (profile.full_name || "").toLowerCase();
      if (!q) return true;
      return name.includes(q);
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

    const handleAddMember = async () => {
    if (!task || !selectedEmployeeId || !canManageMembers) return;

    const requestId = requestTracker.current.next();
    setMemberSaving(true);
    setError("");

    try {
      const { data, error: insertError } = await supabase
        .from("task_members")
        .insert({
          task_id: task.id,
          user_id: selectedEmployeeId,
          role: "assignee",
        })
        .select("id, task_id, user_id, role, created_at")
        .single();

      if (!requestTracker.current.isLatest(requestId)) return;

      if (insertError) {
        setError(insertError.message || t("taskDetail.members.errors.addFailed"));
        setMemberSaving(false);
        return;
      }

      setTaskMembers((prev) => [...prev, data as TaskMemberRow]);
      setSelectedEmployeeId("");
    } catch (err) {
      if (!requestTracker.current.isLatest(requestId)) return;
      console.error("Add task member error:", err);
      setError(t("taskDetail.members.errors.addFailed"));
    } finally {
      if (!requestTracker.current.isLatest(requestId)) return;
      setMemberSaving(false);
    }
  };

  const handleRemoveMember = async (member: TaskMemberRow) => {
    if (!task || !canManageMembers) return;

    const confirmed = window.confirm(
  t("taskDetail.members.confirmations.removeMember")
);
    if (!confirmed) return;

    const requestId = requestTracker.current.next();
    setMemberActionLoading(member.id);
    setError("");

    try {
      const { error: deleteError } = await supabase
        .from("task_members")
        .delete()
        .eq("id", member.id);

      if (!requestTracker.current.isLatest(requestId)) return;

      if (deleteError) {
        setError(deleteError.message || t("taskDetail.members.errors.removeFailed"));
        setMemberActionLoading(null);
        return;
      }

      setTaskMembers((prev) => prev.filter((item) => item.id !== member.id));
    } catch (err) {
      if (!requestTracker.current.isLatest(requestId)) return;
      console.error("Remove task member error:", err);
      setError(t("taskDetail.members.errors.removeFailed"));
    } finally {
      if (!requestTracker.current.isLatest(requestId)) return;
      setMemberActionLoading(null);
    }
  };  
  
const handleDelete = async () => {
    if (!task || !canDeleteTask) return;

    const confirmed = window.confirm(t("taskDetail.confirmations.deleteTask"));
    if (!confirmed) return;

    const requestId = requestTracker.current.next();
    setDeleteSaving(true);
    setError("");

    const { error: deleteError } = await supabase.from("tasks").delete().eq("id", task.id);

    if (!requestTracker.current.isLatest(requestId)) return;

    if (deleteError) {
      setError(deleteError.message || t("taskDetail.errors.deleteTask"));
      setDeleteSaving(false);
      return;
    }

    navigate("/tasks");
  };
      const handleAddComment = async () => {
    if (!task || !newComment.trim() || commentSaving) return;

    const requestId = requestTracker.current.next();
    setCommentSaving(true);
    setError("");

    try {
      const commentContent = newComment.trim();

      const { data, error: invokeError } = await supabase.functions.invoke(
        "task-comment-create",
        {
          body: {
            taskId: task.id,
            content: commentContent,
          },
        },
      );

      if (!requestTracker.current.isLatest(requestId)) return;

      if (invokeError) {
        setError(invokeError.message || t("taskDetail.errors.addComment"));
        return;
      }

      if (!data?.success || !data?.comment) {
        setError(data?.error || t("taskDetail.errors.addComment"));
        return;
      }

      
      setNewComment("");
      setMentionQuery("");
      setShowMentionDropdown(false);
    } catch (err) {
      if (!requestTracker.current.isLatest(requestId)) return;
      console.error("Add task comment error:", err);
      setError(t("taskDetail.errors.addComment"));
    } finally {
      if (!requestTracker.current.isLatest(requestId)) return;
      setCommentSaving(false);
    }
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
      setError(t("taskDetail.errors.commentEmpty"));
      return;
    }

    const requestId = requestTracker.current.next();
    setCommentActionLoading(comment.id);
    setError("");

    try {
      const nextContent = editingCommentText.trim();

      const { data, error: invokeError } = await supabase.functions.invoke(
        "task-comment-edit",
        {
          body: {
            commentId: comment.id,
            content: nextContent,
          },
        },
      );

      if (!requestTracker.current.isLatest(requestId)) return;

      if (invokeError) {
        setError(invokeError.message || t("taskDetail.errors.updateComment"));
        return;
      }

      if (!data?.success || !data?.comment) {
        setError(data?.error || t("taskDetail.errors.updateComment"));
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
    } catch (err) {
      if (!requestTracker.current.isLatest(requestId)) return;
      console.error("Edit task comment error:", err);
      setError(t("taskDetail.errors.updateComment"));
    } finally {
      if (!requestTracker.current.isLatest(requestId)) return;
      setCommentActionLoading(null);
    }
  };
    const handleDeleteComment = async (comment: TaskCommentRow) => {
    const confirmed = window.confirm(t("taskDetail.confirmations.deleteComment"));
    if (!confirmed) return;

    const requestId = requestTracker.current.next();
    setCommentActionLoading(comment.id);
    setError("");

    try {
      const { data, error: invokeError } = await supabase.functions.invoke(
        "task-comment-delete",
        {
          body: {
            commentId: comment.id,
          },
        },
      );

      if (!requestTracker.current.isLatest(requestId)) return;

      if (invokeError) {
        setError(invokeError.message || t("taskDetail.errors.deleteComment"));
        return;
      }

      if (!data?.success) {
        setError(data?.error || t("taskDetail.errors.deleteComment"));
        return;
      }

      setComments((prev) => prev.filter((item) => item.id !== comment.id));

      if (editingCommentId === comment.id) {
        setEditingCommentId(null);
        setEditingCommentText("");
      }
    } catch (err) {
      if (!requestTracker.current.isLatest(requestId)) return;
      console.error("Delete task comment error:", err);
      setError(t("taskDetail.errors.deleteComment"));
    } finally {
      if (!requestTracker.current.isLatest(requestId)) return;
      setCommentActionLoading(null);
    }
  };

    const handleTranslateComment = async (comment: TaskCommentRow) => {
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
      console.error("Task comment translate error:", err);
      setError("Failed to translate comment.");
    } finally {
      setTranslatingCommentId(null);
    }
  };

    const uploadTaskFile = async (file: File) => {
    if (!task || !project) return;

    const requestId = requestTracker.current.next();
    setError("");
    setIsUploading(true);

    try {
      const uploaded = (await uploadProjectOrTaskFile({
        file,
        entityType: "task",
        projectId: project.id,
        taskId: task.id,
      })) as FileUploadRow;

      if (!requestTracker.current.isLatest(requestId)) return;

      setFiles((prev) => [uploaded, ...prev]);

      const recipientIds = Array.from(
        new Set([
          ...(task.created_by ? [task.created_by] : []),
          ...taskMembers.map((member) => member.user_id),
        ])
      ).filter((userId) => userId !== currentUserId);

      for (const userId of recipientIds) {
        await createNotification({
          userId,
          actorUserId: currentUserId || undefined,
          type: "FILE_UPLOAD",
          title: t("taskDetail.notifications.fileUploadedTitle"),
          message: t(
            "taskDetail.notifications.fileUploadedMessage",
            undefined,
            {
              title: task.title,
              fileName: uploaded.file_name,
            }
          ),
          link: `/tasks/${task.id}`,
          entityType: "task_file",
          entityId: uploaded.id,
        });
      }

      if (!requestTracker.current.isLatest(requestId)) return;

      setIsUploadDialogOpen(false);
      setIsDragOverUploadZone(false);
    } catch (err: any) {
      if (!requestTracker.current.isLatest(requestId)) return;
      console.error("Task file upload error:", err);
      setError(err?.message || t("taskDetail.errors.uploadFile"));
    } finally {
      if (!requestTracker.current.isLatest(requestId)) return;
      setIsUploading(false);
      if (taskFileInputRef.current) {
        taskFileInputRef.current.value = "";
      }
    }
  };

  const handleTaskFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (!e.target.files || e.target.files.length === 0) return;
    await uploadTaskFile(e.target.files[0]);
  };

  const handleDeleteFile = async (fileId: string, filePath: string, fileName: string) => {
    if (!task) return;

    const confirmed = window.confirm(t("taskDetail.confirmations.deleteFile"));
    if (!confirmed) return;

    const requestId = requestTracker.current.next();

    try {
      await deleteUploadedFile(fileId, filePath, {
        projectId: task.project_id,
        taskId: task.id,
        fileName,
      });

      if (!requestTracker.current.isLatest(requestId)) return;
      setFiles((prev) => prev.filter((file) => file.id !== fileId));
    } catch (err: any) {
      if (!requestTracker.current.isLatest(requestId)) return;
      console.error("Delete task file error:", err);
      setError(err?.message || t("taskDetail.errors.deleteFile"));
    }
  };

if (isBootstrapping) {
  return (
    <div className="space-y-6">
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-64 rounded bg-slate-800" />
        <div className="h-4 w-40 rounded bg-slate-800" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {Array.from({ length: 3 }).map((_, index) => (
            <Card key={index} className="bg-slate-900/50 border-slate-800">
              <CardContent className="p-6">
                <div className="animate-pulse space-y-4">
                  <div className="h-5 w-40 rounded bg-slate-800" />
                  <div className="h-4 w-full rounded bg-slate-800" />
                  <div className="h-4 w-5/6 rounded bg-slate-800" />
                  <div className="h-4 w-3/4 rounded bg-slate-800" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="space-y-6">
          {Array.from({ length: 2 }).map((_, index) => (
            <Card key={index} className="bg-slate-900/50 border-slate-800">
              <CardContent className="p-6">
                <div className="animate-pulse space-y-4">
                  <div className="h-5 w-28 rounded bg-slate-800" />
                  <div className="h-4 w-full rounded bg-slate-800" />
                  <div className="h-4 w-4/5 rounded bg-slate-800" />
                  <div className="h-4 w-3/5 rounded bg-slate-800" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

    if (!task) return null;
  return (
    <>
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
            {project ? (
  t(
    "taskDetail.header.projectLabel",
    undefined,
    { name: project.name }
  )
) : (
  t("taskDetail.header.taskDetails")
)}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="border-slate-700 text-slate-300 hover:bg-slate-800"
            onClick={() => void loadTaskPage("refresh")}
            disabled={isRefreshing}
          >
            {isRefreshing ? t("taskDetail.actions.refreshing") : t("taskDetail.actions.refresh")}
          </Button>

          {canEditTask && (
            <Button
              variant="outline"
              onClick={() => navigate(`/tasks/${task.id}/edit`)}
              className="border-slate-700 text-slate-300 hover:bg-slate-800"
            >
              <Edit className="w-4 h-4 mr-2" />
              {t("taskDetail.actions.edit")}
            </Button>
          )}

          {canDeleteTask && (
            <Button
              variant="outline"
              onClick={() => void handleDelete()}
              disabled={deleteSaving}
              className="border-red-800 text-red-400 hover:bg-red-900/20"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {t("taskDetail.actions.delete")}
            </Button>
          )}
        </div>
      </div>

      {error && (
        <Alert className="bg-red-900/20 border-red-800 text-red-300">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

            <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
                       <TabsList className="bg-slate-900 border border-slate-800 flex-wrap h-auto">
              <TabsTrigger value="overview" className="data-[state=active]:bg-slate-800">
                Overview
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

            <TabsContent value="overview" className="mt-4">
              <div className="max-h-[calc(100vh-420px)] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-700 hover:scrollbar-thumb-slate-600">
                <div className="space-y-6">

                                    <Card className="bg-slate-900/50 border-slate-800">
                    <CardHeader>
                      <CardTitle className="text-white">{t("taskDetail.overview.title")}</CardTitle>
                    </CardHeader>

                    <CardContent className="space-y-5">
                      <div className="flex flex-wrap gap-2">
                        <Badge className={getStatusColor(task.status)}>{task.status || "-"}</Badge>
                        <Badge className={getPriorityColor(task.priority)}>{task.priority || "LOW"}</Badge>

                        {task.due_date && (
                          <Badge className={dueDateBadgeClassName}>
                            {dueDateLabel ? `${dueDateLabel} • ${dueDateDisplay}` : dueDateDisplay}
                          </Badge>
                        )}

                        {checkpointState.behindSchedule && (
                          <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                            Behind Schedule
                          </Badge>
                        )}

                        {checkpointState.updateRequired && (
                          <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                            Update Required
                          </Badge>
                        )}
                      </div>

                      <div>
                        <p className="text-slate-300 whitespace-pre-wrap">
                          {task.description || t("taskDetail.fallbacks.noDescription")}
                        </p>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-slate-400 text-sm">{t("taskDetail.overview.progress")}</span>
                          <span className="text-white text-sm">{progressValue}%</span>
                        </div>
                        <Progress value={progressValue} className="h-2 bg-slate-800" />
                      </div>

                      {canUpdateStatus && (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="text-slate-300 text-sm font-medium">
                              {t("taskDetail.overview.updateStatus")}
                            </div>

                            <Badge className={getStatusColor(task.status)}>
                              {task.status || "-"}
                            </Badge>
                          </div>

                          <div className="flex gap-2">
                            {[
                              { value: "IN_PROGRESS", label: t("taskDetail.status.inProgress") },
                              { value: "IN_REVIEW", label: t("taskDetail.status.inReview") },
                              { value: "DONE", label: t("taskDetail.status.done") },
                            ].map((statusOption) => {
                              const isActive =
                                (task.status || "").toUpperCase() === statusOption.value;

                              return (
                                <button
                                  key={statusOption.value}
                                  disabled={statusSaving}
                                  onClick={() => {
                                    if (isActive) return;
                                    setPendingStatus(statusOption.value);
                                    setStatusModalOpen(true);
                                  }}
                                  className={`
                                    flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all
                                    border
                                    ${
                                      isActive
                                        ? "bg-indigo-600 text-white border-indigo-500"
                                        : "bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800 hover:text-white"
                                    }
                                  `}
                                >
                                  {statusOption.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                  

                            </div>
              </div>
            </TabsContent>

            <TabsContent value="files" className="mt-4">
              <div className="max-h-[calc(100vh-420px)] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-700 hover:scrollbar-thumb-slate-600">
                <div className="space-y-6">
                  <Card className="bg-slate-900/50 border-slate-800">
                    <CardHeader>
                      <div className="flex items-center justify-between gap-4">
                        <CardTitle className="text-white">{t("taskDetail.files.title")}</CardTitle>

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
                    onClick={() => setIsUploadDialogOpen(true)}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {isUploading ? t("taskDetail.files.uploading") : t("taskDetail.files.uploadFile")}
                  </Button>

                  <Dialog
                    open={isUploadDialogOpen}
                    onOpenChange={(open) => {
                      if (isUploading) return;
                      setIsUploadDialogOpen(open);
                      if (!open) {
                        setIsDragOverUploadZone(false);
                        if (taskFileInputRef.current) {
                          taskFileInputRef.current.value = "";
                        }
                      }
                    }}
                  >
                    <DialogContent className="bg-slate-950 border-slate-800 text-white max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>{t("taskDetail.files.uploadFile")}</DialogTitle>
                      </DialogHeader>

                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          if (!isUploading) {
                            taskFileInputRef.current?.click();
                          }
                        }}
                        onKeyDown={(e) => {
                          if (isUploading) return;
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            taskFileInputRef.current?.click();
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
                            void uploadTaskFile(droppedFile);
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
                          Drag files here to upload
                        </h4>

                        <p className="mt-2 text-sm text-slate-400">
                          Or click to choose a file from your computer
                        </p>

                        <div className="mt-6">
                          <Button
                            type="button"
                            variant="outline"
                            className="border-slate-700 text-slate-300 hover:bg-slate-800"
                            disabled={isUploading}
                            onClick={(e) => {
                              e.stopPropagation();
                              taskFileInputRef.current?.click();
                            }}
                          >
                            <Upload className="w-4 h-4 mr-2" />
                            Choose File
                          </Button>
                        </div>

                        {isUploading && (
                          <p className="mt-4 text-sm text-indigo-300">
                            {t("taskDetail.files.uploading")}
                          </p>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>
                </>
              </div>
            </CardHeader>

            <CardContent>
              {files.length === 0 ? (
                <p className="text-slate-500">{t("taskDetail.files.empty")}</p>
              ) : (
                <div className="space-y-3">
                  {files.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center gap-4 rounded-lg border border-slate-800 bg-slate-950/50 p-3"
                    >
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        <FileText className="h-5 w-5 shrink-0 text-indigo-400" />

                        <div className="min-w-0">
                          <p className="truncate text-sm text-white">{file.file_name}</p>
                          <p className="text-xs text-slate-500">
                            {getProfileName(file.user_id)} •{" "}
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
                              setError("Failed to open file.");
                            } finally {
                              setFileActionLoading(null);
                            }
                          }}
                          disabled={fileActionLoading === file.id}
                        >
                          <ExternalLink className="mr-2 h-4 w-4" />
                          {t("taskDetail.files.open")}
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
                              setError("Failed to download file.");
                            } finally {
                              setFileActionLoading(null);
                            }
                          }}
                          disabled={fileActionLoading === file.id}
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Download
                        </Button>

                        {canDeleteThisFile(file) && (
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
                            {t("taskDetail.actions.delete")}
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
                            </Card>
                </div>
              </div>
            </TabsContent>

                        <TabsContent value="discussion" className="mt-4">
              <div className="max-h-[calc(100vh-420px)] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-700 hover:scrollbar-thumb-slate-600">
                <div className="space-y-6">
                  <Card className="bg-slate-900/50 border-slate-800">
                    <CardHeader>
                      <div className="flex items-center gap-2">
                        <MessageSquare className="w-5 h-5 text-indigo-400" />
                        <CardTitle className="text-white">{t("taskDetail.discussion.title")}</CardTitle>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-5">
                      <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                        <div className="mb-2">
                          <p className="text-sm font-medium text-white">{t("taskDetail.discussion.addUpdate")}</p>
                          <p className="text-xs text-slate-500">
                            {t("taskDetail.discussion.addUpdateHelper")}
                          </p>
                        </div>

                        <Textarea
                          placeholder={t("taskDetail.discussion.placeholder")}
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
                                {t("taskDetail.discussion.noMatchingParticipants")}
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
                                      {profile.full_name || t("taskDetail.fallbacks.unknown")}
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
                            {t("taskDetail.discussion.visibilityNote")}
                          </p>

                          <Button
                            type="button"
                            onClick={() => void handleAddComment()}
                            disabled={commentSaving || !newComment.trim()}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white"
                          >
                            <Send className="w-4 h-4 mr-2" />
                            {commentSaving ? t("taskDetail.discussion.posting") : t("taskDetail.discussion.postUpdate")}
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-4">
                        {comments.length === 0 ? (
                          <div className="rounded-xl border border-dashed border-slate-800 bg-slate-950/40 p-8 text-center">
                            <MessageSquare className="mx-auto mb-3 h-10 w-10 text-slate-600" />
                            <p className="text-white font-medium">{t("taskDetail.discussion.emptyTitle")}</p>
                            <p className="mt-1 text-sm text-slate-500">
                              {t("taskDetail.discussion.emptyDescription")}
                            </p>
                          </div>
                        ) : (
                          visibleComments.map((comment) => {
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
                                            {t("taskDetail.discussion.you")}
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
                                        {t("taskDetail.actions.edit")}
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
                                        {t("taskDetail.actions.delete")}
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
                                          {t("taskDetail.actions.save")}
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
                                          {t("taskDetail.actions.cancel")}
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
                </div>
              </div>
            </TabsContent>

            <TabsContent value="activity" className="mt-4">
              <div className="max-h-[calc(100vh-420px)] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-700 hover:scrollbar-thumb-slate-600">
                <div className="space-y-6">
                  <Card className="bg-slate-900/50 border-slate-800">
                    <CardHeader>
                      <div className="flex items-center gap-2">
                        <Clock3 className="w-5 h-5 text-indigo-400" />
                        <CardTitle className="text-white">Activity</CardTitle>
                      </div>
                    </CardHeader>

                    <CardContent>
                      {visibleActivity.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-slate-800 bg-slate-950/40 p-8 text-center">
                          <Clock3 className="mx-auto mb-3 h-10 w-10 text-slate-600" />
                          <p className="text-white font-medium">No activity yet</p>
                          <p className="mt-1 text-sm text-slate-500">
                            System actions will appear here in real time.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {visibleActivity.map((item) => {
                            const actorName = getProfileName(item.user_id);

                            return (
                              <div
                                key={item.id}
                                className="rounded-xl border border-slate-800 bg-slate-950/50 p-4"
                              >
                                <div className="flex items-start gap-3">
                                  <div className="mt-1 flex h-9 w-9 items-center justify-center rounded-full bg-slate-800 text-xs font-medium text-white">
                                    {getInitials(actorName)}
                                  </div>

                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <p className="text-sm font-medium text-white">
                                        {actorName}
                                      </p>

                                      <Badge className="bg-slate-800 text-slate-300 text-[10px] px-2 py-0.5">
                                        {item.action_type}
                                      </Badge>
                                    </div>

                                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-200">
                                      {item.message || "System activity"}
                                    </p>

                                    <div className="mt-2 flex items-center gap-1 text-xs text-slate-500">
                                      <Clock3 className="h-3 w-3" />
                                      <span>
                                        {format(clock.shiftDate(item.created_at), "MMM d, yyyy • h:mm a")}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-6">
          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white">{t("taskDetail.details.title")}</CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              <InfoRow
                icon={<FolderKanban className="w-4 h-4 text-indigo-400" />}
                label={t("taskDetail.details.project")}
                value={project?.name || t("taskDetail.fallbacks.noProject")}
              />
              <InfoRow
                icon={<Flag className="w-4 h-4 text-amber-400" />}
                label={t("taskDetail.details.priority")}
                value={task.priority || "LOW"}
              />
              <InfoRow
                icon={<CheckSquare className="w-4 h-4 text-blue-400" />}
                label={t("taskDetail.details.status")}
                value={task.status || "-"}
              />
              <InfoRow
  icon={<Calendar className="w-4 h-4 text-green-400" />}
  label={t("taskDetail.details.dueDate")}
  value={dueDateDisplay}
  valueClassName={
    isOverdue
      ? "text-red-400"
      : isDueToday
        ? "text-amber-400"
        : "text-white"
  }
/>
            </CardContent>
          </Card>

                    <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader>
              <div className="flex items-center justify-between gap-4">
                <CardTitle className="text-white">{t("taskDetail.members.title")}</CardTitle>

                {canManageMembers && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="border-slate-700 text-slate-300 hover:bg-slate-800"
                    onClick={() => setShowManageMembers((prev) => !prev)}
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    {showManageMembers
  ? t("taskDetail.members.actions.close")
  : t("taskDetail.members.actions.addRemove")}
                  </Button>
                )}
              </div>
            </CardHeader>

                                   <CardContent className="space-y-3">
              {canManageMembers && showManageMembers && (
                <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-3 space-y-3">
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-slate-300">
                      {t("taskDetail.members.actions.addMember")}
                    </div>

                    <div className="flex flex-col gap-2">
                      <Select
                        value={selectedEmployeeId}
                        onValueChange={setSelectedEmployeeId}
                        disabled={memberSaving}
                      >
                        <SelectTrigger className="w-full bg-slate-900 border-slate-700 text-white">
                          <SelectValue
                            placeholder={t("taskDetail.members.actions.selectMember")}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {availableEmployees.length === 0 ? (
                            <SelectItem value="__no_employees__" disabled>
                              {t("taskDetail.members.actions.noAvailableMembers")}
                            </SelectItem>
                          ) : (
                            availableEmployees.map((profile) => (
                              <SelectItem key={profile.user_id} value={profile.user_id}>
                                {profile.full_name || t("taskDetail.fallbacks.unknown")}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>

                      <Button
                        type="button"
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
                        onClick={() => void handleAddMember()}
                        disabled={memberSaving || !selectedEmployeeId}
                      >
                        <UserPlus className="w-4 h-4 mr-2" />
                        {memberSaving
                          ? t("taskDetail.members.actions.adding")
                          : t("taskDetail.members.actions.add")}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {taskMembers.length === 0 ? (
                <p className="text-slate-500">{t("taskDetail.members.empty")}</p>
              ) : (
                taskMembers.map((member) => (
                  <div key={member.id} className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <span className="text-white">{getProfileName(member.user_id)}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge className="bg-slate-800 text-slate-300">{member.role}</Badge>

                      {canManageMembers && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="border-red-800 text-red-400 hover:bg-red-900/20"
                          onClick={() => void handleRemoveMember(member)}
                          disabled={memberActionLoading === member.id}
                        >
                          <UserMinus className="w-3 h-3 mr-1" />
                          {t("taskDetail.members.actions.remove")}
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>  
    </div>
      
 <Dialog open={statusModalOpen} onOpenChange={setStatusModalOpen}>
  <DialogContent className="bg-slate-950 border-slate-800 text-white">
    <DialogHeader>
      <DialogTitle>Update Status</DialogTitle>
    </DialogHeader>

    <div className="space-y-4">
      <div className="text-sm text-slate-400">
        New status: <span className="text-white">{pendingStatus}</span>
      </div>

      <Textarea
        placeholder="Write what you did / progress update..."
        value={statusRemark}
        onChange={(e) => setStatusRemark(e.target.value)}
        rows={4}
        className="bg-slate-900 border-slate-800 text-white"
      />

      <Button
        disabled={statusSaving || statusRemark.trim().length < 5}
        className="w-full bg-indigo-600 hover:bg-indigo-700"
        onClick={async () => {
          if (!pendingStatus || !task) return;

          setStatusSaving(true);

          const { error } = await supabase.functions.invoke(
            "task-status-update",
            {
              body: {
                taskId: task.id,
                status: pendingStatus,
                remark: statusRemark,
              },
            }
          );

          if (error) {
            setError("Failed to update status");
          } else {
            setStatusModalOpen(false);
setStatusRemark("");
setPendingStatus(null);
setError("");
          }

          setStatusSaving(false);
        }}
      >
        {statusSaving ? "Updating..." : "Confirm Update"}
      </Button>
    </div>
  </DialogContent>
    </Dialog>
     </>
  );
}
