import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useLanguage } from "@/lib/i18n";
import { useMemo, useCallback } from "react";

interface TaskPageHeaderProps {
  canCreate: boolean;
  isRefreshing: boolean;
  onRefresh: () => void;
}

export function TaskPageHeader({
  canCreate,
  isRefreshing,
  onRefresh,
}: TaskPageHeaderProps) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // =========================
  // DERIVED STATE
  // =========================

  const projectFilter = useMemo(
    () => searchParams.get("projectId") || "ALL",
    [searchParams]
  );

  const newTaskUrl = useMemo(() => {
    return projectFilter !== "ALL"
      ? `/tasks/new?projectId=${projectFilter}`
      : `/tasks/new`;
  }, [projectFilter]);

  const refreshLabel = useMemo(() => {
    return isRefreshing
      ? t("tasks.actions.refreshing")
      : t("tasks.actions.refresh");
  }, [isRefreshing, t]);

  // =========================
  // ACTIONS
  // =========================

  const handleCreateTask = useCallback(() => {
    navigate(newTaskUrl);
  }, [navigate, newTaskUrl]);

  const handleRefresh = useCallback(() => {
    onRefresh();
  }, [onRefresh]);

  // =========================
  // RENDER
  // =========================

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      {/* LEFT */}
      <div>
        <h1 className="text-2xl font-bold text-white">
          {t("tasks.header.title")}
        </h1>
        <p className="text-slate-400">
          {t("tasks.header.subtitle")}
        </p>
      </div>

      {/* RIGHT */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          className="border-slate-700 text-slate-300 hover:bg-slate-800"
          onClick={handleRefresh}
          disabled={isRefreshing}
        >
          {refreshLabel}
        </Button>

        {canCreate && (
          <Button
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
            onClick={handleCreateTask}
          >
            <Plus className="w-4 h-4 mr-2" />
            {t("tasks.actions.newTask")}
          </Button>
        )}
      </div>
    </div>
  );
}
