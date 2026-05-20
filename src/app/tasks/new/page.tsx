import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { createRequestTracker } from "@/lib/safeAsync";
import { useLanguage } from "@/lib/i18n";
import { taskSchema } from "@/lib/validation";
import { canPerform } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Check, Loader2, Users } from "lucide-react";
import { AixiaHero, AixiaPage } from "@/components/aixia";
import { initialsFromDisplayName } from "@/app/dashboard/components/DashboardMemberStatusDot";
import { TaskCustomFieldsForm } from "@/components/tasks/TaskCustomFieldsForm";
import {
  buildCustomFieldPayload,
  loadDefinitionsForTaskForm,
  validateRequiredCustomFields,
  valuesFromRows,
} from "@/lib/tasks/customFields";
import { loadTopLevelTasksForProject } from "@/lib/tasks/taskLifecycle";
import type {
  CustomFieldFormValue,
  ProjectTaskFieldDefinitionRow,
  TaskRowExtended,
} from "@/lib/tasks/types";
import "@/styles/dashboard/tokens.css";
import "@/styles/dashboard/layout.css";
import "@/styles/dashboard/visual.css";
import "@/styles/projects/projects-visual.css";
import "@/styles/tasks/tasks-visual.css";


type Role = "admin" | "manager" | "employee" | "guest";
type TaskStatus = "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";
type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

type ProjectRow = {
  id: string;
  name: string;
  created_by: string | null;
};

type ProjectMemberRow = {
  id: string;
  project_id: string;
  user_id: string;
  role: string;
  created_at: string;
};

type ProfileRow = {
  user_id: string;
  full_name: string | null;
  role: Role;
  status: "active" | "pending" | "inactive" | "denied";
};

function normalizeTaskId(value: unknown): string | null {
  if (value == null) return null;
  const trimmed = String(value).trim();
  return trimmed ? trimmed.toLowerCase() : null;
}

function readCreatedParentTaskId(task: Record<string, unknown> | undefined): string | null {
  if (!task) return null;
  return normalizeTaskId(task.parent_task_id ?? task.parentTaskId);
}

export default function TaskNewPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useLanguage();

  const pageRequestTracker = useRef(createRequestTracker());
  const membersRequestTracker = useRef(createRequestTracker());

  const initialProjectId = searchParams.get("projectId") || "";
  const initialParentTaskId = searchParams.get("parentTaskId") || "";
  const isSubtaskFlow = Boolean(initialParentTaskId);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [projectId, setProjectId] = useState(initialProjectId);
  const [priority, setPriority] = useState<TaskPriority>("MEDIUM");
  const [status, setStatus] = useState<TaskStatus>("TODO");
  const [startDate, setStartDate] = useState("");
  const [dueDate, setDueDate] = useState("");

  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [projectMembers, setProjectMembers] = useState<ProjectMemberRow[]>([]);
  const [allProjectMembers, setAllProjectMembers] = useState<ProjectMemberRow[]>([]);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [parentTaskId, setParentTaskId] = useState(initialParentTaskId);
  const [parentTaskOptions, setParentTaskOptions] = useState<TaskRowExtended[]>([]);
  const [fieldDefinitions, setFieldDefinitions] = useState<ProjectTaskFieldDefinitionRow[]>([]);
  const [customFieldValues, setCustomFieldValues] = useState<
    Record<string, CustomFieldFormValue>
  >({});

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<Role | null>(null);

  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isMembersLoading, setIsMembersLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    const loadPage = async () => {
      const requestId = pageRequestTracker.current.next();
      setIsBootstrapping(true);
      setError("");

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!mounted || !pageRequestTracker.current.isLatest(requestId)) return;

        if (!user) {
          navigate("/login");
          return;
        }

        setCurrentUserId(user.id);

        const [
          { data: myProfile, error: myProfileError },
          { data: allProjects, error: projectsError },
          { data: allProjectMembers, error: projectMembersError },
          { data: allProfiles, error: profilesError },
        ] = await Promise.all([
          supabase.from("profiles").select("role").eq("user_id", user.id).single(),
          supabase
            .from("projects")
            .select("id, name, created_by")
            .order("created_at", { ascending: false }),
          supabase
            .from("project_members")
            .select("id, project_id, user_id, role, created_at"),
          supabase
            .from("profiles")
            .select("user_id, full_name, role, status")
            .eq("status", "active")
            .order("full_name", { ascending: true }),
        ]);

        if (!mounted || !pageRequestTracker.current.isLatest(requestId)) return;

        if (myProfileError || !myProfile) {
          navigate("/tasks");
          return;
        }

        const role = myProfile.role as Role;
        setCurrentUserRole(role);

        if (!canPerform(role, "createTasks")) {
  navigate("/tasks");
  return;
}

        if (projectsError) {
          setProjects([]);
          setError(projectsError.message || t("taskNew.errors.loadProjects"));
        }

        if (profilesError) {
          setProfiles([]);
          setError(profilesError.message || t("taskNew.errors.loadTeamMembers"));
        }

        if (projectMembersError) {
          setAllProjectMembers([]);
          setError(projectMembersError.message || t("taskNew.errors.loadProjectMembers"));
        }

        const projectsData = (allProjects || []) as ProjectRow[];
        const projectMembersData = (allProjectMembers || []) as ProjectMemberRow[];
        const profilesData = (allProfiles || []) as ProfileRow[];

        const visibleProjects =
          role === "admin"
            ? projectsData
            : projectsData.filter((project) => {
                const isCreator = project.created_by === user.id;
                const isAssigned = projectMembersData.some(
                  (member) =>
                    member.project_id === project.id && member.user_id === user.id
                );
                return isCreator || isAssigned;
              });

        setProjects(visibleProjects);
        setProfiles(profilesData);
        setAllProjectMembers(projectMembersData);

        let resolvedProjectId =
          initialProjectId && visibleProjects.some((p) => p.id === initialProjectId)
            ? initialProjectId
            : "";

        if (!resolvedProjectId && initialParentTaskId) {
          const { data: parentRow } = await supabase
            .from("tasks")
            .select("project_id")
            .eq("id", initialParentTaskId)
            .is("parent_task_id", null)
            .is("deleted_at", null)
            .maybeSingle();

          const parentProjectId = (parentRow?.project_id as string | null) || "";
          if (
            parentProjectId &&
            visibleProjects.some((p) => p.id === parentProjectId)
          ) {
            resolvedProjectId = parentProjectId;
          }
        }

        setProjectId(resolvedProjectId);

        if (resolvedProjectId) {
          const initialMembers = projectMembersData.filter(
            (member) => member.project_id === resolvedProjectId
          );
          setProjectMembers(initialMembers);
        } else {
          setProjectMembers([]);
        }
      } catch (err) {
        if (!mounted || !pageRequestTracker.current.isLatest(requestId)) return;
        console.error("Load task new page error:", err);
        setError(t("taskNew.errors.loadPage"));
      } finally {
        if (!mounted || !pageRequestTracker.current.isLatest(requestId)) return;
        setIsBootstrapping(false);
      }
    };

    void loadPage();

    return () => {
      mounted = false;
    };
  }, [navigate, initialProjectId, initialParentTaskId, t]);

  useEffect(() => {
    let mounted = true;

    const loadMembersForProject = async () => {
      const requestId = membersRequestTracker.current.next();

      if (!projectId) {
        setProjectMembers([]);
        setSelectedAssignees([]);
        setIsMembersLoading(false);
        return;
      }

      const cachedMembers = allProjectMembers.filter(
        (member) => member.project_id === projectId
      );

      if (cachedMembers.length > 0) {
        setProjectMembers(cachedMembers);
        setSelectedAssignees((prev) =>
          prev.filter((userId) =>
            cachedMembers.some((member) => member.user_id === userId)
          )
        );
        setIsMembersLoading(false);
        return;
      }

      setIsMembersLoading(true);

      try {
        const { data, error: membersError } = await supabase
          .from("project_members")
          .select("id, project_id, user_id, role, created_at")
          .eq("project_id", projectId);

        if (!mounted || !membersRequestTracker.current.isLatest(requestId)) return;

        if (membersError) {
          console.error("Load project members error:", membersError);
          setProjectMembers([]);
          setSelectedAssignees([]);
          return;
        }

        const members = (data || []) as ProjectMemberRow[];
        setProjectMembers(members);

        setAllProjectMembers((prev) => {
          const withoutProject = prev.filter((item) => item.project_id !== projectId);
          return [...withoutProject, ...members];
        });

        setSelectedAssignees((prev) =>
          prev.filter((userId) => members.some((member) => member.user_id === userId))
        );
      } catch (err) {
        if (!mounted || !membersRequestTracker.current.isLatest(requestId)) return;
        console.error("Unexpected load project members error:", err);
        setProjectMembers([]);
        setSelectedAssignees([]);
      } finally {
        if (!mounted || !membersRequestTracker.current.isLatest(requestId)) return;
        setIsMembersLoading(false);
      }
    };

    void loadMembersForProject();

    return () => {
      mounted = false;
    };
  }, [projectId, allProjectMembers]);

  useEffect(() => {
    let mounted = true;

    const loadProjectTaskExtras = async () => {
      if (!projectId) {
        setParentTaskOptions([]);
        setFieldDefinitions([]);
        setCustomFieldValues({});
        if (!isSubtaskFlow) {
          setParentTaskId("");
        }
        return;
      }

      try {
        const [parents, formDefs] = await Promise.all([
          loadTopLevelTasksForProject(projectId),
          loadDefinitionsForTaskForm(projectId, null, "create"),
        ]);

        if (!mounted) return;

        let parentOptions = parents;

        if (
          isSubtaskFlow &&
          initialParentTaskId &&
          !parents.some((task) => task.id === initialParentTaskId)
        ) {
          const { data: lockedParent } = await supabase
            .from("tasks")
            .select("*")
            .eq("id", initialParentTaskId)
            .eq("project_id", projectId)
            .is("parent_task_id", null)
            .is("deleted_at", null)
            .is("archived_at", null)
            .maybeSingle();

          if (lockedParent) {
            parentOptions = [lockedParent as TaskRowExtended, ...parents];
          }
        }

        setParentTaskOptions(parentOptions);
        setFieldDefinitions(formDefs.definitions);
        setCustomFieldValues(valuesFromRows(formDefs.definitions, {}));

        if (isSubtaskFlow && initialParentTaskId) {
          setParentTaskId(initialParentTaskId);
        } else if (
          parentTaskId &&
          !parentOptions.some((task) => task.id === parentTaskId)
        ) {
          setParentTaskId("");
        }
      } catch (err) {
        if (!mounted) return;
        console.error("Load project task extras:", err);
      }
    };

    void loadProjectTaskExtras();

    return () => {
      mounted = false;
    };
  }, [projectId, initialParentTaskId, isSubtaskFlow]);

  const availableAssignees = useMemo(() => {
    return projectMembers
      .map((member) => profiles.find((profile) => profile.user_id === member.user_id))
      .filter((profile): profile is ProfileRow => Boolean(profile));
  }, [projectMembers, profiles]);

  const toggleAssignee = (userId: string) => {
    setSelectedAssignees((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

   if (!currentUserRole || !canPerform(currentUserRole, "createTasks")) {
  setError(t("taskNew.errors.notAuthorized", "Not authorized"));
  return;
}
    
    if (!currentUserId) {
  setError(t("taskNew.errors.userSessionNotFound"));
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

  if (firstIssue?.path[0] === "startDate") {
    setError(t("taskNew.errors.invalidStartDate"));
    return;
  }

  if (firstIssue?.path[0] === "dueDate") {
    setError(t("taskNew.errors.invalidDueDate"));
    return;
  }

  setError(t("taskNew.errors.createTaskUnexpected"));
  return;
}

    const requestId = pageRequestTracker.current.next();
    setIsSaving(true);

    try {
      const selectedProject = projects.find((project) => project.id === projectId);

      if (!pageRequestTracker.current.isLatest(requestId)) return;

      if (!selectedProject) {
        setError(t("taskNew.errors.selectedProjectUnavailable"));
        return;
      }

      const missingField = validateRequiredCustomFields(
        fieldDefinitions,
        customFieldValues
      );
      if (missingField) {
        setError(`"${missingField}" is required.`);
        return;
      }

      const resolvedParentTaskId = normalizeTaskId(
        parentTaskId || initialParentTaskId || null
      );

      if (isSubtaskFlow && !resolvedParentTaskId) {
        setError(
          t(
            "taskNew.errors.parentTaskRequired",
            "Parent task is required for subtasks."
          )
        );
        return;
      }

      const { data, error: invokeError } = await supabase.functions.invoke(
        "task-create",
        {
          body: {
            title: title.trim(),
            description: description.trim() || null,
            projectId,
            priority,
            status,
            startDate: startDate || null,
            dueDate: dueDate || null,
            parentTaskId: resolvedParentTaskId,
            parent_task_id: resolvedParentTaskId,
            assigneeIds: selectedAssignees,
            customFieldValues: buildCustomFieldPayload(
              fieldDefinitions,
              customFieldValues
            ),
          },
        }
      );

      if (!pageRequestTracker.current.isLatest(requestId)) return;

      if (invokeError) {
        console.error("Task create function invoke error:", invokeError);
        setError(invokeError.message || t("taskNew.errors.createTask"));
        return;
      }

      if (!data?.success) {
        setError(data?.error || t("taskNew.errors.createTask"));
        return;
      }

      const createdParentId = readCreatedParentTaskId(
        data?.task as Record<string, unknown> | undefined
      );
      if (resolvedParentTaskId && createdParentId !== resolvedParentTaskId) {
        setError(
          (typeof data?.error === "string" && data.error) ||
            t(
              "taskNew.errors.parentLinkFailed",
              "Subtask was created without a parent link. Please try again."
            )
        );
        return;
      }

      if (!pageRequestTracker.current.isLatest(requestId)) return;
      const createdTaskId = data?.task?.id as string | undefined;
      if (isSubtaskFlow && initialParentTaskId) {
        navigate(`/tasks/${initialParentTaskId}`, {
          state: { subtaskCreated: createdTaskId ?? true },
        });
        return;
      }
      navigate(createdTaskId ? `/tasks/${createdTaskId}` : `/projects/${projectId}`);
    } catch (err) {
      if (!pageRequestTracker.current.isLatest(requestId)) return;
      console.error("Create task submit error:", err);
      setError(t("taskNew.errors.createTaskUnexpected"));
    } finally {
      if (!pageRequestTracker.current.isLatest(requestId)) return;
      setIsSaving(false);
    }
  };

  const taskParentPath = initialParentTaskId
    ? `/tasks/${initialParentTaskId}`
    : projectId
      ? `/projects/${projectId}`
      : "/tasks";
  const taskParentLabel = initialParentTaskId
    ? t("taskNew.kicker.subtasks", "Subtasks")
    : t("tasks.header.title", "Tasks");

  return (
    <AixiaPage
      surface="command"
      className="aixia-command-page aixia-tasks-page aixia-tasks-page--new h-full flex flex-col overflow-hidden"
    >
      <AixiaHero
        surface="command"
        className="shrink-0"
        parentLabel={taskParentLabel}
        parentPath={taskParentPath}
        gradientTitle={taskParentLabel}
        title={t("taskNew.header.title")}
        subtitle={t(
          initialParentTaskId
            ? "taskNew.subtitle.addSubtask"
            : "taskNew.header.subtitle"
        )}
      />
      <div className="aixia-command-scroll flex min-h-0 flex-1 flex-col">
          <form onSubmit={handleSubmit} className="aixia-tasks-new-form space-y-4">
  {error && (
    <Alert className="aixia-tasks-alert-error shrink-0">
      <AlertDescription>{error}</AlertDescription>
    </Alert>
  )}

  {isBootstrapping && (
    <div className="rounded-lg border aixia-tasks-divider bg-slate-950/50 p-4 shrink-0">
      <div className="animate-pulse space-y-4">
        <div className="h-4 w-28 rounded aixia-tasks-skeleton-bar" />
        <div className="h-10 w-full rounded aixia-tasks-skeleton-bar" />
        <div className="h-4 w-24 rounded aixia-tasks-skeleton-bar" />
        <div className="h-28 w-full rounded aixia-tasks-skeleton-bar" />
      </div>
    </div>
  )}

            <Card className="aixia-dash-panel aixia-dash-glass aixia-dash-tilt-panel aixia-projects-panel-card aixia-tasks-panel-card aixia-tasks-new-form-card w-full py-0">
              <CardContent className="p-4 lg:p-6">
                <div className="aixia-tasks-new-form-fields">
                  <div className="space-y-1.5">
                    <Label htmlFor="title" className="aixia-tasks-label">
      {t(
        initialParentTaskId
          ? "taskNew.form.subtaskTitle"
          : "taskNew.form.taskTitle"
      )}{" "}
      <span className="text-red-400">*</span>
    </Label>
    <Input
      id="title"
      placeholder={t("taskNew.form.taskTitlePlaceholder")}
      value={title}
      onChange={(e) => setTitle(e.target.value)}
      required
      disabled={isBootstrapping || isSaving}
      className="aixia-tasks-input"
    />
  </div>

              <div className="space-y-1.5">
    <Label htmlFor="description" className="aixia-tasks-label">
      {t("taskNew.form.description")}
    </Label>
    <Textarea
      id="description"
      placeholder={t("taskNew.form.descriptionPlaceholder")}
      value={description}
      onChange={(e) => setDescription(e.target.value)}
      rows={4}
      disabled={isBootstrapping || isSaving}
      className="aixia-tasks-textarea min-h-[96px] resize-none"
    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="aixia-dash-panel aixia-dash-glass aixia-dash-tilt-panel aixia-projects-panel-card aixia-tasks-panel-card aixia-tasks-new-form-card w-full py-0">
              <CardContent className="p-4 lg:p-6">
                <div className="aixia-tasks-new-form-fields">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
    <div className="space-y-1.5">
      <Label className="aixia-tasks-label">
        {t("taskNew.form.project")} <span className="text-red-400">*</span>
      </Label>
      <Select
        value={projectId}
        onValueChange={setProjectId}
        disabled={isBootstrapping || isSaving || isSubtaskFlow}
      >
        <SelectTrigger className="aixia-tasks-input">
          <SelectValue placeholder={t("taskNew.form.selectProject")} />
        </SelectTrigger>
        <SelectContent className="aixia-tasks-select-content">
          {projects.map((project) => (
            <SelectItem key={project.id} value={project.id}>
              {project.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>

    <div className="space-y-1.5">
      <Label className="aixia-tasks-label">{t("taskNew.form.priority")}</Label>
      <Select
        value={priority}
        onValueChange={(v) => setPriority(v as TaskPriority)}
        disabled={isBootstrapping || isSaving}
      >
        <SelectTrigger className="aixia-tasks-input">
          <SelectValue placeholder={t("taskNew.form.selectPriority")} />
        </SelectTrigger>
        <SelectContent className="aixia-tasks-select-content">
          <SelectItem value="LOW">{t("taskNew.priority.low")}</SelectItem>
          <SelectItem value="MEDIUM">{t("taskNew.priority.medium")}</SelectItem>
          <SelectItem value="HIGH">{t("taskNew.priority.high")}</SelectItem>
          <SelectItem value="URGENT">{t("taskNew.priority.urgent")}</SelectItem>
        </SelectContent>
      </Select>
    </div>

    <div className="space-y-1.5">
      <Label className="aixia-tasks-label">{t("taskNew.form.status")}</Label>
      <Select
        value={status}
        onValueChange={(v) => setStatus(v as TaskStatus)}
        disabled={isBootstrapping || isSaving}
      >
        <SelectTrigger className="aixia-tasks-input">
          <SelectValue placeholder={t("taskNew.form.selectStatus")} />
        </SelectTrigger>
        <SelectContent className="aixia-tasks-select-content">
          <SelectItem value="TODO">{t("taskNew.status.todo")}</SelectItem>
          <SelectItem value="IN_PROGRESS">{t("taskNew.status.inProgress")}</SelectItem>
          <SelectItem value="IN_REVIEW">{t("taskNew.status.inReview")}</SelectItem>
          <SelectItem value="DONE">{t("taskNew.status.done")}</SelectItem>
        </SelectContent>
      </Select>
    </div>

    <div className="space-y-1.5">
      <Label htmlFor="startDate" className="aixia-tasks-label">
        {t("taskNew.form.startDate")}
      </Label>
      <Input
        id="startDate"
        type="date"
        value={startDate}
        onChange={(e) => setStartDate(e.target.value)}
        disabled={isBootstrapping || isSaving}
        className="aixia-tasks-input"
      />
    </div>

    <div className="space-y-1.5">
      <Label htmlFor="dueDate" className="aixia-tasks-label">
        {t("taskNew.form.dueDate")}
      </Label>
      <Input
        id="dueDate"
        type="date"
        value={dueDate}
        onChange={(e) => setDueDate(e.target.value)}
        disabled={isBootstrapping || isSaving}
        className="aixia-tasks-input"
      />
    </div>
  </div>

  {projectId && (parentTaskOptions.length > 0 || isSubtaskFlow) ? (
    <div className="space-y-1.5">
      <Label className="aixia-tasks-label">
        {isSubtaskFlow ? "Parent task" : "Parent task (optional)"}
      </Label>
      <Select
        value={parentTaskId || initialParentTaskId || "__none__"}
        onValueChange={(v) => setParentTaskId(v === "__none__" ? "" : v)}
        disabled={isBootstrapping || isSaving || isSubtaskFlow}
      >
        <SelectTrigger className="aixia-tasks-input">
          <SelectValue placeholder="Top-level task" />
        </SelectTrigger>
        <SelectContent className="aixia-tasks-select-content">
          {!isSubtaskFlow ? (
            <SelectItem value="__none__">None (top-level)</SelectItem>
          ) : null}
          {parentTaskOptions.map((task) => (
            <SelectItem key={task.id} value={task.id}>
              {task.title}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  ) : null}

  {projectId && parentTaskOptions.length === 0 && !isSubtaskFlow ? (
    <p className="text-sm aixia-tasks-muted m-0">
      Create a top-level task first, then add subtasks from its task detail page.
    </p>
  ) : null}

  {fieldDefinitions.length > 0 ? (
    <div className="rounded-lg border aixia-tasks-divider bg-slate-950/40 p-4 space-y-3">
      <Label className="aixia-tasks-label">Custom fields</Label>
      <TaskCustomFieldsForm
        definitions={fieldDefinitions}
        values={customFieldValues}
        onChange={setCustomFieldValues}
        disabled={isBootstrapping || isSaving}
      />
    </div>
  ) : null}
                </div>
              </CardContent>
            </Card>

            <Card className="aixia-dash-panel aixia-dash-glass aixia-dash-tilt-panel aixia-projects-panel-card aixia-tasks-panel-card aixia-tasks-new-form-card w-full py-0">
              <CardContent className="p-4 lg:p-6">
                <div className="aixia-tasks-assign-section">
              <div className="aixia-tasks-member-picker aixia-dash-glass">
                <div className="aixia-tasks-member-picker-hd">
                  <div className="aixia-tasks-card-heading">
                    <Users className="aixia-tasks-card-heading__icon" aria-hidden />
                    <span className="aixia-dash-panel-title">
                      {t("taskNew.form.assignMembers")}
                    </span>
                  </div>
                  <span
                    className={
                      selectedAssignees.length > 0
                        ? "aixia-dash-pill"
                        : "aixia-dash-list-row-meta"
                    }
                  >
                    {selectedAssignees.length} selected
                  </span>
                </div>

                <div
                  className={`aixia-tasks-member-picker-body${
                    availableAssignees.length > 9
                      ? " aixia-tasks-member-picker-body--scroll"
                      : ""
                  }`}
                >
                  {!projectId ? (
                    <p className="aixia-dash-empty m-0 flex min-h-[6rem] items-center justify-center">
                      {t("taskNew.assignees.selectProjectFirst")}
                    </p>
                  ) : isMembersLoading ? (
                    <p className="aixia-dash-empty m-0 flex min-h-[6rem] items-center justify-center">
                      {t("taskNew.assignees.loadingProjectMembers")}
                    </p>
                  ) : availableAssignees.length === 0 ? (
                    <p className="aixia-dash-empty m-0 flex min-h-[6rem] items-center justify-center">
                      {t("taskNew.assignees.noAvailableMembers")}
                    </p>
                  ) : (
                    <div className="aixia-tasks-member-picker-grid">
                      {availableAssignees.map((member) => {
                        const displayName =
                          member.full_name || t("taskNew.assignees.unnamedUser");
                        const isSelected = selectedAssignees.includes(member.user_id);

                        return (
                          <label
                            key={member.user_id}
                            className={
                              isSelected
                                ? "aixia-tasks-member-tile aixia-tasks-member-tile--selected"
                                : "aixia-tasks-member-tile"
                            }
                          >
                            <span className="aixia-tasks-member-tile-check" aria-hidden>
                              {isSelected ? <Check strokeWidth={3} /> : null}
                            </span>
                            <span className="aixia-tasks-member-tile-avatar" aria-hidden>
                              {initialsFromDisplayName(displayName)}
                            </span>
                            <span className="aixia-tasks-member-tile-meta">
                              <span className="aixia-dash-list-row-title truncate">
                                {displayName}
                              </span>
                              <span className="aixia-dash-pill">{member.role}</span>
                            </span>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleAssignee(member.user_id)}
                              disabled={isBootstrapping || isSaving}
                              className="sr-only"
                            />
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <p className="aixia-tasks-new-form-note aixia-tasks-muted text-xs">
              {t("taskNew.form.visibilityNote")}
            </p>

            <div className="aixia-tasks-new-form-footer">
              <Button
      type="button"
      variant="outline"
      onClick={() =>
        navigate(
          initialParentTaskId
            ? `/tasks/${initialParentTaskId}`
            : projectId
              ? `/projects/${projectId}`
              : "/tasks"
        )
      }
      disabled={isSaving}
      className="aixia-dash-action h-9"
    >
      {t("taskNew.actions.cancel")}
    </Button>

    <Button
      type="submit"
      className="aixia-dash-action aixia-dash-action--primary h-9"
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
          {t("taskNew.actions.creating")}
        </>
      ) : (
        t("taskNew.actions.createTask")
      )}
    </Button>
            </div>
              </CardContent>
            </Card>
          </form>
      </div>
    </AixiaPage>
  );
}
