import { supabase } from "@/lib/supabase";
import type { TaskRowExtended } from "./types";

export function isTaskDeleted(task: Pick<TaskRowExtended, "deleted_at">): boolean {
  return Boolean(task.deleted_at);
}

export function isTaskArchived(task: Pick<TaskRowExtended, "archived_at" | "deleted_at">): boolean {
  return Boolean(task.archived_at) && !task.deleted_at;
}

export function isTaskActive(task: Pick<TaskRowExtended, "archived_at" | "deleted_at">): boolean {
  return !task.archived_at && !task.deleted_at;
}

/** Normalized parent id from a task row (handles null, undefined, whitespace). */
export function getParentTaskId(
  task: Pick<TaskRowExtended, "parent_task_id">
): string | null {
  const raw = task.parent_task_id;
  if (raw == null) return null;
  const trimmed = String(raw).trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function isSubtask(task: Pick<TaskRowExtended, "parent_task_id">): boolean {
  return getParentTaskId(task) !== null;
}

export function isTopLevelTask(task: Pick<TaskRowExtended, "parent_task_id">): boolean {
  return !isSubtask(task);
}

export async function softDeleteTask(taskId: string, userId: string): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("tasks")
    .update({
      deleted_at: now,
      deleted_by: userId,
      updated_at: now,
    })
    .eq("id", taskId);

  if (error) throw error;
}

export async function archiveTask(taskId: string, userId: string): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("tasks")
    .update({
      archived_at: now,
      archived_by: userId,
      updated_at: now,
    })
    .eq("id", taskId);

  if (error) throw error;
}

export async function restoreTask(taskId: string): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("tasks")
    .update({
      archived_at: null,
      archived_by: null,
      deleted_at: null,
      deleted_by: null,
      updated_at: now,
    })
    .eq("id", taskId);

  if (error) throw error;
}

export async function loadTopLevelTasksForProject(
  projectId: string
): Promise<TaskRowExtended[]> {
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("project_id", projectId)
    .is("parent_task_id", null)
    .is("deleted_at", null)
    .is("archived_at", null)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data || []) as TaskRowExtended[];
}
