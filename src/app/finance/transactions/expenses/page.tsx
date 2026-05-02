import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Archive,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Eye,
  FileText,
  Receipt,
  RotateCcw,
  Search,
  Sparkles,
  Trash2,
  WalletCards,
  X,
} from "lucide-react";

import { supabase } from "@/lib/supabase";

type SortDirection = "asc" | "desc";
type ArchiveTab = "archived" | "deleted";

type ExpenseRow = {
  id: string;
  expense_number: string | null;
  title: string;
  description: string | null;
  amount: number | string | null;
  expense_date: string;
  expense_type: string;
  status: string;
  request_status: string | null;
  documentation_status: string | null;
  finance_review_status: string | null;
  coverage_status: string | null;
  recipient_confirmation_status: string | null;
  company_id: string | null;
  employee_ref_id: string | null;
  expense_made_by_type: string | null;
  responsible_person_name: string | null;
  expense_source_name: string | null;
  online_platform: string | null;
  online_order_number: string | null;
  created_at: string;
  updated_at: string;
};

type CompanyRow = {
  id: string;
  name: string | null;
};

type EmployeeRefRow = {
  id: string;
  user_id: string | null;
  code: string | null;
  mark: string | null;
  status: string | null;
  metadata: {
    company?: string | null;
    job_title?: string | null;
    member_type?: string | null;
    source_role?: string | null;
    source_status?: string | null;
  } | null;
};

type ProfileRow = {
  user_id: string;
  full_name: string | null;
  display_name: string | null;
  email: string | null;
  company: string | null;
  job_title: string | null;
  member_type: string | null;
};

type AllocationRow = {
  id: string;
  expense_id: string;
  allocated_amount: number | string | null;
  recipient_confirmation_status: string | null;
};

type SortKey =
  | "expense_number"
  | "expense_date"
  | "company"
  | "made_by"
  | "expense_type"
  | "expense_source"
  | "amount"
  | "documentation_status"
  | "finance_review_status"
  | "coverage_status"
  | "recipient_confirmation_status"
  | "updated_at";

type EnrichedExpenseRow = ExpenseRow & {
  companyName: string;
  madeByLabel: string;
  allocatedAmount: number;
};

const statusToneMap: Record<
  string,
  "cyan" | "emerald" | "amber" | "rose" | "violet" | "slate"
> = {
  requested: "cyan",
  approved_to_spend: "emerald",
  rejected_before_spend: "rose",
  expense_made: "amber",
  documentation_submitted: "cyan",
  documentation_issue: "rose",
  verified_for_payment: "emerald",
  draft: "slate",
  missing: "rose",
  uploaded: "cyan",
  linked: "cyan",
  files_and_links: "cyan",
  verified: "emerald",
  issue_found: "rose",
  pending_review: "amber",
  approved_for_payment: "emerald",
  rejected: "rose",
  needs_correction: "amber",
  not_covered: "slate",
  partially_covered: "amber",
  covered: "emerald",
  not_paid_yet: "slate",
  pending_confirmation: "amber",
  received_confirmed: "emerald",
  not_received: "rose",
  disputed: "rose",
  admin_closed: "violet",
  archived: "amber",
  deleted: "rose",
};

function toNumber(value: number | string | null | undefined) {
  return Number(value ?? 0);
}

function formatMoney(value: number | string | null | undefined) {
  return toNumber(value).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return parsed.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatLabel(value: string | null | undefined) {
  if (!value) return "—";

  return value
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getStatusToneClasses(value: string | null | undefined) {
  const tone = statusToneMap[value ?? ""] ?? "slate";

  switch (tone) {
    case "emerald":
      return "border-emerald-400/20 bg-emerald-500/10 text-emerald-200";
    case "amber":
      return "border-amber-400/20 bg-amber-500/10 text-amber-200";
    case "rose":
      return "border-rose-400/20 bg-rose-500/10 text-rose-200";
    case "violet":
      return "border-violet-400/20 bg-violet-500/10 text-violet-200";
    case "cyan":
      return "border-cyan-400/20 bg-cyan-500/10 text-cyan-200";
    case "slate":
    default:
      return "border-white/10 bg-white/[0.06] text-slate-300";
  }
}

function StatusBadge({ value }: { value: string | null | undefined }) {
  return (
    <span
      className={`inline-flex max-w-full items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${getStatusToneClasses(
        value
      )}`}
    >
      <span className="truncate">{formatLabel(value)}</span>
    </span>
  );
}

function IconButton({
  label,
  icon: Icon,
  tone,
  onClick,
}: {
  label: string;
  icon: typeof Eye;
  tone: "cyan" | "amber" | "rose" | "emerald";
  onClick: () => void;
}) {
  const toneClass = {
    cyan: "border-cyan-400/20 bg-cyan-500/10 text-cyan-200 hover:bg-cyan-500/15",
    amber:
      "border-amber-400/20 bg-amber-500/10 text-amber-200 hover:bg-amber-500/15",
    rose: "border-rose-400/20 bg-rose-500/10 text-rose-200 hover:bg-rose-500/15",
    emerald:
      "border-emerald-400/20 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/15",
  }[tone];

  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-full border transition ${toneClass}`}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

function SortHeader({
  label,
  sortKey,
  activeKey,
  direction,
  onSort,
  alignRight = false,
}: {
  label: string;
  sortKey: SortKey;
  activeKey: SortKey;
  direction: SortDirection;
  onSort: (key: SortKey) => void;
  alignRight?: boolean;
}) {
  const isActive = activeKey === sortKey;
  const SortIcon = direction === "asc" ? ChevronUp : ChevronDown;

  return (
    <th className={`px-5 py-4 ${alignRight ? "text-right" : "text-left"}`}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={`inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] transition ${
          isActive ? "text-cyan-200" : "text-slate-500 hover:text-slate-300"
        }`}
      >
        {label}
        {isActive ? <SortIcon className="h-3.5 w-3.5" /> : null}
      </button>
    </th>
  );
}

function getExpenseLifecycle(row: ExpenseRow) {
  return row.request_status || row.status || "draft";
}

function isArchived(row: ExpenseRow) {
  return getExpenseLifecycle(row) === "archived" || row.status === "archived";
}

function isDeleted(row: ExpenseRow) {
  return getExpenseLifecycle(row) === "deleted" || row.status === "deleted";
}

function isActive(row: ExpenseRow) {
  return !isArchived(row) && !isDeleted(row);
}

function getMadeByLabel(
  row: ExpenseRow,
  employeeMap: Map<string, EmployeeRefRow>,
  profileMap: Map<string, ProfileRow>
) {
  if (row.expense_made_by_type === "employee" && row.employee_ref_id) {
    const employee = employeeMap.get(row.employee_ref_id);

    if (!employee) return "Employee";

    const profile = employee.user_id ? profileMap.get(employee.user_id) : null;

    const employeeName =
      profile?.full_name?.trim() ||
      profile?.display_name?.trim() ||
      profile?.email?.trim() ||
      employee.code?.trim() ||
      "Employee";

    const employeeRole =
      profile?.job_title?.trim() ||
      employee.metadata?.job_title?.trim() ||
      employee.metadata?.source_role?.trim() ||
      employee.mark?.trim() ||
      null;

    return [employeeName, employeeRole].filter(Boolean).join(" • ");
  }

  if (row.expense_made_by_type === "owner_management") {
    return row.responsible_person_name || "Owner / Management";
  }

  if (row.expense_made_by_type === "company_direct") {
    return "Company Direct";
  }

  if (row.expense_made_by_type === "other") {
    return row.responsible_person_name || "Other";
  }

  return "—";
}

function getSortValue(row: EnrichedExpenseRow, sortKey: SortKey) {
  switch (sortKey) {
    case "expense_number":
      return row.expense_number || "";
    case "expense_date":
      return row.expense_date || "";
    case "company":
      return row.companyName || "";
    case "made_by":
      return row.madeByLabel || "";
    case "expense_type":
      return row.expense_type || "";
    case "expense_source":
      return row.expense_source_name || "";
    case "amount":
      return toNumber(row.amount);
    case "documentation_status":
      return row.documentation_status || "";
    case "finance_review_status":
      return row.finance_review_status || "";
    case "coverage_status":
      return row.coverage_status || "";
    case "recipient_confirmation_status":
      return row.recipient_confirmation_status || "";
    case "updated_at":
    default:
      return row.updated_at || "";
  }
}

export default function FinanceExpensesPage() {
  const navigate = useNavigate();

  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [employees, setEmployees] = useState<EmployeeRefRow[]>([]);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [allocations, setAllocations] = useState<AllocationRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("updated_at");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [archiveModalOpen, setArchiveModalOpen] = useState(false);
  const [archiveTab, setArchiveTab] = useState<ArchiveTab>("archived");
  const [actionError, setActionError] = useState<string | null>(null);

  const companyMap = useMemo(() => {
    return new Map(companies.map((company) => [company.id, company]));
  }, [companies]);

  const employeeMap = useMemo(() => {
    return new Map(employees.map((employee) => [employee.id, employee]));
  }, [employees]);

  const profileMap = useMemo(() => {
    return new Map(profiles.map((profile) => [profile.user_id, profile]));
  }, [profiles]);

  const loadExpenses = useCallback(async () => {
    setIsLoading(true);
    setActionError(null);

    try {
      const [expensesResult, companiesResult, employeesResult, profilesResult] =
        await Promise.all([
          supabase
            .from("finance_expenses")
            .select(
              [
                "id",
                "expense_number",
                "title",
                "description",
                "amount",
                "expense_date",
                "expense_type",
                "status",
                "request_status",
                "documentation_status",
                "finance_review_status",
                "coverage_status",
                "recipient_confirmation_status",
                "company_id",
                "employee_ref_id",
                "expense_made_by_type",
                "responsible_person_name",
                "expense_source_name",
                "online_platform",
                "online_order_number",
                "created_at",
                "updated_at",
              ].join(", ")
            )
            .order("updated_at", { ascending: false })
            .limit(500),

          supabase.from("finance_companies").select("id, name").order("name"),

          supabase
            .from("finance_employee_refs")
            .select("id, user_id, code, mark, status, metadata")
            .order("code"),

          supabase
            .from("profiles")
            .select(
              "user_id, full_name, display_name, email, company, job_title, member_type"
            )
            .order("full_name"),
        ]);

      if (expensesResult.error) throw expensesResult.error;
      if (companiesResult.error) throw companiesResult.error;
      if (employeesResult.error) throw employeesResult.error;
      if (profilesResult.error) throw profilesResult.error;

      const loadedExpenses = (expensesResult.data || []) as unknown as ExpenseRow[];

      setExpenses(loadedExpenses);
      setCompanies((companiesResult.data || []) as CompanyRow[]);
      setEmployees((employeesResult.data || []) as EmployeeRefRow[]);
      setProfiles((profilesResult.data || []) as ProfileRow[]);

      const expenseIds = loadedExpenses.map((item) => item.id);

      if (expenseIds.length === 0) {
        setAllocations([]);
      } else {
        const allocationsResult = await supabase
          .from("finance_payment_made_expense_allocations")
          .select("id, expense_id, allocated_amount, recipient_confirmation_status")
          .in("expense_id", expenseIds);

        if (allocationsResult.error) throw allocationsResult.error;

        setAllocations((allocationsResult.data || []) as AllocationRow[]);
      }
    } catch (error) {
      console.error("Failed to load operating expenses:", error);
      setActionError("Failed to load expenses.");
      setExpenses([]);
      setCompanies([]);
      setEmployees([]);
      setProfiles([]);
      setAllocations([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadExpenses();
  }, [loadExpenses]);

  useEffect(() => {
    const channel = supabase
      .channel("finance-operating-expenses-registry")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_expenses" },
        () => void loadExpenses()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "finance_payment_made_expense_allocations",
        },
        () => void loadExpenses()
      )
      .subscribe();

    const intervalId = window.setInterval(() => {
      void loadExpenses();
    }, 60000);

    return () => {
      window.clearInterval(intervalId);
      supabase.removeChannel(channel);
    };
  }, [loadExpenses]);

  const enrichedExpenses = useMemo<EnrichedExpenseRow[]>((() => {
    return expenses.map((row) => {
      const rowAllocations = allocations.filter((item) => item.expense_id === row.id);
      const allocatedAmount = rowAllocations.reduce(
        (sum, item) => sum + toNumber(item.allocated_amount),
        0
      );

      return {
        ...row,
        companyName: row.company_id
          ? companyMap.get(row.company_id)?.name || "Unknown company"
          : "No company",
        madeByLabel: getMadeByLabel(row, employeeMap, profileMap),
        allocatedAmount,
      };
    });
  }, [allocations, companyMap, employeeMap, expenses, profileMap]);

  const filteredExpenses = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();

    return enrichedExpenses.filter((row) => {
      if (!normalizedSearch) return true;

      const content = [
        row.expense_number,
        row.title,
        row.description,
        row.companyName,
        row.madeByLabel,
        row.expense_type,
        row.expense_source_name,
        row.online_platform,
        row.online_order_number,
        row.request_status,
        row.documentation_status,
        row.finance_review_status,
        row.coverage_status,
        row.recipient_confirmation_status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return content.includes(normalizedSearch);
    });
  }, [enrichedExpenses, searchQuery]);

  const activeRows = useMemo(() => {
    return filteredExpenses.filter(isActive);
  }, [filteredExpenses]);

  const archivedRows = useMemo(() => {
    return filteredExpenses.filter(isArchived);
  }, [filteredExpenses]);

  const deletedRows = useMemo(() => {
    return filteredExpenses.filter(isDeleted);
  }, [filteredExpenses]);

  const sortedActiveRows = useMemo(() => {
    return [...activeRows].sort((a, b) => {
      const valueA = getSortValue(a, sortKey);
      const valueB = getSortValue(b, sortKey);

      if (typeof valueA === "number" && typeof valueB === "number") {
        return sortDirection === "asc" ? valueA - valueB : valueB - valueA;
      }

      return sortDirection === "asc"
        ? String(valueA).localeCompare(String(valueB))
        : String(valueB).localeCompare(String(valueA));
    });
  }, [activeRows, sortDirection, sortKey]);

  const archiveRows = archiveTab === "archived" ? archivedRows : deletedRows;

  const metrics = useMemo(() => {
    const active = enrichedExpenses.filter(isActive);
    const pendingReview = active.filter(
      (row) => row.finance_review_status === "pending_review"
    ).length;
    const readyForPayment = active.filter(
      (row) => row.finance_review_status === "approved_for_payment"
    ).length;
    const covered = active.filter((row) => row.coverage_status === "covered").length;

    return {
      active: active.length,
      pendingReview,
      readyForPayment,
      covered,
      archived: archivedRows.length,
      deleted: deletedRows.length,
    };
  }, [archivedRows.length, deletedRows.length, enrichedExpenses]);

  const handleSort = useCallback(
    (key: SortKey) => {
      if (key === sortKey) {
        setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
        return;
      }

      setSortKey(key);
      setSortDirection("asc");
    },
    [sortKey]
  );

  const runExpenseAction = useCallback(
    async (rpcName: string, expenseId: string) => {
      setActionError(null);

      const result = await supabase.rpc(rpcName, {
        p_expense_id: expenseId,
      });

      if (result.error) {
        setActionError(result.error.message);
        return;
      }

      await loadExpenses();
    },
    [loadExpenses]
  );

  const renderRows = useCallback(
    (rows: EnrichedExpenseRow[], mode: "active" | "archive") => {
      if (rows.length === 0) {
        return (
          <tr>
            <td colSpan={12} className="px-5 py-12 text-center">
              <div className="text-sm font-medium text-white">
                No expense records found
              </div>
              <div className="mt-2 text-sm text-slate-500">
                New expense requests will appear here.
              </div>
            </td>
          </tr>
        );
      }

      return rows.map((row) => (
        <tr
          key={row.id}
          className="border-b border-white/5 text-sm text-slate-300 transition hover:bg-white/[0.035]"
        >
          <td className="whitespace-nowrap px-5 py-4">
            <div className="font-semibold text-white">
              {row.expense_number || "Draft expense"}
            </div>
            <div className="mt-1 text-xs text-slate-500">{formatDate(row.updated_at)}</div>
          </td>

          <td className="whitespace-nowrap px-5 py-4">{formatDate(row.expense_date)}</td>

          <td className="min-w-[180px] px-5 py-4">
            <div className="font-medium text-slate-200">{row.companyName}</div>
          </td>

          <td className="min-w-[220px] px-5 py-4">
            <div className="font-medium text-slate-200">{row.madeByLabel}</div>
            <div className="mt-1 text-xs text-slate-500">
              {formatLabel(row.expense_made_by_type)}
            </div>
          </td>

          <td className="min-w-[170px] px-5 py-4">{formatLabel(row.expense_type)}</td>

          <td className="min-w-[220px] px-5 py-4">
            <div className="font-medium text-slate-200">
              {row.expense_source_name || row.title || "—"}
            </div>
            {row.online_platform || row.online_order_number ? (
              <div className="mt-1 text-xs text-cyan-200/80">
                {[row.online_platform, row.online_order_number].filter(Boolean).join(" • ")}
              </div>
            ) : null}
          </td>

          <td className="whitespace-nowrap px-5 py-4 text-right font-semibold text-white">
            ${formatMoney(row.amount)}
          </td>

          <td className="whitespace-nowrap px-5 py-4">
            <StatusBadge value={row.documentation_status} />
          </td>

          <td className="whitespace-nowrap px-5 py-4">
            <StatusBadge value={row.finance_review_status} />
          </td>

          <td className="whitespace-nowrap px-5 py-4">
            <StatusBadge value={row.coverage_status} />
            <div className="mt-1 text-xs text-slate-500">
              Covered ${formatMoney(row.allocatedAmount)}
            </div>
          </td>

          <td className="min-w-[170px] px-5 py-4">
            <StatusBadge value={row.recipient_confirmation_status} />
          </td>

          <td className="sticky right-0 bg-[#05070d]/95 px-5 py-4 backdrop-blur-xl">
            <div className="flex items-center justify-end gap-2">
              <IconButton
                label="Open expense"
                icon={Eye}
                tone="cyan"
                onClick={() => navigate(`/finance/transactions/expenses/${row.id}`)}
              />

              {mode === "active" ? (
                <>
                  <IconButton
                    label="Archive expense"
                    icon={Archive}
                    tone="amber"
                    onClick={() => void runExpenseAction("finance_archive_expense", row.id)}
                  />
                  <IconButton
                    label="Delete expense"
                    icon={Trash2}
                    tone="rose"
                    onClick={() => void runExpenseAction("finance_delete_expense", row.id)}
                  />
                </>
              ) : archiveTab === "archived" ? (
                <IconButton
                  label="Restore expense"
                  icon={RotateCcw}
                  tone="emerald"
                  onClick={() => void runExpenseAction("finance_restore_expense", row.id)}
                />
              ) : (
                <>
                  <IconButton
                    label="Restore expense"
                    icon={RotateCcw}
                    tone="emerald"
                    onClick={() => void runExpenseAction("finance_restore_expense", row.id)}
                  />
                  <IconButton
                    label="Hard delete expense"
                    icon={Trash2}
                    tone="rose"
                    onClick={() =>
                      void runExpenseAction("finance_hard_delete_expense", row.id)
                    }
                  />
                </>
              )}
            </div>
          </td>
        </tr>
      ));
    },
    [archiveTab, navigate, runExpenseAction]
  );

  return (
    <div className="min-h-screen bg-[#05070d] px-4 py-4 text-white md:px-6 md:py-6">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
        <header className="relative overflow-hidden rounded-[34px] border border-white/10 bg-white/[0.045] p-6 shadow-2xl shadow-black/30 backdrop-blur-xl">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(6,182,212,0.16),transparent_38%),radial-gradient(circle_at_top_right,rgba(139,92,246,0.12),transparent_34%)]" />

          <div className="relative">
            <button
              type="button"
              onClick={() => navigate("/finance/transactions")}
              className="mb-5 inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-300 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
            >
              <ArrowRight className="h-3.5 w-3.5 rotate-180" />
              Transactions
            </button>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_440px] xl:items-end">
              <div>
                <div className="inline-flex w-fit items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-200">
                  <Sparkles className="h-3.5 w-3.5" />
                  Operating Expenses
                </div>

                <h1 className="mt-4 text-3xl font-semibold tracking-[-0.035em] text-white md:text-5xl">
                  Expense Requests
                </h1>

                <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-400 md:text-base md:leading-7">
                  Public/internal expense request intake. People request permission, upload
                  documentation, track finance review, see payment coverage, and confirm received
                  reimbursement after payment.
                </p>

                <div className="mt-5 flex flex-wrap gap-2">
                  <div className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-200">
                    No payment controls here
                  </div>
                  <div className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-200">
                    Documentation required
                  </div>
                  <div className="rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-violet-200">
                    Recipient confirmation
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="min-h-[148px] rounded-[24px] border border-white/10 bg-black/20 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                        Active
                      </div>
                      <div className="mt-2 text-3xl font-semibold text-white">
                        {isLoading ? "—" : metrics.active}
                      </div>
                    </div>
                    <Receipt className="h-5 w-5 text-cyan-200" />
                  </div>
                  <div className="mt-3 text-xs leading-5 text-slate-500">
                    Active expense requests excluding archived and deleted records.
                  </div>
                </div>

                <div className="min-h-[148px] rounded-[24px] border border-white/10 bg-black/20 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                        Ready
                      </div>
                      <div className="mt-2 text-3xl font-semibold text-emerald-100">
                        {isLoading ? "—" : metrics.readyForPayment}
                      </div>
                    </div>
                    <CheckCircle2 className="h-5 w-5 text-emerald-200" />
                  </div>
                  <div className="mt-3 text-xs leading-5 text-slate-500">
                    Approved for Finance payment or reimbursement processing.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="min-h-[156px] rounded-[28px] border border-white/10 bg-white/[0.045] p-5 backdrop-blur-xl">
            <FileText className="h-5 w-5 text-amber-200" />
            <div className="mt-5 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
              Pending Review
            </div>
            <div className="mt-2 text-3xl font-semibold text-white">
              {isLoading ? "—" : metrics.pendingReview}
            </div>
          </div>

          <div className="min-h-[156px] rounded-[28px] border border-white/10 bg-white/[0.045] p-5 backdrop-blur-xl">
            <WalletCards className="h-5 w-5 text-cyan-200" />
            <div className="mt-5 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
              Covered
            </div>
            <div className="mt-2 text-3xl font-semibold text-white">
              {isLoading ? "—" : metrics.covered}
            </div>
          </div>

          <div className="min-h-[156px] rounded-[28px] border border-white/10 bg-white/[0.045] p-5 backdrop-blur-xl">
            <Archive className="h-5 w-5 text-amber-200" />
            <div className="mt-5 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
              Archived
            </div>
            <div className="mt-2 text-3xl font-semibold text-white">
              {isLoading ? "—" : metrics.archived}
            </div>
          </div>

          <div className="min-h-[156px] rounded-[28px] border border-white/10 bg-white/[0.045] p-5 backdrop-blur-xl">
            <Trash2 className="h-5 w-5 text-rose-200" />
            <div className="mt-5 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
              Deleted
            </div>
            <div className="mt-2 text-3xl font-semibold text-white">
              {isLoading ? "—" : metrics.deleted}
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
          <div className="flex flex-col gap-4 border-b border-white/10 px-5 py-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                Expense Registry
              </div>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Intake records only. Finance review and payment execution happen inside Payments
                Made.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search expenses..."
                  className="h-11 w-full rounded-2xl border border-white/10 bg-black/20 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/30 focus:bg-black/30 sm:w-[320px]"
                />
              </div>

              <button
                type="button"
                onClick={() => setArchiveModalOpen(true)}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] px-4 text-sm font-semibold text-slate-300 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
              >
                <Archive className="h-4 w-4" />
                Archive
              </button>

              <button
                type="button"
                onClick={() => navigate("/finance/transactions/expenses/new")}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-cyan-400/20 bg-cyan-500/10 px-4 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/15"
              >
                <Receipt className="h-4 w-4" />
                New Request
              </button>
            </div>
          </div>

          {actionError ? (
            <div className="border-b border-rose-400/20 bg-rose-500/10 px-5 py-3 text-sm text-rose-200">
              {actionError}
            </div>
          ) : null}

          <div className="overflow-x-auto">
            <div className="max-h-[720px] overflow-y-auto">
              <table className="w-full min-w-[1540px] border-collapse">
                <thead className="sticky top-0 z-20 border-b border-white/10 bg-black/70 backdrop-blur-xl">
                  <tr>
                    <SortHeader
                      label="Expense ID"
                      sortKey="expense_number"
                      activeKey={sortKey}
                      direction={sortDirection}
                      onSort={handleSort}
                    />
                    <SortHeader
                      label="Date"
                      sortKey="expense_date"
                      activeKey={sortKey}
                      direction={sortDirection}
                      onSort={handleSort}
                    />
                    <SortHeader
                      label="Company"
                      sortKey="company"
                      activeKey={sortKey}
                      direction={sortDirection}
                      onSort={handleSort}
                    />
                    <SortHeader
                      label="Made By"
                      sortKey="made_by"
                      activeKey={sortKey}
                      direction={sortDirection}
                      onSort={handleSort}
                    />
                    <SortHeader
                      label="Type"
                      sortKey="expense_type"
                      activeKey={sortKey}
                      direction={sortDirection}
                      onSort={handleSort}
                    />
                    <SortHeader
                      label="Expense Source"
                      sortKey="expense_source"
                      activeKey={sortKey}
                      direction={sortDirection}
                      onSort={handleSort}
                    />
                    <SortHeader
                      label="Amount"
                      sortKey="amount"
                      activeKey={sortKey}
                      direction={sortDirection}
                      onSort={handleSort}
                      alignRight
                    />
                    <SortHeader
                      label="Docs"
                      sortKey="documentation_status"
                      activeKey={sortKey}
                      direction={sortDirection}
                      onSort={handleSort}
                    />
                    <SortHeader
                      label="Review"
                      sortKey="finance_review_status"
                      activeKey={sortKey}
                      direction={sortDirection}
                      onSort={handleSort}
                    />
                    <SortHeader
                      label="Coverage"
                      sortKey="coverage_status"
                      activeKey={sortKey}
                      direction={sortDirection}
                      onSort={handleSort}
                    />
                    <SortHeader
                      label="Recipient"
                      sortKey="recipient_confirmation_status"
                      activeKey={sortKey}
                      direction={sortDirection}
                      onSort={handleSort}
                    />
                    <th className="sticky right-0 bg-black/70 px-5 py-4 text-right text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 backdrop-blur-xl">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>{renderRows(sortedActiveRows, "active")}</tbody>
              </table>
            </div>
          </div>
        </section>
      </div>

      {archiveModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6 backdrop-blur-xl">
          <div className="flex max-h-[90vh] w-full max-w-[1480px] flex-col overflow-hidden rounded-[34px] border border-white/10 bg-[#080b12] shadow-2xl shadow-black/50">
            <div className="flex items-start justify-between gap-4 border-b border-white/10 p-5">
              <div>
                <div className="inline-flex w-fit items-center gap-2 rounded-full border border-amber-400/20 bg-amber-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-200">
                  <Archive className="h-3.5 w-3.5" />
                  Expense Archive
                </div>
                <h2 className="mt-3 text-2xl font-semibold text-white">
                  Archived & Deleted Expenses
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Archived records can be restored. Deleted records can be restored or permanently
                  deleted.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setArchiveModalOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-slate-300 transition hover:bg-white/[0.08] hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex gap-2 border-b border-white/10 px-5 py-4">
              <button
                type="button"
                onClick={() => setArchiveTab("archived")}
                className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition ${
                  archiveTab === "archived"
                    ? "border-amber-400/20 bg-amber-500/10 text-amber-200"
                    : "border-white/10 bg-white/[0.04] text-slate-400 hover:bg-white/[0.07]"
                }`}
              >
                Archived ({archivedRows.length})
              </button>
              <button
                type="button"
                onClick={() => setArchiveTab("deleted")}
                className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition ${
                  archiveTab === "deleted"
                    ? "border-rose-400/20 bg-rose-500/10 text-rose-200"
                    : "border-white/10 bg-white/[0.04] text-slate-400 hover:bg-white/[0.07]"
                }`}
              >
                Deleted ({deletedRows.length})
              </button>
            </div>

            <div className="overflow-x-auto">
              <div className="max-h-[620px] overflow-y-auto">
                <table className="w-full min-w-[1540px] border-collapse">
                  <thead className="sticky top-0 z-20 border-b border-white/10 bg-black/70 backdrop-blur-xl">
                    <tr>
                      <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                        Expense ID
                      </th>
                      <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                        Date
                      </th>
                      <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                        Company
                      </th>
                      <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                        Made By
                      </th>
                      <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                        Type
                      </th>
                      <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                        Expense Source
                      </th>
                      <th className="px-5 py-4 text-right text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                        Amount
                      </th>
                      <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                        Docs
                      </th>
                      <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                        Review
                      </th>
                      <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                        Coverage
                      </th>
                      <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                        Recipient
                      </th>
                      <th className="sticky right-0 bg-black/70 px-5 py-4 text-right text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 backdrop-blur-xl">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody>{renderRows(archiveRows, "archive")}</tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
