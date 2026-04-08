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
  generateProjectReports: {
    label: "Generate Project Reports",
    description: "Can generate and download project reports",
  },

  accessFinance: {
    label: "Access Finance",
    description: "Can access the finance module",
  },
  manageFinanceMasterData: {
    label: "Manage Finance Master Data",
    description: "Can manage finance settings and master records",
  },
  viewFinance: {
    label: "View Finance",
    description: "Can open and view finance pages",
  },
  createFinanceRecords: {
    label: "Create Finance Records",
    description: "Can create finance records",
  },
  editFinanceRecords: {
    label: "Edit Finance Records",
    description: "Can edit finance records",
  },
  archiveFinanceRecords: {
    label: "Archive Finance Records",
    description: "Can archive finance records",
  },
  approveFinanceRecords: {
    label: "Approve Finance Records",
    description: "Can approve finance actions",
  },

  accessReceivables: {
    label: "Access Receivables",
    description: "Can access the receivables area inside finance",
  },
  viewReceivables: {
    label: "View Receivables",
    description: "Can view receivables pages and receivable data",
  },
  createInvoices: {
    label: "Create Invoices",
    description: "Can create new invoices",
  },
  editDraftInvoices: {
    label: "Edit Draft Invoices",
    description: "Can edit draft invoices before sending",
  },
  sendInvoices: {
    label: "Send Invoices",
    description: "Can move invoices from draft to sent",
  },
  voidInvoices: {
    label: "Void Invoices",
    description: "Can void issued invoices",
  },
  viewInvoices: {
    label: "View Invoices",
    description: "Can open invoice list and invoice detail pages",
  },
  recordPaymentsReceived: {
    label: "Record Payments Received",
    description: "Can record incoming payments against invoices",
  },
  viewReceivedPayments: {
    label: "View Received Payments",
    description: "Can view incoming payment history",
  },

  accessPayables: {
    label: "Access Payables",
    description: "Can access the payables area inside finance",
  },
  viewPayables: {
    label: "View Payables",
    description: "Can view payables pages and payable data",
  },
  createBills: {
    label: "Create Bills",
    description: "Can create new vendor bills",
  },
  editDraftBills: {
    label: "Edit Draft Bills",
    description: "Can edit draft bills before opening",
  },
  openBills: {
    label: "Open Bills",
    description: "Can move bills from draft to open",
  },
  voidBills: {
    label: "Void Bills",
    description: "Can void vendor bills",
  },
  viewBills: {
    label: "View Bills",
    description: "Can open bills list and bill detail pages",
  },
  recordPaymentsMade: {
    label: "Record Payments Made",
    description: "Can record outgoing payments to vendors",
  },
  viewPaymentsMade: {
    label: "View Payments Made",
    description: "Can view outgoing payment history",
  },

  viewClients: {
    label: "View Clients",
    description: "Can view finance client records",
  },
  manageClients: {
    label: "Manage Clients",
    description: "Can create and update finance client records",
  },
  viewVendors: {
    label: "View Vendors",
    description: "Can view vendor records",
  },
  manageVendors: {
    label: "Manage Vendors",
    description: "Can create and update vendor records",
  },
  viewBankAccounts: {
    label: "View Bank Accounts",
    description: "Can view company bank accounts",
  },
  viewPaymentMethods: {
    label: "View Payment Methods",
    description: "Can view payment methods",
  },
  viewExpenseCategories: {
    label: "View Expense Categories",
    description: "Can view expense categories",
  },
  viewRevenueCategories: {
    label: "View Revenue Categories",
    description: "Can view revenue categories",
  },
  exportFinanceReports: {
    label: "Export Finance Reports",
    description: "Can export finance reports",
  },
  exportReceivables: {
    label: "Export Receivables",
    description: "Can export receivables data and reports",
  },
  exportPayables: {
    label: "Export Payables",
    description: "Can export payables data and reports",
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
  <CardHeader className="pb-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <Shield className="w-5 h-5 text-indigo-400" />
        <div>
          <CardTitle className="text-white">
            {t("employeePermissions.sections.permissionOverrides")}
          </CardTitle>
          <p className="text-slate-400 text-sm mt-1">
            {t("employeePermissions.sections.permissionOverridesDescription")}
          </p>
        </div>
      </div>

      <Badge className="h-6 px-2 text-xs">
        {user?.role.toUpperCase()}
      </Badge>
    </div>
  </CardHeader>

  <CardContent className="space-y-4">
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {effectivePermissionEntries.map(
        ({ permission, label, enabled, overridden }) => (
          <div
            key={permission}
            className="rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <Label
                  htmlFor={permission}
                  className="text-white font-medium cursor-pointer block truncate"
                >
                  {label}
                </Label>
                <p className="mt-1 text-xs text-slate-500 line-clamp-2">
                  {permissionLabels[permission].description}
                </p>
                <p className="mt-2 text-[11px] text-slate-500">
                  {overridden ? "Override applied" : "Role default"}
                </p>
              </div>

              <div className="shrink-0 pt-0.5">
                <Switch
                  id={permission}
                  checked={enabled}
                  onCheckedChange={() => handleToggle(permission)}
                />
              </div>
            </div>
          </div>
        )
      )}
    </div>

    <Separator className="bg-slate-800" />

    <div className="flex justify-start pt-2">
      <Button
        variant="outline"
        onClick={() => navigate(`/employees/${id}`)}
        className="border-slate-700 text-slate-300 hover:bg-slate-800"
      >
        {t("employeePermissions.actions.cancel")}
      </Button>
    </div>
  </CardContent>
</Card>
    </div>
  );
}
