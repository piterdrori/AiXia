import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  Building2,
  FileText,
  Landmark,
  Loader2,
  LockKeyhole,
  MapPin,
  Plus,
  RotateCcw,
  Save,
  ShieldCheck,
  Trash2,
  Truck,
  UserRound,
  Users,
} from "lucide-react";

import {
  AixiaAccessDeniedState,
  AixiaAccessRule,
  AixiaAlert,
  AixiaButton,
  AixiaFieldLabel,
  AixiaFormField,
  AixiaFormFullWidth,
  AixiaFormGrid,
  AixiaHero,
  AixiaInputField,
  AixiaLoadingState,
  AixiaMetricCard,
  AixiaMetricGrid,
  AixiaPage,
  AixiaReviewBlock,
  AixiaReviewGrid,
  AixiaSection,
  AixiaSelectField,
  AixiaSmartLayout,
  AixiaTextareaField,
} from "@/components/aixia";

import { createVendor } from "@/lib/finance/vendors";
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

type VendorCreateStatus = "active" | "inactive";

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
  company_email: string;
  company_phone: string;
  status: VendorCreateStatus;
  personnel: PersonnelRow[];
  addresses: AddressRow[];
  shipping_addresses: ShippingRow[];
  notes: string;
};

const VENDOR_CREATE_ACCESS_CONFIG = {
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
    company_email: "",
    company_phone: "",
    status: "active",
    personnel: [createEmptyPersonnelRow()],
    addresses: [createEmptyAddressRow()],
    shipping_addresses: [createEmptyShippingRow()],
    notes: "",
  };
}

function normalizeStatus(value: string): VendorCreateStatus {
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

export default function FinanceMasterDataVendorCreatePage() {
  const navigate = useNavigate();

  const [form, setForm] = useState<FormState>(() => createEmptyForm());
  const [profile, setProfile] = useState<ProfilePermissionRow | null>(null);
  const [effectivePermissions, setEffectivePermissions] =
    useState<Partial<Record<Permission, boolean>> | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
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
            "Silent create vendor permission refresh returned no auth user; keeping current permission state."
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
            "Silent create vendor profile refresh returned no profile; keeping current permission state."
          );
        }

        return;
      }

      const backendPermissions = await fetchFinanceEffectivePermissions(
        authUserId,
        mode,
        "Create Vendor"
      );

      setProfile(loadedProfile);
      setEffectivePermissions(backendPermissions || loadedProfile.permissions || null);
    } catch (error) {
      console.error("Failed to load create vendor permissions:", error);

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

  useEffect(() => {
    void loadCurrentProfile("initial");
  }, [loadCurrentProfile]);

  useEffect(() => {
    const channel = supabase
      .channel("finance-master-data-vendor-create-page")
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
    return resolveFinancePagePermissionState({
      profileRole: profile?.role,
      permissions: effectivePermissions,
      config: VENDOR_CREATE_ACCESS_CONFIG,
    });
  }, [effectivePermissions, profile?.role]);

  const addressOptions = useMemo(() => {
    return form.addresses.map((address, index) => ({
      id: address.id,
      label:
        address.address_line_1.trim() ||
        address.city.trim() ||
        address.country.trim() ||
        `Address ${index + 1}`,
    }));
  }, [form.addresses]);

  const filledPersonnel = useMemo(
    () => countFilledPersonnel(form.personnel),
    [form.personnel]
  );

  const filledAddresses = useMemo(
    () => countFilledAddresses(form.addresses),
    [form.addresses]
  );

  const filledShipping = useMemo(
    () => countFilledShippingRows(form.shipping_addresses),
    [form.shipping_addresses]
  );

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

      const created = await createVendor({
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
          display_name: form.display_name.trim() || null,
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
          vendor_id: created.id,
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
          .from("finance_vendor_personnel")
          .insert(personnelPayload);

        if (error) throw error;
      }

      const addressPayload = form.addresses
        .map((row, index) => ({
          vendor_id: created.id,
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
          .from("finance_vendor_addresses")
          .insert(addressPayload);

        if (error) throw error;
      }

      const shippingPayload = form.shipping_addresses
        .map((row, index) => ({
          vendor_id: created.id,
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
          .from("finance_vendor_addresses")
          .insert(shippingPayload);

        if (error) throw error;
      }

      setFormMessage("Vendor created. Opening the new vendor record.");
      navigate(`/finance/master-data/vendors/${created.id}`);
    } catch (error) {
      console.error("Failed to create finance vendor:", error);
      setFormError(
        error instanceof Error ? error.message : "Failed to create vendor."
      );
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoadingProfile) {
    return (
      <AixiaLoadingState
        title="Loading create vendor"
        description="Permission state is being checked."
      />
    );
  }

  return (
    <AixiaPage>
      <AixiaHero
        parentLabel="Vendors"
        parentPath="/finance/master-data/vendors"
        badges={[
          { label: "New Vendor Master Record", tone: "cyan" },
          { label: "Vendor Controlled By Us", tone: "emerald" },
          { label: "Permission Protected", tone: "violet" },
          { label: "Opens ID Page After Create", tone: "neutral" },
        ]}
        gradientTitle="Create"
        title="Vendor"
        subtitle="External Vendor Master Data"
        description="Create an external vendor master-data record with legal identity, contact details, personnel, primary addresses, shipping addresses, and internal notes for procurement and payables workflows."
        statusCards={[
          {
            label: "Create Access",
            value: permissionState.canCreate ? "Enabled" : "Locked",
            description:
              "Vendor create access follows the Finance role template and user-specific exceptions.",
            icon: permissionState.canCreate ? ShieldCheck : LockKeyhole,
            tone: permissionState.canCreate ? "emerald" : "rose",
          },
          {
            label: "Save Result",
            value: "ID Page",
            description:
              "After successful creation, the new vendor detail page opens directly.",
            icon: Landmark,
            tone: "cyan",
          },
        ]}
      />

      {formError ? <AixiaAlert tone="error">{formError}</AixiaAlert> : null}
      {formMessage ? <AixiaAlert tone="success">{formMessage}</AixiaAlert> : null}

      {!permissionState.canCreate ? (
        <AixiaAccessDeniedState
          title="Create access is not enabled"
          description="This page requires Vendor create access, Vendor management access, or Master Data admin access. Ask an Admin to update this user’s Finance role template or user-specific exception before creating vendor master-data records."
        />
      ) : (
        <form id="vendor-create-form" onSubmit={handleSubmit}>
          <AixiaMetricGrid>
            <AixiaMetricCard
              label="Legal Name"
              value={form.legal_name.trim() || "Required"}
              description={form.display_name.trim() || "No display name yet"}
              icon={Building2}
              tone={form.legal_name.trim() ? "emerald" : "gold"}
            />

            <AixiaMetricCard
              label="Primary Contact"
              value={form.contact_person.trim() || "—"}
              description={form.company_email.trim() || "No vendor email yet"}
              icon={UserRound}
              tone={
                form.contact_person.trim() || form.company_email.trim()
                  ? "cyan"
                  : "gold"
              }
            />

            <AixiaMetricCard
              label="Personnel"
              value={`${filledPersonnel} Filled`}
              description={`${form.personnel.length} row${
                form.personnel.length === 1 ? "" : "s"
              } available`}
              icon={Users}
              tone={filledPersonnel > 0 ? "violet" : "gold"}
            />

            <AixiaMetricCard
              label="Addresses"
              value={`${filledAddresses} Filled`}
              description={`${filledShipping} shipping row${
                filledShipping === 1 ? "" : "s"
              } ready`}
              icon={MapPin}
              tone={filledAddresses > 0 ? "emerald" : "rose"}
            />
          </AixiaMetricGrid>

          <AixiaSmartLayout
            sidebar="wide"
            balance="main"
            matchColumns
            bottomSpan="never"
            main={
              <>
                <AixiaSection
                  title="Basic Vendor Identity"
                  description="Legal name, display name, primary contact, communication, and lifecycle."
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
                        placeholder="Legal vendor name"
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
                        placeholder="Primary vendor contact"
                      />
                    </AixiaFormField>

                    <AixiaFormField>
                      <AixiaFieldLabel label="Email" />
                      <AixiaInputField
                        type="email"
                        value={form.company_email}
                        disabled={isSaving}
                        onChange={(event) =>
                          updateForm("company_email", event.target.value)
                        }
                        placeholder="vendor@email.com"
                      />
                    </AixiaFormField>

                    <AixiaFormField>
                      <AixiaFieldLabel label="Phone" />
                      <AixiaInputField
                        value={form.company_phone}
                        disabled={isSaving}
                        onChange={(event) =>
                          updateForm("company_phone", event.target.value)
                        }
                        placeholder="Vendor phone"
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
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </AixiaSelectField>
                    </AixiaFormField>
                  </AixiaFormGrid>
                </AixiaSection>

                <AixiaSection
                  title="Personnel"
                  description="People related to this vendor. Rows with empty values are ignored during save."
                  icon={Users}
                  smartScroll
                  visibleCards={8}
                  actions={
                    <AixiaButton
                      type="button"
                      variant="primary"
                      onClick={addPersonnelRow}
                      disabled={isSaving}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add Person
                    </AixiaButton>
                  }
                >
                  <div className="aixia-stack">
                    {form.personnel.map((row, index) => (
                      <AixiaSection
                        key={row.id}
                        title={`Person ${index + 1}`}
                        description={
                          index === 0 ? "Primary personnel row." : "Personnel row."
                        }
                        icon={UserRound}
                        actions={
                          <AixiaButton
                            type="button"
                            variant="danger"
                            onClick={() => removePersonnelRow(row.id)}
                            disabled={isSaving || form.personnel.length === 1}
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
                              value={row.name}
                              disabled={isSaving}
                              onChange={(event) =>
                                updatePersonnelRow(
                                  row.id,
                                  "name",
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
                                updatePersonnelRow(
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
                                updatePersonnelRow(
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
                </AixiaSection>

                <AixiaSection
                  title="Primary Addresses"
                  description="Primary vendor addresses. Rows with empty values are ignored during save."
                  icon={MapPin}
                  smartScroll
                  visibleCards={8}
                  actions={
                    <AixiaButton
                      type="button"
                      variant="primary"
                      onClick={addAddressRow}
                      disabled={isSaving}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add Address
                    </AixiaButton>
                  }
                >
                  <div className="aixia-stack">
                    {form.addresses.map((row, index) => (
                      <AixiaSection
                        key={row.id}
                        title={`Address ${index + 1}`}
                        description={
                          index === 0
                            ? "Primary address row."
                            : "Additional primary address."
                        }
                        icon={MapPin}
                        actions={
                          <AixiaButton
                            type="button"
                            variant="danger"
                            onClick={() => removeAddressRow(row.id)}
                            disabled={isSaving || form.addresses.length === 1}
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
                                updateAddressRow(
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
                                updateAddressRow(
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
                      </AixiaSection>
                    ))}
                  </div>
                </AixiaSection>

                <AixiaSection
                  title="Shipping Addresses"
                  description="Shipping addresses can be standalone or copied from primary vendor addresses."
                  icon={Truck}
                  smartScroll
                  visibleCards={8}
                  actions={
                    <AixiaButton
                      type="button"
                      variant="primary"
                      onClick={addShippingRow}
                      disabled={isSaving}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add Shipping
                    </AixiaButton>
                  }
                >
                  <div className="aixia-stack">
                    {form.shipping_addresses.map((row, index) => (
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
                            onClick={() => removeShippingRow(row.id)}
                            disabled={isSaving || form.shipping_addresses.length === 1}
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
                                updateShippingRow(
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
                                  updateShippingRow(
                                    row.id,
                                    "source_address_id",
                                    event.target.value
                                  )
                                }
                              >
                                <option value="">Select address</option>
                                {addressOptions.map((option) => (
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
                            </AixiaFormGrid>
                          )}
                        </div>
                      </AixiaSection>
                    ))}
                  </div>
                </AixiaSection>

                <AixiaSection
                  title="Notes"
                  description="Internal finance notes for this vendor."
                  icon={FileText}
                >
                  <AixiaFormFullWidth>
                    <AixiaFieldLabel label="Notes" />
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
                  description="Review the vendor before creating it."
                  icon={Building2}
                >
                  <AixiaReviewGrid variant="compact">
                    <AixiaReviewBlock
                      label="Legal Name"
                      value={form.legal_name.trim() || "Required"}
                      description={form.display_name.trim() || "No display name yet"}
                    />

                    <AixiaReviewBlock
                      label="Primary Contact"
                      value={form.contact_person.trim() || "—"}
                      description={form.company_email.trim() || "No vendor email yet"}
                    />

                    <AixiaReviewBlock
                      label="Personnel"
                      value={`${filledPersonnel} Filled`}
                      description={`${form.personnel.length} row${
                        form.personnel.length === 1 ? "" : "s"
                      } available`}
                    />

                    <AixiaReviewBlock
                      label="Addresses"
                      value={`${filledAddresses} Filled`}
                      description={`${filledShipping} shipping row${
                        filledShipping === 1 ? "" : "s"
                      } ready`}
                    />
                  </AixiaReviewGrid>
                </AixiaSection>

                <AixiaSection
                  title="Actions"
                  description="Create opens the new vendor ID page directly."
                  icon={Save}
                >
                  <div className="aixia-stack">
                    <AixiaButton type="submit" variant="primary" disabled={isSaving}>
                      {isSaving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      {isSaving ? "Creating..." : "Create Vendor"}
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
                  title="Primary Preview"
                  description="First row values used for main vendor fields."
                  icon={MapPin}
                >
                  <AixiaReviewGrid variant="compact">
                    <AixiaReviewBlock
                      label="Main Country"
                      value={form.addresses[0]?.country || "—"}
                      description="Saved to the vendor main country field."
                    />

                    <AixiaReviewBlock
                      label="Main City"
                      value={form.addresses[0]?.city || "—"}
                      description="Saved inside vendor address master data."
                    />

                    <AixiaReviewBlock
                      label="Main Address Line 1"
                      value={form.addresses[0]?.address_line_1 || "—"}
                      description="Saved to the vendor main address field."
                    />

                    <AixiaReviewBlock
                      label="Primary Contact"
                      value={form.contact_person || "—"}
                      description="Stored as the vendor primary contact."
                    />
                  </AixiaReviewGrid>
                </AixiaSection>

                <AixiaAccessRule
                  title="Locked create rule"
                  description="Finance create pages must use shared AiXia source-of-truth components."
                >
                  This page requires Vendor create access, Vendor management access, or
                  Master Data admin access. New records can be created as Active or
                  Inactive only. Archived vendors are managed from the Vendor registry
                  archive modal. Permission refresh is silent and must not disturb the form.
                </AixiaAccessRule>
              </>
            }
          />
        </form>
      )}
    </AixiaPage>
  );
}
