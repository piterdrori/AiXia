import { useState, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { createRequestTracker } from "@/lib/safeAsync";

import type { TaskStatus, TaskRow } from "../lib/task.types";

interface MoveTaskOptions {
  draggedTaskId: string | null;
  canMove: boolean;
  tasks: TaskRow[];
  setTasks: React.Dispatch<React.SetStateAction<TaskRow[]>>;
  nowIso: string;
}

interface DeleteTaskOptions {
  tasks: TaskRow[];
  taskMembers: { task_id: string }[];
  setTasks: React.Dispatch<React.SetStateAction<TaskRow[]>>;
  setTaskMembers: React.Dispatch<
    React.SetStateAction<{ task_id: string }[]>
  >;
  confirmText: string;
  errorText: string;
}

export function useTaskActions() {
  const [actionError, setActionError] = useState("");
  const [draggedTask, setDraggedTask] = useState<string | null>(null);

  const requestTracker = useRef(createRequestTracker());

  // =========================
  // DRAG START
  // =========================

  const handleDragStart = useCallback((taskId: string) => {
    setDraggedTask(taskId);
  }, []);

  // =========================
  // MOVE TASK (DRAG & DROP)
  // =========================

  const handleDrop = useCallback(
    async (
      e: React.DragEvent,
      nextStatus: TaskStatus,
      options: MoveTaskOptions
    ) => {
      e.preventDefault();

      const requestId = requestTracker.current.next();

      const { draggedTaskId, canMove, tasks, setTasks, nowIso } = options;

      if (!draggedTaskId || !canMove) {
        setDraggedTask(null);
        return;
      }

      const task = tasks.find((t) => t.id === draggedTaskId);
      if (!task) {
        setDraggedTask(null);
        return;
      }

      setActionError("");

      const previousTasks = tasks;

      // OPTIMISTIC UPDATE
      setTasks((prev) =>
        prev.map((item) =>
          item.id === draggedTaskId
            ? {
                ...item,
                status: nextStatus,
                updated_at: nowIso,
              }
            : item
        )
      );

      try {
        const { error } = await supabase
          .from("tasks")
          .update({
            status: nextStatus,
            updated_at: nowIso,
          })
          .eq("id", draggedTaskId);

        if (!requestTracker.current.isLatest(requestId)) return;

        if (error) throw error;
      } catch (err: any) {
        if (!requestTracker.current.isLatest(requestId)) return;

        console.error("Move task error:", err);

        // ROLLBACK
        setTasks(previousTasks);

        setActionError(
          err?.message || "Failed to update task status"
        );
      } finally {
        if (!requestTracker.current.isLatest(requestId)) return;
        setDraggedTask(null);
      }
    },
    []
  );

  // =========================
  // DELETE TASK
  // =========================

  const handleDelete = useCallback(
    async (taskId: string, options: DeleteTaskOptions) => {
      const requestId = requestTracker.current.next();

      const {
        tasks,
        taskMembers,
        setTasks,
        setTaskMembers,
        confirmText,
        errorText,
      } = options;

      const confirmed = window.confirm(confirmText);
      if (!confirmed) return;

      setActionError("");

      const previousTasks = tasks;
      const previousMembers = taskMembers;

      // OPTIMISTIC REMOVE
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      setTaskMembers((prev) =>
        prev.filter((m) => m.task_id !== taskId)
      );

      try {
        const { error } = await supabase
          .from("tasks")
          .delete()
          .eq("id", taskId);

        if (!requestTracker.current.isLatest(requestId)) return;

        if (error) throw error;
      } catch (err: any) {
        if (!requestTracker.current.isLatest(requestId)) return;

        console.error("Delete task error:", err);

        // ROLLBACK
        setTasks(previousTasks);
        setTaskMembers(previousMembers);

        setActionError(err?.message || errorText);
      }
    },
    []
  );

  return {
    actionError,
    setActionError,

    draggedTask,
    setDraggedTask,

    handleDragStart,
    handleDrop,
    handleDelete,
  };
}
