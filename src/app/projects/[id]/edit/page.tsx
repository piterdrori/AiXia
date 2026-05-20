import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { logActivity } from "@/lib/activity";
import { createRequestTracker } from "@/lib/safeAsync";
import { createNotification } from "@/lib/notifications";
import { useLanguage } from "@/lib/i18n";
import { canEditProject } from "@/lib/permissions";
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
import { Loader2, Users } from "lucide-react";
import { AixiaHero, AixiaPage } from "@/components/aixia";
import { initialsFromDisplayName } from "@/app/dashboard/components/DashboardMemberStatusDot";
import "@/styles/dashboard/tokens.css";
import "@/styles/dashboard/layout.css";
import "@/styles/dashboard/visual.css";
import "@/styles/projects/projects-visual.css";

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

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <div className="h-4 w-20 rounded bg-slate-800" />
              <div className="h-10 w-full rounded bg-slate-900" />
            </div>
            <div className="space-y-2">
              <div className="h-4 w-20 rounded bg-slate-800" />
              <div className="h-10 w-full rounded bg-slate-900" />
            </div>
          </div>

          <div className="flex flex-col space-y-2">
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
  const { t } = useLanguage();

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
        setError(t("projects.failedToLoadProject", "Failed to load project."));
        return;
      }

      const project = projectData as ProjectRow;
      const canEdit = canEditProject(
  project,
  user.id,
  currentUserRole
);

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
      setError(
        t(
          "projects.somethingWentWrongWhileLoadingProject",
          "Something went wrong while loading the project."
        )
      );
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
      setError(t("projects.projectNameIsRequired", "Project name is required."));
      return;
    }

    if (startDate && endDate && new Date(endDate) < new Date(startDate)) {
      setError(
        t(
          "projects.endDateCannotBeEarlierThanStartDate",
          "End date cannot be earlier than start date."
        )
      );
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

if (!existingProject) {
  setError(
    t(
      "projects.failedToLoadProject",
      "Failed to load project."
    )
  );
  setIsSaving(false);
  return;
}

const canEdit = canEditProject(
  existingProject,
  user.id,
  me?.role as Role
);

if (!canEdit) {
  setError(
    t(
      "projects.noPermissionToEditProject",
      "You do not have permission to edit this project."
    )
  );
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
            title: t("projects.addedToProject", "Added to Project"),
            message: t("projects.youWereAddedToProject", `You were added to project "${name}"`),
            link: `/projects/${id}`,
            entityType: "project",
            entityId: id,
          });
        }
      }

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
            title: t("projects.removedFromProject", "Removed from Project"),
            message: t(
              "projects.youWereRemovedFromProject",
              `You were removed from project "${name}"`
            ),
            link: `/projects/${id}`,
            entityType: "project",
            entityId: id,
          });
        }
      }

      navigate(`/projects/${id}`);
    } catch (err) {
      console.error("Update project error:", err);
      setError(
        t(
          "projects.somethingWentWrongWhileUpdatingProject",
          "Something went wrong while updating the project."
        )
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading && !hasLoadedOnce) {
    return <ProjectEditSkeleton />;
  }

 return (
  <AixiaPage
    surface="command"
    className="aixia-command-page aixia-projects-page aixia-projects-page--new h-full flex flex-col overflow-hidden"
  >
      <AixiaHero
        surface="command"
        className="shrink-0"
        parentLabel={name || t("projects.project", "Project")}
        parentPath={`/projects/${id}`}
        gradientTitle={t("projects.projectsTitle", "Projects")}
        title={t("projects.editProject", "Edit Project")}
        subtitle={t("projects.updateProjectDetailsAndTeam", "Update your project details and team")}
      >
        {isRefreshing ? (
          <span className="aixia-dash-list-row-meta text-xs">
            {t("projects.refreshing", "Refreshing...")}
          </span>
        ) : null}
      </AixiaHero>
      <div className="aixia-command-scroll flex min-h-0 flex-1 flex-col">
        <Card className="aixia-dash-panel aixia-dash-glass aixia-dash-tilt-panel aixia-projects-panel-card aixia-projects-new-form-card w-full">
      <CardContent className="p-4 lg:p-6">
        <form onSubmit={handleSubmit} className="aixia-projects-new-form">
            <div className="aixia-projects-new-form-fields">
            {error && (
              <Alert className="aixia-projects-alert-error py-2 shrink-0">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="name" className="aixia-projects-label">
                {t("projects.projectName", "Project Name")}{" "}
                <span className="text-red-400">*</span>
              </Label>
              <Input
                id="name"
                placeholder={t("projects.enterProjectName", "Enter project name")}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="aixia-projects-input h-10"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description" className="aixia-projects-label">
                {t("projects.description", "Description")}
              </Label>
              <Textarea
                id="description"
                placeholder={t("projects.describeYourProject", "Describe your project...")}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="aixia-projects-textarea min-h-[96px] max-h-[140px] shrink-0 resize-none"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">

  <div className="space-y-2">
    <Label htmlFor="status" className="aixia-projects-label">
      {t("projects.status", "Status")}
    </Label>
    <Select value={status} onValueChange={(v) => setStatus(v as ProjectStatus)}>
      <SelectTrigger className="aixia-projects-select-trigger h-10">
        <SelectValue placeholder={t("projects.selectStatus", "Select status")} />
      </SelectTrigger>
      <SelectContent className="aixia-projects-select-content">
        <SelectItem value="PLANNING">
          {t("projects.statusPlanning", "Planning")}
        </SelectItem>
        <SelectItem value="ACTIVE">
          {t("projects.statusActive", "Active")}
        </SelectItem>
        <SelectItem value="ON_HOLD">
          {t("projects.statusOnHold", "On Hold")}
        </SelectItem>
        <SelectItem value="COMPLETED">
          {t("projects.statusCompleted", "Completed")}
        </SelectItem>
        <SelectItem value="CANCELLED">
          {t("projects.statusCancelled", "Cancelled")}
        </SelectItem>
      </SelectContent>
    </Select>
  </div>

  <div className="space-y-2">
    <Label htmlFor="startDate" className="aixia-projects-label">
      {t("projects.startDate", "Start Date")}
    </Label>
    <Input
      id="startDate"
      type="date"
      value={startDate}
      onChange={(e) => setStartDate(e.target.value)}
      className="aixia-projects-input h-10"
    />
  </div>

  <div className="space-y-2">
    <Label htmlFor="endDate" className="aixia-projects-label">
      {t("projects.endDate", "End Date")}
    </Label>
    <Input
      id="endDate"
      type="date"
      value={endDate}
      onChange={(e) => setEndDate(e.target.value)}
      className="aixia-projects-input h-10"
    />
  </div>

</div>
            </div>

            <div className="aixia-projects-assign-section">
  <div className="flex items-center justify-between gap-3">
    <div className="aixia-projects-card-heading">
      <Users className="aixia-projects-card-heading__icon" aria-hidden />
      <span className="aixia-dash-panel-title">
        {t("projects.assignTeamMembers", "Assign Team Members")}
      </span>
    </div>
    <span className="aixia-dash-list-row-meta">
      {selectedMembers.length} selected
    </span>
  </div>

              {teamMembers.length === 0 ? (
                <p className="aixia-dash-empty m-0 text-sm">
                  {t("projects.noActiveTeamMembersFound", "No active team members found.")}
                </p>
              ) : (
                <div className="aixia-projects-member-list aixia-projects-member-rows max-h-[220px] overflow-y-auto p-2.5">
                  {teamMembers.map((member) => {
                    const displayName =
                      member.full_name || t("projects.unnamedUser", "Unnamed user");

                    return (
                      <label
                        key={member.user_id}
                        className="aixia-projects-member-row aixia-projects-member-row--pick"
                      >
                        <span className="aixia-projects-member-tile-avatar" aria-hidden>
                          {initialsFromDisplayName(displayName)}
                        </span>
                        <span className="aixia-projects-member-tile-meta">
                          <span className="aixia-dash-list-row-title truncate">{displayName}</span>
                          <span className="aixia-dash-pill">{member.role}</span>
                        </span>
                        <input
                          type="checkbox"
                          checked={selectedMembers.includes(member.user_id)}
                          onChange={() => toggleMember(member.user_id)}
                          className="h-4 w-4 shrink-0"
                        />
                      </label>
                    );
                  })}
                </div>
              )}

              <p className="aixia-dash-empty aixia-projects-new-form-note text-xs">
                {t(
                  "projects.projectVisibilityNote",
                  "Only assigned members, the creator, and admin will be able to see this project."
                )}
              </p>
            </div>

            <div className="aixia-projects-new-form-footer">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(`/projects/${id}`)}
                className="aixia-dash-action h-9"
              >
                {t("projects.cancel", "Cancel")}
              </Button>

              <Button
                type="submit"
                className="aixia-dash-action aixia-dash-action--primary h-9"
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t("common.saving", "Saving...")}
                  </>
                ) : (
                  t("projects.saveChanges", "Save Changes")
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
