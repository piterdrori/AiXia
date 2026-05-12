import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Archive,
  ArrowRight,
  Building2,
  CheckCircle2,
  Landmark,
  Loader2,
  LockKeyhole,
  Mail,
  MapPin,
  Phone,
  Plus,
  RotateCcw,
  Search,
  ShieldCheck,
  Trash2,
  Users,
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
  archiveVendor,
  getArchivedVendors,
  getVendors,
  permanentlyDeleteVendor,
  restoreVendor,
  type FinanceVendorListRow,
} from "@/lib/finance/vendors";
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
  | "code"
  | "contact"
  | "email"
  | "phone"
  | "country"
  | "status"
  | "updated";

type SortDirection = "asc" | "desc";

const VENDORS_ACCESS_CONFIG = {
  sectionKey: "masterData",
  adminPermissions: ["manageFinanceMasterData"],
  readPermissions: [
    "accessFinance",
    "viewFinance",
    "manageFinanceMasterData",
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

function getVendorName(vendor: FinanceVendorListRow) {
  return vendor.legal_name || vendor.name || "Unnamed vendor";
}

function getVendorCode(vendor: FinanceVendorListRow) {
  return vendor.code || "—";
}

function getContactLabel(vendor: FinanceVendorListRow) {
  return vendor.company_related_personnel || "—";
}

function getEmailLabel(vendor: FinanceVendorListRow) {
  return vendor.company_email || vendor.personnel_email || "—";
}

function getPhoneLabel(vendor: FinanceVendorListRow) {
  return vendor.company_phone || vendor.personnel_phone || "—";
}

function getCountryLabel(vendor: FinanceVendorListRow) {
  return vendor.country || "—";
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

export default function FinanceMasterDataVendorsPage() {
  const navigate = useNavigate();

  const [profile, setProfile] = useState<ProfilePermissionRow | null>(null);
  const [effectivePermissions, setEffectivePermissions] =
    useState<Partial<Record<Permission, boolean>> | null>(null);

  const [vendors, setVendors] = useState<FinanceVendorListRow[]>([]);
  const [archivedVendors, setArchivedVendors] = useState<FinanceVendorListRow[]>(
    []
  );

  const [search, setSearch] = useState("");
  const [archiveSearch, setArchiveSearch] = useState("");
  const [showArchive, setShowArchive] = useState(false);

  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isLoadingVendors, setIsLoadingVendors] = useState(true);
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
            "Silent vendors permission refresh returned no auth user; keeping current permission state."
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

      const loadedProfile =
        (profileResult.data || null) as ProfilePermissionRow | null;

      if (!loadedProfile) {
        if (mode === "initial") {
          setProfile(null);
          setEffectivePermissions(null);
        } else {
          console.warn(
            "Silent vendors profile refresh returned no profile; keeping current permission state."
          );
        }

        return;
      }

      const backendPermissions = await fetchFinanceEffectivePermissions(
        authUserId,
        mode,
        "Vendors"
      );

      setProfile(loadedProfile);
      setEffectivePermissions(backendPermissions || loadedProfile.permissions || null);
    } catch (error) {
      console.error("Failed to load vendors profile permissions:", error);

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

  const loadVendors = useCallback(async (mode: LoadMode = "initial") => {
    if (mode === "initial") {
      setIsLoadingVendors(true);
      setPageError(null);
    } else {
      setBackgroundRefreshing(true);
    }

    try {
      const rows = await getVendors();
      setVendors(rows);
    } catch (error) {
      console.error("Failed to load finance vendors:", error);

      if (mode === "initial") {
        setVendors([]);
        setPageError(
          error instanceof Error
            ? error.message
            : "Failed to load finance vendors."
        );
      }
    } finally {
      if (mode === "initial") {
        setIsLoadingVendors(false);
      } else {
        setBackgroundRefreshing(false);
      }
    }
  }, []);

  const loadArchivedVendors = useCallback(async (mode: LoadMode = "initial") => {
    if (mode === "initial") {
      setIsLoadingArchive(true);
      setPageError(null);
    }

    try {
      const rows = await getArchivedVendors();
      setArchivedVendors(rows);
    } catch (error) {
      console.error("Failed to load archived finance vendors:", error);

      if (mode === "initial") {
        setArchivedVendors([]);
        setPageError(
          error instanceof Error ? error.message : "Failed to load archived vendors."
        );
      }
    } finally {
      if (mode === "initial") {
        setIsLoadingArchive(false);
      }
    }
  }, []);

  useEffect(() => {
    void Promise.all([loadCurrentProfile("initial"), loadVendors("initial")]);
  }, [loadCurrentProfile, loadVendors]);

  useEffect(() => {
    const channel = supabase
      .channel("finance-master-data-vendors-page")
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
        { event: "*", schema: "public", table: "finance_vendors" },
        () => {
          void loadVendors("silent");
          if (showArchive) void loadArchivedVendors("silent");
        }
      )
      .subscribe();

    const intervalId = window.setInterval(() => {
      void Promise.all([
        loadCurrentProfile("silent"),
        loadVendors("silent"),
        showArchive ? loadArchivedVendors("silent") : Promise.resolve(),
      ]);
    }, 60000);

    return () => {
      window.clearInterval(intervalId);
      void supabase.removeChannel(channel);
    };
  }, [loadArchivedVendors, loadCurrentProfile, loadVendors, showArchive]);

  const permissionState = useMemo(() => {
    return resolveFinancePagePermissionState({
      profileRole: profile?.role,
      permissions: effectivePermissions,
      config: VENDORS_ACCESS_CONFIG,
    });
  }, [effectivePermissions, profile?.role]);

  const visibleVendors = useMemo(() => {
    return vendors.filter((vendor) => vendor.status !== "archived");
  }, [vendors]);

  const counts = useMemo(() => {
    return {
      totalVisible: visibleVendors.length,
      active: vendors.filter((vendor) => vendor.status === "active").length,
      inactive: vendors.filter((vendor) => vendor.status === "inactive").length,
      archived: vendors.filter((vendor) => vendor.status === "archived").length,
      withContact: visibleVendors.filter((vendor) =>
        Boolean(vendor.company_related_personnel)
      ).length,
    };
  }, [vendors, visibleVendors]);

  const filteredVendors = useMemo(() => {
    const query = search.trim().toLowerCase();

    return visibleVendors
      .filter((vendor) => {
        if (!query) return true;

        return [
          vendor.code,
          vendor.legal_name,
          vendor.name,
          vendor.company_related_personnel,
          vendor.company_email,
          vendor.personnel_email,
          vendor.company_phone,
          vendor.personnel_phone,
          vendor.country,
          vendor.status,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query));
      })
      .sort((first, second) => {
        let comparison = 0;

        if (sortKey === "vendor") {
          comparison = compareStrings(getVendorName(first), getVendorName(second));
        }

        if (sortKey === "code") {
          comparison = compareStrings(first.code, second.code);
        }

        if (sortKey === "contact") {
          comparison = compareStrings(
            getContactLabel(first),
            getContactLabel(second)
          );
        }

        if (sortKey === "email") {
          comparison = compareStrings(getEmailLabel(first), getEmailLabel(second));
        }

        if (sortKey === "phone") {
          comparison = compareStrings(getPhoneLabel(first), getPhoneLabel(second));
        }

        if (sortKey === "country") {
          comparison = compareStrings(getCountryLabel(first), getCountryLabel(second));
        }

        if (sortKey === "status") {
          comparison = compareStrings(first.status, second.status);
        }

        if (sortKey === "updated") {
          comparison = compareDates(
            first.updated_at || first.created_at,
            second.updated_at || second.created_at
          );
        }

        return sortDirection === "asc" ? comparison : -comparison;
      });
  }, [search, sortDirection, sortKey, visibleVendors]);

  const filteredArchivedVendors = useMemo(() => {
    const query = archiveSearch.trim().toLowerCase();

    return archivedVendors
      .filter((vendor) => {
        if (!query) return true;

        return [
          vendor.code,
          vendor.legal_name,
          vendor.name,
          vendor.company_related_personnel,
          vendor.company_email,
          vendor.personnel_email,
          vendor.company_phone,
          vendor.personnel_phone,
          vendor.country,
          vendor.status,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query));
      })
      .sort((first, second) =>
        -compareDates(
          first.updated_at || first.created_at,
          second.updated_at || second.created_at
        )
      );
  }, [archiveSearch, archivedVendors]);

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
    await loadArchivedVendors("initial");
    setRunningAction(null);
  }, [loadArchivedVendors, permissionState.canDeleteArchive]);

  const closeArchiveModal = useCallback(() => {
    setShowArchive(false);
    setArchiveSearch("");
  }, []);

  const handleArchiveVendor = useCallback(
    async (vendorId: string) => {
      if (!permissionState.canDeleteArchive || runningAction) return;

      setRunningAction("archive");
      setActiveActionId(vendorId);
      setPageError(null);
      setPageMessage(null);

      try {
        await archiveVendor(vendorId);
        await Promise.all([
          loadVendors("silent"),
          showArchive ? loadArchivedVendors("silent") : Promise.resolve(),
        ]);
        setPageMessage("Vendor archived.");
      } catch (error) {
        console.error("Failed to archive finance vendor:", error);
        setPageError(
          error instanceof Error ? error.message : "Failed to archive finance vendor."
        );
      } finally {
        setRunningAction(null);
        setActiveActionId(null);
      }
    },
    [
      loadArchivedVendors,
      loadVendors,
      permissionState.canDeleteArchive,
      runningAction,
      showArchive,
    ]
  );

  const handleRestoreVendor = useCallback(
    async (vendorId: string) => {
      if (!permissionState.canDeleteArchive || runningAction) return;

      setRunningAction("restore");
      setActiveActionId(vendorId);
      setPageError(null);
      setPageMessage(null);

      try {
        await restoreVendor(vendorId);
        await Promise.all([loadVendors("silent"), loadArchivedVendors("silent")]);
        setPageMessage("Vendor restored.");
      } catch (error) {
        console.error("Failed to restore finance vendor:", error);
        setPageError(
          error instanceof Error ? error.message : "Failed to restore finance vendor."
        );
      } finally {
        setRunningAction(null);
        setActiveActionId(null);
      }
    },
    [loadArchivedVendors, loadVendors, permissionState.canDeleteArchive, runningAction]
  );

  const handlePermanentDeleteVendor = useCallback(
    async (vendorId: string) => {
      if (!permissionState.canDeleteArchive || runningAction) return;

      const confirmed = window.confirm(
        "Permanently delete this archived vendor? This cannot be undone."
      );

      if (!confirmed) return;

      setRunningAction("hard-delete");
      setActiveActionId(vendorId);
      setPageError(null);
      setPageMessage(null);

      try {
        await permanentlyDeleteVendor(vendorId);
        await Promise.all([loadVendors("silent"), loadArchivedVendors("silent")]);
        setPageMessage("Archived vendor permanently deleted.");
      } catch (error) {
        console.error("Failed to permanently delete finance vendor:", error);
        setPageError(
          error instanceof Error
            ? error.message
            : "Failed to permanently delete finance vendor."
        );
      } finally {
        setRunningAction(null);
        setActiveActionId(null);
      }
    },
    [loadArchivedVendors, loadVendors, permissionState.canDeleteArchive, runningAction]
  );

  const isPageLoading = isLoadingProfile || isLoadingVendors;
  const isActionRunning = Boolean(runningAction);

  if (isPageLoading) {
    return (
      <AixiaLoadingState
        title="Loading vendors"
        description="Vendor records and permission state are being checked."
      />
    );
  }

  return (
    <AixiaPage>
      <AixiaHero
        parentLabel="Master Data"
        parentPath="/finance/master-data"
        badges={[
          { label: "Vendor Master Data", tone: "cyan" },
          { label: "Permission Filtered", tone: "emerald" },
          {
            label: backgroundRefreshing ? "Updating Silently" : "Realtime + 60s",
            tone: backgroundRefreshing ? "gold" : "neutral",
          },
        ]}
        gradientTitle="Vendors"
        title="Registry"
        subtitle="External Supplier Master Data"
        description="Permission-filtered registry for external suppliers, vendor legal identity, contact details, country, communication channels, and procurement/payables readiness."
        statusCards={[
          {
            label: "Read Access",
            value: permissionState.canRead ? "Enabled" : "Locked",
            description:
              "This page requires Vendor, Payables, Finance, or Master Data read access.",
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
              "Create and Delete/Archive actions follow the Finance template.",
            icon: permissionState.canDeleteArchive ? Archive : Landmark,
            tone: permissionState.canDeleteArchive ? "amber" : "cyan",
          },
        ]}
      />

      {pageError ? <AixiaAlert tone="error">{pageError}</AixiaAlert> : null}
      {pageMessage ? <AixiaAlert tone="success">{pageMessage}</AixiaAlert> : null}

      <AixiaMetricGrid>
        <AixiaMetricCard
          label="Visible Vendors"
          value={formatCount(counts.totalVisible)}
          description="Active and inactive vendor master records."
          icon={Building2}
          tone="cyan"
        />

        <AixiaMetricCard
          label="Active"
          value={formatCount(counts.active)}
          description="Available for procurement and payables."
          icon={CheckCircle2}
          tone="emerald"
        />

        <AixiaMetricCard
          label="With Contact"
          value={formatCount(counts.withContact)}
          description="Vendors with a saved contact person."
          icon={Users}
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
          title="No vendor access is enabled"
          description="Ask an Admin to assign a Finance role template or user-specific exception with Vendor, Payables, Finance, or Master Data read access."
        />
      ) : (
        <>
          <AixiaSection
            title="Vendor Registry"
            description="Active and inactive vendors. Archived vendors are managed only through the archive modal."
            icon={Building2}
          >
            <AixiaRegistryToolbar
              search={
                <AixiaSearchField
                  width="full"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search by vendor, code, contact, email, phone, country, or status"
                />
              }
              primaryAction={
                permissionState.canCreate ? (
                  <AixiaButton
                    type="button"
                    variant="primary"
                    onClick={() => navigate("/finance/master-data/vendors/new")}
                  >
                    <Plus className="h-4 w-4" />
                    Create Vendor
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

            {filteredVendors.length === 0 ? (
              <AixiaEmptyState
                icon={Search}
                title="No visible vendors found"
                description="Create a vendor or adjust the search filter to find a vendor master-data record."
              />
            ) : (
              <AixiaTableShell
                variant="registry"
                minWidthClassName="min-w-[1320px]"
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
                        label="Code"
                        sortKey="code"
                        activeSortKey={sortKey}
                        sortDirection={sortDirection}
                        onSort={toggleSort}
                      />
                    </th>

                    <th>
                      <AixiaSortableHeader
                        label="Contact"
                        sortKey="contact"
                        activeSortKey={sortKey}
                        sortDirection={sortDirection}
                        onSort={toggleSort}
                      />
                    </th>

                    <th>
                      <AixiaSortableHeader
                        label="Email"
                        sortKey="email"
                        activeSortKey={sortKey}
                        sortDirection={sortDirection}
                        onSort={toggleSort}
                      />
                    </th>

                    <th>
                      <AixiaSortableHeader
                        label="Phone"
                        sortKey="phone"
                        activeSortKey={sortKey}
                        sortDirection={sortDirection}
                        onSort={toggleSort}
                      />
                    </th>

                    <th>
                      <AixiaSortableHeader
                        label="Country"
                        sortKey="country"
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
                  {filteredVendors.map((vendor) => {
                    const updatedAt = vendor.updated_at || vendor.created_at;
                    const isRowActionRunning = activeActionId === vendor.id;

                    return (
                      <tr key={vendor.id} className="aixia-table-row">
                        <AixiaTableTextCell
                          width="xl"
                          primary={getVendorName(vendor)}
                          secondary="External supplier / payee"
                        />

                        <AixiaTableBadgeCell width="sm">
                          <AixiaBadge tone="neutral">{getVendorCode(vendor)}</AixiaBadge>
                        </AixiaTableBadgeCell>

                        <AixiaTableTextCell
                          width="md"
                          primary={getContactLabel(vendor)}
                          secondary="Vendor contact"
                        />

                        <AixiaTableTextCell
                          width="lg"
                          primary={getEmailLabel(vendor)}
                          secondary={
                            <span className="inline-flex items-center gap-1">
                              <Mail className="h-3.5 w-3.5" />
                              Email
                            </span>
                          }
                        />

                        <AixiaTableTextCell
                          width="md"
                          primary={getPhoneLabel(vendor)}
                          secondary={
                            <span className="inline-flex items-center gap-1">
                              <Phone className="h-3.5 w-3.5" />
                              Phone
                            </span>
                          }
                        />

                        <AixiaTableTextCell
                          width="md"
                          primary={getCountryLabel(vendor)}
                          secondary={
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5" />
                              Country
                            </span>
                          }
                        />

                        <AixiaTableBadgeCell width="sm">
                          <AixiaStatusBadge value={vendor.status} />
                        </AixiaTableBadgeCell>

                        <AixiaTableDateCell width="sm">
                          {formatDateLabel(updatedAt)}
                        </AixiaTableDateCell>

                        <AixiaTableActionsCell>
                          <AixiaButton
                            type="button"
                            variant="primary"
                            onClick={() =>
                              navigate(`/finance/master-data/vendors/${vendor.id}`)
                            }
                          >
                            Open
                            <ArrowRight className="h-3.5 w-3.5" />
                          </AixiaButton>

                          {permissionState.canDeleteArchive ? (
                            <AixiaButton
                              type="button"
                              variant="danger"
                              onClick={() => void handleArchiveVendor(vendor.id)}
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
            This registry requires Vendor / Payables / Finance / Master Data read
            access. Create is controlled by Create access. Archive, Restore, and
            Permanent Delete are controlled by Delete/Archive access. Update/Edit is
            handled inside the vendor ID page. Background refresh is silent and must
            not move the page.
          </AixiaAccessRule>
        </>
      )}

      <AixiaArchiveManagerModal
        open={showArchive}
        title="Archived Vendors"
        description="Archived vendors can be opened, restored, or permanently deleted. There is no Deleted tab because this backend uses the archived lifecycle state."
        archivedCount={archivedVendors.length}
        onClose={closeArchiveModal}
      >
        <div className="aixia-stack">
          <AixiaSearchField
            width="full"
            value={archiveSearch}
            onChange={(event) => setArchiveSearch(event.target.value)}
            placeholder="Search archived vendors"
          />

          {isLoadingArchive ? (
            <AixiaLoadingState
              title="Loading archived vendors"
              description="Archived vendor records are being loaded."
            />
          ) : filteredArchivedVendors.length === 0 ? (
            <AixiaEmptyState
              icon={Archive}
              title="No archived vendors"
              description="Archived vendor records will appear here after they are removed from active operational use."
            />
          ) : (
            <AixiaTableShell variant="archive" minWidthClassName="min-w-[980px]">
              <thead className="aixia-table-head">
                <tr>
                  <th>Vendor</th>
                  <th>Code</th>
                  <th>Contact</th>
                  <th>Country</th>
                  <th>Updated</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredArchivedVendors.map((vendor) => {
                  const isRowActionRunning = activeActionId === vendor.id;
                  const updatedAt = vendor.updated_at || vendor.created_at;

                  return (
                    <tr key={vendor.id} className="aixia-table-row">
                      <AixiaTableTextCell
                        width="xl"
                        primary={getVendorName(vendor)}
                        secondary={getEmailLabel(vendor)}
                      />

                      <AixiaTableBadgeCell width="sm">
                        <AixiaBadge tone="neutral">{getVendorCode(vendor)}</AixiaBadge>
                      </AixiaTableBadgeCell>

                      <AixiaTableTextCell
                        width="md"
                        primary={getContactLabel(vendor)}
                        secondary="Vendor contact"
                      />

                      <AixiaTableTextCell
                        width="md"
                        primary={getCountryLabel(vendor)}
                        secondary="Country"
                      />

                      <AixiaTableDateCell width="sm">
                        {formatDateLabel(updatedAt)}
                      </AixiaTableDateCell>

                      <AixiaTableActionsCell>
                        <AixiaButton
                          type="button"
                          variant="primary"
                          onClick={() =>
                            navigate(`/finance/master-data/vendors/${vendor.id}`)
                          }
                        >
                          Open
                        </AixiaButton>

                        <AixiaButton
                          type="button"
                          variant="secondary"
                          onClick={() => void handleRestoreVendor(vendor.id)}
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
                          onClick={() => void handlePermanentDeleteVendor(vendor.id)}
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
