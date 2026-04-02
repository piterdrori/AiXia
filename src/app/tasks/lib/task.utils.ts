import { format } from "date-fns";
import type {
  CheckpointState,
  ProfileRow,
  ProjectRow,
  TaskDateStatus,
  TaskMemberRow,
  TaskRow,
  TaskStatus,
} from "./task.types";
import {
  ACTIVITY_ACTION_COLORS,
  ACTIVITY_ACTION_LABELS,
  CHECKPOINT_THRESHOLDS,
  DATE_STATUS_COLORS,
  PRIORITY_COLORS,
  STATUS_COLORS,
  STATUS_RANK,
  UPDATE_REQUIRED_THRESHOLD_MS,
} from "./task.constants";

type ClockLike = {
  shiftDate: (date: string) => Date;
};

type DateGroupedItem<T> = {
  dateKey: string;
  label: string;
  items: T[];
};

const FALLBACK_ACTIVITY_COLOR =
  "bg-slate-500/20 text-slate-400 border-slate-500/30";
const FALLBACK_PROFILE_NAME = "Unknown";
const FALLBACK_PROJECT_NAME = "No Project";
const FALLBACK_UNKNOWN_PROJECT_NAME = "Unknown Project";

function normalizeTaskStatus(status: string | null | undefined): TaskStatus {
  const normalized = (status || "").toUpperCase();

  switch (normalized) {
    case "TODO":
    case "IN_PROGRESS":
    case "IN_REVIEW":
    case "DONE":
      return normalized;
    default:
      return "TODO";
  }
}

function normalizeDateStatus(
  status: TaskDateStatus["status"],
): keyof typeof DATE_STATUS_COLORS {
  switch (status) {
    case "none":
    case "overdue":
    case "today":
    case "upcoming":
      return status;
    default:
      return "none";
  }
}

export function getTaskDateStatus(
  dueDate: string | null,
  todayKey: string,
): TaskDateStatus["status"] {
  if (!dueDate) return "none";
  if (dueDate < todayKey) return "overdue";
  if (dueDate === todayKey) return "today";
  return "upcoming";
}

export function getTaskDateDisplay(
  dueDate: string | null,
  todayKey: string,
): TaskDateStatus {
  const status = getTaskDateStatus(dueDate, todayKey);
  const normalizedStatus = normalizeDateStatus(status);

  let label: string | null = null;

  if (normalizedStatus === "overdue") {
    label = "Overdue";
  } else if (normalizedStatus === "today") {
    label = "Today";
  }

  return {
    status: normalizedStatus,
    color: DATE_STATUS_COLORS[normalizedStatus],
    label,
  };
}

export function getCheckpointState(
  task: TaskRow,
  todayKey: string,
  now: number = Date.now(),
): CheckpointState {
  const status = normalizeTaskStatus(task.status);
  const startDate = task.start_date;
  const dueDate = task.due_date;
  const lastStatusUpdateAt = task.last_status_update_at;

  if (!startDate || !dueDate || status === "DONE") {
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
    STATUS_RANK[status] < STATUS_RANK[expectedStatus];

  const updateRequired = lastStatusUpdateAt
    ? now - new Date(lastStatusUpdateAt).getTime() >
      UPDATE_REQUIRED_THRESHOLD_MS
    : true;

  return {
    behindSchedule,
    updateRequired,
  };
}

export function getPriorityColor(priority: string | null): string {
  const key = (priority || "").toUpperCase() as keyof typeof PRIORITY_COLORS;
  return PRIORITY_COLORS[key] || PRIORITY_COLORS.LOW;
}

export function getStatusColor(status: string | null): string {
  const key = normalizeTaskStatus(status) as keyof typeof STATUS_COLORS;
  return STATUS_COLORS[key] || STATUS_COLORS.TODO;
}

export function getActivityActionLabel(actionType: string): string {
  const normalized = (actionType || "").toLowerCase();

  if (ACTIVITY_ACTION_LABELS[normalized]) {
    return ACTIVITY_ACTION_LABELS[normalized];
  }

  return (actionType || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function getActivityActionColor(actionType: string): string {
  const normalized = (actionType || "").toLowerCase();
  return ACTIVITY_ACTION_COLORS[normalized] || FALLBACK_ACTIVITY_COLOR;
}

export function getInitials(fullName: string | null, fallback = "U"): string {
  if (!fullName || !fullName.trim()) {
    return fallback;
  }

  return fullName
    .trim()
    .split(/\s+/)
    .map((part) => part[0] || "")
    .join("")
    .toUpperCase();
}

export function getProfileName(
  userId: string | null,
  profiles: ProfileRow[],
  fallback = FALLBACK_PROFILE_NAME,
): string {
  if (!userId) {
    return fallback;
  }

  return profiles.find((profile) => profile.user_id === userId)?.full_name || fallback;
}

export function getProfileRole(
  userId: string | null,
  profiles: ProfileRow[],
): string {
  if (!userId) {
    return "";
  }

  return profiles.find((profile) => profile.user_id === userId)?.role || "";
}

export function getTaskMemberProfiles(
  taskId: string,
  taskMembers: TaskMemberRow[],
  profiles: ProfileRow[],
): ProfileRow[] {
  const memberUserIds = new Set(
    taskMembers
      .filter((member) => member.task_id === taskId)
      .map((member) => member.user_id),
  );

  return profiles.filter((profile) => memberUserIds.has(profile.user_id));
}

export function getProgressValue(status: string | null): number {
  const normalizedStatus = normalizeTaskStatus(status);

  switch (normalizedStatus) {
    case "DONE":
      return 100;
    case "IN_REVIEW":
      return 75;
    case "IN_PROGRESS":
      return 50;
    case "TODO":
    default:
      return 0;
  }
}

export function formatDateSafe(
  dateString: string | null,
  formatStr = "MMM d, yyyy",
): string | null {
  if (!dateString) {
    return null;
  }

  try {
    return format(new Date(dateString), formatStr);
  } catch {
    return null;
  }
}

export function isValidDateRange(
  startDate: string,
  dueDate: string,
): boolean {
  if (!startDate || !dueDate) {
    return true;
  }

  return startDate <= dueDate;
}

export function getProjectName(
  projectId: string | null,
  projects: ProjectRow[],
  fallback = FALLBACK_PROJECT_NAME,
): string {
  if (!projectId) {
    return fallback;
  }

  return (
    projects.find((project) => project.id === projectId)?.name ||
    FALLBACK_UNKNOWN_PROJECT_NAME
  );
}

export function groupActivityByDate<T extends { created_at: string }>(
  items: T[],
  clock: ClockLike,
): DateGroupedItem<T>[] {
  const groups = new Map<string, T[]>();

  for (const item of items) {
    const dateKey = format(clock.shiftDate(item.created_at), "yyyy-MM-dd");
    const existingItems = groups.get(dateKey) || [];
    existingItems.push(item);
    groups.set(dateKey, existingItems);
  }

  return Array.from(groups.entries()).map(([dateKey, groupedItems]) => ({
    dateKey,
    label: format(new Date(`${dateKey}T00:00:00`), "MMMM d, yyyy"),
    items: groupedItems,
  }));
}

export function sortTasksByPriority(
  tasks: TaskRow[],
  todayKey: string,
): TaskRow[] {
  return [...tasks].sort((a, b) => {
    const getDatePriority = (task: TaskRow): number => {
      const status = getTaskDateStatus(task.due_date, todayKey);

      if (status === "overdue") return 0;
      if (status === "today") return 1;
      return 2;
    };

    const priorityDiff = getDatePriority(a) - getDatePriority(b);
    if (priorityDiff !== 0) {
      return priorityDiff;
    }

    if (!a.due_date && !b.due_date) {
      return 0;
    }

    if (!a.due_date) {
      return 1;
    }

    if (!b.due_date) {
      return -1;
    }

    return a.due_date.localeCompare(b.due_date);
  });
}
