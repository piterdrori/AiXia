import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Archive,
  ArrowLeft,
  CheckCircle2,
  Clock3,
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
import { AnimatePresence, motion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

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

type ArchiveTab = "archived";

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

const DEFAULT_APPLIES_TO = "both" as FinancePaymentTermAppliesTo;

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

const pageFade = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0 },
};

const cardHover = {
  y: -4,
  scale: 1.01,
};

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
  return "h-11 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none transition focus:border-cyan-400/30 focus:bg-black/30 disabled:cursor-not-allowed disabled:opacity-50";
}

function selectClass() {
  return "h-11 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none transition focus:border-cyan-400/30 focus:bg-black/30 disabled:cursor-not-allowed disabled:opacity-50";
}

function textareaClass() {
  return "min-h-[120px] w-full resize-none rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/30 focus:bg-black/30 disabled:cursor-not-allowed disabled:opacity-50";
}

function labelClass() {
  return "text-sm font-medium text-slate-300";
}

function statusBadgeClass(status: FinancePaymentTermStatus) {
  if (status === "archived") {
    return "rounded-full border border-rose-400/20 bg-rose-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-rose-200 shadow-none";
  }

  if (status === "inactive") {
    return "rounded-full border border-amber-400/20 bg-amber-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-amber-200 shadow-none";
  }

  return "rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-emerald-200 shadow-none";
}

function termTypeBadgeClass(type: FinancePaymentTermType) {
  if (type === "immediate") {
    return "rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-emerald-200 shadow-none";
  }

  if (type === "deposit_balance") {
    return "rounded-full border border-amber-400/20 bg-amber-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-amber-200 shadow-none";
  }

  if (type === "custom") {
    return "rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-violet-200 shadow-none";
  }

  return "rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-cyan-200 shadow-none";
}

function optionToneClass(
  tone: "cyan" | "emerald" | "amber" | "violet",
  active: boolean
) {
  const activeMap = {
    cyan: "border-cyan-400/40 bg-cyan-500/15 text-cyan-100 shadow-lg shadow-cyan-500/10",
    emerald:
      "border-emerald-400/40 bg-emerald-500/15 text-emerald-100 shadow-lg shadow-emerald-500/10",
    amber:
      "border-amber-400/40 bg-amber-500/15 text-amber-100 shadow-lg shadow-amber-500/10",
    violet:
      "border-violet-400/40 bg-violet-500/15 text-violet-100 shadow-lg shadow-violet-500/10",
  };

  return active
    ? activeMap[tone]
    : "border-white/10 bg-white/[0.035] text-slate-400 hover:border-white/20 hover:bg-white/[0.055] hover:text-white";
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
        <option key={option.value} value={option.value} className="bg-slate-950">
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
      ? "border-emerald-400/30 bg-emerald-500/10"
      : "border-cyan-400/30 bg-cyan-500/10";

  const dotClass =
    tone === "emerald"
      ? checked
        ? "border-emerald-300 bg-emerald-400 shadow-sm shadow-emerald-300/50"
        : "border-white/20 bg-white/5"
      : checked
        ? "border-cyan-300 bg-cyan-400 shadow-sm shadow-cyan-300/50"
        : "border-white/20 bg-white/5";

  return (
    <motion.button
      type="button"
      onClick={() => onChange(!checked)}
      whileHover={{ y: -3, scale: 1.01 }}
      whileTap={{ scale: 0.985 }}
      transition={{ type: "spring", stiffness: 380, damping: 22 }}
      className={`rounded-[24px] border p-4 text-left transition ${
        checked ? activeClass : "border-white/10 bg-black/20 hover:bg-white/[0.035]"
      }`}
    >
      <div className="flex items-start gap-3">
        <motion.span
          animate={{ scale: checked ? 1.12 : 1 }}
          transition={{ type: "spring", stiffness: 420, damping: 18 }}
          className={`mt-1 block h-4 w-4 rounded-full border ${dotClass}`}
        />
        <span>
          <span className="block text-sm font-semibold text-white">{title}</span>
          <span className="mt-1 block text-xs leading-5 text-slate-500">
            {description}
          </span>
        </span>
      </div>
    </motion.button>
  );
}

function SummaryCard({
  label,
  value,
  description,
  icon: Icon,
  tone,
  delay,
}: {
  label: string;
  value: string | number;
  description: string;
  icon: typeof WalletCards;
  tone: "cyan" | "emerald" | "amber" | "violet";
  delay: number;
}) {
  const toneMap = {
    cyan: "border-cyan-400/20 bg-cyan-500/10 text-cyan-200",
    emerald: "border-emerald-400/20 bg-emerald-500/10 text-emerald-200",
    amber: "border-amber-400/20 bg-amber-500/10 text-amber-200",
    violet: "border-violet-400/20 bg-violet-500/10 text-violet-200",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
      whileHover={cardHover}
      className="min-h-[156px] overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.045] p-5 backdrop-blur-xl"
    >
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(110deg,transparent_30%,rgba(255,255,255,0.045)_50%,transparent_70%)]" />
      <div className="relative flex items-start justify-between gap-4">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            {label}
          </div>
          <div className="mt-4 text-3xl font-bold text-white">{value}</div>
        </div>
        <motion.div
          whileHover={{ rotate: 8 }}
          className={`flex h-12 w-12 items-center justify-center rounded-2xl border ${toneMap[tone]}`}
        >
          <Icon className="h-5 w-5" />
        </motion.div>
      </div>
      <p className="relative mt-5 text-sm leading-6 text-slate-400">{description}</p>
    </motion.div>
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
  const depositPercentage = parsePercentage(form.deposit_percentage) ?? 0;
  const balancePercentage = Math.max(0, 100 - depositPercentage);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="payment-term-modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 p-4 backdrop-blur-xl"
        >
          <motion.div
            key="payment-term-modal"
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 280, damping: 26 }}
            className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-[36px] border border-white/15 bg-[#05070d] shadow-2xl shadow-black/60"
          >
            <div className="relative overflow-hidden border-b border-white/10 bg-white/[0.045] px-8 py-6">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(6,182,212,0.18),transparent_38%),radial-gradient(circle_at_top_right,rgba(139,92,246,0.16),transparent_38%)]" />

              <div className="relative flex items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <Badge className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-cyan-200 shadow-none">
                      Payment Term
                    </Badge>
                    <Badge className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-emerald-200 shadow-none">
                      {editingRow ? "Edit Mode" : "Create Mode"}
                    </Badge>
                  </div>

                  <div className="mt-4 text-3xl font-bold text-white">
                    {editingRow ? "Edit Payment Term" : "Create Payment Term"}
                  </div>

                  <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-400">
                    Create reusable commercial payment terms for quotations, proforma
                    invoices, invoices, vendor quotations, purchase orders, and vendor records.
                  </p>
                </div>

                <motion.button
                  type="button"
                  onClick={onClose}
                  whileHover={{ rotate: 90, scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white transition hover:bg-white/10"
                >
                  <X className="h-5 w-5" />
                </motion.button>
              </div>
            </div>

            <div className="space-y-6 overflow-y-auto p-8">
              <motion.section
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045]"
              >
                <div className="border-b border-white/10 px-6 py-5">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-500/10 text-cyan-200">
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

                <div className="grid gap-5 p-6">
                  <div className="grid gap-4 md:grid-cols-4">
                    {TERM_TYPE_OPTIONS.map((option) => (
                      <motion.button
                        key={option.value}
                        type="button"
                        onClick={() => onChange("term_type", option.value)}
                        whileHover={{ y: -4, scale: 1.01 }}
                        whileTap={{ scale: 0.985 }}
                        transition={{ type: "spring", stiffness: 360, damping: 22 }}
                        className={`rounded-2xl border p-5 text-left transition ${optionToneClass(
                          option.tone,
                          form.term_type === option.value
                        )}`}
                      >
                        <div className="text-base font-semibold">{option.label}</div>
                        <div className="mt-2 text-xs leading-5 opacity-80">
                          {option.description}
                        </div>
                      </motion.button>
                    ))}
                  </div>

                  <AnimatePresence mode="wait">
                    {form.term_type === "net" ? (
                      <motion.label
                        key="net-fields"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="grid gap-3"
                      >
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
                      </motion.label>
                    ) : null}

                    {form.term_type === "deposit_balance" ? (
                      <motion.div
                        key="deposit-fields"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="grid gap-5"
                      >
                        <div className="grid gap-5 md:grid-cols-3">
                          <label className="grid gap-3">
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

                          <label className="grid gap-3">
                            <span className={labelClass()}>Deposit Due</span>
                            <SelectField
                              value={form.deposit_due_basis}
                              onChange={(value) => onChange("deposit_due_basis", value)}
                              options={DEPOSIT_DUE_BASIS_OPTIONS}
                            />
                          </label>

                          <label className="grid gap-3">
                            <span className={labelClass()}>Balance Due</span>
                            <SelectField
                              value={form.balance_due_basis}
                              onChange={(value) => onChange("balance_due_basis", value)}
                              options={BALANCE_DUE_BASIS_OPTIONS}
                            />
                          </label>
                        </div>

                        <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-5">
                          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-200/80">
                            Balance Auto-Calculated
                          </div>
                          <p className="mt-2 text-sm leading-6 text-emerald-100/80">
                            Deposit is {depositPercentage}%. Balance is{" "}
                            {balancePercentage}%.
                          </p>
                        </div>
                      </motion.div>
                    ) : null}

                    {form.term_type === "custom" ? (
                      <motion.div
                        key="custom-fields"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="grid gap-5"
                      >
                        <label className="grid gap-3">
                          <span className={labelClass()}>Custom Label</span>
                          <Input
                            value={form.custom_label}
                            onChange={(event) =>
                              onChange("custom_label", event.target.value)
                            }
                            placeholder="Example: 30/40/30 Milestone Payments"
                            className={inputClass()}
                          />
                        </label>

                        <label className="grid gap-3">
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
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </div>
              </motion.section>

              <motion.section
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045]"
              >
                <div className="border-b border-white/10 px-6 py-5">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-violet-400/20 bg-violet-500/10 text-violet-200">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                        Auto Preview
                      </div>
                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        Code, name, and document wording generated from the selected
                        structure.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-5 p-6 md:grid-cols-2">
                  <motion.div
                    layout
                    className="rounded-2xl border border-cyan-400/20 bg-cyan-500/10 p-5"
                  >
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-200/80">
                      Generated Code
                    </div>
                    <div className="mt-3 break-words text-base font-semibold text-cyan-100">
                      {generatedTerm.code}
                    </div>
                  </motion.div>

                  <motion.div
                    layout
                    className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-5"
                  >
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-200/80">
                      Generated Name
                    </div>
                    <div className="mt-3 break-words text-base font-semibold text-white">
                      {generatedTerm.name}
                    </div>
                  </motion.div>

                  <motion.div
                    layout
                    className="rounded-2xl border border-violet-400/20 bg-violet-500/10 p-5 md:col-span-2"
                  >
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-200/80">
                      Document Wording
                    </div>
                    <p className="mt-3 text-sm leading-6 text-violet-100/80">
                      {generatedTerm.documentTermsText}
                    </p>
                  </motion.div>
                </div>
              </motion.section>

              <motion.section
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045]"
              >
                <div className="border-b border-white/10 px-6 py-5">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-500/10 text-emerald-200">
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

                <div className="grid gap-5 p-6">
                  <div className="grid gap-5 md:grid-cols-2">
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

                  <div className="grid gap-5 md:grid-cols-2">
                    <label className="grid gap-3">
                      <span className={labelClass()}>Internal Notes</span>
                      <Input
                        value={form.notes}
                        onChange={(event) => onChange("notes", event.target.value)}
                        placeholder="Optional internal notes"
                        className={inputClass()}
                      />
                    </label>

                    <label className="grid gap-3">
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
              </motion.section>

              <AnimatePresence>
                {error ? (
                  <motion.div
                    key="modal-error"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-5 py-4 text-sm text-rose-100"
                  >
                    {error}
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>

            <div className="flex flex-col gap-3 border-t border-white/10 bg-white/[0.03] px-8 py-6 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="h-12 rounded-2xl border-white/10 bg-white/5 px-5 text-white hover:bg-white/10"
              >
                Cancel
              </Button>

              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  type="button"
                  onClick={onSave}
                  disabled={saving || !canSave}
                  className="h-12 rounded-2xl border border-cyan-400/20 bg-cyan-500/15 px-6 text-cyan-100 hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving
                    ? "Saving..."
                    : editingRow
                      ? "Save Changes"
                      : "Create Payment Term"}
                </Button>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export default function FinancePaymentTermsPage() {
  const navigate = useNavigate();

  const [rows, setRows] = useState<FinancePaymentTermRow[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [backgroundRefreshing, setBackgroundRefreshing] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("updated_at");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const [role, setRole] = useState<Role | null>(null);
  const [permissionOverrides, setPermissionOverrides] =
    useState<Partial<Record<Permission, boolean>> | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [archiveTab] = useState<ArchiveTab>("archived");
  const [editingRow, setEditingRow] = useState<FinancePaymentTermRow | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [error, setError] = useState("");
  const [pageMessage, setPageMessage] = useState("");

  const generatedTerm = useMemo(() => buildGeneratedTerm(form), [form]);

  const loadPage = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent === true;

    if (silent) {
      setBackgroundRefreshing(true);
    } else {
      setInitialLoading(true);
    }

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

      const paymentTerms = await getPaymentTerms();
      setRows(paymentTerms);
    } catch (loadError) {
      console.error("Failed to load payment terms:", loadError);

      if (!silent) {
        setRows([]);
      }

      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load payment terms."
      );
    } finally {
      if (silent) {
        setBackgroundRefreshing(false);
      } else {
        setInitialLoading(false);
      }
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
          void loadPage({ silent: true });
        }
      )
      .subscribe();

    const intervalId = window.setInterval(() => {
      void loadPage({ silent: true });
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
    () => rows.filter((row) => row.status !== "archived"),
    [rows]
  );

  const archivedRows = useMemo(
    () => rows.filter((row) => row.status === "archived"),
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
      archived: archivedRows.length,
    };
  }, [archivedRows.length, defaultRow, rows]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();

    return activeRows.filter((row) => {
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
  }, [activeRows, search, statusFilter]);

  const sortedRows = useMemo(() => {
    const sorted = [...filteredRows];

    sorted.sort((a, b) => {
      const direction = sortDirection === "asc" ? 1 : -1;

      if (sortKey === "updated_at") {
        const firstDate = new Date(a.updated_at ?? "").getTime();
        const secondDate = new Date(b.updated_at ?? "").getTime();
        const normalizedFirstDate = Number.isNaN(firstDate) ? 0 : firstDate;
        const normalizedSecondDate = Number.isNaN(secondDate) ? 0 : secondDate;

        return (normalizedFirstDate - normalizedSecondDate) * direction;
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
        due_basis: "invoice_date",
        requires_deposit: generatedTerm.requiresDeposit,
        deposit_percentage: generatedTerm.depositPercentage,
        deposit_due_basis: generatedTerm.depositDueBasis,
        balance_due_basis: generatedTerm.balanceDueBasis,
        balance_due_days: generatedTerm.balanceDueDays,
        document_label: generatedTerm.documentLabel,
        document_terms_text: generatedTerm.documentTermsText,
        allow_partial_payments: form.allow_partial_payments,
        requires_approval: false,
        applies_to: DEFAULT_APPLIES_TO,
      };

      if (editingRow) {
        await updatePaymentTerm(editingRow.id, payload);
        setPageMessage("Payment term updated successfully.");
      } else {
        await createPaymentTerm(payload);
        setPageMessage("Payment term created successfully.");
      }

      setDialogOpen(false);
      void loadPage({ silent: true });
    } catch (err) {
      console.error("Save failed:", err);
      setError(err instanceof Error ? err.message : "Failed to save payment term.");
    } finally {
      setSaving(false);
    }
  }

  async function handleArchive(row: FinancePaymentTermRow) {
    if (!canArchive) return;

    try {
      setActionLoadingId(row.id);
      setPageMessage("");
      setError("");

      await archivePaymentTerm(row.id);

      setPageMessage("Payment term archived successfully.");
      void loadPage({ silent: true });
    } catch (err) {
      console.error("Archive failed:", err);
      setError(err instanceof Error ? err.message : "Failed to archive payment term.");
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleRestore(row: FinancePaymentTermRow) {
    if (!canArchive) return;

    try {
      setActionLoadingId(row.id);
      setPageMessage("");
      setError("");

      await restorePaymentTerm(row.id);

      setPageMessage("Payment term restored successfully.");
      void loadPage({ silent: true });
    } catch (err) {
      console.error("Restore failed:", err);
      setError(err instanceof Error ? err.message : "Failed to restore payment term.");
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handlePermanentDelete(row: FinancePaymentTermRow) {
    if (!canDelete) return;

    try {
      setActionLoadingId(row.id);
      setPageMessage("");
      setError("");

      await permanentlyDeletePaymentTerm(row.id);

      setPageMessage("Payment term permanently deleted.");
      void loadPage({ silent: true });
    } catch (err) {
      console.error("Permanent delete failed:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to permanently delete payment term."
      );
    } finally {
      setActionLoadingId(null);
    }
  }

  function closeDialog() {
    setDialogOpen(false);
  }

  return (
    <div className="min-h-screen bg-[#05070d] px-4 py-4 text-white md:px-6 md:py-6">
      <motion.div
        initial="hidden"
        animate="visible"
        variants={pageFade}
        transition={{ duration: 0.35 }}
        className="mx-auto flex w-full max-w-[1600px] flex-col gap-6"
      >
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.38 }}
          className="relative overflow-hidden rounded-[34px] border border-white/10 bg-white/[0.045] p-6 backdrop-blur-xl"
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(6,182,212,0.18),transparent_38%),radial-gradient(circle_at_top_right,rgba(139,92,246,0.14),transparent_34%)]" />

          <div className="relative">
            <motion.button
              type="button"
              onClick={() => navigate("/finance/master-data")}
              whileHover={{ x: -2 }}
              whileTap={{ scale: 0.98 }}
              className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-300 transition hover:bg-white/[0.08] hover:text-white"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Master Data
            </motion.button>

            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <Badge className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-cyan-200 shadow-none">
                    Finance Master Data
                  </Badge>
                  <Badge className="rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-violet-200 shadow-none">
                    Payment Terms
                  </Badge>

                  <AnimatePresence>
                    {backgroundRefreshing ? (
                      <motion.div
                        key="background-refreshing"
                        initial={{ opacity: 0, scale: 0.94 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.94 }}
                      >
                        <Badge className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-emerald-200 shadow-none">
                          Updating Silently
                        </Badge>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </div>

                <h1 className="mt-5 text-4xl font-bold tracking-tight text-white">
                  Payment Terms
                </h1>

                <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-400">
                  Manage reusable payment terms used across customer and vendor finance
                  documents. Terms control document wording, due logic, deposit rules,
                  default selection, and partial payment behavior.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    type="button"
                    onClick={() => setArchiveOpen(true)}
                    variant="outline"
                    className="h-11 rounded-2xl border-white/10 bg-white/[0.05] px-5 text-white hover:bg-white/[0.08]"
                  >
                    <Archive className="mr-2 h-4 w-4" />
                    Archive
                  </Button>
                </motion.div>

                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    type="button"
                    onClick={openCreateDialog}
                    disabled={!canCreate}
                    className="h-11 rounded-2xl border border-cyan-400/20 bg-cyan-500/15 px-5 text-cyan-100 hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    New Payment Term
                  </Button>
                </motion.div>
              </div>
            </div>
          </div>
        </motion.section>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            label="Active Terms"
            value={stats.active}
            description="Available payment terms that can be selected on finance documents."
            icon={CheckCircle2}
            tone="emerald"
            delay={0.05}
          />
          <SummaryCard
            label="Deposit Terms"
            value={stats.deposit}
            description="Terms that require a deposit before the remaining balance."
            icon={Percent}
            tone="amber"
            delay={0.1}
          />
          <SummaryCard
            label="Default Term"
            value={stats.defaultTerm}
            description="The active default payment term for document creation."
            icon={WalletCards}
            tone="cyan"
            delay={0.15}
          />
          <SummaryCard
            label="Archived"
            value={stats.archived}
            description="Inactive historical terms stored in the archive area."
            icon={Archive}
            tone="violet"
            delay={0.2}
          />
        </div>

        <AnimatePresence>
          {pageMessage ? (
            <motion.div
              key="page-message"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="rounded-[24px] border border-emerald-400/20 bg-emerald-500/10 px-5 py-4 text-sm text-emerald-100"
            >
              {pageMessage}
            </motion.div>
          ) : null}
        </AnimatePresence>

        <AnimatePresence>
          {error ? (
            <motion.div
              key="page-error"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="rounded-[24px] border border-rose-400/20 bg-rose-500/10 px-5 py-4 text-sm text-rose-100"
            >
              {error}
            </motion.div>
          ) : null}
        </AnimatePresence>

        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12, duration: 0.35 }}
          className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] backdrop-blur-xl"
        >
          <div className="border-b border-white/10 px-5 py-4">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Payment Terms Registry
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  Active and inactive terms. Archived records are managed from the archive.
                </p>
              </div>

              <div className="flex flex-col gap-3 md:flex-row md:items-center">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search payment terms..."
                    className="h-11 w-full rounded-2xl border border-white/10 bg-black/20 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/30 md:w-[320px]"
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
                  className="h-11 rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none transition focus:border-cyan-400/30"
                >
                  <option value="all" className="bg-slate-950">
                    All Statuses
                  </option>
                  <option value="active" className="bg-slate-950">
                    Active
                  </option>
                  <option value="inactive" className="bg-slate-950">
                    Inactive
                  </option>
                </select>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <div className="max-h-[720px] overflow-y-auto">
              <table className="w-full min-w-[1240px] border-collapse">
                <thead className="sticky top-0 z-10 border-b border-white/10 bg-black/40 text-left text-[11px] uppercase tracking-[0.18em] text-slate-500 backdrop-blur-xl">
                  <tr>
                    <th className="px-5 py-4">
                      <button
                        type="button"
                        onClick={() => updateSort("code")}
                        className="transition hover:text-white"
                      >
                        Code{sortLabel("code")}
                      </button>
                    </th>
                    <th className="px-5 py-4">
                      <button
                        type="button"
                        onClick={() => updateSort("name")}
                        className="transition hover:text-white"
                      >
                        Name{sortLabel("name")}
                      </button>
                    </th>
                    <th className="px-5 py-4">
                      <button
                        type="button"
                        onClick={() => updateSort("term_type")}
                        className="transition hover:text-white"
                      >
                        Type{sortLabel("term_type")}
                      </button>
                    </th>
                    <th className="px-5 py-4">
                      <button
                        type="button"
                        onClick={() => updateSort("due_days")}
                        className="transition hover:text-white"
                      >
                        Due Days{sortLabel("due_days")}
                      </button>
                    </th>
                    <th className="px-5 py-4">Deposit</th>
                    <th className="px-5 py-4">Document Wording</th>
                    <th className="px-5 py-4">
                      <button
                        type="button"
                        onClick={() => updateSort("status")}
                        className="transition hover:text-white"
                      >
                        Status{sortLabel("status")}
                      </button>
                    </th>
                    <th className="px-5 py-4">
                      <button
                        type="button"
                        onClick={() => updateSort("updated_at")}
                        className="transition hover:text-white"
                      >
                        Updated{sortLabel("updated_at")}
                      </button>
                    </th>
                    <th className="px-5 py-4 text-right">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {initialLoading ? (
                    <tr>
                      <td
                        colSpan={9}
                        className="px-5 py-10 text-center text-sm text-slate-500"
                      >
                        Loading payment terms...
                      </td>
                    </tr>
                  ) : sortedRows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={9}
                        className="px-5 py-10 text-center text-sm text-slate-500"
                      >
                        No payment terms match the current filters.
                      </td>
                    </tr>
                  ) : (
                    sortedRows.map((row) => (
                      <motion.tr
                        key={row.id}
                        layout
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        className="border-b border-white/5 text-sm text-slate-300 transition hover:bg-white/[0.035]"
                      >
                        <td className="px-5 py-4">
                          <div className="font-mono text-xs text-cyan-200">
                            {row.code}
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="font-semibold text-white">{row.name}</div>
                          {row.is_default ? (
                            <div className="mt-1 text-xs text-emerald-300">
                              Default term
                            </div>
                          ) : null}
                        </td>
                        <td className="px-5 py-4">
                          <Badge className={termTypeBadgeClass(row.term_type)}>
                            {formatTermType(row.term_type)}
                          </Badge>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <Clock3 className="h-4 w-4 text-slate-500" />
                            <span>{row.due_days}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          {row.requires_deposit ? (
                            <div>
                              <div className="font-semibold text-amber-100">
                                {row.deposit_percentage ?? 0}%
                              </div>
                              <div className="mt-1 text-xs text-slate-500">
                                {formatBasisLabel(row.deposit_due_basis)}
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-600">No deposit</span>
                          )}
                        </td>
                        <td className="max-w-[360px] px-5 py-4">
                          <p className="line-clamp-2 text-sm leading-6 text-slate-400">
                            {row.document_terms_text || row.document_label || "—"}
                          </p>
                        </td>
                        <td className="px-5 py-4">
                          <Badge className={statusBadgeClass(row.status)}>
                            {formatStatusLabel(row.status)}
                          </Badge>
                        </td>
                        <td className="px-5 py-4 text-slate-500">
                          {formatDateLabel(row.updated_at)}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex justify-end gap-2">
                            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => openEditDialog(row)}
                                disabled={!canEdit}
                                className="h-9 rounded-xl border-white/10 bg-white/[0.05] px-3 text-white hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                <Edit3 className="mr-2 h-4 w-4" />
                                Edit
                              </Button>
                            </motion.div>

                            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => handleArchive(row)}
                                disabled={!canArchive || actionLoadingId === row.id}
                                className="h-9 rounded-xl border-amber-400/20 bg-amber-500/10 px-3 text-amber-100 hover:bg-amber-500/15 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                <Archive className="mr-2 h-4 w-4" />
                                Archive
                              </Button>
                            </motion.div>
                          </div>
                        </td>
                      </motion.tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </motion.section>
      </motion.div>

      <AnimatePresence>
        {archiveOpen ? (
          <motion.div
            key="archive-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 p-4 backdrop-blur-xl"
          >
            <motion.div
              key="archive-modal"
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.96 }}
              transition={{ type: "spring", stiffness: 280, damping: 26 }}
              className="flex max-h-[88vh] w-full max-w-6xl flex-col overflow-hidden rounded-[34px] border border-white/10 bg-[#05070d] shadow-2xl shadow-black/60"
            >
              <div className="border-b border-white/10 bg-white/[0.045] px-6 py-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <Badge className="rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-violet-200 shadow-none">
                      Archive
                    </Badge>
                    <h2 className="mt-4 text-2xl font-bold text-white">
                      Archived Payment Terms
                    </h2>
                    <p className="mt-2 text-sm text-slate-400">
                      Restore archived terms or permanently delete records when allowed.
                    </p>
                  </div>

                  <motion.button
                    type="button"
                    onClick={() => setArchiveOpen(false)}
                    whileHover={{ rotate: 90, scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white transition hover:bg-white/10"
                  >
                    <X className="h-5 w-5" />
                  </motion.button>
                </div>
              </div>

              <div className="border-b border-white/10 px-6 py-4">
                <Badge className="rounded-full border border-violet-400/20 bg-violet-500/10 px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-violet-200 shadow-none">
                  {archiveTab === "archived" ? "Archived" : "Archived"}
                </Badge>
              </div>

              <div className="overflow-x-auto">
                <div className="max-h-[620px] overflow-y-auto">
                  <table className="w-full min-w-[980px] border-collapse">
                    <thead className="sticky top-0 z-10 border-b border-white/10 bg-black/40 text-left text-[11px] uppercase tracking-[0.18em] text-slate-500 backdrop-blur-xl">
                      <tr>
                        <th className="px-5 py-4">Code</th>
                        <th className="px-5 py-4">Name</th>
                        <th className="px-5 py-4">Type</th>
                        <th className="px-5 py-4">Updated</th>
                        <th className="px-5 py-4 text-right">Actions</th>
                      </tr>
                    </thead>

                    <tbody>
                      {archivedRows.length === 0 ? (
                        <tr>
                          <td
                            colSpan={5}
                            className="px-5 py-10 text-center text-sm text-slate-500"
                          >
                            No archived payment terms.
                          </td>
                        </tr>
                      ) : (
                        archivedRows.map((row) => (
                          <motion.tr
                            key={row.id}
                            layout
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            className="border-b border-white/5 text-sm text-slate-300 transition hover:bg-white/[0.035]"
                          >
                            <td className="px-5 py-4">
                              <span className="font-mono text-xs text-cyan-200">
                                {row.code}
                              </span>
                            </td>
                            <td className="px-5 py-4">
                              <div className="font-semibold text-white">{row.name}</div>
                            </td>
                            <td className="px-5 py-4">
                              <Badge className={termTypeBadgeClass(row.term_type)}>
                                {formatTermType(row.term_type)}
                              </Badge>
                            </td>
                            <td className="px-5 py-4 text-slate-500">
                              {formatDateLabel(row.updated_at)}
                            </td>
                            <td className="px-5 py-4">
                              <div className="flex justify-end gap-2">
                                <motion.div
                                  whileHover={{ scale: 1.02 }}
                                  whileTap={{ scale: 0.98 }}
                                >
                                  <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => handleRestore(row)}
                                    disabled={!canArchive || actionLoadingId === row.id}
                                    className="h-9 rounded-xl border-emerald-400/20 bg-emerald-500/10 px-3 text-emerald-100 hover:bg-emerald-500/15 disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    <Undo2 className="mr-2 h-4 w-4" />
                                    Restore
                                  </Button>
                                </motion.div>

                                <motion.div
                                  whileHover={{ scale: 1.02 }}
                                  whileTap={{ scale: 0.98 }}
                                >
                                  <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => handlePermanentDelete(row)}
                                    disabled={!canDelete || actionLoadingId === row.id}
                                    className="h-9 rounded-xl border-rose-400/20 bg-rose-500/10 px-3 text-rose-100 hover:bg-rose-500/15 disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Hard Delete
                                  </Button>
                                </motion.div>
                              </div>
                            </td>
                          </motion.tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <PaymentTermFormModal
        open={dialogOpen}
        editingRow={editingRow}
        form={form}
        generatedTerm={generatedTerm}
        saving={saving}
        error={error}
        canSave={!!(editingRow ? canEdit : canCreate)}
        onClose={closeDialog}
        onChange={updateForm}
        onSave={handleSave}
      />
    </div>
  );
}
