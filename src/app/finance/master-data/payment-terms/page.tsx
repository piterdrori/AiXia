import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { AnimatePresence, motion, useMotionTemplate, useMotionValue, useSpring } from "framer-motion";

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

  const toneGradients = {
    cyan: "from-cyan-400/15 to-cyan-600/5 border-cyan-400/25 text-cyan-100",
    emerald: "from-emerald-400/15 to-emerald-600/5 border-emerald-400/25 text-emerald-100",
    amber: "from-amber-400/15 to-amber-600/5 border-amber-400/25 text-amber-100",
    violet: "from-violet-400/15 to-violet-600/5 border-violet-400/25 text-violet-100",
  };

function statusBadgeClass(status: FinancePaymentTermStatus) {
  if (status === "archived") return `${BADGE.base} ${BADGE.rose}`;
  if (status === "inactive") return `${BADGE.base} ${BADGE.amber}`;
  return `${BADGE.base} ${BADGE.emerald}`;
}

function termTypeBadgeClass(type: FinancePaymentTermType) {
  if (type === "immediate") return `${BADGE.base} ${BADGE.emerald}`;
  if (type === "deposit_balance") return `${BADGE.base} ${BADGE.amber}`;
  if (type === "custom") return `${BADGE.base} ${BADGE.violet}`;
  return `${BADGE.base} ${BADGE.cyan}`;
}


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

/* ═══════════════════════════════════════════════════════════════
   VISUAL SYSTEM — Competition Grade Design Tokens
   ═══════════════════════════════════════════════════════════════ */

const GLOW = {
  cyan: "shadow-[0_0_40px_rgba(6,182,212,0.25)]",
  emerald: "shadow-[0_0_40px_rgba(16,185,129,0.25)]",
  amber: "shadow-[0_0_40px_rgba(245,158,11,0.25)]",
  violet: "shadow-[0_0_40px_rgba(139,92,246,0.25)]",
  rose: "shadow-[0_0_40px_rgba(244,63,94,0.25)]",
};

const GLASS = {
  base: "relative overflow-hidden rounded-[32px] border border-white/[0.06] bg-[#080c14]/60 backdrop-blur-[48px]",
  hover: "hover:border-white/[0.12] hover:bg-[#0a0f1a]/70 transition-all duration-700 ease-out",
  shine:
    "before:pointer-events-none before:absolute before:inset-0 before:rounded-[32px] before:bg-[linear-gradient(105deg,transparent_40%,rgba(255,255,255,0.03)_45%,rgba(255,255,255,0.06)_50%,rgba(255,255,255,0.03)_55%,transparent_60%)] before:bg-[length:200%_100%] before:transition-all before:duration-1000 hover:before:bg-[position:100%_0]",
};

const INPUT = {
  base: "h-12 w-full rounded-2xl border border-white/[0.06] bg-black/40 px-4 text-sm text-white outline-none transition-all duration-300 placeholder:text-slate-700 focus:border-cyan-400/30 focus:bg-black/50 focus:shadow-[0_0_24px_rgba(6,182,212,0.12)] focus:ring-1 focus:ring-cyan-400/20",
  textarea:
    "min-h-[120px] w-full resize-none rounded-2xl border border-white/[0.06] bg-black/40 px-4 py-3 text-sm text-white outline-none transition-all duration-300 placeholder:text-slate-700 focus:border-cyan-400/30 focus:bg-black/50 focus:shadow-[0_0_24px_rgba(6,182,212,0.12)] focus:ring-1 focus:ring-cyan-400/20",
  select:
    "h-12 w-full rounded-2xl border border-white/[0.06] bg-black/40 px-4 text-sm text-white outline-none transition-all duration-300 focus:border-cyan-400/30 focus:bg-black/50 focus:shadow-[0_0_24px_rgba(6,182,212,0.12)] focus:ring-1 focus:ring-cyan-400/20",
};

const LABEL = "text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500";

const BADGE = {
  base: "rounded-full border px-3.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] backdrop-blur-md",
  cyan: "border-cyan-400/20 bg-cyan-500/10 text-cyan-200",
  emerald: "border-emerald-400/20 bg-emerald-500/10 text-emerald-200",
  amber: "border-amber-400/20 bg-amber-500/10 text-amber-200",
  violet: "border-violet-400/20 bg-violet-500/10 text-violet-200",
  rose: "border-rose-400/20 bg-rose-500/10 text-rose-200",
  slate: "border-white/10 bg-white/[0.04] text-slate-400",
};

/* ═══════════════════════════════════════════════════════════════
   3D SPOTLIGHT CARD — Mouse-tracking ambient light
   ═══════════════════════════════════════════════════════════════ */

function SpotlightCard({
  children,
  className = "",
  delay = 0,
  color = "rgba(6,182,212,0.15)",
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  color?: string;
}) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const mouseX = useSpring(x, { stiffness: 500, damping: 100 });
  const mouseY = useSpring(y, { stiffness: 500, damping: 100 });

  function handleMouseMove({ currentTarget, clientX, clientY }: React.MouseEvent) {
    const { left, top, width, height } = currentTarget.getBoundingClientRect();
    x.set(clientX - left - width / 2);
    y.set(clientY - top - height / 2);
  }

  function handleMouseLeave() {
    x.set(0);
    y.set(0);
  }

  const background = useMotionTemplate`radial-gradient(400px circle at ${mouseX}px ${mouseY}px, ${color}, transparent 70%)`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, rotateX: 15 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      transition={{ duration: 0.8, delay, type: "spring", stiffness: 80, damping: 20 }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ perspective: 1000, transformStyle: "preserve-3d" }}
      className={`${GLASS.base} ${GLASS.hover} ${GLASS.shine} group ${className}`}
    >
      <motion.div
        className="pointer-events-none absolute inset-0 rounded-[32px] opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{ background }}
      />
      <div className="pointer-events-none absolute inset-0 rounded-[32px] bg-[linear-gradient(110deg,transparent_30%,rgba(255,255,255,0.02)_50%,transparent_70%)]" />
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAGNETIC BUTTON — Cinematic interaction
   ═══════════════════════════════════════════════════════════════ */

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
  const ref = useRef<HTMLButtonElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 400, damping: 25 });
  const springY = useSpring(y, { stiffness: 400, damping: 25 });

  function handleMouseMove(e: React.MouseEvent) {
    if (!ref.current || disabled) return;
    const rect = ref.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    x.set((e.clientX - centerX) * 0.15);
    y.set((e.clientY - centerY) * 0.15);
  }

  function handleMouseLeave() {
    x.set(0);
    y.set(0);
  }

  const variants = {
    primary:
      "relative border border-cyan-400/20 bg-cyan-500/10 text-cyan-100 hover:border-cyan-400/40 hover:bg-cyan-500/20 hover:shadow-[0_0_30px_rgba(6,182,212,0.25)] overflow-hidden",
    secondary:
      "border border-white/[0.08] bg-white/[0.04] text-white hover:border-white/[0.14] hover:bg-white/[0.08] hover:shadow-[0_0_20px_rgba(255,255,255,0.05)]",
    danger:
      "border border-rose-400/20 bg-rose-500/10 text-rose-200 hover:border-rose-400/40 hover:bg-rose-500/20 hover:shadow-[0_0_30px_rgba(244,63,94,0.25)]",
    ghost: "border-transparent bg-transparent text-slate-400 hover:text-white hover:bg-white/[0.04]",
  };

  return (
    <motion.button
      ref={ref}
      type="button"
      onClick={onClick}
      disabled={disabled}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ x: springX, y: springY }}
      whileTap={{ scale: 0.96 }}
      className={`h-11 rounded-2xl px-6 text-sm font-semibold tracking-wide backdrop-blur-md transition-colors duration-300 disabled:cursor-not-allowed disabled:opacity-40 ${variants[variant]} ${className}`}
    >
      <span className="relative z-10 flex items-center">{children}</span>
      {variant === "primary" && (
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
          initial={{ x: "-100%" }}
          whileHover={{ x: "100%" }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
        />
      )}
    </motion.button>
  );
}

/* ═══════════════════════════════════════════════════════════════
   FORM COMPONENTS
   ═══════════════════════════════════════════════════════════════ */

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
      className={INPUT.select}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value} className="bg-[#050810]">
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
      ? "border-emerald-400/20 bg-emerald-500/[0.08] shadow-[0_0_20px_rgba(16,185,129,0.1)]"
      : "border-cyan-400/20 bg-cyan-500/[0.08] shadow-[0_0_20px_rgba(6,182,212,0.1)]";
  const dotActive =
    tone === "emerald"
      ? "border-emerald-300 bg-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.5)]"
      : "border-cyan-300 bg-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.5)]";

  return (
    <motion.button
      type="button"
      onClick={() => onChange(!checked)}
      whileHover={{ y: -4, scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 20 }}
      className={`rounded-[24px] border p-5 text-left transition-all duration-500 ${
        checked
          ? activeGrad
          : "border-white/[0.06] bg-white/[0.02] hover:border-white/[0.1] hover:bg-white/[0.03]"
      }`}
    >
      <div className="flex items-start gap-4">
        <motion.span
          animate={{ scale: checked ? 1.2 : 1 }}
          transition={{ type: "spring", stiffness: 500, damping: 15 }}
          className={`mt-1 block h-5 w-5 rounded-full border-2 transition-all duration-300 ${
            checked ? dotActive : "border-white/10 bg-white/[0.04]"
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

/* ═══════════════════════════════════════════════════════════════
   SUMMARY CARD — With 3D tilt and ambient glow
   ═══════════════════════════════════════════════════════════════ */

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
    cyan: "border-cyan-400/15 bg-cyan-500/[0.08] text-cyan-300",
    emerald: "border-emerald-400/15 bg-emerald-500/[0.08] text-emerald-300",
    amber: "border-amber-400/15 bg-amber-500/[0.08] text-amber-300",
    violet: "border-violet-400/15 bg-violet-500/[0.08] text-violet-300",
  };

  const glowMap = {
    cyan: "rgba(6,182,212,0.12)",
    emerald: "rgba(16,185,129,0.12)",
    amber: "rgba(245,158,11,0.12)",
    violet: "rgba(139,92,246,0.12)",
  };

  return (
    <SpotlightCard delay={delay} color={glowMap[tone]} className="p-6 min-h-[170px] flex flex-col justify-between">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-600">{label}</div>
          <div className="mt-3 text-4xl font-black tracking-tight text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.1)]">
            {value}
          </div>
        </div>
        <motion.div
          whileHover={{ rotate: 15, scale: 1.15 }}
          transition={{ type: "spring", stiffness: 300, damping: 15 }}
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${toneMap[tone]} ${GLOW[tone]}`}
        >
          <Icon className="h-5 w-5" />
        </motion.div>
      </div>
      <p className="mt-4 text-xs leading-5 text-slate-600">{description}</p>
    </SpotlightCard>
  );
}

/* ═══════════════════════════════════════════════════════════════
   PAYMENT TERM FORM MODAL — Cinematic depth
   ═══════════════════════════════════════════════════════════════ */

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
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/85 p-4 backdrop-blur-[80px]"
          style={{ perspective: 1500 }}
        >
          <motion.div
            initial={{ opacity: 0, y: 80, rotateX: 12, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, rotateX: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, rotateX: -8, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 180, damping: 24 }}
            style={{ transformStyle: "preserve-3d" }}
            className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-[40px] border border-white/[0.1] bg-[#04060a] shadow-[0_32px_96px_rgba(0,0,0,0.9),0_0_0_1px_rgba(255,255,255,0.04)]"
          >
            {/* Header */}
            <div className="relative overflow-hidden border-b border-white/[0.06] bg-white/[0.02] px-8 py-8">
              <div className="pointer-events-none absolute inset-0">
                <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-cyan-500/10 blur-[100px]" />
                <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-violet-500/10 blur-[100px]" />
              </div>
              <div className="relative flex items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <Badge className={`${BADGE.base} ${BADGE.cyan}`}>Payment Term</Badge>
                    <Badge className={`${BADGE.base} ${BADGE.emerald}`}>
                      {editingRow ? "Edit Mode" : "Create Mode"}
                    </Badge>
                  </div>
                  <h2 className="mt-5 text-3xl font-black tracking-tight text-white">
                    {editingRow ? "Edit Payment Term" : "Create Payment Term"}
                  </h2>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
                    Create reusable commercial payment terms for quotations, proforma invoices, invoices, vendor quotations, purchase orders, and vendor records.
                  </p>
                </div>
                <motion.button
                  type="button"
                  onClick={onClose}
                  whileHover={{ rotate: 90, scale: 1.08 }}
                  whileTap={{ scale: 0.92 }}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.03] text-white transition hover:bg-white/[0.08] hover:border-white/[0.14]"
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
                className={`${GLASS.base} ${GLASS.hover} ${GLASS.shine}`}
              >
                <div className="border-b border-white/[0.04] px-6 py-5">
                  <div className="flex items-center gap-4">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-400/15 bg-cyan-500/[0.08] text-cyan-300 ${GLOW.cyan}`}>
                      <WalletCards className="h-5 w-5" />
                    </div>
                    <div>
                      <div className={LABEL}>Payment Structure</div>
                      <p className="mt-1 text-xs text-slate-600">Choose the commercial structure and generate the controlled term.</p>
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
                        whileTap={{ scale: 0.97 }}
                        transition={{ type: "spring", stiffness: 400, damping: 20 }}
                        className={`rounded-[24px] border p-6 text-left transition-all duration-500 ${
                          form.term_type === option.value
                            ? `bg-gradient-to-br ${toneGradients[option.tone]}`
                            : `bg-gradient-to-br from-white/[0.02] to-transparent border-white/[0.06] text-slate-500 hover:border-white/[0.1] hover:from-white/[0.03] hover:text-slate-300`
                        }`}
                      >
                        <div className="text-base font-bold">{option.label}</div>
                        <div className="mt-2 text-xs leading-5 opacity-70">{option.description}</div>
                      </motion.button>
                    ))}
                  </div>

                  <AnimatePresence mode="wait">
                    {form.term_type === "net" && (
                      <motion.label
                        key="net-fields"
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -12 }}
                        className="grid gap-3"
                      >
                        <span className={LABEL}>Net Days</span>
                        <Input
                          type="number"
                          min="0"
                          step="1"
                          value={form.net_days}
                          onChange={(event) => onChange("net_days", event.target.value)}
                          placeholder="Example: 30"
                          className={INPUT.base}
                        />
                      </motion.label>
                    )}

                    {form.term_type === "deposit_balance" && (
                      <motion.div
                        key="deposit-fields"
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -12 }}
                        className="grid gap-6"
                      >
                        <div className="grid gap-5 md:grid-cols-3">
                          <label className="grid gap-3">
                            <span className={LABEL}>Deposit Percentage</span>
                            <Input
                              type="number"
                              min="1"
                              max="99"
                              step="0.01"
                              value={form.deposit_percentage}
                              onChange={(event) => onChange("deposit_percentage", event.target.value)}
                              placeholder="Example: 30"
                              className={INPUT.base}
                            />
                          </label>
                          <label className="grid gap-3">
                            <span className={LABEL}>Deposit Due</span>
                            <SelectField
                              value={form.deposit_due_basis}
                              onChange={(value) => onChange("deposit_due_basis", value)}
                              options={DEPOSIT_DUE_BASIS_OPTIONS}
                            />
                          </label>
                          <label className="grid gap-3">
                            <span className={LABEL}>Balance Due</span>
                            <SelectField
                              value={form.balance_due_basis}
                              onChange={(value) => onChange("balance_due_basis", value)}
                              options={BALANCE_DUE_BASIS_OPTIONS}
                            />
                          </label>
                        </div>
                        <div className="rounded-[20px] border border-emerald-400/15 bg-emerald-500/[0.06] p-5 shadow-[0_0_24px_rgba(16,185,129,0.08)]">
                          <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-300/70">Balance Auto-Calculated</div>
                          <p className="mt-2 text-sm leading-6 text-emerald-200/60">
                            Deposit is {depositPercentage}%. Balance is {balancePercentage}%.
                          </p>
                        </div>
                      </motion.div>
                    )}

                    {form.term_type === "custom" && (
                      <motion.div
                        key="custom-fields"
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -12 }}
                        className="grid gap-5"
                      >
                        <label className="grid gap-3">
                          <span className={LABEL}>Custom Label</span>
                          <Input
                            value={form.custom_label}
                            onChange={(event) => onChange("custom_label", event.target.value)}
                            placeholder="Example: 30/40/30 Milestone Payments"
                            className={INPUT.base}
                          />
                        </label>
                        <label className="grid gap-3">
                          <span className={LABEL}>Custom Document Wording</span>
                          <textarea
                            value={form.custom_terms_text}
                            onChange={(event) => onChange("custom_terms_text", event.target.value)}
                            placeholder="Example: 30% deposit, 40% before shipment, 30% after installation."
                            className={INPUT.textarea}
                          />
                        </label>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.section>

              {/* Auto Preview */}
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className={`${GLASS.base} ${GLASS.hover} ${GLASS.shine}`}
              >
                <div className="border-b border-white/[0.04] px-6 py-5">
                  <div className="flex items-center gap-4">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-2xl border border-violet-400/15 bg-violet-500/[0.08] text-violet-300 ${GLOW.violet}`}>
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <div className={LABEL}>Auto Preview</div>
                      <p className="mt-1 text-xs text-slate-600">Code, name, and document wording generated from the selected structure.</p>
                    </div>
                  </div>
                </div>
                <div className="grid gap-5 p-6 md:grid-cols-2">
                  <motion.div layout className="rounded-[20px] border border-cyan-400/10 bg-cyan-500/[0.04] p-5">
                    <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-cyan-400/50">Generated Code</div>
                    <div className="mt-3 break-words text-base font-bold text-cyan-100">{generatedTerm.code}</div>
                  </motion.div>
                  <motion.div layout className="rounded-[20px] border border-emerald-400/10 bg-emerald-500/[0.04] p-5">
                    <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-400/50">Generated Name</div>
                    <div className="mt-3 break-words text-base font-bold text-white">{generatedTerm.name}</div>
                  </motion.div>
                  <motion.div layout className="rounded-[20px] border border-violet-400/10 bg-violet-500/[0.04] p-5 md:col-span-2">
                    <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-violet-400/50">Document Wording</div>
                    <p className="mt-3 text-sm leading-6 text-violet-200/60">{generatedTerm.documentTermsText}</p>
                  </motion.div>
                </div>
              </motion.section>

              {/* Term Controls */}
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className={`${GLASS.base} ${GLASS.hover} ${GLASS.shine}`}
              >
                <div className="border-b border-white/[0.04] px-6 py-5">
                  <div className="flex items-center gap-4">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-400/15 bg-emerald-500/[0.08] text-emerald-300 ${GLOW.emerald}`}>
                      <ShieldCheck className="h-5 w-5" />
                    </div>
                    <div>
                      <div className={LABEL}>Term Controls</div>
                      <p className="mt-1 text-xs text-slate-600">Default behavior, partial payments, status, and internal notes.</p>
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
                      <span className={LABEL}>Internal Notes</span>
                      <Input
                        value={form.notes}
                        onChange={(event) => onChange("notes", event.target.value)}
                        placeholder="Optional internal notes"
                        className={INPUT.base}
                      />
                    </label>
                    <label className="grid gap-3">
                      <span className={LABEL}>Status</span>
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
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className={`${GLASS.base} border-rose-400/15 bg-rose-500/[0.06] px-5 py-4 text-sm text-rose-200 shadow-[0_0_24px_rgba(244,63,94,0.1)]`}
                  >
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="flex flex-col gap-3 border-t border-white/[0.04] bg-white/[0.02] px-8 py-6 sm:flex-row sm:justify-end">
              <MagneticButton onClick={onClose} variant="secondary">Cancel</MagneticButton>
              <MagneticButton onClick={onSave} disabled={saving || !canSave} variant="primary">
                {saving ? "Saving..." : editingRow ? "Save Changes" : "Create Payment Term"}
              </MagneticButton>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN PAGE — Award-Winning Financial Command Center
   ═══════════════════════════════════════════════════════════════ */

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
    if (silent) setBackgroundRefreshing(true);
    else setInitialLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
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
      setError(loadError instanceof Error ? loadError.message : "Failed to load payment terms.");
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
        { event: "*", schema: "public", table: "finance_payment_terms" },
        () => void loadPage({ silent: true })
      )
      .subscribe();
    const intervalId = window.setInterval(() => void loadPage({ silent: true }), 60000);
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
  const defaultRow = useMemo(() => rows.find((row) => row.is_default && row.status === "active") ?? null, [rows]);

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
      if (sortKey === "due_days") return (a.due_days - b.due_days) * direction;
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
      setForm({ ...EMPTY_FORM, term_type: "immediate", net_days: "0", is_default: row.is_default, status: row.status, notes: row.notes ?? "", allow_partial_payments: row.allow_partial_payments });
    } else if (row.term_type === "net") {
      setForm({ ...EMPTY_FORM, term_type: "net", net_days: String(row.due_days), is_default: row.is_default, status: row.status, notes: row.notes ?? "", allow_partial_payments: row.allow_partial_payments });
    } else if (row.term_type === "deposit_balance") {
      setForm({ ...EMPTY_FORM, term_type: "deposit_balance", deposit_percentage: row.deposit_percentage === null ? "30" : String(row.deposit_percentage), deposit_due_basis: row.deposit_due_basis ?? "before_production", balance_due_basis: row.balance_due_basis ?? "before_shipment", is_default: row.is_default, status: row.status, notes: row.notes ?? "", allow_partial_payments: row.allow_partial_payments });
    } else {
      setForm({ ...EMPTY_FORM, term_type: "custom", custom_label: row.document_label ?? row.name, custom_terms_text: row.document_terms_text ?? "", is_default: row.is_default, status: row.status, notes: row.notes ?? "", allow_partial_payments: row.allow_partial_payments });
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
      setError(err instanceof Error ? err.message : "Failed to permanently delete payment term.");
    } finally {
      setActionLoadingId(null);
    }
  }

  function closeDialog() {
    setDialogOpen(false);
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#020408] px-4 py-6 text-white md:px-8 md:py-8">
      {/* ═══════ AMBIENT COSMOS BACKGROUND ═══════ */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <motion.div
          animate={{ x: [0, 40, 0], y: [0, -30, 0], scale: [1, 1.15, 1] }}
          transition={{ duration: 14, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
          className="absolute left-[10%] top-[5%] h-[600px] w-[600px] rounded-full bg-cyan-500/[0.07] blur-[120px]"
        />
        <motion.div
          animate={{ x: [0, -30, 0], y: [0, 40, 0], scale: [1, 1.2, 1] }}
          transition={{ duration: 18, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
          className="absolute left-[65%] top-[55%] h-[700px] w-[700px] rounded-full bg-violet-500/[0.06] blur-[120px]"
        />
        <motion.div
          animate={{ x: [0, 20, 0], y: [0, 20, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 12, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
          className="absolute left-[30%] top-[40%] h-[500px] w-[500px] rounded-full bg-emerald-500/[0.05] blur-[120px]"
        />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJhIiB4PSIwIiB5PSIwIj48ZmVUdXJidWxlbmNlIHR5cGU9ImZyYWN0YWxOb2lzZSIgYmFzZUZyZXF1ZW5jeT0iLjc1IiBzdGl0Y2hUaWxlcz0ic3RpdGNoIi8+PGZlQ29sb3JNYXRyaXggdHlwZT0ic2F0dXJhdGUiIHZhbHVlcz0iMCIvPjwvZmlsdGVyPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbHRlcj0idXJsKCNhKSIgb3BhY2l0eT0iMC4wNCIvPjwvc3ZnPg==')] opacity-40" />
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        className="relative z-10 mx-auto flex w-full max-w-[1600px] flex-col gap-8"
      >
        {/* ═══════ HERO COMMAND CENTER ═══════ */}
        <motion.section
          initial={{ opacity: 0, y: 40, rotateX: 12 }}
          animate={{ opacity: 1, y: 0, rotateX: 0 }}
          transition={{ duration: 1, type: "spring", stiffness: 60, damping: 20 }}
          style={{ perspective: 1200, transformStyle: "preserve-3d" }}
          className={`${GLASS.base} ${GLASS.hover} p-8 md:p-10`}
        >
          <div className="pointer-events-none absolute inset-0 rounded-[32px] bg-[radial-gradient(circle_at_20%_50%,rgba(6,182,212,0.06),transparent_50%),radial-gradient(circle_at_80%_50%,rgba(139,92,246,0.05),transparent_50%)]" />
          <div className="relative">
            <motion.button
              type="button"
              onClick={() => navigate("/finance/master-data")}
              whileHover={{ x: -6, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/[0.06] bg-white/[0.03] px-5 py-2.5 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500 transition hover:border-white/[0.1] hover:bg-white/[0.06] hover:text-slate-300"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Master Data
            </motion.button>

            <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <div className="flex flex-wrap items-center gap-3">
                  <Badge className={`${BADGE.base} ${BADGE.cyan}`}>Finance Master Data</Badge>
                  <Badge className={`${BADGE.base} ${BADGE.violet}`}>Payment Terms</Badge>
                  <AnimatePresence>
                    {backgroundRefreshing && (
                      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}>
                        <Badge className={`${BADGE.base} ${BADGE.emerald}`}>
                          <span className="mr-2 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                          Syncing
                        </Badge>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <h1 className="mt-6 text-5xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-slate-400 drop-shadow-[0_0_30px_rgba(255,255,255,0.08)] md:text-6xl">
                  Payment Terms
                </h1>
                <p className="mt-4 text-sm leading-7 text-slate-600">
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

        {/* ═══════ STATS GRID ═══════ */}
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard label="Active Terms" value={stats.active} description="Available payment terms that can be selected on finance documents." icon={CheckCircle2} tone="emerald" delay={0.05} />
          <SummaryCard label="Deposit Terms" value={stats.deposit} description="Terms that require a deposit before the remaining balance." icon={Percent} tone="amber" delay={0.1} />
          <SummaryCard label="Default Term" value={stats.defaultTerm} description="The active default payment term for document creation." icon={WalletCards} tone="cyan" delay={0.15} />
          <SummaryCard label="Archived" value={stats.archived} description="Inactive historical terms stored in the archive area." icon={Archive} tone="violet" delay={0.2} />
        </div>

        {/* ═══════ MESSAGES ═══════ */}
        <AnimatePresence mode="wait">
          {pageMessage && (
            <motion.div
              key="page-message"
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -16, scale: 0.98 }}
              className={`${GLASS.base} border-emerald-400/15 bg-emerald-500/[0.06] px-6 py-4 text-sm text-emerald-200 shadow-[0_0_30px_rgba(16,185,129,0.1)]`}
            >
              {pageMessage}
            </motion.div>
          )}
          {error && !pageMessage && (
            <motion.div
              key="page-error"
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -16, scale: 0.98 }}
              className={`${GLASS.base} border-rose-400/15 bg-rose-500/[0.06] px-6 py-4 text-sm text-rose-200 shadow-[0_0_30px_rgba(244,63,94,0.1)]`}
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ═══════ DATA TABLE ═══════ */}
        <motion.section
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.7 }}
          className={`${GLASS.base} ${GLASS.hover}`}
        >
          <div className="border-b border-white/[0.04] px-6 py-5">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <div className={LABEL}>Payment Terms Registry</div>
                <p className="mt-1 text-xs text-slate-600">Active and inactive terms. Archived records are managed from the archive.</p>
              </div>
              <div className="flex flex-col gap-3 md:flex-row md:items-center">
                <div className="relative group">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-700 transition group-focus-within:text-cyan-400" />
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search payment terms..."
                    className={`${INPUT.base} md:w-[320px] pl-11`}
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
                  className={INPUT.select}
                >
                  <option value="all" className="bg-[#050810]">All Statuses</option>
                  <option value="active" className="bg-[#050810]">Active</option>
                  <option value="inactive" className="bg-[#050810]">Inactive</option>
                </select>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <div className="max-h-[720px] overflow-y-auto">
              <table className="w-full min-w-[1240px] border-collapse">
                <thead className="sticky top-0 z-10 border-b border-white/[0.06] bg-[#020408]/90 text-left text-[10px] font-bold uppercase tracking-[0.2em] text-slate-600 backdrop-blur-xl">
                  <tr>
                    <th className="px-5 py-4"><button type="button" onClick={() => updateSort("code")} className="flex items-center gap-1.5 transition hover:text-white">Code<span className="text-cyan-400/50">{sortLabel("code")}</span></button></th>
                    <th className="px-5 py-4"><button type="button" onClick={() => updateSort("name")} className="flex items-center gap-1.5 transition hover:text-white">Name<span className="text-cyan-400/50">{sortLabel("name")}</span></button></th>
                    <th className="px-5 py-4"><button type="button" onClick={() => updateSort("term_type")} className="flex items-center gap-1.5 transition hover:text-white">Type<span className="text-cyan-400/50">{sortLabel("term_type")}</span></button></th>
                    <th className="px-5 py-4"><button type="button" onClick={() => updateSort("due_days")} className="flex items-center gap-1.5 transition hover:text-white">Due Days<span className="text-cyan-400/50">{sortLabel("due_days")}</span></button></th>
                    <th className="px-5 py-4">Deposit</th>
                    <th className="px-5 py-4">Document Wording</th>
                    <th className="px-5 py-4"><button type="button" onClick={() => updateSort("status")} className="flex items-center gap-1.5 transition hover:text-white">Status<span className="text-cyan-400/50">{sortLabel("status")}</span></button></th>
                    <th className="px-5 py-4"><button type="button" onClick={() => updateSort("updated_at")} className="flex items-center gap-1.5 transition hover:text-white">Updated<span className="text-cyan-400/50">{sortLabel("updated_at")}</span></button></th>
                    <th className="px-5 py-4 text-right">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {initialLoading ? (
                    <tr>
                      <td colSpan={9} className="px-5 py-16 text-center">
                        <div className="flex flex-col items-center gap-4">
                          <div className="relative h-10 w-10">
                            <div className="absolute inset-0 rounded-full border-2 border-cyan-400/10" />
                            <div className="absolute inset-0 rounded-full border-2 border-t-cyan-400 animate-spin" />
                          </div>
                          <span className="text-sm text-slate-600 tracking-wide">Loading payment terms...</span>
                        </div>
                      </td>
                    </tr>
                  ) : sortedRows.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-5 py-16 text-center text-sm text-slate-600 tracking-wide">
                        No payment terms match the current filters.
                      </td>
                    </tr>
                  ) : (
                    sortedRows.map((row, index) => (
                      <motion.tr
                        key={row.id}
                        layout
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -16 }}
                        transition={{ delay: index * 0.04, duration: 0.35 }}
                        whileHover={{ scale: 1.003, backgroundColor: "rgba(255,255,255,0.025)" }}
                        className="group border-b border-white/[0.03] text-sm text-slate-300 transition-colors duration-300"
                      >
                        <td className="px-5 py-4">
                          <div className="font-mono text-[11px] font-bold text-cyan-300/60 tracking-widest">{row.code}</div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="font-bold text-white text-sm">{row.name}</div>
                          {row.is_default && (
                            <div className="mt-1.5 inline-flex items-center gap-1.5 rounded-full border border-emerald-400/15 bg-emerald-500/[0.06] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                              <CheckCircle2 className="h-3 w-3" />Default
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <Badge className={termTypeBadgeClass(row.term_type)}>{formatTermType(row.term_type)}</Badge>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2 text-slate-500">
                            <Clock3 className="h-4 w-4 text-slate-700" />
                            <span className="font-mono text-sm">{row.due_days}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          {row.requires_deposit ? (
                            <div>
                              <div className="text-sm font-bold text-amber-200">{row.deposit_percentage ?? 0}%</div>
                              <div className="mt-1 text-[11px] text-slate-600">{formatBasisLabel(row.deposit_due_basis)}</div>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-700">No deposit</span>
                          )}
                        </td>
                        <td className="max-w-[360px] px-5 py-4">
                          <p className="line-clamp-2 text-sm leading-6 text-slate-600 group-hover:text-slate-400 transition-colors duration-300">
                            {row.document_terms_text || row.document_label || "—"}
                          </p>
                        </td>
                        <td className="px-5 py-4">
                          <Badge className={statusBadgeClass(row.status)}>{formatStatusLabel(row.status)}</Badge>
                        </td>
                        <td className="px-5 py-4 text-xs text-slate-600 font-mono tracking-wide">{formatDateLabel(row.updated_at)}</td>
                        <td className="px-5 py-4">
                          <div className="flex justify-end gap-2 opacity-70 group-hover:opacity-100 transition-opacity duration-300">
                            <motion.div whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.94 }}>
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => openEditDialog(row)}
                                disabled={!canEdit}
                                className="h-9 rounded-xl border-white/[0.06] bg-white/[0.03] px-3 text-xs text-white hover:bg-white/[0.08] hover:border-white/[0.1] disabled:cursor-not-allowed disabled:opacity-30"
                              >
                                <Edit3 className="mr-2 h-3.5 w-3.5" />Edit
                              </Button>
                            </motion.div>
                            <motion.div whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.94 }}>
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => handleArchive(row)}
                                disabled={!canArchive || actionLoadingId === row.id}
                                className="h-9 rounded-xl border-amber-400/10 bg-amber-500/[0.06] px-3 text-xs text-amber-200 hover:bg-amber-500/[0.1] hover:border-amber-400/20 disabled:cursor-not-allowed disabled:opacity-30"
                              >
                                <Archive className="mr-2 h-3.5 w-3.5" />Archive
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

      {/* ═══════ ARCHIVE MODAL ═══════ */}
      <AnimatePresence>
        {archiveOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center bg-black/85 p-4 backdrop-blur-[80px]"
            style={{ perspective: 1500 }}
          >
            <motion.div
              initial={{ opacity: 0, y: 60, rotateX: 10, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, rotateX: 0, scale: 1 }}
              exit={{ opacity: 0, y: 40, rotateX: -6, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 180, damping: 24 }}
              style={{ transformStyle: "preserve-3d" }}
              className="flex max-h-[88vh] w-full max-w-6xl flex-col overflow-hidden rounded-[40px] border border-white/[0.08] bg-[#04060a] shadow-[0_32px_96px_rgba(0,0,0,0.9)]"
            >
              <div className="relative border-b border-white/[0.04] bg-white/[0.02] px-8 py-7">
                <div className="pointer-events-none absolute inset-0">
                  <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-violet-500/10 blur-[100px]" />
                </div>
                <div className="relative flex items-start justify-between gap-4">
                  <div>
                    <Badge className={`${BADGE.base} ${BADGE.violet}`}>Archive</Badge>
                    <h2 className="mt-5 text-3xl font-black tracking-tight text-white">Archived Payment Terms</h2>
                    <p className="mt-2 text-sm text-slate-500">Restore archived terms or permanently delete records when allowed.</p>
                  </div>
                  <motion.button
                    type="button"
                    onClick={() => setArchiveOpen(false)}
                    whileHover={{ rotate: 90, scale: 1.08 }}
                    whileTap={{ scale: 0.92 }}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.03] text-white transition hover:bg-white/[0.08]"
                  >
                    <X className="h-5 w-5" />
                  </motion.button>
                </div>
              </div>

              <div className="border-b border-white/[0.04] px-8 py-4">
                <Badge className={`${BADGE.base} ${BADGE.violet}`}>{archivedRows.length} Records</Badge>
              </div>

              <div className="overflow-x-auto">
                <div className="max-h-[620px] overflow-y-auto">
                  <table className="w-full min-w-[980px] border-collapse">
                    <thead className="sticky top-0 z-10 border-b border-white/[0.06] bg-[#020408]/90 text-left text-[10px] font-bold uppercase tracking-[0.2em] text-slate-600 backdrop-blur-xl">
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
                          <td colSpan={5} className="px-5 py-16 text-center text-sm text-slate-600 tracking-wide">
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
                            transition={{ delay: index * 0.05 }}
                            whileHover={{ backgroundColor: "rgba(255,255,255,0.02)" }}
                            className="border-b border-white/[0.03] text-sm text-slate-300 transition-colors"
                          >
                            <td className="px-5 py-4">
                              <span className="font-mono text-[11px] font-bold text-cyan-300/50 tracking-widest">{row.code}</span>
                            </td>
                            <td className="px-5 py-4">
                              <div className="font-bold text-white">{row.name}</div>
                            </td>
                            <td className="px-5 py-4">
                              <Badge className={termTypeBadgeClass(row.term_type)}>{formatTermType(row.term_type)}</Badge>
                            </td>
                            <td className="px-5 py-4 text-xs text-slate-600 font-mono tracking-wide">{formatDateLabel(row.updated_at)}</td>
                            <td className="px-5 py-4">
                              <div className="flex justify-end gap-2">
                                <motion.div whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.94 }}>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => handleRestore(row)}
                                    disabled={!canArchive || actionLoadingId === row.id}
                                    className="h-9 rounded-xl border-emerald-400/10 bg-emerald-500/[0.06] px-3 text-xs text-emerald-200 hover:bg-emerald-500/[0.1] hover:border-emerald-400/20 disabled:cursor-not-allowed disabled:opacity-30"
                                  >
                                    <Undo2 className="mr-2 h-3.5 w-3.5" />Restore
                                  </Button>
                                </motion.div>
                                <motion.div whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.94 }}>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => handlePermanentDelete(row)}
                                    disabled={!canDelete || actionLoadingId === row.id}
                                    className="h-9 rounded-xl border-rose-400/10 bg-rose-500/[0.06] px-3 text-xs text-rose-200 hover:bg-rose-500/[0.1] hover:border-rose-400/20 disabled:cursor-not-allowed disabled:opacity-30"
                                  >
                                    <Trash2 className="mr-2 h-3.5 w-3.5" />Hard Delete
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
        )}
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
