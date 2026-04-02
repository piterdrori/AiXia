import { useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { MoreVertical, Edit, Trash2 } from "lucide-react";

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

interface TaskCardProps {
  task: TaskRow;
  assigneeProfiles: ProfileRow[];
  projectName: string;
  canEdit: boolean;
  canDelete: boolean;
  onDelete: (taskId: string) => void;
  onDragStart?: (taskId: string) => void;
}

export function TaskCard(props: TaskCardProps) {
  const {
    task,
    assigneeProfiles,
    projectName,
    canEdit,
    canDelete,
    onDelete,
    onDragStart,
  } = props;

  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const clock = useAppClock();

  // =========================
  // DERIVED STATE
  // =========================

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

  const handleDragStart = useCallback(() => {
    onDragStart?.(task.id);
  }, [onDragStart, task.id]);

  // =========================
  // RENDER
  // =========================

  return (
    <Card
      draggable
      onDragStart={handleDragStart}
      className="group cursor-pointer border-slate-800 bg-slate-900 transition-all hover:border-indigo-500/30"
      onClick={handleNavigate}
    >
      <CardContent className="p-4">
        {/* HEADER */}
        <div className="mb-2 flex items-start justify-between">
          <Badge className={priorityColor}>
            {task.priority || t("tasks.priority.low")}
          </Badge>

          {(canEdit || canDelete) && (
            <DropdownMenu>
              <DropdownMenuTrigger
                asChild
                onClick={(e) => e.stopPropagation()}
              >
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100"
                >
                  <MoreVertical className="w-3 h-3 text-slate-400" />
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

        {/* TITLE */}
        <h4 className="mb-2 font-medium text-white">
          {task.title}
        </h4>

        {/* DESCRIPTION */}
        <p className="mb-3 line-clamp-2 text-sm text-slate-500">
          {task.description || t("tasks.fallbacks.noDescription")}
        </p>

        {/* PROJECT */}
        <div className="mb-3 text-xs text-slate-500">
          {projectName}
        </div>

        {/* STATUS BADGES */}
        <div className="mb-3 flex flex-wrap gap-2">
          {checkpoint.behindSchedule && (
            <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
              {t("tasks.labels.behindSchedule", "Behind Schedule")}
            </Badge>
          )}

          {checkpoint.updateRequired && (
            <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
              {t("tasks.labels.updateRequired", "Update Required")}
            </Badge>
          )}
        </div>

        {/* FOOTER */}
        <div className="flex items-center justify-between">
          <MemberStack profiles={assigneeProfiles} />

          {task.due_date && (
            <div className={`text-sm ${dueDateInfo.color}`}>
              <div>
                {formatDateInTimezone(
                  new Date(task.due_date),
                  language
                )}
                {dueDateInfo.label && ` • ${dueDateInfo.label}`}
              </div>

              <div className="text-[10px] text-slate-500">
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
      </CardContent>
    </Card>
  );
}
