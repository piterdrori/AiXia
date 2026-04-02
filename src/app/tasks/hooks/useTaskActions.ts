import { useState } from "react";
import { supabase } from "@/lib/supabase";
import type { TaskStatus, TaskRow } from "../lib/task.types";

export function useTaskActions() {
  const [actionError, setActionError] = useState("");
  const [draggedTask, setDraggedTask] = useState<string | null>(null);

  const handleDragStart = (taskId: string) => {
    setDraggedTask(taskId);
  };

  const handleDrop = async (
    e: React.DragEvent,
    nextStatus: TaskStatus,
    options: {
      draggedTaskId: string | null;
      currentUserId: string | null;
      currentUserRole: string | null;
      canMove: boolean;
      tasks: TaskRow[];
      setTasks: React.Dispatch<React.SetStateAction<TaskRow[]>>;
      nowIso: string;
    }
  ) => {
    e.preventDefault();
    const { draggedTaskId, canMove, tasks, setTasks, nowIso } = options;

    if (!draggedTaskId || !canMove) {
      setDraggedTask(null);
      return;
    }

    const task = tasks.find((item) => item.id === draggedTaskId);
    if (!task) {
      setDraggedTask(null);
      return;
    }

    setActionError("");
    const previousTasks = tasks;

    setTasks((prev) =>
      prev.map((item) =>
        item.id === draggedTaskId ? { ...item, status: nextStatus, updated_at: nowIso } : item
      )
    );

    const { error: updateError } = await supabase
      .from("tasks")
      .update({ status: nextStatus, updated_at: nowIso })
      .eq("id", draggedTaskId);

    if (updateError) {
      console.error("Move task error:", updateError);
      setTasks(previousTasks);
      setActionError(updateError.message || "Failed to update task status");
    }

    setDraggedTask(null);
  };

  const handleDelete = async (
    taskId: string,
    options: {
      tasks: TaskRow[];
      taskMembers: { task_id: string }[];
      setTasks: React.Dispatch<React.SetStateAction<TaskRow[]>>;
      setTaskMembers: React.Dispatch<React.SetStateAction<{ task_id: string }[]>>;
      t: (key: string) => string;
    }
  ) => {
    const { tasks, taskMembers, setTasks, setTaskMembers, t } = options;
    
    const confirmed = window.confirm(t("tasks.confirmations.deleteTask"));
    if (!confirmed) return;

    setActionError("");
    const previousTasks = tasks;
    const previousMembers = taskMembers;

    setTasks((prev) => prev.filter((task) => task.id !== taskId));
    setTaskMembers((prev) => prev.filter((member) => member.task_id !== taskId));

    const { error: deleteError } = await supabase
      .from("tasks")
      .delete()
      .eq("id", taskId);

    if (deleteError) {
      console.error("Delete task error:", deleteError);
      setTasks(previousTasks);
      setTaskMembers(previousMembers);
      setActionError(deleteError.message || t("tasks.errors.deleteTask"));
    }
  };

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
