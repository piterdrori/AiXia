import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Database,
  Eye,
  Info,
  KeyRound,
  Loader2,
  RefreshCw,
  Search,
  Settings as SettingsIcon,
  ShieldCheck,
  Sparkles,
  UserRound,
  X,
  ReceiptText,
} from "lucide-react";

import {
  ACCESS_APPROVAL_GROUPS,
  ACCESS_APPROVAL_LEVEL_EXPLANATIONS,
  ACCESS_APPROVAL_LEVEL_ORDER,
  ACCESS_APPROVAL_SECTIONS,
  buildSectionToggleOverrides,
  countAvailableLevelsForGroup,
  countTotalLevelsForGroup,
  getEffectiveAccessDescription,
  getEffectiveAccessLabel,
  getSectionLevelState,
  getSectionsForGroup,
  type AccessApprovalEffectiveLabel,
  type AccessApprovalGroup,
  type AccessApprovalGroupKey,
  type AccessApprovalLevel,
  type AccessApprovalSection,
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

type ProfileRow = {
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

type DetailItem = {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
};

type RunningAction = "toggle" | "refresh" | "reset";

type GroupSummary = {
  groupKey: AccessApprovalGroupKey;
  title: string;
  enabledLevels: number;
  totalLevels: number;
  highestAccessLabel: AccessApprovalEffectiveLabel;
};

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

const levelIconMap: Record<AccessApprovalLevel, LucideIcon> = {
  see: Eye,
  monitor: Search,
  change: KeyRound,
  operate: ShieldCheck,
};

const groupIconMap: Record<AccessApprovalGroupKey, LucideIcon> = {
  masterData: Database,
  transactions: ReceiptText,
  reports: BarChart3,
  settings: SettingsIcon,
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

type HelpPanelData = {
  key: string;
  title: string;
  meaningTitle: string;
  meaningText: string;
  chips?: string[];
  permits: string[];
  doesNotPermit: string[];
};

function HelpButton({
  label,
  helpKey,
  activeHelpKey,
  onToggle,
}: {
  label: string;
  helpKey: string;
  activeHelpKey: string | null;
  onToggle: (helpKey: string) => void;
}) {
  const isActive = activeHelpKey === helpKey;

  return (
    <button
      type="button"
      onClick={() => onToggle(helpKey)}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] transition ${
        isActive
          ? "border-cyan-400/30 bg-cyan-500/15 text-cyan-100"
          : "border-white/10 bg-white/[0.04] text-slate-400 hover:border-cyan-400/20 hover:bg-cyan-500/10 hover:text-cyan-100"
      }`}
    >
      {label}
      <Info className="h-3 w-3" />
    </button>
  );
}

function HelpPanel({
  help,
  onClose,
}: {
  help: HelpPanelData;
  onClose: () => void;
}) {
  return (
    <div className="rounded-[24px] border border-cyan-400/20 bg-cyan-500/10 p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-200">
            Permission explanation
          </div>
          <div className="mt-1 text-sm font-semibold text-white">{help.title}</div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-black/20 text-slate-400 transition hover:bg-white/[0.06] hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[240px_minmax(0,1fr)_minmax(0,1fr)]">
        <div className="rounded-2xl border border-cyan-400/15 bg-black/20 p-3">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-cyan-200">
            {help.meaningTitle}
          </div>
          <div className="mt-2 text-xs leading-5 text-slate-300">
            {help.meaningText}
          </div>

          {help.chips?.length ? (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {help.chips.map((chip) => (
                <span
                  key={chip}
                  className="rounded-full border border-white/10 bg-white/[0.06] px-2 py-1 text-[10px] text-slate-300"
                >
                  {chip}
                </span>
              ))}
            </div>
          ) : null}
        </div>

        <div className="rounded-2xl border border-emerald-400/15 bg-emerald-500/10 p-3">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-200">
            Permits
          </div>
          <ul className="mt-2 list-disc space-y-1 pl-4 text-xs leading-5 text-slate-300">
            {help.permits.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-rose-400/15 bg-rose-500/10 p-3">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-rose-200">
            Does not permit
          </div>
          <ul className="mt-2 list-disc space-y-1 pl-4 text-xs leading-5 text-slate-300">
            {help.doesNotPermit.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function buildLevelHelp(level: AccessApprovalLevel): HelpPanelData {
  const explanation = ACCESS_APPROVAL_LEVEL_EXPLANATIONS[level];

  return {
    key: `level-${level}`,
    title: explanation.title,
    meaningTitle: "Meaning",
    meaningText: explanation.shortLabel,
    permits: explanation.permits,
    doesNotPermit: explanation.doesNotPermit,
  };
}

function buildSectionHelp(section: AccessApprovalSection): HelpPanelData {
  return {
    key: `section-${section.key}`,
    title: section.tooltip.title,
    meaningTitle: "Controls",
    meaningText: section.tooltip.description,
    chips: section.controls,
    permits: section.tooltip.permits,
    doesNotPermit: section.tooltip.doesNotPermit,
  };
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

function MatrixToggle({
  checked,
  disabled,
  onClick,
  level,
}: {
  checked: boolean;
  disabled?: boolean;
  onClick: () => void;
  level: AccessApprovalLevel;
}) {
  const Icon = levelIconMap[level];

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex h-11 min-w-[104px] items-center justify-center gap-2 rounded-2xl border px-4 text-xs font-semibold uppercase tracking-[0.14em] transition disabled:cursor-not-allowed disabled:opacity-45 ${
        checked
          ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/15"
          : "border-white/10 bg-white/[0.04] text-slate-500 hover:bg-white/[0.07] hover:text-slate-200"
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
      {checked ? "On" : "Off"}
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
  if (labels.includes("Can Operate Final Actions")) return "Can Operate Final Actions";
  if (labels.includes("Can Change Company Records")) return "Can Change Company Records";
  if (labels.includes("Can Monitor Company Records")) return "Can Monitor Company Records";
  if (labels.includes("Can Open Section")) return "Can Open Section";

  return "No Company Access";
}

function isAdminRole(role: Role | string | null | undefined) {
  return String(role || "").toLowerCase() === "admin";
}

function GroupSummaryCard({
  summary,
}: {
  summary: GroupSummary;
}) {
  const Icon = groupIconMap[summary.groupKey];
  const tone = effectiveAccessToneMap[summary.highestAccessLabel];
  const percent =
    summary.totalLevels > 0 ? (summary.enabledLevels / summary.totalLevels) * 100 : 0;

  return (
    <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-cyan-400/15 bg-cyan-500/10 text-cyan-200">
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-white">{summary.title}</div>
            <div className="mt-1 text-xs text-slate-500">
              {summary.enabledLevels} of {summary.totalLevels} permissions enabled
            </div>
          </div>
        </div>

        <StatusBadge value={summary.highestAccessLabel} tone={tone} />
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full border border-white/10 bg-black/30">
        <div
          className="h-full rounded-full bg-cyan-400/60"
          style={{ width: `${Math.max(0, Math.min(100, percent))}%` }}
        />
      </div>
    </div>
  );
}

function GroupPermissionCard({
  group,
  accessStates,
  actionLocked,
  hasAdminAccess,
  isTargetAdmin,
  onToggle,
}: {
  group: AccessApprovalGroup;
  accessStates: Record<AccessApprovalSectionKey, AccessLevelState>;
  actionLocked: boolean;
  hasAdminAccess: boolean;
  isTargetAdmin: boolean;
  onToggle: (section: AccessApprovalSection, level: AccessApprovalLevel) => void;
}) {
  const [activeHelpKey, setActiveHelpKey] = useState<string | null>(null);

  const Icon = groupIconMap[group.key];
  const sections = getSectionsForGroup(group.key);

  const helpItems = useMemo(() => {
    const items = new Map<string, HelpPanelData>();

    ACCESS_APPROVAL_LEVEL_ORDER.forEach((level) => {
      const help = buildLevelHelp(level);
      items.set(help.key, help);
    });

    sections.forEach((section) => {
      const help = buildSectionHelp(section);
      items.set(help.key, help);
    });

    return items;
  }, [sections]);

  const activeHelp = activeHelpKey ? helpItems.get(activeHelpKey) || null : null;

  const toggleHelp = useCallback((helpKey: string) => {
    setActiveHelpKey((currentKey) => (currentKey === helpKey ? null : helpKey));
  }, []);

  return (
    <section className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
      <div className="border-b border-white/10 bg-black/10 px-5 py-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <div className="rounded-2xl border border-cyan-400/15 bg-cyan-500/10 p-3 text-cyan-200">
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                {group.title}
              </div>
              <p className="mt-1 max-w-4xl text-xs leading-5 text-slate-500">
                {group.description}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {ACCESS_APPROVAL_LEVEL_ORDER.map((level) => (
              <HelpButton
                key={`${group.key}-${level}-label`}
                label={formatLabel(level)}
                helpKey={`level-${level}`}
                activeHelpKey={activeHelpKey}
                onToggle={toggleHelp}
              />
            ))}
          </div>
        </div>

        {activeHelp ? (
          <div className="mt-4">
            <HelpPanel help={activeHelp} onClose={() => setActiveHelpKey(null)} />
          </div>
        ) : null}
      </div>

      <div className="grid gap-4 p-5">
        {sections.map((section) => {
          const sectionState = accessStates[section.key];
          const effectiveLabel = getEffectiveAccessLabel(section, sectionState);
          const effectiveDescription = getEffectiveAccessDescription(section, sectionState);
          const effectiveTone = effectiveAccessToneMap[effectiveLabel];
          const sectionDisabled =
            actionLocked ||
            !hasAdminAccess ||
            (section.adminOnly && !isTargetAdmin);

          return (
            <div
              key={section.key}
              className="rounded-[24px] border border-white/10 bg-black/20 p-4"
            >
              <div className="grid gap-4 xl:grid-cols-[minmax(280px,1fr)_minmax(420px,auto)_260px] xl:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="font-semibold text-white">{section.title}</div>
                    <HelpButton
                      label="Info"
                      helpKey={`section-${section.key}`}
                      activeHelpKey={activeHelpKey}
                      onToggle={toggleHelp}
                    />
                  </div>
                  <div className="mt-1 text-xs leading-5 text-slate-500">
                    {section.scope}
                  </div>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {section.controls.slice(0, 6).map((item) => (
                      <span
                        key={item}
                        className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] text-slate-400"
                      >
                        {item}
                      </span>
                    ))}
                    {section.controls.length > 6 ? (
                      <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] text-slate-500">
                        +{section.controls.length - 6} more
                      </span>
                    ) : null}
                  </div>

                  {section.defaultRule ? (
                    <div className="mt-3 rounded-2xl border border-emerald-400/15 bg-emerald-500/10 px-3 py-2 text-xs leading-5 text-emerald-100">
                      {section.defaultRule}
                    </div>
                  ) : null}

                  {section.adminOnly && !isTargetAdmin ? (
                    <div className="mt-3 rounded-2xl border border-amber-400/15 bg-amber-500/10 px-3 py-2 text-xs leading-5 text-amber-100">
                      Admin-only section. This user must have Admin role before this access can be enabled.
                    </div>
                  ) : null}
                </div>

                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                  {ACCESS_APPROVAL_LEVEL_ORDER.map((level) => (
                    <div key={`${section.key}-${level}`} className="grid gap-1.5">
                      <div className="text-center text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                        {formatLabel(level)}
                      </div>
                      <MatrixToggle
                        checked={sectionState[level]}
                        disabled={sectionDisabled}
                        level={level}
                        onClick={() => onToggle(section, level)}
                      />
                    </div>
                  ))}
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-3">
                  <StatusBadge value={effectiveLabel} tone={effectiveTone} />
                  <div className="mt-2 text-xs leading-5 text-slate-500">
                    {effectiveDescription}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default function FinanceAccessApprovalUserDetailPage() {
  const navigate = useNavigate();
  const params = useParams<{ userId: string }>();
  const userId = params.userId;

  const [targetUser, setTargetUser] = useState<ProfileRow | null>(null);
  const [currentUser, setCurrentUser] = useState<CurrentProfileRow | null>(null);
  const [permissions, setPermissions] = useState<Partial<Record<Permission, boolean>>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [runningAction, setRunningAction] = useState<RunningAction | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [pageMessage, setPageMessage] = useState<string | null>(null);

  const loadUser = useCallback(
    async (mode: "initial" | "silent" = "initial") => {
      if (!userId) {
        setPageError("Missing user ID.");
        setIsLoading(false);
        return;
      }

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
          setTargetUser(null);
          return;
        }

        const [currentUserResult, targetUserResult] = await Promise.all([
          supabase
            .from("profiles")
            .select("role, permissions")
            .eq("user_id", authUserId)
            .maybeSingle(),

          supabase
            .from("profiles")
            .select(
              "user_id, full_name, role, status, requested_role, permissions, created_at, updated_at"
            )
            .eq("user_id", userId)
            .maybeSingle(),
        ]);

        if (currentUserResult.error) throw currentUserResult.error;
        if (targetUserResult.error) throw targetUserResult.error;

        const currentProfile = currentUserResult.data as CurrentProfileRow | null;
        const loadedTargetUser = targetUserResult.data as ProfileRow | null;

        if (!currentProfile) {
          setPageError("Current user profile was not found.");
          setTargetUser(null);
          return;
        }

        const currentEffectivePermissions = getEffectivePermissions(
          currentProfile.role,
          currentProfile.permissions || null
        );

        const isCurrentUserAdmin =
          String(currentProfile.role || "").toLowerCase() === "admin";

        if (!isCurrentUserAdmin || !currentEffectivePermissions.manageUsers) {
          setPageError("Admin access is required to manage Finance Access Approvals.");
          setCurrentUser(currentProfile);
          setTargetUser(null);
          return;
        }

        if (!loadedTargetUser) {
          setPageError("The selected user profile was not found.");
          setTargetUser(null);
          return;
        }

        setCurrentUser(currentProfile);
        setTargetUser(loadedTargetUser);
        setPermissions(loadedTargetUser.permissions || {});
      } catch (error) {
        console.error("Failed to load user finance access approval:", error);
        setPageError(
          error instanceof Error ? error.message : "Failed to load user finance access approval."
        );
        setTargetUser(null);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [userId]
  );

  useEffect(() => {
    void loadUser("initial");
  }, [loadUser]);

  useEffect(() => {
    if (!userId) return undefined;

    const channel = supabase
      .channel(`finance-access-approval-user-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "profiles",
          filter: `user_id=eq.${userId}`,
        },
        () => void loadUser("silent")
      )
      .subscribe();

    const intervalId = window.setInterval(() => {
      void loadUser("silent");
    }, 60000);

    return () => {
      window.clearInterval(intervalId);
      supabase.removeChannel(channel);
    };
  }, [loadUser, userId]);

  const roleDefaultPermissions = useMemo(() => {
    if (!targetUser) return null;
    return getEffectivePermissions(targetUser.role, null);
  }, [targetUser]);

  const effectivePermissions = useMemo(() => {
    if (!targetUser) return null;
    return getEffectivePermissions(targetUser.role, permissions || null);
  }, [permissions, targetUser]);

  const accessStates = useMemo(() => {
    if (!effectivePermissions) {
      return ACCESS_APPROVAL_SECTIONS.reduce(
        (map, section) => {
          map[section.key] = {
            see: false,
            monitor: false,
            change: false,
            operate: false,
          };
          return map;
        },
        {} as Record<AccessApprovalSectionKey, AccessLevelState>
      );
    }

    return ACCESS_APPROVAL_SECTIONS.reduce(
      (map, section) => {
        map[section.key] = getSectionLevelState(section, effectivePermissions);
        return map;
      },
      {} as Record<AccessApprovalSectionKey, AccessLevelState>
    );
  }, [effectivePermissions]);

  const highestAccessLabel = useMemo(() => {
    return getHighestAccessLabel(accessStates);
  }, [accessStates]);

  const groupSummaries = useMemo<GroupSummary[]>(() => {
    return ACCESS_APPROVAL_GROUPS.map((group) => ({
      groupKey: group.key,
      title: group.title,
      enabledLevels: countAvailableLevelsForGroup(group.key, accessStates),
      totalLevels: countTotalLevelsForGroup(group.key),
      highestAccessLabel: getHighestAccessLabel(accessStates, group.key),
    }));
  }, [accessStates]);

  const enabledLevelCount = useMemo(() => {
    return groupSummaries.reduce((total, summary) => total + summary.enabledLevels, 0);
  }, [groupSummaries]);

  const totalLevelCount = useMemo(() => {
    return groupSummaries.reduce((total, summary) => total + summary.totalLevels, 0);
  }, [groupSummaries]);

  const operatorSectionCount = useMemo(() => {
    return ACCESS_APPROVAL_SECTIONS.filter((section) => accessStates[section.key]?.operate).length;
  }, [accessStates]);

  const overriddenPermissionCount = useMemo(() => {
    return Object.keys(permissions || {}).length;
  }, [permissions]);

  const hasAdminAccess = useMemo(() => {
    if (!currentUser) return false;

    const isCurrentUserAdmin =
      String(currentUser.role || "").toLowerCase() === "admin";

    const currentEffectivePermissions = getEffectivePermissions(
      currentUser.role,
      currentUser.permissions || null
    );

    return Boolean(isCurrentUserAdmin && currentEffectivePermissions.manageUsers);
  }, [currentUser]);

  const userSummaryItems = useMemo<DetailItem[]>(() => {
    if (!targetUser) return [];

    return [
      {
        label: "User",
        value: targetUser.full_name || "Unnamed user",
        detail: targetUser.user_id,
      },
      {
        label: "Role",
        value: <StatusBadge value={targetUser.role} tone="cyan" />,
        detail:
          targetUser.requested_role && targetUser.requested_role !== targetUser.role
            ? `Requested role: ${formatLabel(targetUser.requested_role)}`
            : "Current active role.",
      },
      {
        label: "Status",
        value: <StatusBadge value={targetUser.status} />,
        detail: "Profile lifecycle status.",
      },
      {
        label: "Effective Access",
        value: (
          <StatusBadge
            value={highestAccessLabel}
            tone={effectiveAccessToneMap[highestAccessLabel]}
          />
        ),
        detail: "Highest finance-level access currently enabled.",
      },
      {
        label: "Enabled Permissions",
        value: `${formatCount(enabledLevelCount)} / ${formatCount(totalLevelCount)}`,
        detail: "Finance permission levels enabled across all groups.",
      },
      {
        label: "Operator Sections",
        value: formatCount(operatorSectionCount),
        detail: "Sections where final workflow action access is enabled.",
      },
      {
        label: "Overrides",
        value: formatCount(overriddenPermissionCount),
        detail: "Low-level permission overrides stored on this profile.",
      },
      {
        label: "Updated",
        value: formatDateTime(targetUser.updated_at || targetUser.created_at),
        detail: "Latest profile permission update timestamp.",
      },
    ];
  }, [
    enabledLevelCount,
    highestAccessLabel,
    operatorSectionCount,
    overriddenPermissionCount,
    targetUser,
    totalLevelCount,
  ]);

  const updatePermissions = useCallback(
    async (nextPermissions: Partial<Record<Permission, boolean>>, successMessage: string) => {
      if (!targetUser) return;

      setRunningAction("toggle");
      setPageError(null);
      setPageMessage(null);

      try {
        const updateResult = await supabase
          .from("profiles")
          .update({
            permissions: nextPermissions,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", targetUser.user_id);

        if (updateResult.error) throw updateResult.error;

        setPermissions(nextPermissions);
        setPageMessage(successMessage);
      } catch (error) {
        console.error("Failed to update finance access approval:", error);
        setPageError(
          error instanceof Error ? error.message : "Failed to update finance access approval."
        );
        await loadUser("silent");
      } finally {
        setRunningAction(null);
      }
    },
    [loadUser, targetUser]
  );

  const handleToggle = useCallback(
    async (section: AccessApprovalSection, level: AccessApprovalLevel) => {
      if (!targetUser || !roleDefaultPermissions || !effectivePermissions) return;

      if (section.adminOnly && !isAdminRole(targetUser.role)) {
        setPageError(
          "Finance Access Approvals is admin-only. Change the user role to Admin before enabling this section."
        );
        return;
      }

      const currentState = getSectionLevelState(section, effectivePermissions);
      const nextEnabled = !currentState[level];

      const nextPermissions = buildSectionToggleOverrides({
        section,
        level,
        enabled: nextEnabled,
        currentOverrides: permissions || {},
        roleDefaultPermissions,
      });

      await updatePermissions(
        nextPermissions,
        `${section.title} ${formatLabel(level)} turned ${nextEnabled ? "on" : "off"}.`
      );
    },
    [effectivePermissions, permissions, roleDefaultPermissions, targetUser, updatePermissions]
  );

  const resetOverrides = useCallback(async () => {
    if (!targetUser || runningAction) return;

    setRunningAction("reset");
    setPageError(null);
    setPageMessage(null);

    try {
      const updateResult = await supabase
        .from("profiles")
        .update({
          permissions: {},
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", targetUser.user_id);

      if (updateResult.error) throw updateResult.error;

      setPermissions({});
      setPageMessage("All custom finance access overrides were reset to role defaults.");
    } catch (error) {
      console.error("Failed to reset finance access overrides:", error);
      setPageError(
        error instanceof Error ? error.message : "Failed to reset finance access overrides."
      );
      await loadUser("silent");
    } finally {
      setRunningAction(null);
    }
  }, [loadUser, runningAction, targetUser]);

  const manualRefresh = useCallback(async () => {
    setRunningAction("refresh");
    await loadUser("silent");
    setRunningAction(null);
  }, [loadUser]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#05070d] px-4 py-4 text-white md:px-6 md:py-6">
        <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
          <div className="rounded-[34px] border border-white/10 bg-white/[0.045] p-12 text-center backdrop-blur-xl">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-cyan-200" />
            <div className="mt-4 text-sm text-slate-400">
              Loading user Finance Access Approval...
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!targetUser) {
    return (
      <div className="min-h-screen bg-[#05070d] px-4 py-4 text-white md:px-6 md:py-6">
        <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
          <div className="rounded-[34px] border border-rose-400/20 bg-rose-500/10 p-12 text-center">
            <AlertTriangle className="mx-auto h-8 w-8 text-rose-200" />
            <div className="mt-4 text-lg font-semibold text-white">
              Finance access approval profile not available
            </div>
            <div className="mt-2 text-sm text-rose-100">
              {pageError || "The selected user profile could not be loaded."}
            </div>
            <button
              type="button"
              onClick={() => navigate("/finance/access-approvals")}
              className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] px-5 text-sm font-semibold text-white transition hover:bg-white/[0.08]"
            >
              <ArrowRight className="h-4 w-4 rotate-180" />
              Finance Access Approvals
            </button>
          </div>
        </div>
      </div>
    );
  }

  const actionLocked = Boolean(runningAction);
  const isTargetAdmin = isAdminRole(targetUser.role);

  return (
    <div className="min-h-screen bg-[#05070d] px-4 py-4 text-white md:px-6 md:py-6">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
        <header className="relative overflow-hidden rounded-[34px] border border-white/10 bg-white/[0.045] p-6 shadow-2xl shadow-black/30 backdrop-blur-xl">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(6,182,212,0.16),transparent_38%),radial-gradient(circle_at_top_right,rgba(139,92,246,0.12),transparent_34%)]" />

          <div className="relative grid gap-6 xl:grid-cols-[minmax(0,1fr)_520px] xl:items-end">
            <div>
              <button
                type="button"
                onClick={() => navigate("/finance/access-approvals")}
                className="mb-5 inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-300 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
              >
                <ArrowRight className="h-3.5 w-3.5 rotate-180" />
                Finance Access Approvals
              </button>

              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-200">
                <Sparkles className="h-3.5 w-3.5" />
                User Finance Access Approval
              </div>

              <h1 className="mt-4 text-3xl font-semibold tracking-[-0.035em] text-white md:text-5xl">
                {targetUser.full_name || "Unnamed user"}
              </h1>

              <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-400 md:text-base md:leading-7">
                Approve what this user can see, monitor, change, and operate across Finance:
                Master Data, Transactions, Reports, and Settings.
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                <StatusBadge value={targetUser.role} tone="cyan" />
                <StatusBadge value={targetUser.status} />
                {isRefreshing ? (
                  <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-300">
                    Silent Refresh
                  </span>
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
                      Current Power
                    </div>
                    <div className="mt-2 text-xl font-semibold leading-tight tracking-[-0.035em] text-white">
                      {highestAccessLabel}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/10 p-3 text-cyan-200">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-3 text-xs leading-5 text-slate-500">
                  This is the highest finance-level access currently enabled for this user.
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

        {pageMessage ? (
          <div className="rounded-[24px] border border-emerald-400/20 bg-emerald-500/10 p-4 text-sm leading-6 text-emerald-100">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <div>{pageMessage}</div>
            </div>
          </div>
        ) : null}

        {!hasAdminAccess ? (
          <div className="rounded-[24px] border border-rose-400/20 bg-rose-500/10 p-4 text-sm leading-6 text-rose-100">
            Admin access is required to modify this page.
          </div>
        ) : null}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {userSummaryItems.map((item) => (
            <ValueBlock
              key={item.label}
              label={item.label}
              value={item.value}
              detail={item.detail}
            />
          ))}
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {groupSummaries.map((summary) => (
            <GroupSummaryCard key={summary.groupKey} summary={summary} />
          ))}
        </section>

        <SectionCard
          title="Finance Access Permission Editor"
          description="Edit the real permission matrix by Finance group. The list page only shows summaries; this page controls the actual toggles."
          icon={KeyRound}
        >
          <div className="mb-5 flex flex-col gap-3 rounded-[24px] border border-white/10 bg-black/20 p-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="text-sm font-semibold text-white">
                See / Monitor / Change / Operate Matrix
              </div>
              <div className="mt-1 text-xs leading-5 text-slate-500">
                Higher levels include lower levels. Turning off a lower level also turns off higher
                levels inside the same Finance section.
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void manualRefresh()}
                disabled={actionLocked}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] px-4 text-sm font-semibold text-slate-300 transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {runningAction === "refresh" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Refresh
              </button>

              <button
                type="button"
                onClick={() => void resetOverrides()}
                disabled={actionLocked || overriddenPermissionCount === 0}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 text-sm font-semibold text-rose-100 transition hover:bg-rose-500/15 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {runningAction === "reset" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <X className="h-4 w-4" />
                )}
                Reset Overrides
              </button>
            </div>
          </div>

          <div className="grid gap-5">
            {ACCESS_APPROVAL_GROUPS.map((group) => (
              <GroupPermissionCard
                key={group.key}
                group={group}
                accessStates={accessStates}
                actionLocked={actionLocked}
                hasAdminAccess={hasAdminAccess}
                isTargetAdmin={isTargetAdmin}
                onToggle={(section, level) => void handleToggle(section, level)}
              />
            ))}
          </div>
        </SectionCard>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {ACCESS_APPROVAL_LEVEL_ORDER.map((level) => {
            const explanation = ACCESS_APPROVAL_LEVEL_EXPLANATIONS[level];
            const Icon = levelIconMap[level];

            return (
              <div
                key={level}
                className="rounded-[24px] border border-white/10 bg-white/[0.045] p-4"
              >
                <div className="flex items-center gap-3">
                  <Icon className="h-4 w-4 text-cyan-200" />
                  <div className="text-sm font-semibold text-white">
                    {explanation.title}
                  </div>
                </div>
                <p className="mt-2 text-xs leading-5 text-slate-500">
                  {explanation.shortLabel}
                </p>
              </div>
            );
          })}
        </section>

        <div className="rounded-[24px] border border-cyan-400/20 bg-cyan-500/10 p-4 text-sm leading-6 text-cyan-100">
          <div className="font-semibold text-white">Locked default rule</div>
          <div className="mt-1">
            Normal users can see, create, edit, submit, upload, and confirm their own expenses and
            paycheck requests by default. This page only grants or removes additional company-level
            Finance access.
          </div>
        </div>
      </div>
    </div>
  );
}
