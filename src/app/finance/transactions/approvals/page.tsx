import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Eye,
  Filter,
  KeyRound,
  Loader2,
  LockKeyhole,
  Search,
  ShieldCheck,
  Sparkles,
  ToggleRight,
  UserRound,
  UsersRound,
} from "lucide-react";

import {
  ACCESS_APPROVAL_LEVEL_ORDER,
  ACCESS_APPROVAL_SECTIONS,
  countEnabledSections,
  countOperatorSections,
  createEmptyAccessStateMap,
  getEffectiveAccessLabel,
  getSectionLevelState,
  type AccessApprovalEffectiveLabel,
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

type AccessUserViewModel = AccessUserRow & {
  accessStates: Record<AccessApprovalSectionKey, AccessLevelState>;
  enabledSectionCount: number;
  operatorSectionCount: number;
  highestAccessLabel: AccessApprovalEffectiveLabel;
};

type MetricCard = {
  key: string;
  title: string;
  value: string;
  subtitle: string;
  icon: LucideIcon;
  tone: "cyan" | "emerald" | "amber" | "violet" | "rose";
};

type SortKey = "name" | "role" | "status" | "enabled" | "operators" | "updated";
type SortDirection = "asc" | "desc";

const STATUS_REVIEW_VALUES = new Set([
  "pending_verification",
  "pending_profile",
  "pending_approval",
]);

const statusToneMap: Record<
  string,
  "cyan" | "emerald" | "amber" | "rose" | "violet" | "slate"
> = {
  active: "emerald",
  pending_verification: "amber",
  pending_profile: "amber",
  pending_approval: "amber",
  rejected: "rose",
};

const effectiveAccessToneMap: Record<
  AccessApprovalEffectiveLabel,
  "cyan" | "emerald" | "amber" | "rose" | "violet" | "slate"
> = {
  "No Company Access": "slate",
  "Can Open Section": "cyan",
  "Can Monitor Company Records": "violet",
  "Can Change Company Records": "amber",
  "Can Operate Final Actions": "emerald",
  "Admin Only": "rose",
};

function formatLabel(value: string | null | undefined) {
  if (!value) return "—";

  return value
    .split("_")
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

function getToneClasses(tone: "cyan" | "emerald" | "amber" | "rose" | "violet" | "slate") {
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
  const resolvedTone = tone || statusToneMap[value || ""] || "slate";

  return (
    <span
      className={`inline-flex max-w-full items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${getToneClasses(
        resolvedTone
      )}`}
    >
      <span className="truncate">{formatLabel(value)}</span>
    </span>
  );
}

function inputClass() {
  return "h-11 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/30 focus:bg-black/30";
}

function MetricCard({ metric }: { metric: MetricCard }) {
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
            <div className={`mt-2 truncate text-3xl font-semibold tracking-[-0.035em] ${tone.value}`}>
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

function AccessDot({
  enabled,
  label,
}: {
  enabled: boolean;
  label: string;
}) {
  return (
    <div
      className={`inline-flex h-7 w-full items-center justify-center rounded-full border px-2 text-[9px] font-semibold uppercase tracking-[0.12em] ${
        enabled
          ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-200"
          : "border-white/10 bg-white/[0.04] text-slate-600"
      }`}
    >
      {label}
    </div>
  );
}

function getHighestAccessLabel(
  states: Record<AccessApprovalSectionKey, AccessLevelState>
): AccessApprovalEffectiveLabel {
  const labels = ACCESS_APPROVAL_SECTIONS.map((section) =>
    getEffectiveAccessLabel(section, states[section.key])
  );

  if (labels.includes("Admin Only")) return "Admin Only";
  if (labels.includes("Can Operate Final Actions")) return "Can Operate Final Actions";
  if (labels.includes("Can Change Company Records")) return "Can Change Company Records";
  if (labels.includes("Can Monitor Company Records")) return "Can Monitor Company Records";
  if (labels.includes("Can Open Section")) return "Can Open Section";

  return "No Company Access";
}

function buildUserViewModel(user: AccessUserRow): AccessUserViewModel {
  const effectivePermissions = getEffectivePermissions(user.role, user.permissions || null);
  const emptyStateMap = createEmptyAccessStateMap();

  const accessStates = ACCESS_APPROVAL_SECTIONS.reduce(
    (map, section) => {
      map[section.key] = getSectionLevelState(section, effectivePermissions);
      return map;
    },
    emptyStateMap
  );

  return {
    ...user,
    accessStates,
    enabledSectionCount: countEnabledSections(accessStates),
    operatorSectionCount: countOperatorSections(accessStates),
    highestAccessLabel: getHighestAccessLabel(accessStates),
  };
}

function compareStrings(first: string | null | undefined, second: string | null | undefined) {
  return (first || "").localeCompare(second || "");
}

export default function FinanceAccessApprovalsPage() {
  const navigate = useNavigate();

  const [users, setUsers] = useState<AccessUserRow[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState<Role | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [searchValue, setSearchValue] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
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
          setPageError("You must be logged in to manage Access Approvals.");
          setUsers([]);
          return;
        }

        const currentUserResult = await supabase
          .from("profiles")
          .select("role, permissions")
          .eq("user_id", authUserId)
          .maybeSingle();

        if (currentUserResult.error) throw currentUserResult.error;

        const currentProfile = currentUserResult.data as
          | { role: Role; permissions: Partial<Record<Permission, boolean>> | null }
          | null;

        if (!currentProfile) {
          setPageError("Current user profile was not found.");
          setUsers([]);
          return;
        }

        setCurrentUserRole(currentProfile.role);

        const currentUserPermissions = getEffectivePermissions(
          currentProfile.role,
          currentProfile.permissions || null
        );

        const isAdminUser = String(currentProfile.role || "").toLowerCase() === "admin";

        if (!isAdminUser || !currentUserPermissions.manageUsers) {
          setPageError("Admin access is required to open Access Approvals.");
          setUsers([]);
          return;
        }

        const usersResult = await supabase
          .from("profiles")
          .select(
            "user_id, full_name, role, status, requested_role, permissions, created_at, updated_at"
          )
          .order("updated_at", { ascending: false });

        if (usersResult.error) throw usersResult.error;

        setUsers((usersResult.data || []) as AccessUserRow[]);
      } catch (error) {
        console.error("Failed to load Access Approvals:", error);
        setPageError(
          error instanceof Error ? error.message : "Failed to load Access Approvals."
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
    const channel = supabase
      .channel("finance-access-approvals")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        () => void loadUsers("silent")
      )
      .subscribe();

    const intervalId = window.setInterval(() => {
      void loadUsers("silent");
    }, 60000);

    return () => {
      window.clearInterval(intervalId);
      supabase.removeChannel(channel);
    };
  }, [loadUsers]);

  const userRows = useMemo(() => {
    return users.map(buildUserViewModel);
  }, [users]);

  const pendingReviewCount = useMemo(() => {
    return userRows.filter((user) => STATUS_REVIEW_VALUES.has(user.status || "")).length;
  }, [userRows]);

  const activeUserCount = useMemo(() => {
    return userRows.filter((user) => user.status === "active").length;
  }, [userRows]);

  const operatorUserCount = useMemo(() => {
    return userRows.filter((user) => user.operatorSectionCount > 0).length;
  }, [userRows]);

  const adminAccessCount = useMemo(() => {
    return userRows.filter(
      (user) => getEffectiveAccessLabel(
        ACCESS_APPROVAL_SECTIONS.find((section) => section.key === "accessApprovals")!,
        user.accessStates.accessApprovals
      ) === "Admin Only"
    ).length;
  }, [userRows]);

  const filteredRows = useMemo(() => {
    const normalizedSearch = searchValue.trim().toLowerCase();

    return userRows
      .filter((user) => {
        if (statusFilter !== "all" && user.status !== statusFilter) {
          return false;
        }

        if (!normalizedSearch) return true;

        return [
          user.full_name,
          user.role,
          user.status,
          user.requested_role,
          user.user_id,
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

        if (sortKey === "status") {
          comparison = compareStrings(first.status, second.status);
        }

        if (sortKey === "enabled") {
          comparison = first.enabledSectionCount - second.enabledSectionCount;
        }

        if (sortKey === "operators") {
          comparison = first.operatorSectionCount - second.operatorSectionCount;
        }

        if (sortKey === "updated") {
          comparison =
            new Date(first.updated_at || first.created_at).getTime() -
            new Date(second.updated_at || second.created_at).getTime();
        }

        return sortDirection === "asc" ? comparison : -comparison;
      });
  }, [searchValue, sortDirection, sortKey, statusFilter, userRows]);

  const metricCards = useMemo<MetricCard[]>(() => {
    return [
      {
        key: "users",
        title: "Users",
        value: isLoading ? "—" : formatCount(userRows.length),
        subtitle: "Profiles available for access review.",
        icon: UsersRound,
        tone: "cyan",
      },
      {
        key: "pending",
        title: "Waiting Review",
        value: isLoading ? "—" : formatCount(pendingReviewCount),
        subtitle: "Pending profile, verification, or approval.",
        icon: Clock3,
        tone: "amber",
      },
      {
        key: "active",
        title: "Active Users",
        value: isLoading ? "—" : formatCount(activeUserCount),
        subtitle: "Users with active profile status.",
        icon: CheckCircle2,
        tone: "emerald",
      },
      {
        key: "operators",
        title: "Operators",
        value: isLoading ? "—" : formatCount(operatorUserCount),
        subtitle: "Users with final-action access in at least one section.",
        icon: ToggleRight,
        tone: "violet",
      },
      {
        key: "admins",
        title: "Access Admins",
        value: isLoading ? "—" : formatCount(adminAccessCount),
        subtitle: "Users with Access Approval control enabled.",
        icon: LockKeyhole,
        tone: "rose",
      },
    ];
  }, [activeUserCount, adminAccessCount, isLoading, operatorUserCount, pendingReviewCount, userRows.length]);

  const statusOptions = useMemo(() => {
    const statuses = Array.from(new Set(userRows.map((user) => user.status).filter(Boolean)));
    return ["all", ...statuses] as string[];
  }, [userRows]);

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

  const sortLabel = useCallback(
    (key: SortKey) => {
      if (sortKey !== key) return "";
      return sortDirection === "asc" ? " ↑" : " ↓";
    },
    [sortDirection, sortKey]
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#05070d] px-4 py-4 text-white md:px-6 md:py-6">
        <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
          <div className="rounded-[34px] border border-white/10 bg-white/[0.045] p-12 text-center backdrop-blur-xl">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-cyan-200" />
            <div className="mt-4 text-sm text-slate-400">
              Loading Access Approvals...
            </div>
          </div>
        </div>
      </div>
    );
  }

  const hasAdminAccess = Boolean(
    currentUserRole &&
      String(currentUserRole || "").toLowerCase() === "admin" &&
      getEffectivePermissions(currentUserRole, null).manageUsers &&
      !pageError
  );

  return (
    <div className="min-h-screen bg-[#05070d] px-4 py-4 text-white md:px-6 md:py-6">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
        <header className="relative overflow-hidden rounded-[34px] border border-white/10 bg-white/[0.045] p-6 shadow-2xl shadow-black/30 backdrop-blur-xl">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(6,182,212,0.16),transparent_38%),radial-gradient(circle_at_top_right,rgba(139,92,246,0.12),transparent_34%)]" />

          <div className="relative grid gap-6 xl:grid-cols-[minmax(0,1fr)_520px] xl:items-end">
            <div>
              <button
                type="button"
                onClick={() => navigate("/finance/transactions")}
                className="mb-5 inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-300 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
              >
                <ArrowRight className="h-3.5 w-3.5 rotate-180" />
                Transactions
              </button>

              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-200">
                <Sparkles className="h-3.5 w-3.5" />
                Admin Access Control
              </div>

              <h1 className="mt-4 text-3xl font-semibold tracking-[-0.035em] text-white md:text-5xl">
                Access Approvals
              </h1>

              <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-400 md:text-base md:leading-7">
                Review website users and approve what each user can see, monitor, change,
                and operate across AiXia company workflows.
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                <div className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-200">
                  Own records default enabled
                </div>
                <div className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-200">
                  Company-level toggles
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
                      Default Rule
                    </div>
                    <div className="mt-2 text-xl font-semibold leading-tight tracking-[-0.035em] text-white">
                      Own Records
                    </div>
                  </div>
                  <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-3 text-emerald-200">
                    <UserRound className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-3 text-xs leading-5 text-slate-500">
                  Normal users can see, create, edit, submit, upload, and confirm their own expenses
                  and paycheck requests by default.
                </div>
              </div>

              <div className="min-h-[148px] rounded-[24px] border border-white/10 bg-black/20 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                      Admin Scope
                    </div>
                    <div className="mt-2 text-xl font-semibold leading-tight tracking-[-0.035em] text-white">
                      Company Access
                    </div>
                  </div>
                  <div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/10 p-3 text-cyan-200">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-3 text-xs leading-5 text-slate-500">
                  The matrix controls extra company-level power: seeing all, changing records, and
                  operating final workflow actions.
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
              <div>Admin access is required to manage Access Approvals.</div>
            </div>
          </div>
        ) : null}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {metricCards.map((metric) => (
            <MetricCard key={metric.key} metric={metric} />
          ))}
        </section>

        <SectionCard
          title="Access Approval Registry"
          description="Open a user to approve company-level access by section: See, Monitor, Change, and Operate."
          icon={KeyRound}
        >
          <div className="mb-5 grid gap-3 xl:grid-cols-[minmax(0,1fr)_240px_180px]">
            <label className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
                placeholder="Search users by name, role, status, or user ID"
                className={`${inputClass()} pl-11`}
              />
            </label>

            <label className="relative">
              <Filter className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className={`${inputClass()} pl-11`}
              >
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status === "all" ? "All statuses" : formatLabel(status)}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="button"
              onClick={() => void loadUsers("silent")}
              disabled={isRefreshing}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] px-4 text-sm font-semibold text-slate-300 transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isRefreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Clock3 className="h-4 w-4" />}
              Refresh
            </button>
          </div>

          {filteredRows.length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-white/10 bg-black/20 px-6 py-12 text-center">
              <UsersRound className="mx-auto h-8 w-8 text-slate-500" />
              <div className="mt-4 text-sm font-semibold text-white">
                No users found
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Adjust the search or status filter to find the user you want to review.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-[24px] border border-white/10 bg-black/20">
              <div className="max-h-[720px] overflow-y-auto">
                <table className="w-full min-w-[1480px] border-collapse">
                  <thead className="sticky top-0 z-20 border-b border-white/10 bg-black/70 backdrop-blur-xl">
                    <tr>
                      <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                        <button type="button" onClick={() => toggleSort("name")}>
                          User{sortLabel("name")}
                        </button>
                      </th>
                      <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                        <button type="button" onClick={() => toggleSort("role")}>
                          Role{sortLabel("role")}
                        </button>
                      </th>
                      <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                        <button type="button" onClick={() => toggleSort("status")}>
                          Status{sortLabel("status")}
                        </button>
                      </th>
                      <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                        Access Sections
                      </th>
                      <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                        Company Access Matrix
                      </th>
                      <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                        Effective Access
                      </th>
                      <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                        <button type="button" onClick={() => toggleSort("updated")}>
                          Updated{sortLabel("updated")}
                        </button>
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
                          <td className="min-w-[280px] px-5 py-4">
                            <button
                              type="button"
                              onClick={() =>
                                navigate(`/finance/transactions/approvals/${user.user_id}`)
                              }
                              className="group text-left"
                            >
                              <div className="font-semibold text-white transition group-hover:text-cyan-200">
                                {user.full_name || "Unnamed user"}
                              </div>
                              <div className="mt-1 max-w-[250px] truncate text-xs text-slate-500">
                                {user.user_id}
                              </div>
                              <div className="mt-3 inline-flex h-8 items-center justify-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-cyan-100 transition group-hover:bg-cyan-500/15">
                                Open Access Page
                                <ArrowRight className="h-3 w-3" />
                              </div>
                            </button>
                          </td>

                          <td className="min-w-[170px] px-5 py-4">
                            <StatusBadge value={user.role} tone="cyan" />
                            {user.requested_role && user.requested_role !== user.role ? (
                              <div className="mt-2 text-xs text-amber-200">
                                Requested {formatLabel(user.requested_role)}
                              </div>
                            ) : null}
                          </td>

                          <td className="min-w-[180px] px-5 py-4">
                            <StatusBadge value={user.status} />
                          </td>

                          <td className="min-w-[180px] px-5 py-4">
                            <div className="font-semibold text-white">
                              {formatCount(user.enabledSectionCount)} /{" "}
                              {formatCount(ACCESS_APPROVAL_SECTIONS.length)}
                            </div>
                            <div className="mt-1 text-xs text-slate-500">
                              Company sections enabled
                            </div>
                          </td>

                          <td className="min-w-[920px] px-5 py-4">
                            <div className="flex min-w-max items-stretch gap-3">
                              {ACCESS_APPROVAL_SECTIONS.map((section) => {
                                const sectionState = user.accessStates[section.key];
                                const enabledCount = ACCESS_APPROVAL_LEVEL_ORDER.filter(
                                  (level) => sectionState[level]
                                ).length;

                                return (
                                  <div
                                    key={section.key}
                                    className="w-[172px] min-w-[172px] rounded-2xl border border-white/10 bg-white/[0.025] p-3"
                                  >
                                    <div className="mb-3 flex items-start justify-between gap-2">
                                      <div className="text-xs font-semibold leading-5 text-slate-200">
                                        {section.shortTitle}
                                      </div>
                                      <span
                                        className={`rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] ${
                                          enabledCount > 0
                                            ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-200"
                                            : "border-white/10 bg-white/[0.04] text-slate-600"
                                        }`}
                                      >
                                        {enabledCount}/4
                                      </span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-1.5">
                                      {ACCESS_APPROVAL_LEVEL_ORDER.map((level) => (
                                        <AccessDot
                                          key={level}
                                          enabled={sectionState[level]}
                                          label={level.slice(0, 3)}
                                        />
                                      ))}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </td>

                          <td className="min-w-[230px] px-5 py-4">
                            <StatusBadge value={user.highestAccessLabel} tone={highestTone} />
                            <div className="mt-2 text-xs leading-5 text-slate-500">
                              {user.operatorSectionCount > 0
                                ? `${formatCount(user.operatorSectionCount)} operator section${
                                    user.operatorSectionCount === 1 ? "" : "s"
                                  }`
                                : "No final-action operator access"}
                            </div>
                          </td>

                          <td className="min-w-[180px] px-5 py-4">
                            {formatDateTime(updatedAt)}
                          </td>

                          <td className="px-5 py-4 text-right">
                            <button
                              type="button"
                              onClick={() =>
                                navigate(`/finance/transactions/approvals/${user.user_id}`)
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
          <div className="rounded-[24px] border border-white/10 bg-white/[0.045] p-4">
            <div className="flex items-center gap-3">
              <Eye className="h-4 w-4 text-cyan-200" />
              <div className="text-sm font-semibold text-white">See</div>
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-500">
              Opens the area. For personal employee flows, normal users still only see their own
              records.
            </p>
          </div>

          <div className="rounded-[24px] border border-white/10 bg-white/[0.045] p-4">
            <div className="flex items-center gap-3">
              <Search className="h-4 w-4 text-violet-200" />
              <div className="text-sm font-semibold text-white">Monitor</div>
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-500">
              Allows company-level visibility into records, dashboards, activity, summaries, and
              workflow status.
            </p>
          </div>

          <div className="rounded-[24px] border border-white/10 bg-white/[0.045] p-4">
            <div className="flex items-center gap-3">
              <KeyRound className="h-4 w-4 text-amber-200" />
              <div className="text-sm font-semibold text-white">Change</div>
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-500">
              Allows creating and editing company-side records, uploads, notes, and editable draft
              workflow data.
            </p>
          </div>

          <div className="rounded-[24px] border border-white/10 bg-white/[0.045] p-4">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-4 w-4 text-emerald-200" />
              <div className="text-sm font-semibold text-white">Operate</div>
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-500">
              Allows final workflow actions such as approve, reject, issue, void, archive, delete,
              restore, confirm funding, pay, and process.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
