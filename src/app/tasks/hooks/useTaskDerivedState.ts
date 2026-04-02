import { useMemo } from "react";
import type {
  TaskRow,
  ProfileRow,
  TaskMemberRow,
  CheckpointState,
  TaskDateStatus,
} from "../lib/task.types";

import {
  getCheckpointState,
  getTaskDateDisplay,
  getProgressValue,
  getTaskMemberProfiles,
} from "../lib/task.utils";

interface UseTaskDerivedStateProps {
  task: TaskRow | null;
  taskMembers: TaskMemberRow[];
  profiles: ProfileRow[];
  todayKey: string;
  now?: number;
}

interface DueDateInfo {
  display: string;
  status: TaskDateStatus["status"];
  color: string;
  label: string | null;
  isOverdue: boolean;
  isDueToday: boolean;
}

function normalizeStatus(status: string | null): string {
  return (status || "").toUpperCase();
}

export function useTaskDerivedState({
  task,
  taskMembers,
  profiles,
  todayKey,
  now = Date.now(),
}: UseTaskDerivedStateProps) {
  const isReady = Boolean(task);

  const checkpointState: CheckpointState = useMemo(() => {
    if (!isReady || !task) {
      return { behindSchedule: false, updateRequired: false };
    }

    return getCheckpointState(task, todayKey, now);
  }, [isReady, task, todayKey, now]);

  const dueDateInfo: DueDateInfo = useMemo(() => {
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

    const { status, color, label } = getTaskDateDisplay(
      task.due_date,
      todayKey
    );

    const normalizedStatus = normalizeStatus(task.status);
    const isDone = normalizedStatus === "DONE";

    return {
      display: task.due_date,
      status,
      color: isDone ? "text-slate-500" : color,
      label: isDone ? null : label,
      isOverdue: !isDone && status === "overdue",
      isDueToday: !isDone && status === "today",
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
