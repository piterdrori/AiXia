import { useMemo, useCallback } from "react";
import type { FormEvent } from "react";

import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";

import { useLanguage } from "@/lib/i18n";
import { canPerform } from "@/lib/permissions";

import { TaskAssigneePicker } from "./TaskAssigneePicker";

import type {
  ProjectRow,
  ProfileRow,
  ProjectMemberRow,
  TaskPriority,
  TaskStatus,
  Role,
} from "../../lib/task.types";

interface TaskFormProps {
  mode: "create" | "edit";

  title: string;
  setTitle: (value: string) => void;

  description: string;
  setDescription: (value: string) => void;

  projectId: string;
  setProjectId: (value: string) => void;

  priority: TaskPriority;
  setPriority: (value: TaskPriority) => void;

  status: TaskStatus;
  setStatus: (value: TaskStatus) => void;

  startDate: string;
  setStartDate: (value: string) => void;

  dueDate: string;
  setDueDate: (value: string) => void;

  selectedAssignees: string[];
  toggleAssignee: (userId: string) => void;

  projects: ProjectRow[];
  projectMembers: ProjectMemberRow[];
  profiles: ProfileRow[];

  currentUserRole: Role | null;

  isBootstrapping: boolean;
  isMembersLoading: boolean;
  isSaving: boolean;
  error: string;

  onSubmit: (e: FormEvent) => void;
  onCancel: () => void;
}

export function TaskForm(props: TaskFormProps) {
  const {
    mode,
    title,
    setTitle,
    description,
    setDescription,
    projectId,
    setProjectId,
    priority,
    setPriority,
    status,
    setStatus,
    startDate,
    setStartDate,
    dueDate,
    setDueDate,
    selectedAssignees,
    toggleAssignee,
    projects,
    projectMembers,
    profiles,
    currentUserRole,
    isBootstrapping,
    isMembersLoading,
    isSaving,
    error,
    onSubmit,
    onCancel,
  } = props;

  const { t } = useLanguage();

  const isCreate = mode === "create";

  // =========================
  // TRANSLATION KEYS (CENTRALIZED)
  // =========================

  const text = useMemo(() => {
    const base = isCreate ? "taskNew" : "taskEdit";

    return {
      title: t(`${base}.form.taskTitle`),
      titlePlaceholder: t(`${base}.form.taskTitlePlaceholder`),
      description: t(`${base}.form.description`),
      descriptionPlaceholder: t(`${base}.form.descriptionPlaceholder`),
      project: t(`${base}.form.project`),
      selectProject: t(`${base}.form.selectProject`),
      priority: t(`${base}.form.priority`),
      selectPriority: t(`${base}.form.selectPriority`),
      status: t(`${base}.form.status`),
      selectStatus: t(`${base}.form.selectStatus`),
      startDate: t(`${base}.form.startDate`),
      dueDate: t(`${base}.form.dueDate`),
      cancel: t(`${base}.actions.cancel`),
      submit: t(
        isCreate
          ? `${base}.actions.createTask`
          : `${base}.actions.saveChanges`
      ),
      submitting: t(
        isCreate
          ? `${base}.actions.creating`
          : `${base}.actions.saving`
      ),
    };
  }, [isCreate, t]);

  // =========================
  // OPTIONS
  // =========================

  const priorityOptions = useMemo(
    () => [
      { value: "LOW", label: t("tasks.priority.low") },
      { value: "MEDIUM", label: t("tasks.priority.medium") },
      { value: "HIGH", label: t("tasks.priority.high") },
      { value: "URGENT", label: t("tasks.priority.urgent") },
    ],
    [t]
  );

  const statusOptions = useMemo(
    () => [
      { value: "TODO", label: t("tasks.status.todo") },
      { value: "IN_PROGRESS", label: t("tasks.status.inProgress") },
      { value: "IN_REVIEW", label: t("tasks.status.inReview") },
      { value: "DONE", label: t("tasks.status.done") },
    ],
    [t]
  );

  // =========================
  // HANDLERS
  // =========================

  const handleSubmit = useCallback(
    (e: FormEvent) => {
      onSubmit(e);
    },
    [onSubmit]
  );

  const isDisabled =
    isBootstrapping ||
    isSaving ||
    !currentUserRole ||
    !canPerform(currentUserRole, "createTasks");

  // =========================
  // RENDER
  // =========================

  return (
    <form
      onSubmit={handleSubmit}
      className="flex h-full min-h-0 flex-col gap-4"
    >
      {/* ERROR */}
      {error && (
        <Alert className="bg-red-900/20 border-red-800 text-red-300">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* TITLE */}
      <div className="space-y-2">
        <Label>{text.title} *</Label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={text.titlePlaceholder}
          disabled={isDisabled}
        />
      </div>

      {/* DESCRIPTION */}
      <div className="space-y-2">
        <Label>{text.description}</Label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={text.descriptionPlaceholder}
          rows={4}
          disabled={isDisabled}
        />
      </div>

      {/* GRID */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-5">
        {/* PROJECT */}
        <Select value={projectId} onValueChange={setProjectId}>
          <SelectTrigger>
            <SelectValue placeholder={text.selectProject} />
          </SelectTrigger>
          <SelectContent>
            {projects.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* PRIORITY */}
        <Select
          value={priority}
          onValueChange={(v) => setPriority(v as TaskPriority)}
        >
          <SelectTrigger>
            <SelectValue placeholder={text.selectPriority} />
          </SelectTrigger>
          <SelectContent>
            {priorityOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* STATUS */}
        <Select
          value={status}
          onValueChange={(v) => setStatus(v as TaskStatus)}
        >
          <SelectTrigger>
            <SelectValue placeholder={text.selectStatus} />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* DATES */}
        <Input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          disabled={isDisabled}
        />

        <Input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          disabled={isDisabled}
        />
      </div>

      {/* ASSIGNEES */}
      <div className="flex-1 min-h-0 rounded-lg border p-4">
        <TaskAssigneePicker
          projectId={projectId}
          projectMembers={projectMembers}
          profiles={profiles}
          selectedAssignees={selectedAssignees}
          toggleAssignee={toggleAssignee}
          isLoading={isMembersLoading}
          disabled={isSaving}
        />
      </div>

      {/* ACTIONS */}
      <div className="flex justify-end gap-4 border-t pt-3">
        <Button variant="outline" onClick={onCancel}>
          {text.cancel}
        </Button>

        <Button type="submit" disabled={isDisabled}>
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {text.submitting}
            </>
          ) : (
            text.submit
          )}
        </Button>
      </div>
    </form>
  );
}
