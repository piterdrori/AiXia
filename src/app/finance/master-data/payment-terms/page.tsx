import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
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

const DEFAULT_APPLIES_TO: FinancePaymentTermAppliesTo[] = ["all"];
const DEFAULT_DUE_BASIS: FinancePaymentTermDueBasis = "invoice_date";
const DEFAULT_DEPOSIT_TYPE: FinancePaymentTermDepositType = "percentage";

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
  tone: "indigo" | "violet" | "gold" | "emerald";
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
    tone: "indigo",
  },
  {
    value: "deposit_balance",
    label: "Deposit + Balance",
    description: "Deposit first, balance later.",
    tone: "gold",
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
  {
    value: "immediate",
    label: "Immediately",
  },
  {
    value: "before_production",
    label: "Before Production",
  },
  {
    value: "before_shipment",
    label: "Before Shipment",
  },
  {
    value: "before_delivery",
    label: "Before Delivery",
  },
];

const BALANCE_DUE_BASIS_OPTIONS: Array<{
  value: FinancePaymentTermBalanceDueBasis;
  label: string;
}> = [
  {
    value: "before_shipment",
    label: "Before Shipment",
  },
  {
    value: "delivery_date",
    label: "On Delivery",
  },
  {
    value: "shipment_date",
    label: "On Shipment",
  },
  {
    value: "invoice_date",
    label: "On Invoice Date",
  },
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

const pageShell =
  "relative min-h-screen overflow-x-hidden bg-[#0F172A] px-4 py-6 text-white md:px-8 md:py-8";

const glassSurface =
  "relative overflow-hidden rounded-[32px] border border-white/10 bg-white/[0.08] shadow-[0_24px_80px_rgba(0,0,0,0.35)] backdrop-blur-xl";

const glassSurfaceHover =
  "transition-all duration-500 hover:border-white/20 hover:bg-white/[0.11] hover:shadow-[0_28px_100px_rgba(99,102,241,0.18)]";

const textGradient =
  "bg-gradient-to-r from-[#6366F1] via-[#A855F7] to-[#FBBF24] bg-clip-text text-transparent";

const badgeBase =
  "rounded-full border px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] shadow-none backdrop-blur-md";

const premiumButton =
  "relative overflow-hidden rounded-full font-bold tracking-wide transition-all duration-300 before:absolute before:inset-0 before:-translate-x-full before:bg-gradient-to-r before:from-transparent before:via-white/25 before:to-transparent before:transition-transform before:duration-700 hover:before:translate-x-full";

const inputGlass =
  "h-12 w-full rounded-2xl border border-white/10 bg-white/[0.06] px-4 text-sm text-white outline-none transition-all duration-300 placeholder:text-white/35 focus:border-[#6366F1]/60 focus:bg-white/[0.09] focus:shadow-[0_0_28px_rgba(99,102,241,0.24)] focus:ring-1 focus:ring-[#6366F1]/40 disabled:cursor-not-allowed disabled:opacity-50";

const selectGlass =
  "h-12 w-full rounded-2xl border border-white/10 bg-white/[0.06] px-4 text-sm text-white outline-none transition-all duration-300 focus:border-[#6366F1]/60 focus:bg-white/[0.09] focus:shadow-[0_0_28px_rgba(99,102,241,0.24)] focus:ring-1 focus:ring-[#6366F1]/40 disabled:cursor-not-allowed disabled:opacity-50";

const textareaGlass =
  "min-h-[120px] w-full resize-none rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm text-white outline-none transition-all duration-300 placeholder:text-white/35 focus:border-[#6366F1]/60 focus:bg-white/[0.09] focus:shadow-[0_0_28px_rgba(99,102,241,0.24)] focus:ring-1 focus:ring-[#6366F1]/40 disabled:cursor-not-allowed disabled:opacity-50";

const labelGlass =
  "text-xs font-bold uppercase tracking-[0.22em] text-white/60";

function ambientOrb(
  color: string,
  top: string,
  left: string,
  size: string,
  delay: number
) {
  return {
    position: "absolute" as const,
    top,
    left,
    width: size,
    height: size,
    borderRadius: "50%",
    background: `radial-gradient(circle, ${color} 0%, transparent 68%)`,
    filter: "blur(70px)",
    opacity: 0.42,
    animation: `paymentTermsFloatOrb ${8 + delay}s ease-in-out infinite alternate`,
  };
}

function statusBadgeClass(status: FinancePaymentTermStatus) {
  if (status === "archived") {
    return `${badgeBase} border-rose-400/30 bg-rose-500/10 text-rose-200`;
  }

  if (status === "inactive") {
    return `${badgeBase} border-[#FBBF24]/30 bg-[#FBBF24]/10 text-[#FBBF24]`;
  }

  return `${badgeBase} border-emerald-400/30 bg-emerald-500/10 text-emerald-200`;
}

function termTypeBadgeClass(type: FinancePaymentTermType) {
  if (type === "immediate") {
    return `${badgeBase} border-emerald-400/30 bg-emerald-500/10 text-emerald-200`;
  }

  if (type === "deposit_balance") {
    return `${badgeBase} border-[#FBBF24]/30 bg-[#FBBF24]/10 text-[#FBBF24]`;
  }

  if (type === "custom") {
    return `${badgeBase} border-[#A855F7]/30 bg-[#A855F7]/10 text-violet-200`;
  }

  return `${badgeBase} border-[#6366F1]/30 bg-[#6366F1]/10 text-indigo-200`;
}

function optionToneClass(
  tone: "indigo" | "violet" | "gold" | "emerald",
  active: boolean
) {
  const activeMap = {
    indigo:
      "border-[#6366F1]/50 bg-gradient-to-br from-[#6366F1]/25 to-[#6366F1]/5 text-indigo-100 shadow-[0_0_30px_rgba(99,102,241,0.2)]",
    violet:
      "border-[#A855F7]/50 bg-gradient-to-br from-[#A855F7]/25 to-[#A855F7]/5 text-violet-100 shadow-[0_0_30px_rgba(168,85,247,0.2)]",
    gold:
      "border-[#FBBF24]/50 bg-gradient-to-br from-[#FBBF24]/25 to-[#FBBF24]/5 text-amber-100 shadow-[0_0_30px_rgba(251,191,36,0.2)]",
    emerald:
      "border-emerald-400/50 bg-gradient-to-br from-emerald-500/25 to-emerald-500/5 text-emerald-100 shadow-[0_0_30px_rgba(16,185,129,0.2)]",
  };

  return active
    ? activeMap[tone]
    : "border-white/10 bg-white/[0.05] text-white/50 hover:border-white/20 hover:bg-white/[0.08] hover:text-white";
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
      className={selectGlass}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value} className="bg-[#0F172A]">
          {option.label}
        </option>
      ))}
    </select>
  );
}

function PremiumButton({
  children,
  onClick,
  disabled = false,
  variant = "primary",
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "danger";
  className?: string;
}) {
  const variantClass = {
    primary:
      "border-[#6366F1]/40 bg-[#6366F1] text-white shadow-[0_0_28px_rgba(99,102,241,0.45)] hover:bg-[#6366F1]/90 hover:shadow-[0_0_38px_rgba(99,102,241,0.6)]",
    secondary:
      "border-white/10 bg-white/[0.08] text-white hover:bg-white/[0.12] hover:border-white/20",
    danger:
      "border-rose-400/30 bg-rose-500/15 text-rose-100 hover:bg-rose-500/25 hover:border-rose-400/50",
  };

  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      whileHover={{ scale: disabled ? 1 : 1.035, y: disabled ? 0 : -2 }}
      whileTap={{ scale: disabled ? 1 : 0.965 }}
      className={`${premiumButton} inline-flex h-12 items-center justify-center border px-7 text-sm disabled:cursor-not-allowed disabled:opacity-40 ${variantClass[variant]} ${className}`}
    >
      {children}
    </motion.button>
  );
}

function FloatingGlassCard({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 34, rotateX: 8 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      transition={{
        duration: 0.65,
        delay,
        type: "spring",
        stiffness: 110,
        damping: 20,
      }}
      whileHover={{
        y: -8,
        scale: 1.015,
        transition: { duration: 0.25 },
      }}
      style={{
        perspective: 1000,
        transformStyle: "preserve-3d",
      }}
      className={`${glassSurface} ${glassSurfaceHover} ${className}`}
    >
      <div className="pointer-events-none absolute inset-0 rounded-[32px] bg-[linear-gradient(110deg,transparent_25%,rgba(255,255,255,0.07)_45%,transparent_65%)]" />
      <div className="relative z-10">{children}</div>
    </motion.div>
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
  tone: "indigo" | "emerald";
  onChange: (checked: boolean) => void;
}) {
  const activeClass =
    tone === "emerald"
      ? "border-emerald-400/40 bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 shadow-[0_0_28px_rgba(16,185,129,0.18)]"
      : "border-[#6366F1]/40 bg-gradient-to-br from-[#6366F1]/20 to-[#6366F1]/5 shadow-[0_0_28px_rgba(99,102,241,0.18)]";

  const dotClass =
    tone === "emerald"
      ? checked
        ? "border-emerald-300 bg-emerald-400 shadow-[0_0_14px_rgba(16,185,129,0.7)]"
        : "border-white/25 bg-white/5"
      : checked
        ? "border-indigo-300 bg-[#6366F1] shadow-[0_0_14px_rgba(99,102,241,0.7)]"
        : "border-white/25 bg-white/5";

  return (
    <motion.button
      type="button"
      onClick={() => onChange(!checked)}
      whileHover={{ y: -4, scale: 1.012 }}
      whileTap={{ scale: 0.985 }}
      transition={{ type: "spring", stiffness: 380, damping: 22 }}
      className={`rounded-[24px] border p-5 text-left transition-all duration-500 ${
        checked
          ? activeClass
          : "border-white/10 bg-white/[0.05] hover:border-white/20 hover:bg-white/[0.08]"
      }`}
    >
      <div className="flex items-start gap-4">
        <motion.span
          animate={{ scale: checked ? 1.15 : 1 }}
          transition={{ type: "spring", stiffness: 420, damping: 18 }}
          className={`mt-1 block h-5 w-5 rounded-full border-2 transition-all duration-300 ${dotClass}`}
        />
        <span>
          <span className="block text-sm font-bold text-white">{title}</span>
          <span className="mt-1 block text-xs leading-5 text-white/45">
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
  tone: "indigo" | "violet" | "gold" | "emerald";
  delay: number;
}) {
  const toneMap = {
    indigo:
      "border-[#6366F1]/30 bg-[#6366F1]/15 text-indigo-200 shadow-[0_0_28px_rgba(99,102,241,0.2)]",
    violet:
      "border-[#A855F7]/30 bg-[#A855F7]/15 text-violet-200 shadow-[0_0_28px_rgba(168,85,247,0.2)]",
    gold:
      "border-[#FBBF24]/30 bg-[#FBBF24]/15 text-[#FBBF24] shadow-[0_0_28px_rgba(251,191,36,0.2)]",
    emerald:
      "border-emerald-400/30 bg-emerald-500/15 text-emerald-200 shadow-[0_0_28px_rgba(16,185,129,0.2)]",
  };

  return (
    <FloatingGlassCard delay={delay} className="min-h-[166px] p-6">
      <div className="flex h-full flex-col justify-between">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-white/45">
              {label}
            </div>
            <div className="mt-3 text-3xl font-black tracking-tight text-white drop-shadow-[0_0_18px_rgba(255,255,255,0.16)]">
              {value}
            </div>
          </div>

          <motion.div
            whileHover={{ rotate: 12, scale: 1.1 }}
            transition={{ type: "spring", stiffness: 300 }}
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${toneMap[tone]}`}
          >
            <Icon className="h-5 w-5" />
          </motion.div>
        </div>

        <p className="mt-4 text-xs leading-5 text-white/45">{description}</p>
      </div>
    </FloatingGlassCard>
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
          transition={{ duration: 0.28 }}
          className="fixed inset-0 z-[120] flex items-center justify-center bg-[#020617]/90 p-4 backdrop-blur-[44px]"
          style={{ perspective: 1200 }}
        >
          <motion.div
            key="payment-term-modal"
            initial={{ opacity: 0, y: 60, rotateX: 8, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, rotateX: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, rotateX: -4, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 210, damping: 25 }}
            style={{ transformStyle: "preserve-3d" }}
            className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-[40px] border border-white/15 bg-[#0F172A] shadow-[0_28px_90px_rgba(0,0,0,0.78),0_0_0_1px_rgba(255,255,255,0.05)]"
          >
            <div className="relative overflow-hidden border-b border-white/10 bg-white/[0.06] px-8 py-7">
              <div className="pointer-events-none absolute inset-0">
                <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-[#6366F1]/18 blur-[80px]" />
                <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#A855F7]/18 blur-[80px]" />
                <div className="absolute left-1/2 top-0 h-48 w-48 -translate-x-1/2 rounded-full bg-[#FBBF24]/10 blur-[80px]" />
              </div>

              <div className="relative flex items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <Badge className={`${badgeBase} border-[#6366F1]/30 bg-[#6366F1]/10 text-indigo-200`}>
                      Payment Term
                    </Badge>
                    <Badge className={`${badgeBase} border-emerald-400/30 bg-emerald-500/10 text-emerald-200`}>
                      {editingRow ? "Edit Mode" : "Create Mode"}
                    </Badge>
                  </div>

                  <div className="mt-5 text-3xl font-black tracking-tight text-white">
                    {editingRow ? "Edit Payment Term" : "Create Payment Term"}
                  </div>

                  <p className="mt-3 max-w-3xl text-sm leading-6 text-white/50">
                    Create reusable commercial payment terms for quotations, proforma invoices,
                    invoices, bills, and finance documents.
                  </p>
                </div>

                <motion.button
                  type="button"
                  onClick={onClose}
                  whileHover={{ rotate: 90, scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.08] text-white transition hover:border-white/20 hover:bg-white/[0.12]"
                >
                  <X className="h-5 w-5" />
                </motion.button>
              </div>
            </div>

            <div className="custom-scrollbar space-y-8 overflow-y-auto p-8">
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className={`${glassSurface} ${glassSurfaceHover}`}
              >
                <div className="border-b border-white/10 px-6 py-5">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#6366F1]/30 bg-[#6366F1]/12 text-indigo-200 shadow-[0_0_24px_rgba(99,102,241,0.2)]">
                      <WalletCards className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold uppercase tracking-[0.22em] text-white/55">
                        Payment Structure
                      </div>
                      <p className="mt-1 text-xs text-white/35">
                        Choose the commercial structure and generate the controlled term.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-6 p-6">
                  <div className="grid gap-4 md:grid-cols-4">
                    {TERM_TYPE_OPTIONS.map((option) => (
                      <motion.button
                        key={option.value}
                        type="button"
                        onClick={() => onChange("term_type", option.value)}
                        whileHover={{ y: -6, scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        transition={{ type: "spring", stiffness: 360, damping: 22 }}
                        className={`rounded-[24px] border p-6 text-left transition-all duration-500 ${optionToneClass(
                          option.tone,
                          form.term_type === option.value
                        )}`}
                      >
                        <div className="text-base font-bold">{option.label}</div>
                        <div className="mt-2 text-xs leading-5 opacity-70">
                          {option.description}
                        </div>
                      </motion.button>
                    ))}
                  </div>

                  <AnimatePresence mode="wait">
                    {form.term_type === "net" ? (
                      <motion.label
                        key="net-fields"
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -12 }}
                        className="grid gap-3"
                      >
                        <span className={labelGlass}>Net Days</span>
                        <Input
                          type="number"
                          min="0"
                          step="1"
                          value={form.net_days}
                          onChange={(event) => onChange("net_days", event.target.value)}
                          placeholder="Example: 30"
                          className={inputGlass}
                        />
                      </motion.label>
                    ) : null}

                    {form.term_type === "deposit_balance" ? (
                      <motion.div
                        key="deposit-fields"
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -12 }}
                        className="grid gap-6"
                      >
                        <div className="grid gap-5 md:grid-cols-3">
                          <label className="grid gap-3">
                            <span className={labelGlass}>Deposit Percentage</span>
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
                              className={inputGlass}
                            />
                          </label>

                          <label className="grid gap-3">
                            <span className={labelGlass}>Deposit Due</span>
                            <SelectField
                              value={form.deposit_due_basis}
                              onChange={(value) => onChange("deposit_due_basis", value)}
                              options={DEPOSIT_DUE_BASIS_OPTIONS}
                            />
                          </label>

                          <label className="grid gap-3">
                            <span className={labelGlass}>Balance Due</span>
                            <SelectField
                              value={form.balance_due_basis}
                              onChange={(value) => onChange("balance_due_basis", value)}
                              options={BALANCE_DUE_BASIS_OPTIONS}
                            />
                          </label>
                        </div>

                        <div className="rounded-[20px] border border-emerald-400/20 bg-gradient-to-r from-emerald-500/12 to-emerald-600/5 p-5 shadow-[0_0_24px_rgba(16,185,129,0.12)]">
                          <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-emerald-200/80">
                            Balance Auto-Calculated
                          </div>
                          <p className="mt-2 text-sm leading-6 text-emerald-100/70">
                            Deposit is {depositPercentage}%. Balance is {balancePercentage}%.
                          </p>
                        </div>
                      </motion.div>
                    ) : null}

                    {form.term_type === "custom" ? (
                      <motion.div
                        key="custom-fields"
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -12 }}
                        className="grid gap-5"
                      >
                        <label className="grid gap-3">
                          <span className={labelGlass}>Custom Label</span>
                          <Input
                            value={form.custom_label}
                            onChange={(event) =>
                              onChange("custom_label", event.target.value)
                            }
                            placeholder="Example: 30/40/30 Milestone Payments"
                            className={inputGlass}
                          />
                        </label>

                        <label className="grid gap-3">
                          <span className={labelGlass}>Custom Document Wording</span>
                          <textarea
                            value={form.custom_terms_text}
                            onChange={(event) =>
                              onChange("custom_terms_text", event.target.value)
                            }
                            placeholder="Example: 30% deposit, 40% before shipment, 30% after installation."
                            className={textareaGlass}
                          />
                        </label>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </div>
              </motion.section>

                            <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className={`${glassSurface} ${glassSurfaceHover}`}
              >
                <div className="border-b border-white/10 px-6 py-5">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#A855F7]/30 bg-[#A855F7]/12 text-violet-200 shadow-[0_0_24px_rgba(168,85,247,0.2)]">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold uppercase tracking-[0.22em] text-white/55">
                        Auto Preview
                      </div>
                      <p className="mt-1 text-xs text-white/35">
                        Code, name, and document wording generated from the selected structure.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-5 p-6 md:grid-cols-2">
                  <motion.div
                    layout
                    className="rounded-[20px] border border-[#6366F1]/20 bg-[#6366F1]/10 p-5 shadow-[0_0_22px_rgba(99,102,241,0.1)]"
                  >
                    <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-indigo-200/70">
                      Generated Code
                    </div>
                    <div className="mt-3 break-words text-base font-bold text-indigo-100">
                      {generatedTerm.code}
                    </div>
                  </motion.div>

                  <motion.div
                    layout
                    className="rounded-[20px] border border-emerald-400/20 bg-emerald-500/10 p-5 shadow-[0_0_22px_rgba(16,185,129,0.1)]"
                  >
                    <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-emerald-200/70">
                      Generated Name
                    </div>
                    <div className="mt-3 break-words text-base font-bold text-white">
                      {generatedTerm.name}
                    </div>
                  </motion.div>

                  <motion.div
                    layout
                    className="rounded-[20px] border border-[#A855F7]/20 bg-[#A855F7]/10 p-5 shadow-[0_0_22px_rgba(168,85,247,0.1)] md:col-span-2"
                  >
                    <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-violet-200/70">
                      Document Wording
                    </div>
                    <p className="mt-3 text-sm leading-6 text-violet-100/75">
                      {generatedTerm.documentTermsText}
                    </p>
                  </motion.div>
                </div>
              </motion.section>

              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className={`${glassSurface} ${glassSurfaceHover}`}
              >
                <div className="border-b border-white/10 px-6 py-5">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-400/30 bg-emerald-500/12 text-emerald-200 shadow-[0_0_24px_rgba(16,185,129,0.2)]">
                      <ShieldCheck className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold uppercase tracking-[0.22em] text-white/55">
                        Term Controls
                      </div>
                      <p className="mt-1 text-xs text-white/35">
                        Default behavior, partial payments, status, and internal notes.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-6 p-6">
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
                      tone="indigo"
                      onChange={(checked) => onChange("allow_partial_payments", checked)}
                    />
                  </div>

                  <div className="grid gap-5 md:grid-cols-2">
                    <label className="grid gap-3">
                      <span className={labelGlass}>Internal Notes</span>
                      <Input
                        value={form.notes}
                        onChange={(event) => onChange("notes", event.target.value)}
                        placeholder="Optional internal notes"
                        className={inputGlass}
                      />
                    </label>

                    <label className="grid gap-3">
                      <span className={labelGlass}>Status</span>
                      <SelectField
                        value={form.status}
                        onChange={(value) => onChange("status", value)}
                        options={[
                          {
                            value: "active",
                            label: "Active",
                          },
                          {
                            value: "inactive",
                            label: "Inactive",
                          },
                          {
                            value: "archived",
                            label: "Archived",
                          },
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
                    className="rounded-[22px] border border-rose-400/25 bg-rose-500/10 px-5 py-4 text-sm text-rose-100 shadow-[0_0_26px_rgba(244,63,94,0.12)]"
                  >
                    {error}
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>

            <div className="flex flex-col gap-3 border-t border-white/10 bg-white/[0.04] px-8 py-6 sm:flex-row sm:justify-end">
              <PremiumButton onClick={onClose} variant="secondary">
                Cancel
              </PremiumButton>

              <PremiumButton
                onClick={onSave}
                disabled={saving || !canSave}
                variant="primary"
                className={saving ? "opacity-70" : ""}
              >
                {saving ? "Saving..." : editingRow ? "Save Changes" : "Create Payment Term"}
              </PremiumButton>
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

  const activeRows = useMemo(() => {
    return rows.filter((row) => row.status !== "archived");
  }, [rows]);

  const archivedRows = useMemo(() => {
    return rows.filter((row) => row.status === "archived");
  }, [rows]);

  const defaultRow = useMemo(() => {
    return rows.find((row) => row.is_default && row.status === "active") ?? null;
  }, [rows]);

  const stats = useMemo(() => {
    return {
      active: rows.filter((row) => row.status === "active").length,
      deposit: rows.filter((row) => row.requires_deposit).length,
      defaultTerm: defaultRow?.document_label ?? defaultRow?.name ?? "Not Set",
      archived: archivedRows.length,
    };
  }, [archivedRows.length, defaultRow, rows]);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();

    return activeRows.filter((row) => {
      const matchesStatus =
        statusFilter === "all" ? true : row.status === statusFilter;

      const matchesSearch =
        !query ||
        row.name.toLowerCase().includes(query) ||
        row.code.toLowerCase().includes(query) ||
        row.term_type.toLowerCase().includes(query) ||
        (row.document_label ?? "").toLowerCase().includes(query) ||
        (row.document_terms_text ?? "").toLowerCase().includes(query) ||
        (row.notes ?? "").toLowerCase().includes(query);

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
        due_basis: DEFAULT_DUE_BASIS,
        requires_deposit: generatedTerm.requiresDeposit,
        deposit_type: generatedTerm.requiresDeposit ? DEFAULT_DEPOSIT_TYPE : null,
        deposit_percentage: generatedTerm.depositPercentage,
        deposit_amount: null,
        deposit_due_basis: generatedTerm.depositDueBasis,
        deposit_due_days: null,
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
    <div className={pageShell}>
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div style={ambientOrb("rgba(99,102,241,0.42)", "8%", "8%", "520px", 0)} />
        <div style={ambientOrb("rgba(168,85,247,0.36)", "58%", "68%", "620px", 2)} />
        <div style={ambientOrb("rgba(251,191,36,0.24)", "28%", "78%", "420px", 4)} />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_20%,rgba(99,102,241,0.08),transparent_22%),radial-gradient(circle_at_90%_80%,rgba(168,85,247,0.08),transparent_22%)]" />
      </div>

      <style>{`
        @keyframes paymentTermsFloatOrb {
          0% { transform: translate(0, 0) scale(1); }
          100% { transform: translate(32px, -32px) scale(1.08); }
        }

        .payment-terms-scrollbar::-webkit-scrollbar {
          width: 7px;
          height: 7px;
        }

        .payment-terms-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }

        .payment-terms-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.14);
          border-radius: 999px;
        }

        .payment-terms-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255,255,255,0.24);
        }
      `}</style>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.55 }}
        className="relative z-10 mx-auto flex w-full max-w-[1600px] flex-col gap-8"
      >
        <motion.section
          initial={{ opacity: 0, y: 34, rotateX: 8 }}
          animate={{ opacity: 1, y: 0, rotateX: 0 }}
          transition={{
            duration: 0.72,
            type: "spring",
            stiffness: 90,
            damping: 20,
          }}
          style={{
            perspective: 1000,
          }}
          className={`${glassSurface} ${glassSurfaceHover} p-8`}
        >
          <div className="pointer-events-none absolute inset-0 rounded-[32px] bg-[radial-gradient(circle_at_20%_50%,rgba(99,102,241,0.14),transparent_46%),radial-gradient(circle_at_80%_50%,rgba(168,85,247,0.12),transparent_46%),radial-gradient(circle_at_50%_0%,rgba(251,191,36,0.08),transparent_40%)]" />

          <div className="relative">
            <motion.button
              type="button"
              onClick={() => navigate("/finance/master-data")}
              whileHover={{ x: -4, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.08] px-5 py-2.5 text-[11px] font-bold uppercase tracking-[0.2em] text-white/65 transition hover:border-white/20 hover:bg-white/[0.12] hover:text-white"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Master Data
            </motion.button>

            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <Badge className={`${badgeBase} border-[#6366F1]/30 bg-[#6366F1]/10 text-indigo-200`}>
                    Finance Master Data
                  </Badge>

                  <Badge className={`${badgeBase} border-[#A855F7]/30 bg-[#A855F7]/10 text-violet-200`}>
                    Payment Terms
                  </Badge>

                  <AnimatePresence>
                    {backgroundRefreshing ? (
                      <motion.div
                        key="background-refreshing"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                      >
                        <Badge className={`${badgeBase} border-emerald-400/30 bg-emerald-500/10 text-emerald-200`}>
                          <span className="mr-2 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                          Updating Silently
                        </Badge>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </div>

                <div className="mt-6">
                  <h1 className="text-[clamp(2.8rem,6vw,5.6rem)] font-black leading-none tracking-tight">
                    <span className={textGradient}>Payment</span>
                    <span className="text-white"> Terms</span>
                  </h1>

                  <h2 className="mt-3 text-[clamp(1.2rem,2.8vw,2.2rem)] font-bold uppercase tracking-[0.06em] text-white/90">
                    Designed for controlled finance documents
                  </h2>
                </div>

                <p className="mt-5 max-w-3xl text-sm leading-7 text-white/55 md:text-base">
                  Manage reusable payment terms used across finance documents. Terms control
                  document wording, due logic, deposit rules, default selection, and partial
                  payment behavior.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <PremiumButton onClick={() => setArchiveOpen(true)} variant="secondary">
                  <Archive className="mr-2 h-4 w-4" />
                  Archive
                </PremiumButton>

                <PremiumButton
                  onClick={openCreateDialog}
                  disabled={!canCreate}
                  variant="primary"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  New Payment Term
                </PremiumButton>
              </div>
            </div>
          </div>
        </motion.section>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
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
            tone="gold"
            delay={0.1}
          />

          <SummaryCard
            label="Default Term"
            value={stats.defaultTerm}
            description="The active default payment term for document creation."
            icon={WalletCards}
            tone="indigo"
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

        <AnimatePresence mode="wait">
          {pageMessage ? (
            <motion.div
              key="page-message"
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.98 }}
              className={`${glassSurface} border-emerald-400/25 bg-emerald-500/10 px-6 py-4 text-sm text-emerald-100 shadow-[0_0_32px_rgba(16,185,129,0.16)]`}
            >
              {pageMessage}
            </motion.div>
          ) : null}

          {error && !pageMessage ? (
            <motion.div
              key="page-error"
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.98 }}
              className={`${glassSurface} border-rose-400/25 bg-rose-500/10 px-6 py-4 text-sm text-rose-100 shadow-[0_0_32px_rgba(244,63,94,0.16)]`}
            >
              {error}
            </motion.div>
          ) : null}
        </AnimatePresence>

                <motion.section
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            delay: 0.2,
            duration: 0.58,
          }}
          className={`${glassSurface} ${glassSurfaceHover}`}
        >
          <div className="border-b border-white/10 px-6 py-5">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <div className="text-xs font-bold uppercase tracking-[0.22em] text-white/55">
                  Payment Terms Registry
                </div>
                <p className="mt-1 text-xs text-white/35">
                  Active and inactive terms. Archived records are managed from the archive.
                </p>
              </div>

              <div className="flex flex-col gap-3 md:flex-row md:items-center">
                <div className="group relative">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35 transition group-focus-within:text-[#6366F1]" />
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search payment terms..."
                    className={`${inputGlass} pl-11 md:w-[320px]`}
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
                  className={selectGlass}
                >
                  <option value="all" className="bg-[#0F172A]">
                    All Statuses
                  </option>
                  <option value="active" className="bg-[#0F172A]">
                    Active
                  </option>
                  <option value="inactive" className="bg-[#0F172A]">
                    Inactive
                  </option>
                </select>
              </div>
            </div>
          </div>

          <div className="payment-terms-scrollbar overflow-x-auto">
            <div className="payment-terms-scrollbar max-h-[720px] overflow-y-auto">
              <table className="w-full min-w-[1240px] border-collapse">
                <thead className="sticky top-0 z-10 border-b border-white/10 bg-[#0F172A]/85 text-left text-[10px] font-bold uppercase tracking-[0.2em] text-white/40 backdrop-blur-xl">
                  <tr>
                    <th className="px-5 py-4">
                      <button
                        type="button"
                        onClick={() => updateSort("code")}
                        className="transition hover:text-white"
                      >
                        Code
                        <span className="text-[#FBBF24]">{sortLabel("code")}</span>
                      </button>
                    </th>

                    <th className="px-5 py-4">
                      <button
                        type="button"
                        onClick={() => updateSort("name")}
                        className="transition hover:text-white"
                      >
                        Name
                        <span className="text-[#FBBF24]">{sortLabel("name")}</span>
                      </button>
                    </th>

                    <th className="px-5 py-4">
                      <button
                        type="button"
                        onClick={() => updateSort("term_type")}
                        className="transition hover:text-white"
                      >
                        Type
                        <span className="text-[#FBBF24]">
                          {sortLabel("term_type")}
                        </span>
                      </button>
                    </th>

                    <th className="px-5 py-4">
                      <button
                        type="button"
                        onClick={() => updateSort("due_days")}
                        className="transition hover:text-white"
                      >
                        Due Days
                        <span className="text-[#FBBF24]">
                          {sortLabel("due_days")}
                        </span>
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
                        Status
                        <span className="text-[#FBBF24]">{sortLabel("status")}</span>
                      </button>
                    </th>

                    <th className="px-5 py-4">
                      <button
                        type="button"
                        onClick={() => updateSort("updated_at")}
                        className="transition hover:text-white"
                      >
                        Updated
                        <span className="text-[#FBBF24]">
                          {sortLabel("updated_at")}
                        </span>
                      </button>
                    </th>

                    <th className="px-5 py-4 text-right">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {initialLoading ? (
                    <tr>
                      <td colSpan={9} className="px-5 py-16 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div className="h-9 w-9 animate-spin rounded-full border-2 border-[#6366F1]/20 border-t-[#6366F1]" />
                          <span className="text-sm text-white/40">
                            Loading payment terms...
                          </span>
                        </div>
                      </td>
                    </tr>
                  ) : sortedRows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={9}
                        className="px-5 py-16 text-center text-sm text-white/40"
                      >
                        No payment terms match the current filters.
                      </td>
                    </tr>
                  ) : (
                    sortedRows.map((row, index) => (
                      <motion.tr
                        key={row.id}
                        layout
                        initial={{
                          opacity: 0,
                          y: 12,
                        }}
                        animate={{
                          opacity: 1,
                          y: 0,
                        }}
                        exit={{
                          opacity: 0,
                          y: -12,
                        }}
                        transition={{
                          delay: index * 0.025,
                          duration: 0.28,
                        }}
                        whileHover={{
                          scale: 1.003,
                          backgroundColor: "rgba(255,255,255,0.045)",
                        }}
                        className="group border-b border-white/[0.045] text-sm text-white/70 transition-colors duration-300"
                      >
                        <td className="px-5 py-4">
                          <div className="font-mono text-xs font-bold tracking-wider text-indigo-200">
                            {row.code}
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <div className="font-bold text-white">{row.name}</div>
                          {row.is_default ? (
                            <div className="mt-1.5 inline-flex items-center gap-1.5 rounded-full border border-emerald-400/25 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-200">
                              <CheckCircle2 className="h-3 w-3" />
                              Default
                            </div>
                          ) : null}
                        </td>

                        <td className="px-5 py-4">
                          <Badge className={termTypeBadgeClass(row.term_type)}>
                            {formatTermType(row.term_type)}
                          </Badge>
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2 text-white/55">
                            <Clock3 className="h-4 w-4 text-white/30" />
                            <span className="font-mono text-sm">{row.due_days}</span>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          {row.requires_deposit ? (
                            <div>
                              <div className="text-sm font-bold text-[#FBBF24]">
                                {row.deposit_percentage ?? 0}%
                              </div>
                              <div className="mt-1 text-[11px] text-white/35">
                                {formatBasisLabel(row.deposit_due_basis)}
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-white/25">No deposit</span>
                          )}
                        </td>

                        <td className="max-w-[360px] px-5 py-4">
                          <p className="line-clamp-2 text-sm leading-6 text-white/45 transition-colors group-hover:text-white/60">
                            {row.document_terms_text || row.document_label || "—"}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <Badge className={statusBadgeClass(row.status)}>
                            {formatStatusLabel(row.status)}
                          </Badge>
                        </td>

                        <td className="px-5 py-4 font-mono text-xs text-white/35">
                          {formatDateLabel(row.updated_at)}
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex justify-end gap-2 opacity-85 transition-opacity group-hover:opacity-100">
                            <motion.div
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                            >
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => openEditDialog(row)}
                                disabled={!canEdit}
                                className="h-9 rounded-xl border-white/10 bg-white/[0.06] px-3 text-xs text-white hover:border-white/20 hover:bg-white/[0.1] disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                <Edit3 className="mr-2 h-3.5 w-3.5" />
                                Edit
                              </Button>
                            </motion.div>

                            <motion.div
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                            >
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => handleArchive(row)}
                                disabled={!canArchive || actionLoadingId === row.id}
                                className="h-9 rounded-xl border-[#FBBF24]/20 bg-[#FBBF24]/10 px-3 text-xs text-[#FBBF24] hover:border-[#FBBF24]/35 hover:bg-[#FBBF24]/15 disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                <Archive className="mr-2 h-3.5 w-3.5" />
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
            initial={{
              opacity: 0,
            }}
            animate={{
              opacity: 1,
            }}
            exit={{
              opacity: 0,
            }}
            transition={{
              duration: 0.28,
            }}
            className="fixed inset-0 z-[110] flex items-center justify-center bg-[#020617]/90 p-4 backdrop-blur-[44px]"
            style={{
              perspective: 1200,
            }}
          >
            <motion.div
              key="archive-modal"
              initial={{
                opacity: 0,
                y: 60,
                rotateX: 8,
                scale: 0.92,
              }}
              animate={{
                opacity: 1,
                y: 0,
                rotateX: 0,
                scale: 1,
              }}
              exit={{
                opacity: 0,
                y: 40,
                rotateX: -4,
                scale: 0.95,
              }}
              transition={{
                type: "spring",
                stiffness: 210,
                damping: 25,
              }}
              style={{
                transformStyle: "preserve-3d",
              }}
              className="flex max-h-[88vh] w-full max-w-6xl flex-col overflow-hidden rounded-[40px] border border-white/15 bg-[#0F172A] shadow-[0_28px_90px_rgba(0,0,0,0.78),0_0_0_1px_rgba(255,255,255,0.05)]"
            >
              <div className="relative overflow-hidden border-b border-white/10 bg-white/[0.06] px-8 py-7">
                <div className="pointer-events-none absolute inset-0">
                  <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-[#6366F1]/18 blur-[80px]" />
                  <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#A855F7]/18 blur-[80px]" />
                  <div className="absolute left-1/2 top-0 h-48 w-48 -translate-x-1/2 rounded-full bg-[#FBBF24]/10 blur-[80px]" />
                </div>

                <div className="relative flex items-start justify-between gap-4">
                  <div>
                    <Badge className={`${badgeBase} border-[#A855F7]/30 bg-[#A855F7]/10 text-violet-200`}>
                      Archive
                    </Badge>

                    <h2 className="mt-5 text-3xl font-black tracking-tight text-white">
                      Archived Payment Terms
                    </h2>

                    <p className="mt-3 max-w-3xl text-sm leading-6 text-white/50">
                      Restore archived payment terms or permanently delete records when allowed.
                    </p>
                  </div>

                  <motion.button
                    type="button"
                    onClick={() => setArchiveOpen(false)}
                    whileHover={{
                      rotate: 90,
                      scale: 1.05,
                    }}
                    whileTap={{
                      scale: 0.95,
                    }}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.08] text-white transition hover:border-white/20 hover:bg-white/[0.12]"
                  >
                    <X className="h-5 w-5" />
                  </motion.button>
                </div>
              </div>

              <div className="border-b border-white/10 px-6 py-4">
                <Badge className={`${badgeBase} border-[#A855F7]/30 bg-[#A855F7]/10 text-violet-200`}>
                  Archived
                </Badge>
              </div>

              <div className="payment-terms-scrollbar overflow-x-auto">
                <div className="payment-terms-scrollbar max-h-[620px] overflow-y-auto">
                  <table className="w-full min-w-[980px] border-collapse">
                    <thead className="sticky top-0 z-10 border-b border-white/10 bg-[#0F172A]/85 text-left text-[10px] font-bold uppercase tracking-[0.2em] text-white/40 backdrop-blur-xl">
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
                            className="px-5 py-16 text-center text-sm text-white/40"
                          >
                            No archived payment terms.
                          </td>
                        </tr>
                      ) : (
                        archivedRows.map((row, index) => (
                          <motion.tr
                            key={row.id}
                            layout
                            initial={{
                              opacity: 0,
                              y: 12,
                            }}
                            animate={{
                              opacity: 1,
                              y: 0,
                            }}
                            exit={{
                              opacity: 0,
                              y: -12,
                            }}
                            transition={{
                              delay: index * 0.025,
                              duration: 0.28,
                            }}
                            whileHover={{
                              scale: 1.003,
                              backgroundColor: "rgba(255,255,255,0.045)",
                            }}
                            className="group border-b border-white/[0.045] text-sm text-white/70 transition-colors duration-300"
                          >
                            <td className="px-5 py-4">
                              <span className="font-mono text-xs font-bold tracking-wider text-indigo-200">
                                {row.code}
                              </span>
                            </td>

                            <td className="px-5 py-4">
                              <div className="font-bold text-white">{row.name}</div>
                            </td>

                            <td className="px-5 py-4">
                              <Badge className={termTypeBadgeClass(row.term_type)}>
                                {formatTermType(row.term_type)}
                              </Badge>
                            </td>

                            <td className="px-5 py-4 font-mono text-xs text-white/35">
                              {formatDateLabel(row.updated_at)}
                            </td>

                            <td className="px-5 py-4">
                              <div className="flex justify-end gap-2 opacity-85 transition-opacity group-hover:opacity-100">
                                <motion.div
                                  whileHover={{
                                    scale: 1.05,
                                  }}
                                  whileTap={{
                                    scale: 0.95,
                                  }}
                                >
                                  <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => handleRestore(row)}
                                    disabled={!canArchive || actionLoadingId === row.id}
                                    className="h-9 rounded-xl border-emerald-400/25 bg-emerald-500/10 px-3 text-xs text-emerald-100 hover:border-emerald-400/40 hover:bg-emerald-500/15 disabled:cursor-not-allowed disabled:opacity-40"
                                  >
                                    <Undo2 className="mr-2 h-3.5 w-3.5" />
                                    Restore
                                  </Button>
                                </motion.div>

                                <motion.div
                                  whileHover={{
                                    scale: 1.05,
                                  }}
                                  whileTap={{
                                    scale: 0.95,
                                  }}
                                >
                                  <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => handlePermanentDelete(row)}
                                    disabled={!canDelete || actionLoadingId === row.id}
                                    className="h-9 rounded-xl border-rose-400/25 bg-rose-500/10 px-3 text-xs text-rose-100 hover:border-rose-400/40 hover:bg-rose-500/15 disabled:cursor-not-allowed disabled:opacity-40"
                                  >
                                    <Trash2 className="mr-2 h-3.5 w-3.5" />
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
