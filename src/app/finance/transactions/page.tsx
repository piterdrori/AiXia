import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  BadgeAlert,
  BriefcaseBusiness,
  CreditCard,
  FileText,
  LockKeyhole,
  Receipt,
  ShieldCheck,
  UserRound,
  Wallet,
} from "lucide-react";

import {
  AixiaAccessRule,
  AixiaAlert,
  AixiaBadge,
  AixiaButton,
  AixiaEmptyState,
  AixiaHero,
  AixiaLoadingState,
  AixiaMetricCard,
  AixiaMetricGrid,
  AixiaNavigationCard,
  AixiaNavigationGrid,
  AixiaNavigationInfoPanel,
  AixiaNavigationStatBlock,
  AixiaPage,
  AixiaReviewGrid,
  AixiaSection,
  AixiaSideList,
  AixiaSideListRow,
  AixiaSmartLayout,
  AixiaValueBlock,
} from "@/components/aixia";
import {
  fetchFinanceEffectivePermissions,
  resolveFinancePagePermissionState,
  type FinanceLoadMode,
  type FinancePageAccessConfig,
} from "@/lib/finance/pageAccess";
import type { Permission, Role } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";

type TransactionMetricCard = {
  key: string;
  title: string;
  value: string;
  subtitle: string;
  icon: LucideIcon;
  tone: "emerald" | "cyan" | "amber" | "violet" | "rose";
};

type TransactionModuleKey =
  | "quotations"
  | "customer-pos"
  | "vendor-quotations"
  | "invoices"
  | "bills"
  | "proforma-invoices"
  | "expenses"
  | "payments-made"
  | "payments-received"
  | "purchase-orders"
  | "paycheck-requests"
  | "payroll";

type TransactionModuleCard = {
  key: TransactionModuleKey;
  title: string;
  description: string;
  route?: string;
  icon: LucideIcon;
  count: number;
  statusLabel: string;
  lastUpdatedLabel: string;
  isPersonalDefault?: boolean;
  tone: "emerald" | "cyan" | "amber" | "violet" | "rose" | "neutral";
};

type TransactionFlowItem = {
  module: TransactionModuleCard;
  sequenceLabel?: string;
  titleOverride?: string;
  descriptionOverride?: string;
  routeOverride?: string;
};

type TransactionSectionTone =
  | "incoming"
  | "procurement"
  | "expense"
  | "internal";

type TransactionSection = {
  key:
    | "incoming"
    | "procurement"
    | "operating-expenses"
    | "internal-flows";
  title: string;
  subtitle: string;
  tone: TransactionSectionTone;
  icon: LucideIcon;
  modules: TransactionFlowItem[];
};

type FinanceInvoiceRow = {
  id: string;
  invoice_number: string;
  status: string;
  total_amount: number | string | null;
  balance_due: number | string | null;
  due_date: string | null;
  created_at: string;
};

type FinanceBillRow = {
  id: string;
  bill_number: string;
  status: string;
  total_amount: number | string | null;
  balance_due: number | string | null;
  due_date: string | null;
  created_at: string;
};

type FinanceExpenseRow = {
  id: string;
  expense_number: string | null;
  title: string | null;
  amount: number | string | null;
  status: string;
  approval_status: string | null;
  payment_status: string | null;
  created_at: string;
};

type FinancePaymentMadeRow = {
  id: string;
  amount: number | string | null;
  payment_date: string | null;
  created_at?: string;
};

type FinancePaymentReceivedRow = {
  id: string;
  amount: number | string | null;
  payment_date: string | null;
  created_at?: string;
};

type FinancePayrollRunRow = {
  id: string;
  run_number: string | null;
  status: string;
  total_net: number | string | null;
  created_at: string;
};

type CurrentUserProfile = {
  user_id: string;
  full_name: string | null;
  role: Role | null;
};

type RecentTransactionItem = {
  id: string;
  type: string;
  title: string;
  subtitle: string;
  createdAt: string;
  route?: string;
};

type TransactionsPageData = {
  counts: {
    invoices: number;
    bills: number;
    proformaInvoices: number;
    expenses: number;
    paymentsMade: number;
    paymentsReceived: number;
    purchaseOrders: number;
    paycheckRequests: number;
    payrollRuns: number;
  };
  totals: {
    receivables: number;
    payables: number;
    paymentsIn: number;
    paymentsOut: number;
  };
  alerts: {
    overdueInvoices: number;
    overdueBills: number;
    pendingExpenses: number;
  };
  recentActivity: RecentTransactionItem[];
};

type AccessFlags = {
  hasAnyFinanceEntry: boolean;
  canSeeIncomingMoney: boolean;
  canMonitorIncomingMoney: boolean;
  canSeeSupplierProcurement: boolean;
  canMonitorSupplierProcurement: boolean;
  canSeeOwnExpenses: boolean;
  canSeeExpenseFunding: boolean;
  canMonitorExpenseFunding: boolean;
  canSeeOwnPaychecks: boolean;
  canSeePayrollBasket: boolean;
  canMonitorPayrollBasket: boolean;
  canMonitorAnyCompanyFinance: boolean;
};

type CountResult = {
  count?: number | null;
};

const ADMIN_PERMISSIONS: readonly Permission[] = [
  "manageFinanceMasterData",
  "approveFinanceRecords",
];

const INCOMING_MONEY_ACCESS_CONFIG: FinancePageAccessConfig = {
  sectionKey: "incomingMoneyFlow",
  adminPermissions: ADMIN_PERMISSIONS,
  readPermissions: [
    "accessFinance",
    "viewFinance",
    "accessReceivables",
    "viewReceivables",
    "viewInvoices",
    "viewReceivedPayments",
  ],
  createPermissions: ["createFinanceRecords", "createInvoices"],
  updatePermissions: ["editFinanceRecords", "editDraftInvoices"],
  deleteArchivePermissions: ["archiveFinanceRecords"],
  approveExecutePermissions: [
    "approveFinanceRecords",
    "sendInvoices",
    "recordPaymentsReceived",
  ],
};

const SUPPLIER_PROCUREMENT_ACCESS_CONFIG: FinancePageAccessConfig = {
  sectionKey: "supplierProcurementFlow",
  adminPermissions: ADMIN_PERMISSIONS,
  readPermissions: [
    "accessFinance",
    "viewFinance",
    "accessPayables",
    "viewPayables",
    "viewBills",
    "viewPaymentsMade",
    "viewVendors",
  ],
  createPermissions: ["createFinanceRecords", "createBills"],
  updatePermissions: ["editFinanceRecords", "editDraftBills", "manageVendors"],
  deleteArchivePermissions: ["archiveFinanceRecords"],
  approveExecutePermissions: [
    "approveFinanceRecords",
    "openBills",
    "recordPaymentsMade",
  ],
};

const EXPENSE_FUNDING_ACCESS_CONFIG: FinancePageAccessConfig = {
  sectionKey: "expensesFundingPayment",
  adminPermissions: ADMIN_PERMISSIONS,
  readPermissions: [
    "accessFinance",
    "viewFinance",
    "accessExpenses",
    "viewExpenses",
    "viewReimbursements",
    "viewPaymentsMade",
  ],
  createPermissions: [
    "createFinanceRecords",
    "issueReimbursements",
    "recordReimbursementPayments",
    "recordPaymentsMade",
  ],
  updatePermissions: ["editFinanceRecords", "editAllDraftExpenses"],
  deleteArchivePermissions: ["archiveFinanceRecords", "cancelExpenses"],
  approveExecutePermissions: [
    "approveFinanceRecords",
    "approveExpenses",
    "rejectExpenses",
    "issueReimbursements",
    "recordReimbursementPayments",
  ],
};

const PAYROLL_ACCESS_CONFIG: FinancePageAccessConfig = {
  sectionKey: "payrollFundBasket",
  adminPermissions: ADMIN_PERMISSIONS,
  readPermissions: [
    "accessFinance",
    "viewFinance",
    "accessPayroll",
    "viewPayroll",
    "viewOwnPaychecks",
  ],
  createPermissions: ["createFinanceRecords", "createPayrollRuns"],
  updatePermissions: ["editFinanceRecords", "editPayrollRuns", "managePayProfiles"],
  deleteArchivePermissions: ["archiveFinanceRecords"],
  approveExecutePermissions: [
    "approveFinanceRecords",
    "approvePayroll",
    "processPayrollPayments",
  ],
};

const EMPTY_TRANSACTIONS_DATA: TransactionsPageData = {
  counts: {
    invoices: 0,
    bills: 0,
    proformaInvoices: 0,
    expenses: 0,
    paymentsMade: 0,
    paymentsReceived: 0,
    purchaseOrders: 0,
    paycheckRequests: 0,
    payrollRuns: 0,
  },
  totals: {
    receivables: 0,
    payables: 0,
    paymentsIn: 0,
    paymentsOut: 0,
  },
  alerts: {
    overdueInvoices: 0,
    overdueBills: 0,
    pendingExpenses: 0,
  },
  recentActivity: [],
};

const EMPTY_ACCESS_FLAGS: AccessFlags = {
  hasAnyFinanceEntry: false,
  canSeeIncomingMoney: false,
  canMonitorIncomingMoney: false,
  canSeeSupplierProcurement: false,
  canMonitorSupplierProcurement: false,
  canSeeOwnExpenses: true,
  canSeeExpenseFunding: false,
  canMonitorExpenseFunding: false,
  canSeeOwnPaychecks: true,
  canSeePayrollBasket: false,
  canMonitorPayrollBasket: false,
  canMonitorAnyCompanyFinance: false,
};

function toNumber(value: number | string | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatMoney(value: number) {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatCount(value: number) {
  return value.toLocaleString();
}

function formatDateLabel(value: string | null) {
  if (!value) return "—";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return parsed.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function isOverdue(dueDate: string | null, balanceDue: number) {
  if (!dueDate || balanceDue <= 0) return false;

  const due = new Date(dueDate);
  const now = new Date();

  due.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);

  return due < now;
}

function getCount(result: CountResult) {
  return result.count ?? 0;
}

function resolveAccessFlags(
  profileRole: Role | null | undefined,
  effectivePermissions: Partial<Record<Permission, boolean>> | null
): AccessFlags {
  if (!profileRole || !effectivePermissions) return EMPTY_ACCESS_FLAGS;

  const incomingPermission = resolveFinancePagePermissionState({
    profileRole,
    permissions: effectivePermissions,
    config: INCOMING_MONEY_ACCESS_CONFIG,
  });

  const supplierPermission = resolveFinancePagePermissionState({
    profileRole,
    permissions: effectivePermissions,
    config: SUPPLIER_PROCUREMENT_ACCESS_CONFIG,
  });

  const expensePermission = resolveFinancePagePermissionState({
    profileRole,
    permissions: effectivePermissions,
    config: EXPENSE_FUNDING_ACCESS_CONFIG,
  });

  const payrollPermission = resolveFinancePagePermissionState({
    profileRole,
    permissions: effectivePermissions,
    config: PAYROLL_ACCESS_CONFIG,
  });

  const canSeeIncomingMoney = incomingPermission.canRead;
  const canMonitorIncomingMoney =
    incomingPermission.canUpdate || incomingPermission.canApproveExecute;

  const canSeeSupplierProcurement = supplierPermission.canRead;
  const canMonitorSupplierProcurement =
    supplierPermission.canUpdate || supplierPermission.canApproveExecute;

  const canSeeOwnExpenses = true;
  const canSeeExpenseFunding = expensePermission.canRead;
  const canMonitorExpenseFunding =
    expensePermission.canUpdate || expensePermission.canApproveExecute;

  const canSeeOwnPaychecks = true;
  const canSeePayrollBasket = payrollPermission.canRead;
  const canMonitorPayrollBasket =
    payrollPermission.canUpdate || payrollPermission.canApproveExecute;

  const canMonitorAnyCompanyFinance =
    canMonitorIncomingMoney ||
    canMonitorSupplierProcurement ||
    canMonitorExpenseFunding ||
    canMonitorPayrollBasket;

  const hasAnyFinanceEntry =
    canSeeIncomingMoney ||
    canSeeSupplierProcurement ||
    canSeeOwnExpenses ||
    canSeeExpenseFunding ||
    canSeeOwnPaychecks ||
    canSeePayrollBasket;

  return {
    hasAnyFinanceEntry,
    canSeeIncomingMoney,
    canMonitorIncomingMoney,
    canSeeSupplierProcurement,
    canMonitorSupplierProcurement,
    canSeeOwnExpenses,
    canSeeExpenseFunding,
    canMonitorExpenseFunding,
    canSeeOwnPaychecks,
    canSeePayrollBasket,
    canMonitorPayrollBasket,
    canMonitorAnyCompanyFinance,
  };
}

async function loadCount(tableName: string): Promise<CountResult> {
  const result = await supabase
    .from(tableName)
    .select("id", { count: "exact", head: true });

  if (result.error) throw result.error;
  return { count: result.count ?? 0 };
}

function getSectionTone(tone: TransactionSectionTone) {
  if (tone === "incoming") return "emerald";
  if (tone === "procurement") return "amber";
  if (tone === "expense") return "cyan";
  return "violet";
}

function getModuleRoute(item: TransactionFlowItem) {
  return item.routeOverride ?? item.module.route;
}

function getModuleTitle(item: TransactionFlowItem) {
  return item.titleOverride ?? item.module.title;
}

function getModuleDescription(item: TransactionFlowItem) {
  return item.descriptionOverride ?? item.module.description;
}

export default function FinanceTransactionsPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<TransactionsPageData>(
    EMPTY_TRANSACTIONS_DATA
  );
  const [currentProfile, setCurrentProfile] = useState<CurrentUserProfile | null>(
    null
  );
  const [effectivePermissions, setEffectivePermissions] = useState<Partial<
    Record<Permission, boolean>
  > | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);

  const accessFlags = useMemo(() => {
    return resolveAccessFlags(currentProfile?.role, effectivePermissions);
  }, [currentProfile?.role, effectivePermissions]);

  const loadCurrentProfile = useCallback(
    async (mode: FinanceLoadMode) => {
      const authResult = await supabase.auth.getUser();
      if (authResult.error) throw authResult.error;

      const authUserId = authResult.data.user?.id;
      if (!authUserId) {
        if (mode === "initial") {
          setCurrentProfile(null);
          setEffectivePermissions(null);
        }
        return null;
      }

      const [profileResult, permissions] = await Promise.all([
        supabase
          .from("profiles")
          .select("user_id, full_name, role")
          .eq("user_id", authUserId)
          .maybeSingle(),
        fetchFinanceEffectivePermissions(authUserId, mode, "Transactions"),
      ]);

      if (profileResult.error) throw profileResult.error;

      const nextProfile =
        (profileResult.data || null) as CurrentUserProfile | null;

      if (!nextProfile?.role) {
        if (mode === "initial") {
          setCurrentProfile(nextProfile);
          setEffectivePermissions(null);
        }
        return nextProfile;
      }

      setCurrentProfile(nextProfile);
      setEffectivePermissions(permissions);
      return nextProfile;
    },
    []
  );

  const loadTransactionsData = useCallback(
    async (mode: FinanceLoadMode = "initial") => {
      if (mode === "initial" && !hasLoadedOnce) {
        setIsLoading(true);
      } else {
        setIsRefreshing(true);
      }

      if (mode === "initial") setPageError(null);

      try {
        await loadCurrentProfile(mode);

        const [
          invoicesResult,
          billsResult,
          expensesResult,
          paymentsMadeResult,
          paymentsReceivedResult,
          payrollRunsResult,
          paycheckRequestsResult,
          proformaInvoicesResult,
          purchaseOrdersResult,
        ] = await Promise.all([
          supabase
            .from("finance_invoices_issued")
            .select(
              "id, invoice_number, status, total_amount, balance_due, due_date, created_at"
            )
            .order("created_at", { ascending: false })
            .limit(50),
          supabase
            .from("finance_bills_received")
            .select(
              "id, bill_number, status, total_amount, balance_due, due_date, created_at"
            )
            .order("created_at", { ascending: false })
            .limit(50),
          supabase
            .from("finance_expenses")
            .select(
              "id, expense_number, title, amount, status, approval_status, payment_status, created_at"
            )
            .order("created_at", { ascending: false })
            .limit(50),
          supabase
            .from("finance_payments_made")
            .select("id, amount, payment_date, created_at")
            .order("payment_date", { ascending: false })
            .limit(50),
          supabase
            .from("finance_payments_received")
            .select("id, amount, payment_date, created_at")
            .order("payment_date", { ascending: false })
            .limit(50),
          supabase
            .from("finance_payroll_runs")
            .select("id, run_number, status, total_net, created_at")
            .order("created_at", { ascending: false })
            .limit(50),
          loadCount("finance_paycheck_requests"),
          loadCount("finance_proforma_invoices"),
          loadCount("finance_purchase_orders"),
        ]);

        if (invoicesResult.error) throw invoicesResult.error;
        if (billsResult.error) throw billsResult.error;
        if (expensesResult.error) throw expensesResult.error;
        if (paymentsMadeResult.error) throw paymentsMadeResult.error;
        if (paymentsReceivedResult.error) throw paymentsReceivedResult.error;
        if (payrollRunsResult.error) throw payrollRunsResult.error;

        const invoices = (invoicesResult.data || []) as FinanceInvoiceRow[];
        const bills = (billsResult.data || []) as FinanceBillRow[];
        const expenses = (expensesResult.data || []) as FinanceExpenseRow[];
        const paymentsMade = (paymentsMadeResult.data ||
          []) as FinancePaymentMadeRow[];
        const paymentsReceived = (paymentsReceivedResult.data ||
          []) as FinancePaymentReceivedRow[];
        const payrollRuns = (payrollRunsResult.data ||
          []) as FinancePayrollRunRow[];

        const receivables = invoices.reduce(
          (sum, row) => sum + toNumber(row.balance_due),
          0
        );

        const payables = bills.reduce(
          (sum, row) => sum + toNumber(row.balance_due),
          0
        );

        const paymentsIn = paymentsReceived.reduce(
          (sum, row) => sum + toNumber(row.amount),
          0
        );

        const paymentsOut = paymentsMade.reduce(
          (sum, row) => sum + toNumber(row.amount),
          0
        );

        const overdueInvoices = invoices.filter((row) =>
          isOverdue(row.due_date, toNumber(row.balance_due))
        ).length;

        const overdueBills = bills.filter((row) =>
          isOverdue(row.due_date, toNumber(row.balance_due))
        ).length;

        const pendingExpenses = expenses.filter(
          (row) =>
            row.approval_status === "pending" ||
            row.status === "pending" ||
            row.payment_status === "pending"
        ).length;

        const recentActivity: RecentTransactionItem[] = [
          ...invoices.slice(0, 4).map((row) => ({
            id: `invoice-${row.id}`,
            type: "Invoice",
            title: row.invoice_number,
            subtitle: `${row.status} • Balance $${formatMoney(
              toNumber(row.balance_due)
            )}`,
            createdAt: row.created_at,
            route: `/finance/transactions/invoices/${row.id}`,
          })),
          ...bills.slice(0, 4).map((row) => ({
            id: `bill-${row.id}`,
            type: "Bill",
            title: row.bill_number,
            subtitle: `${row.status} • Balance $${formatMoney(
              toNumber(row.balance_due)
            )}`,
            createdAt: row.created_at,
            route: `/finance/transactions/bills/${row.id}`,
          })),
          ...expenses.slice(0, 4).map((row) => ({
            id: `expense-${row.id}`,
            type: "Expense",
            title: row.expense_number || "Expense",
            subtitle: `${row.status} • ${row.title || "No title"}`,
            createdAt: row.created_at,
            route: `/finance/transactions/expenses/${row.id}`,
          })),
          ...payrollRuns.slice(0, 3).map((row) => ({
            id: `payroll-${row.id}`,
            type: "Payroll",
            title: row.run_number || "Payroll run",
            subtitle: `${row.status} • Net $${formatMoney(
              toNumber(row.total_net)
            )}`,
            createdAt: row.created_at,
            route: `/finance/transactions/payroll/${row.id}`,
          })),
        ]
          .sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )
          .slice(0, 8);

        setData({
          counts: {
            invoices: invoices.length,
            bills: bills.length,
            proformaInvoices: getCount(proformaInvoicesResult),
            expenses: expenses.length,
            paymentsMade: paymentsMade.length,
            paymentsReceived: paymentsReceived.length,
            purchaseOrders: getCount(purchaseOrdersResult),
            paycheckRequests: getCount(paycheckRequestsResult),
            payrollRuns: payrollRuns.length,
          },
          totals: {
            receivables,
            payables,
            paymentsIn,
            paymentsOut,
          },
          alerts: {
            overdueInvoices,
            overdueBills,
            pendingExpenses,
          },
          recentActivity,
        });
        setHasLoadedOnce(true);
      } catch (error) {
        console.error("Failed to load finance transactions hub:", error);

        if (mode === "initial") {
          setData(EMPTY_TRANSACTIONS_DATA);
          setPageError(
            error instanceof Error
              ? error.message
              : "Failed to load finance transactions hub."
          );
        }
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [hasLoadedOnce, loadCurrentProfile]
  );

  useEffect(() => {
    void loadTransactionsData("initial");
  }, [loadTransactionsData]);

  useEffect(() => {
    const channel = supabase
      .channel("finance-transactions-hub")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_invoices_issued" },
        () => void loadTransactionsData("silent")
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_bills_received" },
        () => void loadTransactionsData("silent")
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_expenses" },
        () => void loadTransactionsData("silent")
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_payments_made" },
        () => void loadTransactionsData("silent")
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_payments_received" },
        () => void loadTransactionsData("silent")
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        () => void loadTransactionsData("silent")
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_payroll_runs" },
        () => void loadTransactionsData("silent")
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finance_paycheck_requests" },
        () => void loadTransactionsData("silent")
      )
      .subscribe();

    const intervalId = window.setInterval(() => {
      void loadTransactionsData("silent");
    }, 60000);

    return () => {
      window.clearInterval(intervalId);
      void supabase.removeChannel(channel);
    };
  }, [loadTransactionsData]);

  const metricCards = useMemo<TransactionMetricCard[]>(() => {
    const cards: TransactionMetricCard[] = [];

    if (accessFlags.canMonitorIncomingMoney) {
      cards.push({
        key: "receivables",
        title: "Receivables",
        value: isLoading ? "—" : `$${formatMoney(data.totals.receivables)}`,
        subtitle: `${formatCount(data.counts.invoices)} invoice records`,
        icon: Wallet,
        tone: "emerald",
      });
    }

    if (accessFlags.canMonitorSupplierProcurement) {
      cards.push({
        key: "payables",
        title: "Payables",
        value: isLoading ? "—" : `$${formatMoney(data.totals.payables)}`,
        subtitle: `${formatCount(data.counts.bills)} bill records`,
        icon: Receipt,
        tone: "amber",
      });
    }

    if (accessFlags.canMonitorIncomingMoney) {
      cards.push({
        key: "payments-in",
        title: "Payments In",
        value: isLoading ? "—" : `$${formatMoney(data.totals.paymentsIn)}`,
        subtitle: `${formatCount(data.counts.paymentsReceived)} incoming payments`,
        icon: CreditCard,
        tone: "cyan",
      });
    }

    if (
      accessFlags.canMonitorSupplierProcurement ||
      accessFlags.canMonitorExpenseFunding ||
      accessFlags.canMonitorPayrollBasket
    ) {
      cards.push({
        key: "payments-out",
        title: "Payments Out",
        value: isLoading ? "—" : `$${formatMoney(data.totals.paymentsOut)}`,
        subtitle: `${formatCount(data.counts.paymentsMade)} outgoing payments`,
        icon: CreditCard,
        tone: "rose",
      });
    }

    return cards;
  }, [accessFlags, data, isLoading]);

  const allModuleCards = useMemo<
    Record<TransactionModuleKey, TransactionModuleCard>
  >(
    () => ({
      quotations: {
        key: "quotations",
        title: "Quotations",
        description:
          "Commercial offers sent to customers before proforma and invoice issuance.",
        route: "/finance/transactions/quotations",
        icon: FileText,
        count: 0,
        statusLabel: "Live",
        lastUpdatedLabel: "Company",
        tone: "emerald",
      },
      "customer-pos": {
        key: "customer-pos",
        title: "Customer POs",
        description:
          "Customer purchase orders received as incoming commercial commitment.",
        route: "/finance/transactions/customer-pos",
        icon: FileText,
        count: 0,
        statusLabel: "Live",
        lastUpdatedLabel: "Company",
        tone: "emerald",
      },
      "vendor-quotations": {
        key: "vendor-quotations",
        title: "Vendor Quotations",
        description:
          "Vendor quotations received before purchase order issuance.",
        route: "/finance/transactions/vendor-quotations",
        icon: FileText,
        count: 0,
        statusLabel: "Route ready",
        lastUpdatedLabel: "Company",
        tone: "amber",
      },
      invoices: {
        key: "invoices",
        title: "Invoices",
        description: "Official receivable records issued to customers and clients.",
        route: "/finance/transactions/invoices",
        icon: FileText,
        count: data.counts.invoices,
        statusLabel: "Live",
        lastUpdatedLabel: "Company",
        tone: "emerald",
      },
      bills: {
        key: "bills",
        title: "Vendor PI / Invoices",
        description:
          "Vendor proforma invoices and vendor invoices received into the payable flow.",
        route: "/finance/transactions/bills",
        icon: Receipt,
        count: data.counts.bills,
        statusLabel: "Live",
        lastUpdatedLabel: "Company",
        tone: "amber",
      },
      "proforma-invoices": {
        key: "proforma-invoices",
        title: "Proforma Invoices",
        description:
          "Advance-payment and commercial confirmation flow before final invoice.",
        route: "/finance/transactions/proforma-invoices",
        icon: FileText,
        count: data.counts.proformaInvoices,
        statusLabel: data.counts.proformaInvoices > 0 ? "Live" : "Later",
        lastUpdatedLabel: "Company",
        tone: "cyan",
      },
      expenses: {
        key: "expenses",
        title: "Expenses & Reimbursements",
        description:
          "Create, edit, submit, upload, and confirm your own expenses and reimbursement requests.",
        route: "/finance/transactions/expenses",
        icon: Receipt,
        count: data.counts.expenses,
        statusLabel: "Own access",
        lastUpdatedLabel: "Personal",
        isPersonalDefault: true,
        tone: "cyan",
      },
      "payments-made": {
        key: "payments-made",
        title: "Payments Made",
        description:
          "Outgoing cash settlements for vendor invoices, expenses, reimbursements, and payroll.",
        route: "/finance/transactions/payments-made",
        icon: CreditCard,
        count: data.counts.paymentsMade,
        statusLabel: "Company",
        lastUpdatedLabel: "Company",
        tone: "rose",
      },
      "payments-received": {
        key: "payments-received",
        title: "Payments Received",
        description:
          "Incoming payment confirmations mapped to customer receivables.",
        route: "/finance/transactions/payments-received",
        icon: CreditCard,
        count: data.counts.paymentsReceived,
        statusLabel: "Live",
        lastUpdatedLabel: "Company",
        tone: "emerald",
      },
      "purchase-orders": {
        key: "purchase-orders",
        title: "Purchase Orders",
        description:
          "Issued supplier purchase orders and outbound procurement commitments.",
        route: "/finance/transactions/purchase-orders",
        icon: FileText,
        count: data.counts.purchaseOrders,
        statusLabel: data.counts.purchaseOrders > 0 ? "Live" : "Route ready",
        lastUpdatedLabel: "Company",
        tone: "amber",
      },
      "paycheck-requests": {
        key: "paycheck-requests",
        title: "Paycheck Requests",
        description:
          "Create, edit, submit, upload, and confirm your own paycheck requests.",
        route: "/finance/transactions/paycheck-requests",
        icon: FileText,
        count: data.counts.paycheckRequests,
        statusLabel: "Own access",
        lastUpdatedLabel: "Personal",
        isPersonalDefault: true,
        tone: "violet",
      },
      payroll: {
        key: "payroll",
        title: "Payroll Fund Basket",
        description:
          "Payroll fund allocation baskets, linked paychecks, payment execution, and confirmation control.",
        route: "/finance/transactions/payroll",
        icon: BriefcaseBusiness,
        count: data.counts.payrollRuns,
        statusLabel: "Company",
        lastUpdatedLabel: "Company",
        tone: "violet",
      },
    }),
    [data]
  );

  const transactionSections = useMemo<TransactionSection[]>(() => {
    const sections: TransactionSection[] = [];

    if (accessFlags.canSeeIncomingMoney) {
      sections.push({
        key: "incoming",
        title: "Incoming Money Flow",
        subtitle:
          "Customer-side receivable flow from quotation and customer commitment through proforma, final invoice, and payment collection.",
        tone: "incoming",
        icon: Wallet,
        modules: [
          { module: allModuleCards.quotations, sequenceLabel: "01" },
          { module: allModuleCards["customer-pos"], sequenceLabel: "02" },
          { module: allModuleCards["proforma-invoices"], sequenceLabel: "03" },
          { module: allModuleCards.invoices, sequenceLabel: "04" },
          { module: allModuleCards["payments-received"], sequenceLabel: "05" },
        ],
      });
    }

    if (accessFlags.canSeeSupplierProcurement) {
      sections.push({
        key: "procurement",
        title: "Supplier Procurement Flow",
        subtitle:
          "Supplier quotation, purchase order, vendor PI or invoice, and outgoing payment settlement.",
        tone: "procurement",
        icon: Receipt,
        modules: [
          { module: allModuleCards["vendor-quotations"], sequenceLabel: "01" },
          { module: allModuleCards["purchase-orders"], sequenceLabel: "02" },
          {
            module: allModuleCards.bills,
            sequenceLabel: "03",
            titleOverride: "Vendor PI / Invoice",
          },
          {
            module: allModuleCards["payments-made"],
            sequenceLabel: "04",
            titleOverride: "Payment Made",
          },
        ],
      });
    }

    const expenseModules: TransactionFlowItem[] = [];

    if (accessFlags.canSeeOwnExpenses) {
      expenseModules.push({
        module: allModuleCards.expenses,
        sequenceLabel: "01",
        titleOverride: "My Expense / Reimbursement Requests",
        descriptionOverride:
          "Default own access: create, edit, submit, upload, and confirm your own expense and reimbursement records.",
      });
    }

    if (accessFlags.canSeeExpenseFunding) {
      expenseModules.push({
        module: allModuleCards["payments-made"],
        sequenceLabel: "02",
        titleOverride: "Funding Pool / Payment Distribution",
        descriptionOverride:
          "Finance/Admin execution area for expense funding pools, payment distribution, proof review, and recipient confirmation monitoring.",
        routeOverride: "/finance/transactions/expenses-payments-made",
      });
    }

    if (expenseModules.length > 0) {
      sections.push({
        key: "operating-expenses",
        title: "Expenses & Reimbursements Flow",
        subtitle: accessFlags.canSeeExpenseFunding
          ? "Personal expense/reimbursement access plus Finance/Admin funding and payment execution if enabled."
          : "Personal expense and reimbursement requests. Company funding/payment execution is hidden until Admin enables it.",
        tone: "expense",
        icon: Receipt,
        modules: expenseModules,
      });
    }

    const payrollModules: TransactionFlowItem[] = [];

    if (accessFlags.canSeeOwnPaychecks) {
      payrollModules.push({
        module: allModuleCards["paycheck-requests"],
        sequenceLabel: "01",
        titleOverride: "My Paycheck Requests",
        descriptionOverride:
          "Default own access: create, edit, submit, upload, and confirm your own paycheck request records.",
      });
    }

    if (accessFlags.canSeePayrollBasket) {
      payrollModules.push({
        module: allModuleCards.payroll,
        sequenceLabel: "02",
        titleOverride: "Payroll Fund Basket",
        descriptionOverride:
          "Finance/Admin payroll funding pool, linked approved paycheck requests, payment distribution, and employee confirmation monitoring.",
      });
    }

    if (payrollModules.length > 0) {
      sections.push({
        key: "internal-flows",
        title: "Internal Finance Flows",
        subtitle: accessFlags.canSeePayrollBasket
          ? "Personal paycheck requests plus Finance/Admin payroll fund basket execution if enabled."
          : "Personal paycheck requests. Payroll fund basket execution is hidden until Admin enables it.",
        tone: "internal",
        icon: BriefcaseBusiness,
        modules: payrollModules,
      });
    }

    return sections;
  }, [accessFlags, allModuleCards]);

  const recentActivity = useMemo(() => {
    if (accessFlags.canMonitorAnyCompanyFinance) {
      return [...data.recentActivity].filter((item) => {
        if (item.type === "Invoice") return accessFlags.canMonitorIncomingMoney;
        if (item.type === "Bill") return accessFlags.canMonitorSupplierProcurement;
        if (item.type === "Expense") return accessFlags.canMonitorExpenseFunding;
        if (item.type === "Payroll") return accessFlags.canMonitorPayrollBasket;
        return false;
      });
    }

    return [];
  }, [accessFlags, data.recentActivity]);

  const headerStatusCards = useMemo(() => {
    return [
      {
        label: "System Status",
        value: isLoading ? "Loading" : isRefreshing ? "Syncing" : "Live",
        description: "Transaction hub refreshes silently every 60 seconds.",
        icon: ShieldCheck,
        tone: "emerald" as const,
      },
      {
        label: "Personal Access",
        value: "Enabled",
        description: "Own expenses and paycheck requests are available by default.",
        icon: UserRound,
        tone: "cyan" as const,
      },
      {
        label: "Company Modules",
        value: `${formatCount(
          transactionSections.filter((section) =>
            section.modules.some((item) => !item.module.isPersonalDefault)
          ).length
        )}`,
        description: "Company-level sections enabled for this user.",
        icon: LockKeyhole,
        tone: "amber" as const,
      },
    ];
  }, [isLoading, isRefreshing, transactionSections]);

  const openRoute = useCallback(
    (route: string) => {
      navigate(route);
    },
    [navigate]
  );

  if (isLoading && !hasLoadedOnce) {
    return (
      <AixiaLoadingState
        title="Loading transactions studio"
        description="Permission state, transaction counts, cash flow totals, and recent activity are being loaded."
      />
    );
  }

  return (
    <AixiaPage>
      <AixiaHero
        parentLabel="Finance"
        parentPath="/finance"
        badges={[
          { label: "Permission-Aware Transactions", tone: "cyan" },
          { label: "Own Records Enabled", tone: "emerald" },
          { label: isRefreshing ? "Silent Sync" : "Auto Refresh", tone: "neutral" },
        ]}
        gradientTitle="Transactions"
        title="Studio"
        subtitle="Finance transaction workflows filtered by approved access"
        description="This page only shows transaction areas available to the logged-in user. Personal expense and paycheck request access is enabled by default. Company-level workflows appear only when Finance Access Approvals permits them."
        statusCards={headerStatusCards}
      />

      {pageError ? <AixiaAlert tone="error">{pageError}</AixiaAlert> : null}

      <AixiaAccessRule
        title="Transactions access rule"
        description="This hub uses finance page-access resolution and never uses local permission helpers. Company modules appear only when the matching Access Approval section resolves as readable."
        icon={ShieldCheck}
      >
        Personal expense and paycheck request entry points stay visible by default. Company
        receivables, supplier procurement, expense funding, and payroll basket controls are
        resolved through fetchFinanceEffectivePermissions and resolveFinancePagePermissionState.
      </AixiaAccessRule>

      {metricCards.length > 0 ? (
        <AixiaMetricGrid>
          {metricCards.map((metric) => (
            <AixiaMetricCard
              key={metric.key}
              label={metric.title}
              value={metric.value}
              description={metric.subtitle}
              icon={metric.icon}
              tone={metric.tone}
            />
          ))}
        </AixiaMetricGrid>
      ) : null}

      <AixiaSmartLayout
        sidebar="normal"
        main={
          <>
            {transactionSections.length > 0 ? (
              transactionSections.map((section) => (
                <AixiaSection
                  key={section.key}
                  title={section.title}
                  description={section.subtitle}
                  icon={section.icon}
                  badge={<AixiaBadge tone={getSectionTone(section.tone)}>{section.title}</AixiaBadge>}
                >
                  <AixiaNavigationGrid>
                    {section.modules.map((item) => {
                      const route = getModuleRoute(item);

                      return (
                        <AixiaNavigationCard
                          key={`${item.module.key}-${item.sequenceLabel || "module"}`}
                          title={getModuleTitle(item)}
                          eyebrow={item.sequenceLabel ? `Step ${item.sequenceLabel}` : undefined}
                          description={getModuleDescription(item)}
                          icon={item.module.icon}
                          statusLabel={item.module.statusLabel}
                          summary={`${formatCount(item.module.count)} records`}
                          actionLabel={route ? "Open" : "Unavailable"}
                          tone={item.module.tone}
                          disabled={!route}
                          onClick={route ? () => openRoute(route) : undefined}
                          meta={[
                            {
                              label: "Records",
                              value: formatCount(item.module.count),
                              description: item.module.lastUpdatedLabel,
                            },
                            {
                              label: "Access",
                              value: item.module.lastUpdatedLabel,
                              description: item.module.isPersonalDefault
                                ? "Default personal flow"
                                : "Company-level flow",
                            },
                          ]}
                        />
                      );
                    })}
                  </AixiaNavigationGrid>
                </AixiaSection>
              ))
            ) : (
              <AixiaNavigationInfoPanel
                tone="amber"
                icon={LockKeyhole}
                title="No company transaction modules are enabled"
                description="You can still use your own allowed personal flows, such as your own expenses/reimbursements and paycheck requests. Company-level finance modules appear here only after an Admin enables the related Access Approval section."
              />
            )}

            {accessFlags.canMonitorAnyCompanyFinance ? (
              <AixiaSection
                title="Transaction Readiness"
                description="Company-level monitoring appears only for enabled Access Approval sections."
                icon={Receipt}
              >
                <AixiaReviewGrid variant="cards">
                  {accessFlags.canMonitorIncomingMoney ? (
                    <AixiaValueBlock
                      label="Open Receivables"
                      value={`$${formatMoney(data.totals.receivables)}`}
                      detail={`${formatCount(data.counts.invoices)} invoice records`}
                    />
                  ) : null}

                  {accessFlags.canMonitorSupplierProcurement ? (
                    <AixiaValueBlock
                      label="Open Payables"
                      value={`$${formatMoney(data.totals.payables)}`}
                      detail={`${formatCount(data.counts.bills)} bill records`}
                    />
                  ) : null}

                  {accessFlags.canMonitorExpenseFunding ? (
                    <AixiaValueBlock
                      label="Pending Expenses"
                      value={formatCount(data.alerts.pendingExpenses)}
                      detail="Expense items waiting for Finance/Admin action"
                    />
                  ) : null}
                </AixiaReviewGrid>
              </AixiaSection>
            ) : null}
          </>
        }
        side={
          <>
            {accessFlags.canMonitorAnyCompanyFinance ? (
              <AixiaSection
                title="Control Signals"
                description="Visible only for company-level monitoring permissions."
                icon={BadgeAlert}
                smartScroll
                visibleCards={8}
                itemCount={3}
              >
                <AixiaReviewGrid variant="cards">
                  {accessFlags.canMonitorIncomingMoney ? (
                    <AixiaValueBlock
                      label="Overdue Invoices"
                      value={isLoading ? "—" : formatCount(data.alerts.overdueInvoices)}
                      detail="Receivables requiring collection attention"
                    />
                  ) : null}

                  {accessFlags.canMonitorSupplierProcurement ? (
                    <AixiaValueBlock
                      label="Overdue Bills"
                      value={isLoading ? "—" : formatCount(data.alerts.overdueBills)}
                      detail="Payables requiring payment attention"
                    />
                  ) : null}

                  {accessFlags.canMonitorExpenseFunding ? (
                    <AixiaValueBlock
                      label="Pending Expenses"
                      value={isLoading ? "—" : formatCount(data.alerts.pendingExpenses)}
                      detail="Expense items waiting for Finance/Admin action"
                    />
                  ) : null}
                </AixiaReviewGrid>
              </AixiaSection>
            ) : null}

            {accessFlags.canMonitorAnyCompanyFinance ? (
              <AixiaSection
                title="Recent Activity"
                description="Latest movement across permitted company transaction objects."
                icon={Receipt}
                smartScroll
                visibleCards={8}
                itemCount={recentActivity.length}
              >
                {recentActivity.length === 0 ? (
                  <AixiaEmptyState
                    icon={Receipt}
                    title="No permitted company activity found"
                    description="Activity appears here only for company-level sections this user can monitor."
                  />
                ) : (
                  <AixiaSideList>
                    {recentActivity.map((item) => (
                      <AixiaSideListRow
                        key={item.id}
                        badge={<AixiaBadge tone="cyan">{item.type}</AixiaBadge>}
                        title={item.title}
                        description={item.subtitle}
                        meta={formatDateLabel(item.createdAt)}
                        disabled={!item.route}
                        onClick={
                          item.route ? () => navigate(item.route as string) : undefined
                        }
                      />
                    ))}
                  </AixiaSideList>
                )}
              </AixiaSection>
            ) : null}

            {!accessFlags.canMonitorAnyCompanyFinance ? (
              <AixiaSection
                title="Personal Access"
                description="Default employee finance access."
                icon={UserRound}
              >
                <AixiaReviewGrid variant="cards">
                  <AixiaNavigationStatBlock
                    label="Own Expenses"
                    value="Enabled"
                    description="Create, edit, submit, upload, and confirm your own expense/reimbursement records."
                    tone="cyan"
                  />
                  <AixiaNavigationStatBlock
                    label="Own Paychecks"
                    value="Enabled"
                    description="Create, edit, submit, upload, and confirm your own paycheck request records."
                    tone="violet"
                  />
                </AixiaReviewGrid>
              </AixiaSection>
            ) : null}
          </>
        }
      />

      <div className="aixia-action-stack">
        <AixiaButton
          type="button"
          variant="secondary"
          onClick={() => navigate("/finance")}
        >
          <ArrowRight className="h-4 w-4 rotate-180" />
          Finance
        </AixiaButton>
      </div>
    </AixiaPage>
  );
}
