import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  KeyRound,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  UserRound,
  UsersRound,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import {
  AixiaAccessDeniedState,
  AixiaAccessRule,
  AixiaAlert,
  AixiaBadge,
  AixiaButton,
  AixiaHero,
  AixiaInfoBlock,
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
  AixiaValueBlock,
} from "@/components/aixia";
import {
  ACCESS_APPROVAL_GROUPS,
  ACCESS_APPROVAL_SECTIONS,
  countAvailableLevelsForGroup,
  countTotalLevelsForGroup,
  createEmptyAccessStateMap,
  getEffectiveAccessLabel,
  getSectionLevelState,
  getSectionsForGroup,
  type AccessApprovalEffectiveLabel,
  type AccessApprovalGroupKey,
  type AccessApprovalSectionKey,
  type AccessLevelState,
} from "@/lib/accessFinancialApprovalPermissions";
import {
  fetchFinanceEffectivePermissions,
  resolveFinancePagePermissionState,
  type FinanceLoadMode,
  type FinancePagePermissionState,
} from "@/lib/finance/pageAccess";
import type { Permission, Role } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";

type ProfileStatus =
  | "pending_verification"
  | "pending_profile"
  | "pending_approval"
  | "active"
  | "rejected"
  | string;

type AixiaTone =
  | "indigo"
  | "violet"
  | "gold"
  | "amber"
  | "emerald"
  | "cyan"
  | "rose"
  | "neutral";

type AccessUserRow = {
  user_id: string;
  full_name: string | null;
  role: Role;
  status: ProfileStatus | null;
  requested_role: Role | null;
  permissions: Partial<Record<Permission, boolean>> | null;
  created_at: string;
  updated_at: string | null;
};

type CurrentProfileRow = {
  role: Role;
};

type FinancePermissionTemplateRow = {
  id: string;
  template_key: string;
  template_name: string;
  description: string | null;
  permissions: Partial<Record<Permission, boolean>> | null;
  is_system: boolean;
  is_active: boolean;
};

type FinanceUserPermissionTemplateRow = {
  user_id: string;
  template_id: string;
};

type GroupSummary = {
  groupKey: AccessApprovalGroupKey;
  title: string;
  enabledLevels: number;
  totalLevels: number;
  highestAccessLabel: AccessApprovalEffectiveLabel;
};

type AccessUserViewModel = AccessUserRow & {
  financeTemplate: FinancePermissionTemplateRow | null;
  templatePermissionOverrides: Partial<Record<Permission, boolean>>;
  effectivePermissions: Partial<Record<Permission, boolean>>;
  accessStates: Record<AccessApprovalSectionKey, AccessLevelState>;
  groupSummaries: GroupSummary[];
  enabledLevelCount: number;
  totalLevelCount: number;
  templatePermissionCount: number;
  userOverrideCount: number;
  approveExecuteSectionCount: number;
  highestAccessLabel: AccessApprovalEffectiveLabel;
};

type SortKey =
  | "name"
  | "role"
  | "template"
  | "effective"
  | "overrides"
  | "updated";

type SortDirection = "asc" | "desc";

const PAGE_ACCESS_CONFIG = {
  sectionKey: "accessApprovals",
  adminPermissions: ["manageUsers"],
  readPermissions: ["accessApprovals", "manageUsers"],
  createPermissions: ["manageUsers"],
  updatePermissions: ["manageUsers"],
  deleteArchivePermissions: ["manageUsers"],
  approveExecutePermissions: ["manageUsers"],
} as const;

const effectiveAccessToneMap: Record<AccessApprovalEffectiveLabel, AixiaTone> = {
  "No Company Access": "neutral",
  "Can Read Section": "cyan",
  "Can Create Records": "violet",
  "Can Update Records": "amber",
  "Can Delete / Archive": "rose",
  "Can Approve / Execute": "emerald",
  "Admin Only": "rose",
};

function formatCount(value: number) {
  return value.toLocaleString();
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return parsed.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function coercePermissionMap(
  value: Partial<Record<Permission, boolean>> | null | undefined
): Partial<Record<Permission, boolean>> {
  if (!value || typeof value !== "object") {
    return {};
  }

  return value;
}

function countEnabledPermissions(
  permissions: Partial<Record<Permission, boolean>> | null | undefined
) {
  return Object.values(coercePermissionMap(permissions)).filter(Boolean).length;
}

function getHighestAccessLabel(
  states: Record<AccessApprovalSectionKey, AccessLevelState>,
  groupKey?: AccessApprovalGroupKey
): AccessApprovalEffectiveLabel {
  const sections = groupKey ? getSectionsForGroup(groupKey) : ACCESS_APPROVAL_SECTIONS;

  const labels = sections.map((section) =>
    getEffectiveAccessLabel(section, states[section.key])
  );

  if (labels.includes("Admin Only")) return "Admin Only";
  if (labels.includes("Can Approve / Execute")) return "Can Approve / Execute";
  if (labels.includes("Can Delete / Archive")) return "Can Delete / Archive";
  if (labels.includes("Can Update Records")) return "Can Update Records";
  if (labels.includes("Can Create Records")) return "Can Create Records";
  if (labels.includes("Can Read Section")) return "Can Read Section";

  return "No Company Access";
}

function buildGroupSummaries(
  accessStates: Record<AccessApprovalSectionKey, AccessLevelState>
) {
  return ACCESS_APPROVAL_GROUPS.map((group) => ({
    groupKey: group.key,
    title: group.title,
    enabledLevels: countAvailableLevelsForGroup(group.key, accessStates),
    totalLevels: countTotalLevelsForGroup(group.key),
    highestAccessLabel: getHighestAccessLabel(accessStates, group.key),
  }));
}

function buildUserViewModel({
  user,
  financeTemplate,
  effectivePermissions,
}: {
  user: AccessUserRow;
  financeTemplate: FinancePermissionTemplateRow | null;
  effectivePermissions: Partial<Record<Permission, boolean>> | null | undefined;
}): AccessUserViewModel {
  const templatePermissionOverrides = coercePermissionMap(
    financeTemplate?.permissions || null
  );
  const resolvedEffectivePermissions = coercePermissionMap(effectivePermissions);
  const userPermissionOverrides = coercePermissionMap(user.permissions || null);

  const accessStates = ACCESS_APPROVAL_SECTIONS.reduce(
    (map, section) => {
      map[section.key] = getSectionLevelState(
        section,
        resolvedEffectivePermissions as Record<Permission, boolean>
      );
      return map;
    },
    createEmptyAccessStateMap()
  );

  const groupSummaries = buildGroupSummaries(accessStates);
  const enabledLevelCount = groupSummaries.reduce(
    (total, summary) => total + summary.enabledLevels,
    0
  );
  const totalLevelCount = groupSummaries.reduce(
    (total, summary) => total + summary.totalLevels,
    0
  );

  return {
    ...user,
    financeTemplate,
    templatePermissionOverrides,
    effectivePermissions: resolvedEffectivePermissions,
    accessStates,
    groupSummaries,
    enabledLevelCount,
    totalLevelCount,
    templatePermissionCount: countEnabledPermissions(templatePermissionOverrides),
    userOverrideCount: Object.keys(userPermissionOverrides).length,
    approveExecuteSectionCount: ACCESS_APPROVAL_SECTIONS.filter(
      (section) => accessStates[section.key]?.approveExecute
    ).length,
    highestAccessLabel: getHighestAccessLabel(accessStates),
  };
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

function FinanceAccessBadge({
  value,
}: {
  value: AccessApprovalEffectiveLabel;
}) {
  return <AixiaBadge tone={effectiveAccessToneMap[value]}>{value}</AixiaBadge>;
}

export default function FinanceAccessApprovalsPage() {
  const navigate = useNavigate();

  const [users, setUsers] = useState<AccessUserRow[]>([]);
  const [currentUser, setCurrentUser] = useState<CurrentProfileRow | null>(null);
  const [currentPagePermissionState, setCurrentPagePermissionState] =
    useState<FinancePagePermissionState | null>(null);
  const [userEffectivePermissionsById, setUserEffectivePermissionsById] =
    useState<Record<string, Partial<Record<Permission, boolean>>>>({});
  const [financeTemplates, setFinanceTemplates] = useState<
    FinancePermissionTemplateRow[]
  >([]);
  const [userTemplateAssignments, setUserTemplateAssignments] = useState<
    FinanceUserPermissionTemplateRow[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [accessDeniedReason, setAccessDeniedReason] = useState<string | null>(null);
  const [searchValue, setSearchValue] = useState("");
  const [templateFilter, setTemplateFilter] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("updated");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const loadUsers = useCallback(async (mode: FinanceLoadMode = "initial") => {
    if (mode === "initial") {
      setIsLoading(true);
      setPageError(null);
      setAccessDeniedReason(null);
    } else {
      setIsRefreshing(true);
    }

    try {
      const authResult = await supabase.auth.getUser();
      if (authResult.error) throw authResult.error;

      const authUserId = authResult.data.user?.id;

      if (!authUserId) {
        if (mode === "initial") {
          setAccessDeniedReason(
            "You must be logged in to manage Finance Access Approvals."
          );
          setUsers([]);
          setCurrentUser(null);
          setCurrentPagePermissionState(null);
          setUserEffectivePermissionsById({});
        }
        return;
      }

      const [currentUserResult, currentEffectivePermissions] = await Promise.all([
        supabase
          .from("profiles")
          .select("role")
          .eq("user_id", authUserId)
          .maybeSingle(),

        fetchFinanceEffectivePermissions(
          authUserId,
          mode,
          "Finance Access Approvals Current User"
        ),
      ]);

      if (currentUserResult.error) throw currentUserResult.error;

      const currentProfile = currentUserResult.data as CurrentProfileRow | null;

      if (!currentProfile) {
        if (mode === "initial") {
          setPageError("Current user profile was not found.");
          setUsers([]);
          setCurrentUser(null);
          setCurrentPagePermissionState(null);
          setUserEffectivePermissionsById({});
        }
        return;
      }

      const permissionState = resolveFinancePagePermissionState({
        profileRole: currentProfile.role,
        permissions: currentEffectivePermissions,
        config: PAGE_ACCESS_CONFIG,
      });

      if (!permissionState.isAdmin || !permissionState.canRead) {
        setCurrentUser(currentProfile);
        setCurrentPagePermissionState(permissionState);

        if (mode === "initial") {
          setAccessDeniedReason(
            "Admin access is required to open Finance Access Approvals."
          );
          setUsers([]);
          setUserEffectivePermissionsById({});
        }

        return;
      }

      const [usersResult, templatesResult, assignmentsResult] = await Promise.all([
        supabase
          .from("profiles")
          .select(
            "user_id, full_name, role, status, requested_role, permissions, created_at, updated_at"
          )
          .eq("status", "active")
          .order("updated_at", { ascending: false }),

        supabase
          .from("finance_permission_templates")
          .select(
            "id, template_key, template_name, description, permissions, is_system, is_active"
          )
          .eq("is_active", true)
          .order("template_name", { ascending: true }),

        supabase.from("finance_user_permission_templates").select("user_id, template_id"),
      ]);

      if (usersResult.error) throw usersResult.error;
      if (templatesResult.error) throw templatesResult.error;
      if (assignmentsResult.error) throw assignmentsResult.error;

      const loadedUsers = (usersResult.data || []) as AccessUserRow[];

      const permissionEntries = await Promise.all(
        loadedUsers.map(async (user) => {
          const effectivePermissions = await fetchFinanceEffectivePermissions(
            user.user_id,
            mode,
            `Finance Access Approvals User ${user.user_id}`
          );

          return [user.user_id, coercePermissionMap(effectivePermissions)] as const;
        })
      );

      setCurrentUser(currentProfile);
      setCurrentPagePermissionState(permissionState);
      setUsers(loadedUsers);
      setFinanceTemplates((templatesResult.data || []) as FinancePermissionTemplateRow[]);
      setUserTemplateAssignments(
        (assignmentsResult.data || []) as FinanceUserPermissionTemplateRow[]
      );
      setUserEffectivePermissionsById(Object.fromEntries(permissionEntries));
      setPageError(null);
      setAccessDeniedReason(null);
    } catch (error) {
      console.error("Failed to load Finance Access Approvals:", error);

      if (mode === "initial") {
        setPageError(
          error instanceof Error ? error.message : "Failed to load Finance Access Approvals."
        );
        setUsers([]);
        setUserEffectivePermissionsById({});
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadUsers("initial");
  }, [loadUsers]);

  useEffect(() => {
    const profilesChannel = supabase
      .channel("finance-access-approvals-profiles")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        () => void loadUsers("silent")
      )
      .subscribe();

    const templatesChannel = supabase
      .channel("finance-access-approvals-templates")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_permission_templates" },
        () => void loadUsers("silent")
      )
      .subscribe();

    const assignmentsChannel = supabase
      .channel("finance-access-approvals-template-assignments")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_user_permission_templates" },
        () => void loadUsers("silent")
      )
      .subscribe();

    const intervalId = window.setInterval(() => {
      void loadUsers("silent");
    }, 60000);

    return () => {
      window.clearInterval(intervalId);
      supabase.removeChannel(profilesChannel);
      supabase.removeChannel(templatesChannel);
      supabase.removeChannel(assignmentsChannel);
    };
  }, [loadUsers]);

  const templateById = useMemo(() => {
    return financeTemplates.reduce(
      (map, template) => {
        map[template.id] = template;
        return map;
      },
      {} as Record<string, FinancePermissionTemplateRow>
    );
  }, [financeTemplates]);

  const customTemplate = useMemo(() => {
    return financeTemplates.find((template) => template.template_key === "custom") || null;
  }, [financeTemplates]);

  const assignmentByUserId = useMemo(() => {
    return userTemplateAssignments.reduce(
      (map, assignment) => {
        map[assignment.user_id] = assignment;
        return map;
      },
      {} as Record<string, FinanceUserPermissionTemplateRow>
    );
  }, [userTemplateAssignments]);

  const userRows = useMemo(() => {
    return users.map((user) => {
      const assignment = assignmentByUserId[user.user_id];
      const financeTemplate = assignment?.template_id
        ? templateById[assignment.template_id] || customTemplate
        : customTemplate;

      return buildUserViewModel({
        user,
        financeTemplate,
        effectivePermissions: userEffectivePermissionsById[user.user_id],
      });
    });
  }, [
    assignmentByUserId,
    customTemplate,
    templateById,
    userEffectivePermissionsById,
    users,
  ]);

  const hasAdminAccess = useMemo(() => {
    if (!currentUser || !currentPagePermissionState) return false;
    return Boolean(currentPagePermissionState.isAdmin && currentPagePermissionState.canRead);
  }, [currentPagePermissionState, currentUser]);

  const financeTemplateAssignedCount = useMemo(() => {
    return userRows.filter((user) => user.financeTemplate?.template_key !== "custom")
      .length;
  }, [userRows]);

  const approveExecuteUserCount = useMemo(() => {
    return userRows.filter((user) => user.approveExecuteSectionCount > 0).length;
  }, [userRows]);

  const overrideUserCount = useMemo(() => {
    return userRows.filter((user) => user.userOverrideCount > 0).length;
  }, [userRows]);

  const templateOptions = useMemo(() => {
    return ["all", ...financeTemplates.map((template) => template.id)];
  }, [financeTemplates]);

  const filteredRows = useMemo(() => {
    const normalizedSearch = searchValue.trim().toLowerCase();

    return userRows
      .filter((user) => {
        if (templateFilter !== "all" && user.financeTemplate?.id !== templateFilter) {
          return false;
        }

        if (!normalizedSearch) return true;

        return [
          user.full_name,
          user.role,
          user.user_id,
          user.financeTemplate?.template_name,
          user.highestAccessLabel,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(normalizedSearch));
      })
      .sort((first, second) => {
        let comparison = 0;

        if (sortKey === "name") {
          comparison = compareStrings(first.full_name, second.full_name);
        }

        if (sortKey === "role") {
          comparison = compareStrings(first.role, second.role);
        }

        if (sortKey === "template") {
          comparison = compareStrings(
            first.financeTemplate?.template_name,
            second.financeTemplate?.template_name
          );
        }

        if (sortKey === "effective") {
          comparison = compareStrings(first.highestAccessLabel, second.highestAccessLabel);
        }

        if (sortKey === "overrides") {
          comparison = first.userOverrideCount - second.userOverrideCount;
        }

        if (sortKey === "updated") {
          comparison = compareDates(
            first.updated_at || first.created_at,
            second.updated_at || second.created_at
          );
        }

        return sortDirection === "asc" ? comparison : -comparison;
      });
  }, [searchValue, sortDirection, sortKey, templateFilter, userRows]);

  const overviewItems = useMemo(() => {
    return [
      {
        label: "Base Roles",
        value: "Admin / Manager / Employee / Guest",
        detail: "System role remains separate from Finance template access.",
      },
      {
        label: "Finance Templates",
        value: formatCount(financeTemplates.length),
        detail:
          "Finance Admin, Finance Manager, Finance Viewer, Procurement Operator, Expense Approver, Payroll Operator, Reports Viewer, and Custom.",
      },
      {
        label: "Visible Rows",
        value: formatCount(filteredRows.length),
        detail: "Only active profiles after current search and filter settings.",
      },
      {
        label: "Auto Refresh",
        value: isRefreshing ? "Refreshing" : "Realtime + 60s",
        detail: "Profiles, templates, and template assignments refresh automatically.",
      },
    ];
  }, [filteredRows.length, financeTemplates.length, isRefreshing]);

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

  if (isLoading) {
    return (
      <AixiaLoadingState
        title="Loading Finance Access Approvals"
        description="Active users, finance templates, assignments, and effective permissions are being checked."
        fullPage
      />
    );
  }

  if (!hasAdminAccess && accessDeniedReason) {
    return (
      <AixiaAccessDeniedState
        title="Finance Access Approvals is restricted"
        description={accessDeniedReason}
        fullPage
        action={
          <AixiaButton
            type="button"
            variant="secondary"
            onClick={() => navigate("/finance")}
          >
            <ArrowRight className="h-4 w-4 rotate-180" />
            Finance
          </AixiaButton>
        }
      />
    );
  }

  return (
    <AixiaPage>
      <AixiaHero
        parentLabel="Finance"
        parentPath="/finance"
        gradientTitle="Finance Access"
        title="Approvals"
        description="Review active users through a clean base role plus Finance role template model. Open a user to adjust the selected template and user-specific permission exceptions."
        badges={[
          { label: "Admin Finance Access Control", tone: "cyan" },
          { label: "Active profiles only", tone: "cyan" },
          { label: "Finance templates enabled", tone: "violet" },
          { label: "Own records default protected", tone: "emerald" },
          ...(isRefreshing ? [{ label: "Silent refresh", tone: "neutral" as const }] : []),
        ]}
        statusCards={[
          {
            label: "Registry Scope",
            value: "Active Users",
            description:
              "Pending, rejected, and inactive profiles are excluded from this Finance access registry.",
            icon: UserRound,
            tone: "cyan",
          },
          {
            label: "Finance Templates",
            value: formatCount(financeTemplates.length),
            description:
              "Templates define the baseline Finance access. User overrides are exceptions only.",
            icon: ShieldCheck,
            tone: "violet",
          },
        ]}
      >
        <AixiaBadge tone="cyan">
          <Sparkles className="h-3.5 w-3.5" />
          Permission registry
        </AixiaBadge>
      </AixiaHero>

      {pageError ? <AixiaAlert tone="error">{pageError}</AixiaAlert> : null}

      {!hasAdminAccess && !pageError ? (
        <AixiaAlert tone="error">
          Admin access is required to manage Finance Access Approvals.
        </AixiaAlert>
      ) : null}

      <AixiaMetricGrid>
        <AixiaMetricCard
          label="Active Users"
          value={isLoading ? "—" : formatCount(userRows.length)}
          description="Only active profiles are shown in this registry."
          icon={UsersRound}
          tone="cyan"
        />
        <AixiaMetricCard
          label="Template Assigned"
          value={isLoading ? "—" : formatCount(financeTemplateAssignedCount)}
          description="Users assigned to non-Custom Finance templates."
          icon={ShieldCheck}
          tone="violet"
        />
        <AixiaMetricCard
          label="Approve / Execute"
          value={isLoading ? "—" : formatCount(approveExecuteUserCount)}
          description="Users with final workflow action access."
          icon={KeyRound}
          tone="emerald"
        />
        <AixiaMetricCard
          label="User Overrides"
          value={isLoading ? "—" : formatCount(overrideUserCount)}
          description="Users with direct exception permissions."
          icon={UserRound}
          tone="rose"
        />
      </AixiaMetricGrid>

      <AixiaMetricGrid>
        {overviewItems.map((item) => (
          <AixiaValueBlock
            key={item.label}
            label={item.label}
            value={item.value}
            detail={item.detail}
          />
        ))}
      </AixiaMetricGrid>

      <AixiaSection
        title="Finance Access Approval Registry"
        description="Compact active-user registry. Open a user to change the Finance template or inspect detailed permissions."
        icon={KeyRound}
        bodyClassName="px-7 pb-7 pt-6"
      >
        <AixiaRegistryToolbar
          search={
            <AixiaSearchField
              width="full"
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              placeholder="Search active users by name, role, template, access, or user ID"
            />
          }
          filters={
            <select
              value={templateFilter}
              onChange={(event) => setTemplateFilter(event.target.value)}
              className="aixia-select"
              aria-label="Finance template filter"
            >
              {templateOptions.map((templateId) => {
                const template =
                  templateId === "all" ? null : templateById[templateId];

                return (
                  <option key={templateId} value={templateId}>
                    {templateId === "all"
                      ? "All finance templates"
                      : template?.template_name || "Unknown template"}
                  </option>
                );
              })}
            </select>
          }
          secondaryActions={
            <AixiaButton
              type="button"
              variant="secondary"
              onClick={() => void loadUsers("silent")}
              disabled={isRefreshing}
            >
              {isRefreshing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Refresh
            </AixiaButton>
          }
        />

        {filteredRows.length === 0 ? (
          <AixiaInfoBlock tone="cyan" title="No active users found" icon={UsersRound}>
            Adjust the search or template filter to find the active user you want to review.
          </AixiaInfoBlock>
        ) : (
          <AixiaTableShell
            variant="registry"
            minWidthClassName="min-w-[1180px]"
            maxHeightClassName="max-h-[720px]"
          >
            <thead className="aixia-table-head">
              <tr>
                <th>
                  <AixiaSortableHeader
                    label="User"
                    sortKey="name"
                    activeSortKey={sortKey}
                    sortDirection={sortDirection}
                    onSort={toggleSort}
                    align="left"
                  />
                </th>
                <th>
                  <AixiaSortableHeader
                    label="Base Role"
                    sortKey="role"
                    activeSortKey={sortKey}
                    sortDirection={sortDirection}
                    onSort={toggleSort}
                  />
                </th>
                <th>
                  <AixiaSortableHeader
                    label="Finance Template"
                    sortKey="template"
                    activeSortKey={sortKey}
                    sortDirection={sortDirection}
                    onSort={toggleSort}
                  />
                </th>
                <th>
                  <AixiaSortableHeader
                    label="Effective Access"
                    sortKey="effective"
                    activeSortKey={sortKey}
                    sortDirection={sortDirection}
                    onSort={toggleSort}
                  />
                </th>
                <th>
                  <AixiaSortableHeader
                    label="Overrides"
                    sortKey="overrides"
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
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {filteredRows.map((user) => {
                const updatedAt = user.updated_at || user.created_at;

                return (
                  <tr key={user.user_id} className="aixia-table-row">
                    <AixiaTableTextCell
                      width="xl"
                      primary={user.full_name || "Unnamed user"}
                      secondary={user.user_id}
                    />

                    <AixiaTableBadgeCell width="sm">
                      <AixiaStatusBadge value={user.role} />
                    </AixiaTableBadgeCell>

                    <AixiaTableBadgeCell width="lg">
                      <AixiaBadge tone="violet">
                        {user.financeTemplate?.template_name || "Custom"}
                      </AixiaBadge>
                    </AixiaTableBadgeCell>

                    <AixiaTableBadgeCell width="lg">
                      <FinanceAccessBadge value={user.highestAccessLabel} />
                      <div className="aixia-table-secondary-text">
                        {user.approveExecuteSectionCount > 0
                          ? `${formatCount(user.approveExecuteSectionCount)} approve / execute`
                          : "No final-action access"}
                      </div>
                    </AixiaTableBadgeCell>

                    <AixiaTableTextCell
                      width="sm"
                      primary={formatCount(user.userOverrideCount)}
                      secondary={`Template ${formatCount(user.templatePermissionCount)}`}
                    />

                    <AixiaTableDateCell width="md">
                      {formatDateTime(updatedAt)}
                    </AixiaTableDateCell>

                    <AixiaTableActionsCell>
                      <AixiaButton
                        type="button"
                        variant="primary"
                        onClick={() =>
                          navigate(`/finance/access-approvals/${user.user_id}`)
                        }
                      >
                        Open
                        <ArrowRight className="h-3.5 w-3.5" />
                      </AixiaButton>
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
        Base system role remains admin, manager, employee, or guest. Finance role template
        controls the company-level Finance baseline. User overrides should only be used for
        exceptions. This registry only shows active profiles; detailed analysis belongs in the
        user ID page.
      </AixiaAccessRule>
    </AixiaPage>
  );
}
