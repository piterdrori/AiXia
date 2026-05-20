import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import { Archive, ArrowRight, Building2, CheckCircle2, Loader2, Mail, Plus, RotateCcw, ShieldCheck, Trash2, Users } from "lucide-react";

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
  FinancePage,
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
  AixiaCommandMetrics,
} from "@/components/aixia";

import {
  archiveClient,
  getArchivedClients,
  getClients,
  permanentlyDeleteClient,
  restoreClient,
  type FinanceClientListRow,
} from "@/lib/finance/clients";

import { type Permission, type Role } from "@/lib/permissions";

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
  | "load"
  | "archive"
  | "archive-modal"
  | "restore"
  | "hard-delete"
  | null;

type SortKey =
  | "client"
  | "code"
  | "contact"
  | "email"
  | "phone"
  | "country"
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


const CLIENT_ACCESS_CONFIG = {
  sectionKey: "masterData",
  adminPermissions: ["manageFinanceMasterData"],
  readPermissions: ["accessFinance", "viewFinance", "viewClients", "manageClients"],
  createPermissions: ["createFinanceRecords", "manageClients"],
  updatePermissions: ["editFinanceRecords", "manageClients"],
  deleteArchivePermissions: ["archiveFinanceRecords", "manageClients"],
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

function getClientName(client: FinanceClientListRow) {
  return client.legal_name || client.name || "Unnamed client";
}

function getClientCode(client: FinanceClientListRow) {
  return client.code || "—";
}

function getClientContact(client: FinanceClientListRow) {
  return client.company_related_personnel || "—";
}

function getClientEmail(client: FinanceClientListRow) {
  return client.company_email || client.personnel_email || "—";
}

function getClientPhone(client: FinanceClientListRow) {
  return client.company_phone || client.personnel_phone || "—";
}

async function loadClientEffectivePermissions(
  userId: string,
  mode: LoadMode
): Promise<Partial<Record<Permission, boolean>> | null> {
  return fetchFinanceEffectivePermissions(userId, mode, "Clients");
}

function compareStrings(first: string | null | undefined, second: string | null | undefined) {
  return (first || "").localeCompare(second || "");
}

function compareDates(first: string | null | undefined, second: string | null | undefined) {
  return new Date(first || 0).getTime() - new Date(second || 0).getTime();
}

export default function FinanceMasterDataClientsPage() {
  const navigate = useNavigate();

  const [profile, setProfile] = useState<ProfilePermissionRow | null>(null);
  const [effectivePermissions, setEffectivePermissions] =
    useState<Record<Permission, boolean> | null>(null);
  const [clients, setClients] = useState<FinanceClientListRow[]>([]);
  const [archivedClients, setArchivedClients] = useState<FinanceClientListRow[]>([]);
  const [search, setSearch] = useState("");
  const [archiveSearch, setArchiveSearch] = useState("");
  const [showArchive, setShowArchive] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isLoadingClients, setIsLoadingClients] = useState(true);
  const [isLoadingArchive, setIsLoadingArchive] = useState(false);
  const [, setBackgroundRefreshing] = useState(false);
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
            "Silent clients profile refresh returned no auth user; keeping current profile and permissions."
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
            "Silent clients profile refresh returned no profile; keeping current profile and permissions."
          );
        }

        return;
      }

      const backendPermissions = await loadClientEffectivePermissions(authUserId, mode);

      setProfile(loadedProfile);

      if (!loadedProfile.role) {
        if (mode === "initial") {
          setEffectivePermissions(null);
        } else {
          console.warn(
            "Silent clients profile refresh returned no role; keeping current permissions."
          );
        }

        return;
      }

      const resolvedPermissions = backendPermissions || loadedProfile.permissions || null;

      if (!resolvedPermissions && mode === "silent") {
        console.warn(
          "Silent clients permission refresh returned no permission payload; keeping current permissions."
        );
        return;
      }

      setEffectivePermissions(
        resolvedPermissions as Record<Permission, boolean> | null
      );
    } catch (error) {
      console.error("Failed to load clients profile permissions:", error);

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

  const loadClients = useCallback(async (mode: LoadMode = "initial") => {
    if (mode === "initial") {
      setIsLoadingClients(true);
      setPageError(null);
    } else {
      setBackgroundRefreshing(true);
    }

    try {
      const rows = await getClients();
      setClients(rows);

      if (mode === "initial") {
        setPageError(null);
      }
    } catch (error) {
      console.error("Failed to load finance clients:", error);

      if (mode === "initial") {
        setClients([]);
        setPageError(
          error instanceof Error ? error.message : "Failed to load finance clients."
        );
      }
    } finally {
      if (mode === "initial") {
        setIsLoadingClients(false);
      } else {
        setBackgroundRefreshing(false);
      }
    }
  }, []);

  const loadArchivedClients = useCallback(async (mode: LoadMode = "initial") => {
    if (mode === "initial") {
      setIsLoadingArchive(true);
      setPageError(null);
    } else {
      setBackgroundRefreshing(true);
    }

    try {
      const rows = await getArchivedClients();
      setArchivedClients(rows);

      if (mode === "initial") {
        setPageError(null);
      }
    } catch (error) {
      console.error("Failed to load archived finance clients:", error);

      if (mode === "initial") {
        setArchivedClients([]);
        setPageError(
          error instanceof Error ? error.message : "Failed to load archived clients."
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
      loadClients("initial"),
    ]);
  }, [loadClients, loadCurrentProfile]);

  useEffect(() => {
    const channel = supabase
      .channel("finance-master-data-clients-page")
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
        { event: "*", schema: "public", table: "finance_clients" },
        () => {
          void loadClients("silent");
          if (showArchive) void loadArchivedClients("silent");
        }
      )
      .subscribe();

    const intervalId = window.setInterval(() => {
      void Promise.all([
        loadCurrentProfile("silent"),
        loadClients("silent"),
        showArchive ? loadArchivedClients("silent") : Promise.resolve(),
      ]);
    }, 60000);

    return () => {
      window.clearInterval(intervalId);
      void supabase.removeChannel(channel);
    };
  }, [loadArchivedClients, loadClients, loadCurrentProfile, showArchive]);

  const permissionState = useMemo(() => {
    return resolveFinancePagePermissionState({
      profileRole: profile?.role,
      permissions: effectivePermissions,
      config: CLIENT_ACCESS_CONFIG,
    });
  }, [effectivePermissions, profile]);

  const visibleClients = useMemo(() => {
    return clients.filter((client) => client.status !== "archived");
  }, [clients]);

  const counts = useMemo(() => {
    return {
      totalVisible: visibleClients.length,
      active: clients.filter((client) => client.status === "active").length,
      inactive: clients.filter((client) => client.status === "inactive").length,
      archived: clients.filter((client) => client.status === "archived").length,
      withEmail: visibleClients.filter(
        (client) => Boolean(client.company_email || client.personnel_email)
      ).length,
    };
  }, [clients, visibleClients]);

  const filteredClients = useMemo(() => {
    const query = search.trim().toLowerCase();

    return visibleClients
      .filter((client) => {
        if (!query) return true;

        return [
          client.code,
          client.legal_name,
          client.name,
          client.company_related_personnel,
          client.company_email,
          client.personnel_email,
          client.company_phone,
          client.personnel_phone,
          client.country,
          client.status,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query));
      })
      .sort((first, second) => {
        let comparison = 0;

        if (sortKey === "client") {
          comparison = compareStrings(getClientName(first), getClientName(second));
        }

        if (sortKey === "code") {
          comparison = compareStrings(first.code, second.code);
        }

        if (sortKey === "contact") {
          comparison = compareStrings(
            getClientContact(first),
            getClientContact(second)
          );
        }

        if (sortKey === "email") {
          comparison = compareStrings(getClientEmail(first), getClientEmail(second));
        }

        if (sortKey === "phone") {
          comparison = compareStrings(getClientPhone(first), getClientPhone(second));
        }

        if (sortKey === "country") {
          comparison = compareStrings(first.country, second.country);
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
  }, [search, sortDirection, sortKey, visibleClients]);

  const filteredArchivedClients = useMemo(() => {
    const query = archiveSearch.trim().toLowerCase();

    return archivedClients
      .filter((client) => {
        if (!query) return true;

        return [
          client.code,
          client.legal_name,
          client.name,
          client.company_related_personnel,
          client.company_email,
          client.personnel_email,
          client.company_phone,
          client.personnel_phone,
          client.country,
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
  }, [archiveSearch, archivedClients]);

  const metricCards = useMemo<MetricCard[]>(() => {
    return [
      {
        key: "visible",
        title: "Visible Clients",
        value: isLoadingClients ? "—" : formatCount(counts.totalVisible),
        subtitle: "Active and inactive finance client records.",
        icon: Users,
        tone: "cyan",
      },
      {
        key: "active",
        title: "Active",
        value: isLoadingClients ? "—" : formatCount(counts.active),
        subtitle: "Available for finance document flows.",
        icon: CheckCircle2,
        tone: "emerald",
      },
      {
        key: "with-email",
        title: "With Email",
        value: isLoadingClients ? "—" : formatCount(counts.withEmail),
        subtitle: "Visible clients with at least one email.",
        icon: Mail,
        tone: "violet",
      },
      {
        key: "archived",
        title: "Archived",
        value: isLoadingClients ? "—" : formatCount(counts.archived),
        subtitle: "Hidden from active operational use.",
        icon: Archive,
        tone: "rose",
      },
    ];
  }, [counts, isLoadingClients]);

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
    await loadArchivedClients("initial");
    setRunningAction(null);
  }, [loadArchivedClients, permissionState.canDeleteArchive]);

  const closeArchiveModal = useCallback(() => {
    setShowArchive(false);
    setArchiveSearch("");
  }, []);

  const handleArchiveClient = useCallback(
    async (clientId: string) => {
      if (!permissionState.canDeleteArchive || runningAction) return;

      setRunningAction("archive");
      setActiveActionId(clientId);
      setPageError(null);
      setPageMessage(null);

      try {
        await archiveClient(clientId);
        await Promise.all([
          loadClients("silent"),
          showArchive ? loadArchivedClients("silent") : Promise.resolve(),
        ]);
        setPageMessage("Client archived.");
      } catch (error) {
        console.error("Failed to archive finance client:", error);
        setPageError(
          error instanceof Error ? error.message : "Failed to archive finance client."
        );
      } finally {
        setRunningAction(null);
        setActiveActionId(null);
      }
    },
    [
      loadArchivedClients,
      loadClients,
      permissionState.canDeleteArchive,
      runningAction,
      showArchive,
    ]
  );

  const handleRestoreClient = useCallback(
    async (clientId: string) => {
      if (!permissionState.canDeleteArchive || runningAction) return;

      setRunningAction("restore");
      setActiveActionId(clientId);
      setPageError(null);
      setPageMessage(null);

      try {
        await restoreClient(clientId);
        await Promise.all([loadClients("silent"), loadArchivedClients("silent")]);
        setPageMessage("Client restored.");
      } catch (error) {
        console.error("Failed to restore finance client:", error);
        setPageError(
          error instanceof Error ? error.message : "Failed to restore finance client."
        );
      } finally {
        setRunningAction(null);
        setActiveActionId(null);
      }
    },
    [loadArchivedClients, loadClients, permissionState.canDeleteArchive, runningAction]
  );

  const handlePermanentDeleteClient = useCallback(
    async (clientId: string) => {
      if (!permissionState.canDeleteArchive || runningAction) return;

      const confirmed = window.confirm(
        "Permanently delete this archived client? This cannot be undone."
      );

      if (!confirmed) return;

      setRunningAction("hard-delete");
      setActiveActionId(clientId);
      setPageError(null);
      setPageMessage(null);

      try {
        await permanentlyDeleteClient(clientId);
        await Promise.all([loadClients("silent"), loadArchivedClients("silent")]);
        setPageMessage("Archived client permanently deleted.");
      } catch (error) {
        console.error("Failed to permanently delete finance client:", error);
        setPageError(
          error instanceof Error
            ? error.message
            : "Failed to permanently delete finance client."
        );
      } finally {
        setRunningAction(null);
        setActiveActionId(null);
      }
    },
    [loadArchivedClients, loadClients, permissionState.canDeleteArchive, runningAction]
  );

  const isPageLoading = isLoadingProfile || isLoadingClients;
  const isActionRunning = Boolean(runningAction);

  if (isPageLoading) {
    return (
      <AixiaLoadingState
        title="Loading clients"
        description="Client records and permission state are being checked."
      />
    );
  }

  return (
    <FinancePage>
      <AixiaHero
        className="shrink-0 space-y-4"
        surface="command"
        parentLabel="Master Data"
        parentPath="/finance/master-data"
        gradientTitle="Clients"
        title="Registry"
        subtitle="Finance Customer Master Data">
        <AixiaCommandMetrics items={metricCards} />
      </AixiaHero>

      <div className="aixia-command-scroll">
{pageError ? <AixiaAlert tone="error">{pageError}</AixiaAlert> : null}
      {pageMessage ? <AixiaAlert tone="success">{pageMessage}</AixiaAlert> : null}

      

      {!permissionState.canRead ? (
        <AixiaAccessDeniedState
          title="No client finance access"
          description="Ask an Admin to assign a Finance role template or user-specific exception with Client read access."
        />
      ) : (
        <AixiaSection
          title="Client Registry"
          description="Active and inactive clients. Archived clients are managed only through the archive modal."
          icon={Users}
        >
          <AixiaRegistryToolbar
            search={
              <AixiaSearchField
                width="wide"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search clients"
              />
            }
            primaryAction={
              permissionState.canCreate ? (
                <AixiaButton
                  type="button"
                  variant="primary"
                  onClick={() => navigate("/finance/master-data/clients/new")}
                >
                  <Plus className="h-4 w-4" />
                  Create Client
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
          {filteredClients.length === 0 ? (
            <AixiaEmptyState
              icon={Building2}
              title="No visible clients found"
              description="Create a client or adjust the search filter to find a finance client record."
            />
          ) : (
            <AixiaTableShell variant="registry">
              <thead className="aixia-table-head">
                <tr>
                  <th>
                    <AixiaSortableHeader
                      label="Client"
                      sortKey="client"
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
                {filteredClients.map((client) => {
                  const updatedAt = client.updated_at || client.created_at;
                  const isRowActionRunning = activeActionId === client.id;

                  return (
                    <tr key={client.id} className="aixia-table-row">
                      <AixiaTableTextCell
                        width="xl"
                        primary={getClientName(client)}
                        secondary={
                          client.name && client.name !== client.legal_name
                            ? client.name
                            : "Finance client"
                        }
                      />

                      <AixiaTableBadgeCell width="sm">
                        <AixiaBadge tone="neutral">{getClientCode(client)}</AixiaBadge>
                      </AixiaTableBadgeCell>

                      <AixiaTableTextCell
                        width="md"
                        primary={getClientContact(client)}
                      />

                      <AixiaTableTextCell
                        width="lg"
                        primary={getClientEmail(client)}
                      />

                      <AixiaTableTextCell
                        width="md"
                        primary={getClientPhone(client)}
                      />

                      <AixiaTableTextCell
                        width="sm"
                        primary={client.country || "—"}
                      />

                      <AixiaTableBadgeCell width="sm">
                        <AixiaStatusBadge value={client.status} />
                      </AixiaTableBadgeCell>

                      <AixiaTableDateCell width="sm">
                        {formatDateLabel(updatedAt)}
                      </AixiaTableDateCell>

                      <AixiaTableActionsCell>
                        <AixiaButton
                          type="button"
                          variant="primary"
                          onClick={() =>
                            navigate(`/finance/master-data/clients/${client.id}`)
                          }
                        >
                          Open
                          <ArrowRight className="h-3.5 w-3.5" />
                        </AixiaButton>

                        {permissionState.canDeleteArchive ? (
                          <AixiaButton
                            type="button"
                            variant="danger"
                            onClick={() => void handleArchiveClient(client.id)}
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

      <AixiaAccessRule
        title="Locked access rule"
        description="Client registry lifecycle and permission controls are locked to the shared AiXia registry standard."
        icon={ShieldCheck}
      >
        This registry requires Client Read access. Active and inactive client
        records stay in the main registry. Archived records are managed only from
        the archive modal. Create is controlled by Create access. Archive,
        Restore, and Delete Permanently are controlled by Delete/Archive access.
        Update/Edit is handled inside the client ID page. Realtime and 60-second
        fallback refresh must stay silent and must not reset search, sorting,
        archive modal state, or visible records.
      </AixiaAccessRule>

      <AixiaArchiveManagerModal
        open={showArchive}
        title="Archived Clients"
        description="Archived clients can be opened, restored, or permanently deleted. There is no Deleted tab because this backend uses the archived lifecycle state."
        archivedCount={archivedClients.length}
        onClose={closeArchiveModal}
      >
        <div className="space-y-4">
          <AixiaSearchField
            width="full"
            value={archiveSearch}
            onChange={(event) => setArchiveSearch(event.target.value)}
            placeholder="Search archived clients"
          />

          {isLoadingArchive ? (
            <AixiaEmptyState
              icon={Loader2}
              title="Loading archived clients"
              description="Archived client records are being loaded."
            />
          ) : filteredArchivedClients.length === 0 ? (
            <AixiaEmptyState
              icon={Archive}
              title="No archived clients"
              description="Archived finance clients will appear here after they are removed from active operational use."
            />
          ) : (
            <AixiaTableShell variant="archive">
              <thead className="aixia-table-head">
                <tr>
                  <th>Client</th>
                  <th>Code</th>
                  <th>Contact</th>
                  <th>Updated</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredArchivedClients.map((client) => {
                  const isRowActionRunning = activeActionId === client.id;
                  const updatedAt = client.updated_at || client.created_at;

                  return (
                    <tr key={client.id} className="aixia-table-row">
                      <AixiaTableTextCell
                        width="xl"
                        primary={getClientName(client)}
                        secondary={client.country || "No country"}
                      />

                      <AixiaTableBadgeCell width="sm">
                        <AixiaBadge tone="neutral">{getClientCode(client)}</AixiaBadge>
                      </AixiaTableBadgeCell>

                      <AixiaTableTextCell
                        width="md"
                        primary={getClientContact(client)}
                      />

                      <AixiaTableDateCell width="sm">
                        {formatDateLabel(updatedAt)}
                      </AixiaTableDateCell>

                      <AixiaTableActionsCell>
                        <AixiaButton
                          type="button"
                          variant="primary"
                          onClick={() =>
                            navigate(`/finance/master-data/clients/${client.id}`)
                          }
                        >
                          Open
                        </AixiaButton>

                        <AixiaButton
                          type="button"
                          variant="secondary"
                          onClick={() => void handleRestoreClient(client.id)}
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
                          onClick={() => void handlePermanentDeleteClient(client.id)}
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
      </div>
    </FinancePage>
  );
}
