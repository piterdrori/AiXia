import { useCallback, useMemo } from "react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
  Calendar,
  CheckSquare,
  Edit,
  MoreVertical,
  Trash2,
} from "lucide-react";

import { useLanguage } from "@/lib/i18n";
import { useAppClock } from "@/lib/clock/provider";

import {
  getCheckpointState,
  getPriorityColor,
  getTaskDateDisplay,
} from "../../lib/task.utils";

import { MemberStack } from "./MemberStack";

import type { ProfileRow, TaskRow } from "../../lib/task.types";

interface TaskListRowProps {
  task: TaskRow;
  assigneeProfiles: ProfileRow[];
  projectName: string;
  canEdit: boolean;
  canDelete: boolean;
  onDelete: (taskId: string) => void;
}

export function TaskListRow({
  task,
  assigneeProfiles,
  projectName,
  canEdit,
  canDelete,
  onDelete,
}: TaskListRowProps) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const clock = useAppClock();

  const isDone = useMemo(
    () => (task.status || "").toUpperCase() === "DONE",
    [task.status],
  );

  const checkpoint = useMemo(
    () => getCheckpointState(task, clock.todayKey),
    [task, clock.todayKey],
  );

  const dueDateInfo = useMemo(
    () => getTaskDateDisplay(task.due_date, clock.todayKey),
    [task.due_date, clock.todayKey],
  );

  const priorityColor = useMemo(
    () => getPriorityColor(task.priority),
    [task.priority],
  );

  const handleNavigate = useCallback(() => {
    navigate(`/tasks/${task.id}`);
  }, [navigate, task.id]);

  const handleEdit = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      navigate(`/tasks/${task.id}/edit`);
    },
    [navigate, task.id],
  );

  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onDelete(task.id);
    },
    [onDelete, task.id],
  );

  return (
    <div
      onClick={handleNavigate}
      className="flex cursor-pointer items-center gap-4 p-4 transition-colors hover:bg-slate-800/50"
    >
      <CheckSquare
        className={`h-5 w-5 ${isDone ? "text-green-400" : "text-slate-500"}`}
      />

      <div className="min-w-0 flex-1">
        <h4
          className={`truncate font-medium ${
            isDone ? "line-through text-slate-500" : "text-white"
          }`}
        >
          {task.title}
        </h4>
        <p className="truncate text-sm text-slate-500">
          {task.description || t("tasks.fallbacks.noDescription")}
        </p>
      </div>

      <div className="hidden items-center gap-4 sm:flex">
        <div className="flex flex-col gap-2">
          <Badge className={priorityColor}>
            {task.priority || t("tasks.priority.low")}
          </Badge>

          <div className="flex flex-wrap gap-2">
            {checkpoint.behindSchedule && (
              <Badge className="border-red-500/30 bg-red-500/20 text-xs text-red-400">
                {t("tasks.labels.behindSchedule")}
              </Badge>
            )}
            {checkpoint.updateRequired && (
              <Badge className="border-amber-500/30 bg-amber-500/20 text-xs text-amber-400">
                {t("tasks.labels.updateRequired")}
              </Badge>
            )}
          </div>
        </div>

        <span className="text-sm text-slate-500">{projectName}</span>

        <MemberStack profiles={assigneeProfiles} size="medium" />

        {task.due_date && (
          <div className={`text-xs ${dueDateInfo.color}`}>
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>
                {format(clock.shiftDate(task.due_date), "MMM d, yyyy")}
                {dueDateInfo.label && ` • ${dueDateInfo.label}`}
              </span>
            </div>
          </div>
        )}
      </div>

      {(canEdit || canDelete) && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4 text-slate-400" />
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            align="end"
            className="border-slate-800 bg-slate-900"
          >
            {canEdit && (
              <DropdownMenuItem onClick={handleEdit}>
                <Edit className="mr-2 h-4 w-4" />
                {t("tasks.actions.edit")}
              </DropdownMenuItem>
            )}
            {canDelete && (
              <DropdownMenuItem onClick={handleDelete} className="text-red-400">
                <Trash2 className="mr-2 h-4 w-4" />
                {t("tasks.actions.delete")}
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
