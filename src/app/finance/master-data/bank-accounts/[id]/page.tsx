import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import {
  Archive,
  ArrowRight,
  Building2,
  CreditCard,
  FileText,
  Landmark,
  Loader2,
  LockKeyhole,
  Pencil,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  WalletCards,
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
  AixiaFieldLabel,
  AixiaFormField,
  AixiaFormFullWidth,
  AixiaFormGrid,
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

import {
  archiveBankAccount,
  getBankAccountById,
  getCompanyOptions,
  restoreBankAccount,
  updateBankAccount,
  type CompanyOption,
  type FinanceBankAccount,
  type FinanceBankAccountStatus,
  type FinanceBankIdentifierType,
} from "@/lib/finance/bankAccounts";
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

type EditSection = null | "overview" | "address" | "control" | "notes";

type OverviewDraft = {
  company_id: string;
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
  account_identifier_type: FinanceBankIdentifierType | "";
  account_identifier_value: string;
  currency_code: string;
  is_default: boolean;
  status: FinanceBankAccountStatus;
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
  company_id: "",
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

  return {
    isAdmin,
    canRead:
      canManageMasterData ||
      hasPermission(permissions, "viewBankAccounts"),
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

      console.warn(
        "Bank Account ID permission RPC fallback:",
        result.error.message
      );
      return null;
    }

    if (!result.data || typeof result.data !== "object") {
      if (mode === "silent") {
        throw new Error(
          "Silent bank account ID permission refresh returned no effective permission payload."
        );
      }

      return null;
    }

    return result.data as Partial<Record<Permission, boolean>>;
  } catch (error) {
    if (mode === "silent") {
      throw error;
    }

    console.warn("Bank Account ID permission RPC failed:", error);
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

function normalizeIdentifierType(value: string): FinanceBankIdentifierType | null {
  const normalized = value.trim().toLowerCase();

  if (normalized === "swift" || normalized === "iban") {
    return normalized;
  }

  return null;
}

function normalizeStatus(value: string): FinanceBankAccountStatus {
  if (value === "inactive" || value === "archived") return value;
  return "active";
}

function getCompanyDisplayName(
  record: FinanceBankAccount | null,
  company: CompanyOption | null
) {
  if (company) {
    return company.legal_name?.trim() || company.name || "Unnamed company";
  }

  return record?.beneficiary_name || "—";
}

function getCompanyCodeLabel(
  record: FinanceBankAccount | null,
  company: CompanyOption | null
) {
  return company?.code || record?.company_code || "—";
}

function getIdentifierLabel(record: FinanceBankAccount | null) {
  if (!record?.account_identifier_type) return "Identifier";
  return record.account_identifier_type === "iban" ? "IBAN" : "SWIFT";
}

function getIdentifierValue(record: FinanceBankAccount | null) {
  return record?.account_identifier_value || "—";
}

function getLocationLabel(record: FinanceBankAccount | null) {
  const parts = [record?.city, record?.country].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : "—";
}

function getCurrencyLabel(
  record: FinanceBankAccount | null,
  company: CompanyOption | null,
  fallback?: string
) {
  return company?.currency_code || fallback || record?.currency_code || "—";
}

export default function FinanceMasterDataBankAccountDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [profile, setProfile] = useState<ProfilePermissionRow | null>(null);
  const [effectivePermissions, setEffectivePermissions] =
    useState<Record<Permission, boolean> | null>(null);
  const [record, setRecord] = useState<FinanceBankAccount | null>(null);
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isLoadingRecord, setIsLoadingRecord] = useState(true);
  const [backgroundRefreshing, setBackgroundRefreshing] = useState(false);
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
            "Silent bank account ID profile refresh returned no auth user; keeping current profile and permissions."
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
            "Silent bank account ID profile refresh returned no profile; keeping current profile and permissions."
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
            "Silent bank account ID profile refresh returned no role; keeping current permissions."
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
      console.error("Failed to load bank account ID permissions:", error);

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

  const loadRecord = useCallback(async (mode: LoadMode = "initial") => {
    if (!id) return;

    if (mode === "initial") {
      setIsLoadingRecord(true);
      setPageError(null);
    } else {
      setBackgroundRefreshing(true);
    }

    try {
      const [detail, companyRows] = await Promise.all([
        getBankAccountById(id),
        getCompanyOptions(),
      ]);

      setRecord(detail);
      setCompanies(companyRows);

      if (mode === "initial") {
        setPageError(null);
      }
    } catch (error) {
      console.error("Failed to load bank account details:", error);

      if (mode === "initial") {
        setRecord(null);
        setCompanies([]);
        setPageError(
          error instanceof Error ? error.message : "Failed to load bank account details."
        );
      }
    } finally {
      if (mode === "initial") {
        setIsLoadingRecord(false);
      } else {
        setBackgroundRefreshing(false);
      }
    }
  }, [id]);

  useEffect(() => {
    void Promise.all([
      loadCurrentProfile("initial"),
      loadRecord("initial"),
    ]);
  }, [loadCurrentProfile, loadRecord]);

  useEffect(() => {
    const channel = supabase
      .channel("finance-master-data-bank-account-id-page")
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
        () => void loadRecord("silent")
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_bank_accounts" },
        () => void loadRecord("silent")
      )
      .subscribe();

    const intervalId = window.setInterval(() => {
      void Promise.all([
        loadCurrentProfile("silent"),
        loadRecord("silent"),
      ]);
    }, 60000);

    return () => {
      window.clearInterval(intervalId);
      void supabase.removeChannel(channel);
    };
  }, [loadCurrentProfile, loadRecord]);

  const permissionState = useMemo(() => {
    return buildPermissionState(profile, effectivePermissions);
  }, [effectivePermissions, profile]);

  const selectedCompany = useMemo(() => {
    if (!record?.company_id) return null;
    return companies.find((company) => company.id === record.company_id) ?? null;
  }, [companies, record?.company_id]);

  const draftSelectedCompany = useMemo(() => {
    if (!overviewDraft.company_id) return null;
    return companies.find((company) => company.id === overviewDraft.company_id) ?? null;
  }, [companies, overviewDraft.company_id]);

  const isPageLoading = isLoadingProfile || isLoadingRecord;

  const headerStatusCards = useMemo<HeaderStatusCardData[]>(() => {
    return [
      {
        label: "Read Access",
        value: isLoadingProfile
          ? "Checking"
          : permissionState.canRead
            ? "Enabled"
            : "Locked",
        description: "Viewing this record requires Bank Account read access.",
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
          ? "Silent refresh is updating reference data without resetting the page."
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
        value: getCompanyDisplayName(record, selectedCompany),
        description: getCompanyCodeLabel(record, selectedCompany),
      },
      {
        label: "Bank",
        value: record?.bank_name || "—",
        description: record?.beneficiary_name || "No beneficiary",
      },
      {
        label: getIdentifierLabel(record),
        value: getIdentifierValue(record),
        description: getCurrencyLabel(record, selectedCompany),
      },
      {
        label: "Lifecycle",
        value: formatStatus(record?.status),
        description: record?.is_default ? "Default account" : "Standard account",
      },
    ];
  }, [record, selectedCompany]);

  function cancelEditing() {
    setEditingSection(null);
    setPageError(null);
  }

  function openOverviewEditor() {
    if (!record || !permissionState.canUpdate) return;

    setPageError(null);
    setPageMessage(null);
    setOverviewDraft({
      company_id: record.company_id || "",
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
      account_identifier_type: record.account_identifier_type || "swift",
      account_identifier_value: record.account_identifier_value || "",
      currency_code: selectedCompany?.currency_code || record.currency_code || "",
      is_default: record.is_default,
      status: record.status,
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

  function handleOverviewCompanyChange(companyId: string) {
    const company = companies.find((item) => item.id === companyId) ?? null;

    setOverviewDraft((previousDraft) => ({
      ...previousDraft,
      company_id: companyId,
      beneficiary_name:
        company?.legal_name?.trim() || company?.name || previousDraft.beneficiary_name,
    }));

    setControlDraft((previousDraft) => ({
      ...previousDraft,
      currency_code: company?.currency_code || "",
    }));
  }

  async function saveOverviewSection() {
    if (!record || !permissionState.canUpdate) return;

    if (!overviewDraft.company_id) {
      setPageError("Company is required.");
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

      const selectedCompanyForSave =
        companies.find((company) => company.id === overviewDraft.company_id) ?? null;

      await updateBankAccount(record.id, {
        company_id: overviewDraft.company_id,
        beneficiary_name: overviewDraft.beneficiary_name.trim() || null,
        bank_name: overviewDraft.bank_name.trim() || null,
        account_number: overviewDraft.account_number.trim() || null,
        currency_code: selectedCompanyForSave?.currency_code || null,
      });

      setEditingSection(null);
      setPageMessage("Bank overview updated.");
      await loadRecord("silent");
    } catch (error) {
      console.error("Failed to save bank overview:", error);
      setPageError(
        error instanceof Error ? error.message : "Failed to save bank overview."
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

      await updateBankAccount(record.id, {
        country: addressDraft.country.trim() || null,
        city: addressDraft.city.trim() || null,
        postal_code: addressDraft.postal_code.trim() || null,
        address_line_1: addressDraft.address_line_1.trim() || null,
        address_line_2: addressDraft.address_line_2.trim() || null,
      });

      setEditingSection(null);
      setPageMessage("Bank address updated.");
      await loadRecord("silent");
    } catch (error) {
      console.error("Failed to save bank address:", error);
      setPageError(
        error instanceof Error ? error.message : "Failed to save bank address."
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

    try {
      setIsSaving(true);
      setPageError(null);
      setPageMessage(null);

      await updateBankAccount(record.id, {
        account_identifier_type: normalizedIdentifierType,
        account_identifier_value:
          controlDraft.account_identifier_value.trim() || null,
        currency_code: selectedCompany?.currency_code || record.currency_code || null,
        is_default: controlDraft.is_default,
        status: normalizedStatus,
      });

      setEditingSection(null);
      setPageMessage("Identifier, currency, and control settings updated.");
      await loadRecord("silent");
    } catch (error) {
      console.error("Failed to save bank control settings:", error);
      setPageError(
        error instanceof Error ? error.message : "Failed to save bank control settings."
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

      await updateBankAccount(record.id, {
        notes: notesDraft.trim() || null,
      });

      setEditingSection(null);
      setPageMessage("Notes updated.");
      await loadRecord("silent");
    } catch (error) {
      console.error("Failed to save bank account notes:", error);
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
        await restoreBankAccount(record.id);
        setPageMessage("Bank account restored.");
      } else {
        await archiveBankAccount(record.id);
        setPageMessage("Bank account archived.");
      }

      await loadRecord("silent");
    } catch (error) {
      console.error("Failed to update bank account lifecycle:", error);
      setPageError(
        error instanceof Error
          ? error.message
          : "Failed to update bank account lifecycle."
      );
    } finally {
      setIsLifecycleRunning(false);
    }
  }

  if (isPageLoading) {
    return (
      <AixiaLoadingState
        title="Loading bank account"
        description="Bank account record and permission state are being checked."
      />
    );
  }

  if (!record) {
    return (
      <AixiaPage>
        <AixiaNotFoundState
          title="Bank account not found"
          description="The bank account record could not be loaded or no longer exists."
          action={
            <AixiaButton
              type="button"
              variant="secondary"
              onClick={() => navigate("/finance/master-data/bank-accounts")}
            >
              <ArrowRight className="h-4 w-4 rotate-180" />
              Bank Accounts
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
          parentLabel="Bank Accounts"
          parentPath="/finance/master-data/bank-accounts"
          badges={[
            { label: "Access Locked", tone: "rose" },
            { label: "Permission protected", tone: "cyan" },
          ]}
          gradientTitle="Bank Account"
          title="Access Locked"
          subtitle="Read Permission Required"
          description="This page requires Bank Account read access or Master Data admin access."
          statusCards={[
            {
              label: "Read Access",
              value: "Locked",
              description:
                "Ask an Admin to assign a Finance role template or user-specific exception with Bank Account read access.",
              icon: LockKeyhole,
              tone: "rose",
            },
          ]}
        />

        <AixiaAccessDeniedState
          title="No bank account read access"
          description="Ask an Admin to assign a Finance role template or user-specific exception with Bank Account read access."
        />
      </AixiaPage>
    );
  }

  return (
    <AixiaPage>
      <AixiaHero
        parentLabel="Bank Accounts"
        parentPath="/finance/master-data/bank-accounts"
        badges={[
          { label: "Bank Account Detail", tone: "cyan" },
          { label: record.bank_id || "No Bank ID", tone: "neutral" },
          { label: getCompanyCodeLabel(record, selectedCompany), tone: "emerald" },
          { label: formatStatus(record.status), tone: "amber" },
        ]}
        gradientTitle={record.bank_name || "Company Bank"}
        title="Account"
        subtitle="Company Payment Master Data"
        description="Company-linked bank account record with same-place section editing, lifecycle control, and permission-protected actions."
        statusCards={headerStatusCards}
      />

      {pageError ? <AixiaAlert tone="error">{pageError}</AixiaAlert> : null}
      {pageMessage ? <AixiaAlert tone="success">{pageMessage}</AixiaAlert> : null}

      <AixiaSmartLayout
        sidebar="normal"
        balance="main"
        bottomSpan="never"
        main={
          <>
            <AixiaDetailSection
              title="Bank Overview"
              description="Company linkage, beneficiary, bank name, and account number."
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
                    <AixiaFieldLabel label="Company" required />
                    <AixiaSelectField
                      value={overviewDraft.company_id}
                      disabled={isSaving}
                      onChange={(event) => handleOverviewCompanyChange(event.target.value)}
                    >
                      <option value="" className="bg-[#05070d]">
                        Select company
                      </option>
                      {companies.map((company) => (
                        <option
                          key={company.id}
                          value={company.id}
                          className="bg-[#05070d]"
                        >
                          {(company.legal_name?.trim() || company.name) +
                            (company.code ? ` • ${company.code}` : "")}
                        </option>
                      ))}
                    </AixiaSelectField>
                  </AixiaFormFullWidth>

                  <AixiaDisplayBlock
                    label="Draft Company Code"
                    value={draftSelectedCompany?.code || "—"}
                    detail="Pulled from the selected company."
                  />

                  <AixiaDisplayBlock
                    label="Draft Currency"
                    value={draftSelectedCompany?.currency_code || "—"}
                    detail="Company currency reference."
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
                <AixiaFormGrid columns="two">
                  <AixiaDisplayBlock
                    label="Company"
                    value={getCompanyDisplayName(record, selectedCompany)}
                    detail={getCompanyCodeLabel(record, selectedCompany)}
                  />
                  <AixiaDisplayBlock
                    label="Beneficiary Name"
                    value={record.beneficiary_name || "—"}
                  />
                  <AixiaDisplayBlock label="Bank Name" value={record.bank_name || "—"} />
                  <AixiaDisplayBlock
                    label="Account Number"
                    value={record.account_number || "—"}
                  />
                </AixiaFormGrid>
              )}
            </AixiaDetailSection>

            <AixiaDetailSection
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
                <AixiaFormGrid columns="two">
                  <AixiaDisplayBlock label="Location" value={getLocationLabel(record)} />
                  <AixiaDisplayBlock label="Country" value={record.country || "—"} />
                  <AixiaDisplayBlock label="City" value={record.city || "—"} />
                  <AixiaDisplayBlock
                    label="ZIP / Postal Code"
                    value={record.postal_code || "—"}
                  />
                  <AixiaDisplayBlock
                    label="Address Line 1"
                    value={record.address_line_1 || "—"}
                  />
                  <AixiaDisplayBlock
                    label="Address Line 2"
                    value={record.address_line_2 || "—"}
                  />
                </AixiaFormGrid>
              )}
            </AixiaDetailSection>

            <AixiaDetailSection
              title="Identifier / Currency / Control"
              description="Identifier type, identifier value, currency, default flag, and lifecycle status."
              icon={CreditCard}
              isEditing={editingSection === "control"}
              canEdit={permissionState.canUpdate}
              onEdit={openControlEditor}
              onCancel={cancelEditing}
              onSave={() => void saveControlSection()}
              isSaving={isSaving}
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
                      <option value="" className="bg-[#05070d]">
                        None
                      </option>
                      <option value="swift" className="bg-[#05070d]">
                        SWIFT
                      </option>
                      <option value="iban" className="bg-[#05070d]">
                        IBAN
                      </option>
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

                  <AixiaDisplayBlock
                    label="Currency Code"
                    value={getCurrencyLabel(record, selectedCompany, controlDraft.currency_code)}
                    detail="Pulled from the selected company. Currency is not manually edited on the bank account."
                  />

                  <AixiaFormField>
                    <AixiaFieldLabel label="Status" />
                    <AixiaSelectField
                      value={controlDraft.status}
                      disabled={isSaving}
                      onChange={(event) =>
                        updateControlDraft("status", normalizeStatus(event.target.value))
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

                  <AixiaFormFullWidth>
                    <AixiaCheckboxField
                      checked={controlDraft.is_default}
                      disabled={isSaving}
                      onChange={(event) =>
                        updateControlDraft("is_default", event.target.checked)
                      }
                      label="Set as default bank account for this company"
                      description="Default handling is controlled by the bank account helper logic."
                    />
                  </AixiaFormFullWidth>
                </AixiaFormGrid>
              ) : (
                <AixiaFormGrid columns="two">
                  <AixiaDisplayBlock
                    label="Identifier Type"
                    value={record.account_identifier_type?.toUpperCase() || "—"}
                  />
                  <AixiaDisplayBlock
                    label="Identifier Value"
                    value={record.account_identifier_value || "—"}
                  />
                  <AixiaDisplayBlock
                    label="Currency Code"
                    value={getCurrencyLabel(record, selectedCompany)}
                  />
                  <AixiaDisplayBlock
                    label="Default Status"
                    value={<AixiaDefaultBadge isDefault={record.is_default} />}
                  />
                  <AixiaDisplayBlock
                    label="Lifecycle Status"
                    value={<AixiaStatusBadge value={record.status} />}
                  />
                </AixiaFormGrid>
              )}
            </AixiaDetailSection>

            <AixiaDetailSection
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
                  value={record.notes || "No notes added yet."}
                />
              )}
            </AixiaDetailSection>
          </>
        }
        side={
          <>
            <AixiaSection
              title="Record Summary"
              description="Key account details and current lifecycle."
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
              description="Archive or restore this account. Permanent delete is only available from the registry archive modal."
              icon={Archive}
            >
              <AixiaActionStack>
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
                    <AixiaAlertText
                      title="Lifecycle access locked"
                      description="Delete/Archive access is not enabled for this user."
                    />
                  </AixiaAlert>
                )}

                <AixiaButton
                  type="button"
                  variant="secondary"
                  onClick={() => navigate("/finance/master-data/bank-accounts")}
                >
                  <ArrowRight className="h-4 w-4 rotate-180" />
                  Bank Accounts
                </AixiaButton>
              </AixiaActionStack>
            </AixiaSection>

            <AixiaSection
              title="System Fields"
              description="Read-only audit and system metadata."
              icon={Landmark}
            >
              <AixiaReviewGrid>
                <AixiaReviewBlock label="Bank ID" value={record.bank_id || "—"} />
                <AixiaReviewBlock label="Record ID" value={record.id} />
                <AixiaReviewBlock
                  label="Created"
                  value={formatDateTimeLabel(record.created_at)}
                />
                <AixiaReviewBlock
                  label="Updated"
                  value={formatDateTimeLabel(record.updated_at)}
                />
                <AixiaReviewBlock
                  label="Created By"
                  value={record.created_by || "—"}
                />
                <AixiaReviewBlock
                  label="Updated By"
                  value={record.updated_by || "—"}
                />
              </AixiaReviewGrid>
            </AixiaSection>

            <AixiaAlert tone="info">
              <AixiaAlertText
                title="Locked detail rule"
                description="This page requires Bank Account Read access. Section edits require Update access. Archive and Restore require Delete/Archive access. Permanent delete is intentionally not available on the ID page."
              />
            </AixiaAlert>
          </>
        }
      />
    </AixiaPage>
  );
}
