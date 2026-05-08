import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import {
  Building2,
  FileText,
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
import { createClient } from "@/lib/finance/clients";
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

type ClientCreateStatus = "active" | "inactive";

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
  contact_person: string;
  company_email: string;
  company_phone: string;
  status: ClientCreateStatus;
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
    contact_person: "",
    company_email: "",
    company_phone: "",
    status: "active",
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

  return {
    isAdmin,
    canRead:
      canManageMasterData ||
      hasPermission(permissions, "viewClients") ||
      hasPermission(permissions, "manageClients"),
    canCreate:
      canManageMasterData ||
      hasPermission(permissions, "manageClients") ||
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
        "Create Client permission RPC fallback:",
        result.error.message
      );
      return null;
    }

    if (!result.data || typeof result.data !== "object") {
      if (mode === "silent") {
        throw new Error(
          "Silent create client permission refresh returned no effective permission payload."
        );
      }

      return null;
    }

    return result.data as Partial<Record<Permission, boolean>>;
  } catch (error) {
    if (mode === "silent") {
      throw error;
    }

    console.warn("Create Client permission RPC failed:", error);
    return null;
  }
}

function normalizeStatus(value: string): ClientCreateStatus {
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

export default function FinanceMasterDataClientCreatePage() {
  const navigate = useNavigate();

  const [form, setForm] = useState<FormState>(() => createEmptyForm());
  const [profile, setProfile] = useState<ProfilePermissionRow | null>(null);
  const [effectivePermissions, setEffectivePermissions] =
    useState<Record<Permission, boolean> | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
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
            "Silent create client profile refresh returned no auth user; keeping current profile and permissions."
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
            "Silent create client profile refresh returned no profile; keeping current profile and permissions."
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
            "Silent create client profile refresh returned no role; keeping current permissions."
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
      console.error("Failed to load create client permissions:", error);

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

  useEffect(() => {
    void loadCurrentProfile("initial");
  }, [loadCurrentProfile]);

  useEffect(() => {
    const channel = supabase
      .channel("finance-master-data-client-create-page")
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
      .subscribe();

    const intervalId = window.setInterval(() => {
      void loadCurrentProfile("silent");
    }, 60000);

    return () => {
      window.clearInterval(intervalId);
      void supabase.removeChannel(channel);
    };
  }, [loadCurrentProfile]);

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
          "Client create access follows the Finance role template and user-specific exceptions.",
        icon: permissionState.canCreate ? ShieldCheck : LockKeyhole,
        tone: permissionState.canCreate ? "emerald" : "rose",
      },
      {
        label: "Save Result",
        value: "ID Page",
        description: backgroundRefreshing
          ? "Permission state is refreshing silently without disturbing the form."
          : "After successful creation, the new client detail page opens directly.",
        icon: Building2,
        tone: "cyan",
      },
    ];
  }, [backgroundRefreshing, isLoadingProfile, permissionState.canCreate]);

  const summaryItems = useMemo<SummaryItem[]>(() => {
    const filledPersonnel = countFilledPersonnel(form.personnel);
    const filledAddresses = countFilledAddresses(form.addresses);
    const filledShipping = countFilledShippingRows(form.shipping_addresses);

    return [
      {
        label: "Legal Name",
        value: form.legal_name.trim() || "Required",
        description: form.contact_person.trim() || "No primary contact yet",
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
      {
        label: "Status",
        value: form.status === "inactive" ? "Inactive" : "Active",
        description: "Archived records are managed only from the registry archive flow.",
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

      const created = await createClient({
        legal_name: trimmedLegalName,
        contact_name: form.contact_person.trim() || null,
        company_related_personnel: form.contact_person.trim() || null,
        status: form.status,
        company_email: form.company_email.trim() || null,
        company_phone: form.company_phone.trim() || null,
        country: form.addresses[0]?.country.trim() || null,
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
          client_id: created.id,
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
          .from("finance_client_personnel")
          .insert(personnelPayload);

        if (error) throw error;
      }

      const addressPayload = form.addresses
        .map((row, index) => ({
          client_id: created.id,
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
          .from("finance_client_addresses")
          .insert(addressPayload);

        if (error) throw error;
      }

      const shippingPayload = form.shipping_addresses
        .map((row, index) => ({
          client_id: created.id,
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

      if (shippingPayload.length > 0) {
        const { error } = await supabase
          .from("finance_client_addresses")
          .insert(shippingPayload);

        if (error) throw error;
      }

      setFormMessage("Client created. Opening the new client record.");
      navigate(`/finance/master-data/clients/${created.id}`);
    } catch (error) {
      console.error("Failed to create finance client:", error);
      setFormError(
        error instanceof Error ? error.message : "Failed to create client."
      );
    } finally {
      setIsSaving(false);
    }
  }

  const isPageLoading = isLoadingProfile;

  return (
    <AixiaPage>
      <AixiaHero
        parentLabel="Clients"
        parentPath="/finance/master-data/clients"
        badges={[
          { label: "New Finance Client", tone: "cyan" },
          { label: "Client master data", tone: "emerald" },
          { label: "Permission protected", tone: "cyan" },
          { label: "Opens ID page after create", tone: "neutral" },
        ]}
        gradientTitle="Create"
        title="Client"
        subtitle="Finance Customer Master Data"
        description="Create a finance client with legal identity, personnel, primary addresses, shipping addresses, and internal notes. After saving, the new client ID page opens directly."
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
          description="This page requires Client create access or Master Data admin access. Ask an Admin to update this user’s Finance role template or user-specific exception before creating finance client records."
        />
      ) : (
        <form id="client-create-form" onSubmit={handleSubmit}>
          <AixiaSmartLayout
            sidebar="normal"
            balance="main"
            bottomSpan="never"
            sideRebalance="last-to-bottom"
            mainTopCount={3}
            main={
              <>
                <AixiaSection
                  title="Basic Client Identity"
                  description="Legal name, primary contact, email, phone, and lifecycle status."
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

                    <AixiaFormField>
                      <AixiaFieldLabel label="Primary Contact Person" />
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
                      <AixiaFieldLabel label="Company Email" />
                      <AixiaInputField
                        type="email"
                        value={form.company_email}
                        disabled={isSaving}
                        onChange={(event) =>
                          updateForm("company_email", event.target.value)
                        }
                        placeholder="company@email.com"
                      />
                    </AixiaFormField>

                    <AixiaFormField>
                      <AixiaFieldLabel label="Company Phone" />
                      <AixiaInputField
                        value={form.company_phone}
                        disabled={isSaving}
                        onChange={(event) =>
                          updateForm("company_phone", event.target.value)
                        }
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
                  title="Personnel"
                  description="People related to this client. Rows with empty values are ignored during save."
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
                  description="Primary billing/legal addresses. Rows with empty values are ignored during save."
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
                  description="Internal finance notes for this client."
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
                  description="Review the client before creating it."
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
                  description="Create opens the new client ID page directly."
                  icon={Save}
                >
                  <AixiaActionStack>
                    <AixiaButton type="submit" variant="primary" disabled={isSaving}>
                      {isSaving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      {isSaving ? "Creating..." : "Create Client"}
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
                  description="First row values used for main client fields."
                  icon={Building2}
                >
                  <AixiaFormGrid columns="one">
                    <AixiaDisplayBlock
                      label="Main Country"
                      value={form.addresses[0]?.country || "—"}
                      detail="Saved to the client main country field."
                    />
                    <AixiaDisplayBlock
                      label="Main Address Line 1"
                      value={form.addresses[0]?.address_line_1 || "—"}
                      detail="Saved to the client main address field."
                    />
                    <AixiaDisplayBlock
                      label="Primary Contact"
                      value={form.contact_person || "—"}
                      detail="Also stored as company related personnel."
                    />
                    <AixiaDisplayBlock
                      label="Company Email"
                      value={form.company_email || "—"}
                      detail="Used for client communications."
                    />
                  </AixiaFormGrid>
                </AixiaSection>

                <AixiaAlert tone="info">
                  <AixiaAlertText
                    title="Locked create rule"
                    description="This page requires Client create access. New records can be created as Active or Inactive only. Archived clients are managed from the Client registry archive modal."
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
