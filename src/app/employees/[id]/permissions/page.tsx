import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { createRequestTracker } from "@/lib/safeAsync";
import { useLanguage } from "@/lib/i18n";
import { getEffectivePermissions, type Permission, type Role } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Shield, AlertCircle } from "lucide-react";
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

type AccessRequestStatus = "pending" | "approved" | "rejected" | "cancelled";

type AccessRequestRow = {
  id: string;
  requester_user_id: string;
  target_user_id: string;
  status: AccessRequestStatus;
  requested_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
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
  viewEmployeeDirectory: {
    label: "View Employee Directory",
    description: "Can open the employees directory page",
  },
  viewEmployeeDetail: {
    label: "View Employee Detail",
    description: "Can open employee profile detail pages",
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
  
  const [saveError, setSaveError] = useState("");
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
 
const [currentUserRole, setCurrentUserRole] = useState<Role | null>(null);
const [user, setUser] = useState<ProfileRow | null>(null);
const [accessRequests, setAccessRequests] = useState<AccessRequestRow[]>([]);
const [requesterProfiles, setRequesterProfiles] = useState<
  Record<string, { user_id: string; full_name: string | null }>
>({});
const [requestActionId, setRequestActionId] = useState<string | null>(null);

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

        const effective = getEffectivePermissions(myRole, null);

if (!effective.manageUsers) {
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

// 🔥 NEW — load access requests for this employee
const { data: requestsData } = await supabase
  .from("employee_access_requests")
  .select("*")
  .eq("target_user_id", id)
  .order("requested_at", { ascending: false });

if (!requestTracker.current.isLatest(requestId)) return;

const requests = (requestsData || []) as AccessRequestRow[];
setAccessRequests(requests);

// 🔥 Load requester profiles (names)
const requesterIds = Array.from(
  new Set(requests.map((r) => r.requester_user_id))
);

if (requesterIds.length > 0) {
  const { data: requesterData } = await supabase
    .from("profiles")
    .select("user_id, full_name")
    .in("user_id", requesterIds);

  if (!requestTracker.current.isLatest(requestId)) return;

  const map: Record<string, { user_id: string; full_name: string | null }> = {};

  (requesterData || []).forEach((p) => {
    map[p.user_id] = {
      user_id: p.user_id,
      full_name: p.full_name,
    };
  });

  setRequesterProfiles(map);
} else {
  setRequesterProfiles({});
}
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

const handleToggle = async (permission: Permission) => {
  if (!user) return;

  const currentEffectivePermissions = getEffectivePermissions(
    user.role,
    permissions || null
  );

  const nextValue = !currentEffectivePermissions[permission];

  const nextPermissions = {
    ...(permissions || {}),
    [permission]: nextValue,
  };

  setPermissions(nextPermissions);
  setSaveError("");

  try {
    const updatedAt = new Date().toISOString();

    const { error } = await supabase
      .from("profiles")
      .update({
        permissions: nextPermissions,
        updated_at: updatedAt,
      })
      .eq("user_id", user.user_id);

    if (error) {
      throw error;
    }
  } catch (err) {
    console.error("Permission toggle error:", err);
    setSaveError(
      err instanceof Error ? err.message : "Failed to update permission"
    );
  }
};

  const handleReviewAccessRequest = async (
    request: AccessRequestRow,
    nextStatus: "approved" | "rejected"
  ) => {
    if (!id || !currentUserRole) return;

const effective = getEffectivePermissions(currentUserRole, null);
if (!effective.manageUsers) return;

    setRequestActionId(request.id);
    setSaveError("");

    try {
      const reviewedAt = new Date().toISOString();

      const { error: requestUpdateError } = await supabase
        .from("employee_access_requests")
        .update({
          status: nextStatus,
          reviewed_at: reviewedAt,
        })
        .eq("id", request.id);

      if (requestUpdateError) {
        throw requestUpdateError;
      }

      if (nextStatus === "approved") {
        const nextPermissions: Partial<Record<Permission, boolean>> = {
          ...(user?.permissions || {}),
          viewEmployeeDetail: true,
        };

        const { error: profileUpdateError } = await supabase
          .from("profiles")
          .update({
            permissions: nextPermissions,
            updated_at: reviewedAt,
          })
          .eq("user_id", request.requester_user_id);

        if (profileUpdateError) {
          throw profileUpdateError;
        }
      }

      setAccessRequests((prev) =>
        prev.map((item) =>
          item.id === request.id
            ? {
                ...item,
                status: nextStatus,
                reviewed_at: reviewedAt,
              }
            : item
        )
      );

    } catch (err) {
      console.error("Review access request error:", err);
      setSaveError(
        err instanceof Error ? err.message : "Failed to review access request."
      );
    } finally {
      setRequestActionId(null);
    }
  };
  

const effectivePermissionEntries = useMemo(() => {
  if (!user) return [];

  const effectivePermissions = getEffectivePermissions(
    user.role,
    permissions || null
  );

  return (Object.keys(permissionLabels) as Permission[]).map((permission) => ({
    permission,
    label: permissionLabels[permission].label,
    enabled: !!effectivePermissions[permission],
    overridden: permissions[permission] !== undefined,
  }));
}, [user, permissions]);

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

if (!currentUserRole && !isBootstrapping) return null;

const effective = currentUserRole
  ? getEffectivePermissions(currentUserRole, null)
  : null;

if (!effective?.manageUsers && !isBootstrapping) {
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
          disabled={false}
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
          disabled={isRefreshing}
        >
          {isRefreshing
            ? t("employeePermissions.actions.refreshing")
            : t("employeePermissions.actions.refresh")}
        </Button>
      </div>

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
          {effectivePermissionEntries.map(
  ({ permission, label, enabled, overridden }) => (
    <div
      key={permission}
      className="flex items-start justify-between gap-4"
    >
      <div className="flex-1">
        <Label
          htmlFor={permission}
          className="text-white font-medium cursor-pointer"
        >
          {label}
        </Label>
        <p className="text-slate-500 text-sm">
          {permissionLabels[permission].description}
        </p>
        <p className="text-xs text-slate-500 mt-1">
          {enabled ? "Enabled" : "Disabled"}
          {overridden ? " • Override applied" : " • Role default"}
        </p>
      </div>

      <Switch
        id={permission}
        checked={enabled}
        onCheckedChange={() => handleToggle(permission)}
        disabled={false}
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
              disabled={false}
            >
              {t("employeePermissions.actions.cancel")}
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

        <CardContent className="space-y-4">
          <p className="text-slate-400">
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

          <div className="grid gap-3">
            {effectivePermissionEntries.map(
              ({ permission, label, enabled, overridden }) => (
                <div
                  key={permission}
                  className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white">
                      {label}
                    </p>
                    <p className="text-xs text-slate-500">
                      {enabled ? "Enabled" : "Disabled"}
                      {overridden ? " • Override applied" : " • Role default"}
                    </p>
                  </div>

                  <Badge
                    className={
                      enabled
                        ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
                        : "bg-slate-700/40 text-slate-400 border-slate-700"
                    }
                  >
                    {enabled ? "ON" : "OFF"}
                  </Badge>
                </div>
              )
            )}
          </div>
        </CardContent>
      </Card>
            <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white text-lg">
            Access Requests
          </CardTitle>
          <p className="text-slate-400 text-sm">
            Users requesting access to this employee profile
          </p>
        </CardHeader>

                <CardContent className="space-y-3">
          {accessRequests.length === 0 ? (
            <p className="text-slate-500 text-sm">
              No access requests
            </p>
          ) : (
            accessRequests.map((req) => (
              <div
                key={req.id}
                className="flex items-center justify-between gap-4 border border-slate-800 rounded-lg p-3"
              >
                <div className="min-w-0">
                  <p className="text-sm text-white break-all">
  {requesterProfiles[req.requester_user_id]?.full_name ||
    req.requester_user_id}
</p>
                  <p className="text-xs text-slate-400">
                    Requested: {new Date(req.requested_at).toLocaleString()}
                  </p>
                  {req.reviewed_at && (
                    <p className="text-xs text-slate-500">
                      Reviewed: {new Date(req.reviewed_at).toLocaleString()}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Badge
                    className={
                      req.status === "pending"
                        ? "bg-amber-500/20 text-amber-400"
                        : req.status === "approved"
                        ? "bg-green-500/20 text-green-400"
                        : req.status === "rejected"
                        ? "bg-red-500/20 text-red-400"
                        : "bg-slate-500/20 text-slate-400"
                    }
                  >
                    {req.status}
                  </Badge>

                  {req.status === "pending" && (
                    <>
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white"
                        onClick={() => void handleReviewAccessRequest(req, "approved")}
                        disabled={requestActionId === req.id}
                      >
                        Approve
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        className="border-red-800 text-red-400 hover:bg-red-900/20"
                        onClick={() => void handleReviewAccessRequest(req, "rejected")}
                        disabled={requestActionId === req.id}
                      >
                        Reject
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
