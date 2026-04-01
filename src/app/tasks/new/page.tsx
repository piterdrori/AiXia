import { useState, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/lib/supabase";
import { createRequestTracker } from "@/lib/safeAsync";
import { canPerform } from "@/lib/permissions";
import { taskSchema } from "@/lib/validation";
import { useLanguage } from "@/lib/i18n";
import { TaskForm } from "@/features/tasks/components/form/TaskForm";
import { useTaskFormData } from "@/features/tasks/hooks/useTaskFormData";
import { Role, TaskPriority, TaskStatus } from "@/features/tasks/lib/task.types";

export default function TaskNewPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const pageRequestTracker = useRef(createRequestTracker()).current;
  
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const {
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
  } = useTaskFormData("create");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (!currentUserRole || !canPerform(currentUserRole, "createTasks")) {
      setError(t("taskNew.errors.notAuthorized", "Not authorized"));
      return;
    }

    const validation = taskSchema.safeParse({
      title: title.trim(),
      projectId,
      startDate: startDate || undefined,
      dueDate: dueDate || undefined,
    });

    if (!validation.success) {
      const firstIssue = validation.error.issues[0];
      if (firstIssue?.path[0] === "title") {
        setError(t("taskNew.errors.taskTitleRequired"));
        return;
      }
      if (firstIssue?.path[0] === "projectId") {
        setError(t("taskNew.errors.projectRequired"));
        return;
      }
      setError(t("taskNew.errors.createTaskUnexpected"));
      return;
    }

    const requestId = pageRequestTracker.next();
    setIsSaving(true);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke("task-create", {
        body: {
          title: title.trim(),
          description: description.trim() || null,
          projectId,
          priority,
          status,
          startDate: startDate || null,
          dueDate: dueDate || null,
          assigneeIds: selectedAssignees,
        },
      });

      if (!pageRequestTracker.isLatest(requestId)) return;

      if (invokeError) {
        setError(invokeError.message || t("taskNew.errors.createTask"));
        return;
      }

      if (!data?.success) {
        setError(data?.error || t("taskNew.errors.createTask"));
        return;
      }

      navigate(`/projects/${projectId}`);
    } catch (err) {
      if (!pageRequestTracker.isLatest(requestId)) return;
      setError(t("taskNew.errors.createTaskUnexpected"));
    } finally {
      if (!pageRequestTracker.isLatest(requestId)) return;
      setIsSaving(false);
    }
  };

  return (
    <div className="w-full max-w-[calc(100vw-360px)] mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(projectId ? `/projects/${projectId}` : "/tasks")}
          className="text-slate-400 hover:text-white"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>

        <div>
          <h1 className="text-2xl font-bold text-white">{t("taskNew.header.title")}</h1>
          <p className="text-slate-400">{t("taskNew.header.subtitle")}</p>
        </div>
      </div>

      <Card className="w-full bg-slate-900/50 border border-slate-800 h-[calc(100vh-200px)] min-h-0">
        <CardContent className="flex h-full min-h-0 flex-col p-6">
          <TaskForm
            mode="create"
            title={title}
            setTitle={setTitle}
            description={description}
            setDescription={setDescription}
            projectId={projectId}
            setProjectId={setProjectId}
            priority={priority as TaskPriority}
            setPriority={setPriority as (v: TaskPriority) => void}
            status={status as TaskStatus}
            setStatus={setStatus as (v: TaskStatus) => void}
            startDate={startDate}
            setStartDate={setStartDate}
            dueDate={dueDate}
            setDueDate={setDueDate}
            selectedAssignees={selectedAssignees}
            toggleAssignee={toggleAssignee}
            projects={projects}
            projectMembers={projectMembers}
            profiles={profiles}
            currentUserRole={currentUserRole as Role}
            isBootstrapping={isBootstrapping}
            isMembersLoading={isMembersLoading}
            isSaving={isSaving}
            error={error}
            onSubmit={handleSubmit}
            onCancel={() => navigate(projectId ? `/projects/${projectId}` : "/tasks")}
          />
        </CardContent>
      </Card>
    </div>
  );
}
