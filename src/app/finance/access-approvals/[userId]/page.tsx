import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  BarChart3,
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
  AixiaAlert,
  AixiaBadge,
  AixiaButton,
  AixiaHero,
  AixiaInfoBlock,
  AixiaLoadingState,
  AixiaMetricCard,
  AixiaMetricGrid,
  AixiaNotFoundState,
  AixiaPage,
  AixiaSection,
  AixiaStatusBadge,
  AixiaValueBlock,
} from "@/components/aixia";
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
import {
  fetchFinanceEffectivePermissions,
  resolveFinancePagePermissionState,
  type FinanceLoadMode,
  type FinancePagePermissionState,
} from "@/lib/finance/pageAccess";
import { supabase } from "@/lib/supabase";
import type { Permission, Role } from "@/lib/permissions";

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

type DetailItem = {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
};

type RunningAction = "toggle" | "refresh" | "reset" | "template";

type GroupSummary = {
  groupKey: AccessApprovalGroupKey;
  title: string;
  enabledLevels: number;
  totalLevels: number;
  highestAccessLabel: AccessApprovalEffectiveLabel;
};

type HelpPanelData = {
  key: string;
  title: string;
  meaningTitle: string;
  meaningText: string;
  chips?: string[];
  permits: string[];
  doesNotPermit: string[];
};

const PAGE_ACCESS_CONFIG = {
  sectionKey: "accessApprovals",
  adminPermissions: ["manageUsers"],
  readPermissions: ["manageUsers"],
  createPermissions: ["manageUsers"],
  updatePermissions: ["manageUsers"],
  deleteArchivePermissions: ["manageUsers"],
  approveExecutePermissions: ["manageUsers"],
} as const;

const EMPTY_ACCESS_STATE = ACCESS_APPROVAL_SECTIONS.reduce(
  (map, section) => {
    map[section.key] = {
      read: false,
      create: false,
      update: false,
      deleteArchive: false,
      approveExecute: false,
    };
    return map;
  },
  {} as Record<AccessApprovalSectionKey, AccessLevelState>
);

const effectiveAccessToneMap: Record<
  AccessApprovalEffectiveLabel,
  "indigo" | "violet" | "gold" | "amber" | "emerald" | "cyan" | "rose" | "neutral"
> = {
  "No Company Access": "neutral",
  "Can Read Section": "cyan",
  "Can Create Records": "violet",
  "Can Update Records": "amber",
  "Can Delete / Archive": "rose",
  "Can Approve / Execute": "emerald",
  "Admin Only": "rose",
};

const levelIconMap: Record<AccessApprovalLevel, LucideIcon> = {
  read: Eye,
  create: Search,
  update: KeyRound,
  deleteArchive: KeyRound,
  approveExecute: ShieldCheck,
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

function coercePermissionMap(
  value: Partial<Record<Permission, boolean>> | null | undefined
): Partial<Record<Permission, boolean>> {
  if (!value || typeof value !== "object") {
    return {};
  }

  return value;
}

function isAdminRole(role: Role | string | null | undefined) {
  return String(role || "").toLowerCase() === "admin";
}

function FinanceAccessBadge({
  value,
}: {
  value: AccessApprovalEffectiveLabel;
}) {
  return <AixiaBadge tone={effectiveAccessToneMap[value]}>{value}</AixiaBadge>;
}

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
  return (
    <AixiaButton
      type="button"
      variant={activeHelpKey === helpKey ? "primary" : "secondary"}
      onClick={() => onToggle(helpKey)}
    >
      {label}
      <Info className="h-3.5 w-3.5" />
    </AixiaButton>
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
    <AixiaInfoBlock
      tone="cyan"
      icon={Info}
      title={`Permission explanation — ${help.title}`}
    >
      <div className="aixia-stack">
        <AixiaValueBlock
          label={help.meaningTitle}
          value={help.meaningText}
          detail={
            help.chips?.length ? (
              <div className="aixia-action-system" data-align="start" data-density="compact">
                {help.chips.map((chip) => (
                  <AixiaBadge key={chip} tone="neutral">
                    {chip}
                  </AixiaBadge>
                ))}
              </div>
            ) : null
          }
        />

        <div className="aixia-smart-grid" data-mode="cards">
          <AixiaValueBlock
            label="Permits"
            value={
              <ul>
                {help.permits.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            }
          />

          <AixiaValueBlock
            label="Does not permit"
            value={
              <ul>
                {help.doesNotPermit.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            }
          />
        </div>

        <div className="aixia-action-system" data-align="end" data-density="compact">
          <AixiaButton type="button" variant="secondary" onClick={onClose}>
            <X className="h-4 w-4" />
            Close
          </AixiaButton>
        </div>
      </div>
    </AixiaInfoBlock>
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
    <AixiaButton
      type="button"
      variant={checked ? "primary" : "secondary"}
      disabled={disabled}
      onClick={onClick}
    >
      <Icon className="h-3.5 w-3.5" />
      {checked ? "On" : "Off"}
    </AixiaButton>
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

function GroupSummaryCard({
  summary,
}: {
  summary: GroupSummary;
}) {
  const Icon = groupIconMap[summary.groupKey];

  return (
    <AixiaMetricCard
      label={summary.title}
      value={`${summary.enabledLevels} / ${summary.totalLevels}`}
      description={summary.highestAccessLabel}
      icon={Icon}
      tone={effectiveAccessToneMap[summary.highestAccessLabel]}
    />
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
    <AixiaSection
      title={group.title}
      description={group.description}
      icon={Icon}
      actions={
        <div className="aixia-action-system" data-align="end" data-density="compact">
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
      }
    >
      <div className="aixia-stack">
        {activeHelp ? (
          <HelpPanel help={activeHelp} onClose={() => setActiveHelpKey(null)} />
        ) : null}

        {sections.map((section) => {
          const sectionState = accessStates[section.key];
          const effectiveLabel = getEffectiveAccessLabel(section, sectionState);
          const effectiveDescription = getEffectiveAccessDescription(section, sectionState);
          const sectionDisabled =
            actionLocked ||
            !hasAdminAccess ||
            (section.adminOnly && !isTargetAdmin);

          return (
            <AixiaValueBlock
              key={section.key}
              label={
                <div className="aixia-action-system" data-align="start" data-density="compact">
                  <span>{section.title}</span>
                  <HelpButton
                    label="Info"
                    helpKey={`section-${section.key}`}
                    activeHelpKey={activeHelpKey}
                    onToggle={toggleHelp}
                  />
                </div>
              }
              value={
                <div className="aixia-stack">
                  <div className="aixia-caption">{section.scope}</div>

                  <div className="aixia-action-system" data-align="start" data-density="compact">
                    {section.controls.slice(0, 6).map((item) => (
                      <AixiaBadge key={item} tone="neutral">
                        {item}
                      </AixiaBadge>
                    ))}
                    {section.controls.length > 6 ? (
                      <AixiaBadge tone="neutral">
                        +{section.controls.length - 6} more
                      </AixiaBadge>
                    ) : null}
                  </div>

                  {section.defaultRule ? (
                    <AixiaInfoBlock tone="emerald">{section.defaultRule}</AixiaInfoBlock>
                  ) : null}

                  {section.adminOnly && !isTargetAdmin ? (
                    <AixiaInfoBlock tone="gold">
                      Admin-only section. This user must have Admin role before this access can be enabled.
                    </AixiaInfoBlock>
                  ) : null}

                  <div className="aixia-smart-grid" data-mode="compact">
                    {ACCESS_APPROVAL_LEVEL_ORDER.map((level) => (
                      <AixiaValueBlock
                        key={`${section.key}-${level}`}
                        label={formatLabel(level)}
                        value={
                          <MatrixToggle
                            checked={sectionState[level]}
                            disabled={sectionDisabled}
                            level={level}
                            onClick={() => onToggle(section, level)}
                          />
                        }
                      />
                    ))}
                  </div>
                </div>
              }
              detail={
                <div className="aixia-stack">
                  <FinanceAccessBadge value={effectiveLabel} />
                  <div>{effectiveDescription}</div>
                </div>
              }
            />
          );
        })}
      </div>
    </AixiaSection>
  );
}

export default function FinanceAccessApprovalUserDetailPage() {
  const navigate = useNavigate();
  const params = useParams<{ userId: string }>();
  const userId = params.userId;

  const [targetUser, setTargetUser] = useState<ProfileRow | null>(null);
  const [currentUser, setCurrentUser] = useState<CurrentProfileRow | null>(null);
  const [currentPagePermissionState, setCurrentPagePermissionState] =
    useState<FinancePagePermissionState | null>(null);
  const [permissions, setPermissions] = useState<Partial<Record<Permission, boolean>>>({});
  const [targetEffectivePermissions, setTargetEffectivePermissions] =
    useState<Partial<Record<Permission, boolean>> | null>(null);
  const [financeTemplates, setFinanceTemplates] = useState<FinancePermissionTemplateRow[]>([]);
  const [selectedFinanceTemplateId, setSelectedFinanceTemplateId] = useState<string>("");
  const [targetFinanceTemplate, setTargetFinanceTemplate] =
    useState<FinancePermissionTemplateRow | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [runningAction, setRunningAction] = useState<RunningAction | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [pageMessage, setPageMessage] = useState<string | null>(null);
  const [accessDeniedReason, setAccessDeniedReason] = useState<string | null>(null);

  const loadUser = useCallback(
    async (mode: FinanceLoadMode = "initial") => {
      if (!userId) {
        if (mode === "initial") {
          setPageError("Missing user ID.");
          setIsLoading(false);
        }
        return;
      }

      if (mode === "initial") {
        setIsLoading(true);
      } else {
        setIsRefreshing(true);
      }

      if (mode === "initial") {
        setPageError(null);
        setAccessDeniedReason(null);
      }

      try {
        const authResult = await supabase.auth.getUser();
        if (authResult.error) throw authResult.error;

        const authUserId = authResult.data.user?.id;

        if (!authUserId) {
          if (mode === "initial") {
            setAccessDeniedReason("You must be logged in to manage Finance Access Approvals.");
            setTargetUser(null);
          }
          return;
        }

        const [
          currentUserResult,
          targetUserResult,
          templatesResult,
          targetTemplateResult,
          currentEffectivePermissions,
          loadedTargetEffectivePermissions,
        ] = await Promise.all([
          supabase
            .from("profiles")
            .select("role")
            .eq("user_id", authUserId)
            .maybeSingle(),

          supabase
            .from("profiles")
            .select(
              "user_id, full_name, role, status, requested_role, permissions, created_at, updated_at"
            )
            .eq("user_id", userId)
            .maybeSingle(),

          supabase
            .from("finance_permission_templates")
            .select(
              "id, template_key, template_name, description, permissions, is_system, is_active"
            )
            .eq("is_active", true)
            .order("template_name", { ascending: true }),

          supabase
            .from("finance_user_permission_templates")
            .select("user_id, template_id")
            .eq("user_id", userId)
            .maybeSingle(),

          fetchFinanceEffectivePermissions(
            authUserId,
            mode,
            "Finance Access Approval User Detail Current User"
          ),

          fetchFinanceEffectivePermissions(
            userId,
            mode,
            "Finance Access Approval User Detail Target User"
          ),
        ]);

        if (currentUserResult.error) throw currentUserResult.error;
        if (targetUserResult.error) throw targetUserResult.error;
        if (templatesResult.error) throw templatesResult.error;
        if (targetTemplateResult.error) throw targetTemplateResult.error;

        const currentProfile = currentUserResult.data as CurrentProfileRow | null;
        const loadedTargetUser = targetUserResult.data as ProfileRow | null;
        const loadedTemplates =
          (templatesResult.data || []) as FinancePermissionTemplateRow[];
        const loadedTemplateAssignment =
          targetTemplateResult.data as FinanceUserPermissionTemplateRow | null;

        if (!currentProfile) {
          if (mode === "initial") {
            setPageError("Current user profile was not found.");
            setTargetUser(null);
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
              "Admin access is required to manage Finance Access Approvals."
            );
            setTargetUser(null);
          }

          return;
        }

        if (!loadedTargetUser) {
          if (mode === "initial") {
            setPageError("The selected user profile was not found.");
            setTargetUser(null);
          }
          return;
        }

        const resolvedTemplate =
          loadedTemplates.find(
            (template) => template.id === loadedTemplateAssignment?.template_id
          ) ||
          loadedTemplates.find((template) => template.template_key === "custom") ||
          null;

        setCurrentUser(currentProfile);
        setCurrentPagePermissionState(permissionState);
        setTargetUser(loadedTargetUser);
        setPermissions(loadedTargetUser.permissions || {});
        setTargetEffectivePermissions(loadedTargetEffectivePermissions);
        setFinanceTemplates(loadedTemplates);
        setSelectedFinanceTemplateId(resolvedTemplate?.id || "");
        setTargetFinanceTemplate(resolvedTemplate);
        setPageError(null);
        setAccessDeniedReason(null);
      } catch (error) {
        console.error("Failed to load user finance access approval:", error);

        if (mode === "initial") {
          setPageError(
            error instanceof Error
              ? error.message
              : "Failed to load user finance access approval."
          );
          setTargetUser(null);
        }
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

    const profilesChannel = supabase
      .channel(`finance-access-approval-user-profile-${userId}`)
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

    const templateChannel = supabase
      .channel(`finance-access-approval-user-template-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "finance_user_permission_templates",
          filter: `user_id=eq.${userId}`,
        },
        () => void loadUser("silent")
      )
      .subscribe();

    const financeTemplatesChannel = supabase
      .channel("finance-access-approval-user-finance-templates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "finance_permission_templates",
        },
        () => void loadUser("silent")
      )
      .subscribe();

    const intervalId = window.setInterval(() => {
      void loadUser("silent");
    }, 60000);

    return () => {
      window.clearInterval(intervalId);
      supabase.removeChannel(profilesChannel);
      supabase.removeChannel(templateChannel);
      supabase.removeChannel(financeTemplatesChannel);
    };
  }, [loadUser, userId]);

  const templatePermissionOverrides = useMemo(() => {
    return coercePermissionMap(targetFinanceTemplate?.permissions || null);
  }, [targetFinanceTemplate]);

  const roleDefaultPermissions = useMemo(() => {
    return templatePermissionOverrides as Record<Permission, boolean>;
  }, [templatePermissionOverrides]);

  const accessStates = useMemo(() => {
    if (!targetEffectivePermissions) {
      return EMPTY_ACCESS_STATE;
    }

    return ACCESS_APPROVAL_SECTIONS.reduce(
      (map, section) => {
        map[section.key] = getSectionLevelState(
          section,
          targetEffectivePermissions as Record<Permission, boolean>
        );
        return map;
      },
      {} as Record<AccessApprovalSectionKey, AccessLevelState>
    );
  }, [targetEffectivePermissions]);

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

  const overriddenPermissionCount = useMemo(() => {
    return Object.keys(permissions || {}).length;
  }, [permissions]);

  const templatePermissionCount = useMemo(() => {
    return Object.values(templatePermissionOverrides).filter(Boolean).length;
  }, [templatePermissionOverrides]);

  const hasAdminAccess = useMemo(() => {
    if (!currentUser || !currentPagePermissionState) return false;
    return Boolean(currentPagePermissionState.isAdmin && currentPagePermissionState.canRead);
  }, [currentPagePermissionState, currentUser]);

  const userSummaryItems = useMemo<DetailItem[]>(() => {
    if (!targetUser) return [];

    return [
      {
        label: "User",
        value: targetUser.full_name || "Unnamed user",
        detail: targetUser.user_id,
      },
      {
        label: "Base System Role",
        value: <AixiaStatusBadge value={targetUser.role} />,
        detail:
          targetUser.requested_role && targetUser.requested_role !== targetUser.role
            ? `Requested role: ${formatLabel(targetUser.requested_role)}`
            : "Base app role: admin, manager, employee, or guest.",
      },
      {
        label: "Finance Template",
        value: targetFinanceTemplate ? (
          <AixiaBadge tone="violet">{targetFinanceTemplate.template_name}</AixiaBadge>
        ) : (
          "—"
        ),
        detail:
          targetFinanceTemplate?.description ||
          "Finance role template assigned to this user.",
      },
      {
        label: "Status",
        value: <AixiaStatusBadge value={targetUser.status} />,
        detail: "Profile lifecycle status.",
      },
      {
        label: "Effective Access",
        value: <FinanceAccessBadge value={highestAccessLabel} />,
        detail: "Highest finance-level access currently enabled.",
      },
      {
        label: "Enabled Permissions",
        value: `${formatCount(enabledLevelCount)} / ${formatCount(totalLevelCount)}`,
        detail: "Finance permission levels enabled across all groups.",
      },
      {
        label: "Template Permissions",
        value: formatCount(templatePermissionCount),
        detail: "Enabled permissions coming from the selected Finance role template.",
      },
      {
        label: "User Overrides",
        value: formatCount(overriddenPermissionCount),
        detail: "Low-level exceptions stored on this profile.",
      },
    ];
  }, [
    enabledLevelCount,
    highestAccessLabel,
    overriddenPermissionCount,
    targetFinanceTemplate,
    targetUser,
    templatePermissionCount,
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
        await loadUser("silent");
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
      if (!targetUser || !targetEffectivePermissions) return;

      if (section.adminOnly && !isAdminRole(targetUser.role)) {
        setPageError(
          "Finance Access Approvals is admin-only. Change the user role to Admin before enabling this section."
        );
        return;
      }

      const currentState = getSectionLevelState(
        section,
        targetEffectivePermissions as Record<Permission, boolean>
      );
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
    [
      permissions,
      roleDefaultPermissions,
      targetEffectivePermissions,
      targetUser,
      updatePermissions,
    ]
  );

  const updateFinanceTemplate = useCallback(
    async (nextTemplateId: string) => {
      if (!targetUser || runningAction) return;

      const nextTemplate = financeTemplates.find(
        (template) => template.id === nextTemplateId
      );

      if (!nextTemplate) {
        setPageError("Selected finance template was not found.");
        return;
      }

      setRunningAction("template");
      setPageError(null);
      setPageMessage(null);

      try {
        const updateResult = await supabase
          .from("finance_user_permission_templates")
          .upsert(
            {
              user_id: targetUser.user_id,
              template_id: nextTemplate.id,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "user_id" }
          );

        if (updateResult.error) throw updateResult.error;

        setSelectedFinanceTemplateId(nextTemplate.id);
        setTargetFinanceTemplate(nextTemplate);
        setPageMessage(`Finance role template changed to ${nextTemplate.template_name}.`);
        await loadUser("silent");
      } catch (error) {
        console.error("Failed to update finance role template:", error);
        setPageError(
          error instanceof Error ? error.message : "Failed to update finance role template."
        );
        await loadUser("silent");
      } finally {
        setRunningAction(null);
      }
    },
    [financeTemplates, loadUser, runningAction, targetUser]
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
      setPageMessage(
        "All custom finance access overrides were reset to the selected finance template baseline."
      );
      await loadUser("silent");
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
      <AixiaLoadingState
        title="Loading Finance Access Approval"
        description="The user profile, Finance template, and effective permission state are being checked."
        fullPage
      />
    );
  }

  if (!targetUser) {
    return (
      <AixiaNotFoundState
        title={
          accessDeniedReason
            ? "Finance access approval is restricted"
            : "Finance access approval profile not available"
        }
        description={
          accessDeniedReason ||
          pageError ||
          "The selected user profile could not be loaded."
        }
        fullPage
        action={
          <AixiaButton
            type="button"
            variant="secondary"
            onClick={() => navigate("/finance/access-approvals")}
          >
            <ArrowRight className="h-4 w-4 rotate-180" />
            Finance Access Approvals
          </AixiaButton>
        }
      />
    );
  }

  const actionLocked = Boolean(runningAction);
  const isTargetAdmin = isAdminRole(targetUser.role);

  return (
    <AixiaPage>
      <AixiaHero
        parentLabel="Finance Access Approvals"
        parentPath="/finance/access-approvals"
        gradientTitle="User Finance"
        title="Access Approval"
        subtitle={targetUser.full_name || "Unnamed user"}
        description="Assign a base system role and a Finance role template, then use the permission matrix only for user-specific exceptions."
        badges={[
          { label: "User Finance Access Approval", tone: "cyan" },
          { label: formatLabel(targetUser.role), tone: "cyan" },
          {
            label: targetFinanceTemplate?.template_name || "No Finance Template",
            tone: "violet",
          },
          { label: formatLabel(targetUser.status), tone: "neutral" },
          ...(isRefreshing ? [{ label: "Silent Refresh", tone: "neutral" as const }] : []),
        ]}
        statusCards={[
          {
            label: "Base System Role",
            value: formatLabel(targetUser.role),
            description:
              "Admin-only Finance controls still require the base system role to be Admin.",
            icon: UserRound,
            tone: "cyan",
          },
          {
            label: "Current Power",
            value: highestAccessLabel,
            description:
              "Highest effective Finance access after role, template, and overrides are combined.",
            icon: ShieldCheck,
            tone: effectiveAccessToneMap[highestAccessLabel],
          },
        ]}
      >
        <div className="aixia-action-system" data-align="start" data-density="compact">
          <AixiaBadge tone="cyan">
            <Sparkles className="h-3.5 w-3.5" />
            Permission matrix
          </AixiaBadge>
        </div>
      </AixiaHero>

      {pageError ? <AixiaAlert tone="error">{pageError}</AixiaAlert> : null}
      {pageMessage ? <AixiaAlert tone="success">{pageMessage}</AixiaAlert> : null}

      {!hasAdminAccess ? (
        <AixiaAlert tone="error">
          Admin access is required to modify this page.
        </AixiaAlert>
      ) : null}

      <section className="aixia-smart-grid" data-mode="cards">
        {userSummaryItems.map((item) => (
          <AixiaValueBlock
            key={item.label}
            label={item.label}
            value={item.value}
            detail={item.detail}
          />
        ))}
      </section>

      <AixiaMetricGrid>
        {groupSummaries.map((summary) => (
          <GroupSummaryCard key={summary.groupKey} summary={summary} />
        ))}
      </AixiaMetricGrid>

      <AixiaSection
        title="Base Role + Finance Role Template"
        description="The base system role controls the general app identity. The Finance role template controls company-level Finance access. User overrides should only be exceptions."
        icon={ShieldCheck}
      >
        <div className="aixia-stack">
          <section className="aixia-smart-grid" data-mode="cards">
            <AixiaValueBlock
              label="Base System Role"
              value={<AixiaStatusBadge value={targetUser.role} />}
              detail="System role: admin, manager, employee, or guest."
            />

            <AixiaValueBlock
              label="Current Finance Template"
              value={
                targetFinanceTemplate ? (
                  <AixiaBadge tone="violet">{targetFinanceTemplate.template_name}</AixiaBadge>
                ) : (
                  "—"
                )
              }
              detail={
                targetFinanceTemplate?.description ||
                "Finance role template assigned to this user."
              }
            />

            <AixiaValueBlock
              label="Template Baseline"
              value={formatCount(templatePermissionCount)}
              detail="Enabled permissions coming from the selected Finance role template."
            />

            <AixiaValueBlock
              label="User Exceptions"
              value={formatCount(overriddenPermissionCount)}
              detail="Overrides stored directly on this user profile."
            />
          </section>

          <AixiaValueBlock
            label="Finance Role Template"
            value={
              <select
                value={selectedFinanceTemplateId}
                disabled={actionLocked || !hasAdminAccess}
                onChange={(event) => void updateFinanceTemplate(event.target.value)}
                className="aixia-select"
              >
                {financeTemplates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.template_name}
                  </option>
                ))}
              </select>
            }
            detail="Templates available: Finance Admin, Finance Manager, Finance Viewer, Procurement Operator, Expense Approver, Payroll Operator, Reports Viewer, and Custom."
          />

          {targetFinanceTemplate?.template_key === "finance_admin" && !isTargetAdmin ? (
            <AixiaInfoBlock tone="gold">
              Finance Admin template is selected, but Admin-only access controls still require the base system role to be Admin.
            </AixiaInfoBlock>
          ) : null}

          {runningAction === "template" ? (
            <AixiaInfoBlock tone="cyan" icon={Loader2}>
              Updating Finance role template.
            </AixiaInfoBlock>
          ) : null}
        </div>
      </AixiaSection>

      <AixiaSection
        title="Finance Access Permission Editor"
        description="Edit user-specific exceptions from the selected finance role template. The list page only shows summaries; this page controls the actual toggles."
        icon={KeyRound}
        actions={
          <div className="aixia-action-system" data-align="end" data-density="normal">
            <AixiaButton
              type="button"
              variant="secondary"
              onClick={() => void manualRefresh()}
              disabled={actionLocked}
            >
              {runningAction === "refresh" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Refresh
            </AixiaButton>

            <AixiaButton
              type="button"
              variant="danger"
              onClick={() => void resetOverrides()}
              disabled={actionLocked || overriddenPermissionCount === 0}
            >
              {runningAction === "reset" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <X className="h-4 w-4" />
              )}
              Reset Overrides
            </AixiaButton>
          </div>
        }
      >
        <div className="aixia-stack">
          <AixiaInfoBlock tone="cyan">
            Higher levels include lower levels. Turning off a lower level also turns off higher levels inside the same Finance section. These toggles save user-specific overrides against the selected finance template.
          </AixiaInfoBlock>

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
      </AixiaSection>

      <AixiaMetricGrid>
        {ACCESS_APPROVAL_LEVEL_ORDER.map((level) => {
          const explanation = ACCESS_APPROVAL_LEVEL_EXPLANATIONS[level];
          const Icon = levelIconMap[level];

          return (
            <AixiaMetricCard
              key={level}
              label={explanation.title}
              value={formatLabel(level)}
              description={explanation.shortLabel}
              icon={Icon}
              tone="cyan"
            />
          );
        })}
      </AixiaMetricGrid>

      <AixiaInfoBlock tone="cyan" title="Locked default rule">
        Normal users can see, create, edit, submit, upload, and confirm their own expenses and paycheck requests by default. This page only grants or removes additional company-level Finance access through templates and user-specific exceptions.
      </AixiaInfoBlock>
    </AixiaPage>
  );
}
