export type Role = "admin" | "manager" | "employee" | "guest";

const VALID_ROLES: Role[] = ["admin", "manager", "employee", "guest"];

/** Lowercase trim; unknown values default to employee. */
export function normalizeRole(value: string | null | undefined): Role {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (VALID_ROLES.includes(normalized as Role)) {
    return normalized as Role;
  }
  return "employee";
}

export function isAdminRole(value: string | null | undefined): boolean {
  return normalizeRole(value) === "admin";
}

export type Permission =
  | "createProjects"
  | "editAllProjects"
  | "deleteProjects"
  | "createTasks"
  | "editTasks"
  | "deleteTasks"
  | "viewEmployeeDirectory"
  | "viewEmployeeDetail"
  | "manageUsers"
  | "viewReports"
  | "generateProjectReports"
  | "accessChat"
  | "changeSettings"
  | "visibility"

  // FINANCE CORE
  | "accessFinance"
  | "manageFinanceMasterData"
  | "viewFinance"
  | "createFinanceRecords"
  | "editFinanceRecords"
  | "archiveFinanceRecords"
  | "approveFinanceRecords"

  // RECEIVABLES
  | "accessReceivables"
  | "viewReceivables"
  | "createInvoices"
  | "editDraftInvoices"
  | "sendInvoices"
  | "voidInvoices"
  | "viewInvoices"
  | "recordPaymentsReceived"
  | "viewReceivedPayments"

  // PAYABLES
  | "accessPayables"
  | "viewPayables"
  | "createBills"
  | "editDraftBills"
  | "openBills"
  | "voidBills"
  | "viewBills"
  | "recordPaymentsMade"
  | "viewPaymentsMade"

  // MASTER DATA
  | "viewClients"
  | "manageClients"
  | "viewVendors"
  | "manageVendors"
  | "viewBankAccounts"
  | "viewPaymentMethods"
  | "viewPaymentTerms"
  | "viewShippingTerms"
   | "viewUnitsOfMeasure"
  | "viewTaxCodes"
  | "viewExpenseCategories"
  | "viewRevenueCategories"
  | "viewItems"

  // EXPORTS
  | "exportFinanceReports"
  | "exportReceivables"
  | "exportPayables"

  // ===== WAVE 4 — EXPENSES =====
  | "accessExpenses"
  | "viewExpenses"
  | "viewOwnExpenses"
  | "viewTeamExpenses"
  | "createExpenses"
  | "editOwnDraftExpenses"
  | "editAllDraftExpenses"
  | "submitExpenses"
  | "approveExpenses"
  | "rejectExpenses"
  | "cancelExpenses"

  // ===== WAVE 4 — REIMBURSEMENTS =====
  | "createReimbursements"
  | "viewReimbursements"
  | "issueReimbursements"
  | "recordReimbursementPayments"

  // ===== APPROVALS =====
  | "accessApprovals"
  | "viewApprovalQueue"
  | "actOnFinanceApprovals"

  // ===== COMMENTS + ATTACHMENTS =====
  | "addFinanceComments"
  | "viewFinanceComments"
  | "addFinanceAttachments"
  | "removeFinanceAttachments"

    // ===== PAYROLL =====
  | "accessPayroll"
  | "viewPayroll"
  | "viewOwnPaychecks"
  | "viewAllPaychecks"
  | "createPayrollRuns"
  | "editPayrollRuns"
  | "approvePayroll"
  | "processPayrollPayments"
  | "managePayProfiles"

    // ===== LEDGER =====
  | "accessLedger"
  | "viewLedger"
  | "viewChartOfAccounts"
  | "viewAccountingPeriods"
  | "viewJournalEntries"
  | "manageChartOfAccounts"
  | "manageAccountingPeriods"
  | "managePostingRules"
  | "createManualJournalEntries"
  | "postJournalEntries"
  | "reverseJournalEntries"
  | "voidJournalEntries"
  | "viewJournalDrilldown"
  | "exportLedgerReports"
  | "exportTrialBalance"
  | "exportAccountingReports"

  // ===== REPORTS =====
  | "exportExpenseReports"
  | "exportReimbursementReports";

type PermissionMap = Record<Permission, boolean>;

export type ProjectRow = {
  id: string;
  created_by: string | null;
};

export type TaskRow = {
  id: string;
  created_by: string | null;
  assignee_id?: string | null;
  project_id?: string | null;
  parent_task_id?: string | null;
  archived_at?: string | null;
  deleted_at?: string | null;
};

export type ProjectMemberRow = {
  project_id: string;
  user_id: string;
};

export type TaskMemberRow = {
  task_id: string;
  user_id: string;
};

export type CalendarEventRow = {
  project_id: string | null;
  created_by: string | null;
};

const ROLE_PERMISSIONS: Record<Role, PermissionMap> = {
  admin: {
    createProjects: true,
    editAllProjects: true,
    deleteProjects: true,
    createTasks: true,
    editTasks: true,
    deleteTasks: true,

    viewEmployeeDirectory: true,
    viewEmployeeDetail: true,
    manageUsers: true,

    viewReports: true,
    generateProjectReports: true,
    accessChat: true,
    changeSettings: true,
    visibility: true,

    accessFinance: true,
    manageFinanceMasterData: true,
    viewFinance: true,
    createFinanceRecords: true,
    editFinanceRecords: true,
    archiveFinanceRecords: true,
    approveFinanceRecords: true,

    accessReceivables: true,
    viewReceivables: true,
    createInvoices: true,
    editDraftInvoices: true,
    sendInvoices: true,
    voidInvoices: true,
    viewInvoices: true,
    recordPaymentsReceived: true,
    viewReceivedPayments: true,

    accessPayables: true,
    viewPayables: true,
    createBills: true,
    editDraftBills: true,
    openBills: true,
    voidBills: true,
    viewBills: true,
    recordPaymentsMade: true,
    viewPaymentsMade: true,

    viewClients: true,
    manageClients: true,
    viewVendors: true,
    manageVendors: true,
    viewBankAccounts: true,
    viewPaymentMethods: true,
    viewPaymentTerms: true,
    viewShippingTerms: true,
    viewUnitsOfMeasure: true,
    viewTaxCodes: true,
    viewExpenseCategories: true,
    viewRevenueCategories: true,
    viewItems: true,
    exportFinanceReports: true,
    exportReceivables: true,
    exportPayables: true,

        // ===== WAVE 4 =====
    accessExpenses: true,
    viewExpenses: true,
    viewOwnExpenses: true,
    viewTeamExpenses: true,
    createExpenses: true,
    editOwnDraftExpenses: true,
    editAllDraftExpenses: true,
    submitExpenses: true,
    approveExpenses: true,
    rejectExpenses: true,
    cancelExpenses: true,

    createReimbursements: true,
    viewReimbursements: true,
    issueReimbursements: true,
    recordReimbursementPayments: true,

    accessApprovals: true,
    viewApprovalQueue: true,
    actOnFinanceApprovals: true,

    addFinanceComments: true,
    viewFinanceComments: true,
    addFinanceAttachments: true,
    removeFinanceAttachments: true,

         accessPayroll: true,
    viewPayroll: true,
    viewOwnPaychecks: true,
    viewAllPaychecks: true,
    createPayrollRuns: true,
    editPayrollRuns: true,
    approvePayroll: true,
    processPayrollPayments: true,
    managePayProfiles: true,

    accessLedger: true,
    viewLedger: true,
    viewChartOfAccounts: true,
    viewAccountingPeriods: true,
    viewJournalEntries: true,
    manageChartOfAccounts: true,
    manageAccountingPeriods: true,
    managePostingRules: true,
    createManualJournalEntries: true,
    postJournalEntries: true,
    reverseJournalEntries: true,
    voidJournalEntries: true,
    viewJournalDrilldown: true,
    exportLedgerReports: true,
    exportTrialBalance: true,
    exportAccountingReports: true,

    exportExpenseReports: true,
    exportReimbursementReports: true,
  },

  manager: {
    createProjects: true,
    editAllProjects: true,
    deleteProjects: false,
    createTasks: true,
    editTasks: true,
    deleteTasks: false,

    viewEmployeeDirectory: true,
    viewEmployeeDetail: true,
    manageUsers: false,

    viewReports: true,
    generateProjectReports: false,
    accessChat: true,
    changeSettings: true,
    visibility: true,

    accessFinance: false,
    manageFinanceMasterData: false,
    viewFinance: false,
    createFinanceRecords: false,
    editFinanceRecords: false,
    archiveFinanceRecords: false,
    approveFinanceRecords: false,

    accessReceivables: false,
    viewReceivables: false,
    createInvoices: false,
    editDraftInvoices: false,
    sendInvoices: false,
    voidInvoices: false,
    viewInvoices: false,
    recordPaymentsReceived: false,
    viewReceivedPayments: false,

    accessPayables: false,
    viewPayables: false,
    createBills: false,
    editDraftBills: false,
    openBills: false,
    voidBills: false,
    viewBills: false,
    recordPaymentsMade: false,
    viewPaymentsMade: false,

    viewClients: false,
    manageClients: false,
    viewVendors: false,
    manageVendors: false,
    viewBankAccounts: false,
    viewPaymentMethods: false,
    viewPaymentTerms: false,
        viewShippingTerms: false,
    viewUnitsOfMeasure: false,
    viewTaxCodes: false,
    viewExpenseCategories: false,
    viewRevenueCategories: false,
    exportFinanceReports: false,
    exportReceivables: false,
    exportPayables: false,

            accessExpenses: true,
    viewExpenses: true,
    viewOwnExpenses: true,
    viewTeamExpenses: false,
    createExpenses: true,
    editOwnDraftExpenses: true,
    editAllDraftExpenses: false,
    submitExpenses: true,
    approveExpenses: false,
    rejectExpenses: false,
    cancelExpenses: false,

    createReimbursements: true,
    viewReimbursements: true,
    issueReimbursements: false,
    recordReimbursementPayments: false,

    accessApprovals: false,
    viewApprovalQueue: false,
    actOnFinanceApprovals: false,

    addFinanceComments: false,
    viewFinanceComments: false,
    addFinanceAttachments: false,
    removeFinanceAttachments: false,

          accessPayroll: false,
    viewPayroll: false,
    viewOwnPaychecks: false,
    viewAllPaychecks: false,
    createPayrollRuns: false,
    editPayrollRuns: false,
    approvePayroll: false,
    processPayrollPayments: false,
    managePayProfiles: false,

    accessLedger: false,
    viewLedger: false,
    viewChartOfAccounts: false,
    viewAccountingPeriods: false,
    viewJournalEntries: false,
    manageChartOfAccounts: false,
    manageAccountingPeriods: false,
    managePostingRules: false,
    createManualJournalEntries: false,
    postJournalEntries: false,
    reverseJournalEntries: false,
    voidJournalEntries: false,
    viewJournalDrilldown: false,
    exportLedgerReports: false,
    exportTrialBalance: false,
    exportAccountingReports: false,
    viewItems: false,

    exportExpenseReports: false,
    exportReimbursementReports: false,
  },

  employee: {
    createProjects: false,
    editAllProjects: false,
    deleteProjects: false,
    createTasks: true,
    editTasks: true,
    deleteTasks: false,

    viewEmployeeDirectory: true,
    viewEmployeeDetail: false,
    manageUsers: false,

    viewReports: false,
    generateProjectReports: false,
    accessChat: true,
    changeSettings: true,
    visibility: false,

    accessFinance: false,
    manageFinanceMasterData: false,
    viewFinance: false,
    createFinanceRecords: false,
    editFinanceRecords: false,
    archiveFinanceRecords: false,
    approveFinanceRecords: false,

    accessReceivables: false,
    viewReceivables: false,
    createInvoices: false,
    editDraftInvoices: false,
    sendInvoices: false,
    voidInvoices: false,
    viewInvoices: false,
    recordPaymentsReceived: false,
    viewReceivedPayments: false,

    accessPayables: false,
    viewPayables: false,
    createBills: false,
    editDraftBills: false,
    openBills: false,
    voidBills: false,
    viewBills: false,
    recordPaymentsMade: false,
    viewPaymentsMade: false,

    viewClients: false,
    manageClients: false,
    viewVendors: false,
    manageVendors: false,
    viewBankAccounts: false,
    viewPaymentMethods: false,
     viewPaymentTerms: false,
        viewShippingTerms: false,
    viewUnitsOfMeasure: false,
    viewTaxCodes: false,
    viewExpenseCategories: false,
    viewRevenueCategories: false,
    exportFinanceReports: false,
    exportReceivables: false,
    exportPayables: false,

           accessExpenses: true,
    viewExpenses: true,
    viewOwnExpenses: true,
    viewTeamExpenses: false,
    createExpenses: true,
    editOwnDraftExpenses: true,
    editAllDraftExpenses: false,
    submitExpenses: true,
    approveExpenses: false,
    rejectExpenses: false,
    cancelExpenses: false,

    createReimbursements: true,
    viewReimbursements: true,
    issueReimbursements: false,
    recordReimbursementPayments: false,

    accessApprovals: false,
    viewApprovalQueue: false,
    actOnFinanceApprovals: false,

    addFinanceComments: false,
    viewFinanceComments: false,
    addFinanceAttachments: false,
    removeFinanceAttachments: false,

         accessPayroll: true,
    viewPayroll: false,
    viewOwnPaychecks: true,
    viewAllPaychecks: false,
    createPayrollRuns: false,
    editPayrollRuns: false,
    approvePayroll: false,
    processPayrollPayments: false,
    managePayProfiles: false,

    accessLedger: false,
    viewLedger: false,
    viewChartOfAccounts: false,
    viewAccountingPeriods: false,
    viewJournalEntries: false,
    manageChartOfAccounts: false,
    manageAccountingPeriods: false,
    managePostingRules: false,
    createManualJournalEntries: false,
    postJournalEntries: false,
    reverseJournalEntries: false,
    voidJournalEntries: false,
    viewJournalDrilldown: false,
    exportLedgerReports: false,
    exportTrialBalance: false,
    exportAccountingReports: false,
    viewItems: false,

    exportExpenseReports: false,
    exportReimbursementReports: false,
  },

  guest: {
    createProjects: false,
    editAllProjects: false,
    deleteProjects: false,
    createTasks: true,
    editTasks: false,
    deleteTasks: false,

    viewEmployeeDirectory: true,
    viewEmployeeDetail: false,
    manageUsers: false,

    viewReports: false,
    generateProjectReports: false,
    accessChat: true,
    changeSettings: false,
    visibility: false,

    accessFinance: false,
    manageFinanceMasterData: false,
    viewFinance: false,
    createFinanceRecords: false,
    editFinanceRecords: false,
    archiveFinanceRecords: false,
    approveFinanceRecords: false,

    accessReceivables: false,
    viewReceivables: false,
    createInvoices: false,
    editDraftInvoices: false,
    sendInvoices: false,
    voidInvoices: false,
    viewInvoices: false,
    recordPaymentsReceived: false,
    viewReceivedPayments: false,

    accessPayables: false,
    viewPayables: false,
    createBills: false,
    editDraftBills: false,
    openBills: false,
    voidBills: false,
    viewBills: false,
    recordPaymentsMade: false,
    viewPaymentsMade: false,

    viewClients: false,
    manageClients: false,
    viewVendors: false,
    manageVendors: false,
    viewBankAccounts: false,
    viewPaymentMethods: false,
     viewPaymentTerms: false,
        viewShippingTerms: false,
    viewUnitsOfMeasure: false,
    viewTaxCodes: false,
    viewExpenseCategories: false,
    viewRevenueCategories: false,
    exportFinanceReports: false,
    exportReceivables: false,
    exportPayables: false,

        accessExpenses: false,
    viewExpenses: false,
    viewOwnExpenses: false,
    viewTeamExpenses: false,
    createExpenses: false,
    editOwnDraftExpenses: false,
    editAllDraftExpenses: false,
    submitExpenses: false,
    approveExpenses: false,
    rejectExpenses: false,
    cancelExpenses: false,

    createReimbursements: false,
    viewReimbursements: false,
    issueReimbursements: false,
    recordReimbursementPayments: false,

    accessApprovals: false,
    viewApprovalQueue: false,
    actOnFinanceApprovals: false,

    addFinanceComments: false,
    viewFinanceComments: false,
    addFinanceAttachments: false,
    removeFinanceAttachments: false,

        accessPayroll: false,
    viewPayroll: false,
    viewOwnPaychecks: false,
    viewAllPaychecks: false,
    createPayrollRuns: false,
    editPayrollRuns: false,
    approvePayroll: false,
    processPayrollPayments: false,
    managePayProfiles: false,

    accessLedger: false,
    viewLedger: false,
    viewChartOfAccounts: false,
    viewAccountingPeriods: false,
    viewJournalEntries: false,
    manageChartOfAccounts: false,
    manageAccountingPeriods: false,
    managePostingRules: false,
    createManualJournalEntries: false,
    postJournalEntries: false,
    reverseJournalEntries: false,
    voidJournalEntries: false,
    viewJournalDrilldown: false,
    exportLedgerReports: false,
    exportTrialBalance: false,
    exportAccountingReports: false,
    viewItems: false,

    exportExpenseReports: false,
    exportReimbursementReports: false,
  },
};

/* =========================================================
   ROUTE PERMISSIONS (CENTRALIZED)
========================================================= */

type RoutePermission = {
  roles?: Role[];
  permission?: Permission;
};

const ROUTE_PERMISSIONS: Record<string, RoutePermission> = {
  "/dashboard": { roles: ["admin", "manager", "employee", "guest"] },

  "/projects": { roles: ["admin", "manager", "employee", "guest"] },
  "/projects/new": { permission: "createProjects" },
  "/projects/:id": { roles: ["admin", "manager", "employee", "guest"] },
  "/projects/:id/edit": { permission: "editAllProjects" },
  "/projects/:id/task-fields": { roles: ["admin", "manager", "employee", "guest"] },

  "/tasks": { roles: ["admin", "manager", "employee", "guest"] },
  "/tasks/new": { permission: "createTasks" },
  "/tasks/:id": { roles: ["admin", "manager", "employee", "guest"] },
  "/tasks/:id/edit": { permission: "editTasks" },

  "/calendar": { roles: ["admin", "manager", "employee", "guest"] },
  "/calendar/new": { permission: "createTasks" },
  "/calendar/day/:date": { roles: ["admin", "manager", "employee", "guest"] },
  "/calendar/:id/edit": { permission: "editTasks" },

  "/chat": { permission: "accessChat" },
  "/chat/:id": { permission: "accessChat" },
  "/inbox": { permission: "accessChat" },

  "/employees": { permission: "viewEmployeeDirectory" },
  "/employees/:id": { permission: "viewEmployeeDetail" },
  "/employees/:id/permissions": { permission: "manageUsers" },

  "/finance": { permission: "accessFinance" },
  "/finance/transactions": { permission: "accessFinance" },
  "/finance/master-data": { permission: "manageFinanceMasterData" },
  "/finance/reports": { permission: "exportFinanceReports" },
  "/finance/settings": { roles: ["admin"], permission: "manageUsers" },

  "/finance/master-data/projects": { permission: "viewFinance" },
  "/finance/master-data/employees": { permission: "viewEmployeeDirectory" },
  "/finance/master-data/clients": { permission: "viewClients" },
  "/finance/master-data/clients/new": { permission: "createFinanceRecords" },
  "/finance/master-data/clients/:id": { permission: "viewClients" },

  "/finance/master-data/vendors": { permission: "viewVendors" },
  "/finance/master-data/vendors/new": { permission: "createFinanceRecords" },
  "/finance/master-data/vendors/:id": { permission: "viewVendors" },

  "/finance/master-data/companies": { permission: "viewFinance" },
  "/finance/master-data/companies/new": { permission: "createFinanceRecords" },
  "/finance/master-data/companies/:id": { permission: "viewFinance" },

  "/finance/master-data/payment-methods": { permission: "viewPaymentMethods" },
  "/finance/master-data/expense-categories": { permission: "viewExpenseCategories" },
  "/finance/master-data/revenue-categories": { permission: "viewRevenueCategories" },
  "/finance/master-data/items": { permission: "viewItems" },
  "/finance/master-data/currencies": { permission: "viewFinance" },

  "/finance/master-data/bank-accounts": { permission: "viewBankAccounts" },
  "/finance/master-data/bank-accounts/new": { permission: "createFinanceRecords" },
  "/finance/master-data/bank-accounts/:id": { permission: "viewBankAccounts" },
  "/finance/master-data/vendor-bank-accounts": { permission: "viewBankAccounts" },
  "/finance/master-data/vendor-bank-accounts/new": { permission: "createFinanceRecords" },
  "/finance/master-data/vendor-bank-accounts/:id": { permission: "viewBankAccounts" },

  "/finance/master-data/payment-terms": { permission: "viewPaymentTerms" },
  "/finance/master-data/shipping-terms": { permission: "viewShippingTerms" },
  "/finance/master-data/units-of-measure": { permission: "viewUnitsOfMeasure" },
  "/finance/master-data/tax-codes": { permission: "viewTaxCodes" },

  "/finance/transactions/customer-pos": { permission: "viewInvoices" },
  "/finance/transactions/customer-pos/new": { permission: "createInvoices" },
  "/finance/transactions/customer-pos/:id": { permission: "viewInvoices" },

  "/finance/transactions/invoices": { permission: "viewInvoices" },
  "/finance/transactions/invoices/new": { permission: "createInvoices" },
  "/finance/transactions/invoices/:id": { permission: "viewInvoices" },

  "/finance/transactions/quotations": { permission: "viewInvoices" },
  "/finance/transactions/quotations/new": { permission: "createInvoices" },
  "/finance/transactions/quotations/:id": { permission: "viewInvoices" },

  "/finance/transactions/proforma-invoices": { permission: "viewInvoices" },
  "/finance/transactions/proforma-invoices/new": { permission: "createInvoices" },
  "/finance/transactions/proforma-invoices/:id": { permission: "viewInvoices" },

  "/finance/transactions/vendor-quotations": { permission: "viewBills" },
  "/finance/transactions/vendor-quotations/new": { permission: "createBills" },
  "/finance/transactions/vendor-quotations/:id": { permission: "viewBills" },

  "/finance/transactions/purchase-orders": { permission: "viewBills" },
  "/finance/transactions/purchase-orders/new": { permission: "createBills" },
  "/finance/transactions/purchase-orders/:id": { permission: "viewBills" },

  "/finance/transactions/bills": { permission: "viewBills" },
  "/finance/transactions/bills/new": { permission: "createBills" },
  "/finance/transactions/bills/:id": { permission: "viewBills" },

  "/finance/transactions/payments-made": { permission: "viewPaymentsMade" },
  "/finance/transactions/payments-made/new": { permission: "recordPaymentsMade" },
  "/finance/transactions/payments-made/:id": { permission: "viewPaymentsMade" },

  "/finance/transactions/payments-received": { permission: "viewReceivedPayments" },
  "/finance/transactions/payments-received/new": { permission: "recordPaymentsReceived" },
  "/finance/transactions/payments-received/:id": { permission: "viewReceivedPayments" },

  "/settings": { permission: "changeSettings" },

  "/finance/transactions/expenses": { permission: "viewExpenses" },
  "/finance/transactions/expenses/new": { permission: "createExpenses" },
  "/finance/transactions/expenses/process": { permission: "viewExpenses" },
  "/finance/transactions/expenses/process/form": { permission: "createExpenses" },
  "/finance/transactions/expenses/process/:id": { permission: "viewExpenses" },
  "/finance/transactions/expenses/:id": { permission: "viewExpenses" },

  "/finance/transactions/expense-review": { permission: "approveExpenses" },
  "/finance/transactions/expense-review/:id": { permission: "approveExpenses" },

  "/finance/transactions/expense-funding": { permission: "recordReimbursementPayments" },
  "/finance/transactions/expense-funding/new": { permission: "recordReimbursementPayments" },
  "/finance/transactions/expense-funding/:id": { permission: "recordReimbursementPayments" },

  "/finance/transactions/expense-payments": { permission: "recordReimbursementPayments" },
  "/finance/transactions/expense-payments/new": { permission: "recordReimbursementPayments" },
  "/finance/transactions/expense-payments/:id": { permission: "recordReimbursementPayments" },

  "/finance/transactions/expenses-payments-made": { permission: "recordReimbursementPayments" },
  "/finance/transactions/expenses-payments-made/process-book-template": {
    permission: "recordReimbursementPayments",
  },
  "/finance/transactions/expenses-payments-made/new": { permission: "recordReimbursementPayments" },
  "/finance/transactions/expenses-payments-made/review/:id": {
    permission: "recordReimbursementPayments",
  },
  "/finance/transactions/expenses-payments-made/funding-batches/new": {
    permission: "recordReimbursementPayments",
  },
  "/finance/transactions/expenses-payments-made/funding-batches/:id": {
    permission: "recordReimbursementPayments",
  },
  "/finance/transactions/expenses-payments-made/:id": { permission: "recordReimbursementPayments" },

  "/finance/transactions/paycheck-requests": { permission: "viewOwnPaychecks" },
  "/finance/transactions/paycheck-requests/new": { permission: "viewOwnPaychecks" },
  "/finance/transactions/paycheck-requests/:id": { permission: "viewOwnPaychecks" },

  "/finance/transactions/payroll": { permission: "viewAllPaychecks" },
  "/finance/transactions/payroll/new": { permission: "createPayrollRuns" },
  "/finance/transactions/payroll/review/:id": { permission: "viewAllPaychecks" },
  "/finance/transactions/payroll/funding-batches/new": { permission: "viewAllPaychecks" },
  "/finance/transactions/payroll/funding-batches/:id": { permission: "viewAllPaychecks" },
  "/finance/transactions/payroll/:id": { permission: "viewAllPaychecks" },

  "/finance/access-approvals": { roles: ["admin"], permission: "manageUsers" },
  "/finance/access-approvals/:userId": { roles: ["admin"], permission: "manageUsers" },
};

function applyBooleanPermissionOverrides(
  effective: PermissionMap,
  role: Role,
  overrides?: Partial<PermissionMap> | null
) {
  const overridePermissions = overrides ?? {};

  (Object.keys(overridePermissions) as Permission[]).forEach((key) => {
    const overrideValue = overridePermissions[key];

    if (typeof overrideValue !== "boolean") {
      return;
    }

    if (role === "admin") {
      if (overrideValue === true) {
        effective[key] = true;
      }

      return;
    }

    effective[key] = overrideValue;
  });
}

function lockAdminOnlyFinancePermissions(effective: PermissionMap, role: Role) {
  if (role === "admin") {
    return;
  }

  effective.manageUsers = false;
  effective.accessApprovals = false;
  effective.viewApprovalQueue = false;
  effective.actOnFinanceApprovals = false;
}

function applyPermissionCascades(effective: PermissionMap) {
  if (effective.manageUsers) {
    effective.viewEmployeeDirectory = true;
    effective.viewEmployeeDetail = true;
  }

  if (effective.accessFinance) {
    effective.viewFinance = true;
  }

  if (effective.manageFinanceMasterData) {
    effective.accessFinance = true;
    effective.viewFinance = true;
    effective.viewClients = true;
    effective.viewVendors = true;
    effective.viewBankAccounts = true;
    effective.viewPaymentMethods = true;
    effective.viewPaymentTerms = true;
    effective.viewShippingTerms = true;
    effective.viewUnitsOfMeasure = true;
    effective.viewTaxCodes = true;
    effective.viewExpenseCategories = true;
    effective.viewRevenueCategories = true;
    effective.viewItems = true;
  }

  if (effective.createFinanceRecords) {
    effective.createInvoices = true;
    effective.recordPaymentsReceived = true;
    effective.createBills = true;
    effective.recordPaymentsMade = true;
  }

  if (effective.editFinanceRecords) {
    effective.editDraftInvoices = true;
    effective.sendInvoices = true;
    effective.editDraftBills = true;
    effective.openBills = true;
  }

  if (effective.archiveFinanceRecords) {
    effective.voidInvoices = true;
    effective.voidBills = true;
  }

  if (effective.accessReceivables || effective.viewReceivables) {
    effective.accessFinance = true;
    effective.viewFinance = true;
    effective.viewInvoices = true;
    effective.viewReceivedPayments = true;
    effective.viewClients = true;
    effective.viewBankAccounts = true;
    effective.viewPaymentMethods = true;
  }

  if (
    effective.createInvoices ||
    effective.editDraftInvoices ||
    effective.sendInvoices ||
    effective.voidInvoices ||
    effective.recordPaymentsReceived
  ) {
    effective.accessReceivables = true;
    effective.viewReceivables = true;
    effective.accessFinance = true;
    effective.viewFinance = true;
    effective.viewInvoices = true;
    effective.viewReceivedPayments = true;
    effective.viewClients = true;
    effective.viewBankAccounts = true;
    effective.viewPaymentMethods = true;
  }

  if (effective.accessPayables || effective.viewPayables) {
    effective.accessFinance = true;
    effective.viewFinance = true;
    effective.viewBills = true;
    effective.viewPaymentsMade = true;
    effective.viewVendors = true;
    effective.viewBankAccounts = true;
    effective.viewPaymentMethods = true;
    effective.viewExpenseCategories = true;
  }

  if (
    effective.createBills ||
    effective.editDraftBills ||
    effective.openBills ||
    effective.voidBills ||
    effective.recordPaymentsMade
  ) {
    effective.accessPayables = true;
    effective.viewPayables = true;
    effective.accessFinance = true;
    effective.viewFinance = true;
    effective.viewBills = true;
    effective.viewPaymentsMade = true;
    effective.viewVendors = true;
    effective.viewBankAccounts = true;
    effective.viewPaymentMethods = true;
    effective.viewExpenseCategories = true;
  }

  if (effective.manageClients) {
    effective.viewClients = true;
  }

  if (effective.manageVendors) {
    effective.viewVendors = true;
  }

  if (
    effective.viewOwnExpenses ||
    effective.createExpenses ||
    effective.editOwnDraftExpenses ||
    effective.submitExpenses ||
    effective.createReimbursements
  ) {
    effective.accessExpenses = true;
    effective.viewExpenses = true;
    effective.viewOwnExpenses = true;
    effective.accessFinance = true;
    effective.viewFinance = true;
    effective.viewReimbursements = true;
    effective.addFinanceAttachments = true;
    effective.viewFinanceComments = true;
    effective.addFinanceComments = true;
  }

  if (
    effective.viewTeamExpenses ||
    effective.editAllDraftExpenses ||
    effective.approveExpenses ||
    effective.rejectExpenses ||
    effective.cancelExpenses ||
    effective.issueReimbursements ||
    effective.recordReimbursementPayments
  ) {
    effective.accessExpenses = true;
    effective.viewExpenses = true;
    effective.viewTeamExpenses = true;
    effective.accessFinance = true;
    effective.viewFinance = true;
    effective.viewReimbursements = true;
    effective.viewPaymentsMade = true;
  }

  if (effective.issueReimbursements || effective.recordReimbursementPayments) {
    effective.viewReimbursements = true;
    effective.viewPaymentsMade = true;
    effective.accessFinance = true;
    effective.viewFinance = true;
  }

  if (effective.viewOwnPaychecks) {
    effective.accessPayroll = true;
    effective.accessFinance = true;
    effective.viewFinance = true;
    effective.addFinanceAttachments = true;
    effective.viewFinanceComments = true;
    effective.addFinanceComments = true;
  }

  if (
    effective.viewAllPaychecks ||
    effective.viewPayroll ||
    effective.createPayrollRuns ||
    effective.editPayrollRuns ||
    effective.approvePayroll ||
    effective.processPayrollPayments ||
    effective.managePayProfiles
  ) {
    effective.accessPayroll = true;
    effective.viewPayroll = true;
    effective.viewAllPaychecks = true;
    effective.accessFinance = true;
    effective.viewFinance = true;
  }

  if (effective.accessApprovals || effective.viewApprovalQueue) {
    effective.accessFinance = true;
    effective.viewFinance = true;
  }

  if (effective.accessLedger) {
    effective.viewLedger = true;
  }

  if (effective.viewLedger) {
    effective.accessFinance = true;
    effective.viewFinance = true;
  }

  if (
    effective.viewChartOfAccounts ||
    effective.viewAccountingPeriods ||
    effective.viewJournalEntries ||
    effective.viewJournalDrilldown
  ) {
    effective.accessLedger = true;
    effective.viewLedger = true;
    effective.accessFinance = true;
    effective.viewFinance = true;
  }

  if (
    effective.manageChartOfAccounts ||
    effective.manageAccountingPeriods ||
    effective.managePostingRules ||
    effective.createManualJournalEntries ||
    effective.postJournalEntries ||
    effective.reverseJournalEntries ||
    effective.voidJournalEntries
  ) {
    effective.accessLedger = true;
    effective.viewLedger = true;
    effective.viewChartOfAccounts = true;
    effective.viewAccountingPeriods = true;
    effective.viewJournalEntries = true;
    effective.viewJournalDrilldown = true;
    effective.accessFinance = true;
    effective.viewFinance = true;
  }
}

export function getEffectivePermissions(
  role: Role,
  overrides?: Partial<PermissionMap> | null
): PermissionMap {
  const basePermissions = ROLE_PERMISSIONS[role];
  const effective: PermissionMap = {
    ...basePermissions,
  };

  applyBooleanPermissionOverrides(effective, role, overrides);
  lockAdminOnlyFinancePermissions(effective, role);
  applyPermissionCascades(effective);
  lockAdminOnlyFinancePermissions(effective, role);

  return effective;
}

export function canPerform(
  role: Role,
  permission: Permission,
  overrides?: Partial<PermissionMap> | null
): boolean {
  const perms = getEffectivePermissions(role, overrides);
  return !!perms[permission];
}

function routeMatchesPattern(route: string, pattern: string): boolean {
  const normRoute = route.replace(/\/+$/, "") || "/";
  const normPattern = pattern.replace(/\/+$/, "") || "/";

  if (normPattern.includes(":")) {
    const patternParts = normPattern.split("/");
    const routeParts = normRoute.split("/");
    if (patternParts.length !== routeParts.length) return false;
    return patternParts.every(
      (part, index) => part.startsWith(":") || part === routeParts[index]
    );
  }

  if (normRoute === normPattern) return true;
  if (normRoute.startsWith(normPattern + "/")) return true;
  return false;
}

/** Prefer static segments over :param routes when multiple patterns match (e.g. .../new vs .../:id). */
function routePatternSpecificity(pattern: string): number {
  const parts = pattern.split("/").filter(Boolean);
  const literalSegments = parts.filter((part) => !part.startsWith(":")).length;
  return literalSegments * 10_000 + parts.length * 100 + pattern.length;
}

export function canAccessRoute(
  role: Role,
  route: string,
  overrides?: Partial<PermissionMap> | null
): boolean {
  const normalizedRoute = route.replace(/\/+$/, "") || "/";

  const matchingEntries = Object.entries(ROUTE_PERMISSIONS).filter(([pattern]) =>
    routeMatchesPattern(normalizedRoute, pattern)
  );

  if (matchingEntries.length === 0) return true;

  const [, config] = matchingEntries.reduce((best, current) =>
    routePatternSpecificity(current[0]) > routePatternSpecificity(best[0]) ? current : best
  );

  if (config.roles && !config.roles.includes(role)) {
    return false;
  }

  if (config.permission) {
    return canPerform(role, config.permission, overrides);
  }

  return true;
}

/* =========================================================
   PROJECT PERMISSIONS
========================================================= */

export function canViewProject(
  project: ProjectRow,
  userId: string | null,
  role: Role,
  projectMembers: ProjectMemberRow[]
): boolean {
  if (!userId) return false;
  if (role === "admin") return true;

  const isCreator = project.created_by === userId;

  const isMember = projectMembers.some(
    (m) => m.project_id === project.id && m.user_id === userId
  );

  return isCreator || isMember;
}

export function canEditProject(
  project: ProjectRow,
  userId: string | null,
  role: Role
): boolean {
  if (!userId) return false;
  return role === "admin" || project.created_by === userId;
}

export function canDeleteProject(
  project: ProjectRow,
  userId: string | null,
  role: Role
): boolean {
  if (!userId) return false;
  return role === "admin" || project.created_by === userId;
}

/* =========================================================
   TASK PERMISSIONS
========================================================= */

export function canViewTask(
  task: TaskRow,
  userId: string | null,
  role: Role,
  taskMembers: TaskMemberRow[],
  visibleProjectIds: Set<string>
): boolean {
  if (!userId) return false;
  if (role === "admin") return true;

  const isCreator = task.created_by === userId;
  const isAssignee = task.assignee_id === userId;

  const isTaskMember = taskMembers.some(
    (m) => m.task_id === task.id && m.user_id === userId
  );

  const isProjectVisible =
    !!task.project_id && visibleProjectIds.has(task.project_id);

  return isCreator || isAssignee || isTaskMember || isProjectVisible;
}

export function canEditTaskEntity(
  task: TaskRow,
  userId: string | null,
  role: Role
): boolean {
  if (!userId) return false;
  return role === "admin" || task.created_by === userId;
}

export function canDeleteTaskEntity(
  task: TaskRow,
  userId: string | null,
  role: Role
): boolean {
  if (!userId) return false;
  return role === "admin" || task.created_by === userId;
}

export function canMoveTask(
  task: TaskRow,
  userId: string | null,
  role: Role,
  taskMembers: TaskMemberRow[],
  visibleProjectIds?: Set<string>
): boolean {
  if (!userId) return false;

  const isCreator = task.created_by === userId;
  const isAssignee = task.assignee_id === userId;

  const isTaskMember = taskMembers.some(
    (m) => m.task_id === task.id && m.user_id === userId
  );

  const isProjectVisible =
    !!task.project_id && !!visibleProjectIds?.has(task.project_id);

  return (
    role === "admin" ||
    role === "manager" ||
    isCreator ||
    isAssignee ||
    isTaskMember ||
    isProjectVisible
  );
}

export function canCreateTask(role: Role): boolean {
  return canPerform(role, "createTasks");
}

/* =========================================================
   CALENDAR PERMISSIONS
========================================================= */

export function getVisibleProjectIds(
  userId: string,
  role: Role,
  projects: ProjectRow[],
  projectMembers: ProjectMemberRow[]
): Set<string> {
  if (role === "admin") {
    return new Set(projects.map((p) => p.id));
  }

  return new Set([
    ...projects.filter((p) => p.created_by === userId).map((p) => p.id),
    ...projectMembers
      .filter((m) => m.user_id === userId)
      .map((m) => m.project_id),
  ]);
}

export function canViewCalendarEvent(
  event: CalendarEventRow,
  userId: string,
  role: Role,
  visibleProjectIds: Set<string>
): boolean {
  if (role === "admin") return true;

  if (!event.project_id) {
    return event.created_by === userId;
  }

  return visibleProjectIds.has(event.project_id);
}
