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
  Banknote,
  Building2,
  CheckCircle2,
  FileText,
  Globe,
  Landmark,
  Loader2,
  LockKeyhole,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  RotateCcw,
  Save,
  ShieldCheck,
  Sparkles,
  Trash2,
  Truck,
  UserRound,
  Users,
  X,
} from "lucide-react";

import { archiveCompany, updateCompany } from "@/lib/finance/companies";
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

type CompanyStatus = "active" | "inactive" | "archived";

type CompanyDetailRecord = {
  id: string;
  code: string | null;
  name: string;
  legal_name: string | null;
  contact_person: string | null;
  status: CompanyStatus;
  email: string | null;
  phone: string | null;
  company_code: string | null;
  currency_code: string | null;
  registration_number: string | null;
  tax_number: string | null;
  website: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type PersonnelRow = {
  id: string;
  full_name: string | null;
  position: string | null;
  phone: string | null;
  email: string | null;
  sort_order: number;
  is_primary: boolean;
  status: string;
};

type AddressRow = {
  id: string;
  address_type: "primary" | "shipping";
  country: string | null;
  city: string | null;
  state_province: string | null;
  postal_code: string | null;
  address_line_1: string | null;
  address_line_2: string | null;
  sort_order: number;
  is_primary: boolean;
  is_same_as_primary: boolean;
  status: string;
};

type BankAccountRow = {
  id: string;
  bank_id: string | null;
  bank_name: string | null;
  beneficiary_name: string | null;
  account_number: string | null;
  account_identifier_type: string | null;
  account_identifier_value: string | null;
  currency_code: string | null;
  country: string | null;
  city: string | null;
  status: string | null;
  is_default: boolean | null;
  created_at: string | null;
  updated_at: string | null;
};

type CurrencyOption = {
  id: string;
  currency_code: string;
  currency_name: string;
  currency_symbol: string | null;
  is_base_currency: boolean;
  status: string;
};

type EditSection =
  | null
  | "overview"
  | "identity"
  | "personnel"
  | "primary-addresses"
  | "shipping-addresses"
  | "notes";

type OverviewDraft = {
  legal_name: string;
  display_name: string;
  contact_person: string;
  email: string;
  phone: string;
  status: CompanyStatus;
};

type IdentityDraft = {
  currency_code: string;
  registration_number: string;
  tax_number: string;
  website: string;
};

type PersonnelDraftRow = {
  id: string;
  full_name: string;
  position: string;
  phone: string;
  email: string;
};

type AddressDraftRow = {
  id: string;
  country: string;
  city: string;
  state_province: string;
  postal_code: string;
  address_line_1: string;
  address_line_2: string;
};

type ShippingDraftRow = {
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
  legal_name: "",
  display_name: "",
  contact_person: "",
  email: "",
  phone: "",
  status: "active",
};

const EMPTY_IDENTITY_DRAFT: IdentityDraft = {
  currency_code: "USD",
  registration_number: "",
  tax_number: "",
  website: "",
};

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function createEmptyPersonnelDraftRow(): PersonnelDraftRow {
  return {
    id: makeId(),
    full_name: "",
    position: "",
    phone: "",
    email: "",
  };
}

function createEmptyAddressDraftRow(): AddressDraftRow {
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

function createEmptyShippingDraftRow(): ShippingDraftRow {
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
      console.warn("Company ID permission RPC fallback:", result.error.message);
      return null;
    }

    if (!result.data || typeof result.data !== "object") {
      return null;
    }

    return result.data as Partial<Record<Permission, boolean>>;
  } catch (error) {
    console.warn("Company ID permission RPC failed:", error);
    return null;
  }
}

function normalizeStatus(value: string): CompanyStatus {
  if (value === "inactive" || value === "archived") {
    return value;
  }

  return "active";
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

function getCompanyDisplayName(company: CompanyDetailRecord | null) {
  if (!company) return "Company";
  return company.legal_name || company.name || "Company";
}

function getCompanyContactLabel(company: CompanyDetailRecord | null) {
  return company?.contact_person || "No primary contact";
}

function getCompanyEmailLabel(company: CompanyDetailRecord | null) {
  return company?.email || "No email";
}

function getCompanyPhoneLabel(company: CompanyDetailRecord | null) {
  return company?.phone || "No phone";
}

function getPrimaryAddressSummary(addresses: AddressRow[]) {
  const primary = addresses[0];

  if (!primary) {
    return "No primary address";
  }

  const parts = [
    primary.address_line_1,
    primary.city,
    primary.state_province,
    primary.country,
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(", ") : "Primary address incomplete";
}

function getShippingSummary(shippingAddresses: AddressRow[]) {
  if (shippingAddresses.length === 0) {
    return "No shipping address";
  }

  const sameAsPrimaryCount = shippingAddresses.filter(
    (row) => row.is_same_as_primary
  ).length;

  if (sameAsPrimaryCount > 0) {
    return `${shippingAddresses.length} shipping row${
      shippingAddresses.length === 1 ? "" : "s"
    }, ${sameAsPrimaryCount} same as primary`;
  }

  return `${shippingAddresses.length} shipping row${
    shippingAddresses.length === 1 ? "" : "s"
  }`;
}

function getBankIdentifierLabel(account: BankAccountRow) {
  if (account.account_identifier_type === "iban") return "IBAN";
  if (account.account_identifier_type === "swift") return "SWIFT";
  return "Identifier";
}

function getBankIdentifierValue(account: BankAccountRow) {
  if (account.account_identifier_value) return account.account_identifier_value;
  if (account.account_number) return account.account_number;
  return "—";
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

function DefaultBadge({ isDefault }: { isDefault: boolean | null | undefined }) {
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
  actions,
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

        <div className="flex shrink-0 flex-wrap gap-2">
          {actions}

          {canEdit ? (
            isEditing ? (
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
            )
          ) : null}
        </div>
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

function LoadingState() {
  return (
    <div className="min-h-screen bg-[#05070d] px-4 py-4 text-white md:px-6 md:py-6">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
        <section className="rounded-[34px] border border-white/10 bg-white/[0.045] p-12 text-center backdrop-blur-xl">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-cyan-200" />
          <div className="mt-4 text-sm font-semibold text-white">
            Loading company detail
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Company record and permission state are being checked.
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

export default function FinanceMasterDataCompanyDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [profile, setProfile] = useState<ProfilePermissionRow | null>(null);
  const [effectivePermissions, setEffectivePermissions] =
    useState<Record<Permission, boolean> | null>(null);
  const [company, setCompany] = useState<CompanyDetailRecord | null>(null);
  const [personnel, setPersonnel] = useState<PersonnelRow[]>([]);
  const [addresses, setAddresses] = useState<AddressRow[]>([]);
  const [shippingAddresses, setShippingAddresses] = useState<AddressRow[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccountRow[]>([]);
  const [currencyOptions, setCurrencyOptions] = useState<CurrencyOption[]>([]);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isLoadingCompany, setIsLoadingCompany] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isLifecycleRunning, setIsLifecycleRunning] = useState(false);
  const [activeBankActionId, setActiveBankActionId] = useState<string | null>(null);
  const [editingSection, setEditingSection] = useState<EditSection>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [pageMessage, setPageMessage] = useState<string | null>(null);

  const [overviewDraft, setOverviewDraft] =
    useState<OverviewDraft>(EMPTY_OVERVIEW_DRAFT);
  const [identityDraft, setIdentityDraft] =
    useState<IdentityDraft>(EMPTY_IDENTITY_DRAFT);
  const [personnelDraft, setPersonnelDraft] = useState<PersonnelDraftRow[]>([
    createEmptyPersonnelDraftRow(),
  ]);
  const [addressDraft, setAddressDraft] = useState<AddressDraftRow[]>([
    createEmptyAddressDraftRow(),
  ]);
  const [shippingDraft, setShippingDraft] = useState<ShippingDraftRow[]>([
    createEmptyShippingDraftRow(),
  ]);
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
        console.error("Failed to load company ID permissions:", error);

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

  const loadCompany = useCallback(
    async (mode: "initial" | "silent" = "initial") => {
      if (!id) return;

      if (mode === "initial") {
        setIsLoadingCompany(true);
      }

      try {
        const [companyResult, personnelResult, addressResult, bankResult] =
          await Promise.all([
            supabase
              .from("finance_companies")
              .select(
                `
                  id,
                  code,
                  name,
                  legal_name,
                  contact_person,
                  status,
                  email,
                  phone,
                  company_code,
                  currency_code,
                  registration_number,
                  tax_number,
                  website,
                  notes,
                  created_at,
                  updated_at
                `
              )
              .eq("id", id)
              .single(),
            supabase
              .from("finance_company_personnel")
              .select(
                `
                  id,
                  full_name,
                  position,
                  phone,
                  email,
                  sort_order,
                  is_primary,
                  status
                `
              )
              .eq("company_id", id)
              .order("sort_order", { ascending: true }),
            supabase
              .from("finance_company_addresses")
              .select(
                `
                  id,
                  address_type,
                  country,
                  city,
                  state_province,
                  postal_code,
                  address_line_1,
                  address_line_2,
                  sort_order,
                  is_primary,
                  is_same_as_primary,
                  status
                `
              )
              .eq("company_id", id)
              .order("address_type", { ascending: true })
              .order("sort_order", { ascending: true }),
            supabase
              .from("finance_bank_accounts")
              .select(
                `
                  id,
                  bank_id,
                  bank_name,
                  beneficiary_name,
                  account_number,
                  account_identifier_type,
                  account_identifier_value,
                  currency_code,
                  country,
                  city,
                  status,
                  is_default,
                  created_at,
                  updated_at
                `
              )
              .eq("company_id", id)
              .order("is_default", { ascending: false })
              .order("created_at", { ascending: false }),
          ]);

        if (companyResult.error) throw companyResult.error;
        if (personnelResult.error) throw personnelResult.error;
        if (addressResult.error) throw addressResult.error;
        if (bankResult.error) throw bankResult.error;

        const companyData = companyResult.data as CompanyDetailRecord;
        const personnelData = (personnelResult.data ?? []) as PersonnelRow[];
        const addressData = (addressResult.data ?? []) as AddressRow[];
        const bankData = (bankResult.data ?? []) as BankAccountRow[];

        setCompany(companyData);
        setPersonnel(personnelData);
        setAddresses(addressData.filter((row) => row.address_type === "primary"));
        setShippingAddresses(
          addressData.filter((row) => row.address_type === "shipping")
        );
        setBankAccounts(bankData);
      } catch (error) {
        console.error("Failed to load finance company details:", error);

        if (mode === "initial") {
          setCompany(null);
          setPersonnel([]);
          setAddresses([]);
          setShippingAddresses([]);
          setBankAccounts([]);
          setPageError(
            error instanceof Error
              ? error.message
              : "Failed to load finance company details."
          );
        }
      } finally {
        if (mode === "initial") {
          setIsLoadingCompany(false);
        }
      }
    },
    [id]
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

      setCurrencyOptions((data ?? []) as CurrencyOption[]);
    } catch (error) {
      console.error("Failed to load currency master data:", error);
      setCurrencyOptions([]);
    }
  }, []);

  useEffect(() => {
    void Promise.all([
      loadCurrentProfile("initial"),
      loadCompany("initial"),
      loadCurrencyOptions(),
    ]);
  }, [loadCompany, loadCurrencyOptions, loadCurrentProfile]);

  useEffect(() => {
    const channel = supabase
      .channel("finance-master-data-company-id-page")
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
        { event: "*", schema: "public", table: "finance_companies" },
        () => void loadCompany("silent")
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_company_personnel" },
        () => void loadCompany("silent")
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_company_addresses" },
        () => void loadCompany("silent")
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "finance_bank_accounts",
          filter: id ? `company_id=eq.${id}` : undefined,
        },
        () => void loadCompany("silent")
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
        loadCompany("silent"),
        loadCurrencyOptions(),
      ]);
    }, 60000);

    return () => {
      window.clearInterval(intervalId);
      supabase.removeChannel(channel);
    };
  }, [id, loadCompany, loadCurrencyOptions, loadCurrentProfile]);

  const permissionState = useMemo(() => {
    return buildPermissionState(profile, effectivePermissions);
  }, [effectivePermissions, profile]);

  const primaryAddressOptions = useMemo(() => {
    return addressDraft.map((address, index) => ({
      id: address.id,
      label:
        address.address_line_1.trim() ||
        address.city.trim() ||
        address.country.trim() ||
        `Address ${index + 1}`,
      value: address,
    }));
  }, [addressDraft]);

  const currencySelectOptions = useMemo(() => {
    const currentCurrencyCode = identityDraft.currency_code || company?.currency_code || "";
    const hasCurrentCurrency = currencyOptions.some(
      (currency) => currency.currency_code === currentCurrencyCode
    );

    if (!currentCurrencyCode || hasCurrentCurrency) {
      return currencyOptions;
    }

    return [
      {
        id: `current-${currentCurrencyCode}`,
        currency_code: currentCurrencyCode,
        currency_name: currentCurrencyCode,
        currency_symbol: null,
        is_base_currency: false,
        status: "current",
      },
      ...currencyOptions,
    ];
  }, [company?.currency_code, currencyOptions, identityDraft.currency_code]);

  const headerStatusCards = useMemo<HeaderStatusCardData[]>(() => {
    return [
      {
        label: "Read Access",
        value: isLoadingProfile
          ? "Checking"
          : permissionState.canRead
            ? "Enabled"
            : "Locked",
        detail: "Viewing this record requires Finance read access.",
        icon: permissionState.canRead ? ShieldCheck : LockKeyhole,
        tone: permissionState.canRead ? "emerald" : "rose",
      },
      {
        label: "Edit Access",
        value: permissionState.canUpdate ? "Enabled" : "Read Only",
        detail: "Section edits require Update access or Master Data admin access.",
        icon: permissionState.canUpdate ? Pencil : LockKeyhole,
        tone: permissionState.canUpdate ? "cyan" : "amber",
      },
    ];
  }, [isLoadingProfile, permissionState.canRead, permissionState.canUpdate]);

  const summaryCards = useMemo<SummaryCardData[]>(() => {
    return [
      {
        label: "Company",
        value: getCompanyDisplayName(company),
        detail: company?.company_code || company?.code || "No company code",
        icon: Building2,
        tone: "cyan",
      },
      {
        label: "Contact",
        value: getCompanyContactLabel(company),
        detail: `${getCompanyEmailLabel(company)} • ${getCompanyPhoneLabel(company)}`,
        icon: UserRound,
        tone: "emerald",
      },
      {
        label: "Currency",
        value: company?.currency_code || "—",
        detail: `${personnel.length} personnel row${
          personnel.length === 1 ? "" : "s"
        }`,
        icon: Globe,
        tone: "violet",
      },
      {
        label: "Bank Accounts",
        value: `${bankAccounts.length}`,
        detail:
          bankAccounts.find((account) => account.is_default)?.bank_name ||
          "No default bank account",
        icon: Banknote,
        tone: "amber",
      },
    ];
  }, [bankAccounts, company, personnel.length]);

  function cancelEditing() {
    setEditingSection(null);
    setPageError(null);
  }

  function openOverviewEditor() {
    if (!company || !permissionState.canUpdate) return;

    setPageError(null);
    setPageMessage(null);
    setOverviewDraft({
      legal_name: company.legal_name || company.name || "",
      display_name: company.name || "",
      contact_person: company.contact_person || "",
      email: company.email || "",
      phone: company.phone || "",
      status: company.status,
    });
    setEditingSection("overview");
  }

  function openIdentityEditor() {
    if (!company || !permissionState.canUpdate) return;

    setPageError(null);
    setPageMessage(null);
    setIdentityDraft({
      currency_code: company.currency_code || "USD",
      registration_number: company.registration_number || "",
      tax_number: company.tax_number || "",
      website: company.website || "",
    });
    setEditingSection("identity");
  }

  function openPersonnelEditor() {
    if (!permissionState.canUpdate) return;

    setPageError(null);
    setPageMessage(null);
    setPersonnelDraft(
      personnel.length > 0
        ? personnel.map((row) => ({
            id: row.id,
            full_name: row.full_name || "",
            position: row.position || "",
            phone: row.phone || "",
            email: row.email || "",
          }))
        : [createEmptyPersonnelDraftRow()]
    );
    setEditingSection("personnel");
  }

  function openPrimaryAddressEditor() {
    if (!permissionState.canUpdate) return;

    setPageError(null);
    setPageMessage(null);
    setAddressDraft(
      addresses.length > 0
        ? addresses.map((row) => ({
            id: row.id,
            country: row.country || "",
            city: row.city || "",
            state_province: row.state_province || "",
            postal_code: row.postal_code || "",
            address_line_1: row.address_line_1 || "",
            address_line_2: row.address_line_2 || "",
          }))
        : [createEmptyAddressDraftRow()]
    );
    setEditingSection("primary-addresses");
  }

  function openShippingAddressEditor() {
    if (!permissionState.canUpdate) return;

    setPageError(null);
    setPageMessage(null);
    setAddressDraft(
      addresses.length > 0
        ? addresses.map((row) => ({
            id: row.id,
            country: row.country || "",
            city: row.city || "",
            state_province: row.state_province || "",
            postal_code: row.postal_code || "",
            address_line_1: row.address_line_1 || "",
            address_line_2: row.address_line_2 || "",
          }))
        : [createEmptyAddressDraftRow()]
    );
    setShippingDraft(
      shippingAddresses.length > 0
        ? shippingAddresses.map((row) => ({
            id: row.id,
            same_as_primary: row.is_same_as_primary,
            source_address_id: "",
            country: row.country || "",
            city: row.city || "",
            state_province: row.state_province || "",
            postal_code: row.postal_code || "",
            address_line_1: row.address_line_1 || "",
            address_line_2: row.address_line_2 || "",
          }))
        : [createEmptyShippingDraftRow()]
    );
    setEditingSection("shipping-addresses");
  }

  function openNotesEditor() {
    if (!company || !permissionState.canUpdate) return;

    setPageError(null);
    setPageMessage(null);
    setNotesDraft(company.notes || "");
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

  function updateIdentityDraft<K extends keyof IdentityDraft>(
    key: K,
    value: IdentityDraft[K]
  ) {
    setIdentityDraft((previousDraft) => ({
      ...previousDraft,
      [key]: value,
    }));
  }

  function updatePersonnelDraftRow(
    rowId: string,
    key: keyof PersonnelDraftRow,
    value: string
  ) {
    setPersonnelDraft((previousDraft) =>
      previousDraft.map((row) =>
        row.id === rowId ? { ...row, [key]: value } : row
      )
    );
  }

  function addPersonnelDraftRow() {
    setPersonnelDraft((previousDraft) => [
      ...previousDraft,
      createEmptyPersonnelDraftRow(),
    ]);
  }

  function removePersonnelDraftRow(rowId: string) {
    setPersonnelDraft((previousDraft) =>
      previousDraft.length > 1
        ? previousDraft.filter((row) => row.id !== rowId)
        : previousDraft
    );
  }

  function updateAddressDraftRow(
    rowId: string,
    key: keyof AddressDraftRow,
    value: string
  ) {
    setAddressDraft((previousAddressDraft) => {
      const nextAddresses = previousAddressDraft.map((row) =>
        row.id === rowId ? { ...row, [key]: value } : row
      );

      setShippingDraft((previousShippingDraft) =>
        previousShippingDraft.map((shipping) => {
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
        })
      );

      return nextAddresses;
    });
  }

  function addAddressDraftRow() {
    setAddressDraft((previousDraft) => [
      ...previousDraft,
      createEmptyAddressDraftRow(),
    ]);
  }

  function removeAddressDraftRow(rowId: string) {
    setAddressDraft((previousDraft) =>
      previousDraft.length > 1
        ? previousDraft.filter((row) => row.id !== rowId)
        : previousDraft
    );

    setShippingDraft((previousDraft) =>
      previousDraft.map((shipping) =>
        shipping.source_address_id === rowId
          ? {
              ...shipping,
              same_as_primary: false,
              source_address_id: "",
              country: "",
              city: "",
              state_province: "",
              postal_code: "",
              address_line_1: "",
              address_line_2: "",
            }
          : shipping
      )
    );
  }

  function updateShippingDraftRow(
    rowId: string,
    key: keyof ShippingDraftRow,
    value: string | boolean
  ) {
    setShippingDraft((previousDraft) =>
      previousDraft.map((row) => {
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

          const source = addressDraft.find(
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
          const source = addressDraft.find(
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
      })
    );
  }

  function addShippingDraftRow() {
    setShippingDraft((previousDraft) => [
      ...previousDraft,
      createEmptyShippingDraftRow(),
    ]);
  }

  function removeShippingDraftRow(rowId: string) {
    setShippingDraft((previousDraft) =>
      previousDraft.length > 1
        ? previousDraft.filter((row) => row.id !== rowId)
        : previousDraft
    );
  }

  async function saveOverviewSection() {
    if (!company || !permissionState.canUpdate) return;

    const legalName = overviewDraft.legal_name.trim();

    if (!legalName) {
      setPageError("Legal name is required.");
      return;
    }

    const normalizedStatus = normalizeStatus(overviewDraft.status);

    if (
      normalizedStatus === "archived" &&
      company.status !== "archived" &&
      !permissionState.canDeleteArchive
    ) {
      setPageError("Delete/Archive access is required to archive this company.");
      return;
    }

    if (
      company.status === "archived" &&
      normalizedStatus !== "archived" &&
      !permissionState.canDeleteArchive
    ) {
      setPageError("Delete/Archive access is required to restore this company.");
      return;
    }

    try {
      setIsSaving(true);
      setPageError(null);
      setPageMessage(null);

      await updateCompany(company.id, {
        legal_name: legalName,
        name: overviewDraft.display_name.trim() || legalName,
        contact_person: overviewDraft.contact_person.trim() || null,
        email: overviewDraft.email.trim() || null,
        phone: overviewDraft.phone.trim() || null,
        status: normalizedStatus,
      });

      setEditingSection(null);
      setPageMessage("Company overview updated.");
      await loadCompany("silent");
    } catch (error) {
      console.error("Failed to save company overview:", error);
      setPageError(
        error instanceof Error ? error.message : "Failed to save company overview."
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function saveIdentitySection() {
    if (!company || !permissionState.canUpdate) return;

    try {
      setIsSaving(true);
      setPageError(null);
      setPageMessage(null);

      await updateCompany(company.id, {
        currency_code: identityDraft.currency_code || null,
        registration_number: identityDraft.registration_number.trim() || null,
        tax_number: identityDraft.tax_number.trim() || null,
        website: identityDraft.website.trim() || null,
      });

      setEditingSection(null);
      setPageMessage("Company identity updated.");
      await loadCompany("silent");
    } catch (error) {
      console.error("Failed to save company identity:", error);
      setPageError(
        error instanceof Error ? error.message : "Failed to save company identity."
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function savePersonnelSection() {
    if (!company || !permissionState.canUpdate) return;

    try {
      setIsSaving(true);
      setPageError(null);
      setPageMessage(null);

      const { error: deleteError } = await supabase
        .from("finance_company_personnel")
        .delete()
        .eq("company_id", company.id);

      if (deleteError) throw deleteError;

      const payload = personnelDraft
        .map((row, index) => ({
          company_id: company.id,
          full_name: row.full_name.trim() || null,
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

      if (payload.length > 0) {
        const { error } = await supabase
          .from("finance_company_personnel")
          .insert(payload);

        if (error) throw error;
      }

      setEditingSection(null);
      setPageMessage("Company personnel updated.");
      await loadCompany("silent");
    } catch (error) {
      console.error("Failed to save company personnel:", error);
      setPageError(
        error instanceof Error ? error.message : "Failed to save company personnel."
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function savePrimaryAddressSection() {
    if (!company || !permissionState.canUpdate) return;

    try {
      setIsSaving(true);
      setPageError(null);
      setPageMessage(null);

      const { error: deleteError } = await supabase
        .from("finance_company_addresses")
        .delete()
        .eq("company_id", company.id)
        .eq("address_type", "primary");

      if (deleteError) throw deleteError;

      const payload = addressDraft
        .map((row, index) => ({
          company_id: company.id,
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

      if (payload.length > 0) {
        const { error } = await supabase
          .from("finance_company_addresses")
          .insert(payload);

        if (error) throw error;
      }

      await updateCompany(company.id, {
        country: addressDraft[0]?.country.trim() || null,
        city: addressDraft[0]?.city.trim() || null,
        state_province: addressDraft[0]?.state_province.trim() || null,
        postal_code: addressDraft[0]?.postal_code.trim() || null,
        address_line_1: addressDraft[0]?.address_line_1.trim() || null,
        address_line_2: addressDraft[0]?.address_line_2.trim() || null,
      });

      setEditingSection(null);
      setPageMessage("Primary addresses updated.");
      await loadCompany("silent");
    } catch (error) {
      console.error("Failed to save primary addresses:", error);
      setPageError(
        error instanceof Error ? error.message : "Failed to save primary addresses."
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function saveShippingAddressSection() {
    if (!company || !permissionState.canUpdate) return;

    try {
      setIsSaving(true);
      setPageError(null);
      setPageMessage(null);

      const { error: deleteError } = await supabase
        .from("finance_company_addresses")
        .delete()
        .eq("company_id", company.id)
        .eq("address_type", "shipping");

      if (deleteError) throw deleteError;

      const payload = shippingDraft
        .map((row, index) => ({
          company_id: company.id,
          address_type: "shipping" as const,
          country: row.same_as_primary ? null : row.country.trim() || null,
          city: row.same_as_primary ? null : row.city.trim() || null,
          state_province: row.same_as_primary
            ? null
            : row.state_province.trim() || null,
          postal_code: row.same_as_primary ? null : row.postal_code.trim() || null,
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

      if (payload.length > 0) {
        const { error } = await supabase
          .from("finance_company_addresses")
          .insert(payload);

        if (error) throw error;
      }

      setEditingSection(null);
      setPageMessage("Shipping addresses updated.");
      await loadCompany("silent");
    } catch (error) {
      console.error("Failed to save shipping addresses:", error);
      setPageError(
        error instanceof Error ? error.message : "Failed to save shipping addresses."
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function saveNotesSection() {
    if (!company || !permissionState.canUpdate) return;

    try {
      setIsSaving(true);
      setPageError(null);
      setPageMessage(null);

      await updateCompany(company.id, {
        notes: notesDraft.trim() || null,
      });

      setEditingSection(null);
      setPageMessage("Company notes updated.");
      await loadCompany("silent");
    } catch (error) {
      console.error("Failed to save company notes:", error);
      setPageError(
        error instanceof Error ? error.message : "Failed to save company notes."
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleArchiveToggle() {
    if (!company || !permissionState.canDeleteArchive || isLifecycleRunning) return;

    try {
      setIsLifecycleRunning(true);
      setPageError(null);
      setPageMessage(null);

      if (company.status === "archived") {
        await updateCompany(company.id, { status: "active" });
        setPageMessage("Company restored.");
      } else {
        await archiveCompany(company.id);
        setPageMessage("Company archived.");
      }

      await loadCompany("silent");
    } catch (error) {
      console.error("Failed to update company lifecycle:", error);
      setPageError(
        error instanceof Error
          ? error.message
          : "Failed to update company lifecycle."
      );
    } finally {
      setIsLifecycleRunning(false);
    }
  }

  async function handleSetDefaultBankAccount(accountId: string) {
    if (!permissionState.canUpdate || activeBankActionId) return;

    try {
      setActiveBankActionId(accountId);
      setPageError(null);
      setPageMessage(null);

      const { error } = await supabase
        .from("finance_bank_accounts")
        .update({ is_default: true })
        .eq("id", accountId);

      if (error) throw error;

      setPageMessage("Default bank account updated.");
      await loadCompany("silent");
    } catch (error) {
      console.error("Failed to set default bank account:", error);
      setPageError(
        error instanceof Error
          ? error.message
          : "Failed to set default bank account."
      );
    } finally {
      setActiveBankActionId(null);
    }
  }

  const isPageLoading = isLoadingProfile || isLoadingCompany;

  if (isPageLoading) {
    return <LoadingState />;
  }

  if (!company) {
    return (
      <div className="min-h-screen bg-[#05070d] px-4 py-4 text-white md:px-6 md:py-6">
        <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
          <EmptyState
            icon={Building2}
            title="Company not found"
            description="The company record could not be loaded or no longer exists."
            action={
              <button
                type="button"
                onClick={() => navigate("/finance/master-data/companies")}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-cyan-400/20 bg-cyan-500/10 px-5 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/15"
              >
                <ArrowRight className="h-4 w-4 rotate-180" />
                Companies
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
                onClick={() => navigate("/finance/master-data/companies")}
                className="mb-5 inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-300 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
              >
                <ArrowRight className="h-3.5 w-3.5 rotate-180" />
                Companies
              </button>

              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-rose-400/20 bg-rose-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-rose-200">
                <LockKeyhole className="h-3.5 w-3.5" />
                Access Locked
              </div>

              <h1 className="mt-4 text-3xl font-semibold tracking-[-0.035em] text-white md:text-5xl">
                Company Access Locked
              </h1>

              <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-400 md:text-base md:leading-7">
                This page requires Finance read access or Master Data admin access.
              </p>
            </div>
          </header>

          <EmptyState
            icon={LockKeyhole}
            title="No company read access"
            description="Ask an Admin to assign a Finance role template or user-specific exception with Finance read access."
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
                onClick={() => navigate("/finance/master-data/companies")}
                className="mb-5 inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-300 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
              >
                <ArrowRight className="h-3.5 w-3.5 rotate-180" />
                Companies
              </button>

              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-200">
                <Sparkles className="h-3.5 w-3.5" />
                Company Detail
              </div>

              <h1 className="mt-4 text-3xl font-semibold tracking-[-0.035em] text-white md:text-5xl">
                {getCompanyDisplayName(company)}
              </h1>

              <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-400 md:text-base md:leading-7">
                Internal company record with same-place section editing, company
                identity, personnel, primary addresses, shipping addresses, bank
                accounts, notes, and lifecycle control.
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-300">
                  {company.company_code || company.code || "No Company Code"}
                </span>

                <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-300">
                  {company.currency_code || "No Currency"}
                </span>

                <StatusBadge status={company.status} />
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
              title="Company Overview"
              description="Legal identity, display name, primary contact, communication, and lifecycle status."
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
                    <FieldLabel label="Legal Name" required />
                    <InputField
                      value={overviewDraft.legal_name}
                      disabled={isSaving}
                      onChange={(event) =>
                        updateOverviewDraft("legal_name", event.target.value)
                      }
                      placeholder="Legal company name"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <FieldLabel label="Display Name" />
                    <InputField
                      value={overviewDraft.display_name}
                      disabled={isSaving}
                      onChange={(event) =>
                        updateOverviewDraft("display_name", event.target.value)
                      }
                      placeholder="Display name"
                    />
                  </div>

                  <div>
                    <FieldLabel label="Primary Contact" />
                    <InputField
                      value={overviewDraft.contact_person}
                      disabled={isSaving}
                      onChange={(event) =>
                        updateOverviewDraft("contact_person", event.target.value)
                      }
                      placeholder="Primary contact"
                    />
                  </div>

                  <div>
                    <FieldLabel label="Email" />
                    <InputField
                      type="email"
                      value={overviewDraft.email}
                      disabled={isSaving}
                      onChange={(event) =>
                        updateOverviewDraft("email", event.target.value)
                      }
                      placeholder="company@email.com"
                    />
                  </div>

                  <div>
                    <FieldLabel label="Phone" />
                    <InputField
                      value={overviewDraft.phone}
                      disabled={isSaving}
                      onChange={(event) =>
                        updateOverviewDraft("phone", event.target.value)
                      }
                      placeholder="Company phone"
                    />
                  </div>

                  <div>
                    <FieldLabel label="Status" />
                    <SelectField
                      value={overviewDraft.status}
                      disabled={isSaving}
                      onChange={(event) =>
                        updateOverviewDraft("status", normalizeStatus(event.target.value))
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
                </div>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  <DisplayBlock label="Legal Name" value={getCompanyDisplayName(company)} />
                  <DisplayBlock label="Display Name" value={company.name || "—"} />
                  <DisplayBlock
                    label="Primary Contact"
                    value={company.contact_person || "—"}
                  />
                  <DisplayBlock
                    label="Email"
                    value={company.email || "—"}
                    detail={
                      company.email ? (
                        <span className="inline-flex items-center gap-1">
                          <Mail className="h-3.5 w-3.5" />
                          Communication email
                        </span>
                      ) : null
                    }
                  />
                  <DisplayBlock
                    label="Phone"
                    value={company.phone || "—"}
                    detail={
                      company.phone ? (
                        <span className="inline-flex items-center gap-1">
                          <Phone className="h-3.5 w-3.5" />
                          Communication phone
                        </span>
                      ) : null
                    }
                  />
                  <DisplayBlock
                    label="Lifecycle Status"
                    value={<StatusBadge status={company.status} />}
                  />
                </div>
              )}
            </DetailSection>

                        <DetailSection
              title="Company Identity"
              description="Internal legal and finance identity fields."
              icon={Landmark}
              isEditing={editingSection === "identity"}
              canEdit={permissionState.canUpdate}
              onEdit={openIdentityEditor}
              onCancel={cancelEditing}
              onSave={() => void saveIdentitySection()}
              isSaving={isSaving}
            >
              {editingSection === "identity" ? (
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <FieldLabel label="Company Code" />
                    <div className="flex h-11 items-center rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-slate-400">
                      {company.company_code || company.code || "Auto-generated by system"}
                    </div>
                  </div>

                  <div>
                    <FieldLabel label="Currency Code" />
                    <SelectField
                      value={identityDraft.currency_code}
                      disabled={isSaving}
                      onChange={(event) =>
                        updateIdentityDraft("currency_code", event.target.value)
                      }
                    >
                      {currencySelectOptions.map((currency) => (
                        <option
                          key={currency.id}
                          value={currency.currency_code}
                          className="bg-[#05070d]"
                        >
                          {currency.currency_code} — {currency.currency_name}
                          {currency.currency_symbol ? ` (${currency.currency_symbol})` : ""}
                          {currency.is_base_currency ? " • Base" : ""}
                        </option>
                      ))}
                      ))}
                    </SelectField>
                  </div>

                  <div>
                    <FieldLabel label="Registration Number" />
                    <InputField
                      value={identityDraft.registration_number}
                      disabled={isSaving}
                      onChange={(event) =>
                        updateIdentityDraft("registration_number", event.target.value)
                      }
                      placeholder="Registration number"
                    />
                  </div>

                  <div>
                    <FieldLabel label="Tax Number" />
                    <InputField
                      value={identityDraft.tax_number}
                      disabled={isSaving}
                      onChange={(event) =>
                        updateIdentityDraft("tax_number", event.target.value)
                      }
                      placeholder="Tax number"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <FieldLabel label="Website" />
                    <InputField
                      value={identityDraft.website}
                      disabled={isSaving}
                      onChange={(event) =>
                        updateIdentityDraft("website", event.target.value)
                      }
                      placeholder="https://example.com"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  <DisplayBlock
                    label="Company Code"
                    value={company.company_code || company.code || "—"}
                  />
                  <DisplayBlock
                    label="Currency Code"
                    value={company.currency_code || "—"}
                  />
                  <DisplayBlock
                    label="Registration Number"
                    value={company.registration_number || "—"}
                  />
                  <DisplayBlock label="Tax Number" value={company.tax_number || "—"} />
                  <DisplayBlock label="Website" value={company.website || "—"} />
                  <DisplayBlock
                    label="Created"
                    value={formatDateTimeLabel(company.created_at)}
                  />
                </div>
              )}
            </DetailSection>

            <DetailSection
              title="Personnel"
              description="People connected to this internal company."
              icon={Users}
              isEditing={editingSection === "personnel"}
              canEdit={permissionState.canUpdate}
              onEdit={openPersonnelEditor}
              onCancel={cancelEditing}
              onSave={() => void savePersonnelSection()}
              isSaving={isSaving}
            >
              {editingSection === "personnel" ? (
                <div className="space-y-4">
                  <div className="flex justify-end">
                    <AddRowButton
                      label="Add Person"
                      onClick={addPersonnelDraftRow}
                      disabled={isSaving}
                    />
                  </div>

                  <div className="max-h-[720px] space-y-4 overflow-y-auto pr-1">
                    {personnelDraft.map((row, index) => (
                      <RowCard
                        key={row.id}
                        title={`Person ${index + 1}`}
                        description={index === 0 ? "Primary personnel row." : undefined}
                        onRemove={() => removePersonnelDraftRow(row.id)}
                        removeDisabled={isSaving || personnelDraft.length === 1}
                      >
                        <div className="grid gap-4 md:grid-cols-2">
                          <div>
                            <FieldLabel label="Name" />
                            <InputField
                              value={row.full_name}
                              disabled={isSaving}
                              onChange={(event) =>
                                updatePersonnelDraftRow(
                                  row.id,
                                  "full_name",
                                  event.target.value
                                )
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
                                updatePersonnelDraftRow(
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
                                updatePersonnelDraftRow(
                                  row.id,
                                  "phone",
                                  event.target.value
                                )
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
                                updatePersonnelDraftRow(
                                  row.id,
                                  "email",
                                  event.target.value
                                )
                              }
                              placeholder="Email"
                            />
                          </div>
                        </div>
                      </RowCard>
                    ))}
                  </div>
                </div>
              ) : personnel.length === 0 ? (
                <div className="rounded-[20px] border border-dashed border-white/10 bg-black/20 px-4 py-8 text-center text-sm text-slate-500">
                  No personnel added yet.
                </div>
              ) : (
                <div className="max-h-[720px] space-y-3 overflow-y-auto pr-1">
                  {personnel.map((row, index) => (
                    <div
                      key={row.id}
                      className="rounded-[24px] border border-white/10 bg-black/20 p-4"
                    >
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <div className="text-sm font-semibold text-white">
                          Person {index + 1}
                        </div>
                        {row.is_primary ? (
                          <span className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-cyan-100">
                            Primary
                          </span>
                        ) : null}
                      </div>

                      <div className="grid gap-3 md:grid-cols-2">
                        <DisplayBlock label="Name" value={row.full_name || "—"} />
                        <DisplayBlock label="Position" value={row.position || "—"} />
                        <DisplayBlock label="Phone" value={row.phone || "—"} />
                        <DisplayBlock label="Email" value={row.email || "—"} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </DetailSection>

            <DetailSection
              title="Primary Addresses"
              description="Primary legal and billing addresses."
              icon={MapPin}
              isEditing={editingSection === "primary-addresses"}
              canEdit={permissionState.canUpdate}
              onEdit={openPrimaryAddressEditor}
              onCancel={cancelEditing}
              onSave={() => void savePrimaryAddressSection()}
              isSaving={isSaving}
            >
              {editingSection === "primary-addresses" ? (
                <div className="space-y-4">
                  <div className="flex justify-end">
                    <AddRowButton
                      label="Add Address"
                      onClick={addAddressDraftRow}
                      disabled={isSaving}
                    />
                  </div>

                  <div className="max-h-[720px] space-y-4 overflow-y-auto pr-1">
                    {addressDraft.map((row, index) => (
                      <RowCard
                        key={row.id}
                        title={`Address ${index + 1}`}
                        description={index === 0 ? "Primary address row." : undefined}
                        onRemove={() => removeAddressDraftRow(row.id)}
                        removeDisabled={isSaving || addressDraft.length === 1}
                      >
                        <div className="grid gap-4 md:grid-cols-2">
                          <div>
                            <FieldLabel label="Country" />
                            <InputField
                              value={row.country}
                              disabled={isSaving}
                              onChange={(event) =>
                                updateAddressDraftRow(
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
                                updateAddressDraftRow(
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
                                updateAddressDraftRow(
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
                                updateAddressDraftRow(
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
                                updateAddressDraftRow(
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
                                updateAddressDraftRow(
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
                </div>
              ) : addresses.length === 0 ? (
                <div className="rounded-[20px] border border-dashed border-white/10 bg-black/20 px-4 py-8 text-center text-sm text-slate-500">
                  No primary addresses added yet.
                </div>
              ) : (
                <div className="max-h-[720px] space-y-3 overflow-y-auto pr-1">
                  {addresses.map((row, index) => (
                    <div
                      key={row.id}
                      className="rounded-[24px] border border-white/10 bg-black/20 p-4"
                    >
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <div className="text-sm font-semibold text-white">
                          Address {index + 1}
                        </div>
                        {row.is_primary ? (
                          <span className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-cyan-100">
                            Primary
                          </span>
                        ) : null}
                      </div>

                      <div className="grid gap-3 md:grid-cols-2">
                        <DisplayBlock label="Country" value={row.country || "—"} />
                        <DisplayBlock label="City" value={row.city || "—"} />
                        <DisplayBlock
                          label="State / Province"
                          value={row.state_province || "—"}
                        />
                        <DisplayBlock
                          label="ZIP / Postal Code"
                          value={row.postal_code || "—"}
                        />
                        <DisplayBlock
                          label="Address Line 1"
                          value={row.address_line_1 || "—"}
                        />
                        <DisplayBlock
                          label="Address Line 2"
                          value={row.address_line_2 || "—"}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </DetailSection>

                        <DetailSection
              title="Shipping Addresses"
              description="Shipping destinations for this internal company."
              icon={Truck}
              isEditing={editingSection === "shipping-addresses"}
              canEdit={permissionState.canUpdate}
              onEdit={openShippingAddressEditor}
              onCancel={cancelEditing}
              onSave={() => void saveShippingAddressSection()}
              isSaving={isSaving}
            >
              {editingSection === "shipping-addresses" ? (
                <div className="space-y-4">
                  <div className="flex justify-end">
                    <AddRowButton
                      label="Add Shipping"
                      onClick={addShippingDraftRow}
                      disabled={isSaving}
                    />
                  </div>

                  <div className="max-h-[720px] space-y-4 overflow-y-auto pr-1">
                    {shippingDraft.map((row, index) => (
                      <RowCard
                        key={row.id}
                        title={`Shipping ${index + 1}`}
                        description={
                          row.same_as_primary
                            ? "Linked to a primary address."
                            : "Standalone shipping address."
                        }
                        onRemove={() => removeShippingDraftRow(row.id)}
                        removeDisabled={isSaving || shippingDraft.length === 1}
                      >
                        <div className="space-y-4">
                          <label className="flex items-start gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-300">
                            <input
                              type="checkbox"
                              checked={row.same_as_primary}
                              disabled={isSaving}
                              onChange={(event) =>
                                updateShippingDraftRow(
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
                                  updateShippingDraftRow(
                                    row.id,
                                    "source_address_id",
                                    event.target.value
                                  )
                                }
                              >
                                <option value="" className="bg-[#05070d]">
                                  Select address
                                </option>
                                {primaryAddressOptions.map((option) => (
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
                                    updateShippingDraftRow(
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
                                    updateShippingDraftRow(
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
                                    updateShippingDraftRow(
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
                                    updateShippingDraftRow(
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
                                    updateShippingDraftRow(
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
                                    updateShippingDraftRow(
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
                </div>
              ) : shippingAddresses.length === 0 ? (
                <div className="rounded-[20px] border border-dashed border-white/10 bg-black/20 px-4 py-8 text-center text-sm text-slate-500">
                  No shipping addresses added yet.
                </div>
              ) : (
                <div className="max-h-[720px] space-y-3 overflow-y-auto pr-1">
                  {shippingAddresses.map((row, index) => (
                    <div
                      key={row.id}
                      className="rounded-[24px] border border-white/10 bg-black/20 p-4"
                    >
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <div className="text-sm font-semibold text-white">
                          Shipping {index + 1}
                        </div>
                        {row.is_same_as_primary ? (
                          <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-100">
                            Same as primary
                          </span>
                        ) : null}
                      </div>

                      {row.is_same_as_primary ? (
                        <div className="rounded-[20px] border border-white/10 bg-white/[0.035] px-4 py-3 text-sm text-slate-300">
                          Same as primary address.
                        </div>
                      ) : (
                        <div className="grid gap-3 md:grid-cols-2">
                          <DisplayBlock label="Country" value={row.country || "—"} />
                          <DisplayBlock label="City" value={row.city || "—"} />
                          <DisplayBlock
                            label="State / Province"
                            value={row.state_province || "—"}
                          />
                          <DisplayBlock
                            label="ZIP / Postal Code"
                            value={row.postal_code || "—"}
                          />
                          <DisplayBlock
                            label="Address Line 1"
                            value={row.address_line_1 || "—"}
                          />
                          <DisplayBlock
                            label="Address Line 2"
                            value={row.address_line_2 || "—"}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </DetailSection>

            <DetailSection
              title="Notes"
              description="Internal finance notes for this company."
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
                  {company.notes || "No notes added yet."}
                </div>
              )}
            </DetailSection>

            <DetailSection
              title="Bank Accounts"
              description="Company bank accounts linked to this internal entity."
              icon={Banknote}
              isEditing={false}
              canEdit={false}
              actions={
                permissionState.canUpdate ? (
                  <button
                    type="button"
                    onClick={() =>
                      navigate(`/finance/master-data/bank-accounts/new?company_id=${id}`)
                    }
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-cyan-400/20 bg-cyan-500/10 px-4 text-xs font-semibold uppercase tracking-[0.14em] text-cyan-100 transition hover:bg-cyan-500/15"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Bank Account
                  </button>
                ) : null
              }
            >
              {bankAccounts.length === 0 ? (
                <div className="rounded-[20px] border border-dashed border-white/10 bg-black/20 px-4 py-8 text-center text-sm text-slate-500">
                  No bank accounts added yet.
                </div>
              ) : (
                <div className="max-h-[720px] space-y-3 overflow-y-auto pr-1">
                  {bankAccounts.map((account, index) => {
                    const isBankActionRunning = activeBankActionId === account.id;

                    return (
                      <div
                        key={account.id}
                        className={`rounded-[24px] border p-4 ${
                          account.is_default
                            ? "border-emerald-400/20 bg-emerald-500/10"
                            : "border-white/10 bg-black/20"
                        }`}
                      >
                        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="text-sm font-semibold text-white">
                                Account {index + 1}
                              </div>
                              <DefaultBadge isDefault={account.is_default} />
                              <StatusBadge status={account.status} />
                            </div>
                            <div className="mt-1 text-xs leading-5 text-slate-500">
                              {account.bank_id || "No bank ID"}
                            </div>
                          </div>

                          <div className="flex shrink-0 flex-wrap gap-2">
                            {!account.is_default && permissionState.canUpdate ? (
                              <button
                                type="button"
                                onClick={() =>
                                  void handleSetDefaultBankAccount(account.id)
                                }
                                disabled={Boolean(activeBankActionId)}
                                className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-100 transition hover:bg-emerald-500/15 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {isBankActionRunning ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <ShieldCheck className="h-3.5 w-3.5" />
                                )}
                                Set Default
                              </button>
                            ) : null}

                            <button
                              type="button"
                              onClick={() =>
                                navigate(`/finance/master-data/bank-accounts/${account.id}`)
                              }
                              className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-cyan-400/20 bg-cyan-500/10 px-4 text-xs font-semibold uppercase tracking-[0.14em] text-cyan-100 transition hover:bg-cyan-500/15"
                            >
                              Open
                              <ArrowRight className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                          <DisplayBlock
                            label="Bank Name"
                            value={account.bank_name || "—"}
                          />
                          <DisplayBlock
                            label="Beneficiary"
                            value={account.beneficiary_name || "—"}
                          />
                          <DisplayBlock
                            label={getBankIdentifierLabel(account)}
                            value={getBankIdentifierValue(account)}
                          />
                          <DisplayBlock
                            label="Currency"
                            value={account.currency_code || "—"}
                          />
                          <DisplayBlock
                            label="Location"
                            value={
                              [account.city, account.country].filter(Boolean).join(", ") ||
                              "—"
                            }
                          />
                          <DisplayBlock
                            label="Updated"
                            value={formatDateTimeLabel(
                              account.updated_at || account.created_at
                            )}
                          />
                        </div>
                      </div>
                    );
                  })}
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
                  Key company details and linked finance records.
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
                  Archive or restore this company. Permanent delete is only available
                  from the registry archive modal.
                </p>
              </div>

              <div className="grid gap-3 p-5">
                {permissionState.canDeleteArchive ? (
                  <button
                    type="button"
                    onClick={() => void handleArchiveToggle()}
                    disabled={isLifecycleRunning}
                    className={`inline-flex h-12 items-center justify-center gap-2 rounded-2xl border px-5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                      company.status === "archived"
                        ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/15"
                        : "border-rose-400/20 bg-rose-500/10 text-rose-100 hover:bg-rose-500/15"
                    }`}
                  >
                    {isLifecycleRunning ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : company.status === "archived" ? (
                      <RotateCcw className="h-4 w-4" />
                    ) : (
                      <Archive className="h-4 w-4" />
                    )}
                    {company.status === "archived"
                      ? "Restore Company"
                      : "Archive Company"}
                  </button>
                ) : (
                  <div className="rounded-[20px] border border-amber-400/20 bg-amber-500/10 p-4 text-sm leading-6 text-amber-100">
                    Delete/Archive access is not enabled for this user.
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => navigate("/finance/master-data/companies")}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] px-5 text-sm font-semibold text-slate-300 transition hover:bg-white/[0.08]"
                >
                  <ArrowRight className="h-4 w-4 rotate-180" />
                  Companies
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
                <DisplayBlock
                  label="Company Code"
                  value={company.company_code || company.code || "—"}
                />
                <DisplayBlock label="Record ID" value={company.id} />
                <DisplayBlock
                  label="Created"
                  value={formatDateTimeLabel(company.created_at)}
                />
                <DisplayBlock
                  label="Updated"
                  value={formatDateTimeLabel(company.updated_at)}
                />
                <DisplayBlock
                  label="Primary Address"
                  value={getPrimaryAddressSummary(addresses)}
                />
                <DisplayBlock
                  label="Shipping"
                  value={getShippingSummary(shippingAddresses)}
                />
                <DisplayBlock
                  label="Default Bank"
                  value={
                    bankAccounts.find((account) => account.is_default)?.bank_name ||
                    "—"
                  }
                />
              </div>
            </section>

            <section className="rounded-[24px] border border-cyan-400/20 bg-cyan-500/10 p-4 text-sm leading-6 text-cyan-100">
              <div className="font-semibold text-white">Locked detail rule</div>
              <div className="mt-1">
                This page requires Finance Read access. Section edits require Update
                access. Archive and Restore require Delete/Archive access. Bank account
                default updates are silent and must not jump the page or reset the UI.
              </div>
            </section>
          </aside>
        </section>
      </div>
    </div>
  );
}
