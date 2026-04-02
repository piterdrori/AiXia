export type Role = "admin" | "manager" | "employee" | "guest";

export type TaskStatus = "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";
export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export interface TaskRow {
  id: string;
  title: string;
  description: string | null;
  status: string | null;
  priority: string | null;
  start_date: string | null;
  due_date: string | null;
  project_id: string | null;
  assignee_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  last_status_update_at: string | null;
}

export interface ProjectRow {
  id: string;
  name: string;
  description?: string | null;
  status?: string | null;
  progress?: number | null;
  created_by: string | null;
}

export interface ProjectMemberRow {
  id: string;
  project_id: string;
  user_id: string;
  role: string;
  created_at: string;
}

export interface TaskMemberRow {
  id: string;
  task_id: string;
  user_id: string;
  role: string;
  created_at: string;
}

export interface ProfileRow {
  user_id: string;
  full_name: string | null;
  role: Role;
  status: "active" | "pending" | "inactive" | "denied";
}

export interface TaskCommentRow {
  id: string;
  task_id: string;
  user_id: string;
  content: string;
  created_at: string;
}

export interface FileUploadRow {
  id: string;
  project_id: string | null;
  task_id: string | null;
  user_id: string | null;
  file_name: string;
  file_path: string;
  file_size: number | null;
  mime_type: string | null;
  entity_type: "project" | "task";
  created_at: string;
}

export interface TaskActivityRow {
  id: string;
  project_id: string | null;
  task_id: string | null;
  user_id: string | null;
  action_type: string;
  entity_type: string | null;
  entity_id: string | null;
  message: string | null;
  created_at: string;
}

export interface TranslatedComment {
  text: string;
  source: string;
}

export interface CheckpointState {
  behindSchedule: boolean;
  updateRequired: boolean;
}

export interface ColumnDef {
  id: TaskStatus;
  label: string;
  color: string;
}

export interface TaskDateStatus {
  status: "none" | "overdue" | "today" | "upcoming";
  color: string;
  label: string | null;
}

export const DEFAULT_TASK_STATUS: TaskStatus = "TODO";
export const DEFAULT_TASK_PRIORITY: TaskPriority = "MEDIUM";
