import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { createRequestTracker } from "@/lib/safeAsync";
import { useLanguage } from "@/lib/i18n";
import { projectSchema } from "@/lib/validation";
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

import "@/styles/dashboard/tokens.css";
import "@/styles/dashboard/layout.css";
import "@/styles/dashboard/visual.css";
import "@/styles/projects/projects-visual.css";

type ProjectStatus =
  | "PLANNING"
  | "ACTIVE"
  | "ON_HOLD"
  | "COMPLETED"
  | "CANCELLED";

type ProfileRow = {
  user_id: string;
  full_name: string | null;
  role: "admin" | "manager" | "employee" | "guest";
  status: "active" | "pending" | "inactive" | "denied";
};

export default function ProjectNewPage() {
  const navigate = useNavigate();
  const requestTracker = useRef(createRequestTracker());
  const { t } = useLanguage();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<ProjectStatus>("PLANNING");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [teamMembers, setTeamMembers] = useState<ProfileRow[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState<ProfileRow["role"] | null>(null);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isMembersLoading, setIsMembersLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadMembers = async () => {
      const requestId = requestTracker.current.next();
      setIsMembersLoading(true);

      const {
  data: { user },
} = await supabase.auth.getUser();

if (!user) {
  navigate("/login");
  return;
}

const { data: myProfile } = await supabase
  .from("profiles")
  .select("role")
  .eq("user_id", user.id)
  .single();

if (!myProfile) {
  navigate("/projects");
  return;
}

setCurrentUserRole(myProfile.role);

if (!canPerform(myProfile.role, "createProjects")) {
  navigate("/projects");
  return;
}

      try {
        const { data, error: membersError } = await supabase
          .from("profiles")
          .select("user_id, full_name, role, status")
          .eq("status", "active")
          .order("full_name", { ascending: true });

        if (!mounted || !requestTracker.current.isLatest(requestId)) return;

        if (membersError) {
          console.error("Load team members error:", membersError);
          setTeamMembers([]);
        } else {
          setTeamMembers((data || []) as ProfileRow[]);
        }
      } catch (err) {
        if (!mounted || !requestTracker.current.isLatest(requestId)) return;
        console.error("Unexpected load members error:", err);
        setTeamMembers([]);
      } finally {
        if (!mounted || !requestTracker.current.isLatest(requestId)) return;
        setIsMembersLoading(false);
      }
    };

    void loadMembers();

    return () => {
      mounted = false;
    };
  }, []);

  const toggleMember = (userId: string) => {
    setSelectedMembers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const validation = projectSchema.safeParse({
  name: name.trim(),
  startDate: startDate || undefined,
  endDate: endDate || undefined,
});

if (!validation.success) {
  const firstIssue = validation.error.issues[0];

  if (firstIssue?.path[0] === "name") {
    setError(
      t("projects.projectNameRequired", "Project name is required")
    );
    return;
  }

  if (firstIssue?.path[0] === "endDate") {
    setError(
      t(
        "projects.endDateCannotBeEarlierThanStartDate",
        "End date cannot be earlier than start date"
      )
    );
    return;
  }

  setError(t("projects.failedToCreateProject", "Failed to create project"));
  return;
}

    const requestId = requestTracker.current.next();
    setIsLoading(true);

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (!requestTracker.current.isLatest(requestId)) return;

      if (authError || !user) {
        setError(t("projects.youAreNotLoggedIn", "You are not logged in"));
        setIsLoading(false);
        return;
      }

      const { data: myProfile } = await supabase
  .from("profiles")
  .select("role")
  .eq("user_id", user.id)
  .single();

if (!myProfile || !canPerform(myProfile.role, "createProjects")) {
  setError(t("projects.notAuthorized", "Not authorized"));
  setIsLoading(false);
  return;
}

      const { data, error: invokeError } = await supabase.functions.invoke(
        "project-create",
        {
          body: {
            name: name.trim(),
            description: description.trim() || null,
            status,
            startDate: startDate || null,
            endDate: endDate || null,
            memberIds: selectedMembers,
          },
        }
      );

      if (!requestTracker.current.isLatest(requestId)) return;

      if (invokeError) {
        console.error("Project create function invoke error:", invokeError);
        setError(
          invokeError.message ||
            t("projects.failedToCreateProject", "Failed to create project")
        );
        setIsLoading(false);
        return;
      }

      if (!data?.success) {
        setError(
          data?.error ||
            t("projects.failedToCreateProject", "Failed to create project")
        );
        setIsLoading(false);
        return;
      }

      if (!requestTracker.current.isLatest(requestId)) return;

      navigate(`/projects/${data.project.id}`);
    } catch (err) {
      if (!requestTracker.current.isLatest(requestId)) return;
      console.error("Create project error:", err);
      setError(t("projects.failedToCreateProject", "Failed to create project"));
      setIsLoading(false);
    } finally {
      if (!requestTracker.current.isLatest(requestId)) return;
      setIsLoading(false);
    }
  };

   return (
    <AixiaPage
      surface="command"
      className="aixia-command-page aixia-projects-page aixia-projects-page--new h-full flex flex-col overflow-hidden"
    >
      <AixiaHero
        surface="command"
        className="shrink-0"
        parentLabel={t("projects.projectsTitle", "Projects")}
        parentPath="/projects"
        gradientTitle={t("projects.projectsTitle", "Projects")}
        title={t("projects.createNewProject", "Create New Project")}
        subtitle={t("projects.setUpNewProjectForTeam", "Set up a new project for your team")}
      />
      <div className="aixia-command-scroll flex min-h-0 flex-1 flex-col">
      <Card className="aixia-dash-panel aixia-dash-glass aixia-dash-tilt-panel aixia-projects-panel-card aixia-projects-new-form-card w-full">
        <CardContent className="p-4 lg:p-6">
          <form onSubmit={handleSubmit} className="aixia-projects-new-form">
            {error && (
              <Alert className="border-red-800 bg-red-900/20 py-2 text-red-300 shrink-0">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="aixia-projects-new-form-fields">
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
                rows={3}
                className="aixia-projects-textarea min-h-[96px] resize-none"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
              <div className="space-y-1.5">
                <Label htmlFor="status" className="aixia-projects-label">
                  {t("projects.status", "Status")}
                </Label>
                <Select
                  value={status}
                  onValueChange={(v) => setStatus(v as ProjectStatus)}
                >
                  <SelectTrigger className="aixia-projects-select-trigger h-10">
                    <SelectValue
                      placeholder={t("projects.selectStatus", "Select status")}
                    />
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

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
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

                <div className="space-y-1.5">
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
            </div>

            <div className="aixia-projects-assign-section">
              <div className="aixia-projects-member-picker aixia-dash-glass">
                <div className="aixia-projects-member-picker-hd">
                  <div className="aixia-projects-card-heading">
                    <Users className="aixia-projects-card-heading__icon" aria-hidden />
                    <span className="aixia-dash-panel-title">
                      {t("projects.assignTeamMembers", "Assign Team Members")}
                    </span>
                  </div>
                  <span
                    className={
                      selectedMembers.length > 0
                        ? "aixia-dash-pill"
                        : "aixia-dash-list-row-meta"
                    }
                  >
                    {selectedMembers.length} selected
                  </span>
                </div>

                <div
                  className={`aixia-projects-member-picker-body${
                    teamMembers.length > 9 ? " aixia-projects-member-picker-body--scroll" : ""
                  }`}
                >

                  {isMembersLoading ? (
                    <p className="aixia-dash-empty m-0 flex min-h-[6rem] items-center justify-center">
                      {t("projects.loadingTeamMembers", "Loading team members...")}
                    </p>
                  ) : teamMembers.length === 0 ? (
                    <p className="aixia-dash-empty m-0 flex min-h-[6rem] items-center justify-center">
                      {t("projects.noActiveTeamMembersFound", "No active team members found.")}
                    </p>
                  ) : (
                    <div className="aixia-projects-member-picker-grid">
                      {teamMembers.map((member) => {
                        const displayName =
                          member.full_name || t("projects.unnamedUser", "Unnamed user");
                        const isSelected = selectedMembers.includes(member.user_id);

                        return (
                          <label
                            key={member.user_id}
                            className={
                              isSelected
                                ? "aixia-projects-member-tile aixia-projects-member-tile--selected"
                                : "aixia-projects-member-tile"
                            }
                          >
                            <span className="aixia-projects-member-tile-check" aria-hidden>
                              {isSelected ? <Check strokeWidth={3} /> : null}
                            </span>
                            <span className="aixia-projects-member-tile-avatar" aria-hidden>
                              {initialsFromDisplayName(displayName)}
                            </span>
                            <span className="aixia-projects-member-tile-meta">
                              <span className="aixia-dash-list-row-title truncate">
                                {displayName}
                              </span>
                              <span className="aixia-dash-pill">{member.role}</span>
                            </span>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleMember(member.user_id)}
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

            <p className="aixia-dash-empty aixia-projects-new-form-note">
              {t(
                "projects.projectVisibilityNote",
                "Only assigned members, the creator, and admin will be able to see this project."
              )}
            </p>

            <div className="aixia-projects-new-form-footer">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/projects")}
                className="aixia-dash-action h-9"
              >
                {t("projects.cancel", "Cancel")}
              </Button>

              <Button
                type="submit"
                className="aixia-dash-action aixia-dash-action--primary h-9"
                disabled={isLoading || !currentUserRole || !canPerform(currentUserRole, "createProjects")}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("projects.creating", "Creating...")}
                  </>
                ) : (
                  t("projects.createProject", "Create Project")
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
