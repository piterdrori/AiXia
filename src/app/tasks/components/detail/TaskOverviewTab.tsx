import { useMemo, useCallback } from "react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

import { useLanguage } from "@/lib/i18n";

import {
  getStatusColor,
  getPriorityColor,
} from "../../lib/task.utils";

import type {
  TaskRow,
  CheckpointState,
} from "../../lib/task.types";

interface TaskOverviewTabProps {
  task: TaskRow;
  checkpointState: CheckpointState;
  dueDateDisplay: string;
  dueDateBadgeClassName: string;
  dueDateLabel: string | null;
  progressValue: number;
  canUpdateStatus: boolean;
  onStatusClick: (status: string) => void;
  statusSaving: boolean;
}

export function TaskOverviewTab(props: TaskOverviewTabProps) {
  const {
    task,
    checkpointState,
    dueDateDisplay,
    dueDateBadgeClassName,
    dueDateLabel,
    progressValue,
    canUpdateStatus,
    onStatusClick,
    statusSaving,
  } = props;

  const { t } = useLanguage();

  // =========================
  // DERIVED STATE
  // =========================

  const normalizedStatus = useMemo(
    () => (task.status || "").toUpperCase(),
    [task.status]
  );

  const statusColor = useMemo(
    () => getStatusColor(task.status),
    [task.status]
  );

  const priorityColor = useMemo(
    () => getPriorityColor(task.priority),
    [task.priority]
  );

  const statusOptions = useMemo(
    () => [
      { value: "IN_PROGRESS", label: t("taskDetail.status.inProgress") },
      { value: "IN_REVIEW", label: t("taskDetail.status.inReview") },
      { value: "DONE", label: t("taskDetail.status.done") },
    ],
    [t]
  );

  const handleStatusClick = useCallback(
    (value: string, isActive: boolean) => {
      if (!isActive && !statusSaving) {
        onStatusClick(value);
      }
    },
    [onStatusClick, statusSaving]
  );

  // =========================
  // RENDER
  // =========================

  return (
    <Card className="bg-slate-900/50 border-slate-800">
      <CardHeader>
        <CardTitle className="text-white">
          {t("taskDetail.overview.title")}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* BADGES */}
        <div className="flex flex-wrap gap-2">
          <Badge className={statusColor}>
            {task.status || "-"}
          </Badge>

          <Badge className={priorityColor}>
            {task.priority || t("tasks.priority.low")}
          </Badge>

          {task.due_date && (
            <Badge className={dueDateBadgeClassName}>
              {dueDateLabel
                ? `${dueDateLabel} • ${dueDateDisplay}`
                : dueDateDisplay}
            </Badge>
          )}

          {checkpointState.behindSchedule && (
            <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
              {t("taskDetail.status.behindSchedule")}
            </Badge>
          )}

          {checkpointState.updateRequired && (
            <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
              {t("taskDetail.status.updateRequired")}
            </Badge>
          )}
        </div>

        {/* DESCRIPTION */}
        <div>
          <p className="text-slate-300 whitespace-pre-wrap">
            {task.description ||
              t("taskDetail.fallbacks.noDescription")}
          </p>
        </div>

        {/* PROGRESS */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-sm">
              {t("taskDetail.overview.progress")}
            </span>

            <span className="text-white text-sm">
              {progressValue}%
            </span>
          </div>

          <Progress
            value={progressValue}
            className="h-2 bg-slate-800"
          />
        </div>

        {/* STATUS UPDATE */}
        {canUpdateStatus && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-slate-300 text-sm font-medium">
                {t("taskDetail.overview.updateStatus")}
              </div>

              <Badge className={statusColor}>
                {task.status || "-"}
              </Badge>
            </div>

            <div className="flex gap-2">
              {statusOptions.map((opt) => {
                const isActive = normalizedStatus === opt.value;

                return (
                  <button
                    key={opt.value}
                    disabled={statusSaving}
                    onClick={() =>
                      handleStatusClick(opt.value, isActive)
                    }
                    className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
                      isActive
                        ? "bg-indigo-600 text-white border-indigo-500"
                        : "bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800 hover:text-white"
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
