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
import { ArrowLeft, Loader2 } from "lucide-react";

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
  <div className="w-full max-w-none">
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/projects")}
          className="text-slate-400 hover:text-white"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>

        <div>
          <h1 className="text-2xl font-bold text-white">
            {t("projects.createNewProject", "Create New Project")}
          </h1>
          <p className="text-slate-400">
            {t("projects.setUpNewProjectForTeam", "Set up a new project for your team")}
          </p>
        </div>
      </div>

      <Card className="w-full bg-slate-900/50 border-slate-800">
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <Alert className="bg-red-900/20 border-red-800 text-red-300">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="name" className="text-slate-300">
                {t("projects.projectName", "Project Name")}{" "}
                <span className="text-red-400">*</span>
              </Label>
              <Input
                id="name"
                placeholder={t("projects.enterProjectName", "Enter project name")}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="bg-slate-950 border-slate-800 text-white placeholder:text-slate-600"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-slate-300">
                {t("projects.description", "Description")}
              </Label>
              <Textarea
                id="description"
                placeholder={t("projects.describeYourProject", "Describe your project...")}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="bg-slate-950 border-slate-800 text-white placeholder:text-slate-600 resize-none"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status" className="text-slate-300">
                {t("projects.status", "Status")}
              </Label>
              <Select
                value={status}
                onValueChange={(v) => setStatus(v as ProjectStatus)}
              >
                <SelectTrigger className="bg-slate-950 border-slate-800 text-white">
                  <SelectValue
                    placeholder={t("projects.selectStatus", "Select status")}
                  />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800">
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate" className="text-slate-300">
                  {t("projects.startDate", "Start Date")}
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
                  {t("projects.endDate", "End Date")}
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
              <Label className="text-slate-300">
                {t("projects.assignTeamMembers", "Assign Team Members")}
              </Label>

              {isMembersLoading ? (
                <div className="text-slate-500 text-sm">
                  {t("projects.loadingTeamMembers", "Loading team members...")}
                </div>
              ) : teamMembers.length === 0 ? (
                <div className="text-slate-500 text-sm">
                  {t("projects.noActiveTeamMembersFound", "No active team members found.")}
                </div>
              ) : (
                <div className="space-y-2 rounded-lg border border-slate-800 bg-slate-950 p-3 max-h-64 overflow-y-auto">
                  {teamMembers.map((member) => (
                    <label
                      key={member.user_id}
                      className="flex items-center justify-between gap-3 rounded-md px-3 py-2 hover:bg-slate-900 cursor-pointer"
                    >
                      <div>
                        <div className="text-white text-sm font-medium">
                          {member.full_name ||
                            t("projects.unnamedUser", "Unnamed user")}
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
                {t(
                  "projects.projectVisibilityNote",
                  "Only assigned members, the creator, and admin will be able to see this project."
                )}
              </p>
            </div>

            <div className="flex items-center justify-end gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/projects")}
                className="border-slate-700 text-slate-300 hover:bg-slate-800"
              >
                {t("projects.cancel", "Cancel")}
              </Button>

              <Button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
                disabled={isLoading || !currentUserRole || !canPerform(currentUserRole, "createProjects")}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
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
  );
}
