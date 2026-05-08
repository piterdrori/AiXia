import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import {
  Building2,
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
  AixiaAccessDeniedState,
  AixiaActionStack,
  AixiaAlert,
  AixiaAlertText,
  AixiaButton,
  AixiaCheckboxField,
  AixiaDisplayBlock,
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
  AixiaTextareaField,
} from "@/components/aixia";
import {
  createBankAccount,
  getCompanyOptions,
  type CompanyOption,
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

type BankIdentifierType = "swift" | "iban";
type BankAccountCreateStatus = "active" | "inactive";

type FormState = {
  company_id: string;
  company_code: string;
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
  status: BankAccountCreateStatus;
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
  description: string;
  icon: LucideIcon;
  tone: "emerald" | "cyan" | "amber" | "rose";
};

type SummaryItem = {
  label: string;
  value: string;
  description: string;
};

const EMPTY_FORM: FormState = {
  company_id: "",
  company_code: "",
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

  return {
    isAdmin,
    canRead:
      canManageMasterData ||
      hasPermission(permissions, "viewBankAccounts"),
    canCreate:
      canManageMasterData ||
      hasPermission(permissions, "createFinanceRecords"),
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
        "Create Bank Account permission RPC fallback:",
        result.error.message
      );
      return null;
    }

    if (!result.data || typeof result.data !== "object") {
      if (mode === "silent") {
        throw new Error(
          "Silent create bank account permission refresh returned no effective permission payload."
        );
      }

      return null;
    }

    return result.data as Partial<Record<Permission, boolean>>;
  } catch (error) {
    if (mode === "silent") {
      throw error;
    }

    console.warn("Create Bank Account permission RPC failed:", error);
    return null;
  }
}

function normalizeIdentifierType(value: string): BankIdentifierType {
  return value === "iban" ? "iban" : "swift";
}

function normalizeStatus(value: string): BankAccountCreateStatus {
  return value === "inactive" ? "inactive" : "active";
}

function getCompanyDisplayName(company: CompanyOption | null) {
  if (!company) return "No company selected";
  return company.legal_name?.trim() || company.name || "Unnamed company";
}

function getCompanyCodeLabel(company: CompanyOption | null, fallback: string) {
  return company?.code || fallback || "Auto from company";
}

function getCurrencyLabel(company: CompanyOption | null, fallback: string) {
  return fallback || company?.currency_code || "—";
}

export default function FinanceMasterDataBankAccountCreatePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [profile, setProfile] = useState<ProfilePermissionRow | null>(null);
  const [effectivePermissions, setEffectivePermissions] =
    useState<Record<Permission, boolean> | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(true);
  const [backgroundRefreshing, setBackgroundRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formMessage, setFormMessage] = useState<string | null>(null);

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
            "Silent create bank account profile refresh returned no auth user; keeping current profile."
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
            "Silent create bank account profile refresh returned no profile; keeping current profile."
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
            "Silent create bank account profile refresh returned no role; keeping current permissions."
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
      console.error("Failed to load create bank account permissions:", error);

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

  const loadCompanies = useCallback(async (mode: LoadMode = "initial") => {
    if (mode === "initial") {
      setIsLoadingCompanies(true);
    } else {
      setBackgroundRefreshing(true);
    }

    try {
      const rows = await getCompanyOptions();
      setCompanies(rows);

      const companyIdFromUrl = searchParams.get("company_id");
      if (!companyIdFromUrl || mode !== "initial") return;

      const company = rows.find((item) => item.id === companyIdFromUrl) ?? null;
      if (!company) return;

      setForm((previousForm) => ({
        ...previousForm,
        company_id: previousForm.company_id || companyIdFromUrl,
        company_code: previousForm.company_code || company.code || "",
        beneficiary_name:
          previousForm.beneficiary_name ||
          company.legal_name?.trim() ||
          company.name ||
          "",
        currency_code:
          previousForm.currency_code || company.currency_code || "",
      }));
    } catch (error) {
      console.error("Failed to load companies for bank account create page:", error);

      if (mode === "initial") {
        setCompanies([]);
        setFormError(
          error instanceof Error ? error.message : "Failed to load company options."
        );
      }
    } finally {
      if (mode === "initial") {
        setIsLoadingCompanies(false);
      } else {
        setBackgroundRefreshing(false);
      }
    }
  }, [searchParams]);

  useEffect(() => {
    void Promise.all([
      loadCurrentProfile("initial"),
      loadCompanies("initial"),
    ]);
  }, [loadCompanies, loadCurrentProfile]);

  useEffect(() => {
    const channel = supabase
      .channel("finance-master-data-bank-account-create-page")
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
        () => void loadCompanies("silent")
      )
      .subscribe();

    const intervalId = window.setInterval(() => {
      void Promise.all([
        loadCurrentProfile("silent"),
        loadCompanies("silent"),
      ]);
    }, 60000);

    return () => {
      window.clearInterval(intervalId);
      void supabase.removeChannel(channel);
    };
  }, [loadCompanies, loadCurrentProfile]);

  const permissionState = useMemo(() => {
    return buildPermissionState(profile, effectivePermissions);
  }, [effectivePermissions, profile]);

  const selectedCompany = useMemo(() => {
    return companies.find((company) => company.id === form.company_id) ?? null;
  }, [companies, form.company_id]);

  const identifierLabel = useMemo(() => {
    return form.account_identifier_type === "iban" ? "IBAN Value" : "SWIFT Value";
  }, [form.account_identifier_type]);

  const isPageLoading = isLoadingProfile || isLoadingCompanies;

  const headerStatusCards = useMemo<HeaderStatusCardData[]>(() => {
    return [
      {
        label: "Create Access",
        value: isLoadingProfile
          ? "Checking"
          : permissionState.canCreate
            ? "Enabled"
            : "Locked",
        description:
          "Bank Account create access follows the Finance role template and user-specific exceptions.",
        icon: permissionState.canCreate ? ShieldCheck : LockKeyhole,
        tone: permissionState.canCreate ? "emerald" : "rose",
      },
      {
        label: "Company Source",
        value: isLoadingCompanies ? "Loading" : `${companies.length} Options`,
        description:
          backgroundRefreshing
            ? "Reference data is refreshing silently without resetting the form."
            : "Company options are pulled from Finance Companies and used to prefill beneficiary and currency.",
        icon: Building2,
        tone: "cyan",
      },
    ];
  }, [
    backgroundRefreshing,
    companies.length,
    isLoadingCompanies,
    isLoadingProfile,
    permissionState.canCreate,
  ]);

  const summaryItems = useMemo<SummaryItem[]>(() => {
    return [
      {
        label: "Company",
        value: getCompanyDisplayName(selectedCompany),
        description: getCompanyCodeLabel(selectedCompany, form.company_code),
      },
      {
        label: "Bank",
        value: form.bank_name.trim() || "Bank name required",
        description: form.beneficiary_name.trim() || "Beneficiary name required",
      },
      {
        label: "Identifier",
        value: form.account_identifier_type.toUpperCase(),
        description: form.account_identifier_value.trim() || "No identifier value yet",
      },
      {
        label: "Currency",
        value: getCurrencyLabel(selectedCompany, form.currency_code),
        description: form.is_default ? "Default account enabled" : "Standard account",
      },
    ];
  }, [form, selectedCompany]);

  function updateForm<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((previousForm) => ({
      ...previousForm,
      [key]: value,
    }));
  }

  function handleCompanyChange(companyId: string) {
    const company = companies.find((item) => item.id === companyId) ?? null;

    setForm((previousForm) => ({
      ...previousForm,
      company_id: companyId,
      company_code: company?.code ?? "",
      beneficiary_name:
        company?.legal_name?.trim() || company?.name || previousForm.beneficiary_name,
      currency_code: previousForm.currency_code || company?.currency_code || "",
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

    if (!form.company_id) {
      setFormError("Company is required.");
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

    try {
      setIsSaving(true);
      setFormError(null);
      setFormMessage(null);

      const created = await createBankAccount({
        company_id: form.company_id,
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
        currency_code: form.currency_code.trim() || selectedCompany?.currency_code || null,
        is_default: form.is_default,
        status: form.status,
        notes: form.notes.trim() || null,
      });

      setFormMessage("Bank account created. Opening the new bank account record.");
      navigate(`/finance/master-data/bank-accounts/${created.id}`);
    } catch (error) {
      console.error("Failed to create bank account:", error);
      setFormError(
        error instanceof Error ? error.message : "Failed to create bank account."
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <AixiaPage>
      <AixiaHero
        parentLabel="Bank Accounts"
        parentPath="/finance/master-data/bank-accounts"
        badges={[
          { label: "New Company Bank Account", tone: "cyan" },
          { label: "Company linked", tone: "emerald" },
          { label: "Permission protected", tone: "cyan" },
          { label: "Opens ID page after create", tone: "neutral" },
        ]}
        gradientTitle="Create"
        title="Bank Account"
        subtitle="Company Payment Master Data"
        description="Create a company-linked bank account for treasury, payment instructions, and future finance document snapshots. After saving, the new bank account record opens directly."
        statusCards={headerStatusCards}
      />

      {formError ? <AixiaAlert tone="error">{formError}</AixiaAlert> : null}
      {formMessage ? <AixiaAlert tone="success">{formMessage}</AixiaAlert> : null}

      {isPageLoading ? (
        <AixiaLoadingState
          fullPage={false}
          title="Loading create page"
          description="Company options and permission state are being checked."
        />
      ) : !permissionState.canCreate ? (
        <AixiaAccessDeniedState
          title="Create access is not enabled"
          description="This page requires Bank Account create access or Master Data admin access. Ask an Admin to update this user’s Finance role template or user-specific exception before creating company bank accounts."
        />
      ) : (
        <form id="bank-account-create-form" onSubmit={handleSubmit}>
          <AixiaSmartLayout
            sidebar="normal"
            balance="main"
            main={
              <>
                <AixiaSection
                  title="Company Link"
                  description="Select the company and pull linked finance identity."
                  icon={Building2}
                >
                  <AixiaFormGrid columns="two">
                    <AixiaFormFullWidth>
                      <AixiaFieldLabel label="Company" required />
                      <AixiaSelectField
                        value={form.company_id}
                        disabled={isSaving}
                        onChange={(event) => handleCompanyChange(event.target.value)}
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
                      label="Company Code"
                      value={getCompanyCodeLabel(selectedCompany, form.company_code)}
                      detail="Pulled from the selected company."
                    />

                    <AixiaDisplayBlock
                      label="Company Currency"
                      value={selectedCompany?.currency_code || "—"}
                      detail="Used as a suggested bank account currency."
                    />

                    <AixiaFormFullWidth>
                      <AixiaFieldLabel label="Beneficiary Name" required />
                      <AixiaInputField
                        value={form.beneficiary_name}
                        disabled={isSaving}
                        onChange={(event) =>
                          updateForm("beneficiary_name", event.target.value)
                        }
                        placeholder="Legal beneficiary name"
                      />
                    </AixiaFormFullWidth>
                  </AixiaFormGrid>                
                 </AixiaSection>

                <AixiaSection
                  title="Bank Identity"
                  description="Bank name and main account number."
                  icon={Landmark}
                >
                  <AixiaFormGrid columns="two">
                    <AixiaFormFullWidth>
                      <AixiaFieldLabel label="Bank Name" required />
                      <AixiaInputField
                        value={form.bank_name}
                        disabled={isSaving}
                        onChange={(event) =>
                          updateForm("bank_name", event.target.value)
                        }
                        placeholder="Bank name"
                      />
                    </AixiaFormFullWidth>

                    <AixiaFormFullWidth>
                      <AixiaFieldLabel label="Account Number" />
                      <AixiaInputField
                        value={form.account_number}
                        disabled={isSaving}
                        onChange={(event) =>
                          updateForm("account_number", event.target.value)
                        }
                        placeholder="Account number or masked account number"
                      />
                    </AixiaFormFullWidth>
                  </AixiaFormGrid>
                </AixiaSection>

                <AixiaSection
                  title="Bank Address"
                  description="Bank address details used for records and payment instructions."
                  icon={WalletCards}
                >
                  <AixiaFormGrid columns="two">
                    <AixiaFormField>
                      <AixiaFieldLabel label="Country" />
                      <AixiaInputField
                        value={form.country}
                        disabled={isSaving}
                        onChange={(event) => updateForm("country", event.target.value)}
                        placeholder="Country"
                      />
                    </AixiaFormField>

                    <AixiaFormField>
                      <AixiaFieldLabel label="City" />
                      <AixiaInputField
                        value={form.city}
                        disabled={isSaving}
                        onChange={(event) => updateForm("city", event.target.value)}
                        placeholder="City"
                      />
                    </AixiaFormField>

                    <AixiaFormField>
                      <AixiaFieldLabel label="ZIP / Postal Code" />
                      <AixiaInputField
                        value={form.postal_code}
                        disabled={isSaving}
                        onChange={(event) =>
                          updateForm("postal_code", event.target.value)
                        }
                        placeholder="Postal code"
                      />
                    </AixiaFormField>
                    <AixiaFormFullWidth>
                      <AixiaFieldLabel label="Address Line 1" />
                      <AixiaInputField
                        value={form.address_line_1}
                        disabled={isSaving}
                        onChange={(event) =>
                          updateForm("address_line_1", event.target.value)
                        }
                        placeholder="Address line 1"
                      />
                    </AixiaFormFullWidth>

                    <AixiaFormFullWidth>
                      <AixiaFieldLabel label="Address Line 2" />
                      <AixiaInputField
                        value={form.address_line_2}
                        disabled={isSaving}
                        onChange={(event) =>
                          updateForm("address_line_2", event.target.value)
                        }
                        placeholder="Address line 2"
                      />
                    </AixiaFormFullWidth>
                  </AixiaFormGrid>
                </AixiaSection>

                <AixiaSection
                  title="Identifier / Currency / Control"
                  description="Identifier type, currency, default flag, and lifecycle."
                  icon={CreditCard}
                >
                  <AixiaFormGrid columns="two">
                     <AixiaFormField>
                      <AixiaFieldLabel label="Identifier Type" />
                      <AixiaSelectField
                        value={form.account_identifier_type}
                        disabled={isSaving}
                        onChange={(event) =>
                          updateForm(
                            "account_identifier_type",
                            normalizeIdentifierType(event.target.value)
                          )
                        }
                      >
                        <option value="swift" className="bg-[#05070d]">
                          SWIFT
                        </option>
                        <option value="iban" className="bg-[#05070d]">
                          IBAN
                        </option>
                      </AixiaSelectField>
                    </AixiaFormField>

                    <AixiaFormField>
                      <AixiaFieldLabel label={identifierLabel} />
                      <AixiaInputField
                        value={form.account_identifier_value}
                        disabled={isSaving}
                        onChange={(event) =>
                          updateForm("account_identifier_value", event.target.value)
                        }
                        placeholder="Identifier value"
                      />
                    </AixiaFormField>

                    <AixiaFormField>
                      <AixiaFieldLabel label="Currency Code" />
                      <AixiaInputField
                        value={form.currency_code}
                        disabled={isSaving}
                        onChange={(event) =>
                          updateForm("currency_code", event.target.value.toUpperCase())
                        }
                        placeholder="USD / EUR / CNY / ILS"
                      />
                    </AixiaFormField>

                    <AixiaFormField>
                      <AixiaFieldLabel label="Status" />
                      <AixiaSelectField
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
                      </AixiaSelectField>
                    </AixiaFormField>

                    <AixiaFormFullWidth>
                      <AixiaCheckboxField
                        checked={form.is_default}
                        disabled={isSaving}
                        onChange={(event) =>
                          updateForm("is_default", event.target.checked)
                        }
                        label="Set as default bank account for this company"
                        description="The helper logic will reset other default accounts for the same company during update flows."
                      />
                    </AixiaFormFullWidth>
                  </AixiaFormGrid>                
                 </AixiaSection>

                <AixiaSection
                  title="Notes"
                  description="Internal notes for finance operators."
                  icon={FileText}
                >
                  <AixiaTextareaField
                    value={form.notes}
                    disabled={isSaving}
                    onChange={(event) => updateForm("notes", event.target.value)}
                    placeholder="Notes..."
                  />
                </AixiaSection>
              </>
            }
            side={
              <>
                <AixiaSection
                  title="Create Summary"
                  description="Review the bank account before creating it."
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
                  title="Actions"
                  description="Create opens the new bank account ID page directly."
                  icon={Save}
                >
                  <AixiaActionStack>
                    <AixiaButton
                      type="submit"
                      variant="primary"
                      disabled={isSaving}
                    >
                      {isSaving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      {isSaving ? "Creating..." : "Create Bank Account"}
                    </AixiaButton>

                    <AixiaButton
                      type="button"
                      variant="secondary"
                      disabled={isSaving}
                      onClick={handleReset}
                    >
                      <RotateCcw className="h-4 w-4" />
                      Reset Form
                    </AixiaButton>
                  </AixiaActionStack>
                </AixiaSection>

                <AixiaAlert tone="info">
                  <AixiaAlertText
                    title="Locked create rule"
                    description="This page requires Bank Account create access. New records can be created as Active or Inactive only. Archived records are managed from the Bank Accounts archive modal."
                  />
                </AixiaAlert>
              </>
            }
          />
        </form>
      )}
    </AixiaPage>
  );
}
