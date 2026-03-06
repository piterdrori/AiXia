import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Shield, Save } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

type Role = "admin" | "manager" | "employee" | "guest";
type Status = "active" | "pending" | "inactive" | "denied";

type ProfileRow = {
  user_id: string;
  full_name: string | null;
  role: Role;
  status: Status;
  requested_role: Role | null;
  permissions?: Record<string, boolean> | null;
  created_at: string;
  updated_at: string;
};

const permissionLabels: Record<string, { label: string; description: string }> = {
  createProjects: {
    label: "Create Projects",
    description: "Can create new projects",
  },
  editAllProjects: {
    label: "Edit All Projects",
    description: "Can edit any project in the system",
  },
  deleteProjects: {
    label: "Delete Projects",
    description: "Can delete projects",
  },
  createTasks: {
    label: "Create Tasks",
    description: "Can create new tasks",
  },
  editTasks: {
    label: "Edit Tasks",
    description: "Can edit tasks",
  },
  deleteTasks: {
    label: "Delete Tasks",
    description: "Can delete tasks",
  },
  manageUsers: {
    label: "Manage Users",
    description: "Can manage user accounts and approvals",
  },
  viewReports: {
    label: "View Reports",
    description: "Can view reports and analytics",
  },
  accessChat: {
    label: "Access Chat",
    description: "Can use the chat feature",
  },
  changeSettings: {
    label: "Change Settings",
    description: "Can change personal and system settings",
  },
  visibility: {
    label: "Visibility",
    description: "Can view sensitive information",
  },
};

export default function EmployeePermissionsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState<Role | null>(null);
  const [user, setUser] = useState<ProfileRow | null>(null);

  const loadData = async () => {
    if (!id) {
      navigate("/employees");
      return;
    }

    setIsLoading(true);
    setSaveError("");

    try {
      const {
        data: { user: authUser },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !authUser) {
        navigate("/login");
        return;
      }

      const { data: me, error: meError } = await supabase
        .from("profiles")
        .select("role")
        .eq("user_id", authUser.id)
        .single();

      if (meError) {
        console.error("Failed to load current user role:", meError);
        navigate("/employees");
        return;
      }

      const role = (me?.role as Role) || null;
      setCurrentUserRole(role);

      if (role !== "admin") {
        navigate("/employees");
        return;
      }

      const { data: targetUser, error: targetUserError } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", id)
        .single();

      if (targetUserError || !targetUser) {
        console.error("Failed to load target user:", targetUserError);
        navigate("/employees");
        return;
      }

      const typedUser = targetUser as ProfileRow;
      setUser(typedUser);
      setPermissions((typedUser.permissions || {}) as Record<string, boolean>);
    } catch (err) {
      console.error("Unexpected load error:", err);
      setSaveError("Failed to load permissions page.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id, navigate]);

  const handleToggle = (permission: string) => {
    setPermissions((prev) => ({
      ...prev,
      [permission]: !prev[permission],
    }));
    setSaved(false);
    setSaveError("");
  };

  const handleSave = async () => {
    if (!id) return;

    setIsSaving(true);
    setSaved(false);
    setSaveError("");

    try {
      const { data, error } = await supabase
        .from("profiles")
        .update({
          permissions,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", id)
        .select();

      console.log("SAVE PERMISSIONS RESULT:", {
        id,
        permissions,
        data,
        error,
      });

      if (error) {
        setSaveError(error.message);
        return;
      }

      setSaved(true);
      await loadData();

      setTimeout(() => {
        setSaved(false);
      }, 3000);
    } catch (err) {
      console.error("Unexpected save error:", err);
      setSaveError("Unexpected error while saving permissions.");
    } finally {
      setIsSaving(false);
    }
  };

  const roleBadges = useMemo(() => {
    if (!user) return null;

    if (user.role === "admin") {
      return <Badge className="bg-green-500/20 text-green-400">All Permissions</Badge>;
    }

    if (user.role === "manager") {
      return (
        <>
          <Badge className="bg-blue-500/20 text-blue-400">Create Projects</Badge>
          <Badge className="bg-blue-500/20 text-blue-400">Edit Projects</Badge>
          <Badge className="bg-blue-500/20 text-blue-400">Create Tasks</Badge>
          <Badge className="bg-blue-500/20 text-blue-400">Edit Tasks</Badge>
          <Badge className="bg-blue-500/20 text-blue-400">View Reports</Badge>
        </>
      );
    }

    if (user.role === "employee") {
      return (
        <>
          <Badge className="bg-slate-500/20 text-slate-400">Create Tasks</Badge>
          <Badge className="bg-slate-500/20 text-slate-400">Edit Own Tasks</Badge>
          <Badge className="bg-slate-500/20 text-slate-400">Access Chat</Badge>
        </>
      );
    }

    return (
      <>
        <Badge className="bg-slate-500/20 text-slate-400">View Projects</Badge>
        <Badge className="bg-slate-500/20 text-slate-400">Create Tasks</Badge>
        <Badge className="bg-slate-500/20 text-slate-400">View Reports</Badge>
      </>
    );
  }, [user]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (!user || currentUserRole !== "admin") {
    return null;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/employees")}
          className="text-slate-400 hover:text-white"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>

        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white">Edit Permissions</h1>
          <p className="text-slate-400">
            Manage permissions for {user.full_name || "Unnamed user"}
          </p>
        </div>
      </div>

      {saved && (
        <Alert className="bg-green-900/20 border-green-800 text-green-400">
          <AlertDescription>Permissions saved successfully!</AlertDescription>
        </Alert>
      )}

      {saveError && (
        <Alert className="bg-red-900/20 border-red-800 text-red-400">
          <AlertDescription>{saveError}</AlertDescription>
        </Alert>
      )}

      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-indigo-400" />
            <CardTitle className="text-white">Permission Overrides</CardTitle>
          </div>
          <p className="text-slate-400 text-sm">
            Toggle permissions to override the default role-based permissions for this user.
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          {Object.entries(permissionLabels).map(([key, { label, description }]) => (
            <div key={key} className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <Label htmlFor={key} className="text-white font-medium cursor-pointer">
                  {label}
                </Label>
                <p className="text-slate-500 text-sm">{description}</p>
              </div>

              <Switch
                id={key}
                checked={permissions[key] || false}
                onCheckedChange={() => handleToggle(key)}
              />
            </div>
          ))}

          <Separator className="bg-slate-800" />

          <div className="flex items-center justify-between pt-4">
            <Button
              variant="outline"
              onClick={() => navigate("/employees")}
              className="border-slate-700 text-slate-300 hover:bg-slate-800"
              disabled={isSaving}
            >
              Cancel
            </Button>

            <Button
              onClick={handleSave}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
              disabled={isSaving}
            >
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? "Saving..." : "Save Permissions"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white text-lg">Current Role Permissions</CardTitle>
        </CardHeader>

        <CardContent>
          <p className="text-slate-400 mb-4">
            This user has the <Badge className="mx-1">{user.role.toUpperCase()}</Badge> role which
            grants the following default permissions:
          </p>
          <div className="flex flex-wrap gap-2">{roleBadges}</div>
        </CardContent>
      </Card>
    </div>
  );
}
