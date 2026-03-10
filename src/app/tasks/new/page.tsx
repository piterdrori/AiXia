import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { logActivity } from "@/lib/activity";
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

export default function TaskNewPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialProjectId = searchParams.get("projectId") || "";

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [projectId, setProjectId] = useState(initialProjectId);
  const [priority, setPriority] = useState<TaskPriority>("MEDIUM");
  const [status, setStatus] = useState<TaskStatus>("TODO");
  const [dueDate, setDueDate] = useState("");

  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [projectMembers, setProjectMembers] = useState<ProjectMemberRow[]>([]);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [, setCurrentUserRole] = useState<Role | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadPage = async () => {
      setIsLoading(true);
      setError("");

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

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

        if (myProfileError || !myProfile) {
          navigate("/tasks");
          return;
        }

        const role = myProfile.role as Role;
        setCurrentUserRole(role);

        const [{ data: allProjects }, { data: allProjectMembers }, { data: allProfiles }] =
          await Promise.all([
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

        const projectsData = (allProjects || []) as ProjectRow[];
        const membersData = (allProjectMembers || []) as ProjectMemberRow[];
        const profilesData = (allProfiles || []) as ProfileRow[];

        const visibleProjects =
          role === "admin"
            ? projectsData
            : projectsData.filter((project) => {
                const isCreator = project.created_by === user.id;
                const isAssigned = membersData.some(
                  (member) => member.project_id === project.id && member.user_id === user.id
                );
                return isCreator || isAssigned;
              });

        setProjects(visibleProjects);
        setProfiles(profilesData);

        if (initialProjectId) {
          const currentProjectMembers = membersData.filter(
            (member) => member.project_id === initialProjectId
          );
          setProjectMembers(currentProjectMembers);
        }

        if (initialProjectId && !visibleProjects.some((p) => p.id === initialProjectId)) {
          setProjectId("");
        }
      } catch (err) {
        console.error("Load task new page error:", err);
        setError("Something went wrong while loading the page.");
      } finally {
        setIsLoading(false);
      }
    };

    loadPage();
  }, [navigate, initialProjectId]);

  useEffect(() => {
    const loadMembersForProject = async () => {
      if (!projectId) {
        setProjectMembers([]);
        setSelectedAssignees([]);
        return;
      }

      const { data, error: membersError } = await supabase
        .from("project_members")
        .select("id, project_id, user_id, role, created_at")
        .eq("project_id", projectId);

      if (membersError) {
        console.error("Load project members error:", membersError);
        setProjectMembers([]);
        setSelectedAssignees([]);
        return;
      }

      const members = (data || []) as ProjectMemberRow[];
      setProjectMembers(members);

      setSelectedAssignees((prev) =>
        prev.filter((userId) => members.some((member) => member.user_id === userId))
      );
    };

    loadMembersForProject();
  }, [projectId]);

  const availableAssignees = useMemo(() => {
    return projectMembers
      .map((member) => profiles.find((profile) => profile.user_id === member.user_id))
      .filter((profile): profile is ProfileRow => Boolean(profile));
  }, [projectMembers, profiles]);

  const toggleAssignee = (userId: string) => {
    setSelectedAssignees((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!currentUserId) {
      setError("User session not found.");
      return;
    }

    if (!title.trim()) {
      setError("Task title is required.");
      return;
    }

    if (!projectId) {
      setError("Please select a project.");
      return;
    }

    setIsSaving(true);

    try {
      const selectedProject = projects.find((project) => project.id === projectId);

      if (!selectedProject) {
        setError("Selected project is not available.");
        setIsSaving(false);
        return;
      }

      const { data: taskData, error: taskError } = await supabase
        .from("tasks")
        .insert({
          title: title.trim(),
          description: description.trim() || null,
          status,
          priority,
          project_id: projectId,
          due_date: dueDate || null,
          created_by: currentUserId,
          assignee_id: selectedAssignees.length > 0 ? selectedAssignees[0] : null,
        })
        .select("id, title, assignee_id")
        .single();

      if (taskError || !taskData) {
        console.error("Create task error:", taskError);
        setError(taskError?.message || "Failed to create task.");
        setIsSaving(false);
        return;
      }

      await logActivity({
        projectId,
        taskId: taskData.id,
        actionType: "task_created",
        entityType: "task",
        entityId: taskData.id,
        message: `Created task "${title.trim()}"`,
      });

     if (selectedAssignees.length > 0) {
        const memberRows = selectedAssignees.map((userId) => ({
          task_id: taskData.id,
          user_id: userId,
          role: "assignee",
        }));

        const { error: taskMembersError } = await supabase
          .from("task_members")
          .insert(memberRows);

        if (taskMembersError) {
          console.error("Create task members error:", taskMembersError);
          setError(taskMembersError.message || "Task created, but failed to assign some members.");
          setIsSaving(false);
          return;
        }

        await logActivity({
          projectId,
          taskId: taskData.id,
          actionType: "task_assignees_added",
          entityType: "member",
          entityId: taskData.id,
          message: `Assigned ${selectedAssignees.length} member(s) to task "${title.trim()}"`,
        });

        for (const assigneeId of selectedAssignees) {
          if (assigneeId === currentUserId) continue;

          await createNotification({
            userId: assigneeId,
            actorUserId: currentUserId,
            type: "TASK_ASSIGNED",
            title: "New Task Assigned",
            message: `You were assigned task "${taskData.title}"`,
            link: `/tasks/${taskData.id}`,
            entityType: "task",
            entityId: taskData.id,
          });
        }
      }
      navigate(`/projects/${projectId}`);
    } catch (err) {
      console.error("Create task submit error:", err);
      setError("Something went wrong while creating the task.");
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/tasks")}
          className="text-slate-400 hover:text-white"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>

        <div>
          <h1 className="text-2xl font-bold text-white">Create New Task</h1>
          <p className="text-slate-400">Add a new task to your project</p>
        </div>
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
              <Label className="text-slate-300">Assign Members</Label>

              {!projectId ? (
                <div className="text-slate-500 text-sm">
                  Select a project first to choose assignees.
                </div>
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

              <p className="text-slate-500 text-xs">
                Only assigned members, admin, project creator, and task creator should be able to see this task.
              </p>
            </div>

            <div className="flex items-center justify-end gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/tasks")}
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
                    Creating...
                  </>
                ) : (
                  "Create Task"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
