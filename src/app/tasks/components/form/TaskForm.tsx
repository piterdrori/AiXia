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
import { TaskAssigneePicker } from "./TaskAssigneePicker";
import type { ProjectRow, ProfileRow, ProjectMemberRow, TaskPriority, TaskStatus, Role } from "../../lib/task.types";
import { canPerform } from "@/lib/permissions";
import { useLanguage } from "@/lib/i18n";

interface TaskFormProps {
  mode: "create" | "edit";
  // Form values
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
  
  // Data
  projects: ProjectRow[];
  projectMembers: ProjectMemberRow[];
  profiles: ProfileRow[];
  currentUserRole: Role | null;
  
  // States
  isBootstrapping: boolean;
  isMembersLoading: boolean;
  isSaving: boolean;
  error: string;
  
  // Handlers
  onSubmit: (e: FormEvent) => void;
  onCancel: () => void;
}

export function TaskForm({
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
}: TaskFormProps) {
  const { t } = useLanguage();

  const isCreate = mode === "create";

  return (
    <form onSubmit={onSubmit} className="flex h-full min-h-0 flex-col gap-4">
      {error && (
        <Alert className="bg-red-900/20 border-red-800 text-red-300">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {isBootstrapping && (
        <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-4">
          <div className="animate-pulse space-y-4">
            <div className="h-4 w-28 rounded bg-slate-800" />
            <div className="h-10 w-full rounded bg-slate-800" />
            <div className="h-4 w-24 rounded bg-slate-800" />
            <div className="h-28 w-full rounded bg-slate-800" />
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="title" className="text-slate-300">
          {t(isCreate ? "taskNew.form.taskTitle" : "taskEdit.form.taskTitle")}{" "}
          <span className="text-red-400">*</span>
        </Label>
        <Input
          id="title"
          placeholder={t(isCreate ? "taskNew.form.taskTitlePlaceholder" : "taskEdit.form.taskTitlePlaceholder")}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          disabled={isBootstrapping || isSaving}
          className="bg-slate-950 border-slate-800 text-white placeholder:text-slate-600"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description" className="text-slate-300">
          {t(isCreate ? "taskNew.form.description" : "taskEdit.form.description")}
        </Label>
        <Textarea
          id="description"
          placeholder={t(isCreate ? "taskNew.form.descriptionPlaceholder" : "taskEdit.form.descriptionPlaceholder")}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          disabled={isBootstrapping || isSaving}
          className="bg-slate-950 border-slate-800 text-white placeholder:text-slate-600 resize-none"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-5">
        <div className="space-y-2">
          <Label className="text-slate-300">
            {t(isCreate ? "taskNew.form.project" : "taskEdit.form.project")}{" "}
            <span className="text-red-400">*</span>
          </Label>
          <Select
            value={projectId}
            onValueChange={setProjectId}
            disabled={isBootstrapping || isSaving}
          >
            <SelectTrigger className="bg-slate-950 border-slate-800 text-white">
              <SelectValue placeholder={t(isCreate ? "taskNew.form.selectProject" : "taskEdit.form.selectProject")} />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-800">
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-slate-300">{t(isCreate ? "taskNew.form.priority" : "taskEdit.form.priority")}</Label>
          <Select
            value={priority}
            onValueChange={(v) => setPriority(v as TaskPriority)}
            disabled={isBootstrapping || isSaving}
          >
            <SelectTrigger className="bg-slate-950 border-slate-800 text-white">
              <SelectValue placeholder={t(isCreate ? "taskNew.form.selectPriority" : "taskEdit.form.selectPriority")} />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-800">
              <SelectItem value="LOW">{t(isCreate ? "taskNew.priority.low" : "taskEdit.priority.low")}</SelectItem>
              <SelectItem value="MEDIUM">{t(isCreate ? "taskNew.priority.medium" : "taskEdit.priority.medium")}</SelectItem>
              <SelectItem value="HIGH">{t(isCreate ? "taskNew.priority.high" : "taskEdit.priority.high")}</SelectItem>
              <SelectItem value="URGENT">{t(isCreate ? "taskNew.priority.urgent" : "taskEdit.priority.urgent")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-slate-300">{t(isCreate ? "taskNew.form.status" : "taskEdit.form.status")}</Label>
          <Select
            value={status}
            onValueChange={(v) => setStatus(v as TaskStatus)}
            disabled={isBootstrapping || isSaving}
          >
            <SelectTrigger className="bg-slate-950 border-slate-800 text-white">
              <SelectValue placeholder={t(isCreate ? "taskNew.form.selectStatus" : "taskEdit.form.selectStatus")} />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-800">
              <SelectItem value="TODO">{t(isCreate ? "taskNew.status.todo" : "taskEdit.status.todo")}</SelectItem>
              <SelectItem value="IN_PROGRESS">{t(isCreate ? "taskNew.status.inProgress" : "taskEdit.status.inProgress")}</SelectItem>
              <SelectItem value="IN_REVIEW">{t(isCreate ? "taskNew.status.inReview" : "taskEdit.status.inReview")}</SelectItem>
              <SelectItem value="DONE">{t(isCreate ? "taskNew.status.done" : "taskEdit.status.done")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="startDate" className="text-slate-300">
            {t(isCreate ? "taskNew.form.startDate" : "taskEdit.form.startDate")}
          </Label>
          <Input
            id="startDate"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            disabled={isBootstrapping || isSaving}
            className="bg-slate-950 border-slate-800 text-white"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="dueDate" className="text-slate-300">
            {t(isCreate ? "taskNew.form.dueDate" : "taskEdit.form.dueDate")}
          </Label>
          <Input
            id="dueDate"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            disabled={isBootstrapping || isSaving}
            className="bg-slate-950 border-slate-800 text-white"
          />
        </div>
      </div>

      <div className="flex-1 min-h-0 rounded-lg border border-slate-800 bg-slate-950/40 p-4">
        <TaskAssigneePicker
          projectId={projectId}
          projectMembers={projectMembers}
          profiles={profiles}
          selectedAssignees={selectedAssignees}
          toggleAssignee={toggleAssignee}
          isLoading={isMembersLoading}
          disabled={isSaving}
          label={t(isCreate ? "taskNew.form.assignMembers" : "taskEdit.form.assignees")}
          helperText={t(isCreate ? "taskNew.form.visibilityNote" : "taskEdit.assignees.projectRequirement")}
          selectProjectFirstText={t(isCreate ? "taskNew.assignees.selectProjectFirst" : "taskEdit.assignees.selectProjectFirst")}
          loadingText={t(isCreate ? "taskNew.assignees.loadingProjectMembers" : "taskEdit.assignees.loadingProjectMembers")}
          noAvailableText={t(isCreate ? "taskNew.assignees.noAvailableMembers" : "taskEdit.assignees.noneAvailable")}
        />
      </div>

      <div className="shrink-0 flex items-center justify-end gap-4 border-t border-slate-800 pt-3">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSaving}
          className="border-slate-700 text-slate-300 hover:bg-slate-800"
        >
          {t(isCreate ? "taskNew.actions.cancel" : "taskEdit.actions.cancel")}
        </Button>

        <Button
          type="submit"
          className="bg-indigo-600 hover:bg-indigo-700 text-white"
          disabled={
            isBootstrapping ||
            isSaving ||
            !currentUserRole ||
            !canPerform(currentUserRole, "createTasks")
          }
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {t(isCreate ? "taskNew.actions.creating" : "taskEdit.actions.saving")}
            </>
          ) : (
            t(isCreate ? "taskNew.actions.createTask" : "taskEdit.actions.saveChanges")
          )}
        </Button>
      </div>
    </form>
  );
}
