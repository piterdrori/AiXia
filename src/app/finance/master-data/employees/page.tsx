import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import {
  BadgeDollarSign,
  Briefcase,
  CalendarDays,
  Clock3,
  Edit3,
  ExternalLink,
  Landmark,
  Loader2,
  LockKeyhole,
  Plus,
  Save,
  Shield,
  ShieldCheck,
  Trash2,
  User2,
  Users,
  WalletCards,
} from "lucide-react";

import {
  AixiaAccessDeniedState,
  AixiaActionStack,
  AixiaAlert,
  AixiaAlertText,
  AixiaBadge,
  AixiaButton,
  AixiaCurrencyBadge,
  AixiaDisplayBlock,
  AixiaEmptyState,
  AixiaEntityCard,
  AixiaFieldLabel,
  AixiaFormField,
  AixiaFormFullWidth,
  AixiaFormGrid,
  AixiaHero,
  AixiaHistoryRow,
  AixiaInputField,
  AixiaLoadingState,
  AixiaModal,
  AixiaPage,
  AixiaProfileCard,
  AixiaReviewBlock,
  AixiaReviewGrid,
  AixiaSearchField,
  AixiaSection,
  AixiaSelectField,
  AixiaSelectableTile,
  AixiaStatusBadge,
  AixiaTextareaField,
} from "@/components/aixia";
import {
  getEffectivePermissions,
  type Permission,
  type Role,
} from "@/lib/permissions";
import { supabase } from "@/lib/supabase";

type LoadMode = "initial" | "silent";
type FilterStatus = "all" | "active" | "inactive" | "archived";
type PayProfileStatus = "draft" | "active" | "inactive" | "archived";
type DatabasePayType = "salary" | "hourly" | "contractor";
type PaycheckType = "salary" | "contractor" | "one_time_contractor";
type PaymentFrequency =
  | "weekly"
  | "biweekly"
  | "semi_monthly"
  | "monthly"
  | "one_time";
type FormMode = "create" | "edit";

type ProfilePermissionRow = {
  user_id: string;
  full_name: string | null;
  role: Role | null;
  permissions: Partial<Record<Permission, boolean>> | null;
};

type FinanceEmployeeRow = {
  id: string;
  user_id: string;
  code: string;
  status: "active" | "inactive" | "archived";
  mark: string | null;
  notes: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  profile: {
    user_id: string;
    full_name: string | null;
    email: string | null;
    role: string | null;
    status: string | null;
    company: string | null;
    member_type: string | null;
    job_title: string | null;
    phone: string | null;
    city: string | null;
    country: string | null;
  } | null;
};

type PayProfileRow = {
  id: string;
  profile_number: string | null;
  user_id: string;
  pay_type: DatabasePayType;
  payment_frequency: PaymentFrequency;
  base_salary: number | string | null;
  hourly_rate: number | string | null;
  default_hours: number | string | null;
  currency_code: string;
  active: boolean;
  status: PayProfileStatus;
  effective_from: string;
  effective_to: string | null;
  notes: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

type CurrencyRow = {
  id: string;
  currency_code: string;
  currency_name: string;
  currency_symbol: string | null;
  decimal_places: number;
  is_base_currency: boolean;
  status: string;
};

type HourlyStructure = {
  enabled: boolean;
  hourly_rate: number | null;
  default_hours: number | null;
};

type PayProfileFormState = {
  paycheckType: PaycheckType;
  paySchedule: PaymentFrequency;
  defaultGrossPay: string;
  currencyCode: string;
  startDate: string;
  futureTerminationDate: string;
  hourlyEnabled: boolean;
  hourlyRate: string;
  defaultHours: string;
  notes: string;
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

type MetricCardData = {
  label: string;
  value: string | number;
  description: string;
  icon: LucideIcon;
  tone: "cyan" | "emerald" | "amber" | "violet" | "rose" | "neutral";
};

const EMPTY_PERMISSION_STATE: PermissionState = {
  canRead: false,
  canCreate: false,
  canUpdate: false,
  canDeleteArchive: false,
  isAdmin: false,
};

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

function formatDateLabel(value: string | null | undefined) {
  if (!value) return "—";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";

  return parsed.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatLabel(value: string | null | undefined) {
  if (!value) return "—";

  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function toNumber(value: number | string | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function nullablePositiveNumber(value: string) {
  const parsed = toNumber(value);
  return parsed > 0 ? parsed : null;
}

function formatMoney(value: number | string | null | undefined, currencyCode = "USD") {
  return `${currencyCode} ${toNumber(value).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getHourlyStructure(profile: PayProfileRow | null | undefined): HourlyStructure {
  if (!profile) {
    return {
      enabled: false,
      hourly_rate: null,
      default_hours: null,
    };
  }

  const metadata = isRecord(profile.metadata) ? profile.metadata : {};
  const rawHourly = metadata.hourly_structure;

  if (isRecord(rawHourly)) {
    const enabled = rawHourly.enabled === true;
    const hourlyRate = nullablePositiveNumber(String(rawHourly.hourly_rate ?? ""));
    const defaultHours = nullablePositiveNumber(String(rawHourly.default_hours ?? ""));

    return {
      enabled,
      hourly_rate: hourlyRate,
      default_hours: defaultHours,
    };
  }

  if (profile.pay_type === "hourly" || profile.hourly_rate || profile.default_hours) {
    return {
      enabled: true,
      hourly_rate: nullablePositiveNumber(String(profile.hourly_rate ?? "")),
      default_hours: nullablePositiveNumber(String(profile.default_hours ?? "")),
    };
  }

  return {
    enabled: false,
    hourly_rate: null,
    default_hours: null,
  };
}

function getPaycheckType(profile: PayProfileRow | null | undefined): PaycheckType {
  if (!profile) return "salary";
  if (profile.pay_type === "salary") return "salary";
  if (profile.payment_frequency === "one_time") return "one_time_contractor";
  return "contractor";
}

function getPaycheckTypeLabel(profileOrType: PayProfileRow | PaycheckType | null | undefined) {
  const value =
    typeof profileOrType === "string" ? profileOrType : getPaycheckType(profileOrType);

  if (value === "one_time_contractor") return "One-Time Contractor";
  return formatLabel(value);
}

function getPrimaryGrossPay(profile: PayProfileRow | null | undefined) {
  if (!profile) return 0;

  if (profile.base_salary) return toNumber(profile.base_salary);
  if (profile.pay_type === "hourly" && profile.hourly_rate && profile.default_hours) {
    return toNumber(profile.hourly_rate) * toNumber(profile.default_hours);
  }

  return 0;
}

function getRoleIcon(role: string | null) {
  if (role === "admin") return Shield;
  if (role === "manager") return Users;
  return User2;
}

function buildEmployeeName(row: FinanceEmployeeRow | null) {
  if (!row) return "—";
  return row.profile?.full_name || row.profile?.email || `Employee ${row.code}`;
}

function buildPayProfileTitle(profile: PayProfileRow | null | undefined) {
  if (!profile) return "No active pay profile";

  return [
    profile.profile_number || "Pay Profile",
    getPaycheckTypeLabel(profile),
    formatLabel(profile.payment_frequency),
    profile.currency_code,
  ]
    .filter(Boolean)
    .join(" • ");
}

function buildDefaultPayProfileForm(currencyCode: string): PayProfileFormState {
  return {
    paycheckType: "salary",
    paySchedule: "monthly",
    defaultGrossPay: "",
    currencyCode,
    startDate: todayDate(),
    futureTerminationDate: "",
    hourlyEnabled: false,
    hourlyRate: "",
    defaultHours: "",
    notes: "",
  };
}

function buildPayProfileFormFromProfile(profile: PayProfileRow): PayProfileFormState {
  const hourlyStructure = getHourlyStructure(profile);

  return {
    paycheckType: getPaycheckType(profile),
    paySchedule: profile.payment_frequency,
    defaultGrossPay: profile.base_salary
      ? String(profile.base_salary)
      : String(getPrimaryGrossPay(profile) || ""),
    currencyCode: profile.currency_code,
    startDate: profile.effective_from || todayDate(),
    futureTerminationDate: profile.effective_to || "",
    hourlyEnabled: hourlyStructure.enabled,
    hourlyRate: hourlyStructure.hourly_rate ? String(hourlyStructure.hourly_rate) : "",
    defaultHours: hourlyStructure.default_hours
      ? String(hourlyStructure.default_hours)
      : "",
    notes: profile.notes || "",
  };
}

function buildMetadata(
  selected: FinanceEmployeeRow,
  form: PayProfileFormState,
  existingMetadata: Record<string, unknown> | null = null
) {
  return {
    ...(existingMetadata || {}),
    source: "finance_master_data_employees_page",
    ui_model: "global_paycheck_profile_with_optional_hourly_structure",
    paycheck_structure: {
      paycheck_type: form.paycheckType,
      pay_schedule: form.paySchedule,
      default_gross_pay: nullablePositiveNumber(form.defaultGrossPay),
      start_date: form.startDate,
      future_termination_date: form.futureTerminationDate || null,
    },
    hourly_structure: {
      enabled: form.hourlyEnabled,
      hourly_rate: form.hourlyEnabled ? nullablePositiveNumber(form.hourlyRate) : null,
      default_hours: form.hourlyEnabled ? nullablePositiveNumber(form.defaultHours) : null,
    },
    employee_snapshot: {
      employee_ref_id: selected.id,
      employee_user_id: selected.user_id,
      employee_code: selected.code,
      employee_mark: selected.mark,
      employee_name: buildEmployeeName(selected),
      employee_email: selected.profile?.email || null,
      employee_job_title: selected.profile?.job_title || null,
      employee_company: selected.profile?.company || null,
    },
  };
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
    canCreate:
      canManageMasterData || hasPermission(permissions, "createFinanceRecords"),
    canUpdate:
      canManageMasterData || hasPermission(permissions, "editFinanceRecords"),
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
      if (mode === "silent") throw result.error;
      console.warn("Employees permission RPC fallback:", result.error.message);
      return null;
    }

    if (!result.data || typeof result.data !== "object") {
      if (mode === "silent") {
        throw new Error(
          "Silent employees permission refresh returned no effective permission payload."
        );
      }

      return null;
    }

    return result.data as Partial<Record<Permission, boolean>>;
  } catch (error) {
    if (mode === "silent") throw error;
    console.warn("Employees permission RPC failed:", error);
    return null;
  }
}

function getDefaultCurrencyCode(currencies: CurrencyRow[]) {
  return (
    currencies.find((row) => row.is_base_currency)?.currency_code ||
    currencies[0]?.currency_code ||
    "USD"
  );
}

function getCurrencyOptions(currencies: CurrencyRow[]) {
  if (currencies.length > 0) return currencies;

  return [
    {
      id: "USD",
      currency_code: "USD",
      currency_name: "US Dollar",
      currency_symbol: "$",
      decimal_places: 2,
      is_base_currency: true,
      status: "active",
    },
  ];
}

function getEmployeeLocation(row: FinanceEmployeeRow) {
  return [row.profile?.city, row.profile?.country].filter(Boolean).join(", ") || "—";
}

function getEmployeeSubtitle(row: FinanceEmployeeRow) {
  return `${row.code} • ${row.profile?.email || "No email"}`;
}

function getEmployeeDescription(row: FinanceEmployeeRow) {
  return [
    row.profile?.job_title || "No job title",
    row.profile?.company || "No company",
    row.profile?.member_type || "No member type",
  ]
    .filter(Boolean)
    .join(" • ");
}

function getPayProfileBadges(profile: PayProfileRow) {
  const hourlyStructure = getHourlyStructure(profile);

  return (
    <>
      <AixiaStatusBadge
        value={profile.active && profile.status === "active" ? "active" : profile.status}
      />
      <AixiaBadge tone="cyan">{getPaycheckTypeLabel(profile)}</AixiaBadge>
      <AixiaBadge tone="violet">{formatLabel(profile.payment_frequency)}</AixiaBadge>
      {hourlyStructure.enabled ? <AixiaBadge tone="amber">Hourly Enabled</AixiaBadge> : null}
    </>
  );
}

function PayProfileForm({
  mode,
  form,
  currencies,
  saving,
  onChange,
  onCancel,
  onSave,
}: {
  mode: FormMode;
  form: PayProfileFormState;
  currencies: CurrencyRow[];
  saving: boolean;
  onChange: <K extends keyof PayProfileFormState>(
    key: K,
    value: PayProfileFormState[K]
  ) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  const paycheckTypes: Array<{
    value: PaycheckType;
    label: string;
    description: string;
    icon: LucideIcon;
    tone: "cyan" | "emerald" | "amber";
  }> = [
    {
      value: "salary",
      label: "Salary",
      description: "Fixed recurring paycheck amount.",
      icon: BadgeDollarSign,
      tone: "emerald",
    },
    {
      value: "contractor",
      label: "Contractor",
      description: "Recurring contractor payment profile.",
      icon: Briefcase,
      tone: "cyan",
    },
    {
      value: "one_time_contractor",
      label: "One-Time",
      description: "Single paycheck or one-time contractor payout.",
      icon: CalendarDays,
      tone: "amber",
    },
  ];

  const schedules: Array<{ value: PaymentFrequency; label: string }> = [
    { value: "weekly", label: "Weekly" },
    { value: "biweekly", label: "Biweekly" },
    { value: "semi_monthly", label: "Semi-Monthly" },
    { value: "monthly", label: "Monthly" },
    { value: "one_time", label: "One-Time" },
  ];

  return (
    <AixiaSection
      title={mode === "edit" ? "Edit Pay Profile" : "Create Active Pay Profile"}
      description="The global paycheck profile is the default source for payroll and paycheck requests. Optional hourly structure is separate and only used when hourly calculation is needed."
      icon={BadgeDollarSign}
      badge={<AixiaBadge tone="cyan">Global Paycheck Setup</AixiaBadge>}
    >
      <form
        onSubmit={(event: FormEvent<HTMLFormElement>) => {
          event.preventDefault();
          onSave();
        }}
      >
        <AixiaFormGrid columns="three">
          <AixiaFormFullWidth>
            <AixiaFieldLabel label="Paycheck Type" required />
            <AixiaReviewGrid variant="metrics">
              {paycheckTypes.map((item) => (
                <AixiaSelectableTile
                  key={item.value}
                  title={item.label}
                  description={item.description}
                  icon={item.icon}
                  tone={item.tone}
                  selected={form.paycheckType === item.value}
                  disabled={saving}
                  onClick={() => {
                    onChange("paycheckType", item.value);
                    if (item.value === "one_time_contractor") {
                      onChange("paySchedule", "one_time");
                    }
                  }}
                />
              ))}
            </AixiaReviewGrid>
          </AixiaFormFullWidth>

          <AixiaFormField>
            <AixiaFieldLabel label="Pay Schedule" required />
            <AixiaSelectField
              value={form.paySchedule}
              disabled={saving}
              onChange={(event) =>
                onChange("paySchedule", event.target.value as PaymentFrequency)
              }
            >
              {schedules.map((schedule) => (
                <option
                  key={schedule.value}
                  value={schedule.value}
                  className="bg-[#05070d]"
                >
                  {schedule.label}
                </option>
              ))}
            </AixiaSelectField>
          </AixiaFormField>

          <AixiaFormField>
            <AixiaFieldLabel label="Currency" required />
            <AixiaSelectField
              value={form.currencyCode}
              disabled={saving}
              onChange={(event) =>
                onChange("currencyCode", event.target.value.toUpperCase())
              }
            >
              {getCurrencyOptions(currencies).map((currency) => (
                <option
                  key={currency.id}
                  value={currency.currency_code}
                  className="bg-[#05070d]"
                >
                  {currency.currency_code} • {currency.currency_name}
                </option>
              ))}
            </AixiaSelectField>
          </AixiaFormField>

          <AixiaFormField>
            <AixiaFieldLabel label="Default Gross Pay" required />
            <AixiaInputField
              type="number"
              min="0"
              step="0.01"
              value={form.defaultGrossPay}
              disabled={saving}
              onChange={(event) => onChange("defaultGrossPay", event.target.value)}
              placeholder="Required"
            />
          </AixiaFormField>

          <AixiaFormField>
            <AixiaFieldLabel label="Start Date" required />
            <AixiaInputField
              type="date"
              value={form.startDate}
              disabled={saving}
              onChange={(event) => onChange("startDate", event.target.value)}
            />
          </AixiaFormField>

          <AixiaFormField>
            <AixiaFieldLabel
              label="Future Termination Date"
              helper="Optional"
            />
            <AixiaInputField
              type="date"
              value={form.futureTerminationDate}
              disabled={saving}
              onChange={(event) =>
                onChange("futureTerminationDate", event.target.value)
              }
            />
          </AixiaFormField>

          <AixiaFormFullWidth>
            <AixiaFieldLabel label="Notes" />
            <AixiaTextareaField
              value={form.notes}
              disabled={saving}
              onChange={(event) => onChange("notes", event.target.value)}
              placeholder="Optional internal notes about this pay profile"
            />
          </AixiaFormFullWidth>

          <AixiaFormFullWidth>
            <AixiaSection
              title="Optional Hourly Structure"
              description="Hourly rate is not mandatory. Enable this only when the employee may also need hourly calculations, overtime handling, or variable-hour paycheck requests."
              icon={Clock3}
              bodyClassName="p-5"
            >
              <AixiaReviewGrid variant="compact">
                <AixiaSelectableTile
                  title="Not Enabled"
                  description="Use the global paycheck amount only."
                  selected={!form.hourlyEnabled}
                  tone="neutral"
                  disabled={saving}
                  onClick={() => onChange("hourlyEnabled", false)}
                />

                <AixiaSelectableTile
                  title="Enabled"
                  description="Allow hourly rate and default-hours fields."
                  selected={form.hourlyEnabled}
                  tone="amber"
                  disabled={saving}
                  onClick={() => onChange("hourlyEnabled", true)}
                />
              </AixiaReviewGrid>

              {form.hourlyEnabled ? (
                <AixiaFormGrid columns="two" className="mt-4">
                  <AixiaFormField>
                    <AixiaFieldLabel label="Hourly Rate" required />
                    <AixiaInputField
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.hourlyRate}
                      disabled={saving}
                      onChange={(event) => onChange("hourlyRate", event.target.value)}
                      placeholder="Required when hourly structure is enabled"
                    />
                  </AixiaFormField>

                  <AixiaFormField>
                    <AixiaFieldLabel label="Default Hours Per Pay Period" />
                    <AixiaInputField
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.defaultHours}
                      disabled={saving}
                      onChange={(event) => onChange("defaultHours", event.target.value)}
                      placeholder="Optional"
                    />
                  </AixiaFormField>
                </AixiaFormGrid>
              ) : (
                <AixiaAlert tone="info">
                  <AixiaAlertText
                    title="Hourly structure disabled"
                    description="This profile will use the global paycheck amount only."
                  />
                </AixiaAlert>
              )}
            </AixiaSection>
          </AixiaFormFullWidth>
        </AixiaFormGrid>

        <AixiaActionStack className="mt-5">
          <AixiaButton type="button" variant="secondary" onClick={onCancel} disabled={saving}>
            Cancel
          </AixiaButton>

          <AixiaButton type="submit" variant="primary" disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? "Saving..." : mode === "edit" ? "Save Changes" : "Save Pay Profile"}
          </AixiaButton>
        </AixiaActionStack>
      </form>
    </AixiaSection>
  );
}

export default function FinanceMasterDataEmployeesPage() {
  const navigate = useNavigate();

  const [profile, setProfile] = useState<ProfilePermissionRow | null>(null);
  const [effectivePermissions, setEffectivePermissions] =
    useState<Record<Permission, boolean> | null>(null);
  const [rows, setRows] = useState<FinanceEmployeeRow[]>([]);
  const [payProfiles, setPayProfiles] = useState<PayProfileRow[]>([]);
  const [currencies, setCurrencies] = useState<CurrencyRow[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [backgroundRefreshing, setBackgroundRefreshing] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("all");
  const [selected, setSelected] = useState<FinanceEmployeeRow | null>(null);
  const [showPayProfileForm, setShowPayProfileForm] = useState(false);
  const [payProfileFormMode, setPayProfileFormMode] =
    useState<FormMode>("create");
  const [editingPayProfileId, setEditingPayProfileId] = useState<string | null>(
    null
  );
  const [payProfileForm, setPayProfileForm] = useState<PayProfileFormState>(
    buildDefaultPayProfileForm("USD")
  );
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

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
          setCurrentUserId(null);
        } else {
          console.warn(
            "Silent employee profile refresh returned no auth user; keeping current profile and permissions."
          );
        }

        return;
      }

      setCurrentUserId(authUserId);

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
            "Silent employee profile refresh returned no profile; keeping current profile and permissions."
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
            "Silent employee profile refresh returned no role; keeping current permissions."
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
      console.error("Failed to load employee page permissions:", error);

      if (mode === "initial") {
        setProfile(null);
        setEffectivePermissions(null);
        setCurrentUserId(null);
      }
    } finally {
      if (mode === "initial") {
        setIsLoadingProfile(false);
      } else {
        setBackgroundRefreshing(false);
      }
    }
  }, []);

  const loadData = useCallback(async (mode: LoadMode = "initial") => {
    if (mode === "initial") {
      setIsLoadingData(true);
      setActionError(null);
    } else {
      setBackgroundRefreshing(true);
    }

    try {
      const { data: refData, error: refError } = await supabase
        .from("finance_employee_refs")
        .select(
          `
          id,
          user_id,
          code,
          status,
          mark,
          notes,
          metadata,
          created_at,
          updated_at
        `
        )
        .order("created_at", { ascending: false });

      if (refError) throw refError;

      const refs = ((refData || []) as unknown) as Array<{
        id: string;
        user_id: string;
        code: string;
        status: "active" | "inactive" | "archived";
        mark: string | null;
        notes: string | null;
        metadata: Record<string, unknown> | null;
        created_at: string;
        updated_at: string;
      }>;

      const { data: currencyData, error: currencyError } = await supabase
        .from("finance_currencies")
        .select(
          "id, currency_code, currency_name, currency_symbol, decimal_places, is_base_currency, status"
        )
        .eq("status", "active")
        .order("currency_code", { ascending: true });

      if (currencyError) throw currencyError;

      const loadedCurrencies = (currencyData || []) as CurrencyRow[];

      if (refs.length === 0) {
        setRows([]);
        setPayProfiles([]);
        setCurrencies(loadedCurrencies);
        setSelected(null);
        return;
      }

      const userIds = refs.map((row) => row.user_id);

      const [profileResult, payProfileResult] = await Promise.all([
        supabase
          .from("profiles")
          .select(
            `
            user_id,
            full_name,
            email,
            role,
            status,
            company,
            member_type,
            job_title,
            phone,
            city,
            country
          `
          )
          .in("user_id", userIds),

        supabase
          .from("finance_pay_profiles")
          .select(
            `
            id,
            profile_number,
            user_id,
            pay_type,
            payment_frequency,
            base_salary,
            hourly_rate,
            default_hours,
            currency_code,
            active,
            status,
            effective_from,
            effective_to,
            notes,
            metadata,
            created_at,
            updated_at
          `
          )
          .in("user_id", userIds)
          .order("effective_from", { ascending: false }),
      ]);

      if (profileResult.error) throw profileResult.error;
      if (payProfileResult.error) throw payProfileResult.error;

      const profileMap = new Map(
        ((((profileResult.data || []) as unknown) as NonNullable<
          FinanceEmployeeRow["profile"]
        >[]) || []).map((employeeProfile) => [
          employeeProfile.user_id,
          employeeProfile,
        ])
      );

      const mergedRows: FinanceEmployeeRow[] = refs.map((ref) => ({
        ...ref,
        profile: profileMap.get(ref.user_id) || null,
      }));

      const loadedPayProfiles = ((payProfileResult.data || []) as unknown) as PayProfileRow[];

      setRows(mergedRows);
      setPayProfiles(loadedPayProfiles);
      setCurrencies(loadedCurrencies);

      setSelected((currentSelected) => {
        if (!currentSelected) return null;
        return (
          mergedRows.find((row) => row.id === currentSelected.id) ||
          mergedRows.find((row) => row.user_id === currentSelected.user_id) ||
          currentSelected
        );
      });
    } catch (error) {
      console.error("Failed to load finance employees:", error);

      if (mode === "initial") {
        setRows([]);
        setPayProfiles([]);
        setCurrencies([]);
        setSelected(null);
        setActionError(
          error instanceof Error
            ? error.message
            : "Failed to load finance employees."
        );
      }
    } finally {
      if (mode === "initial") {
        setIsLoadingData(false);
      } else {
        setBackgroundRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    void Promise.all([loadCurrentProfile("initial"), loadData("initial")]);
  }, [loadCurrentProfile, loadData]);

  useEffect(() => {
    const channel = supabase
      .channel("finance-master-data-employees-page")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        () => {
          void loadCurrentProfile("silent");
          void loadData("silent");
        }
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
        { event: "*", schema: "public", table: "finance_employee_refs" },
        () => void loadData("silent")
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_pay_profiles" },
        () => void loadData("silent")
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_currencies" },
        () => void loadData("silent")
      )
      .subscribe();

    const intervalId = window.setInterval(() => {
      void Promise.all([loadCurrentProfile("silent"), loadData("silent")]);
    }, 60000);

    return () => {
      window.clearInterval(intervalId);
      void supabase.removeChannel(channel);
    };
  }, [loadCurrentProfile, loadData]);

  useEffect(() => {
    const defaultCurrency = getDefaultCurrencyCode(currencies);

    setPayProfileForm((current) => ({
      ...current,
      currencyCode: current.currencyCode || defaultCurrency,
    }));
  }, [currencies]);

  useEffect(() => {
    if (!selected) return;

    const defaultCurrency = getDefaultCurrencyCode(currencies);

    setShowPayProfileForm(false);
    setPayProfileFormMode("create");
    setEditingPayProfileId(null);
    setPayProfileForm(buildDefaultPayProfileForm(defaultCurrency));
    setActionError(null);
    setActionMessage(null);
  }, [currencies, selected]);

  const permissionState = useMemo(() => {
    return buildPermissionState(profile, effectivePermissions);
  }, [effectivePermissions, profile]);

  const selectedPayProfiles = useMemo(() => {
    if (!selected) return [];

    return payProfiles
      .filter((payProfile) => payProfile.user_id === selected.user_id)
      .sort((first, second) => {
        const firstDate = new Date(first.effective_from).getTime();
        const secondDate = new Date(second.effective_from).getTime();
        return secondDate - firstDate;
      });
  }, [payProfiles, selected]);

  const selectedActivePayProfile = useMemo(() => {
    return (
      selectedPayProfiles.find(
        (payProfile) => payProfile.active && payProfile.status === "active"
      ) || null
    );
  }, [selectedPayProfiles]);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();

    return rows.filter((row) => {
      if (statusFilter !== "all" && row.status !== statusFilter) return false;
      if (!query) return true;

      const employeePayProfiles = payProfiles.filter(
        (payProfile) => payProfile.user_id === row.user_id
      );

      const source = [
        row.code,
        row.mark,
        row.status,
        row.profile?.full_name,
        row.profile?.email,
        row.profile?.company,
        row.profile?.job_title,
        ...employeePayProfiles.map((payProfile) =>
          [
            payProfile.profile_number,
            getPaycheckTypeLabel(payProfile),
            payProfile.payment_frequency,
            payProfile.currency_code,
            payProfile.status,
          ]
            .filter(Boolean)
            .join(" ")
        ),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return source.includes(query);
    });
  }, [payProfiles, rows, search, statusFilter]);

  const stats = useMemo(() => {
    const activeProfiles = payProfiles.filter(
      (payProfile) => payProfile.active && payProfile.status === "active"
    ).length;

    const hourlyEnabled = payProfiles.filter(
      (payProfile) =>
        payProfile.active &&
        payProfile.status === "active" &&
        getHourlyStructure(payProfile).enabled
    ).length;

    return {
      total: rows.length,
      active: rows.filter((row) => row.status === "active").length,
      inactive: rows.filter((row) => row.status === "inactive").length,
      archived: rows.filter((row) => row.status === "archived").length,
      activeProfiles,
      hourlyEnabled,
    };
  }, [payProfiles, rows]);

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
          "Employee pay profile management requires Finance read or Master Data access.",
        icon: permissionState.canRead ? ShieldCheck : LockKeyhole,
        tone: permissionState.canRead ? "emerald" : "rose",
      },
      {
        label: "Payroll Defaults",
        value: `${stats.activeProfiles} Active`,
        description: "Active global paycheck profiles available for payroll defaults.",
        icon: WalletCards,
        tone: "cyan",
      },
      {
        label: "Hourly Add-On",
        value: `${stats.hourlyEnabled} Enabled`,
        description: backgroundRefreshing
          ? "Silent refresh is updating records without disturbing the page."
          : "Hourly structure remains optional and separate from gross pay.",
        icon: Clock3,
        tone: "amber",
      },
    ];
  }, [
    backgroundRefreshing,
    isLoadingProfile,
    permissionState.canRead,
    stats.activeProfiles,
    stats.hourlyEnabled,
  ]);

  const metricCards = useMemo<MetricCardData[]>(
    () => [
      {
        label: "Total Employees",
        value: isLoadingData ? "—" : stats.total,
        description: "Finance employee references.",
        icon: Users,
        tone: "cyan",
      },
      {
        label: "Active Employees",
        value: isLoadingData ? "—" : stats.active,
        description: "Available for payroll defaults.",
        icon: User2,
        tone: "emerald",
      },
      {
        label: "Inactive",
        value: isLoadingData ? "—" : stats.inactive,
        description: "Inactive finance references.",
        icon: Briefcase,
        tone: "amber",
      },
      {
        label: "Archived",
        value: isLoadingData ? "—" : stats.archived,
        description: "Archived employee references.",
        icon: Shield,
        tone: "rose",
      },
      {
        label: "Active Profiles",
        value: isLoadingData ? "—" : stats.activeProfiles,
        description: "Current active pay profiles.",
        icon: BadgeDollarSign,
        tone: "violet",
      },
      {
        label: "Hourly Enabled",
        value: isLoadingData ? "—" : stats.hourlyEnabled,
        description: "Employees with hourly add-on enabled.",
        icon: Clock3,
        tone: "amber",
      },
    ],
    [isLoadingData, stats]
  );

  function updatePayProfileForm<K extends keyof PayProfileFormState>(
    key: K,
    value: PayProfileFormState[K]
  ) {
    setPayProfileForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function openCreatePayProfile() {
    if (!permissionState.canCreate) {
      setActionError("Create access is not enabled for this user.");
      return;
    }

    const defaultCurrency = getDefaultCurrencyCode(currencies);

    setPayProfileFormMode("create");
    setEditingPayProfileId(null);
    setPayProfileForm(buildDefaultPayProfileForm(defaultCurrency));
    setShowPayProfileForm(true);
    setActionError(null);
    setActionMessage(null);
  }

  function openEditPayProfile(payProfile: PayProfileRow) {
    if (!permissionState.canUpdate) {
      setActionError("Update access is not enabled for this user.");
      return;
    }

    setPayProfileFormMode("edit");
    setEditingPayProfileId(payProfile.id);
    setPayProfileForm(buildPayProfileFormFromProfile(payProfile));
    setShowPayProfileForm(true);
    setActionError(null);
    setActionMessage(null);
  }

  function closePayProfileForm() {
    const defaultCurrency = getDefaultCurrencyCode(currencies);

    setShowPayProfileForm(false);
    setPayProfileFormMode("create");
    setEditingPayProfileId(null);
    setPayProfileForm(buildDefaultPayProfileForm(defaultCurrency));
  }

  function validatePayProfileForm() {
    if (!selected) return "Select an employee first.";
    if (!currentUserId) return "You must be signed in.";
    if (!payProfileForm.paycheckType) return "Paycheck type is required.";
    if (!payProfileForm.paySchedule) return "Pay schedule is required.";
    if (!payProfileForm.currencyCode.trim()) return "Currency is required.";
    if (!payProfileForm.startDate) return "Start date is required.";

    if (
      payProfileForm.futureTerminationDate &&
      new Date(payProfileForm.futureTerminationDate) <
        new Date(payProfileForm.startDate)
    ) {
      return "Future termination date must be after the start date.";
    }

    const defaultGrossPay = toNumber(payProfileForm.defaultGrossPay);
    const hourlyRate = toNumber(payProfileForm.hourlyRate);
    const defaultHours = toNumber(payProfileForm.defaultHours);

    if (defaultGrossPay <= 0) {
      return "Default gross pay is required.";
    }

    if (defaultGrossPay < 0 || hourlyRate < 0 || defaultHours < 0) {
      return "Amounts and hours cannot be negative.";
    }

    if (payProfileForm.hourlyEnabled && hourlyRate <= 0) {
      return "Hourly rate is required only when hourly structure is enabled.";
    }

    return null;
  }

  function buildPayProfilePayload() {
    if (!selected || !currentUserId) {
      throw new Error("Missing selected employee or user context.");
    }

    const defaultGrossPay = toNumber(payProfileForm.defaultGrossPay);

    const databasePayType: DatabasePayType =
      payProfileForm.paycheckType === "salary" ? "salary" : "contractor";

    const paymentFrequency: PaymentFrequency =
      payProfileForm.paycheckType === "one_time_contractor"
        ? "one_time"
        : payProfileForm.paySchedule;

    return {
      user_id: selected.user_id,
      pay_type: databasePayType,
      payment_frequency: paymentFrequency,
      base_salary: defaultGrossPay,
      hourly_rate: null,
      default_hours: null,
      currency_code: payProfileForm.currencyCode.trim().toUpperCase(),
      active: true,
      status: "active" as PayProfileStatus,
      effective_from: payProfileForm.startDate,
      effective_to: payProfileForm.futureTerminationDate || null,
      notes: payProfileForm.notes.trim() || null,
      metadata: buildMetadata(selected, payProfileForm, null),
      updated_by: currentUserId,
    };
  }

  async function savePayProfile() {
    if (!(payProfileFormMode === "edit" ? permissionState.canUpdate : permissionState.canCreate)) {
      setActionError("Required pay profile access is not enabled for this user.");
      return;
    }

    setProfileSaving(true);
    setActionError(null);
    setActionMessage(null);

    try {
      const validationError = validatePayProfileForm();

      if (validationError) {
        throw new Error(validationError);
      }

      if (!selected || !currentUserId) {
        throw new Error("Missing selected employee or user context.");
      }

      const currentEditingProfile =
        editingPayProfileId && payProfileFormMode === "edit"
          ? payProfiles.find((payProfile) => payProfile.id === editingPayProfileId) ||
            null
          : null;

      const payload = buildPayProfilePayload();

      const finalPayload = {
        ...payload,
        metadata: buildMetadata(
          selected,
          payProfileForm,
          currentEditingProfile?.metadata || null
        ),
      };

      if (payProfileFormMode === "edit" && editingPayProfileId) {
        const updateResult = await supabase
          .from("finance_pay_profiles")
          .update(finalPayload)
          .eq("id", editingPayProfileId)
          .select("id")
          .single();

        if (updateResult.error) throw updateResult.error;

        setActionMessage("Pay profile updated successfully.");
      } else {
        const insertResult = await supabase
          .from("finance_pay_profiles")
          .insert({
            ...finalPayload,
            created_by: currentUserId,
          })
          .select("id")
          .single();

        if (insertResult.error) throw insertResult.error;

        setActionMessage("Pay profile created successfully.");
      }

      closePayProfileForm();
      await loadData("silent");
    } catch (error) {
      console.error("Failed to save pay profile:", error);
      setActionError(
        error instanceof Error ? error.message : "Failed to save pay profile."
      );
    } finally {
      setProfileSaving(false);
    }
  }

  async function deletePayProfile(payProfile: PayProfileRow) {
    if (!permissionState.canDeleteArchive) {
      setActionError("Delete/Archive access is not enabled for this user.");
      return;
    }

    if (!currentUserId) {
      setActionError("You must be signed in.");
      return;
    }

    const confirmed = window.confirm(
      "Delete this pay profile permanently? This action cannot be undone."
    );

    if (!confirmed) return;

    setProfileSaving(true);
    setActionError(null);
    setActionMessage(null);

    try {
      const result = await supabase
        .from("finance_pay_profiles")
        .delete()
        .eq("id", payProfile.id)
        .select("id")
        .single();

      if (result.error) throw result.error;

      if (editingPayProfileId === payProfile.id) {
        closePayProfileForm();
      }

      setActionMessage("Pay profile deleted successfully.");
      await loadData("silent");
    } catch (error) {
      console.error("Failed to delete pay profile:", error);
      setActionError(
        error instanceof Error ? error.message : "Failed to delete pay profile."
      );
    } finally {
      setProfileSaving(false);
    }
  }

  const isPageLoading = isLoadingProfile || isLoadingData;

  if (isPageLoading) {
    return (
      <AixiaLoadingState
        title="Loading employee pay profiles"
        description="Employee references, pay profiles, currencies, and permission state are being checked."
      />
    );
  }

  return (
    <AixiaPage>
      <AixiaHero
        parentLabel="Master Data"
        parentPath="/finance/master-data"
        badges={[
          { label: "Master Data", tone: "cyan" },
          { label: "Employees", tone: "emerald" },
          { label: "Payroll Defaults", tone: "cyan" },
          { label: "Silent refresh", tone: "neutral" },
        ]}
        gradientTitle="Employee Pay"
        title="Profiles"
        subtitle="Finance Employee Master Data"
        description="Finance employee master data for payroll defaults, global paycheck profiles, and optional hourly structures. Each employee keeps a clear global paycheck setup while hourly calculation remains optional."
        statusCards={headerStatusCards}
      />

      {actionError ? <AixiaAlert tone="error">{actionError}</AixiaAlert> : null}
      {actionMessage ? (
        <AixiaAlert tone="success">{actionMessage}</AixiaAlert>
      ) : null}

      {!permissionState.canRead ? (
        <AixiaAccessDeniedState
          title="No employee finance access"
          description="Ask an Admin to assign a Finance role template or user-specific exception with Finance read or Master Data access."
        />
      ) : (
        <>
          <AixiaReviewGrid variant="metrics">
            {metricCards.map((metric) => (
              <AixiaReviewBlock
                key={metric.label}
                label={metric.label}
                value={metric.value}
                description={metric.description}
                icon={metric.icon}
                tone={metric.tone}
              />
            ))}
          </AixiaReviewGrid>

          <AixiaSection
            title="Employee Reference Records"
            description="Search employee references and open each record to manage payroll defaults."
            icon={Users}
            actions={
              <div className="aixia-control-cluster">
                <AixiaSearchField
                  width="wide"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search employees, codes, email, job title, pay profile..."
                />

                <AixiaReviewGrid variant="compact">
                  {(["all", "active", "inactive", "archived"] as FilterStatus[]).map(
                    (value) => (
                      <AixiaSelectableTile
                        key={value}
                        title={formatLabel(value)}
                        selected={statusFilter === value}
                        tone={value === "archived" ? "rose" : value === "inactive" ? "amber" : "cyan"}
                        onClick={() => setStatusFilter(value)}
                      />
                    )
                  )}
                </AixiaReviewGrid>
              </div>
            }
          >
            {filteredRows.length === 0 ? (
              <AixiaEmptyState
                icon={Users}
                title="No finance employee references found"
                description="Create or sync finance employee references before managing payroll defaults."
              />
            ) : (
              <div className="aixia-form-row-list">
                <AixiaReviewGrid variant="cards">
                  {filteredRows.map((row) => {
                    const Icon = getRoleIcon(row.profile?.role || null);
                    const rowActiveProfile =
                      payProfiles.find(
                        (payProfile) =>
                          payProfile.user_id === row.user_id &&
                          payProfile.active &&
                          payProfile.status === "active"
                      ) || null;
                    const rowHourlyStructure = getHourlyStructure(rowActiveProfile);

                    return (
                      <AixiaEntityCard
                        key={row.id}
                        title={buildEmployeeName(row)}
                        subtitle={getEmployeeSubtitle(row)}
                        description={getEmployeeDescription(row)}
                        icon={Icon}
                        selected={selected?.id === row.id}
                        tone={row.status === "archived" ? "rose" : "cyan"}
                        onClick={() => setSelected(row)}
                        badges={
                          <>
                            <AixiaStatusBadge value={row.status} />
                            {row.mark ? <AixiaBadge tone="cyan">{row.mark}</AixiaBadge> : null}
                          </>
                        }
                        details={
                          <>
                            <AixiaDisplayBlock
                              label="Email"
                              value={row.profile?.email || "—"}
                            />
                            <AixiaDisplayBlock
                              label="Job Title"
                              value={row.profile?.job_title || "—"}
                            />
                            <AixiaDisplayBlock
                              label="Location"
                              value={getEmployeeLocation(row)}
                            />
                          </>
                        }
                        footer={
                          rowActiveProfile ? (
                            <>
                              <AixiaDisplayBlock
                                label="Global Paycheck"
                                value={formatMoney(
                                  getPrimaryGrossPay(rowActiveProfile),
                                  rowActiveProfile.currency_code
                                )}
                                detail={`${getPaycheckTypeLabel(
                                  rowActiveProfile
                                )} • ${formatLabel(rowActiveProfile.payment_frequency)}`}
                              />
                              <AixiaDisplayBlock
                                label="Hourly Structure"
                                value={
                                  rowHourlyStructure.enabled
                                    ? "Enabled"
                                    : "Not Enabled"
                                }
                                detail={
                                  rowHourlyStructure.enabled &&
                                  rowHourlyStructure.hourly_rate
                                    ? `${formatMoney(
                                        rowHourlyStructure.hourly_rate,
                                        rowActiveProfile.currency_code
                                      )} / hour`
                                    : "Optional only"
                                }
                              />
                            </>
                          ) : (
                            <AixiaAlert tone="info">
                              No active pay profile found.
                            </AixiaAlert>
                          )
                        }
                      />
                    );
                  })}
                </AixiaReviewGrid>
              </div>
            )}
          </AixiaSection>

          <AixiaAlert tone="info">
            <AixiaAlertText
              title="Locked payroll default rule"
              description="The global paycheck profile is the default source for payroll and paycheck requests. Optional hourly structure is an add-on only. Silent refresh must not reset selected employee, modal state, filters, search, or visible rows."
            />
          </AixiaAlert>
        </>
      )}

      <AixiaModal
        open={Boolean(selected)}
        title={selected ? buildEmployeeName(selected) : "Employee Pay Profile"}
        description={
          selected
            ? `${selected.code} • ${selected.profile?.email || "No email"}`
            : undefined
        }
        badge={<AixiaBadge tone="cyan">Employee Pay Profile</AixiaBadge>}
        onClose={() => setSelected(null)}
        maxWidthClassName="max-w-6xl"
        footer={
          <>
            <AixiaButton
              type="button"
              variant="secondary"
              onClick={() => setSelected(null)}
            >
              Close
            </AixiaButton>

            {selected ? (
              <AixiaButton
                type="button"
                variant="primary"
                onClick={() => navigate(`/employees/${selected.user_id}`)}
              >
                <ExternalLink className="h-4 w-4" />
                Open Source Record
              </AixiaButton>
            ) : null}
          </>
        }
      >
        {selected ? (
          <>
            <AixiaSection
              title="Employee Details"
              description="Finance employee reference linked to the source employee record."
              icon={User2}
              actions={
                <AixiaButton
                  type="button"
                  variant="secondary"
                  onClick={() => navigate(`/employees/${selected.user_id}`)}
                >
                  <ExternalLink className="h-4 w-4" />
                  Open Source Record
                </AixiaButton>
              }
            >
              <AixiaFormGrid columns="two">
                <AixiaDisplayBlock
                  label="Finance Status"
                  value={<AixiaStatusBadge value={selected.status} />}
                />
                <AixiaDisplayBlock
                  label="Finance Mark"
                  value={selected.mark || "—"}
                />
                <AixiaDisplayBlock
                  label="Role"
                  value={selected.profile?.role || "—"}
                />
                <AixiaDisplayBlock
                  label="Source Status"
                  value={selected.profile?.status || "—"}
                />
                <AixiaDisplayBlock
                  label="Email"
                  value={selected.profile?.email || "—"}
                />
                <AixiaDisplayBlock
                  label="Phone"
                  value={selected.profile?.phone || "—"}
                />
                <AixiaDisplayBlock
                  label="Company"
                  value={selected.profile?.company || "—"}
                />
                <AixiaDisplayBlock
                  label="Job Title"
                  value={selected.profile?.job_title || "—"}
                />
                <AixiaDisplayBlock
                  label="Member Type"
                  value={selected.profile?.member_type || "—"}
                />
                <AixiaDisplayBlock
                  label="Location"
                  value={getEmployeeLocation(selected)}
                />
                <AixiaFormFullWidth>
                  <AixiaDisplayBlock
                    label="Notes"
                    value={selected.notes || "—"}
                  />
                </AixiaFormFullWidth>
                <AixiaFormFullWidth>
                  <AixiaDisplayBlock
                    label="Updated"
                    value={formatDateLabel(selected.updated_at)}
                  />
                </AixiaFormFullWidth>
              </AixiaFormGrid>
            </AixiaSection>

            <AixiaSection
              title="Payroll Defaults"
              description="Manage the employee global paycheck profile and optional hourly structure. The paycheck request flow uses these values as defaults."
              icon={WalletCards}
              actions={
                permissionState.canCreate ? (
                  <AixiaButton
                    type="button"
                    variant="primary"
                    onClick={openCreatePayProfile}
                    disabled={profileSaving}
                  >
                    <Plus className="h-4 w-4" />
                    Create Pay Profile
                  </AixiaButton>
                ) : null
              }
            >
              {selectedActivePayProfile ? (
                <AixiaProfileCard
                  title={selectedActivePayProfile.profile_number || "Active Pay Profile"}
                  subtitle="Global paycheck setup for payroll defaults. Hourly structure is separated as an optional add-on and does not control the main paycheck amount."
                  icon={BadgeDollarSign}
                  badges={getPayProfileBadges(selectedActivePayProfile)}
                  highlights={
                    <>
                      <AixiaReviewBlock
                        label="Default Gross Pay"
                        value={formatMoney(
                          getPrimaryGrossPay(selectedActivePayProfile),
                          selectedActivePayProfile.currency_code
                        )}
                        description={`${getPaycheckTypeLabel(
                          selectedActivePayProfile
                        )} • ${formatLabel(
                          selectedActivePayProfile.payment_frequency
                        )}`}
                        icon={BadgeDollarSign}
                        tone="emerald"
                      />
                      <AixiaReviewBlock
                        label="Hourly Structure"
                        value={
                          getHourlyStructure(selectedActivePayProfile).enabled
                            ? "On"
                            : "Off"
                        }
                        description={
                          getHourlyStructure(selectedActivePayProfile).enabled &&
                          getHourlyStructure(selectedActivePayProfile).hourly_rate
                            ? `${formatMoney(
                                getHourlyStructure(selectedActivePayProfile).hourly_rate,
                                selectedActivePayProfile.currency_code
                              )} / hour`
                            : "Optional only"
                        }
                        icon={Clock3}
                        tone="amber"
                      />
                    </>
                  }
                  sections={
                    <>
                      <AixiaReviewBlock
                        label="Paycheck Model"
                        value={getPaycheckTypeLabel(selectedActivePayProfile)}
                        description={`${formatLabel(
                          selectedActivePayProfile.payment_frequency
                        )} • ${selectedActivePayProfile.currency_code}`}
                        icon={WalletCards}
                        tone="cyan"
                      />
                      <AixiaReviewBlock
                        label="Start Date"
                        value={formatDateLabel(selectedActivePayProfile.effective_from)}
                        description="Payroll profile begins here"
                        icon={CalendarDays}
                        tone="violet"
                      />
                      <AixiaReviewBlock
                        label="Future Termination"
                        value={
                          selectedActivePayProfile.effective_to
                            ? formatDateLabel(selectedActivePayProfile.effective_to)
                            : "Not Planned"
                        }
                        description="Optional future payroll stop date"
                        icon={Landmark}
                        tone="rose"
                      />
                    </>
                  }
                  notes={
                    selectedActivePayProfile.notes
                      ? selectedActivePayProfile.notes
                      : undefined
                  }
                  actions={
                    <>
                      {permissionState.canUpdate ? (
                        <AixiaButton
                          type="button"
                          variant="secondary"
                          onClick={() => openEditPayProfile(selectedActivePayProfile)}
                          disabled={profileSaving}
                        >
                          <Edit3 className="h-4 w-4" />
                          Edit
                        </AixiaButton>
                      ) : null}

                      {permissionState.canDeleteArchive ? (
                        <AixiaButton
                          type="button"
                          variant="danger"
                          onClick={() => void deletePayProfile(selectedActivePayProfile)}
                          disabled={profileSaving}
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </AixiaButton>
                      ) : null}
                    </>
                  }
                />
              ) : (
                <AixiaAlert tone="info">
                  <AixiaAlertText
                    title="No active pay profile found for this employee"
                    description="Create a global paycheck profile. After it is saved, the paycheck request page can automatically pull employee defaults."
                  />
                </AixiaAlert>
              )}

              {showPayProfileForm ? (
                <PayProfileForm
                  mode={payProfileFormMode}
                  form={payProfileForm}
                  currencies={currencies}
                  saving={profileSaving}
                  onChange={updatePayProfileForm}
                  onCancel={closePayProfileForm}
                  onSave={() => void savePayProfile()}
                />
              ) : null}

              {selectedPayProfiles.length > 0 ? (
                <AixiaSection
                  title="Pay Profile History"
                  description="Historical pay profile records for the selected employee."
                  icon={Clock3}
                  smartScroll
                  visibleCards={8}
                >
                  <div className="aixia-section-smart-scroll-area">
                    <div className="aixia-action-stack">
                      {selectedPayProfiles.map((payProfile) => {
                        const hourlyStructure = getHourlyStructure(payProfile);

                        return (
                          <AixiaHistoryRow
                            key={payProfile.id}
                            title={buildPayProfileTitle(payProfile)}
                            description={`Start ${formatDateLabel(
                              payProfile.effective_from
                            )}${
                              payProfile.effective_to
                                ? ` • Future Termination ${formatDateLabel(
                                    payProfile.effective_to
                                  )}`
                                : " • No future termination"
                            }`}
                            value={
                              <span>
                                {formatMoney(
                                  getPrimaryGrossPay(payProfile),
                                  payProfile.currency_code
                                )}
                              </span>
                            }
                            status={
                              <AixiaStatusBadge
                                value={
                                  payProfile.active ? "active" : payProfile.status
                                }
                              />
                            }
                            badges={
                              <>
                                <AixiaCurrencyBadge value={payProfile.currency_code} />
                                <AixiaBadge
                                  tone={hourlyStructure.enabled ? "amber" : "neutral"}
                                >
                                  {hourlyStructure.enabled
                                    ? "Hourly On"
                                    : "Hourly Off"}
                                </AixiaBadge>
                              </>
                            }
                            actions={
                              <>
                                {permissionState.canUpdate ? (
                                  <AixiaButton
                                    type="button"
                                    variant="secondary"
                                    onClick={() => openEditPayProfile(payProfile)}
                                    disabled={profileSaving}
                                  >
                                    <Edit3 className="h-3.5 w-3.5" />
                                    Edit
                                  </AixiaButton>
                                ) : null}

                                {permissionState.canDeleteArchive ? (
                                  <AixiaButton
                                    type="button"
                                    variant="danger"
                                    onClick={() => void deletePayProfile(payProfile)}
                                    disabled={profileSaving}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                    Delete
                                  </AixiaButton>
                                ) : null}
                              </>
                            }
                          />
                        );
                      })}
                    </div>
                  </div>
                </AixiaSection>
              ) : null}
            </AixiaSection>
          </>
        ) : null}
      </AixiaModal>
    </AixiaPage>
  );
}
