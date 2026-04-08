import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import {
  getEffectivePermissions,
  type Permission,
  type Role,
} from "@/lib/permissions";

type ProfilePermissionRow = {
  role: Role;
  permissions?: Partial<Record<Permission, boolean>> | null;
};

type FinanceModule = {
  title: string;
  description: string;
  route: string;
  requiredPermission: Permission;
};

const FINANCE_MODULES: FinanceModule[] = [
  {
    title: "Clients",
    description: "Manage finance clients and billing entities.",
    route: "/finance/clients",
    requiredPermission: "viewClients",
  },
  {
    title: "Vendors",
    description: "Manage vendors and payable counterparties.",
    route: "/finance/vendors",
    requiredPermission: "viewVendors",
  },
  {
    title: "Bank Accounts",
    description: "Manage company bank accounts and balances.",
    route: "/finance/bank-accounts",
    requiredPermission: "viewBankAccounts",
  },
  {
    title: "Payment Methods",
    description: "Manage available payment methods.",
    route: "/finance/payment-methods",
    requiredPermission: "viewPaymentMethods",
  },
  {
    title: "Expense Categories",
    description: "Define and manage expense classifications.",
    route: "/finance/expense-categories",
    requiredPermission: "viewExpenseCategories",
  },
  {
    title: "Revenue Categories",
    description: "Define and manage revenue classifications.",
    route: "/finance/revenue-categories",
    requiredPermission: "viewRevenueCategories",
  },
  {
    title: "Invoices",
    description: "Manage issued invoices, line items, balances, and status.",
    route: "/finance/invoices",
    requiredPermission: "viewInvoices",
  },
  {
    title: "Bills",
    description: "Manage vendor bills, line items, balances, and status.",
    route: "/finance/bills",
    requiredPermission: "viewBills",
  },
  {
    title: "Payments Made",
    description: "Track outgoing vendor payments and payout history.",
    route: "/finance/payments-made",
    requiredPermission: "viewPaymentsMade",
  },
  {
    title: "Expenses",
    description: "Track internal company expenses, claims, and operational spend.",
    route: "/finance/expenses",
    requiredPermission: "viewExpenses",
  },
  {
    title: "Reimbursements",
    description: "Track employee reimbursements and payout status.",
    route: "/finance/reimbursements",
    requiredPermission: "viewReimbursements",
  },
    {
    title: "Approvals",
    description: "Review and act on finance approval requests.",
    route: "/finance/approvals",
    requiredPermission: "viewApprovalQueue",
  },
    {
    title: "Payroll",
    description: "Manage pay profiles, payroll periods, runs, paychecks, and payroll payments.",
    route: "/finance/payroll",
    requiredPermission: "viewPayroll",
  },
  {
    title: "Ledger",
    description: "Chart of accounts, accounting periods, journals, postings, and ledger drilldown.",
    route: "/finance/ledger",
    requiredPermission: "viewLedger",
  },
];

export default function FinancePage() {
  const navigate = useNavigate();

  const [role, setRole] = useState<Role | null>(null);
  const [permissionOverrides, setPermissionOverrides] = useState<
    Partial<Record<Permission, boolean>> | null
  >(null);
  const [isLoadingPermissions, setIsLoadingPermissions] = useState(true);

  useEffect(() => {
    void loadPermissions();
  }, []);

  async function loadPermissions() {
    setIsLoadingPermissions(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.id) {
      setRole(null);
      setPermissionOverrides(null);
      setIsLoadingPermissions(false);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, permissions")
      .eq("user_id", user.id)
      .maybeSingle();

    if (profile) {
      const typedProfile = profile as ProfilePermissionRow;
      setRole(typedProfile.role);
      setPermissionOverrides(typedProfile.permissions ?? null);
    } else {
      setRole(null);
      setPermissionOverrides(null);
    }

    setIsLoadingPermissions(false);
  }

  const permissions = useMemo(() => {
    if (!role) return null;
    return getEffectivePermissions(role, permissionOverrides);
  }, [role, permissionOverrides]);

  const visibleModules = useMemo(() => {
    if (!permissions) return [];
    return FINANCE_MODULES.filter(
      (module) => permissions[module.requiredPermission]
    );
  }, [permissions]);

  return (
    <div className="h-full flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Finance</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Choose a finance section to continue.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto pb-4">
        {isLoadingPermissions ? (
          <div className="border border-border rounded-xl p-4 bg-background/40 text-sm text-muted-foreground">
            Loading finance modules...
          </div>
        ) : visibleModules.length === 0 ? (
          <div className="border border-border rounded-xl p-4 bg-background/40 text-sm text-muted-foreground">
            You do not have access to any finance modules.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {visibleModules.map((module) => (
              <button
                key={module.route}
                type="button"
                onClick={() => navigate(module.route)}
                className="text-left"
              >
                <Card className="border-border bg-background/40 hover:bg-background/60 transition-colors">
                  <CardContent className="p-5">
                    <div className="text-white text-lg font-medium">
                      {module.title}
                    </div>
                    <div className="text-sm text-muted-foreground mt-2">
                      {module.description}
                    </div>
                  </CardContent>
                </Card>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
