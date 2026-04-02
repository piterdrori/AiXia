import { useMemo } from "react";
import {
  canViewTask,
  canEditTaskEntity,
  canDeleteTaskEntity,
  canMoveTask,
} from "@/lib/permissions";

import type {
  TaskRow,
  Role,
  TaskMemberRow,
  TaskCommentRow,
  FileUploadRow,
} from "../lib/task.types";

interface UseTaskPermissionsProps {
  task: TaskRow | null;
  currentUserId: string | null;
  currentUserRole: Role | null;
  taskMembers?: TaskMemberRow[];
  visibleProjectIds?: Set<string>;
}

export function useTaskPermissions({
  task,
  currentUserId,
  currentUserRole,
  taskMembers = [],
  visibleProjectIds = new Set(),
}: UseTaskPermissionsProps) {
  const isReady = Boolean(task && currentUserId && currentUserRole);

  const canCreate = useMemo(() => {
    if (!currentUserRole) return false;
    return currentUserRole === "admin" || currentUserRole === "manager";
  }, [currentUserRole]);

  const canView = useMemo(() => {
    if (!isReady) return false;

    return canViewTask(
      task!,
      currentUserId!,
      currentUserRole!,
      taskMembers,
      visibleProjectIds
    );
  }, [isReady, task, currentUserId, currentUserRole, taskMembers, visibleProjectIds]);

  const canEdit = useMemo(() => {
    if (!isReady) return false;

    return canEditTaskEntity(task!, currentUserId!, currentUserRole!);
  }, [isReady, task, currentUserId, currentUserRole]);

  const canDelete = useMemo(() => {
    if (!isReady) return false;

    return canDeleteTaskEntity(task!, currentUserId!, currentUserRole!);
  }, [isReady, task, currentUserId, currentUserRole]);

  const canMove = useMemo(() => {
    if (!isReady) return false;

    return canMoveTask(
      task!,
      currentUserId!,
      currentUserRole!,
      taskMembers,
      visibleProjectIds
    );
  }, [isReady, task, currentUserId, currentUserRole, taskMembers, visibleProjectIds]);

  // derived
  const canManageMembers = canEdit;

  const canManageComment = useMemo(() => {
    return (comment: TaskCommentRow): boolean => {
      if (!currentUserId || !currentUserRole) return false;

      return (
        currentUserRole === "admin" ||
        comment.user_id === currentUserId
      );
    };
  }, [currentUserId, currentUserRole]);

  const canDeleteFile = useMemo(() => {
    return (file: FileUploadRow): boolean => {
      if (!currentUserId || !currentUserRole) return false;

      return (
        currentUserRole === "admin" ||
        task?.created_by === currentUserId ||
        file.user_id === currentUserId
      );
    };
  }, [currentUserId, currentUserRole, task]);

  return {
    // core
    canCreate,
    canView,
    canEdit,
    canDelete,
    canMove,

    // derived
    canManageMembers,
    canManageComment,
    canDeleteFile,
  };
}
