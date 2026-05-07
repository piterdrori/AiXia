import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  Archive,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  WalletCards,
  X,
} from "lucide-react";

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
  type FinancePaymentTermRow,
  type FinancePaymentTermStatus,
  type FinancePaymentTermType,
  type PaymentTermUpsertInput,
} from "@/lib/finance/paymentTerms";

type ProfilePermissionRow = {
  role: Role;
  permissions?: Partial<Record<Permission, boolean>> | null;
};

type StatusFilter = "all" | "active" | "inactive";

type ArchiveTab = "archived";

type SortKey =
  | "code"
  | "name"
  | "term_type"
  | "due_days"
  | "deposit_percentage"
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
  depositType: FinancePaymentTermDepositType | null;
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

const STATUS_FILTERS: Array<{ value: StatusFilter; label: string }> = [
  { value: "all", label: "All Active" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

function formatCount(value: number) {
  return value.toLocaleString();
}

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

function formatTermType(value: FinancePaymentTermType) {
  return TERM_TYPE_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

function formatBasisLabel(value: string | null | undefined) {
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
      depositType: null,
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
      depositType: null,
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
      depositType: "percentage",
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
    depositType: null,
    depositPercentage: null,
    depositDueBasis: null,
    balanceDueBasis: "invoice_date",
    balanceDueDays: 0,
    documentLabel: customLabel,
    documentTermsText: customTermsText,
  };
}

function getStatusBadgeClass(status: FinancePaymentTermStatus) {
  if (status === "archived") {
    return "border-amber-400/20 bg-amber-500/10 text-amber-200";
  }

  if (status === "inactive") {
    return "border-white/10 bg-white/[0.06] text-slate-300";
  }

  return "border-emerald-400/20 bg-emerald-500/10 text-emerald-200";
}

function getSortValue(row: FinancePaymentTermRow, key: SortKey) {
  if (key === "deposit_percentage") return row.deposit_percentage ?? 0;
  if (key === "updated_at") return new Date(row.updated_at).getTime();
  return row[key] ?? "";
}

async function loadBackendEffectivePermissions(
  userId: string
): Promise<Partial<Record<Permission, boolean>> | null> {
  try {
    const result = await supabase.rpc("finance_get_effective_permissions", {
      target_user_id: userId,
    });

    if (result.error) {
      console.warn("Payment Terms permission RPC fallback:", result.error.message);
      return null;
    }

    if (!result.data || typeof result.data !== "object") {
      return null;
    }

    return result.data as Partial<Record<Permission, boolean>>;
  } catch (error) {
    console.warn("Payment Terms permission RPC failed:", error);
    return null;
  }
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

function MetricCard({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  tone: "cyan" | "emerald" | "amber" | "violet";
}) {
  const toneClasses = {
    cyan: {
      glow: "from-cyan-500/20 via-cyan-400/10 to-transparent",
      icon: "border-cyan-400/20 bg-cyan-500/10 text-cyan-200",
      value: "text-cyan-100",
    },
    emerald: {
      glow: "from-emerald-500/20 via-emerald-400/10 to-transparent",
      icon: "border-emerald-400/20 bg-emerald-500/10 text-emerald-200",
      value: "text-emerald-100",
    },
    amber: {
      glow: "from-amber-500/20 via-amber-400/10 to-transparent",
      icon: "border-amber-400/20 bg-amber-500/10 text-amber-200",
      value: "text-amber-100",
    },
    violet: {
      glow: "from-violet-500/20 via-violet-400/10 to-transparent",
      icon: "border-violet-400/20 bg-violet-500/10 text-violet-200",
      value: "text-violet-100",
    },
  }[tone];

  return (
    <div className="relative min-h-[156px] overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.045] p-5 backdrop-blur-xl transition hover:border-white/20 hover:bg-white/[0.055]">
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${toneClasses.glow}`} />
      <div className="relative flex h-full flex-col justify-between gap-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
              {label}
            </div>
            <div className={`mt-2 truncate text-3xl font-semibold tracking-[-0.035em] ${toneClasses.value}`}>
              {value}
            </div>
          </div>

          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${toneClasses.icon}`}>
            <WalletCards className="h-5 w-5" />
          </div>
        </div>

        <div className="text-sm leading-6 text-slate-400">{detail}</div>
      </div>
    </div>
  );
}

function SortButton({
  label,
  sortKey,
  activeSortKey,
  direction,
  onSort,
  align = "left",
}: {
  label: string;
  sortKey: SortKey;
  activeSortKey: SortKey;
  direction: SortDirection;
  onSort: (key: SortKey) => void;
  align?: "left" | "right";
}) {
  const active = sortKey === activeSortKey;

  return (
    <button
      type="button"
      onClick={() => onSort(sortKey)}
      className={`inline-flex w-full items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 transition hover:text-slate-300 ${
        align === "right" ? "justify-end" : "justify-start"
      }`}
    >
      {label}
      {active ? (
        direction === "asc" ? (
          <ChevronUp className="h-3 w-3" />
        ) : (
          <ChevronDown className="h-3 w-3" />
        )
      ) : null}
    </button>
  );
}

export default function FinancePaymentTermsPage() {
  const navigate = useNavigate();

  const [rows, setRows] = useState<FinancePaymentTermRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionLocked, setActionLocked] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [archiveTab] = useState<ArchiveTab>("archived");
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [role, setRole] = useState<Role | null>(null);
  const [permissionOverrides, setPermissionOverrides] =
    useState<Partial<Record<Permission, boolean>> | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<FinancePaymentTermRow | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("updated_at");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const generatedTerm = useMemo(() => buildGeneratedTerm(form), [form]);

  const loadProfile = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.id) {
      setRole(null);
      setPermissionOverrides(null);
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role, permissions")
      .eq("user_id", user.id)
      .maybeSingle();

    if (profileError) throw profileError;

    const typedProfile = (profile || null) as ProfilePermissionRow | null;
    const backendPermissions = await loadBackendEffectivePermissions(user.id);

    setRole(typedProfile?.role ?? null);
    setPermissionOverrides(backendPermissions || typedProfile?.permissions || null);
  }, []);

  const loadPage = useCallback(
    async (mode: "initial" | "silent" = "initial") => {
      if (mode === "initial") {
        setLoading(true);
      }

      try {
        await loadProfile();
        const nextRows = await getPaymentTerms();
        setRows(nextRows);
      } catch (loadError) {
        console.error("Failed to load payment terms:", loadError);
        if (mode === "initial") {
          setRows([]);
        }
      } finally {
        if (mode === "initial") {
          setLoading(false);
        }
      }
    },
    [loadProfile]
  );

  useEffect(() => {
    void loadPage("initial");
  }, [loadPage]);

  useEffect(() => {
    const channel = supabase
      .channel("finance-payment-terms-page")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_payment_terms" },
        () => void loadPage("silent")
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        () => void loadPage("silent")
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_permission_templates" },
        () => void loadPage("silent")
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_user_permission_templates" },
        () => void loadPage("silent")
      )
      .subscribe();

    const intervalId = window.setInterval(() => {
      void loadPage("silent");
    }, 60000);

    return () => {
      window.clearInterval(intervalId);
      supabase.removeChannel(channel);
    };
  }, [loadPage]);

  const permissions = useMemo(() => {
    if (!role) return null;
    return getEffectivePermissions(role, permissionOverrides);
  }, [permissionOverrides, role]);

  const canCreate = Boolean(
    permissions?.manageFinanceMasterData ||
      permissions?.createFinanceRecords ||
      permissions?.editFinanceRecords
  );
  const canEdit = Boolean(
    permissions?.manageFinanceMasterData || permissions?.editFinanceRecords
  );
  const canArchive = Boolean(
    permissions?.manageFinanceMasterData || permissions?.archiveFinanceRecords
  );
  const canHardDelete = Boolean(
    role === "admin" && (permissions?.manageFinanceMasterData || permissions?.manageUsers)
  );

  const activeRows = useMemo(
    () => rows.filter((row) => row.status !== "archived"),
    [rows]
  );

  const archivedRows = useMemo(
    () => rows.filter((row) => row.status === archiveTab),
    [archiveTab, rows]
  );

  const availableRows = useMemo(
    () => rows.filter((row) => row.status === "active"),
    [rows]
  );

  const inactiveRows = useMemo(
    () => rows.filter((row) => row.status === "inactive"),
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
    return [...filteredRows].sort((a, b) => {
      const aValue = getSortValue(a, sortKey);
      const bValue = getSortValue(b, sortKey);
      const direction = sortDirection === "asc" ? 1 : -1;

      if (typeof aValue === "number" && typeof bValue === "number") {
        return (aValue - bValue) * direction;
      }

      return String(aValue).localeCompare(String(bValue)) * direction;
    });
  }, [filteredRows, sortDirection, sortKey]);

  const sortedArchivedRows = useMemo(() => {
    return [...archivedRows].sort(
      (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    );
  }, [archivedRows]);

  const visibleRowsLabel = useMemo(() => {
    return `${formatCount(sortedRows.length)} of ${formatCount(activeRows.length)} visible`;
  }, [activeRows.length, sortedRows.length]);

  const tableNeedsInternalScroll = sortedRows.length > 10;

  function handleSort(nextSortKey: SortKey) {
    setSortKey((previousKey) => {
      if (previousKey === nextSortKey) {
        setSortDirection((previousDirection) =>
          previousDirection === "asc" ? "desc" : "asc"
        );
        return previousKey;
      }

      setSortDirection(nextSortKey === "updated_at" ? "desc" : "asc");
      return nextSortKey;
    });
  }

  function openCreateDialog() {
    if (!canCreate) {
      setError("Create permission is required to add Payment Terms.");
      return;
    }

    setEditingRow(null);
    setForm(EMPTY_FORM);
    setError("");
    setSuccessMessage("");
    setDialogOpen(true);
  }

  function openEditDialog(row: FinancePaymentTermRow) {
    if (!canEdit) {
      setError("Update permission is required to edit Payment Terms.");
      return;
    }

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
    setSuccessMessage("");
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!(editingRow ? canEdit : canCreate)) {
      setError(
        editingRow
          ? "Update permission is required to edit Payment Terms."
          : "Create permission is required to add Payment Terms."
      );
      return;
    }

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
      setActionLocked(true);
      setError("");
      setSuccessMessage("");

      const payload: PaymentTermUpsertInput = {
        code: generatedTerm.code,
        name: generatedTerm.name,
        due_days: generatedTerm.dueDays,
        status: form.status,
        is_default: form.is_default,
        notes: form.notes,
        term_type: form.term_type,
        due_basis: "invoice_date",
        requires_deposit: generatedTerm.requiresDeposit,
        deposit_type: generatedTerm.depositType,
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

      const savedRow = editingRow
        ? await updatePaymentTerm(editingRow.id, payload)
        : await createPaymentTerm(payload);

      setRows((previousRows) => {
        const defaultClearedRows = savedRow.is_default
          ? previousRows.map((row) => ({ ...row, is_default: row.id === savedRow.id }))
          : previousRows;

        if (editingRow) {
          return defaultClearedRows.map((row) => (row.id === savedRow.id ? savedRow : row));
        }

        return [savedRow, ...defaultClearedRows];
      });

      setDialogOpen(false);
      setForm(EMPTY_FORM);
      setEditingRow(null);
      setSuccessMessage(editingRow ? "Payment term updated." : "Payment term created.");
    } catch (saveError) {
      console.error("Failed to save payment term:", saveError);
      setError(saveError instanceof Error ? saveError.message : "Failed to save payment term.");
    } finally {
      setSaving(false);
      setActionLocked(false);
    }
  }

  async function handleArchive(row: FinancePaymentTermRow) {
    if (!canArchive || actionLocked) return;

    try {
      setActionLocked(true);
      setError("");
      setSuccessMessage("");
      const archivedRow = await archivePaymentTerm(row.id);
      setRows((previousRows) =>
        previousRows.map((previousRow) =>
          previousRow.id === archivedRow.id ? archivedRow : previousRow
        )
      );
      setSuccessMessage("Payment term archived.");
    } catch (actionError) {
      console.error("Failed to archive payment term:", actionError);
      setError("Archive permission or backend validation blocked this action.");
    } finally {
      setActionLocked(false);
    }
  }

  async function handleRestore(row: FinancePaymentTermRow) {
    if (!canArchive || actionLocked) return;

    try {
      setActionLocked(true);
      setError("");
      setSuccessMessage("");
      const restoredRow = await restorePaymentTerm(row.id);
      setRows((previousRows) =>
        previousRows.map((previousRow) =>
          previousRow.id === restoredRow.id ? restoredRow : previousRow
        )
      );
      setSuccessMessage("Payment term restored.");
    } catch (actionError) {
      console.error("Failed to restore payment term:", actionError);
      setError("Restore permission or backend validation blocked this action.");
    } finally {
      setActionLocked(false);
    }
  }

  async function handleHardDelete(row: FinancePaymentTermRow) {
    if (!canHardDelete || actionLocked) return;

    try {
      setActionLocked(true);
      setError("");
      setSuccessMessage("");
      await permanentlyDeletePaymentTerm(row.id);
      setRows((previousRows) => previousRows.filter((previousRow) => previousRow.id !== row.id));
      setSuccessMessage("Payment term permanently deleted.");
    } catch (actionError) {
      console.error("Failed to permanently delete payment term:", actionError);
      setError("Permanent delete permission or backend validation blocked this action.");
    } finally {
      setActionLocked(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#05070d] px-4 py-4 text-white md:px-6 md:py-6">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
        <header className="relative overflow-hidden rounded-[34px] border border-white/10 bg-white/[0.045] p-6 shadow-2xl shadow-black/30 backdrop-blur-xl">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(6,182,212,0.16),transparent_38%),radial-gradient(circle_at_top_right,rgba(139,92,246,0.12),transparent_34%)]" />

          <div className="relative grid gap-6 xl:grid-cols-[minmax(0,1fr)_620px] xl:items-stretch">
            <div className="flex min-w-0 flex-col justify-between">
              <div>
                <button
                  type="button"
                  onClick={() => navigate("/finance/master-data")}
                  className="mb-5 inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-300 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
                >
                  <ArrowRight className="h-3.5 w-3.5 rotate-180" />
                  Master Data
                </button>

                <div className="inline-flex w-fit items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-200">
                  <Sparkles className="h-3.5 w-3.5" />
                  Commercial Rules
                </div>

                <h1 className="mt-4 text-3xl font-semibold tracking-[-0.035em] text-white md:text-5xl">
                  Payment Terms
                </h1>

                <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-400 md:text-base md:leading-7">
                  Create reusable finance payment terms for quotations, proforma invoices, and
                  invoices. This page controls selectable commercial wording only; invoice due dates,
                  balances, payments, and confirmations stay inside their document flows.
                </p>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <div className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-200">
                  Soft refresh enabled
                </div>
                <div className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-200">
                  Permission filtered
                </div>
                <div className="rounded-full border border-slate-400/20 bg-slate-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-300">
                  Archive center
                </div>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-3">
              <div className="min-h-[148px] rounded-[24px] border border-white/10 bg-black/20 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                      Default Term
                    </div>
                    <div className="mt-2 line-clamp-2 text-xl font-semibold leading-tight tracking-[-0.035em] text-white">
                      {defaultRow?.document_label ?? defaultRow?.name ?? "Not Set"}
                    </div>
                  </div>
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-500/10 text-cyan-200">
                    <CreditCard className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-3 text-xs leading-5 text-slate-500">
                  Default selectable term for new finance documents.
                </div>
              </div>

              <div className="min-h-[148px] rounded-[24px] border border-white/10 bg-black/20 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                      Live Status
                    </div>
                    <div className="mt-2 text-xl font-semibold leading-tight tracking-[-0.035em] text-white">
                      {loading ? "Loading" : "Live"}
                    </div>
                  </div>
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-500/10 text-emerald-200">
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                  </div>
                </div>
                <div className="mt-3 text-xs leading-5 text-slate-500">
                  Realtime listener with silent 60-second fallback refresh.
                </div>
              </div>

              <div className="min-h-[148px] rounded-[24px] border border-white/10 bg-black/20 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                      Access
                    </div>
                    <div className="mt-2 text-xl font-semibold leading-tight tracking-[-0.035em] text-white">
                      {canEdit ? "Editable" : "Read Only"}
                    </div>
                  </div>
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-amber-400/20 bg-amber-500/10 text-amber-200">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-3 text-xs leading-5 text-slate-500">
                  Actions follow effective Finance permissions.
                </div>
              </div>
            </div>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Available Terms"
            value={loading ? "—" : formatCount(availableRows.length)}
            detail="Active terms selectable on finance documents."
            tone="cyan"
          />
          <MetricCard
            label="Deposit Terms"
            value={loading ? "—" : formatCount(depositRows.length)}
            detail="Terms that include upfront deposit wording."
            tone="emerald"
          />
          <MetricCard
            label="Inactive Terms"
            value={loading ? "—" : formatCount(inactiveRows.length)}
            detail="Visible but not preferred for new documents."
            tone="amber"
          />
          <MetricCard
            label="Archived Terms"
            value={loading ? "—" : formatCount(archivedRows.length)}
            detail="Historical records managed from the archive center."
            tone="violet"
          />
        </section>

        {(error || successMessage) ? (
          <section
            className={`rounded-[24px] border p-4 ${
              error
                ? "border-rose-400/20 bg-rose-500/10 text-rose-100"
                : "border-emerald-400/20 bg-emerald-500/10 text-emerald-100"
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                {error ? <AlertTriangle className="mt-0.5 h-4 w-4" /> : <CheckCircle2 className="mt-0.5 h-4 w-4" />}
                <div className="text-sm leading-6">{error || successMessage}</div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setError("");
                  setSuccessMessage("");
                }}
                className="rounded-full p-1 transition hover:bg-white/10"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </section>
        ) : null}

        <section className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
          <div className="flex flex-col gap-4 border-b border-white/10 px-5 py-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl border border-cyan-400/15 bg-cyan-500/10 p-3 text-cyan-200">
                  <WalletCards className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Payment Terms Registry
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Active registry excludes archived records. Archived records are restored or permanently deleted only from the archive center.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search code, name, type, wording..."
                  className="h-11 w-full rounded-2xl border-white/10 bg-black/20 pl-11 text-white placeholder:text-white/35 lg:w-[360px]"
                />
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={() => setArchiveOpen(true)}
                className="h-11 rounded-2xl border-white/10 bg-black/20 px-4 text-sm font-semibold text-white hover:bg-white/10"
              >
                <Archive className="mr-2 h-4 w-4" />
                Archive
              </Button>

              <Button
                type="button"
                onClick={openCreateDialog}
                disabled={!canCreate || actionLocked}
                className="h-11 rounded-2xl border border-cyan-400/20 bg-cyan-500 px-4 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-45"
              >
                <Plus className="mr-2 h-4 w-4" />
                New Payment Term
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-3 border-b border-white/10 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2">
              {STATUS_FILTERS.map((filter) => (
                <button
                  key={filter.value}
                  type="button"
                  onClick={() => setStatusFilter(filter.value)}
                  className={`rounded-full border px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] transition ${
                    statusFilter === filter.value
                      ? "border-cyan-400/25 bg-cyan-500/10 text-cyan-100"
                      : "border-white/10 bg-black/20 text-slate-400 hover:bg-white/[0.06] hover:text-white"
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3 text-xs text-slate-500">
              {actionLocked ? (
                <span className="inline-flex items-center gap-2 text-cyan-200">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Updating silently
                </span>
              ) : null}
              <span>{visibleRowsLabel}</span>
            </div>
          </div>

          <div className="p-5">
            {loading ? (
              <div className="rounded-[28px] border border-dashed border-white/10 bg-black/20 px-6 py-12 text-center">
                <Loader2 className="mx-auto h-8 w-8 animate-spin text-cyan-200" />
                <div className="mt-4 text-sm font-medium text-white">Loading payment terms</div>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Initial data is loading. Future refreshes are silent and do not reset the page.
                </p>
              </div>
            ) : sortedRows.length === 0 ? (
              <div className="rounded-[28px] border border-dashed border-white/10 bg-black/20 px-6 py-12 text-center">
                <WalletCards className="mx-auto h-8 w-8 text-slate-500" />
                <div className="mt-4 text-sm font-medium text-white">No payment terms found</div>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Adjust search/filter settings or create a new payment term if you have permission.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-[26px] border border-white/10 bg-black/20">
                <div className={tableNeedsInternalScroll ? "max-h-[720px] overflow-y-auto" : ""}>
                  <table className="w-full min-w-[1240px] border-collapse">
                    <thead className="sticky top-0 z-10 border-b border-white/10 bg-black/70 backdrop-blur-xl">
                      <tr>
                        <th className="px-5 py-4 text-left">
                          <SortButton label="Code" sortKey="code" activeSortKey={sortKey} direction={sortDirection} onSort={handleSort} />
                        </th>
                        <th className="px-5 py-4 text-left">
                          <SortButton label="Name" sortKey="name" activeSortKey={sortKey} direction={sortDirection} onSort={handleSort} />
                        </th>
                        <th className="px-5 py-4 text-left">
                          <SortButton label="Type" sortKey="term_type" activeSortKey={sortKey} direction={sortDirection} onSort={handleSort} />
                        </th>
                        <th className="px-5 py-4 text-left">
                          <SortButton label="Due Days" sortKey="due_days" activeSortKey={sortKey} direction={sortDirection} onSort={handleSort} />
                        </th>
                        <th className="px-5 py-4 text-left">
                          <SortButton label="Deposit" sortKey="deposit_percentage" activeSortKey={sortKey} direction={sortDirection} onSort={handleSort} />
                        </th>
                        <th className="px-5 py-4 text-left">
                          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Document Wording</span>
                        </th>
                        <th className="px-5 py-4 text-left">
                          <SortButton label="Status" sortKey="status" activeSortKey={sortKey} direction={sortDirection} onSort={handleSort} />
                        </th>
                        <th className="px-5 py-4 text-left">
                          <SortButton label="Updated" sortKey="updated_at" activeSortKey={sortKey} direction={sortDirection} onSort={handleSort} />
                        </th>
                        <th className="px-5 py-4 text-right">
                          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Actions</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {sortedRows.map((row) => (
                        <tr key={row.id} className="text-sm text-slate-300 transition hover:bg-white/[0.035]">
                          <td className="px-5 py-4 align-top">
                            <div className="max-w-[210px] truncate font-mono text-xs font-semibold text-cyan-200">
                              {row.code}
                            </div>
                          </td>
                          <td className="px-5 py-4 align-top">
                            <div className="max-w-[240px] text-sm font-semibold text-white">
                              {row.name}
                            </div>
                            {row.is_default ? (
                              <Badge className="mt-2 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-emerald-200 shadow-none">
                                Default
                              </Badge>
                            ) : null}
                          </td>
                          <td className="px-5 py-4 align-top">
                            <Badge className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-2.5 py-1 text-[11px] text-cyan-200 shadow-none">
                              {formatTermType(row.term_type)}
                            </Badge>
                          </td>
                          <td className="px-5 py-4 align-top text-slate-300">
                            {row.due_days}
                          </td>
                          <td className="px-5 py-4 align-top">
                            {row.requires_deposit ? (
                              <div>
                                <div className="font-semibold text-emerald-100">
                                  {row.deposit_percentage ?? 0}%
                                </div>
                                <div className="mt-1 text-xs text-slate-500">
                                  {formatBasisLabel(row.deposit_due_basis)}
                                </div>
                              </div>
                            ) : (
                              <span className="text-xs text-slate-500">No deposit</span>
                            )}
                          </td>
                          <td className="px-5 py-4 align-top">
                            <div className="max-w-[330px]">
                              <div className="line-clamp-1 font-semibold text-white">
                                {row.document_label ?? row.name}
                              </div>
                              <div className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
                                {row.document_terms_text ?? row.notes ?? "No wording configured."}
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4 align-top">
                            <Badge className={`rounded-full border px-2.5 py-1 text-[11px] capitalize shadow-none ${getStatusBadgeClass(row.status)}`}>
                              {row.status}
                            </Badge>
                            <div className="mt-2 text-xs text-slate-500">
                              {row.allow_partial_payments ? "Partial allowed" : "Full only"}
                            </div>
                          </td>
                          <td className="px-5 py-4 align-top text-xs text-slate-500">
                            {formatDateLabel(row.updated_at)}
                          </td>
                          <td className="px-5 py-4 align-top text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="outline"
                                  className="h-10 rounded-xl border-white/10 bg-black/15 px-3 text-white hover:bg-white/10"
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>

                              <DropdownMenuContent align="end" className="w-52 border-white/10 bg-[#101522] text-white">
                                <DropdownMenuItem
                                  onClick={() => openEditDialog(row)}
                                  disabled={!canEdit || actionLocked}
                                  className="gap-2"
                                >
                                  <Pencil className="h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>

                                <DropdownMenuItem
                                  onClick={() => void handleArchive(row)}
                                  disabled={!canArchive || actionLocked}
                                  className="gap-2 text-amber-200 focus:text-amber-200"
                                >
                                  <Archive className="h-4 w-4" />
                                  Archive
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[92vh] overflow-y-auto border-white/10 bg-[#0f1726] text-white sm:max-w-[920px]">
          <DialogHeader>
            <DialogTitle>{editingRow ? "Edit Payment Term" : "Create Payment Term"}</DialogTitle>
            <DialogDescription className="text-white/45">
              Create a reusable master-data payment term. Code, name, and document wording are generated from the selected structure.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-5">
            {error ? (
              <div className="rounded-[20px] border border-rose-400/20 bg-rose-500/10 p-4 text-sm leading-6 text-rose-100">
                {error}
              </div>
            ) : null}

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
                  <p className="mt-2 text-sm leading-6 text-emerald-50/80">
                    {generatedTerm.documentTermsText}
                  </p>
                </div>
              </div>
            ) : null}

            {form.term_type === "custom" ? (
              <div className="grid gap-4 rounded-[24px] border border-white/10 bg-black/20 p-4">
                <div>
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Custom Label
                  </p>
                  <Input
                    value={form.custom_label}
                    onChange={(event) =>
                      setForm((previous) => ({
                        ...previous,
                        custom_label: event.target.value,
                      }))
                    }
                    placeholder="Example: 50% upfront, 50% after FAT"
                    className="h-11 rounded-2xl border-white/10 bg-black/20 text-white"
                  />
                </div>

                <div>
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Document Wording
                  </p>
                  <textarea
                    value={form.custom_terms_text}
                    onChange={(event) =>
                      setForm((previous) => ({
                        ...previous,
                        custom_terms_text: event.target.value,
                      }))
                    }
                    placeholder="Write the wording that should appear on documents."
                    className="min-h-[120px] w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-cyan-400/40"
                  />
                </div>
              </div>
            ) : null}

            <div className="grid gap-3 md:grid-cols-3">
              <ToggleCard
                checked={form.allow_partial_payments}
                title="Allow Partial Payments"
                description="Documents using this term can receive partial payments."
                onChange={(checked) =>
                  setForm((previous) => ({ ...previous, allow_partial_payments: checked }))
                }
              />
              <ToggleCard
                checked={form.is_default}
                title="Default Term"
                description="Make this the default selectable payment term."
                onChange={(checked) =>
                  setForm((previous) => ({ ...previous, is_default: checked }))
                }
              />
              <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Status
                </p>
                <SelectField
                  value={form.status}
                  onChange={(value) => setForm((previous) => ({ ...previous, status: value }))}
                  options={[
                    { value: "active", label: "Active" },
                    { value: "inactive", label: "Inactive" },
                  ]}
                />
              </div>
            </div>

            <div className="rounded-[24px] border border-cyan-400/15 bg-cyan-500/10 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-200">
                Generated Output
              </p>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div className="rounded-[18px] border border-white/10 bg-black/20 p-3">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Code</p>
                  <p className="mt-2 break-all font-mono text-sm text-cyan-100">{generatedTerm.code}</p>
                </div>
                <div className="rounded-[18px] border border-white/10 bg-black/20 p-3">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Name</p>
                  <p className="mt-2 text-sm font-semibold text-white">{generatedTerm.name}</p>
                </div>
              </div>
              <div className="mt-3 rounded-[18px] border border-white/10 bg-black/20 p-3">
                <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Document Wording</p>
                <p className="mt-2 text-sm leading-6 text-slate-300">{generatedTerm.documentTermsText}</p>
              </div>
            </div>

            <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                Internal Notes
              </p>
              <textarea
                value={form.notes}
                onChange={(event) =>
                  setForm((previous) => ({
                    ...previous,
                    notes: event.target.value,
                  }))
                }
                placeholder="Optional internal note."
                className="min-h-[92px] w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-cyan-400/40"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDialogOpen(false)}
              className="rounded-2xl border-white/10 bg-black/20 text-white hover:bg-white/10"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving || actionLocked || !(editingRow ? canEdit : canCreate)}
              className="rounded-2xl bg-cyan-500 text-slate-950 hover:bg-cyan-400 disabled:opacity-45"
            >
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {editingRow ? "Save Changes" : "Create Payment Term"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={archiveOpen} onOpenChange={setArchiveOpen}>
        <DialogContent className="max-h-[92vh] overflow-hidden border-white/10 bg-[#0f1726] text-white sm:max-w-[1180px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Archive className="h-5 w-5 text-amber-200" />
              Payment Terms Archive
            </DialogTitle>
            <DialogDescription className="text-white/45">
              Archived payment terms can be restored. Permanent deletion is only available here when the user has delete-level permission.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-[24px] border border-white/10 bg-black/20">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="rounded-full border border-amber-400/20 bg-amber-500/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-100"
                >
                  Archived
                </button>
              </div>
              <div className="text-xs text-slate-500">
                {formatCount(sortedArchivedRows.length)} archived records
              </div>
            </div>

            {sortedArchivedRows.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <Archive className="mx-auto h-8 w-8 text-slate-500" />
                <div className="mt-4 text-sm font-medium text-white">No archived payment terms</div>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Archived records will appear here after they are removed from the active registry.
                </p>
              </div>
            ) : (
              <div className="max-h-[620px] overflow-auto">
                <table className="w-full min-w-[980px] border-collapse">
                  <thead className="sticky top-0 z-10 border-b border-white/10 bg-black/70 backdrop-blur-xl">
                    <tr className="text-left text-[11px] uppercase tracking-[0.18em] text-slate-500">
                      <th className="px-5 py-4">Code</th>
                      <th className="px-5 py-4">Name</th>
                      <th className="px-5 py-4">Type</th>
                      <th className="px-5 py-4">Document Wording</th>
                      <th className="px-5 py-4">Updated</th>
                      <th className="px-5 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {sortedArchivedRows.map((row) => (
                      <tr key={row.id} className="text-sm text-slate-300 transition hover:bg-white/[0.035]">
                        <td className="px-5 py-4 font-mono text-xs text-amber-100">{row.code}</td>
                        <td className="px-5 py-4 font-semibold text-white">{row.name}</td>
                        <td className="px-5 py-4">{formatTermType(row.term_type)}</td>
                        <td className="px-5 py-4">
                          <div className="max-w-[360px] line-clamp-2 text-xs leading-5 text-slate-500">
                            {row.document_terms_text ?? row.notes ?? "No wording configured."}
                          </div>
                        </td>
                        <td className="px-5 py-4 text-xs text-slate-500">{formatDateLabel(row.updated_at)}</td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => void handleRestore(row)}
                              disabled={!canArchive || actionLocked}
                              className="h-10 rounded-xl border-emerald-400/20 bg-emerald-500/10 px-3 text-xs font-semibold text-emerald-100 hover:bg-emerald-500/15 disabled:opacity-45"
                            >
                              <RotateCcw className="mr-2 h-4 w-4" />
                              Restore
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => void handleHardDelete(row)}
                              disabled={!canHardDelete || actionLocked}
                              className="h-10 rounded-xl border-rose-400/20 bg-rose-500/10 px-3 text-xs font-semibold text-rose-100 hover:bg-rose-500/15 disabled:opacity-45"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Hard Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="rounded-[20px] border border-amber-400/20 bg-amber-500/10 p-4 text-xs leading-5 text-amber-100/80">
            This table currently supports archived records through the existing payment-terms backend. A separate Deleted tab requires a `deleted` status or equivalent soft-delete field in `finance_payment_terms`; this rewrite does not invent a backend state that is not present in the current typed model.
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
