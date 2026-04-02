import type { ColumnDef, TaskPriority, TaskStatus } from "./task.types";

export const CHINA_TIMEZONE = "Asia/Shanghai";

export const STATUS_COLUMNS: ColumnDef[] = [
  { id: "TODO", label: "tasks.columns.todo", color: "bg-slate-500" },
  { id: "IN_PROGRESS", label: "tasks.columns.inProgress", color: "bg-blue-500" },
  { id: "IN_REVIEW", label: "tasks.columns.inReview", color: "bg-purple-500" },
  { id: "DONE", label: "tasks.columns.done", color: "bg-green-500" },
];

export const STATUS_RANK: Record<string, number> = {
  TODO: 0,
  IN_PROGRESS: 1,
  IN_REVIEW: 2,
  DONE: 3,
};

export const DEFAULT_TASK_STATUS: TaskStatus = "TODO";
export const DEFAULT_TASK_PRIORITY: TaskPriority = "MEDIUM";

export const PRIORITY_COLORS: Record<string, string> = {
  URGENT: "bg-red-500/20 text-red-400 border-red-500/30",
  HIGH: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  MEDIUM: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  LOW: "bg-slate-500/20 text-slate-400 border-slate-500/30",
};

export const STATUS_COLORS: Record<string, string> = {
  DONE: "bg-green-500/20 text-green-400 border-green-500/30",
  IN_PROGRESS: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  IN_REVIEW: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  TODO: "bg-slate-500/20 text-slate-400 border-slate-500/30",
};

export const ACTIVITY_ACTION_COLORS: Record<string, string> = {
  task_status_changed: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  task_created: "bg-green-500/20 text-green-400 border-green-500/30",
  task_updated: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  task_deleted: "bg-red-500/20 text-red-400 border-red-500/30",
  comment_added: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  file_uploaded: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
};

export const ACTIVITY_ACTION_LABELS: Record<string, string> = {
  task_status_changed: "Status Updated",
  task_created: "Task Created",
  task_updated: "Task Updated",
  task_deleted: "Task Deleted",
  comment_added: "Comment Added",
  file_uploaded: "File Uploaded",
};

export const CHECKPOINT_THRESHOLDS = {
  IN_REVIEW: 0.66,
  IN_PROGRESS: 0.33,
};

export const UPDATE_REQUIRED_THRESHOLD_MS = 1000 * 60 * 60 * 24 * 2; // 2 days

export const DATE_STATUS_COLORS = {
  overdue: "text-red-400",
  today: "text-amber-400",
  upcoming: "text-slate-500",
  none: "text-slate-500",
};
