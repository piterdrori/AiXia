import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import {
  Building2,
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
  Truck,
  Users,
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
  AixiaFormRowCard,
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
import { createCompany } from "@/lib/finance/companies";
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
  description: string;
  icon: LucideIcon;
  tone: "emerald" | "cyan" | "amber" | "rose";
};

type SummaryItem = {
  label: string;
  value: string;
  description: string;
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
        "Create Company permission RPC fallback:",
        result.error.message
      );
      return null;
    }

    if (!result.data || typeof result.data !== "object") {
      if (mode === "silent") {
        throw new Error(
          "Silent create company permission refresh returned no effective permission payload."
        );
      }

      return null;
    }

    return result.data as Partial<Record<Permission, boolean>>;
  } catch (error) {
    if (mode === "silent") {
      throw error;
    }

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

function getCurrencyOptionLabel(currency: CurrencyOption) {
  return `${currency.currency_code} — ${currency.currency_name}${
    currency.currency_symbol ? ` (${currency.currency_symbol})` : ""
  }${currency.is_base_currency ? " • Base" : ""}`;
}

function getSelectedCurrencyLabel(
  currencyCode: string,
  currencyOptions: CurrencyOption[]
) {
  if (!currencyCode) return "—";

  const selectedCurrency = currencyOptions.find(
    (currency) => currency.currency_code === currencyCode
  );

  if (!selectedCurrency) return currencyCode;

  return `${selectedCurrency.currency_code} • ${selectedCurrency.currency_name}`;
}

export default function FinanceMasterDataCompanyCreatePage() {
  const navigate = useNavigate();

  const [form, setForm] = useState<FormState>(() => createEmptyForm());
  const [profile, setProfile] = useState<ProfilePermissionRow | null>(null);
  const [effectivePermissions, setEffectivePermissions] =
    useState<Record<Permission, boolean> | null>(null);
  const [currencyOptions, setCurrencyOptions] = useState<CurrencyOption[]>([]);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isLoadingCurrencies, setIsLoadingCurrencies] = useState(true);
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
            "Silent create company profile refresh returned no auth user; keeping current profile and permissions."
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
            "Silent create company profile refresh returned no profile; keeping current profile and permissions."
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
            "Silent create company profile refresh returned no role; keeping current permissions."
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
      console.error("Failed to load create company permissions:", error);

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

  const loadCurrencyOptions = useCallback(async (mode: LoadMode = "initial") => {
    if (mode === "initial") {
      setIsLoadingCurrencies(true);
    } else {
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

      if (mode === "initial") {
        setCurrencyOptions([]);
      }
    } finally {
      if (mode === "initial") {
        setIsLoadingCurrencies(false);
      } else {
        setBackgroundRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    void Promise.all([
      loadCurrentProfile("initial"),
      loadCurrencyOptions("initial"),
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
        () => void loadCurrencyOptions("silent")
      )
      .subscribe();

    const intervalId = window.setInterval(() => {
      void Promise.all([
        loadCurrentProfile("silent"),
        loadCurrencyOptions("silent"),
      ]);
    }, 60000);

    return () => {
      window.clearInterval(intervalId);
      void supabase.removeChannel(channel);
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
          "Company create access follows the Finance role template and user-specific exceptions.",
        icon: permissionState.canCreate ? ShieldCheck : LockKeyhole,
        tone: permissionState.canCreate ? "emerald" : "rose",
      },
      {
        label: "Currency Source",
        value: isLoadingCurrencies ? "Loading" : `${currencyOptions.length} Active`,
        description: backgroundRefreshing
          ? "Currency master data is refreshing silently without disturbing the form."
          : "Company currency is selected from Finance Currency master data.",
        icon: Globe,
        tone: "cyan",
      },
      {
        label: "Save Result",
        value: "ID Page",
        description: "After successful creation, the new company detail page opens directly.",
        icon: Landmark,
        tone: "amber",
      },
    ];
  }, [
    backgroundRefreshing,
    currencyOptions.length,
    isLoadingCurrencies,
    isLoadingProfile,
    permissionState.canCreate,
  ]);

  const summaryItems = useMemo<SummaryItem[]>(() => {
    const filledPersonnel = countFilledPersonnel(form.personnel);
    const filledAddresses = countFilledAddresses(form.addresses);
    const filledShipping = countFilledShippingRows(form.shipping_addresses);

    return [
      {
        label: "Legal Name",
        value: form.legal_name.trim() || "Required",
        description: form.display_name.trim() || "No display name yet",
      },
      {
        label: "Currency",
        value: form.currency_code || "—",
        description: "Default currency for this internal company record.",
      },
      {
        label: "Personnel",
        value: `${filledPersonnel} Filled`,
        description: `${form.personnel.length} row${form.personnel.length === 1 ? "" : "s"} available`,
      },
      {
        label: "Addresses",
        value: `${filledAddresses} Filled`,
        description: `${filledShipping} shipping row${filledShipping === 1 ? "" : "s"} ready`,
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

    const baseCurrency =
      currencyOptions.find((currency) => currency.is_base_currency) ||
      currencyOptions[0];

    if (baseCurrency) {
      setForm((previousForm) => ({
        ...previousForm,
        currency_code: baseCurrency.currency_code,
      }));
    }
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
    <AixiaPage>
      <AixiaHero
        parentLabel="Companies"
        parentPath="/finance/master-data/companies"
        badges={[
          { label: "New Internal Company", tone: "cyan" },
          { label: "Company master data", tone: "emerald" },
          { label: "Permission protected", tone: "cyan" },
          { label: "Opens ID page after create", tone: "neutral" },
        ]}
        gradientTitle="Create"
        title="Company"
        subtitle="Internal Legal Entity Master Data"
        description="Create an internal finance company with legal identity, default currency, registration details, personnel, primary addresses, shipping addresses, and internal notes."
        statusCards={headerStatusCards}
      />

      {formError ? <AixiaAlert tone="error">{formError}</AixiaAlert> : null}
      {formMessage ? <AixiaAlert tone="success">{formMessage}</AixiaAlert> : null}

      {isPageLoading ? (
        <AixiaLoadingState
          fullPage={false}
          title="Loading create page"
          description="Permission state is being checked."
        />
      ) : !permissionState.canCreate ? (
        <AixiaAccessDeniedState
          title="Create access is not enabled"
          description="This page requires Company create access or Master Data admin access. Ask an Admin to update this user’s Finance role template or user-specific exception before creating internal company records."
        />
      ) : (
        <form id="company-create-form" onSubmit={handleSubmit}>
          <AixiaSmartLayout
            sidebar="normal"
            balance="main"
            bottomSpan="never"
            sideRebalance="last-to-bottom"
            mainTopCount={3}
            main={
              <>
                <AixiaSection
                  title="Basic Company Identity"
                  description="Legal name, display name, contact details, and lifecycle."
                  icon={Building2}
                >
                  <AixiaFormGrid columns="two">
                    <AixiaFormFullWidth>
                      <AixiaFieldLabel label="Legal Name" required />
                      <AixiaInputField
                        value={form.legal_name}
                        disabled={isSaving}
                        onChange={(event) =>
                          updateForm("legal_name", event.target.value)
                        }
                        placeholder="Legal company name"
                      />
                    </AixiaFormFullWidth>

                    <AixiaFormFullWidth>
                      <AixiaFieldLabel label="Display Name" />
                      <AixiaInputField
                        value={form.display_name}
                        disabled={isSaving}
                        onChange={(event) =>
                          updateForm("display_name", event.target.value)
                        }
                        placeholder="Optional short display name"
                      />
                    </AixiaFormFullWidth>

                    <AixiaFormField>
                      <AixiaFieldLabel label="Contact Person" />
                      <AixiaInputField
                        value={form.contact_person}
                        disabled={isSaving}
                        onChange={(event) =>
                          updateForm("contact_person", event.target.value)
                        }
                        placeholder="Primary contact"
                      />
                    </AixiaFormField>

                    <AixiaFormField>
                      <AixiaFieldLabel label="Email" />
                      <AixiaInputField
                        type="email"
                        value={form.email}
                        disabled={isSaving}
                        onChange={(event) => updateForm("email", event.target.value)}
                        placeholder="company@email.com"
                      />
                    </AixiaFormField>

                    <AixiaFormField>
                      <AixiaFieldLabel label="Phone" />
                      <AixiaInputField
                        value={form.phone}
                        disabled={isSaving}
                        onChange={(event) => updateForm("phone", event.target.value)}
                        placeholder="Company phone"
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
                  </AixiaFormGrid>
                </AixiaSection>

                <AixiaSection
                  title="Company Identity"
                  description="Default currency and legal registration fields."
                  icon={Landmark}
                >
                  <AixiaFormGrid columns="two">
                    <AixiaDisplayBlock
                      label="Company Code"
                      value="Auto-generated after company creation"
                      detail="Assigned by backend/company sequence."
                    />

                    <AixiaFormField>
                      <AixiaFieldLabel label="Currency Code" />
                      <AixiaSelectField
                        value={form.currency_code}
                        disabled={isSaving || isLoadingCurrencies}
                        onChange={(event) =>
                          updateForm("currency_code", event.target.value)
                        }
                      >
                        {currencyOptions.length === 0 ? (
                          <option value="" className="bg-[#05070d]">
                            No active currencies available
                          </option>
                        ) : (
                          currencyOptions.map((currency) => (
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
                        value={form.registration_number}
                        disabled={isSaving}
                        onChange={(event) =>
                          updateForm("registration_number", event.target.value)
                        }
                        placeholder="Registration number"
                      />
                    </AixiaFormField>

                    <AixiaFormField>
                      <AixiaFieldLabel label="Tax Number" />
                      <AixiaInputField
                        value={form.tax_number}
                        disabled={isSaving}
                        onChange={(event) =>
                          updateForm("tax_number", event.target.value)
                        }
                        placeholder="Tax number"
                      />
                    </AixiaFormField>

                    <AixiaFormFullWidth>
                      <AixiaFieldLabel label="Website" />
                      <AixiaInputField
                        value={form.website}
                        disabled={isSaving}
                        onChange={(event) =>
                          updateForm("website", event.target.value)
                        }
                        placeholder="https://example.com"
                      />
                    </AixiaFormFullWidth>
                  </AixiaFormGrid>
                </AixiaSection>

                <AixiaSection
                  title="Personnel"
                  description="People related to this company. Rows with empty values are ignored during save."
                  icon={Users}
                  actions={
                    <AixiaButton
                      type="button"
                      variant="secondary"
                      onClick={addPersonnelRow}
                      disabled={isSaving}
                    >
                      <Plus className="h-4 w-4" />
                      Add Person
                    </AixiaButton>
                  }
                >
                  <div className="aixia-form-row-list">
                    {form.personnel.map((row, index) => (
                      <AixiaFormRowCard
                        key={row.id}
                        title={`Person ${index + 1}`}
                        description={index === 0 ? "Primary personnel row." : undefined}
                        onRemove={() => removePersonnelRow(row.id)}
                        removeDisabled={isSaving || form.personnel.length === 1}
                      >
                        <AixiaFormGrid columns="two">
                          <AixiaFormField>
                            <AixiaFieldLabel label="Name" />
                            <AixiaInputField
                              value={row.name}
                              disabled={isSaving}
                              onChange={(event) =>
                                updatePersonnelRow(row.id, "name", event.target.value)
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
                                updatePersonnelRow(
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
                                updatePersonnelRow(row.id, "phone", event.target.value)
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
                                updatePersonnelRow(row.id, "email", event.target.value)
                              }
                              placeholder="Email"
                            />
                          </AixiaFormField>
                        </AixiaFormGrid>
                      </AixiaFormRowCard>
                    ))}
                  </div>
                </AixiaSection>

                <AixiaSection
                  title="Primary Addresses"
                  description="Primary legal and billing addresses. Rows with empty values are ignored during save."
                  icon={MapPin}
                  actions={
                    <AixiaButton
                      type="button"
                      variant="secondary"
                      onClick={addAddressRow}
                      disabled={isSaving}
                    >
                      <Plus className="h-4 w-4" />
                      Add Address
                    </AixiaButton>
                  }
                >
                  <div className="aixia-form-row-list">
                    {form.addresses.map((row, index) => (
                      <AixiaFormRowCard
                        key={row.id}
                        title={`Address ${index + 1}`}
                        description={index === 0 ? "Primary address row." : undefined}
                        onRemove={() => removeAddressRow(row.id)}
                        removeDisabled={isSaving || form.addresses.length === 1}
                      >
                        <AixiaFormGrid columns="two">
                          <AixiaFormField>
                            <AixiaFieldLabel label="Country" />
                            <AixiaInputField
                              value={row.country}
                              disabled={isSaving}
                              onChange={(event) =>
                                updateAddressRow(row.id, "country", event.target.value)
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
                                updateAddressRow(row.id, "city", event.target.value)
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
                                updateAddressRow(
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
                                updateAddressRow(
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
                                updateAddressRow(
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
                                updateAddressRow(
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
                </AixiaSection>

                <AixiaSection
                  title="Shipping Addresses"
                  description="Shipping addresses can be standalone or copied from primary addresses."
                  icon={Truck}
                  actions={
                    <AixiaButton
                      type="button"
                      variant="secondary"
                      onClick={addShippingRow}
                      disabled={isSaving}
                    >
                      <Plus className="h-4 w-4" />
                      Add Shipping
                    </AixiaButton>
                  }
                >
                  <div className="aixia-form-row-list">
                    {form.shipping_addresses.map((row, index) => (
                      <AixiaFormRowCard
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
                        <AixiaFormGrid columns="two">
                          <AixiaFormFullWidth>
                            <AixiaCheckboxField
                              checked={row.same_as_primary}
                              disabled={isSaving}
                              onChange={(event) =>
                                updateShippingRow(
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
                                    updateShippingRow(
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
                                    updateShippingRow(
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
                                    updateShippingRow(
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
                                    updateShippingRow(
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
                                    updateShippingRow(
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
                                    updateShippingRow(
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
                </AixiaSection>

                <AixiaSection
                  title="Notes"
                  description="Internal finance notes for this company."
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
                  description="Review the company before creating it."
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
                  description="Create opens the new company ID page directly."
                  icon={Save}
                >
                  <AixiaActionStack>
                    <AixiaButton type="submit" variant="primary" disabled={isSaving}>
                      {isSaving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      {isSaving ? "Creating..." : "Create Company"}
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

                <AixiaSection
                  title="Primary Preview"
                  description="First row values used for main company fields."
                  icon={Building2}
                >
                  <AixiaFormGrid columns="one">
                    <AixiaDisplayBlock
                      label="Currency"
                      value={getSelectedCurrencyLabel(form.currency_code, currencyOptions)}
                      detail="Saved as the company default currency."
                    />
                    <AixiaDisplayBlock
                      label="Main Country"
                      value={form.addresses[0]?.country || "—"}
                      detail="Saved to the company main country field."
                    />
                    <AixiaDisplayBlock
                      label="Main City"
                      value={form.addresses[0]?.city || "—"}
                      detail="Saved to the company main city field."
                    />
                    <AixiaDisplayBlock
                      label="Main Address Line 1"
                      value={form.addresses[0]?.address_line_1 || "—"}
                      detail="Saved to the company main address field."
                    />
                    <AixiaDisplayBlock
                      label="Primary Contact"
                      value={form.contact_person || "—"}
                      detail="Stored as the company primary contact."
                    />
                  </AixiaFormGrid>
                </AixiaSection>

                <AixiaAlert tone="info">
                  <AixiaAlertText
                    title="Locked create rule"
                    description="This page requires Company create access. New records can be created as Active or Inactive only. Archived companies are managed from the Company registry archive modal. Permission and currency refresh are silent and must not disturb the form."
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
