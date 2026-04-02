import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { TaskRow, CheckpointState } from "../../lib/task.types";
import { getStatusColor, getPriorityColor } from "../../lib/task.utils";
import { useLanguage } from "@/lib/i18n";

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

export function TaskOverviewTab({
  task,
  checkpointState,
  dueDateDisplay,
  dueDateBadgeClassName,
  dueDateLabel,
  progressValue,
  canUpdateStatus,
  onStatusClick,
  statusSaving,
}: TaskOverviewTabProps) {
  const { t } = useLanguage();

  return (
    <Card className="bg-slate-900/50 border-slate-800">
      <CardHeader>
        <CardTitle className="text-white">{t("taskDetail.overview.title")}</CardTitle>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="flex flex-wrap gap-2">
          <Badge className={getStatusColor(task.status)}>{task.status || "-"}</Badge>
          <Badge className={getPriorityColor(task.priority)}>{task.priority || "LOW"}</Badge>

          {task.due_date && (
            <Badge className={dueDateBadgeClassName}>
              {dueDateLabel ? `${dueDateLabel} • ${dueDateDisplay}` : dueDateDisplay}
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

        <div>
          <p className="text-slate-300 whitespace-pre-wrap">
            {task.description || t("taskDetail.fallbacks.noDescription")}
          </p>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-sm">{t("taskDetail.overview.progress")}</span>
            <span className="text-white text-sm">{progressValue}%</span>
          </div>
          <Progress value={progressValue} className="h-2 bg-slate-800" />
        </div>

        {canUpdateStatus && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-slate-300 text-sm font-medium">
                {t("taskDetail.overview.updateStatus")}
              </div>
              <Badge className={getStatusColor(task.status)}>{task.status || "-"}</Badge>
            </div>

            <div className="flex gap-2">
              {[
                { value: "IN_PROGRESS", label: t("taskDetail.status.inProgress") },
                { value: "IN_REVIEW", label: t("taskDetail.status.inReview") },
                { value: "DONE", label: t("taskDetail.status.done") },
              ].map((statusOption) => {
                const isActive = (task.status || "").toUpperCase() === statusOption.value;
                return (
                  <button
                    key={statusOption.value}
                    disabled={statusSaving}
                    onClick={() => !isActive && onStatusClick(statusOption.value)}
                    className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
                      isActive
                        ? "bg-indigo-600 text-white border-indigo-500"
                        : "bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800 hover:text-white"
                    }`}
                  >
                    {statusOption.label}
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
