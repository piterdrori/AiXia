import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Edit, Trash2 } from "lucide-react";
import { TaskRow } from "../../lib/task.types";
import { useLanguage } from "@/lib/i18n";

interface TaskDetailHeaderProps {
  task: TaskRow;
  projectName?: string;
  canEdit: boolean;
  canDelete: boolean;
  isRefreshing: boolean;
  isDeleting: boolean;
  onRefresh: () => void;
  onDelete: () => void;
}

export function TaskDetailHeader({
  task,
  projectName,
  canEdit,
  canDelete,
  isRefreshing,
  isDeleting,
  onRefresh,
  onDelete,
}: TaskDetailHeaderProps) {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <div className="flex items-center gap-4 shrink-0">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => navigate("/tasks")}
        className="text-slate-400 hover:text-white"
      >
        <ArrowLeft className="w-5 h-5" />
      </Button>

      <div className="flex-1">
        <h1 className="text-2xl font-bold text-white">{task.title}</h1>
        <p className="text-slate-400">
          {projectName
            ? t("taskDetail.header.projectLabel", { name: projectName })
            : t("taskDetail.header.taskDetails")}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          className="border-slate-700 text-slate-300 hover:bg-slate-800"
          onClick={onRefresh}
          disabled={isRefreshing}
        >
          {isRefreshing ? t("taskDetail.actions.refreshing") : t("taskDetail.actions.refresh")}
        </Button>

        {canEdit && (
          <Button
            variant="outline"
            onClick={() => navigate(`/tasks/${task.id}/edit`)}
            className="border-slate-700 text-slate-300 hover:bg-slate-800"
          >
            <Edit className="w-4 h-4 mr-2" />
            {t("taskDetail.actions.edit")}
          </Button>
        )}

        {canDelete && (
          <Button
            variant="outline"
            onClick={onDelete}
            disabled={isDeleting}
            className="border-red-800 text-red-400 hover:bg-red-900/20"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            {t("taskDetail.actions.delete")}
          </Button>
        )}
      </div>
    </div>
  );
}
