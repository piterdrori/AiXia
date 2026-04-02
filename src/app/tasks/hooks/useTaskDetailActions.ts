import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { supabase } from "@/lib/supabase";
import { createNotification } from "@/lib/notifications";
import { uploadProjectOrTaskFile, deleteUploadedFile } from "@/lib/file-upload";
import { openFile, downloadFile } from "@/lib/file-actions";
import { smartTranslate } from "@/lib/smartTranslate";

import type {
  FileUploadRow,
  TaskCommentRow,
  TaskMemberRow,
  TaskRow,
  TranslatedComment,
} from "../lib/task.types";

type TranslateFn = (
  key: string,
  fallback?: string,
  params?: Record<string, string | number>,
) => string;

interface RequestTrackerRef {
  current: {
    next: () => number;
    isLatest: (id: number) => boolean;
  };
}

export function useTaskDetailActions(
  task: TaskRow | null,
  currentUserId: string | null,
  t: TranslateFn,
  requestTracker: RequestTrackerRef,
  setError: (error: string) => void,
  setTaskMembers: React.Dispatch<React.SetStateAction<TaskMemberRow[]>>,
  setComments: React.Dispatch<React.SetStateAction<TaskCommentRow[]>>,
  setFiles: React.Dispatch<React.SetStateAction<FileUploadRow[]>>,
  setTranslatedComments: React.Dispatch<
    React.SetStateAction<Record<string, TranslatedComment>>
  >,
) {
  const navigate = useNavigate();

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
  const [isDragOverUploadZone, setIsDragOverUploadZone] = useState(false);

  const [commentSaving, setCommentSaving] = useState(false);
  const [commentActionLoading, setCommentActionLoading] = useState<string | null>(
    null,
  );
  const [translatingCommentId, setTranslatingCommentId] = useState<string | null>(
    null,
  );

  const [showManageMembers, setShowManageMembers] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState("");
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");

  const handleStatusUpdate = async () => {
    if (!pendingStatus || !task) return;

    const requestId = requestTracker.current.next();
    setStatusSaving(true);
    setError("");

    try {
      const { error } = await supabase.functions.invoke("task-status-update", {
        body: {
          taskId: task.id,
          status: pendingStatus,
          remark: statusRemark,
        },
      });

      if (!requestTracker.current.isLatest(requestId)) return;
      if (error) throw error;

      setStatusModalOpen(false);
      setStatusRemark("");
      setPendingStatus(null);
    } catch (err) {
      if (!requestTracker.current.isLatest(requestId)) return;
      console.error("handleStatusUpdate error:", err);
      setError(t("taskDetail.errors.updateStatus"));
    } finally {
      if (!requestTracker.current.isLatest(requestId)) return;
      setStatusSaving(false);
    }
  };

  const handleDeleteTask = async () => {
    if (!task) return;

    const confirmed = window.confirm(t("taskDetail.confirmations.deleteTask"));
    if (!confirmed) return;

    const requestId = requestTracker.current.next();
    setDeleteSaving(true);
    setError("");

    try {
      const { error: deleteError } = await supabase
        .from("tasks")
        .delete()
        .eq("id", task.id);

      if (!requestTracker.current.isLatest(requestId)) return;

      if (deleteError) {
        setError(deleteError.message || t("taskDetail.errors.deleteTask"));
        return;
      }

      navigate("/tasks");
    } catch (err) {
      if (!requestTracker.current.isLatest(requestId)) return;
      console.error("handleDeleteTask error:", err);
      setError(t("taskDetail.errors.deleteTask"));
    } finally {
      if (!requestTracker.current.isLatest(requestId)) return;
      setDeleteSaving(false);
    }
  };

  const handleAddMember = async (
    selectedEmployeeId: string,
    canManageMembers: boolean,
  ) => {
    if (!task || !selectedEmployeeId || !canManageMembers) return;

    const requestId = requestTracker.current.next();
    setMemberSaving(true);
    setError("");

    try {
      const { data, error } = await supabase
        .from("task_members")
        .insert({
          task_id: task.id,
          user_id: selectedEmployeeId,
          role: "assignee",
        })
        .select("id, task_id, user_id, role, created_at")
        .single();

      if (!requestTracker.current.isLatest(requestId)) return;
      if (error) throw error;

      await createNotification({
        userId: selectedEmployeeId,
        actorUserId: currentUserId || undefined,
        type: "TASK_ASSIGNED",
        title: t("taskDetail.notifications.assignedTitle"),
        message: task.title,
        link: `/tasks/${task.id}`,
        entityType: "task",
        entityId: task.id,
      });

      setTaskMembers((prev) => [...prev, data as TaskMemberRow]);
    } catch (err) {
      if (!requestTracker.current.isLatest(requestId)) return;
      console.error("handleAddMember error:", err);
      setError(t("taskDetail.members.errors.addFailed"));
    } finally {
      if (!requestTracker.current.isLatest(requestId)) return;
      setMemberSaving(false);
    }
  };

  const handleRemoveMember = async (
    member: TaskMemberRow,
    canManageMembers: boolean,
  ) => {
    if (!task || !canManageMembers) return;

    const confirmed = window.confirm(
      t("taskDetail.members.confirmations.removeMember"),
    );
    if (!confirmed) return;

    const requestId = requestTracker.current.next();
    setMemberActionLoading(member.id);
    setError("");

    try {
      const { error } = await supabase
        .from("task_members")
        .delete()
        .eq("id", member.id);

      if (!requestTracker.current.isLatest(requestId)) return;
      if (error) throw error;

      await createNotification({
        userId: member.user_id,
        actorUserId: currentUserId || undefined,
        type: "TASK_UPDATED",
        title: t("taskDetail.notifications.removedTitle"),
        message: task.title,
        link: `/tasks/${task.id}`,
        entityType: "task",
        entityId: task.id,
      });

      setTaskMembers((prev) => prev.filter((item) => item.id !== member.id));
    } catch (err) {
      if (!requestTracker.current.isLatest(requestId)) return;
      console.error("handleRemoveMember error:", err);
      setError(t("taskDetail.members.errors.removeFailed"));
    } finally {
      if (!requestTracker.current.isLatest(requestId)) return;
      setMemberActionLoading(null);
    }
  };

  const handleFileUpload = async (file: File, projectId: string) => {
    if (!task) return;

    const requestId = requestTracker.current.next();
    setError("");
    setIsUploading(true);

    try {
      const uploaded = await uploadProjectOrTaskFile({
        file,
        entityType: "task",
        projectId,
        taskId: task.id,
      });

      if (!requestTracker.current.isLatest(requestId)) return;

      setFiles((prev) => [uploaded as FileUploadRow, ...prev]);
      setIsUploadDialogOpen(false);
      setIsDragOverUploadZone(false);
    } catch (err: any) {
      if (!requestTracker.current.isLatest(requestId)) return;
      console.error("handleFileUpload error:", err);
      setError(err?.message || t("taskDetail.errors.uploadFile"));
    } finally {
      if (!requestTracker.current.isLatest(requestId)) return;
      setIsUploading(false);
    }
  };

  const handleDeleteFile = async (file: FileUploadRow) => {
    if (!task) return;

    const confirmed = window.confirm(t("taskDetail.confirmations.deleteFile"));
    if (!confirmed) return;

    const requestId = requestTracker.current.next();
    setFileActionLoading(file.id);
    setError("");

    try {
      await deleteUploadedFile(file.id, file.file_path, {
        projectId: task.project_id,
        taskId: task.id,
        fileName: file.file_name,
      });

      if (!requestTracker.current.isLatest(requestId)) return;
      setFiles((prev) => prev.filter((f) => f.id !== file.id));
    } catch (err: any) {
      if (!requestTracker.current.isLatest(requestId)) return;
      console.error("handleDeleteFile error:", err);
      setError(err?.message || t("taskDetail.errors.deleteFile"));
    } finally {
      if (!requestTracker.current.isLatest(requestId)) return;
      setFileActionLoading(null);
    }
  };

  const handleOpenFile = async (file: FileUploadRow) => {
    setFileActionLoading(file.id);
    try {
      await openFile("project-files", file.file_path, file.id);
    } catch (err) {
      console.error("handleOpenFile error:", err);
      setError(t("taskDetail.errors.openFile"));
    } finally {
      setFileActionLoading(null);
    }
  };

  const handleDownloadFile = async (file: FileUploadRow) => {
    setFileActionLoading(file.id);
    try {
      await downloadFile("project-files", file.file_path, file.file_name);
    } catch (err) {
      console.error("handleDownloadFile error:", err);
      setError(t("taskDetail.errors.downloadFile"));
    } finally {
      setFileActionLoading(null);
    }
  };

  const handleAddComment = async () => {
    if (!task || !newComment.trim()) return;

    const requestId = requestTracker.current.next();
    setCommentSaving(true);
    setError("");

    try {
      const { data, error: invokeError } = await supabase.functions.invoke(
        "task-comment-create",
        {
          body: { taskId: task.id, content: newComment.trim() },
        },
      );

      if (!requestTracker.current.isLatest(requestId)) return;
      if (invokeError) throw invokeError;
      if (!data?.success) throw new Error(data?.error);

      if (data.comment) {
        setComments((prev) => [...prev, data.comment as TaskCommentRow]);
      }

      setNewComment("");
      setMentionQuery("");
      setShowMentionDropdown(false);
    } catch (err) {
      if (!requestTracker.current.isLatest(requestId)) return;
      console.error("handleAddComment error:", err);
      setError(t("taskDetail.errors.addComment"));
    } finally {
      if (!requestTracker.current.isLatest(requestId)) return;
      setCommentSaving(false);
    }
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
      const { data, error } = await supabase.functions.invoke("task-comment-edit", {
        body: { commentId: comment.id, content: editingCommentText.trim() },
      });

      if (!requestTracker.current.isLatest(requestId)) return;
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error);

      setComments((prev) =>
        prev.map((item) =>
          item.id === comment.id
            ? { ...item, content: data.comment?.content || editingCommentText.trim() }
            : item,
        ),
      );
      setEditingCommentId(null);
      setEditingCommentText("");
    } catch (err) {
      if (!requestTracker.current.isLatest(requestId)) return;
      console.error("handleSaveEditedComment error:", err);
      setError(t("taskDetail.errors.updateComment"));
    } finally {
      if (!requestTracker.current.isLatest(requestId)) return;
      setCommentActionLoading(null);
    }
  };

  const handleDeleteComment = async (comment: TaskCommentRow) => {
    const confirmed = window.confirm(
      t("taskDetail.confirmations.deleteComment"),
    );
    if (!confirmed) return;

    const requestId = requestTracker.current.next();
    setCommentActionLoading(comment.id);
    setError("");

    try {
      const { data, error } = await supabase.functions.invoke(
        "task-comment-delete",
        {
          body: { commentId: comment.id },
        },
      );

      if (!requestTracker.current.isLatest(requestId)) return;
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error);

      setComments((prev) => prev.filter((item) => item.id !== comment.id));

      if (editingCommentId === comment.id) {
        setEditingCommentId(null);
        setEditingCommentText("");
      }
    } catch (err) {
      if (!requestTracker.current.isLatest(requestId)) return;
      console.error("handleDeleteComment error:", err);
      setError(t("taskDetail.errors.deleteComment"));
    } finally {
      if (!requestTracker.current.isLatest(requestId)) return;
      setCommentActionLoading(null);
    }
  };

  const handleTranslateComment = async (comment: TaskCommentRow) => {
    if (!comment.content) return;

    setTranslatedComments((prev) => {
      const next = { ...prev };
      if (next[comment.id]) {
        delete next[comment.id];
        return next;
      }
      return prev;
    });

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
      console.error("handleTranslateComment error:", err);
      setError(t("taskDetail.errors.translateComment"));
    } finally {
      setTranslatingCommentId(null);
    }
  };

  const handleCommentInputChange = (value: string) => {
    if (editingCommentId) {
      setEditingCommentText(value);
      return;
    }

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

 return {
  statusModalOpen,
  setStatusModalOpen,
  pendingStatus,
  setPendingStatus,
  statusRemark,
  setStatusRemark,
  statusSaving,
  handleStatusUpdate,

  deleteSaving,
  handleDeleteTask,

  memberSaving,
  memberActionLoading,
  showManageMembers,
  setShowManageMembers,
  handleAddMember,
  handleRemoveMember,

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
  handleSaveEditedComment,
  handleDeleteComment,
  handleTranslateComment,
  handleCommentInputChange,
  insertMention,
};
}
