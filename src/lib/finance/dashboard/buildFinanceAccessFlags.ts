import {
  resolveFinancePagePermissionState,
  type FinancePageAccessConfig,
} from "@/lib/finance/pageAccess";
import type { Permission, Role } from "@/lib/permissions";

export type FinanceAccessFlagsProfile = {
  user_id?: string;
  full_name?: string | null;
  role: Role | null;
  permissions?: Partial<Record<Permission, boolean>> | null;
};

export type FinanceAccessFlags = {
  hasProfile: boolean;
  isAdmin: boolean;

  canOpenFinance: boolean;

  canSeeMasterData: boolean;
  canMonitorMasterData: boolean;

  canSeeTransactions: boolean;

  canSeeIncomingMoney: boolean;
  canMonitorIncomingMoney: boolean;

  canSeeSupplierProcurement: boolean;
  canMonitorSupplierProcurement: boolean;

  canSeeOwnExpenses: boolean;
  canSeeExpenseReview: boolean;
  canSeeExpenseFunding: boolean;
  canSeeExpensePayments: boolean;
  canMonitorExpenseFunding: boolean;

  canSeeOwnPaychecks: boolean;
  canSeePayrollBasket: boolean;
  canMonitorPayrollBasket: boolean;

  canSeeReports: boolean;
  canMonitorReports: boolean;

  canSeeSettings: boolean;
  canChangeSettings: boolean;

  canSeeAccessApprovals: boolean;

  canMonitorAnyCompanyFinance: boolean;
};

export const EMPTY_FINANCE_ACCESS_FLAGS: FinanceAccessFlags = {
  hasProfile: false,
  isAdmin: false,

  canOpenFinance: false,

  canSeeMasterData: false,
  canMonitorMasterData: false,

  canSeeTransactions: false,

  canSeeIncomingMoney: false,
  canMonitorIncomingMoney: false,

  canSeeSupplierProcurement: false,
  canMonitorSupplierProcurement: false,

  canSeeOwnExpenses: false,
  canSeeExpenseReview: false,
  canSeeExpenseFunding: false,
  canSeeExpensePayments: false,
  canMonitorExpenseFunding: false,

  canSeeOwnPaychecks: false,
  canSeePayrollBasket: false,
  canMonitorPayrollBasket: false,

  canSeeReports: false,
  canMonitorReports: false,

  canSeeSettings: false,
  canChangeSettings: false,

  canSeeAccessApprovals: false,

  canMonitorAnyCompanyFinance: false,
};

const FINANCE_HOME_ACCESS_CONFIG = {
  sectionKey: "masterData",
  adminPermissions: ["manageFinanceMasterData"],
  readPermissions: ["accessFinance", "viewFinance"],
  createPermissions: ["createFinanceRecords"],
  updatePermissions: ["editFinanceRecords", "approveFinanceRecords"],
  deleteArchivePermissions: ["archiveFinanceRecords"],
} as const satisfies FinancePageAccessConfig;

const FINANCE_MASTER_DATA_ACCESS_CONFIG = {
  sectionKey: "masterData",
  adminPermissions: ["manageFinanceMasterData"],
  readPermissions: [
    "accessFinance",
    "viewFinance",
    "manageFinanceMasterData",
    "viewClients",
    "viewVendors",
    "viewBankAccounts",
    "viewItems",
  ],
  createPermissions: ["createFinanceRecords", "manageFinanceMasterData"],
  updatePermissions: ["editFinanceRecords", "manageFinanceMasterData"],
  deleteArchivePermissions: ["archiveFinanceRecords", "manageFinanceMasterData"],
} as const satisfies FinancePageAccessConfig;

const FINANCE_INCOMING_ACCESS_CONFIG = {
  sectionKey: "incomingMoneyFlow",
  adminPermissions: ["manageFinanceMasterData"],
  readPermissions: [
    "accessFinance",
    "viewFinance",
    "accessReceivables",
    "viewReceivables",
  ],
  createPermissions: ["createFinanceRecords"],
  updatePermissions: ["editFinanceRecords", "viewInvoices", "viewReceivedPayments"],
  deleteArchivePermissions: ["archiveFinanceRecords"],
} as const satisfies FinancePageAccessConfig;

const FINANCE_PAYABLES_ACCESS_CONFIG = {
  sectionKey: "supplierProcurementFlow",
  adminPermissions: ["manageFinanceMasterData"],
  readPermissions: ["accessFinance", "viewFinance", "accessPayables", "viewPayables"],
  createPermissions: ["createFinanceRecords"],
  updatePermissions: [
    "editFinanceRecords",
    "viewBills",
    "viewPaymentsMade",
    "viewVendors",
  ],
  deleteArchivePermissions: ["archiveFinanceRecords"],
} as const satisfies FinancePageAccessConfig;

const FINANCE_EXPENSE_ACCESS_CONFIG = {
  sectionKey: "expensesFundingPayment",
  adminPermissions: ["manageFinanceMasterData"],
  readPermissions: [
    "accessFinance",
    "viewFinance",
    "accessExpenses",
    "viewOwnExpenses",
    "viewTeamExpenses",
    "createExpenses",
    "createReimbursements",
  ],
  createPermissions: ["createExpenses", "createReimbursements", "createFinanceRecords"],
  updatePermissions: [
    "approveExpenses",
    "issueReimbursements",
    "recordReimbursementPayments",
    "viewTeamExpenses",
    "viewPaymentsMade",
  ],
  deleteArchivePermissions: ["archiveFinanceRecords"],
} as const satisfies FinancePageAccessConfig;

const FINANCE_PAYROLL_ACCESS_CONFIG = {
  sectionKey: "payrollFundBasket",
  adminPermissions: ["manageFinanceMasterData"],
  readPermissions: [
    "accessFinance",
    "viewFinance",
    "accessPayroll",
    "viewOwnPaychecks",
    "viewAllPaychecks",
    "viewPayroll",
  ],
  createPermissions: ["createPayrollRuns"],
  updatePermissions: [
    "editPayrollRuns",
    "approvePayroll",
    "processPayrollPayments",
    "viewAllPaychecks",
    "viewPayroll",
  ],
  deleteArchivePermissions: ["archiveFinanceRecords"],
} as const satisfies FinancePageAccessConfig;

const FINANCE_REPORTS_ACCESS_CONFIG = {
  sectionKey: "reports",
  adminPermissions: ["manageFinanceMasterData"],
  readPermissions: [
    "accessFinance",
    "viewFinance",
    "viewReports",
    "exportFinanceReports",
    "exportReceivables",
    "exportPayables",
    "exportExpenseReports",
    "exportReimbursementReports",
  ],
  createPermissions: [],
  updatePermissions: ["exportFinanceReports"],
  deleteArchivePermissions: [],
} as const satisfies FinancePageAccessConfig;

const FINANCE_ACCESS_APPROVALS_CONFIG = {
  sectionKey: "accessApprovals",
  adminPermissions: ["manageFinanceMasterData", "manageUsers"],
  readPermissions: ["manageUsers"],
  createPermissions: [],
  updatePermissions: ["manageUsers"],
  deleteArchivePermissions: [],
} as const satisfies FinancePageAccessConfig;

export type FinanceModulePreviewItem = {
  key: string;
  label: string;
  visible: boolean;
  monitor: boolean;
  route?: string;
};

export function buildFinanceAccessFlags(
  profile: FinanceAccessFlagsProfile | null,
  permissions: Partial<Record<Permission, boolean>> | null
): FinanceAccessFlags {
  if (!profile?.role) {
    return EMPTY_FINANCE_ACCESS_FLAGS;
  }

  const isAdmin = String(profile.role || "").toLowerCase() === "admin";

  const financeHome = resolveFinancePagePermissionState({
    profileRole: profile.role,
    permissions,
    config: FINANCE_HOME_ACCESS_CONFIG,
  });

  const masterData = resolveFinancePagePermissionState({
    profileRole: profile.role,
    permissions,
    config: FINANCE_MASTER_DATA_ACCESS_CONFIG,
  });

  const incomingMoney = resolveFinancePagePermissionState({
    profileRole: profile.role,
    permissions,
    config: FINANCE_INCOMING_ACCESS_CONFIG,
  });

  const supplierProcurement = resolveFinancePagePermissionState({
    profileRole: profile.role,
    permissions,
    config: FINANCE_PAYABLES_ACCESS_CONFIG,
  });

  const expenses = resolveFinancePagePermissionState({
    profileRole: profile.role,
    permissions,
    config: FINANCE_EXPENSE_ACCESS_CONFIG,
  });

  const payroll = resolveFinancePagePermissionState({
    profileRole: profile.role,
    permissions,
    config: FINANCE_PAYROLL_ACCESS_CONFIG,
  });

  const reports = resolveFinancePagePermissionState({
    profileRole: profile.role,
    permissions,
    config: FINANCE_REPORTS_ACCESS_CONFIG,
  });

  const accessApprovals = resolveFinancePagePermissionState({
    profileRole: profile.role,
    permissions,
    config: FINANCE_ACCESS_APPROVALS_CONFIG,
  });

  const canSeeMasterData = masterData.canRead;
  const canMonitorMasterData = masterData.canUpdate || reports.canRead;

  const canSeeIncomingMoney = incomingMoney.canRead;
  const canMonitorIncomingMoney = incomingMoney.canUpdate || reports.canRead;

  const canSeeSupplierProcurement = supplierProcurement.canRead;
  const canMonitorSupplierProcurement =
    supplierProcurement.canUpdate || reports.canRead;

  const canSeeOwnExpenses = expenses.canRead || expenses.canCreate;
  const canSeeExpenseReview =
    isAdmin || Boolean(permissions?.approveExpenses) || expenses.canUpdate;
  const canSeeExpenseFunding =
    isAdmin || Boolean(permissions?.recordReimbursementPayments) || expenses.canUpdate;
  const canSeeExpensePayments = canSeeExpenseFunding;
  const canMonitorExpenseFunding = expenses.canUpdate || reports.canRead;

  const canSeeOwnPaychecks = payroll.canRead || payroll.canCreate;
  const canSeePayrollBasket = payroll.canUpdate || payroll.canCreate;
  const canMonitorPayrollBasket = payroll.canUpdate || reports.canRead;

  const canSeeReports = reports.canRead;
  const canMonitorReports = reports.canUpdate || reports.canRead;

  const canSeeAccessApprovals = isAdmin && accessApprovals.canRead;

  const canSeeTransactions =
    canSeeIncomingMoney ||
    canSeeSupplierProcurement ||
    canSeeOwnExpenses ||
    canSeeExpenseReview ||
    canSeeExpenseFunding ||
    canSeeExpensePayments ||
    canSeeOwnPaychecks ||
    canSeePayrollBasket;

  const canMonitorAnyCompanyFinance =
    canMonitorMasterData ||
    canMonitorIncomingMoney ||
    canMonitorSupplierProcurement ||
    canMonitorExpenseFunding ||
    canMonitorPayrollBasket ||
    canMonitorReports ||
    canSeeAccessApprovals;

  const canOpenFinance =
    financeHome.canRead ||
    canSeeTransactions ||
    canSeeMasterData ||
    canSeeReports ||
    canSeeAccessApprovals;

  return {
    hasProfile: true,
    isAdmin,

    canOpenFinance,

    canSeeMasterData,
    canMonitorMasterData,

    canSeeTransactions,

    canSeeIncomingMoney,
    canMonitorIncomingMoney,

    canSeeSupplierProcurement,
    canMonitorSupplierProcurement,

    canSeeOwnExpenses,
    canSeeExpenseReview,
    canSeeExpenseFunding,
    canSeeExpensePayments,
    canMonitorExpenseFunding,

    canSeeOwnPaychecks,
    canSeePayrollBasket,
    canMonitorPayrollBasket,

    canSeeReports,
    canMonitorReports,

    canSeeSettings: false,
    canChangeSettings: false,

    canSeeAccessApprovals,

    canMonitorAnyCompanyFinance,
  };
}

export function buildFinanceModulePreview(
  accessFlags: FinanceAccessFlags
): FinanceModulePreviewItem[] {
  return [
    {
      key: "master-data",
      label: "Master Data",
      visible: accessFlags.canSeeMasterData,
      monitor: accessFlags.canMonitorMasterData,
      route: "/finance/master-data",
    },
    {
      key: "incoming-money",
      label: "Incoming Money",
      visible: accessFlags.canSeeIncomingMoney,
      monitor: accessFlags.canMonitorIncomingMoney,
      route: "/finance/transactions",
    },
    {
      key: "supplier-procurement",
      label: "Supplier Procurement",
      visible: accessFlags.canSeeSupplierProcurement,
      monitor: accessFlags.canMonitorSupplierProcurement,
      route: "/finance/transactions",
    },
    {
      key: "expenses",
      label: "Expenses & Funding",
      visible: accessFlags.canSeeOwnExpenses || accessFlags.canSeeExpenseFunding,
      monitor: accessFlags.canMonitorExpenseFunding,
      route: "/finance/transactions",
    },
    {
      key: "payroll",
      label: "Payroll Basket",
      visible: accessFlags.canSeeOwnPaychecks || accessFlags.canSeePayrollBasket,
      monitor: accessFlags.canMonitorPayrollBasket,
      route: "/finance/transactions",
    },
    {
      key: "reports",
      label: "Reports",
      visible: accessFlags.canSeeReports,
      monitor: accessFlags.canMonitorReports,
      route: "/finance/reports",
    },
    {
      key: "access-approvals",
      label: "Access Approvals",
      visible: accessFlags.canSeeAccessApprovals,
      monitor: accessFlags.canSeeAccessApprovals,
      route: "/finance/access-approvals",
    },
  ];
}
