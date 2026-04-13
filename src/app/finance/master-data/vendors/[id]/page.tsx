import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import { archiveVendor, updateVendor } from "@/lib/finance/vendors";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type VendorDetailRecord = {
  id: string;
  code: string | null;
  name: string;
  legal_name: string | null;
  contact_person: string | null;
  status: "active" | "inactive" | "archived";
  company_email: string | null;
  company_phone: string | null;
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

type EditSection =
  | null
  | "basic"
  | "personnel"
  | "address"
  | "shipping"
  | "notes";

type BasicForm = {
  legal_name: string;
  contact_person: string;
  company_email: string;
  company_phone: string;
  status: "active" | "inactive" | "archived";
};

type PersonnelFormRow = {
  id: string;
  full_name: string;
  position: string;
  phone: string;
  email: string;
};

type AddressFormRow = {
  id: string;
  country: string;
  city: string;
  state_province: string;
  postal_code: string;
  address_line_1: string;
  address_line_2: string;
};

type ShippingFormRow = {
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

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function createEmptyPersonnelFormRow(): PersonnelFormRow {
  return {
    id: makeId(),
    full_name: "",
    position: "",
    phone: "",
    email: "",
  };
}

function createEmptyAddressFormRow(): AddressFormRow {
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

function createEmptyShippingFormRow(): ShippingFormRow {
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

function formatDateTimeLabel(value: string | null) {
  if (!value) return "—";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return parsed.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getStatusTone(status: string) {
  switch (status) {
    case "active":
      return "border-emerald-400/15 bg-emerald-500/10 text-emerald-200";
    case "inactive":
      return "border-amber-400/15 bg-amber-500/10 text-amber-200";
    case "archived":
      return "border-rose-400/15 bg-rose-500/10 text-rose-200";
    default:
      return "border-white/10 bg-white/8 text-white/70";
  }
}

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

function DisplayRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[18px] border border-white/8 bg-black/15 px-4 py-3">
      <div className="text-xs uppercase tracking-[0.18em] text-white/35">
        {label}
      </div>
      <div className="mt-2 break-words text-sm font-medium text-white">
        {value || "—"}
      </div>
    </div>
  );
}

function SectionCard({
  title,
  description,
  onEdit,
  actions,
  children,
  fullWidth = false,
}: {
  title: string;
  description: string;
  onEdit?: () => void;
  actions?: React.ReactNode;
  children: React.ReactNode;
  fullWidth?: boolean;
}) {
  return (
    <Card
      className={`flex flex-col overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.045] backdrop-blur-xl ${
        fullWidth ? "xl:col-span-2" : ""
      }`}
    >
      <CardHeader className="border-b border-white/8 pb-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-white">{title}</CardTitle>
            <CardDescription className="mt-1 text-white/45">
              {description}
            </CardDescription>
          </div>

          <div className="flex items-center gap-3">
            {actions}
            {onEdit ? (
              <Button
                variant="outline"
                onClick={onEdit}
                className="h-11 rounded-2xl border-white/10 bg-white/5 px-4 text-white hover:bg-white/10"
              >
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </Button>
            ) : null}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-5">{children}</CardContent>
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

function ModalShell({
  title,
  description,
  onClose,
  onSave,
  isSaving,
  children,
}: {
  title: string;
  description: string;
  onClose: () => void;
  onSave: () => void;
  isSaving: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-[32px] border border-white/10 bg-[linear-gradient(135deg,rgba(15,23,42,0.96),rgba(17,24,39,0.94))] shadow-[0_30px_120px_rgba(0,0,0,0.50)]">

                <div className="flex items-start justify-between gap-4 border-b border-white/10 px-6 py-5">
          <div>
            <div className="text-xl font-semibold text-white">{title}</div>
            <div className="mt-1 text-sm text-white/50">{description}</div>
          </div>

          <Button
            variant="outline"
            onClick={onClose}
            className="h-11 rounded-2xl border-white/10 bg-white/5 px-4 text-white hover:bg-white/10"
          >
            <X className="mr-2 h-4 w-4" />
            Close
          </Button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>

        <div className="flex items-center justify-end gap-3 border-t border-white/10 px-6 py-5">
          <Button
            variant="outline"
            onClick={onClose}
            className="h-11 rounded-2xl border-white/10 bg-white/5 px-4 text-white hover:bg-white/10"
          >
            Cancel
          </Button>

          <Button
            variant="outline"
            onClick={onSave}
            disabled={isSaving}
            className="h-11 rounded-2xl border-white/10 bg-white/5 px-4 text-white hover:bg-white/10"
          >
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? "Saving..." : "Save Section"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function FinanceMasterDataVendorDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [vendor, setVendor] = useState<VendorDetailRecord | null>(null);
  const [personnel, setPersonnel] = useState<PersonnelRow[]>([]);
  const [addresses, setAddresses] = useState<AddressRow[]>([]);
  const [shippingAddresses, setShippingAddresses] = useState<AddressRow[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);
  const [editingSection, setEditingSection] = useState<EditSection>(null);

  const [basicForm, setBasicForm] = useState<BasicForm>({
    legal_name: "",
    contact_person: "",
    company_email: "",
    company_phone: "",
    status: "active",
  });

  const [personnelForm, setPersonnelForm] = useState<PersonnelFormRow[]>([
    createEmptyPersonnelFormRow(),
  ]);

  const [addressForm, setAddressForm] = useState<AddressFormRow[]>([
    createEmptyAddressFormRow(),
  ]);

  const [shippingForm, setShippingForm] = useState<ShippingFormRow[]>([
    createEmptyShippingFormRow(),
  ]);

  const [notesForm, setNotesForm] = useState("");
  const [modalError, setModalError] = useState<string | null>(null);

  const primaryAddressOptions = useMemo(() => {
    return addressForm.map((address, index) => ({
      id: address.id,
      label:
        address.address_line_1.trim() ||
        address.city.trim() ||
        address.country.trim() ||
        `Address ${index + 1}`,
      value: address,
    }));
  }, [addressForm]);

  const loadVendor = useCallback(async () => {
    if (!id) return;

    setIsLoading(true);

    try {
      const [vendorResult, personnelResult, addressResult] = await Promise.all([
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
      ]);

      if (vendorResult.error) throw vendorResult.error;
      if (personnelResult.error) throw personnelResult.error;
      if (addressResult.error) throw addressResult.error;

      const vendorData = vendorResult.data as VendorDetailRecord;
      const personnelData = (personnelResult.data ?? []) as PersonnelRow[];
      const addressData = (addressResult.data ?? []) as AddressRow[];

      setVendor(vendorData);
      setPersonnel(personnelData);
      setAddresses(addressData.filter((row) => row.address_type === "primary"));
      setShippingAddresses(
        addressData.filter((row) => row.address_type === "shipping")
      );
    } catch (error) {
      console.error("Failed to load finance vendor details:", error);
      setVendor(null);
      setPersonnel([]);
      setAddresses([]);
      setShippingAddresses([]);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadVendor();
  }, [loadVendor]);

  function openBasicEditor() {
    if (!vendor) return;

    setModalError(null);
    setBasicForm({
      legal_name: vendor.legal_name || vendor.name || "",
      contact_person: vendor.contact_person || "",
      company_email: vendor.company_email || "",
      company_phone: vendor.company_phone || "",
      status: vendor.status,
    });
    setEditingSection("basic");
  }

  function openPersonnelEditor() {
    setModalError(null);
    setPersonnelForm(
      personnel.length > 0
        ? personnel.map((row) => ({
            id: row.id,
            full_name: row.full_name || "",
            position: row.position || "",
            phone: row.phone || "",
            email: row.email || "",
          }))
        : [createEmptyPersonnelFormRow()]
    );
    setEditingSection("personnel");
  }

  function openAddressEditor() {
    setModalError(null);
    setAddressForm(
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
        : [createEmptyAddressFormRow()]
    );
    setEditingSection("address");
  }

  function openShippingEditor() {
    setModalError(null);
    setShippingForm(
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
        : [createEmptyShippingFormRow()]
    );
    setEditingSection("shipping");
  }

  function openNotesEditor() {
    if (!vendor) return;

    setModalError(null);
    setNotesForm(vendor.notes || "");
    setEditingSection("notes");
  }

  function updatePersonnelFormRow(
    rowId: string,
    key: keyof PersonnelFormRow,
    value: string
  ) {
    setPersonnelForm((prev) =>
      prev.map((row) => (row.id === rowId ? { ...row, [key]: value } : row))
    );
  }

  function addPersonnelFormRow() {
    setPersonnelForm((prev) => [...prev, createEmptyPersonnelFormRow()]);
  }

  function removePersonnelFormRow(rowId: string) {
    setPersonnelForm((prev) =>
      prev.length > 1 ? prev.filter((row) => row.id !== rowId) : prev
    );
  }

  function updateAddressFormRow(
    rowId: string,
    key: keyof AddressFormRow,
    value: string
  ) {
    setAddressForm((prevAddresses) => {
      const nextAddresses = prevAddresses.map((row) =>
        row.id === rowId ? { ...row, [key]: value } : row
      );

      setShippingForm((prevShipping) =>
        prevShipping.map((shipping) => {
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

  function addAddressFormRow() {
    setAddressForm((prev) => [...prev, createEmptyAddressFormRow()]);
  }

  function removeAddressFormRow(rowId: string) {
    setAddressForm((prev) =>
      prev.length > 1 ? prev.filter((row) => row.id !== rowId) : prev
    );

    setShippingForm((prev) =>
      prev.map((shipping) =>
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

  function updateShippingFormRow(
    rowId: string,
    key: keyof ShippingFormRow,
    value: string | boolean
  ) {
    setShippingForm((prev) =>
      prev.map((row) => {
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

          const source = addressForm.find(
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
          const source = addressForm.find(
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

        return { ...row, [key]: value };
      })
    );
  }

  function addShippingFormRow() {
    setShippingForm((prev) => [...prev, createEmptyShippingFormRow()]);
  }

  function removeShippingFormRow(rowId: string) {
    setShippingForm((prev) =>
      prev.length > 1 ? prev.filter((row) => row.id !== rowId) : prev
    );
  }

  async function saveBasicSection() {
    if (!vendor) return;

    const legalName = basicForm.legal_name.trim();
    if (!legalName) {
      setModalError("Legal name is required.");
      return;
    }

    try {
      setIsMutating(true);
      setModalError(null);

      await updateVendor(vendor.id, {
        legal_name: legalName,
        contact_person: basicForm.contact_person.trim() || null,
        company_email: basicForm.company_email.trim() || null,
        company_phone: basicForm.company_phone.trim() || null,
        status: basicForm.status,
      });

      setEditingSection(null);
      await loadVendor();
    } catch (error) {
      console.error("Failed to save basic section:", error);
      setModalError(error instanceof Error ? error.message : "Failed to save.");
    } finally {
      setIsMutating(false);
    }
  }

  async function savePersonnelSection() {
    if (!vendor) return;

    try {
      setIsMutating(true);
      setModalError(null);

      const { error: deleteError } = await supabase
        .from("finance_vendor_personnel")
        .delete()
        .eq("vendor_id", vendor.id);

      if (deleteError) throw deleteError;

      const payload = personnelForm
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
        .filter(
          (row) => row.full_name || row.position || row.phone || row.email
        );

      if (payload.length > 0) {
        const { error } = await supabase
          .from("finance_vendor_personnel")
          .insert(payload);

        if (error) throw error;
      }

      setEditingSection(null);
      await loadVendor();
    } catch (error) {
      console.error("Failed to save personnel section:", error);
      setModalError(error instanceof Error ? error.message : "Failed to save.");
    } finally {
      setIsMutating(false);
    }
  }

  async function saveAddressSection() {
    if (!vendor) return;

    try {
      setIsMutating(true);
      setModalError(null);

      const { error: deleteError } = await supabase
        .from("finance_vendor_addresses")
        .delete()
        .eq("vendor_id", vendor.id)
        .eq("address_type", "primary");

      if (deleteError) throw deleteError;

      const payload = addressForm
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
        country: addressForm[0]?.country.trim() || null,
        address_line_1: addressForm[0]?.address_line_1.trim() || null,
        address_line_2: addressForm[0]?.address_line_2.trim() || null,
      });

      setEditingSection(null);
      await loadVendor();
    } catch (error) {
      console.error("Failed to save address section:", error);
      setModalError(error instanceof Error ? error.message : "Failed to save.");
    } finally {
      setIsMutating(false);
    }
  }

  async function saveShippingSection() {
    if (!vendor) return;

    try {
      setIsMutating(true);
      setModalError(null);

      const { error: deleteError } = await supabase
        .from("finance_vendor_addresses")
        .delete()
        .eq("vendor_id", vendor.id)
        .eq("address_type", "shipping");

      if (deleteError) throw deleteError;

      const payload = shippingForm
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
        shipping_address_line_1: shippingForm[0]?.same_as_primary
          ? null
          : shippingForm[0]?.address_line_1.trim() || null,
        shipping_address_line_2: shippingForm[0]?.same_as_primary
          ? null
          : shippingForm[0]?.address_line_2.trim() || null,
      });

      setEditingSection(null);
      await loadVendor();
    } catch (error) {
      console.error("Failed to save shipping section:", error);
      setModalError(error instanceof Error ? error.message : "Failed to save.");
    } finally {
      setIsMutating(false);
    }
  }

  async function saveNotesSection() {
    if (!vendor) return;

    try {
      setIsMutating(true);
      setModalError(null);

      await updateVendor(vendor.id, {
        notes: notesForm.trim() || null,
      });

      setEditingSection(null);
      await loadVendor();
    } catch (error) {
      console.error("Failed to save notes section:", error);
      setModalError(error instanceof Error ? error.message : "Failed to save.");
    } finally {
      setIsMutating(false);
    }
  }

  async function handleArchiveToggle() {
    if (!vendor) return;

    try {
      setIsMutating(true);

      if (vendor.status === "archived") {
        await updateVendor(vendor.id, { status: "active" });
      } else {
        await archiveVendor(vendor.id);
      }

      await loadVendor();
    } catch (error) {
      console.error("Failed to update vendor status:", error);
    } finally {
      setIsMutating(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-full min-h-0 flex-col overflow-hidden">
        <div className="mx-auto flex h-full w-full max-w-[1920px] min-h-0 flex-col gap-6 px-4 pb-4 pt-2 sm:px-6 xl:px-8">
          <div className="flex min-h-0 flex-1 items-center justify-center">
            <div className="text-sm text-white/50">Loading vendor...</div>
          </div>
        </div>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="flex h-full min-h-0 flex-col overflow-hidden">
        <div className="mx-auto flex h-full w-full max-w-[1920px] min-h-0 flex-col gap-6 px-4 pb-4 pt-2 sm:px-6 xl:px-8">
          <div className="flex min-h-0 flex-1 items-center justify-center text-white/50">
            Vendor not found
          </div>
        </div>
      </div>
    );
  }

  const displayName = vendor.legal_name || vendor.name;

  return (
    <>
      <div className="flex h-full min-h-0 flex-col overflow-hidden">
        <div className="mx-auto flex h-full w-full max-w-[1920px] min-h-0 flex-col gap-6 px-4 pb-4 pt-2 sm:px-6 xl:px-8">

          {/* HEADER (LOCKED — NO SCROLL) */}
          <section className="relative z-10 flex-shrink-0 overflow-hidden rounded-[30px] border border-white/10 bg-[linear-gradient(135deg,rgba(34,211,238,0.08),rgba(139,92,246,0.08),rgba(255,255,255,0.03))] backdrop-blur-xl">
            <div className="relative flex items-center justify-between gap-4 px-5 py-5 sm:px-6 xl:px-7">

              <div>
                <div className="flex gap-2 flex-wrap">
                  <Badge className="rounded-full border border-white/10 bg-white/8 px-3 py-1 text-[11px] text-white/70">
                    {vendor.code || "No code"}
                  </Badge>

                  <Badge className={`rounded-full px-3 py-1 text-[11px] ${getStatusTone(vendor.status)}`}>
                    {vendor.status}
                  </Badge>
                </div>

                <h1 className="mt-3 text-2xl font-semibold text-white">
                  {displayName}
                </h1>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => navigate("/finance/master-data/vendors")}
                  className="h-11 rounded-2xl border-white/10 bg-white/5 px-4 text-white"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>

                <Button
                  onClick={() => handleArchiveToggle()}
                  className="h-11 rounded-2xl border-white/10 bg-white/5 px-4 text-white"
                >
                  <ShieldCheck className="mr-2 h-4 w-4" />
                  {vendor.status === "archived" ? "Activate" : "Archive"}
                </Button>

                <Button
                  onClick={() => loadVendor()}
                  className="h-11 rounded-2xl border-white/10 bg-white/5 px-4 text-white"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh
                </Button>
              </div>

            </div>
          </section>

                    <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto overflow-x-hidden pr-1 pb-2">
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <SectionCard
                title="Section 1 — Basic"
                description="Legal identity and primary contact."
                onEdit={openBasicEditor}
              >
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <DisplayRow label="Legal Name" value={displayName} />
                  <DisplayRow
                    label="Contact Person"
                    value={vendor.contact_person || "—"}
                  />
                  <DisplayRow label="Email" value={vendor.company_email || "—"} />
                  <DisplayRow label="Phone" value={vendor.company_phone || "—"} />
                  <DisplayRow label="Status" value={vendor.status || "—"} />
                </div>
              </SectionCard>

              <SectionCard
                title="System Fields"
                description="Read-only audit fields."
              >
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <DisplayRow label="Code" value={vendor.code || "—"} />
                  <DisplayRow
                    label="Created At"
                    value={formatDateTimeLabel(vendor.created_at)}
                  />
                </div>
              </SectionCard>

              <SectionCard
                title="Section 2 — Personnel"
                description="Related people for this vendor."
                onEdit={openPersonnelEditor}
              >
                <div className="flex flex-col gap-3">
                  {personnel.length === 0 ? (
                    <div className="rounded-[18px] border border-white/8 bg-black/15 px-4 py-3 text-sm text-white/60">
                      No personnel added yet.
                    </div>
                  ) : (
                    personnel.map((row, index) => (
                      <div
                        key={row.id}
                        className="rounded-[18px] border border-white/8 bg-black/15 p-4"
                      >
                        <div className="mb-3 text-sm font-medium text-white/80">
                          Person {index + 1}
                        </div>

                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                          <DisplayRow label="Name" value={row.full_name || "—"} />
                          <DisplayRow
                            label="Position"
                            value={row.position || "—"}
                          />
                          <DisplayRow label="Phone" value={row.phone || "—"} />
                          <DisplayRow label="Email" value={row.email || "—"} />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </SectionCard>

              <SectionCard
                title="Section 3 — Address"
                description="Primary addresses."
                onEdit={openAddressEditor}
              >
                <div className="flex flex-col gap-3">
                  {addresses.length === 0 ? (
                    <div className="rounded-[18px] border border-white/8 bg-black/15 px-4 py-3 text-sm text-white/60">
                      No primary addresses added yet.
                    </div>
                  ) : (
                    addresses.map((row, index) => (
                      <div
                        key={row.id}
                        className="rounded-[18px] border border-white/8 bg-black/15 p-4"
                      >
                        <div className="mb-3 text-sm font-medium text-white/80">
                          Address {index + 1}
                        </div>

                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                          <DisplayRow label="Country" value={row.country || "—"} />
                          <DisplayRow label="City" value={row.city || "—"} />
                          <DisplayRow
                            label="State / Province"
                            value={row.state_province || "—"}
                          />
                          <DisplayRow
                            label="ZIP / Postal Code"
                            value={row.postal_code || "—"}
                          />
                          <DisplayRow
                            label="Address Line 1"
                            value={row.address_line_1 || "—"}
                          />
                          <DisplayRow
                            label="Address Line 2"
                            value={row.address_line_2 || "—"}
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </SectionCard>

              <SectionCard
                title="Section 4 — Shipping"
                description="Shipping addresses."
                onEdit={openShippingEditor}
              >
                <div className="flex flex-col gap-3">
                  {shippingAddresses.length === 0 ? (
                    <div className="rounded-[18px] border border-white/8 bg-black/15 px-4 py-3 text-sm text-white/60">
                      No shipping addresses added yet.
                    </div>
                  ) : (
                    shippingAddresses.map((row, index) => (
                      <div
                        key={row.id}
                        className="rounded-[18px] border border-white/8 bg-black/15 p-4"
                      >
                        <div className="mb-3 text-sm font-medium text-white/80">
                          Shipping {index + 1}
                        </div>

                        {row.is_same_as_primary ? (
                          <div className="rounded-[16px] border border-white/8 bg-white/5 px-4 py-3 text-sm text-white/70">
                            Same as primary address
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                            <DisplayRow label="Country" value={row.country || "—"} />
                            <DisplayRow label="City" value={row.city || "—"} />
                            <DisplayRow
                              label="State / Province"
                              value={row.state_province || "—"}
                            />
                            <DisplayRow
                              label="ZIP / Postal Code"
                              value={row.postal_code || "—"}
                            />
                            <DisplayRow
                              label="Address Line 1"
                              value={row.address_line_1 || "—"}
                            />
                            <DisplayRow
                              label="Address Line 2"
                              value={row.address_line_2 || "—"}
                            />
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </SectionCard>

              <SectionCard
                title="Section 5 — Notes"
                description="Internal notes for this vendor record."
                onEdit={openNotesEditor}
                fullWidth
              >
                <div className="rounded-[20px] border border-white/8 bg-black/15 px-4 py-4 text-sm leading-7 text-white/70">
                  {vendor.notes || "No notes added yet."}
                </div>
              </SectionCard>
            </div>
          </div>

        </div>
      </div>

            {editingSection === "basic" && (
        <ModalShell
          title="Edit Section 1 — Basic"
          description="Update legal identity and primary contact."
          onClose={() => setEditingSection(null)}
          onSave={() => void saveBasicSection()}
          isSaving={isMutating}
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <FieldLabel label="Legal Name" required />
              <InputField
                value={basicForm.legal_name}
                onChange={(e) =>
                  setBasicForm((prev) => ({
                    ...prev,
                    legal_name: e.target.value,
                  }))
                }
              />
            </div>

            <div>
              <FieldLabel label="Contact Person" />
              <InputField
                value={basicForm.contact_person}
                onChange={(e) =>
                  setBasicForm((prev) => ({
                    ...prev,
                    contact_person: e.target.value,
                  }))
                }
              />
            </div>

            <div>
              <FieldLabel label="Email" />
              <InputField
                value={basicForm.company_email}
                onChange={(e) =>
                  setBasicForm((prev) => ({
                    ...prev,
                    company_email: e.target.value,
                  }))
                }
              />
            </div>

            <div>
              <FieldLabel label="Phone" />
              <InputField
                value={basicForm.company_phone}
                onChange={(e) =>
                  setBasicForm((prev) => ({
                    ...prev,
                    company_phone: e.target.value,
                  }))
                }
              />
            </div>

            <div>
              <FieldLabel label="Status" />
              <SelectField
                value={basicForm.status}
                onChange={(e) =>
                  setBasicForm((prev) => ({
                    ...prev,
                    status: e.target.value as BasicForm["status"],
                  }))
                }
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="archived">Archived</option>
              </SelectField>
            </div>
          </div>

          {modalError && (
            <div className="mt-4 text-sm text-rose-300">{modalError}</div>
          )}
        </ModalShell>
      )}

      {editingSection === "personnel" && (
        <ModalShell
          title="Edit Section 2 — Personnel"
          description="Manage related people for this vendor."
          onClose={() => setEditingSection(null)}
          onSave={() => void savePersonnelSection()}
          isSaving={isMutating}
        >
          <div className="flex flex-col gap-4">
            <div className="flex justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={addPersonnelFormRow}
                className="h-10 rounded-2xl border-white/10 bg-white/5 px-3 text-white hover:bg-white/10"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Person
              </Button>
            </div>

            {personnelForm.map((row, index) => (
              <RowCard
                key={row.id}
                title={`Person ${index + 1}`}
                onRemove={() => removePersonnelFormRow(row.id)}
                removeDisabled={personnelForm.length === 1}
              >
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div>
                    <FieldLabel label="Name" />
                    <InputField
                      value={row.full_name}
                      onChange={(e) =>
                        updatePersonnelFormRow(
                          row.id,
                          "full_name",
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
                        updatePersonnelFormRow(
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
                        updatePersonnelFormRow(row.id, "phone", e.target.value)
                      }
                    />
                  </div>

                  <div>
                    <FieldLabel label="Email" />
                    <InputField
                      value={row.email}
                      onChange={(e) =>
                        updatePersonnelFormRow(row.id, "email", e.target.value)
                      }
                    />
                  </div>
                </div>
              </RowCard>
            ))}

            {modalError && (
              <div className="text-sm text-rose-300">{modalError}</div>
            )}
          </div>
        </ModalShell>
      )}

      {editingSection === "address" && (
        <ModalShell
          title="Edit Section 3 — Address"
          description="Manage primary addresses."
          onClose={() => setEditingSection(null)}
          onSave={() => void saveAddressSection()}
          isSaving={isMutating}
        >
          <div className="flex flex-col gap-4">
            <div className="flex justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={addAddressFormRow}
                className="h-10 rounded-2xl border-white/10 bg-white/5 px-3 text-white hover:bg-white/10"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Address
              </Button>
            </div>

            {addressForm.map((row, index) => (
              <RowCard
                key={row.id}
                title={`Address ${index + 1}`}
                onRemove={() => removeAddressFormRow(row.id)}
                removeDisabled={addressForm.length === 1}
              >
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div>
                    <FieldLabel label="Country" />
                    <InputField
                      value={row.country}
                      onChange={(e) =>
                        updateAddressFormRow(row.id, "country", e.target.value)
                      }
                    />
                  </div>

                  <div>
                    <FieldLabel label="City" />
                    <InputField
                      value={row.city}
                      onChange={(e) =>
                        updateAddressFormRow(row.id, "city", e.target.value)
                      }
                    />
                  </div>

                  <div>
                    <FieldLabel label="State / Province" />
                    <InputField
                      value={row.state_province}
                      onChange={(e) =>
                        updateAddressFormRow(
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
                        updateAddressFormRow(
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
                        updateAddressFormRow(
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
                        updateAddressFormRow(
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

            {modalError && (
              <div className="text-sm text-rose-300">{modalError}</div>
            )}
          </div>
        </ModalShell>
      )}

      {editingSection === "shipping" && (
        <ModalShell
          title="Edit Section 4 — Shipping"
          description="Manage shipping addresses."
          onClose={() => setEditingSection(null)}
          onSave={() => void saveShippingSection()}
          isSaving={isMutating}
        >
          <div className="flex flex-col gap-4">
            <div className="flex justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={addShippingFormRow}
                className="h-10 rounded-2xl border-white/10 bg-white/5 px-3 text-white hover:bg-white/10"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Shipping
              </Button>
            </div>

            {shippingForm.map((row, index) => (
              <RowCard
                key={row.id}
                title={`Shipping ${index + 1}`}
                onRemove={() => removeShippingFormRow(row.id)}
                removeDisabled={shippingForm.length === 1}
              >
                <div className="flex flex-col gap-3">
                  <label className="flex items-center gap-2 text-sm text-white/70">
                    <input
                      type="checkbox"
                      checked={row.same_as_primary}
                      onChange={(e) =>
                        updateShippingFormRow(
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
                        updateShippingFormRow(
                          row.id,
                          "source_address_id",
                          e.target.value
                        )
                      }
                    >
                      <option value="">Select address</option>
                      {primaryAddressOptions.map((opt) => (
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
                            updateShippingFormRow(
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
                            updateShippingFormRow(
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
                            updateShippingFormRow(
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
                            updateShippingFormRow(
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
                            updateShippingFormRow(
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
                            updateShippingFormRow(
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

            {modalError && (
              <div className="text-sm text-rose-300">{modalError}</div>
            )}
          </div>
        </ModalShell>
      )}

      {editingSection === "notes" && (
        <ModalShell
          title="Edit Section 5 — Notes"
          description="Update internal notes."
          onClose={() => setEditingSection(null)}
          onSave={() => void saveNotesSection()}
          isSaving={isMutating}
        >
          <div>
            <FieldLabel label="Notes" />
            <TextareaField
              value={notesForm}
              onChange={(e) => setNotesForm(e.target.value)}
              placeholder="Add internal notes"
            />
          </div>

          {modalError && (
            <div className="mt-4 text-sm text-rose-300">{modalError}</div>
          )}
        </ModalShell>
      )}
    </>
  );
}
