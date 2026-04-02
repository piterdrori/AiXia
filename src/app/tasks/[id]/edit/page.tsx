import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import { ArrowLeft } from "lucide-react";

import { supabase } from "@/lib/supabase";
import { createRequestTracker } from "@/lib/safeAsync";
import { canEditTaskEntity } from "@/lib/permissions";
import { createNotification } from "@/lib/notifications";
import { useLanguage } from "@/lib/i18n";

import { TaskForm } from "../../components/form/TaskForm";

import type {
  ProjectMemberRow,
  ProjectRow,
  ProfileRow,
  Role,
  TaskMemberRow,
  TaskPriority,
  TaskRow,
  TaskStatus,
} from "../../lib/task.types";

export default function TaskEditPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { t } = useLanguage();

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
  const [allProjectMembers, setAllProjectMembers] = useState<ProjectMemberRow[]>([]);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [existingTaskMembers, setExistingTaskMembers] = useState<TaskMemberRow[]>([]);
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<Role | null>(null);

  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isMembersLoading, setIsMembersLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const loadPage = useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
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

        if (!canEditTaskEntity(task, user.id, role)) {
          navigate(`/tasks/${id}`);
          return;
        }

        const [
          { data: allProjects, error: projectsError },
          { data: allProfiles, error: profilesError },
          { data: taskMembersData, error: taskMembersError },
          { data: allProjectMembersData, error: allProjectMembersError },
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

        if (projectsError || profilesError || taskMembersError || allProjectMembersError) {
          throw new Error("Failed to load edit page data");
        }

        const projectsData = (allProjects || []) as ProjectRow[];
        const profilesData = (allProfiles || []) as ProfileRow[];
        const currentTaskMembers = (taskMembersData || []) as TaskMemberRow[];
        const allMembersData = (allProjectMembersData || []) as ProjectMemberRow[];

        const visibleProjects =
          role === "admin"
            ? projectsData
            : projectsData.filter((project) => {
                const isCreator = project.created_by === user.id;
                const isMember = allMembersData.some(
                  (member) =>
                    member.project_id === project.id && member.user_id === user.id,
                );
                return isCreator || isMember;
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

        setProjects(visibleProjects);
        setProfiles(profilesData);
        setExistingTaskMembers(currentTaskMembers);
        setSelectedAssignees(currentTaskMembers.map((member) => member.user_id));
        setProjectMembers(initialProjectMembers);
        setAllProjectMembers(allMembersData);
      } catch (err) {
        if (!pageRequestTracker.current.isLatest(requestId)) return;
        console.error("TaskEditPage load error:", err);
        setError(t("taskEdit.errors.loadTask"));
      } finally {
        if (!pageRequestTracker.current.isLatest(requestId)) return;
        setIsBootstrapping(false);
        setIsRefreshing(false);
      }
    },
    [id, navigate, t],
  );

  useEffect(() => {
    void loadPage("initial");
  }, [loadPage]);

  useEffect(() => {
    let mounted = true;

    const loadMembers = async () => {
      const requestId = membersRequestTracker.current.next();

      if (!projectId) {
        setProjectMembers([]);
        setSelectedAssignees([]);
        setIsMembersLoading(false);
        return;
      }

      const cachedMembers = allProjectMembers.filter(
        (member) => member.project_id === projectId,
      );

      if (cachedMembers.length > 0) {
        setProjectMembers(cachedMembers);
        setSelectedAssignees((prev) =>
          prev.filter((userId) =>
            cachedMembers.some((member) => member.user_id === userId),
          ),
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
          throw membersError;
        }

        const members = (data || []) as ProjectMemberRow[];

        setProjectMembers(members);
        setAllProjectMembers((prev) => {
          const withoutCurrentProject = prev.filter(
            (member) => member.project_id !== projectId,
          );
          return [...withoutCurrentProject, ...members];
        });

        setSelectedAssignees((prev) =>
          prev.filter((userId) =>
            members.some((member) => member.user_id === userId),
          ),
        );
      } catch (err) {
        if (!mounted || !membersRequestTracker.current.isLatest(requestId)) return;
        console.error("TaskEditPage load members error:", err);
        setProjectMembers([]);
      } finally {
        if (!mounted || !membersRequestTracker.current.isLatest(requestId)) return;
        setIsMembersLoading(false);
      }
    };

    void loadMembers();

    return () => {
      mounted = false;
    };
  }, [projectId, allProjectMembers]);

  const toggleAssignee = useCallback((userId: string) => {
    setSelectedAssignees((prev) =>
      prev.includes(userId)
        ? prev.filter((idValue) => idValue !== userId)
        : [...prev, userId],
    );
  }, []);

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
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

      if (startDate && dueDate && startDate > dueDate) {
        setError(t("taskEdit.errors.startDateAfterDueDate"));
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

        const [{ data: myProfile }, { data: existingTask }] = await Promise.all([
          supabase.from("profiles").select("role").eq("user_id", user.id).single(),
          supabase.from("tasks").select("id, created_by").eq("id", id).single(),
        ]);

        if (!pageRequestTracker.current.isLatest(requestId)) return;

        if (!existingTask || !myProfile) {
          setError(t("taskEdit.errors.loadTask"));
          return;
        }

        if (!canEditTaskEntity(existingTask, user.id, myProfile.role as Role)) {
          setError(t("taskEdit.errors.noPermission"));
          return;
        }

        const { error: updateError } = await supabase
          .from("tasks")
          .update({
            title: title.trim(),
            description: description.trim() || null,
            project_id: projectId,
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

        const existingUserIds = existingTaskMembers.map((member) => member.user_id);
        const toInsert = selectedAssignees.filter(
          (userId) => !existingUserIds.includes(userId),
        );
        const toDelete = existingTaskMembers.filter(
          (member) => !selectedAssignees.includes(member.user_id),
        );

        if (toInsert.length > 0) {
          const rows = toInsert.map((userId) => ({
            task_id: id,
            user_id: userId,
            role: "assignee",
          }));

          const { error: insertError } = await supabase
            .from("task_members")
            .insert(rows);

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
              message: title.trim(),
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
              message: title.trim(),
              link: `/tasks/${id}`,
              entityType: "task",
              entityId: id,
            });
          }
        }

        navigate(`/tasks/${id}`);
      } catch (err) {
        if (!pageRequestTracker.current.isLatest(requestId)) return;
        console.error("TaskEditPage submit error:", err);
        setError(t("taskEdit.errors.genericUpdate"));
      } finally {
        if (!pageRequestTracker.current.isLatest(requestId)) return;
        setIsSaving(false);
      }
    },
    [
      id,
      navigate,
      t,
      title,
      description,
      projectId,
      priority,
      status,
      startDate,
      dueDate,
      selectedAssignees,
      existingTaskMembers,
      currentUserId,
    ],
  );

  const handleCancel = useCallback(() => {
    navigate(`/tasks/${id}`);
  }, [navigate, id]);

  if (isBootstrapping) {
    return (
      <div className="mx-auto w-full max-w-[calc(100vw-360px)] space-y-6">
        <div className="animate-pulse space-y-3">
          <div className="h-8 w-40 rounded bg-slate-800" />
          <div className="h-4 w-56 rounded bg-slate-800" />
        </div>

        <div className="h-[calc(100vh-200px)] rounded-lg border border-slate-800 bg-slate-900/50 p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-10 w-full rounded bg-slate-800" />
            <div className="h-28 w-full rounded bg-slate-800" />
            <div className="grid grid-cols-5 gap-4">
              {[1, 2, 3, 4, 5].map((item) => (
                <div key={item} className="h-10 w-full rounded bg-slate-800" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[calc(100vw-360px)]">
      <div className="mb-6 flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleCancel}
          className="text-slate-400 hover:text-white"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>

        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white">
            {t("taskEdit.header.title")}
          </h1>
          <p className="text-slate-400">{t("taskEdit.header.subtitle")}</p>
        </div>

        <Button
          variant="outline"
          className="border-slate-700 text-slate-300 hover:bg-slate-800"
          onClick={() => void loadPage("refresh")}
          disabled={isRefreshing}
        >
          {isRefreshing
            ? t("taskEdit.actions.refreshing")
            : t("taskEdit.actions.refresh")}
        </Button>
      </div>

      <Card className="h-[calc(100vh-200px)] w-full min-h-0 border border-slate-800 bg-slate-900/50">
        <CardContent className="flex h-full min-h-0 flex-col p-6">
          <TaskForm
            mode="edit"
            title={title}
            setTitle={setTitle}
            description={description}
            setDescription={setDescription}
            projectId={projectId}
            setProjectId={setProjectId}
            priority={priority}
            setPriority={setPriority}
            status={status}
            setStatus={setStatus}
            startDate={startDate}
            setStartDate={setStartDate}
            dueDate={dueDate}
            setDueDate={setDueDate}
            selectedAssignees={selectedAssignees}
            toggleAssignee={toggleAssignee}
            projects={projects}
            projectMembers={projectMembers}
            profiles={profiles}
            currentUserRole={currentUserRole}
            isBootstrapping={isBootstrapping}
            isMembersLoading={isMembersLoading}
            isSaving={isSaving}
            error={error}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
          />
        </CardContent>
      </Card>
    </div>
  );
}
