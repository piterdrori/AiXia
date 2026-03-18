import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { createRequestTracker } from "@/lib/safeAsync";
import { createNotification } from "@/lib/notifications";
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
import { ArrowLeft, Loader2 } from "lucide-react";

type Role = "admin" | "manager" | "employee" | "guest";
type TaskStatus = "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";
type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

type TaskRow = {
  id: string;
  title: string;
  description: string | null;
  status: string | null;
  priority: string | null;
  due_date: string | null;
  project_id: string | null;
  assignee_id: string | null;
  created_by: string | null;
};

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
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const pageRequestTracker = useRef(createRequestTracker());
  const membersRequestTracker = useRef(createRequestTracker());

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [projectId, setProjectId] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("MEDIUM");
  const [status, setStatus] = useState<TaskStatus>("TODO");
  const [dueDate, setDueDate] = useState("");

  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [projectMembers, setProjectMembers] = useState<ProjectMemberRow[]>([]);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [existingTaskMembers, setExistingTaskMembers] = useState<TaskMemberRow[]>([]);
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);

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
      const canEdit = role === "admin" || task.created_by === user.id;

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
        setError(projectsError.message || "Failed to load projects.");
        setProjects([]);
      }

      if (profilesError) {
        setError(profilesError.message || "Failed to load team members.");
        setProfiles([]);
      }

      if (taskMembersError) {
        setError(taskMembersError.message || "Failed to load current assignees.");
      }

      if (allProjectMembersError) {
        setError(allProjectMembersError.message || "Failed to load project members.");
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
      setDueDate(task.due_date || "");

      setProjects(visibleProjects);
      setProfiles(profilesData);
      setExistingTaskMembers(currentTaskMembers);
      setSelectedAssignees(currentTaskMembers.map((member) => member.user_id));
      setProjectMembers(initialProjectMembers);
    } catch (err) {
      if (!pageRequestTracker.current.isLatest(requestId)) return;
      console.error("Load task edit error:", err);
      setError("Failed to load task.");
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
    setError("Task title is required.");
    return;
  }

  if (!projectId) {
    setError("Please select a project.");
    return;
  }

  if (dueDate && Number.isNaN(new Date(dueDate).getTime())) {
    setError("Due date is invalid.");
    return;
  }

  const requestId = pageRequestTracker.current.next();
  setIsSaving(true);

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const currentUserId = user?.id || null;

    const { error: updateError } = await supabase
      .from("tasks")
      .update({
        title: title.trim(),
        description: description.trim() || null,
        project_id: projectId,
        priority,
        status,
        due_date: dueDate || null,
        assignee_id: selectedAssignees.length > 0 ? selectedAssignees[0] : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (!pageRequestTracker.current.isLatest(requestId)) return;

    if (updateError) {
      setError(updateError.message || "Failed to update task.");
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
        setError(insertError.message || "Failed to add assignees.");
        return;
      }

      for (const userId of toInsert) {
        if (userId === currentUserId) continue;

        await createNotification({
          userId,
          actorUserId: currentUserId || undefined,
          type: "TASK_ASSIGNED",
          title: "You were assigned to a task",
          message: `You were added to task "${title.trim()}"`,
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
        setError(deleteError.message || "Failed to remove assignees.");
        return;
      }

      for (const member of toDelete) {
        if (member.user_id === currentUserId) continue;

        await createNotification({
          userId: member.user_id,
          actorUserId: currentUserId || undefined,
          type: "TASK_UPDATED",
          title: "Removed from Task",
          message: `You were removed from task "${title.trim()}"`,
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
    setError("Something went wrong while updating the task.");
  } finally {
    if (!pageRequestTracker.current.isLatest(requestId)) return;
    setIsSaving(false);
  }
};

  if (isBootstrapping) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="animate-pulse space-y-3">
          <div className="h-8 w-40 rounded bg-slate-800" />
          <div className="h-4 w-56 rounded bg-slate-800" />
        </div>

        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-10 w-full rounded bg-slate-800" />
              <div className="h-28 w-full rounded bg-slate-800" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="h-10 w-full rounded bg-slate-800" />
                <div className="h-10 w-full rounded bg-slate-800" />
                <div className="h-10 w-full rounded bg-slate-800" />
                <div className="h-10 w-full rounded bg-slate-800" />
              </div>
              <div className="h-40 w-full rounded bg-slate-800" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(`/tasks/${id}`)}
          className="text-slate-400 hover:text-white"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>

        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white">Edit Task</h1>
          <p className="text-slate-400">Update task details</p>
        </div>

        <Button
          variant="outline"
          className="border-slate-700 text-slate-300 hover:bg-slate-800"
          onClick={() => void loadPage("refresh")}
          disabled={isRefreshing}
        >
          {isRefreshing ? "Refreshing..." : "Refresh"}
        </Button>
      </div>

      <Card className="bg-slate-900/50 border-slate-800">
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <Alert className="bg-red-900/20 border-red-800 text-red-300">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="title" className="text-slate-300">
                Task Title <span className="text-red-400">*</span>
              </Label>
              <Input
                id="title"
                placeholder="Enter task title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="bg-slate-950 border-slate-800 text-white placeholder:text-slate-600"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-slate-300">
                Description
              </Label>
              <Textarea
                id="description"
                placeholder="Describe the task..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="bg-slate-950 border-slate-800 text-white placeholder:text-slate-600 resize-none"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-300">
                  Project <span className="text-red-400">*</span>
                </Label>
                <Select value={projectId} onValueChange={setProjectId}>
                  <SelectTrigger className="bg-slate-950 border-slate-800 text-white">
                    <SelectValue placeholder="Select project" />
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
                <Label className="text-slate-300">Priority</Label>
                <Select value={priority} onValueChange={(v) => setPriority(v as TaskPriority)}>
                  <SelectTrigger className="bg-slate-950 border-slate-800 text-white">
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800">
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="URGENT">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">Status</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as TaskStatus)}>
                  <SelectTrigger className="bg-slate-950 border-slate-800 text-white">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800">
                    <SelectItem value="TODO">To Do</SelectItem>
                    <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                    <SelectItem value="IN_REVIEW">In Review</SelectItem>
                    <SelectItem value="DONE">Done</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dueDate" className="text-slate-300">
                  Due Date
                </Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="bg-slate-950 border-slate-800 text-white"
                />
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-slate-300">Assignees</Label>

              {!projectId ? (
                <div className="text-slate-500 text-sm">Select a project first.</div>
              ) : isMembersLoading ? (
                <div className="text-slate-500 text-sm">Loading project members...</div>
              ) : availableAssignees.length === 0 ? (
                <div className="text-slate-500 text-sm">
                  No available members found for this project.
                </div>
              ) : (
                <div className="space-y-2 rounded-lg border border-slate-800 bg-slate-950 p-3 max-h-64 overflow-y-auto">
                  {availableAssignees.map((member) => (
                    <label
                      key={member.user_id}
                      className="flex items-center justify-between gap-3 rounded-md px-3 py-2 hover:bg-slate-900 cursor-pointer"
                    >
                      <div>
                        <div className="text-white text-sm font-medium">
                          {member.full_name || "Unnamed user"}
                        </div>
                        <div className="text-slate-500 text-xs">
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
              )}
            </div>

            <div className="flex items-center justify-end gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(`/tasks/${id}`)}
                className="border-slate-700 text-slate-300 hover:bg-slate-800"
              >
                Cancel
              </Button>

              <Button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
