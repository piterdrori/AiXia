import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { logActivity } from "@/lib/activity";
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
type ProjectStatus = "PLANNING" | "ACTIVE" | "ON_HOLD" | "COMPLETED" | "CANCELLED";

type ProjectRow = {
  id: string;
  name: string;
  description: string | null;
  status: string | null;
  start_date: string | null;
  end_date: string | null;
  created_by: string | null;
};

type ProfileRow = {
  user_id: string;
  full_name: string | null;
  role: Role;
  status: "active" | "pending" | "inactive" | "denied";
};

type ProjectMemberRow = {
  id: string;
  project_id: string;
  user_id: string;
  role: string;
  created_at: string;
};

function ProjectEditSkeleton() {
  return (
    <div className="max-w-2xl mx-auto animate-pulse">
      <div className="flex items-center gap-4 mb-6">
        <div className="h-10 w-10 rounded-md bg-slate-800" />
        <div className="space-y-2">
          <div className="h-7 w-36 rounded bg-slate-800" />
          <div className="h-4 w-56 rounded bg-slate-900" />
        </div>
      </div>

      <Card className="bg-slate-900/50 border-slate-800">
        <CardContent className="p-6 space-y-6">
          <div className="space-y-2">
            <div className="h-4 w-28 rounded bg-slate-800" />
            <div className="h-10 w-full rounded bg-slate-900" />
          </div>

          <div className="space-y-2">
            <div className="h-4 w-24 rounded bg-slate-800" />
            <div className="h-28 w-full rounded bg-slate-900" />
          </div>

          <div className="space-y-2">
            <div className="h-4 w-16 rounded bg-slate-800" />
            <div className="h-10 w-full rounded bg-slate-900" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="h-4 w-20 rounded bg-slate-800" />
              <div className="h-10 w-full rounded bg-slate-900" />
            </div>
            <div className="space-y-2">
              <div className="h-4 w-20 rounded bg-slate-800" />
              <div className="h-10 w-full rounded bg-slate-900" />
            </div>
          </div>

          <div className="space-y-3">
            <div className="h-4 w-36 rounded bg-slate-800" />
            <div className="space-y-2 rounded-lg border border-slate-800 bg-slate-950 p-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between gap-3 rounded-md px-3 py-2"
                >
                  <div className="space-y-2">
                    <div className="h-4 w-32 rounded bg-slate-800" />
                    <div className="h-3 w-16 rounded bg-slate-900" />
                  </div>
                  <div className="h-4 w-4 rounded bg-slate-800" />
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-4 pt-4">
            <div className="h-10 w-24 rounded bg-slate-800" />
            <div className="h-10 w-32 rounded bg-slate-800" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ProjectEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const requestTracker = useRef(createRequestTracker());

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<ProjectStatus>("PLANNING");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [teamMembers, setTeamMembers] = useState<ProfileRow[]>([]);
  const [existingMembers, setExistingMembers] = useState<ProjectMemberRow[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const toggleMember = (userId: string) => {
    setSelectedMembers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const selectedSet = useMemo(() => new Set(selectedMembers), [selectedMembers]);

  const loadProject = async (mode: "initial" | "refresh" = "initial") => {
    if (!id) {
      navigate("/projects");
      return;
    }

    const requestId = requestTracker.current.next();

    if (mode === "initial" && !hasLoadedOnce) {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }

    setError("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!requestTracker.current.isLatest(requestId)) return;

      if (!user) {
        navigate("/login");
        return;
      }

      const [
        { data: me, error: meError },
        { data: projectData, error: projectError },
        { data: membersData },
        { data: profilesData },
      ] = await Promise.all([
        supabase.from("profiles").select("role").eq("user_id", user.id).single(),
        supabase
          .from("projects")
          .select("id, name, description, status, start_date, end_date, created_by")
          .eq("id", id)
          .single(),
        supabase
          .from("project_members")
          .select("id, project_id, user_id, role, created_at")
          .eq("project_id", id),
        supabase
          .from("profiles")
          .select("user_id, full_name, role, status")
          .eq("status", "active")
          .order("full_name", { ascending: true }),
      ]);

      if (!requestTracker.current.isLatest(requestId)) return;

      if (meError || !me) {
        navigate("/projects");
        return;
      }

      const currentUserRole = (me.role as Role) || null;

      if (projectError || !projectData) {
        setError("Failed to load project.");
        return;
      }

      const project = projectData as ProjectRow;
      const canEdit = currentUserRole === "admin" || project.created_by === user.id;

      if (!canEdit) {
        navigate("/projects");
        return;
      }

      const loadedMembers = (membersData || []) as ProjectMemberRow[];
      const loadedProfiles = (profilesData || []) as ProfileRow[];

      setName(project.name || "");
      setDescription(project.description || "");
      setStatus((project.status as ProjectStatus) || "PLANNING");
      setStartDate(project.start_date || "");
      setEndDate(project.end_date || "");
      setExistingMembers(loadedMembers);
      setTeamMembers(loadedProfiles);
      setSelectedMembers(loadedMembers.map((member) => member.user_id));
      setHasLoadedOnce(true);
    } catch (err) {
      if (!requestTracker.current.isLatest(requestId)) return;
      console.error("Load project error:", err);
      setError("Something went wrong while loading the project.");
    } finally {
      if (!requestTracker.current.isLatest(requestId)) return;
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    void loadProject("initial");
  }, [id, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  if (!id) return;

  setError("");

  if (!name.trim()) {
    setError("Project name is required.");
    return;
  }

  if (startDate && endDate && new Date(endDate) < new Date(startDate)) {
    setError("End date cannot be earlier than start date.");
    return;
  }

  const requestId = requestTracker.current.next();
  setIsSaving(true);

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!requestTracker.current.isLatest(requestId)) return;

    if (!user) {
      navigate("/login");
      return;
    }

    const currentUserId = user.id;

    const { data: me } = await supabase
      .from("profiles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    const { data: existingProject } = await supabase
      .from("projects")
      .select("id, created_by")
      .eq("id", id)
      .single();

    const canEdit = me?.role === "admin" || existingProject?.created_by === user.id;

    if (!canEdit) {
      setError("You do not have permission to edit this project.");
      setIsSaving(false);
      return;
    }

    await supabase
      .from("projects")
      .update({
        name: name.trim(),
        description: description.trim() || null,
        status,
        start_date: startDate || null,
        end_date: endDate || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    await logActivity({
      projectId: id,
      actionType: "project_updated",
      entityType: "project",
      entityId: id,
      message: `Updated project "${name.trim()}"`,
    });

    const existingUserIds = existingMembers.map((m) => m.user_id);
    const toInsert = selectedMembers.filter((u) => !existingUserIds.includes(u));
    const toDelete = existingMembers.filter((m) => !selectedSet.has(m.user_id));

    // ✅ ADD MEMBERS
    if (toInsert.length > 0) {
      const rows = toInsert.map((userId) => ({
        project_id: id,
        user_id: userId,
        role: "member",
      }));

      await supabase.from("project_members").insert(rows);

      for (const userId of toInsert) {
        if (userId === currentUserId) continue;

        await createNotification({
          userId,
          actorUserId: currentUserId,
          type: "PROJECT_UPDATE",
          title: "Added to Project",
          message: `You were added to project "${name}"`,
          link: `/projects/${id}`,
          entityType: "project",
          entityId: id,
        });
      }
    }

    // ❌ REMOVE MEMBERS
    if (toDelete.length > 0) {
      const idsToDelete = toDelete.map((m) => m.id);

      await supabase
        .from("project_members")
        .delete()
        .in("id", idsToDelete);

      for (const member of toDelete) {
        if (member.user_id === currentUserId) continue;

        await createNotification({
          userId: member.user_id,
          actorUserId: currentUserId,
          type: "PROJECT_UPDATE",
          title: "Removed from Project",
          message: `You were removed from project "${name}"`,
          link: `/projects/${id}`,
          entityType: "project",
          entityId: id,
        });
      }
    }

    navigate(`/projects/${id}`);
  } catch (err) {
    console.error("Update project error:", err);
    setError("Something went wrong while updating the project.");
  } finally {
    setIsSaving(false);
  }
};
  if (isLoading && !hasLoadedOnce) {
    return <ProjectEditSkeleton />;
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(`/projects/${id}`)}
          className="text-slate-400 hover:text-white"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>

        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white">Edit Project</h1>
            {isRefreshing && <span className="text-xs text-slate-500">Refreshing...</span>}
          </div>
          <p className="text-slate-400">Update your project details and team</p>
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

            <div className="flex justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => void loadProject("refresh")}
                className="border-slate-700 text-slate-300 hover:bg-slate-800"
                disabled={isRefreshing}
              >
                {isRefreshing ? "Refreshing..." : "Refresh"}
              </Button>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name" className="text-slate-300">
                Project Name <span className="text-red-400">*</span>
              </Label>
              <Input
                id="name"
                placeholder="Enter project name"
                value={name}
                onChange={(e) => setName(e.target.value)}
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
                placeholder="Describe your project..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="bg-slate-950 border-slate-800 text-white placeholder:text-slate-600 resize-none"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status" className="text-slate-300">
                Status
              </Label>
              <Select value={status} onValueChange={(v) => setStatus(v as ProjectStatus)}>
                <SelectTrigger className="bg-slate-950 border-slate-800 text-white">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800">
                  <SelectItem value="PLANNING">Planning</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="ON_HOLD">On Hold</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate" className="text-slate-300">
                  Start Date
                </Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-slate-950 border-slate-800 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="endDate" className="text-slate-300">
                  End Date
                </Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-slate-950 border-slate-800 text-white"
                />
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-slate-300">Assign Team Members</Label>

              {teamMembers.length === 0 ? (
                <div className="text-slate-500 text-sm">No active team members found.</div>
              ) : (
                <div className="space-y-2 rounded-lg border border-slate-800 bg-slate-950 p-3 max-h-64 overflow-y-auto">
                  {teamMembers.map((member) => (
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
                        checked={selectedMembers.includes(member.user_id)}
                        onChange={() => toggleMember(member.user_id)}
                        className="h-4 w-4"
                      />
                    </label>
                  ))}
                </div>
              )}

              <p className="text-slate-500 text-xs">
                Only assigned members, the creator, and admin will be able to see this project.
              </p>
            </div>

            <div className="flex items-center justify-end gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(`/projects/${id}`)}
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
