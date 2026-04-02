import { useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { ArrowLeft, Edit, Trash2 } from "lucide-react";

import { useLanguage } from "@/lib/i18n";

import type { TaskRow } from "../../lib/task.types";

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

export function TaskDetailHeader(props: TaskDetailHeaderProps) {
  const {
    task,
    projectName,
    canEdit,
    canDelete,
    isRefreshing,
    isDeleting,
    onRefresh,
    onDelete,
  } = props;

  const navigate = useNavigate();
  const { t } = useLanguage();

  // =========================
  // DERIVED
  // =========================

  const subtitle = useMemo(() => {
    return projectName || t("taskDetail.header.taskDetails");
  }, [projectName, t]);

  const refreshLabel = useMemo(() => {
    return isRefreshing
      ? t("taskDetail.actions.refreshing")
      : t("taskDetail.actions.refresh");
  }, [isRefreshing, t]);

  // =========================
  // ACTIONS
  // =========================

  const handleBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  const handleEdit = useCallback(() => {
    navigate(`/tasks/${task.id}/edit`);
  }, [navigate, task.id]);

  const handleRefresh = useCallback(() => {
    onRefresh();
  }, [onRefresh]);

  const handleDelete = useCallback(() => {
    onDelete();
  }, [onDelete]);

  // =========================
  // RENDER
  // =========================

  return (
    <div className="flex items-center gap-4 shrink-0">
      {/* BACK */}
      <Button
        variant="ghost"
        size="icon"
        onClick={handleBack}
        className="text-slate-400 hover:text-white"
      >
        <ArrowLeft className="w-5 h-5" />
      </Button>

      {/* TITLE */}
      <div className="flex-1">
        <h1 className="text-2xl font-bold text-white">
          {task.title}
        </h1>
        <p className="text-slate-400">
          {subtitle}
        </p>
      </div>

      {/* ACTIONS */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          className="border-slate-700 text-slate-300 hover:bg-slate-800"
          onClick={handleRefresh}
          disabled={isRefreshing}
        >
          {refreshLabel}
        </Button>

        {canEdit && (
          <Button
            variant="outline"
            onClick={handleEdit}
            className="border-slate-700 text-slate-300 hover:bg-slate-800"
          >
            <Edit className="w-4 h-4 mr-2" />
            {t("taskDetail.actions.edit")}
          </Button>
        )}

        {canDelete && (
          <Button
            variant="outline"
            onClick={handleDelete}
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
