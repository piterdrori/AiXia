import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Clock3,
  Database,
  Filter,
  KeyRound,
  Loader2,
  RefreshCw,
  Search as SearchIcon,
  Settings,
  ShieldCheck,
  Sparkles,
  UserRound,
  UsersRound,
  ReceiptText,
} from "lucide-react";

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
import { supabase } from "@/lib/supabase";
import {
  getEffectivePermissions,
  type Permission,
  type Role,
} from "@/lib/permissions";

type ProfileStatus =
  | "pending_verification"
  | "pending_profile"
  | "pending_approval"
  | "active"
  | "rejected"
  | string;

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
  permissions: Partial<Record<Permission, boolean>> | null;
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
  accessStates: Record<AccessApprovalSectionKey, AccessLevelState>;
  groupSummaries: GroupSummary[];
  enabledLevelCount: number;
  totalLevelCount: number;
  templatePermissionCount: number;
  userOverrideCount: number;
  approveExecuteSectionCount: number;
  highestAccessLabel: AccessApprovalEffectiveLabel;
};

type MetricCardData = {
  key: string;
  title: string;
  value: string;
  subtitle: string;
  icon: LucideIcon;
  tone: "cyan" | "emerald" | "amber" | "violet" | "rose";
};

type DetailItem = {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
};

type SortKey =
  | "name"
  | "role"
  | "template"
  | "effective"
  | "overrides"
  | "updated";

type SortDirection = "asc" | "desc";

const effectiveAccessToneMap: Record<
  AccessApprovalEffectiveLabel,
  "cyan" | "emerald" | "amber" | "rose" | "violet" | "slate"
> = {
  "No Company Access": "slate",
  "Can Read Section": "cyan",
  "Can Create Records": "violet",
  "Can Update Records": "amber",
  "Can Delete / Archive": "rose",
  "Can Approve / Execute": "emerald",
  "Admin Only": "rose",
};

const groupIconMap: Record<AccessApprovalGroupKey, LucideIcon> = {
  masterData: Database,
  transactions: ReceiptText,
  reports: BarChart3,
  settings: Settings,
};

function formatLabel(value: string | null | undefined) {
  if (!value) return "—";

  return value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[-/]/g, " ")
    .split("_")
    .join(" ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

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

function getToneClasses(
  tone: "cyan" | "emerald" | "amber" | "rose" | "violet" | "slate"
) {
  switch (tone) {
    case "emerald":
      return "border-emerald-400/20 bg-emerald-500/10 text-emerald-200";
    case "amber":
      return "border-amber-400/20 bg-amber-500/10 text-amber-200";
    case "rose":
      return "border-rose-400/20 bg-rose-500/10 text-rose-200";
    case "violet":
      return "border-violet-400/20 bg-violet-500/10 text-violet-200";
    case "cyan":
      return "border-cyan-400/20 bg-cyan-500/10 text-cyan-200";
    case "slate":
    default:
      return "border-white/10 bg-white/[0.06] text-slate-300";
  }
}

function StatusBadge({
  value,
  tone,
}: {
  value: string | null | undefined;
  tone?: "cyan" | "emerald" | "amber" | "rose" | "violet" | "slate";
}) {
  return (
    <span
      className={`inline-flex max-w-full items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${getToneClasses(
        tone || "slate"
      )}`}
    >
      <span className="truncate">{formatLabel(value)}</span>
    </span>
  );
}

function inputClass() {
  return "h-11 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/30 focus:bg-black/30";
}

function MetricCard({ metric }: { metric: MetricCardData }) {
  const Icon = metric.icon;

  const tone = {
    cyan: {
      glow: "from-cyan-500/20 via-cyan-400/10 to-transparent",
      iconWrap: "border-cyan-400/20 bg-cyan-500/10 text-cyan-200",
      value: "text-cyan-100",
      accent: "bg-cyan-400",
    },
    emerald: {
      glow: "from-emerald-500/20 via-emerald-400/10 to-transparent",
      iconWrap: "border-emerald-400/20 bg-emerald-500/10 text-emerald-200",
      value: "text-emerald-100",
      accent: "bg-emerald-400",
    },
    amber: {
      glow: "from-amber-500/20 via-amber-400/10 to-transparent",
      iconWrap: "border-amber-400/20 bg-amber-500/10 text-amber-200",
      value: "text-amber-100",
      accent: "bg-amber-400",
    },
    violet: {
      glow: "from-violet-500/20 via-violet-400/10 to-transparent",
      iconWrap: "border-violet-400/20 bg-violet-500/10 text-violet-200",
      value: "text-violet-100",
      accent: "bg-violet-400",
    },
    rose: {
      glow: "from-rose-500/20 via-rose-400/10 to-transparent",
      iconWrap: "border-rose-400/20 bg-rose-500/10 text-rose-200",
      value: "text-rose-100",
      accent: "bg-rose-400",
    },
  }[metric.tone];

  return (
    <div className="group relative min-h-[156px] overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.045] p-5 backdrop-blur-xl transition hover:border-white/20 hover:bg-white/[0.055]">
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${tone.glow}`} />
      <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-white/10" />

      <div className="relative flex h-full flex-col justify-between gap-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
              {metric.title}
            </div>
            <div
              className={`mt-2 truncate text-3xl font-semibold tracking-[-0.035em] ${tone.value}`}
            >
              {metric.value}
            </div>
          </div>

          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${tone.iconWrap}`}
          >
            <Icon className="h-5 w-5" />
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 truncate text-sm leading-6 text-slate-400">
            {metric.subtitle}
          </div>
          <div className={`h-2 w-2 shrink-0 rounded-full ${tone.accent}`} />
        </div>
      </div>
    </div>
  );
}

function SectionCard({
  title,
  description,
  icon: Icon,
  children,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
      <div className="flex items-start gap-4 border-b border-white/10 px-5 py-4">
        <div className="rounded-2xl border border-cyan-400/15 bg-cyan-500/10 p-3 text-cyan-200">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
            {title}
          </div>
          <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
        </div>
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function ValueBlock({
  label,
  value,
  detail,
}: {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
}) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
      <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
        {label}
      </div>
      <div className="mt-2 text-sm font-semibold leading-6 text-white">{value}</div>
      {detail ? <div className="mt-2 text-xs leading-5 text-slate-500">{detail}</div> : null}
    </div>
  );
}

function SortButton({
  label,
  sortKey,
  activeSortKey,
  direction,
  onClick,
}: {
  label: string;
  sortKey: SortKey;
  activeSortKey: SortKey;
  direction: SortDirection;
  onClick: (sortKey: SortKey) => void;
}) {
  const isActive = activeSortKey === sortKey;

  return (
    <button
      type="button"
      onClick={() => onClick(sortKey)}
      className={`inline-flex items-center gap-1 transition hover:text-cyan-200 ${
        isActive ? "text-cyan-200" : "text-slate-500"
      }`}
    >
      {label}
      {isActive ? <span>{direction === "asc" ? "↑" : "↓"}</span> : null}
    </button>
  );
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
}: {
  user: AccessUserRow;
  financeTemplate: FinancePermissionTemplateRow | null;
}): AccessUserViewModel {
  const templatePermissionOverrides = coercePermissionMap(financeTemplate?.permissions || null);
  const userPermissionOverrides = coercePermissionMap(user.permissions || null);

  const effectivePermissions = getEffectivePermissions(user.role, {
    ...templatePermissionOverrides,
    ...userPermissionOverrides,
  });

  const accessStates = ACCESS_APPROVAL_SECTIONS.reduce(
    (map, section) => {
      map[section.key] = getSectionLevelState(section, effectivePermissions);
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

function compareStrings(first: string | null | undefined, second: string | null | undefined) {
  return (first || "").localeCompare(second || "");
}

function compareDates(first: string | null | undefined, second: string | null | undefined) {
  return new Date(first || 0).getTime() - new Date(second || 0).getTime();
}

export default function FinanceAccessApprovalsPage() {
  const navigate = useNavigate();

  const [users, setUsers] = useState<AccessUserRow[]>([]);
  const [currentUser, setCurrentUser] = useState<CurrentProfileRow | null>(null);
  const [financeTemplates, setFinanceTemplates] = useState<FinancePermissionTemplateRow[]>([]);
  const [userTemplateAssignments, setUserTemplateAssignments] = useState<
    FinanceUserPermissionTemplateRow[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [searchValue, setSearchValue] = useState("");
  const [templateFilter, setTemplateFilter] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("updated");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const loadUsers = useCallback(
    async (mode: "initial" | "silent" = "initial") => {
      if (mode === "initial") {
        setIsLoading(true);
      } else {
        setIsRefreshing(true);
      }

      setPageError(null);

      try {
        const authResult = await supabase.auth.getUser();
        if (authResult.error) throw authResult.error;

        const authUserId = authResult.data.user?.id;

        if (!authUserId) {
          setPageError("You must be logged in to manage Finance Access Approvals.");
          setUsers([]);
          setCurrentUser(null);
          return;
        }

        const currentUserResult = await supabase
          .from("profiles")
          .select("role, permissions")
          .eq("user_id", authUserId)
          .maybeSingle();

        if (currentUserResult.error) throw currentUserResult.error;

        const currentProfile = currentUserResult.data as CurrentProfileRow | null;

        if (!currentProfile) {
          setPageError("Current user profile was not found.");
          setUsers([]);
          setCurrentUser(null);
          return;
        }

        const currentUserPermissions = getEffectivePermissions(
          currentProfile.role,
          currentProfile.permissions || null
        );

        const isAdminUser = String(currentProfile.role || "").toLowerCase() === "admin";

        if (!isAdminUser || !currentUserPermissions.manageUsers) {
          setPageError("Admin access is required to open Finance Access Approvals.");
          setUsers([]);
          setCurrentUser(currentProfile);
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

          supabase
            .from("finance_user_permission_templates")
            .select("user_id, template_id"),
        ]);

        if (usersResult.error) throw usersResult.error;
        if (templatesResult.error) throw templatesResult.error;
        if (assignmentsResult.error) throw assignmentsResult.error;

        setCurrentUser(currentProfile);
        setUsers((usersResult.data || []) as AccessUserRow[]);
        setFinanceTemplates((templatesResult.data || []) as FinancePermissionTemplateRow[]);
        setUserTemplateAssignments(
          (assignmentsResult.data || []) as FinanceUserPermissionTemplateRow[]
        );
      } catch (error) {
        console.error("Failed to load Finance Access Approvals:", error);
        setPageError(
          error instanceof Error ? error.message : "Failed to load Finance Access Approvals."
        );
        setUsers([]);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    []
  );

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
    return (
      financeTemplates.find((template) => template.template_key === "custom") || null
    );
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
      });
    });
  }, [assignmentByUserId, customTemplate, templateById, users]);

  const hasAdminAccess = useMemo(() => {
    if (!currentUser) return false;

    const isAdminUser = String(currentUser.role || "").toLowerCase() === "admin";
    const currentPermissions = getEffectivePermissions(
      currentUser.role,
      currentUser.permissions || null
    );

    return Boolean(isAdminUser && currentPermissions.manageUsers && !pageError);
  }, [currentUser, pageError]);

  const financeTemplateAssignedCount = useMemo(() => {
    return userRows.filter((user) => user.financeTemplate?.template_key !== "custom").length;
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

  const metricCards = useMemo<MetricCardData[]>(() => {
    return [
      {
        key: "activeUsers",
        title: "Active Users",
        value: isLoading ? "—" : formatCount(userRows.length),
        subtitle: "Only active profiles are shown in this registry.",
        icon: UsersRound,
        tone: "cyan",
      },
      {
        key: "templates",
        title: "Template Assigned",
        value: isLoading ? "—" : formatCount(financeTemplateAssignedCount),
        subtitle: "Users assigned to non-Custom Finance templates.",
        icon: ShieldCheck,
        tone: "violet",
      },
      {
        key: "approve",
        title: "Approve / Execute",
        value: isLoading ? "—" : formatCount(approveExecuteUserCount),
        subtitle: "Users with final workflow action access.",
        icon: KeyRound,
        tone: "emerald",
      },
      {
        key: "overrides",
        title: "User Overrides",
        value: isLoading ? "—" : formatCount(overrideUserCount),
        subtitle: "Users with direct exception permissions.",
        icon: UserRound,
        tone: "rose",
      },
    ];
  }, [
    approveExecuteUserCount,
    financeTemplateAssignedCount,
    isLoading,
    overrideUserCount,
    userRows.length,
  ]);

  const overviewItems = useMemo<DetailItem[]>(() => {
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
      <div className="min-h-screen bg-[#05070d] px-4 py-4 text-white md:px-6 md:py-6">
        <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
          <div className="rounded-[34px] border border-white/10 bg-white/[0.045] p-12 text-center backdrop-blur-xl">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-cyan-200" />
            <div className="mt-4 text-sm text-slate-400">
              Loading Finance Access Approvals...
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#05070d] px-4 py-4 text-white md:px-6 md:py-6">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
        <header className="relative overflow-hidden rounded-[34px] border border-white/10 bg-white/[0.045] p-6 shadow-2xl shadow-black/30 backdrop-blur-xl">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(6,182,212,0.16),transparent_38%),radial-gradient(circle_at_top_right,rgba(139,92,246,0.12),transparent_34%)]" />

          <div className="relative grid gap-6 xl:grid-cols-[minmax(0,1fr)_520px] xl:items-end">
            <div>
              <button
                type="button"
                onClick={() => navigate("/finance")}
                className="mb-5 inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-300 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
              >
                <ArrowRight className="h-3.5 w-3.5 rotate-180" />
                Finance
              </button>

              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-200">
                <Sparkles className="h-3.5 w-3.5" />
                Admin Finance Access Control
              </div>

              <h1 className="mt-4 text-3xl font-semibold tracking-[-0.035em] text-white md:text-5xl">
                Finance Access Approvals
              </h1>

              <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-400 md:text-base md:leading-7">
                Review active users through a clean base role plus Finance role template model.
                Open a user to adjust the selected template and user-specific permission exceptions.
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                <div className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-200">
                  Active profiles only
                </div>
                <div className="rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-violet-200">
                  Finance templates enabled
                </div>
                <div className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-200">
                  Own records default protected
                </div>
                {isRefreshing ? (
                  <div className="rounded-full border border-slate-400/20 bg-slate-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-300">
                    Silent refresh
                  </div>
                ) : null}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="min-h-[148px] rounded-[24px] border border-white/10 bg-black/20 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                      Registry Scope
                    </div>
                    <div className="mt-2 text-xl font-semibold leading-tight tracking-[-0.035em] text-white">
                      Active Users
                    </div>
                  </div>
                  <div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/10 p-3 text-cyan-200">
                    <UserRound className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-3 text-xs leading-5 text-slate-500">
                  Pending, rejected, and inactive profiles are excluded from this Finance access registry.
                </div>
              </div>

              <div className="min-h-[148px] rounded-[24px] border border-white/10 bg-black/20 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                      Finance Templates
                    </div>
                    <div className="mt-2 text-xl font-semibold leading-tight tracking-[-0.035em] text-white">
                      {formatCount(financeTemplates.length)}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-violet-400/20 bg-violet-500/10 p-3 text-violet-200">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-3 text-xs leading-5 text-slate-500">
                  Templates define the baseline Finance access. User overrides are exceptions only.
                </div>
              </div>
            </div>
          </div>
        </header>

                {pageError ? (
          <div className="rounded-[24px] border border-rose-400/20 bg-rose-500/10 p-4 text-sm leading-6 text-rose-100">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>{pageError}</div>
            </div>
          </div>
        ) : null}

        {!hasAdminAccess && !pageError ? (
          <div className="rounded-[24px] border border-rose-400/20 bg-rose-500/10 p-4 text-sm leading-6 text-rose-100">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>Admin access is required to manage Finance Access Approvals.</div>
            </div>
          </div>
        ) : null}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {metricCards.map((metric) => (
            <MetricCard key={metric.key} metric={metric} />
          ))}
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {overviewItems.map((item) => (
            <ValueBlock
              key={item.label}
              label={item.label}
              value={item.value}
              detail={item.detail}
            />
          ))}
        </section>

        <SectionCard
          title="Finance Access Approval Registry"
          description="Compact active-user registry. Open a user to change the Finance template or inspect detailed permissions."
          icon={KeyRound}
        >
          <div className="mb-5 grid gap-3 xl:grid-cols-[minmax(0,1fr)_260px_180px]">
            <label className="relative">
              <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
                placeholder="Search active users by name, role, template, access, or user ID"
                className={`${inputClass()} pl-11`}
              />
            </label>

            <label className="relative">
              <Filter className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <select
                value={templateFilter}
                onChange={(event) => setTemplateFilter(event.target.value)}
                className={`${inputClass()} pl-11`}
              >
                {templateOptions.map((templateId) => {
                  const template = templateId === "all" ? null : templateById[templateId];

                  return (
                    <option key={templateId} value={templateId} className="bg-[#05070d]">
                      {templateId === "all"
                        ? "All finance templates"
                        : template?.template_name || "Unknown template"}
                    </option>
                  );
                })}
              </select>
            </label>

            <button
              type="button"
              onClick={() => void loadUsers("silent")}
              disabled={isRefreshing}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] px-4 text-sm font-semibold text-slate-300 transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isRefreshing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Refresh
            </button>
          </div>

          {filteredRows.length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-white/10 bg-black/20 px-6 py-12 text-center">
              <UsersRound className="mx-auto h-8 w-8 text-slate-500" />
              <div className="mt-4 text-sm font-semibold text-white">
                No active users found
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Adjust the search or template filter to find the active user you want to review.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-[24px] border border-white/10 bg-black/20">
              <div className="max-h-[720px] overflow-y-auto">
                <table className="w-full min-w-[1180px] border-collapse">
                  <thead className="sticky top-0 z-20 border-b border-white/10 bg-black/70 backdrop-blur-xl">
                    <tr>
                      <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em]">
                        <SortButton
                          label="User"
                          sortKey="name"
                          activeSortKey={sortKey}
                          direction={sortDirection}
                          onClick={toggleSort}
                        />
                      </th>
                      <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em]">
                        <SortButton
                          label="Base Role"
                          sortKey="role"
                          activeSortKey={sortKey}
                          direction={sortDirection}
                          onClick={toggleSort}
                        />
                      </th>
                      <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em]">
                        <SortButton
                          label="Finance Template"
                          sortKey="template"
                          activeSortKey={sortKey}
                          direction={sortDirection}
                          onClick={toggleSort}
                        />
                      </th>
                      <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em]">
                        <SortButton
                          label="Effective Access"
                          sortKey="effective"
                          activeSortKey={sortKey}
                          direction={sortDirection}
                          onClick={toggleSort}
                        />
                      </th>
                      <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em]">
                        <SortButton
                          label="Overrides"
                          sortKey="overrides"
                          activeSortKey={sortKey}
                          direction={sortDirection}
                          onClick={toggleSort}
                        />
                      </th>
                      <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em]">
                        <SortButton
                          label="Updated"
                          sortKey="updated"
                          activeSortKey={sortKey}
                          direction={sortDirection}
                          onClick={toggleSort}
                        />
                      </th>
                      <th className="px-5 py-4 text-right text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                        Action
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredRows.map((user) => {
                      const highestTone = effectiveAccessToneMap[user.highestAccessLabel];
                      const updatedAt = user.updated_at || user.created_at;

                      return (
                        <tr
                          key={user.user_id}
                          className="border-b border-white/5 text-sm text-slate-300 transition hover:bg-white/[0.035]"
                        >
                          <td className="min-w-[260px] px-5 py-3.5">
                            <button
                              type="button"
                              onClick={() =>
                                navigate(`/finance/access-approvals/${user.user_id}`)
                              }
                              className="group w-full text-left"
                            >
                              <div className="font-semibold text-white transition group-hover:text-cyan-200">
                                {user.full_name || "Unnamed user"}
                              </div>
                              <div className="mt-1 max-w-[240px] truncate text-xs text-slate-500">
                                {user.user_id}
                              </div>
                            </button>
                          </td>

                          <td className="min-w-[150px] px-5 py-3.5">
                            <StatusBadge value={user.role} tone="cyan" />
                          </td>

                          <td className="min-w-[210px] px-5 py-3.5">
                            <StatusBadge
                              value={user.financeTemplate?.template_name || "Custom"}
                              tone="violet"
                            />
                          </td>

                          <td className="min-w-[210px] px-5 py-3.5">
                            <StatusBadge value={user.highestAccessLabel} tone={highestTone} />
                            <div className="mt-1 text-xs leading-5 text-slate-500">
                              {user.approveExecuteSectionCount > 0
                                ? `${formatCount(user.approveExecuteSectionCount)} approve / execute`
                                : "No final-action access"}
                            </div>
                          </td>

                          <td className="min-w-[150px] px-5 py-3.5">
                            <div className="text-sm font-semibold text-white">
                              {formatCount(user.userOverrideCount)}
                            </div>
                            <div className="mt-1 text-xs text-slate-500">
                              Template {formatCount(user.templatePermissionCount)}
                            </div>
                          </td>

                          <td className="min-w-[170px] px-5 py-3.5">
                            <div className="text-sm text-slate-300">
                              {formatDateTime(updatedAt)}
                            </div>
                          </td>

                          <td className="px-5 py-3.5 text-right">
                            <button
                              type="button"
                              onClick={() =>
                                navigate(`/finance/access-approvals/${user.user_id}`)
                              }
                              className="inline-flex h-9 items-center justify-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-500/10 px-4 text-xs font-semibold uppercase tracking-[0.14em] text-cyan-100 transition hover:bg-cyan-500/15"
                            >
                              Open
                              <ArrowRight className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </SectionCard>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {ACCESS_APPROVAL_GROUPS.map((group) => {
            const Icon = groupIconMap[group.key];

            return (
              <div
                key={group.key}
                className="rounded-[24px] border border-white/10 bg-white/[0.045] p-4"
              >
                <div className="flex items-center gap-3">
                  <Icon className="h-4 w-4 text-cyan-200" />
                  <div className="text-sm font-semibold text-white">{group.title}</div>
                </div>
                <p className="mt-2 text-xs leading-5 text-slate-500">
                  {group.description}
                </p>
              </div>
            );
          })}
        </section>

        <div className="rounded-[24px] border border-cyan-400/20 bg-cyan-500/10 p-4 text-sm leading-6 text-cyan-100">
          <div className="font-semibold text-white">Locked access model</div>
          <div className="mt-1">
            Base system role remains admin, manager, employee, or guest. Finance role template
            controls the company-level Finance baseline. User overrides should only be used for
            exceptions. This registry only shows active profiles; detailed analysis belongs in the
            user ID page.
          </div>
        </div>
      </div>
    </div>
  );
}
