import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Search, Grid3X3, List } from "lucide-react";
import type { ProjectRow } from "../../lib/task.types";
import { useLanguage } from "@/lib/i18n";

interface TaskFiltersBarProps {
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  statusFilter: string;
  setStatusFilter: (value: string) => void;
  priorityFilter: string;
  setPriorityFilter: (value: string) => void;
  projectFilter: string;
  setProjectFilter: (value: string) => void;
  viewMode: "board" | "list";
  setViewMode: (value: "board" | "list") => void;
  projects: ProjectRow[];
}

export function TaskFiltersBar({
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter,
  priorityFilter,
  setPriorityFilter,
  projectFilter,
  setProjectFilter,
  viewMode,
  setViewMode,
  projects,
}: TaskFiltersBarProps) {
  const { t } = useLanguage();

  return (
    <div className="flex flex-col lg:flex-row gap-4">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <Input
          placeholder={t("tasks.filters.searchPlaceholder")}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-slate-900 border-slate-800 text-white placeholder:text-slate-600"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36 bg-slate-900 border-slate-800 text-white">
            <SelectValue placeholder={t("tasks.filters.status")} />
          </SelectTrigger>
          <SelectContent
            position="popper"
            side="bottom"
            align="start"
            sideOffset={6}
            avoidCollisions={false}
            className="bg-slate-900 border-slate-800"
          >
            <SelectItem value="ALL">{t("tasks.filters.allStatus")}</SelectItem>
            <SelectItem value="TODO">{t("tasks.status.todo")}</SelectItem>
            <SelectItem value="IN_PROGRESS">{t("tasks.status.inProgress")}</SelectItem>
            <SelectItem value="IN_REVIEW">{t("tasks.status.inReview")}</SelectItem>
            <SelectItem value="DONE">{t("tasks.status.done")}</SelectItem>
          </SelectContent>
        </Select>

        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-36 bg-slate-900 border-slate-800 text-white">
            <SelectValue placeholder={t("tasks.filters.priority")} />
          </SelectTrigger>
          <SelectContent
            position="popper"
            side="bottom"
            align="start"
            sideOffset={6}
            avoidCollisions={false}
            className="bg-slate-900 border-slate-800"
          >
            <SelectItem value="ALL">{t("tasks.filters.allPriorities")}</SelectItem>
            <SelectItem value="URGENT">{t("tasks.priority.urgent")}</SelectItem>
            <SelectItem value="HIGH">{t("tasks.priority.high")}</SelectItem>
            <SelectItem value="MEDIUM">{t("tasks.priority.medium")}</SelectItem>
            <SelectItem value="LOW">{t("tasks.priority.low")}</SelectItem>
          </SelectContent>
        </Select>

        <Select value={projectFilter} onValueChange={setProjectFilter}>
          <SelectTrigger className="w-44 bg-slate-900 border-slate-800 text-white">
            <SelectValue placeholder={t("tasks.filters.project")} />
          </SelectTrigger>
          <SelectContent
            position="popper"
            side="bottom"
            align="start"
            sideOffset={6}
            avoidCollisions={false}
            className="bg-slate-900 border-slate-800"
          >
            <SelectItem value="ALL">{t("tasks.filters.allProjects")}</SelectItem>
            {projects.map((project) => (
              <SelectItem key={project.id} value={project.id}>
                {project.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <ToggleGroup
          type="single"
          value={viewMode}
          onValueChange={(value) => value && setViewMode(value as "board" | "list")}
        >
          <ToggleGroupItem value="board" className="data-[state=on]:bg-slate-800">
            <Grid3X3 className="w-4 h-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="list" className="data-[state=on]:bg-slate-800">
            <List className="w-4 h-4" />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
    </div>
  );
}
