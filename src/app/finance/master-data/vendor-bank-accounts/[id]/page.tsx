import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  Archive,
  ArrowRight,
  Building2,
  CheckCircle2,
  CreditCard,
  FileText,
  Landmark,
  Loader2,
  LockKeyhole,
  Pencil,
  RotateCcw,
  Save,
  ShieldCheck,
  Sparkles,
  WalletCards,
  X,
} from "lucide-react";

import {
  archiveVendorBankAccount,
  getVendorBankAccountById,
  getVendorOptions,
  restoreVendorBankAccount,
  updateVendorBankAccount,
  type FinanceVendorBankAccount,
  type VendorOption,
} from "@/lib/finance/vendor-bank-accounts";
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

type VendorBankIdentifierType = "swift" | "iban";
type VendorBankAccountStatus = "active" | "inactive" | "archived";

type EditSection = null | "overview" | "address" | "control" | "notes";

type OverviewDraft = {
  vendor_id: string;
  beneficiary_name: string;
  bank_name: string;
  account_number: string;
};

type AddressDraft = {
  country: string;
  city: string;
  postal_code: string;
  address_line_1: string;
  address_line_2: string;
};

type ControlDraft = {
  account_identifier_type: VendorBankIdentifierType | "";
  account_identifier_value: string;
  currency_code: string;
  is_default: boolean;
  status: VendorBankAccountStatus;
};

type CurrencyOption = {
  id: string;
  currency_code: string;
  currency_name: string;
  currency_symbol: string | null;
  decimal_places: number;
  is_base_currency: boolean;
  status: string;
};

type PermissionState = {
  canRead: boolean;
  canUpdate: boolean;
  canDeleteArchive: boolean;
  isAdmin: boolean;
};

type HeaderStatusCardData = {
  label: string;
  value: string;
  detail: string;
  icon: LucideIcon;
  tone: "emerald" | "cyan" | "amber" | "rose";
};

type SummaryCardData = {
  label: string;
  value: string;
  detail: string;
  icon: LucideIcon;
  tone: "cyan" | "emerald" | "amber" | "violet" | "rose";
};

const EMPTY_PERMISSION_STATE: PermissionState = {
  canRead: false,
  canUpdate: false,
  canDeleteArchive: false,
  isAdmin: false,
};

const EMPTY_OVERVIEW_DRAFT: OverviewDraft = {
  vendor_id: "",
  beneficiary_name: "",
  bank_name: "",
  account_number: "",
};

const EMPTY_ADDRESS_DRAFT: AddressDraft = {
  country: "",
  city: "",
  postal_code: "",
  address_line_1: "",
  address_line_2: "",
};

const EMPTY_CONTROL_DRAFT: ControlDraft = {
  account_identifier_type: "swift",
  account_identifier_value: "",
  currency_code: "",
  is_default: false,
  status: "active",
};

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
  const canViewBankAccounts = hasPermission(permissions, "viewBankAccounts");
  const canViewVendors = hasPermission(permissions, "viewVendors");
  const canManageVendors = hasPermission(permissions, "manageVendors");
  const canAccessPayables =
    hasPermission(permissions, "accessPayables") ||
    hasPermission(permissions, "viewPayables");
  const canAccessFinance =
    hasPermission(permissions, "accessFinance") ||
    hasPermission(permissions, "viewFinance");

  return {
    isAdmin,
    canRead:
      canManageMasterData ||
      canViewBankAccounts ||
      canViewVendors ||
      canManageVendors ||
      canAccessPayables ||
      canAccessFinance,
    canUpdate:
      canManageMasterData ||
      canManageVendors ||
      hasPermission(permissions, "editFinanceRecords"),
    canDeleteArchive:
      canManageMasterData ||
      canManageVendors ||
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
      console.warn(
        "Vendor Bank Account ID permission RPC fallback:",
        result.error.message
      );
      return null;
    }

    if (!result.data || typeof result.data !== "object") {
      return null;
    }

    return result.data as Partial<Record<Permission, boolean>>;
  } catch (error) {
    console.warn("Vendor Bank Account ID permission RPC failed:", error);
    return null;
  }
}

function formatDateTimeLabel(value: string | null | undefined) {
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

function formatStatus(value: string | null | undefined) {
  if (!value) return "Unknown";

  return value
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
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

function getToneClasses(tone: SummaryCardData["tone"]) {
  switch (tone) {
    case "emerald":
      return {
        card: "border-emerald-400/20 bg-emerald-500/10",
        icon: "border-emerald-400/20 bg-emerald-500/10 text-emerald-200",
        value: "text-emerald-100",
      };
    case "amber":
      return {
        card: "border-amber-400/20 bg-amber-500/10",
        icon: "border-amber-400/20 bg-amber-500/10 text-amber-200",
        value: "text-amber-100",
      };
    case "violet":
      return {
        card: "border-violet-400/20 bg-violet-500/10",
        icon: "border-violet-400/20 bg-violet-500/10 text-violet-200",
        value: "text-violet-100",
      };
    case "rose":
      return {
        card: "border-rose-400/20 bg-rose-500/10",
        icon: "border-rose-400/20 bg-rose-500/10 text-rose-200",
        value: "text-rose-100",
      };
    case "cyan":
    default:
      return {
        card: "border-cyan-400/20 bg-cyan-500/10",
        icon: "border-cyan-400/20 bg-cyan-500/10 text-cyan-200",
        value: "text-cyan-100",
      };
  }
}

function normalizeIdentifierType(value: string): VendorBankIdentifierType | null {
  const normalized = value.trim().toLowerCase();

  if (normalized === "swift" || normalized === "iban") {
    return normalized;
  }

  return null;
}

function normalizeStatus(value: string): VendorBankAccountStatus {
  if (value === "inactive" || value === "archived") return value;
  return "active";
}

function getVendorDisplayName(
  record: FinanceVendorBankAccount | null,
  vendor: VendorOption | null
) {
  if (vendor) {
    return vendor.legal_name?.trim() || vendor.name || "Unnamed vendor";
  }

  return record?.beneficiary_name || "—";
}

function getVendorCodeLabel(
  record: FinanceVendorBankAccount | null,
  vendor: VendorOption | null
) {
  return vendor?.code || record?.vendor_code || "—";
}

function getIdentifierLabel(record: FinanceVendorBankAccount | null) {
  if (!record?.account_identifier_type) return "Identifier";
  return record.account_identifier_type === "iban" ? "IBAN" : "SWIFT";
}

function getIdentifierValue(record: FinanceVendorBankAccount | null) {
  return record?.account_identifier_value || "—";
}

function getLocationLabel(record: FinanceVendorBankAccount | null) {
  const parts = [record?.city, record?.country].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : "—";
}

function getCurrencyOptionLabel(currency: CurrencyOption) {
  return `${currency.currency_code} — ${currency.currency_name}${
    currency.currency_symbol ? ` (${currency.currency_symbol})` : ""
  }${currency.is_base_currency ? " • Base" : ""}`;
}

function getCurrencyDisplayLabel(
  currencyOptions: CurrencyOption[],
  selectedCurrencyCode: string | null | undefined
) {
  if (!selectedCurrencyCode) return "—";

  const matchedCurrency = currencyOptions.find(
    (currency) => currency.currency_code === selectedCurrencyCode
  );

  if (!matchedCurrency) {
    return selectedCurrencyCode;
  }

  return matchedCurrency.currency_symbol
    ? `${matchedCurrency.currency_code} ${matchedCurrency.currency_symbol}`
    : matchedCurrency.currency_code;
}

function FieldLabel({
  label,
  required = false,
}: {
  label: string;
  required?: boolean;
}) {
  return (
    <label className="mb-2 block text-sm font-medium text-slate-300">
      {label}
      {required ? <span className="ml-1 text-rose-300">*</span> : null}
    </label>
  );
}

function InputField({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`h-11 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/30 focus:bg-black/30 disabled:cursor-not-allowed disabled:opacity-60 ${
        className || ""
      }`}
    />
  );
}

function SelectField({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & {
  children: ReactNode;
}) {
  return (
    <select
      {...props}
      className={`h-11 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none transition focus:border-cyan-400/30 focus:bg-black/30 disabled:cursor-not-allowed disabled:opacity-60 ${
        className || ""
      }`}
    >
      {children}
    </select>
  );
}

function TextareaField({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`min-h-[132px] w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/30 focus:bg-black/30 disabled:cursor-not-allowed disabled:opacity-60 ${
        className || ""
      }`}
    />
  );
}

function DisplayBlock({
  label,
  value,
  detail,
}: {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
}) {
  return (
    <div className="rounded-[20px] border border-white/10 bg-black/20 px-4 py-3">
      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </div>
      <div className="mt-2 break-words text-sm font-semibold leading-6 text-white">
        {value || "—"}
      </div>
      {detail ? (
        <div className="mt-1 text-xs leading-5 text-slate-500">{detail}</div>
      ) : null}
    </div>
  );
}

function StatusBadge({ status }: { status: string | null | undefined }) {
  return (
    <span
      className={`inline-flex max-w-full items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${getStatusTone(
        status
      )}`}
    >
      <span className="truncate">{formatStatus(status)}</span>
    </span>
  );
}

function DefaultBadge({ isDefault }: { isDefault: boolean }) {
  if (!isDefault) {
    return (
      <span className="inline-flex rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
        Standard
      </span>
    );
  }

  return (
    <span className="inline-flex rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-200">
      Default
    </span>
  );
}

function HeaderStatusCard({ item }: { item: HeaderStatusCardData }) {
  const Icon = item.icon;

  const toneClasses = {
    emerald: "border-emerald-400/20 bg-emerald-500/10 text-emerald-200",
    cyan: "border-cyan-400/20 bg-cyan-500/10 text-cyan-200",
    amber: "border-amber-400/20 bg-amber-500/10 text-amber-200",
    rose: "border-rose-400/20 bg-rose-500/10 text-rose-200",
  }[item.tone];

  return (
    <div className="min-h-[148px] rounded-[24px] border border-white/10 bg-black/20 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
            {item.label}
          </div>
          <div className="mt-2 text-xl font-semibold leading-tight tracking-[-0.035em] text-white">
            {item.value}
          </div>
        </div>

        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border ${toneClasses}`}
        >
          <Icon className="h-4 w-4" />
        </div>
      </div>

      <div className="mt-3 text-xs leading-5 text-slate-500">{item.detail}</div>
    </div>
  );
}

function SummaryCard({ item }: { item: SummaryCardData }) {
  const Icon = item.icon;
  const tone = getToneClasses(item.tone);

  return (
    <div className={`rounded-[24px] border bg-black/20 p-4 ${tone.card}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
            {item.label}
          </div>
          <div className={`mt-2 text-lg font-semibold leading-6 ${tone.value}`}>
            {item.value}
          </div>
        </div>

        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border ${tone.icon}`}
        >
          <Icon className="h-4 w-4" />
        </div>
      </div>

      <div className="mt-3 text-xs leading-5 text-slate-500">{item.detail}</div>
    </div>
  );
}

function DetailSection({
  title,
  description,
  icon: Icon,
  isEditing,
  canEdit,
  onEdit,
  onCancel,
  onSave,
  isSaving,
  children,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  isEditing: boolean;
  canEdit: boolean;
  onEdit?: () => void;
  onCancel?: () => void;
  onSave?: () => void;
  isSaving?: boolean;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
      <div className="flex flex-col gap-4 border-b border-white/10 px-5 py-4 lg:flex-row lg:items-start lg:justify-between">
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

        {canEdit ? (
          <div className="flex shrink-0 flex-wrap gap-2">
            {isEditing ? (
              <>
                <button
                  type="button"
                  onClick={onCancel}
                  disabled={isSaving}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] px-4 text-xs font-semibold uppercase tracking-[0.14em] text-slate-300 transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <X className="h-3.5 w-3.5" />
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={onSave}
                  disabled={isSaving}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-cyan-400/20 bg-cyan-500/10 px-4 text-xs font-semibold uppercase tracking-[0.14em] text-cyan-100 transition hover:bg-cyan-500/15 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSaving ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Save className="h-3.5 w-3.5" />
                  )}
                  Save
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={onEdit}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] px-4 text-xs font-semibold uppercase tracking-[0.14em] text-slate-300 transition hover:bg-white/[0.08] hover:text-white"
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit
              </button>
            )}
          </div>
        ) : null}
      </div>

      <div className="p-5">{children}</div>
    </section>
  );
}

function LoadingState() {
  return (
    <div className="min-h-screen bg-[#05070d] px-4 py-4 text-white md:px-6 md:py-6">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
        <section className="rounded-[34px] border border-white/10 bg-white/[0.045] p-12 text-center backdrop-blur-xl">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-cyan-200" />
          <div className="mt-4 text-sm font-semibold text-white">
            Loading vendor bank account
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Vendor bank-account record, vendor options, currency master data, and
            permission state are being checked.
          </p>
        </section>
      </div>
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <section className="rounded-[30px] border border-white/10 bg-white/[0.045] p-10 text-center backdrop-blur-xl">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-black/20 text-slate-500">
        <Icon className="h-6 w-6" />
      </div>
      <div className="mt-4 text-lg font-semibold text-white">{title}</div>
      <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-slate-500">
        {description}
      </p>
      {action ? <div className="mt-6">{action}</div> : null}
    </section>
  );
}

export default function FinanceMasterDataVendorBankAccountDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [profile, setProfile] = useState<ProfilePermissionRow | null>(null);
  const [effectivePermissions, setEffectivePermissions] =
    useState<Record<Permission, boolean> | null>(null);
  const [record, setRecord] = useState<FinanceVendorBankAccount | null>(null);
  const [vendors, setVendors] = useState<VendorOption[]>([]);
  const [currencyOptions, setCurrencyOptions] = useState<CurrencyOption[]>([]);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isLoadingRecord, setIsLoadingRecord] = useState(true);
  const [isLoadingCurrencies, setIsLoadingCurrencies] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isLifecycleRunning, setIsLifecycleRunning] = useState(false);
  const [editingSection, setEditingSection] = useState<EditSection>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [pageMessage, setPageMessage] = useState<string | null>(null);

  const [overviewDraft, setOverviewDraft] =
    useState<OverviewDraft>(EMPTY_OVERVIEW_DRAFT);
  const [addressDraft, setAddressDraft] =
    useState<AddressDraft>(EMPTY_ADDRESS_DRAFT);
  const [controlDraft, setControlDraft] =
    useState<ControlDraft>(EMPTY_CONTROL_DRAFT);
  const [notesDraft, setNotesDraft] = useState("");

  const loadCurrentProfile = useCallback(
    async (mode: "initial" | "silent" = "initial") => {
      if (mode === "initial") {
        setIsLoadingProfile(true);
      }

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
        console.error("Failed to load vendor bank account ID permissions:", error);

        if (mode === "initial") {
          setProfile(null);
          setEffectivePermissions(null);
        }
      } finally {
        if (mode === "initial") {
          setIsLoadingProfile(false);
        }
      }
    },
    []
  );

  const loadCurrencyOptions = useCallback(
    async (mode: "initial" | "silent" = "initial") => {
      if (mode === "initial") {
        setIsLoadingCurrencies(true);
      }

      try {
        const { data, error } = await supabase
          .from("finance_currencies")
          .select(
            `
              id,
              currency_code,
              currency_name,
              currency_symbol,
              decimal_places,
              is_base_currency,
              status
            `
          )
          .eq("status", "active")
          .order("is_base_currency", { ascending: false })
          .order("currency_code", { ascending: true });

        if (error) throw error;

        setCurrencyOptions((data ?? []) as CurrencyOption[]);
      } catch (error) {
        console.error("Failed to load currency master data:", error);

        if (mode === "initial") {
          setCurrencyOptions([]);
          setPageError(
            error instanceof Error
              ? error.message
              : "Failed to load currency master data."
          );
        }
      } finally {
        if (mode === "initial") {
          setIsLoadingCurrencies(false);
        }
      }
    },
    []
  );

  const loadRecord = useCallback(
    async (mode: "initial" | "silent" = "initial") => {
      if (!id) return;

      if (mode === "initial") {
        setIsLoadingRecord(true);
      }

      if (mode === "initial") {
        setPageError(null);
      }

      try {
        const [detail, vendorRows] = await Promise.all([
          getVendorBankAccountById(id),
          getVendorOptions(),
        ]);

        setRecord(detail);
        setVendors(vendorRows);
      } catch (error) {
        console.error("Failed to load vendor bank account details:", error);

        if (mode === "initial") {
          setRecord(null);
          setVendors([]);
          setPageError(
            error instanceof Error
              ? error.message
              : "Failed to load vendor bank account details."
          );
        }
      } finally {
        if (mode === "initial") {
          setIsLoadingRecord(false);
        }
      }
    },
    [id]
  );

  useEffect(() => {
    void Promise.all([
      loadCurrentProfile("initial"),
      loadRecord("initial"),
      loadCurrencyOptions("initial"),
    ]);
  }, [loadCurrencyOptions, loadCurrentProfile, loadRecord]);

  useEffect(() => {
    const channel = supabase
      .channel("finance-master-data-vendor-bank-account-id-page")
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
        () => void loadRecord("silent")
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_vendor_bank_accounts" },
        () => void loadRecord("silent")
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_currencies" },
        () => void loadCurrencyOptions("silent")
      )
      .subscribe();

    const intervalId = window.setInterval(() => {
      void Promise.all([
        loadCurrentProfile("silent"),
        loadRecord("silent"),
        loadCurrencyOptions("silent"),
      ]);
    }, 60000);

    return () => {
      window.clearInterval(intervalId);
      supabase.removeChannel(channel);
    };
  }, [loadCurrencyOptions, loadCurrentProfile, loadRecord]);

  const permissionState = useMemo(() => {
    return buildPermissionState(profile, effectivePermissions);
  }, [effectivePermissions, profile]);

  const selectedVendor = useMemo(() => {
    if (!record?.vendor_id) return null;
    return vendors.find((vendor) => vendor.id === record.vendor_id) ?? null;
  }, [record?.vendor_id, vendors]);

  const draftSelectedVendor = useMemo(() => {
    if (!overviewDraft.vendor_id) return null;
    return vendors.find((vendor) => vendor.id === overviewDraft.vendor_id) ?? null;
  }, [overviewDraft.vendor_id, vendors]);

  const selectedCurrency = useMemo(() => {
    return (
      currencyOptions.find(
        (currency) => currency.currency_code === record?.currency_code
      ) ?? null
    );
  }, [currencyOptions, record?.currency_code]);

  const draftSelectedCurrency = useMemo(() => {
    return (
      currencyOptions.find(
        (currency) => currency.currency_code === controlDraft.currency_code
      ) ?? null
    );
  }, [controlDraft.currency_code, currencyOptions]);

  const isPageLoading = isLoadingProfile || isLoadingRecord || isLoadingCurrencies;

  const headerStatusCards = useMemo<HeaderStatusCardData[]>(() => {
    return [
      {
        label: "Read Access",
        value: isLoadingProfile
          ? "Checking"
          : permissionState.canRead
            ? "Enabled"
            : "Locked",
        detail:
          "Viewing this record requires Vendor, Bank Account, Payables, Finance, or Master Data read access.",
        icon: permissionState.canRead ? ShieldCheck : LockKeyhole,
        tone: permissionState.canRead ? "emerald" : "rose",
      },
      {
        label: "Edit Access",
        value: permissionState.canUpdate ? "Enabled" : "Read Only",
        detail:
          "Section edits require Vendor management, Update access, or Master Data admin access.",
        icon: permissionState.canUpdate ? Pencil : LockKeyhole,
        tone: permissionState.canUpdate ? "cyan" : "amber",
      },
    ];
  }, [isLoadingProfile, permissionState.canRead, permissionState.canUpdate]);

  const summaryCards = useMemo<SummaryCardData[]>(() => {
    return [
      {
        label: "Vendor",
        value: getVendorDisplayName(record, selectedVendor),
        detail: getVendorCodeLabel(record, selectedVendor),
        icon: Building2,
        tone: "cyan",
      },
      {
        label: "Bank",
        value: record?.bank_name || "—",
        detail: record?.beneficiary_name || "No beneficiary",
        icon: Landmark,
        tone: "emerald",
      },
      {
        label: getIdentifierLabel(record),
        value: getIdentifierValue(record),
        detail: getCurrencyDisplayLabel(currencyOptions, record?.currency_code),
        icon: CreditCard,
        tone: "violet",
      },
      {
        label: "Lifecycle",
        value: formatStatus(record?.status),
        detail: record?.is_default ? "Default vendor payout account" : "Standard account",
        icon: record?.status === "archived" ? Archive : ShieldCheck,
        tone: record?.status === "archived" ? "rose" : "amber",
      },
    ];
  }, [currencyOptions, record, selectedVendor]);

  function cancelEditing() {
    setEditingSection(null);
    setPageError(null);
  }

  function openOverviewEditor() {
    if (!record || !permissionState.canUpdate) return;

    setPageError(null);
    setPageMessage(null);
    setOverviewDraft({
      vendor_id: record.vendor_id || "",
      beneficiary_name: record.beneficiary_name || "",
      bank_name: record.bank_name || "",
      account_number: record.account_number || "",
    });
    setEditingSection("overview");
  }

  function openAddressEditor() {
    if (!record || !permissionState.canUpdate) return;

    setPageError(null);
    setPageMessage(null);
    setAddressDraft({
      country: record.country || "",
      city: record.city || "",
      postal_code: record.postal_code || "",
      address_line_1: record.address_line_1 || "",
      address_line_2: record.address_line_2 || "",
    });
    setEditingSection("address");
  }

  function openControlEditor() {
    if (!record || !permissionState.canUpdate) return;

    setPageError(null);
    setPageMessage(null);
    setControlDraft({
      account_identifier_type:
        normalizeIdentifierType(record.account_identifier_type || "") || "swift",
      account_identifier_value: record.account_identifier_value || "",
      currency_code: record.currency_code || "",
      is_default: record.is_default,
      status: normalizeStatus(record.status),
    });
    setEditingSection("control");
  }

  function openNotesEditor() {
    if (!record || !permissionState.canUpdate) return;

    setPageError(null);
    setPageMessage(null);
    setNotesDraft(record.notes || "");
    setEditingSection("notes");
  }

  function updateOverviewDraft<K extends keyof OverviewDraft>(
    key: K,
    value: OverviewDraft[K]
  ) {
    setOverviewDraft((previousDraft) => ({
      ...previousDraft,
      [key]: value,
    }));
  }

  function updateAddressDraft<K extends keyof AddressDraft>(
    key: K,
    value: AddressDraft[K]
  ) {
    setAddressDraft((previousDraft) => ({
      ...previousDraft,
      [key]: value,
    }));
  }

  function updateControlDraft<K extends keyof ControlDraft>(
    key: K,
    value: ControlDraft[K]
  ) {
    setControlDraft((previousDraft) => ({
      ...previousDraft,
      [key]: value,
    }));
  }

  function handleOverviewVendorChange(vendorId: string) {
    const vendor = vendors.find((item) => item.id === vendorId) ?? null;

    setOverviewDraft((previousDraft) => ({
      ...previousDraft,
      vendor_id: vendorId,
      beneficiary_name:
        vendor?.legal_name?.trim() || vendor?.name || previousDraft.beneficiary_name,
    }));
  }

  async function saveOverviewSection() {
    if (!record || !permissionState.canUpdate) return;

    if (!overviewDraft.vendor_id) {
      setPageError("Vendor is required.");
      return;
    }

    if (!overviewDraft.beneficiary_name.trim()) {
      setPageError("Beneficiary name is required.");
      return;
    }

    if (!overviewDraft.bank_name.trim()) {
      setPageError("Bank name is required.");
      return;
    }

    try {
      setIsSaving(true);
      setPageError(null);
      setPageMessage(null);

      await updateVendorBankAccount(record.id, {
        vendor_id: overviewDraft.vendor_id,
        beneficiary_name: overviewDraft.beneficiary_name.trim() || null,
        bank_name: overviewDraft.bank_name.trim() || null,
        account_number: overviewDraft.account_number.trim() || null,
      });

      setEditingSection(null);
      setPageMessage("Vendor bank-account overview updated.");
      await loadRecord("silent");
    } catch (error) {
      console.error("Failed to save vendor bank-account overview:", error);
      setPageError(
        error instanceof Error
          ? error.message
          : "Failed to save vendor bank-account overview."
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function saveAddressSection() {
    if (!record || !permissionState.canUpdate) return;

    try {
      setIsSaving(true);
      setPageError(null);
      setPageMessage(null);

      await updateVendorBankAccount(record.id, {
        country: addressDraft.country.trim() || null,
        city: addressDraft.city.trim() || null,
        postal_code: addressDraft.postal_code.trim() || null,
        address_line_1: addressDraft.address_line_1.trim() || null,
        address_line_2: addressDraft.address_line_2.trim() || null,
      });

      setEditingSection(null);
      setPageMessage("Vendor bank address updated.");
      await loadRecord("silent");
    } catch (error) {
      console.error("Failed to save vendor bank address:", error);
      setPageError(
        error instanceof Error ? error.message : "Failed to save vendor bank address."
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function saveControlSection() {
    if (!record || !permissionState.canUpdate) return;

    const normalizedIdentifierType = normalizeIdentifierType(
      controlDraft.account_identifier_type
    );
    const normalizedStatus = normalizeStatus(controlDraft.status);

    if (
      normalizedStatus === "archived" &&
      record.status !== "archived" &&
      !permissionState.canDeleteArchive
    ) {
      setPageError("Delete/Archive access is required to archive this record.");
      return;
    }

    if (
      record.status === "archived" &&
      normalizedStatus !== "archived" &&
      !permissionState.canDeleteArchive
    ) {
      setPageError("Delete/Archive access is required to restore this record.");
      return;
    }

    if (!controlDraft.currency_code.trim()) {
      setPageError("Currency is required and must come from currency master data.");
      return;
    }

    const currencyExists = currencyOptions.some(
      (currency) => currency.currency_code === controlDraft.currency_code.trim()
    );

    if (!currencyExists) {
      setPageError("Selected currency does not exist in active currency master data.");
      return;
    }

    try {
      setIsSaving(true);
      setPageError(null);
      setPageMessage(null);

      await updateVendorBankAccount(record.id, {
        account_identifier_type: normalizedIdentifierType,
        account_identifier_value:
          controlDraft.account_identifier_value.trim() || null,
        currency_code: controlDraft.currency_code.trim(),
        is_default: controlDraft.is_default,
        status: normalizedStatus,
      });

      setEditingSection(null);
      setPageMessage("Identifier, currency, and control settings updated.");
      await loadRecord("silent");
    } catch (error) {
      console.error("Failed to save vendor bank-account control settings:", error);
      setPageError(
        error instanceof Error
          ? error.message
          : "Failed to save vendor bank-account control settings."
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function saveNotesSection() {
    if (!record || !permissionState.canUpdate) return;

    try {
      setIsSaving(true);
      setPageError(null);
      setPageMessage(null);

      await updateVendorBankAccount(record.id, {
        notes: notesDraft.trim() || null,
      });

      setEditingSection(null);
      setPageMessage("Notes updated.");
      await loadRecord("silent");
    } catch (error) {
      console.error("Failed to save vendor bank-account notes:", error);
      setPageError(
        error instanceof Error ? error.message : "Failed to save notes."
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleArchiveToggle() {
    if (!record || !permissionState.canDeleteArchive || isLifecycleRunning) return;

    try {
      setIsLifecycleRunning(true);
      setPageError(null);
      setPageMessage(null);

      if (record.status === "archived") {
        await restoreVendorBankAccount(record.id);
        setPageMessage("Vendor bank account restored.");
      } else {
        await archiveVendorBankAccount(record.id);
        setPageMessage("Vendor bank account archived.");
      }

      await loadRecord("silent");
    } catch (error) {
      console.error("Failed to update vendor bank account lifecycle:", error);
      setPageError(
        error instanceof Error
          ? error.message
          : "Failed to update vendor bank account lifecycle."
      );
    } finally {
      setIsLifecycleRunning(false);
    }
  }

  if (isPageLoading) {
    return <LoadingState />;
  }

  if (!record) {
    return (
      <div className="min-h-screen bg-[#05070d] px-4 py-4 text-white md:px-6 md:py-6">
        <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
          <EmptyState
            icon={CreditCard}
            title="Vendor bank account not found"
            description="The vendor bank-account record could not be loaded or no longer exists."
            action={
              <button
                type="button"
                onClick={() =>
                  navigate("/finance/master-data/vendor-bank-accounts")
                }
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-cyan-400/20 bg-cyan-500/10 px-5 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/15"
              >
                <ArrowRight className="h-4 w-4 rotate-180" />
                Vendor Bank Accounts
              </button>
            }
          />
        </div>
      </div>
    );
  }

  if (!permissionState.canRead) {
    return (
      <div className="min-h-screen bg-[#05070d] px-4 py-4 text-white md:px-6 md:py-6">
        <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
          <header className="relative overflow-hidden rounded-[34px] border border-white/10 bg-white/[0.045] p-6 shadow-2xl shadow-black/30 backdrop-blur-xl">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(6,182,212,0.16),transparent_38%),radial-gradient(circle_at_top_right,rgba(139,92,246,0.12),transparent_34%)]" />

            <div className="relative">
              <button
                type="button"
                onClick={() =>
                  navigate("/finance/master-data/vendor-bank-accounts")
                }
                className="mb-5 inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-300 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
              >
                <ArrowRight className="h-3.5 w-3.5 rotate-180" />
                Vendor Bank Accounts
              </button>

              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-rose-400/20 bg-rose-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-rose-200">
                <LockKeyhole className="h-3.5 w-3.5" />
                Access Locked
              </div>

              <h1 className="mt-4 text-3xl font-semibold tracking-[-0.035em] text-white md:text-5xl">
                Vendor Bank Account Access Locked
              </h1>

              <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-400 md:text-base md:leading-7">
                This page requires Vendor, Bank Account, Payables, Finance, or
                Master Data read access.
              </p>
            </div>
          </header>

          <EmptyState
            icon={LockKeyhole}
            title="No vendor bank-account read access"
            description="Ask an Admin to assign a Finance role template or user-specific exception with Vendor, Payables, Finance, Bank Account, or Master Data read access."
          />
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
                onClick={() =>
                  navigate("/finance/master-data/vendor-bank-accounts")
                }
                className="mb-5 inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-300 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
              >
                <ArrowRight className="h-3.5 w-3.5 rotate-180" />
                Vendor Bank Accounts
              </button>

              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-200">
                <Sparkles className="h-3.5 w-3.5" />
                Vendor Bank Account Detail
              </div>

              <h1 className="mt-4 text-3xl font-semibold tracking-[-0.035em] text-white md:text-5xl">
                {record.bank_name || "Vendor Bank Account"}
              </h1>

              <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-400 md:text-base md:leading-7">
                Vendor payout bank-account record with same-place section editing,
                lifecycle control, general currency master-data selection, and
                permission-protected actions.
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-300">
                  {record.bank_id || "No Bank ID"}
                </span>

                <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-300">
                  {getVendorCodeLabel(record, selectedVendor)}
                </span>

                <StatusBadge status={record.status} />

                {record.is_default ? <DefaultBadge isDefault /> : null}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {headerStatusCards.map((item) => (
                <HeaderStatusCard key={item.label} item={item} />
              ))}
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
          {summaryCards.map((item) => (
            <SummaryCard key={item.label} item={item} />
          ))}
        </section>

        <section className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
          <div className="grid gap-6">
            <DetailSection
              title="Vendor Bank Overview"
              description="Vendor linkage, beneficiary, bank name, and account number."
              icon={Building2}
              isEditing={editingSection === "overview"}
              canEdit={permissionState.canUpdate}
              onEdit={openOverviewEditor}
              onCancel={cancelEditing}
              onSave={() => void saveOverviewSection()}
              isSaving={isSaving}
            >
              {editingSection === "overview" ? (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <FieldLabel label="Vendor" required />
                    <SelectField
                      value={overviewDraft.vendor_id}
                      disabled={isSaving}
                      onChange={(event) =>
                        handleOverviewVendorChange(event.target.value)
                      }
                    >
                      <option value="" className="bg-[#05070d]">
                        Select vendor
                      </option>
                      {vendors.map((vendor) => (
                        <option
                          key={vendor.id}
                          value={vendor.id}
                          className="bg-[#05070d]"
                        >
                          {(vendor.legal_name?.trim() || vendor.name) +
                            (vendor.code ? ` • ${vendor.code}` : "")}
                        </option>
                      ))}
                    </SelectField>
                  </div>

                  <DisplayBlock
                    label="Draft Vendor Code"
                    value={draftSelectedVendor?.code || "—"}
                    detail="Pulled from the selected vendor."
                  />

                  <DisplayBlock
                    label="Currency Source"
                    value="General currency master data"
                    detail="Vendor bank-account currency is selected in the control section."
                  />

                  <div className="md:col-span-2">
                    <FieldLabel label="Beneficiary Name" required />
                    <InputField
                      value={overviewDraft.beneficiary_name}
                      disabled={isSaving}
                      onChange={(event) =>
                        updateOverviewDraft("beneficiary_name", event.target.value)
                      }
                      placeholder="Beneficiary name"
                    />
                  </div>

                  <div>
                    <FieldLabel label="Bank Name" required />
                    <InputField
                      value={overviewDraft.bank_name}
                      disabled={isSaving}
                      onChange={(event) =>
                        updateOverviewDraft("bank_name", event.target.value)
                      }
                      placeholder="Bank name"
                    />
                  </div>

                  <div>
                    <FieldLabel label="Account Number" />
                    <InputField
                      value={overviewDraft.account_number}
                      disabled={isSaving}
                      onChange={(event) =>
                        updateOverviewDraft("account_number", event.target.value)
                      }
                      placeholder="Account number"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  <DisplayBlock
                    label="Vendor"
                    value={getVendorDisplayName(record, selectedVendor)}
                    detail={getVendorCodeLabel(record, selectedVendor)}
                  />
                  <DisplayBlock
                    label="Beneficiary Name"
                    value={record.beneficiary_name || "—"}
                  />
                  <DisplayBlock label="Bank Name" value={record.bank_name || "—"} />
                  <DisplayBlock
                    label="Account Number"
                    value={record.account_number || "—"}
                  />
                </div>
              )}
            </DetailSection>

            <DetailSection
              title="Bank Address"
              description="Country, city, postal code, and address lines."
              icon={WalletCards}
              isEditing={editingSection === "address"}
              canEdit={permissionState.canUpdate}
              onEdit={openAddressEditor}
              onCancel={cancelEditing}
              onSave={() => void saveAddressSection()}
              isSaving={isSaving}
            >
              {editingSection === "address" ? (
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <FieldLabel label="Country" />
                    <InputField
                      value={addressDraft.country}
                      disabled={isSaving}
                      onChange={(event) =>
                        updateAddressDraft("country", event.target.value)
                      }
                      placeholder="Country"
                    />
                  </div>

                  <div>
                    <FieldLabel label="City" />
                    <InputField
                      value={addressDraft.city}
                      disabled={isSaving}
                      onChange={(event) =>
                        updateAddressDraft("city", event.target.value)
                      }
                      placeholder="City"
                    />
                  </div>

                  <div>
                    <FieldLabel label="ZIP / Postal Code" />
                    <InputField
                      value={addressDraft.postal_code}
                      disabled={isSaving}
                      onChange={(event) =>
                        updateAddressDraft("postal_code", event.target.value)
                      }
                      placeholder="Postal code"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <FieldLabel label="Address Line 1" />
                    <InputField
                      value={addressDraft.address_line_1}
                      disabled={isSaving}
                      onChange={(event) =>
                        updateAddressDraft("address_line_1", event.target.value)
                      }
                      placeholder="Address line 1"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <FieldLabel label="Address Line 2" />
                    <InputField
                      value={addressDraft.address_line_2}
                      disabled={isSaving}
                      onChange={(event) =>
                        updateAddressDraft("address_line_2", event.target.value)
                      }
                      placeholder="Address line 2"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  <DisplayBlock label="Location" value={getLocationLabel(record)} />
                  <DisplayBlock label="Country" value={record.country || "—"} />
                  <DisplayBlock label="City" value={record.city || "—"} />
                  <DisplayBlock
                    label="ZIP / Postal Code"
                    value={record.postal_code || "—"}
                  />
                  <DisplayBlock
                    label="Address Line 1"
                    value={record.address_line_1 || "—"}
                  />
                  <DisplayBlock
                    label="Address Line 2"
                    value={record.address_line_2 || "—"}
                  />
                </div>
              )}
            </DetailSection>

                        <DetailSection
              title="Identifier / Currency / Control"
              description="Identifier type, identifier value, currency master-data selection, default flag, and lifecycle status."
              icon={CreditCard}
              isEditing={editingSection === "control"}
              canEdit={permissionState.canUpdate}
              onEdit={openControlEditor}
              onCancel={cancelEditing}
              onSave={() => void saveControlSection()}
              isSaving={isSaving}
            >
              {editingSection === "control" ? (
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <FieldLabel label="Identifier Type" />
                    <SelectField
                      value={controlDraft.account_identifier_type || ""}
                      disabled={isSaving}
                      onChange={(event) =>
                        updateControlDraft(
                          "account_identifier_type",
                          normalizeIdentifierType(event.target.value) || ""
                        )
                      }
                    >
                      <option value="" className="bg-[#05070d]">
                        None
                      </option>
                      <option value="swift" className="bg-[#05070d]">
                        SWIFT
                      </option>
                      <option value="iban" className="bg-[#05070d]">
                        IBAN
                      </option>
                    </SelectField>
                  </div>

                  <div>
                    <FieldLabel label="Identifier Value" />
                    <InputField
                      value={controlDraft.account_identifier_value}
                      disabled={isSaving}
                      onChange={(event) =>
                        updateControlDraft(
                          "account_identifier_value",
                          event.target.value
                        )
                      }
                      placeholder="Identifier value"
                    />
                  </div>

                  <div>
                    <FieldLabel label="Currency" required />
                    <SelectField
                      value={controlDraft.currency_code}
                      disabled={isSaving}
                      onChange={(event) =>
                        updateControlDraft("currency_code", event.target.value)
                      }
                    >
                      <option value="" className="bg-[#05070d]">
                        Select currency
                      </option>
                      {currencyOptions.map((currency) => (
                        <option
                          key={currency.id}
                          value={currency.currency_code}
                          className="bg-[#05070d]"
                        >
                          {getCurrencyOptionLabel(currency)}
                        </option>
                      ))}
                    </SelectField>
                  </div>

                  <div>
                    <FieldLabel label="Status" />
                    <SelectField
                      value={controlDraft.status}
                      disabled={isSaving}
                      onChange={(event) =>
                        updateControlDraft(
                          "status",
                          normalizeStatus(event.target.value)
                        )
                      }
                    >
                      <option value="active" className="bg-[#05070d]">
                        Active
                      </option>
                      <option value="inactive" className="bg-[#05070d]">
                        Inactive
                      </option>
                      <option value="archived" className="bg-[#05070d]">
                        Archived
                      </option>
                    </SelectField>
                  </div>

                  <label className="flex items-start gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-300 md:col-span-2">
                    <input
                      type="checkbox"
                      checked={controlDraft.is_default}
                      disabled={isSaving}
                      onChange={(event) =>
                        updateControlDraft("is_default", event.target.checked)
                      }
                      className="mt-1"
                    />
                    <span>
                      <span className="block font-semibold text-white">
                        Set as default payout bank account for this vendor
                      </span>
                      <span className="mt-1 block text-xs leading-5 text-slate-500">
                        Default handling is controlled by the vendor bank-account helper logic.
                      </span>
                    </span>
                  </label>

                  <DisplayBlock
                    label="Selected Currency"
                    value={
                      draftSelectedCurrency
                        ? getCurrencyOptionLabel(draftSelectedCurrency)
                        : "No currency selected"
                    }
                    detail="Currency is selected from finance_currencies and saved on this vendor bank-account record."
                  />
                </div>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  <DisplayBlock
                    label="Identifier Type"
                    value={record.account_identifier_type?.toUpperCase() || "—"}
                  />
                  <DisplayBlock
                    label="Identifier Value"
                    value={record.account_identifier_value || "—"}
                  />
                  <DisplayBlock
                    label="Currency"
                    value={getCurrencyDisplayLabel(
                      currencyOptions,
                      record.currency_code
                    )}
                    detail={
                      selectedCurrency
                        ? `${selectedCurrency.currency_name}${
                            selectedCurrency.currency_symbol
                              ? ` • ${selectedCurrency.currency_symbol}`
                              : ""
                          }`
                        : "Saved on this vendor bank-account record."
                    }
                  />
                  <DisplayBlock
                    label="Default Status"
                    value={<DefaultBadge isDefault={record.is_default} />}
                  />
                  <DisplayBlock
                    label="Lifecycle Status"
                    value={<StatusBadge status={record.status} />}
                  />
                </div>
              )}
            </DetailSection>

            <DetailSection
              title="Notes"
              description="Internal notes for finance operators."
              icon={FileText}
              isEditing={editingSection === "notes"}
              canEdit={permissionState.canUpdate}
              onEdit={openNotesEditor}
              onCancel={cancelEditing}
              onSave={() => void saveNotesSection()}
              isSaving={isSaving}
            >
              {editingSection === "notes" ? (
                <div>
                  <FieldLabel label="Notes" />
                  <TextareaField
                    value={notesDraft}
                    disabled={isSaving}
                    onChange={(event) => setNotesDraft(event.target.value)}
                    placeholder="Internal notes..."
                  />
                </div>
              ) : (
                <div className="rounded-[20px] border border-white/10 bg-black/20 px-4 py-4 text-sm leading-7 text-slate-300">
                  {record.notes || "No notes added yet."}
                </div>
              )}
            </DetailSection>
          </div>

          <aside className="grid gap-6">
            <section className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
              <div className="border-b border-white/10 px-5 py-4">
                <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Record Summary
                </div>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Key vendor payout account details and current lifecycle.
                </p>
              </div>

              <div className="grid gap-4 p-5">
                {summaryCards.map((item) => (
                  <SummaryCard key={item.label} item={item} />
                ))}
              </div>
            </section>

            <section className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
              <div className="border-b border-white/10 px-5 py-4">
                <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Lifecycle Actions
                </div>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Archive or restore this vendor bank account. Permanent delete is
                  only available from the registry archive modal.
                </p>
              </div>

              <div className="grid gap-3 p-5">
                {permissionState.canDeleteArchive ? (
                  <button
                    type="button"
                    onClick={() => void handleArchiveToggle()}
                    disabled={isLifecycleRunning}
                    className={`inline-flex h-12 items-center justify-center gap-2 rounded-2xl border px-5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                      record.status === "archived"
                        ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/15"
                        : "border-rose-400/20 bg-rose-500/10 text-rose-100 hover:bg-rose-500/15"
                    }`}
                  >
                    {isLifecycleRunning ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : record.status === "archived" ? (
                      <RotateCcw className="h-4 w-4" />
                    ) : (
                      <Archive className="h-4 w-4" />
                    )}
                    {record.status === "archived"
                      ? "Restore Account"
                      : "Archive Account"}
                  </button>
                ) : (
                  <div className="rounded-[20px] border border-amber-400/20 bg-amber-500/10 p-4 text-sm leading-6 text-amber-100">
                    Delete/Archive access is not enabled for this user.
                  </div>
                )}

                <button
                  type="button"
                  onClick={() =>
                    navigate("/finance/master-data/vendor-bank-accounts")
                  }
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] px-5 text-sm font-semibold text-slate-300 transition hover:bg-white/[0.08]"
                >
                  <ArrowRight className="h-4 w-4 rotate-180" />
                  Vendor Bank Accounts
                </button>
              </div>
            </section>

            <section className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
              <div className="border-b border-white/10 px-5 py-4">
                <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                  System Fields
                </div>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Read-only audit and system metadata.
                </p>
              </div>

              <div className="grid gap-3 p-5">
                <DisplayBlock label="Bank ID" value={record.bank_id || "—"} />
                <DisplayBlock label="Record ID" value={record.id} />
                <DisplayBlock
                  label="Vendor ID"
                  value={record.vendor_id || "—"}
                />
                <DisplayBlock
                  label="Created"
                  value={formatDateTimeLabel(record.created_at)}
                />
                <DisplayBlock
                  label="Updated"
                  value={formatDateTimeLabel(record.updated_at)}
                />
                <DisplayBlock
                  label="Currency Source"
                  value="finance_currencies"
                  detail="Currency is selected from general AiXia master data and saved on this vendor bank-account record."
                />
              </div>
            </section>

            <section className="rounded-[24px] border border-cyan-400/20 bg-cyan-500/10 p-4 text-sm leading-6 text-cyan-100">
              <div className="font-semibold text-white">Locked detail rule</div>
              <div className="mt-1">
                This page requires Vendor / Payables / Finance / Bank Account /
                Master Data read access. Section edits require Update or Vendor
                management access. Archive and Restore require Delete/Archive access.
                Permanent delete is intentionally not available on the ID page.
                Currency must come from the general finance_currencies master-data
                table and is saved directly on this vendor bank-account record.
              </div>
            </section>
          </aside>
        </section>
      </div>
    </div>
  );
}
