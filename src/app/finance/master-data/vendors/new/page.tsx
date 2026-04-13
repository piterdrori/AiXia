import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, RefreshCw, Save, Trash2 } from "lucide-react";

import { supabase } from "@/lib/supabase";
import { createVendor } from "@/lib/finance/vendors";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";

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
  status: "active" | "inactive" | "archived";
  personnel: PersonnelRow[];
  addresses: AddressRow[];
  shipping_addresses: ShippingRow[];
  notes: string;
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

const EMPTY_FORM: FormState = {
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

function FieldLabel({
  label,
  required = false,
}: {
  label: string;
  required?: boolean;
}) {
  return (
    <label className="mb-2 block text-sm font-medium text-white/75">
      {label}
      {required ? <span className="ml-1 text-rose-300">*</span> : null}
    </label>
  );
}

function InputField(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <Input
      {...props}
      className={`h-11 rounded-2xl border-white/10 bg-white/5 text-white placeholder:text-white/30 ${props.className ?? ""}`}
    />
  );
}

function SelectField(
  props: React.SelectHTMLAttributes<HTMLSelectElement> & {
    children: React.ReactNode;
  }
) {
  return (
    <select
      {...props}
      className={`h-11 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none ${props.className ?? ""}`}
    >
      {props.children}
    </select>
  );
}

function TextareaField(
  props: React.TextareaHTMLAttributes<HTMLTextAreaElement>
) {
  return (
    <textarea
      {...props}
      className={`min-h-[110px] w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-white/30 ${props.className ?? ""}`}
    />
  );
}

function FormSection({
  title,
  description,
  actions,
  children,
  fullWidth = false,
}: {
  title: string;
  description: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  fullWidth?: boolean;
}) {
  return (
    <Card
      className={`overflow-hidden rounded-[24px] border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] backdrop-blur-xl shadow-[0_20px_60px_rgba(0,0,0,0.24)] ${
        fullWidth ? "lg:col-span-2" : ""
      }`}
    >
      <CardHeader className="border-b border-white/8 px-5 py-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-white">{title}</CardTitle>
            <CardDescription className="mt-1 text-white/45">
              {description}
            </CardDescription>
          </div>

          {actions ? <div className="shrink-0">{actions}</div> : null}
        </div>
      </CardHeader>

      <CardContent className="p-4">{children}</CardContent>
    </Card>
  );
}

function RowCard({
  title,
  onRemove,
  removeDisabled = false,
  children,
}: {
  title: string;
  onRemove?: () => void;
  removeDisabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[20px] border border-white/10 bg-black/15 p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="text-sm font-medium text-white/80">{title}</div>

        {onRemove ? (
          <Button
            type="button"
            variant="outline"
            onClick={onRemove}
            disabled={removeDisabled}
            className="h-10 rounded-2xl border-white/10 bg-white/5 px-3 text-white hover:bg-white/10"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Remove
          </Button>
        ) : null}
      </div>

      {children}
    </div>
  );
}

export default function FinanceMasterDataVendorCreatePage() {
  const navigate = useNavigate();

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

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

  function updateForm<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  function updatePersonnelRow(
    rowId: string,
    key: keyof PersonnelRow,
    value: string
  ) {
    setForm((prev) => ({
      ...prev,
      personnel: prev.personnel.map((row) =>
        row.id === rowId ? { ...row, [key]: value } : row
      ),
    }));
  }

  function addPersonnelRow() {
    setForm((prev) => ({
      ...prev,
      personnel: [...prev.personnel, createEmptyPersonnelRow()],
    }));
  }

  function removePersonnelRow(rowId: string) {
    setForm((prev) => ({
      ...prev,
      personnel:
        prev.personnel.length > 1
          ? prev.personnel.filter((row) => row.id !== rowId)
          : prev.personnel,
    }));
  }

  function updateAddressRow(
    rowId: string,
    key: keyof AddressRow,
    value: string
  ) {
    setForm((prev) => {
      const nextAddresses = prev.addresses.map((row) =>
        row.id === rowId ? { ...row, [key]: value } : row
      );

      const nextShipping = prev.shipping_addresses.map((shipping) => {
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
        ...prev,
        addresses: nextAddresses,
        shipping_addresses: nextShipping,
      };
    });
  }

  function addAddressRow() {
    setForm((prev) => ({
      ...prev,
      addresses: [...prev.addresses, createEmptyAddressRow()],
    }));
  }

  function removeAddressRow(rowId: string) {
    setForm((prev) => {
      if (prev.addresses.length <= 1) return prev;

      const nextAddresses = prev.addresses.filter((row) => row.id !== rowId);

      const nextShipping = prev.shipping_addresses.map((shipping) => {
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
        ...prev,
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
    setForm((prev) => {
      const nextShipping = prev.shipping_addresses.map((row) => {
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

          const source = prev.addresses.find(
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
          const source = prev.addresses.find(
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
        ...prev,
        shipping_addresses: nextShipping,
      };
    });
  }

  function addShippingRow() {
    setForm((prev) => ({
      ...prev,
      shipping_addresses: [...prev.shipping_addresses, createEmptyShippingRow()],
    }));
  }

  function removeShippingRow(rowId: string) {
    setForm((prev) => ({
      ...prev,
      shipping_addresses:
        prev.shipping_addresses.length > 1
          ? prev.shipping_addresses.filter((row) => row.id !== rowId)
          : prev.shipping_addresses,
    }));
  }

  function handleReset() {
    setForm({
      ...EMPTY_FORM,
      personnel: [createEmptyPersonnelRow()],
      addresses: [createEmptyAddressRow()],
      shipping_addresses: [createEmptyShippingRow()],
    });
    setFormError(null);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedLegalName = form.legal_name.trim();
    if (!trimmedLegalName) {
      setFormError("Legal name is required.");
      return;
    }

    try {
      setIsSaving(true);
      setFormError(null);

      const created = await createVendor({
        legal_name: trimmedLegalName,
        contact_name: form.contact_person.trim() || null,
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
          .from("finance_vendor_addresses")
          .insert(shippingPayload);

        if (error) throw error;
      }

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

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="mx-auto flex h-full w-full max-w-[1920px] min-h-0 flex-col gap-6 px-4 pb-4 pt-2 sm:px-6 xl:px-8">
        <section className="relative z-10 flex-shrink-0 overflow-hidden rounded-[30px] border border-white/10 bg-[linear-gradient(135deg,rgba(34,211,238,0.10),rgba(139,92,246,0.08),rgba(255,255,255,0.03))] backdrop-blur-xl">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.18),transparent_28%),radial-gradient(circle_at_top_right,rgba(139,92,246,0.16),transparent_26%),radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.14),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(244,63,94,0.10),transparent_24%)]" />

          <div className="relative flex items-center justify-between gap-4 px-5 py-5 sm:px-6 xl:px-7">
            <div className="min-w-0">
              <div className="inline-flex items-center rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-cyan-200">
                Master Data
              </div>

              <h1 className="mt-3 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                Create Vendor
              </h1>

              <div className="mt-2 text-sm text-white/50">
                Legal entity, personnel, address, shipping, and notes.
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-3">
              <Button
                variant="outline"
                onClick={() => navigate("/finance/master-data/vendors")}
                className="h-11 rounded-2xl border-white/10 bg-white/5 px-4 text-white hover:bg-white/10"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={handleReset}
                className="h-11 rounded-2xl border-white/10 bg-white/5 px-4 text-white hover:bg-white/10"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Reset
              </Button>

              <Button
                type="submit"
                form="vendor-create-form"
                variant="outline"
                disabled={isSaving}
                className="h-11 rounded-2xl border-white/10 bg-white/5 px-4 text-white hover:bg-white/10"
              >
                <Save className="mr-2 h-4 w-4" />
                {isSaving ? "Saving..." : "Create Vendor"}
              </Button>
            </div>
          </div>
        </section>

                <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto overflow-x-hidden pr-1 pb-2">
          <form
            id="vendor-create-form"
            className="flex min-h-0 flex-col gap-6"
            onSubmit={handleSubmit}
          >
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* =========================
                  SECTION 1 — BASIC
              ========================= */}
              <FormSection
                title="Section 1 — Basic"
                description="Legal identity and primary contact."
              >
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <FieldLabel label="Legal Name" required />
                    <InputField
                      value={form.legal_name}
                      onChange={(e) =>
                        updateForm("legal_name", e.target.value)
                      }
                      placeholder="Legal company name"
                    />
                  </div>

                  <div>
                    <FieldLabel label="Contact Person" />
                    <InputField
                      value={form.contact_person}
                      onChange={(e) =>
                        updateForm("contact_person", e.target.value)
                      }
                      placeholder="Primary contact"
                    />
                  </div>

                  <div>
                    <FieldLabel label="Email" />
                    <InputField
                      value={form.company_email}
                      onChange={(e) =>
                        updateForm("company_email", e.target.value)
                      }
                      placeholder="company@email.com"
                    />
                  </div>

                  <div>
                    <FieldLabel label="Phone" />
                    <InputField
                      value={form.company_phone}
                      onChange={(e) =>
                        updateForm("company_phone", e.target.value)
                      }
                      placeholder="Company phone"
                    />
                  </div>

                  <div>
                    <FieldLabel label="Status" />
                    <SelectField
                      value={form.status}
                      onChange={(e) =>
                        updateForm(
                          "status",
                          e.target.value as FormState["status"]
                        )
                      }
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="archived">Archived</option>
                    </SelectField>
                  </div>
                </div>
              </FormSection>

              {/* =========================
                  SECTION 2 — PERSONNEL
              ========================= */}
              <FormSection
                title="Section 2 — Personnel"
                description="People related to this vendor."
                actions={
                  <Button
                    type="button"
                    onClick={addPersonnelRow}
                    className="h-10 rounded-2xl border-white/10 bg-white/5 px-3 text-white"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add
                  </Button>
                }
              >
                <div className="flex flex-col gap-4">
                  {form.personnel.map((row, index) => (
                    <RowCard
                      key={row.id}
                      title={`Person ${index + 1}`}
                      onRemove={() => removePersonnelRow(row.id)}
                      removeDisabled={form.personnel.length === 1}
                    >
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        <div>
                          <FieldLabel label="Name" />
                          <InputField
                            value={row.name}
                            onChange={(e) =>
                              updatePersonnelRow(
                                row.id,
                                "name",
                                e.target.value
                              )
                            }
                          />
                        </div>

                        <div>
                          <FieldLabel label="Position" />
                          <InputField
                            value={row.position}
                            onChange={(e) =>
                              updatePersonnelRow(
                                row.id,
                                "position",
                                e.target.value
                              )
                            }
                          />
                        </div>

                        <div>
                          <FieldLabel label="Phone" />
                          <InputField
                            value={row.phone}
                            onChange={(e) =>
                              updatePersonnelRow(
                                row.id,
                                "phone",
                                e.target.value
                              )
                            }
                          />
                        </div>

                        <div>
                          <FieldLabel label="Email" />
                          <InputField
                            value={row.email}
                            onChange={(e) =>
                              updatePersonnelRow(
                                row.id,
                                "email",
                                e.target.value
                              )
                            }
                          />
                        </div>
                      </div>
                    </RowCard>
                  ))}
                </div>
              </FormSection>

              {/* =========================
                  SECTION 3 — ADDRESS
              ========================= */}
              <FormSection
                title="Section 3 — Address"
                description="Primary addresses."
                actions={
                  <Button
                    type="button"
                    onClick={addAddressRow}
                    className="h-10 rounded-2xl border-white/10 bg-white/5 px-3 text-white"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add
                  </Button>
                }
              >
                <div className="flex flex-col gap-4">
                  {form.addresses.map((row, index) => (
                    <RowCard
                      key={row.id}
                      title={`Address ${index + 1}`}
                      onRemove={() => removeAddressRow(row.id)}
                      removeDisabled={form.addresses.length === 1}
                    >
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        <div>
                          <FieldLabel label="Country" />
                          <InputField
                            value={row.country}
                            onChange={(e) =>
                              updateAddressRow(
                                row.id,
                                "country",
                                e.target.value
                              )
                            }
                          />
                        </div>

                        <div>
                          <FieldLabel label="City" />
                          <InputField
                            value={row.city}
                            onChange={(e) =>
                              updateAddressRow(
                                row.id,
                                "city",
                                e.target.value
                              )
                            }
                          />
                        </div>

                        <div>
                          <FieldLabel label="State / Province" />
                          <InputField
                            value={row.state_province}
                            onChange={(e) =>
                              updateAddressRow(
                                row.id,
                                "state_province",
                                e.target.value
                              )
                            }
                          />
                        </div>

                        <div>
                          <FieldLabel label="ZIP / Postal Code" />
                          <InputField
                            value={row.postal_code}
                            onChange={(e) =>
                              updateAddressRow(
                                row.id,
                                "postal_code",
                                e.target.value
                              )
                            }
                          />
                        </div>

                        <div className="md:col-span-2">
                          <FieldLabel label="Address Line 1" />
                          <InputField
                            value={row.address_line_1}
                            onChange={(e) =>
                              updateAddressRow(
                                row.id,
                                "address_line_1",
                                e.target.value
                              )
                            }
                          />
                        </div>

                        <div className="md:col-span-2">
                          <FieldLabel label="Address Line 2" />
                          <InputField
                            value={row.address_line_2}
                            onChange={(e) =>
                              updateAddressRow(
                                row.id,
                                "address_line_2",
                                e.target.value
                              )
                            }
                          />
                        </div>
                      </div>
                    </RowCard>
                  ))}
                </div>
              </FormSection>

              {/* =========================
                  SECTION 4 — SHIPPING
              ========================= */}
              <FormSection
                title="Section 4 — Shipping"
                description="Shipping addresses."
                actions={
                  <Button
                    type="button"
                    onClick={addShippingRow}
                    className="h-10 rounded-2xl border-white/10 bg-white/5 px-3 text-white"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add
                  </Button>
                }
              >
                <div className="flex flex-col gap-4">
                  {form.shipping_addresses.map((row, index) => (
                    <RowCard
                      key={row.id}
                      title={`Shipping ${index + 1}`}
                      onRemove={() => removeShippingRow(row.id)}
                      removeDisabled={form.shipping_addresses.length === 1}
                    >
                      <div className="flex flex-col gap-3">
                        <label className="flex items-center gap-2 text-sm text-white/70">
                          <input
                            type="checkbox"
                            checked={row.same_as_primary}
                            onChange={(e) =>
                              updateShippingRow(
                                row.id,
                                "same_as_primary",
                                e.target.checked
                              )
                            }
                          />
                          Same as primary address
                        </label>

                        {row.same_as_primary && (
                          <SelectField
                            value={row.source_address_id}
                            onChange={(e) =>
                              updateShippingRow(
                                row.id,
                                "source_address_id",
                                e.target.value
                              )
                            }
                          >
                            <option value="">Select address</option>
                            {addressOptions.map((opt) => (
                              <option key={opt.id} value={opt.id}>
                                {opt.label}
                              </option>
                            ))}
                          </SelectField>
                        )}

                        {!row.same_as_primary && (
                          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                            <div>
                              <FieldLabel label="Country" />
                              <InputField
                                value={row.country}
                                onChange={(e) =>
                                  updateShippingRow(
                                    row.id,
                                    "country",
                                    e.target.value
                                  )
                                }
                              />
                            </div>

                            <div>
                              <FieldLabel label="City" />
                              <InputField
                                value={row.city}
                                onChange={(e) =>
                                  updateShippingRow(
                                    row.id,
                                    "city",
                                    e.target.value
                                  )
                                }
                              />
                            </div>

                            <div>
                              <FieldLabel label="State / Province" />
                              <InputField
                                value={row.state_province}
                                onChange={(e) =>
                                  updateShippingRow(
                                    row.id,
                                    "state_province",
                                    e.target.value
                                  )
                                }
                              />
                            </div>

                            <div>
                              <FieldLabel label="ZIP" />
                              <InputField
                                value={row.postal_code}
                                onChange={(e) =>
                                  updateShippingRow(
                                    row.id,
                                    "postal_code",
                                    e.target.value
                                  )
                                }
                              />
                            </div>

                            <div className="md:col-span-2">
                              <FieldLabel label="Address Line 1" />
                              <InputField
                                value={row.address_line_1}
                                onChange={(e) =>
                                  updateShippingRow(
                                    row.id,
                                    "address_line_1",
                                    e.target.value
                                  )
                                }
                              />
                            </div>

                            <div className="md:col-span-2">
                              <FieldLabel label="Address Line 2" />
                              <InputField
                                value={row.address_line_2}
                                onChange={(e) =>
                                  updateShippingRow(
                                    row.id,
                                    "address_line_2",
                                    e.target.value
                                  )
                                }
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </RowCard>
                  ))}
                </div>
              </FormSection>

              {/* =========================
                  SECTION 5 — NOTES
              ========================= */}
              <FormSection
                title="Section 5 — Notes"
                description="Internal notes."
                fullWidth
              >
                <TextareaField
                  value={form.notes}
                  onChange={(e) => updateForm("notes", e.target.value)}
                  placeholder="Notes..."
                />
              </FormSection>
            </div>

            {formError && (
              <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                {formError}
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
