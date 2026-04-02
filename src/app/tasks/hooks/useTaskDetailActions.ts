import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { createNotification } from "@/lib/notifications";
import { uploadProjectOrTaskFile, deleteUploadedFile } from "@/lib/file-upload";
import { openFile, downloadFile } from "@/lib/file-actions";
import { smartTranslate } from "@/lib/smartTranslate";

import type {
  TaskRow,
  TaskMemberRow,
  TaskCommentRow,
  FileUploadRow,
  TranslatedComment,
} from "../lib/task.types";

interface Tracker {
  current: {
    next: () => number;
    isLatest: (id: number) => boolean;
  };
}

export function useTaskDetailActions(
  task: TaskRow | null,
  currentUserId: string | null,
  t: (key: string, options?: object) => string,
  requestTracker: Tracker,
  setError: (error: string) => void,
  setTaskMembers: React.Dispatch<React.SetStateAction<TaskMemberRow[]>>,
  setComments: React.Dispatch<React.SetStateAction<TaskCommentRow[]>>,
  setFiles: React.Dispatch<React.SetStateAction<FileUploadRow[]>>,
  setTranslatedComments: React.Dispatch<
    React.SetStateAction<Record<string, TranslatedComment>>
  >
) {
  const navigate = useNavigate();

  // =========================
  // STATE
  // =========================

  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);
  const [statusRemark, setStatusRemark] = useState("");
  const [statusSaving, setStatusSaving] = useState(false);

  const [memberSaving, setMemberSaving] = useState(false);
  const [memberActionLoading, setMemberActionLoading] = useState<string | null>(null);

  const [deleteSaving, setDeleteSaving] = useState(false);

  const [isUploading, setIsUploading] = useState(false);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [fileActionLoading, setFileActionLoading] = useState<string | null>(null);

  const [commentSaving, setCommentSaving] = useState(false);
  const [commentActionLoading, setCommentActionLoading] = useState<string | null>(null);
  const [translatingCommentId, setTranslatingCommentId] = useState<string | null>(null);

  const [newComment, setNewComment] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState("");

  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");

  const [isDragOverUploadZone, setIsDragOverUploadZone] = useState(false);

  // =========================
  // HELPERS
  // =========================

  const safeExecute = async (fn: () => Promise<void>) => {
    const requestId = requestTracker.current.next();

    try {
      await fn();
    } catch (err: any) {
      if (!requestTracker.current.isLatest(requestId)) return;
      console.error("TaskDetailAction error:", err);
      setError(err?.message || "Unexpected error");
    }
  };

  // =========================
  // STATUS
  // =========================

  const handleStatusUpdate = useCallback(async () => {
    if (!task || !pendingStatus) return;

    setStatusSaving(true);
    setError("");

    await safeExecute(async () => {
      const { error } = await supabase.functions.invoke("task-status-update", {
        body: { taskId: task.id, status: pendingStatus, remark: statusRemark },
      });

      if (error) throw error;

      setStatusModalOpen(false);
      setPendingStatus(null);
      setStatusRemark("");
    });

    setStatusSaving(false);
  }, [task, pendingStatus, statusRemark]);

  // =========================
  // DELETE TASK
  // =========================

  const handleDeleteTask = useCallback(async () => {
    if (!task) return;

    const confirmed = window.confirm(t("taskDetail.confirmations.deleteTask"));
    if (!confirmed) return;

    setDeleteSaving(true);
    setError("");

    await safeExecute(async () => {
      const { error } = await supabase
        .from("tasks")
        .delete()
        .eq("id", task.id);

      if (error) throw error;

      navigate("/tasks");
    });

    setDeleteSaving(false);
  }, [task, navigate, t]);

  // =========================
  // MEMBERS
  // =========================

  const handleAddMember = useCallback(
    async (userId: string) => {
      if (!task) return;

      setMemberSaving(true);
      setError("");

      await safeExecute(async () => {
        const { data, error } = await supabase
          .from("task_members")
          .insert({
            task_id: task.id,
            user_id: userId,
            role: "assignee",
          })
          .select()
          .single();

        if (error) throw error;

        setTaskMembers((prev) => [...prev, data]);

        await createNotification({
          userId,
          actorUserId: currentUserId || undefined,
          type: "TASK_ASSIGNED",
          title: t("taskDetail.notifications.assignedTitle"),
          message: t("taskDetail.notifications.assignedMessage", {
            title: task.title,
          }),
          link: `/tasks/${task.id}`,
          entityType: "task",
          entityId: task.id,
        });
      });

      setMemberSaving(false);
    },
    [task, currentUserId, t]
  );

  const handleRemoveMember = useCallback(
    async (member: TaskMemberRow) => {
      if (!task) return;

      const confirmed = window.confirm(
        t("taskDetail.members.confirmations.removeMember")
      );
      if (!confirmed) return;

      setMemberActionLoading(member.id);
      setError("");

      await safeExecute(async () => {
        const { error } = await supabase
          .from("task_members")
          .delete()
          .eq("id", member.id);

        if (error) throw error;

        setTaskMembers((prev) =>
          prev.filter((m) => m.id !== member.id)
        );
      });

      setMemberActionLoading(null);
    },
    [task, t]
  );

  // =========================
  // FILES
  // =========================

  const handleFileUpload = useCallback(
    async (file: File, projectId: string) => {
      if (!task) return;

      setIsUploading(true);
      setError("");

      await safeExecute(async () => {
        const uploaded = await uploadProjectOrTaskFile({
          file,
          entityType: "task",
          projectId,
          taskId: task.id,
        });

        setFiles((prev) => [uploaded as FileUploadRow, ...prev]);
      });

      setIsUploading(false);
      setIsUploadDialogOpen(false);
    },
    [task]
  );

  const handleDeleteFile = useCallback(
    async (file: FileUploadRow) => {
      if (!task) return;

      const confirmed = window.confirm(
        t("taskDetail.confirmations.deleteFile")
      );
      if (!confirmed) return;

      await safeExecute(async () => {
        await deleteUploadedFile(file.id, file.file_path, {
          projectId: task.project_id,
          taskId: task.id,
          fileName: file.file_name,
        });

        setFiles((prev) => prev.filter((f) => f.id !== file.id));
      });
    },
    [task, t]
  );

  const handleOpenFile = async (file: FileUploadRow) => {
    setFileActionLoading(file.id);
    try {
      await openFile("project-files", file.file_path, file.id);
    } catch {
      setError(t("taskDetail.errors.openFile"));
    } finally {
      setFileActionLoading(null);
    }
  };

  const handleDownloadFile = async (file: FileUploadRow) => {
    setFileActionLoading(file.id);
    try {
      await downloadFile("project-files", file.file_path, file.file_name);
    } catch {
      setError(t("taskDetail.errors.downloadFile"));
    } finally {
      setFileActionLoading(null);
    }
  };

  // =========================
  // COMMENTS
  // =========================

  const handleAddComment = useCallback(async () => {
    if (!task || !newComment.trim()) return;

    setCommentSaving(true);
    setError("");

    await safeExecute(async () => {
      const { data, error } = await supabase.functions.invoke(
        "task-comment-create",
        {
          body: {
            taskId: task.id,
            content: newComment.trim(),
          },
        }
      );

      if (error || !data?.success) {
        throw new Error(data?.error);
      }

      setNewComment("");
      setMentionQuery("");
      setShowMentionDropdown(false);
    });

    setCommentSaving(false);
  }, [task, newComment]);

  const handleTranslateComment = async (comment: TaskCommentRow) => {
    if (!comment.content) return;

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
    } catch {
      setError(t("taskDetail.errors.translateComment"));
    } finally {
      setTranslatingCommentId(null);
    }
  };

  // =========================
  // MENTION SYSTEM
  // =========================

  const handleCommentInputChange = (value: string) => {
    setNewComment(value);

    const match = value.match(/@([a-zA-Z0-9 _-]*)$/);

    if (match) {
      setMentionQuery((match[1] || "").trimStart());
      setShowMentionDropdown(true);
    } else {
      setMentionQuery("");
      setShowMentionDropdown(false);
    }
  };

  const insertMention = (name: string) => {
    const safe = name.trim();
    if (!safe) return;

    setNewComment((prev) =>
      prev.replace(/@([a-zA-Z0-9 _-]*)$/, `@${safe} `)
    );

    setMentionQuery("");
    setShowMentionDropdown(false);
  };

  // =========================
  // RETURN
  // =========================

  return {
    // status
    statusModalOpen,
    setStatusModalOpen,
    pendingStatus,
    setPendingStatus,
    statusRemark,
    setStatusRemark,
    statusSaving,
    handleStatusUpdate,

    // delete
    deleteSaving,
    handleDeleteTask,

    // members
    memberSaving,
    memberActionLoading,
    handleAddMember,
    handleRemoveMember,

    // files
    isUploading,
    isUploadDialogOpen,
    setIsUploadDialogOpen,
    fileActionLoading,
    isDragOverUploadZone,
    setIsDragOverUploadZone,
    handleFileUpload,
    handleDeleteFile,
    handleOpenFile,
    handleDownloadFile,

    // comments
    newComment,
    setNewComment,
    editingCommentId,
    setEditingCommentId,
    editingCommentText,
    setEditingCommentText,
    commentSaving,
    commentActionLoading,
    translatingCommentId,
    showMentionDropdown,
    mentionQuery,
    handleAddComment,
    handleTranslateComment,
    handleCommentInputChange,
    insertMention,
  };
}
