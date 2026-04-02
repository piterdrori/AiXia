import { useEffect } from "react";
import {
  subscribeToTask,
  subscribeToTaskComments,
  subscribeToTaskActivity,
  removeRealtimeChannel,
} from "@/lib/realtime";
import type { TaskRow, TaskCommentRow, TaskActivityRow } from "../lib/task.types";

interface UseTaskDetailRealtimeProps {
  taskId: string | undefined;
  onTaskUpdate: (updatedTask: Partial<TaskRow>) => void;
  onCommentInsert: (newComment: TaskCommentRow) => void;
  onActivityInsert: (newActivity: TaskActivityRow) => void;
}

export function useTaskDetailRealtime({
  taskId,
  onTaskUpdate,
  onCommentInsert,
  onActivityInsert,
}: UseTaskDetailRealtimeProps) {
  useEffect(() => {
    if (!taskId) return;

    subscribeToTask({
      taskId,
      onUpdate: onTaskUpdate,
    });

    subscribeToTaskComments({
      taskId,
      onInsert: onCommentInsert,
    });

    subscribeToTaskActivity({
      taskId,
      onInsert: onActivityInsert,
    });

    return () => {
      removeRealtimeChannel(`task:${taskId}`);
      removeRealtimeChannel(`task:comments:${taskId}`);
      removeRealtimeChannel(`task:activity:${taskId}`);
    };
  }, [taskId, onTaskUpdate, onCommentInsert, onActivityInsert]);
}
