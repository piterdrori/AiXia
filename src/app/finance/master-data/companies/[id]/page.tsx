import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import {
  Archive,
  ArrowRight,
  Banknote,
  Building2,
  FileText,
  Landmark,
  Loader2,
  LockKeyhole,
  MapPin,
  Pencil,
  Plus,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Truck,
  UserRound,
  Users,
} from "lucide-react";

import {
  AixiaAccessDeniedState,
  AixiaActionStack,
  AixiaAlert,
  AixiaAlertText,
  AixiaButton,
  AixiaCheckboxField,
  AixiaDefaultBadge,
  AixiaDetailSection,
  AixiaDisplayBlock,
  AixiaEmptyState,
  AixiaFieldLabel,
  AixiaFormField,
  AixiaFormFullWidth,
  AixiaFormGrid,
  AixiaFormRowCard,
  AixiaHero,
  AixiaInputField,
  AixiaLoadingState,
  AixiaNotFoundState,
  AixiaPage,
  AixiaReviewBlock,
  AixiaReviewGrid,
  AixiaSection,
  AixiaSelectField,
  AixiaSmartLayout,
  AixiaStatusBadge,
  AixiaTextareaField,
} from "@/components/aixia";
import { archiveCompany, updateCompany } from "@/lib/finance/companies";
import {
  getEffectivePermissions,
  type Permission,
  type Role,
} from "@/lib/permissions";
import { supabase } from "@/lib/supabase";

type LoadMode = "initial" | "silent";

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
  description: string;
  icon: LucideIcon;
  tone: "emerald" | "cyan" | "amber" | "rose";
};

type SummaryItem = {
  label: string;
  value: string;
  description: string;
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
  currency_code: "",
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
  userId: string,
  mode: LoadMode
): Promise<Partial<Record<Permission, boolean>> | null> {
  try {
    const result = await supabase.rpc("finance_get_effective_permissions", {
      target_user_id: userId,
    });

    if (result.error) {
      if (mode === "silent") {
        throw result.error;
      }

      console.warn("Company ID permission RPC fallback:", result.error.message);
      return null;
    }

    if (!result.data || typeof result.data !== "object") {
      if (mode === "silent") {
        throw new Error(
          "Silent company ID permission refresh returned no effective permission payload."
        );
      }

      return null;
    }

    return result.data as Partial<Record<Permission, boolean>>;
  } catch (error) {
    if (mode === "silent") {
      throw error;
    }

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

function getCurrencyOptionLabel(currency: CurrencyOption) {
  return `${currency.currency_code} — ${currency.currency_name}${
    currency.currency_symbol ? ` (${currency.currency_symbol})` : ""
  }${currency.is_base_currency ? " • Base" : ""}`;
}

function mapPrimaryAddressToDraft(row: AddressRow): AddressDraftRow {
  return {
    id: row.id,
    country: row.country || "",
    city: row.city || "",
    state_province: row.state_province || "",
    postal_code: row.postal_code || "",
    address_line_1: row.address_line_1 || "",
    address_line_2: row.address_line_2 || "",
  };
}

function mapShippingAddressToDraft(row: AddressRow): ShippingDraftRow {
  return {
    id: row.id,
    same_as_primary: row.is_same_as_primary,
    source_address_id: "",
    country: row.country || "",
    city: row.city || "",
    state_province: row.state_province || "",
    postal_code: row.postal_code || "",
    address_line_1: row.address_line_1 || "",
    address_line_2: row.address_line_2 || "",
  };
}

function isSamePrimarySummary(row: ShippingDraftRow) {
  return row.same_as_primary
    ? "Linked to a primary address."
    : "Standalone shipping address.";
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
  const [backgroundRefreshing, setBackgroundRefreshing] = useState(false);
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
        } else {
          console.warn(
            "Silent company ID profile refresh returned no auth user; keeping current profile and permissions."
          );
        }

        return;
      }

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
            "Silent company ID profile refresh returned no profile; keeping current profile and permissions."
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
            "Silent company ID profile refresh returned no role; keeping current permissions."
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
      console.error("Failed to load company ID permissions:", error);

      if (mode === "initial") {
        setProfile(null);
        setEffectivePermissions(null);
      }
    } finally {
      if (mode === "initial") {
        setIsLoadingProfile(false);
      } else {
        setBackgroundRefreshing(false);
      }
    }
  }, []);

  const loadCompany = useCallback(async (mode: LoadMode = "initial") => {
    if (!id) return;

    if (mode === "initial") {
      setIsLoadingCompany(true);
      setPageError(null);
    } else {
      setBackgroundRefreshing(true);
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

      if (mode === "initial") {
        setPageError(null);
      }
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
      } else {
        setBackgroundRefreshing(false);
      }
    }
  }, [id]);

  const loadCurrencyOptions = useCallback(async (mode: LoadMode = "initial") => {
    if (mode === "silent") {
      setBackgroundRefreshing(true);
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
      }
    } finally {
      if (mode === "silent") {
        setBackgroundRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    void Promise.all([
      loadCurrentProfile("initial"),
      loadCompany("initial"),
      loadCurrencyOptions("initial"),
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
        () => void loadCurrencyOptions("silent")
      )
      .subscribe();

    const intervalId = window.setInterval(() => {
      void Promise.all([
        loadCurrentProfile("silent"),
        loadCompany("silent"),
        loadCurrencyOptions("silent"),
      ]);
    }, 60000);

    return () => {
      window.clearInterval(intervalId);
      void supabase.removeChannel(channel);
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
        description: "Viewing this record requires Finance read access.",
        icon: permissionState.canRead ? ShieldCheck : LockKeyhole,
        tone: permissionState.canRead ? "emerald" : "rose",
      },
      {
        label: "Edit Access",
        value: permissionState.canUpdate ? "Enabled" : "Read Only",
        description: "Section edits require Update access or Master Data admin access.",
        icon: permissionState.canUpdate ? Pencil : LockKeyhole,
        tone: permissionState.canUpdate ? "cyan" : "amber",
      },
      {
        label: "Lifecycle Access",
        value: permissionState.canDeleteArchive ? "Archive Enabled" : "Locked",
        description: backgroundRefreshing
          ? "Silent refresh is updating data without disturbing the page."
          : "Archive and Restore require Delete/Archive access.",
        icon: permissionState.canDeleteArchive ? Archive : LockKeyhole,
        tone: permissionState.canDeleteArchive ? "amber" : "rose",
      },
    ];
  }, [
    backgroundRefreshing,
    isLoadingProfile,
    permissionState.canDeleteArchive,
    permissionState.canRead,
    permissionState.canUpdate,
  ]);

  const summaryItems = useMemo<SummaryItem[]>(() => {
    return [
      {
        label: "Company",
        value: getCompanyDisplayName(company),
        description: company?.company_code || company?.code || "No company code",
      },
      {
        label: "Contact",
        value: getCompanyContactLabel(company),
        description: `${getCompanyEmailLabel(company)} • ${getCompanyPhoneLabel(company)}`,
      },
      {
        label: "Currency",
        value: company?.currency_code || "—",
        description: `${personnel.length} personnel row${
          personnel.length === 1 ? "" : "s"
        }`,
      },
      {
        label: "Bank Accounts",
        value: `${bankAccounts.length}`,
        description:
          bankAccounts.find((account) => account.is_default)?.bank_name ||
          "No default bank account",
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
      currency_code: company.currency_code || "",
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
        ? addresses.map(mapPrimaryAddressToDraft)
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
        ? addresses.map(mapPrimaryAddressToDraft)
        : [createEmptyAddressDraftRow()]
    );
    setShippingDraft(
      shippingAddresses.length > 0
        ? shippingAddresses.map(mapShippingAddressToDraft)
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

      const nextCurrencyCode = identityDraft.currency_code || null;

      await updateCompany(company.id, {
        currency_code: nextCurrencyCode,
        registration_number: identityDraft.registration_number.trim() || null,
        tax_number: identityDraft.tax_number.trim() || null,
        website: identityDraft.website.trim() || null,
      });

      if (nextCurrencyCode) {
        const { error: bankCurrencyError } = await supabase
          .from("finance_bank_accounts")
          .update({ currency_code: nextCurrencyCode })
          .eq("company_id", company.id);

        if (bankCurrencyError) throw bankCurrencyError;
      }

      setEditingSection(null);
      setPageMessage(
        "Company identity updated. Linked bank account currencies synchronized."
      );
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
    return (
      <AixiaLoadingState
        title="Loading company detail"
        description="Company record and permission state are being checked."
      />
    );
  }

  if (!company) {
    return (
      <AixiaPage>
        <AixiaNotFoundState
          title="Company not found"
          description="The company record could not be loaded or no longer exists."
          action={
            <AixiaButton
              type="button"
              variant="secondary"
              onClick={() => navigate("/finance/master-data/companies")}
            >
              <ArrowRight className="h-4 w-4 rotate-180" />
              Companies
            </AixiaButton>
          }
        />
      </AixiaPage>
    );
  }

  if (!permissionState.canRead) {
    return (
      <AixiaPage>
        <AixiaHero
          parentLabel="Companies"
          parentPath="/finance/master-data/companies"
          badges={[
            { label: "Access Locked", tone: "rose" },
            { label: "Permission protected", tone: "cyan" },
          ]}
          gradientTitle="Company"
          title="Access Locked"
          subtitle="Read Permission Required"
          description="This page requires Finance read access or Master Data admin access."
          statusCards={[
            {
              label: "Read Access",
              value: "Locked",
              description:
                "Ask an Admin to assign a Finance role template or user-specific exception with Finance read access.",
              icon: LockKeyhole,
              tone: "rose",
            },
          ]}
        />

        <AixiaAccessDeniedState
          title="No company read access"
          description="Ask an Admin to assign a Finance role template or user-specific exception with Finance read access."
        />
      </AixiaPage>
    );
  }

  return (
    <AixiaPage>
      <AixiaHero
        parentLabel="Companies"
        parentPath="/finance/master-data/companies"
        badges={[
          { label: "Company Detail", tone: "cyan" },
          { label: company.company_code || company.code || "No Company Code", tone: "neutral" },
          { label: company.currency_code || "No Currency", tone: "emerald" },
          { label: formatStatus(company.status), tone: "amber" },
        ]}
        gradientTitle={getCompanyDisplayName(company)}
        title="Company"
        subtitle="Internal Legal Entity Master Data"
        description="Internal company record with same-place section editing, company identity, personnel, primary addresses, shipping addresses, linked bank accounts, notes, and lifecycle control."
        statusCards={headerStatusCards}
      />

      {pageError ? <AixiaAlert tone="error">{pageError}</AixiaAlert> : null}
      {pageMessage ? <AixiaAlert tone="success">{pageMessage}</AixiaAlert> : null}

      <AixiaSmartLayout
        sidebar="normal"
        balance="main"
        bottomSpan="never"
        sideRebalance="last-to-bottom"
        mainTopCount={3}
        main={
          <>
            <AixiaDetailSection
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
                <AixiaFormGrid columns="two">
                  <AixiaFormFullWidth>
                    <AixiaFieldLabel label="Legal Name" required />
                    <AixiaInputField
                      value={overviewDraft.legal_name}
                      disabled={isSaving}
                      onChange={(event) =>
                        updateOverviewDraft("legal_name", event.target.value)
                      }
                      placeholder="Legal company name"
                    />
                  </AixiaFormFullWidth>

                  <AixiaFormFullWidth>
                    <AixiaFieldLabel label="Display Name" />
                    <AixiaInputField
                      value={overviewDraft.display_name}
                      disabled={isSaving}
                      onChange={(event) =>
                        updateOverviewDraft("display_name", event.target.value)
                      }
                      placeholder="Display name"
                    />
                  </AixiaFormFullWidth>

                  <AixiaFormField>
                    <AixiaFieldLabel label="Primary Contact" />
                    <AixiaInputField
                      value={overviewDraft.contact_person}
                      disabled={isSaving}
                      onChange={(event) =>
                        updateOverviewDraft("contact_person", event.target.value)
                      }
                      placeholder="Primary contact"
                    />
                  </AixiaFormField>

                  <AixiaFormField>
                    <AixiaFieldLabel label="Email" />
                    <AixiaInputField
                      type="email"
                      value={overviewDraft.email}
                      disabled={isSaving}
                      onChange={(event) =>
                        updateOverviewDraft("email", event.target.value)
                      }
                      placeholder="company@email.com"
                    />
                  </AixiaFormField>

                  <AixiaFormField>
                    <AixiaFieldLabel label="Phone" />
                    <AixiaInputField
                      value={overviewDraft.phone}
                      disabled={isSaving}
                      onChange={(event) =>
                        updateOverviewDraft("phone", event.target.value)
                      }
                      placeholder="Company phone"
                    />
                  </AixiaFormField>

                  <AixiaFormField>
                    <AixiaFieldLabel label="Status" />
                    <AixiaSelectField
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
                    </AixiaSelectField>
                  </AixiaFormField>
                </AixiaFormGrid>
              ) : (
                <AixiaFormGrid columns="two">
                  <AixiaDisplayBlock
                    label="Legal Name"
                    value={getCompanyDisplayName(company)}
                  />
                  <AixiaDisplayBlock
                    label="Display Name"
                    value={company.name || "—"}
                  />
                  <AixiaDisplayBlock
                    label="Primary Contact"
                    value={company.contact_person || "—"}
                  />
                  <AixiaDisplayBlock label="Email" value={company.email || "—"} />
                  <AixiaDisplayBlock label="Phone" value={company.phone || "—"} />
                  <AixiaDisplayBlock
                    label="Lifecycle Status"
                    value={<AixiaStatusBadge value={company.status} />}
                  />
                </AixiaFormGrid>
              )}
            </AixiaDetailSection>

            <AixiaDetailSection
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
                <AixiaFormGrid columns="two">
                  <AixiaDisplayBlock
                    label="Company Code"
                    value={company.company_code || company.code || "Auto-generated by system"}
                    detail="System-assigned code."
                  />

                  <AixiaFormField>
                    <AixiaFieldLabel label="Currency Code" />
                    <AixiaSelectField
                      value={identityDraft.currency_code}
                      disabled={isSaving}
                      onChange={(event) =>
                        updateIdentityDraft("currency_code", event.target.value)
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
                            {getCurrencyOptionLabel(currency)}
                          </option>
                        ))
                      )}
                    </AixiaSelectField>
                  </AixiaFormField>

                  <AixiaFormField>
                    <AixiaFieldLabel label="Registration Number" />
                    <AixiaInputField
                      value={identityDraft.registration_number}
                      disabled={isSaving}
                      onChange={(event) =>
                        updateIdentityDraft("registration_number", event.target.value)
                      }
                      placeholder="Registration number"
                    />
                  </AixiaFormField>

                  <AixiaFormField>
                    <AixiaFieldLabel label="Tax Number" />
                    <AixiaInputField
                      value={identityDraft.tax_number}
                      disabled={isSaving}
                      onChange={(event) =>
                        updateIdentityDraft("tax_number", event.target.value)
                      }
                      placeholder="Tax number"
                    />
                  </AixiaFormField>

                  <AixiaFormFullWidth>
                    <AixiaFieldLabel label="Website" />
                    <AixiaInputField
                      value={identityDraft.website}
                      disabled={isSaving}
                      onChange={(event) =>
                        updateIdentityDraft("website", event.target.value)
                      }
                      placeholder="https://example.com"
                    />
                  </AixiaFormFullWidth>
                </AixiaFormGrid>
              ) : (
                <AixiaFormGrid columns="two">
                  <AixiaDisplayBlock
                    label="Company Code"
                    value={company.company_code || company.code || "—"}
                  />
                  <AixiaDisplayBlock
                    label="Currency Code"
                    value={company.currency_code || "—"}
                  />
                  <AixiaDisplayBlock
                    label="Registration Number"
                    value={company.registration_number || "—"}
                  />
                  <AixiaDisplayBlock
                    label="Tax Number"
                    value={company.tax_number || "—"}
                  />
                  <AixiaDisplayBlock label="Website" value={company.website || "—"} />
                  <AixiaDisplayBlock
                    label="Created"
                    value={formatDateTimeLabel(company.created_at)}
                  />
                </AixiaFormGrid>
              )}
            </AixiaDetailSection>

            <AixiaDetailSection
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
                <>
                  <AixiaActionStack>
                    <AixiaButton
                      type="button"
                      variant="secondary"
                      onClick={addPersonnelDraftRow}
                      disabled={isSaving}
                    >
                      <Plus className="h-4 w-4" />
                      Add Person
                    </AixiaButton>
                  </AixiaActionStack>

                  <div className="aixia-form-row-list">
                    {personnelDraft.map((row, index) => (
                      <AixiaFormRowCard
                        key={row.id}
                        title={`Person ${index + 1}`}
                        description={index === 0 ? "Primary personnel row." : undefined}
                        onRemove={() => removePersonnelDraftRow(row.id)}
                        removeDisabled={isSaving || personnelDraft.length === 1}
                      >
                        <AixiaFormGrid columns="two">
                          <AixiaFormField>
                            <AixiaFieldLabel label="Name" />
                            <AixiaInputField
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
                          </AixiaFormField>

                          <AixiaFormField>
                            <AixiaFieldLabel label="Position" />
                            <AixiaInputField
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
                          </AixiaFormField>

                          <AixiaFormField>
                            <AixiaFieldLabel label="Phone" />
                            <AixiaInputField
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
                          </AixiaFormField>

                          <AixiaFormField>
                            <AixiaFieldLabel label="Email" />
                            <AixiaInputField
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
                          </AixiaFormField>
                        </AixiaFormGrid>
                      </AixiaFormRowCard>
                    ))}
                  </div>
                </>
              ) : personnel.length === 0 ? (
                <AixiaEmptyState
                  icon={UserRound}
                  title="No personnel added yet"
                  description="Company personnel records will appear here after they are added."
                />
              ) : (
                <div className="aixia-form-row-list">
                  {personnel.map((row, index) => (
                    <AixiaFormRowCard
                      key={row.id}
                      title={`Person ${index + 1}`}
                      description={row.is_primary ? "Primary personnel row." : undefined}
                    >
                      <AixiaFormGrid columns="two">
                        <AixiaDisplayBlock label="Name" value={row.full_name || "—"} />
                        <AixiaDisplayBlock label="Position" value={row.position || "—"} />
                        <AixiaDisplayBlock label="Phone" value={row.phone || "—"} />
                        <AixiaDisplayBlock label="Email" value={row.email || "—"} />
                      </AixiaFormGrid>
                    </AixiaFormRowCard>
                  ))}
                </div>
              )}
            </AixiaDetailSection>

            <AixiaDetailSection
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
                <>
                  <AixiaActionStack>
                    <AixiaButton
                      type="button"
                      variant="secondary"
                      onClick={addAddressDraftRow}
                      disabled={isSaving}
                    >
                      <Plus className="h-4 w-4" />
                      Add Address
                    </AixiaButton>
                  </AixiaActionStack>

                  <div className="aixia-form-row-list">
                    {addressDraft.map((row, index) => (
                      <AixiaFormRowCard
                        key={row.id}
                        title={`Address ${index + 1}`}
                        description={index === 0 ? "Primary address row." : undefined}
                        onRemove={() => removeAddressDraftRow(row.id)}
                        removeDisabled={isSaving || addressDraft.length === 1}
                      >
                        <AixiaFormGrid columns="two">
                          <AixiaFormField>
                            <AixiaFieldLabel label="Country" />
                            <AixiaInputField
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
                          </AixiaFormField>

                          <AixiaFormField>
                            <AixiaFieldLabel label="City" />
                            <AixiaInputField
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
                          </AixiaFormField>

                          <AixiaFormField>
                            <AixiaFieldLabel label="State / Province" />
                            <AixiaInputField
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
                          </AixiaFormField>

                          <AixiaFormField>
                            <AixiaFieldLabel label="ZIP / Postal Code" />
                            <AixiaInputField
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
                          </AixiaFormField>

                          <AixiaFormFullWidth>
                            <AixiaFieldLabel label="Address Line 1" />
                            <AixiaInputField
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
                          </AixiaFormFullWidth>

                          <AixiaFormFullWidth>
                            <AixiaFieldLabel label="Address Line 2" />
                            <AixiaInputField
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
                          </AixiaFormFullWidth>
                        </AixiaFormGrid>
                      </AixiaFormRowCard>
                    ))}
                  </div>
                </>
              ) : addresses.length === 0 ? (
                <AixiaEmptyState
                  icon={MapPin}
                  title="No primary addresses added yet"
                  description="Primary legal and billing addresses will appear here after they are added."
                />
              ) : (
                <div className="aixia-form-row-list">
                  {addresses.map((row, index) => (
                    <AixiaFormRowCard
                      key={row.id}
                      title={`Address ${index + 1}`}
                      description={row.is_primary ? "Primary address row." : undefined}
                    >
                      <AixiaFormGrid columns="two">
                        <AixiaDisplayBlock label="Country" value={row.country || "—"} />
                        <AixiaDisplayBlock label="City" value={row.city || "—"} />
                        <AixiaDisplayBlock
                          label="State / Province"
                          value={row.state_province || "—"}
                        />
                        <AixiaDisplayBlock
                          label="ZIP / Postal Code"
                          value={row.postal_code || "—"}
                        />
                        <AixiaDisplayBlock
                          label="Address Line 1"
                          value={row.address_line_1 || "—"}
                        />
                        <AixiaDisplayBlock
                          label="Address Line 2"
                          value={row.address_line_2 || "—"}
                        />
                      </AixiaFormGrid>
                    </AixiaFormRowCard>
                  ))}
                </div>
              )}
            </AixiaDetailSection>

            <AixiaDetailSection
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
                <>
                  <AixiaActionStack>
                    <AixiaButton
                      type="button"
                      variant="secondary"
                      onClick={addShippingDraftRow}
                      disabled={isSaving}
                    >
                      <Plus className="h-4 w-4" />
                      Add Shipping
                    </AixiaButton>
                  </AixiaActionStack>

                  <div className="aixia-form-row-list">
                    {shippingDraft.map((row, index) => (
                      <AixiaFormRowCard
                        key={row.id}
                        title={`Shipping ${index + 1}`}
                        description={isSamePrimarySummary(row)}
                        onRemove={() => removeShippingDraftRow(row.id)}
                        removeDisabled={isSaving || shippingDraft.length === 1}
                      >
                        <AixiaFormGrid columns="two">
                          <AixiaFormFullWidth>
                            <AixiaCheckboxField
                              checked={row.same_as_primary}
                              disabled={isSaving}
                              onChange={(event) =>
                                updateShippingDraftRow(
                                  row.id,
                                  "same_as_primary",
                                  event.target.checked
                                )
                              }
                              label="Same as primary address"
                              description="Select one primary address and copy its values into this shipping row."
                            />
                          </AixiaFormFullWidth>

                          {row.same_as_primary ? (
                            <AixiaFormFullWidth>
                              <AixiaFieldLabel label="Source Primary Address" />
                              <AixiaSelectField
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
                              </AixiaSelectField>
                            </AixiaFormFullWidth>
                          ) : (
                            <>
                              <AixiaFormField>
                                <AixiaFieldLabel label="Country" />
                                <AixiaInputField
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
                              </AixiaFormField>

                              <AixiaFormField>
                                <AixiaFieldLabel label="City" />
                                <AixiaInputField
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
                              </AixiaFormField>

                              <AixiaFormField>
                                <AixiaFieldLabel label="State / Province" />
                                <AixiaInputField
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
                              </AixiaFormField>

                              <AixiaFormField>
                                <AixiaFieldLabel label="ZIP / Postal Code" />
                                <AixiaInputField
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
                              </AixiaFormField>

                              <AixiaFormFullWidth>
                                <AixiaFieldLabel label="Address Line 1" />
                                <AixiaInputField
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
                              </AixiaFormFullWidth>

                              <AixiaFormFullWidth>
                                <AixiaFieldLabel label="Address Line 2" />
                                <AixiaInputField
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
                              </AixiaFormFullWidth>
                            </>
                          )}
                        </AixiaFormGrid>
                      </AixiaFormRowCard>
                    ))}
                  </div>
                </>
              ) : shippingAddresses.length === 0 ? (
                <AixiaEmptyState
                  icon={Truck}
                  title="No shipping addresses added yet"
                  description="Shipping destination records will appear here after they are added."
                />
              ) : (
                <div className="aixia-form-row-list">
                  {shippingAddresses.map((row, index) => (
                    <AixiaFormRowCard
                      key={row.id}
                      title={`Shipping ${index + 1}`}
                      description={
                        row.is_same_as_primary
                          ? "Same as primary address."
                          : "Standalone shipping address."
                      }
                    >
                      {row.is_same_as_primary ? (
                        <AixiaAlert tone="info">
                          <AixiaAlertText
                            title="Same as primary address"
                            description="This shipping row is linked to the primary address."
                          />
                        </AixiaAlert>
                      ) : (
                        <AixiaFormGrid columns="two">
                          <AixiaDisplayBlock label="Country" value={row.country || "—"} />
                          <AixiaDisplayBlock label="City" value={row.city || "—"} />
                          <AixiaDisplayBlock
                            label="State / Province"
                            value={row.state_province || "—"}
                          />
                          <AixiaDisplayBlock
                            label="ZIP / Postal Code"
                            value={row.postal_code || "—"}
                          />
                          <AixiaDisplayBlock
                            label="Address Line 1"
                            value={row.address_line_1 || "—"}
                          />
                          <AixiaDisplayBlock
                            label="Address Line 2"
                            value={row.address_line_2 || "—"}
                          />
                        </AixiaFormGrid>
                      )}
                    </AixiaFormRowCard>
                  ))}
                </div>
              )}
            </AixiaDetailSection>

            <AixiaDetailSection
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
                <AixiaFormField>
                  <AixiaFieldLabel label="Notes" />
                  <AixiaTextareaField
                    value={notesDraft}
                    disabled={isSaving}
                    onChange={(event) => setNotesDraft(event.target.value)}
                    placeholder="Internal notes..."
                  />
                </AixiaFormField>
              ) : (
                <AixiaDisplayBlock
                  label="Notes"
                  value={company.notes || "No notes added yet."}
                />
              )}
            </AixiaDetailSection>

            <AixiaSection
              title="Bank Accounts"
              description="Company bank accounts linked to this internal entity."
              icon={Banknote}
              actions={
                permissionState.canUpdate ? (
                  <AixiaButton
                    type="button"
                    variant="secondary"
                    onClick={() =>
                      navigate(`/finance/master-data/bank-accounts/new?company_id=${id}`)
                    }
                  >
                    <Plus className="h-4 w-4" />
                    Add Bank Account
                  </AixiaButton>
                ) : null
              }
            >
              {bankAccounts.length === 0 ? (
                <AixiaEmptyState
                  icon={Banknote}
                  title="No bank accounts added yet"
                  description="Company bank accounts will appear here after they are created."
                />
              ) : (
                <div className="aixia-form-row-list">
                  {bankAccounts.map((account, index) => {
                    const isBankActionRunning = activeBankActionId === account.id;

                    return (
                      <AixiaFormRowCard
                        key={account.id}
                        title={`Account ${index + 1}`}
                        description={account.bank_id || "No bank ID"}
                      >
                        <AixiaFormGrid columns="three">
                          <AixiaDisplayBlock
                            label="Default Status"
                            value={<AixiaDefaultBadge isDefault={Boolean(account.is_default)} />}
                          />

                          <AixiaDisplayBlock
                            label="Lifecycle Status"
                            value={<AixiaStatusBadge value={account.status || "unknown"} />}
                          />

                          <AixiaDisplayBlock
                            label="Bank Name"
                            value={account.bank_name || "—"}
                          />

                          <AixiaDisplayBlock
                            label="Beneficiary"
                            value={account.beneficiary_name || "—"}
                          />

                          <AixiaDisplayBlock
                            label={getBankIdentifierLabel(account)}
                            value={getBankIdentifierValue(account)}
                          />

                          <AixiaDisplayBlock
                            label="Currency"
                            value={company.currency_code || account.currency_code || "—"}
                            detail="Pulled from the company currency. Bank account currency follows the company."
                          />

                          <AixiaDisplayBlock
                            label="Location"
                            value={
                              [account.city, account.country].filter(Boolean).join(", ") ||
                              "—"
                            }
                          />

                          <AixiaDisplayBlock
                            label="Updated"
                            value={formatDateTimeLabel(
                              account.updated_at || account.created_at
                            )}
                          />
                        </AixiaFormGrid>

                        <AixiaActionStack>
                          {!account.is_default && permissionState.canUpdate ? (
                            <AixiaButton
                              type="button"
                              variant="secondary"
                              onClick={() =>
                                void handleSetDefaultBankAccount(account.id)
                              }
                              disabled={Boolean(activeBankActionId)}
                            >
                              {isBankActionRunning ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <ShieldCheck className="h-4 w-4" />
                              )}
                              Set Default
                            </AixiaButton>
                          ) : null}

                          <AixiaButton
                            type="button"
                            variant="primary"
                            onClick={() =>
                              navigate(`/finance/master-data/bank-accounts/${account.id}`)
                            }
                          >
                            Open
                            <ArrowRight className="h-4 w-4" />
                          </AixiaButton>
                        </AixiaActionStack>
                      </AixiaFormRowCard>
                    );
                  })}
                </div>
              )}
            </AixiaSection>
          </>
        }
        side={
          <>
            <AixiaSection
              title="Record Summary"
              description="Key company details and linked finance records."
              icon={Sparkles}
            >
              <AixiaReviewGrid>
                {summaryItems.map((item) => (
                  <AixiaReviewBlock
                    key={item.label}
                    label={item.label}
                    value={item.value}
                    description={item.description}
                  />
                ))}
              </AixiaReviewGrid>
            </AixiaSection>

            <AixiaSection
              title="Lifecycle Actions"
              description="Archive or restore this company. Permanent delete is only available from the registry archive modal."
              icon={Archive}
            >
              <AixiaActionStack>
                {permissionState.canDeleteArchive ? (
                  <AixiaButton
                    type="button"
                    variant={company.status === "archived" ? "secondary" : "danger"}
                    onClick={() => void handleArchiveToggle()}
                    disabled={isLifecycleRunning}
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
                  </AixiaButton>
                ) : (
                  <AixiaAlert tone="info">
                    <AixiaAlertText
                      title="Lifecycle access locked"
                      description="Delete/Archive access is not enabled for this user."
                    />
                  </AixiaAlert>
                )}

                <AixiaButton
                  type="button"
                  variant="secondary"
                  onClick={() => navigate("/finance/master-data/companies")}
                >
                  <ArrowRight className="h-4 w-4 rotate-180" />
                  Companies
                </AixiaButton>
              </AixiaActionStack>
            </AixiaSection>

            <AixiaSection
              title="System Fields"
              description="Read-only audit and system metadata."
              icon={Landmark}
            >
              <AixiaReviewGrid>
                <AixiaReviewBlock
                  label="Company Code"
                  value={company.company_code || company.code || "—"}
                />
                <AixiaReviewBlock label="Record ID" value={company.id} />
                <AixiaReviewBlock
                  label="Created"
                  value={formatDateTimeLabel(company.created_at)}
                />
                <AixiaReviewBlock
                  label="Updated"
                  value={formatDateTimeLabel(company.updated_at)}
                />
                <AixiaReviewBlock
                  label="Primary Address"
                  value={getPrimaryAddressSummary(addresses)}
                />
                <AixiaReviewBlock
                  label="Shipping"
                  value={getShippingSummary(shippingAddresses)}
                />
                <AixiaReviewBlock
                  label="Default Bank"
                  value={
                    bankAccounts.find((account) => account.is_default)?.bank_name ||
                    "—"
                  }
                />
              </AixiaReviewGrid>
            </AixiaSection>

            <AixiaAlert tone="info">
              <AixiaAlertText
                title="Locked detail rule"
                description="This page requires Finance Read access. Section edits require Update access. Archive and Restore require Delete/Archive access. Bank account default updates and background refresh must not jump the page or reset the UI."
              />
            </AixiaAlert>
          </>
        }
      />
    </AixiaPage>
  );
}
