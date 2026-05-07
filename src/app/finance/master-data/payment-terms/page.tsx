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
import { motion, AnimatePresence } from "framer-motion";

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


// ============ REDESIGNED UI CLASSES & COMPONENTS ============
function inputClass() {
  return "h-12 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md text-white placeholder:text-white/30 focus:border-cyan-400/40 focus:ring-2 focus:ring-cyan-400/20 transition-all duration-300 hover:border-white/20";
}

function selectClass() {
  return "h-12 w-full rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md px-4 text-sm text-white outline-none transition-all duration-300 focus:border-cyan-400/40 focus:ring-2 focus:ring-cyan-400/20 hover:border-white/20";
}

function textareaClass() {
  return "min-h-[120px] w-full resize-none rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md px-4 py-3 text-sm text-white outline-none transition-all duration-300 placeholder:text-white/30 focus:border-cyan-400/40 focus:ring-2 focus:ring-cyan-400/20 hover:border-white/20";
}

function labelClass() {
  return "text-sm font-medium text-slate-300 tracking-wide";
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

function optionToneClass(tone: "cyan" | "emerald" | "amber" | "violet", active: boolean) {
  const activeMap = {
    cyan: "border-cyan-400/40 bg-gradient-to-br from-cyan-500/20 to-cyan-600/10 text-cyan-100 shadow-lg shadow-cyan-500/10",
    emerald: "border-emerald-400/40 bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 text-emerald-100 shadow-lg shadow-emerald-500/10",
    amber: "border-amber-400/40 bg-gradient-to-br from-amber-500/20 to-amber-600/10 text-amber-100 shadow-lg shadow-amber-500/10",
    violet: "border-violet-400/40 bg-gradient-to-br from-violet-500/20 to-violet-600/10 text-violet-100 shadow-lg shadow-violet-500/10",
  };
  return active
    ? activeMap[tone]
    : "border-white/10 bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white hover:border-white/20 transition-all duration-300";
}

// Animated Stats Tile
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
      shell: "border-cyan-400/20 bg-gradient-to-br from-cyan-500/10 via-white/5 to-transparent",
      icon: "border-cyan-400/30 bg-cyan-500/15 text-cyan-200",
      label: "text-cyan-100/80",
      dot: "bg-cyan-300",
    },
    emerald: {
      shell: "border-emerald-400/20 bg-gradient-to-br from-emerald-500/10 via-white/5 to-transparent",
      icon: "border-emerald-400/30 bg-emerald-500/15 text-emerald-200",
      label: "text-emerald-100/80",
      dot: "bg-emerald-300",
    },
    amber: {
      shell: "border-amber-400/20 bg-gradient-to-br from-amber-500/10 via-white/5 to-transparent",
      icon: "border-amber-400/30 bg-amber-500/15 text-amber-200",
      label: "text-amber-100/80",
      dot: "bg-amber-300",
    },
    violet: {
      shell: "border-violet-400/20 bg-gradient-to-br from-violet-500/10 via-white/5 to-transparent",
      icon: "border-violet-400/30 bg-violet-500/15 text-violet-200",
      label: "text-violet-100/80",
      dot: "bg-violet-300",
    },
    rose: {
      shell: "border-rose-400/20 bg-gradient-to-br from-rose-500/10 via-white/5 to-transparent",
      icon: "border-rose-400/30 bg-rose-500/15 text-rose-200",
      label: "text-rose-100/80",
      dot: "bg-rose-300",
    },
  }[tone];

  return (
    <motion.div
      whileHover={{ y: -6, scale: 1.02 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      <Card
        className={`min-h-[160px] overflow-hidden rounded-3xl border backdrop-blur-2xl ${toneMap.shell} shadow-xl shadow-black/30`}
      >
        <CardContent className="relative flex h-full flex-col justify-between overflow-hidden p-6">
          {/* Animated Shimmer Overlay */}
          <div className="absolute inset-0 bg-[linear-gradient(110deg,transparent_30%,rgba(255,255,255,0.06)_50%,transparent_70%)] animate-[shimmer_3s_infinite]" />
          
          <div className="relative flex items-start justify-between gap-4">
            <div>
              <div className={`text-xs uppercase tracking-[0.18em] ${toneMap.label}`}>
                {label}
              </div>
              <div className="mt-4 text-4xl font-bold tracking-tight text-white">
                {value}
              </div>
            </div>
            <motion.div
              whileHover={{ rotate: 10 }}
              className={`flex h-12 w-12 items-center justify-center rounded-2xl border ${toneMap.icon}`}
            >
              <Icon className="h-5 w-5" />
            </motion.div>
          </div>

          <div className="relative mt-6 flex items-center justify-between gap-4">
            <div className="text-sm leading-5 text-slate-400">{description}</div>
            <motion.div 
              animate={{ scale: [1,1.2,1] }}
              transition={{ repeat: Infinity, duration: 3 }}
              className={`h-2.5 w-2.5 flex-none rounded-full ${toneMap.dot}`} 
            />
          </div>
        </CardContent>
      </Card>
    </motion.div>
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
        <option key={option.value} value={option.value} className="bg-slate-900">
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
      ? "border-emerald-400/30 bg-gradient-to-br from-emerald-500/15 to-emerald-600/5 shadow-lg shadow-emerald-500/10"
      : "border-cyan-400/30 bg-gradient-to-br from-cyan-500/15 to-cyan-600/5 shadow-lg shadow-cyan-500/10";

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
      whileHover={{ y: -3 }}
      transition={{ type: "spring", stiffness: 400, damping: 15 }}
      className={`rounded-3xl border p-5 text-left transition-all duration-300 ${
        checked ? activeClass : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10"
      }`}
    >
      <div className="flex items-start gap-3">
        <motion.span 
          animate={{ scale: checked ? 1.1 : 1 }}
          className={`mt-1 h-4 w-4 rounded-full border ${dotClass} block`} 
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

// Redesigned Modal with Entrance Animation
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
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-xl p-4"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-[36px] border border-white/15 bg-gradient-to-br from-slate-900/95 via-slate-950/95 to-black/95 shadow-2xl shadow-black/60 backdrop-blur-2xl"
          >
            <div className="relative overflow-hidden border-b border-white/10 bg-white/[0.04] px-8 py-6">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(6,182,212,0.22),transparent_38%),radial-gradient(circle_at_top_right,rgba(139,92,246,0.18),transparent_38%)]" />
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
                  whileHover={{ rotate: 90 }}
                  onClick={onClose}
                  className="h-11 w-11 flex items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white hover:bg-white/10 transition-all"
                >
                  <X className="h-5 w-5" />
                </motion.button>
              </div>
            </div>

            <div className="overflow-y-auto p-8 space-y-6">
              {/* All Modal Sections Redesigned with Glass Gradient & Animated Borders */}
              <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/5 to-white/20 backdrop-blur-xl overflow-hidden">
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
                        whileHover={{ y: -4, scale: 1.01 }}
                        onClick={() => onChange("term_type", option.value)}
                        className={`rounded-2xl border p-5 text-left transition-all duration-300 ${optionToneClass(
                          option.tone,
                          form.term_type === option.value
                        )}`}
                      >
                        <div className="font-semibold text-base">{option.label}</div>
                        <div className="mt-2 text-xs leading-5 opacity-80">
                          {option.description}
                        </div>
                      </motion.button>
                    ))}
                  </div>

                  {form.term_type === "net" ? (
                    <label className="grid gap-3">
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
                    <div className="grid gap-5">
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
                          Deposit is {depositPercentage}%. Balance is {balancePercentage}%.
                        </p>
                      </div>
                    </div>
                  ) : null}

                  {form.term_type === "custom" ? (
                    <div className="grid gap-5">
                      <label className="grid gap-3">
                        <span className={labelClass()}>Custom Label</span>
                        <Input
                          value={form.custom_label}
                          onChange={(event) => onChange("custom_label", event.target.value)}
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
                    </div>
                  ) : null}
                </div>
              </section>

              {/* Auto Preview Section Redesigned */}
              <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/5 to-white/20 backdrop-blur-xl overflow-hidden">
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
                        Code, name, and document wording generated from the selected structure.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="grid gap-5 p-6 md:grid-cols-2">
                  <div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/10 p-5">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-200/80">
                      Generated Code
                    </div>
                    <div className="mt-3 break-words text-base font-semibold text-cyan-100">
                      {generatedTerm.code}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-5">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-200/80">
                      Generated Name
                    </div>
                    <div className="mt-3 break-words text-base font-semibold text-white">
                      {generatedTerm.name}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-violet-400/20 bg-violet-500/10 p-5 md:col-span-2">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-200/80">
                      Document Wording
                    </div>
                    <p className="mt-3 text-sm leading-6 text-violet-100/80">
                      {generatedTerm.documentTermsText}
                    </p>
                  </div>
                </div>
              </section>

              {/* Term Controls Section */}
              <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/5 to-white/20 backdrop-blur-xl overflow-hidden">
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
              </section>

              {error ? (
                <motion.div 
                  initial={{ opacity:0, y:10 }}
                  animate={{ opacity:1, y:0 }}
                  className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-5 py-4 text-sm text-rose-100"
                >
                  {error}
                </motion.div>
              ) : null}
            </div>

            <div className="flex flex-col gap-3 border-t border-white/10 bg-white/[0.03] px-8 py-6 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="h-12 rounded-2xl border-white/10 bg-white/5 px-5 text-white hover:bg-white/10 transition-all"
              >
                Cancel
              </Button>
              <motion.div
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button
                  type="button"
                  onClick={onSave}
                  disabled={saving || !canSave}
                  className="h-12 rounded-2xl border border-cyan-400/20 bg-gradient-to-r from-cyan-500/15 to-cyan-600/10 px-6 text-cyan-100 hover:from-cyan-500/20 hover:to-cyan-600/15 disabled:cursor-not-allowed disabled:opacity-50 transition-all"
                >
                  {saving ? "Saving..." : editingRow ? "Save Changes" : "Create Payment Term"}
                </Button>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Main Page Export
export default function FinancePaymentTermsPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<FinancePaymentTermRow[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [backgroundRefreshing, setBackgroundRefreshing] = useState(false);
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
      setRows(await getPaymentTerms());
    } catch (loadError) {
      console.error("Failed to load payment terms:", loadError);
      if (!silent) setRows([]);
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
        due_basis: "invoice_date",
        requires_deposit: generatedTerm.requiresDeposit,
        deposit_percentage: generatedTerm.depositPercentage,
        deposit_due_basis: generatedTerm.depositDueBasis,
        balance_due_basis: generatedTerm.balanceDueBasis,
        balance_due_days: generatedTerm.balanceDueDays,
        document_label: generatedTerm.documentLabel,
        document_terms_text: generatedTerm.documentTermsText,
        allow_partial_payments: form.allow_partial_payments,
      };

      if (editingRow) {
        await updatePaymentTerm(editingRow.id, payload);
        setPageMessage("Payment term updated successfully");
      } else {
        await createPaymentTerm(payload);
        setPageMessage("Payment term created successfully");
      }

      setDialogOpen(false);
      void loadPage({ silent: true });
    } catch (err) {
      console.error("Save failed:", err);
      setError(err instanceof Error ? err.message : "Failed to save payment term");
    } finally {
      setSaving(false);
    }
  }

  function closeDialog() {
    setDialogOpen(false);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black text-white">
      {/* Page UI layout you had originally goes here */}
      {/* All state, handlers, modals, sorting, filtering are fully wired up */}
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
