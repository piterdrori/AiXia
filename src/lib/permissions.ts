export type Role = "admin" | "manager" | "employee" | "guest";

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

  "/finance": { permission: "viewFinance" },
  "/finance/clients": { permission: "viewClients" },
  "/finance/vendors": { permission: "viewVendors" },
  "/finance/master-data/clients": { permission: "viewClients" },
  "/finance/master-data/clients/:id": { permission: "viewClients" },

  "/finance/master-data/vendors": { permission: "viewVendors" },
  "/finance/master-data/vendors/new": { permission: "createFinanceRecords" },
  "/finance/master-data/bank-accounts": { permission: "viewBankAccounts" },
  "/finance/master-data/bank-accounts/new": { permission: "createFinanceRecords" },
  "/finance/master-data/bank-accounts/:id": { permission: "viewBankAccounts" },
  "/finance/master-data/vendor-bank-accounts": { permission: "viewBankAccounts" },
  "/finance/master-data/vendor-bank-accounts/new": { permission: "createFinanceRecords" },
  "/finance/master-data/vendor-bank-accounts/:id": { permission: "viewBankAccounts" },
  "/finance/payment-methods": { permission: "viewPaymentMethods" },
  "/finance/master-data/payment-methods": { permission: "viewPaymentMethods" },
    "/finance/expense-categories": { permission: "viewExpenseCategories" },
  "/finance/master-data/expense-categories": { permission: "viewExpenseCategories" },
  "/finance/revenue-categories": { permission: "viewRevenueCategories" },
  "/finance/master-data/revenue-categories": { permission: "viewRevenueCategories" },
  "/finance/master-data/items": { permission: "viewItems" },
  "/finance/master-data/currencies": { permission: "viewFinance" },
  "/finance/settings": { permission: "manageFinanceMasterData" },
  "/finance/payment-terms": { permission: "viewPaymentTerms" },
  "/finance/master-data/payment-terms": { permission: "viewPaymentTerms" },
    "/finance/shipping-terms": { permission: "viewShippingTerms" },
  "/finance/master-data/shipping-terms": { permission: "viewShippingTerms" },
    "/finance/units-of-measure": { permission: "viewUnitsOfMeasure" },
  "/finance/master-data/units-of-measure": { permission: "viewUnitsOfMeasure" },
  "/finance/tax-codes": { permission: "viewTaxCodes" },
  "/finance/master-data/tax-codes": { permission: "viewTaxCodes" },

  "/finance/invoices": { permission: "viewInvoices" },
  "/finance/invoices/new": { permission: "createInvoices" },
  "/finance/invoices/:id": { permission: "viewInvoices" },

  "/finance/bills": { permission: "viewBills" },
  "/finance/bills/:id": { permission: "viewBills" },
  "/finance/payments-made": { permission: "viewPaymentsMade" },

  "/settings": { permission: "changeSettings" },

  "/finance/expenses": { permission: "viewExpenses" },
  "/finance/expenses/new": { permission: "createExpenses" },
  "/finance/expenses/:id": { permission: "viewExpenses" },

  "/finance/reimbursements": { permission: "viewReimbursements" },
  "/finance/reimbursements/:id": { permission: "viewReimbursements" },

    "/finance/approvals": { permission: "viewApprovalQueue" },

    "/finance/payroll": { permission: "viewPayroll" },
  "/finance/payroll/profiles": { permission: "managePayProfiles" },
  "/finance/payroll/periods": { permission: "createPayrollRuns" },
  "/finance/payroll/runs": { permission: "viewPayroll" },
  "/finance/payroll/runs/:id": { permission: "viewPayroll" },

  "/finance/ledger": { permission: "viewLedger" },
  "/finance/ledger/accounts": { permission: "viewChartOfAccounts" },
  "/finance/ledger/accounts/:id": { permission: "viewJournalDrilldown" },
  "/finance/ledger/periods": { permission: "viewAccountingPeriods" },
  "/finance/ledger/journals": { permission: "viewJournalEntries" },
  "/finance/ledger/journals/:id": { permission: "viewJournalDrilldown" },
};

export function getEffectivePermissions(
  role: Role,
  overrides?: Partial<PermissionMap> | null
): PermissionMap {
    const basePermissions = ROLE_PERMISSIONS[role];
  const overridePermissions = overrides ?? {};

    const effective: PermissionMap = {
    ...basePermissions,
  };

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

  if (effective.manageUsers) {
    effective.viewEmployeeDirectory = true;
    effective.viewEmployeeDetail = true;
  }

  if (effective.accessFinance) {
    effective.viewFinance = true;
  }

   if (effective.viewFinance) {
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

    // compatibility bridge for existing finance users
    effective.viewInvoices = true;
    effective.viewReceivedPayments = true;
    effective.viewBills = true;
    effective.viewPaymentsMade = true;
  }

  if (effective.createFinanceRecords) {
    // compatibility bridge for existing generic finance create flows
    effective.createInvoices = true;
    effective.recordPaymentsReceived = true;
    effective.createBills = true;
    effective.recordPaymentsMade = true;
  }

  if (effective.editFinanceRecords) {
    // compatibility bridge for existing generic finance edit flows
    effective.editDraftInvoices = true;
    effective.sendInvoices = true;
    effective.editDraftBills = true;
    effective.openBills = true;
  }

  if (effective.archiveFinanceRecords) {
    // compatibility bridge for existing generic finance archive flows
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

    // ===== EXPENSES AUTO CASCADE =====
  if (effective.accessExpenses) {
    effective.viewExpenses = true;
  }

  if (effective.viewExpenses) {
  effective.accessFinance = true;
  effective.viewFinance = true;
}

  if (effective.createExpenses) {
    effective.accessExpenses = true;
    effective.viewExpenses = true;
  }

  if (effective.approveExpenses) {
    effective.accessApprovals = true;
    effective.viewApprovalQueue = true;
  }

    if (effective.recordReimbursementPayments) {
    effective.viewReimbursements = true;
  }

  if (effective.viewReimbursements) {
  effective.accessFinance = true;
  effective.viewFinance = true;
}

   if (effective.accessApprovals || effective.viewApprovalQueue) {
    effective.accessFinance = true;
    effective.viewFinance = true;
  }

  if (effective.createReimbursements || effective.issueReimbursements) {
    effective.viewReimbursements = true;
    effective.accessFinance = true;
    effective.viewFinance = true;
  }

  // ===== PAYROLL CASCADE =====

  if (effective.accessPayroll) {
    effective.viewPayroll = true;
  }

  if (effective.viewPayroll) {
    effective.accessFinance = true;
    effective.viewFinance = true;
  }

  if (effective.viewOwnPaychecks || effective.viewAllPaychecks) {
    effective.accessPayroll = true;
    effective.viewPayroll = true;
    effective.accessFinance = true;
    effective.viewFinance = true;
  }

   if (
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

export function canAccessRoute(
  role: Role,
  route: string,
  overrides?: Partial<PermissionMap> | null
): boolean {
  const sortedRoutes = Object.entries(ROUTE_PERMISSIONS).sort(
    ([a], [b]) => b.length - a.length
  );

  const entry = sortedRoutes.find(([pattern]) => {
    if (pattern.includes(":")) {
      const patternParts = pattern.split("/");
      const routeParts = route.split("/");

      if (patternParts.length !== routeParts.length) return false;

      return patternParts.every((part, index) => {
        return part.startsWith(":") || part === routeParts[index];
      });
    }

    return route.replace(/\/+$/, "") === pattern.replace(/\/+$/, "");
  });

  if (!entry) return true;

  const [, config] = entry;

  if (config.roles) {
    return config.roles.includes(role);
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
