import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { logActivity } from "@/lib/activity";
import { createNotification } from "@/lib/notifications";
import { createRequestTracker } from "@/lib/safeAsync";
import { useLanguage } from "@/lib/i18n";

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
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isMembersLoading, setIsMembersLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadMembers = async () => {
      const requestId = requestTracker.current.next();
      setIsMembersLoading(true);

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

    if (!name.trim()) {
      setError(t("projects.projectNameRequired", "Project name is required"));
      return;
    }

    if (startDate && endDate && new Date(endDate) < new Date(startDate)) {
      setError(t("projects.invalidDateRange", "End date cannot be earlier than start date"));
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
        setError(t("projects.notLoggedIn", "You are not logged in"));
        setIsLoading(false);
        return;
      }

      const { data: projectData, error: insertError } = await supabase
        .from("projects")
        .insert([
          {
            name: name.trim(),
            description: description.trim() || null,
            status,
            progress: 0,
            created_by: user.id,
            start_date: startDate || null,
            end_date: endDate || null,
          },
        ])
        .select()
        .single();

      if (!requestTracker.current.isLatest(requestId)) return;

      if (insertError || !projectData) {
        setError(insertError?.message || t("projects.failedToCreateProject", "Failed to create project"));
        setIsLoading(false);
        return;
      }

      await logActivity({
        projectId: projectData.id,
        actionType: "project_created",
        entityType: "project",
        entityId: projectData.id,
        message: `Created project "${projectData.name}"`,
      });

      if (selectedMembers.length > 0) {
        const memberRows = selectedMembers.map((memberId) => ({
          project_id: projectData.id,
          user_id: memberId,
          role: "member",
        }));

        const { error: membersInsertError } = await supabase
          .from("project_members")
          .insert(memberRows);

        if (!requestTracker.current.isLatest(requestId)) return;

        if (membersInsertError) {
          setError(
            t(
              "projects.membersAssignError",
              `Project created, but failed to assign members: ${membersInsertError.message}`
            )
          );
          setIsLoading(false);
          return;
        }

        for (const memberId of selectedMembers) {
          if (memberId === user.id) continue;

          await createNotification({
            userId: memberId,
            actorUserId: user.id,
            type: "PROJECT_UPDATE",
            title: t("projects.addedToProjectTitle", "Added to Project"),
            message: t("projects.addedToProjectMessage", `You were added to project "${projectData.name}"`),
            link: `/projects/${projectData.id}`,
            entityType: "project",
            entityId: projectData.id,
          });
        }
      }

      if (!requestTracker.current.isLatest(requestId)) return;

      navigate(`/projects/${projectData.id}`);
    } catch (err) {
      if (!requestTracker.current.isLatest(requestId)) return;
      setError(t("projects.failedToCreateProject", "Failed to create project"));
      setIsLoading(false);
    } finally {
      if (!requestTracker.current.isLatest(requestId)) return;
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
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
            {t("projects.createNewProjectSubtitle", "Set up a new project for your team")}
          </p>
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
              <Label className="text-slate-300">
                {t("projects.projectName", "Project Name")} *
              </Label>
              <Input
                placeholder={t("projects.projectNamePlaceholder", "Enter project name")}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">
                {t("projects.description", "Description")}
              </Label>
              <Textarea
                placeholder={t("projects.descriptionPlaceholder", "Describe your project...")}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {/* Rest unchanged except translated labels/buttons */}

            <div className="flex justify-end gap-4">
              <Button
                variant="outline"
                onClick={() => navigate("/projects")}
              >
                {t("projects.cancel", "Cancel")}
              </Button>

              <Button type="submit" disabled={isLoading}>
                {isLoading
                  ? t("projects.creating", "Creating...")
                  : t("projects.createProject", "Create Project")}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
