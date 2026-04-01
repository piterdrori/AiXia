import { format } from "date-fns";
import {
  TaskRow,
  ProfileRow,
  TaskMemberRow,
  TaskActivityRow,
  TaskStatus,
  CheckpointState,
  TaskDateStatus,
} from "./task.types";
import {
  CHINA_TIMEZONE,
  STATUS_RANK,
  CHECKPOINT_THRESHOLDS,
  UPDATE_REQUIRED_THRESHOLD_MS,
  PRIORITY_COLORS,
  STATUS_COLORS,
  ACTIVITY_ACTION_COLORS,
  ACTIVITY_ACTION_LABELS,
  DATE_STATUS_COLORS,
} from "./task.constants";

export function getTaskDateStatus(
  dueDate: string | null,
  todayKey: string
): TaskDateStatus["status"] {
  if (!dueDate) return "none";
  if (dueDate < todayKey) return "overdue";
  if (dueDate === todayKey) return "today";
  return "upcoming";
}

export function getTaskDateDisplay(
  dueDate: string | null,
  todayKey: string
): { status: TaskDateStatus["status"]; color: string; label: string | null } {
  const status = getTaskDateStatus(dueDate, todayKey);
  const color = DATE_STATUS_COLORS[status];
  
  let label = null;
  if (status === "overdue") label = "Overdue";
  if (status === "today") label = "Today";
  
  return { status, color, label };
}

export function getCheckpointState(
  task: TaskRow,
  todayKey: string,
  now: number = Date.now()
): CheckpointState {
  const status = (task.status || "").toUpperCase();
  const startDate = task.start_date;
  const dueDate = task.due_date;
  const lastStatusUpdateAt = task.last_status_update_at;

  if (!task || !startDate || !dueDate || status === "DONE") {
    return {
      behindSchedule: false,
      updateRequired: false,
    };
  }

  const totalMs =
    new Date(`${dueDate}T00:00:00`).getTime() -
    new Date(`${startDate}T00:00:00`).getTime();

  if (totalMs <= 0) {
    return {
      behindSchedule: false,
      updateRequired: false,
    };
  }

  const elapsedMs =
    new Date(`${todayKey}T00:00:00`).getTime() -
    new Date(`${startDate}T00:00:00`).getTime();

  const progressRatio = Math.min(Math.max(elapsedMs / totalMs, 0), 1);

  let expectedStatus: TaskStatus = "TODO";

  if (progressRatio >= 1) {
    expectedStatus = "DONE";
  } else if (progressRatio >= CHECKPOINT_THRESHOLDS.IN_REVIEW) {
    expectedStatus = "IN_REVIEW";
  } else if (progressRatio >= CHECKPOINT_THRESHOLDS.IN_PROGRESS) {
    expectedStatus = "IN_PROGRESS";
  }

  const behindSchedule =
    (STATUS_RANK[status] ?? 0) < (STATUS_RANK[expectedStatus] ?? 0);

  const updateRequired = lastStatusUpdateAt
    ? now - new Date(lastStatusUpdateAt).getTime() > UPDATE_REQUIRED_THRESHOLD_MS
    : true;

  return {
    behindSchedule,
    updateRequired,
  };
}

export function getPriorityColor(priority: string | null): string {
  return PRIORITY_COLORS[(priority || "").toUpperCase()] || PRIORITY_COLORS.LOW;
}

export function getStatusColor(status: string | null): string {
  return STATUS_COLORS[(status || "").toUpperCase()] || STATUS_COLORS.TODO;
}

export function getActivityActionLabel(actionType: string): string {
  const normalized = (actionType || "").toLowerCase();
  return (
    ACTIVITY_ACTION_LABELS[normalized] ||
    actionType
      .replace(/_/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase())
  );
}

export function getActivityActionColor(actionType: string): string {
  const normalized = (actionType || "").toLowerCase();
  return (
    ACTIVITY_ACTION_COLORS[normalized] ||
    "bg-slate-500/20 text-slate-400 border-slate-500/30"
  );
}

export function getInitials(fullName: string | null, fallback = "U"): string {
  if (!fullName) return fallback;
  return fullName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

export function getProfileName(
  userId: string | null,
  profiles: ProfileRow[],
  fallback = "Unknown"
): string {
  if (!userId) return fallback;
  return profiles.find((profile) => profile.user_id === userId)?.full_name || fallback;
}

export function getProfileRole(
  userId: string | null,
  profiles: ProfileRow[]
): string {
  if (!userId) return "";
  return profiles.find((profile) => profile.user_id === userId)?.role || "";
}

export function getTaskMemberProfiles(
  taskId: string,
  taskMembers: TaskMemberRow[],
  profiles: ProfileRow[]
): ProfileRow[] {
  const memberUserIds = taskMembers
    .filter((member) => member.task_id === taskId)
    .map((member) => member.user_id);

  return profiles.filter((profile) => memberUserIds.includes(profile.user_id));
}

export function getProgressValue(status: string | null): number {
  const value = (status || "").toUpperCase();
  if (value === "DONE") return 100;
  if (value === "IN_REVIEW") return 75;
  if (value === "IN_PROGRESS") return 50;
  return 0;
}

export function formatDateSafe(
  dateString: string | null,
  formatStr: string = "MMM d, yyyy"
): string | null {
  if (!dateString) return null;
  try {
    return format(new Date(dateString), formatStr);
  } catch {
    return null;
  }
}

export function isValidDateRange(startDate: string, dueDate: string): boolean {
  if (!startDate || !dueDate) return true;
  return startDate <= dueDate;
}

export function getProjectName(
  projectId: string | null,
  projects: ProjectRow[],
  fallback = "No Project"
): string {
  if (!projectId) return fallback;
  return projects.find((project) => project.id === projectId)?.name || "Unknown Project";
}

export function groupActivityByDate<T extends { created_at: string }>(
  items: T[],
  clock: { shiftDate: (date: string) => Date }
): { dateKey: string; label: string; items: T[] }[] {
  const groups = new Map<string, T[]>();

  for (const item of items) {
    const dateKey = format(clock.shiftDate(item.created_at), "yyyy-MM-dd");
    const existing = groups.get(dateKey) || [];
    existing.push(item);
    groups.set(dateKey, existing);
  }

  return Array.from(groups.entries()).map(([dateKey, items]) => ({
    dateKey,
    label: format(new Date(`${dateKey}T00:00:00`), "MMMM d, yyyy"),
    items,
  }));
}

export function sortTasksByPriority(tasks: TaskRow[], todayKey: string): TaskRow[] {
  return [...tasks].sort((a, b) => {
    const getDatePriority = (task: TaskRow) => {
      const status = getTaskDateStatus(task.due_date, todayKey);
      if (status === "overdue") return 0;
      if (status === "today") return 1;
      return 2;
    };

    const priorityDiff = getDatePriority(a) - getDatePriority(b);
    if (priorityDiff !== 0) return priorityDiff;

    if (!a.due_date && !b.due_date) return 0;
    if (!a.due_date) return 1;
    if (!b.due_date) return -1;

    return a.due_date.localeCompare(b.due_date);
  });
}
