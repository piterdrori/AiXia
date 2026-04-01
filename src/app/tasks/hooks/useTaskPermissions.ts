import { useMemo } from "react";
import {
  canCreateTask,
  canViewTask,
  canEditTaskEntity,
  canDeleteTaskEntity,
  canMoveTask,
} from "@/lib/permissions";
import {
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
  const canCreate = useMemo(() => {
    return currentUserRole ? canCreateTask(currentUserRole) : false;
  }, [currentUserRole]);

  const canView = useMemo(() => {
    if (!task || !currentUserId || !currentUserRole) return false;
    return canViewTask(
      task,
      currentUserId,
      currentUserRole,
      taskMembers,
      visibleProjectIds
    );
  }, [task, currentUserId, currentUserRole, taskMembers, visibleProjectIds]);

  const canEdit = useMemo(() => {
    if (!task || !currentUserId || !currentUserRole) return false;
    return canEditTaskEntity(task, currentUserId, currentUserRole);
  }, [task, currentUserId, currentUserRole]);

  const canDelete = useMemo(() => {
    if (!task || !currentUserId || !currentUserRole) return false;
    return canDeleteTaskEntity(task, currentUserId, currentUserRole);
  }, [task, currentUserId, currentUserRole]);

  const canMove = useMemo(() => {
    if (!task || !currentUserId || !currentUserRole) return false;
    return canMoveTask(
      task,
      currentUserId,
      currentUserRole,
      taskMembers,
      visibleProjectIds
    );
  }, [task, currentUserId, currentUserRole, taskMembers, visibleProjectIds]);

  const canManageMembers = canEdit;

  const canManageComment = useMemo(() => {
    return (comment: TaskCommentRow): boolean => {
      if (!currentUserId) return false;
      return currentUserRole === "admin" || comment.user_id === currentUserId;
    };
  }, [currentUserId, currentUserRole]);

  const canDeleteFile = useMemo(() => {
    return (file: FileUploadRow): boolean => {
      if (!currentUserId) return false;
      return (
        currentUserRole === "admin" ||
        task?.created_by === currentUserId ||
        file.user_id === currentUserId
      );
    };
  }, [currentUserId, currentUserRole, task]);

  return {
    canCreate,
    canView,
    canEdit,
    canDelete,
    canMove,
    canManageMembers,
    canManageComment,
    canDeleteFile,
  };
}
