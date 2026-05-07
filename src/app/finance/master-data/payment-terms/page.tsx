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

/* ─── AWARD-WINNING VISUAL TOKENS ─── */
const glassSurface = "relative overflow-hidden rounded-[36px] border border-white/[0.09] bg-white/[0.02] backdrop-blur-[50px] shadow-[0_12px_60px_rgba(0,0,0,0.55),inset_0_1px_1px_rgba(255,255,255,0.08)]";
const glassSurfaceHover = "hover:border-white/[0.15] hover:bg-white/[0.04] hover:shadow-[0_18px_72px_rgba(0,0,0,0.65),inset_0_1px_1px_rgba(255,255,255,0.12)] transition-all duration-600";
const cinematicButton = "relative overflow-hidden rounded-2xl font-medium tracking-wide transition-all duration-300 before:absolute before:inset-0 before:-translate-x-full before:bg-gradient-to-r before:from-transparent before:via-white/25 before:to-transparent before:transition-transform before:duration-700 hover:before:translate-x-full";
const inputGlass = "h-12 w-full rounded-2xl border border-white/[0.09] bg-black/40 px-4 text-sm text-white outline-none transition-all duration-300 placeholder:text-slate-600 focus:border-white/25 focus:bg-black/50 focus:shadow-[0_0_35px_rgba(6,182,212,0.25)] focus:ring-1 focus:ring-cyan-400/40 disabled:cursor-not-allowed disabled:opacity-50";
const selectGlass = "h-12 w-full rounded-2xl border border-white/[0.09] bg-black/40 px-4 text-sm text-white outline-none transition-all duration-300 focus:border-white/25 focus:bg-black/50 focus:shadow-[0_0_35px_rgba(6,182,212,0.25)] focus:ring-1 focus:ring-cyan-400/40 disabled:cursor-not-allowed disabled:opacity-50";
const textareaGlass = "min-h-[140px] w-full resize-none rounded-2xl border border-white/[0.09] bg-black/40 px-4 py-3 text-sm text-white outline-none transition-all duration-300 placeholder:text-slate-600 focus:border-white/25 focus:bg-black/50 focus:shadow-[0_0_35px_rgba(6,182,212,0.25)] focus:ring-1 focus:ring-cyan-400/40 disabled:cursor-not-allowed disabled:opacity-50";
const labelGlass = "text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400";
const badgeBase = "rounded-full border px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.22em] shadow-none backdrop-blur-md";

function statusBadgeClass(status: FinancePaymentTermStatus) {
  if (status === "archived") return `${badgeBase} border-rose-500/35 bg-rose-500/15 text-rose-200`;
  if (status === "inactive") return `${badgeBase} border-amber-500/35 bg-amber-500/15 text-amber-200`;
  return `${badgeBase} border-emerald-500/35 bg-emerald-500/15 text-emerald-200`;
}

function termTypeBadgeClass(type: FinancePaymentTermType) {
  if (type === "immediate") return `${badgeBase} border-emerald-500/35 bg-emerald-500/15 text-emerald-200`;
  if (type === "deposit_balance") return `${badgeBase} border-amber-500/35 bg-amber-500/15 text-amber-200`;
  if (type === "custom") return `${badgeBase} border-violet-500/35 bg-violet-500/15 text-violet-200`;
  return `${badgeBase} border-cyan-500/35 bg-cyan-500/15 text-cyan-200`;
}

const toneGradients = {
  cyan: "from-cyan-400/25 to-cyan-600/8 border-cyan-400/35 text-cyan-100 shadow-[0_0_40px_rgba(6,182,212,0.22)]",
  emerald: "from-emerald-400/25 to-emerald-600/8 border-emerald-400/35 text-emerald-100 shadow-[0_0_40px_rgba(16,185,129,0.22)]",
  amber: "from-amber-400/25 to-amber-600/8 border-amber-400/35 text-amber-100 shadow-[0_0_40px_rgba(245,158,11,0.22)]",
  violet: "from-violet-400/25 to-violet-600/8 border-violet-400/35 text-violet-100 shadow-[0_0_40px_rgba(139,92,246,0.22)]",
};

const toneGradientsInactive = "from-white/[0.03] to-transparent border-white/[0.09] text-slate-500 hover:border-white/[0.15] hover:from-white/[0.05] hover:text-slate-300 hover:shadow-none";
function optionToneClass(tone: "cyan" | "emerald" | "amber" | "violet", active: boolean) {
  return active ? `bg-gradient-to-br ${toneGradients[tone]}` : `bg-gradient-to-br ${toneGradientsInactive}`;
}

/* ─── 3D CINEMATIC CARD ─── */
function Card3D({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 50, rotateX: 15, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, rotateX: 0, scale: 1 }}
      transition={{ duration: 0.9, delay, type: "spring", stiffness: 120, damping: 22 }}
      whileHover={{ y: -10, rotateX: 3, scale: 1.02, transition: { duration: 0.4 } }}
      style={{ perspective: 1500, transformStyle: "preserve-3d" }}
      className={`${glassSurface} ${glassSurfaceHover} ${className}`}
    >
      <div className="pointer-events-none absolute inset-0 rounded-[36px] bg-[linear-gradient(110deg,transparent_25%,rgba(255,255,255,0.06)_45%,transparent_65%)]" />
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
}

/* ─── MAGNETIC BUTTON ─── */
function MagneticButton({ children, onClick, disabled = false, variant = "primary", className = "" }: {
  children: React.ReactNode; onClick?: () => void; disabled?: boolean;
  variant?: "primary" | "secondary" | "danger" | "ghost"; className?: string;
}) {
  const variants = {
    primary: "border-cyan-400/35 bg-cyan-500/20 text-cyan-100 hover:bg-cyan-500/30 hover:border-cyan-400/60 hover:shadow-[0_0_40px_rgba(6,182,212,0.35)]",
    secondary: "border-white/15 bg-white/[0.08] text-white hover:bg-white/[0.15] hover:border-white/25 hover:shadow-[0_0_30px_rgba(255,255,255,0.1)]",
    danger: "border-rose-400/35 bg-rose-500/20 text-rose-100 hover:bg-rose-500/30 hover:border-rose-400/60 hover:shadow-[0_0_40px_rgba(244,63,94,0.35)]",
    ghost: "border-transparent bg-transparent text-slate-400 hover:text-white hover:bg-white/[0.06]",
  };

  return (
    <motion.button
      type="button" onClick={onClick} disabled={disabled}
      whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.96 }}
      className={`${cinematicButton} h-12 px-6 text-sm font-bold tracking-wide border rounded-2xl backdrop-blur-md transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-40 ${variants[variant]} ${className}`}
    >
      {children}
    </motion.button>
  );
}

/* ─── FORM COMPONENTS ─── */
function SelectField<TValue extends string>({ value, onChange, options }: {
  value: TValue; onChange: (value: TValue) => void; options: Array<{ value: TValue; label: string }>;
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value as TValue)} className={selectGlass}>
      {options.map((o) => (<option key={o.value} value={o.value} className="bg-[#05070e]">{o.label}</option>))}
    </select>
  );
}

function ToggleCard({ checked, title, description, tone, onChange }: {
  checked: boolean; title: string; description: string; tone: "cyan" | "emerald"; onChange: (v: boolean) => void;
}) {
  const activeGrad = tone === "emerald" 
    ? "border-emerald-400/35 bg-gradient-to-br from-emerald-500/20 to-emerald-600/8 shadow-[0_0_35px_rgba(16,185,129,0.22)]"
    : "border-cyan-400/35 bg-gradient-to-br from-cyan-500/20 to-cyan-600/8 shadow-[0_0_35px_rgba(6,182,212,0.22)]";
  
  const dotActive = tone === "emerald"
    ? "border-emerald-300 bg-emerald-400 shadow-[0_0_18px_rgba(16,185,129,0.8)]"
    : "border-cyan-300 bg-cyan-400 shadow-[0_0_18px_rgba(6,182,212,0.8)]";

  return (
    <motion.button
      type="button" onClick={() => onChange(!checked)}
      whileHover={{ y: -5, scale: 1.02 }} whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 20 }}
      className={`rounded-[26px] border p-6 text-left transition-all duration-500 ${
        checked ? activeGrad : "border-white/[0.09] bg-white/[0.03] hover:border-white/[0.15] hover:bg-white/[0.05]"
      }`}
    >
      <div className="flex items-start gap-4">
        <motion.span
          animate={{ scale: checked ? 1.2 : 1 }}
          transition={{ type: "spring", stiffness: 450, damping: 18 }}
          className={`mt-1 block h-5 w-5 rounded-full border-2 transition-all duration-300 ${
            checked ? dotActive : "border-white/25 bg-white/8"
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

/* ─── SUMMARY CARD ─── */
function SummaryCard({ label, value, description, icon: Icon, tone, delay }: {
  label: string; value: string | number; description: string;
  icon: any; tone: "cyan" | "emerald" | "amber" | "violet"; delay: number;
}) {
  const toneMap = {
    cyan: "border-cyan-400/25 bg-cyan-500/15 text-cyan-300 shadow-[0_0_35px_rgba(6,182,212,0.2)]",
    emerald: "border-emerald-400/25 bg-emerald-500/15 text-emerald-300 shadow-[0_0_35px_rgba(16,185,129,0.2)]",
    amber: "border-amber-400/25 bg-amber-500/15 text-amber-300 shadow-[0_0_35px_rgba(245,158,11,0.2)]",
    violet: "border-violet-400/25 bg-violet-500/15 text-violet-300 shadow-[0_0_35px_rgba(139,92,246,0.2)]",
  };

  return (
    <Card3D delay={delay} className="p-7 min-h-[180px] flex flex-col justify-between">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">{label}</div>
          <div className="mt-4 text-4xl font-bold tracking-tight text-white drop-shadow-[0_0_25px_rgba(255,255,255,0.2)]">
            {value}
          </div>
        </div>
        <motion.div
          whileHover={{ rotate: 15, scale: 1.15 }}
          transition={{ type: "spring", stiffness: 300 }}
          className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border ${toneMap[tone]}`}
        >
          <Icon className="h-6 w-6" />
        </motion.div>
      </div>
      <p className="text-xs leading-5 text-slate-500 mt-4">{description}</p>
    </Card3D>
  );
}

/* ─── MODAL ─── */
function PaymentTermFormModal({
  open, editingRow, form, generatedTerm, saving, error, canSave, onClose, onChange, onSave,
}: {
  open: boolean; editingRow: FinancePaymentTermRow | null; form: FormState; generatedTerm: GeneratedTerm;
  saving: boolean; error: string; canSave: boolean; onClose: () => void;
  onChange: <K extends keyof FormState>(key: K, value: FormState[K]) => void; onSave: () => void;
}) {
  const depositPercentage = parsePercentage(form.deposit_percentage) ?? 0;
  const balancePercentage = Math.max(0, 100 - depositPercentage);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/95 p-4 backdrop-blur-[80px]"
          style={{ perspective: 1500 }}
        >
          <motion.div
            initial={{ opacity: 0, y: 80, rotateX: 12, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, rotateX: 0, scale: 1 }}
            exit={{ opacity: 0, y: 60, rotateX: -6, scale: 0.92 }}
            transition={{ type: "spring", stiffness: 180, damping: 28 }}
            style={{ transformStyle: "preserve-3d" }}
            className="flex max-h-[95vh] w-full max-w-6xl flex-col overflow-hidden rounded-[44px] border border-white/[0.15] bg-[#020408] shadow-[0_32px_100px_rgba(0,0,0,0.9),0_0_0_1px_rgba(255,255,255,0.08)]"
          >
            <div className="relative overflow-hidden border-b border-white/[0.08] bg-white/[0.02] px-10 py-8">
              <div className="pointer-events-none absolute inset-0">
                <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-cyan-500/15 blur-[100px]" />
                <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-violet-500/15 blur-[100px]" />
              </div>
              <div className="relative flex items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <Badge className={`${badgeBase} border-cyan-400/25 bg-cyan-500/15 text-cyan-200`}>Payment Term</Badge>
                    <Badge className={`${badgeBase} border-emerald-400/25 bg-emerald-500/15 text-emerald-200`}>{editingRow ? "Edit Mode" : "Create Mode"}</Badge>
                  </div>
                  <div className="mt-6 text-4xl font-bold tracking-tight text-white drop-shadow-[0_4px_20px_rgba(0,0,0,0.6)]">
                    {editingRow ? "Edit Payment Term" : "Create Payment Term"}
                  </div>
                  <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-500">
                    Create reusable commercial payment terms for quotations, proforma invoices, invoices, vendor quotations, purchase orders, and vendor records.
                  </p>
                </div>
                <motion.button
                  type="button" onClick={onClose}
                  whileHover={{ rotate: 90, scale: 1.1 }} whileTap={{ scale: 0.9 }}
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/[0.12] bg-white/[0.06] text-white transition hover:bg-white/[0.12] hover:border-white/25"
                >
                  <X className="h-5 w-5" />
                </motion.button>
              </div>
            </div>

            <div className="space-y-10 overflow-y-auto p-10">
              <motion.section initial={{ opacity:0,y:30 }} animate={{ opacity:1,y:0 }} transition={{ delay:0.05 }} className={`${glassSurface} ${glassSurfaceHover}`}>
                <div className="border-b border-white/[0.08] px-7 py-6">
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-400/25 bg-cyan-500/15 text-cyan-300 shadow-[0_0_35px_rgba(6,182,212,0.2)]">
                      <WalletCards className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="text-xs font-bold uppercase tracking-[0.22em] text-slate-400">Payment Structure</div>
                      <p className="mt-1 text-xs text-slate-600">Choose the commercial structure and generate the controlled term.</p>
                    </div>
                  </div>
                </div>
                <div className="grid gap-7 p-7">
                  <div className="grid gap-5 md:grid-cols-4">
                    {TERM_TYPE_OPTIONS.map((option) => (
                      <motion.button
                        key={option.value} type="button" onClick={() => onChange("term_type", option.value)}
                        whileHover={{ y: -8, scale:1.03 }} whileTap={{ scale:0.97 }}
                        transition={{ type:"spring", stiffness:380, damping:22 }}
                        className={`rounded-[26px] border p-7 text-left transition-all duration-500 ${optionToneClass(option.tone, form.term_type === option.value)}`}
                      >
                        <div className="text-lg font-bold">{option.label}</div>
                        <div className="mt-3 text-xs leading-5 opacity-80">{option.description}</div>
                      </motion.button>
                    ))}
                  </div>

                  <AnimatePresence mode="wait">
                    {form.term_type === "net" && (
                      <motion.label key="net" initial={{ opacity:0,y:15 }} animate={{ opacity:1,y:0 }} exit={{ opacity:0,y:-15 }} className="grid gap-3">
                        <span className={labelGlass}>Net Days</span>
                        <Input type="number" min="0" step="1" value={form.net_days} onChange={(e)=>onChange("net_days",e.target.value)} placeholder="Example: 30" className={inputGlass} />
                      </motion.label>
                    )}

                    {form.term_type === "deposit_balance" && (
                      <motion.div key="deposit" initial={{ opacity:0,y:15 }} animate={{ opacity:1,y:0 }} exit={{ opacity:0,y:-15 }} className="grid gap-7">
                        <div className="grid gap-6 md:grid-cols-3">
                          <label className="grid gap-3"><span className={labelGlass}>Deposit Percentage</span>
                          <Input type="number" min="1" max="99" step="0.01" value={form.deposit_percentage} onChange={(e)=>onChange("deposit_percentage",e.target.value)} placeholder="Example: 30" className={inputGlass} /></label>
                          <label className="grid gap-3"><span className={labelGlass}>Deposit Due</span><SelectField value={form.deposit_due_basis} onChange={(v)=>onChange("deposit_due_basis",v)} options={DEPOSIT_DUE_BASIS_OPTIONS} /></label>
                          <label className="grid gap-3"><span className={labelGlass}>Balance Due</span><SelectField value={form.balance_due_basis} onChange={(v)=>onChange("balance_due_basis",v)} options={BALANCE_DUE_BASIS_OPTIONS} /></label>
                        </div>
                        <div className="rounded-[22px] border border-emerald-400/25 bg-gradient-to-r from-emerald-500/15 to-emerald-600/8 p-6 shadow-[0_0_35px_rgba(16,185,129,0.18)]">
                          <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-emerald-300/80">Balance Auto-Calculated</div>
                          <p className="mt-3 text-sm leading-6 text-emerald-200/80">Deposit is {depositPercentage}%. Balance is {balancePercentage}%.</p>
                        </div>
                      </motion.div>
                    )}

                    {form.term_type === "custom" && (
                      <motion.div key="custom" initial={{ opacity:0,y:15 }} animate={{ opacity:1,y:0 }} exit={{ opacity:0,y:-15 }} className="grid gap-6">
                        <label className="grid gap-3"><span className={labelGlass}>Custom Label</span>
                        <Input value={form.custom_label} onChange={(e)=>onChange("custom_label",e.target.value)} placeholder="Example: 30/40/30 Milestone Payments" className={inputGlass} /></label>
                        <label className="grid gap-3"><span className={labelGlass}>Custom Document Wording</span>
                        <textarea value={form.custom_terms_text} onChange={(e)=>onChange("custom_terms_text",e.target.value)} placeholder="Example: 30% deposit, 40% before shipment, 30% after installation." className={textareaGlass} /></label>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.section>

              <motion.section initial={{ opacity:0,y:30 }} animate={{ opacity:1,y:0 }} transition={{ delay:0.1 }} className={`${glassSurface} ${glassSurfaceHover}`}>
                <div className="border-b border-white/[0.08] px-7 py-6">
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-violet-400/25 bg-violet-500/15 text-violet-300 shadow-[0_0_35px_rgba(139,92,246,0.2)]">
                      <FileText className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="text-xs font-bold uppercase tracking-[0.22em] text-slate-400">Auto Preview</div>
                      <p className="mt-1 text-xs text-slate-600">Code, name, and document wording generated from the selected structure.</p>
                    </div>
                  </div>
                </div>
                <div className="grid gap-6 p-7 md:grid-cols-2">
                  <motion.div layout className="rounded-[22px] border border-cyan-400/20 bg-cyan-500/[0.1] p-6 shadow-[0_0_35px_rgba(6,182,212,0.12)]">
                    <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-cyan-300/80">Generated Code</div>
                    <div className="mt-4 break-words text-lg font-bold text-cyan-100">{generatedTerm.code}</div>
                  </motion.div>
                  <motion.div layout className="rounded-[22px] border border-emerald-400/20 bg-emerald-500/[0.1] p-6 shadow-[0_0_35px_rgba(16,185,129,0.12)]">
                    <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-emerald-300/80">Generated Name</div>
                    <div className="mt-4 break-words text-lg font-bold text-white">{generatedTerm.name}</div>
                  </motion.div>
                  <motion.div layout className="rounded-[22px] border border-violet-400/20 bg-violet-500/[0.1] p-6 shadow-[0_0_35px_rgba(139,92,246,0.12)] md:col-span-2">
                    <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-violet-300/80">Document Wording</div>
                    <p className="mt-4 text-sm leading-7 text-violet-200/80">{generatedTerm.documentTermsText}</p>
                  </motion.div>
                </div>
              </motion.section>

              <motion.section initial={{ opacity:0,y:30 }} animate={{ opacity:1,y:0 }} transition={{ delay:0.15 }} className={`${glassSurface} ${glassSurfaceHover}`}>
                <div className="border-b border-white/[0.08] px-7 py-6">
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-400/25 bg-emerald-500/15 text-emerald-300 shadow-[0_0_35px_rgba(16,185,129,0.2)]">
                      <ShieldCheck className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="text-xs font-bold uppercase tracking-[0.22em] text-slate-400">Term Controls</div>
                      <p className="mt-1 text-xs text-slate-600">Default behavior, partial payments, status, and internal notes.</p>
                    </div>
                  </div>
                </div>
                <div className="grid gap-7 p-7">
                  <div className="grid gap-6 md:grid-cols-2">
                    <ToggleCard checked={form.is_default} title="Default Term" description="Use this as the default option when no term is selected." tone="emerald" onChange={(v)=>onChange("is_default",v)} />
                    <ToggleCard checked={form.allow_partial_payments} title="Allow Partial Payments" description="Lets documents using this term receive partial payments." tone="cyan" onChange={(v)=>onChange("allow_partial_payments",v)} />
                  </div>
                  <div className="grid gap-6 md:grid-cols-2">
                    <label className="grid gap-3"><span className={labelGlass}>Internal Notes</span>
                    <Input value={form.notes} onChange={(e)=>onChange("notes",e.target.value)} placeholder="Optional internal notes" className={inputGlass} /></label>
                    <label className="grid gap-3"><span className={labelGlass}>Status</span>
                    <SelectField value={form.status} onChange={(v)=>onChange("status",v)} options={[{value:"active",label:"Active"},{value:"inactive",label:"Inactive"},{value:"archived",label:"Archived"}]} /></label>
                  </div>
                </div>
              </motion.section>

              <AnimatePresence>
                {error && (
                  <motion.div key="error" initial={{ opacity:0,y:12 }} animate={{ opacity:1,y:0 }} exit={{ opacity:0,y:-12 }} className={`${glassSurface} border-rose-400/25 bg-rose-500/15 px-6 py-5 text-sm text-rose-200 shadow-[0_0_35px_rgba(244,63,94,0.15)]`}>{error}</motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="flex flex-col gap-4 border-t border-white/[0.08] bg-white/[0.02] px-10 py-8 sm:flex-row sm:justify-end">
              <MagneticButton onClick={onClose} variant="secondary">Cancel</MagneticButton>
              <MagneticButton onClick={onSave} disabled={saving || !canSave} variant="primary" className={saving?"opacity-70":""}>
                {saving ? "Saving..." : editingRow ? "Save Changes" : "Create Payment Term"}
              </MagneticButton>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ─── MAIN COMPETITION PAGE ─── */
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
  const [permissionOverrides, setPermissionOverrides] = useState<Partial<Record<Permission, boolean>> | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<FinancePaymentTermRow | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [error, setError] = useState("");
  const [pageMessage, setPageMessage] = useState("");
  const generatedTerm = useMemo(() => buildGeneratedTerm(form), [form]);

  const loadPage = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent === true;
    silent ? setBackgroundRefreshing(true) : setInitialLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.id) {
        const { data: profile } = await supabase.from("profiles").select("role, permissions").eq("user_id", user.id).maybeSingle();
        if (profile) { const typed = profile as ProfilePermissionRow; setRole(typed.role); setPermissionOverrides(typed.permissions||null); }
      }
      setRows(await getPaymentTerms());
    } catch (err) { console.error(err); setError(err instanceof Error ? err.message : "Failed to load"); }
    finally { silent ? setBackgroundRefreshing(false) : setInitialLoading(false); }
  }, []);

  useEffect(() => { void loadPage(); }, [loadPage]);
  useEffect(() => {
    const ch = supabase.channel("finance-payment-terms").on("postgres_changes",{event:"*",schema:"public",table:"finance_payment_terms"},()=>void loadPage({silent:true})).subscribe();
    const iv = setInterval(()=>void loadPage({silent:true}),60000);
    return () => { clearInterval(iv); void supabase.removeChannel(ch); };
  },[loadPage]);

  const permissions = useMemo(()=>role?getEffectivePermissions(role,permissionOverrides):null,[permissionOverrides,role]);
  const canCreate = !!permissions?.createFinanceRecords;
  const canEdit = !!permissions?.editFinanceRecords;
  const canArchive = !!permissions?.archiveFinanceRecords;
  const canDelete = canArchive;

  const activeRows = useMemo(()=>rows.filter(r=>r.status!=="archived"),[rows]);
  const archivedRows = useMemo(()=>rows.filter(r=>r.status==="archived"),[rows]);
  const defaultRow = useMemo(()=>rows.find(r=>r.is_default&&r.status==="active")??null,[rows]);
  
  const stats = useMemo(()=>({
    total:rows.length,active:rows.filter(r=>r.status==="active").length,
    deposit:rows.filter(r=>r.requires_deposit).length,
    defaultTerm:defaultRow?.document_label??defaultRow?.name??"Not Set",
    partial:rows.filter(r=>r.allow_partial_payments).length,archived:archivedRows.length
  }),[archivedRows.length,defaultRow,rows]);

  const filteredRows = useMemo(()=>{
    const q = search.trim().toLowerCase();
    return activeRows.filter(r=> (statusFilter==="all"||r.status===statusFilter) && (!q||r.name.toLowerCase().includes(q)||r.code.toLowerCase().includes(q)||r.term_type.toLowerCase().includes(q)||(r.document_label??"").toLowerCase().includes(q)||(r.document_terms_text??"").toLowerCase().includes(q)||(r.notes??"").toLowerCase().includes(q)));
  },[activeRows,search,statusFilter]);

  const sortedRows = useMemo(()=>{
    const s = [...filteredRows];
    s.sort((a,b)=>{
      const d = sortDirection==="asc"?1:-1;
      if(sortKey==="updated_at") return (new Date(a.updated_at??"").getTime()-new Date(b.updated_at??"").getTime())*d;
      if(sortKey==="due_days") return (a.due_days-b.due_days)*d;
      return String(a[sortKey]??"").localeCompare(String(b[sortKey]??""))*d;
    });
    return s;
  },[filteredRows,sortDirection,sortKey]);

  const updateSort = (k:SortKey)=>{sortKey===k?setSortDirection(c=>c==="asc"?"desc":"asc"):(setSortKey(k),setSortDirection(k==="updated_at"?"desc":"asc"));};
  const sortLabel = (k:SortKey)=>sortKey!==k?"":sortDirection==="asc"?" ↑":" ↓";
  const updateForm = <K extends keyof FormState>(k:K,v:FormState[K])=>setForm(c=>({...c,[k]:v}));
  
  const openCreate = ()=>{setEditingRow(null);setForm(EMPTY_FORM);setError("");setPageMessage("");setDialogOpen(true);};
  const openEdit = (r:FinancePaymentTermRow)=>{
    setEditingRow(r);
    if(r.term_type==="immediate")setForm({...EMPTY_FORM,term_type:"immediate",net_days:"0",is_default:r.is_default,status:r.status,notes:r.notes??"",allow_partial_payments:r.allow_partial_payments});
    else if(r.term_type==="net")setForm({...EMPTY_FORM,term_type:"net",net_days:String(r.due_days),is_default:r.is_default,status:r.status,notes:r.notes??"",allow_partial_payments:r.allow_partial_payments});
    else if(r.term_type==="deposit_balance")setForm({...EMPTY_FORM,term_type:"deposit_balance",deposit_percentage:r.deposit_percentage===null?"30":String(r.deposit_percentage),deposit_due_basis:r.deposit_due_basis??"before_production",balance_due_basis:r.balance_due_basis??"before_shipment",is_default:r.is_default,status:r.status,notes:r.notes??"",allow_partial_payments:r.allow_partial_payments});
    else setForm({...EMPTY_FORM,term_type:"custom",custom_label:r.document_label??r.name,custom_terms_text:r.document_terms_text??"",is_default:r.is_default,status:r.status,notes:r.notes??"",allow_partial_payments:r.allow_partial_payments});
    setError("");setPageMessage("");setDialogOpen(true);
  };

  const handleSave = async ()=>{
    if(!(editingRow?canEdit:canCreate))return;
    const n = parseWholeNumber(form.net_days); const p = parsePercentage(form.deposit_percentage);
    if(form.term_type==="net"&&n===null){setError("Net days must be valid");return;}
    if(form.term_type==="deposit_balance"&&p===null){setError("Deposit percentage invalid");return;}
    if(form.term_type==="custom"&&!form.custom_label.trim()){setError("Custom label required");return;}
    if(form.term_type==="custom"&&!form.custom_terms_text.trim()){setError("Custom wording required");return;}
    try{setSaving(true);setError("");setPageMessage("");
      const payload = {code:generatedTerm.code,name:generatedTerm.name,due_days:generatedTerm.dueDays,status:form.status,is_default:form.is_default,notes:form.notes,term_type:form.term_type,due_basis:DEFAULT_DUE_BASIS,requires_deposit:generatedTerm.requiresDeposit,deposit_percentage:generatedTerm.depositPercentage,deposit_due_basis:generatedTerm.depositDueBasis,balance_due_basis:generatedTerm.balanceDueBasis,balance_due_days:generatedTerm.balanceDueDays,document_label:generatedTerm.documentLabel,document_terms_text:generatedTerm.documentTermsText,allow_partial_payments:form.allow_partial_payments,requires_approval:false,applies_to:DEFAULT_APPLIES_TO};
      editingRow ? await updatePaymentTerm(editingRow.id,payload) : await createPaymentTerm(payload);
      setPageMessage(editingRow?"Updated":"Created");setDialogOpen(false);void loadPage({silent:true});
    }catch(err){console.error(err);setError(err instanceof Error?err.message:"Save failed");}finally{setSaving(false);}
  };

  const handleArchive = async (r:FinancePaymentTermRow)=>{if(!canArchive)return;try{setActionLoadingId(r.id);await archivePaymentTerm(r.id);setPageMessage("Archived");void loadPage({silent:true});}catch(err){setError("Archive failed");}finally{setActionLoadingId(null);}};
  const handleRestore = async (r:FinancePaymentTermRow)=>{if(!canArchive)return;try{setActionLoadingId(r.id);await restorePaymentTerm(r.id);setPageMessage("Restored");void loadPage({silent:true});}catch(err){setError("Restore failed");}finally{setActionLoadingId(null);}};
  const handleDelete = async (r:FinancePaymentTermRow)=>{if(!canDelete)return;try{setActionLoadingId(r.id);await permanentlyDeletePaymentTerm(r.id);setPageMessage("Deleted");void loadPage({silent:true});}catch(err){setError("Delete failed");}finally{setActionLoadingId(null);}};

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#010205] px-4 py-8 text-white md:px-10 md:py-12">
      {/* 🔥 CINEMATIC PARTICLE BACKGROUND */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <motion.div animate={{x:[0,40,0],y:[0,-40,0],scale:[1,1.15,1]}} transition={{duration:20,repeat:Infinity,repeatType:"reverse",ease:"easeInOut"}} className="absolute left-[10%] top-[5%] h-[600px] w-[600px] rounded-full bg-cyan-500/25 blur-[120px]" />
        <motion.div animate={{x:[0,-30,0],y:[0,30,0],scale:[1,1.2,1]}} transition={{duration:24,repeat:Infinity,repeatType:"reverse",ease:"easeInOut"}} className="absolute left-[80%] top-[70%] h-[700px] w-[700px] rounded-full bg-violet-500/20 blur-[120px]" />
        <motion.div animate={{x:[0,25,0],y:[0,25,0],scale:[1,1.1,1]}} transition={{duration:18,repeat:Infinity,repeatType:"reverse",ease:"easeInOut"}} className="absolute left-[35%] top-[35%] h-[500px] w-[500px] rounded-full bg-emerald-500/15 blur-[120px]" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJhIiB4PSIwIiB5PSIwIj48ZmVUdXJidWxlbmNlIHR5cGU9ImZyYWN0YWxOb2lzZSIgYmFzZUZyZXF1ZW5jeT0iLjc1Ii8+PGZlQ29sb3JNYXRyaXggdHlwZT0ic2F0dXJhdGUiIHZhbHVlcz0iMCIvPjwvZmlsdGVyPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbHRlcj0idXJsKCNhKSIgb3BhY2l0eT0iMC4wNiIvPjwvc3ZnPg==')] opacity-40" />
      </div>

      <motion.div initial={{opacity:0}} animate={{opacity:1}} transition={{duration:0.8}} className="relative z-10 mx-auto flex w-full max-w-[1600px] flex-col gap-10">
        {/* 🏆 HERO HEADER */}
        <motion.section initial={{opacity:0,y:40,rotateX:15}} animate={{opacity:1,y:0,rotateX:0}} transition={{duration:1,type:"spring",stiffness:90}} style={{perspective:1500}} className={`${glassSurface} ${glassSurfaceHover} p-10`}>
          <div className="pointer-events-none absolute inset-0 rounded-[36px] bg-[radial-gradient(circle_at_20%_50%,rgba(6,182,212,0.12),transparent_60%),radial-gradient(circle_at_80%_50%,rgba(139,92,246,0.1),transparent_60%)]" />
          <div className="relative">
            <motion.button onClick={()=>navigate("/finance/master-data")} whileHover={{x:-6,scale:1.03}} whileTap={{scale:0.97}} className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/[0.12] bg-white/[0.06] px-6 py-3 text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400 transition hover:border-white/[0.18] hover:bg-white/[0.1] hover:text-white">
              <ArrowLeft className="h-4 w-4" /> Master Data
            </motion.button>

            <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-4">
                  <Badge className={`${badgeBase} border-cyan-400/25 bg-cyan-500/15 text-cyan-200`}>Finance Master Data</Badge>
                  <Badge className={`${badgeBase} border-violet-400/25 bg-violet-500/15 text-violet-200`}>Payment Terms</Badge>
                  <AnimatePresence>{backgroundRefreshing && <motion.div initial={{opacity:0,scale:0.9}} animate={{opacity:1,scale:1}} exit={{opacity:0,scale:0.9}}>
                    <Badge className={`${badgeBase} border-emerald-400/25 bg-emerald-500/15 text-emerald-200`}><span className="mr-2 inline-block h-2 w-2 animate-pulse rounded-full bg-emerald-400" />Updating</Badge>
                  </motion.div>}</AnimatePresence>
                </div>

                <h1 className="mt-8 text-6xl font-black tracking-tight text-white drop-shadow-[0_0_40px_rgba(255,255,255,0.25)]">Payment Terms</h1>
                <p className="mt-6 max-w-2xl text-base leading-8 text-slate-500">
                  Manage reusable payment terms used across customer and vendor finance documents. Terms control document wording, due logic, deposit rules, default selection, and partial payment behavior.
                </p>
              </div>

              <div className="flex flex-wrap gap-4">
                <MagneticButton onClick={()=>setArchiveOpen(true)} variant="secondary"><Archive className="mr-2 h-4 w-4" /> Archive</MagneticButton>
                <MagneticButton onClick={openCreate} disabled={!canCreate} variant="primary"><Plus className="mr-2 h-4 w-4" /> New Payment Term</MagneticButton>
              </div>
            </div>
          </div>
        </motion.section>

        {/* 📊 STATS GRID */}
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard label="Active Terms" value={stats.active} description="Available payment terms that can be selected on finance documents." icon={CheckCircle2} tone="emerald" delay={0.05} />
          <SummaryCard label="Deposit Terms" value={stats.deposit} description="Terms that require a deposit before the remaining balance." icon={Percent} tone="amber" delay={0.1} />
          <SummaryCard label="Default Term" value={stats.defaultTerm} description="The active default payment term for document creation." icon={WalletCards} tone="cyan" delay={0.15} />
          <SummaryCard label="Archived" value={stats.archived} description="Inactive historical terms stored in the archive area." icon={Archive} tone="violet" delay={0.2} />
        </div>

        {/* ✅ ALERTS */}
        <AnimatePresence mode="wait">
          {pageMessage && <motion.div key="msg" initial={{opacity:0,y:15,scale:0.98}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:-15,scale:0.98}} className={`${glassSurface} border-emerald-400/25 bg-emerald-500/[0.12] px-7 py-5 text-sm text-emerald-200 shadow-[0_0_40px_rgba(16,185,129,0.18)]`}>{pageMessage}</motion.div>}
          {error && !pageMessage && <motion.div key="err" initial={{opacity:0,y:15,scale:0.98}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:-15,scale:0.98}} className={`${glassSurface} border-rose-400/25 bg-rose-500/[0.12] px-7 py-5 text-sm text-rose-200 shadow-[0_0_40px_rgba(244,63,94,0.18)]`}>{error}</motion.div>}
        </AnimatePresence>

        {/* 📋 DATA TABLE */}
        <motion.section initial={{opacity:0,y:40}} animate={{opacity:1,y:0}} transition={{delay:0.2,duration:0.7}} className={`${glassSurface} ${glassSurfaceHover}`}>
          <div className="border-b border-white/[0.08] px-8 py-6">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <div className="text-xs font-bold uppercase tracking-[0.22em] text-slate-400">Payment Terms Registry</div>
                <p className="mt-2 text-xs text-slate-600">Active and inactive terms. Archived records are managed from the archive.</p>
              </div>
              <div className="flex flex-col gap-4 md:flex-row md:items-center">
                <div className="relative group">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600 transition group-focus-within:text-cyan-400" />
                  <Input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Search payment terms..." className={`${inputGlass} md:w-[360px] pl-11`} />
                </div>
                <select value={statusFilter} onChange={(e)=>setStatusFilter(e.target.value as StatusFilter)} className={selectGlass}>
                  <option value="all">All Statuses</option><option value="active">Active</option><option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <div className="max-h-[750px] overflow-y-auto">
              <table className="w-full min-w-[1280px] border-collapse">
                <thead className="sticky top-0 z-10 border-b border-white/[0.08] bg-[#010205]/90 text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500 backdrop-blur-2xl">
                  <tr>
                    <th className="px-6 py-5"><button onClick={()=>updateSort("code")} className="flex items-center gap-2 transition hover:text-white">Code<span className="text-cyan-400/60">{sortLabel("code")}</span></button></th>
                    <th className="px-6 py-5"><button onClick={()=>updateSort("name")} className="flex items-center gap-2 transition hover:text-white">Name<span className="text-cyan-400/60">{sortLabel("name")}</span></button></th>
                    <th className="px-6 py-5"><button onClick={()=>updateSort("term_type")} className="flex items-center gap-2 transition hover:text-white">Type<span className="text-cyan-400/60">{sortLabel("term_type")}</span></button></th>
                    <th className="px-6 py-5"><button onClick={()=>updateSort("due_days")} className="flex items-center gap-2 transition hover:text-white">Due Days<span className="text-cyan-400/60">{sortLabel("due_days")}</span></button></th>
                    <th className="px-6 py-5">Deposit</th>
                    <th className="px-6 py-5">Document Wording</th>
                    <th className="px-6 py-5"><button onClick={()=>updateSort("status")} className="flex items-center gap-2 transition hover:text-white">Status<span className="text-cyan-400/60">{sortLabel("status")}</span></button></th>
                    <th className="px-6 py-5"><button onClick={()=>updateSort("updated_at")} className="flex items-center gap-2 transition hover:text-white">Updated<span className="text-cyan-400/60">{sortLabel("updated_at")}</span></button></th>
                    <th className="px-6 py-5 text-right">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {initialLoading ? <tr><td colSpan={9} className="px-6 py-20 text-center"><div className="flex flex-col items-center gap-4"><div className="h-10 w-10 animate-spin rounded-full border-3 border-cyan-400/20 border-t-cyan-400" /><span className="text-sm text-slate-600">Loading...</span></div></td></tr>
                  : sortedRows.length===0 ? <tr><td colSpan={9} className="px-6 py-20 text-center text-sm text-slate-600">No results found</td></tr>
                  : sortedRows.map((row,i)=>(
                    <motion.tr key={row.id} layout initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-20}} transition={{delay:i*0.04,duration:0.4}} whileHover={{scale:1.008,backgroundColor:"rgba(255,255,255,0.04)"}} className="group border-b border-white/[0.06] text-sm text-slate-300 transition-colors duration-400">
                      <td className="px-6 py-5"><div className="font-mono text-xs font-bold text-cyan-300/90 tracking-wider">{row.code}</div></td>
                      <td className="px-6 py-5"><div className="font-bold text-white">{row.name}</div>{row.is_default && <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-500/15 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-300"><CheckCircle2 className="h-3 w-3" /> Default</div>}</td>
                      <td className="px-6 py-5"><Badge className={termTypeBadgeClass(row.term_type)}>{formatTermType(row.term_type)}</Badge></td>
                      <td className="px-6 py-5"><div className="flex items-center gap-3 text-slate-400"><Clock3 className="h-4 w-4 text-slate-600" /><span className="font-mono text-sm">{row.due_days}</span></div></td>
                      <td className="px-6 py-5">{row.requires_deposit ? <div><div className="text-sm font-bold text-amber-200">{row.deposit_percentage??0}%</div><div className="mt-1 text-[11px] text-slate-600">{formatBasisLabel(row.deposit_due_basis)}</div></div> : <span className="text-xs text-slate-700">No deposit</span>}</td>
                      <td className="max-w-[400px] px-6 py-5"><p className="line-clamp-2 text-sm leading-6 text-slate-500 group-hover:text-slate-300 transition-colors">{row.document_terms_text||row.document_label||"—"}</p></td>
                      <td className="px-6 py-5"><Badge className={statusBadgeClass(row.status)}>{formatStatusLabel(row.status)}</Badge></td>
                      <td className="px-6 py-5 text-xs text-slate-600 font-mono">{formatDateLabel(row.updated_at)}</td>
                      <td className="px-6 py-5"><div className="flex justify-end gap-3 opacity-70 group-hover:opacity-100 transition-opacity">
                        <motion.div whileHover={{scale:1.05}} whileTap={{scale:0.95}}><Button variant="outline" onClick={()=>openEdit(row)} disabled={!canEdit} className="h-10 rounded-xl border-white/[0.12] bg-white/[0.06] px-4 text-xs text-white hover:bg-white/[0.1] hover:border-white/[0.18] disabled:opacity-40"><Edit3 className="mr-2 h-4 w-4" /> Edit</Button></motion.div>
                        <motion.div whileHover={{scale:1.05}} whileTap={{scale:0.95}}><Button variant="outline" onClick={()=>handleArchive(row)} disabled={!canArchive||actionLoadingId===row.id} className="h-10 rounded-xl border-amber-400/20 bg-amber-500/15 px-4 text-xs text-amber-200 hover:bg-amber-500/20 hover:border-amber-400/30 disabled:opacity-40"><Archive className="mr-2 h-4 w-4" /> Archive</Button></motion.div>
                      </div></td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </motion.section>
      </motion.div>

      {/* 🗄️ ARCHIVE MODAL */}
      <AnimatePresence>{archiveOpen && (
        <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 z-[110] flex items-center justify-center bg-black/95 p-4 backdrop-blur-[100px]" style={{perspective:1500}}>
          <motion.div initial={{opacity:0,y:60,rotateX:10,scale:0.92}} animate={{opacity:1,y:0,rotateX:0,scale:1}} exit={{opacity:0,y:40,rotateX:-5,scale:0.94}} transition={{type:"spring",stiffness:180,damping:28}} style={{transformStyle:"preserve-3d"}} className="flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-[44px] border border-white/[0.12] bg-[#020408] shadow-[0_32px_100px_rgba(0,0,0,0.9)]">
            <div className="relative border-b border-white/[0.08] bg-white/[0.02] px-10 py-8">
              <div className="pointer-events-none absolute inset-0"><div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-violet-500/18 blur-[100px]" /></div>
              <div className="relative flex items-start justify-between gap-4">
                <div><Badge className={`${badgeBase} border-violet-400/25 bg-violet-500/15 text-violet-200`}>Archive</Badge><h2 className="mt-6 text-4xl font-bold tracking-tight text-white">Archived Payment Terms</h2><p className="mt-3 text-sm text-slate-500">Restore or permanently delete records</p></div>
                <motion.button type="button" onClick={()=>setArchiveOpen(false)} whileHover={{rotate:90,scale:1.1}} whileTap={{scale:0.9}} className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/[0.12] bg-white/[0.06] text-white hover:bg-white/[0.12]"><X className="h-5 w-5" /></motion.button>
              </div>
            </div>
            <div className="border-b border-white/[0.08] px-10 py-5"><Badge className={`${badgeBase} border-violet-400/25 bg-violet-500/15 text-violet-200`}>{archivedRows.length} Records</Badge></div>
            <div className="overflow-x-auto"><div className="max-h-[600px] overflow-y-auto">
              <table className="w-full min-w-[1000px] border-collapse">
                <thead className="sticky top-0 z-10 border-b border-white/[0.08] bg-[#010205]/90 text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500 backdrop-blur-2xl">
                  <tr><th className="px-6 py-5">Code</th><th className="px-6 py-5">Name</th><th className="px-6 py-5">Type</th><th className="px-6 py-5">Updated</th><th className="px-6 py-5 text-right">Actions</th></tr>
                </thead>
                <tbody>{archivedRows.length===0 ? <tr><td colSpan={5} className="px-6 py-20 text-center text-sm text-slate-600">No archived records</td></tr> : archivedRows.map((row,i)=>(
                  <motion.tr key={row.id} layout initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-20}} transition={{delay:i*0.04}} whileHover={{backgroundColor:"rgba(255,255,255,0.04)"}} className="border-b border-white/[0.06] text-sm text-slate-300">
                    <td className="px-6 py-5"><span className="font-mono text-xs font-bold text-cyan-300/80 tracking-wider">{row.code}</span></td>
                    <td className="px-6 py-5"><div className="font-bold text-white">{row.name}</div></td>
                    <td className="px-6 py-5"><Badge className={termTypeBadgeClass(row.term_type)}>{formatTermType(row.term_type)}</Badge></td>
                    <td className="px-6 py-5 text-xs text-slate-600 font-mono">{formatDateLabel(row.updated_at)}</td>
                    <td className="px-6 py-5"><div className="flex justify-end gap-3">
                      <motion.div whileHover={{scale:1.05}} whileTap={{scale:0.95}}><Button variant="outline" onClick={()=>handleRestore(row)} disabled={!canArchive||actionLoadingId===row.id} className="h-10 rounded-xl border-emerald-400/20 bg-emerald-500/15 px-4 text-xs text-emerald-200 hover:bg-emerald-500/20 disabled:opacity-40"><Undo2 className="mr-2 h-4 w-4" /> Restore</Button></motion.div>
                      <motion.div whileHover={{scale:1.05}} whileTap={{scale:0.95}}><Button variant="outline" onClick={()=>handleDelete(row)} disabled={!canDelete||actionLoadingId===row.id} className="h-10 rounded-xl border-rose-400/20 bg-rose-500/15 px-4 text-xs text-rose-200 hover:bg-rose-500/20 disabled:opacity-40"><Trash2 className="mr-2 h-4 w-4" /> Hard Delete</Button></motion.div>
                    </div></td>
                  </motion.tr>
                ))}</tbody>
              </table>
            </div></div>
          </motion.div>
        </motion.div>
      )}</AnimatePresence>

      <PaymentTermFormModal open={dialogOpen} editingRow={editingRow} form={form} generatedTerm={generatedTerm} saving={saving} error={error} canSave={!!(editingRow?canEdit:canCreate)} onClose={()=>setDialogOpen(false)} onChange={updateForm} onSave={handleSave} />
    </div>
  );
}
