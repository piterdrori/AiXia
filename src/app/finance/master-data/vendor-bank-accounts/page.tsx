import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Archive,
  ArrowRight,
  CheckCircle2,
  CreditCard,
  Landmark,
  Loader2,
  LockKeyhole,
  Plus,
  RotateCcw,
  Search,
  ShieldCheck,
  Trash2,
  WalletCards,
} from "lucide-react";

import {
  AixiaAccessDeniedState,
  AixiaAccessRule,
  AixiaAlert,
  AixiaArchiveManagerModal,
  AixiaBadge,
  AixiaButton,
  AixiaEmptyState,
  AixiaHero,
  AixiaLoadingState,
  AixiaMetricCard,
  AixiaMetricGrid,
  AixiaPage,
  AixiaRegistryToolbar,
  AixiaSearchField,
  AixiaSection,
  AixiaSortableHeader,
  AixiaStatusBadge,
  AixiaTableActionsCell,
  AixiaTableBadgeCell,
  AixiaTableDateCell,
  AixiaTableShell,
  AixiaTableTextCell,
} from "@/components/aixia";

import {
  archiveVendorBankAccount,
  getArchivedVendorBankAccounts,
  getVendorBankAccounts,
  permanentlyDeleteVendorBankAccount,
  restoreVendorBankAccount,
  type FinanceVendorBankAccountListRow,
} from "@/lib/finance/vendor-bank-accounts";
import type { Permission, Role } from "@/lib/permissions";
import {
  fetchFinanceEffectivePermissions,
  resolveFinancePagePermissionState,
  type FinanceLoadMode,
} from "@/lib/finance/pageAccess";
import { supabase } from "@/lib/supabase";

type LoadMode = FinanceLoadMode;

type ProfilePermissionRow = {
  user_id: string;
  full_name: string | null;
  role: Role | null;
  permissions: Partial<Record<Permission, boolean>> | null;
};

type PageAction =
  | "archive"
  | "archive-modal"
  | "restore"
  | "hard-delete"
  | null;

type SortKey =
  | "vendor"
  | "bank"
  | "identifier"
  | "currency"
  | "status"
  | "default"
  | "updated";

type SortDirection = "asc" | "desc";

const VENDOR_BANK_ACCOUNTS_ACCESS_CONFIG = {
  sectionKey: "masterData",
  adminPermissions: ["manageFinanceMasterData"],
  readPermissions: [
    "accessFinance",
    "viewFinance",
    "manageFinanceMasterData",
    "viewBankAccounts",
    "viewVendors",
    "manageVendors",
    "accessPayables",
    "viewPayables",
  ],
  createPermissions: [
    "createFinanceRecords",
    "manageFinanceMasterData",
    "manageVendors",
  ],
  updatePermissions: [
    "editFinanceRecords",
    "manageFinanceMasterData",
    "manageVendors",
  ],
  deleteArchivePermissions: [
    "archiveFinanceRecords",
    "manageFinanceMasterData",
    "manageVendors",
  ],
} as const;

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

function getVendorName(row: FinanceVendorBankAccountListRow) {
  return row.vendor_legal_name || row.vendor_name || row.vendor_code || "Unassigned";
}

function getBankName(row: FinanceVendorBankAccountListRow) {
  return row.bank_name || "Vendor Bank Account";
}

function getIdentifierLabel(row: FinanceVendorBankAccountListRow) {
  if (row.bank_id) return row.bank_id;
  return "—";
}

function getLocationLabel(row: FinanceVendorBankAccountListRow) {
  const parts = [row.city, row.country].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : "—";
}

function getCurrencyLabel(row: FinanceVendorBankAccountListRow) {
  return row.currency_code || "—";
}

function compareStrings(
  first: string | null | undefined,
  second: string | null | undefined
) {
  return (first || "").localeCompare(second || "");
}

function compareDates(
  first: string | null | undefined,
  second: string | null | undefined
) {
  return new Date(first || 0).getTime() - new Date(second || 0).getTime();
}

export default function FinanceMasterDataVendorBankAccountsPage() {
  const navigate = useNavigate();

  const [profile, setProfile] = useState<ProfilePermissionRow | null>(null);
  const [effectivePermissions, setEffectivePermissions] =
    useState<Partial<Record<Permission, boolean>> | null>(null);
  const [rows, setRows] = useState<FinanceVendorBankAccountListRow[]>([]);
  const [archivedRows, setArchivedRows] = useState<
    FinanceVendorBankAccountListRow[]
  >([]);

  const [search, setSearch] = useState("");
  const [archiveSearch, setArchiveSearch] = useState("");
  const [showArchive, setShowArchive] = useState(false);

  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isLoadingRows, setIsLoadingRows] = useState(true);
  const [isLoadingArchive, setIsLoadingArchive] = useState(false);
  const [backgroundRefreshing, setBackgroundRefreshing] = useState(false);

  const [pageError, setPageError] = useState<string | null>(null);
  const [pageMessage, setPageMessage] = useState<string | null>(null);
  const [runningAction, setRunningAction] = useState<PageAction>(null);
  const [activeActionId, setActiveActionId] = useState<string | null>(null);

  const [sortKey, setSortKey] = useState<SortKey>("updated");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const loadCurrentProfile = useCallback(async (mode: LoadMode = "initial") => {
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
        } else {
          console.warn(
            "Silent vendor bank accounts permission refresh returned no auth user; keeping current permission state."
          );
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

      if (!loadedProfile) {
        if (mode === "initial") {
          setProfile(null);
          setEffectivePermissions(null);
        } else {
          console.warn(
            "Silent vendor bank accounts profile refresh returned no profile; keeping current permission state."
          );
        }

        return;
      }

      const backendPermissions = await fetchFinanceEffectivePermissions(
        authUserId,
        mode,
        "Vendor Bank Accounts"
      );

      setProfile(loadedProfile);
      setEffectivePermissions(backendPermissions || loadedProfile.permissions || null);
    } catch (error) {
      console.error("Failed to load vendor bank account profile permissions:", error);

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

  const loadRows = useCallback(async (mode: LoadMode = "initial") => {
    if (mode === "initial") {
      setIsLoadingRows(true);
      setPageError(null);
    } else {
      setBackgroundRefreshing(true);
    }

    try {
      const data = await getVendorBankAccounts();
      setRows(data);
    } catch (error) {
      console.error("Failed to load vendor bank accounts:", error);

      if (mode === "initial") {
        setRows([]);
        setPageError(
          error instanceof Error
            ? error.message
            : "Failed to load vendor bank accounts."
        );
      }
    } finally {
      if (mode === "initial") {
        setIsLoadingRows(false);
      } else {
        setBackgroundRefreshing(false);
      }
    }
  }, []);

  const loadArchivedRows = useCallback(async (mode: LoadMode = "initial") => {
    if (mode === "initial") {
      setIsLoadingArchive(true);
      setPageError(null);
    }

    try {
      const data = await getArchivedVendorBankAccounts();
      setArchivedRows(data);
    } catch (error) {
      console.error("Failed to load archived vendor bank accounts:", error);

      if (mode === "initial") {
        setArchivedRows([]);
        setPageError(
          error instanceof Error
            ? error.message
            : "Failed to load archived vendor bank accounts."
        );
      }
    } finally {
      if (mode === "initial") {
        setIsLoadingArchive(false);
      }
    }
  }, []);

  useEffect(() => {
    void Promise.all([loadCurrentProfile("initial"), loadRows("initial")]);
  }, [loadCurrentProfile, loadRows]);

  useEffect(() => {
    const channel = supabase
      .channel("finance-master-data-vendor-bank-accounts-page")
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
        { event: "*", schema: "public", table: "finance_vendor_bank_accounts" },
        () => {
          void loadRows("silent");
          if (showArchive) void loadArchivedRows("silent");
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_vendors" },
        () => {
          void loadRows("silent");
          if (showArchive) void loadArchivedRows("silent");
        }
      )
      .subscribe();

    const intervalId = window.setInterval(() => {
      void Promise.all([
        loadCurrentProfile("silent"),
        loadRows("silent"),
        showArchive ? loadArchivedRows("silent") : Promise.resolve(),
      ]);
    }, 60000);

    return () => {
      window.clearInterval(intervalId);
      void supabase.removeChannel(channel);
    };
  }, [loadArchivedRows, loadCurrentProfile, loadRows, showArchive]);

  const permissionState = useMemo(() => {
    return resolveFinancePagePermissionState({
      profileRole: profile?.role,
      permissions: effectivePermissions,
      config: VENDOR_BANK_ACCOUNTS_ACCESS_CONFIG,
    });
  }, [effectivePermissions, profile?.role]);

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

  const filteredRows = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return visibleRows
      .filter((row) => {
        if (!normalizedSearch) return true;

        return [
          row.bank_id,
          row.vendor_code,
          row.vendor_name,
          row.vendor_legal_name,
          row.bank_name,
          row.city,
          row.country,
          getCurrencyLabel(row),
          row.status,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(normalizedSearch));
      })
      .sort((first, second) => {
        let comparison = 0;

        if (sortKey === "vendor") {
          comparison = compareStrings(getVendorName(first), getVendorName(second));
        }

        if (sortKey === "bank") {
          comparison = compareStrings(getBankName(first), getBankName(second));
        }

        if (sortKey === "identifier") {
          comparison = compareStrings(
            getIdentifierLabel(first),
            getIdentifierLabel(second)
          );
        }

        if (sortKey === "currency") {
          comparison = compareStrings(getCurrencyLabel(first), getCurrencyLabel(second));
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
  }, [search, sortDirection, sortKey, visibleRows]);

  const filteredArchivedRows = useMemo(() => {
    const normalizedSearch = archiveSearch.trim().toLowerCase();

    return archivedRows
      .filter((row) => {
        if (!normalizedSearch) return true;

        return [
          row.bank_id,
          row.vendor_code,
          row.vendor_name,
          row.vendor_legal_name,
          row.bank_name,
          row.city,
          row.country,
          getCurrencyLabel(row),
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
  }, [archiveSearch, archivedRows]);

  const toggleSort = useCallback((nextKey: SortKey) => {
    setSortKey((currentKey) => {
      if (currentKey !== nextKey) {
        setSortDirection(nextKey === "updated" ? "desc" : "asc");
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
        await archiveVendorBankAccount(id);
        await Promise.all([
          loadRows("silent"),
          showArchive ? loadArchivedRows("silent") : Promise.resolve(),
        ]);
        setPageMessage("Vendor bank account archived.");
      } catch (error) {
        console.error("Failed to archive vendor bank account:", error);
        setPageError(
          error instanceof Error
            ? error.message
            : "Failed to archive vendor bank account."
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
        await restoreVendorBankAccount(id);
        await Promise.all([loadRows("silent"), loadArchivedRows("silent")]);
        setPageMessage("Vendor bank account restored.");
      } catch (error) {
        console.error("Failed to restore vendor bank account:", error);
        setPageError(
          error instanceof Error
            ? error.message
            : "Failed to restore vendor bank account."
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
        "Permanently delete this archived vendor bank account? This cannot be undone."
      );

      if (!confirmed) return;

      setRunningAction("hard-delete");
      setActiveActionId(id);
      setPageError(null);
      setPageMessage(null);

      try {
        await permanentlyDeleteVendorBankAccount(id);
        await Promise.all([loadRows("silent"), loadArchivedRows("silent")]);
        setPageMessage("Archived vendor bank account permanently deleted.");
      } catch (error) {
        console.error("Failed to permanently delete vendor bank account:", error);
        setPageError(
          error instanceof Error
            ? error.message
            : "Failed to permanently delete vendor bank account."
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

  if (isPageLoading) {
    return (
      <AixiaLoadingState
        title="Loading vendor bank accounts"
        description="Vendor bank-account records and permission state are being checked."
      />
    );
  }

  return (
    <AixiaPage>
      <AixiaHero
        parentLabel="Master Data"
        parentPath="/finance/master-data"
        badges={[
          { label: "Vendor Banking Master Data", tone: "cyan" },
          { label: "Permission Filtered", tone: "emerald" },
          {
            label: backgroundRefreshing ? "Updating Silently" : "Realtime + 60s",
            tone: backgroundRefreshing ? "gold" : "neutral",
          },
        ]}
        gradientTitle="Vendor Bank"
        title="Accounts"
        subtitle="Vendor Payout Account Registry"
        description="Permission-filtered registry for vendor payout bank accounts used by procurement, accounts payable, payment execution, and vendor payment snapshots."
        statusCards={[
          {
            label: "Read Access",
            value: permissionState.canRead ? "Enabled" : "Locked",
            description:
              "This page requires Vendor, Bank Account, Payables, Finance, or Master Data read access.",
            icon: permissionState.canRead ? ShieldCheck : LockKeyhole,
            tone: permissionState.canRead ? "emerald" : "rose",
          },
          {
            label: "Lifecycle Access",
            value: permissionState.canDeleteArchive
              ? "Archive Enabled"
              : permissionState.canCreate
              ? "Create Enabled"
              : "Read Only",
            description:
              "Create and Delete/Archive actions follow the selected Finance template.",
            icon: permissionState.canDeleteArchive ? Archive : CreditCard,
            tone: permissionState.canDeleteArchive ? "amber" : "cyan",
          },
        ]}
      />

      {pageError ? <AixiaAlert tone="error">{pageError}</AixiaAlert> : null}
      {pageMessage ? <AixiaAlert tone="success">{pageMessage}</AixiaAlert> : null}

      <AixiaMetricGrid>
        <AixiaMetricCard
          label="Visible Accounts"
          value={formatCount(counts.totalVisible)}
          description="Active and inactive vendor bank accounts."
          icon={WalletCards}
          tone="cyan"
        />

        <AixiaMetricCard
          label="Active"
          value={formatCount(counts.active)}
          description="Available for vendor payout and AP payment flows."
          icon={CheckCircle2}
          tone="emerald"
        />

        <AixiaMetricCard
          label="Default Accounts"
          value={formatCount(counts.defaultAccounts)}
          description="Default payout accounts across vendors."
          icon={Landmark}
          tone="violet"
        />

        <AixiaMetricCard
          label="Archived"
          value={formatCount(counts.archived)}
          description="Hidden from active operational use."
          icon={Archive}
          tone="rose"
        />
      </AixiaMetricGrid>

      {!permissionState.canRead ? (
        <AixiaAccessDeniedState
          title="No vendor bank-account access is enabled"
          description="Ask an Admin to assign a Finance role template or user-specific exception with Vendor, Payables, Finance, Bank Account, or Master Data read access."
        />
      ) : (
        <>
          <AixiaSection
            title="Vendor Bank Account Registry"
            description="Active and inactive vendor bank accounts. Archived records are managed only through the archive modal."
            icon={Landmark}
          >
            <AixiaRegistryToolbar
              search={
                <AixiaSearchField
                  width="full"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search by vendor, bank, identifier, currency, location, or status"
                />
              }
              primaryAction={
                permissionState.canCreate ? (
                  <AixiaButton
                    type="button"
                    variant="primary"
                    onClick={() =>
                      navigate("/finance/master-data/vendor-bank-accounts/new")
                    }
                  >
                    <Plus className="h-4 w-4" />
                    Create Vendor Bank Account
                  </AixiaButton>
                ) : null
              }
              archiveAction={
                permissionState.canDeleteArchive ? (
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
                ) : null
              }
            />

            {filteredRows.length === 0 ? (
              <AixiaEmptyState
                icon={Search}
                title="No visible vendor bank accounts found"
                description="Create a vendor bank account or adjust the search filter to find a vendor payout banking record."
              />
            ) : (
              <AixiaTableShell
                variant="registry"
                minWidthClassName="min-w-[1240px]"
                maxHeightClassName="max-h-[720px]"
              >
                <thead className="aixia-table-head">
                  <tr>
                    <th>
                      <AixiaSortableHeader
                        label="Vendor"
                        sortKey="vendor"
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
                      />
                    </th>

                    <th>
                      <AixiaSortableHeader
                        label="Default"
                        sortKey="default"
                        activeSortKey={sortKey}
                        sortDirection={sortDirection}
                        onSort={toggleSort}
                      />
                    </th>

                    <th>
                      <AixiaSortableHeader
                        label="Status"
                        sortKey="status"
                        activeSortKey={sortKey}
                        sortDirection={sortDirection}
                        onSort={toggleSort}
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
                          primary={getVendorName(row)}
                          secondary={row.vendor_code || "No vendor code"}
                        />

                        <AixiaTableTextCell
                          width="lg"
                          primary={getBankName(row)}
                          secondary={getLocationLabel(row)}
                        />

                        <AixiaTableTextCell
                          width="md"
                          primary={getIdentifierLabel(row)}
                          secondary="Vendor payout account"
                        />

                        <AixiaTableBadgeCell width="sm">
                          <AixiaBadge tone="neutral">{getCurrencyLabel(row)}</AixiaBadge>
                        </AixiaTableBadgeCell>

                        <AixiaTableBadgeCell width="sm">
                          {row.is_default ? (
                            <AixiaBadge tone="emerald">Default</AixiaBadge>
                          ) : (
                            <AixiaBadge tone="neutral">Standard</AixiaBadge>
                          )}
                        </AixiaTableBadgeCell>

                        <AixiaTableBadgeCell width="sm">
                          <AixiaStatusBadge value={row.status} />
                        </AixiaTableBadgeCell>

                        <AixiaTableDateCell width="sm">
                          {formatDateLabel(updatedAt)}
                        </AixiaTableDateCell>

                        <AixiaTableActionsCell>
                          <AixiaButton
                            type="button"
                            variant="primary"
                            onClick={() =>
                              navigate(
                                `/finance/master-data/vendor-bank-accounts/${row.id}`
                              )
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

          <AixiaAccessRule
            title="Locked access rule"
            description="Finance registry pages must show the shared Locked access rule block."
          >
            This registry requires Vendor, Payables, Finance, Bank Account, or Master
            Data read access. Create is controlled by Create access. Archive, Restore,
            and Permanent Delete are controlled by Delete/Archive access. Update/Edit is
            handled inside the vendor bank-account ID page. Currency is displayed from
            the vendor bank-account record itself and is selected from the general
            currency master data when the account is created or edited.
          </AixiaAccessRule>
        </>
      )}

      <AixiaArchiveManagerModal
        open={showArchive}
        title="Archived Vendor Bank Accounts"
        description="Archived records can be opened, restored, or permanently deleted. There is no Deleted tab because this backend uses only active, inactive, and archived lifecycle states."
        archivedCount={archivedRows.length}
        onClose={closeArchiveModal}
      >
        <div className="aixia-stack">
          <AixiaSearchField
            width="full"
            value={archiveSearch}
            onChange={(event) => setArchiveSearch(event.target.value)}
            placeholder="Search archived vendor bank accounts"
          />

          {isLoadingArchive ? (
            <AixiaLoadingState
              title="Loading archived vendor bank accounts"
              description="Archived vendor bank-account records are being loaded."
            />
          ) : filteredArchivedRows.length === 0 ? (
            <AixiaEmptyState
              icon={Archive}
              title="No archived vendor bank accounts"
              description="Archived vendor bank accounts will appear here after they are removed from active operational use."
            />
          ) : (
            <AixiaTableShell variant="archive" minWidthClassName="min-w-[980px]">
              <thead className="aixia-table-head">
                <tr>
                  <th>Vendor</th>
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
                        primary={getVendorName(row)}
                        secondary={row.vendor_code || "No vendor code"}
                      />

                      <AixiaTableTextCell
                        width="lg"
                        primary={getBankName(row)}
                        secondary={getIdentifierLabel(row)}
                      />

                      <AixiaTableBadgeCell width="sm">
                        <AixiaBadge tone="neutral">{getCurrencyLabel(row)}</AixiaBadge>
                      </AixiaTableBadgeCell>

                      <AixiaTableDateCell width="sm">
                        {formatDateLabel(updatedAt)}
                      </AixiaTableDateCell>

                      <AixiaTableActionsCell>
                        <AixiaButton
                          type="button"
                          variant="primary"
                          onClick={() =>
                            navigate(
                              `/finance/master-data/vendor-bank-accounts/${row.id}`
                            )
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
                          Delete Permanently
                        </AixiaButton>
                      </AixiaTableActionsCell>
                    </tr>
                  );
                })}
              </tbody>
            </AixiaTableShell>
          )}
        </div>
      </AixiaArchiveManagerModal>
    </AixiaPage>
  );
}
