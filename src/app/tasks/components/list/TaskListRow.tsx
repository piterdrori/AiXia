import { useMemo, useCallback } from "react";
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
  MoreVertical,
  Edit,
  Trash2,
  CheckSquare,
  Calendar,
} from "lucide-react";

import { useLanguage } from "@/lib/i18n";
import { useAppClock } from "@/lib/clock/provider";
import { formatDateInTimezone } from "@/lib/datetime";

import {
  getPriorityColor,
  getCheckpointState,
  getTaskDateDisplay,
} from "../../lib/task.utils";

import { CHINA_TIMEZONE } from "../../lib/task.constants";
import { MemberStack } from "./MemberStack";

import type { TaskRow, ProfileRow } from "../../lib/task.types";

interface TaskListRowProps {
  task: TaskRow;
  assigneeProfiles: ProfileRow[];
  projectName: string;
  canEdit: boolean;
  canDelete: boolean;
  onDelete: (taskId: string) => void;
}

export function TaskListRow(props: TaskListRowProps) {
  const {
    task,
    assigneeProfiles,
    projectName,
    canEdit,
    canDelete,
    onDelete,
  } = props;

  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const clock = useAppClock();

  // =========================
  // DERIVED STATE
  // =========================

  const isDone = useMemo(
    () => (task.status || "").toUpperCase() === "DONE",
    [task.status]
  );

  const checkpoint = useMemo(
    () => getCheckpointState(task, clock.todayKey),
    [task, clock.todayKey]
  );

  const dueDateInfo = useMemo(
    () => getTaskDateDisplay(task.due_date, clock.todayKey),
    [task.due_date, clock.todayKey]
  );

  const priorityColor = useMemo(
    () => getPriorityColor(task.priority),
    [task.priority]
  );

  // =========================
  // ACTIONS
  // =========================

  const handleNavigate = useCallback(() => {
    navigate(`/tasks/${task.id}`);
  }, [navigate, task.id]);

  const handleEdit = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      navigate(`/tasks/${task.id}/edit`);
    },
    [navigate, task.id]
  );

  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onDelete(task.id);
    },
    [onDelete, task.id]
  );

  // =========================
  // RENDER
  // =========================

  return (
    <div
      onClick={handleNavigate}
      className="flex items-center gap-4 p-4 hover:bg-slate-800/50 cursor-pointer transition-colors"
    >
      {/* STATUS ICON */}
      <CheckSquare
        className={`w-5 h-5 ${
          isDone ? "text-green-400" : "text-slate-500"
        }`}
      />

      {/* TITLE + DESCRIPTION */}
      <div className="flex-1 min-w-0">
        <h4
          className={`font-medium truncate ${
            isDone
              ? "text-slate-500 line-through"
              : "text-white"
          }`}
        >
          {task.title}
        </h4>

        <p className="text-slate-500 text-sm truncate">
          {task.description ||
            t("tasks.fallbacks.noDescription")}
        </p>
      </div>

      {/* DESKTOP INFO */}
      <div className="hidden sm:flex items-center gap-4">
        {/* PRIORITY + FLAGS */}
        <div className="flex flex-col gap-2">
          <Badge className={priorityColor}>
            {task.priority || t("tasks.priority.low")}
          </Badge>

          <div className="flex flex-wrap gap-2">
            {checkpoint.behindSchedule && (
              <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs">
                {t("tasks.labels.behindSchedule", "Behind Schedule")}
              </Badge>
            )}

            {checkpoint.updateRequired && (
              <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs">
                {t("tasks.labels.updateRequired", "Update Required")}
              </Badge>
            )}
          </div>
        </div>

        {/* PROJECT */}
        <span className="text-sm text-slate-500">
          {projectName}
        </span>

        {/* MEMBERS */}
        <MemberStack profiles={assigneeProfiles} size="medium" />

        {/* DUE DATE */}
        {task.due_date && (
          <div className={`text-xs ${dueDateInfo.color}`}>
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              <span>
                {formatDateInTimezone(
                  new Date(task.due_date),
                  language
                )}
                {dueDateInfo.label &&
                  ` • ${dueDateInfo.label}`}
              </span>
            </div>

            <div className="pl-4 text-[10px] text-slate-500">
              {t("timezone.chinaTimeLabel", "China")}:{" "}
              {formatDateInTimezone(
                new Date(task.due_date),
                language,
                CHINA_TIMEZONE
              )}
            </div>
          </div>
        )}
      </div>

      {/* ACTIONS */}
      {(canEdit || canDelete) && (
        <DropdownMenu>
          <DropdownMenuTrigger
            asChild
            onClick={(e) => e.stopPropagation()}
          >
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="w-4 h-4 text-slate-400" />
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            align="end"
            className="bg-slate-900 border-slate-800"
          >
            {canEdit && (
              <DropdownMenuItem onClick={handleEdit}>
                <Edit className="w-4 h-4 mr-2" />
                {t("tasks.actions.edit")}
              </DropdownMenuItem>
            )}

            {canDelete && (
              <DropdownMenuItem
                onClick={handleDelete}
                className="text-red-400"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {t("tasks.actions.delete")}
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
