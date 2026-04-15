import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Shield, AlertCircle } from "lucide-react";

import { supabase } from "@/lib/supabase";
import { createRequestTracker } from "@/lib/safeAsync";
import { useLanguage } from "@/lib/i18n";
import {
  getEffectivePermissions,
  type Permission,
  type Role,
} from "@/lib/permissions";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
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
    description: "Can generate reports",
  },

  accessFinance: {
    label: "Access Finance",
    description: "Access finance module",
  },
  manageFinanceMasterData: {
    label: "Manage Finance Master Data",
    description: "Manage finance settings",
  },
  viewFinance: {
    label: "View Finance",
    description: "View finance pages",
  },
  createFinanceRecords: {
    label: "Create Finance Records",
    description: "Create finance data",
  },
  editFinanceRecords: {
    label: "Edit Finance Records",
    description: "Edit finance data",
  },
  archiveFinanceRecords: {
    label: "Archive Finance Records",
    description: "Archive finance records",
  },
  approveFinanceRecords: {
    label: "Approve Finance Records",
    description: "Approve finance actions",
  },

  accessReceivables: {
    label: "Access Receivables",
    description: "Access receivables",
  },
  viewReceivables: {
    label: "View Receivables",
    description: "View receivables",
  },
  createInvoices: {
    label: "Create Invoices",
    description: "Create invoices",
  },
  editDraftInvoices: {
    label: "Edit Draft Invoices",
    description: "Edit draft invoices",
  },
  sendInvoices: {
    label: "Send Invoices",
    description: "Send invoices",
  },
  voidInvoices: {
    label: "Void Invoices",
    description: "Void invoices",
  },
  viewInvoices: {
    label: "View Invoices",
    description: "View invoices",
  },
  recordPaymentsReceived: {
    label: "Record Payments Received",
    description: "Record incoming payments",
  },
  viewReceivedPayments: {
    label: "View Received Payments",
    description: "View payments",
  },

  accessPayables: {
    label: "Access Payables",
    description: "Access payables",
  },
  viewPayables: {
    label: "View Payables",
    description: "View payables",
  },
  createBills: {
    label: "Create Bills",
    description: "Create bills",
  },
  editDraftBills: {
    label: "Edit Draft Bills",
    description: "Edit draft bills",
  },
  openBills: {
    label: "Open Bills",
    description: "Open bills",
  },
  voidBills: {
    label: "Void Bills",
    description: "Void bills",
  },
  viewBills: {
    label: "View Bills",
    description: "View bills",
  },
  recordPaymentsMade: {
    label: "Record Payments Made",
    description: "Record outgoing payments",
  },
  viewPaymentsMade: {
    label: "View Payments Made",
    description: "View payments made",
  },

  viewClients: {
    label: "View Clients",
    description: "View finance client records",
  },
  manageClients: {
    label: "Manage Clients",
    description: "Create and update finance client records",
  },
  viewVendors: {
    label: "View Vendors",
    description: "View vendor records",
  },
  manageVendors: {
    label: "Manage Vendors",
    description: "Create and update vendor records",
  },
  viewBankAccounts: {
    label: "View Bank Accounts",
    description: "View company bank accounts",
  },
  viewPaymentMethods: {
    label: "View Payment Methods",
    description: "View payment methods",
  },
  viewPaymentTerms: {
    label: "View Payment Terms",
    description: "View payment terms",
  },
  viewShippingTerms: {
    label: "View Shipping Terms",
    description: "View shipping terms",
  },
  viewUnitsOfMeasure: {
    label: "View Units Of Measure",
    description: "View units of measure",
  },
  viewTaxCodes: {
    label: "View Tax Codes",
    description: "View tax codes",
  },
  viewExpenseCategories: {
    label: "View Expense Categories",
    description: "View expense categories",
  },
  viewRevenueCategories: {
    label: "View Revenue Categories",
    description: "View revenue categories",
  },
  viewItems: {
    label: "View Items",
    description: "View items",
  },

  exportFinanceReports: {
    label: "Export Finance Reports",
    description: "Export finance reports",
  },
  exportReceivables: {
    label: "Export Receivables",
    description: "Export receivables data and reports",
  },
  exportPayables: {
    label: "Export Payables",
    description: "Export payables data and reports",
  },

  accessExpenses: {
    label: "Access Expenses",
    description: "Access expenses module",
  },
  viewExpenses: {
    label: "View Expenses",
    description: "View all expenses",
  },
  viewOwnExpenses: {
    label: "View Own Expenses",
    description: "View own expenses",
  },
  viewTeamExpenses: {
    label: "View Team Expenses",
    description: "View team expenses",
  },
  createExpenses: {
    label: "Create Expenses",
    description: "Create expenses",
  },
  editOwnDraftExpenses: {
    label: "Edit Own Draft Expenses",
    description: "Edit own drafts",
  },
  editAllDraftExpenses: {
    label: "Edit All Draft Expenses",
    description: "Edit all drafts",
  },
  submitExpenses: {
    label: "Submit Expenses",
    description: "Submit expenses for approval",
  },
  approveExpenses: {
    label: "Approve Expenses",
    description: "Approve expenses",
  },
  rejectExpenses: {
    label: "Reject Expenses",
    description: "Reject expenses",
  },
  cancelExpenses: {
    label: "Cancel Expenses",
    description: "Cancel expenses",
  },

  createReimbursements: {
    label: "Create Reimbursements",
    description: "Create reimbursements",
  },
  viewReimbursements: {
    label: "View Reimbursements",
    description: "View reimbursements",
  },
  issueReimbursements: {
    label: "Issue Reimbursements",
    description: "Issue reimbursements",
  },
  recordReimbursementPayments: {
    label: "Record Reimbursement Payments",
    description: "Mark reimbursements as paid",
  },

  accessApprovals: {
    label: "Access Approvals",
    description: "Access approvals module",
  },
  viewApprovalQueue: {
    label: "View Approval Queue",
    description: "View approval queue",
  },
  actOnFinanceApprovals: {
    label: "Act On Approvals",
    description: "Approve/reject requests",
  },

  addFinanceComments: {
    label: "Add Comments",
    description: "Add finance comments",
  },
  viewFinanceComments: {
    label: "View Comments",
    description: "View finance comments",
  },
  addFinanceAttachments: {
    label: "Add Attachments",
    description: "Upload attachments",
  },
  removeFinanceAttachments: {
    label: "Remove Attachments",
    description: "Delete attachments",
  },

  accessPayroll: {
    label: "Access Payroll",
    description: "Access payroll module",
  },
  viewPayroll: {
    label: "View Payroll",
    description: "View payroll pages and payroll runs",
  },
  viewOwnPaychecks: {
    label: "View Own Paychecks",
    description: "View own paycheck records",
  },
  viewAllPaychecks: {
    label: "View All Paychecks",
    description: "View all employee paycheck records",
  },
  createPayrollRuns: {
    label: "Create Payroll Runs",
    description: "Create payroll periods and generate payroll runs",
  },
  editPayrollRuns: {
    label: "Edit Payroll Runs",
    description: "Edit payroll runs before approval",
  },
  approvePayroll: {
    label: "Approve Payroll",
    description: "Approve payroll runs",
  },
  processPayrollPayments: {
    label: "Process Payroll Payments",
    description: "Record and process payroll payments",
  },
  managePayProfiles: {
    label: "Manage Pay Profiles",
    description: "Create and update employee pay profiles",
  },

  accessLedger: {
    label: "Access Ledger",
    description: "Access ledger and accounting module",
  },
  viewLedger: {
    label: "View Ledger",
    description: "View ledger home and accounting overview",
  },
  viewChartOfAccounts: {
    label: "View Chart Of Accounts",
    description: "View chart of accounts",
  },
  viewAccountingPeriods: {
    label: "View Accounting Periods",
    description: "View accounting periods",
  },
  viewJournalEntries: {
    label: "View Journal Entries",
    description: "View journal entries",
  },
  manageChartOfAccounts: {
    label: "Manage Chart Of Accounts",
    description: "Create and update chart of accounts",
  },
  manageAccountingPeriods: {
    label: "Manage Accounting Periods",
    description: "Create and update accounting periods",
  },
  managePostingRules: {
    label: "Manage Posting Rules",
    description: "Create and update posting rules",
  },
  createManualJournalEntries: {
    label: "Create Manual Journal Entries",
    description: "Create manual adjustment journal entries",
  },
  postJournalEntries: {
    label: "Post Journal Entries",
    description: "Post source-backed and manual journal entries",
  },
  reverseJournalEntries: {
    label: "Reverse Journal Entries",
    description: "Reverse posted journal entries",
  },
  voidJournalEntries: {
    label: "Void Journal Entries",
    description: "Void eligible draft journal entries",
  },
  viewJournalDrilldown: {
    label: "View Journal Drilldown",
    description: "Open journal and account drilldown pages",
  },
  exportLedgerReports: {
    label: "Export Ledger Reports",
    description: "Export ledger reports",
  },
  exportTrialBalance: {
    label: "Export Trial Balance",
    description: "Export trial balance",
  },
  exportAccountingReports: {
    label: "Export Accounting Reports",
    description: "Export accounting reports",
  },

  exportExpenseReports: {
    label: "Export Expense Reports",
    description: "Export expense reports",
  },
  exportReimbursementReports: {
    label: "Export Reimbursement Reports",
    description: "Export reimbursement reports",
  },
};

export default function EmployeePermissionsPage() {
  const { t } = useLanguage();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const requestTracker = useRef(createRequestTracker());

  const [permissions, setPermissions] = useState<
    Partial<Record<Permission, boolean>>
  >({});
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

        const effectiveCurrentUserPermissions = getEffectivePermissions(
          myRole,
          null,
        );

        if (!effectiveCurrentUserPermissions.manageUsers) {
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
          (typedUser.permissions || {}) as Partial<Record<Permission, boolean>>,
        );
      } catch (error) {
        if (!requestTracker.current.isLatest(requestId)) return;
        console.error("Permissions page load error:", error);
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
    [id, navigate, t],
  );

  useEffect(() => {
    void loadData("initial");
  }, [loadData]);

  const handleToggle = async (permission: Permission) => {
    if (!user) return;

    const roleDefaultPermissions = getEffectivePermissions(user.role, null);
    const currentEffectivePermissions = getEffectivePermissions(
      user.role,
      permissions || null,
    );

    const nextValue = !currentEffectivePermissions[permission];

    const nextPermissions: Partial<Record<Permission, boolean>> = {
      ...(permissions || {}),
    };

    if (nextValue === roleDefaultPermissions[permission]) {
      delete nextPermissions[permission];
    } else {
      nextPermissions[permission] = nextValue;
    }

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
    } catch (error) {
      console.error("Permission toggle error:", error);
      setSaveError(
        error instanceof Error ? error.message : "Failed to update permission",
      );

      await loadData("refresh");
    }
  };

  const roleDefaultPermissions = useMemo(() => {
    if (!user) return null;
    return getEffectivePermissions(user.role, null);
  }, [user]);

  const effectivePermissionEntries = useMemo(() => {
    if (!user || !roleDefaultPermissions) return [];

    const effectivePermissions = getEffectivePermissions(
      user.role,
      permissions || null,
    );

    return (Object.keys(permissionLabels) as Permission[]).map((permission) => ({
      permission,
      label: permissionLabels[permission].label,
      description: permissionLabels[permission].description,
      enabled: !!effectivePermissions[permission],
      overridden: permissions[permission] !== undefined,
      defaultEnabled: !!roleDefaultPermissions[permission],
      overrideValue:
        permissions[permission] === undefined ? null : !!permissions[permission],
    }));
  }, [permissions, roleDefaultPermissions, user]);

  if (!user && !isBootstrapping) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <Card className="border-red-800/30 bg-red-900/10">
          <CardContent className="flex items-start gap-3 p-6">
            <AlertCircle className="mt-0.5 h-5 w-5 text-red-400" />
            <div className="text-red-300">
              {saveError || t("employeePermissions.errors.loadPage")}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!currentUserRole && !isBootstrapping) {
    return null;
  }

  const currentUserEffectivePermissions = currentUserRole
    ? getEffectivePermissions(currentUserRole, null)
    : null;

  if (!currentUserEffectivePermissions?.manageUsers && !isBootstrapping) {
    return null;
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="mx-auto flex min-h-0 w-full max-w-2xl flex-1 flex-col space-y-6 overflow-y-auto pb-6 pr-1">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(`/employees/${id}`)}
            className="text-slate-400 hover:text-white"
          >
            <ArrowLeft className="h-5 w-5" />
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

        {saveError && user ? (
          <Alert className="border-red-800 bg-red-900/20 text-red-400">
            <AlertDescription>{saveError}</AlertDescription>
          </Alert>
        ) : null}

        <Card className="border-slate-800 bg-slate-900/50">
          <CardHeader className="pb-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-indigo-400" />
                <div>
                  <CardTitle className="text-white">
                    {t("employeePermissions.sections.permissionOverrides")}
                  </CardTitle>
                  <p className="mt-1 text-sm text-slate-400">
                    {t(
                      "employeePermissions.sections.permissionOverridesDescription",
                    )}
                  </p>
                </div>
              </div>

              <Badge className="h-6 px-2 text-xs">
                {user?.role.toUpperCase()}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {effectivePermissionEntries.map(
                ({
                  permission,
                  label,
                  description,
                  enabled,
                  overridden,
                  defaultEnabled,
                  overrideValue,
                }) => (
                  <div
                    key={permission}
                    className="rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <Label
                          htmlFor={permission}
                          className="block cursor-pointer truncate font-medium text-white"
                        >
                          {label}
                        </Label>
                        <p className="mt-1 line-clamp-2 text-xs text-slate-500">
                          {description}
                        </p>
                        <p className="mt-2 text-[11px] text-slate-500">
                          {overridden
                            ? `Override applied (${overrideValue ? "On" : "Off"})`
                            : `Role default (${defaultEnabled ? "On" : "Off"})`}
                        </p>
                      </div>

                      <div className="shrink-0 pt-0.5">
                        <Switch
                          id={permission}
                          checked={enabled}
                          onCheckedChange={() => void handleToggle(permission)}
                        />
                      </div>
                    </div>
                  </div>
                ),
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
    </div>
  );
}
