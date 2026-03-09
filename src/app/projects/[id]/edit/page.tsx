import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";

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

type ProjectRow = {
  id: string;
  name: string;
  description: string | null;
  status: string | null;
  progress: number | null;
  created_by: string | null;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
};

export default function ProjectEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [project, setProject] = useState<ProjectRow | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<Role | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<
    "PLANNING" | "ACTIVE" | "ON_HOLD" | "COMPLETED" | "CANCELLED"
  >("PLANNING");
  const [progress, setProgress] = useState("0");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [isPageLoading, setIsPageLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadProject = async () => {
      if (!id) {
        navigate("/projects");
        return;
      }

      setIsPageLoading(true);
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

        const { data: me, error: meError } = await supabase
          .from("profiles")
          .select("role")
          .eq("user_id", user.id)
          .single();

        if (meError || !me) {
          setError("Failed to load your profile.");
          setIsPageLoading(false);
          return;
        }

        const myRole = me.role as Role;
        setCurrentUserRole(myRole);

        const { data: projectData, error: projectError } = await supabase
          .from("projects")
          .select("id, name, description, status, progress, created_by, start_date, end_date, created_at")
          .eq("id", id)
          .single();

        if (projectError || !projectData) {
          navigate("/projects");
          return;
        }

        const loadedProject = projectData as ProjectRow;

        const canEdit =
          myRole === "admin" ||
          myRole === "manager" ||
          myRole === "guest";

        if (!canEdit) {
          navigate("/projects");
          return;
        }

        setProject(loadedProject);
        setName(loadedProject.name || "");
        setDescription(loadedProject.description || "");
        setStatus(
          ((loadedProject.status || "PLANNING").toUpperCase() as
            | "PLANNING"
            | "ACTIVE"
            | "ON_HOLD"
            | "COMPLETED"
            | "CANCELLED")
        );
        setProgress(String(loadedProject.progress ?? 0));
        setStartDate(loadedProject.start_date || "");
        setEndDate(loadedProject.end_date || "");
      } catch (err) {
        console.error("Load project edit page error:", err);
        setError("Failed to load project.");
      } finally {
        setIsPageLoading(false);
      }
    };

    loadProject();
  }, [id, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!id || !project) return;

    setError("");

    if (!name.trim()) {
      setError("Project name is required.");
      return;
    }

    const parsedProgress = Number(progress);

    if (Number.isNaN(parsedProgress) || parsedProgress < 0 || parsedProgress > 100) {
      setError("Progress must be a number between 0 and 100.");
      return;
    }

    setIsSaving(true);

    try {
      const { error: updateError } = await supabase
        .from("projects")
        .update({
          name: name.trim(),
          description: description.trim() || null,
          status,
          progress: parsedProgress,
          start_date: startDate || null,
          end_date: endDate || null,
        })
        .eq("id", id);

      if (updateError) {
        console.error("Update project error:", updateError);
        setError(updateError.message || "Failed to update project.");
        setIsSaving(false);
        return;
      }

      navigate("/projects");
    } catch (err) {
      console.error("Project update exception:", err);
      setError("Failed to update project.");
      setIsSaving(false);
    }
  };

  if (isPageLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (!project) {
    return null;
  }

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
          <h1 className="text-2xl font-bold text-white">Edit Project</h1>
          <p className="text-slate-400">Update project details</p>
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
              <Label htmlFor="name" className="text-slate-300">
                Project Name <span className="text-red-400">*</span>
              </Label>
              <Input
                id="name"
                placeholder="Enter project name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-slate-950 border-slate-800 text-white placeholder:text-slate-600"
                disabled={isSaving}
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
                disabled={isSaving}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status" className="text-slate-300">
                Status
              </Label>
              <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
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

            <div className="space-y-2">
              <Label htmlFor="progress" className="text-slate-300">
                Progress %
              </Label>
              <Input
                id="progress"
                type="number"
                min="0"
                max="100"
                value={progress}
                onChange={(e) => setProgress(e.target.value)}
                className="bg-slate-950 border-slate-800 text-white"
                disabled={isSaving}
              />
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
                  disabled={isSaving}
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
                  disabled={isSaving}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/projects")}
                className="border-slate-700 text-slate-300 hover:bg-slate-800"
                disabled={isSaving}
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
