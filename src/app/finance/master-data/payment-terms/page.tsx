import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, MoreHorizontal, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { supabase } from "@/lib/supabase";
import {
  getEffectivePermissions,
  type Permission,
  type Role,
} from "@/lib/permissions";
import {
  archivePaymentTerm,
  createPaymentTerm,
  getPaymentTerms,
  permanentlyDeletePaymentTerm,
  restorePaymentTerm,
  updatePaymentTerm,
  type FinancePaymentTermAppliesTo,
  type FinancePaymentTermBalanceDueBasis,
  type FinancePaymentTermDepositDueBasis,
  type FinancePaymentTermDepositType,
  type FinancePaymentTermDueBasis,
  type FinancePaymentTermRow,
  type FinancePaymentTermStatus,
  type FinancePaymentTermType,
} from "@/lib/finance/paymentTerms";

type ProfilePermissionRow = {
  role: Role;
  permissions?: Partial<Record<Permission, boolean>> | null;
};

type StatusFilter = "all" | FinancePaymentTermStatus;

type FormState = {
  code: string;
  name: string;
  due_days: string;
  status: FinancePaymentTermStatus;
  is_default: boolean;
  notes: string;
  term_type: FinancePaymentTermType;
  due_basis: FinancePaymentTermDueBasis;
  requires_deposit: boolean;
  deposit_type: FinancePaymentTermDepositType;
  deposit_percentage: string;
  deposit_amount: string;
  deposit_due_basis: FinancePaymentTermDepositDueBasis;
  deposit_due_days: string;
  balance_due_basis: FinancePaymentTermBalanceDueBasis;
  balance_due_days: string;
  allow_partial_payments: boolean;
  requires_approval: boolean;
  applies_to: FinancePaymentTermAppliesTo[];
  document_label: string;
  document_terms_text: string;
};

const EMPTY_FORM: FormState = {
  code: "",
  name: "",
  due_days: "0",
  status: "active",
  is_default: false,
  notes: "",
  term_type: "net",
  due_basis: "invoice_date",
  requires_deposit: false,
  deposit_type: "percentage",
  deposit_percentage: "",
  deposit_amount: "",
  deposit_due_basis: "immediate",
  deposit_due_days: "0",
  balance_due_basis: "invoice_date",
  balance_due_days: "0",
  allow_partial_payments: true,
  requires_approval: false,
  applies_to: ["quotation", "proforma_invoice", "invoice"],
  document_label: "",
  document_terms_text: "",
};

const TERM_TYPE_OPTIONS: Array<{
  value: FinancePaymentTermType;
  label: string;
  description: string;
}> = [
  {
    value: "immediate",
    label: "Immediate",
    description: "Payment is due immediately.",
  },
  {
    value: "net",
    label: "Net Terms",
    description: "Full payment is due after a fixed number of days.",
  },
  {
    value: "deposit_balance",
    label: "Deposit + Balance",
    description: "Collect a deposit first, then collect the remaining balance.",
  },
  {
    value: "milestone",
    label: "Milestone",
    description: "Payment follows project, delivery, or production milestones.",
  },
  {
    value: "custom",
    label: "Custom",
    description: "Use custom commercial wording for special terms.",
  },
];

const DUE_BASIS_OPTIONS: Array<{ value: FinancePaymentTermDueBasis; label: string }> = [
  { value: "invoice_date", label: "Invoice Date" },
  { value: "issue_date", label: "Issue Date" },
  { value: "delivery_date", label: "Delivery Date" },
  { value: "shipment_date", label: "Shipment Date" },
  { value: "custom", label: "Custom" },
];

const DEPOSIT_TYPE_OPTIONS: Array<{ value: FinancePaymentTermDepositType; label: string }> = [
  { value: "percentage", label: "Percentage" },
  { value: "fixed_amount", label: "Fixed Amount" },
];

const DEPOSIT_DUE_BASIS_OPTIONS: Array<{
  value: FinancePaymentTermDepositDueBasis;
  label: string;
}> = [
  { value: "immediate", label: "Immediately" },
  { value: "before_production", label: "Before Production" },
  { value: "before_shipment", label: "Before Shipment" },
  { value: "before_delivery", label: "Before Delivery" },
  { value: "custom_days", label: "Custom Days" },
];

const BALANCE_DUE_BASIS_OPTIONS: Array<{
  value: FinancePaymentTermBalanceDueBasis;
  label: string;
}> = [
  { value: "invoice_date", label: "Invoice Date" },
  { value: "delivery_date", label: "Delivery Date" },
  { value: "shipment_date", label: "Shipment Date" },
  { value: "after_deposit", label: "After Deposit" },
  { value: "before_shipment", label: "Before Shipment" },
  { value: "custom_days", label: "Custom Days" },
];

const APPLIES_TO_OPTIONS: Array<{ value: FinancePaymentTermAppliesTo; label: string }> = [
  { value: "quotation", label: "Quotation" },
  { value: "proforma_invoice", label: "Proforma Invoice" },
  { value: "invoice", label: "Invoice" },
  { value: "bill", label: "Bill" },
  { value: "all", label: "All" },
];

function formatDateLabel(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";

  return parsed.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatTermType(value: FinancePaymentTermType) {
  return TERM_TYPE_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

function formatBasisLabel(
  value:
    | FinancePaymentTermDueBasis
    | FinancePaymentTermDepositDueBasis
    | FinancePaymentTermBalanceDueBasis
    | null
) {
  if (!value) return "—";

  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function parseOptionalNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) return null;

  return parsed;
}

function buildSuggestedDocumentText(form: FormState) {
  const dueDays = Number(form.due_days || 0);
  const balanceDays = Number(form.balance_due_days || form.due_days || 0);
  const depositValue =
    form.deposit_type === "percentage"
      ? `${form.deposit_percentage || "0"}%`
      : `fixed deposit amount`;

  if (form.term_type === "immediate") {
    return "Payment is due immediately.";
  }

  if (form.term_type === "net") {
    return `Payment is due within ${dueDays} days from ${formatBasisLabel(
      form.due_basis
    ).toLowerCase()}.`;
  }

  if (form.term_type === "deposit_balance") {
    return `${depositValue} deposit is required ${formatBasisLabel(
      form.deposit_due_basis
    ).toLowerCase()}. Remaining balance is due ${formatBasisLabel(
      form.balance_due_basis
    ).toLowerCase()}${
      balanceDays > 0 ? ` within ${balanceDays} days` : ""
    }.`;
  }

  return form.document_terms_text;
}

function SelectField<TValue extends string>({
  value,
  onChange,
  options,
  className = "",
}: {
  value: TValue;
  onChange: (value: TValue) => void;
  options: Array<{ value: TValue; label: string }>;
  className?: string;
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value as TValue)}
      className={`h-11 w-full rounded-2xl border border-white/10 bg-black/20 px-3 text-sm text-white outline-none transition focus:border-cyan-400/40 ${className}`}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value} className="bg-[#101522] text-white">
          {option.label}
        </option>
      ))}
    </select>
  );
}

function ToggleCard({
  checked,
  title,
  description,
  onChange,
}: {
  checked: boolean;
  title: string;
  description: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`rounded-[22px] border p-4 text-left transition ${
        checked
          ? "border-cyan-400/25 bg-cyan-500/10"
          : "border-white/10 bg-black/20 hover:border-white/20 hover:bg-white/[0.04]"
      }`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`mt-1 h-4 w-4 rounded-full border ${
            checked ? "border-cyan-300 bg-cyan-400" : "border-white/20 bg-white/5"
          }`}
        />
        <span>
          <span className="block text-sm font-semibold text-white">{title}</span>
          <span className="mt-1 block text-xs leading-5 text-slate-500">{description}</span>
        </span>
      </div>
    </button>
  );
}

export default function FinancePaymentTermsPage() {
  const navigate = useNavigate();

  const [rows, setRows] = useState<FinancePaymentTermRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [role, setRole] = useState<Role | null>(null);
  const [permissionOverrides, setPermissionOverrides] =
    useState<Partial<Record<Permission, boolean>> | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<FinancePaymentTermRow | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [error, setError] = useState("");

  const loadPage = useCallback(async () => {
    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user?.id) {
        const { data: profile } = await supabase

                .from("profiles")
          .select("role, permissions")
          .eq("user_id", user.id)
          .maybeSingle();

        if (profile) {
          const typedProfile = profile as ProfilePermissionRow;
          setRole(typedProfile.role);
          setPermissionOverrides(typedProfile.permissions || null);
        }
      }

      setRows(await getPaymentTerms());
    } catch (loadError) {
      console.error("Failed to load payment terms:", loadError);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPage();
  }, [loadPage]);

  const permissions = useMemo(() => {
    if (!role) return null;
    return getEffectivePermissions(role, permissionOverrides);
  }, [permissionOverrides, role]);

  const canCreate = !!permissions?.createFinanceRecords;
  const canEdit = !!permissions?.editFinanceRecords;
  const canArchive = !!permissions?.archiveFinanceRecords;

  const activeRows = useMemo(
    () => rows.filter((row) => row.status === "active"),
    [rows]
  );

  const depositRows = useMemo(
    () => rows.filter((row) => row.requires_deposit && row.status === "active"),
    [rows]
  );

  const defaultRow = useMemo(
    () => rows.find((row) => row.is_default && row.status === "active") ?? null,
    [rows]
  );

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();

    return rows.filter((row) => {
      const matchesStatus = statusFilter === "all" ? true : row.status === statusFilter;
      const matchesSearch =
        !q ||
        row.name.toLowerCase().includes(q) ||
        row.code.toLowerCase().includes(q) ||
        row.term_type.toLowerCase().includes(q) ||
        (row.document_label ?? "").toLowerCase().includes(q) ||
        (row.document_terms_text ?? "").toLowerCase().includes(q) ||
        (row.notes ?? "").toLowerCase().includes(q);

      return matchesStatus && matchesSearch;
    });
  }, [rows, search, statusFilter]);

  function openCreateDialog() {
    setEditingRow(null);
    setForm(EMPTY_FORM);
    setError("");
    setDialogOpen(true);
  }

  function openEditDialog(row: FinancePaymentTermRow) {
    setEditingRow(row);
    setForm({
      code: row.code,
      name: row.name,
      due_days: String(row.due_days),
      status: row.status,
      is_default: row.is_default,
      notes: row.notes ?? "",
      term_type: row.term_type,
      due_basis: row.due_basis,
      requires_deposit: row.requires_deposit,
      deposit_type: row.deposit_type ?? "percentage",
      deposit_percentage:
        row.deposit_percentage === null ? "" : String(row.deposit_percentage),
      deposit_amount: row.deposit_amount === null ? "" : String(row.deposit_amount),
      deposit_due_basis: row.deposit_due_basis ?? "immediate",
      deposit_due_days: row.deposit_due_days === null ? "0" : String(row.deposit_due_days),
      balance_due_basis: row.balance_due_basis ?? "invoice_date",
      balance_due_days: row.balance_due_days === null ? String(row.due_days) : String(row.balance_due_days),
      allow_partial_payments: row.allow_partial_payments,
      requires_approval: row.requires_approval,
      applies_to: row.applies_to.length
        ? row.applies_to
        : ["quotation", "proforma_invoice", "invoice"],
      document_label: row.document_label ?? row.name,
      document_terms_text: row.document_terms_text ?? "",
    });
    setError("");
    setDialogOpen(true);
  }

  function updateTermType(value: FinancePaymentTermType) {
    setForm((previous) => {
      if (value === "immediate") {
        return {
          ...previous,
          term_type: value,
          requires_deposit: false,
          due_days: "0",
          balance_due_basis: "invoice_date",
          balance_due_days: "0",
        };
      }

      if (value === "deposit_balance") {
        return {
          ...previous,
          term_type: value,
          requires_deposit: true,
          deposit_type: previous.deposit_type || "percentage",
          deposit_due_basis: previous.deposit_due_basis || "immediate",
          balance_due_basis: previous.balance_due_basis || "invoice_date",
          balance_due_days: previous.balance_due_days || previous.due_days || "0",
        };
      }

      return {
        ...previous,
        term_type: value,
        requires_deposit: false,
      };
    });
  }

  function toggleAppliesTo(value: FinancePaymentTermAppliesTo) {
    setForm((previous) => {
      if (value === "all") {
        return {
          ...previous,
          applies_to: previous.applies_to.includes("all") ? [] : ["all"],
        };
      }

      const withoutAll = previous.applies_to.filter((item) => item !== "all");
      const nextValues = withoutAll.includes(value)
        ? withoutAll.filter((item) => item !== value)
        : [...withoutAll, value];

      return {
        ...previous,
        applies_to: nextValues,
      };
    });
  }

  async function handleSave() {
    if (!(editingRow ? canEdit : canCreate)) return;

    const dueDays = Number(form.due_days);
    const balanceDueDays = parseOptionalNumber(form.balance_due_days);
    const depositDueDays = parseOptionalNumber(form.deposit_due_days);
    const depositPercentage = parseOptionalNumber(form.deposit_percentage);
    const depositAmount = parseOptionalNumber(form.deposit_amount);

    if (!form.code.trim() || !form.name.trim()) {
      setError("Code and name are required.");
      return;
    }

    if (!Number.isInteger(dueDays) || dueDays < 0) {
      setError("Due days must be a whole number 0 or greater.");
      return;
    }

    if (
      form.requires_deposit &&
      form.deposit_type === "percentage" &&
      (depositPercentage === null || depositPercentage <= 0 || depositPercentage > 100)
    ) {
      setError("Deposit percentage must be greater than 0 and no more than 100.");
      return;
    }

    if (
      form.requires_deposit &&
      form.deposit_type === "fixed_amount" &&
      (depositAmount === null || depositAmount <= 0)
    ) {
      setError("Deposit amount must be greater than 0.");
      return;
    }

    if (!form.applies_to.length) {
      setError("Select at least one document type this payment term applies to.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const documentTermsText = form.document_terms_text.trim()
        ? form.document_terms_text
        : buildSuggestedDocumentText(form);

      const payload = {
        code: form.code,
        name: form.name,
        due_days: dueDays,
        status: form.status,
        is_default: form.is_default,
        notes: form.notes,
        term_type: form.term_type,
        due_basis: form.due_basis,
        requires_deposit: form.requires_deposit,
        deposit_type: form.requires_deposit ? form.deposit_type : null,
        deposit_percentage:
          form.requires_deposit && form.deposit_type === "percentage"
            ? depositPercentage
            : null,
        deposit_amount:
          form.requires_deposit && form.deposit_type === "fixed_amount"
            ? depositAmount
            : null,
        deposit_due_basis: form.requires_deposit ? form.deposit_due_basis : null,
        deposit_due_days: form.requires_deposit ? depositDueDays : null,
        balance_due_basis: form.balance_due_basis,
        balance_due_days: balanceDueDays,
        allow_partial_payments: form.allow_partial_payments,
        requires_approval: form.requires_approval,
        applies_to: form.applies_to,
        document_label: form.document_label || form.name,
        document_terms_text: documentTermsText,
      };

      if (editingRow) {
        await updatePaymentTerm(editingRow.id, payload);
      } else {
        await createPaymentTerm(payload);
      }

      setDialogOpen(false);
      setForm(EMPTY_FORM);
      setEditingRow(null);
      await loadPage();
    } catch (saveError) {
      console.error("Failed to save payment term:", saveError);
      setError(saveError instanceof Error ? saveError.message : "Failed to save payment term.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(row: FinancePaymentTermRow) {
    try {
      await archivePaymentTerm(row.id);
      await loadPage();
    } catch (actionError) {
      console.error("Failed to archive payment term:", actionError);
    }
  }

  async function handleRestore(row: FinancePaymentTermRow) {
    try {
      await restorePaymentTerm(row.id);
      await loadPage();
    } catch (actionError) {
      console.error("Failed to restore payment term:", actionError);
    }
  }

  async function handleHardDelete(row: FinancePaymentTermRow) {
    try {
      await permanentlyDeletePaymentTerm(row.id);
      await loadPage();
    } catch (actionError) {
      console.error("Failed to permanently delete payment term:", actionError);
    }
  }

  return (
    <div className="min-h-screen bg-[#05070d] px-4 py-4 text-white md:px-6 md:py-6">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
        <section className="relative overflow-hidden rounded-[34px] border border-white/10 bg-white/[0.045] p-6 shadow-2xl shadow-black/30 backdrop-blur-xl">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(6,182,212,0.16),transparent_38%),radial-gradient(circle_at_top_right,rgba(139,92,246,0.12),transparent_34%)]" />

          <div className="relative">
            <Button
              variant="outline"
              onClick={() => navigate("/finance/master-data")}
              className="mb-5 inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-300 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
            >
              <ArrowRight className="h-3.5 w-3.5 rotate-180" />
              Master Data
            </Button>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_620px] xl:items-stretch">
              <div>
                <Badge className="inline-flex w-fit items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-200 shadow-none">
                  Commercial Rules
                </Badge>

                <h1 className="mt-4 text-3xl font-semibold tracking-[-0.035em] text-white md:text-5xl">
                  Payment Terms
                </h1>

                <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-400 md:text-base md:leading-7">
                  Control when payments are due, whether a deposit is required, how the balance is
                  collected, and what commercial wording appears on quotations, proforma invoices,
                  and invoices.
                </p>

                <div className="mt-5 flex flex-wrap gap-2">
                  <Badge className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-200 shadow-none">
                    {activeRows.length} Active
                  </Badge>
                  <Badge className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-200 shadow-none">
                    {depositRows.length} Deposit Terms
                  </Badge>
                  <Badge className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-300 shadow-none">
                    Auto-Refresh
                  </Badge>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-1">
                <div className="min-h-[148px] rounded-[24px] border border-white/10 bg-black/20 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Default Term
                  </p>
                  <p className="mt-2 text-xl font-semibold leading-tight tracking-[-0.035em] text-white">
                    {defaultRow?.document_label ?? defaultRow?.name ?? "Not Set"}
                  </p>
                  <p className="mt-3 text-xs leading-5 text-slate-500">
                    The default payment rule used when a document does not override terms.
                  </p>
                </div>

                <div className="min-h-[148px] rounded-[24px] border border-white/10 bg-black/20 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Deposit Coverage
                  </p>
                  <p className="mt-2 text-xl font-semibold leading-tight tracking-[-0.035em] text-white">
                    {depositRows.length}
                  </p>
                  <p className="mt-3 text-xs leading-5 text-slate-500">
                    Terms that require upfront deposit before balance collection.
                  </p>
                </div>

                <div className="min-h-[148px] rounded-[24px] border border-white/10 bg-black/20 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Records
                  </p>
                  <p className="mt-2 text-xl font-semibold leading-tight tracking-[-0.035em] text-white">
                    {rows.length}
                  </p>
                  <p className="mt-3 text-xs leading-5 text-slate-500">
                    Centralized commercial terms for finance documents.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
          <div className="flex flex-col gap-4 border-b border-white/10 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                Payment Term Library
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Manage due dates, deposit rules, balance rules, and document-facing wording.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search code, name, type, wording..."
                className="h-11 w-full rounded-2xl border-white/10 bg-black/20 text-white placeholder:text-white/35 sm:w-[340px]"
              />

              {canCreate ? (
                <Button
                  onClick={openCreateDialog}
                  className="h-11 rounded-xl border border-cyan-400/20 bg-cyan-500 px-4 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  New Payment Term
                </Button>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 border-b border-white/10 px-5 py-4">
            {(["all", "active", "inactive", "archived"] as const).map((value) => (
              <Button
                key={value}
                type="button"
                variant="outline"
                onClick={() => setStatusFilter(value)}
                className={`h-10 rounded-full border-white/10 px-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-white ${
                  statusFilter === value ? "bg-white/10" : "bg-black/20 hover:bg-white/10"
                }`}
              >
                {value === "all" ? "All" : value}
              </Button>
            ))}
          </div>

          <div className="overflow-x-auto p-5">
            {loading ? (
              <div className="rounded-[24px] border border-white/10 bg-black/20 p-6 text-sm text-slate-400">
                Loading payment terms...
              </div>
            ) : filteredRows.length === 0 ? (
              <div className="rounded-[24px] border border-white/10 bg-black/20 p-6 text-sm text-slate-400">
                No payment terms found.
              </div>
            ) : (
              <div className="grid min-w-[1120px] gap-4">
                {filteredRows.map((row) => (
                  <div
                    key={row.id}
                    className="grid grid-cols-[220px_180px_210px_260px_140px_70px] items-stretch gap-4 rounded-[24px] border border-white/10 bg-black/20 p-4"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-cyan-200 shadow-none">
                          {row.code}
                        </Badge>
                        {row.is_default ? (
                          <Badge className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-emerald-200 shadow-none">
                            Default
                          </Badge>
                        ) : null}
                      </div>
                      <p className="mt-3 truncate text-sm font-semibold text-white">{row.name}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        Updated {formatDateLabel(row.updated_at)}
                      </p>
                    </div>

                    <div className="rounded-[20px] border border-white/10 bg-white/[0.03] p-3">
                      <p className="text-[10px] uppercase tracking-[0.18em] text-white/32">
                        Type
                      </p>
                      <p className="mt-2 text-sm font-semibold text-white">
                        {formatTermType(row.term_type)}
                      </p>
                      <p className="mt-2 text-xs leading-5 text-slate-500">
                        Due {row.due_days} days · {formatBasisLabel(row.due_basis)}
                      </p>
                    </div>

                    <div className="rounded-[20px] border border-white/10 bg-white/[0.03] p-3">
                      <p className="text-[10px] uppercase tracking-[0.18em] text-white/32">
                        Deposit
                      </p>
                      {row.requires_deposit ? (
                        <>
                          <p className="mt-2 text-sm font-semibold text-emerald-100">
                            {row.deposit_type === "percentage"
                              ? `${row.deposit_percentage ?? 0}%`
                              : `Fixed ${row.deposit_amount ?? 0}`}
                          </p>
                          <p className="mt-2 text-xs leading-5 text-slate-500">
                            {formatBasisLabel(row.deposit_due_basis)}
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="mt-2 text-sm font-semibold text-white">No deposit</p>
                          <p className="mt-2 text-xs leading-5 text-slate-500">
                            Full balance term only
                          </p>
                        </>
                      )}
                    </div>

                    <div className="rounded-[20px] border border-white/10 bg-white/[0.03] p-3">
                      <p className="text-[10px] uppercase tracking-[0.18em] text-white/32">
                        Document Wording
                      </p>
                      <p className="mt-2 line-clamp-1 text-sm font-semibold text-white">
                        {row.document_label ?? row.name}
                      </p>
                      <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">
                        {row.document_terms_text ?? row.notes ?? "No wording configured."}
                      </p>
                    </div>

                    <div className="rounded-[20px] border border-white/10 bg-white/[0.03] p-3">
                      <p className="text-[10px] uppercase tracking-[0.18em] text-white/32">
                        Status
                      </p>
                      <Badge
                        className={`mt-2 rounded-full border px-2.5 py-1 text-[11px] shadow-none ${
                          row.status === "archived"
                            ? "border-amber-400/20 bg-amber-500/10 text-amber-200"
                            : row.status === "inactive"
                              ? "border-white/10 bg-white/[0.06] text-slate-300"
                              : "border-emerald-400/20 bg-emerald-500/10 text-emerald-200"
                        }`}
                      >
                        {row.status}
                      </Badge>
                      <p className="mt-2 text-xs leading-5 text-slate-500">
                        {row.allow_partial_payments ? "Partial allowed" : "No partial payments"}
                      </p>
                    </div>

                    <div className="flex items-center justify-end">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="outline"
                            className="h-10 rounded-xl border-white/10 bg-black/15 px-3 text-white hover:bg-white/10"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>

                        <DropdownMenuContent
                          align="end"
                          className="w-48 border-white/10 bg-[#101522] text-white"
                        >
                          {canEdit ? (
                            <DropdownMenuItem onClick={() => openEditDialog(row)}>
                              Edit
                            </DropdownMenuItem>
                          ) : null}

                          {canArchive ? (
                            row.status === "archived" ? (
                              <>
                                <DropdownMenuItem onClick={() => void handleRestore(row)}>
                                  Restore
                                </DropdownMenuItem>

                                <DropdownMenuItem
                                  onClick={() => void handleHardDelete(row)}
                                  className="text-red-400 focus:text-red-400"
                                >
                                  Hard Delete
                                </DropdownMenuItem>
                              </>
                            ) : (
                              <DropdownMenuItem onClick={() => void handleDelete(row)}>
                                Delete
                              </DropdownMenuItem>
                            )
                          ) : null}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[92vh] overflow-y-auto border-white/10 bg-[#0f1726] text-white sm:max-w-[980px]">
          <DialogHeader>
            <DialogTitle>
              {editingRow ? "Edit Payment Term" : "Create Payment Term"}
            </DialogTitle>
            <DialogDescription className="text-white/45">
              Define due-date logic, deposit requirements, balance collection, and the wording used
              on finance documents.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-5">
            <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                Term Type
              </p>
              <div className="grid gap-3 md:grid-cols-5">
                {TERM_TYPE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => updateTermType(option.value)}
                    className={`rounded-[20px] border p-3 text-left transition ${
                      form.term_type === option.value
                        ? "border-cyan-400/25 bg-cyan-500/10"
                        : "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]"
                    }`}
                  >
                    <span className="block text-sm font-semibold text-white">{option.label}</span>
                    <span className="mt-2 block text-xs leading-5 text-slate-500">
                      {option.description}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Input
                value={form.code}
                onChange={(event) => setForm((p) => ({ ...p, code: event.target.value }))}
                placeholder="Code"
                className="h-11 rounded-2xl border-white/10 bg-black/20 text-white"
              />

              <Input
                value={form.name}
                onChange={(event) => setForm((p) => ({ ...p, name: event.target.value }))}
                placeholder="Name"
                className="h-11 rounded-2xl border-white/10 bg-black/20 text-white"
              />

              <Input
                type="number"
                min="0"
                step="1"
                value={form.due_days}
                onChange={(event) => setForm((p) => ({ ...p, due_days: event.target.value }))}
                placeholder="Due days"
                className="h-11 rounded-2xl border-white/10 bg-black/20 text-white"
              />

              <SelectField
                value={form.due_basis}
                onChange={(value) => setForm((p) => ({ ...p, due_basis: value }))}
                options={DUE_BASIS_OPTIONS}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <ToggleCard
                checked={form.is_default}
                title="Default Term"
                description="Use this as the default when no term is selected."
                onChange={(checked) => setForm((p) => ({ ...p, is_default: checked }))}
              />

              <ToggleCard
                checked={form.allow_partial_payments}
                title="Allow Partial Payments"
                description="Allows documents using this term to receive partial payments."
                onChange={(checked) =>
                  setForm((p) => ({ ...p, allow_partial_payments: checked }))
                }
              />

              <ToggleCard
                checked={form.requires_approval}
                title="Requires Approval"
                description="Marks this term as requiring approval before use."
                onChange={(checked) => setForm((p) => ({ ...p, requires_approval: checked }))}
              />
            </div>

            <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Deposit Rule
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Enable this when a client must pay before production, shipment, delivery, or
                    another balance milestone.
                  </p>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setForm((p) => ({
                      ...p,
                      requires_deposit: !p.requires_deposit,
                      term_type: !p.requires_deposit ? "deposit_balance" : "net",
                    }))
                  }
                  className={`h-10 rounded-full border px-4 text-[11px] font-semibold uppercase tracking-[0.18em] ${
                    form.requires_deposit
                      ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-200"
                      : "border-white/10 bg-white/[0.04] text-slate-300"
                  }`}
                >
                  {form.requires_deposit ? "Deposit Enabled" : "No Deposit"}
                </Button>
              </div>

              {form.requires_deposit ? (
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <SelectField
                    value={form.deposit_type}
                    onChange={(value) => setForm((p) => ({ ...p, deposit_type: value }))}
                    options={DEPOSIT_TYPE_OPTIONS}
                  />

                  {form.deposit_type === "percentage" ? (
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={form.deposit_percentage}
                      onChange={(event) =>
                        setForm((p) => ({ ...p, deposit_percentage: event.target.value }))
                      }
                      placeholder="Deposit percentage"
                      className="h-11 rounded-2xl border-white/10 bg-black/20 text-white"
                    />
                  ) : (
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.deposit_amount}
                      onChange={(event) =>
                        setForm((p) => ({ ...p, deposit_amount: event.target.value }))
                      }
                      placeholder="Deposit amount"
                      className="h-11 rounded-2xl border-white/10 bg-black/20 text-white"
                    />
                  )}

                  <SelectField
                    value={form.deposit_due_basis}
                    onChange={(value) =>
                      setForm((p) => ({ ...p, deposit_due_basis: value }))
                    }
                    options={DEPOSIT_DUE_BASIS_OPTIONS}
                  />

                  <Input
                    type="number"
                    min="0"
                    step="1"
                    value={form.deposit_due_days}
                    onChange={(event) =>
                      setForm((p) => ({ ...p, deposit_due_days: event.target.value }))
                    }
                    placeholder="Deposit due days"
                    className="h-11 rounded-2xl border-white/10 bg-black/20 text-white"
                  />
                </div>
              ) : null}
            </div>

            <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                Balance Rule
              </p>

              <div className="grid gap-4 md:grid-cols-2">
                <SelectField
                  value={form.balance_due_basis}
                  onChange={(value) => setForm((p) => ({ ...p, balance_due_basis: value }))}
                  options={BALANCE_DUE_BASIS_OPTIONS}
                />

                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={form.balance_due_days}
                  onChange={(event) =>
                    setForm((p) => ({ ...p, balance_due_days: event.target.value }))
                  }
                  placeholder="Balance due days"
                  className="h-11 rounded-2xl border-white/10 bg-black/20 text-white"
                />
              </div>
            </div>

            <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                Applies To
              </p>

              <div className="flex flex-wrap gap-2">
                {APPLIES_TO_OPTIONS.map((option) => (
                  <Button
                    key={option.value}
                    type="button"
                    variant="outline"
                    onClick={() => toggleAppliesTo(option.value)}
                    className={`h-10 rounded-full border-white/10 px-4 text-[11px] font-semibold uppercase tracking-[0.16em] ${
                      form.applies_to.includes(option.value)
                        ? "bg-cyan-500/10 text-cyan-200"
                        : "bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]"
                    }`}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="grid gap-4">
              <Input
                value={form.document_label}
                onChange={(event) =>
                  setForm((p) => ({ ...p, document_label: event.target.value }))
                }
                placeholder="Document label, example: 30% Deposit / 70% Before Shipment"
                className="h-11 rounded-2xl border-white/10 bg-black/20 text-white"
              />

              <textarea
                value={form.document_terms_text}
                onChange={(event) =>
                  setForm((p) => ({ ...p, document_terms_text: event.target.value }))
                }
                placeholder="Document terms text shown on quotations, proforma invoices, and invoices..."
                className="min-h-[120px] rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-white/35 focus:border-cyan-400/40"
              />

              <Input
                value={form.notes}
                onChange={(event) => setForm((p) => ({ ...p, notes: event.target.value }))}
                placeholder="Internal notes optional"
                className="h-11 rounded-2xl border-white/10 bg-black/20 text-white"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {(["active", "inactive", "archived"] as const).map((value) => (
                <Button
                  key={value}
                  type="button"
                  variant="outline"
                  onClick={() => setForm((p) => ({ ...p, status: value }))}
                  className={`h-10 rounded-2xl border-white/10 px-4 text-white ${
                    form.status === value ? "bg-white/10" : "bg-black/20 hover:bg-white/10"
                  }`}
                >
                  {value}
                </Button>
              ))}
            </div>

            {error ? <div className="text-sm text-red-400">{error}</div> : null}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              className="h-11 rounded-2xl border-white/10 bg-black/20 text-white hover:bg-white/10"
            >
              Cancel
            </Button>

            <Button
              onClick={() => void handleSave()}
              disabled={saving || !(editingRow ? canEdit : canCreate)}
              className="h-11 rounded-xl border border-cyan-400/20 bg-cyan-500 px-4 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
            >
              {saving ? "Saving..." : editingRow ? "Save Changes" : "Create Payment Term"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
