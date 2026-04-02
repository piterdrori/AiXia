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
import type { TaskRow, ProfileRow } from "../../lib/task.types";
import { getPriorityColor, getCheckpointState, getTaskDateDisplay } from "../../lib/task.utils";
import { MemberStack } from "./MemberStack";
import { useLanguage } from "@/lib/i18n";
import { useAppClock } from "@/lib/clock/provider";
import { formatDateInTimezone } from "@/lib/datetime";
import { CHINA_TIMEZONE } from "../../lib/task.constants";

interface TaskCardProps {
  task: TaskRow;
  assigneeProfiles: ProfileRow[];
  projectName: string;
  canEdit: boolean;
  canDelete: boolean;
  onDelete: (taskId: string) => void;
}

export function TaskCard({
  task,
  assigneeProfiles,
  projectName,
  canEdit,
  canDelete,
  onDelete,
}: TaskCardProps) {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const clock = useAppClock();
  
  const checkpoint = getCheckpointState(task, clock.todayKey);
  const dueDateInfo = getTaskDateDisplay(task.due_date, clock.todayKey);

  return (
    <Card
      draggable
      onDragStart={() => {}}
      className="group cursor-pointer border-slate-800 bg-slate-900 transition-all hover:border-indigo-500/30"
      onClick={() => navigate(`/tasks/${task.id}`)}
    >
      <CardContent className="p-4">
        <div className="mb-2 flex items-start justify-between">
          <Badge className={getPriorityColor(task.priority)}>
            {task.priority || t("tasks.priority.low")}
          </Badge>

          {(canEdit || canDelete) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100">
                  <MoreVertical className="w-3 h-3 text-slate-400" />
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" className="bg-slate-900 border-slate-800">
                {canEdit && (
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/tasks/${task.id}/edit`); }}>
                    <Edit className="w-4 h-4 mr-2" />
                    {t("tasks.actions.edit")}
                  </DropdownMenuItem>
                )}
                {canDelete && (
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDelete(task.id); }} className="text-red-400">
                    <Trash2 className="w-4 h-4 mr-2" />
                    {t("tasks.actions.delete")}
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <h4 className="mb-2 font-medium text-white">{task.title}</h4>

        <p className="mb-3 line-clamp-2 text-sm text-slate-500">
          {task.description || t("tasks.fallbacks.noDescription")}
        </p>

        <div className="mb-3 text-xs text-slate-500">{projectName}</div>

        <div className="mb-3 flex flex-wrap gap-2">
          {checkpoint.behindSchedule && (
            <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
              Behind Schedule
            </Badge>
          )}
          {checkpoint.updateRequired && (
            <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
              Update Required
            </Badge>
          )}
        </div>

        <div className="flex items-center justify-between">
          <MemberStack profiles={assigneeProfiles} />

          {task.due_date && (
            <div className={`text-sm ${dueDateInfo.color}`}>
              <div>
                {formatDateInTimezone(new Date(task.due_date), language)}
                {dueDateInfo.label && ` • ${dueDateInfo.label}`}
              </div>
              <div className="text-[10px] text-slate-500">
                {t("timezone.chinaTimeLabel", "China")}:{" "}
                {formatDateInTimezone(new Date(task.due_date), language, CHINA_TIMEZONE)}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
