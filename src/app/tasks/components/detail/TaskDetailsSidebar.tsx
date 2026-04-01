import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FolderKanban, Flag, CheckSquare, Calendar } from "lucide-react";
import { TaskRow, ProjectRow } from "../../lib/task.types";

interface InfoRowProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  valueClassName?: string;
}

function InfoRow({ icon, label, value, valueClassName = "text-white" }: InfoRowProps) {
  return (
    <div className="flex items-center gap-3">
      <div>{icon}</div>
      <div>
        <p className="text-xs text-slate-500">{label}</p>
        <p className={`${valueClassName} text-sm`}>{value}</p>
      </div>
    </div>
  );
}

interface TaskDetailsSidebarProps {
  task: TaskRow;
  project: ProjectRow | null;
  dueDateDisplay: string;
  dueDateColorClass: string;
  t: (key: string, options?: object) => string;
}

export function TaskDetailsSidebar({
  task,
  project,
  dueDateDisplay,
  dueDateColorClass,
  t,
}: TaskDetailsSidebarProps) {
  return (
    <Card className="bg-slate-900/50 border-slate-800 shrink-0">
      <CardHeader>
        <CardTitle className="text-white">{t("taskDetail.details.title")}</CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <InfoRow
          icon={<FolderKanban className="w-4 h-4 text-indigo-400" />}
          label={t("taskDetail.details.project")}
          value={project?.name || t("taskDetail.fallbacks.noProject")}
        />
        <InfoRow
          icon={<Flag className="w-4 h-4 text-amber-400" />}
          label={t("taskDetail.details.priority")}
          value={task.priority || "LOW"}
        />
        <InfoRow
          icon={<CheckSquare className="w-4 h-4 text-blue-400" />}
          label={t("taskDetail.details.status")}
          value={task.status || "-"}
        />
        <InfoRow
          icon={<Calendar className="w-4 h-4 text-green-400" />}
          label={t("taskDetail.details.dueDate")}
          value={dueDateDisplay}
          valueClassName={dueDateColorClass}
        />
      </CardContent>
    </Card>
  );
}
