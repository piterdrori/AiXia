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
  term_type: FinancePaymentTermType;
  net_days: string;
  deposit_percentage: string;
  deposit_due_basis: FinancePaymentTermDepositDueBasis;
  balance_due_basis: FinancePaymentTermBalanceDueBasis;
  custom_label: string;
  custom_terms_text: string;
  allow_partial_payments: boolean;
  is_default: boolean;
  status: FinancePaymentTermStatus;
  notes: string;
};

type GeneratedTerm = {
  code: string;
  name: string;
  dueDays: number;
  requiresDeposit: boolean;
  depositPercentage: number | null;
  depositDueBasis: FinancePaymentTermDepositDueBasis | null;
  balanceDueBasis: FinancePaymentTermBalanceDueBasis | null;
  balanceDueDays: number | null;
  documentLabel: string;
  documentTermsText: string;
};

const EMPTY_FORM: FormState = {
  term_type: "net",
  net_days: "30",
  deposit_percentage: "30",
  deposit_due_basis: "before_production",
  balance_due_basis: "before_shipment",
  custom_label: "",
  custom_terms_text: "",
  allow_partial_payments: true,
  is_default: false,
  status: "active",
  notes: "",
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
    description: "Deposit first, remaining balance later.",
  },
  {
    value: "custom",
    label: "Custom",
    description: "Write your own payment term wording.",
  },
];

const DEPOSIT_DUE_BASIS_OPTIONS: Array<{
  value: FinancePaymentTermDepositDueBasis;
  label: string;
}> = [
  { value: "immediate", label: "Immediately" },
  { value: "before_production", label: "Before Production" },
  { value: "before_shipment", label: "Before Shipment" },
  { value: "before_delivery", label: "Before Delivery" },
];

const BALANCE_DUE_BASIS_OPTIONS: Array<{
  value: FinancePaymentTermBalanceDueBasis;
  label: string;
}> = [
  { value: "before_shipment", label: "Before Shipment" },
  { value: "delivery_date", label: "On Delivery" },
  { value: "shipment_date", label: "On Shipment" },
  { value: "invoice_date", label: "On Invoice Date" },
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

function formatBasisLabel(value: string | null) {
  if (!value) return "—";

  if (value === "delivery_date") return "On Delivery";
  if (value === "shipment_date") return "On Shipment";
  if (value === "invoice_date") return "On Invoice Date";

  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function normalizeGeneratedCode(value: string) {
  return value
    .trim()
    .toUpperCase()
    .replace(/%/g, "")
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function parseWholeNumber(value: string) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) return null;
  return parsed;
}

function parsePercentage(value: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0 || parsed >= 100) return null;
  return parsed;
}

function buildGeneratedTerm(form: FormState): GeneratedTerm {
  if (form.term_type === "immediate") {
    return {
      code: "DUE_IMMEDIATELY",
      name: "Due Immediately",
      dueDays: 0,
      requiresDeposit: false,
      depositPercentage: null,
      depositDueBasis: null,
      balanceDueBasis: "invoice_date",
      balanceDueDays: 0,
      documentLabel: "Due Immediately",
      documentTermsText: "Payment is due immediately.",
    };
  }

  if (form.term_type === "net") {
    const days = parseWholeNumber(form.net_days) ?? 0;

    return {
      code: `NET_${days}`,
      name: `Net ${days}`,
      dueDays: days,
      requiresDeposit: false,
      depositPercentage: null,
      depositDueBasis: null,
      balanceDueBasis: "invoice_date",
      balanceDueDays: days,
      documentLabel: `Net ${days}`,
      documentTermsText:
        days === 0
          ? "Payment is due immediately."
          : `Payment is due within ${days} days from invoice date.`,
    };
  }

  if (form.term_type === "deposit_balance") {
    const depositPercentage = parsePercentage(form.deposit_percentage) ?? 0;
    const balancePercentage = Math.max(0, 100 - depositPercentage);
    const depositTiming = formatBasisLabel(form.deposit_due_basis).toLowerCase();
    const balanceTiming = formatBasisLabel(form.balance_due_basis).toLowerCase();
    const label = `${depositPercentage}% Deposit / ${balancePercentage}% ${formatBasisLabel(
      form.balance_due_basis
    )}`;

    return {
      code: normalizeGeneratedCode(label),
      name: label,
      dueDays: 0,
      requiresDeposit: true,
      depositPercentage,
      depositDueBasis: form.deposit_due_basis,
      balanceDueBasis: form.balance_due_basis,
      balanceDueDays: 0,
      documentLabel: label,
      documentTermsText: `${depositPercentage}% deposit is required ${depositTiming}. The remaining ${balancePercentage}% balance is due ${balanceTiming}.`,
    };
  }

  const customLabel = form.custom_label.trim() || "Custom Payment Terms";
  const customTermsText =
    form.custom_terms_text.trim() || "Payment terms are defined by the commercial agreement.";

  return {
    code: normalizeGeneratedCode(customLabel),
    name: customLabel,
    dueDays: 0,
    requiresDeposit: false,
    depositPercentage: null,
    depositDueBasis: null,
    balanceDueBasis: "invoice_date",
    balanceDueDays: 0,
    documentLabel: customLabel,
    documentTermsText: customTermsText,
  };
}

function SelectField<TValue extends string>({
  value,
  onChange,
  options,
}: {
  value: TValue;
  onChange: (value: TValue) => void;
  options: Array<{ value: TValue; label: string }>;
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value as TValue)}
      className="h-11 w-full rounded-2xl border border-white/10 bg-black/20 px-3 text-sm text-white outline-none transition focus:border-cyan-400/40"
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

  const generatedTerm = useMemo(() => buildGeneratedTerm(form), [form]);

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

    if (row.term_type === "immediate") {
      setForm({
        ...EMPTY_FORM,
        term_type: "immediate",
        net_days: "0",
        is_default: row.is_default,
        status: row.status,
        notes: row.notes ?? "",
        allow_partial_payments: row.allow_partial_payments,
      });
    } else if (row.term_type === "net") {
      setForm({
        ...EMPTY_FORM,
        term_type: "net",
        net_days: String(row.due_days),
        is_default: row.is_default,
        status: row.status,
        notes: row.notes ?? "",
        allow_partial_payments: row.allow_partial_payments,
      });
    } else if (row.term_type === "deposit_balance") {
      setForm({
        ...EMPTY_FORM,
        term_type: "deposit_balance",
        deposit_percentage:
          row.deposit_percentage === null ? "30" : String(row.deposit_percentage),
        deposit_due_basis: row.deposit_due_basis ?? "before_production",
        balance_due_basis: row.balance_due_basis ?? "before_shipment",
        is_default: row.is_default,
        status: row.status,
        notes: row.notes ?? "",
        allow_partial_payments: row.allow_partial_payments,
      });
    } else {
      setForm({
        ...EMPTY_FORM,
        term_type: "custom",
        custom_label: row.document_label ?? row.name,
        custom_terms_text: row.document_terms_text ?? "",
        is_default: row.is_default,
        status: row.status,
        notes: row.notes ?? "",
        allow_partial_payments: row.allow_partial_payments,
      });
    }

    setError("");
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!(editingRow ? canEdit : canCreate)) return;

    const netDays = parseWholeNumber(form.net_days);
    const depositPercentage = parsePercentage(form.deposit_percentage);

    if (form.term_type === "net" && netDays === null) {
      setError("Net days must be a whole number 0 or greater.");
      return;
    }

    if (form.term_type === "deposit_balance" && depositPercentage === null) {
      setError("Deposit percentage must be greater than 0 and less than 100.");
      return;
    }

    if (form.term_type === "custom" && !form.custom_label.trim()) {
      setError("Custom payment terms need a label.");
      return;
    }

    if (form.term_type === "custom" && !form.custom_terms_text.trim()) {
      setError("Custom payment terms need document wording.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const payload = {
        code: generatedTerm.code,
        name: generatedTerm.name,
        due_days: generatedTerm.dueDays,
        status: form.status,
        is_default: form.is_default,
        notes: form.notes,
        term_type: form.term_type,
        due_basis: "invoice_date" as const,
        requires_deposit: generatedTerm.requiresDeposit,
        deposit_type: generatedTerm.requiresDeposit ? ("percentage" as const) : null,
        deposit_percentage: generatedTerm.depositPercentage,
        deposit_amount: null,
        deposit_due_basis: generatedTerm.depositDueBasis,
        deposit_due_days: null,
        balance_due_basis: generatedTerm.balanceDueBasis,
        balance_due_days: generatedTerm.balanceDueDays,
        allow_partial_payments: form.allow_partial_payments,
        requires_approval: false,
        applies_to: ["quotation", "proforma_invoice", "invoice"] as FinancePaymentTermAppliesTo[],
        document_label: generatedTerm.documentLabel,
        document_terms_text: generatedTerm.documentTermsText,
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
                  Create reusable payment terms for finance documents. Invoice due dates and payment
                  actions are handled inside the invoice flow; this page only defines the selectable
                  commercial term and document wording.
                </p>

                <div className="mt-5 flex flex-wrap gap-2">
                  <Badge className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-200 shadow-none">
                    {activeRows.length} Active
                  </Badge>
                  <Badge className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-200 shadow-none">
                    {depositRows.length} Deposit Terms
                  </Badge>
                  <Badge className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-300 shadow-none">
                    Auto-Generated Codes
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
                    Default selectable payment term for finance documents.
                  </p>
                </div>

                <div className="min-h-[148px] rounded-[24px] border border-white/10 bg-black/20 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Deposit Terms
                  </p>
                  <p className="mt-2 text-xl font-semibold leading-tight tracking-[-0.035em] text-white">
                    {depositRows.length}
                  </p>
                  <p className="mt-3 text-xs leading-5 text-slate-500">
                    Terms with upfront deposit wording.
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
                    Reusable terms available to documents.
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
                Choose a structure, generate the term, and reuse it on quotations, proforma invoices,
                and invoices.
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
                        {row.term_type === "net"
                          ? `Net ${row.due_days}`
                          : row.term_type === "immediate"
                            ? "Immediate payment"
                            : "Reusable term"}
                      </p>
                    </div>

                    <div className="rounded-[20px] border border-white/10 bg-white/[0.03] p-3">
                      <p className="text-[10px] uppercase tracking-[0.18em] text-white/32">
                        Deposit
                      </p>
                      {row.requires_deposit ? (
                        <>
                          <p className="mt-2 text-sm font-semibold text-emerald-100">
                            {row.deposit_percentage ?? 0}% Deposit
                          </p>
                          <p className="mt-2 text-xs leading-5 text-slate-500">
                            {formatBasisLabel(row.deposit_due_basis)}
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="mt-2 text-sm font-semibold text-white">No deposit</p>
                          <p className="mt-2 text-xs leading-5 text-slate-500">
                            Standard payment term
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
                        {row.allow_partial_payments ? "Partial allowed" : "Full only"}
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
        <DialogContent className="max-h-[92vh] overflow-y-auto border-white/10 bg-[#0f1726] text-white sm:max-w-[920px]">
          <DialogHeader>
            <DialogTitle>
              {editingRow ? "Edit Payment Term" : "Create Payment Term"}
            </DialogTitle>
            <DialogDescription className="text-white/45">
              Create a reusable master-data payment term. The code, name, and document wording are
              generated from your selected structure.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-5">
            <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                Payment Structure
              </p>

              <div className="grid gap-3 md:grid-cols-4">
                {TERM_TYPE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() =>
                      setForm((previous) => ({
                        ...previous,
                        term_type: option.value,
                      }))
                    }
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

            {form.term_type === "net" ? (
              <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Net Term
                </p>

                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={form.net_days}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      net_days: event.target.value,
                    }))
                  }
                  placeholder="Net days, example: 30"
                  className="h-11 rounded-2xl border-white/10 bg-black/20 text-white"
                />
              </div>
            ) : null}

            {form.term_type === "deposit_balance" ? (
              <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Deposit + Balance Term
                </p>

                <div className="grid gap-4 md:grid-cols-3">
                  <Input
                    type="number"
                    min="1"
                    max="99"
                    step="0.01"
                    value={form.deposit_percentage}
                    onChange={(event) =>
                      setForm((previous) => ({
                        ...previous,
                        deposit_percentage: event.target.value,
                      }))
                    }
                    placeholder="Deposit percentage"
                    className="h-11 rounded-2xl border-white/10 bg-black/20 text-white"
                  />

                  <SelectField
                    value={form.deposit_due_basis}
                    onChange={(value) =>
                      setForm((previous) => ({ ...previous, deposit_due_basis: value }))
                    }
                    options={DEPOSIT_DUE_BASIS_OPTIONS}
                  />

                  <SelectField
                    value={form.balance_due_basis}
                    onChange={(value) =>
                      setForm((previous) => ({ ...previous, balance_due_basis: value }))
                    }
                    options={BALANCE_DUE_BASIS_OPTIONS}
                  />
                </div>

                <div className="mt-4 rounded-[20px] border border-emerald-400/15 bg-emerald-500/10 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-200">
                    Balance Auto-Calculated
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    Deposit is {parsePercentage(form.deposit_percentage) ?? 0}%. Balance is{" "}
                    {Math.max(0, 100 - (parsePercentage(form.deposit_percentage) ?? 0))}%.
                  </p>
                </div>
              </div>
            ) : null}

            {form.term_type === "custom" ? (
              <div className="grid gap-4 rounded-[24px] border border-white/10 bg-black/20 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Custom Term
                </p>

                <Input
                  value={form.custom_label}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      custom_label: event.target.value,
                    }))
                  }
                  placeholder="Custom label, example: 30/40/30 Milestone Payments"
                  className="h-11 rounded-2xl border-white/10 bg-black/20 text-white"
                />

                <textarea
                  value={form.custom_terms_text}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      custom_terms_text: event.target.value,
                    }))
                  }
                  placeholder="Document wording, example: 30% deposit, 40% before shipment, 30% after installation."
                  className="min-h-[120px] rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-white/35 focus:border-cyan-400/40"
                />
              </div>
            ) : null}

            <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                Auto Preview
              </p>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-[20px] border border-white/10 bg-white/[0.03] p-3">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-white/32">
                    Generated Code
                  </p>
                  <p className="mt-2 break-words text-sm font-semibold text-cyan-100">
                    {generatedTerm.code}
                  </p>
                </div>

                <div className="rounded-[20px] border border-white/10 bg-white/[0.03] p-3">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-white/32">
                    Generated Name
                  </p>
                  <p className="mt-2 break-words text-sm font-semibold text-white">
                    {generatedTerm.name}
                  </p>
                </div>

                <div className="rounded-[20px] border border-white/10 bg-white/[0.03] p-3 md:col-span-2">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-white/32">
                    Document Wording
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    {generatedTerm.documentTermsText}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <ToggleCard
                checked={form.is_default}
                title="Default Term"
                description="Use this as the default option when no term is selected."
                onChange={(checked) =>
                  setForm((previous) => ({ ...previous, is_default: checked }))
                }
              />

              <ToggleCard
                checked={form.allow_partial_payments}
                title="Allow Partial Payments"
                description="Lets documents using this term receive partial payments."
                onChange={(checked) =>
                  setForm((previous) => ({ ...previous, allow_partial_payments: checked }))
                }
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Input
                value={form.notes}
                onChange={(event) =>
                  setForm((previous) => ({ ...previous, notes: event.target.value }))
                }
                placeholder="Internal notes optional"
                className="h-11 rounded-2xl border-white/10 bg-black/20 text-white"
              />

              <SelectField
                value={form.status}
                onChange={(value) =>
                  setForm((previous) => ({ ...previous, status: value }))
                }
                options={[
                  { value: "active", label: "Active" },
                  { value: "inactive", label: "Inactive" },
                  { value: "archived", label: "Archived" },
                ]}
              />
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
