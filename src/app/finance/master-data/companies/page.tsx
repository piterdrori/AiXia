import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import {
  Archive,
  ArrowRight,
  Building2,
  CheckCircle2,
  Globe,
  Landmark,
  Loader2,
  LockKeyhole,
  Plus,
  RotateCcw,
  ShieldCheck,
  Trash2,
} from "lucide-react";

import {
  AixiaAlert,
  AixiaAlertText,
  AixiaArchiveManagerModal,
  AixiaBadge,
  AixiaButton,
  AixiaCurrencyBadge,
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
  archiveCompany,
  getArchivedCompanies,
  getCompanies,
  permanentlyDeleteCompany,
  restoreCompany,
  type FinanceCompanyListRow,
} from "@/lib/finance/companies";
import {
  getEffectivePermissions,
  type Permission,
  type Role,
} from "@/lib/permissions";
import { supabase } from "@/lib/supabase";

type LoadMode = "initial" | "silent";

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
  | "contact"
  | "email"
  | "phone"
  | "location"
  | "currency"
  | "status"
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

type HeaderStatusCardData = {
  label: string;
  value: string;
  description: string;
  icon: LucideIcon;
  tone: "emerald" | "cyan" | "amber" | "rose";
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

function getCompanyName(company: FinanceCompanyListRow) {
  return company.legal_name || company.name || "Unnamed company";
}

function getCompanyCode(company: FinanceCompanyListRow) {
  return company.company_code || company.code || "—";
}

function getContactLabel(company: FinanceCompanyListRow) {
  return company.contact_person || "—";
}

function getEmailLabel(company: FinanceCompanyListRow) {
  return company.email || "—";
}

function getPhoneLabel(company: FinanceCompanyListRow) {
  return company.phone || "—";
}

function getLocationLabel(company: FinanceCompanyListRow) {
  const parts = [company.country, company.city].filter(Boolean);
  return parts.length > 0 ? parts.join(" / ") : "—";
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
  const canAccessFinance = hasPermission(permissions, "accessFinance");
  const canViewFinance = hasPermission(permissions, "viewFinance");

  return {
    isAdmin,
    canRead: canManageMasterData || canAccessFinance || canViewFinance,
    canCreate: canManageMasterData || hasPermission(permissions, "createFinanceRecords"),
    canUpdate: canManageMasterData || hasPermission(permissions, "editFinanceRecords"),
    canDeleteArchive:
      canManageMasterData || hasPermission(permissions, "archiveFinanceRecords"),
  };
}

async function loadBackendEffectivePermissions(
  userId: string,
  mode: LoadMode
): Promise<Partial<Record<Permission, boolean>> | null> {
  try {
    const result = await supabase.rpc("finance_get_effective_permissions", {
      target_user_id: userId,
    });

    if (result.error) {
      if (mode === "silent") {
        throw result.error;
      }

      console.warn("Companies permission RPC fallback:", result.error.message);
      return null;
    }

    if (!result.data || typeof result.data !== "object") {
      if (mode === "silent") {
        throw new Error(
          "Silent companies permission refresh returned no effective permission payload."
        );
      }

      return null;
    }

    return result.data as Partial<Record<Permission, boolean>>;
  } catch (error) {
    if (mode === "silent") {
      throw error;
    }

    console.warn("Companies permission RPC failed:", error);
    return null;
  }
}

function compareStrings(first: string | null | undefined, second: string | null | undefined) {
  return (first || "").localeCompare(second || "");
}

function compareDates(first: string | null | undefined, second: string | null | undefined) {
  return new Date(first || 0).getTime() - new Date(second || 0).getTime();
}

export default function FinanceMasterDataCompaniesPage() {
  const navigate = useNavigate();

  const [profile, setProfile] = useState<ProfilePermissionRow | null>(null);
  const [effectivePermissions, setEffectivePermissions] =
    useState<Record<Permission, boolean> | null>(null);
  const [companies, setCompanies] = useState<FinanceCompanyListRow[]>([]);
  const [archivedCompanies, setArchivedCompanies] = useState<
    FinanceCompanyListRow[]
  >([]);
  const [search, setSearch] = useState("");
  const [archiveSearch, setArchiveSearch] = useState("");
  const [showArchive, setShowArchive] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(true);
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
    } else {
      setBackgroundRefreshing(true);
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
            "Silent companies profile refresh returned no auth user; keeping current profile and permissions."
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
            "Silent companies profile refresh returned no profile; keeping current profile and permissions."
          );
        }

        return;
      }

      const backendPermissions = await loadBackendEffectivePermissions(authUserId, mode);

      setProfile(loadedProfile);

      if (!loadedProfile.role) {
        if (mode === "initial") {
          setEffectivePermissions(null);
        } else {
          console.warn(
            "Silent companies profile refresh returned no role; keeping current permissions."
          );
        }

        return;
      }

      const resolvedPermissions = getEffectivePermissions(
        loadedProfile.role,
        backendPermissions || loadedProfile.permissions || null
      );

      setEffectivePermissions(resolvedPermissions);
    } catch (error) {
      console.error("Failed to load companies profile permissions:", error);

      if (mode === "initial") {
        setProfile(null);
        setEffectivePermissions(null);
      }
    } finally {
      if (mode === "initial") {
        setIsLoadingProfile(false);
      } else {
        setBackgroundRefreshing(false);
      }
    }
  }, []);

  const loadCompanies = useCallback(async (mode: LoadMode = "initial") => {
    if (mode === "initial") {
      setIsLoadingCompanies(true);
      setPageError(null);
    } else {
      setBackgroundRefreshing(true);
    }

    try {
      const rows = await getCompanies();
      setCompanies(rows);

      if (mode === "initial") {
        setPageError(null);
      }
    } catch (error) {
      console.error("Failed to load finance companies:", error);

      if (mode === "initial") {
        setCompanies([]);
        setPageError(
          error instanceof Error
            ? error.message
            : "Failed to load finance companies."
        );
      }
    } finally {
      if (mode === "initial") {
        setIsLoadingCompanies(false);
      } else {
        setBackgroundRefreshing(false);
      }
    }
  }, []);

  const loadArchivedCompanies = useCallback(async (mode: LoadMode = "initial") => {
    if (mode === "initial") {
      setIsLoadingArchive(true);
      setPageError(null);
    } else {
      setBackgroundRefreshing(true);
    }

    try {
      const rows = await getArchivedCompanies();
      setArchivedCompanies(rows);

      if (mode === "initial") {
        setPageError(null);
      }
    } catch (error) {
      console.error("Failed to load archived finance companies:", error);

      if (mode === "initial") {
        setArchivedCompanies([]);
        setPageError(
          error instanceof Error
            ? error.message
            : "Failed to load archived companies."
        );
      }
    } finally {
      if (mode === "initial") {
        setIsLoadingArchive(false);
      } else {
        setBackgroundRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    void Promise.all([
      loadCurrentProfile("initial"),
      loadCompanies("initial"),
    ]);
  }, [loadCompanies, loadCurrentProfile]);

  useEffect(() => {
    const channel = supabase
      .channel("finance-master-data-companies-page")
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
        { event: "*", schema: "public", table: "finance_companies" },
        () => {
          void loadCompanies("silent");
          if (showArchive) void loadArchivedCompanies("silent");
        }
      )
      .subscribe();

    const intervalId = window.setInterval(() => {
      void Promise.all([
        loadCurrentProfile("silent"),
        loadCompanies("silent"),
        showArchive ? loadArchivedCompanies("silent") : Promise.resolve(),
      ]);
    }, 60000);

    return () => {
      window.clearInterval(intervalId);
      void supabase.removeChannel(channel);
    };
  }, [loadArchivedCompanies, loadCompanies, loadCurrentProfile, showArchive]);

  const permissionState = useMemo(() => {
    return buildPermissionState(profile, effectivePermissions);
  }, [effectivePermissions, profile]);

  const visibleCompanies = useMemo(() => {
    return companies.filter((company) => company.status !== "archived");
  }, [companies]);

  const counts = useMemo(() => {
    return {
      totalVisible: visibleCompanies.length,
      active: companies.filter((company) => company.status === "active").length,
      inactive: companies.filter((company) => company.status === "inactive").length,
      archived: companies.filter((company) => company.status === "archived").length,
      withCurrency: visibleCompanies.filter((company) =>
        Boolean(company.currency_code)
      ).length,
    };
  }, [companies, visibleCompanies]);

  const filteredCompanies = useMemo(() => {
    const query = search.trim().toLowerCase();

    return visibleCompanies
      .filter((company) => {
        if (!query) return true;

        return [
          company.code,
          company.legal_name,
          company.name,
          company.company_code,
          company.contact_person,
          company.email,
          company.phone,
          company.country,
          company.city,
          company.currency_code,
          company.status,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query));
      })
      .sort((first, second) => {
        let comparison = 0;

        if (sortKey === "company") {
          comparison = compareStrings(getCompanyName(first), getCompanyName(second));
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

        if (sortKey === "location") {
          comparison = compareStrings(
            getLocationLabel(first),
            getLocationLabel(second)
          );
        }

        if (sortKey === "currency") {
          comparison = compareStrings(first.currency_code, second.currency_code);
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
  }, [search, sortDirection, sortKey, visibleCompanies]);

  const filteredArchivedCompanies = useMemo(() => {
    const query = archiveSearch.trim().toLowerCase();

    return archivedCompanies
      .filter((company) => {
        if (!query) return true;

        return [
          company.code,
          company.legal_name,
          company.name,
          company.company_code,
          company.contact_person,
          company.email,
          company.country,
          company.city,
          company.currency_code,
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
  }, [archiveSearch, archivedCompanies]);

  const metricCards = useMemo<MetricCard[]>(() => {
    return [
      {
        key: "visible",
        title: "Visible Companies",
        value: isLoadingCompanies ? "—" : formatCount(counts.totalVisible),
        subtitle: "Active and inactive internal legal entities.",
        icon: Building2,
        tone: "cyan",
      },
      {
        key: "active",
        title: "Active",
        value: isLoadingCompanies ? "—" : formatCount(counts.active),
        subtitle: "Available for finance operations.",
        icon: CheckCircle2,
        tone: "emerald",
      },
      {
        key: "currency",
        title: "With Currency",
        value: isLoadingCompanies ? "—" : formatCount(counts.withCurrency),
        subtitle: "Companies with a default currency code.",
        icon: Globe,
        tone: "violet",
      },
      {
        key: "archived",
        title: "Archived",
        value: isLoadingCompanies ? "—" : formatCount(counts.archived),
        subtitle: "Hidden from active operational use.",
        icon: Archive,
        tone: "rose",
      },
    ];
  }, [counts, isLoadingCompanies]);

  const headerStatusCards = useMemo<HeaderStatusCardData[]>(() => {
    return [
      {
        label: "Read Access",
        value: isLoadingProfile
          ? "Checking"
          : permissionState.canRead
            ? "Enabled"
            : "Locked",
        description:
          "This page requires Finance read access or Master Data admin access.",
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
        description: backgroundRefreshing
          ? "Silent refresh is updating company records without resetting the registry."
          : "Create and Delete/Archive actions follow the Finance template.",
        icon: permissionState.canDeleteArchive ? Archive : Landmark,
        tone: permissionState.canDeleteArchive ? "amber" : "cyan",
      },
    ];
  }, [
    backgroundRefreshing,
    isLoadingProfile,
    permissionState.canCreate,
    permissionState.canDeleteArchive,
    permissionState.canRead,
  ]);

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
    await loadArchivedCompanies("initial");
    setRunningAction(null);
  }, [loadArchivedCompanies, permissionState.canDeleteArchive]);

  const closeArchiveModal = useCallback(() => {
    setShowArchive(false);
    setArchiveSearch("");
  }, []);

  const handleArchiveCompany = useCallback(
    async (companyId: string) => {
      if (!permissionState.canDeleteArchive || runningAction) return;

      setRunningAction("archive");
      setActiveActionId(companyId);
      setPageError(null);
      setPageMessage(null);

      try {
        await archiveCompany(companyId);
        await Promise.all([
          loadCompanies("silent"),
          showArchive ? loadArchivedCompanies("silent") : Promise.resolve(),
        ]);
        setPageMessage("Company archived.");
      } catch (error) {
        console.error("Failed to archive finance company:", error);
        setPageError(
          error instanceof Error ? error.message : "Failed to archive finance company."
        );
      } finally {
        setRunningAction(null);
        setActiveActionId(null);
      }
    },
    [
      loadArchivedCompanies,
      loadCompanies,
      permissionState.canDeleteArchive,
      runningAction,
      showArchive,
    ]
  );

  const handleRestoreCompany = useCallback(
    async (companyId: string) => {
      if (!permissionState.canDeleteArchive || runningAction) return;

      setRunningAction("restore");
      setActiveActionId(companyId);
      setPageError(null);
      setPageMessage(null);

      try {
        await restoreCompany(companyId);
        await Promise.all([
          loadCompanies("silent"),
          loadArchivedCompanies("silent"),
        ]);
        setPageMessage("Company restored.");
      } catch (error) {
        console.error("Failed to restore finance company:", error);
        setPageError(
          error instanceof Error ? error.message : "Failed to restore finance company."
        );
      } finally {
        setRunningAction(null);
        setActiveActionId(null);
      }
    },
    [loadArchivedCompanies, loadCompanies, permissionState.canDeleteArchive, runningAction]
  );

  const handlePermanentDeleteCompany = useCallback(
    async (companyId: string) => {
      if (!permissionState.canDeleteArchive || runningAction) return;

      const confirmed = window.confirm(
        "Permanently delete this archived company? This cannot be undone."
      );

      if (!confirmed) return;

      setRunningAction("hard-delete");
      setActiveActionId(companyId);
      setPageError(null);
      setPageMessage(null);

      try {
        await permanentlyDeleteCompany(companyId);
        await Promise.all([
          loadCompanies("silent"),
          loadArchivedCompanies("silent"),
        ]);
        setPageMessage("Archived company permanently deleted.");
      } catch (error) {
        console.error("Failed to permanently delete finance company:", error);
        setPageError(
          error instanceof Error
            ? error.message
            : "Failed to permanently delete finance company."
        );
      } finally {
        setRunningAction(null);
        setActiveActionId(null);
      }
    },
    [loadArchivedCompanies, loadCompanies, permissionState.canDeleteArchive, runningAction]
  );

  const isPageLoading = isLoadingProfile || isLoadingCompanies;
  const isActionRunning = Boolean(runningAction);

  if (isPageLoading) {
    return (
      <AixiaLoadingState
        title="Loading companies"
        description="Company records and permission state are being checked."
      />
    );
  }

  return (
    <AixiaPage>
      <AixiaHero
        parentLabel="Master Data"
        parentPath="/finance/master-data"
        badges={[
          { label: "Internal Company Master Data", tone: "cyan" },
          { label: "Live backend", tone: "emerald" },
          { label: "Permission filtered", tone: "cyan" },
          { label: "Realtime + 60s fallback", tone: "neutral" },
        ]}
        gradientTitle="Companies"
        title="Registry"
        subtitle="Internal Legal Entity Master Data"
        description="Permission-filtered registry for internal legal entities, company codes, contact details, location, currency, and finance ownership structure."
        statusCards={headerStatusCards}
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
            tone={metric.tone}
          />
        ))}
      </AixiaMetricGrid>

      {!permissionState.canRead ? (
        <AixiaSection
          title="Company Access Locked"
          description="The logged-in user does not have Company / Finance read access."
          icon={LockKeyhole}
        >
          <AixiaEmptyState
            icon={LockKeyhole}
            title="No company access is enabled"
            description="Ask an Admin to assign a Finance role template or user-specific exception with Finance read or Master Data access."
          />
        </AixiaSection>
      ) : (
        <AixiaSection
          title="Company Registry"
          description="Active and inactive companies. Archived companies are managed only through the archive modal."
          icon={Building2}
          actions={
            <AixiaRegistryToolbar
              search={
                <AixiaSearchField
                  width="wide"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search companies"
                />
              }
              primaryAction={
                permissionState.canCreate ? (
                  <AixiaButton
                    type="button"
                    variant="primary"
                    onClick={() => navigate("/finance/master-data/companies/new")}
                  >
                    <Plus className="h-4 w-4" />
                    Create Company
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
          }
        >
          {filteredCompanies.length === 0 ? (
            <AixiaEmptyState
              icon={Building2}
              title="No visible companies found"
              description="Create a company or adjust the search filter to find an internal legal entity record."
            />
          ) : (
            <AixiaTableShell variant="registry">
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
                      label="Location"
                      sortKey="location"
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
                {filteredCompanies.map((company) => {
                  const updatedAt = company.updated_at || company.created_at;
                  const isRowActionRunning = activeActionId === company.id;

                  return (
                    <tr key={company.id} className="aixia-table-row">
                      <AixiaTableTextCell
                        width="xl"
                        primary={getCompanyName(company)}
                        secondary={
                          company.name && company.name !== company.legal_name
                            ? `${company.name} • ${getCompanyCode(company)}`
                            : getCompanyCode(company)
                        }
                      />

                      <AixiaTableTextCell
                        width="md"
                        primary={getContactLabel(company)}
                      />

                      <AixiaTableTextCell
                        width="lg"
                        primary={getEmailLabel(company)}
                      />

                      <AixiaTableTextCell
                        width="md"
                        primary={getPhoneLabel(company)}
                      />

                      <AixiaTableTextCell
                        width="md"
                        primary={getLocationLabel(company)}
                      />

                      <AixiaTableBadgeCell width="sm">
                        <AixiaCurrencyBadge value={company.currency_code} />
                      </AixiaTableBadgeCell>

                      <AixiaTableBadgeCell width="sm">
                        <AixiaStatusBadge value={company.status} />
                      </AixiaTableBadgeCell>

                      <AixiaTableDateCell width="sm">
                        {formatDateLabel(updatedAt)}
                      </AixiaTableDateCell>

                      <AixiaTableActionsCell>
                        <AixiaButton
                          type="button"
                          variant="primary"
                          onClick={() =>
                            navigate(`/finance/master-data/companies/${company.id}`)
                          }
                        >
                          Open
                          <ArrowRight className="h-3.5 w-3.5" />
                        </AixiaButton>

                        {permissionState.canDeleteArchive ? (
                          <AixiaButton
                            type="button"
                            variant="danger"
                            onClick={() => void handleArchiveCompany(company.id)}
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

      <AixiaAlert tone="info">
        <AixiaAlertText
          title="Locked access rule"
          description="This registry requires Finance / Master Data read access. Create is controlled by Create access. Archive, Restore, and Permanent Delete are controlled by Delete/Archive access. Update/Edit is handled inside the company ID page. Background refresh is silent and must not move the page."
        />
      </AixiaAlert>

      <AixiaArchiveManagerModal
        open={showArchive}
        title="Archived Companies"
        description="Archived companies can be opened, restored, or permanently deleted. There is no Deleted tab because this backend uses the archived lifecycle state."
        archivedCount={archivedCompanies.length}
        onClose={closeArchiveModal}
      >
        <div className="space-y-4">
          <AixiaSearchField
            width="full"
            value={archiveSearch}
            onChange={(event) => setArchiveSearch(event.target.value)}
            placeholder="Search archived companies"
          />

          {isLoadingArchive ? (
            <AixiaEmptyState
              icon={Loader2}
              title="Loading archived companies"
              description="Archived company records are being loaded."
            />
          ) : filteredArchivedCompanies.length === 0 ? (
            <AixiaEmptyState
              icon={Archive}
              title="No archived companies"
              description="Archived internal legal entities will appear here after they are removed from active operational use."
            />
          ) : (
            <AixiaTableShell variant="archive">
              <thead className="aixia-table-head">
                <tr>
                  <th>Company</th>
                  <th>Contact</th>
                  <th>Updated</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredArchivedCompanies.map((company) => {
                  const isRowActionRunning = activeActionId === company.id;
                  const updatedAt = company.updated_at || company.created_at;

                  return (
                    <tr key={company.id} className="aixia-table-row">
                      <AixiaTableTextCell
                        width="xl"
                        primary={getCompanyName(company)}
                        secondary={`${getCompanyCode(company)} • ${getLocationLabel(company)}`}
                      />

                      <AixiaTableTextCell
                        width="md"
                        primary={getContactLabel(company)}
                      />

                      <AixiaTableDateCell width="sm">
                        {formatDateLabel(updatedAt)}
                      </AixiaTableDateCell>

                      <AixiaTableActionsCell>
                        <AixiaButton
                          type="button"
                          variant="primary"
                          onClick={() =>
                            navigate(`/finance/master-data/companies/${company.id}`)
                          }
                        >
                          Open
                        </AixiaButton>

                        <AixiaButton
                          type="button"
                          variant="secondary"
                          onClick={() => void handleRestoreCompany(company.id)}
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
                          onClick={() => void handlePermanentDeleteCompany(company.id)}
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
