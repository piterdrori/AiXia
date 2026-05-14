import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Archive,
  CheckCircle2,
  Edit3,
  FileText,
  Loader2,
  Percent,
  Plus,
  RotateCcw,
  Save,
  ShieldCheck,
  Trash2,
  WalletCards,
} from "lucide-react";

import {
  AixiaAccessDeniedState,
  AixiaAccessRule,
  AixiaAlert,
  AixiaArchiveManagerModal,
  AixiaBadge,
  AixiaButton,
  AixiaEmptyState,
  AixiaFieldLabel,
  AixiaFormField,
  AixiaFormFullWidth,
  AixiaFormGrid,
  AixiaHero,
  AixiaInputField,
  AixiaLoadingState,
  AixiaMetricCard,
  AixiaMetricGrid,
  AixiaModal,
  AixiaPage,
  AixiaRegistryToolbar,
  AixiaReviewGrid,
  AixiaSearchField,
  AixiaSection,
  AixiaSelectField,
  AixiaSelectableTile,
  AixiaSortableHeader,
  AixiaStatusBadge,
  AixiaTableActionsCell,
  AixiaTableBadgeCell,
  AixiaTableDateCell,
  AixiaTableShell,
  AixiaTableTextCell,
  AixiaTextareaField,
  AixiaValueBlock,
} from "@/components/aixia";

import { type Permission, type Role } from "@/lib/permissions";
import {
  fetchFinanceEffectivePermissions,
  resolveFinancePagePermissionState,
  type FinanceLoadMode,
} from "@/lib/finance/pageAccess";
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
import { supabase } from "@/lib/supabase";

type LoadMode = FinanceLoadMode;

type ProfilePermissionRow = {
  role: Role | null;
  permissions?: Partial<Record<Permission, boolean>> | null;
};

type StatusFilter = "all" | "active" | "inactive";

type SortKey =
  | "code"
  | "name"
  | "term_type"
  | "due_days"
  | "status"
  | "updated_at";

type SortDirection = "asc" | "desc";

type PageAction =
  | null
  | "create"
  | "edit"
  | "archive"
  | "archive-modal"
  | "restore"
  | "hard-delete";

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

const PAYMENT_TERMS_ACCESS_CONFIG = {
  sectionKey: "masterData",
  adminPermissions: ["manageFinanceMasterData"],
  readPermissions: ["accessFinance", "viewFinance"],
  createPermissions: ["createFinanceRecords"],
  updatePermissions: ["editFinanceRecords"],
  deleteArchivePermissions: ["archiveFinanceRecords"],
} as const;

const TERM_TYPE_OPTIONS: Array<{
  value: FinancePaymentTermType;
  label: string;
  description: string;
  tone: "cyan" | "violet" | "amber" | "emerald";
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

function compareStrings(
  first: string | null | undefined,
  second: string | null | undefined
) {
  return (first || "").localeCompare(second || "");
}

function compareNumbers(
  first: number | string | null | undefined,
  second: number | string | null | undefined
) {
  return Number(first || 0) - Number(second || 0);
}

function compareDates(
  first: string | null | undefined,
  second: string | null | undefined
) {
  return new Date(first || 0).getTime() - new Date(second || 0).getTime();
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

function PaymentTermTypePicker({
  value,
  disabled,
  onChange,
}: {
  value: FinancePaymentTermType;
  disabled: boolean;
  onChange: (value: FinancePaymentTermType) => void;
}) {
  return (
    <AixiaReviewGrid variant="metrics">
      {TERM_TYPE_OPTIONS.map((option) => (
        <AixiaSelectableTile
          key={option.value}
          title={option.label}
          description={option.description}
          tone={option.tone}
          selected={value === option.value}
          disabled={disabled}
          onClick={() => onChange(option.value)}
        />
      ))}
    </AixiaReviewGrid>
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
    <AixiaModal
      open={open}
      title={editingRow ? "Edit Payment Term" : "Create Payment Term"}
      description="Create reusable commercial payment terms for quotations, proforma invoices, invoices, bills, and finance documents."
      badge={
        <>
          <AixiaBadge tone="cyan">Payment Term</AixiaBadge>
          <AixiaBadge tone="emerald">
            {editingRow ? "Edit Mode" : "Create Mode"}
          </AixiaBadge>
        </>
      }
      onClose={onClose}
      maxWidthClassName="max-w-6xl"
      footer={
        <>
          <AixiaButton
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </AixiaButton>

          <AixiaButton
            type="button"
            variant="primary"
            onClick={onSave}
            disabled={saving || !canSave}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {saving ? "Saving..." : editingRow ? "Save Changes" : "Create Payment Term"}
          </AixiaButton>
        </>
      }
    >
      <div className="aixia-stack">
        {error ? <AixiaAlert tone="error">{error}</AixiaAlert> : null}

        <AixiaSection
          title="Payment Structure"
          description="Choose the commercial structure and generate the controlled term."
          icon={WalletCards}
        >
          <div className="aixia-stack">
            <PaymentTermTypePicker
              value={form.term_type}
              disabled={saving}
              onChange={(value) => onChange("term_type", value)}
            />

            {form.term_type === "net" ? (
              <AixiaFormGrid columns="two">
                <AixiaFormField>
                  <AixiaFieldLabel label="Net Days" required />
                  <AixiaInputField
                    type="number"
                    min="0"
                    step="1"
                    value={form.net_days}
                    onChange={(event) => onChange("net_days", event.target.value)}
                    placeholder="Example: 30"
                    disabled={saving}
                  />
                </AixiaFormField>
              </AixiaFormGrid>
            ) : null}

            {form.term_type === "deposit_balance" ? (
              <div className="aixia-stack">
                <AixiaFormGrid columns="three">
                  <AixiaFormField>
                    <AixiaFieldLabel label="Deposit Percentage" required />
                    <AixiaInputField
                      type="number"
                      min="1"
                      max="99"
                      step="0.01"
                      value={form.deposit_percentage}
                      onChange={(event) =>
                        onChange("deposit_percentage", event.target.value)
                      }
                      placeholder="Example: 30"
                      disabled={saving}
                    />
                  </AixiaFormField>

                  <AixiaFormField>
                    <AixiaFieldLabel label="Deposit Due" required />
                    <AixiaSelectField
                      value={form.deposit_due_basis}
                      onChange={(event) =>
                        onChange(
                          "deposit_due_basis",
                          event.target.value as FinancePaymentTermDepositDueBasis
                        )
                      }
                      disabled={saving}
                    >
                      {DEPOSIT_DUE_BASIS_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </AixiaSelectField>
                  </AixiaFormField>

                  <AixiaFormField>
                    <AixiaFieldLabel label="Balance Due" required />
                    <AixiaSelectField
                      value={form.balance_due_basis}
                      onChange={(event) =>
                        onChange(
                          "balance_due_basis",
                          event.target.value as FinancePaymentTermBalanceDueBasis
                        )
                      }
                      disabled={saving}
                    >
                      {BALANCE_DUE_BASIS_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </AixiaSelectField>
                  </AixiaFormField>
                </AixiaFormGrid>

                <AixiaValueBlock
                  label="Balance Auto-Calculated"
                  value={`${depositPercentage}% deposit / ${balancePercentage}% balance`}
                  detail="The balance percentage is calculated automatically from the deposit percentage."
                />
              </div>
            ) : null}

            {form.term_type === "custom" ? (
              <AixiaFormGrid columns="one">
                <AixiaFormField>
                  <AixiaFieldLabel label="Custom Label" required />
                  <AixiaInputField
                    value={form.custom_label}
                    onChange={(event) => onChange("custom_label", event.target.value)}
                    placeholder="Example: 30/40/30 Milestone Payments"
                    disabled={saving}
                  />
                </AixiaFormField>

                <AixiaFormFullWidth>
                  <AixiaFieldLabel label="Custom Document Wording" required />
                  <AixiaTextareaField
                    value={form.custom_terms_text}
                    onChange={(event) =>
                      onChange("custom_terms_text", event.target.value)
                    }
                    placeholder="Example: 30% deposit, 40% before shipment, 30% after installation."
                    disabled={saving}
                  />
                </AixiaFormFullWidth>
              </AixiaFormGrid>
            ) : null}
          </div>
        </AixiaSection>

        <AixiaSection
          title="Auto Preview"
          description="Code, name, and document wording generated from the selected structure."
          icon={FileText}
        >
          <AixiaReviewGrid variant="cards">
            <AixiaValueBlock
              label="Generated Code"
              value={generatedTerm.code}
              detail="Stored master-data code."
            />

            <AixiaValueBlock
              label="Generated Name"
              value={generatedTerm.name}
              detail="Visible payment term name."
            />

            <AixiaValueBlock
              label="Document Wording"
              value={generatedTerm.documentTermsText}
              detail="Text used by finance documents."
            />
          </AixiaReviewGrid>
        </AixiaSection>

        <AixiaSection
          title="Term Controls"
          description="Default behavior, partial payments, status, and internal notes."
          icon={ShieldCheck}
        >
          <AixiaReviewGrid variant="cards">
            <AixiaSelectableTile
              title="Default Term"
              description="Use this as the default option when no term is selected."
              tone="emerald"
              selected={form.is_default}
              disabled={saving}
              onClick={() => onChange("is_default", !form.is_default)}
            />

            <AixiaSelectableTile
              title="Allow Partial Payments"
              description="Lets documents using this term receive partial payments."
              tone="cyan"
              selected={form.allow_partial_payments}
              disabled={saving}
              onClick={() =>
                onChange("allow_partial_payments", !form.allow_partial_payments)
              }
            />
          </AixiaReviewGrid>

          <AixiaFormGrid columns="two" className="mt-5">
            <AixiaFormField>
              <AixiaFieldLabel label="Internal Notes" />
              <AixiaInputField
                value={form.notes}
                onChange={(event) => onChange("notes", event.target.value)}
                placeholder="Optional internal notes"
                disabled={saving}
              />
            </AixiaFormField>

            <AixiaFormField>
              <AixiaFieldLabel label="Status" required />
              <AixiaSelectField
                value={form.status}
                onChange={(event) =>
                  onChange("status", event.target.value as FinancePaymentTermStatus)
                }
                disabled={saving}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="archived">Archived</option>
              </AixiaSelectField>
            </AixiaFormField>
          </AixiaFormGrid>
        </AixiaSection>
      </div>
    </AixiaModal>
  );
}

export default function FinancePaymentTermsPage() {
  const [rows, setRows] = useState<FinancePaymentTermRow[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [backgroundRefreshing, setBackgroundRefreshing] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [archiveSearch, setArchiveSearch] = useState("");
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
  const [runningAction, setRunningAction] = useState<PageAction>(null);

  const generatedTerm = useMemo(() => buildGeneratedTerm(form), [form]);

  const loadPage = useCallback(async (mode: LoadMode = "initial") => {
    if (mode === "silent") {
      setBackgroundRefreshing(true);
    } else {
      setInitialLoading(true);
      setError("");
    }

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      if (user?.id) {
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("role, permissions")
          .eq("user_id", user.id)
          .maybeSingle();

        if (profileError) throw profileError;

        if (profile) {
          const typedProfile = profile as ProfilePermissionRow;
          const backendPermissions = await fetchFinanceEffectivePermissions(
            user.id,
            mode,
            "Payment Terms"
          );

          setRole(typedProfile.role);
          setPermissionOverrides(backendPermissions || typedProfile.permissions || null);
        }
      } else if (mode === "initial") {
        setRole(null);
        setPermissionOverrides(null);
      }

      const paymentTerms = await getPaymentTerms();
      setRows(paymentTerms);

      if (mode === "initial") {
        setError("");
      }
    } catch (loadError) {
      console.error("Failed to load payment terms:", loadError);

      if (mode === "initial") {
        setRows([]);
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Failed to load payment terms."
        );
      }
    } finally {
      if (mode === "silent") {
        setBackgroundRefreshing(false);
      } else {
        setInitialLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void loadPage("initial");
  }, [loadPage]);

  useEffect(() => {
    const channel = supabase
      .channel("finance-payment-terms-master-data")
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
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_payment_terms" },
        () => void loadPage("silent")
      )
      .subscribe();

    const intervalId = window.setInterval(() => {
      void loadPage("silent");
    }, 60000);

    return () => {
      window.clearInterval(intervalId);
      void supabase.removeChannel(channel);
    };
  }, [loadPage]);

  const permissionState = useMemo(() => {
    return resolveFinancePagePermissionState({
      profileRole: role,
      permissions: permissionOverrides,
      config: PAYMENT_TERMS_ACCESS_CONFIG,
    });
  }, [permissionOverrides, role]);

  const canCreate = permissionState.canCreate;
  const canEdit = permissionState.canUpdate;
  const canArchive = permissionState.canDeleteArchive;
  const canDelete = canArchive;

  const activeRows = useMemo(() => {
    return rows.filter((row) => row.status !== "archived");
  }, [rows]);

  const archivedRows = useMemo(() => {
    return rows.filter((row) => row.status === "archived");
  }, [rows]);

  const filteredArchivedRows = useMemo(() => {
    const query = archiveSearch.trim().toLowerCase();

    return archivedRows.filter((row) => {
      if (!query) return true;

      return [
        row.code,
        row.name,
        row.term_type,
        row.document_label,
        row.document_terms_text,
        row.notes,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [archiveSearch, archivedRows]);

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

    sorted.sort((first, second) => {
      let comparison = 0;

      if (sortKey === "updated_at") {
        comparison = compareDates(first.updated_at, second.updated_at);
      }

      if (sortKey === "due_days") {
        comparison = compareNumbers(first.due_days, second.due_days);
      }

      if (sortKey === "code") {
        comparison = compareStrings(first.code, second.code);
      }

      if (sortKey === "name") {
        comparison = compareStrings(first.name, second.name);
      }

      if (sortKey === "term_type") {
        comparison = compareStrings(first.term_type, second.term_type);
      }

      if (sortKey === "status") {
        comparison = compareStrings(first.status, second.status);
      }

      return sortDirection === "asc" ? comparison : -comparison;
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

  function updateForm<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function openCreateDialog() {
    if (!canCreate) return;

    setEditingRow(null);
    setForm(EMPTY_FORM);
    setError("");
    setPageMessage("");
    setDialogOpen(true);
  }

  function openEditDialog(row: FinancePaymentTermRow) {
    if (!canEdit) return;

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
      setRunningAction(editingRow ? "edit" : "create");
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
      await loadPage("silent");
    } catch (saveError) {
      console.error("Payment term save failed:", saveError);
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Failed to save payment term."
      );
    } finally {
      setSaving(false);
      setRunningAction(null);
    }
  }

  async function handleArchive(row: FinancePaymentTermRow) {
    if (!canArchive || runningAction) return;

    try {
      setRunningAction("archive");
      setActionLoadingId(row.id);
      setPageMessage("");
      setError("");

      await archivePaymentTerm(row.id);

      setPageMessage("Payment term archived successfully.");
      await loadPage("silent");
    } catch (archiveError) {
      console.error("Payment term archive failed:", archiveError);
      setError(
        archiveError instanceof Error
          ? archiveError.message
          : "Failed to archive payment term."
      );
    } finally {
      setActionLoadingId(null);
      setRunningAction(null);
    }
  }

  async function handleRestore(row: FinancePaymentTermRow) {
    if (!canArchive || runningAction) return;

    try {
      setRunningAction("restore");
      setActionLoadingId(row.id);
      setPageMessage("");
      setError("");

      await restorePaymentTerm(row.id);

      setPageMessage("Payment term restored successfully.");
      await loadPage("silent");
    } catch (restoreError) {
      console.error("Payment term restore failed:", restoreError);
      setError(
        restoreError instanceof Error
          ? restoreError.message
          : "Failed to restore payment term."
      );
    } finally {
      setActionLoadingId(null);
      setRunningAction(null);
    }
  }

  async function handlePermanentDelete(row: FinancePaymentTermRow) {
    if (!canDelete || runningAction) return;

    try {
      setRunningAction("hard-delete");
      setActionLoadingId(row.id);
      setPageMessage("");
      setError("");

      await permanentlyDeletePaymentTerm(row.id);

      setPageMessage("Payment term permanently deleted.");
      await loadPage("silent");
    } catch (deleteError) {
      console.error("Payment term permanent delete failed:", deleteError);
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Failed to permanently delete payment term."
      );
    } finally {
      setActionLoadingId(null);
      setRunningAction(null);
    }
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditingRow(null);
    setForm(EMPTY_FORM);
    setError("");
  }

  if (initialLoading) {
    return (
      <AixiaLoadingState
        title="Loading payment terms"
        description="Payment terms, archive state, and permission state are being checked."
      />
    );
  }

  return (
    <AixiaPage>
      <AixiaHero
        parentLabel="Master Data"
        parentPath="/finance/master-data"
        badges={[
          { label: "Finance Master Data", tone: "cyan" },
          { label: "Payment Terms", tone: "violet" },
          { label: "Document Wording", tone: "emerald" },
          {
            label: backgroundRefreshing ? "Updating Silently" : "Realtime + 60s",
            tone: backgroundRefreshing ? "gold" : "neutral",
          },
        ]}
        gradientTitle="Payment"
        title="Terms"
        subtitle="Controlled Finance Document Terms"
        description="Manage reusable payment terms used across finance documents. Terms control document wording, due logic, deposit rules, default selection, and partial payment behavior."
        statusCards={[
          {
            label: "Read Access",
            value: permissionState.canRead ? "Enabled" : "Locked",
            description:
              "This registry requires Finance read access or Master Data admin access.",
            icon: permissionState.canRead ? ShieldCheck : Archive,
            tone: permissionState.canRead ? "emerald" : "rose",
          },
          {
            label: "Lifecycle Access",
            value: canArchive ? "Archive Enabled" : canCreate ? "Create Enabled" : "Read Only",
            description:
              "Create, Edit, Archive, Restore, and Permanent Delete follow Finance permissions.",
            icon: canArchive ? Archive : WalletCards,
            tone: canArchive ? "amber" : "cyan",
          },
        ]}
      />

      {error ? <AixiaAlert tone="error">{error}</AixiaAlert> : null}
      {pageMessage ? <AixiaAlert tone="success">{pageMessage}</AixiaAlert> : null}

      {!permissionState.canRead ? (
        <AixiaAccessDeniedState
          title="No payment terms access"
          description="Ask an Admin to assign Finance read or Finance master-data access before managing payment terms."
        />
      ) : (
        <>
          <AixiaMetricGrid>
            <AixiaMetricCard
              label="Active Terms"
              value={stats.active}
              description="Available payment terms that can be selected on finance documents."
              icon={CheckCircle2}
              tone="emerald"
            />

            <AixiaMetricCard
              label="Deposit Terms"
              value={stats.deposit}
              description="Terms that require a deposit before the remaining balance."
              icon={Percent}
              tone="gold"
            />

            <AixiaMetricCard
              label="Default Term"
              value={stats.defaultTerm}
              description="The active default payment term for document creation."
              icon={WalletCards}
              tone="indigo"
            />

            <AixiaMetricCard
              label="Archived"
              value={stats.archived}
              description="Inactive historical terms stored in the archive area."
              icon={Archive}
              tone="violet"
            />
          </AixiaMetricGrid>

          <AixiaSection
            title="Payment Terms Registry"
            description="Active and inactive terms. Archived records are managed from the archive manager."
            icon={WalletCards}
          >
            <AixiaRegistryToolbar
              search={
                <AixiaSearchField
                  width="wide"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search code, name, type, wording, or notes..."
                />
              }
              filters={
                <AixiaSelectField
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(event.target.value as StatusFilter)
                  }
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </AixiaSelectField>
              }
              primaryAction={
                canCreate ? (
                  <AixiaButton
                    type="button"
                    variant="primary"
                    onClick={openCreateDialog}
                    disabled={saving}
                  >
                    <Plus className="h-4 w-4" />
                    New Payment Term
                  </AixiaButton>
                ) : null
              }
              archiveAction={
                canArchive ? (
                  <AixiaButton
                    type="button"
                    variant="danger"
                    onClick={() => {
                      setRunningAction("archive-modal");
                      setArchiveOpen(true);
                      setRunningAction(null);
                    }}
                    disabled={saving || runningAction === "archive-modal"}
                  >
                    {runningAction === "archive-modal" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Archive className="h-4 w-4" />
                    )}
                    Archive
                  </AixiaButton>
                ) : null
              }
            />
            {sortedRows.length === 0 ? (
              <AixiaEmptyState
                icon={WalletCards}
                title="No payment terms found"
                description="Create a payment term or adjust the search and status filters."
              />
            ) : (
              <AixiaTableShell variant="registry" minWidthClassName="min-w-[1240px]">
                <thead className="aixia-table-head">
                  <tr>
                    <th>
                      <AixiaSortableHeader
                        label="Code"
                        sortKey="code"
                        activeSortKey={sortKey}
                        sortDirection={sortDirection}
                        onSort={updateSort}
                      />
                    </th>
                    <th>
                      <AixiaSortableHeader
                        label="Name"
                        sortKey="name"
                        activeSortKey={sortKey}
                        sortDirection={sortDirection}
                        onSort={updateSort}
                      />
                    </th>
                    <th>
                      <AixiaSortableHeader
                        label="Type"
                        sortKey="term_type"
                        activeSortKey={sortKey}
                        sortDirection={sortDirection}
                        onSort={updateSort}
                      />
                    </th>
                    <th>
                      <AixiaSortableHeader
                        label="Due Days"
                        sortKey="due_days"
                        activeSortKey={sortKey}
                        sortDirection={sortDirection}
                        onSort={updateSort}
                      />
                    </th>
                    <th>Deposit</th>
                    <th>Document Wording</th>
                    <th>
                      <AixiaSortableHeader
                        label="Status"
                        sortKey="status"
                        activeSortKey={sortKey}
                        sortDirection={sortDirection}
                        onSort={updateSort}
                      />
                    </th>
                    <th>
                      <AixiaSortableHeader
                        label="Updated"
                        sortKey="updated_at"
                        activeSortKey={sortKey}
                        sortDirection={sortDirection}
                        onSort={updateSort}
                      />
                    </th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {sortedRows.map((row) => {
                    const isRowActionRunning = actionLoadingId === row.id;

                    return (
                      <tr key={row.id} className="aixia-table-row">
                        <AixiaTableTextCell width="md" primary={row.code} />

                        <AixiaTableTextCell
                          width="lg"
                          primary={row.name}
                          secondary={row.is_default ? "Default term" : "Payment term"}
                        />

                        <AixiaTableBadgeCell width="md">
                          <AixiaBadge tone={row.term_type === "deposit_balance" ? "gold" : "cyan"}>
                            {formatTermType(row.term_type)}
                          </AixiaBadge>
                        </AixiaTableBadgeCell>

                        <AixiaTableTextCell
                          width="sm"
                          primary={String(row.due_days)}
                          secondary="days"
                        />

                        <AixiaTableTextCell
                          width="md"
                          primary={
                            row.requires_deposit
                              ? `${row.deposit_percentage ?? 0}%`
                              : "No deposit"
                          }
                          secondary={
                            row.requires_deposit
                              ? formatBasisLabel(row.deposit_due_basis)
                              : "Full balance"
                          }
                        />

                        <AixiaTableTextCell
                          width="xl"
                          primary={row.document_terms_text || row.document_label || "—"}
                          secondary={row.document_label || "Document wording"}
                        />

                        <AixiaTableBadgeCell width="sm">
                          <AixiaStatusBadge value={row.status} />
                        </AixiaTableBadgeCell>

                        <AixiaTableDateCell width="sm">
                          {formatDateLabel(row.updated_at)}
                        </AixiaTableDateCell>

                        <AixiaTableActionsCell>
                          {canEdit ? (
                            <AixiaButton
                              type="button"
                              variant="primary"
                              onClick={() => openEditDialog(row)}
                              disabled={saving}
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                              Edit
                            </AixiaButton>
                          ) : null}

                          {canArchive ? (
                            <AixiaButton
                              type="button"
                              variant="danger"
                              onClick={() => void handleArchive(row)}
                              disabled={saving || isRowActionRunning}
                            >
                              {isRowActionRunning && runningAction === "archive" ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Archive className="h-3.5 w-3.5" />
                              )}
                              Archive
                            </AixiaButton>
                          ) : null}
                        </AixiaTableActionsCell>
                      </tr>
                    );
                  })}
                </tbody>
              </AixiaTableShell>
            )}
          </AixiaSection>

          <AixiaAccessRule
            title="Locked access rule"
            description="Finance registry pages must show the shared Locked access rule block."
          >
            This registry shows active and inactive payment terms only. Archived records are
            managed from the archive manager. Edit uses primary styling, Restore uses secondary
            styling, and Archive/Delete Permanently use danger styling. Silent refresh must not
            reset filters, sorting, modals, or table position.
          </AixiaAccessRule>
        </>
      )}

      <AixiaArchiveManagerModal
        open={archiveOpen}
        title="Payment Terms Archive"
        description="Restore archived payment terms or permanently delete records when allowed."
        archivedCount={archivedRows.length}
        onClose={() => {
          setArchiveOpen(false);
          setArchiveSearch("");
        }}
      >
        <div className="aixia-stack">
          <AixiaSearchField
            width="full"
            value={archiveSearch}
            onChange={(event) => setArchiveSearch(event.target.value)}
            placeholder="Search archived payment terms"
          />

          {filteredArchivedRows.length === 0 ? (
            <AixiaEmptyState
              icon={Archive}
              title="No archived payment terms"
              description="Archived payment terms will appear here for restore or permanent delete actions."
            />
          ) : (
            <AixiaTableShell variant="archive" minWidthClassName="min-w-[980px]">
              <thead className="aixia-table-head">
                <tr>
                  <th>Code</th>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Updated</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredArchivedRows.map((row) => {
                  const isRowActionRunning = actionLoadingId === row.id;

                  return (
                    <tr key={row.id} className="aixia-table-row">
                      <AixiaTableTextCell width="md" primary={row.code} />

                      <AixiaTableTextCell
                        width="xl"
                        primary={row.name}
                        secondary={row.document_label || row.document_terms_text || "Archived term"}
                      />

                      <AixiaTableBadgeCell width="md">
                        <AixiaBadge tone={row.term_type === "deposit_balance" ? "gold" : "cyan"}>
                          {formatTermType(row.term_type)}
                        </AixiaBadge>
                      </AixiaTableBadgeCell>

                      <AixiaTableDateCell width="sm">
                        {formatDateLabel(row.updated_at)}
                      </AixiaTableDateCell>

                      <AixiaTableActionsCell>
                        <AixiaButton
                          type="button"
                          variant="secondary"
                          onClick={() => void handleRestore(row)}
                          disabled={!canArchive || saving || isRowActionRunning}
                        >
                          {isRowActionRunning && runningAction === "restore" ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <RotateCcw className="h-3.5 w-3.5" />
                          )}
                          Restore
                        </AixiaButton>

                        <AixiaButton
                          type="button"
                          variant="danger"
                          onClick={() => void handlePermanentDelete(row)}
                          disabled={!canDelete || saving || isRowActionRunning}
                        >
                          {isRowActionRunning && runningAction === "hard-delete" ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                          Delete Permanently
                        </AixiaButton>
                      </AixiaTableActionsCell>
                    </tr>
                  );
                })}
              </tbody>
            </AixiaTableShell>
          )}
        </div>
      </AixiaArchiveManagerModal>

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
        onSave={() => void handleSave()}
      />
    </AixiaPage>
  );
}
