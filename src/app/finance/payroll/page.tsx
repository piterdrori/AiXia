import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
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

type SummaryState = {
  profileCount: number;
  openPeriodCount: number;
  runCount: number;
  pendingApprovalCount: number;
  pendingPaymentCount: number;
};

type PayrollModuleCard = {
  title: string;
  description: string;
  route: string;
  requiredPermission: Permission;
  count: number;
};

export default function FinancePayrollPage() {
  const navigate = useNavigate();

  const [role, setRole] = useState<Role | null>(null);
  const [permissionOverrides, setPermissionOverrides] = useState<
    Partial<Record<Permission, boolean>> | null
  >(null);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<SummaryState>({
    profileCount: 0,
    openPeriodCount: 0,
    runCount: 0,
    pendingApprovalCount: 0,
    pendingPaymentCount: 0,
  });

  useEffect(() => {
    void loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    try {
      await Promise.all([loadPermissions(), loadSummary()]);
    } finally {
      setLoading(false);
    }
  }

  async function loadPermissions() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.id) {
      setRole(null);
      setPermissionOverrides(null);
      return;
    }

    const { data } = await supabase
      .from("profiles")
      .select("role, permissions")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!data) {
      setRole(null);
      setPermissionOverrides(null);
      return;
    }

    const typed = data as ProfilePermissionRow;
    setRole(typed.role);
    setPermissionOverrides(typed.permissions ?? null);
  }

  async function loadSummary() {
    const [
      payProfilesResult,
      periodsResult,
      runsResult,
      pendingApprovalsResult,
      pendingPaymentsResult,
    ] = await Promise.all([
      supabase
        .from("finance_pay_profiles")
        .select("id", { count: "exact", head: true }),
      supabase
        .from("finance_payroll_periods")
        .select("id", { count: "exact", head: true })
        .eq("status", "open"),
      supabase
        .from("finance_payroll_runs")
        .select("id", { count: "exact", head: true }),
      supabase
        .from("finance_payroll_runs")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending_approval"),
      supabase
        .from("finance_paychecks")
        .select("id", { count: "exact", head: true })
        .in("payment_status", ["pending", "scheduled"]),
    ]);

    setSummary({
      profileCount: payProfilesResult.count ?? 0,
      openPeriodCount: periodsResult.count ?? 0,
      runCount: runsResult.count ?? 0,
      pendingApprovalCount: pendingApprovalsResult.count ?? 0,
      pendingPaymentCount: pendingPaymentsResult.count ?? 0,
    });
  }

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    channel = supabase
      .channel("finance-payroll-home")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_pay_profiles" },
        () => void loadSummary()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_payroll_periods" },
        () => void loadSummary()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_payroll_runs" },
        () => void loadSummary()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_paychecks" },
        () => void loadSummary()
      )
      .subscribe();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  const permissions = useMemo(() => {
    if (!role) return null;
    return getEffectivePermissions(role, permissionOverrides);
  }, [role, permissionOverrides]);

  const cards = useMemo<PayrollModuleCard[]>(() => {
    return [
      {
        title: "Pay Profiles",
        description: "Define how each employee or contractor gets paid.",
        route: "/finance/payroll/profiles",
        requiredPermission: "managePayProfiles",
        count: summary.profileCount,
      },
      {
        title: "Payroll Periods",
        description: "Manage payroll windows and pay dates.",
        route: "/finance/payroll/periods",
        requiredPermission: "createPayrollRuns",
        count: summary.openPeriodCount,
      },
      {
        title: "Payroll Runs",
        description: "Generate, approve, review, and process payroll runs.",
        route: "/finance/payroll/runs",
        requiredPermission: "viewPayroll",
        count: summary.runCount,
      },
    ];
  }, [summary]);

  const visibleCards = useMemo(() => {
    if (!permissions) return [];
    return cards.filter((card) => permissions[card.requiredPermission]);
  }, [cards, permissions]);

  return (
    <div className="h-full flex flex-col gap-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Finance — Payroll</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage pay profiles, payroll periods, payroll runs, paychecks, and payroll payments.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => navigate("/finance")}
            className="border-border bg-background/40 text-white hover:bg-background/60"
          >
            Finance Home
          </Button>
          {permissions?.viewPayroll ? (
            <Button onClick={() => navigate("/finance/payroll/runs")}>
              Open Payroll Runs
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="border border-border rounded-xl p-4 bg-background/40">
          <div className="text-xs text-muted-foreground">Pay Profiles</div>
          <div className="text-2xl font-semibold text-white mt-2">
            {summary.profileCount}
          </div>
        </div>
        <div className="border border-border rounded-xl p-4 bg-background/40">
          <div className="text-xs text-muted-foreground">Pending Approval</div>
          <div className="text-2xl font-semibold text-white mt-2">
            {summary.pendingApprovalCount}
          </div>
        </div>
        <div className="border border-border rounded-xl p-4 bg-background/40">
          <div className="text-xs text-muted-foreground">Pending Payments</div>
          <div className="text-2xl font-semibold text-white mt-2">
            {summary.pendingPaymentCount}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-4">
        {loading ? (
          <div className="border border-border rounded-xl p-4 bg-background/40 text-sm text-muted-foreground">
            Loading payroll workspace...
          </div>
        ) : visibleCards.length === 0 ? (
          <div className="border border-border rounded-xl p-4 bg-background/40 text-sm text-muted-foreground">
            You do not have payroll access.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {visibleCards.map((card) => (
              <button
                key={card.route}
                type="button"
                onClick={() => navigate(card.route)}
                className="text-left border border-border rounded-xl p-5 bg-background/40 hover:bg-background/60 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="text-white text-lg font-medium">{card.title}</div>
                  <div className="text-sm text-white">{card.count}</div>
                </div>
                <div className="text-sm text-muted-foreground mt-2">
                  {card.description}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
