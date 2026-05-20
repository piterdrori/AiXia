import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { createRequestTracker } from "@/lib/safeAsync";
import { createNotification } from "@/lib/notifications";
import { useLanguage } from "@/lib/i18n";

import { canEditTaskEntity } from "@/lib/permissions";

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
import { Loader2 } from "lucide-react";
import { AixiaButton, AixiaHero, AixiaPage } from "@/components/aixia";
import { TaskCustomFieldsForm } from "@/components/tasks/TaskCustomFieldsForm";
import {
  loadDefinitionsForTaskForm,
  upsertTaskCustomFieldValues,
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
import "@/styles/tasks/tasks-visual.css";


type Role = "admin" | "manager" | "employee" | "guest";
type TaskStatus = "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";
type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

type TaskRow = TaskRowExtended;

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

type TaskMemberRow = {
  id: string;
  task_id: string;
  user_id: string;
  role: string;
  created_at: string;
};

export default function TaskEditPage() {
  const { t } = useLanguage();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const pageRequestTracker = useRef(createRequestTracker());
  const membersRequestTracker = useRef(createRequestTracker());

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [projectId, setProjectId] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("MEDIUM");
  const [status, setStatus] = useState<TaskStatus>("TODO");
  const [startDate, setStartDate] = useState("");
  const [dueDate, setDueDate] = useState("");

  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [projectMembers, setProjectMembers] = useState<ProjectMemberRow[]>([]);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [existingTaskMembers, setExistingTaskMembers] = useState<TaskMemberRow[]>([]);
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [parentTaskId, setParentTaskId] = useState("");
  const [parentTaskOptions, setParentTaskOptions] = useState<TaskRow[]>([]);
  const [hasSubtasks, setHasSubtasks] = useState(false);
  const [fieldDefinitions, setFieldDefinitions] = useState<ProjectTaskFieldDefinitionRow[]>([]);
  const [customFieldValues, setCustomFieldValues] = useState<
    Record<string, CustomFieldFormValue>
  >({});

  const [, setCurrentUserId] = useState<string | null>(null);
  const [, setCurrentUserRole] = useState<Role | null>(null);

  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isMembersLoading, setIsMembersLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const selectedSet = useMemo(() => new Set(selectedAssignees), [selectedAssignees]);

  const loadPage = async (mode: "initial" | "refresh" = "initial") => {
    if (!id) {
      navigate("/tasks");
      return;
    }

    const requestId = pageRequestTracker.current.next();

    if (mode === "initial") {
      setIsBootstrapping(true);
    } else {
      setIsRefreshing(true);
    }

    setError("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!pageRequestTracker.current.isLatest(requestId)) return;

      if (!user) {
        navigate("/login");
        return;
      }

      setCurrentUserId(user.id);

      const { data: myProfile, error: myProfileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("user_id", user.id)
        .single();

      if (!pageRequestTracker.current.isLatest(requestId)) return;

      if (myProfileError || !myProfile) {
        navigate("/tasks");
        return;
      }

      const role = myProfile.role as Role;
      setCurrentUserRole(role);

      const { data: taskData, error: taskError } = await supabase
        .from("tasks")
        .select("*")
        .eq("id", id)
        .single();

      if (!pageRequestTracker.current.isLatest(requestId)) return;

      if (taskError || !taskData) {
        navigate("/tasks");
        return;
      }

      const task = taskData as TaskRow;
      const canEdit = canEditTaskEntity(
  task,
  user.id,
  role
);

if (!canEdit) {
  navigate(`/tasks/${id}`);
  return;
}

      const [
        { data: allProjects, error: projectsError },
        { data: allProfiles, error: profilesError },
        { data: taskMembersData, error: taskMembersError },
        { data: allProjectMembers, error: allProjectMembersError },
      ] = await Promise.all([
        supabase
          .from("projects")
          .select("id, name, created_by")
          .order("created_at", { ascending: false }),
        supabase
          .from("profiles")
          .select("user_id, full_name, role, status")
          .eq("status", "active")
          .order("full_name", { ascending: true }),
        supabase
          .from("task_members")
          .select("id, task_id, user_id, role, created_at")
          .eq("task_id", id),
        supabase
          .from("project_members")
          .select("id, project_id, user_id, role, created_at"),
      ]);

      if (!pageRequestTracker.current.isLatest(requestId)) return;

      if (projectsError) {
        setError(projectsError.message || t("taskEdit.errors.loadProjects"));
        setProjects([]);
      }

      if (profilesError) {
        setError(profilesError.message || t("taskEdit.errors.loadTeamMembers"));
        setProfiles([]);
      }

      if (taskMembersError) {
        setError(taskMembersError.message || t("taskEdit.errors.loadCurrentAssignees"));
      }

      if (allProjectMembersError) {
        setError(allProjectMembersError.message || t("taskEdit.errors.loadProjectMembers"));
      }

      const projectsData = (allProjects || []) as ProjectRow[];
      const profilesData = (allProfiles || []) as ProfileRow[];
      const currentTaskMembers = (taskMembersData || []) as TaskMemberRow[];
      const allMembersData = (allProjectMembers || []) as ProjectMemberRow[];

      const visibleProjects =
        role === "admin"
          ? projectsData
          : projectsData.filter((project) => {
              const isCreator = project.created_by === user.id;
              const isAssignedProjectMember = allMembersData.some(
                (member) =>
                  member.project_id === project.id && member.user_id === user.id
              );
              return isCreator || isAssignedProjectMember;
            });

      const initialProjectMembers = task.project_id
        ? allMembersData.filter((member) => member.project_id === task.project_id)
        : [];

      setTitle(task.title || "");
      setDescription(task.description || "");
      setProjectId(task.project_id || "");
      setPriority((task.priority as TaskPriority) || "MEDIUM");
      setStatus((task.status as TaskStatus) || "TODO");
      setStartDate(task.start_date || "");
      setDueDate(task.due_date || "");
      setParentTaskId(task.parent_task_id || "");

      const { count: subtaskCount } = await supabase
        .from("tasks")
        .select("id", { count: "exact", head: true })
        .eq("parent_task_id", id)
        .is("deleted_at", null);

      if (pageRequestTracker.current.isLatest(requestId)) {
        setHasSubtasks((subtaskCount ?? 0) > 0);
      }

      if (task.project_id) {
        const [parents, formDefs] = await Promise.all([
          loadTopLevelTasksForProject(task.project_id),
          loadDefinitionsForTaskForm(task.project_id, id, "edit"),
        ]);
        if (pageRequestTracker.current.isLatest(requestId)) {
          setParentTaskOptions(
            parents.filter((parent: TaskRow) => parent.id !== task.id)
          );
          setFieldDefinitions(formDefs.definitions);
          setCustomFieldValues(
            valuesFromRows(formDefs.definitions, formDefs.valuesByDefinitionId)
          );
        }
      }

      setProjects(visibleProjects);
      setProfiles(profilesData);
      setExistingTaskMembers(currentTaskMembers);
      setSelectedAssignees(currentTaskMembers.map((member) => member.user_id));
      setProjectMembers(initialProjectMembers);
    } catch (err) {
      if (!pageRequestTracker.current.isLatest(requestId)) return;
      console.error("Load task edit error:", err);
      setError(t("taskEdit.errors.loadTask"));
    } finally {
      if (!pageRequestTracker.current.isLatest(requestId)) return;
      setIsBootstrapping(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    void loadPage("initial");
  }, [id]);

  useEffect(() => {
    let mounted = true;

    const reloadProjectMembers = async () => {
      const requestId = membersRequestTracker.current.next();

      if (!projectId) {
        setProjectMembers([]);
        setSelectedAssignees([]);
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
          return;
        }

        const members = (data || []) as ProjectMemberRow[];
        setProjectMembers(members);

        setSelectedAssignees((prev) =>
          prev.filter((userId) => members.some((member) => member.user_id === userId))
        );
      } catch (err) {
        if (!mounted || !membersRequestTracker.current.isLatest(requestId)) return;
        console.error("Reload project members error:", err);
        setProjectMembers([]);
      } finally {
        if (!mounted || !membersRequestTracker.current.isLatest(requestId)) return;
        setIsMembersLoading(false);
      }
    };

    void reloadProjectMembers();

    return () => {
      mounted = false;
    };
  }, [projectId]);

  useEffect(() => {
    let mounted = true;
    const reloadExtras = async () => {
      if (!projectId || !id) return;
      try {
        const [parents, formDefs] = await Promise.all([
          loadTopLevelTasksForProject(projectId),
          loadDefinitionsForTaskForm(projectId, id, "edit"),
        ]);
        if (!mounted) return;
        setParentTaskOptions(parents.filter((parent: TaskRow) => parent.id !== id));
        setFieldDefinitions(formDefs.definitions);
        setCustomFieldValues((prev) => {
          const next = valuesFromRows(formDefs.definitions, formDefs.valuesByDefinitionId);
          for (const def of formDefs.definitions) {
            if (prev[def.id]) next[def.id] = prev[def.id];
          }
          return next;
        });
      } catch (err) {
        console.error("Reload task edit extras:", err);
      }
    };
    void reloadExtras();
    return () => {
      mounted = false;
    };
  }, [projectId, id]);

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
  if (!id) return;

  setError("");

  if (!title.trim()) {
    setError(t("taskEdit.errors.taskTitleRequired"));
    return;
  }

  if (!projectId) {
    setError(t("taskEdit.errors.projectRequired"));
    return;
  }

   if (startDate && Number.isNaN(new Date(startDate).getTime())) {
    setError(t("taskEdit.errors.invalidStartDate"));
    return;
  }

  if (dueDate && Number.isNaN(new Date(dueDate).getTime())) {
    setError(t("taskEdit.errors.invalidDueDate"));
    return;
  }

  if (startDate && dueDate && startDate > dueDate) {
    setError(t("taskEdit.errors.startDateAfterDueDate"));
    return;
  }

  if (hasSubtasks && parentTaskId) {
    setError(
      t(
        "taskEdit.hierarchy.cannotReparentWithChildren",
        "This task has subtasks and cannot be moved under another parent."
      )
    );
    return;
  }

  const requestId = pageRequestTracker.current.next();
  setIsSaving(true);

  try {
    const {
  data: { user },
} = await supabase.auth.getUser();

if (!user) {
  navigate("/login");
  return;
}

const currentUserId = user.id;

const { data: myProfile } = await supabase
  .from("profiles")
  .select("role")
  .eq("user_id", user.id)
  .single();

const { data: existingTask } = await supabase
  .from("tasks")
  .select("id, created_by")
  .eq("id", id)
  .single();

if (!existingTask || !myProfile) {
  setError(t("taskEdit.errors.loadTask"));
  setIsSaving(false);
  return;
}

const canEdit = canEditTaskEntity(
  existingTask,
  currentUserId,
  myProfile.role as Role
);

if (!canEdit) {
  setError(t("taskEdit.errors.noPermission"));
  setIsSaving(false);
  return;
}

    const missingField = validateRequiredCustomFields(
      fieldDefinitions,
      customFieldValues
    );
    if (missingField) {
      setError(`"${missingField}" is required.`);
      setIsSaving(false);
      return;
    }

    const { error: updateError } = await supabase
      .from("tasks")
       .update({
        title: title.trim(),
        description: description.trim() || null,
        project_id: projectId,
        parent_task_id: hasSubtasks ? null : parentTaskId || null,
        priority,
        status,
        start_date: startDate || null,
        due_date: dueDate || null,
        assignee_id: selectedAssignees.length > 0 ? selectedAssignees[0] : null,
        updated_at: new Date().toISOString(),
        last_status_update_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (!pageRequestTracker.current.isLatest(requestId)) return;

    if (updateError) {
      setError(updateError.message || t("taskEdit.errors.updateTask"));
      return;
    }

    try {
      await upsertTaskCustomFieldValues(id, fieldDefinitions, customFieldValues);
    } catch (fieldsError) {
      setError(
        fieldsError instanceof Error
          ? fieldsError.message
          : t("taskEdit.errors.updateTask")
      );
      return;
    }

    const existingUserIds = existingTaskMembers.map((member) => member.user_id);
    const toInsert = selectedAssignees.filter((userId) => !existingUserIds.includes(userId));
    const toDelete = existingTaskMembers.filter((member) => !selectedSet.has(member.user_id));

    if (toInsert.length > 0) {
      const rows = toInsert.map((userId) => ({
        task_id: id,
        user_id: userId,
        role: "assignee",
      }));

      const { error: insertError } = await supabase.from("task_members").insert(rows);

      if (!pageRequestTracker.current.isLatest(requestId)) return;

      if (insertError) {
        setError(insertError.message || t("taskEdit.errors.addAssignees"));
        return;
      }

      for (const userId of toInsert) {
        if (userId === currentUserId) continue;

        await createNotification({
          userId,
          actorUserId: currentUserId || undefined,
          type: "TASK_ASSIGNED",
          title: t("taskEdit.notifications.assignedTitle"),
          message: t(
  "taskEdit.notifications.assignedMessage",
  undefined,
  { title: title.trim() }
),
          link: `/tasks/${id}`,
          entityType: "task",
          entityId: id,
        });
      }
    }

    if (toDelete.length > 0) {
      const idsToDelete = toDelete.map((member) => member.id);

      const { error: deleteError } = await supabase
        .from("task_members")
        .delete()
        .in("id", idsToDelete);

      if (!pageRequestTracker.current.isLatest(requestId)) return;

      if (deleteError) {
        setError(deleteError.message || t("taskEdit.errors.removeAssignees"));
        return;
      }

      for (const member of toDelete) {
        if (member.user_id === currentUserId) continue;

        await createNotification({
          userId: member.user_id,
          actorUserId: currentUserId || undefined,
          type: "TASK_UPDATED",
          title: t("taskEdit.notifications.removedTitle"),
          message: t(
  "taskEdit.notifications.removedMessage",
  undefined,
  { title: title.trim() }
),
          link: `/tasks/${id}`,
          entityType: "task",
          entityId: id,
        });
      }
    }

    if (!pageRequestTracker.current.isLatest(requestId)) return;

    navigate(`/tasks/${id}`);
  } catch (err) {
    if (!pageRequestTracker.current.isLatest(requestId)) return;
    console.error("Update task error:", err);
    setError(t("taskEdit.errors.genericUpdate"));
  } finally {
    if (!pageRequestTracker.current.isLatest(requestId)) return;
    setIsSaving(false);
  }
};

    if (isBootstrapping) {
    return (
      <div className="w-full max-w-[calc(100vw-360px)] mx-auto space-y-6">
        <div className="animate-pulse space-y-3">
          <div className="h-8 w-40 rounded aixia-tasks-skeleton-bar" />
          <div className="h-4 w-56 rounded aixia-tasks-skeleton-bar" />
        </div>

        <Card className="w-full aixia-dash-panel aixia-dash-glass aixia-dash-tilt-panel aixia-tasks-panel-card h-[calc(100vh-200px)] min-h-0">
          <CardContent className="flex h-full min-h-0 flex-col p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-10 w-full rounded aixia-tasks-skeleton-bar" />
              <div className="h-28 w-full rounded aixia-tasks-skeleton-bar" />
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-5">
                <div className="h-10 w-full rounded aixia-tasks-skeleton-bar" />
                <div className="h-10 w-full rounded aixia-tasks-skeleton-bar" />
                <div className="h-10 w-full rounded aixia-tasks-skeleton-bar" />
                <div className="h-10 w-full rounded aixia-tasks-skeleton-bar" />
                <div className="h-10 w-full rounded aixia-tasks-skeleton-bar" />
              </div>
              <div className="h-full min-h-[220px] w-full rounded aixia-tasks-skeleton-bar" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
    return (
    <AixiaPage
      surface="command"
      className="aixia-command-page aixia-tasks-page aixia-tasks-page--new h-full flex flex-col overflow-hidden"
    >
      <AixiaHero
        surface="command"
        className="shrink-0"
        parentLabel={t("tasks.header.title", "Tasks")}
        parentPath={`/tasks/${id}`}
        gradientTitle={t("tasks.header.title", "Tasks")}
        title={t("taskEdit.header.title")}
        subtitle={t("taskEdit.header.subtitle")}
        actions={
          <AixiaButton
            type="button"
            className="h-9"
            onClick={() => void loadPage("refresh")}
            disabled={isRefreshing}
          >
            {isRefreshing ? t("taskEdit.actions.refreshing") : t("taskEdit.actions.refresh")}
          </AixiaButton>
        }
      />
      <div className="aixia-command-scroll flex min-h-0 flex-1 flex-col">
      <Card className="aixia-dash-panel aixia-dash-glass aixia-dash-tilt-panel aixia-tasks-panel-card aixia-tasks-new-form-card w-full">
        <CardContent className="flex h-full min-h-0 flex-col p-6">
          <form onSubmit={handleSubmit} className="aixia-tasks-new-form flex h-full min-h-0 flex-col gap-4">
            {error && (
              <Alert className="aixia-tasks-alert-error">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="title" className="aixia-tasks-label">
                {t("taskEdit.form.taskTitle")} <span className="text-red-400">*</span>
              </Label>
              <Input
                id="title"
                placeholder={t("taskEdit.form.taskTitlePlaceholder")}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="aixia-tasks-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="aixia-tasks-label">
                {t("taskEdit.form.description")}
              </Label>
              <Textarea
                id="description"
                placeholder={t("taskEdit.form.descriptionPlaceholder")}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="bg-slate-950 aixia-tasks-divider text-white placeholder:aixia-tasks-empty-icon resize-none"
              />
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-5">
              <div className="space-y-2">
                <Label className="aixia-tasks-label">
                  {t("taskEdit.form.project")} <span className="text-red-400">*</span>
                </Label>
                <Select value={projectId} onValueChange={setProjectId}>
                  <SelectTrigger className="aixia-tasks-input">
                    <SelectValue placeholder={t("taskEdit.form.selectProject")} />
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

              <div className="space-y-2">
                <Label className="aixia-tasks-label">{t("taskEdit.form.priority")}</Label>
                <Select value={priority} onValueChange={(v) => setPriority(v as TaskPriority)}>
                  <SelectTrigger className="aixia-tasks-input">
                    <SelectValue placeholder={t("taskEdit.form.selectPriority")} />
                  </SelectTrigger>
                  <SelectContent className="aixia-tasks-select-content">
                    <SelectItem value="LOW">{t("taskEdit.priority.low")}</SelectItem>
                    <SelectItem value="MEDIUM">{t("taskEdit.priority.medium")}</SelectItem>
                    <SelectItem value="HIGH">{t("taskEdit.priority.high")}</SelectItem>
                    <SelectItem value="URGENT">{t("taskEdit.priority.urgent")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="aixia-tasks-label">{t("taskEdit.form.status")}</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as TaskStatus)}>
                  <SelectTrigger className="aixia-tasks-input">
                    <SelectValue placeholder={t("taskEdit.form.selectStatus")} />
                  </SelectTrigger>
                  <SelectContent className="aixia-tasks-select-content">
                    <SelectItem value="TODO">{t("taskEdit.status.todo")}</SelectItem>
                    <SelectItem value="IN_PROGRESS">{t("taskEdit.status.inProgress")}</SelectItem>
                    <SelectItem value="IN_REVIEW">{t("taskEdit.status.inReview")}</SelectItem>
                    <SelectItem value="DONE">{t("taskEdit.status.done")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="startDate" className="aixia-tasks-label">
                  {t("taskEdit.form.startDate")}
                </Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="aixia-tasks-input"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dueDate" className="aixia-tasks-label">
                  {t("taskEdit.form.dueDate")}
                </Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="aixia-tasks-input"
                />
              </div>
            </div>

            {projectId && hasSubtasks ? (
              <p className="text-sm aixia-tasks-muted">
                {t(
                  "taskEdit.hierarchy.hasSubtasksHint",
                  "This task has subtasks and must stay a top-level task."
                )}
              </p>
            ) : null}

            {projectId && !hasSubtasks && parentTaskOptions.length > 0 ? (
              <div className="space-y-2">
                <Label className="aixia-tasks-label">
                  {t("taskEdit.form.parentTask", "Parent task (optional)")}
                </Label>
                <Select
                  value={parentTaskId || "__none__"}
                  onValueChange={(v) => setParentTaskId(v === "__none__" ? "" : v)}
                >
                  <SelectTrigger className="aixia-tasks-input">
                    <SelectValue placeholder={t("taskEdit.form.topLevel", "Top-level task")} />
                  </SelectTrigger>
                  <SelectContent className="aixia-tasks-select-content">
                    <SelectItem value="__none__">
                      {t("taskEdit.form.noneTopLevel", "None (top-level)")}
                    </SelectItem>
                    {parentTaskOptions.map((task) => (
                      <SelectItem key={task.id} value={task.id}>
                        {task.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            {fieldDefinitions.length > 0 ? (
              <div className="rounded-lg border aixia-tasks-divider bg-slate-950/40 p-4 space-y-3">
                <Label className="aixia-tasks-label">Custom fields</Label>
                <TaskCustomFieldsForm
                  definitions={fieldDefinitions}
                  values={customFieldValues}
                  onChange={setCustomFieldValues}
                />
              </div>
            ) : null}
            <div className="flex-1 min-h-0 rounded-lg border aixia-tasks-divider bg-slate-950/40 p-4">
              <div className="flex h-full min-h-0 flex-col">
                <div className="shrink-0 space-y-1">
                  <Label className="aixia-tasks-label">
                    {t("taskEdit.form.assignees")}
                  </Label>
                  <div className="text-xs aixia-tasks-muted">
                    {t("taskEdit.assignees.projectRequirement")}
                  </div>
                </div>

                <div className="mt-3 flex-1 min-h-0">
                  {!projectId ? (
                    <div className="aixia-tasks-muted text-sm">
                      {t("taskEdit.assignees.selectProjectFirst")}
                    </div>
                  ) : isMembersLoading ? (
                    <div className="aixia-tasks-muted text-sm">
                      {t("taskEdit.assignees.loadingProjectMembers")}
                    </div>
                  ) : availableAssignees.length === 0 ? (
                    <div className="aixia-tasks-muted text-sm">
                      {t("taskEdit.assignees.noneAvailable")}
                    </div>
                  ) : (
                    <div className="h-full min-h-0 rounded-lg border aixia-tasks-divider bg-slate-950 p-2 overflow-y-auto">
                      <div className="space-y-2">
                        {availableAssignees.map((member) => (
                          <label
                            key={member.user_id}
                            className="flex items-center justify-between gap-3 rounded-md px-3 py-2 aixia-tasks-member-row--pick cursor-pointer"
                          >
                            <div>
                              <div className="text-white text-sm font-medium">
                                {member.full_name || t("taskEdit.assignees.unnamedUser")}
                              </div>
                              <div className="aixia-tasks-muted text-xs">
                                {member.role.toUpperCase()}
                              </div>
                            </div>

                            <input
                              type="checkbox"
                              checked={selectedAssignees.includes(member.user_id)}
                              onChange={() => toggleAssignee(member.user_id)}
                              className="h-4 w-4"
                            />
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="aixia-tasks-new-form-footer shrink-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(`/tasks/${id}`)}
                className="aixia-dash-action h-9"
              >
                {t("taskEdit.actions.cancel")}
              </Button>

              <Button
                type="submit"
                className="aixia-dash-action aixia-dash-action--primary h-9"
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t("taskEdit.actions.saving")}
                  </>
                ) : (
                  t("taskEdit.actions.saveChanges")
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      </div>
    </AixiaPage>
  );
}
