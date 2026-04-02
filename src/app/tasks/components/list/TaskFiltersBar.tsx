import { useMemo, useCallback } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group";
import { Search, Grid3X3, List } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

import type { ProjectRow } from "../../lib/task.types";

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

export function TaskFiltersBar(props: TaskFiltersBarProps) {
  const {
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
  } = props;

  const { t } = useLanguage();

  // =========================
  // OPTIONS (MEMOIZED)
  // =========================

  const statusOptions = useMemo(
    () => [
      { value: "ALL", label: t("tasks.filters.allStatus") },
      { value: "TODO", label: t("tasks.status.todo") },
      { value: "IN_PROGRESS", label: t("tasks.status.inProgress") },
      { value: "IN_REVIEW", label: t("tasks.status.inReview") },
      { value: "DONE", label: t("tasks.status.done") },
    ],
    [t]
  );

  const priorityOptions = useMemo(
    () => [
      { value: "ALL", label: t("tasks.filters.allPriorities") },
      { value: "URGENT", label: t("tasks.priority.urgent") },
      { value: "HIGH", label: t("tasks.priority.high") },
      { value: "MEDIUM", label: t("tasks.priority.medium") },
      { value: "LOW", label: t("tasks.priority.low") },
    ],
    [t]
  );

  const projectOptions = useMemo(
    () => [
      { value: "ALL", label: t("tasks.filters.allProjects") },
      ...projects.map((p) => ({
        value: p.id,
        label: p.name,
      })),
    ],
    [projects, t]
  );

  // =========================
  // HANDLERS
  // =========================

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchQuery(e.target.value);
    },
    [setSearchQuery]
  );

  const handleViewChange = useCallback(
    (value: string) => {
      if (value === "board" || value === "list") {
        setViewMode(value);
      }
    },
    [setViewMode]
  );

  // =========================
  // RENDER HELPERS
  // =========================

  const renderSelect = (
    value: string,
    onChange: (value: string) => void,
    options: { value: string; label: string }[],
    widthClass: string,
    placeholder: string
  ) => (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={`${widthClass} bg-slate-900 border-slate-800 text-white`}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent
        position="popper"
        side="bottom"
        align="start"
        sideOffset={6}
        avoidCollisions={false}
        className="bg-slate-900 border-slate-800"
      >
        {options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  // =========================
  // RENDER
  // =========================

  return (
    <div className="flex flex-col lg:flex-row gap-4">
      {/* SEARCH */}
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <Input
          placeholder={t("tasks.filters.searchPlaceholder")}
          value={searchQuery}
          onChange={handleSearchChange}
          className="pl-10 bg-slate-900 border-slate-800 text-white placeholder:text-slate-600"
        />
      </div>

      {/* FILTERS */}
      <div className="flex flex-wrap gap-2">
        {renderSelect(
          statusFilter,
          setStatusFilter,
          statusOptions,
          "w-36",
          t("tasks.filters.status")
        )}

        {renderSelect(
          priorityFilter,
          setPriorityFilter,
          priorityOptions,
          "w-36",
          t("tasks.filters.priority")
        )}

        {renderSelect(
          projectFilter,
          setProjectFilter,
          projectOptions,
          "w-44",
          t("tasks.filters.project")
        )}

        {/* VIEW MODE */}
        <ToggleGroup
          type="single"
          value={viewMode}
          onValueChange={handleViewChange}
        >
          <ToggleGroupItem
            value="board"
            className="data-[state=on]:bg-slate-800"
          >
            <Grid3X3 className="w-4 h-4" />
          </ToggleGroupItem>

          <ToggleGroupItem
            value="list"
            className="data-[state=on]:bg-slate-800"
          >
            <List className="w-4 h-4" />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
    </div>
  );
}
