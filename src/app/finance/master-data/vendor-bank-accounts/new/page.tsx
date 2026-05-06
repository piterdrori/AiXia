import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  FormEvent,
  InputHTMLAttributes,
  ReactNode,
  TextareaHTMLAttributes,
} from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  Building2,
  CheckCircle2,
  CreditCard,
  FileText,
  Landmark,
  Loader2,
  LockKeyhole,
  RotateCcw,
  Save,
  ShieldCheck,
  Sparkles,
  WalletCards,
} from "lucide-react";

import {
  createVendorBankAccount,
  getVendorOptions,
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

type BankIdentifierType = "swift" | "iban";
type VendorBankAccountCreateStatus = "active" | "inactive";

type CurrencyOption = {
  id: string;
  currency_code: string;
  currency_name: string;
  currency_symbol: string | null;
  decimal_places: number;
  is_base_currency: boolean;
  status: string;
};

type FormState = {
  vendor_id: string;
  vendor_code: string;
  beneficiary_name: string;
  bank_name: string;
  country: string;
  city: string;
  postal_code: string;
  address_line_1: string;
  address_line_2: string;
  account_number: string;
  account_identifier_type: BankIdentifierType;
  account_identifier_value: string;
  currency_code: string;
  is_default: boolean;
  status: VendorBankAccountCreateStatus;
  notes: string;
};

type PermissionState = {
  canRead: boolean;
  canCreate: boolean;
  isAdmin: boolean;
};

type HeaderStatusCardData = {
  label: string;
  value: string;
  detail: string;
  icon: LucideIcon;
  tone: "emerald" | "cyan" | "amber" | "rose";
};

type SummaryItem = {
  label: string;
  value: string;
  detail: string;
  icon: LucideIcon;
  tone: "cyan" | "emerald" | "amber" | "violet" | "rose";
};

const EMPTY_FORM: FormState = {
  vendor_id: "",
  vendor_code: "",
  beneficiary_name: "",
  bank_name: "",
  country: "",
  city: "",
  postal_code: "",
  address_line_1: "",
  address_line_2: "",
  account_number: "",
  account_identifier_type: "swift",
  account_identifier_value: "",
  currency_code: "",
  is_default: false,
  status: "active",
  notes: "",
};

const EMPTY_PERMISSION_STATE: PermissionState = {
  canRead: false,
  canCreate: false,
  isAdmin: false,
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
    canCreate:
      canManageMasterData ||
      canManageVendors ||
      hasPermission(permissions, "createFinanceRecords"),
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
        "Create Vendor Bank Account permission RPC fallback:",
        result.error.message
      );
      return null;
    }

    if (!result.data || typeof result.data !== "object") {
      return null;
    }

    return result.data as Partial<Record<Permission, boolean>>;
  } catch (error) {
    console.warn("Create Vendor Bank Account permission RPC failed:", error);
    return null;
  }
}

function getToneClasses(tone: SummaryItem["tone"]) {
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

function SummaryCard({ item }: { item: SummaryItem }) {
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
  value,
  onChange,
  children,
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
  disabled?: boolean;
}) {
  return (
    <select
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
      className="h-11 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none transition focus:border-cyan-400/30 focus:bg-black/30 disabled:cursor-not-allowed disabled:opacity-60"
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

function FormSection({
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

        <div className="min-w-0">
          <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
            {title}
          </h2>
          <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
        </div>
      </div>

      <div className="p-5">{children}</div>
    </section>
  );
}

function ReadOnlyBlock({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </div>
      <div className="mt-2 text-sm font-semibold text-white">{value}</div>
      {detail ? (
        <div className="mt-1 text-xs leading-5 text-slate-500">{detail}</div>
      ) : null}
    </div>
  );
}

function EmptyLockedState() {
  return (
    <section className="overflow-hidden rounded-[30px] border border-rose-400/20 bg-rose-500/10 backdrop-blur-xl">
      <div className="p-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-rose-400/20 bg-rose-500/10 text-rose-200">
          <LockKeyhole className="h-6 w-6" />
        </div>

        <div className="mt-4 text-lg font-semibold text-white">
          Create access is not enabled
        </div>

        <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-rose-100">
          This page requires Vendor Bank Account create access, Vendor management
          access, or Master Data admin access. Ask an Admin to update this user’s
          Finance role template or user-specific exception before creating vendor
          payout bank accounts.
        </p>
      </div>
    </section>
  );
}

function normalizeIdentifierType(value: string): BankIdentifierType {
  return value === "iban" ? "iban" : "swift";
}

function normalizeStatus(value: string): VendorBankAccountCreateStatus {
  return value === "inactive" ? "inactive" : "active";
}

function getVendorDisplayName(vendor: VendorOption | null) {
  if (!vendor) return "No vendor selected";
  return vendor.legal_name?.trim() || vendor.name || "Unnamed vendor";
}

function getVendorCodeLabel(vendor: VendorOption | null, fallback: string) {
  return vendor?.code || fallback || "Auto from vendor";
}

function getCurrencyOptionLabel(currency: CurrencyOption) {
  return `${currency.currency_code} — ${currency.currency_name}${
    currency.currency_symbol ? ` (${currency.currency_symbol})` : ""
  }${currency.is_base_currency ? " • Base" : ""}`;
}

function getCurrencyLabel(
  currencyOptions: CurrencyOption[],
  selectedCurrencyCode: string
) {
  const matchedCurrency = currencyOptions.find(
    (currency) => currency.currency_code === selectedCurrencyCode
  );

  if (!selectedCurrencyCode) {
    return "Currency required";
  }

  if (!matchedCurrency) {
    return selectedCurrencyCode;
  }

  return matchedCurrency.currency_symbol
    ? `${matchedCurrency.currency_code} ${matchedCurrency.currency_symbol}`
    : matchedCurrency.currency_code;
}

export default function FinanceMasterDataVendorBankAccountCreatePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [vendors, setVendors] = useState<VendorOption[]>([]);
  const [currencyOptions, setCurrencyOptions] = useState<CurrencyOption[]>([]);
  const [profile, setProfile] = useState<ProfilePermissionRow | null>(null);
  const [effectivePermissions, setEffectivePermissions] =
    useState<Record<Permission, boolean> | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isLoadingVendors, setIsLoadingVendors] = useState(true);
  const [isLoadingCurrencies, setIsLoadingCurrencies] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formMessage, setFormMessage] = useState<string | null>(null);

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
        console.error("Failed to load create vendor bank account permissions:", error);

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

  const loadVendors = useCallback(
    async (mode: "initial" | "silent" = "initial") => {
      if (mode === "initial") {
        setIsLoadingVendors(true);
      }

      try {
        const rows = await getVendorOptions();
        setVendors(rows);

        const vendorIdFromUrl = searchParams.get("vendor_id");
        if (!vendorIdFromUrl) return;

        const vendor = rows.find((item) => item.id === vendorIdFromUrl) ?? null;
        if (!vendor) return;

        setForm((previousForm) => ({
          ...previousForm,
          vendor_id: vendorIdFromUrl,
          vendor_code: vendor.code ?? "",
          beneficiary_name:
            previousForm.beneficiary_name ||
            vendor.legal_name?.trim() ||
            vendor.name ||
            "",
        }));
      } catch (error) {
        console.error("Failed to load vendors for vendor bank account create page:", error);

        if (mode === "initial") {
          setVendors([]);
          setFormError(
            error instanceof Error ? error.message : "Failed to load vendor options."
          );
        }
      } finally {
        if (mode === "initial") {
          setIsLoadingVendors(false);
        }
      }
    },
    [searchParams]
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

        const rows = (data ?? []) as CurrencyOption[];
        setCurrencyOptions(rows);

        setForm((previousForm) => {
          if (previousForm.currency_code) return previousForm;

          const baseCurrency = rows.find((currency) => currency.is_base_currency);
          const firstCurrency = baseCurrency || rows[0];

          return {
            ...previousForm,
            currency_code: firstCurrency?.currency_code || "",
          };
        });
      } catch (error) {
        console.error("Failed to load currency master data:", error);

        if (mode === "initial") {
          setCurrencyOptions([]);
          setFormError(
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

  useEffect(() => {
    void Promise.all([
      loadCurrentProfile("initial"),
      loadVendors("initial"),
      loadCurrencyOptions("initial"),
    ]);
  }, [loadCurrencyOptions, loadCurrentProfile, loadVendors]);

  useEffect(() => {
    const channel = supabase
      .channel("finance-master-data-vendor-bank-account-create-page")
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
        () => void loadVendors("silent")
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
        loadVendors("silent"),
        loadCurrencyOptions("silent"),
      ]);
    }, 60000);

    return () => {
      window.clearInterval(intervalId);
      supabase.removeChannel(channel);
    };
  }, [loadCurrencyOptions, loadCurrentProfile, loadVendors]);

  const permissionState = useMemo(() => {
    return buildPermissionState(profile, effectivePermissions);
  }, [effectivePermissions, profile]);

  const selectedVendor = useMemo(() => {
    return vendors.find((vendor) => vendor.id === form.vendor_id) ?? null;
  }, [vendors, form.vendor_id]);

  const selectedCurrency = useMemo(() => {
    return (
      currencyOptions.find(
        (currency) => currency.currency_code === form.currency_code
      ) ?? null
    );
  }, [currencyOptions, form.currency_code]);

  const identifierLabel = useMemo(() => {
    return form.account_identifier_type === "iban" ? "IBAN Value" : "SWIFT Value";
  }, [form.account_identifier_type]);

  const isPageLoading =
    isLoadingProfile || isLoadingVendors || isLoadingCurrencies;

  const headerStatusCards = useMemo<HeaderStatusCardData[]>(() => {
    return [
      {
        label: "Create Access",
        value: isLoadingProfile
          ? "Checking"
          : permissionState.canCreate
            ? "Enabled"
            : "Locked",
        detail:
          "Vendor bank-account create access follows the Finance role template and user-specific exceptions.",
        icon: permissionState.canCreate ? ShieldCheck : LockKeyhole,
        tone: permissionState.canCreate ? "emerald" : "rose",
      },
      {
        label: "Currency Source",
        value: isLoadingCurrencies
          ? "Loading"
          : `${currencyOptions.length} Options`,
        detail:
          "Currency options are pulled from the general finance_currencies master-data table.",
        icon: Banknote,
        tone: "cyan",
      },
    ];
  }, [
    currencyOptions.length,
    isLoadingCurrencies,
    isLoadingProfile,
    permissionState.canCreate,
  ]);

  const summaryItems = useMemo<SummaryItem[]>(() => {
    return [
      {
        label: "Vendor",
        value: getVendorDisplayName(selectedVendor),
        detail: getVendorCodeLabel(selectedVendor, form.vendor_code),
        icon: Building2,
        tone: "cyan",
      },
      {
        label: "Bank",
        value: form.bank_name.trim() || "Bank name required",
        detail: form.beneficiary_name.trim() || "Beneficiary name required",
        icon: Landmark,
        tone: form.bank_name.trim() ? "emerald" : "amber",
      },
      {
        label: "Identifier",
        value: form.account_identifier_type.toUpperCase(),
        detail: form.account_identifier_value.trim() || "No identifier value yet",
        icon: CreditCard,
        tone: "violet",
      },
      {
        label: "Currency",
        value: getCurrencyLabel(currencyOptions, form.currency_code),
        detail: form.is_default
          ? "Default vendor payout account enabled"
          : "Standard vendor payout account",
        icon: Banknote,
        tone: form.currency_code ? "emerald" : "rose",
      },
    ];
  }, [currencyOptions, form, selectedVendor]);

  function updateForm<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((previousForm) => ({
      ...previousForm,
      [key]: value,
    }));
  }

  function handleVendorChange(vendorId: string) {
    const vendor = vendors.find((item) => item.id === vendorId) ?? null;

    setForm((previousForm) => ({
      ...previousForm,
      vendor_id: vendorId,
      vendor_code: vendor?.code ?? "",
      beneficiary_name:
        vendor?.legal_name?.trim() ||
        vendor?.name ||
        previousForm.beneficiary_name,
    }));
  }

  function handleReset() {
    setForm(EMPTY_FORM);
    setFormError(null);
    setFormMessage(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!permissionState.canCreate) {
      setFormError("Create access is not enabled for this user.");
      return;
    }

    if (!form.vendor_id) {
      setFormError("Vendor is required.");
      return;
    }

    if (!form.beneficiary_name.trim()) {
      setFormError("Beneficiary name is required.");
      return;
    }

    if (!form.bank_name.trim()) {
      setFormError("Bank name is required.");
      return;
    }

    if (!form.currency_code.trim()) {
      setFormError("Currency is required and must come from currency master data.");
      return;
    }

    const currencyExists = currencyOptions.some(
      (currency) => currency.currency_code === form.currency_code.trim()
    );

    if (!currencyExists) {
      setFormError("Selected currency does not exist in active currency master data.");
      return;
    }

    try {
      setIsSaving(true);
      setFormError(null);
      setFormMessage(null);

      const created = await createVendorBankAccount({
        vendor_id: form.vendor_id,
        beneficiary_name: form.beneficiary_name.trim() || null,
        bank_name: form.bank_name.trim() || null,
        country: form.country.trim() || null,
        city: form.city.trim() || null,
        postal_code: form.postal_code.trim() || null,
        address_line_1: form.address_line_1.trim() || null,
        address_line_2: form.address_line_2.trim() || null,
        account_number: form.account_number.trim() || null,
        account_identifier_type: form.account_identifier_type,
        account_identifier_value: form.account_identifier_value.trim() || null,
        currency_code: form.currency_code.trim(),
        is_default: form.is_default,
        status: form.status,
        notes: form.notes.trim() || null,
      });

      setFormMessage(
        "Vendor bank account created. Opening the new vendor bank-account record."
      );
      navigate(`/finance/master-data/vendor-bank-accounts/${created.id}`);
    } catch (error) {
      console.error("Failed to create vendor bank account:", error);
      setFormError(
        error instanceof Error
          ? error.message
          : "Failed to create vendor bank account."
      );
    } finally {
      setIsSaving(false);
    }
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
                New Vendor Bank Account
              </div>

              <h1 className="mt-4 text-3xl font-semibold tracking-[-0.035em] text-white md:text-5xl">
                Create Vendor Bank Account
              </h1>

              <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-400 md:text-base md:leading-7">
                Create a vendor payout bank-account record from vendor-provided
                payment details. Currency is selected from the general currency
                master data and saved directly on the vendor bank-account record.
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-200">
                  Vendor payout account
                </span>
                <span className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-200">
                  Currency master data
                </span>
                <span className="rounded-full border border-slate-400/20 bg-slate-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-300">
                  Opens ID page after create
                </span>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {headerStatusCards.map((item) => (
                <HeaderStatusCard key={item.label} item={item} />
              ))}
            </div>
          </div>
        </header>

        {formError ? (
          <div className="rounded-[24px] border border-rose-400/20 bg-rose-500/10 p-4 text-sm leading-6 text-rose-100">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>{formError}</div>
            </div>
          </div>
        ) : null}

        {formMessage ? (
          <div className="rounded-[24px] border border-emerald-400/20 bg-emerald-500/10 p-4 text-sm leading-6 text-emerald-100">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <div>{formMessage}</div>
            </div>
          </div>
        ) : null}

        {isPageLoading ? (
          <section className="rounded-[30px] border border-white/10 bg-white/[0.045] p-10 text-center backdrop-blur-xl">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-cyan-200" />
            <div className="mt-4 text-sm font-semibold text-white">
              Loading create page
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Vendor options, currency master data, and permission state are being
              checked.
            </p>
          </section>
        ) : !permissionState.canCreate ? (
          <EmptyLockedState />
        ) : (
          <form
            id="vendor-bank-account-create-form"
            onSubmit={handleSubmit}
            className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_420px]"
          >
            <div className="grid gap-6">
              <FormSection
                title="Vendor Link"
                description="Select the vendor and pull linked finance identity."
                icon={Building2}
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <FieldLabel label="Vendor" required />
                    <SelectField
                      value={form.vendor_id}
                      onChange={handleVendorChange}
                      disabled={isSaving}
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

                  <ReadOnlyBlock
                    label="Vendor Code"
                    value={getVendorCodeLabel(selectedVendor, form.vendor_code)}
                    detail="Pulled from the selected vendor."
                  />

                  <ReadOnlyBlock
                    label="Currency Source"
                    value="General currency master data"
                    detail="Vendor bank-account currency is selected below and saved on this record."
                  />

                  <div className="md:col-span-2">
                    <FieldLabel label="Beneficiary Name" required />
                    <InputField
                      value={form.beneficiary_name}
                      disabled={isSaving}
                      onChange={(event) =>
                        updateForm("beneficiary_name", event.target.value)
                      }
                      placeholder="Legal beneficiary name"
                    />
                  </div>
                </div>
              </FormSection>

              <FormSection
                title="Bank Identity"
                description="Bank name and main account number."
                icon={Landmark}
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <FieldLabel label="Bank Name" required />
                    <InputField
                      value={form.bank_name}
                      disabled={isSaving}
                      onChange={(event) =>
                        updateForm("bank_name", event.target.value)
                      }
                      placeholder="Bank name"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <FieldLabel label="Account Number" />
                    <InputField
                      value={form.account_number}
                      disabled={isSaving}
                      onChange={(event) =>
                        updateForm("account_number", event.target.value)
                      }
                      placeholder="Account number or masked account number"
                    />
                  </div>
                </div>
              </FormSection>

                            <FormSection
                title="Bank Address"
                description="Bank address details used for records and payment instructions."
                icon={WalletCards}
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <FieldLabel label="Country" />
                    <InputField
                      value={form.country}
                      disabled={isSaving}
                      onChange={(event) =>
                        updateForm("country", event.target.value)
                      }
                      placeholder="Country"
                    />
                  </div>

                  <div>
                    <FieldLabel label="City" />
                    <InputField
                      value={form.city}
                      disabled={isSaving}
                      onChange={(event) => updateForm("city", event.target.value)}
                      placeholder="City"
                    />
                  </div>

                  <div>
                    <FieldLabel label="ZIP / Postal Code" />
                    <InputField
                      value={form.postal_code}
                      disabled={isSaving}
                      onChange={(event) =>
                        updateForm("postal_code", event.target.value)
                      }
                      placeholder="Postal code"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <FieldLabel label="Address Line 1" />
                    <InputField
                      value={form.address_line_1}
                      disabled={isSaving}
                      onChange={(event) =>
                        updateForm("address_line_1", event.target.value)
                      }
                      placeholder="Address line 1"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <FieldLabel label="Address Line 2" />
                    <InputField
                      value={form.address_line_2}
                      disabled={isSaving}
                      onChange={(event) =>
                        updateForm("address_line_2", event.target.value)
                      }
                      placeholder="Address line 2"
                    />
                  </div>
                </div>
              </FormSection>

              <FormSection
                title="Identifier / Currency / Control"
                description="Identifier type, active currency master-data selection, default flag, and lifecycle."
                icon={CreditCard}
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <FieldLabel label="Identifier Type" />
                    <SelectField
                      value={form.account_identifier_type}
                      disabled={isSaving}
                      onChange={(value) =>
                        updateForm(
                          "account_identifier_type",
                          normalizeIdentifierType(value)
                        )
                      }
                    >
                      <option value="swift" className="bg-[#05070d]">
                        SWIFT
                      </option>
                      <option value="iban" className="bg-[#05070d]">
                        IBAN
                      </option>
                    </SelectField>
                  </div>

                  <div>
                    <FieldLabel label={identifierLabel} />
                    <InputField
                      value={form.account_identifier_value}
                      disabled={isSaving}
                      onChange={(event) =>
                        updateForm(
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
                      value={form.currency_code}
                      disabled={isSaving}
                      onChange={(value) => updateForm("currency_code", value)}
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
                      value={form.status}
                      disabled={isSaving}
                      onChange={(value) =>
                        updateForm("status", normalizeStatus(value))
                      }
                    >
                      <option value="active" className="bg-[#05070d]">
                        Active
                      </option>
                      <option value="inactive" className="bg-[#05070d]">
                        Inactive
                      </option>
                    </SelectField>
                  </div>

                  <div className="md:col-span-2">
                    <label className="flex items-start gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-300">
                      <input
                        type="checkbox"
                        checked={form.is_default}
                        disabled={isSaving}
                        onChange={(event) =>
                          updateForm("is_default", event.target.checked)
                        }
                        className="mt-1"
                      />
                      <span>
                        <span className="block font-semibold text-white">
                          Set as default payout bank account for this vendor
                        </span>
                        <span className="mt-1 block text-xs leading-5 text-slate-500">
                          This marks the selected vendor bank account as the preferred
                          payout account for vendor payment workflows.
                        </span>
                      </span>
                    </label>
                  </div>

                  <div className="md:col-span-2">
                    <ReadOnlyBlock
                      label="Selected Currency"
                      value={
                        selectedCurrency
                          ? getCurrencyOptionLabel(selectedCurrency)
                          : "No currency selected"
                      }
                      detail="The value is saved on this vendor bank-account record. The currency list itself comes from general finance_currencies master data."
                    />
                  </div>
                </div>
              </FormSection>

              <FormSection
                title="Notes"
                description="Internal notes for finance operators."
                icon={FileText}
              >
                <TextareaField
                  value={form.notes}
                  disabled={isSaving}
                  onChange={(event) => updateForm("notes", event.target.value)}
                  placeholder="Notes..."
                />
              </FormSection>
            </div>

            <aside className="grid gap-6">
              <section className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
                <div className="border-b border-white/10 px-5 py-4">
                  <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Create Summary
                  </div>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Review the vendor payout account before creating it.
                  </p>
                </div>

                <div className="grid gap-4 p-5">
                  {summaryItems.map((item) => (
                    <SummaryCard key={item.label} item={item} />
                  ))}
                </div>
              </section>

              <section className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
                <div className="border-b border-white/10 px-5 py-4">
                  <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Actions
                  </div>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Create opens the new vendor bank-account ID page directly.
                  </p>
                </div>

                <div className="grid gap-3 p-5">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-cyan-400/20 bg-cyan-500 px-5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSaving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    {isSaving
                      ? "Creating..."
                      : "Create Vendor Bank Account"}
                  </button>

                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={handleReset}
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] px-5 text-sm font-semibold text-slate-300 transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Reset Form
                  </button>
                </div>
              </section>

              <section className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
                <div className="border-b border-white/10 px-5 py-4">
                  <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Source Preview
                  </div>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Current selected vendor and currency source.
                  </p>
                </div>

                <div className="grid gap-3 p-5">
                  <ReadOnlyBlock
                    label="Selected Vendor"
                    value={getVendorDisplayName(selectedVendor)}
                    detail={getVendorCodeLabel(selectedVendor, form.vendor_code)}
                  />

                  <ReadOnlyBlock
                    label="Beneficiary"
                    value={form.beneficiary_name || "—"}
                    detail="Normally based on the vendor legal name, but editable."
                  />

                  <ReadOnlyBlock
                    label="Currency Master Data"
                    value={`${currencyOptions.length} active option${
                      currencyOptions.length === 1 ? "" : "s"
                    }`}
                    detail="The dropdown is loaded from finance_currencies, not hardcoded."
                  />

                  <ReadOnlyBlock
                    label="Selected Currency"
                    value={getCurrencyLabel(currencyOptions, form.currency_code)}
                    detail="Saved directly to vendor_bank_accounts.currency_code."
                  />
                </div>
              </section>

              <section className="rounded-[24px] border border-cyan-400/20 bg-cyan-500/10 p-4 text-sm leading-6 text-cyan-100">
                <div className="font-semibold text-white">Locked create rule</div>
                <div className="mt-1">
                  This page requires Vendor Bank Account create access, Vendor
                  management access, or Master Data admin access. New records can be
                  created as Active or Inactive only. Archived records are managed
                  from the Vendor Bank Accounts archive modal. Currency must come
                  from the general finance_currencies master-data table and is saved
                  on this vendor bank-account record.
                </div>
              </section>
            </aside>
          </form>
        )}
      </div>
    </div>
  );
}
