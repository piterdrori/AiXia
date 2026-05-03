import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Archive,
  ArrowRight,
  BadgeCheck,
  CreditCard,
  Eye,
  MoreHorizontal,
  Plus,
  ReceiptText,
  RotateCcw,
  Search,
  Trash2,
  WalletCards,
  X,
} from "lucide-react";

import { supabase } from "@/lib/supabase";

type SortDirection = "asc" | "desc";

type SortKey =
  | "run_number"
  | "period_name"
  | "period_start"
  | "period_end"
  | "pay_date"
  | "status"
  | "total_gross"
  | "total_deductions"
  | "total_bonus"
  | "total_reimbursements"
  | "total_net"
  | "updated_at"
  | "created_at";

type ArchiveTab = "archived" | "deleted";

type PayrollPeriodRow = {
  id: string;
  period_number: string | null;
  period_name: string;
  period_start: string;
  period_end: string;
  pay_date: string;
  status: string;
};

type PayrollRunRow = {
  id: string;
  run_number: string | null;
  payroll_period_id: string;
  status: string;
  total_gross: number | string | null;
  total_deductions: number | string | null;
  total_bonus: number | string | null;
  total_reimbursements: number | string | null;
  total_net: number | string | null;
  submitted_at: string | null;
  approved_at: string | null;
  completed_at: string | null;
  approved_by: string | null;
  notes: string | null;
  metadata: Record<string, unknown> | null;
  project_id: string | null;
  task_id: string | null;
  reference_number: string | null;
  posted_to_ledger: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
  ledger_posted_at: string | null;
  archived_at: string | null;
  archived_by: string | null;
  deleted_at: string | null;
  deleted_by: string | null;
  payroll_period?: PayrollPeriodRow | null;
};

type PaycheckRow = {
  id: string;
  payroll_run_id: string;
  payment_status: string;
  net_pay: number | string | null;
};

type PayrollPaymentRow = {
  id: string;
  paycheck_id: string;
  status: string;
  paycheck_amount: number | string | null;
  amount: number | string | null;
};

type EnrichedPayrollRunRow = PayrollRunRow & {
  periodName: string;
  periodLabel: string;
  paycheckCount: number;
  paidPaycheckCount: number;
  paymentCount: number;
  confirmedPaymentCount: number;
  confirmedPaidAmount: number;
};

const statusToneMap: Record<string, string> = {
  draft: "border-slate-400/20 bg-slate-500/10 text-slate-300",
  pending_approval: "border-amber-400/20 bg-amber-500/10 text-amber-200",
  approved: "border-emerald-400/20 bg-emerald-500/10 text-emerald-200",
  processing: "border-cyan-400/20 bg-cyan-500/10 text-cyan-200",
  completed: "border-emerald-400/20 bg-emerald-500/10 text-emerald-200",
  failed: "border-rose-400/20 bg-rose-500/10 text-rose-200",
  archived: "border-slate-400/20 bg-slate-500/10 text-slate-300",
  deleted: "border-rose-400/20 bg-rose-500/10 text-rose-200",
};

function toNumber(value: number | string | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatMoney(value: number | string | null | undefined) {
  return toNumber(value).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatCount(value: number) {
  return value.toLocaleString();
}

function formatLabel(value: string | null | undefined) {
  if (!value) return "—";
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
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

function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return parsed.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getPeriodName(row: PayrollRunRow) {
  return row.payroll_period?.period_name || row.payroll_period?.period_number || "Payroll Period";
}

function getPeriodLabel(row: PayrollRunRow) {
  if (!row.payroll_period) return "No period linked";

  return `${formatDate(row.payroll_period.period_start)} → ${formatDate(
    row.payroll_period.period_end
  )}`;
}

function getSortValue(row: EnrichedPayrollRunRow, sortKey: SortKey) {
  switch (sortKey) {
    case "run_number":
      return row.run_number || "";
    case "period_name":
      return row.periodName || "";
    case "period_start":
      return row.payroll_period?.period_start || "";
    case "period_end":
      return row.payroll_period?.period_end || "";
    case "pay_date":
      return row.payroll_period?.pay_date || "";
    case "status":
      return row.status || "";
    case "total_gross":
      return toNumber(row.total_gross);
    case "total_deductions":
      return toNumber(row.total_deductions);
    case "total_bonus":
      return toNumber(row.total_bonus);
    case "total_reimbursements":
      return toNumber(row.total_reimbursements);
    case "total_net":
      return toNumber(row.total_net);
    case "updated_at":
      return row.updated_at || "";
    case "created_at":
    default:
      return row.created_at || "";
  }
}

function sortRows(
  rows: EnrichedPayrollRunRow[],
  sortKey: SortKey,
  direction: SortDirection
) {
  return [...rows].sort((a, b) => {
    const aValue = getSortValue(a, sortKey);
    const bValue = getSortValue(b, sortKey);

    if (typeof aValue === "number" && typeof bValue === "number") {
      return direction === "asc" ? aValue - bValue : bValue - aValue;
    }

    const result = String(aValue).localeCompare(String(bValue), undefined, {
      numeric: true,
      sensitivity: "base",
    });

    return direction === "asc" ? result : -result;
  });
}

function StatusBadge({ value }: { value: string | null | undefined }) {
  const status = value || "—";
  const tone =
    statusToneMap[status] ?? "border-white/10 bg-white/[0.06] text-slate-300";

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${tone}`}
    >
      {formatLabel(status)}
    </span>
  );
}

function SortHeader({
  label,
  sortKey,
  activeKey,
  direction,
  onSort,
  className = "",
}: {
  label: string;
  sortKey: SortKey;
  activeKey: SortKey;
  direction: SortDirection;
  onSort: (key: SortKey) => void;
  className?: string;
}) {
  const isActive = activeKey === sortKey;

  return (
    <th className={`px-5 py-4 text-left ${className}`}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 transition hover:text-slate-200"
      >
        {label}
        <span className={isActive ? "text-cyan-300" : "text-slate-700"}>
          {isActive ? (direction === "asc" ? "↑" : "↓") : "↕"}
        </span>
      </button>
    </th>
  );
}

function KpiCard({
  label,
  value,
  detail,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  icon: typeof ReceiptText;
  tone: "cyan" | "emerald" | "amber" | "violet";
}) {
  const toneClasses = {
    cyan: "border-cyan-400/20 bg-cyan-500/10 text-cyan-200",
    emerald: "border-emerald-400/20 bg-emerald-500/10 text-emerald-200",
    amber: "border-amber-400/20 bg-amber-500/10 text-amber-200",
    violet: "border-violet-400/20 bg-violet-500/10 text-violet-200",
  }[tone];

  return (
    <div className="relative min-h-[156px] overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.045] p-5 backdrop-blur-xl">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.08),transparent_48%)]" />

      <div className="relative flex h-full flex-col justify-between gap-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
              {label}
            </div>
            <div className="mt-2 text-3xl font-semibold tracking-[-0.035em] text-white">
              {value}
            </div>
          </div>

          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${toneClasses}`}
          >
            <Icon className="h-5 w-5" />
          </div>
        </div>

        <div className="text-sm leading-6 text-slate-400">{detail}</div>
      </div>
    </div>
  );
}

function PayrollRunTable({
  rows,
  sortKey,
  sortDirection,
  onSort,
  onOpen,
  onArchive,
  onDelete,
  archiveMode = false,
  archiveTab = "archived",
  onRestore,
  onHardDelete,
}: {
  rows: EnrichedPayrollRunRow[];
  sortKey: SortKey;
  sortDirection: SortDirection;
  onSort: (key: SortKey) => void;
  onOpen: (id: string) => void;
  onArchive?: (id: string) => void;
  onDelete?: (id: string) => void;
  archiveMode?: boolean;
  archiveTab?: ArchiveTab;
  onRestore?: (id: string) => void;
  onHardDelete?: (id: string) => void;
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-[28px] border border-dashed border-white/10 bg-black/20 px-6 py-14 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-500/10 text-cyan-200">
          <ReceiptText className="h-5 w-5" />
        </div>
        <div className="mt-4 text-sm font-semibold text-white">
          No payroll runs found
        </div>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">
          Payroll runs, paycheck totals, payment execution, and confirmation progress will
          appear here after Finance creates payroll runs.
        </p>
      </div>
    );
  }

  return (
    <div className="max-h-[720px] overflow-y-auto rounded-[26px] border border-white/10 bg-black/20">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1480px] border-collapse">
          <thead className="sticky top-0 z-10 border-b border-white/10 bg-black/80 backdrop-blur-xl">
            <tr>
              <SortHeader
                label="Run"
                sortKey="run_number"
                activeKey={sortKey}
                direction={sortDirection}
                onSort={onSort}
              />
              <SortHeader
                label="Period"
                sortKey="period_name"
                activeKey={sortKey}
                direction={sortDirection}
                onSort={onSort}
              />
              <SortHeader
                label="Start"
                sortKey="period_start"
                activeKey={sortKey}
                direction={sortDirection}
                onSort={onSort}
              />
              <SortHeader
                label="End"
                sortKey="period_end"
                activeKey={sortKey}
                direction={sortDirection}
                onSort={onSort}
              />
              <SortHeader
                label="Pay Date"
                sortKey="pay_date"
                activeKey={sortKey}
                direction={sortDirection}
                onSort={onSort}
              />
              <SortHeader
                label="Status"
                sortKey="status"
                activeKey={sortKey}
                direction={sortDirection}
                onSort={onSort}
              />
              <SortHeader
                label="Gross"
                sortKey="total_gross"
                activeKey={sortKey}
                direction={sortDirection}
                onSort={onSort}
                className="text-right"
              />
              <SortHeader
                label="Deductions"
                sortKey="total_deductions"
                activeKey={sortKey}
                direction={sortDirection}
                onSort={onSort}
                className="text-right"
              />
              <SortHeader
                label="Bonus"
                sortKey="total_bonus"
                activeKey={sortKey}
                direction={sortDirection}
                onSort={onSort}
                className="text-right"
              />
              <SortHeader
                label="Net"
                sortKey="total_net"
                activeKey={sortKey}
                direction={sortDirection}
                onSort={onSort}
                className="text-right"
              />
              <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Progress
              </th>
              <SortHeader
                label="Updated"
                sortKey="updated_at"
                activeKey={sortKey}
                direction={sortDirection}
                onSort={onSort}
              />
              <th className="px-5 py-4 text-right text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Actions
              </th>
            </tr>
          </thead>

                    <tbody className="divide-y divide-white/5">
            {rows.map((row) => (
              <tr
                key={row.id}
                className="text-sm text-slate-300 transition hover:bg-white/[0.035]"
              >
                <td className="px-5 py-4">
                  <div className="font-semibold text-white">
                    {row.run_number || row.reference_number || "Draft Payroll Run"}
                  </div>
                  <div className="mt-1 text-[11px] text-slate-500">
                    Created {formatDate(row.created_at)}
                  </div>
                </td>

                <td className="min-w-[220px] px-5 py-4">
                  <div className="font-medium text-white">{row.periodName}</div>
                  <div className="mt-1 text-[11px] text-slate-500">
                    {row.periodLabel}
                  </div>
                </td>

                <td className="whitespace-nowrap px-5 py-4">
                  {formatDate(row.payroll_period?.period_start)}
                </td>

                <td className="whitespace-nowrap px-5 py-4">
                  {formatDate(row.payroll_period?.period_end)}
                </td>

                <td className="whitespace-nowrap px-5 py-4">
                  {formatDate(row.payroll_period?.pay_date)}
                </td>

                <td className="whitespace-nowrap px-5 py-4">
                  <StatusBadge value={row.status} />
                </td>

                <td className="whitespace-nowrap px-5 py-4 text-right font-semibold text-white">
                  {formatMoney(row.total_gross)}
                </td>

                <td className="whitespace-nowrap px-5 py-4 text-right font-semibold text-rose-100">
                  {formatMoney(row.total_deductions)}
                </td>

                <td className="whitespace-nowrap px-5 py-4 text-right font-semibold text-emerald-100">
                  {formatMoney(row.total_bonus)}
                </td>

                <td className="whitespace-nowrap px-5 py-4 text-right font-semibold text-cyan-100">
                  {formatMoney(row.total_net)}
                </td>

                <td className="min-w-[220px] px-5 py-4">
                  <div className="text-xs text-slate-400">
                    Paychecks:{" "}
                    <span className="font-semibold text-white">
                      {formatCount(row.paycheckCount)}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-slate-400">
                    Paid:{" "}
                    <span className="font-semibold text-emerald-100">
                      {formatCount(row.paidPaycheckCount)}
                    </span>
                    {" / "}
                    Payments:{" "}
                    <span className="font-semibold text-cyan-100">
                      {formatCount(row.confirmedPaymentCount)}
                    </span>
                  </div>
                </td>

                <td className="whitespace-nowrap px-5 py-4 text-slate-400">
                  {formatDateTime(row.updated_at)}
                </td>

                <td className="px-5 py-4">
                  <div className="flex items-center justify-end gap-2">
                    {!archiveMode ? (
                      <>
                        <button
                          type="button"
                          onClick={() => onOpen(row.id)}
                          className="inline-flex h-9 items-center justify-center gap-2 rounded-2xl border border-cyan-400/20 bg-cyan-500/10 px-3 text-xs font-semibold text-cyan-100 transition hover:bg-cyan-500/15"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Open
                        </button>

                        <button
                          type="button"
                          onClick={() => onArchive?.(row.id)}
                          className="inline-flex h-9 items-center justify-center rounded-2xl border border-amber-400/20 bg-amber-500/10 px-3 text-amber-100 transition hover:bg-amber-500/15"
                          title="Archive"
                        >
                          <Archive className="h-3.5 w-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => onDelete?.(row.id)}
                          className="inline-flex h-9 items-center justify-center rounded-2xl border border-rose-400/20 bg-rose-500/10 px-3 text-rose-100 transition hover:bg-rose-500/15"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => onOpen(row.id)}
                          className="inline-flex h-9 items-center justify-center gap-2 rounded-2xl border border-cyan-400/20 bg-cyan-500/10 px-3 text-xs font-semibold text-cyan-100 transition hover:bg-cyan-500/15"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          View
                        </button>

                        <button
                          type="button"
                          onClick={() => onRestore?.(row.id)}
                          className="inline-flex h-9 items-center justify-center gap-2 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-3 text-xs font-semibold text-emerald-100 transition hover:bg-emerald-500/15"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          Restore
                        </button>

                        {archiveTab === "deleted" ? (
                          <button
                            type="button"
                            onClick={() => onHardDelete?.(row.id)}
                            className="inline-flex h-9 items-center justify-center gap-2 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-3 text-xs font-semibold text-rose-100 transition hover:bg-rose-500/15"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Hard Delete
                          </button>
                        ) : null}
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function PayrollRunsPage() {
  const navigate = useNavigate();

  const [runs, setRuns] = useState<PayrollRunRow[]>([]);
  const [paychecks, setPaychecks] = useState<PaycheckRow[]>([]);
  const [payments, setPayments] = useState<PayrollPaymentRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const [archiveOpen, setArchiveOpen] = useState(false);
  const [archiveTab, setArchiveTab] = useState<ArchiveTab>("archived");

  const loadPayrollRuns = useCallback(async () => {
    setIsLoading(true);
    setActionError(null);

    try {
      const [runsResult, paychecksResult, paymentsResult] = await Promise.all([
        supabase
          .from("finance_payroll_runs")
          .select(
            [
              "id",
              "run_number",
              "payroll_period_id",
              "status",
              "total_gross",
              "total_deductions",
              "total_bonus",
              "total_reimbursements",
              "total_net",
              "submitted_at",
              "approved_at",
              "completed_at",
              "approved_by",
              "notes",
              "metadata",
              "project_id",
              "task_id",
              "reference_number",
              "posted_to_ledger",
              "created_at",
              "updated_at",
              "created_by",
              "updated_by",
              "ledger_posted_at",
              "archived_at",
              "archived_by",
              "deleted_at",
              "deleted_by",
              "payroll_period:finance_payroll_periods!finance_payroll_runs_payroll_period_id_fkey(id, period_number, period_name, period_start, period_end, pay_date, status)",
            ].join(", ")
          )
          .order("created_at", { ascending: false }),

        supabase
          .from("finance_paychecks")
          .select("id, payroll_run_id, payment_status, net_pay"),

        supabase
          .from("finance_payroll_payments")
          .select("id, paycheck_id, status, paycheck_amount, amount"),
      ]);

      if (runsResult.error) throw runsResult.error;
      if (paychecksResult.error) throw paychecksResult.error;
      if (paymentsResult.error) throw paymentsResult.error;

      setRuns((runsResult.data || []) as unknown as PayrollRunRow[]);
      setPaychecks((paychecksResult.data || []) as PaycheckRow[]);
      setPayments((paymentsResult.data || []) as PayrollPaymentRow[]);
    } catch (error) {
      console.error("Failed to load payroll runs:", error);
      setActionError(
        error instanceof Error ? error.message : "Failed to load payroll runs."
      );
      setRuns([]);
      setPaychecks([]);
      setPayments([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPayrollRuns();
  }, [loadPayrollRuns]);

  useEffect(() => {
    const channel = supabase
      .channel("finance-payroll-runs-registry")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_payroll_runs" },
        () => void loadPayrollRuns()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_payroll_periods" },
        () => void loadPayrollRuns()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_paychecks" },
        () => void loadPayrollRuns()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_payroll_payments" },
        () => void loadPayrollRuns()
      )
      .subscribe();

    const intervalId = window.setInterval(() => {
      void loadPayrollRuns();
    }, 60000);

    return () => {
      window.clearInterval(intervalId);
      supabase.removeChannel(channel);
    };
  }, [loadPayrollRuns]);

  const enrichedRuns = useMemo<EnrichedPayrollRunRow[]>(() => {
    const paychecksByRun = new Map<string, PaycheckRow[]>();

    paychecks.forEach((paycheck) => {
      const current = paychecksByRun.get(paycheck.payroll_run_id) || [];
      current.push(paycheck);
      paychecksByRun.set(paycheck.payroll_run_id, current);
    });

    const paycheckRunMap = new Map<string, string>();
    paychecks.forEach((paycheck) => {
      paycheckRunMap.set(paycheck.id, paycheck.payroll_run_id);
    });

    const paymentsByRun = new Map<string, PayrollPaymentRow[]>();
    payments.forEach((payment) => {
      const runId = paycheckRunMap.get(payment.paycheck_id);
      if (!runId) return;

      const current = paymentsByRun.get(runId) || [];
      current.push(payment);
      paymentsByRun.set(runId, current);
    });

    return runs.map((run) => {
      const runPaychecks = paychecksByRun.get(run.id) || [];
      const runPayments = paymentsByRun.get(run.id) || [];

      return {
        ...run,
        periodName: getPeriodName(run),
        periodLabel: getPeriodLabel(run),
        paycheckCount: runPaychecks.length,
        paidPaycheckCount: runPaychecks.filter(
          (paycheck) => paycheck.payment_status === "paid"
        ).length,
        paymentCount: runPayments.length,
        confirmedPaymentCount: runPayments.filter(
          (payment) => payment.status === "confirmed"
        ).length,
        confirmedPaidAmount: runPayments.reduce(
          (sum, payment) =>
            sum +
            (payment.status === "confirmed"
              ? toNumber(payment.paycheck_amount || payment.amount)
              : 0),
          0
        ),
      };
    });
  }, [paychecks, payments, runs]);

  const activeRows = useMemo(() => {
    return enrichedRuns.filter(
      (row) => row.status !== "archived" && row.status !== "deleted"
    );
  }, [enrichedRuns]);

  const archivedRows = useMemo(() => {
    return enrichedRuns.filter((row) => row.status === "archived");
  }, [enrichedRuns]);

  const deletedRows = useMemo(() => {
    return enrichedRuns.filter((row) => row.status === "deleted");
  }, [enrichedRuns]);

  const filteredRows = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    const sourceRows = archiveOpen
      ? archiveTab === "archived"
        ? archivedRows
        : deletedRows
      : activeRows;

    if (!query) return sourceRows;

    return sourceRows.filter((row) => {
      const haystack = [
        row.run_number,
        row.reference_number,
        row.periodName,
        row.periodLabel,
        row.status,
        row.notes,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [activeRows, archiveOpen, archiveTab, archivedRows, deletedRows, searchTerm]);

  const sortedRows = useMemo(() => {
    return sortRows(filteredRows, sortKey, sortDirection);
  }, [filteredRows, sortDirection, sortKey]);

  const metrics = useMemo(() => {
    const pendingApproval = activeRows.filter(
      (row) => row.status === "pending_approval"
    ).length;

    const approvedOrProcessing = activeRows.filter((row) =>
      ["approved", "processing"].includes(row.status)
    ).length;

    const completed = activeRows.filter((row) => row.status === "completed").length;

    const totalNet = activeRows.reduce(
      (sum, row) => sum + toNumber(row.total_net),
      0
    );

    return {
      active: activeRows.length,
      pendingApproval,
      approvedOrProcessing,
      completed,
      totalNet,
    };
  }, [activeRows]);

  const handleSort = useCallback(
    (key: SortKey) => {
      if (sortKey === key) {
        setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
        return;
      }

      setSortKey(key);
      setSortDirection("asc");
    },
    [sortKey]
  );

  const openRun = useCallback(
    (id: string) => {
      navigate(`/finance/transactions/payroll/${id}`);
    },
    [navigate]
  );

  const runRpcAction = useCallback(
    async (
      rpcName: string,
      payrollRunId: string,
      successMessage: string
    ) => {
      setActionError(null);
      setActionMessage(null);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user?.id) {
        setActionError("You must be signed in to perform this action.");
        return;
      }

      const result = await supabase.rpc(rpcName, {
        p_payroll_run_id: payrollRunId,
        p_actor_user_id: user.id,
      });

      if (result.error) {
        setActionError(result.error.message);
        return;
      }

      setActionMessage(successMessage);
      await loadPayrollRuns();
    },
    [loadPayrollRuns]
  );

  const archiveRun = useCallback(
    async (id: string) => {
      await runRpcAction("finance_archive_payroll_run", id, "Payroll run archived.");
    },
    [runRpcAction]
  );

  const deleteRun = useCallback(
    async (id: string) => {
      await runRpcAction(
        "finance_delete_payroll_run",
        id,
        "Payroll run moved to deleted."
      );
    },
    [runRpcAction]
  );

  const restoreRun = useCallback(
    async (id: string) => {
      await runRpcAction("finance_restore_payroll_run", id, "Payroll run restored.");
    },
    [runRpcAction]
  );

  const hardDeleteRun = useCallback(
    async (id: string) => {
      await runRpcAction(
        "finance_hard_delete_payroll_run",
        id,
        "Payroll run permanently deleted."
      );
    },
    [runRpcAction]
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

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_430px] xl:items-stretch">
              <div className="min-w-0">
                <div className="inline-flex w-fit items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-200">
                  <ReceiptText className="h-3.5 w-3.5" />
                  Payroll Runs
                </div>

                <h1 className="mt-4 text-3xl font-semibold tracking-[-0.035em] text-white md:text-5xl">
                  Payroll Run Registry
                </h1>

                <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-400 md:text-base md:leading-7">
                  Finance/Admin payroll run control for approved paycheck requests,
                  payroll totals, payment execution, and employee confirmation tracking.
                </p>

                <div className="mt-5 flex flex-wrap gap-2">
                  <div className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-200">
                    Payroll Runs
                  </div>
                  <div className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-200">
                    Paychecks
                  </div>
                  <div className="rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-violet-200">
                    Payment Execution
                  </div>
                  <div className="rounded-full border border-amber-400/20 bg-amber-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-200">
                    Confirmation
                  </div>
                </div>
              </div>

              <div className="grid gap-3">
                <div className="min-h-[148px] rounded-[24px] border border-white/10 bg-black/20 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                        Active Payroll Runs
                      </div>
                      <div className="mt-2 text-2xl font-semibold text-white">
                        {isLoading ? "—" : formatCount(metrics.active)}
                      </div>
                    </div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-500/10 text-cyan-200">
                      <ReceiptText className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="mt-3 text-xs leading-5 text-slate-500">
                    Active payroll runs excluding archived and deleted records.
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                      Pending Approval
                    </div>
                    <div className="mt-2 text-xl font-semibold text-amber-100">
                      {isLoading ? "—" : formatCount(metrics.pendingApproval)}
                    </div>
                  </div>

                  <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                      Completed
                    </div>
                    <div className="mt-2 text-xl font-semibold text-emerald-100">
                      {isLoading ? "—" : formatCount(metrics.completed)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label="Active Runs"
            value={isLoading ? "—" : formatCount(metrics.active)}
            detail="Visible active payroll runs."
            icon={ReceiptText}
            tone="cyan"
          />
          <KpiCard
            label="Pending Approval"
            value={isLoading ? "—" : formatCount(metrics.pendingApproval)}
            detail="Payroll runs waiting for approval."
            icon={BadgeCheck}
            tone="amber"
          />
          <KpiCard
            label="In Execution"
            value={isLoading ? "—" : formatCount(metrics.approvedOrProcessing)}
            detail="Approved or processing payroll runs."
            icon={CreditCard}
            tone="violet"
          />
          <KpiCard
            label="Total Net"
            value={isLoading ? "—" : formatMoney(metrics.totalNet)}
            detail="Total active payroll net amount."
            icon={WalletCards}
            tone="emerald"
          />
        </section>

        <section className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] backdrop-blur-xl">
          <div className="flex flex-col gap-4 border-b border-white/10 px-5 py-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                Payroll Runs Registry
              </div>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Active registry: Run, Period, Pay Date, Status, Gross, Deductions,
                Bonus, Net, Progress, Updated, and Actions.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <label className="relative block min-w-[280px]">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search payroll runs..."
                  className="h-11 w-full rounded-2xl border border-white/10 bg-black/20 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/30 focus:bg-black/30"
                />
              </label>

              <button
                type="button"
                onClick={() => {
                  setArchiveOpen(true);
                  setArchiveTab("archived");
                }}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-sm font-semibold text-slate-200 transition hover:border-white/20 hover:bg-white/[0.07]"
              >
                <MoreHorizontal className="h-4 w-4" />
                Archive
              </button>

              <button
                type="button"
                onClick={() => navigate("/finance/transactions/payroll/new")}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-cyan-400/20 bg-cyan-500/10 px-4 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/15"
              >
                <Plus className="h-4 w-4" />
                New Payroll Run
              </button>
            </div>
          </div>

          <div className="p-5">
            {actionError ? (
              <div className="mb-4 rounded-[24px] border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                {actionError}
              </div>
            ) : null}

            {actionMessage ? (
              <div className="mb-4 rounded-[24px] border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
                {actionMessage}
              </div>
            ) : null}

            <PayrollRunTable
              rows={sortedRows}
              sortKey={sortKey}
              sortDirection={sortDirection}
              onSort={handleSort}
              onOpen={openRun}
              onArchive={archiveRun}
              onDelete={deleteRun}
            />
          </div>
        </section>

        {archiveOpen ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6 backdrop-blur-md">
            <div className="flex max-h-[92vh] w-full max-w-[1500px] flex-col overflow-hidden rounded-[34px] border border-white/10 bg-[#070b14] shadow-2xl shadow-black/40">
              <div className="flex items-start justify-between gap-4 border-b border-white/10 p-6">
                <div>
                  <div className="inline-flex w-fit rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-200">
                    Payroll Runs Archive
                  </div>
                  <h2 className="mt-3 text-2xl font-semibold text-white">
                    Archived & Deleted Payroll Runs
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    Archived payroll runs can be restored. Deleted payroll runs can be restored
                    or permanently deleted.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setArchiveOpen(false)}
                  className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-slate-300 transition hover:bg-white/[0.08] hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-6 py-4">
                <div className="flex rounded-2xl border border-white/10 bg-black/20 p-1">
                  <button
                    type="button"
                    onClick={() => setArchiveTab("archived")}
                    className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                      archiveTab === "archived"
                        ? "bg-cyan-500/15 text-cyan-100"
                        : "text-slate-500 hover:text-slate-200"
                    }`}
                  >
                    Archived ({formatCount(archivedRows.length)})
                  </button>

                  <button
                    type="button"
                    onClick={() => setArchiveTab("deleted")}
                    className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                      archiveTab === "deleted"
                        ? "bg-rose-500/15 text-rose-100"
                        : "text-slate-500 hover:text-slate-200"
                    }`}
                  >
                    Deleted ({formatCount(deletedRows.length)})
                  </button>
                </div>

                <label className="relative block min-w-[280px]">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Search archive..."
                    className="h-11 w-full rounded-2xl border border-white/10 bg-black/20 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/30 focus:bg-black/30"
                  />
                </label>
              </div>

              <div className="min-h-0 overflow-y-auto p-6">
                <PayrollRunTable
                  rows={sortedRows}
                  sortKey={sortKey}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                  onOpen={openRun}
                  archiveMode
                  archiveTab={archiveTab}
                  onRestore={restoreRun}
                  onHardDelete={hardDeleteRun}
                />
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
