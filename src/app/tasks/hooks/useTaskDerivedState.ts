import { useMemo } from "react";
import { TaskRow, ProfileRow, TaskMemberRow, CheckpointState, TaskDateStatus } from "../lib/task.types";
import { getCheckpointState, getTaskDateDisplay, getProgressValue, getTaskMemberProfiles } from "../lib/task.utils";

interface UseTaskDerivedStateProps {
  task: TaskRow | null;
  taskMembers: TaskMemberRow[];
  profiles: ProfileRow[];
  todayKey: string;
  now?: number;
}

export function useTaskDerivedState({
  task,
  taskMembers,
  profiles,
  todayKey,
  now = Date.now(),
}: UseTaskDerivedStateProps) {
  const checkpointState: CheckpointState = useMemo(() => {
    if (!task) return { behindSchedule: false, updateRequired: false };
    return getCheckpointState(task, todayKey, now);
  }, [task, todayKey, now]);

  const dueDateInfo: {
    display: string;
    status: TaskDateStatus["status"];
    color: string;
    label: string | null;
    isOverdue: boolean;
    isDueToday: boolean;
  } = useMemo(() => {
    if (!task?.due_date) {
      return {
        display: "-",
        status: "none",
        color: "text-slate-500",
        label: null,
        isOverdue: false,
        isDueToday: false,
      };
    }

    const { status, color, label } = getTaskDateDisplay(task.due_date, todayKey);
    const isTaskDone = (task.status || "").toUpperCase() === "DONE";
    
    return {
      display: task.due_date,
      status,
      color: isTaskDone ? "text-slate-500" : color,
      label: isTaskDone ? null : label,
      isOverdue: !isTaskDone && status === "overdue",
      isDueToday: !isTaskDone && status === "today",
    };
  }, [task, todayKey]);

  const progressValue = useMemo(() => {
    if (!task) return 0;
    return getProgressValue(task.status);
  }, [task]);

  const assigneeProfiles = useMemo(() => {
    if (!task) return [];
    return getTaskMemberProfiles(task.id, taskMembers, profiles);
  }, [task, taskMembers, profiles]);

  return {
    checkpointState,
    dueDateInfo,
    progressValue,
    assigneeProfiles,
  };
}
