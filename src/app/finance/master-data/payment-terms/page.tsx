import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Archive,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  CreditCard,
  Edit3,
  FileText,
  Percent,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  Undo2,
  WalletCards,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

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

type SortKey =
  | "code"
  | "name"
  | "term_type"
  | "due_days"
  | "status"
  | "updated_at";

type SortDirection = "asc" | "desc";

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
  tone: "cyan" | "emerald" | "amber" | "violet";
}> = [
  {
    value: "immediate",
    label: "Immediate",
    description: "Payment is due immediately.",
    tone: "emerald",
  },
  {
    value: "net",
    label: "Net Terms",
    description: "Full payment is due after fixed days.",
    tone: "cyan",
  },
  {
    value: "deposit_balance",
    label: "Deposit + Balance",
    description: "Deposit first, balance later.",
    tone: "amber",
  },
  {
    value: "custom",
    label: "Custom",
    description: "Custom commercial wording.",
    tone: "violet",
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

function formatDateLabel(value: string | null | undefined) {
  if (!value) return "—";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";

  return parsed.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatStatusLabel(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
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
    form.custom_terms_text.trim() ||
    "Payment terms are defined by the commercial agreement.";

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

function inputClass() {
  return "h-11 rounded-2xl border-white/10 bg-black/20 text-white placeholder:text-white/30 focus:border-cyan-400/30 focus:ring-cyan-400/10";
}

function selectClass() {
  return "h-11 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none transition focus:border-cyan-400/30 focus:bg-black/30";
}

function textareaClass() {
  return "min-h-[120px] w-full resize-none rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-cyan-400/30 focus:bg-black/30";
}

function labelClass() {
  return "text-sm font-medium text-slate-300";
}

function statusBadgeClass(status: FinancePaymentTermStatus) {
  if (status === "archived") {
    return "rounded-full border border-rose-400/20 bg-rose-500/10 px-2.5 py-1 text-[11px] uppercase tracking-[0.16em] text-rose-200 shadow-none";
  }

  if (status === "inactive") {
    return "rounded-full border border-amber-400/20 bg-amber-500/10 px-2.5 py-1 text-[11px] uppercase tracking-[0.16em] text-amber-200 shadow-none";
  }

  return "rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2.5 py-1 text-[11px] uppercase tracking-[0.16em] text-emerald-200 shadow-none";
}

function termTypeBadgeClass(type: FinancePaymentTermType) {
  if (type === "immediate") {
    return "rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2.5 py-1 text-[11px] uppercase tracking-[0.16em] text-emerald-200 shadow-none";
  }

  if (type === "deposit_balance") {
    return "rounded-full border border-amber-400/20 bg-amber-500/10 px-2.5 py-1 text-[11px] uppercase tracking-[0.16em] text-amber-200 shadow-none";
  }

  if (type === "custom") {
    return "rounded-full border border-violet-400/20 bg-violet-500/10 px-2.5 py-1 text-[11px] uppercase tracking-[0.16em] text-violet-200 shadow-none";
  }

  return "rounded-full border border-cyan-400/20 bg-cyan-500/10 px-2.5 py-1 text-[11px] uppercase tracking-[0.16em] text-cyan-200 shadow-none";
}

function optionToneClass(tone: "cyan" | "emerald" | "amber" | "violet", active: boolean) {
  const activeMap = {
    cyan: "border-cyan-400/30 bg-cyan-500/15 text-cyan-100",
    emerald: "border-emerald-400/30 bg-emerald-500/15 text-emerald-100",
    amber: "border-amber-400/30 bg-amber-500/15 text-amber-100",
    violet: "border-violet-400/30 bg-violet-500/15 text-violet-100",
  };

  return active
    ? activeMap[tone]
    : "border-white/10 bg-black/20 text-slate-400 hover:bg-white/[0.06] hover:text-white";
}

function SummaryTile({
  label,
  value,
  icon: Icon,
  tone = "cyan",
  description,
}: {
  label: string;
  value: string | number;
  icon: typeof WalletCards;
  tone?: "cyan" | "emerald" | "amber" | "violet" | "rose";
  description: string;
}) {
  const toneMap = {
    cyan: {
      shell:
        "border-cyan-400/15 bg-[radial-gradient(circle_at_top_left,rgba(6,182,212,0.20),transparent_44%),linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.032))]",
      icon: "border-cyan-400/20 bg-cyan-500/10 text-cyan-200",
      label: "text-cyan-100/75",
      dot: "bg-cyan-300",
    },
    emerald: {
      shell:
        "border-emerald-400/15 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.20),transparent_44%),linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.032))]",
      icon: "border-emerald-400/20 bg-emerald-500/10 text-emerald-200",
      label: "text-emerald-100/75",
      dot: "bg-emerald-300",
    },
    amber: {
      shell:
        "border-amber-400/15 bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.20),transparent_44%),linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.032))]",
      icon: "border-amber-400/20 bg-amber-500/10 text-amber-200",
      label: "text-amber-100/75",
      dot: "bg-amber-300",
    },
    violet: {
      shell:
        "border-violet-400/15 bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.20),transparent_44%),linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.032))]",
      icon: "border-violet-400/20 bg-violet-500/10 text-violet-200",
      label: "text-violet-100/75",
      dot: "bg-violet-300",
    },
    rose: {
      shell:
        "border-rose-400/15 bg-[radial-gradient(circle_at_top_left,rgba(244,63,94,0.20),transparent_44%),linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.032))]",
      icon: "border-rose-400/20 bg-rose-500/10 text-rose-200",
      label: "text-rose-100/75",
      dot: "bg-rose-300",
    },
  }[tone];

  return (
    <Card
      className={`min-h-[156px] overflow-hidden rounded-[28px] border backdrop-blur-xl ${toneMap.shell}`}
    >
      <CardContent className="relative flex h-full flex-col justify-between overflow-hidden p-5">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.06),transparent_30%)]" />

        <div className="relative flex items-start justify-between gap-4">
          <div>
            <div className={`text-xs uppercase tracking-[0.18em] ${toneMap.label}`}>
              {label}
            </div>
            <div className="mt-4 text-4xl font-semibold tracking-tight text-white">
              {value}
            </div>
          </div>

          <div
            className={`flex h-12 w-12 items-center justify-center rounded-2xl border ${toneMap.icon}`}
          >
            <Icon className="h-5 w-5" />
          </div>
        </div>

        <div className="relative mt-6 flex items-center justify-between gap-4">
          <div className="text-sm leading-5 text-slate-400">{description}</div>
          <div className={`h-2.5 w-2.5 flex-none rounded-full ${toneMap.dot}`} />
        </div>
      </CardContent>
    </Card>
  );
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
      className={selectClass()}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
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
  tone,
  onChange,
}: {
  checked: boolean;
  title: string;
  description: string;
  tone: "cyan" | "emerald";
  onChange: (checked: boolean) => void;
}) {
  const activeClass =
    tone === "emerald"
      ? "border-emerald-400/25 bg-emerald-500/10"
      : "border-cyan-400/25 bg-cyan-500/10";

  const dotClass =
    tone === "emerald"
      ? checked
        ? "border-emerald-300 bg-emerald-400"
        : "border-white/20 bg-white/5"
      : checked
        ? "border-cyan-300 bg-cyan-400"
        : "border-white/20 bg-white/5";

  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`rounded-[24px] border p-4 text-left transition ${
        checked
          ? activeClass
          : "border-white/10 bg-black/20 hover:border-white/20 hover:bg-white/[0.04]"
      }`}
    >
      <div className="flex items-start gap-3">
        <span className={`mt-1 h-4 w-4 rounded-full border ${dotClass}`} />
        <span>
          <span className="block text-sm font-semibold text-white">{title}</span>
          <span className="mt-1 block text-xs leading-5 text-slate-500">
            {description}
          </span>
        </span>
      </div>
    </button>
  );
}

function PaymentTermFormModal({
  open,
  editingRow,
  form,
  generatedTerm,
  saving,
  error,
  canSave,
  onClose,
  onChange,
  onSave,
}: {
  open: boolean;
  editingRow: FinancePaymentTermRow | null;
  form: FormState;
  generatedTerm: GeneratedTerm;
  saving: boolean;
  error: string;
  canSave: boolean;
  onClose: () => void;
  onChange: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
  onSave: () => void;
}) {
  if (!open) return null;

  const depositPercentage = parsePercentage(form.deposit_percentage) ?? 0;
  const balancePercentage = Math.max(0, 100 - depositPercentage);

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-[34px] border border-white/10 bg-[#0b111f] shadow-2xl shadow-black/40">
        <div className="relative overflow-hidden border-b border-white/10 bg-white/[0.035] px-6 py-5">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(6,182,212,0.18),transparent_34%),radial-gradient(circle_at_top_right,rgba(139,92,246,0.14),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(245,158,11,0.10),transparent_36%)]" />

          <div className="relative flex items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-cyan-200 shadow-none">
                  Payment Term
                </Badge>
                <Badge className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-emerald-200 shadow-none">
                  {editingRow ? "Edit Mode" : "Create Mode"}
                </Badge>
              </div>

              <div className="mt-3 text-2xl font-semibold text-white">
                {editingRow ? "Edit Payment Term" : "Create Payment Term"}
              </div>
              <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-400">
                Create reusable commercial payment terms for quotations, proforma
                invoices, invoices, vendor quotations, purchase orders, and vendor records.
              </p>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="h-10 rounded-xl border-white/10 bg-black/20 px-3 text-white hover:bg-white/10"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="overflow-y-auto p-6">
          <div className="grid gap-5">
            <section className="rounded-[30px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
              <div className="border-b border-white/10 px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-500/10 text-cyan-200">
                    <WalletCards className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Payment Structure
                    </div>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      Choose the commercial structure and generate the controlled term.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 p-5">
                <div className="grid gap-3 md:grid-cols-4">
                  {TERM_TYPE_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => onChange("term_type", option.value)}
                      className={`rounded-[24px] border p-4 text-left transition ${optionToneClass(
                        option.tone,
                        form.term_type === option.value
                      )}`}
                    >
                      <div className="font-semibold">{option.label}</div>
                      <div className="mt-1 text-xs leading-5 opacity-70">
                        {option.description}
                      </div>
                    </button>
                  ))}
                </div>

                {form.term_type === "net" ? (
                  <label className="grid gap-2">
                    <span className={labelClass()}>Net Days</span>
                    <Input
                      type="number"
                      min="0"
                      step="1"
                      value={form.net_days}
                      onChange={(event) => onChange("net_days", event.target.value)}
                      placeholder="Example: 30"
                      className={inputClass()}
                    />
                  </label>
                ) : null}

                {form.term_type === "deposit_balance" ? (
                  <div className="grid gap-4">
                    <div className="grid gap-4 md:grid-cols-3">
                      <label className="grid gap-2">
                        <span className={labelClass()}>Deposit Percentage</span>
                        <Input
                          type="number"
                          min="1"
                          max="99"
                          step="0.01"
                          value={form.deposit_percentage}
                          onChange={(event) =>
                            onChange("deposit_percentage", event.target.value)
                          }
                          placeholder="Example: 30"
                          className={inputClass()}
                        />
                      </label>

                      <label className="grid gap-2">
                        <span className={labelClass()}>Deposit Due</span>
                        <SelectField
                          value={form.deposit_due_basis}
                          onChange={(value) => onChange("deposit_due_basis", value)}
                          options={DEPOSIT_DUE_BASIS_OPTIONS}
                        />
                      </label>

                      <label className="grid gap-2">
                        <span className={labelClass()}>Balance Due</span>
                        <SelectField
                          value={form.balance_due_basis}
                          onChange={(value) => onChange("balance_due_basis", value)}
                          options={BALANCE_DUE_BASIS_OPTIONS}
                        />
                      </label>
                    </div>

                    <div className="rounded-[24px] border border-emerald-400/15 bg-emerald-500/10 p-4">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-200/70">
                        Balance Auto-Calculated
                      </div>
                      <p className="mt-2 text-sm leading-6 text-emerald-100/75">
                        Deposit is {depositPercentage}%. Balance is {balancePercentage}%.
                      </p>
                    </div>
                  </div>
                ) : null}

                {form.term_type === "custom" ? (
                  <div className="grid gap-4">
                    <label className="grid gap-2">
                      <span className={labelClass()}>Custom Label</span>
                      <Input
                        value={form.custom_label}
                        onChange={(event) => onChange("custom_label", event.target.value)}
                        placeholder="Example: 30/40/30 Milestone Payments"
                        className={inputClass()}
                      />
                    </label>

                    <label className="grid gap-2">
                      <span className={labelClass()}>Custom Document Wording</span>
                      <textarea
                        value={form.custom_terms_text}
                        onChange={(event) =>
                          onChange("custom_terms_text", event.target.value)
                        }
                        placeholder="Example: 30% deposit, 40% before shipment, 30% after installation."
                        className={textareaClass()}
                      />
                    </label>
                  </div>
                ) : null}
              </div>
            </section>

                        <section className="rounded-[30px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
              <div className="border-b border-white/10 px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-violet-400/20 bg-violet-500/10 text-violet-200">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Auto Preview
                    </div>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      Code, name, and document wording generated from the selected structure.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 p-5 md:grid-cols-2">
                <div className="rounded-[24px] border border-cyan-400/15 bg-cyan-500/10 p-4">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-200/70">
                    Generated Code
                  </div>
                  <div className="mt-2 break-words text-sm font-semibold text-cyan-100">
                    {generatedTerm.code}
                  </div>
                </div>

                <div className="rounded-[24px] border border-emerald-400/15 bg-emerald-500/10 p-4">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-200/70">
                    Generated Name
                  </div>
                  <div className="mt-2 break-words text-sm font-semibold text-white">
                    {generatedTerm.name}
                  </div>
                </div>

                <div className="rounded-[24px] border border-violet-400/15 bg-violet-500/10 p-4 md:col-span-2">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-200/70">
                    Document Wording
                  </div>
                  <p className="mt-2 text-sm leading-6 text-violet-100/75">
                    {generatedTerm.documentTermsText}
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-[30px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
              <div className="border-b border-white/10 px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-500/10 text-emerald-200">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Term Controls
                    </div>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      Default behavior, partial payments, status, and internal notes.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 p-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <ToggleCard
                    checked={form.is_default}
                    title="Default Term"
                    description="Use this as the default option when no term is selected."
                    tone="emerald"
                    onChange={(checked) => onChange("is_default", checked)}
                  />

                  <ToggleCard
                    checked={form.allow_partial_payments}
                    title="Allow Partial Payments"
                    description="Lets documents using this term receive partial payments."
                    tone="cyan"
                    onChange={(checked) => onChange("allow_partial_payments", checked)}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="grid gap-2">
                    <span className={labelClass()}>Internal Notes</span>
                    <Input
                      value={form.notes}
                      onChange={(event) => onChange("notes", event.target.value)}
                      placeholder="Optional internal notes"
                      className={inputClass()}
                    />
                  </label>

                  <label className="grid gap-2">
                    <span className={labelClass()}>Status</span>
                    <SelectField
                      value={form.status}
                      onChange={(value) => onChange("status", value)}
                      options={[
                        { value: "active", label: "Active" },
                        { value: "inactive", label: "Inactive" },
                        { value: "archived", label: "Archived" },
                      ]}
                    />
                  </label>
                </div>
              </div>
            </section>

            {error ? (
              <div className="rounded-[24px] border border-rose-400/20 bg-rose-500/10 px-5 py-4 text-sm text-rose-100">
                {error}
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-white/10 bg-white/[0.025] px-6 py-5 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="h-11 rounded-2xl border-white/10 bg-black/20 px-4 text-white hover:bg-white/10"
          >
            Cancel
          </Button>

          <Button
            type="button"
            onClick={onSave}
            disabled={saving || !canSave}
            className="h-11 rounded-2xl border border-cyan-400/20 bg-cyan-500/10 px-5 text-cyan-100 hover:bg-cyan-500/15 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Saving..." : editingRow ? "Save Changes" : "Create Payment Term"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function FinancePaymentTermsPage() {
  const navigate = useNavigate();

  const [rows, setRows] = useState<FinancePaymentTermRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("updated_at");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const [role, setRole] = useState<Role | null>(null);
  const [permissionOverrides, setPermissionOverrides] =
    useState<Partial<Record<Permission, boolean>> | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<FinancePaymentTermRow | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [error, setError] = useState("");
  const [pageMessage, setPageMessage] = useState("");

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
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load payment terms."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPage();
  }, [loadPage]);

  useEffect(() => {
    const channel = supabase
      .channel("finance-payment-terms-master-data")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "finance_payment_terms",
        },
        () => {
          void loadPage();
        }
      )
      .subscribe();

    const intervalId = window.setInterval(() => {
      void loadPage();
    }, 60000);

    return () => {
      window.clearInterval(intervalId);
      void supabase.removeChannel(channel);
    };
  }, [loadPage]);

  const permissions = useMemo(() => {
    if (!role) return null;
    return getEffectivePermissions(role, permissionOverrides);
  }, [permissionOverrides, role]);

  const canCreate = !!permissions?.createFinanceRecords;
  const canEdit = !!permissions?.editFinanceRecords;
  const canArchive = !!permissions?.archiveFinanceRecords;
  const canDelete = canArchive;

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

  const stats = useMemo(() => {
    return {
      total: rows.length,
      active: rows.filter((row) => row.status === "active").length,
      deposit: rows.filter((row) => row.requires_deposit).length,
      defaultTerm: defaultRow?.document_label ?? defaultRow?.name ?? "Not Set",
      partial: rows.filter((row) => row.allow_partial_payments).length,
      archived: rows.filter((row) => row.status === "archived").length,
    };
  }, [defaultRow, rows]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();

    return rows.filter((row) => {
      const matchesStatus =
        statusFilter === "all" ? true : row.status === statusFilter;

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

  const sortedRows = useMemo(() => {
    const sorted = [...filteredRows];

    sorted.sort((a, b) => {
      const direction = sortDirection === "asc" ? 1 : -1;

      if (sortKey === "updated_at") {
        return (
          (new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime()) *
          direction
        );
      }

      if (sortKey === "due_days") {
        return (a.due_days - b.due_days) * direction;
      }

      const first = String(a[sortKey] ?? "");
      const second = String(b[sortKey] ?? "");

      return first.localeCompare(second) * direction;
    });

    return sorted;
  }, [filteredRows, sortDirection, sortKey]);

  function updateSort(nextKey: SortKey) {
    if (sortKey === nextKey) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(nextKey);
    setSortDirection(nextKey === "updated_at" ? "desc" : "asc");
  }

  function sortLabel(key: SortKey) {
    if (sortKey !== key) return "";
    return sortDirection === "asc" ? " ↑" : " ↓";
  }

  function updateForm<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function openCreateDialog() {
    setEditingRow(null);
    setForm(EMPTY_FORM);
    setError("");
    setPageMessage("");
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
    setPageMessage("");
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
      setPageMessage("");

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
        applies_to: [
          "quotation",
          "proforma_invoice",
          "invoice",
        ] as FinancePaymentTermAppliesTo[],
        document_label: generatedTerm.documentLabel,
        document_terms_text: generatedTerm.documentTermsText,
      };

      if (editingRow) {
        await updatePaymentTerm(editingRow.id, payload);
        setPageMessage("Payment term updated successfully.");
      } else {
        await createPaymentTerm(payload);
        setPageMessage("Payment term created successfully.");
      }

      setDialogOpen(false);
      setForm(EMPTY_FORM);
      setEditingRow(null);
      await loadPage();
    } catch (saveError) {
      console.error("Failed to save payment term:", saveError);
      setError(
        saveError instanceof Error ? saveError.message : "Failed to save payment term."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleArchive(row: FinancePaymentTermRow) {
    if (!canArchive) return;

    const confirmed = window.confirm(
      "Archive this payment term? It will be hidden from active selections but can be restored later."
    );

    if (!confirmed) return;

    try {
      setSaving(true);
      setError("");
      setPageMessage("");
      await archivePaymentTerm(row.id);
      setPageMessage("Payment term archived successfully.");
      await loadPage();
    } catch (actionError) {
      console.error("Failed to archive payment term:", actionError);
      setError(
        actionError instanceof Error
          ? actionError.message
          : "Failed to archive payment term."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleRestore(row: FinancePaymentTermRow) {
    if (!canArchive) return;

    try {
      setSaving(true);
      setError("");
      setPageMessage("");
      await restorePaymentTerm(row.id);
      setPageMessage("Payment term restored successfully.");
      await loadPage();
    } catch (actionError) {
      console.error("Failed to restore payment term:", actionError);
      setError(
        actionError instanceof Error
          ? actionError.message
          : "Failed to restore payment term."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleHardDelete(row: FinancePaymentTermRow) {
    if (!canDelete) return;

    const confirmed = window.confirm(
      "Permanently delete this payment term? Existing linked documents will lose the payment-term link because the database is configured with SET NULL."
    );

    if (!confirmed) return;

    try {
      setSaving(true);
      setError("");
      setPageMessage("");
      await permanentlyDeletePaymentTerm(row.id);
      setPageMessage("Payment term permanently deleted.");
      await loadPage();
    } catch (actionError) {
      console.error("Failed to permanently delete payment term:", actionError);
      setError(
        actionError instanceof Error
          ? actionError.message
          : "Failed to permanently delete payment term."
      );
    } finally {
      setSaving(false);
    }
  }

  const tableHeaders: Array<
    | { key: SortKey; label: string; sortable: true }
    | { key: "actions"; label: string; sortable: false }
  > = [
    { key: "code", label: "Code", sortable: true },
    { key: "name", label: "Name", sortable: true },
    { key: "term_type", label: "Type", sortable: true },
    { key: "due_days", label: "Due Days", sortable: true },
    { key: "status", label: "Status", sortable: true },
    { key: "updated_at", label: "Updated", sortable: true },
    { key: "actions", label: "Actions", sortable: false },
  ];

  return (
    <div className="min-h-screen bg-[#05070d] px-4 py-4 text-white md:px-6 md:py-6">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
        <section className="relative overflow-hidden rounded-[34px] border border-white/10 bg-white/[0.045] p-6 shadow-2xl shadow-black/30 backdrop-blur-xl">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(6,182,212,0.16),transparent_38%),radial-gradient(circle_at_top_right,rgba(139,92,246,0.12),transparent_34%)]" />

          <div className="relative">
            <button
              type="button"
              onClick={() => navigate("/finance/master-data")}
              className="mb-5 inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-300 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Master Data
            </button>

            <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="rounded-full border border-white/10 bg-white/[0.07] px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-slate-300 shadow-none">
                    Master Data
                  </Badge>
                  <Badge className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-cyan-200 shadow-none">
                    Payment Terms
                  </Badge>
                  <Badge className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-emerald-200 shadow-none">
                    Commercial Rules
                  </Badge>
                </div>

                <div>
                  <h1 className="text-3xl font-semibold tracking-tight text-white md:text-5xl">
                    Payment Terms
                  </h1>
                  <p className="mt-3 max-w-4xl text-sm leading-7 text-slate-400 md:text-base">
                    Reusable commercial payment terms for quotations, proforma invoices,
                    invoices, purchase orders, vendor quotations, and vendor records.
                    Document wording is generated from controlled term structures.
                  </p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:w-[440px]">
                <div className="rounded-[24px] border border-cyan-400/15 bg-cyan-500/10 p-4">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-200/70">
                    Default Term
                  </div>
                  <div className="mt-2 truncate text-sm font-semibold text-white">
                    {defaultRow?.document_label ?? defaultRow?.name ?? "Not Set"}
                  </div>
                  <p className="mt-1 text-xs leading-5 text-cyan-100/65">
                    Default selectable term for finance documents.
                  </p>
                </div>

                <div className="rounded-[24px] border border-violet-400/15 bg-violet-500/10 p-4">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-200/70">
                    Auto-Generated
                  </div>
                  <div className="mt-2 text-sm font-semibold text-white">
                    Codes + Wording
                  </div>
                  <p className="mt-1 text-xs leading-5 text-violet-100/65">
                    Terms generate clean labels and document text.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {error ? (
          <div className="rounded-[24px] border border-rose-400/20 bg-rose-500/10 px-5 py-4 text-sm text-rose-100">
            {error}
          </div>
        ) : null}

        {pageMessage ? (
          <div className="rounded-[24px] border border-emerald-400/20 bg-emerald-500/10 px-5 py-4 text-sm text-emerald-100">
            {pageMessage}
          </div>
        ) : null}

        <section>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
            <SummaryTile
              label="Total Terms"
              value={loading ? "—" : stats.total}
              icon={WalletCards}
              tone="cyan"
              description="All configured terms"
            />
            <SummaryTile
              label="Active"
              value={loading ? "—" : stats.active}
              icon={CheckCircle2}
              tone="emerald"
              description="Available for documents"
            />
            <SummaryTile
              label="Deposit"
              value={loading ? "—" : stats.deposit}
              icon={Percent}
              tone="amber"
              description="Deposit/balance terms"
            />
            <SummaryTile
              label="Partial"
              value={loading ? "—" : stats.partial}
              icon={CreditCard}
              tone="violet"
              description="Partial payment allowed"
            />
            <SummaryTile
              label="Archived"
              value={loading ? "—" : stats.archived}
              icon={Archive}
              tone="rose"
              description="Hidden from active use"
            />
            <SummaryTile
              label="Active Deposit"
              value={loading ? "—" : depositRows.length}
              icon={Clock3}
              tone="amber"
              description="Active deposit terms"
            />
          </div>
        </section>

        <Card className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
          <CardHeader className="border-b border-white/10 px-5 py-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-2">
                <Badge className="w-fit rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-slate-400 shadow-none">
                  Payment Term Registry
                </Badge>
                <CardTitle className="text-white">Payment Term Master List</CardTitle>
                <CardDescription className="text-slate-500">
                  Search, sort, create, edit, archive, restore, and delete reusable commercial terms.
                  Active terms: {activeRows.length}.
                </CardDescription>
              </div>

              <div className="flex w-full flex-col gap-3 lg:max-w-[860px] lg:flex-row">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search code, name, type, document wording, or notes..."
                    className={`${inputClass()} pl-10`}
                  />
                </div>

                <div className="flex gap-2 overflow-x-auto pb-1">
                  {(["all", "active", "inactive", "archived"] as StatusFilter[]).map(
                    (value) => (
                      <Button
                        key={value}
                        type="button"
                        variant="outline"
                        onClick={() => setStatusFilter(value)}
                        className={`h-11 rounded-2xl border-white/10 px-4 capitalize text-white ${
                          statusFilter === value
                            ? "bg-cyan-500/15 text-cyan-100"
                            : "bg-black/20 hover:bg-white/[0.06]"
                        }`}
                      >
                        {value}
                      </Button>
                    )
                  )}
                </div>

                {canCreate ? (
                  <Button
                    type="button"
                    onClick={openCreateDialog}
                    className="h-11 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 text-emerald-100 hover:bg-emerald-500/15"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    New Term
                  </Button>
                ) : null}
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <div className="max-h-[720px] overflow-y-auto">
                <table className="w-full min-w-[1320px] border-collapse">
                  <thead className="sticky top-0 z-10">
                    <tr className="border-b border-white/10 bg-black/70 text-left">
                      {tableHeaders.map((header) => (
                        <th
                          key={header.key}
                          className="px-5 py-4 text-[11px] uppercase tracking-[0.18em] text-slate-500"
                        >
                          {header.sortable ? (
                            <button
                              type="button"
                              onClick={() => updateSort(header.key)}
                              className="transition hover:text-slate-300"
                            >
                              {header.label}
                              {sortLabel(header.key)}
                            </button>
                          ) : (
                            <span>{header.label}</span>
                          )}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={7} className="px-5 py-12 text-sm text-slate-400">
                          Loading payment terms...
                        </td>
                      </tr>
                    ) : sortedRows.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-5 py-12 text-sm text-slate-400">
                          No payment terms found.
                        </td>
                      </tr>
                    ) : (
                      sortedRows.map((row) => (
                        <tr
                          key={row.id}
                          className="border-b border-white/10 text-sm text-slate-300 transition hover:bg-white/[0.035]"
                        >
                          <td className="px-5 py-4">
                            <div className="font-semibold text-white">{row.code}</div>
                            {row.is_default ? (
                              <Badge className="mt-2 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-emerald-200 shadow-none">
                                Default
                              </Badge>
                            ) : null}
                          </td>

                          <td className="px-5 py-4">
                            <div className="font-semibold text-white">{row.name}</div>
                            <div className="mt-1 max-w-[360px] truncate text-xs text-slate-500">
                              {row.document_terms_text ?? row.notes ?? "No wording configured"}
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <Badge className={termTypeBadgeClass(row.term_type)}>
                              {formatTermType(row.term_type)}
                            </Badge>
                          </td>

                          <td className="px-5 py-4 text-slate-300">
                            {row.requires_deposit ? (
                              <div>
                                <div className="font-semibold text-amber-100">
                                  {row.deposit_percentage ?? 0}% Deposit
                                </div>
                                <div className="mt-1 text-xs text-slate-500">
                                  {formatBasisLabel(row.deposit_due_basis)}
                                </div>
                              </div>
                            ) : row.term_type === "immediate" ? (
                              "Immediate"
                            ) : (
                              `${row.due_days} days`
                            )}
                          </td>

                          <td className="px-5 py-4">
                            <Badge className={statusBadgeClass(row.status)}>
                              {formatStatusLabel(row.status)}
                            </Badge>
                          </td>

                          <td className="px-5 py-4 text-slate-400">
                            {formatDateLabel(row.updated_at)}
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex flex-wrap justify-end gap-2">
                              {canEdit ? (
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => openEditDialog(row)}
                                  className="h-9 rounded-xl border-cyan-400/20 bg-cyan-500/10 px-3 text-xs text-cyan-100 hover:bg-cyan-500/15"
                                >
                                  <Edit3 className="mr-1.5 h-3.5 w-3.5" />
                                  Edit
                                </Button>
                              ) : null}

                              {canArchive && row.status === "archived" ? (
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => void handleRestore(row)}
                                  disabled={saving}
                                  className="h-9 rounded-xl border-emerald-400/20 bg-emerald-500/10 px-3 text-xs text-emerald-100 hover:bg-emerald-500/15 disabled:opacity-50"
                                >
                                  <Undo2 className="mr-1.5 h-3.5 w-3.5" />
                                  Restore
                                </Button>
                              ) : null}

                              {canArchive && row.status !== "archived" ? (
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => void handleArchive(row)}
                                  disabled={saving}
                                  className="h-9 rounded-xl border-amber-400/20 bg-amber-500/10 px-3 text-xs text-amber-100 hover:bg-amber-500/15 disabled:opacity-50"
                                >
                                  <Archive className="mr-1.5 h-3.5 w-3.5" />
                                  Archive
                                </Button>
                              ) : null}

                              {canDelete ? (
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => void handleHardDelete(row)}
                                  disabled={saving}
                                  className="h-9 rounded-xl border-rose-400/20 bg-rose-500/10 px-3 text-xs text-rose-100 hover:bg-rose-500/15 disabled:opacity-50"
                                >
                                  <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                                  Delete
                                </Button>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <PaymentTermFormModal
        open={dialogOpen}
        editingRow={editingRow}
        form={form}
        generatedTerm={generatedTerm}
        saving={saving}
        error={error}
        canSave={editingRow ? canEdit : canCreate}
        onClose={() => {
          setDialogOpen(false);
          setError("");
        }}
        onChange={updateForm}
        onSave={() => void handleSave()}
      />
    </div>
  );
}
