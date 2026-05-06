import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  ArrowRight,
  Archive,
  CheckCircle2,
  CreditCard,
  Landmark,
  Loader2,
  LockKeyhole,
  Plus,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  WalletCards,
  X,
} from "lucide-react";

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

function getStatusTone(status: string | null | undefined) {
  switch (status) {
    case "active":
      return "border-emerald-400/20 bg-emerald-500/10 text-emerald-200";
    case "inactive":
      return "border-amber-400/20 bg-amber-500/10 text-amber-200";
    case "archived":
      return "border-rose-400/20 bg-rose-500/10 text-rose-200";
    default:
      return "border-white/10 bg-white/[0.06] text-slate-300";
  }
}

function formatStatus(status: string | null | undefined) {
  if (!status) return "Unknown";

  return status
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
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

function getToneClasses(tone: MetricCard["tone"]) {
  switch (tone) {
    case "emerald":
      return {
        glow: "from-emerald-500/20 via-emerald-400/10 to-transparent",
        iconWrap: "border-emerald-400/20 bg-emerald-500/10 text-emerald-200",
        value: "text-emerald-100",
        accent: "bg-emerald-400",
      };
    case "amber":
      return {
        glow: "from-amber-500/20 via-amber-400/10 to-transparent",
        iconWrap: "border-amber-400/20 bg-amber-500/10 text-amber-200",
        value: "text-amber-100",
        accent: "bg-amber-400",
      };
    case "violet":
      return {
        glow: "from-violet-500/20 via-violet-400/10 to-transparent",
        iconWrap: "border-violet-400/20 bg-violet-500/10 text-violet-200",
        value: "text-violet-100",
        accent: "bg-violet-400",
      };
    case "rose":
      return {
        glow: "from-rose-500/20 via-rose-400/10 to-transparent",
        iconWrap: "border-rose-400/20 bg-rose-500/10 text-rose-200",
        value: "text-rose-100",
        accent: "bg-rose-400",
      };
    case "cyan":
    default:
      return {
        glow: "from-cyan-500/20 via-cyan-400/10 to-transparent",
        iconWrap: "border-cyan-400/20 bg-cyan-500/10 text-cyan-200",
        value: "text-cyan-100",
        accent: "bg-cyan-400",
      };
  }
}

function MetricCardBlock({ metric }: { metric: MetricCard }) {
  const Icon = metric.icon;
  const tone = getToneClasses(metric.tone);

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

function StatusBadge({
  value,
  className,
}: {
  value: string | null | undefined;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex max-w-full items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${getStatusTone(
        value
      )} ${className || ""}`}
    >
      <span className="truncate">{formatStatus(value)}</span>
    </span>
  );
}

function DefaultBadge({ isDefault }: { isDefault: boolean }) {
  if (!isDefault) {
    return (
      <span className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
        Standard
      </span>
    );
  }

  return (
    <span className="inline-flex items-center rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-200">
      Default
    </span>
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
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
      <div className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-4">
        <div className="flex min-w-0 items-start gap-3">
          <div className="rounded-2xl border border-cyan-400/15 bg-cyan-500/10 p-3 text-cyan-200">
            <Icon className="h-4 w-4" />
          </div>

          <div className="min-w-0">
            <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
              {title}
            </h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
          </div>
        </div>
      </div>

      <div className="p-5">{children}</div>
    </section>
  );
}

function HeaderStatusCard({
  label,
  value,
  detail,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  icon: LucideIcon;
  tone: "emerald" | "cyan" | "amber" | "rose";
}) {
  const toneClasses = {
    emerald: "border-emerald-400/20 bg-emerald-500/10 text-emerald-200",
    cyan: "border-cyan-400/20 bg-cyan-500/10 text-cyan-200",
    amber: "border-amber-400/20 bg-amber-500/10 text-amber-200",
    rose: "border-rose-400/20 bg-rose-500/10 text-rose-200",
  }[tone];

  return (
    <div className="min-h-[148px] rounded-[24px] border border-white/10 bg-black/20 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
            {label}
          </div>
          <div className="mt-2 text-xl font-semibold leading-tight tracking-[-0.035em] text-white">
            {value}
          </div>
        </div>

        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border ${toneClasses}`}
        >
          <Icon className="h-4 w-4" />
        </div>
      </div>

      <div className="mt-3 text-xs leading-5 text-slate-500">{detail}</div>
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

function TextInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="relative block">
      <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-11 w-full rounded-2xl border border-white/10 bg-black/20 px-4 pl-11 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/30 focus:bg-black/30"
      />
    </label>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-[28px] border border-dashed border-white/10 bg-black/20 px-6 py-12 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-slate-500">
        <Icon className="h-6 w-6" />
      </div>
      <div className="mt-4 text-sm font-semibold text-white">{title}</div>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">
        {description}
      </p>
    </div>
  );
}

export default function FinanceMasterDataBankAccountsPage() {
  const navigate = useNavigate();

  const [profile, setProfile] = useState<ProfilePermissionRow | null>(null);
  const [effectivePermissions, setEffectivePermissions] =
    useState<Record<Permission, boolean> | null>(null);
  const [rows, setRows] = useState<FinanceBankAccountListRow[]>([]);
  const [archivedRows, setArchivedRows] = useState<FinanceBankAccountListRow[]>([]);
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

  const loadCurrentProfile = useCallback(async () => {
    setIsLoadingProfile(true);

    try {
      const authResult = await supabase.auth.getUser();
      if (authResult.error) throw authResult.error;

      const authUserId = authResult.data.user?.id;

      if (!authUserId) {
        setProfile(null);
        setEffectivePermissions(null);
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
      setProfile(null);
      setEffectivePermissions(null);
    } finally {
      setIsLoadingProfile(false);
    }
  }, []);

  const permissionState = useMemo(() => {
    return buildPermissionState(profile, effectivePermissions);
  }, [effectivePermissions, profile]);

  const loadRows = useCallback(async () => {
    setIsLoadingRows(true);
    setPageError(null);

    try {
      const data = await getBankAccounts();
      setRows(data);
    } catch (error) {
      console.error("Failed to load bank accounts:", error);
      setRows([]);
      setPageError(
        error instanceof Error ? error.message : "Failed to load bank accounts."
      );
    } finally {
      setIsLoadingRows(false);
    }
  }, []);

  const loadArchivedRows = useCallback(async () => {
    setIsLoadingArchive(true);
    setPageError(null);

    try {
      const data = await getArchivedBankAccounts();
      setArchivedRows(data);
    } catch (error) {
      console.error("Failed to load archived bank accounts:", error);
      setArchivedRows([]);
      setPageError(
        error instanceof Error ? error.message : "Failed to load archived bank accounts."
      );
    } finally {
      setIsLoadingArchive(false);
    }
  }, []);

  useEffect(() => {
    void Promise.all([loadCurrentProfile(), loadRows()]);
  }, [loadCurrentProfile, loadRows]);

  useEffect(() => {
    const channel = supabase
      .channel("finance-master-data-bank-accounts-page")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        () => void loadCurrentProfile()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_permission_templates" },
        () => void loadCurrentProfile()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_user_permission_templates" },
        () => void loadCurrentProfile()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_bank_accounts" },
        () => {
          void loadRows();
          if (showArchive) void loadArchivedRows();
        }
      )
      .subscribe();

    const intervalId = window.setInterval(() => {
      void Promise.all([
        loadCurrentProfile(),
        loadRows(),
        showArchive ? loadArchivedRows() : Promise.resolve(),
      ]);
    }, 60000);

    return () => {
      window.clearInterval(intervalId);
      supabase.removeChannel(channel);
    };
  }, [loadArchivedRows, loadCurrentProfile, loadRows, showArchive]);

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
          row.company_code,
          row.company_name,
          row.company_legal_name,
          row.beneficiary_name,
          row.bank_name,
          row.city,
          row.country,
          row.currency_code,
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
          comparison = compareStrings(first.currency_code, second.currency_code);
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
          row.company_code,
          row.company_name,
          row.company_legal_name,
          row.beneficiary_name,
          row.bank_name,
          row.city,
          row.country,
          row.currency_code,
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
    await loadArchivedRows();
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
        await Promise.all([loadRows(), showArchive ? loadArchivedRows() : Promise.resolve()]);
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
        await Promise.all([loadRows(), loadArchivedRows()]);
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
        await Promise.all([loadRows(), loadArchivedRows()]);
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
    <div className="min-h-screen bg-[#05070d] px-4 py-4 text-white md:px-6 md:py-6">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
        <header className="relative overflow-hidden rounded-[34px] border border-white/10 bg-white/[0.045] p-6 shadow-2xl shadow-black/30 backdrop-blur-xl">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(6,182,212,0.16),transparent_38%),radial-gradient(circle_at_top_right,rgba(139,92,246,0.12),transparent_34%)]" />

          <div className="relative grid gap-6 xl:grid-cols-[minmax(0,1fr)_520px] xl:items-end">
            <div>
              <button
                type="button"
                onClick={() => navigate("/finance/master-data")}
                className="mb-5 inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-300 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
              >
                <ArrowRight className="h-3.5 w-3.5 rotate-180" />
                Master Data
              </button>

              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-200">
                <Sparkles className="h-3.5 w-3.5" />
                Company Banking Master Data
              </div>

              <h1 className="mt-4 text-3xl font-semibold tracking-[-0.035em] text-white md:text-5xl">
                Company Bank Accounts
              </h1>

              <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-400 md:text-base md:leading-7">
                Permission-filtered registry for company-linked bank accounts used by treasury,
                payment instructions, and finance document snapshots.
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-200">
                  Live backend
                </span>
                <span className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-200">
                  Permission filtered
                </span>
                <span className="rounded-full border border-slate-400/20 bg-slate-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-300">
                  Realtime + 60s fallback
                </span>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <HeaderStatusCard
                label="Read Access"
                value={
                  isLoadingProfile ? "Checking" : permissionState.canRead ? "Enabled" : "Locked"
                }
                detail="This page requires Bank Account read access or Master Data admin access."
                icon={permissionState.canRead ? ShieldCheck : LockKeyhole}
                tone={permissionState.canRead ? "emerald" : "rose"}
              />

              <HeaderStatusCard
                label="Lifecycle Access"
                value={
                  permissionState.canDeleteArchive
                    ? "Archive Enabled"
                    : permissionState.canCreate
                      ? "Create Enabled"
                      : "Read Only"
                }
                detail="Create and Delete/Archive actions follow the selected Finance template."
                icon={permissionState.canDeleteArchive ? Archive : CreditCard}
                tone={permissionState.canDeleteArchive ? "amber" : "cyan"}
              />
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

        {pageMessage ? (
          <div className="rounded-[24px] border border-emerald-400/20 bg-emerald-500/10 p-4 text-sm leading-6 text-emerald-100">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <div>{pageMessage}</div>
            </div>
          </div>
        ) : null}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {metricCards.map((metric) => (
            <MetricCardBlock key={metric.key} metric={metric} />
          ))}
        </section>

        {!permissionState.canRead && !isPageLoading ? (
          <SectionCard
            title="Bank Account Access Locked"
            description="The logged-in user does not have Bank Account read access."
            icon={LockKeyhole}
          >
            <EmptyState
              icon={LockKeyhole}
              title="No bank account access is enabled"
              description="Ask an Admin to assign a Finance role template or user-specific exception with Bank Account read access."
            />
          </SectionCard>
        ) : (
          <SectionCard
            title="Bank Account Registry"
            description="Active and inactive bank accounts. Archived records are managed only through the archive modal."
            icon={Landmark}
          >
            <div className="mb-5 grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto_auto]">
              <TextInput
                value={search}
                onChange={setSearch}
                placeholder="Search by company, bank, identifier, currency, location, or status"
              />

              {permissionState.canCreate ? (
                <button
                  type="button"
                  onClick={() => navigate("/finance/master-data/bank-accounts/new")}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-cyan-400/20 bg-cyan-500/10 px-5 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/15"
                >
                  <Plus className="h-4 w-4" />
                  Create Bank Account
                </button>
              ) : null}

              {permissionState.canDeleteArchive ? (
                <button
                  type="button"
                  onClick={() => void openArchiveModal()}
                  disabled={isActionRunning}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-5 text-sm font-semibold text-rose-100 transition hover:bg-rose-500/15 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {runningAction === "archive-modal" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Archive className="h-4 w-4" />
                  )}
                  Archive
                </button>
              ) : null}
            </div>

            {isPageLoading ? (
              <div className="rounded-[28px] border border-dashed border-white/10 bg-black/20 px-6 py-12 text-center">
                <Loader2 className="mx-auto h-8 w-8 animate-spin text-cyan-200" />
                <div className="mt-4 text-sm font-semibold text-white">
                  Loading bank accounts
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Bank account records and permission state are being checked.
                </p>
              </div>
            ) : filteredRows.length === 0 ? (
              <EmptyState
                icon={CreditCard}
                title="No visible bank accounts found"
                description="Create a bank account or adjust the search filter to find a company banking record."
              />
            ) : (
              <div className="overflow-x-auto rounded-[24px] border border-white/10 bg-black/20">
                <div className="max-h-[720px] overflow-y-auto">
                  <table className="w-full min-w-[1240px] border-collapse">
                    <thead className="sticky top-0 z-20 border-b border-white/10 bg-black/70 backdrop-blur-xl">
                      <tr>
                        <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em]">
                          <SortButton
                            label="Company"
                            sortKey="company"
                            activeSortKey={sortKey}
                            direction={sortDirection}
                            onClick={toggleSort}
                          />
                        </th>
                        <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em]">
                          <SortButton
                            label="Bank"
                            sortKey="bank"
                            activeSortKey={sortKey}
                            direction={sortDirection}
                            onClick={toggleSort}
                          />
                        </th>
                        <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em]">
                          <SortButton
                            label="Identifier"
                            sortKey="identifier"
                            activeSortKey={sortKey}
                            direction={sortDirection}
                            onClick={toggleSort}
                          />
                        </th>
                        <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em]">
                          <SortButton
                            label="Currency"
                            sortKey="currency"
                            activeSortKey={sortKey}
                            direction={sortDirection}
                            onClick={toggleSort}
                          />
                        </th>
                        <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em]">
                          <SortButton
                            label="Default"
                            sortKey="default"
                            activeSortKey={sortKey}
                            direction={sortDirection}
                            onClick={toggleSort}
                          />
                        </th>
                        <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em]">
                          <SortButton
                            label="Status"
                            sortKey="status"
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
                          Actions
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {filteredRows.map((row) => {
                        const updatedAt = row.updated_at || row.created_at;
                        const isRowActionRunning = activeActionId === row.id;

                        return (
                          <tr
                            key={row.id}
                            className="border-b border-white/5 text-sm text-slate-300 transition hover:bg-white/[0.035]"
                          >
                            <td className="min-w-[260px] px-5 py-4">
                              <div className="font-semibold text-white">
                                {getCompanyName(row)}
                              </div>
                              <div className="mt-1 text-xs text-slate-500">
                                {row.company_code || "No company code"}
                              </div>
                            </td>

                            <td className="min-w-[230px] px-5 py-4">
                              <div className="font-semibold text-white">
                                {getBankName(row)}
                              </div>
                              <div className="mt-1 text-xs text-slate-500">
                                {getLocationLabel(row)}
                              </div>
                            </td>

                            <td className="min-w-[180px] px-5 py-4">
                              <div className="font-semibold text-white">
                                {getIdentifierLabel(row)}
                              </div>
                              <div className="mt-1 text-xs text-slate-500">
                                {row.beneficiary_name || "No beneficiary"}
                              </div>
                            </td>

                            <td className="min-w-[130px] px-5 py-4">
                              <span className="inline-flex rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-semibold text-white">
                                {row.currency_code || "—"}
                              </span>
                            </td>

                            <td className="min-w-[130px] px-5 py-4">
                              <DefaultBadge isDefault={Boolean(row.is_default)} />
                            </td>

                            <td className="min-w-[140px] px-5 py-4">
                              <StatusBadge value={row.status} />
                            </td>

                            <td className="min-w-[150px] px-5 py-4">
                              <div className="text-sm text-slate-300">
                                {formatDateLabel(updatedAt)}
                              </div>
                            </td>

                            <td className="px-5 py-4 text-right">
                              <div className="flex justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    navigate(
                                      `/finance/master-data/bank-accounts/${row.id}`
                                    )
                                  }
                                  className="inline-flex h-9 items-center justify-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-500/10 px-4 text-xs font-semibold uppercase tracking-[0.14em] text-cyan-100 transition hover:bg-cyan-500/15"
                                >
                                  Open
                                  <ArrowRight className="h-3.5 w-3.5" />
                                </button>

                                {permissionState.canDeleteArchive ? (
                                  <button
                                    type="button"
                                    onClick={() => void handleArchive(row.id)}
                                    disabled={isActionRunning}
                                    className="inline-flex h-9 items-center justify-center gap-2 rounded-full border border-rose-400/20 bg-rose-500/10 px-4 text-xs font-semibold uppercase tracking-[0.14em] text-rose-100 transition hover:bg-rose-500/15 disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    {isRowActionRunning && runningAction === "archive" ? (
                                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                      <Archive className="h-3.5 w-3.5" />
                                    )}
                                    Archive
                                  </button>
                                ) : null}
                              </div>
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
        )}

        <div className="rounded-[24px] border border-cyan-400/20 bg-cyan-500/10 p-4 text-sm leading-6 text-cyan-100">
          <div className="font-semibold text-white">Locked access rule</div>
          <div className="mt-1">
            This registry requires Bank Account Read access. Create is controlled by
            Create access. Archive, Restore, and Permanent Delete are controlled by
            Delete/Archive access. Update/Edit is handled inside the bank account ID page.
          </div>
        </div>
      </div>

      {showArchive ? (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-[30px] border border-white/10 bg-[#05070d] shadow-2xl shadow-black/60">
            <div className="flex items-start justify-between gap-4 border-b border-white/10 px-6 py-5">
              <div>
                <div className="text-lg font-semibold text-white">
                  Archived Company Bank Accounts
                </div>
                <div className="mt-1 text-sm leading-6 text-slate-500">
                  Archived records can be opened, restored, or permanently deleted.
                  There is no Deleted tab because this backend uses only active, inactive,
                  and archived lifecycle states.
                </div>
              </div>

              <button
                type="button"
                onClick={closeArchiveModal}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-slate-400 transition hover:bg-white/[0.08] hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="border-b border-white/10 p-4">
              <TextInput
                value={archiveSearch}
                onChange={setArchiveSearch}
                placeholder="Search archived bank accounts"
              />
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              {isLoadingArchive ? (
                <div className="rounded-[28px] border border-dashed border-white/10 bg-black/20 px-6 py-12 text-center">
                  <Loader2 className="mx-auto h-8 w-8 animate-spin text-cyan-200" />
                  <div className="mt-4 text-sm font-semibold text-white">
                    Loading archived bank accounts
                  </div>
                </div>
              ) : filteredArchivedRows.length === 0 ? (
                <EmptyState
                  icon={Archive}
                  title="No archived bank accounts"
                  description="Archived company bank accounts will appear here after they are removed from active operational use."
                />
              ) : (
                <div className="overflow-x-auto rounded-[24px] border border-white/10 bg-black/20">
                  <table className="w-full min-w-[980px] border-collapse">
                    <thead className="sticky top-0 z-20 border-b border-white/10 bg-black/70 backdrop-blur-xl">
                      <tr>
                        <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Company
                        </th>
                        <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Bank
                        </th>
                        <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Currency
                        </th>
                        <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Updated
                        </th>
                        <th className="px-5 py-4 text-right text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Actions
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {filteredArchivedRows.map((row) => {
                        const isRowActionRunning = activeActionId === row.id;
                        const updatedAt = row.updated_at || row.created_at;

                        return (
                          <tr
                            key={row.id}
                            className="border-b border-white/5 text-sm text-slate-300 transition hover:bg-white/[0.035]"
                          >
                            <td className="min-w-[260px] px-5 py-4">
                              <div className="font-semibold text-white">
                                {getCompanyName(row)}
                              </div>
                              <div className="mt-1 text-xs text-slate-500">
                                {row.company_code || "No company code"}
                              </div>
                            </td>

                            <td className="min-w-[240px] px-5 py-4">
                              <div className="font-semibold text-white">
                                {getBankName(row)}
                              </div>
                              <div className="mt-1 text-xs text-slate-500">
                                {getIdentifierLabel(row)}
                              </div>
                            </td>

                            <td className="min-w-[120px] px-5 py-4">
                              <span className="inline-flex rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-semibold text-white">
                                {row.currency_code || "—"}
                              </span>
                            </td>

                            <td className="min-w-[150px] px-5 py-4">
                              {formatDateLabel(updatedAt)}
                            </td>

                            <td className="px-5 py-4 text-right">
                              <div className="flex justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    navigate(
                                      `/finance/master-data/bank-accounts/${row.id}`
                                    )
                                  }
                                  className="inline-flex h-9 items-center justify-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-500/10 px-4 text-xs font-semibold uppercase tracking-[0.14em] text-cyan-100 transition hover:bg-cyan-500/15"
                                >
                                  Open
                                </button>

                                <button
                                  type="button"
                                  onClick={() => void handleRestore(row.id)}
                                  disabled={isActionRunning}
                                  className="inline-flex h-9 items-center justify-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-4 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-100 transition hover:bg-emerald-500/15 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  {isRowActionRunning && runningAction === "restore" ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <RotateCcw className="h-3.5 w-3.5" />
                                  )}
                                  Restore
                                </button>

                                <button
                                  type="button"
                                  onClick={() => void handlePermanentDelete(row.id)}
                                  disabled={isActionRunning}
                                  className="inline-flex h-9 items-center justify-center gap-2 rounded-full border border-rose-400/20 bg-rose-500/10 px-4 text-xs font-semibold uppercase tracking-[0.14em] text-rose-100 transition hover:bg-rose-500/15 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  {isRowActionRunning &&
                                  runningAction === "hard-delete" ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-3.5 w-3.5" />
                                  )}
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
