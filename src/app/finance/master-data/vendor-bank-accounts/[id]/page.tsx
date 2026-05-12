import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Archive,
  Building2,
  CreditCard,
  FileText,
  Loader2,
  LockKeyhole,
  Pencil,
  RotateCcw,
  Save,
  ShieldCheck,
  WalletCards,
  X,
} from "lucide-react";

import {
  AixiaAccessDeniedState,
  AixiaAccessRule,
  AixiaAlert,
  AixiaBadge,
  AixiaButton,
  AixiaEmptyState,
  AixiaFieldLabel,
  AixiaFormField,
  AixiaFormFullWidth,
  AixiaFormGrid,
  AixiaHero,
  AixiaInputField,
  AixiaLoadingState,
  AixiaPage,
  AixiaReviewBlock,
  AixiaReviewGrid,
  AixiaSection,
  AixiaSelectField,
  AixiaSmartLayout,
  AixiaStatusBadge,
  AixiaTextareaField,
  AixiaValueBlock,
} from "@/components/aixia";

import {
  archiveVendorBankAccount,
  getVendorBankAccountById,
  getVendorOptions,
  restoreVendorBankAccount,
  updateVendorBankAccount,
  type FinanceVendorBankAccount,
  type VendorOption,
} from "@/lib/finance/vendor-bank-accounts";
import type { Permission, Role } from "@/lib/permissions";
import {
  fetchFinanceEffectivePermissions,
  resolveFinancePagePermissionState,
  type FinanceLoadMode,
} from "@/lib/finance/pageAccess";
import { supabase } from "@/lib/supabase";

type LoadMode = FinanceLoadMode;

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

const VENDOR_BANK_ACCOUNT_ACCESS_CONFIG = {
  sectionKey: "masterData",
  adminPermissions: ["manageFinanceMasterData"],
  readPermissions: [
    "accessFinance",
    "viewFinance",
    "manageFinanceMasterData",
    "viewBankAccounts",
    "viewVendors",
    "manageVendors",
    "accessPayables",
    "viewPayables",
  ],
  createPermissions: ["createFinanceRecords", "manageFinanceMasterData", "manageVendors"],
  updatePermissions: ["editFinanceRecords", "manageFinanceMasterData", "manageVendors"],
  deleteArchivePermissions: [
    "archiveFinanceRecords",
    "manageFinanceMasterData",
    "manageVendors",
  ],
} as const;

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

function SectionActions({
  isEditing,
  canEdit,
  isSaving,
  onEdit,
  onCancel,
  onSave,
}: {
  isEditing: boolean;
  canEdit: boolean;
  isSaving: boolean;
  onEdit?: () => void;
  onCancel?: () => void;
  onSave?: () => void;
}) {
  if (!canEdit) return null;

  if (isEditing) {
    return (
      <>
        <AixiaButton
          type="button"
          variant="secondary"
          onClick={onCancel}
          disabled={isSaving}
        >
          <X className="h-3.5 w-3.5" />
          Cancel
        </AixiaButton>

        <AixiaButton
          type="button"
          variant="primary"
          onClick={onSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Save className="h-3.5 w-3.5" />
          )}
          Save
        </AixiaButton>
      </>
    );
  }

  return (
    <AixiaButton type="button" variant="primary" onClick={onEdit}>
      <Pencil className="h-3.5 w-3.5" />
      Edit
    </AixiaButton>
  );
}

export default function FinanceMasterDataVendorBankAccountDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [profile, setProfile] = useState<ProfilePermissionRow | null>(null);
  const [effectivePermissions, setEffectivePermissions] =
    useState<Partial<Record<Permission, boolean>> | null>(null);
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

  const loadCurrentProfile = useCallback(async (mode: LoadMode = "initial") => {
    if (mode === "initial") {
      setIsLoadingProfile(true);
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
            "Silent vendor bank-account ID permission refresh returned no auth user; keeping current permission state."
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
            "Silent vendor bank-account ID profile refresh returned no profile; keeping current permission state."
          );
        }

        return;
      }

      const backendPermissions = await fetchFinanceEffectivePermissions(
        authUserId,
        mode,
        "Vendor Bank Account Detail"
      );

      setProfile(loadedProfile);
      setEffectivePermissions(backendPermissions || loadedProfile.permissions || null);
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
  }, []);

  const loadCurrencyOptions = useCallback(async (mode: LoadMode = "initial") => {
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
  }, []);

  const loadRecord = useCallback(
    async (mode: LoadMode = "initial") => {
      if (!id) return;

      if (mode === "initial") {
        setIsLoadingRecord(true);
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
      void supabase.removeChannel(channel);
    };
  }, [loadCurrencyOptions, loadCurrentProfile, loadRecord]);

  const permissionState = useMemo(() => {
    return resolveFinancePagePermissionState({
      profileRole: profile?.role,
      permissions: effectivePermissions,
      config: VENDOR_BANK_ACCOUNT_ACCESS_CONFIG,
    });
  }, [effectivePermissions, profile?.role]);

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

  const headerStatusCards = useMemo(() => {
    return [
      {
        label: "Read Access",
        value: isLoadingProfile
          ? "Checking"
          : permissionState.canRead
          ? "Enabled"
          : "Locked",
        description:
          "Viewing this record requires Vendor, Bank Account, Payables, Finance, or Master Data read access.",
        icon: permissionState.canRead ? ShieldCheck : LockKeyhole,
        tone: permissionState.canRead ? ("emerald" as const) : ("rose" as const),
      },
      {
        label: "Edit Access",
        value: permissionState.canUpdate ? "Enabled" : "Read Only",
        description:
          "Section edits require Vendor management, Update access, or Master Data admin access.",
        icon: permissionState.canUpdate ? Pencil : LockKeyhole,
        tone: permissionState.canUpdate ? ("cyan" as const) : ("gold" as const),
      },
    ];
  }, [isLoadingProfile, permissionState.canRead, permissionState.canUpdate]);

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
    return (
      <AixiaLoadingState
        title="Loading vendor bank account"
        description="Vendor bank-account record, vendor options, currency master data, and permission state are being checked."
      />
    );
  }

  if (!record) {
    return (
      <AixiaPage>
        <AixiaSection
          title="Vendor bank account not found"
          description="The vendor bank-account record could not be loaded or no longer exists."
          icon={CreditCard}
          actions={
            <AixiaButton
              type="button"
              variant="primary"
              onClick={() => navigate("/finance/master-data/vendor-bank-accounts")}
            >
              Vendor Bank Accounts
            </AixiaButton>
          }
        >
          <AixiaEmptyState
            icon={CreditCard}
            title="Vendor bank account not found"
            description="The vendor bank-account record could not be loaded or no longer exists."
          />
        </AixiaSection>
      </AixiaPage>
    );
  }

  if (!permissionState.canRead) {
    return (
      <AixiaPage>
        <AixiaHero
          parentLabel="Vendor Bank Accounts"
          parentPath="/finance/master-data/vendor-bank-accounts"
          badges={[
            { label: "Access Locked", tone: "rose" },
            { label: "Vendor Bank Account", tone: "cyan" },
          ]}
          gradientTitle="Vendor Bank Account"
          title="Access Locked"
          subtitle="Permission Protected Detail Page"
          description="This page requires Vendor, Bank Account, Payables, Finance, or Master Data read access."
          statusCards={headerStatusCards}
        />

        <AixiaAccessDeniedState
          title="No vendor bank-account read access"
          description="Ask an Admin to assign a Finance role template or user-specific exception with Vendor, Payables, Finance, Bank Account, or Master Data read access."
        />
      </AixiaPage>
    );
  }

  return (
    <AixiaPage>
      <AixiaHero
        parentLabel="Vendor Bank Accounts"
        parentPath="/finance/master-data/vendor-bank-accounts"
        badges={[
          { label: "Vendor Bank Account Detail", tone: "cyan" },
          { label: record.bank_id || "No Bank ID", tone: "neutral" },
          { label: getVendorCodeLabel(record, selectedVendor), tone: "violet" },
          { label: formatStatus(record.status), tone: "emerald" },
          ...(record.is_default
            ? [{ label: "Default", tone: "emerald" as const }]
            : []),
        ]}
        gradientTitle={record.bank_name || "Vendor Bank"}
        title="Account"
        subtitle="Vendor Payout Bank Account"
        description="Vendor payout bank-account record with same-place section editing, lifecycle control, general currency master-data selection, and permission-protected actions."
        statusCards={headerStatusCards}
      />

      {pageError ? <AixiaAlert tone="error">{pageError}</AixiaAlert> : null}
      {pageMessage ? <AixiaAlert tone="success">{pageMessage}</AixiaAlert> : null}

      <AixiaReviewGrid variant="metrics">
        <AixiaValueBlock
          label="Vendor"
          value={getVendorDisplayName(record, selectedVendor)}
          detail={getVendorCodeLabel(record, selectedVendor)}
        />

        <AixiaValueBlock
          label="Bank"
          value={record.bank_name || "—"}
          detail={record.beneficiary_name || "No beneficiary"}
        />

        <AixiaValueBlock
          label={getIdentifierLabel(record)}
          value={getIdentifierValue(record)}
          detail={getCurrencyDisplayLabel(currencyOptions, record.currency_code)}
        />

        <AixiaValueBlock
          label="Lifecycle"
          value={<AixiaStatusBadge value={record.status} />}
          detail={
            record.is_default
              ? "Default vendor payout account"
              : "Standard vendor payout account"
          }
        />
      </AixiaReviewGrid>

      <AixiaSmartLayout
        sidebar="wide"
        balance="main"
        matchColumns
        bottomSpan="never"
        main={
          <>
            <AixiaSection
              title="Vendor Bank Overview"
              description="Vendor linkage, beneficiary, bank name, and account number."
              icon={Building2}
              actions={
                <SectionActions
                  isEditing={editingSection === "overview"}
                  canEdit={permissionState.canUpdate}
                  isSaving={isSaving}
                  onEdit={openOverviewEditor}
                  onCancel={cancelEditing}
                  onSave={() => void saveOverviewSection()}
                />
              }
            >
              {editingSection === "overview" ? (
                <AixiaFormGrid columns="two">
                  <AixiaFormFullWidth>
                    <AixiaFieldLabel label="Vendor" required />
                    <AixiaSelectField
                      value={overviewDraft.vendor_id}
                      disabled={isSaving}
                      onChange={(event) =>
                        handleOverviewVendorChange(event.target.value)
                      }
                    >
                      <option value="">Select vendor</option>
                      {vendors.map((vendor) => (
                        <option key={vendor.id} value={vendor.id}>
                          {(vendor.legal_name?.trim() || vendor.name) +
                            (vendor.code ? ` • ${vendor.code}` : "")}
                        </option>
                      ))}
                    </AixiaSelectField>
                  </AixiaFormFullWidth>

                  <AixiaValueBlock
                    label="Draft Vendor Code"
                    value={draftSelectedVendor?.code || "—"}
                    detail="Pulled from the selected vendor."
                  />

                  <AixiaValueBlock
                    label="Currency Source"
                    value="General currency master data"
                    detail="Vendor bank-account currency is selected in the control section."
                  />

                  <AixiaFormFullWidth>
                    <AixiaFieldLabel label="Beneficiary Name" required />
                    <AixiaInputField
                      value={overviewDraft.beneficiary_name}
                      disabled={isSaving}
                      onChange={(event) =>
                        updateOverviewDraft("beneficiary_name", event.target.value)
                      }
                      placeholder="Beneficiary name"
                    />
                  </AixiaFormFullWidth>

                  <AixiaFormField>
                    <AixiaFieldLabel label="Bank Name" required />
                    <AixiaInputField
                      value={overviewDraft.bank_name}
                      disabled={isSaving}
                      onChange={(event) =>
                        updateOverviewDraft("bank_name", event.target.value)
                      }
                      placeholder="Bank name"
                    />
                  </AixiaFormField>

                  <AixiaFormField>
                    <AixiaFieldLabel label="Account Number" />
                    <AixiaInputField
                      value={overviewDraft.account_number}
                      disabled={isSaving}
                      onChange={(event) =>
                        updateOverviewDraft("account_number", event.target.value)
                      }
                      placeholder="Account number"
                    />
                  </AixiaFormField>
                </AixiaFormGrid>
              ) : (
                <AixiaReviewGrid variant="cards">
                  <AixiaValueBlock
                    label="Vendor"
                    value={getVendorDisplayName(record, selectedVendor)}
                    detail={getVendorCodeLabel(record, selectedVendor)}
                  />
                  <AixiaValueBlock
                    label="Beneficiary Name"
                    value={record.beneficiary_name || "—"}
                  />
                  <AixiaValueBlock label="Bank Name" value={record.bank_name || "—"} />
                  <AixiaValueBlock
                    label="Account Number"
                    value={record.account_number || "—"}
                  />
                </AixiaReviewGrid>
              )}
            </AixiaSection>

            <AixiaSection
              title="Bank Address"
              description="Country, city, postal code, and address lines."
              icon={WalletCards}
              actions={
                <SectionActions
                  isEditing={editingSection === "address"}
                  canEdit={permissionState.canUpdate}
                  isSaving={isSaving}
                  onEdit={openAddressEditor}
                  onCancel={cancelEditing}
                  onSave={() => void saveAddressSection()}
                />
              }
            >
              {editingSection === "address" ? (
                <AixiaFormGrid columns="two">
                  <AixiaFormField>
                    <AixiaFieldLabel label="Country" />
                    <AixiaInputField
                      value={addressDraft.country}
                      disabled={isSaving}
                      onChange={(event) =>
                        updateAddressDraft("country", event.target.value)
                      }
                      placeholder="Country"
                    />
                  </AixiaFormField>

                  <AixiaFormField>
                    <AixiaFieldLabel label="City" />
                    <AixiaInputField
                      value={addressDraft.city}
                      disabled={isSaving}
                      onChange={(event) =>
                        updateAddressDraft("city", event.target.value)
                      }
                      placeholder="City"
                    />
                  </AixiaFormField>

                  <AixiaFormField>
                    <AixiaFieldLabel label="ZIP / Postal Code" />
                    <AixiaInputField
                      value={addressDraft.postal_code}
                      disabled={isSaving}
                      onChange={(event) =>
                        updateAddressDraft("postal_code", event.target.value)
                      }
                      placeholder="Postal code"
                    />
                  </AixiaFormField>

                  <AixiaFormFullWidth>
                    <AixiaFieldLabel label="Address Line 1" />
                    <AixiaInputField
                      value={addressDraft.address_line_1}
                      disabled={isSaving}
                      onChange={(event) =>
                        updateAddressDraft("address_line_1", event.target.value)
                      }
                      placeholder="Address line 1"
                    />
                  </AixiaFormFullWidth>

                  <AixiaFormFullWidth>
                    <AixiaFieldLabel label="Address Line 2" />
                    <AixiaInputField
                      value={addressDraft.address_line_2}
                      disabled={isSaving}
                      onChange={(event) =>
                        updateAddressDraft("address_line_2", event.target.value)
                      }
                      placeholder="Address line 2"
                    />
                  </AixiaFormFullWidth>
                </AixiaFormGrid>
              ) : (
                <AixiaReviewGrid variant="cards">
                  <AixiaValueBlock label="Location" value={getLocationLabel(record)} />
                  <AixiaValueBlock label="Country" value={record.country || "—"} />
                  <AixiaValueBlock label="City" value={record.city || "—"} />
                  <AixiaValueBlock
                    label="ZIP / Postal Code"
                    value={record.postal_code || "—"}
                  />
                  <AixiaValueBlock
                    label="Address Line 1"
                    value={record.address_line_1 || "—"}
                  />
                  <AixiaValueBlock
                    label="Address Line 2"
                    value={record.address_line_2 || "—"}
                  />
                </AixiaReviewGrid>
              )}
            </AixiaSection>

            <AixiaSection
              title="Identifier / Currency / Control"
              description="Identifier type, identifier value, currency master-data selection, default flag, and lifecycle status."
              icon={CreditCard}
              actions={
                <SectionActions
                  isEditing={editingSection === "control"}
                  canEdit={permissionState.canUpdate}
                  isSaving={isSaving}
                  onEdit={openControlEditor}
                  onCancel={cancelEditing}
                  onSave={() => void saveControlSection()}
                />
              }
            >
              {editingSection === "control" ? (
                <AixiaFormGrid columns="two">
                  <AixiaFormField>
                    <AixiaFieldLabel label="Identifier Type" />
                    <AixiaSelectField
                      value={controlDraft.account_identifier_type || ""}
                      disabled={isSaving}
                      onChange={(event) =>
                        updateControlDraft(
                          "account_identifier_type",
                          normalizeIdentifierType(event.target.value) || ""
                        )
                      }
                    >
                      <option value="">None</option>
                      <option value="swift">SWIFT</option>
                      <option value="iban">IBAN</option>
                    </AixiaSelectField>
                  </AixiaFormField>

                  <AixiaFormField>
                    <AixiaFieldLabel label="Identifier Value" />
                    <AixiaInputField
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
                  </AixiaFormField>

                  <AixiaFormField>
                    <AixiaFieldLabel label="Currency" required />
                    <AixiaSelectField
                      value={controlDraft.currency_code}
                      disabled={isSaving}
                      onChange={(event) =>
                        updateControlDraft("currency_code", event.target.value)
                      }
                    >
                      <option value="">Select currency</option>
                      {currencyOptions.map((currency) => (
                        <option key={currency.id} value={currency.currency_code}>
                          {getCurrencyOptionLabel(currency)}
                        </option>
                      ))}
                    </AixiaSelectField>
                  </AixiaFormField>

                  <AixiaFormField>
                    <AixiaFieldLabel label="Status" />
                    <AixiaSelectField
                      value={controlDraft.status}
                      disabled={isSaving}
                      onChange={(event) =>
                        updateControlDraft(
                          "status",
                          normalizeStatus(event.target.value)
                        )
                      }
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="archived">Archived</option>
                    </AixiaSelectField>
                  </AixiaFormField>

                  <AixiaFormField>
                    <AixiaFieldLabel label="Default Payout Account" />
                    <AixiaSelectField
                      value={controlDraft.is_default ? "yes" : "no"}
                      disabled={isSaving}
                      onChange={(event) =>
                        updateControlDraft("is_default", event.target.value === "yes")
                      }
                    >
                      <option value="no">No</option>
                      <option value="yes">Yes</option>
                    </AixiaSelectField>
                  </AixiaFormField>

                  <AixiaValueBlock
                    label="Selected Currency"
                    value={
                      draftSelectedCurrency
                        ? getCurrencyOptionLabel(draftSelectedCurrency)
                        : "No currency selected"
                    }
                    detail="Currency is selected from finance_currencies and saved on this vendor bank-account record."
                  />
                </AixiaFormGrid>
              ) : (
                <AixiaReviewGrid variant="cards">
                  <AixiaValueBlock
                    label="Identifier Type"
                    value={record.account_identifier_type?.toUpperCase() || "—"}
                  />
                  <AixiaValueBlock
                    label="Identifier Value"
                    value={record.account_identifier_value || "—"}
                  />
                  <AixiaValueBlock
                    label="Currency"
                    value={getCurrencyDisplayLabel(currencyOptions, record.currency_code)}
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
                  <AixiaValueBlock
                    label="Default Status"
                    value={
                      record.is_default ? (
                        <AixiaBadge tone="emerald">Default</AixiaBadge>
                      ) : (
                        <AixiaBadge tone="neutral">Standard</AixiaBadge>
                      )
                    }
                  />
                  <AixiaValueBlock
                    label="Lifecycle Status"
                    value={<AixiaStatusBadge value={record.status} />}
                  />
                </AixiaReviewGrid>
              )}
            </AixiaSection>

            <AixiaSection
              title="Notes"
              description="Internal notes for finance operators."
              icon={FileText}
              actions={
                <SectionActions
                  isEditing={editingSection === "notes"}
                  canEdit={permissionState.canUpdate}
                  isSaving={isSaving}
                  onEdit={openNotesEditor}
                  onCancel={cancelEditing}
                  onSave={() => void saveNotesSection()}
                />
              }
            >
              {editingSection === "notes" ? (
                <AixiaFormFullWidth>
                  <AixiaFieldLabel label="Notes" />
                  <AixiaTextareaField
                    value={notesDraft}
                    disabled={isSaving}
                    onChange={(event) => setNotesDraft(event.target.value)}
                    placeholder="Internal notes..."
                  />
                </AixiaFormFullWidth>
              ) : (
                <AixiaValueBlock
                  label="Notes"
                  value={record.notes || "No notes added yet."}
                  detail="Internal finance operator notes."
                />
              )}
            </AixiaSection>
          </>
        }
        side={
          <>
            <AixiaSection
              title="Record Summary"
              description="Key vendor payout account details and current lifecycle."
              icon={CreditCard}
            >
              <AixiaReviewGrid variant="compact">
                <AixiaReviewBlock
                  label="Vendor"
                  value={getVendorDisplayName(record, selectedVendor)}
                  description={getVendorCodeLabel(record, selectedVendor)}
                />
                <AixiaReviewBlock
                  label="Bank"
                  value={record.bank_name || "—"}
                  description={record.beneficiary_name || "No beneficiary"}
                />
                <AixiaReviewBlock
                  label={getIdentifierLabel(record)}
                  value={getIdentifierValue(record)}
                  description={getCurrencyDisplayLabel(
                    currencyOptions,
                    record.currency_code
                  )}
                />
                <AixiaReviewBlock
                  label="Lifecycle"
                  value={formatStatus(record.status)}
                  description={
                    record.is_default
                      ? "Default vendor payout account"
                      : "Standard vendor payout account"
                  }
                />
              </AixiaReviewGrid>
            </AixiaSection>

            <AixiaSection
              title="Lifecycle Actions"
              description="Archive or restore this vendor bank account. Permanent delete is only available from the registry archive modal."
              icon={Archive}
            >
              <div className="aixia-stack">
                {permissionState.canDeleteArchive ? (
                  <AixiaButton
                    type="button"
                    variant={record.status === "archived" ? "secondary" : "danger"}
                    onClick={() => void handleArchiveToggle()}
                    disabled={isLifecycleRunning}
                  >
                    {isLifecycleRunning ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : record.status === "archived" ? (
                      <RotateCcw className="h-4 w-4" />
                    ) : (
                      <Archive className="h-4 w-4" />
                    )}
                    {record.status === "archived" ? "Restore Account" : "Archive Account"}
                  </AixiaButton>
                ) : (
                  <AixiaAlert tone="info">
                    Delete/Archive access is not enabled for this user.
                  </AixiaAlert>
                )}

                <AixiaButton
                  type="button"
                  variant="secondary"
                  onClick={() => navigate("/finance/master-data/vendor-bank-accounts")}
                >
                  Vendor Bank Accounts
                </AixiaButton>
              </div>
            </AixiaSection>

            <AixiaSection
              title="System Fields"
              description="Read-only audit and system metadata."
              icon={ShieldCheck}
            >
              <AixiaReviewGrid variant="compact">
                <AixiaReviewBlock
                  label="Bank ID"
                  value={record.bank_id || "—"}
                  description="Vendor bank-account display ID."
                />
                <AixiaReviewBlock
                  label="Record ID"
                  value={record.id}
                  description="Database record identifier."
                />
                <AixiaReviewBlock
                  label="Vendor ID"
                  value={record.vendor_id || "—"}
                  description="Linked vendor record."
                />
                <AixiaReviewBlock
                  label="Created"
                  value={formatDateTimeLabel(record.created_at)}
                  description="Audit timestamp."
                />
                <AixiaReviewBlock
                  label="Updated"
                  value={formatDateTimeLabel(record.updated_at)}
                  description="Audit timestamp."
                />
                <AixiaReviewBlock
                  label="Currency Source"
                  value="finance_currencies"
                  description="Currency is selected from general AiXia master data and saved on this record."
                />
              </AixiaReviewGrid>
            </AixiaSection>

            <AixiaAccessRule
              title="Locked access rule"
              description="Finance detail pages must use shared AiXia source-of-truth components."
            >
              This page requires Vendor, Payables, Finance, Bank Account, or Master Data
              read access. Section edits require Update or Vendor management access. Archive
              and Restore require Delete/Archive access. Permanent delete is intentionally
              not available on the ID page. Currency must come from the general
              finance_currencies master-data table and is saved directly on this vendor
              bank-account record.
            </AixiaAccessRule>
          </>
        }
      />
    </AixiaPage>
  );
}
