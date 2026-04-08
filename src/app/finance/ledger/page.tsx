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

type LedgerModule = {
  title: string;
  description: string;
  route: string;
  requiredPermission: Permission;
};

const LEDGER_MODULES: LedgerModule[] = [
  {
    title: "Chart of Accounts",
    description: "View and manage account structure, account types, and hierarchy.",
    route: "/finance/ledger/accounts",
    requiredPermission: "viewChartOfAccounts",
  },
  {
    title: "Accounting Periods",
    description: "View accounting periods and posting window status.",
    route: "/finance/ledger/periods",
    requiredPermission: "viewAccountingPeriods",
  },
  {
    title: "Journal Entries",
    description: "Inspect journal entries, status, source linkage, and drilldown.",
    route: "/finance/ledger/journals",
    requiredPermission: "viewJournalEntries",
  },
];

export default function FinanceLedgerPage() {
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
    return LEDGER_MODULES.filter((module) => permissions[module.requiredPermission]);
  }, [permissions]);

  return (
    <div className="h-full flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">Ledger</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Official accounting truth, downstream from operational finance.
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate("/finance")}
          className="rounded-md border border-border bg-background/40 px-3 py-2 text-sm text-white hover:bg-background/60"
        >
          Finance Home
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pb-4">
        {isLoadingPermissions ? (
          <div className="border border-border rounded-xl p-4 bg-background/40 text-sm text-muted-foreground">
            Loading ledger modules...
          </div>
        ) : visibleModules.length === 0 ? (
          <div className="border border-border rounded-xl p-4 bg-background/40 text-sm text-muted-foreground">
            You do not have access to any ledger modules.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {visibleModules.map((module) => (
              <button
                key={module.route}
                type="button"
                onClick={() => navigate(module.route)}
                className="text-left"
              >
                <Card className="border-border bg-background/40 hover:bg-background/60 transition-colors h-full">
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
