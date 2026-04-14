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
      className={`flex flex-col overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.045] ${
        fullWidth ? "xl:col-span-2" : ""
      }`}
    >
      <CardHeader className="border-b border-white/8 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-white">{title}</CardTitle>
            <CardDescription className="text-white/45">
              {description}
            </CardDescription>
          </div>

          {onEdit && (
            <Button variant="outline" onClick={onEdit}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent>{children}</CardContent>
    </Card>
  );
}

export default function FinanceMasterDataBankAccountDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [record, setRecord] = useState<FinanceBankAccount | null>(null);
  const [companies, setCompanies] = useState<CompanyOption[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);
  const [editingSection, setEditingSection] =
    useState<EditSection>(null);

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
    if (controlForm.account_identifier_type.toLowerCase() === "iban") {
      return "IBAN Value";
    }
    return "SWIFT Value";
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
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadRecord();
  }, [loadRecord]);

  function openBasicEditor() {
    if (!record) return;

    setBasicForm({
      company_id: record.company_id || "",
      beneficiary_name: record.beneficiary_name || "",
      bank_name: record.bank_name || "",
      account_number: record.account_number || "",
    });

    setEditingSection("basic");
  }

  function openAddressEditor() {
    if (!record) return;

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

    setNotesForm(record.notes || "");
    setEditingSection("notes");
  }

  function handleCompanyChange(companyId: string) {
    const company = companies.find((c) => c.id === companyId);

    setBasicForm((prev) => ({
      ...prev,
      company_id: companyId,
      beneficiary_name:
        company?.legal_name?.trim() || company?.name || "",
    }));
  }

  async function saveBasicSection() {
    if (!record) return;

    try {
      setIsMutating(true);

      await updateBankAccount(record.id, {
        company_id: basicForm.company_id,
        beneficiary_name: basicForm.beneficiary_name,
        bank_name: basicForm.bank_name,
        account_number: basicForm.account_number,
      });

      setEditingSection(null);
      await loadRecord();
    } finally {
      setIsMutating(false);
    }
  }

  async function saveAddressSection() {
    if (!record) return;

    try {
      setIsMutating(true);

      await updateBankAccount(record.id, {
        country: addressForm.country,
        city: addressForm.city,
        postal_code: addressForm.postal_code,
        address_line_1: addressForm.address_line_1,
        address_line_2: addressForm.address_line_2,
      });

      setEditingSection(null);
      await loadRecord();
    } finally {
      setIsMutating(false);
    }
  }

  async function saveControlSection() {
    if (!record) return;

    try {
      setIsMutating(true);

      await updateBankAccount(record.id, {
        account_identifier_type:
          controlForm.account_identifier_type,
        account_identifier_value:
          controlForm.account_identifier_value,
        currency_code: controlForm.currency_code,
        is_default: controlForm.is_default,
        status: controlForm.status,
      });

      setEditingSection(null);
      await loadRecord();
    } finally {
      setIsMutating(false);
    }
  }

  async function saveNotesSection() {
    if (!record) return;

    try {
      setIsMutating(true);

      await updateBankAccount(record.id, {
        notes: notesForm,
      });

      setEditingSection(null);
      await loadRecord();
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
    return <div className="text-white/50 p-6">Loading...</div>;
  }

  if (!record) {
    return <div className="text-white/50 p-6">Not found</div>;
  }

  return (
    <>
      <div className="p-6 space-y-6">

        {/* HEADER */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl text-white font-semibold">
              {record.bank_name || "Bank Account"}
            </h1>

            <div className="flex gap-2 mt-2">
              <Badge>{record.bank_id}</Badge>
              {record.is_default && <Badge>Default</Badge>}
              <Badge className={getStatusTone(record.status)}>
                {record.status}
              </Badge>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() =>
                navigate("/finance/master-data/bank-accounts")
              }
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>

            <Button variant="outline" onClick={handleArchiveToggle}>
              <ShieldCheck className="mr-2 h-4 w-4" />
              Archive
            </Button>

            <Button variant="outline" onClick={() => loadRecord()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>

        {/* SECTIONS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* BASIC */}
          <SectionCard
            title="Basic"
            description="Company and account identity"
            onEdit={openBasicEditor}
          >
            <DisplayRow label="Company" value={selectedCompany?.name || "—"} />
            <DisplayRow label="Beneficiary" value={record.beneficiary_name || "—"} />
            <DisplayRow label="Bank" value={record.bank_name || "—"} />
            <DisplayRow label="Account" value={record.account_number || "—"} />
          </SectionCard>

          {/* SYSTEM */}
          <SectionCard
            title="System"
            description="System fields"
          >
            <DisplayRow label="Created" value={formatDateTimeLabel(record.created_at)} />
            <DisplayRow label="Updated" value={formatDateTimeLabel(record.updated_at)} />
          </SectionCard>

          {/* ADDRESS */}
          <SectionCard
            title="Address"
            description="Bank location"
            onEdit={openAddressEditor}
          >
            <DisplayRow label="Country" value={record.country || "—"} />
            <DisplayRow label="City" value={record.city || "—"} />
            <DisplayRow label="ZIP" value={record.postal_code || "—"} />
            <DisplayRow label="Address 1" value={record.address_line_1 || "—"} />
            <DisplayRow label="Address 2" value={record.address_line_2 || "—"} />
          </SectionCard>

          {/* CONTROL */}
          <SectionCard
            title="Control"
            description="Identifier and status"
            onEdit={openControlEditor}
          >
            <DisplayRow label="Type" value={record.account_identifier_type || "—"} />
            <DisplayRow label="Value" value={record.account_identifier_value || "—"} />
            <DisplayRow label="Currency" value={record.currency_code || "—"} />
            <DisplayRow label="Default" value={record.is_default ? "Yes" : "No"} />
            <DisplayRow label="Status" value={record.status} />
          </SectionCard>

          {/* NOTES */}
          <SectionCard
            title="Notes"
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

      {/* MODALS (simplified same pattern) */}
      {editingSection === "basic" && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center">
          <div className="bg-black p-6 rounded-xl w-[500px] space-y-4">
            <InputField
              value={basicForm.bank_name}
              onChange={(e) =>
                setBasicForm((p) => ({ ...p, bank_name: e.target.value }))
              }
            />
            <Button onClick={saveBasicSection}>Save</Button>
          </div>
        </div>
      )}

    </>
  );
}
