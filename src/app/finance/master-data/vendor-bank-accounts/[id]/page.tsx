import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CreditCard,
  Pencil,
  RefreshCw,
  Save,
  ShieldCheck,
  X,
} from "lucide-react";

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

import {
  archiveVendorBankAccount,
  getVendorBankAccountById,
  getVendorOptions,
  restoreVendorBankAccount,
  updateVendorBankAccount,
  type FinanceVendorBankAccount,
  type VendorOption,
} from "@/lib/finance/vendor-bank-accounts";

type EditSection = null | "basic" | "address" | "control" | "notes";

type BasicForm = {
  vendor_id: string;
  beneficiary_name: string;
  bank_name: string;
  account_number: string;
};

type AddressForm = {
  country: string;
  city: string;
  postal_code: string;
  address_line_1: string;
  address_line_2: string;
};

type ControlForm = {
  account_identifier_type: string;
  account_identifier_value: string;
  currency_code: string;
  is_default: boolean;
  status: "active" | "inactive" | "archived";
};

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
  children,
  fullWidth = false,
}: {
  title: string;
  description: string;
  onEdit?: () => void;
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
      </CardHeader>

      <CardContent className="p-5">{children}</CardContent>
    </Card>
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

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {children}
        </div>

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

export default function FinanceMasterDataVendorBankAccountDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [record, setRecord] = useState<FinanceVendorBankAccount | null>(null);
  const [vendors, setVendors] = useState<VendorOption[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);
  const [editingSection, setEditingSection] = useState<EditSection>(null);
  const [modalError, setModalError] = useState<string | null>(null);

  const [basicForm, setBasicForm] = useState<BasicForm>({
    vendor_id: "",
    beneficiary_name: "",
    bank_name: "",
    account_number: "",
  });

  const [addressForm, setAddressForm] = useState<AddressForm>({
    country: "",
    city: "",
    postal_code: "",
    address_line_1: "",
    address_line_2: "",
  });

  const [controlForm, setControlForm] = useState<ControlForm>({
    account_identifier_type: "swift",
    account_identifier_value: "",
    currency_code: "",
    is_default: false,
    status: "active",
  });

  const [notesForm, setNotesForm] = useState("");

  const selectedVendor = useMemo(() => {
    return vendors.find((vendor) => vendor.id === basicForm.vendor_id) ?? null;
  }, [vendors, basicForm.vendor_id]);

  const identifierLabel = useMemo(() => {
    if (controlForm.account_identifier_type.trim().toLowerCase() === "iban") {
      return "IBAN Value";
    }
    return "SWIFT Value";
  }, [controlForm.account_identifier_type]);


  const loadRecord = useCallback(async () => {
    if (!id) return;

    setIsLoading(true);

    try {
      const [detail, vendorRows] = await Promise.all([
        getVendorBankAccountById(id),
        getVendorOptions(),
      ]);

      setRecord(detail);
      setVendors(vendorRows);
    } catch (error) {
      console.error("Failed to load vendor bank account details:", error);
      setRecord(null);
      setVendors([]);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadRecord();
  }, [loadRecord]);

  function openBasicEditor() {
    if (!record) return;

    setModalError(null);
    setBasicForm({
      vendor_id: record.vendor_id,
      beneficiary_name: record.beneficiary_name || "",
      bank_name: record.bank_name || "",
      account_number: record.account_number || "",
    });
    setEditingSection("basic");
  }

  function openAddressEditor() {
    if (!record) return;

    setModalError(null);
    setAddressForm({
      country: record.country || "",
      city: record.city || "",
      postal_code: record.postal_code || "",
      address_line_1: record.address_line_1 || "",
      address_line_2: record.address_line_2 || "",
    });
    setEditingSection("address");
  }

  function openControlEditor() {
    if (!record) return;

    setModalError(null);
    setControlForm({
      account_identifier_type: record.account_identifier_type || "swift",
      account_identifier_value: record.account_identifier_value || "",
      currency_code: record.currency_code || "",
      is_default: record.is_default,
      status: record.status,
    });
    setEditingSection("control");
  }

  function openNotesEditor() {
    if (!record) return;

    setModalError(null);
    setNotesForm(record.notes || "");
    setEditingSection("notes");
  }

  function handleBasicVendorChange(vendorId: string) {
    const vendor = vendors.find((item) => item.id === vendorId) ?? null;

    setBasicForm((prev) => ({
      ...prev,
      vendor_id: vendorId,
      beneficiary_name: vendor?.legal_name?.trim() || vendor?.name || "",
    }));

    if (vendor?.currency_code) {
      setControlForm((prev) => ({
        ...prev,
        currency_code: prev.currency_code || vendor.currency_code || "",
      }));
    }
  }

  async function saveBasicSection() {
    if (!record) return;

    if (!basicForm.vendor_id) {
      setModalError("Vendor is required.");
      return;
    }

    if (!basicForm.bank_name.trim()) {
      setModalError("Bank name is required.");
      return;
    }

    try {
      setIsMutating(true);
      setModalError(null);

      await updateVendorBankAccount(record.id, {
        vendor_id: basicForm.vendor_id,
        beneficiary_name: basicForm.beneficiary_name.trim() || null,
        bank_name: basicForm.bank_name.trim() || null,
        account_number: basicForm.account_number.trim() || null,
      });

      setEditingSection(null);
      await loadRecord();
    } catch (error) {
      console.error("Failed to save basic section:", error);
      setModalError(error instanceof Error ? error.message : "Failed to save.");
    } finally {
      setIsMutating(false);
    }
  }

  async function saveAddressSection() {
    if (!record) return;

    try {
      setIsMutating(true);
      setModalError(null);

      await updateVendorBankAccount(record.id, {
        country: addressForm.country.trim() || null,
        city: addressForm.city.trim() || null,
        postal_code: addressForm.postal_code.trim() || null,
        address_line_1: addressForm.address_line_1.trim() || null,
        address_line_2: addressForm.address_line_2.trim() || null,
      });

      setEditingSection(null);
      await loadRecord();
    } catch (error) {
      console.error("Failed to save address section:", error);
      setModalError(error instanceof Error ? error.message : "Failed to save.");
    } finally {
      setIsMutating(false);
    }
  }

  async function saveControlSection() {
    if (!record) return;

    try {
      setIsMutating(true);
      setModalError(null);

           const normalizedIdentifierType = (() => {
        const value = controlForm.account_identifier_type.trim().toLowerCase();

        if (value === "swift" || value === "iban") {
          return value;
        }

        return null;
      })();

      await updateVendorBankAccount(record.id, {
        account_identifier_type: normalizedIdentifierType,
        account_identifier_value:
          controlForm.account_identifier_value.trim() || null,
        currency_code: controlForm.currency_code.trim() || null,
        is_default: controlForm.is_default,
        status: controlForm.status,
      });

      setEditingSection(null);
      await loadRecord();
    } catch (error) {
      console.error("Failed to save control section:", error);
      setModalError(error instanceof Error ? error.message : "Failed to save.");
    } finally {
      setIsMutating(false);
    }
  }

  async function saveNotesSection() {
    if (!record) return;

    try {
      setIsMutating(true);
      setModalError(null);

      await updateVendorBankAccount(record.id, {
        notes: notesForm.trim() || null,
      });

      setEditingSection(null);
      await loadRecord();
    } catch (error) {
      console.error("Failed to save notes section:", error);
      setModalError(error instanceof Error ? error.message : "Failed to save.");
    } finally {
      setIsMutating(false);
    }
  }

  async function handleArchiveToggle() {
    if (!record) return;

    try {
      setIsMutating(true);

      if (record.status === "archived") {
        await restoreVendorBankAccount(record.id);
      } else {
        await archiveVendorBankAccount(record.id);
      }

      await loadRecord();
    } catch (error) {
      console.error("Failed to update vendor bank account status:", error);
    } finally {
      setIsMutating(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-full min-h-0 flex-col overflow-hidden">
        <div className="mx-auto flex h-full w-full max-w-[1920px] min-h-0 flex-col gap-6 px-4 pb-4 pt-2 sm:px-6 xl:px-8">
          <div className="flex min-h-0 flex-1 items-center justify-center">
            <div className="text-sm text-white/50">
              Loading vendor bank account...
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!record) {
    return (
      <div className="flex h-full min-h-0 flex-col overflow-hidden">
        <div className="mx-auto flex h-full w-full max-w-[1920px] min-h-0 flex-col gap-6 px-4 pb-4 pt-2 sm:px-6 xl:px-8">
          <div className="flex min-h-0 flex-1 items-center justify-center">
            <Card className="w-full max-w-xl overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
              <CardContent className="p-8 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-black/20 text-white/70">
                  <CreditCard className="h-6 w-6" />
                </div>
                <div className="mt-4 text-lg font-semibold text-white">
                  Vendor bank account not found
                </div>
                <div className="mt-2 text-sm text-white/50">
                  The vendor bank account record could not be loaded.
                </div>
                <div className="mt-6">
                  <Button
                    variant="outline"
                    onClick={() =>
                      navigate("/finance/master-data/vendor-bank-accounts")
                    }
                    className="h-11 rounded-2xl border-white/10 bg-white/5 px-4 text-white hover:bg-white/10"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Vendor Bank Accounts
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  const vendorDisplayName =
    selectedVendor?.legal_name?.trim() ||
    selectedVendor?.name ||
    record.beneficiary_name ||
    "—";

  return (
    <>
      <div className="flex h-full min-h-0 flex-col overflow-hidden">
        <div className="mx-auto flex h-full w-full max-w-[1920px] min-h-0 flex-col gap-6 px-4 pb-4 pt-2 sm:px-6 xl:px-8">
          <section className="relative z-10 flex-shrink-0 overflow-hidden rounded-[30px] border border-white/10 bg-[linear-gradient(135deg,rgba(34,211,238,0.08),rgba(139,92,246,0.08),rgba(255,255,255,0.03))] backdrop-blur-xl">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.18),transparent_28%),radial-gradient(circle_at_top_right,rgba(139,92,246,0.14),transparent_26%),radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.14),transparent_24%)]" />

            <div className="relative flex items-center justify-between gap-4 px-5 py-5 sm:px-6 xl:px-7">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-cyan-200 shadow-none">
                    Master Data
                  </Badge>
                  <Badge className="rounded-full border border-white/10 bg-white/8 px-3 py-1 text-[11px] text-white/70 shadow-none">
                    {record.bank_id || "No bank ID"}
                  </Badge>
                  {record.vendor_code ? (
                    <Badge className="rounded-full border border-white/10 bg-white/8 px-3 py-1 text-[11px] text-white/70 shadow-none">
                      {record.vendor_code}
                    </Badge>
                  ) : null}
                  {record.is_default ? (
                    <Badge className="rounded-full border border-emerald-400/15 bg-emerald-500/10 px-3 py-1 text-[11px] text-emerald-200 shadow-none">
                      Default
                    </Badge>
                  ) : null}
                  <Badge
                    className={`rounded-full px-3 py-1 text-[11px] shadow-none ${getStatusTone(
                      record.status
                    )}`}
                  >
                    {record.status}
                  </Badge>
                </div>

                <h1 className="mt-3 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                  {record.bank_name || "Vendor Bank Account"}
                </h1>

                <div className="mt-2 text-sm text-white/50">
                  Vendor bank account record with structured section editing.
                </div>
              </div>

              <div className="flex shrink-0 flex-wrap items-center gap-3">
                <Button
                  variant="outline"
                  onClick={() =>
                    navigate("/finance/master-data/vendor-bank-accounts")
                  }
                  className="h-11 rounded-2xl border-white/10 bg-white/5 px-4 text-white hover:bg-white/10"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>

                <Button
                  variant="outline"
                  onClick={() => void handleArchiveToggle()}
                  disabled={isMutating}
                  className="h-11 rounded-2xl border-white/10 bg-white/5 px-4 text-white hover:bg-white/10"
                >
                  <ShieldCheck className="mr-2 h-4 w-4" />
                  {isMutating
                    ? "Updating..."
                    : record.status === "archived"
                    ? "Activate"
                    : "Archive"}
                </Button>

                <Button
                  variant="outline"
                  onClick={() => void loadRecord()}
                  className="h-11 rounded-2xl border-white/10 bg-white/5 px-4 text-white hover:bg-white/10"
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
                description="Vendor linkage, beneficiary, bank name, and account number."
                onEdit={openBasicEditor}
              >
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <DisplayRow label="Vendor" value={vendorDisplayName} />
                  <DisplayRow label="Vendor Code" value={record.vendor_code || "—"} />
                  <DisplayRow
                    label="Beneficiary Name"
                    value={record.beneficiary_name || "—"}
                  />
                  <DisplayRow label="Bank Name" value={record.bank_name || "—"} />
                  <DisplayRow
                    label="Account Number"
                    value={record.account_number || "—"}
                  />
                </div>
              </SectionCard>

              <SectionCard
                title="System Fields"
                description="Read-only audit and system fields."
              >
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <DisplayRow label="Bank ID" value={record.bank_id || "—"} />
                  <DisplayRow
                    label="Created At"
                    value={formatDateTimeLabel(record.created_at)}
                  />
                  <DisplayRow
                    label="Updated At"
                    value={formatDateTimeLabel(record.updated_at)}
                  />
                  <DisplayRow
                    label="Is Default"
                    value={record.is_default ? "Yes" : "No"}
                  />
                </div>
              </SectionCard>

              <SectionCard
                title="Section 2 — Bank Address"
                description="Country, city, postal code, and address lines."
                onEdit={openAddressEditor}
              >
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <DisplayRow label="Country" value={record.country || "—"} />
                  <DisplayRow label="City" value={record.city || "—"} />
                  <DisplayRow
                    label="ZIP / Postal Code"
                    value={record.postal_code || "—"}
                  />
                  <DisplayRow
                    label="Address Line 1"
                    value={record.address_line_1 || "—"}
                  />
                  <DisplayRow
                    label="Address Line 2"
                    value={record.address_line_2 || "—"}
                  />
                </div>
              </SectionCard>

              <SectionCard
                title="Section 3 — Identifier / Currency / Control"
                description="Identifier type, identifier value, currency, default, and status."
                onEdit={openControlEditor}
              >
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <DisplayRow
                    label="Identifier Type"
                    value={record.account_identifier_type || "—"}
                  />
                  <DisplayRow
                    label="Identifier Value"
                    value={record.account_identifier_value || "—"}
                  />
                  <DisplayRow
                    label="Currency Code"
                    value={record.currency_code || "—"}
                  />
                  <DisplayRow
                    label="Is Default"
                    value={record.is_default ? "Yes" : "No"}
                  />
                  <DisplayRow label="Status" value={record.status || "—"} />
                </div>
              </SectionCard>

              <SectionCard
                title="Section 4 — Notes"
                description="Internal notes for this vendor bank account."
                onEdit={openNotesEditor}
                fullWidth
              >
                <div className="rounded-[20px] border border-white/8 bg-black/15 px-4 py-4 text-sm leading-7 text-white/70">
                  {record.notes || "No notes added yet."}
                </div>
              </SectionCard>
            </div>
          </div>
        </div>
      </div>

      {editingSection === "basic" && (
        <ModalShell
          title="Edit Section 1 — Basic"
          description="Update vendor linkage, beneficiary, bank name, and account number."
          onClose={() => setEditingSection(null)}
          onSave={() => void saveBasicSection()}
          isSaving={isMutating}
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <FieldLabel label="Vendor" required />
              <select
                value={basicForm.vendor_id}
                onChange={(e) => handleBasicVendorChange(e.target.value)}
                className="h-11 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none"
              >
                <option value="">Select vendor</option>
                {vendors.map((vendor) => (
                  <option key={vendor.id} value={vendor.id}>
                    {(vendor.legal_name?.trim() || vendor.name) +
                      (vendor.code ? ` • ${vendor.code}` : "")}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <FieldLabel label="Beneficiary Name" required />
              <InputField
                value={basicForm.beneficiary_name}
                onChange={(e) =>
                  setBasicForm((prev) => ({
                    ...prev,
                    beneficiary_name: e.target.value,
                  }))
                }
              />
            </div>

            <div>
              <FieldLabel label="Bank Name" required />
              <InputField
                value={basicForm.bank_name}
                onChange={(e) =>
                  setBasicForm((prev) => ({
                    ...prev,
                    bank_name: e.target.value,
                  }))
                }
              />
            </div>

            <div>
              <FieldLabel label="Account Number" />
              <InputField
                value={basicForm.account_number}
                onChange={(e) =>
                  setBasicForm((prev) => ({
                    ...prev,
                    account_number: e.target.value,
                  }))
                }
              />
            </div>
          </div>

          {modalError ? (
            <div className="mt-4 text-sm text-rose-300">{modalError}</div>
          ) : null}
        </ModalShell>
      )}

      {editingSection === "address" && (
        <ModalShell
          title="Edit Section 2 — Bank Address"
          description="Update country, city, postal code, and address lines."
          onClose={() => setEditingSection(null)}
          onSave={() => void saveAddressSection()}
          isSaving={isMutating}
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <FieldLabel label="Country" />
              <InputField
                value={addressForm.country}
                onChange={(e) =>
                  setAddressForm((prev) => ({
                    ...prev,
                    country: e.target.value,
                  }))
                }
              />
            </div>

            <div>
              <FieldLabel label="City" />
              <InputField
                value={addressForm.city}
                onChange={(e) =>
                  setAddressForm((prev) => ({
                    ...prev,
                    city: e.target.value,
                  }))
                }
              />
            </div>

            <div>
              <FieldLabel label="ZIP / Postal Code" />
              <InputField
                value={addressForm.postal_code}
                onChange={(e) =>
                  setAddressForm((prev) => ({
                    ...prev,
                    postal_code: e.target.value,
                  }))
                }
              />
            </div>

            <div className="md:col-span-2">
              <FieldLabel label="Address Line 1" />
              <InputField
                value={addressForm.address_line_1}
                onChange={(e) =>
                  setAddressForm((prev) => ({
                    ...prev,
                    address_line_1: e.target.value,
                  }))
                }
              />
            </div>

            <div className="md:col-span-2">
              <FieldLabel label="Address Line 2" />
              <InputField
                value={addressForm.address_line_2}
                onChange={(e) =>
                  setAddressForm((prev) => ({
                    ...prev,
                    address_line_2: e.target.value,
                  }))
                }
              />
            </div>
          </div>

          {modalError ? (
            <div className="mt-4 text-sm text-rose-300">{modalError}</div>
          ) : null}
        </ModalShell>
      )}

      {editingSection === "control" && (
        <ModalShell
          title="Edit Section 3 — Identifier / Currency / Control"
          description="Update identifier, currency, default flag, and status."
          onClose={() => setEditingSection(null)}
          onSave={() => void saveControlSection()}
          isSaving={isMutating}
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <FieldLabel label="Identifier Type" />
              <InputField
                list="edit-identifier-type-options"
                value={controlForm.account_identifier_type}
                onChange={(e) =>
                  setControlForm((prev) => ({
                    ...prev,
                    account_identifier_type: e.target.value,
                  }))
                }
                placeholder="swift or iban"
              />
              <datalist id="edit-identifier-type-options">
                <option value="swift" />
                <option value="iban" />
              </datalist>
            </div>

            <div>
              <FieldLabel label={identifierLabel} />
              <InputField
                value={controlForm.account_identifier_value}
                onChange={(e) =>
                  setControlForm((prev) => ({
                    ...prev,
                    account_identifier_value: e.target.value,
                  }))
                }
              />
            </div>

            <div>
              <FieldLabel label="Currency Code" />
              <InputField
                list="edit-currency-code-options"
                value={controlForm.currency_code}
                onChange={(e) =>
                  setControlForm((prev) => ({
                    ...prev,
                    currency_code: e.target.value.toUpperCase(),
                  }))
                }
                placeholder="USD / EUR / CNY / ILS"
              />
              <datalist id="edit-currency-code-options">
                <option value="USD" />
                <option value="EUR" />
                <option value="CNY" />
                <option value="ILS" />
              </datalist>
            </div>

            <div>
              <FieldLabel label="Status" />
              <InputField
                list="edit-status-options"
                value={controlForm.status}
                onChange={(e) =>
                  setControlForm((prev) => ({
                    ...prev,
                    status: e.target.value as ControlForm["status"],
                  }))
                }
                placeholder="active / inactive / archived"
              />
              <datalist id="edit-status-options">
                <option value="active" />
                <option value="inactive" />
                <option value="archived" />
              </datalist>
            </div>

            <div className="md:col-span-2">
              <label className="flex items-center gap-3 text-sm text-white/75">
                <input
                  type="checkbox"
                  checked={controlForm.is_default}
                  onChange={(e) =>
                    setControlForm((prev) => ({
                      ...prev,
                      is_default: e.target.checked,
                    }))
                  }
                />
                Set as default bank account for this vendor
              </label>
            </div>
          </div>

          {modalError ? (
            <div className="mt-4 text-sm text-rose-300">{modalError}</div>
          ) : null}
        </ModalShell>
      )}

      {editingSection === "notes" && (
        <ModalShell
          title="Edit Section 4 — Notes"
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

          {modalError ? (
            <div className="mt-4 text-sm text-rose-300">{modalError}</div>
          ) : null}
        </ModalShell>
      )}
    </>
  );
}
