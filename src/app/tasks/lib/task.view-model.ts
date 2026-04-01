import { TaskRow, ProfileRow, TaskMemberRow } from "./task.types";
import { getProgressValue, getCheckpointState, getTaskDateDisplay } from "./task.utils";

export interface TaskViewModel {
  id: string;
  title: string;
  description: string | null;
  status: string | null;
  priority: string | null;
  dueDate: string | null;
  startDate: string | null;
  projectId: string | null;
  createdBy: string | null;
  progress: number;
  isOverdue: boolean;
  isDueToday: boolean;
  isDone: boolean;
  behindSchedule: boolean;
  updateRequired: boolean;
  assigneeProfiles: ProfileRow[];
}

export function createTaskViewModel(
  task: TaskRow,
  taskMembers: TaskMemberRow[],
  profiles: ProfileRow[],
  todayKey: string,
  now: number = Date.now()
): TaskViewModel {
  const status = (task.status || "").toUpperCase();
  const isDone = status === "DONE";
  
  const { status: dateStatus } = getTaskDateDisplay(task.due_date, todayKey);
  const checkpoint = getCheckpointState(task, todayKey, now);
  
  const assigneeIds = taskMembers
    .filter((m) => m.task_id === task.id)
    .map((m) => m.user_id);
  
  const assigneeProfiles = profiles.filter((p) => assigneeIds.includes(p.user_id));

  return {
    id: task.id,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    dueDate: task.due_date,
    startDate: task.start_date,
    projectId: task.project_id,
    createdBy: task.created_by,
    progress: getProgressValue(task.status),
    isOverdue: !isDone && dateStatus === "overdue",
    isDueToday: !isDone && dateStatus === "today",
    isDone,
    behindSchedule: checkpoint.behindSchedule,
    updateRequired: checkpoint.updateRequired,
    assigneeProfiles,
  };
}
