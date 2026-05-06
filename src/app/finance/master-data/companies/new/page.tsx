import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  FormEvent,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { useNavigate } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CheckCircle2,
  FileText,
  Globe,
  Landmark,
  Loader2,
  LockKeyhole,
  MapPin,
  Plus,
  RotateCcw,
  Save,
  ShieldCheck,
  Sparkles,
  Trash2,
  Truck,
  Users,
} from "lucide-react";

import { createCompany } from "@/lib/finance/companies";
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

type CompanyCreateStatus = "active" | "inactive";

type PersonnelRow = {
  id: string;
  name: string;
  position: string;
  phone: string;
  email: string;
};

type AddressRow = {
  id: string;
  country: string;
  city: string;
  state_province: string;
  postal_code: string;
  address_line_1: string;
  address_line_2: string;
};

type ShippingRow = {
  id: string;
  same_as_primary: boolean;
  source_address_id: string;
  country: string;
  city: string;
  state_province: string;
  postal_code: string;
  address_line_1: string;
  address_line_2: string;
};

type FormState = {
  legal_name: string;
  display_name: string;
  contact_person: string;
  email: string;
  phone: string;
  status: CompanyCreateStatus;
  registration_number: string;
  tax_number: string;
  website: string;
  currency_code: string;
  personnel: PersonnelRow[];
  addresses: AddressRow[];
  shipping_addresses: ShippingRow[];
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

type CurrencyOption = {
  id: string;
  currency_code: string;
  currency_name: string;
  currency_symbol: string | null;
  is_base_currency: boolean;
  status: string;
};

const EMPTY_PERMISSION_STATE: PermissionState = {
  canRead: false,
  canCreate: false,
  isAdmin: false,
};

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function createEmptyPersonnelRow(): PersonnelRow {
  return {
    id: makeId(),
    name: "",
    position: "",
    phone: "",
    email: "",
  };
}

function createEmptyAddressRow(): AddressRow {
  return {
    id: makeId(),
    country: "",
    city: "",
    state_province: "",
    postal_code: "",
    address_line_1: "",
    address_line_2: "",
  };
}

function createEmptyShippingRow(): ShippingRow {
  return {
    id: makeId(),
    same_as_primary: false,
    source_address_id: "",
    country: "",
    city: "",
    state_province: "",
    postal_code: "",
    address_line_1: "",
    address_line_2: "",
  };
}

function createEmptyForm(): FormState {
  return {
    legal_name: "",
    display_name: "",
    contact_person: "",
    email: "",
    phone: "",
    status: "active",
    registration_number: "",
    tax_number: "",
    website: "",
    currency_code: "",
    personnel: [createEmptyPersonnelRow()],
    addresses: [createEmptyAddressRow()],
    shipping_addresses: [createEmptyShippingRow()],
    notes: "",
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
      canManageMasterData ||
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
        "Create Company permission RPC fallback:",
        result.error.message
      );
      return null;
    }

    if (!result.data || typeof result.data !== "object") {
      return null;
    }

    return result.data as Partial<Record<Permission, boolean>>;
  } catch (error) {
    console.warn("Create Company permission RPC failed:", error);
    return null;
  }
}

function normalizeStatus(value: string): CompanyCreateStatus {
  return value === "inactive" ? "inactive" : "active";
}

function countFilledPersonnel(rows: PersonnelRow[]) {
  return rows.filter(
    (row) =>
      row.name.trim() ||
      row.position.trim() ||
      row.phone.trim() ||
      row.email.trim()
  ).length;
}

function countFilledAddresses(rows: AddressRow[]) {
  return rows.filter(
    (row) =>
      row.country.trim() ||
      row.city.trim() ||
      row.state_province.trim() ||
      row.postal_code.trim() ||
      row.address_line_1.trim() ||
      row.address_line_2.trim()
  ).length;
}

function countFilledShippingRows(rows: ShippingRow[]) {
  return rows.filter(
    (row) =>
      row.same_as_primary ||
      row.country.trim() ||
      row.city.trim() ||
      row.state_province.trim() ||
      row.postal_code.trim() ||
      row.address_line_1.trim() ||
      row.address_line_2.trim()
  ).length;
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

function FormSection({
  title,
  description,
  icon: Icon,
  actions,
  children,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  actions?: ReactNode;
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

        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>

      <div className="p-5">{children}</div>
    </section>
  );
}

function RowCard({
  title,
  description,
  onRemove,
  removeDisabled = false,
  children,
}: {
  title: string;
  description?: string;
  onRemove?: () => void;
  removeDisabled?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-white">{title}</div>
          {description ? (
            <div className="mt-1 text-xs leading-5 text-slate-500">
              {description}
            </div>
          ) : null}
        </div>

        {onRemove ? (
          <button
            type="button"
            onClick={onRemove}
            disabled={removeDisabled}
            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-3 text-xs font-semibold uppercase tracking-[0.14em] text-rose-100 transition hover:bg-rose-500/15 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Remove
          </button>
        ) : null}
      </div>

      {children}
    </div>
  );
}

function AddRowButton({
  label,
  onClick,
  disabled,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-cyan-400/20 bg-cyan-500/10 px-4 text-xs font-semibold uppercase tracking-[0.14em] text-cyan-100 transition hover:bg-cyan-500/15 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <Plus className="h-3.5 w-3.5" />
      {label}
    </button>
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
          This page requires Company create access or Master Data admin access.
          Ask an Admin to update this user’s Finance role template or user-specific
          exception before creating internal company records.
        </p>
      </div>
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
      {detail ? <div className="mt-1 text-xs leading-5 text-slate-500">{detail}</div> : null}
    </div>
  );
}

export default function FinanceMasterDataCompanyCreatePage() {
  const navigate = useNavigate();

  const [form, setForm] = useState<FormState>(() => createEmptyForm());
  const [profile, setProfile] = useState<ProfilePermissionRow | null>(null);
  const [effectivePermissions, setEffectivePermissions] =
    useState<Record<Permission, boolean> | null>(null);
  const [currencyOptions, setCurrencyOptions] = useState<CurrencyOption[]>([]);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
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
        console.error("Failed to load create company permissions:", error);

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

  const loadCurrencyOptions = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("finance_currencies")
        .select(
          `
            id,
            currency_code,
            currency_name,
            currency_symbol,
            is_base_currency,
            status
          `
        )
        .eq("status", "active")
        .order("is_base_currency", { ascending: false })
        .order("currency_code", { ascending: true });

      if (error) throw error;

      const loadedCurrencies = (data ?? []) as CurrencyOption[];
      setCurrencyOptions(loadedCurrencies);

      setForm((previousForm) => {
        if (previousForm.currency_code) return previousForm;

        const baseCurrency =
          loadedCurrencies.find((currency) => currency.is_base_currency) ||
          loadedCurrencies[0];

        if (!baseCurrency) return previousForm;

        return {
          ...previousForm,
          currency_code: baseCurrency.currency_code,
        };
      });
    } catch (error) {
      console.error("Failed to load currency master data:", error);
      setCurrencyOptions([]);
    }
  }, []);

  useEffect(() => {
    void Promise.all([
      loadCurrentProfile("initial"),
      loadCurrencyOptions(),
    ]);
  }, [loadCurrencyOptions, loadCurrentProfile]);

  useEffect(() => {
    const channel = supabase
      .channel("finance-master-data-company-create-page")
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
        { event: "*", schema: "public", table: "finance_currencies" },
        () => void loadCurrencyOptions()
      )
      .subscribe();

    const intervalId = window.setInterval(() => {
      void Promise.all([
        loadCurrentProfile("silent"),
        loadCurrencyOptions(),
      ]);
    }, 60000);

    return () => {
      window.clearInterval(intervalId);
      supabase.removeChannel(channel);
    };
  }, [loadCurrencyOptions, loadCurrentProfile]);

  const permissionState = useMemo(() => {
    return buildPermissionState(profile, effectivePermissions);
  }, [effectivePermissions, profile]);

  const addressOptions = useMemo(() => {
    return form.addresses.map((address, index) => ({
      id: address.id,
      label:
        address.address_line_1.trim() ||
        address.city.trim() ||
        address.country.trim() ||
        `Address ${index + 1}`,
      value: address,
    }));
  }, [form.addresses]);

  const currencySelectOptions = useMemo(() => {
    return currencyOptions;
  }, [currencyOptions]);

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
          "Company create access follows the Finance role template and user-specific exceptions.",
        icon: permissionState.canCreate ? ShieldCheck : LockKeyhole,
        tone: permissionState.canCreate ? "emerald" : "rose",
      },
      {
        label: "Save Result",
        value: "ID Page",
        detail:
          "After successful creation, the new company detail page opens directly.",
        icon: Landmark,
        tone: "cyan",
      },
    ];
  }, [isLoadingProfile, permissionState.canCreate]);

  const summaryItems = useMemo<SummaryItem[]>(() => {
    const filledPersonnel = countFilledPersonnel(form.personnel);
    const filledAddresses = countFilledAddresses(form.addresses);
    const filledShipping = countFilledShippingRows(form.shipping_addresses);

    return [
      {
        label: "Legal Name",
        value: form.legal_name.trim() || "Required",
        detail: form.display_name.trim() || "No display name yet",
        icon: Building2,
        tone: form.legal_name.trim() ? "emerald" : "amber",
      },
      {
        label: "Currency",
        value: form.currency_code || "—",
        detail: "Default currency for this internal company record.",
        icon: Globe,
        tone: "cyan",
      },
      {
        label: "Personnel",
        value: `${filledPersonnel} Filled`,
        detail: `${form.personnel.length} row${form.personnel.length === 1 ? "" : "s"} available`,
        icon: Users,
        tone: filledPersonnel > 0 ? "violet" : "amber",
      },
      {
        label: "Addresses",
        value: `${filledAddresses} Filled`,
        detail: `${filledShipping} shipping row${filledShipping === 1 ? "" : "s"} ready`,
        icon: MapPin,
        tone: filledAddresses > 0 ? "emerald" : "rose",
      },
    ];
  }, [form]);

  function updateForm<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((previousForm) => ({
      ...previousForm,
      [key]: value,
    }));
  }

  function updatePersonnelRow(
    rowId: string,
    key: keyof PersonnelRow,
    value: string
  ) {
    setForm((previousForm) => ({
      ...previousForm,
      personnel: previousForm.personnel.map((row) =>
        row.id === rowId ? { ...row, [key]: value } : row
      ),
    }));
  }

  function addPersonnelRow() {
    setForm((previousForm) => ({
      ...previousForm,
      personnel: [...previousForm.personnel, createEmptyPersonnelRow()],
    }));
  }

  function removePersonnelRow(rowId: string) {
    setForm((previousForm) => ({
      ...previousForm,
      personnel:
        previousForm.personnel.length > 1
          ? previousForm.personnel.filter((row) => row.id !== rowId)
          : previousForm.personnel,
    }));
  }

  function updateAddressRow(
    rowId: string,
    key: keyof AddressRow,
    value: string
  ) {
    setForm((previousForm) => {
      const nextAddresses = previousForm.addresses.map((row) =>
        row.id === rowId ? { ...row, [key]: value } : row
      );

      const nextShipping = previousForm.shipping_addresses.map((shipping) => {
        if (!shipping.same_as_primary || shipping.source_address_id !== rowId) {
          return shipping;
        }

        const source = nextAddresses.find((address) => address.id === rowId);
        if (!source) return shipping;

        return {
          ...shipping,
          country: source.country,
          city: source.city,
          state_province: source.state_province,
          postal_code: source.postal_code,
          address_line_1: source.address_line_1,
          address_line_2: source.address_line_2,
        };
      });

      return {
        ...previousForm,
        addresses: nextAddresses,
        shipping_addresses: nextShipping,
      };
    });
  }

  function addAddressRow() {
    setForm((previousForm) => ({
      ...previousForm,
      addresses: [...previousForm.addresses, createEmptyAddressRow()],
    }));
  }

  function removeAddressRow(rowId: string) {
    setForm((previousForm) => {
      if (previousForm.addresses.length <= 1) return previousForm;

      const nextAddresses = previousForm.addresses.filter((row) => row.id !== rowId);

      const nextShipping = previousForm.shipping_addresses.map((shipping) => {
        if (shipping.source_address_id !== rowId) return shipping;

        return {
          ...shipping,
          same_as_primary: false,
          source_address_id: "",
          country: "",
          city: "",
          state_province: "",
          postal_code: "",
          address_line_1: "",
          address_line_2: "",
        };
      });

      return {
        ...previousForm,
        addresses: nextAddresses,
        shipping_addresses: nextShipping,
      };
    });
  }

  function updateShippingRow(
    rowId: string,
    key: keyof ShippingRow,
    value: string | boolean
  ) {
    setForm((previousForm) => {
      const nextShipping = previousForm.shipping_addresses.map((row) => {
        if (row.id !== rowId) return row;

        if (key === "same_as_primary") {
          const nextSame = Boolean(value);

          if (!nextSame) {
            return {
              ...row,
              same_as_primary: false,
              source_address_id: "",
              country: "",
              city: "",
              state_province: "",
              postal_code: "",
              address_line_1: "",
              address_line_2: "",
            };
          }

          const source = previousForm.addresses.find(
            (address) => address.id === row.source_address_id
          );

          return {
            ...row,
            same_as_primary: true,
            country: source?.country ?? "",
            city: source?.city ?? "",
            state_province: source?.state_province ?? "",
            postal_code: source?.postal_code ?? "",
            address_line_1: source?.address_line_1 ?? "",
            address_line_2: source?.address_line_2 ?? "",
          };
        }

        if (key === "source_address_id") {
          const sourceAddressId = String(value);
          const source = previousForm.addresses.find(
            (address) => address.id === sourceAddressId
          );

          return {
            ...row,
            source_address_id: sourceAddressId,
            same_as_primary: true,
            country: source?.country ?? "",
            city: source?.city ?? "",
            state_province: source?.state_province ?? "",
            postal_code: source?.postal_code ?? "",
            address_line_1: source?.address_line_1 ?? "",
            address_line_2: source?.address_line_2 ?? "",
          };
        }

        return {
          ...row,
          [key]: value,
        };
      });

      return {
        ...previousForm,
        shipping_addresses: nextShipping,
      };
    });
  }

  function addShippingRow() {
    setForm((previousForm) => ({
      ...previousForm,
      shipping_addresses: [
        ...previousForm.shipping_addresses,
        createEmptyShippingRow(),
      ],
    }));
  }

  function removeShippingRow(rowId: string) {
    setForm((previousForm) => ({
      ...previousForm,
      shipping_addresses:
        previousForm.shipping_addresses.length > 1
          ? previousForm.shipping_addresses.filter((row) => row.id !== rowId)
          : previousForm.shipping_addresses,
    }));
  }

  function handleReset() {
    setForm(createEmptyForm());
    setFormError(null);
    setFormMessage(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!permissionState.canCreate) {
      setFormError("Create access is not enabled for this user.");
      return;
    }

    const trimmedLegalName = form.legal_name.trim();

    if (!trimmedLegalName) {
      setFormError("Legal name is required.");
      return;
    }

    try {
      setIsSaving(true);
      setFormError(null);
      setFormMessage(null);

      const created = await createCompany({
        legal_name: trimmedLegalName,
        name: form.display_name.trim() || null,
        contact_person: form.contact_person.trim() || null,
        status: form.status,
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        registration_number: form.registration_number.trim() || null,
        tax_number: form.tax_number.trim() || null,
        website: form.website.trim() || null,
        currency_code: form.currency_code || null,
        country: form.addresses[0]?.country.trim() || null,
        city: form.addresses[0]?.city.trim() || null,
        state_province: form.addresses[0]?.state_province.trim() || null,
        postal_code: form.addresses[0]?.postal_code.trim() || null,
        address_line_1: form.addresses[0]?.address_line_1.trim() || null,
        address_line_2: form.addresses[0]?.address_line_2.trim() || null,
        notes: form.notes.trim() || null,
        metadata: {
          personnel: form.personnel.map((row, index) => ({
            full_name: row.name.trim() || null,
            position: row.position.trim() || null,
            phone: row.phone.trim() || null,
            email: row.email.trim() || null,
            sort_order: index,
            is_primary: index === 0,
          })),
          addresses: form.addresses.map((row, index) => ({
            address_type: "primary",
            country: row.country.trim() || null,
            city: row.city.trim() || null,
            state_province: row.state_province.trim() || null,
            postal_code: row.postal_code.trim() || null,
            address_line_1: row.address_line_1.trim() || null,
            address_line_2: row.address_line_2.trim() || null,
            sort_order: index,
            is_primary: index === 0,
          })),
          shipping_addresses: form.shipping_addresses.map((row, index) => ({
            address_type: "shipping",
            same_as_primary: row.same_as_primary,
            source_address_id: row.source_address_id || null,
            country: row.country.trim() || null,
            city: row.city.trim() || null,
            state_province: row.state_province.trim() || null,
            postal_code: row.postal_code.trim() || null,
            address_line_1: row.address_line_1.trim() || null,
            address_line_2: row.address_line_2.trim() || null,
            sort_order: index,
            is_primary: index === 0,
          })),
        },
      });

      const personnelPayload = form.personnel
        .map((row, index) => ({
          company_id: created.id,
          full_name: row.name.trim() || null,
          position: row.position.trim() || null,
          phone: row.phone.trim() || null,
          email: row.email.trim() || null,
          sort_order: index,
          is_primary: index === 0,
          status: "active",
        }))
        .filter(
          (row) => row.full_name || row.position || row.phone || row.email
        );

      if (personnelPayload.length > 0) {
        const { error } = await supabase
          .from("finance_company_personnel")
          .insert(personnelPayload);

        if (error) throw error;
      }

      const addressPayload = form.addresses
        .map((row, index) => ({
          company_id: created.id,
          address_type: "primary" as const,
          country: row.country.trim() || null,
          city: row.city.trim() || null,
          state_province: row.state_province.trim() || null,
          postal_code: row.postal_code.trim() || null,
          address_line_1: row.address_line_1.trim() || null,
          address_line_2: row.address_line_2.trim() || null,
          sort_order: index,
          is_primary: index === 0,
          is_same_as_primary: false,
          status: "active",
        }))
        .filter(
          (row) =>
            row.country ||
            row.city ||
            row.state_province ||
            row.postal_code ||
            row.address_line_1 ||
            row.address_line_2
        );

      if (addressPayload.length > 0) {
        const { error } = await supabase
          .from("finance_company_addresses")
          .insert(addressPayload);

        if (error) throw error;
      }

      const shippingPayload = form.shipping_addresses
        .map((row, index) => ({
          company_id: created.id,
          address_type: "shipping" as const,
          country: row.same_as_primary ? null : row.country.trim() || null,
          city: row.same_as_primary ? null : row.city.trim() || null,
          state_province: row.same_as_primary
            ? null
            : row.state_province.trim() || null,
          postal_code: row.same_as_primary
            ? null
            : row.postal_code.trim() || null,
          address_line_1: row.same_as_primary
            ? null
            : row.address_line_1.trim() || null,
          address_line_2: row.same_as_primary
            ? null
            : row.address_line_2.trim() || null,
          sort_order: index,
          is_primary: index === 0,
          is_same_as_primary: row.same_as_primary,
          status: "active",
        }))
        .filter(
          (row) =>
            row.is_same_as_primary ||
            row.country ||
            row.city ||
            row.state_province ||
            row.postal_code ||
            row.address_line_1 ||
            row.address_line_2
        );

      if (shippingPayload.length > 0) {
        const { error } = await supabase
          .from("finance_company_addresses")
          .insert(shippingPayload);

        if (error) throw error;
      }

      setFormMessage("Company created. Opening the new company record.");
      navigate(`/finance/master-data/companies/${created.id}`);
    } catch (error) {
      console.error("Failed to create finance company:", error);
      setFormError(
        error instanceof Error ? error.message : "Failed to create company."
      );
    } finally {
      setIsSaving(false);
    }
  }

  const isPageLoading = isLoadingProfile;

  return (
    <div className="min-h-screen bg-[#05070d] px-4 py-4 text-white md:px-6 md:py-6">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
        <header className="relative overflow-hidden rounded-[34px] border border-white/10 bg-white/[0.045] p-6 shadow-2xl shadow-black/30 backdrop-blur-xl">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(6,182,212,0.16),transparent_38%),radial-gradient(circle_at_top_right,rgba(139,92,246,0.12),transparent_34%)]" />

          <div className="relative grid gap-6 xl:grid-cols-[minmax(0,1fr)_520px] xl:items-end">
            <div>
              <button
                type="button"
                onClick={() => navigate("/finance/master-data/companies")}
                className="mb-5 inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-300 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
              >
                <ArrowRight className="h-3.5 w-3.5 rotate-180" />
                Companies
              </button>

              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-200">
                <Sparkles className="h-3.5 w-3.5" />
                New Internal Company
              </div>

              <h1 className="mt-4 text-3xl font-semibold tracking-[-0.035em] text-white md:text-5xl">
                Create Company
              </h1>

              <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-400 md:text-base md:leading-7">
                Create an internal finance company with legal identity, default
                currency, registration details, personnel, primary addresses,
                shipping addresses, and internal notes.
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-200">
                  Internal company
                </span>
                <span className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-200">
                  Permission protected
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
              Permission state is being checked.
            </p>
          </section>
        ) : !permissionState.canCreate ? (
          <EmptyLockedState />
        ) : (
          <form
            id="company-create-form"
            onSubmit={handleSubmit}
            className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_420px]"
          >
            <div className="grid gap-6">
              <FormSection
                title="Basic Company Identity"
                description="Legal name, display name, contact details, and lifecycle."
                icon={Building2}
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <FieldLabel label="Legal Name" required />
                    <InputField
                      value={form.legal_name}
                      disabled={isSaving}
                      onChange={(event) =>
                        updateForm("legal_name", event.target.value)
                      }
                      placeholder="Legal company name"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <FieldLabel label="Display Name" />
                    <InputField
                      value={form.display_name}
                      disabled={isSaving}
                      onChange={(event) =>
                        updateForm("display_name", event.target.value)
                      }
                      placeholder="Optional short display name"
                    />
                  </div>

                  <div>
                    <FieldLabel label="Contact Person" />
                    <InputField
                      value={form.contact_person}
                      disabled={isSaving}
                      onChange={(event) =>
                        updateForm("contact_person", event.target.value)
                      }
                      placeholder="Primary contact"
                    />
                  </div>

                  <div>
                    <FieldLabel label="Email" />
                    <InputField
                      type="email"
                      value={form.email}
                      disabled={isSaving}
                      onChange={(event) => updateForm("email", event.target.value)}
                      placeholder="company@email.com"
                    />
                  </div>

                  <div>
                    <FieldLabel label="Phone" />
                    <InputField
                      value={form.phone}
                      disabled={isSaving}
                      onChange={(event) => updateForm("phone", event.target.value)}
                      placeholder="Company phone"
                    />
                  </div>

                  <div>
                    <FieldLabel label="Status" />
                    <SelectField
                      value={form.status}
                      disabled={isSaving}
                      onChange={(event) =>
                        updateForm("status", normalizeStatus(event.target.value))
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
                </div>
              </FormSection>

              <FormSection
                title="Company Identity"
                description="Default currency and legal registration fields."
                icon={Landmark}
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <FieldLabel label="Company Code" />
                    <ReadOnlyBlock
                      label="Company Code"
                      value="Auto-generated after company creation"
                      detail="Assigned by backend/company sequence."
                    />
                  </div>

                  <div>
                    <FieldLabel label="Currency Code" />
                    <SelectField
                      value={form.currency_code}
                      disabled={isSaving}
                      onChange={(event) =>
                        updateForm("currency_code", event.target.value)
                      }
                    >
                      {currencySelectOptions.length === 0 ? (
                        <option value="" className="bg-[#05070d]">
                          No active currencies available
                        </option>
                      ) : (
                        currencySelectOptions.map((currency) => (
                          <option
                            key={currency.id}
                            value={currency.currency_code}
                            className="bg-[#05070d]"
                          >
                            {currency.currency_code} — {currency.currency_name}
                            {currency.currency_symbol ? ` (${currency.currency_symbol})` : ""}
                            {currency.is_base_currency ? " • Base" : ""}
                          </option>
                        ))
                      )}
                    </SelectField>
                  </div>

                  <div>
                    <FieldLabel label="Registration Number" />
                    <InputField
                      value={form.registration_number}
                      disabled={isSaving}
                      onChange={(event) =>
                        updateForm("registration_number", event.target.value)
                      }
                      placeholder="Registration number"
                    />
                  </div>

                  <div>
                    <FieldLabel label="Tax Number" />
                    <InputField
                      value={form.tax_number}
                      disabled={isSaving}
                      onChange={(event) =>
                        updateForm("tax_number", event.target.value)
                      }
                      placeholder="Tax number"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <FieldLabel label="Website" />
                    <InputField
                      value={form.website}
                      disabled={isSaving}
                      onChange={(event) =>
                        updateForm("website", event.target.value)
                      }
                      placeholder="https://example.com"
                    />
                  </div>
                </div>
              </FormSection>

              <FormSection
                title="Personnel"
                description="People related to this company. Rows with empty values are ignored during save."
                icon={Users}
                actions={
                  <AddRowButton
                    label="Add Person"
                    onClick={addPersonnelRow}
                    disabled={isSaving}
                  />
                }
              >
                <div className="max-h-[720px] space-y-4 overflow-y-auto pr-1">
                  {form.personnel.map((row, index) => (
                    <RowCard
                      key={row.id}
                      title={`Person ${index + 1}`}
                      description={index === 0 ? "Primary personnel row." : undefined}
                      onRemove={() => removePersonnelRow(row.id)}
                      removeDisabled={isSaving || form.personnel.length === 1}
                    >
                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <FieldLabel label="Name" />
                          <InputField
                            value={row.name}
                            disabled={isSaving}
                            onChange={(event) =>
                              updatePersonnelRow(row.id, "name", event.target.value)
                            }
                            placeholder="Person name"
                          />
                        </div>

                        <div>
                          <FieldLabel label="Position" />
                          <InputField
                            value={row.position}
                            disabled={isSaving}
                            onChange={(event) =>
                              updatePersonnelRow(
                                row.id,
                                "position",
                                event.target.value
                              )
                            }
                            placeholder="Position"
                          />
                        </div>

                        <div>
                          <FieldLabel label="Phone" />
                          <InputField
                            value={row.phone}
                            disabled={isSaving}
                            onChange={(event) =>
                              updatePersonnelRow(row.id, "phone", event.target.value)
                            }
                            placeholder="Phone"
                          />
                        </div>

                        <div>
                          <FieldLabel label="Email" />
                          <InputField
                            type="email"
                            value={row.email}
                            disabled={isSaving}
                            onChange={(event) =>
                              updatePersonnelRow(row.id, "email", event.target.value)
                            }
                            placeholder="Email"
                          />
                        </div>
                      </div>
                    </RowCard>
                  ))}
                </div>
              </FormSection>

                          <FormSection
                title="Primary Addresses"
                description="Primary legal and billing addresses. Rows with empty values are ignored during save."
                icon={MapPin}
                actions={
                  <AddRowButton
                    label="Add Address"
                    onClick={addAddressRow}
                    disabled={isSaving}
                  />
                }
              >
                <div className="max-h-[720px] space-y-4 overflow-y-auto pr-1">
                  {form.addresses.map((row, index) => (
                    <RowCard
                      key={row.id}
                      title={`Address ${index + 1}`}
                      description={index === 0 ? "Primary address row." : undefined}
                      onRemove={() => removeAddressRow(row.id)}
                      removeDisabled={isSaving || form.addresses.length === 1}
                    >
                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <FieldLabel label="Country" />
                          <InputField
                            value={row.country}
                            disabled={isSaving}
                            onChange={(event) =>
                              updateAddressRow(row.id, "country", event.target.value)
                            }
                            placeholder="Country"
                          />
                        </div>

                        <div>
                          <FieldLabel label="City" />
                          <InputField
                            value={row.city}
                            disabled={isSaving}
                            onChange={(event) =>
                              updateAddressRow(row.id, "city", event.target.value)
                            }
                            placeholder="City"
                          />
                        </div>

                        <div>
                          <FieldLabel label="State / Province" />
                          <InputField
                            value={row.state_province}
                            disabled={isSaving}
                            onChange={(event) =>
                              updateAddressRow(
                                row.id,
                                "state_province",
                                event.target.value
                              )
                            }
                            placeholder="State / Province"
                          />
                        </div>

                        <div>
                          <FieldLabel label="ZIP / Postal Code" />
                          <InputField
                            value={row.postal_code}
                            disabled={isSaving}
                            onChange={(event) =>
                              updateAddressRow(
                                row.id,
                                "postal_code",
                                event.target.value
                              )
                            }
                            placeholder="Postal code"
                          />
                        </div>

                        <div className="md:col-span-2">
                          <FieldLabel label="Address Line 1" />
                          <InputField
                            value={row.address_line_1}
                            disabled={isSaving}
                            onChange={(event) =>
                              updateAddressRow(
                                row.id,
                                "address_line_1",
                                event.target.value
                              )
                            }
                            placeholder="Address line 1"
                          />
                        </div>

                        <div className="md:col-span-2">
                          <FieldLabel label="Address Line 2" />
                          <InputField
                            value={row.address_line_2}
                            disabled={isSaving}
                            onChange={(event) =>
                              updateAddressRow(
                                row.id,
                                "address_line_2",
                                event.target.value
                              )
                            }
                            placeholder="Address line 2"
                          />
                        </div>
                      </div>
                    </RowCard>
                  ))}
                </div>
              </FormSection>

              <FormSection
                title="Shipping Addresses"
                description="Shipping addresses can be standalone or copied from primary addresses."
                icon={Truck}
                actions={
                  <AddRowButton
                    label="Add Shipping"
                    onClick={addShippingRow}
                    disabled={isSaving}
                  />
                }
              >
                <div className="max-h-[720px] space-y-4 overflow-y-auto pr-1">
                  {form.shipping_addresses.map((row, index) => (
                    <RowCard
                      key={row.id}
                      title={`Shipping ${index + 1}`}
                      description={
                        row.same_as_primary
                          ? "Linked to a primary address."
                          : "Standalone shipping address."
                      }
                      onRemove={() => removeShippingRow(row.id)}
                      removeDisabled={isSaving || form.shipping_addresses.length === 1}
                    >
                      <div className="space-y-4">
                        <label className="flex items-start gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-300">
                          <input
                            type="checkbox"
                            checked={row.same_as_primary}
                            disabled={isSaving}
                            onChange={(event) =>
                              updateShippingRow(
                                row.id,
                                "same_as_primary",
                                event.target.checked
                              )
                            }
                            className="mt-1"
                          />
                          <span>
                            <span className="block font-semibold text-white">
                              Same as primary address
                            </span>
                            <span className="mt-1 block text-xs leading-5 text-slate-500">
                              Select one primary address and copy its values into this
                              shipping row.
                            </span>
                          </span>
                        </label>

                        {row.same_as_primary ? (
                          <div>
                            <FieldLabel label="Source Primary Address" />
                            <SelectField
                              value={row.source_address_id}
                              disabled={isSaving}
                              onChange={(event) =>
                                updateShippingRow(
                                  row.id,
                                  "source_address_id",
                                  event.target.value
                                )
                              }
                            >
                              <option value="" className="bg-[#05070d]">
                                Select address
                              </option>
                              {addressOptions.map((option) => (
                                <option
                                  key={option.id}
                                  value={option.id}
                                  className="bg-[#05070d]"
                                >
                                  {option.label}
                                </option>
                              ))}
                            </SelectField>
                          </div>
                        ) : (
                          <div className="grid gap-4 md:grid-cols-2">
                            <div>
                              <FieldLabel label="Country" />
                              <InputField
                                value={row.country}
                                disabled={isSaving}
                                onChange={(event) =>
                                  updateShippingRow(
                                    row.id,
                                    "country",
                                    event.target.value
                                  )
                                }
                                placeholder="Country"
                              />
                            </div>

                            <div>
                              <FieldLabel label="City" />
                              <InputField
                                value={row.city}
                                disabled={isSaving}
                                onChange={(event) =>
                                  updateShippingRow(
                                    row.id,
                                    "city",
                                    event.target.value
                                  )
                                }
                                placeholder="City"
                              />
                            </div>

                            <div>
                              <FieldLabel label="State / Province" />
                              <InputField
                                value={row.state_province}
                                disabled={isSaving}
                                onChange={(event) =>
                                  updateShippingRow(
                                    row.id,
                                    "state_province",
                                    event.target.value
                                  )
                                }
                                placeholder="State / Province"
                              />
                            </div>

                            <div>
                              <FieldLabel label="ZIP / Postal Code" />
                              <InputField
                                value={row.postal_code}
                                disabled={isSaving}
                                onChange={(event) =>
                                  updateShippingRow(
                                    row.id,
                                    "postal_code",
                                    event.target.value
                                  )
                                }
                                placeholder="Postal code"
                              />
                            </div>

                            <div className="md:col-span-2">
                              <FieldLabel label="Address Line 1" />
                              <InputField
                                value={row.address_line_1}
                                disabled={isSaving}
                                onChange={(event) =>
                                  updateShippingRow(
                                    row.id,
                                    "address_line_1",
                                    event.target.value
                                  )
                                }
                                placeholder="Address line 1"
                              />
                            </div>

                            <div className="md:col-span-2">
                              <FieldLabel label="Address Line 2" />
                              <InputField
                                value={row.address_line_2}
                                disabled={isSaving}
                                onChange={(event) =>
                                  updateShippingRow(
                                    row.id,
                                    "address_line_2",
                                    event.target.value
                                  )
                                }
                                placeholder="Address line 2"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </RowCard>
                  ))}
                </div>
              </FormSection>

              <FormSection
                title="Notes"
                description="Internal finance notes for this company."
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
                    Review the company before creating it.
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
                    Create opens the new company ID page directly.
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
                    {isSaving ? "Creating..." : "Create Company"}
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
                    Primary Preview
                  </div>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    First row values used for main company fields.
                  </p>
                </div>

                <div className="grid gap-3 p-5">
                  <ReadOnlyBlock
                    label="Main Country"
                    value={form.addresses[0]?.country || "—"}
                    detail="Saved to the company main country field."
                  />
                  <ReadOnlyBlock
                    label="Main City"
                    value={form.addresses[0]?.city || "—"}
                    detail="Saved to the company main city field."
                  />
                  <ReadOnlyBlock
                    label="Main Address Line 1"
                    value={form.addresses[0]?.address_line_1 || "—"}
                    detail="Saved to the company main address field."
                  />
                  <ReadOnlyBlock
                    label="Primary Contact"
                    value={form.contact_person || "—"}
                    detail="Stored as the company primary contact."
                  />
                </div>
              </section>

              <section className="rounded-[24px] border border-cyan-400/20 bg-cyan-500/10 p-4 text-sm leading-6 text-cyan-100">
                <div className="font-semibold text-white">Locked create rule</div>
                <div className="mt-1">
                  This page requires Company create access. New records can be
                  created as Active or Inactive only. Archived companies are managed
                  from the Company registry archive modal. Permission refresh is silent
                  and must not disturb the form.
                </div>
              </section>
            </aside>
          </form>
        )}
      </div>
    </div>
  );
}
