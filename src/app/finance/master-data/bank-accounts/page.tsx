import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  Archive,
  CheckCircle2,
  CreditCard,
  Landmark,
  Loader2,
  LockKeyhole,
  Plus,
  RotateCcw,
  ShieldCheck,
  Trash2,
  WalletCards,
} from "lucide-react";

import {
  AixiaAccessRule,
  AixiaAlert,
  AixiaButton,
  AixiaCurrencyBadge,
  AixiaDefaultBadge,
  AixiaEmptyState,
  AixiaHero,
  AixiaMetricCard,
  AixiaMetricGrid,
  AixiaModal,
  AixiaPage,
  AixiaSearchField,
  AixiaSection,
  AixiaSortableHeader,
  AixiaStatusBadge,
  AixiaStatusCard,
  AixiaTableActionsCell,
  AixiaTableBadgeCell,
  AixiaTableDateCell,
  AixiaTableShell,
  AixiaTableTextCell,
} from "@/components/aixia";

import {
  archiveBankAccount,
  getArchivedBankAccounts,
  getBankAccounts,
  permanentlyDeleteBankAccount,
  restoreBankAccount,
  type FinanceBankAccountListRow,
} from "@/lib/finance/bankAccounts";

import {
  getEffectivePermissions,
  type Permission,
  type Role,
} from "@/lib/permissions";

import { supabase } from "@/lib/supabase";

type ProfilePermissionRow = {
  user_id: string;
  full_name: string | null;
  role: Role | null;
  permissions: Partial<Record<Permission, boolean>> | null;
};

type PageAction =
  | "load"
  | "archive"
  | "archive-modal"
  | "restore"
  | "hard-delete"
  | null;

type SortKey =
  | "company"
  | "bank"
  | "identifier"
  | "currency"
  | "status"
  | "default"
  | "updated";

type SortDirection = "asc" | "desc";

type MetricCard = {
  key: string;
  title: string;
  value: string;
  subtitle: string;
  icon: LucideIcon;
  tone: "cyan" | "emerald" | "amber" | "violet" | "rose";
};

type PermissionState = {
  canRead: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canDeleteArchive: boolean;
  isAdmin: boolean;
};

type CompanyCurrencyReference = {
  id: string;
  code: string | null;
  company_code: string | null;
  currency_code: string | null;
};

const EMPTY_PERMISSION_STATE: PermissionState = {
  canRead: false,
  canCreate: false,
  canUpdate: false,
  canDeleteArchive: false,
  isAdmin: false,
};

function formatCount(value: number) {
  return value.toLocaleString();
}

function formatDateLabel(value: string | null | undefined) {
  if (!value) return "—";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return parsed.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getCompanyName(row: FinanceBankAccountListRow) {
  return row.company_legal_name || row.company_name || row.company_code || "Unassigned";
}

function getBankName(row: FinanceBankAccountListRow) {
  return row.bank_name || row.beneficiary_name || "Bank Account";
}

function getIdentifierLabel(row: FinanceBankAccountListRow) {
  if (row.bank_id) return row.bank_id;
  return "—";
}

function getLocationLabel(row: FinanceBankAccountListRow) {
  const parts = [row.city, row.country].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : "—";
}

function getCorrelatedCurrencyLabel(
  row: FinanceBankAccountListRow,
  companyCurrencyByCode: Map<string, string>
) {
  const companyCode = row.company_code || "";
  const companyCurrency = companyCurrencyByCode.get(companyCode);

  return companyCurrency || row.currency_code || "—";
}

function hasPermission(
  permissions: Record<Permission, boolean> | null,
  permission: Permission
) {
  return Boolean(permissions?.[permission]);
}

function buildPermissionState(
  profile: ProfilePermissionRow | null,
  permissions: Record<Permission, boolean> | null
): PermissionState {
  if (!profile?.role || !permissions) {
    return EMPTY_PERMISSION_STATE;
  }

  const isAdmin = String(profile.role || "").toLowerCase() === "admin";
  const canManageMasterData = hasPermission(permissions, "manageFinanceMasterData");

  return {
    isAdmin,
    canRead:
      canManageMasterData ||
      hasPermission(permissions, "viewBankAccounts"),
    canCreate:
      canManageMasterData ||
      hasPermission(permissions, "createFinanceRecords"),
    canUpdate:
      canManageMasterData ||
      hasPermission(permissions, "editFinanceRecords"),
    canDeleteArchive:
      canManageMasterData ||
      hasPermission(permissions, "archiveFinanceRecords"),
  };
}

async function loadBackendEffectivePermissions(
  userId: string
): Promise<Partial<Record<Permission, boolean>> | null> {
  try {
    const result = await supabase.rpc("finance_get_effective_permissions", {
      target_user_id: userId,
    });

    if (result.error) {
      console.warn("Bank Accounts permission RPC fallback:", result.error.message);
      return null;
    }

    if (!result.data || typeof result.data !== "object") {
      return null;
    }

    return result.data as Partial<Record<Permission, boolean>>;
  } catch (error) {
    console.warn("Bank Accounts permission RPC failed:", error);
    return null;
  }
}

function compareStrings(first: string | null | undefined, second: string | null | undefined) {
  return (first || "").localeCompare(second || "");
}

function compareDates(first: string | null | undefined, second: string | null | undefined) {
  return new Date(first || 0).getTime() - new Date(second || 0).getTime();
}

function getMetricTone(tone: MetricCard["tone"]) {
  if (tone === "cyan") return "indigo";
  if (tone === "amber") return "gold";

  return tone;
}

export default function FinanceMasterDataBankAccountsPage() {
  const navigate = useNavigate();

  const [profile, setProfile] = useState<ProfilePermissionRow | null>(null);
  const [effectivePermissions, setEffectivePermissions] =
    useState<Record<Permission, boolean> | null>(null);
  const [rows, setRows] = useState<FinanceBankAccountListRow[]>([]);
  const [archivedRows, setArchivedRows] = useState<FinanceBankAccountListRow[]>([]);
  const [companyCurrencyReferences, setCompanyCurrencyReferences] = useState<
    CompanyCurrencyReference[]
  >([]);
  const [search, setSearch] = useState("");
  const [archiveSearch, setArchiveSearch] = useState("");
  const [showArchive, setShowArchive] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isLoadingRows, setIsLoadingRows] = useState(true);
  const [isLoadingArchive, setIsLoadingArchive] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [pageMessage, setPageMessage] = useState<string | null>(null);
  const [runningAction, setRunningAction] = useState<PageAction>(null);
  const [activeActionId, setActiveActionId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("updated");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const loadCurrentProfile = useCallback(async (mode: "initial" | "silent" = "initial") => {
    if (mode === "initial") {
      setIsLoadingProfile(true);
    }

    try {
      const authResult = await supabase.auth.getUser();
      if (authResult.error) throw authResult.error;

      const authUserId = authResult.data.user?.id;

      if (!authUserId) {
        if (mode === "initial") {
          setProfile(null);
          setEffectivePermissions(null);
        }
        return;
      }

      const profileResult = await supabase
        .from("profiles")
        .select("user_id, full_name, role, permissions")
        .eq("user_id", authUserId)
        .maybeSingle();

      if (profileResult.error) throw profileResult.error;

      const loadedProfile = (profileResult.data || null) as ProfilePermissionRow | null;
      const backendPermissions = await loadBackendEffectivePermissions(authUserId);

      setProfile(loadedProfile);

      if (!loadedProfile?.role) {
        setEffectivePermissions(null);
        return;
      }

      const resolvedPermissions = getEffectivePermissions(
        loadedProfile.role,
        backendPermissions || loadedProfile.permissions || null
      );

      setEffectivePermissions(resolvedPermissions);
    } catch (error) {
      console.error("Failed to load bank account profile permissions:", error);

      if (mode === "initial") {
        setProfile(null);
        setEffectivePermissions(null);
      }
    } finally {
      if (mode === "initial") {
        setIsLoadingProfile(false);
      }
    }
  }, []);

  const permissionState = useMemo(() => {
    return buildPermissionState(profile, effectivePermissions);
  }, [effectivePermissions, profile]);

  const loadRows = useCallback(async (mode: "initial" | "silent" = "initial") => {
    if (mode === "initial") {
      setIsLoadingRows(true);
      setPageError(null);
    }

    try {
      const data = await getBankAccounts();
      setRows(data);

      if (mode === "initial") {
        setPageError(null);
      }
    } catch (error) {
      console.error("Failed to load bank accounts:", error);

      if (mode === "initial") {
        setRows([]);
        setPageError(
          error instanceof Error ? error.message : "Failed to load bank accounts."
        );
      }
    } finally {
      if (mode === "initial") {
        setIsLoadingRows(false);
      }
    }
  }, []);

  const loadCompanyCurrencyReferences = useCallback(
    async (mode: "initial" | "silent" = "initial") => {
      try {
        const { data, error } = await supabase
          .from("finance_companies")
          .select("id, code, company_code, currency_code");

        if (error) throw error;

        setCompanyCurrencyReferences((data ?? []) as CompanyCurrencyReference[]);
      } catch (error) {
        console.error("Failed to load company currency references:", error);

        if (mode === "initial") {
          setCompanyCurrencyReferences([]);
        }
      }
    },
    []
  );

  const loadArchivedRows = useCallback(async (mode: "initial" | "silent" = "initial") => {
    if (mode === "initial") {
      setIsLoadingArchive(true);
      setPageError(null);
    }

    try {
      const data = await getArchivedBankAccounts();
      setArchivedRows(data);

      if (mode === "initial") {
        setPageError(null);
      }
    } catch (error) {
      console.error("Failed to load archived bank accounts:", error);

      if (mode === "initial") {
        setArchivedRows([]);
        setPageError(
          error instanceof Error ? error.message : "Failed to load archived bank accounts."
        );
      }
    } finally {
      if (mode === "initial") {
        setIsLoadingArchive(false);
      }
    }
  }, []);

  useEffect(() => {
    void Promise.all([
      loadCurrentProfile("initial"),
      loadRows("initial"),
      loadCompanyCurrencyReferences("initial"),
    ]);
  }, [loadCompanyCurrencyReferences, loadCurrentProfile, loadRows]);

  useEffect(() => {
    const channel = supabase
      .channel("finance-master-data-bank-accounts-page")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        () => void loadCurrentProfile("silent")
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_permission_templates" },
        () => void loadCurrentProfile("silent")
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_user_permission_templates" },
        () => void loadCurrentProfile("silent")
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_bank_accounts" },
        () => {
          void loadRows("silent");
          if (showArchive) void loadArchivedRows("silent");
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_companies" },
        () => {
          void loadCompanyCurrencyReferences("silent");
          void loadRows("silent");
          if (showArchive) void loadArchivedRows("silent");
        }
      )
      .subscribe();

    const intervalId = window.setInterval(() => {
      void Promise.all([
        loadCurrentProfile("silent"),
        loadRows("silent"),
        loadCompanyCurrencyReferences("silent"),
        showArchive ? loadArchivedRows("silent") : Promise.resolve(),
      ]);
    }, 60000);

    return () => {
      window.clearInterval(intervalId);
      supabase.removeChannel(channel);
    };
  }, [loadArchivedRows, loadCompanyCurrencyReferences, loadCurrentProfile, loadRows, showArchive]);

  const visibleRows = useMemo(() => {
    return rows.filter((row) => row.status !== "archived");
  }, [rows]);

  const counts = useMemo(() => {
    return {
      totalVisible: visibleRows.length,
      active: rows.filter((row) => row.status === "active").length,
      inactive: rows.filter((row) => row.status === "inactive").length,
      archived: rows.filter((row) => row.status === "archived").length,
      defaultAccounts: visibleRows.filter((row) => row.is_default).length,
    };
  }, [rows, visibleRows]);

  const companyCurrencyByCode = useMemo(() => {
    const map = new Map<string, string>();

    companyCurrencyReferences.forEach((company) => {
      if (!company.currency_code) return;

      if (company.code) {
        map.set(company.code, company.currency_code);
      }

      if (company.company_code) {
        map.set(company.company_code, company.currency_code);
      }
    });

    return map;
  }, [companyCurrencyReferences]);

  const filteredRows = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return visibleRows
      .filter((row) => {
        if (!normalizedSearch) return true;

        return [
          row.bank_id,
          row.company_code,
          row.company_name,
          row.company_legal_name,
          row.beneficiary_name,
          row.bank_name,
          row.city,
          row.country,
          getCorrelatedCurrencyLabel(row, companyCurrencyByCode),
          row.status,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(normalizedSearch));
      })
      .sort((first, second) => {
        let comparison = 0;

        if (sortKey === "company") {
          comparison = compareStrings(getCompanyName(first), getCompanyName(second));
        }

        if (sortKey === "bank") {
          comparison = compareStrings(getBankName(first), getBankName(second));
        }

        if (sortKey === "identifier") {
          comparison = compareStrings(getIdentifierLabel(first), getIdentifierLabel(second));
        }

        if (sortKey === "currency") {
          comparison = compareStrings(
            getCorrelatedCurrencyLabel(first, companyCurrencyByCode),
            getCorrelatedCurrencyLabel(second, companyCurrencyByCode)
          );
        }

        if (sortKey === "status") {
          comparison = compareStrings(first.status, second.status);
        }

        if (sortKey === "default") {
          comparison = Number(first.is_default) - Number(second.is_default);
        }

        if (sortKey === "updated") {
          comparison = compareDates(
            first.updated_at || first.created_at,
            second.updated_at || second.created_at
          );
        }

        return sortDirection === "asc" ? comparison : -comparison;
      });
  }, [companyCurrencyByCode, search, sortDirection, sortKey, visibleRows]);

  const filteredArchivedRows = useMemo(() => {
    const normalizedSearch = archiveSearch.trim().toLowerCase();

    return archivedRows
      .filter((row) => {
        if (!normalizedSearch) return true;

        return [
          row.bank_id,
          row.company_code,
          row.company_name,
          row.company_legal_name,
          row.beneficiary_name,
          row.bank_name,
          row.city,
          row.country,
          getCorrelatedCurrencyLabel(row, companyCurrencyByCode),
          row.status,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(normalizedSearch));
      })
      .sort((first, second) =>
        -compareDates(
          first.updated_at || first.created_at,
          second.updated_at || second.created_at
        )
      );
  }, [archiveSearch, archivedRows, companyCurrencyByCode]);

  const metricCards = useMemo<MetricCard[]>(() => {
    return [
      {
        key: "visible",
        title: "Visible Accounts",
        value: isLoadingRows ? "—" : formatCount(counts.totalVisible),
        subtitle: "Active and inactive company bank accounts.",
        icon: WalletCards,
        tone: "cyan",
      },
      {
        key: "active",
        title: "Active",
        value: isLoadingRows ? "—" : formatCount(counts.active),
        subtitle: "Available for finance document/payment flows.",
        icon: CheckCircle2,
        tone: "emerald",
      },
      {
        key: "default",
        title: "Default Accounts",
        value: isLoadingRows ? "—" : formatCount(counts.defaultAccounts),
        subtitle: "Default accounts across company records.",
        icon: Landmark,
        tone: "violet",
      },
      {
        key: "archived",
        title: "Archived",
        value: isLoadingRows ? "—" : formatCount(counts.archived),
        subtitle: "Hidden from active operational use.",
        icon: Archive,
        tone: "rose",
      },
    ];
  }, [counts, isLoadingRows]);

  const toggleSort = useCallback((nextKey: SortKey) => {
    setSortKey((currentKey) => {
      if (currentKey !== nextKey) {
        setSortDirection("asc");
        return nextKey;
      }

      setSortDirection((currentDirection) =>
        currentDirection === "asc" ? "desc" : "asc"
      );
      return currentKey;
    });
  }, []);

  const openArchiveModal = useCallback(async () => {
    if (!permissionState.canDeleteArchive) return;

    setShowArchive(true);
    setRunningAction("archive-modal");
    await loadArchivedRows("initial");
    setRunningAction(null);
  }, [loadArchivedRows, permissionState.canDeleteArchive]);

  const closeArchiveModal = useCallback(() => {
    setShowArchive(false);
    setArchiveSearch("");
  }, []);

  const handleArchive = useCallback(
    async (id: string) => {
      if (!permissionState.canDeleteArchive || runningAction) return;

      setRunningAction("archive");
      setActiveActionId(id);
      setPageError(null);
      setPageMessage(null);

      try {
        await archiveBankAccount(id);
        await Promise.all([
          loadRows("silent"),
          showArchive ? loadArchivedRows("silent") : Promise.resolve(),
        ]);
        setPageMessage("Bank account archived.");
      } catch (error) {
        console.error("Failed to archive bank account:", error);
        setPageError(
          error instanceof Error ? error.message : "Failed to archive bank account."
        );
      } finally {
        setRunningAction(null);
        setActiveActionId(null);
      }
    },
    [
      loadArchivedRows,
      loadRows,
      permissionState.canDeleteArchive,
      runningAction,
      showArchive,
    ]
  );

  const handleRestore = useCallback(
    async (id: string) => {
      if (!permissionState.canDeleteArchive || runningAction) return;

      setRunningAction("restore");
      setActiveActionId(id);
      setPageError(null);
      setPageMessage(null);

      try {
        await restoreBankAccount(id);
        await Promise.all([loadRows("silent"), loadArchivedRows("silent")]);
        setPageMessage("Bank account restored.");
      } catch (error) {
        console.error("Failed to restore bank account:", error);
        setPageError(
          error instanceof Error ? error.message : "Failed to restore bank account."
        );
      } finally {
        setRunningAction(null);
        setActiveActionId(null);
      }
    },
    [loadArchivedRows, loadRows, permissionState.canDeleteArchive, runningAction]
  );

  const handlePermanentDelete = useCallback(
    async (id: string) => {
      if (!permissionState.canDeleteArchive || runningAction) return;

      const confirmed = window.confirm(
        "Permanently delete this archived bank account? This cannot be undone."
      );

      if (!confirmed) return;

      setRunningAction("hard-delete");
      setActiveActionId(id);
      setPageError(null);
      setPageMessage(null);

      try {
        await permanentlyDeleteBankAccount(id);
        await Promise.all([loadRows("silent"), loadArchivedRows("silent")]);
        setPageMessage("Archived bank account permanently deleted.");
      } catch (error) {
        console.error("Failed to permanently delete bank account:", error);
        setPageError(
          error instanceof Error
            ? error.message
            : "Failed to permanently delete bank account."
        );
      } finally {
        setRunningAction(null);
        setActiveActionId(null);
      }
    },
    [loadArchivedRows, loadRows, permissionState.canDeleteArchive, runningAction]
  );

  const isPageLoading = isLoadingProfile || isLoadingRows;
  const isActionRunning = Boolean(runningAction);

  return (
    <AixiaPage>
      <AixiaHero
        parentLabel="Master Data"
        parentPath="/finance/master-data"
        badges={[
          { label: "Company Banking Master Data", tone: "indigo" },
          { label: "Permission filtered", tone: "emerald" },
          { label: "Realtime + 60s fallback", tone: "gold" },
        ]}
        gradientTitle="Company Bank"
        title="Accounts"
        subtitle="Treasury Reference Registry"
        description="Permission-filtered registry for company-linked bank accounts used by treasury, payment instructions, and finance document snapshots."
      
        rightContent={
          <>
            <AixiaStatusCard
              label="Read Access"
              value={
                isLoadingProfile ? "Checking" : permissionState.canRead ? "Enabled" : "Locked"
              }
              description="This page requires Bank Account read access or Master Data admin access."
              icon={permissionState.canRead ? ShieldCheck : LockKeyhole}
              tone={permissionState.canRead ? "emerald" : "rose"}
            />

            <AixiaStatusCard
              label="Lifecycle Access"
              value={
                permissionState.canDeleteArchive
                  ? "Archive Enabled"
                  : permissionState.canCreate
                    ? "Create Enabled"
                    : "Read Only"
              }
              description="Create and Delete/Archive actions follow the selected Finance template."
              icon={permissionState.canDeleteArchive ? Archive : CreditCard}
              tone={permissionState.canDeleteArchive ? "gold" : "indigo"}
            />
          </>
        }
      />

      {pageError ? <AixiaAlert tone="error">{pageError}</AixiaAlert> : null}

      {pageMessage ? <AixiaAlert tone="success">{pageMessage}</AixiaAlert> : null}

      <AixiaMetricGrid>
        {metricCards.map((metric) => (
          <AixiaMetricCard
            key={metric.key}
            label={metric.title}
            value={metric.value}
            description={metric.subtitle}
            icon={metric.icon}
            tone={getMetricTone(metric.tone)}
          />
        ))}
      </AixiaMetricGrid>

      {!permissionState.canRead && !isPageLoading ? (
        <AixiaSection
          title="Bank Account Access Locked"
          description="The logged-in user does not have Bank Account read access."
          icon={LockKeyhole}
        >
          <AixiaEmptyState
            icon={LockKeyhole}
            title="No bank account access is enabled"
            description="Ask an Admin to assign a Finance role template or user-specific exception with Bank Account read access."
          />
        </AixiaSection>
      ) : (
        <AixiaSection
          title="Bank Account Registry"
          description="Active and inactive bank accounts. Archived records are managed only through the archive modal."
          icon={Landmark}
          actions={
            <div className="aixia-control-cluster">
              <div className="aixia-control-field-wide">
                <AixiaSearchField
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search by company, bank, identifier, currency, location, or status"
                  width="full"
                />
              </div>

              {permissionState.canCreate ? (
                <AixiaButton
                  type="button"
                  variant="primary"
                  onClick={() => navigate("/finance/master-data/bank-accounts/new")}
                >
                  <Plus className="h-4 w-4" />
                  Create Bank Account
                </AixiaButton>
              ) : null}

              {permissionState.canDeleteArchive ? (
                <AixiaButton
                  type="button"
                  variant="danger"
                  onClick={() => void openArchiveModal()}
                  disabled={isActionRunning}
                >
                  {runningAction === "archive-modal" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Archive className="h-4 w-4" />
                  )}
                  Archive
                </AixiaButton>
              ) : null}
            </div>
          }
        >
          {isPageLoading ? (
            <AixiaEmptyState
              icon={Loader2}
              title="Loading bank accounts"
              description="Bank account records and permission state are being checked."
            />
          ) : filteredRows.length === 0 ? (
            <AixiaEmptyState
              icon={CreditCard}
              title="No visible bank accounts found"
              description="Create a bank account or adjust the search filter to find a company banking record."
            />
          ) : (
            <AixiaTableShell>
                  <thead className="aixia-table-head">
                    <tr>
                      <th>
                        <AixiaSortableHeader
                          label="Company"
                          sortKey="company"
                          activeSortKey={sortKey}
                          sortDirection={sortDirection}
                          onSort={toggleSort}
                        />
                      </th>
                      <th>
                        <AixiaSortableHeader
                          label="Bank"
                          sortKey="bank"
                          activeSortKey={sortKey}
                          sortDirection={sortDirection}
                          onSort={toggleSort}
                        />
                      </th>
                      <th>
                        <AixiaSortableHeader
                          label="Identifier"
                          sortKey="identifier"
                          activeSortKey={sortKey}
                          sortDirection={sortDirection}
                          onSort={toggleSort}
                        />
                      </th>
                      <th>
                        <AixiaSortableHeader
                          label="Currency"
                          sortKey="currency"
                          activeSortKey={sortKey}
                          sortDirection={sortDirection}
                          onSort={toggleSort}
                          align="center"
                        />
                      </th>
                      <th>
                        <AixiaSortableHeader
                          label="Default"
                          sortKey="default"
                          activeSortKey={sortKey}
                          sortDirection={sortDirection}
                          onSort={toggleSort}
                          align="center"
                        />
                      </th>
                      <th>
                        <AixiaSortableHeader
                          label="Status"
                          sortKey="status"
                          activeSortKey={sortKey}
                          sortDirection={sortDirection}
                          onSort={toggleSort}
                          align="center"
                        />
                      </th>
                      <th>
                        <AixiaSortableHeader
                          label="Updated"
                          sortKey="updated"
                          activeSortKey={sortKey}
                          sortDirection={sortDirection}
                          onSort={toggleSort}
                        />
                      </th>
                      <th>Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredRows.map((row) => {
                      const updatedAt = row.updated_at || row.created_at;
                      const isRowActionRunning = activeActionId === row.id;

                      return (
                        <tr key={row.id} className="aixia-table-row">
                          <AixiaTableTextCell
                            width="xl"
                            primary={getCompanyName(row)}
                            secondary={row.company_code || "No company code"}
                          />

                          <AixiaTableTextCell
                            width="lg"
                            primary={getBankName(row)}
                            secondary={getLocationLabel(row)}
                          />

                          <AixiaTableTextCell
                            width="md"
                            primary={getIdentifierLabel(row)}
                            secondary={row.beneficiary_name || "No beneficiary"}
                          />

                          <AixiaTableBadgeCell>
                            <AixiaCurrencyBadge
                              value={getCorrelatedCurrencyLabel(row, companyCurrencyByCode)}
                            />
                          </AixiaTableBadgeCell>

                          <AixiaTableBadgeCell>
                            <AixiaDefaultBadge isDefault={Boolean(row.is_default)} />
                          </AixiaTableBadgeCell>

                          <AixiaTableBadgeCell>
                            <AixiaStatusBadge value={row.status} />
                          </AixiaTableBadgeCell>

                          <AixiaTableDateCell>{formatDateLabel(updatedAt)}</AixiaTableDateCell>

                          <AixiaTableActionsCell>
                            <AixiaButton
                              type="button"
                              variant="secondary"
                              onClick={() =>
                                navigate(`/finance/master-data/bank-accounts/${row.id}`)
                              }
                            >
                              Open
                              <ArrowRight className="h-3.5 w-3.5" />
                            </AixiaButton>

                            {permissionState.canDeleteArchive ? (
                              <AixiaButton
                                type="button"
                                variant="danger"
                                onClick={() => void handleArchive(row.id)}
                                disabled={isActionRunning}
                              >
                                {isRowActionRunning && runningAction === "archive" ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Archive className="h-3.5 w-3.5" />
                                )}
                                Archive
                              </AixiaButton>
                            ) : null}
                          </AixiaTableActionsCell>
                        </tr>
                      );
                    })}
                    </tbody>
                </AixiaTableShell>
          )}
        </AixiaSection>
      )}

      <AixiaAccessRule description="This registry requires Bank Account Read access. Create is controlled by Create access. Archive, Restore, and Permanent Delete are controlled by Delete/Archive access. Update/Edit is handled inside the bank account ID page.">
        Finance permissions remain enforced by the existing permission state and backend access model.
      </AixiaAccessRule>

      <AixiaModal
        open={showArchive}
        title="Archived Company Bank Accounts"
        description="Archived records can be opened, restored, or permanently deleted. There is no Deleted tab because this backend uses only active, inactive, and archived lifecycle states."
        onClose={closeArchiveModal}
        maxWidthClassName="max-w-6xl"
      >
        <div className="space-y-4">
          <AixiaSearchField
            value={archiveSearch}
            onChange={(event) => setArchiveSearch(event.target.value)}
            placeholder="Search archived bank accounts"
            width="full"
          />
              {isLoadingArchive ? (
                <AixiaEmptyState
                  icon={Loader2}
                  title="Loading archived bank accounts"
                  description="Archived bank account records are being checked."
                />
              ) : filteredArchivedRows.length === 0 ? (
                <AixiaEmptyState
                  icon={Archive}
                  title="No archived bank accounts"
                  description="Archived company bank accounts will appear here after they are removed from active operational use."
                />
              ) : (
                <AixiaTableShell maxHeightClassName="max-h-[620px]">
                    <thead className="aixia-table-head">
                      <tr>
                        <th>Company</th>
                        <th>Bank</th>
                        <th>Currency</th>
                        <th>Updated</th>
                        <th>Actions</th>
                      </tr>
                    </thead>

                    <tbody>
                      {filteredArchivedRows.map((row) => {
                        const isRowActionRunning = activeActionId === row.id;
                        const updatedAt = row.updated_at || row.created_at;

                        return (
                          <tr key={row.id} className="aixia-table-row">
                            <AixiaTableTextCell
                              width="xl"
                              primary={getCompanyName(row)}
                              secondary={row.company_code || "No company code"}
                            />

                            <AixiaTableTextCell
                              width="lg"
                              primary={getBankName(row)}
                              secondary={getIdentifierLabel(row)}
                            />

                            <AixiaTableBadgeCell>
                              <AixiaCurrencyBadge
                                value={getCorrelatedCurrencyLabel(row, companyCurrencyByCode)}
                              />
                            </AixiaTableBadgeCell>

                            <AixiaTableDateCell>{formatDateLabel(updatedAt)}</AixiaTableDateCell>

                            <AixiaTableActionsCell>
                              <AixiaButton
                                type="button"
                                variant="secondary"
                                onClick={() =>
                                  navigate(`/finance/master-data/bank-accounts/${row.id}`)
                                }
                              >
                                Open
                              </AixiaButton>

                              <AixiaButton
                                type="button"
                                variant="secondary"
                                onClick={() => void handleRestore(row.id)}
                                disabled={isActionRunning}
                              >
                                {isRowActionRunning && runningAction === "restore" ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <RotateCcw className="h-3.5 w-3.5" />
                                )}
                                Restore
                              </AixiaButton>

                              <AixiaButton
                                type="button"
                                variant="danger"
                                onClick={() => void handlePermanentDelete(row.id)}
                                disabled={isActionRunning}
                              >
                                {isRowActionRunning && runningAction === "hard-delete" ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Trash2 className="h-3.5 w-3.5" />
                                )}
                                Delete
                              </AixiaButton>
                            </AixiaTableActionsCell>
                          </tr>
                        );
                      })}
                    </tbody>
                </AixiaTableShell>
              )}
        </div>
      </AixiaModal>
    </AixiaPage>
  );
}
