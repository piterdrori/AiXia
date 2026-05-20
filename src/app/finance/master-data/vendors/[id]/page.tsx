import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Archive, Banknote, Building2, FileText, Loader2, Mail, MapPin, Pencil, Phone, Plus, RotateCcw, Save, ShieldCheck, Trash2, Truck, UserRound, Users, X } from "lucide-react";

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
  FinancePage,
  AixiaReviewBlock,
  AixiaReviewGrid,
  AixiaSection,
  AixiaSelectField,
  AixiaSmartLayout,
  AixiaStatusBadge,
  AixiaTextareaField,
  AixiaValueBlock,
} from "@/components/aixia";

import { archiveVendor, updateVendor } from "@/lib/finance/vendors";
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

type VendorStatus = "active" | "inactive" | "archived";

type VendorDetailRecord = {
  id: string;
  code: string | null;
  name: string;
  legal_name: string | null;
  contact_person: string | null;
  status: VendorStatus;
  company_email: string | null;
  company_phone: string | null;
  country: string | null;
  address_line_1: string | null;
  address_line_2: string | null;
  shipping_address_line_1: string | null;
  shipping_address_line_2: string | null;
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

type VendorBankAccountRow = {
  id: string;
  vendor_id: string | null;
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

type EditSection =
  | null
  | "overview"
  | "personnel"
  | "primary-addresses"
  | "shipping-addresses"
  | "notes";

type OverviewDraft = {
  legal_name: string;
  display_name: string;
  contact_person: string;
  company_email: string;
  company_phone: string;
  status: VendorStatus;
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

const VENDOR_DETAIL_ACCESS_CONFIG = {
  sectionKey: "masterData",
  adminPermissions: ["manageFinanceMasterData"],
  readPermissions: [
    "accessFinance",
    "viewFinance",
    "manageFinanceMasterData",
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

const EMPTY_OVERVIEW_DRAFT: OverviewDraft = {
  legal_name: "",
  display_name: "",
  contact_person: "",
  company_email: "",
  company_phone: "",
  status: "active",
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

function normalizeStatus(value: string): VendorStatus {
  if (value === "inactive" || value === "archived") return value;
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

function getVendorDisplayName(vendor: VendorDetailRecord | null) {
  if (!vendor) return "Vendor";
  return vendor.legal_name || vendor.name || "Vendor";
}

function getPrimaryAddressSummary(addresses: AddressRow[]) {
  const primary = addresses[0];

  if (!primary) return "No primary address";

  const parts = [
    primary.address_line_1,
    primary.city,
    primary.state_province,
    primary.country,
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(", ") : "Primary address incomplete";
}

function getShippingSummary(shippingAddresses: AddressRow[]) {
  if (shippingAddresses.length === 0) return "No shipping address";

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

function getBankIdentifierLabel(account: VendorBankAccountRow) {
  if (account.account_identifier_type === "iban") return "IBAN";
  if (account.account_identifier_type === "swift") return "SWIFT";
  return "Identifier";
}

function getBankIdentifierValue(account: VendorBankAccountRow) {
  if (account.account_identifier_value) return account.account_identifier_value;
  if (account.account_number) return account.account_number;
  return "—";
}

function getBankLocationLabel(account: VendorBankAccountRow) {
  const parts = [account.city, account.country].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : "—";
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

export default function FinanceMasterDataVendorDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [profile, setProfile] = useState<ProfilePermissionRow | null>(null);
  const [effectivePermissions, setEffectivePermissions] =
    useState<Partial<Record<Permission, boolean>> | null>(null);
  const [vendor, setVendor] = useState<VendorDetailRecord | null>(null);
  const [personnel, setPersonnel] = useState<PersonnelRow[]>([]);
  const [addresses, setAddresses] = useState<AddressRow[]>([]);
  const [shippingAddresses, setShippingAddresses] = useState<AddressRow[]>([]);
  const [vendorBankAccounts, setVendorBankAccounts] = useState<
    VendorBankAccountRow[]
  >([]);

  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isLoadingVendor, setIsLoadingVendor] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isLifecycleRunning, setIsLifecycleRunning] = useState(false);
  const [activeBankActionId, setActiveBankActionId] = useState<string | null>(null);

  const [editingSection, setEditingSection] = useState<EditSection>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [pageMessage, setPageMessage] = useState<string | null>(null);

  const [overviewDraft, setOverviewDraft] =
    useState<OverviewDraft>(EMPTY_OVERVIEW_DRAFT);
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
    if (mode === "initial") setIsLoadingProfile(true);

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
            "Silent vendor ID permission refresh returned no auth user; keeping current permission state."
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
            "Silent vendor ID profile refresh returned no profile; keeping current permission state."
          );
        }

        return;
      }

      const backendPermissions = await fetchFinanceEffectivePermissions(
        authUserId,
        mode,
        "Vendor Detail"
      );

      setProfile(loadedProfile);
      setEffectivePermissions(backendPermissions || loadedProfile.permissions || null);
    } catch (error) {
      console.error("Failed to load vendor ID permissions:", error);

      if (mode === "initial") {
        setProfile(null);
        setEffectivePermissions(null);
      }
    } finally {
      if (mode === "initial") setIsLoadingProfile(false);
    }
  }, []);

  const loadVendor = useCallback(
    async (mode: LoadMode = "initial") => {
      if (!id) return;

      if (mode === "initial") {
        setIsLoadingVendor(true);
        setPageError(null);
      }

      try {
        const [
          vendorResult,
          personnelResult,
          addressResult,
          vendorBankAccountsResult,
        ] = await Promise.all([
          supabase
            .from("finance_vendors")
            .select(
              `
                id,
                code,
                name,
                legal_name,
                contact_person,
                status,
                company_email,
                company_phone,
                country,
                address_line_1,
                address_line_2,
                shipping_address_line_1,
                shipping_address_line_2,
                notes,
                created_at,
                updated_at
              `
            )
            .eq("id", id)
            .single(),
          supabase
            .from("finance_vendor_personnel")
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
            .eq("vendor_id", id)
            .order("sort_order", { ascending: true }),
          supabase
            .from("finance_vendor_addresses")
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
            .eq("vendor_id", id)
            .order("address_type", { ascending: true })
            .order("sort_order", { ascending: true }),
          supabase
            .from("finance_vendor_bank_accounts")
            .select(
              `
                id,
                vendor_id,
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
            .eq("vendor_id", id)
            .order("is_default", { ascending: false })
            .order("created_at", { ascending: false }),
        ]);

        if (vendorResult.error) throw vendorResult.error;
        if (personnelResult.error) throw personnelResult.error;
        if (addressResult.error) throw addressResult.error;
        if (vendorBankAccountsResult.error) throw vendorBankAccountsResult.error;

        const vendorData = vendorResult.data as VendorDetailRecord;
        const personnelData = (personnelResult.data ?? []) as PersonnelRow[];
        const addressData = (addressResult.data ?? []) as AddressRow[];
        const bankData = (vendorBankAccountsResult.data ?? []) as VendorBankAccountRow[];

        setVendor(vendorData);
        setPersonnel(personnelData);
        setAddresses(addressData.filter((row) => row.address_type === "primary"));
        setShippingAddresses(
          addressData.filter((row) => row.address_type === "shipping")
        );
        setVendorBankAccounts(bankData);
      } catch (error) {
        console.error("Failed to load finance vendor details:", error);

        if (mode === "initial") {
          setVendor(null);
          setPersonnel([]);
          setAddresses([]);
          setShippingAddresses([]);
          setVendorBankAccounts([]);
          setPageError(
            error instanceof Error
              ? error.message
              : "Failed to load finance vendor details."
          );
        }
      } finally {
        if (mode === "initial") setIsLoadingVendor(false);
      }
    },
    [id]
  );

  useEffect(() => {
    void Promise.all([loadCurrentProfile("initial"), loadVendor("initial")]);
  }, [loadCurrentProfile, loadVendor]);

  useEffect(() => {
    const channel = supabase
      .channel("finance-master-data-vendor-id-page")
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
        {
          event: "*",
          schema: "public",
          table: "finance_vendors",
          filter: id ? `id=eq.${id}` : undefined,
        },
        () => void loadVendor("silent")
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "finance_vendor_personnel",
          filter: id ? `vendor_id=eq.${id}` : undefined,
        },
        () => void loadVendor("silent")
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "finance_vendor_addresses",
          filter: id ? `vendor_id=eq.${id}` : undefined,
        },
        () => void loadVendor("silent")
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "finance_vendor_bank_accounts",
          filter: id ? `vendor_id=eq.${id}` : undefined,
        },
        () => void loadVendor("silent")
      )
      .subscribe();

    const intervalId = window.setInterval(() => {
      void Promise.all([loadCurrentProfile("silent"), loadVendor("silent")]);
    }, 60000);

    return () => {
      window.clearInterval(intervalId);
      void supabase.removeChannel(channel);
    };
  }, [id, loadCurrentProfile, loadVendor]);

  const permissionState = useMemo(() => {
    return resolveFinancePagePermissionState({
      profileRole: profile?.role,
      permissions: effectivePermissions,
      config: VENDOR_DETAIL_ACCESS_CONFIG,
    });
  }, [effectivePermissions, profile?.role]);

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

function cancelEditing() {
    setEditingSection(null);
    setPageError(null);
  }

  function openOverviewEditor() {
    if (!vendor || !permissionState.canUpdate) return;

    setPageError(null);
    setPageMessage(null);
    setOverviewDraft({
      legal_name: vendor.legal_name || vendor.name || "",
      display_name: vendor.name || "",
      contact_person: vendor.contact_person || "",
      company_email: vendor.company_email || "",
      company_phone: vendor.company_phone || "",
      status: vendor.status,
    });
    setEditingSection("overview");
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
    if (!vendor || !permissionState.canUpdate) return;

    setPageError(null);
    setPageMessage(null);
    setNotesDraft(vendor.notes || "");
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
    if (!vendor || !permissionState.canUpdate) return;

    const legalName = overviewDraft.legal_name.trim();

    if (!legalName) {
      setPageError("Legal name is required.");
      return;
    }

    const normalizedStatus = normalizeStatus(overviewDraft.status);

    if (
      normalizedStatus === "archived" &&
      vendor.status !== "archived" &&
      !permissionState.canDeleteArchive
    ) {
      setPageError("Delete/Archive access is required to archive this vendor.");
      return;
    }

    if (
      vendor.status === "archived" &&
      normalizedStatus !== "archived" &&
      !permissionState.canDeleteArchive
    ) {
      setPageError("Delete/Archive access is required to restore this vendor.");
      return;
    }

    try {
      setIsSaving(true);
      setPageError(null);
      setPageMessage(null);

      await updateVendor(vendor.id, {
        legal_name: legalName,
        name: overviewDraft.display_name.trim() || legalName,
        contact_person: overviewDraft.contact_person.trim() || null,
        company_related_personnel: overviewDraft.contact_person.trim() || null,
        company_email: overviewDraft.company_email.trim() || null,
        company_phone: overviewDraft.company_phone.trim() || null,
        status: normalizedStatus,
      });

      setEditingSection(null);
      setPageMessage("Vendor overview updated.");
      await loadVendor("silent");
    } catch (error) {
      console.error("Failed to save vendor overview:", error);
      setPageError(
        error instanceof Error ? error.message : "Failed to save vendor overview."
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function savePersonnelSection() {
    if (!vendor || !permissionState.canUpdate) return;

    try {
      setIsSaving(true);
      setPageError(null);
      setPageMessage(null);

      const { error: deleteError } = await supabase
        .from("finance_vendor_personnel")
        .delete()
        .eq("vendor_id", vendor.id);

      if (deleteError) throw deleteError;

      const payload = personnelDraft
        .map((row, index) => ({
          vendor_id: vendor.id,
          full_name: row.full_name.trim() || null,
          position: row.position.trim() || null,
          phone: row.phone.trim() || null,
          email: row.email.trim() || null,
          sort_order: index,
          is_primary: index === 0,
          status: "active",
        }))
        .filter((row) => row.full_name || row.position || row.phone || row.email);

      if (payload.length > 0) {
        const { error } = await supabase
          .from("finance_vendor_personnel")
          .insert(payload);

        if (error) throw error;
      }

      setEditingSection(null);
      setPageMessage("Vendor personnel updated.");
      await loadVendor("silent");
    } catch (error) {
      console.error("Failed to save vendor personnel:", error);
      setPageError(
        error instanceof Error ? error.message : "Failed to save vendor personnel."
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function savePrimaryAddressSection() {
    if (!vendor || !permissionState.canUpdate) return;

    try {
      setIsSaving(true);
      setPageError(null);
      setPageMessage(null);

      const { error: deleteError } = await supabase
        .from("finance_vendor_addresses")
        .delete()
        .eq("vendor_id", vendor.id)
        .eq("address_type", "primary");

      if (deleteError) throw deleteError;

      const payload = addressDraft
        .map((row, index) => ({
          vendor_id: vendor.id,
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
          .from("finance_vendor_addresses")
          .insert(payload);

        if (error) throw error;
      }

      await updateVendor(vendor.id, {
        country: addressDraft[0]?.country.trim() || null,
        address_line_1: addressDraft[0]?.address_line_1.trim() || null,
        address_line_2: addressDraft[0]?.address_line_2.trim() || null,
      });

      setEditingSection(null);
      setPageMessage("Primary addresses updated.");
      await loadVendor("silent");
    } catch (error) {
      console.error("Failed to save primary vendor addresses:", error);
      setPageError(
        error instanceof Error ? error.message : "Failed to save primary addresses."
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function saveShippingAddressSection() {
    if (!vendor || !permissionState.canUpdate) return;

    try {
      setIsSaving(true);
      setPageError(null);
      setPageMessage(null);

      const { error: deleteError } = await supabase
        .from("finance_vendor_addresses")
        .delete()
        .eq("vendor_id", vendor.id)
        .eq("address_type", "shipping");

      if (deleteError) throw deleteError;

      const payload = shippingDraft
        .map((row, index) => ({
          vendor_id: vendor.id,
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
          .from("finance_vendor_addresses")
          .insert(payload);

        if (error) throw error;
      }

      await updateVendor(vendor.id, {
        shipping_address_line_1: shippingDraft[0]?.same_as_primary
          ? null
          : shippingDraft[0]?.address_line_1.trim() || null,
        shipping_address_line_2: shippingDraft[0]?.same_as_primary
          ? null
          : shippingDraft[0]?.address_line_2.trim() || null,
      });

      setEditingSection(null);
      setPageMessage("Shipping addresses updated.");
      await loadVendor("silent");
    } catch (error) {
      console.error("Failed to save vendor shipping addresses:", error);
      setPageError(
        error instanceof Error ? error.message : "Failed to save shipping addresses."
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function saveNotesSection() {
    if (!vendor || !permissionState.canUpdate) return;

    try {
      setIsSaving(true);
      setPageError(null);
      setPageMessage(null);

      await updateVendor(vendor.id, {
        notes: notesDraft.trim() || null,
      });

      setEditingSection(null);
      setPageMessage("Vendor notes updated.");
      await loadVendor("silent");
    } catch (error) {
      console.error("Failed to save vendor notes:", error);
      setPageError(
        error instanceof Error ? error.message : "Failed to save vendor notes."
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleArchiveToggle() {
    if (!vendor || !permissionState.canDeleteArchive || isLifecycleRunning) return;

    try {
      setIsLifecycleRunning(true);
      setPageError(null);
      setPageMessage(null);

      if (vendor.status === "archived") {
        await updateVendor(vendor.id, { status: "active" });
        setPageMessage("Vendor restored.");
      } else {
        await archiveVendor(vendor.id);
        setPageMessage("Vendor archived.");
      }

      await loadVendor("silent");
    } catch (error) {
      console.error("Failed to update vendor lifecycle:", error);
      setPageError(
        error instanceof Error
          ? error.message
          : "Failed to update vendor lifecycle."
      );
    } finally {
      setIsLifecycleRunning(false);
    }
  }

  async function handleSetDefaultVendorBankAccount(accountId: string) {
    if (!permissionState.canUpdate || activeBankActionId) return;

    try {
      setActiveBankActionId(accountId);
      setPageError(null);
      setPageMessage(null);

      const { error: resetError } = await supabase
        .from("finance_vendor_bank_accounts")
        .update({ is_default: false })
        .eq("vendor_id", id);

      if (resetError) throw resetError;

      const { error } = await supabase
        .from("finance_vendor_bank_accounts")
        .update({ is_default: true })
        .eq("id", accountId);

      if (error) throw error;

      setPageMessage("Default vendor bank account updated.");
      await loadVendor("silent");
    } catch (error) {
      console.error("Failed to set default vendor bank account:", error);
      setPageError(
        error instanceof Error
          ? error.message
          : "Failed to set default vendor bank account."
      );
    } finally {
      setActiveBankActionId(null);
    }
  }

  const isPageLoading = isLoadingProfile || isLoadingVendor;

  if (isPageLoading) {
    return (
      <AixiaLoadingState
        title="Loading vendor detail"
        description="Vendor record, linked records, and permission state are being checked."
      />
    );
  }

  if (!vendor) {
    return (
      <FinancePage>
        <AixiaSection
          title="Vendor not found"
          description="The vendor record could not be loaded or no longer exists."
          icon={Building2}
          actions={
            <AixiaButton
              type="button"
              variant="primary"
              onClick={() => navigate("/finance/master-data/vendors")}
            >
              Vendors
            </AixiaButton>
          }
        >
          <AixiaEmptyState
            icon={Building2}
            title="Vendor not found"
            description="The vendor record could not be loaded or no longer exists."
          />
        </AixiaSection>
      </FinancePage>
    );
  }

  if (!permissionState.canRead) {
    return (
      <FinancePage>
        <AixiaHero
        className="shrink-0 space-y-4"
        surface="command"
          parentLabel="Vendors"
          parentPath="/finance/master-data/vendors"
          gradientTitle="Vendor"
          title="Access Locked"
          subtitle="Permission Protected Detail Page">
</AixiaHero>

      <div className="aixia-command-scroll">
<AixiaAccessDeniedState
          title="No vendor read access"
          description="Ask an Admin to assign a Finance role template or user-specific exception with Vendor, Payables, Finance, or Master Data read access."
        />
      </div>
    </FinancePage>
    );
  }

  return (
    <FinancePage>
      <AixiaHero
        className="shrink-0 space-y-4"
        surface="command"
        parentLabel="Vendors"
        parentPath="/finance/master-data/vendors"
        gradientTitle={getVendorDisplayName(vendor)}
        title="Vendor"
        subtitle="External Vendor Master Data"
        />

      <div className="aixia-command-scroll">
{pageError ? <AixiaAlert tone="error">{pageError}</AixiaAlert> : null}
      {pageMessage ? <AixiaAlert tone="success">{pageMessage}</AixiaAlert> : null}

      

      <AixiaSmartLayout
        sidebar="wide"
        balance="main"
        matchColumns
        bottomSpan="never"
        main={
          <>
            <AixiaSection
              title="Vendor Overview"
              description="Legal identity, display name, primary contact, communication, and lifecycle status."
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
                    <AixiaFieldLabel label="Legal Name" required />
                    <AixiaInputField
                      value={overviewDraft.legal_name}
                      disabled={isSaving}
                      onChange={(event) =>
                        updateOverviewDraft("legal_name", event.target.value)
                      }
                      placeholder="Legal vendor name"
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
                      value={overviewDraft.company_email}
                      disabled={isSaving}
                      onChange={(event) =>
                        updateOverviewDraft("company_email", event.target.value)
                      }
                      placeholder="vendor@email.com"
                    />
                  </AixiaFormField>

                  <AixiaFormField>
                    <AixiaFieldLabel label="Phone" />
                    <AixiaInputField
                      value={overviewDraft.company_phone}
                      disabled={isSaving}
                      onChange={(event) =>
                        updateOverviewDraft("company_phone", event.target.value)
                      }
                      placeholder="Vendor phone"
                    />
                  </AixiaFormField>

                  <AixiaFormField>
                    <AixiaFieldLabel label="Status" />
                    <AixiaSelectField
                      value={overviewDraft.status}
                      disabled={isSaving}
                      onChange={(event) =>
                        updateOverviewDraft(
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
                </AixiaFormGrid>
              ) : (
                <AixiaReviewGrid variant="cards">
                  <AixiaValueBlock
                    label="Legal Name"
                    value={getVendorDisplayName(vendor)}
                  />
                  <AixiaValueBlock label="Display Name" value={vendor.name || "—"} />
                  <AixiaValueBlock
                    label="Primary Contact"
                    value={vendor.contact_person || "—"}
                  />
                  <AixiaValueBlock
                    label="Email"
                    value={vendor.company_email || "—"}
                    detail={
                      vendor.company_email ? (
                        <span className="inline-flex items-center gap-1">
                          <Mail className="h-3.5 w-3.5" />
                          Communication email
                        </span>
                      ) : null
                    }
                  />
                  <AixiaValueBlock
                    label="Phone"
                    value={vendor.company_phone || "—"}
                    detail={
                      vendor.company_phone ? (
                        <span className="inline-flex items-center gap-1">
                          <Phone className="h-3.5 w-3.5" />
                          Communication phone
                        </span>
                      ) : null
                    }
                  />
                  <AixiaValueBlock
                    label="Lifecycle Status"
                    value={<AixiaStatusBadge value={vendor.status} />}
                  />
                </AixiaReviewGrid>
              )}
            </AixiaSection>

            <AixiaSection
              title="Personnel"
              description="People connected to this vendor."
              icon={Users}
              smartScroll
              visibleCards={8}
              actions={
                <SectionActions
                  isEditing={editingSection === "personnel"}
                  canEdit={permissionState.canUpdate}
                  isSaving={isSaving}
                  onEdit={openPersonnelEditor}
                  onCancel={cancelEditing}
                  onSave={() => void savePersonnelSection()}
                />
              }
            >
              {editingSection === "personnel" ? (
                <div className="aixia-stack">
                  <AixiaButton
                    type="button"
                    variant="primary"
                    onClick={addPersonnelDraftRow}
                    disabled={isSaving}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Person
                  </AixiaButton>

                  {personnelDraft.map((row, index) => (
                    <AixiaSection
                      key={row.id}
                      title={`Person ${index + 1}`}
                      description={index === 0 ? "Primary personnel row." : "Personnel row."}
                      icon={UserRound}
                      actions={
                        <AixiaButton
                          type="button"
                          variant="danger"
                          onClick={() => removePersonnelDraftRow(row.id)}
                          disabled={isSaving || personnelDraft.length === 1}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Remove
                        </AixiaButton>
                      }
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
                    </AixiaSection>
                  ))}
                </div>
              ) : personnel.length === 0 ? (
                <AixiaEmptyState
                  icon={Users}
                  title="No personnel added yet"
                  description="Vendor personnel rows will appear here after they are added."
                />
              ) : (
                <AixiaReviewGrid variant="cards">
                  {personnel.map((row, index) => (
                    <AixiaValueBlock
                      key={row.id}
                      label={`Person ${index + 1}`}
                      value={row.full_name || "—"}
                      detail={`${row.position || "No position"} • ${
                        row.email || "No email"
                      } • ${row.phone || "No phone"}`}
                    />
                  ))}
                </AixiaReviewGrid>
              )}
            </AixiaSection>

                        <AixiaSection
              title="Primary Addresses"
              description="Primary vendor address records."
              icon={MapPin}
              smartScroll
              visibleCards={8}
              actions={
                <SectionActions
                  isEditing={editingSection === "primary-addresses"}
                  canEdit={permissionState.canUpdate}
                  isSaving={isSaving}
                  onEdit={openPrimaryAddressEditor}
                  onCancel={cancelEditing}
                  onSave={() => void savePrimaryAddressSection()}
                />
              }
            >
              {editingSection === "primary-addresses" ? (
                <div className="aixia-stack">
                  <AixiaButton
                    type="button"
                    variant="primary"
                    onClick={addAddressDraftRow}
                    disabled={isSaving}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Address
                  </AixiaButton>

                  {addressDraft.map((row, index) => (
                    <AixiaSection
                      key={row.id}
                      title={`Address ${index + 1}`}
                      description={
                        index === 0 ? "Primary address row." : "Additional primary address."
                      }
                      icon={MapPin}
                      actions={
                        <AixiaButton
                          type="button"
                          variant="danger"
                          onClick={() => removeAddressDraftRow(row.id)}
                          disabled={isSaving || addressDraft.length === 1}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Remove
                        </AixiaButton>
                      }
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
                              updateAddressDraftRow(row.id, "city", event.target.value)
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
                    </AixiaSection>
                  ))}
                </div>
              ) : addresses.length === 0 ? (
                <AixiaEmptyState
                  icon={MapPin}
                  title="No primary addresses added yet"
                  description="Primary vendor addresses will appear here after they are added."
                />
              ) : (
                <AixiaReviewGrid variant="cards">
                  {addresses.map((row, index) => (
                    <AixiaValueBlock
                      key={row.id}
                      label={`Address ${index + 1}`}
                      value={
                        row.address_line_1 ||
                        row.city ||
                        row.country ||
                        "Primary address"
                      }
                      detail={[
                        row.city,
                        row.state_province,
                        row.postal_code,
                        row.country,
                        row.address_line_2,
                      ]
                        .filter(Boolean)
                        .join(" • ")}
                    />
                  ))}
                </AixiaReviewGrid>
              )}
            </AixiaSection>

            <AixiaSection
              title="Shipping Addresses"
              description="Shipping destinations for this vendor."
              icon={Truck}
              smartScroll
              visibleCards={8}
              actions={
                <SectionActions
                  isEditing={editingSection === "shipping-addresses"}
                  canEdit={permissionState.canUpdate}
                  isSaving={isSaving}
                  onEdit={openShippingAddressEditor}
                  onCancel={cancelEditing}
                  onSave={() => void saveShippingAddressSection()}
                />
              }
            >
              {editingSection === "shipping-addresses" ? (
                <div className="aixia-stack">
                  <AixiaButton
                    type="button"
                    variant="primary"
                    onClick={addShippingDraftRow}
                    disabled={isSaving}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Shipping
                  </AixiaButton>

                  {shippingDraft.map((row, index) => (
                    <AixiaSection
                      key={row.id}
                      title={`Shipping ${index + 1}`}
                      description={
                        row.same_as_primary
                          ? "Linked to a primary address."
                          : "Standalone shipping address."
                      }
                      icon={Truck}
                      actions={
                        <AixiaButton
                          type="button"
                          variant="danger"
                          onClick={() => removeShippingDraftRow(row.id)}
                          disabled={isSaving || shippingDraft.length === 1}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Remove
                        </AixiaButton>
                      }
                    >
                      <div className="aixia-stack">
                        <AixiaFormField>
                          <AixiaFieldLabel label="Same as Primary Address" />
                          <AixiaSelectField
                            value={row.same_as_primary ? "yes" : "no"}
                            disabled={isSaving}
                            onChange={(event) =>
                              updateShippingDraftRow(
                                row.id,
                                "same_as_primary",
                                event.target.value === "yes"
                              )
                            }
                          >
                            <option value="no">No</option>
                            <option value="yes">Yes</option>
                          </AixiaSelectField>
                        </AixiaFormField>

                        {row.same_as_primary ? (
                          <AixiaFormField>
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
                              <option value="">Select address</option>
                              {primaryAddressOptions.map((option) => (
                                <option key={option.id} value={option.id}>
                                  {option.label}
                                </option>
                              ))}
                            </AixiaSelectField>
                          </AixiaFormField>
                        ) : (
                          <AixiaFormGrid columns="two">
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
                          </AixiaFormGrid>
                        )}
                      </div>
                    </AixiaSection>
                  ))}
                </div>
              ) : shippingAddresses.length === 0 ? (
                <AixiaEmptyState
                  icon={Truck}
                  title="No shipping addresses added yet"
                  description="Shipping addresses will appear here after they are added."
                />
              ) : (
                <AixiaReviewGrid variant="cards">
                  {shippingAddresses.map((row, index) => (
                    <AixiaValueBlock
                      key={row.id}
                      label={`Shipping ${index + 1}`}
                      value={
                        row.is_same_as_primary
                          ? "Same as primary address"
                          : row.address_line_1 || row.city || row.country || "Shipping address"
                      }
                      detail={
                        row.is_same_as_primary
                          ? "Linked to primary address"
                          : [
                              row.city,
                              row.state_province,
                              row.postal_code,
                              row.country,
                              row.address_line_2,
                            ]
                              .filter(Boolean)
                              .join(" • ")
                      }
                    />
                  ))}
                </AixiaReviewGrid>
              )}
            </AixiaSection>

            <AixiaSection
              title="Notes"
              description="Internal finance notes for this vendor."
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
                  value={vendor.notes || "No notes added yet."}
                  detail="Internal finance notes for this vendor."
                />
              )}
            </AixiaSection>

            <AixiaSection
              title="Vendor Bank Accounts"
              description="Vendor payout bank accounts recorded from vendor-provided payment details."
              icon={Banknote}
              smartScroll
              visibleCards={8}
              actions={
                permissionState.canUpdate ? (
                  <AixiaButton
                    type="button"
                    variant="primary"
                    onClick={() =>
                      navigate(`/finance/master-data/vendor-bank-accounts/new?vendor_id=${id}`)
                    }
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Bank Account
                  </AixiaButton>
                ) : null
              }
            >
              {vendorBankAccounts.length === 0 ? (
                <AixiaEmptyState
                  icon={Banknote}
                  title="No vendor bank accounts added yet"
                  description="Vendor payout bank accounts will appear here after they are created."
                />
              ) : (
                <AixiaReviewGrid variant="cards">
                  {vendorBankAccounts.map((account, index) => {
                    const isBankActionRunning = activeBankActionId === account.id;

                    return (
                      <AixiaValueBlock
                        key={account.id}
                        label={`Vendor Account ${index + 1}`}
                        value={account.bank_name || "Vendor Bank Account"}
                        detail={
                          <div className="aixia-stack">
                            <div>
                              {account.beneficiary_name || "No beneficiary"} •{" "}
                              {account.currency_code || "No currency"} •{" "}
                              {getBankIdentifierLabel(account)}:{" "}
                              {getBankIdentifierValue(account)}
                            </div>

                            <div>
                              {getBankLocationLabel(account)} •{" "}
                              {formatDateTimeLabel(
                                account.updated_at || account.created_at
                              )}
                            </div>

                            <div className="flex flex-wrap gap-2">
                              {account.is_default ? (
                                <AixiaBadge tone="emerald">Default</AixiaBadge>
                              ) : (
                                <AixiaBadge tone="neutral">Standard</AixiaBadge>
                              )}

                              <AixiaStatusBadge value={account.status || "active"} />
                            </div>

                            <div className="flex flex-wrap gap-2">
                              {!account.is_default && permissionState.canUpdate ? (
                                <AixiaButton
                                  type="button"
                                  variant="secondary"
                                  onClick={() =>
                                    void handleSetDefaultVendorBankAccount(account.id)
                                  }
                                  disabled={Boolean(activeBankActionId)}
                                >
                                  {isBankActionRunning ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <ShieldCheck className="h-3.5 w-3.5" />
                                  )}
                                  Set Default
                                </AixiaButton>
                              ) : null}

                              <AixiaButton
                                type="button"
                                variant="primary"
                                onClick={() =>
                                  navigate(
                                    `/finance/master-data/vendor-bank-accounts/${account.id}`
                                  )
                                }
                              >
                                Open
                              </AixiaButton>
                            </div>
                          </div>
                        }
                      />
                    );
                  })}
                </AixiaReviewGrid>
              )}
            </AixiaSection>
          </>
        }
        side={
          <>
            <AixiaSection
              title="Record Summary"
              description="Key vendor details and linked finance records."
              icon={Building2}
            >
              <AixiaReviewGrid variant="compact">
                <AixiaReviewBlock
                  label="Vendor Code"
                  value={vendor.code || "—"}
                  description="Vendor master-data code."
                />
                <AixiaReviewBlock
                  label="Record ID"
                  value={vendor.id}
                  description="Database record identifier."
                />
                <AixiaReviewBlock
                  label="Created"
                  value={formatDateTimeLabel(vendor.created_at)}
                  description="Audit timestamp."
                />
                <AixiaReviewBlock
                  label="Updated"
                  value={formatDateTimeLabel(vendor.updated_at)}
                  description="Audit timestamp."
                />
                <AixiaReviewBlock
                  label="Primary Address"
                  value={getPrimaryAddressSummary(addresses)}
                  description="Primary vendor address summary."
                />
                <AixiaReviewBlock
                  label="Shipping"
                  value={getShippingSummary(shippingAddresses)}
                  description="Shipping-address summary."
                />
                <AixiaReviewBlock
                  label="Default Vendor Bank"
                  value={
                    vendorBankAccounts.find((account) => account.is_default)
                      ?.bank_name || "—"
                  }
                  description="Default payout account."
                />
              </AixiaReviewGrid>
            </AixiaSection>

            <AixiaSection
              title="Lifecycle Actions"
              description="Archive or restore this vendor. Permanent delete is only available from the registry archive modal."
              icon={Archive}
            >
              <div className="aixia-stack">
                {permissionState.canDeleteArchive ? (
                  <AixiaButton
                    type="button"
                    variant={vendor.status === "archived" ? "secondary" : "danger"}
                    onClick={() => void handleArchiveToggle()}
                    disabled={isLifecycleRunning}
                  >
                    {isLifecycleRunning ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : vendor.status === "archived" ? (
                      <RotateCcw className="h-4 w-4" />
                    ) : (
                      <Archive className="h-4 w-4" />
                    )}
                    {vendor.status === "archived" ? "Restore Vendor" : "Archive Vendor"}
                  </AixiaButton>
                ) : (
                  <AixiaAlert tone="info">
                    Delete/Archive access is not enabled for this user.
                  </AixiaAlert>
                )}

                <AixiaButton
                  type="button"
                  variant="secondary"
                  onClick={() => navigate("/finance/master-data/vendors")}
                >
                  Vendors
                </AixiaButton>
              </div>
            </AixiaSection>

            <AixiaAccessRule
              title="Locked detail rule"
              description="Finance detail pages must use shared AiXia source-of-truth components."
            >
              This page requires Vendor / Payables / Finance / Master Data read access.
              Section edits require Update access. Archive and Restore require
              Delete/Archive access. Vendor bank account default updates are silent and
              must not jump the page or reset the UI.
            </AixiaAccessRule>
          </>
        }
      />
      </div></FinancePage>
  );
}
