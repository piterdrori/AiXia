import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { createRequestTracker } from "@/lib/safeAsync";
import { useLanguage } from "@/lib/i18n";
import { canPerform, getEffectivePermissions, type Permission, type Role } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Shield, Save, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

type Status =
  | "pending_verification"
  | "pending_profile"
  | "pending_approval"
  | "active"
  | "rejected";

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

type CurrentUserRoleRow = {
  role: Role;
};

const permissionLabels: Record<
  Permission,
  { label: string; description: string }
> = {
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
  const { t } = useLanguage();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const requestTracker = useRef(createRequestTracker());

  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState<Role | null>(null);
  const [user, setUser] = useState<ProfileRow | null>(null);

  const loadData = useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      if (!id) {
        navigate("/employees");
        return;
      }

      const requestId = requestTracker.current.next();

      if (mode === "initial") {
        setIsBootstrapping(true);
      } else {
        setIsRefreshing(true);
      }

      setSaveError("");

      try {
        const {
          data: { user: authUser },
          error: authError,
        } = await supabase.auth.getUser();

        if (!requestTracker.current.isLatest(requestId)) return;

        if (authError || !authUser) {
          navigate("/login");
          return;
        }

        const { data: me, error: meError } = await supabase
          .from("profiles")
          .select("role")
          .eq("user_id", authUser.id)
          .single();

        if (!requestTracker.current.isLatest(requestId)) return;

        if (meError || !me) {
          navigate("/employees");
          return;
        }

        const myRole = (me as CurrentUserRoleRow).role;
        setCurrentUserRole(myRole);

        if (!canPerform(myRole, "manageUsers")) {
  navigate("/employees");
  return;
}

        const { data: targetUser, error: targetUserError } = await supabase
          .from("profiles")
          .select("*")
          .eq("user_id", id)
          .maybeSingle();

        if (!requestTracker.current.isLatest(requestId)) return;

        if (targetUserError || !targetUser) {
          setUser(null);
          setSaveError(t("employeePermissions.errors.loadPage"));
          return;
        }

        const typedUser = targetUser as ProfileRow;
        setUser(typedUser);
        setPermissions((typedUser.permissions || {}) as Record<string, boolean>);
      } catch (err) {
        if (!requestTracker.current.isLatest(requestId)) return;
        console.error("Permissions page load error:", err);
        setSaveError(t("employeePermissions.errors.loadPageFailed"));
      } finally {
        if (!requestTracker.current.isLatest(requestId)) return;

        if (mode === "initial") {
          setIsBootstrapping(false);
        } else {
          setIsRefreshing(false);
        }
      }
    },
    [id, navigate, t]
  );

  useEffect(() => {
    void loadData("initial");
  }, [loadData]);

  const handleToggle = (permission: string) => {
    setPermissions((prev) => ({
      ...prev,
      [permission]: !prev[permission],
    }));
    setSaved(false);
    setSaveError("");
  };

  const handleSave = async () => {
    if (!id || !currentUserRole || !canPerform(currentUserRole, "manageUsers")) return;

    setIsSaving(true);
    setSaved(false);
    setSaveError("");

    try {
      const nextUpdatedAt = new Date().toISOString();

      const { error } = await supabase
        .from("profiles")
        .update({
          permissions,
          updated_at: nextUpdatedAt,
        })
        .eq("user_id", id);

      if (error) {
        setSaveError(error.message || t("employeePermissions.errors.saveFailed"));
        return;
      }

      setUser((prev) =>
        prev
          ? {
              ...prev,
              permissions,
              updated_at: nextUpdatedAt,
            }
          : prev
      );

      setSaved(true);
      window.setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error("Permissions save error:", err);
      setSaveError(t("employeePermissions.errors.unexpectedSaveError"));
    } finally {
      setIsSaving(false);
    }
  };

  const roleBadges = useMemo(() => {
  if (!user) return null;

  const effectivePermissions = getEffectivePermissions(user.role, user.permissions || null);
  const enabledPermissions = Object.entries(effectivePermissions).filter(
    ([, isEnabled]) => isEnabled
  ) as Array<[Permission, boolean]>;

  if (enabledPermissions.length === 0) {
    return (
      <Badge className="bg-slate-500/20 text-slate-400">
        {t("employeePermissions.roleBadges.noPermissions", "No default permissions")}
      </Badge>
    );
  }

  return enabledPermissions.map(([permission]) => {
    const label =
      permission === "createProjects"
        ? t("employeePermissions.permissions.createProjects.label")
        : permission === "editAllProjects"
          ? t("employeePermissions.permissions.editAllProjects.label")
          : permission === "deleteProjects"
            ? t("employeePermissions.permissions.deleteProjects.label")
            : permission === "createTasks"
              ? t("employeePermissions.permissions.createTasks.label")
              : permission === "editTasks"
                ? t("employeePermissions.permissions.editTasks.label")
                : permission === "deleteTasks"
                  ? t("employeePermissions.permissions.deleteTasks.label")
                  : permission === "manageUsers"
                    ? t("employeePermissions.permissions.manageUsers.label")
                    : permission === "viewReports"
                      ? t("employeePermissions.permissions.viewReports.label")
                      : permission === "accessChat"
                        ? t("employeePermissions.permissions.accessChat.label")
                        : permission === "changeSettings"
                          ? t("employeePermissions.permissions.changeSettings.label")
                          : permission === "visibility"
                            ? t("employeePermissions.permissions.visibility.label")
                            : permission;

    return (
      <Badge
        key={permission}
        className="bg-blue-500/20 text-blue-400"
      >
        {label}
      </Badge>
    );
  });
}, [t, user]);
