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

const DEFAULT_APPLIES_TO: FinancePaymentTermAppliesTo[] = ["all"];
const DEFAULT_DUE_BASIS = "invoice_date" as FinancePaymentTermDueBasis;

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

/* ─── Visual System ─── */

const ambientOrb = (color: string, top: string, left: string, size: string, delay: number) => ({
  position: "absolute" as const,
  top,
  left,
  width: size,
  height: size,
  borderRadius: "50%",
  background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
  filter: "blur(80px)",
  opacity: 0.35,
  animation: `floatOrb ${8 + delay}s ease-in-out infinite alternate`,
});

const glassSurface = "relative overflow-hidden rounded-[32px] border border-white/[0.08] bg-white/[0.03] backdrop-blur-[40px] shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.06)]";

const glassSurfaceHover = "hover:border-white/[0.14] hover:bg-white/[0.05] hover:shadow-[0_12px_48px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.1)] transition-all duration-500";

const cinematicButton = "relative overflow-hidden rounded-2xl font-medium tracking-wide transition-all duration-300 before:absolute before:inset-0 before:-translate-x-full before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent before:transition-transform before:duration-700 hover:before:translate-x-full";

const inputGlass = "h-12 w-full rounded-2xl border border-white/[0.08] bg-black/30 px-4 text-sm text-white outline-none transition-all duration-300 placeholder:text-slate-600 focus:border-white/20 focus:bg-black/40 focus:shadow-[0_0_20px_rgba(6,182,212,0.15)] focus:ring-1 focus:ring-cyan-400/30 disabled:cursor-not-allowed disabled:opacity-50";

const selectGlass = "h-12 w-full rounded-2xl border border-white/[0.08] bg-black/30 px-4 text-sm text-white outline-none transition-all duration-300 focus:border-white/20 focus:bg-black/40 focus:shadow-[0_0_20px_rgba(6,182,212,0.15)] focus:ring-1 focus:ring-cyan-400/30 disabled:cursor-not-allowed disabled:opacity-50";

const textareaGlass = "min-h-[120px] w-full resize-none rounded-2xl border border-white/[0.08] bg-black/30 px-4 py-3 text-sm text-white outline-none transition-all duration-300 placeholder:text-slate-600 focus:border-white/20 focus:bg-black/40 focus:shadow-[0_0_20px_rgba(6,182,212,0.15)] focus:ring-1 focus:ring-cyan-400/30 disabled:cursor-not-allowed disabled:opacity-50";

const labelGlass = "text-xs font-semibold uppercase tracking-[0.2em] text-slate-400";

const badgeBase = "rounded-full border px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] shadow-none backdrop-blur-md";

function statusBadgeClass(status: FinancePaymentTermStatus) {
  if (status === "archived") return `${badgeBase} border-rose-500/30 bg-rose-500/10 text-rose-200`;
  if (status === "inactive") return `${badgeBase} border-amber-500/30 bg-amber-500/10 text-amber-200`;
  return `${badgeBase} border-emerald-500/30 bg-emerald-500/10 text-emerald-200`;
}

function termTypeBadgeClass(type: FinancePaymentTermType) {
  if (type === "immediate") return `${badgeBase} border-emerald-500/30 bg-emerald-500/10 text-emerald-200`;
  if (type === "deposit_balance") return `${badgeBase} border-amber-500/30 bg-amber-500/10 text-amber-200`;
  if (type === "custom") return `${badgeBase} border-violet-500/30 bg-violet-500/10 text-violet-200`;
  return `${badgeBase} border-cyan-500/30 bg-cyan-500/10 text-cyan-200`;
}

const toneGradients = {
  cyan: "from-cyan-400/20 to-cyan-600/5 border-cyan-400/30 text-cyan-100 shadow-[0_0_30px_rgba(6,182,212,0.15)]",
  emerald: "from-emerald-400/20 to-emerald-600/5 border-emerald-400/30 text-emerald-100 shadow-[0_0_30px_rgba(16,185,129,0.15)]",
  amber: "from-amber-400/20 to-amber-600/5 border-amber-400/30 text-amber-100 shadow-[0_0_30px_rgba(245,158,11,0.15)]",
  violet: "from-violet-400/20 to-violet-600/5 border-violet-400/30 text-violet-100 shadow-[0_0_30px_rgba(139,92,246,0.15)]",
};

const toneGradientsInactive = "from-white/[0.02] to-transparent border-white/[0.08] text-slate-500 hover:border-white/[0.14] hover:from-white/[0.04] hover:text-slate-300 hover:shadow-none";

function optionToneClass(tone: "cyan" | "emerald" | "amber" | "violet", active: boolean) {
  return active
    ? `bg-gradient-to-br ${toneGradients[tone]}`
    : `bg-gradient-to-br ${toneGradientsInactive}`;
}

/* ─── 3D Card Component ─── */

function Card3D({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40, rotateX: 12 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      transition={{ duration: 0.7, delay, type: "spring", stiffness: 100, damping: 20 }}
      whileHover={{ y: -6, rotateX: 2, scale: 1.01, transition: { duration: 0.3 } }}
      style={{ perspective: 1000, transformStyle: "preserve-3d" }}
      className={`${glassSurface} ${glassSurfaceHover} ${className}`}
    >
      <div className="pointer-events-none absolute inset-0 rounded-[32px] bg-[linear-gradient(110deg,transparent_25%,rgba(255,255,255,0.04)_45%,transparent_65%)]" />
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
}

/* ─── Magnetic Button ─── */

function MagneticButton({
  children,
  onClick,
  disabled = false,
  variant = "primary",
  className = "",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  className?: string;
}) {
  const variants = {
    primary: "border-cyan-400/30 bg-cyan-500/15 text-cyan-100 hover:bg-cyan-500/25 hover:border-cyan-400/50 hover:shadow-[0_0_30px_rgba(6,182,212,0.2)]",
    secondary: "border-white/10 bg-white/[0.06] text-white hover:bg-white/[0.12] hover:border-white/20 hover:shadow-[0_0_20px_rgba(255,255,255,0.05)]",
    danger: "border-rose-400/30 bg-rose-500/15 text-rose-100 hover:bg-rose-500/25 hover:border-rose-400/50 hover:shadow-[0_0_30px_rgba(244,63,94,0.2)]",
    ghost: "border-transparent bg-transparent text-slate-400 hover:text-white hover:bg-white/[0.04]",
  };

  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      className={`${cinematicButton} h-11 px-6 text-sm font-semibold tracking-wide border rounded-2xl backdrop-blur-md transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-40 ${variants[variant]} ${className}`}
    >
      {children}
    </motion.button>
  );
}

/* ─── Form Components ─── */

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
        <option key={option.value} value={option.value} className="bg-[#0a0e1a]">
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
  const activeGrad =
    tone === "emerald"
      ? "border-emerald-400/30 bg-gradient-to-br from-emerald-500/15 to-emerald-600/5 shadow-[0_0_20px_rgba(16,185,129,0.15)]"
      : "border-cyan-400/30 bg-gradient-to-br from-cyan-500/15 to-cyan-600/5 shadow-[0_0_20px_rgba(6,182,212,0.15)]";
  const dotActive =
    tone === "emerald"
      ? "border-emerald-300 bg-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.6)]"
      : "border-cyan-300 bg-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.6)]";

  return (
    <motion.button
      type="button"
      onClick={() => onChange(!checked)}
      whileHover={{ y: -3, scale: 1.01 }}
      whileTap={{ scale: 0.985 }}
      transition={{ type: "spring", stiffness: 380, damping: 22 }}
      className={`rounded-[24px] border p-5 text-left transition-all duration-500 ${
        checked
          ? activeGrad
          : "border-white/[0.08] bg-white/[0.02] hover:border-white/[0.14] hover:bg-white/[0.04]"
      }`}
    >
      <div className="flex items-start gap-4">
        <motion.span
          animate={{ scale: checked ? 1.15 : 1 }}
          transition={{ type: "spring", stiffness: 420, damping: 18 }}
          className={`mt-1 block h-5 w-5 rounded-full border-2 transition-all duration-300 ${
            checked ? dotActive : "border-white/20 bg-white/5"
          }`}
        />
        <span>
          <span className="block text-sm font-bold text-white">{title}</span>
          <span className="mt-1 block text-xs leading-5 text-slate-500">{description}</span>
        </span>
      </div>
    </motion.button>
  );
}

/* ─── Summary Card ─── */

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
    cyan: "border-cyan-400/20 bg-cyan-500/10 text-cyan-300 shadow-[0_0_20px_rgba(6,182,212,0.15)]",
    emerald: "border-emerald-400/20 bg-emerald-500/10 text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.15)]",
    amber: "border-amber-400/20 bg-amber-500/10 text-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.15)]",
    violet: "border-violet-400/20 bg-violet-500/10 text-violet-300 shadow-[0_0_20px_rgba(139,92,246,0.15)]",
  };

  return (
    <Card3D delay={delay} className="p-6 min-h-[164px] flex flex-col justify-between">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">
            {label}
          </div>
          <div className="mt-3 text-3xl font-bold tracking-tight text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.15)]">
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
      <p className="text-xs leading-5 text-slate-500 mt-4">{description}</p>
    </Card3D>
  );
}

/* ─── Modal ─── */

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
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/90 p-4 backdrop-blur-[60px]"
          style={{ perspective: 1200 }}
        >
          <motion.div
            key="payment-term-modal"
            initial={{ opacity: 0, y: 60, rotateX: 8, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, rotateX: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, rotateX: -4, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 200, damping: 25 }}
            style={{ transformStyle: "preserve-3d" }}
            className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-[40px] border border-white/[0.12] bg-[#060912] shadow-[0_24px_80px_rgba(0,0,0,0.8),0_0_0_1px_rgba(255,255,255,0.05)]"
          >
            {/* Header */}
            <div className="relative overflow-hidden border-b border-white/[0.08] bg-white/[0.02] px-8 py-7">
              <div className="pointer-events-none absolute inset-0">
                <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-cyan-500/10 blur-[80px]" />
                <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-violet-500/10 blur-[80px]" />
              </div>
              <div className="relative flex items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <Badge className={`${badgeBase} border-cyan-400/20 bg-cyan-500/10 text-cyan-200`}>
                      Payment Term
                    </Badge>
                    <Badge className={`${badgeBase} border-emerald-400/20 bg-emerald-500/10 text-emerald-200`}>
                      {editingRow ? "Edit Mode" : "Create Mode"}
                    </Badge>
                  </div>
                  <div className="mt-5 text-3xl font-bold tracking-tight text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)]">
                    {editingRow ? "Edit Payment Term" : "Create Payment Term"}
                  </div>
                  <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-500">
                    Create reusable commercial payment terms for quotations, proforma invoices, invoices, vendor quotations, purchase orders, and vendor records.
                  </p>
                </div>
                <motion.button
                  type="button"
                  onClick={onClose}
                  whileHover={{ rotate: 90, scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/[0.1] bg-white/[0.04] text-white transition hover:bg-white/[0.1] hover:border-white/20"
                >
                  <X className="h-5 w-5" />
                </motion.button>
              </div>
            </div>

            {/* Body */}
            <div className="space-y-8 overflow-y-auto p-8">
              {/* Payment Structure */}
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className={`${glassSurface} ${glassSurfaceHover}`}
              >
                <div className="border-b border-white/[0.06] px-6 py-5">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-500/10 text-cyan-300 shadow-[0_0_20px_rgba(6,182,212,0.15)]">
                      <WalletCards className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                        Payment Structure
                      </div>
                      <p className="mt-1 text-xs text-slate-600">
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
                        whileHover={{ y: -6, scale: 1.02, transition: { duration: 0.2 } }}
                        whileTap={{ scale: 0.98 }}
                        transition={{ type: "spring", stiffness: 360, damping: 22 }}
                        className={`rounded-[24px] border p-6 text-left transition-all duration-500 ${optionToneClass(
                          option.tone,
                          form.term_type === option.value
                        )}`}
                      >
                        <div className="text-base font-bold">{option.label}</div>
                        <div className="mt-2 text-xs leading-5 opacity-70">{option.description}</div>
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
                              onChange={(event) => onChange("deposit_percentage", event.target.value)}
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
                        <div className="rounded-[20px] border border-emerald-400/20 bg-gradient-to-r from-emerald-500/10 to-emerald-600/5 p-5 shadow-[0_0_20px_rgba(16,185,129,0.1)]">
                          <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-300/80">
                            Balance Auto-Calculated
                          </div>
                          <p className="mt-2 text-sm leading-6 text-emerald-200/70">
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
                            onChange={(event) => onChange("custom_label", event.target.value)}
                            placeholder="Example: 30/40/30 Milestone Payments"
                            className={inputGlass}
                          />
                        </label>
                        <label className="grid gap-3">
                          <span className={labelGlass}>Custom Document Wording</span>
                          <textarea
                            value={form.custom_terms_text}
                            onChange={(event) => onChange("custom_terms_text", event.target.value)}
                            placeholder="Example: 30% deposit, 40% before shipment, 30% after installation."
                            className={textareaGlass}
                          />
                        </label>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </div>
              </motion.section>

              {/* Auto Preview */}
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className={`${glassSurface} ${glassSurfaceHover}`}
              >
                <div className="border-b border-white/[0.06] px-6 py-5">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-violet-400/20 bg-violet-500/10 text-violet-300 shadow-[0_0_20px_rgba(139,92,246,0.15)]">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                        Auto Preview
                      </div>
                      <p className="mt-1 text-xs text-slate-600">
                        Code, name, and document wording generated from the selected structure.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="grid gap-5 p-6 md:grid-cols-2">
                  <motion.div layout className="rounded-[20px] border border-cyan-400/15 bg-cyan-500/[0.07] p-5 shadow-[0_0_20px_rgba(6,182,212,0.08)]">
                    <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-cyan-300/70">Generated Code</div>
                    <div className="mt-3 break-words text-base font-bold text-cyan-100">{generatedTerm.code}</div>
                  </motion.div>
                  <motion.div layout className="rounded-[20px] border border-emerald-400/15 bg-emerald-500/[0.07] p-5 shadow-[0_0_20px_rgba(16,185,129,0.08)]">
                    <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-300/70">Generated Name</div>
                    <div className="mt-3 break-words text-base font-bold text-white">{generatedTerm.name}</div>
                  </motion.div>
                  <motion.div layout className="rounded-[20px] border border-violet-400/15 bg-violet-500/[0.07] p-5 shadow-[0_0_20px_rgba(139,92,246,0.08)] md:col-span-2">
                    <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-violet-300/70">Document Wording</div>
                    <p className="mt-3 text-sm leading-6 text-violet-200/70">{generatedTerm.documentTermsText}</p>
                  </motion.div>
                </div>
              </motion.section>

              {/* Term Controls */}
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className={`${glassSurface} ${glassSurfaceHover}`}
              >
                <div className="border-b border-white/[0.06] px-6 py-5">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-500/10 text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.15)]">
                      <ShieldCheck className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                        Term Controls
                      </div>
                      <p className="mt-1 text-xs text-slate-600">
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
                      tone="cyan"
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
                    className="rounded-[20px] border border-rose-400/20 bg-rose-500/10 px-5 py-4 text-sm text-rose-200 shadow-[0_0_20px_rgba(244,63,94,0.1)]"
                  >
                    {error}
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="flex flex-col gap-3 border-t border-white/[0.06] bg-white/[0.02] px-8 py-6 sm:flex-row sm:justify-end">
              <MagneticButton onClick={onClose} variant="secondary">
                Cancel
              </MagneticButton>
              <MagneticButton
                onClick={onSave}
                disabled={saving || !canSave}
                variant="primary"
                className={saving ? "opacity-70" : ""}
              >
                {saving ? "Saving..." : editingRow ? "Save Changes" : "Create Payment Term"}
              </MagneticButton>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

/* ─── Main Page ─── */

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
      if (!silent) setRows([]);
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load payment terms."
      );
    } finally {
      if (silent) setBackgroundRefreshing(false);
      else setInitialLoading(false);
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

  const activeRows = useMemo(() => rows.filter((row) => row.status !== "archived"), [rows]);
  const archivedRows = useMemo(() => rows.filter((row) => row.status === "archived"), [rows]);
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
    setForm((current) => ({ ...current, [key]: value }));
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
    <div className="relative min-h-screen overflow-x-hidden bg-[#03050a] px-4 py-6 text-white md:px-8 md:py-8">
      {/* Ambient Background */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div style={ambientOrb("rgba(6,182,212,0.4)", "10%", "15%", "500px", 0)} />
        <div style={ambientOrb("rgba(139,92,246,0.35)", "60%", "70%", "600px", 2)} />
        <div style={ambientOrb("rgba(16,185,129,0.25)", "30%", "80%", "400px", 4)} />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJhIiB4PSIwIiB5PSIwIj48ZmVUdXJidWxlbmNlIHR5cGU9ImZyYWN0YWxOb2lzZSIgYmFzZUZyZXF1ZW5jeT0iLjc1IiBzdGl0Y2hUaWxlcz0ic3RpdGNoIi8+PGZlQ29sb3JNYXRyaXggdHlwZT0ic2F0dXJhdGUiIHZhbHVlcz0iMCIvPjwvZmlsdGVyPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbHRlcj0idXJsKCNhKSIgb3BhY2l0eT0iMC4wNCIvPjwvc3ZnPg==')] opacity-50" />
      </div>

      <style>{`
        @keyframes floatOrb {
          0% { transform: translate(0, 0) scale(1); }
          100% { transform: translate(30px, -30px) scale(1.1); }
        }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
      `}</style>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 mx-auto flex w-full max-w-[1600px] flex-col gap-8"
      >
        {/* Hero Header */}
        <motion.section
          initial={{ opacity: 0, y: 30, rotateX: 10 }}
          animate={{ opacity: 1, y: 0, rotateX: 0 }}
          transition={{ duration: 0.8, type: "spring", stiffness: 80 }}
          style={{ perspective: 1000 }}
          className={`${glassSurface} ${glassSurfaceHover} p-8`}
        >
          <div className="pointer-events-none absolute inset-0 rounded-[32px] bg-[radial-gradient(circle_at_20%_50%,rgba(6,182,212,0.08),transparent_50%),radial-gradient(circle_at_80%_50%,rgba(139,92,246,0.06),transparent_50%)]" />
          <div className="relative">
            <motion.button
              type="button"
              onClick={() => navigate("/finance/master-data")}
              whileHover={{ x: -4, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.04] px-5 py-2.5 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400 transition hover:border-white/[0.14] hover:bg-white/[0.08] hover:text-white"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Master Data
            </motion.button>

            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <Badge className={`${badgeBase} border-cyan-400/20 bg-cyan-500/10 text-cyan-200`}>
                    Finance Master Data
                  </Badge>
                  <Badge className={`${badgeBase} border-violet-400/20 bg-violet-500/10 text-violet-200`}>
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
                        <Badge className={`${badgeBase} border-emerald-400/20 bg-emerald-500/10 text-emerald-200`}>
                          <span className="mr-2 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                          Updating
                        </Badge>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </div>

                <h1 className="mt-6 text-5xl font-black tracking-tight text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.1)]">
                  Payment Terms
                </h1>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-500">
                  Manage reusable payment terms used across customer and vendor finance documents. 
                  Terms control document wording, due logic, deposit rules, default selection, and partial payment behavior.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <MagneticButton onClick={() => setArchiveOpen(true)} variant="secondary">
                  <Archive className="mr-2 h-4 w-4" />
                  Archive
                </MagneticButton>
                <MagneticButton onClick={openCreateDialog} disabled={!canCreate} variant="primary">
                  <Plus className="mr-2 h-4 w-4" />
                  New Payment Term
                </MagneticButton>
              </div>
            </div>
          </div>
        </motion.section>

        {/* Stats Grid */}
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

        {/* Messages */}
        <AnimatePresence mode="wait">
          {pageMessage ? (
            <motion.div
              key="page-message"
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.98 }}
              className={`${glassSurface} border-emerald-400/20 bg-emerald-500/[0.08] px-6 py-4 text-sm text-emerald-200 shadow-[0_0_30px_rgba(16,185,129,0.1)]`}
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
              className={`${glassSurface} border-rose-400/20 bg-rose-500/[0.08] px-6 py-4 text-sm text-rose-200 shadow-[0_0_30px_rgba(244,63,94,0.1)]`}
            >
              {error}
            </motion.div>
          ) : null}
        </AnimatePresence>

        {/* Data Table */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className={`${glassSurface} ${glassSurfaceHover}`}
        >
          <div className="border-b border-white/[0.06] px-6 py-5">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                  Payment Terms Registry
                </div>
                <p className="mt-1 text-xs text-slate-600">
                  Active and inactive terms. Archived records are managed from the archive.
                </p>
              </div>
              <div className="flex flex-col gap-3 md:flex-row md:items-center">
                <div className="relative group">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600 transition group-focus-within:text-cyan-400" />
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search payment terms..."
                    className={`${inputGlass} md:w-[320px] pl-11`}
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
                  className={selectGlass}
                >
                  <option value="all" className="bg-[#0a0e1a]">All Statuses</option>
                  <option value="active" className="bg-[#0a0e1a]">Active</option>
                  <option value="inactive" className="bg-[#0a0e1a]">Inactive</option>
                </select>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto custom-scrollbar">
            <div className="max-h-[720px] overflow-y-auto custom-scrollbar">
              <table className="w-full min-w-[1240px] border-collapse">
                <thead className="sticky top-0 z-10 border-b border-white/[0.08] bg-[#03050a]/80 text-left text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 backdrop-blur-xl">
                  <tr>
                    {[
                      { key: "code" as SortKey, label: "Code" },
                      { key: "name" as SortKey, label: "Name" },
                      { key: "term_type" as SortKey, label: "Type" },
                      { key: "due_days" as SortKey, label: "Due Days" },
                      { key: null, label: "Deposit" },
                      { key: null, label: "Document Wording" },
                      { key: "status" as SortKey, label: "Status" },
                      { key: "updated_at" as SortKey, label: "Updated" },
                      { key: null, label: "Actions" },
                    ].map((col) => (
                      <th key={col.label} className="px-5 py-4">
                        {col.key ? (
                          <button
                            type="button"
                            onClick={() => updateSort(col.key!)}
                            className="flex items-center gap-1.5 transition hover:text-white"
                          >
                            {col.label}
                            <span className="text-cyan-400/60">{sortLabel(col.key)}</span>
                          </button>
                        ) : (
                          col.label
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {initialLoading ? (
                    <tr>
                      <td colSpan={9} className="px-5 py-16 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-400/20 border-t-cyan-400" />
                          <span className="text-sm text-slate-600">Loading payment terms...</span>
                        </div>
                      </td>
                    </tr>
                  ) : sortedRows.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-5 py-16 text-center text-sm text-slate-600">
                        No payment terms match the current filters.
                      </td>
                    </tr>
                  ) : (
                    sortedRows.map((row, index) => (
                      <motion.tr
                        key={row.id}
                        layout
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -12 }}
                        transition={{ delay: index * 0.03, duration: 0.3 }}
                        whileHover={{ scale: 1.005, backgroundColor: "rgba(255,255,255,0.03)" }}
                        className="group border-b border-white/[0.04] text-sm text-slate-300 transition-colors duration-300"
                      >
                        <td className="px-5 py-4">
                          <div className="font-mono text-xs font-bold text-cyan-300/80 tracking-wider">
                            {row.code}
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="font-bold text-white">{row.name}</div>
                          {row.is_default ? (
                            <div className="mt-1.5 inline-flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-300">
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
                          <div className="flex items-center gap-2 text-slate-400">
                            <Clock3 className="h-4 w-4 text-slate-600" />
                            <span className="font-mono text-sm">{row.due_days}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          {row.requires_deposit ? (
                            <div>
                              <div className="text-sm font-bold text-amber-200">
                                {row.deposit_percentage ?? 0}%
                              </div>
                              <div className="mt-1 text-[11px] text-slate-600">
                                {formatBasisLabel(row.deposit_due_basis)}
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-700">No deposit</span>
                          )}
                        </td>
                        <td className="max-w-[360px] px-5 py-4">
                          <p className="line-clamp-2 text-sm leading-6 text-slate-500 group-hover:text-slate-400 transition-colors">
                            {row.document_terms_text || row.document_label || "—"}
                          </p>
                        </td>
                        <td className="px-5 py-4">
                          <Badge className={statusBadgeClass(row.status)}>
                            {formatStatusLabel(row.status)}
                          </Badge>
                        </td>
                        <td className="px-5 py-4 text-xs text-slate-600 font-mono">
                          {formatDateLabel(row.updated_at)}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex justify-end gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => openEditDialog(row)}
                                disabled={!canEdit}
                                className="h-9 rounded-xl border-white/[0.08] bg-white/[0.04] px-3 text-xs text-white hover:bg-white/[0.1] hover:border-white/[0.14] disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                <Edit3 className="mr-2 h-3.5 w-3.5" />
                                Edit
                              </Button>
                            </motion.div>
                            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => handleArchive(row)}
                                disabled={!canArchive || actionLoadingId === row.id}
                                className="h-9 rounded-xl border-amber-400/15 bg-amber-500/10 px-3 text-xs text-amber-200 hover:bg-amber-500/15 hover:border-amber-400/25 disabled:cursor-not-allowed disabled:opacity-40"
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

      {/* Archive Modal */}
      <AnimatePresence>
        {archiveOpen ? (
          <motion.div
            key="archive-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center bg-black/90 p-4 backdrop-blur-[60px]"
            style={{ perspective: 1200 }}
          >
            <motion.div
              key="archive-modal"
              initial={{ opacity: 0, y: 50, rotateX: 8, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, rotateX: 0, scale: 1 }}
              exit={{ opacity: 0, y: 30, rotateX: -4, scale: 0.96 }}
              transition={{ type: "spring", stiffness: 200, damping: 25 }}
              style={{ transformStyle: "preserve-3d" }}
              className="flex max-h-[88vh] w-full max-w-6xl flex-col overflow-hidden rounded-[40px] border border-white/[0.1] bg-[#060912] shadow-[0_24px_80px_rgba(0,0,0,0.8)]"
            >
              <div className="relative border-b border-white/[0.06] bg-white/[0.02] px-8 py-7">
                <div className="pointer-events-none absolute inset-0">
                  <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-violet-500/10 blur-[80px]" />
                </div>
                <div className="relative flex items-start justify-between gap-4">
                  <div>
                    <Badge className={`${badgeBase} border-violet-400/20 bg-violet-500/10 text-violet-200`}>
                      Archive
                    </Badge>
                    <h2 className="mt-5 text-3xl font-bold tracking-tight text-white">
                      Archived Payment Terms
                    </h2>
                    <p className="mt-2 text-sm text-slate-500">
                      Restore archived terms or permanently delete records when allowed.
                    </p>
                  </div>
                  <motion.button
                    type="button"
                    onClick={() => setArchiveOpen(false)}
                    whileHover={{ rotate: 90, scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/[0.1] bg-white/[0.04] text-white transition hover:bg-white/[0.1]"
                  >
                    <X className="h-5 w-5" />
                  </motion.button>
                </div>
              </div>

              <div className="border-b border-white/[0.06] px-8 py-4">
                <Badge className={`${badgeBase} border-violet-400/20 bg-violet-500/10 text-violet-200`}>
                  {archivedRows.length} Records
                </Badge>
              </div>

              <div className="overflow-x-auto custom-scrollbar">
                <div className="max-h-[620px] overflow-y-auto custom-scrollbar">
                  <table className="w-full min-w-[980px] border-collapse">
                    <thead className="sticky top-0 z-10 border-b border-white/[0.08] bg-[#03050a]/80 text-left text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 backdrop-blur-xl">
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
                          <td colSpan={5} className="px-5 py-16 text-center text-sm text-slate-600">
                            No archived payment terms.
                          </td>
                        </tr>
                      ) : (
                        archivedRows.map((row, index) => (
                          <motion.tr
                            key={row.id}
                            layout
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -12 }}
                            transition={{ delay: index * 0.04 }}
                            whileHover={{ backgroundColor: "rgba(255,255,255,0.03)" }}
                            className="border-b border-white/[0.04] text-sm text-slate-300 transition-colors"
                          >
                            <td className="px-5 py-4">
                              <span className="font-mono text-xs font-bold text-cyan-300/70 tracking-wider">
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
                            <td className="px-5 py-4 text-xs text-slate-600 font-mono">
                              {formatDateLabel(row.updated_at)}
                            </td>
                            <td className="px-5 py-4">
                              <div className="flex justify-end gap-2">
                                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => handleRestore(row)}
                                    disabled={!canArchive || actionLoadingId === row.id}
                                    className="h-9 rounded-xl border-emerald-400/15 bg-emerald-500/10 px-3 text-xs text-emerald-200 hover:bg-emerald-500/15 hover:border-emerald-400/25 disabled:cursor-not-allowed disabled:opacity-40"
                                  >
                                    <Undo2 className="mr-2 h-3.5 w-3.5" />
                                    Restore
                                  </Button>
                                </motion.div>
                                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => handlePermanentDelete(row)}
                                    disabled={!canDelete || actionLoadingId === row.id}
                                    className="h-9 rounded-xl border-rose-400/15 bg-rose-500/10 px-3 text-xs text-rose-200 hover:bg-rose-500/15 hover:border-rose-400/25 disabled:cursor-not-allowed disabled:opacity-40"
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
