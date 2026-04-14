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
  archiveBankAccount,
  getBankAccountById,
  getCompanyOptions,
  updateBankAccount,
  type FinanceBankAccount,
  type CompanyOption,
} from "@/lib/finance/bankAccounts";

type EditSection = null | "basic" | "address" | "control" | "notes";

type BasicForm = {
  company_id: string;
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
      className={`h-11 rounded-2xl border-white/10 bg-white/5 text-white placeholder:text-white/30 ${
        props.className ?? ""
      }`}
    />
  );
}

function TextareaField(
  props: React.TextareaHTMLAttributes<HTMLTextAreaElement>
) {
  return (
    <textarea
      {...props}
      className={`min-h-[110px] w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-white/30 ${
        props.className ?? ""
      }`}
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
              className="h-11 rounded-2xl border-white/10 bg-white/5 px-4 text-white"
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
            className="h-11 rounded-2xl border-white/10 bg-white/5 px-4 text-white"
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
            className="h-11 rounded-2xl border-white/10 bg-white/5 px-4 text-white"
          >
            Cancel
          </Button>

          <Button
            variant="outline"
            onClick={onSave}
            disabled={isSaving}
            className="h-11 rounded-2xl border-white/10 bg-white/5 px-4 text-white"
          >
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? "Saving..." : "Save Section"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function FinanceMasterDataBankAccountDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [record, setRecord] = useState<FinanceBankAccount | null>(null);
  const [companies, setCompanies] = useState<CompanyOption[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);
  const [editingSection, setEditingSection] = useState<EditSection>(null);
  const [modalError, setModalError] = useState<string | null>(null);

  const [basicForm, setBasicForm] = useState<BasicForm>({
    company_id: "",
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

  const selectedCompany = useMemo(() => {
    return companies.find((c) => c.id === basicForm.company_id) ?? null;
  }, [companies, basicForm.company_id]);

  const identifierLabel = useMemo(() => {
    return controlForm.account_identifier_type.toLowerCase() === "iban"
      ? "IBAN Value"
      : "SWIFT Value";
  }, [controlForm.account_identifier_type]);

  const loadRecord = useCallback(async () => {
    if (!id) return;

    setIsLoading(true);

    try {
      const [detail, companyRows] = await Promise.all([
        getBankAccountById(id),
        getCompanyOptions(),
      ]);

      setRecord(detail);
      setCompanies(companyRows);
    } catch (error) {
      console.error("Failed to load bank account:", error);
      setRecord(null);
      setCompanies([]);
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
      company_id: record.company_id,
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
      account_identifier_type:
        record.account_identifier_type || "swift",
      account_identifier_value:
        record.account_identifier_value || "",
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

  function handleCompanyChange(companyId: string) {
    const company = companies.find((c) => c.id === companyId) ?? null;

    setBasicForm((prev) => ({
      ...prev,
      company_id: companyId,
      beneficiary_name:
        company?.legal_name?.trim() || company?.name || "",
    }));

    if (company?.currency_code) {
      setControlForm((prev) => ({
        ...prev,
        currency_code: prev.currency_code || company.currency_code || "",
      }));
    }
  }

  async function saveBasicSection() {
    if (!record) return;

    if (!basicForm.company_id) {
      setModalError("Company is required.");
      return;
    }

    if (!basicForm.bank_name.trim()) {
      setModalError("Bank name is required.");
      return;
    }

    try {
      setIsMutating(true);
      setModalError(null);

      await updateBankAccount(record.id, {
        company_id: basicForm.company_id,
        beneficiary_name: basicForm.beneficiary_name.trim() || null,
        bank_name: basicForm.bank_name.trim() || null,
        account_number: basicForm.account_number.trim() || null,
      });

      setEditingSection(null);
      await loadRecord();
    } catch (error) {
      console.error("Failed to save basic section:", error);
      setModalError("Failed to save.");
    } finally {
      setIsMutating(false);
    }
  }

  async function saveAddressSection() {
    if (!record) return;

    try {
      setIsMutating(true);
      setModalError(null);

      await updateBankAccount(record.id, {
        country: addressForm.country.trim() || null,
        city: addressForm.city.trim() || null,
        postal_code: addressForm.postal_code.trim() || null,
        address_line_1: addressForm.address_line_1.trim() || null,
        address_line_2: addressForm.address_line_2.trim() || null,
      });

      setEditingSection(null);
      await loadRecord();
    } catch {
      setModalError("Failed to save.");
    } finally {
      setIsMutating(false);
    }
  }

  async function saveControlSection() {
    if (!record) return;

    try {
      setIsMutating(true);
      setModalError(null);

      await updateBankAccount(record.id, {
        account_identifier_type:
          controlForm.account_identifier_type.trim() || null,
        account_identifier_value:
          controlForm.account_identifier_value.trim() || null,
        currency_code: controlForm.currency_code.trim() || null,
        is_default: controlForm.is_default,
        status: controlForm.status,
      });

      setEditingSection(null);
      await loadRecord();
    } catch {
      setModalError("Failed to save.");
    } finally {
      setIsMutating(false);
    }
  }

  async function saveNotesSection() {
    if (!record) return;

    try {
      setIsMutating(true);
      setModalError(null);

      await updateBankAccount(record.id, {
        notes: notesForm.trim() || null,
      });

      setEditingSection(null);
      await loadRecord();
    } catch {
      setModalError("Failed to save.");
    } finally {
      setIsMutating(false);
    }
  }

  async function handleArchiveToggle() {
    if (!record) return;

    try {
      setIsMutating(true);

      await archiveBankAccount(record.id);
      await loadRecord();
    } finally {
      setIsMutating(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-full min-h-0 flex-col overflow-hidden">
        <div className="mx-auto flex h-full w-full max-w-[1920px] min-h-0 flex-col gap-6 px-4 pb-4 pt-2">
          <div className="flex flex-1 items-center justify-center text-white/50">
            Loading bank account...
          </div>
        </div>
      </div>
    );
  }

  if (!record) {
    return (
      <div className="flex h-full min-h-0 flex-col overflow-hidden">
        <div className="mx-auto flex h-full w-full max-w-[1920px] min-h-0 flex-col gap-6 px-4 pb-4 pt-2">
          <div className="flex flex-1 items-center justify-center text-white/50">
            Bank account not found
          </div>
        </div>
      </div>
    );
  }

  const companyDisplay =
    selectedCompany?.legal_name?.trim() ||
    selectedCompany?.name ||
    record.beneficiary_name ||
    "—";

  return (
    <>
      <div className="flex h-full min-h-0 flex-col overflow-hidden">
        <div className="mx-auto flex h-full w-full max-w-[1920px] min-h-0 flex-col gap-6 px-4 pb-4 pt-2">

          {/* HEADER */}
          <section className="relative z-10 flex-shrink-0 rounded-[30px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
            <div className="flex items-center justify-between px-6 py-5">
              <div>
                <div className="flex gap-2 mb-2">
                  <Badge>{record.bank_id}</Badge>
                  {record.is_default && <Badge>Default</Badge>}
                  <Badge className={getStatusTone(record.status)}>
                    {record.status}
                  </Badge>
                </div>

                <h1 className="text-2xl font-semibold text-white">
                  {record.bank_name || "Bank Account"}
                </h1>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() =>
                    navigate("/finance/master-data/bank-accounts")
                  }
                  className="h-11 rounded-2xl border-white/10 bg-white/5 text-white"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>

                <Button
                  variant="outline"
                  onClick={handleArchiveToggle}
                  className="h-11 rounded-2xl border-white/10 bg-white/5 text-white"
                >
                  <ShieldCheck className="mr-2 h-4 w-4" />
                  Archive
                </Button>

                <Button
                  variant="outline"
                  onClick={() => loadRecord()}
                  className="h-11 rounded-2xl border-white/10 bg-white/5 text-white"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh
                </Button>
              </div>
            </div>
          </section>

          {/* CONTENT */}
          <div className="flex flex-1 flex-col gap-6 overflow-y-auto">
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">

              <SectionCard
                title="Section 1 — Basic"
                description="Company linkage and account identity"
                onEdit={openBasicEditor}
              >
                <DisplayRow label="Company" value={companyDisplay} />
                <DisplayRow label="Beneficiary" value={record.beneficiary_name || "—"} />
                <DisplayRow label="Bank" value={record.bank_name || "—"} />
                <DisplayRow label="Account" value={record.account_number || "—"} />
              </SectionCard>

              <SectionCard
                title="System Fields"
                description="Audit fields"
              >
                <DisplayRow label="Created" value={formatDateTimeLabel(record.created_at)} />
                <DisplayRow label="Updated" value={formatDateTimeLabel(record.updated_at)} />
              </SectionCard>

              <SectionCard
                title="Section 2 — Address"
                description="Bank location"
                onEdit={openAddressEditor}
              >
                <DisplayRow label="Country" value={record.country || "—"} />
                <DisplayRow label="City" value={record.city || "—"} />
                <DisplayRow label="ZIP" value={record.postal_code || "—"} />
                <DisplayRow label="Address 1" value={record.address_line_1 || "—"} />
                <DisplayRow label="Address 2" value={record.address_line_2 || "—"} />
              </SectionCard>

              <SectionCard
                title="Section 3 — Control"
                description="Identifier and status"
                onEdit={openControlEditor}
              >
                <DisplayRow label="Type" value={record.account_identifier_type || "—"} />
                <DisplayRow label="Value" value={record.account_identifier_value || "—"} />
                <DisplayRow label="Currency" value={record.currency_code || "—"} />
                <DisplayRow label="Default" value={record.is_default ? "Yes" : "No"} />
                <DisplayRow label="Status" value={record.status} />
              </SectionCard>

              <SectionCard
                title="Section 4 — Notes"
                description="Internal notes"
                onEdit={openNotesEditor}
                fullWidth
              >
                <div className="text-white/70">
                  {record.notes || "No notes"}
                </div>
              </SectionCard>

            </div>
          </div>
        </div>
      </div>
    </>
  );
}
