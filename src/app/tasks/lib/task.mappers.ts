import { TaskRow, ProjectRow, ProfileRow, TaskMemberRow, TaskCommentRow, FileUploadRow, TaskActivityRow } from "./task.types";

// Mappers for transforming data from DB to view models if needed
export function mapTaskRow(data: unknown): TaskRow {
  const row = data as Record<string, unknown>;
  return {
    id: String(row.id),
    title: String(row.title),
    description: row.description ? String(row.description) : null,
    status: row.status ? String(row.status) : null,
    priority: row.priority ? String(row.priority) : null,
    start_date: row.start_date ? String(row.start_date) : null,
    due_date: row.due_date ? String(row.due_date) : null,
    project_id: row.project_id ? String(row.project_id) : null,
    assignee_id: row.assignee_id ? String(row.assignee_id) : null,
    created_by: row.created_by ? String(row.created_by) : null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
    last_status_update_at: row.last_status_update_at ? String(row.last_status_update_at) : null,
  };
}

export function mapProjectRow(data: unknown): ProjectRow {
  const row = data as Record<string, unknown>;
  return {
    id: String(row.id),
    name: String(row.name),
    description: row.description ? String(row.description) : null,
    status: row.status ? String(row.status) : null,
    progress: typeof row.progress === "number" ? row.progress : null,
    created_by: row.created_by ? String(row.created_by) : null,
  };
}

export function mapProfileRow(data: unknown): ProfileRow {
  const row = data as Record<string, unknown>;
  return {
    user_id: String(row.user_id),
    full_name: row.full_name ? String(row.full_name) : null,
    role: row.role as ProfileRow["role"],
    status: row.status as ProfileRow["status"],
  };
}

export function mapTaskMemberRow(data: unknown): TaskMemberRow {
  const row = data as Record<string, unknown>;
  return {
    id: String(row.id),
    task_id: String(row.task_id),
    user_id: String(row.user_id),
    role: String(row.role),
    created_at: String(row.created_at),
  };
}

export function mapTaskCommentRow(data: unknown): TaskCommentRow {
  const row = data as Record<string, unknown>;
  return {
    id: String(row.id),
    task_id: String(row.task_id),
    user_id: String(row.user_id),
    content: String(row.content),
    created_at: String(row.created_at),
  };
}

export function mapFileUploadRow(data: unknown): FileUploadRow {
  const row = data as Record<string, unknown>;
  return {
    id: String(row.id),
    project_id: row.project_id ? String(row.project_id) : null,
    task_id: row.task_id ? String(row.task_id) : null,
    user_id: row.user_id ? String(row.user_id) : null,
    file_name: String(row.file_name),
    file_path: String(row.file_path),
    file_size: typeof row.file_size === "number" ? row.file_size : null,
    mime_type: row.mime_type ? String(row.mime_type) : null,
    entity_type: row.entity_type as FileUploadRow["entity_type"],
    created_at: String(row.created_at),
  };
}

export function mapTaskActivityRow(data: unknown): TaskActivityRow {
  const row = data as Record<string, unknown>;
  return {
    id: String(row.id),
    project_id: row.project_id ? String(row.project_id) : null,
    task_id: row.task_id ? String(row.task_id) : null,
    user_id: row.user_id ? String(row.user_id) : null,
    action_type: String(row.action_type),
    entity_type: row.entity_type ? String(row.entity_type) : null,
    entity_id: row.entity_id ? String(row.entity_id) : null,
    message: row.message ? String(row.message) : null,
    created_at: String(row.created_at),
  };
}
