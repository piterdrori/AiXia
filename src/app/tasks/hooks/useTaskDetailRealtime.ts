import { useEffect, useRef } from "react";
import {
  subscribeToTask,
  subscribeToTaskComments,
  subscribeToTaskActivity,
  removeRealtimeChannel,
} from "@/lib/realtime";

import type {
  TaskRow,
  TaskCommentRow,
  TaskActivityRow,
} from "../lib/task.types";

interface UseTaskDetailRealtimeProps {
  taskId: string | undefined;
  onTaskUpdate?: (updatedTask: Partial<TaskRow>) => void;
  onCommentInsert?: (newComment: TaskCommentRow) => void;
  onActivityInsert?: (newActivity: TaskActivityRow) => void;
}

export function useTaskDetailRealtime({
  taskId,
  onTaskUpdate,
  onCommentInsert,
  onActivityInsert,
}: UseTaskDetailRealtimeProps) {
  const activeTaskRef = useRef<string | null>(null);

  useEffect(() => {
    if (!taskId) return;

    // Prevent duplicate subscriptions for same task
    if (activeTaskRef.current === taskId) return;

    activeTaskRef.current = taskId;

    // === TASK CHANNEL ===
    if (onTaskUpdate) {
      subscribeToTask({
        taskId,
        onUpdate: onTaskUpdate,
      });
    }

    // === COMMENTS CHANNEL ===
    if (onCommentInsert) {
      subscribeToTaskComments({
        taskId,
        onInsert: onCommentInsert,
      });
    }

    // === ACTIVITY CHANNEL ===
    if (onActivityInsert) {
      subscribeToTaskActivity({
        taskId,
        onInsert: onActivityInsert,
      });
    }

    // === CLEANUP ===
    return () => {
      removeRealtimeChannel(`task:${taskId}`);
      removeRealtimeChannel(`task:comments:${taskId}`);
      removeRealtimeChannel(`task:activity:${taskId}`);

      activeTaskRef.current = null;
    };
  }, [taskId]);
}
