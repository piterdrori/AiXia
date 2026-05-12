import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Banknote,
  Building2,
  CreditCard,
  FileText,
  Landmark,
  Loader2,
  LockKeyhole,
  RotateCcw,
  Save,
  ShieldCheck,
  WalletCards,
} from "lucide-react";

import {
  AixiaAccessDeniedState,
  AixiaAccessRule,
  AixiaAlert,
  AixiaBadge,
  AixiaButton,
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
  AixiaValueBlock,
} from "@/components/aixia";

import {
  createVendorBankAccount,
  getVendorOptions,
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

const VENDOR_BANK_ACCOUNT_CREATE_ACCESS_CONFIG = {
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
  createPermissions: [
    "createFinanceRecords",
    "manageFinanceMasterData",
    "manageVendors",
  ],
  updatePermissions: [
    "editFinanceRecords",
    "manageFinanceMasterData",
    "manageVendors",
  ],
  deleteArchivePermissions: [
    "archiveFinanceRecords",
    "manageFinanceMasterData",
    "manageVendors",
  ],
} as const;

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
    useState<Partial<Record<Permission, boolean>> | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isLoadingVendors, setIsLoadingVendors] = useState(true);
  const [isLoadingCurrencies, setIsLoadingCurrencies] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formMessage, setFormMessage] = useState<string | null>(null);

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
            "Silent create vendor bank account permission refresh returned no auth user; keeping current permission state."
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
            "Silent create vendor bank account profile refresh returned no profile; keeping current permission state."
          );
        }

        return;
      }

      const backendPermissions = await fetchFinanceEffectivePermissions(
        authUserId,
        mode,
        "Create Vendor Bank Account"
      );

      setProfile(loadedProfile);
      setEffectivePermissions(backendPermissions || loadedProfile.permissions || null);
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
  }, []);

  const loadVendors = useCallback(
    async (mode: LoadMode = "initial") => {
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
  }, []);

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
      void supabase.removeChannel(channel);
    };
  }, [loadCurrencyOptions, loadCurrentProfile, loadVendors]);

  const permissionState = useMemo(() => {
    return resolveFinancePagePermissionState({
      profileRole: profile?.role,
      permissions: effectivePermissions,
      config: VENDOR_BANK_ACCOUNT_CREATE_ACCESS_CONFIG,
    });
  }, [effectivePermissions, profile?.role]);

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

  const headerStatusCards = useMemo(() => {
    return [
      {
        label: "Create Access",
        value: isLoadingProfile
          ? "Checking"
          : permissionState.canCreate
          ? "Enabled"
          : "Locked",
        description:
          "Vendor bank-account create access follows the Finance role template and user-specific exceptions.",
        icon: permissionState.canCreate ? ShieldCheck : LockKeyhole,
        tone: permissionState.canCreate ? ("emerald" as const) : ("rose" as const),
      },
      {
        label: "Currency Source",
        value: isLoadingCurrencies
          ? "Loading"
          : `${currencyOptions.length} Options`,
        description:
          "Currency options are pulled from the general finance_currencies master-data table.",
        icon: Banknote,
        tone: "cyan" as const,
      },
    ];
  }, [
    currencyOptions.length,
    isLoadingCurrencies,
    isLoadingProfile,
    permissionState.canCreate,
  ]);

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

  if (isPageLoading) {
    return (
      <AixiaLoadingState
        title="Loading create page"
        description="Vendor options, currency master data, and permission state are being checked."
      />
    );
  }

  return (
    <AixiaPage>
      <AixiaHero
        parentLabel="Vendor Bank Accounts"
        parentPath="/finance/master-data/vendor-bank-accounts"
        badges={[
          { label: "New Vendor Bank Account", tone: "cyan" },
          { label: "Vendor Payout Account", tone: "emerald" },
          { label: "Currency Master Data", tone: "violet" },
          { label: "Opens ID Page After Create", tone: "neutral" },
        ]}
        gradientTitle="Create Vendor"
        title="Bank Account"
        subtitle="Vendor Payout Bank Account"
        description="Create a vendor payout bank-account record from vendor-provided payment details. Currency is selected from the general currency master data and saved directly on the vendor bank-account record."
        statusCards={headerStatusCards}
      />

      {formError ? <AixiaAlert tone="error">{formError}</AixiaAlert> : null}
      {formMessage ? <AixiaAlert tone="success">{formMessage}</AixiaAlert> : null}

      {!permissionState.canCreate ? (
        <AixiaAccessDeniedState
          title="Create access is not enabled"
          description="This page requires Vendor Bank Account create access, Vendor management access, or Master Data admin access. Ask an Admin to update this user’s Finance role template or user-specific exception before creating vendor payout bank accounts."
        />
      ) : (
        <form id="vendor-bank-account-create-form" onSubmit={handleSubmit}>
          <AixiaSmartLayout
            sidebar="wide"
            balance="main"
            matchColumns
            bottomSpan="never"
            main={
              <>
                <AixiaSection
                  title="Vendor Link"
                  description="Select the vendor and pull linked finance identity."
                  icon={Building2}
                >
                  <AixiaFormGrid columns="two">
                    <AixiaFormFullWidth>
                      <AixiaFieldLabel label="Vendor" required />
                      <AixiaSelectField
                        value={form.vendor_id}
                        onChange={(event) => handleVendorChange(event.target.value)}
                        disabled={isSaving}
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
                      label="Vendor Code"
                      value={getVendorCodeLabel(selectedVendor, form.vendor_code)}
                      detail="Pulled from the selected vendor."
                    />

                    <AixiaValueBlock
                      label="Currency Source"
                      value="General currency master data"
                      detail="Vendor bank-account currency is selected below and saved on this record."
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
                  description="Identifier type, active currency master-data selection, default flag, and lifecycle."
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
                        <option value="swift">SWIFT</option>
                        <option value="iban">IBAN</option>
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
                      <AixiaFieldLabel label="Currency" required />
                      <AixiaSelectField
                        value={form.currency_code}
                        disabled={isSaving}
                        onChange={(event) =>
                          updateForm("currency_code", event.target.value)
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
                        value={form.status}
                        disabled={isSaving}
                        onChange={(event) =>
                          updateForm("status", normalizeStatus(event.target.value))
                        }
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </AixiaSelectField>
                    </AixiaFormField>

                    <AixiaFormField>
                      <AixiaFieldLabel label="Default Payout Account" />
                      <AixiaSelectField
                        value={form.is_default ? "yes" : "no"}
                        disabled={isSaving}
                        onChange={(event) =>
                          updateForm("is_default", event.target.value === "yes")
                        }
                      >
                        <option value="no">No</option>
                        <option value="yes">Yes</option>
                      </AixiaSelectField>
                    </AixiaFormField>

                    <AixiaValueBlock
                      label="Selected Currency"
                      value={
                        selectedCurrency
                          ? getCurrencyOptionLabel(selectedCurrency)
                          : "No currency selected"
                      }
                      detail="The value is saved on this vendor bank-account record. The currency list itself comes from general finance_currencies master data."
                    />
                  </AixiaFormGrid>
                </AixiaSection>

                <AixiaSection
                  title="Notes"
                  description="Internal notes for finance operators."
                  icon={FileText}
                >
                  <AixiaFormFullWidth>
                    <AixiaTextareaField
                      value={form.notes}
                      disabled={isSaving}
                      onChange={(event) => updateForm("notes", event.target.value)}
                      placeholder="Notes..."
                    />
                  </AixiaFormFullWidth>
                </AixiaSection>
              </>
            }
            side={
              <>
                <AixiaSection
                  title="Create Summary"
                  description="Review the vendor payout account before creating it."
                  icon={CreditCard}
                >
                  <AixiaReviewGrid variant="compact">
                    <AixiaReviewBlock
                      label="Vendor"
                      value={getVendorDisplayName(selectedVendor)}
                      description={getVendorCodeLabel(selectedVendor, form.vendor_code)}
                    />

                    <AixiaReviewBlock
                      label="Bank"
                      value={form.bank_name.trim() || "Bank name required"}
                      description={
                        form.beneficiary_name.trim() || "Beneficiary name required"
                      }
                    />

                    <AixiaReviewBlock
                      label="Identifier"
                      value={form.account_identifier_type.toUpperCase()}
                      description={
                        form.account_identifier_value.trim() ||
                        "No identifier value yet"
                      }
                    />

                    <AixiaReviewBlock
                      label="Currency"
                      value={getCurrencyLabel(currencyOptions, form.currency_code)}
                      description={
                        form.is_default
                          ? "Default vendor payout account enabled"
                          : "Standard vendor payout account"
                      }
                    />
                  </AixiaReviewGrid>
                </AixiaSection>

                <AixiaSection
                  title="Actions"
                  description="Create opens the new vendor bank-account ID page directly."
                  icon={Save}
                >
                  <div className="aixia-stack">
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
                      {isSaving ? "Creating..." : "Create Vendor Bank Account"}
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
                  </div>
                </AixiaSection>

                <AixiaSection
                  title="Source Preview"
                  description="Current selected vendor and currency source."
                  icon={Building2}
                >
                  <AixiaReviewGrid variant="compact">
                    <AixiaReviewBlock
                      label="Selected Vendor"
                      value={getVendorDisplayName(selectedVendor)}
                      description={getVendorCodeLabel(selectedVendor, form.vendor_code)}
                    />

                    <AixiaReviewBlock
                      label="Beneficiary"
                      value={form.beneficiary_name || "—"}
                      description="Normally based on the vendor legal name, but editable."
                    />

                    <AixiaReviewBlock
                      label="Currency Master Data"
                      value={`${currencyOptions.length} active option${
                        currencyOptions.length === 1 ? "" : "s"
                      }`}
                      description="The dropdown is loaded from finance_currencies, not hardcoded."
                    />

                    <AixiaReviewBlock
                      label="Selected Currency"
                      value={getCurrencyLabel(currencyOptions, form.currency_code)}
                      description="Saved directly to vendor_bank_accounts.currency_code."
                    />
                  </AixiaReviewGrid>
                </AixiaSection>

                <AixiaAccessRule
                  title="Locked access rule"
                  description="Finance create pages must use shared AiXia source-of-truth components."
                >
                  This page requires Vendor Bank Account create access, Vendor
                  management access, or Master Data admin access. New records can be
                  created as Active or Inactive only. Archived records are managed
                  from the Vendor Bank Accounts archive modal. Currency must come
                  from the general finance_currencies master-data table and is saved
                  on this vendor bank-account record.
                </AixiaAccessRule>
              </>
            }
          />
        </form>
      )}
    </AixiaPage>
  );
}
