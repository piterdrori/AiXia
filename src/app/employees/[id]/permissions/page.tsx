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
  permissions?: Partial<Record<Permission, boolean>> | null;
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

  const [permissions, setPermissions] = useState<Partial<Record<Permission, boolean>>>({});
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
        setPermissions(
  (typedUser.permissions || {}) as Partial<Record<Permission, boolean>>
);
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

  const handleToggle = (permission: Permission) => {
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

    if (!user && !isBootstrapping) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Card className="bg-red-900/10 border-red-800/30">
          <CardContent className="p-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 mt-0.5" />
            <div className="text-red-300">
              {saveError || t("employeePermissions.errors.loadPage")}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (
    (!currentUserRole || !canPerform(currentUserRole, "manageUsers")) &&
    !isBootstrapping
  ) {
    return null;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(`/employees/${id}`)}
          className="text-slate-400 hover:text-white"
          disabled={isSaving}
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>

        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white">
            {t("employeePermissions.header.title")}
          </h1>
          <p className="text-slate-400">
            {t("employeePermissions.header.subtitle", undefined, {
              name:
                user?.full_name ||
                t("employeePermissions.empty.unnamedUser"),
            })}
          </p>
        </div>

        <Button
          variant="outline"
          className="border-slate-700 text-slate-300 hover:bg-slate-800"
          onClick={() => void loadData("refresh")}
          disabled={isRefreshing || isSaving}
        >
          {isRefreshing
            ? t("employeePermissions.actions.refreshing")
            : t("employeePermissions.actions.refresh")}
        </Button>
      </div>

      {saved && (
        <Alert className="bg-green-900/20 border-green-800 text-green-400">
          <AlertDescription>
            {t("employeePermissions.success.saved")}
          </AlertDescription>
        </Alert>
      )}

      {saveError && user && (
        <Alert className="bg-red-900/20 border-red-800 text-red-400">
          <AlertDescription>{saveError}</AlertDescription>
        </Alert>
      )}

      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-indigo-400" />
            <CardTitle className="text-white">
              {t("employeePermissions.sections.permissionOverrides")}
            </CardTitle>
          </div>
          <p className="text-slate-400 text-sm">
            {t(
              "employeePermissions.sections.permissionOverridesDescription"
            )}
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          {(Object.entries(permissionLabels) as Array<
  [Permission, { label: string; description: string }]
>).map(([key, { label, description }]) => (
              <div
                key={key}
                className="flex items-start justify-between gap-4"
              >
                <div className="flex-1">
                  <Label
                    htmlFor={key}
                    className="text-white font-medium cursor-pointer"
                  >
                    {label}
                  </Label>
                  <p className="text-slate-500 text-sm">
                    {description}
                  </p>
                </div>

                <Switch
                  id={key}
                  checked={permissions[key] || false}
                  onCheckedChange={() => handleToggle(key)}
                  disabled={isSaving}
                />
              </div>
            )
          )}

          <Separator className="bg-slate-800" />

          <div className="flex items-center justify-between pt-4">
            <Button
              variant="outline"
              onClick={() => navigate(`/employees/${id}`)}
              className="border-slate-700 text-slate-300 hover:bg-slate-800"
              disabled={isSaving}
            >
              {t("employeePermissions.actions.cancel")}
            </Button>

            <Button
              onClick={() => void handleSave()}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
              disabled={isSaving}
            >
              <Save className="w-4 h-4 mr-2" />
              {isSaving
                ? t("employeePermissions.actions.saving")
                : t("employeePermissions.actions.savePermissions")}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white text-lg">
            {t(
              "employeePermissions.sections.currentRolePermissions"
            )}
          </CardTitle>
        </CardHeader>

        <CardContent>
          <p className="text-slate-400 mb-4">
            {t(
              "employeePermissions.sections.currentRoleDescription.before"
            )}
            <Badge className="mx-1">
              {user?.role.toUpperCase()}
            </Badge>
            {t(
              "employeePermissions.sections.currentRoleDescription.after"
            )}
          </p>
          <div className="flex flex-wrap gap-2">
            {roleBadges}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
