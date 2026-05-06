import type { Permission } from "@/lib/permissions";

export type AccessApprovalGroupKey =
  | "masterData"
  | "transactions"
  | "reports"
  | "settings";

export type AccessApprovalSectionKey =
  | "masterData"
  | "incomingMoneyFlow"
  | "supplierProcurementFlow"
  | "expensesFundingPayment"
  | "payrollFundBasket"
  | "reports"
  | "financeSettings"
  | "accessApprovals";

export type AccessApprovalLevel = "see" | "monitor" | "change" | "operate";

export type AccessLevelState = Record<AccessApprovalLevel, boolean>;

export type AccessApprovalEffectiveLabel =
  | "No Company Access"
  | "Can Open Section"
  | "Can Monitor Company Records"
  | "Can Change Company Records"
  | "Can Operate Final Actions"
  | "Admin Only";

export type PermissionExplanation = {
  title: string;
  shortLabel: string;
  permits: string[];
  doesNotPermit: string[];
};

export type AccessApprovalSection = {
  key: AccessApprovalSectionKey;
  groupKey: AccessApprovalGroupKey;
  title: string;
  shortTitle: string;
  scope: string;
  controls: string[];
  adminOnly?: boolean;
  defaultRule?: string;
  tooltip: {
    title: string;
    description: string;
    permits: string[];
    doesNotPermit: string[];
  };
  levels: Record<AccessApprovalLevel, Permission[]>;
};

export type AccessApprovalGroup = {
  key: AccessApprovalGroupKey;
  title: string;
  shortTitle: string;
  description: string;
  sections: AccessApprovalSectionKey[];
};

export type ToggleSectionLevelInput = {
  section: AccessApprovalSection;
  level: AccessApprovalLevel;
  enabled: boolean;
  currentOverrides: Partial<Record<Permission, boolean>>;
  roleDefaultPermissions: Record<Permission, boolean>;
};

export const ACCESS_APPROVAL_LEVEL_ORDER: AccessApprovalLevel[] = [
  "see",
  "monitor",
  "change",
  "operate",
];

export const ACCESS_APPROVAL_LEVEL_EXPLANATIONS: Record<
  AccessApprovalLevel,
  PermissionExplanation
> = {
  see: {
    title: "See",
    shortLabel: "Open and view",
    permits: [
      "Open the section or page group.",
      "View records allowed by the user’s scope.",
      "For personal employee flows, normal users still only see their own records.",
    ],
    doesNotPermit: [
      "Seeing all company records unless Monitor is enabled.",
      "Editing company-side records.",
      "Creating company-side records.",
      "Approving, paying, deleting, archiving, restoring, or finalizing workflow actions.",
    ],
  },
  monitor: {
    title: "Monitor",
    shortLabel: "View company status",
    permits: [
      "See company-level records in the approved section.",
      "View dashboards, activity, status, summaries, and history.",
      "Track workflow state across users and companies.",
    ],
    doesNotPermit: [
      "Editing records.",
      "Creating new company-side records.",
      "Approving, paying, deleting, archiving, restoring, or finalizing actions.",
    ],
  },
  change: {
    title: "Change",
    shortLabel: "Create and edit",
    permits: [
      "Create company-side records.",
      "Edit or update records.",
      "Upload documents and proof files.",
      "Add comments or internal notes.",
      "Modify drafts or editable workflow data.",
    ],
    doesNotPermit: [
      "Final approvals.",
      "Issuing or voiding official documents.",
      "Confirming funding or payment.",
      "Paying or distributing money.",
      "Archiving, deleting, or restoring records.",
      "Final workflow execution.",
    ],
  },
  operate: {
    title: "Operate",
    shortLabel: "Final workflow actions",
    permits: [
      "Approve, reject, or request correction.",
      "Issue or void documents.",
      "Archive, delete, or restore records.",
      "Confirm funding pools.",
      "Create or confirm payment distributions.",
      "Verify proof.",
      "Pay, process, or finalize workflow actions.",
    ],
    doesNotPermit: [
      "Managing Finance Access Approvals unless the Access Approvals section is granted and the user is Admin.",
      "Bypassing ownership or security rules outside the granted section scope.",
    ],
  },
};

const masterDataSee: Permission[] = [
  "accessFinance",
  "viewFinance",
  "manageFinanceMasterData",
  "viewClients",
  "viewVendors",
  "viewBankAccounts",
  "viewPaymentMethods",
  "viewPaymentTerms",
  "viewShippingTerms",
  "viewUnitsOfMeasure",
  "viewTaxCodes",
  "viewExpenseCategories",
  "viewRevenueCategories",
  "viewItems",
];

const masterDataMonitor: Permission[] = [
  "viewReports",
  "viewClients",
  "viewVendors",
  "viewBankAccounts",
  "viewPaymentMethods",
  "viewPaymentTerms",
  "viewShippingTerms",
  "viewUnitsOfMeasure",
  "viewTaxCodes",
  "viewExpenseCategories",
  "viewRevenueCategories",
  "viewItems",
];

const masterDataChange: Permission[] = [
  "createFinanceRecords",
  "editFinanceRecords",
  "manageClients",
  "manageVendors",
  "addFinanceComments",
  "viewFinanceComments",
  "addFinanceAttachments",
];

const masterDataOperate: Permission[] = [
  "archiveFinanceRecords",
  "removeFinanceAttachments",
];

const incomingMoneyFlowSee: Permission[] = [
  "accessFinance",
  "viewFinance",
  "accessReceivables",
  "viewReceivables",
  "viewInvoices",
  "viewReceivedPayments",
];

const incomingMoneyFlowMonitor: Permission[] = [
  "viewReports",
  "viewReceivables",
  "viewInvoices",
  "viewReceivedPayments",
];

const incomingMoneyFlowChange: Permission[] = [
  "createFinanceRecords",
  "editFinanceRecords",
  "createInvoices",
  "editDraftInvoices",
  "recordPaymentsReceived",
  "addFinanceComments",
  "viewFinanceComments",
  "addFinanceAttachments",
];

const incomingMoneyFlowOperate: Permission[] = [
  "approveFinanceRecords",
  "archiveFinanceRecords",
  "sendInvoices",
  "voidInvoices",
  "recordPaymentsReceived",
  "exportReceivables",
  "removeFinanceAttachments",
];

const supplierProcurementSee: Permission[] = [
  "accessFinance",
  "viewFinance",
  "accessPayables",
  "viewPayables",
  "viewBills",
  "viewPaymentsMade",
  "viewVendors",
];

const supplierProcurementMonitor: Permission[] = [
  "viewReports",
  "viewPayables",
  "viewBills",
  "viewPaymentsMade",
  "viewVendors",
];

const supplierProcurementChange: Permission[] = [
  "createFinanceRecords",
  "editFinanceRecords",
  "createBills",
  "editDraftBills",
  "recordPaymentsMade",
  "manageVendors",
  "addFinanceComments",
  "viewFinanceComments",
  "addFinanceAttachments",
];

const supplierProcurementOperate: Permission[] = [
  "approveFinanceRecords",
  "archiveFinanceRecords",
  "openBills",
  "voidBills",
  "recordPaymentsMade",
  "exportPayables",
  "removeFinanceAttachments",
];

const expensesFundingPaymentSee: Permission[] = [
  "accessFinance",
  "viewFinance",
  "accessExpenses",
  "viewExpenses",
  "viewReimbursements",
  "viewPaymentsMade",
];

const expensesFundingPaymentMonitor: Permission[] = [
  "viewReports",
  "viewExpenses",
  "viewTeamExpenses",
  "viewReimbursements",
  "viewPaymentsMade",
  "viewFinanceComments",
];

const expensesFundingPaymentChange: Permission[] = [
  "createFinanceRecords",
  "editFinanceRecords",
  "editAllDraftExpenses",
  "issueReimbursements",
  "recordReimbursementPayments",
  "recordPaymentsMade",
  "addFinanceComments",
  "addFinanceAttachments",
];

const expensesFundingPaymentOperate: Permission[] = [
  "approveFinanceRecords",
  "archiveFinanceRecords",
  "approveExpenses",
  "rejectExpenses",
  "cancelExpenses",
  "issueReimbursements",
  "recordReimbursementPayments",
  "recordPaymentsMade",
  "exportExpenseReports",
  "exportReimbursementReports",
  "removeFinanceAttachments",
];

const payrollFundBasketSee: Permission[] = [
  "accessFinance",
  "viewFinance",
  "accessPayroll",
  "viewPayroll",
  "viewOwnPaychecks",
];

const payrollFundBasketMonitor: Permission[] = [
  "viewReports",
  "viewPayroll",
  "viewAllPaychecks",
];

const payrollFundBasketChange: Permission[] = [
  "createFinanceRecords",
  "editFinanceRecords",
  "createPayrollRuns",
  "editPayrollRuns",
  "managePayProfiles",
  "addFinanceComments",
  "addFinanceAttachments",
];

const payrollFundBasketOperate: Permission[] = [
  "approveFinanceRecords",
  "archiveFinanceRecords",
  "approvePayroll",
  "processPayrollPayments",
  "removeFinanceAttachments",
];

const reportsSee: Permission[] = [
  "accessFinance",
  "viewFinance",
  "viewReports",
];

const reportsMonitor: Permission[] = [
  "viewReports",
  "exportFinanceReports",
];

const reportsChange: Permission[] = [
  "viewReports",
  "exportFinanceReports",
];

const reportsOperate: Permission[] = [
  "exportFinanceReports",
  "exportReceivables",
  "exportPayables",
  "exportExpenseReports",
  "exportReimbursementReports",
];

const financeSettingsSee: Permission[] = [
  "accessFinance",
  "viewFinance",
  "manageFinanceMasterData",
];

const financeSettingsMonitor: Permission[] = [
  "viewReports",
  "manageFinanceMasterData",
];

const financeSettingsChange: Permission[] = [
  "manageFinanceMasterData",
  "createFinanceRecords",
  "editFinanceRecords",
];

const financeSettingsOperate: Permission[] = [
  "manageFinanceMasterData",
  "archiveFinanceRecords",
  "approveFinanceRecords",
];

const accessApprovalsSee: Permission[] = [
  "accessApprovals",
  "viewApprovalQueue",
];

const accessApprovalsMonitor: Permission[] = [
  "viewApprovalQueue",
  "manageUsers",
];

const accessApprovalsChange: Permission[] = [
  "manageUsers",
];

const accessApprovalsOperate: Permission[] = [
  "actOnFinanceApprovals",
  "manageUsers",
];

export const ACCESS_APPROVAL_SECTIONS: AccessApprovalSection[] = [
  {
    key: "masterData",
    groupKey: "masterData",
    title: "Master Data",
    shortTitle: "Master Data",
    scope: "Finance reference data and connected company records",
    controls: [
      "Companies",
      "Clients",
      "Vendors",
      "Bank Accounts",
      "Payment Terms",
      "Shipping Terms",
      "Tax Codes",
      "Items",
      "Currencies",
      "Employees",
      "Categories",
    ],
    tooltip: {
      title: "Master Data",
      description:
        "Controls finance reference data used by every transaction flow, including companies, clients, vendors, bank accounts, terms, tax codes, items, currencies, employees, and categories.",
      permits: [
        "Open and view master-data pages according to the enabled level.",
        "Monitor master-data completeness, missing fields, and usage status when Monitor is enabled.",
        "Create or edit master data when Change is enabled.",
        "Archive, delete, restore, or finalize master-data control actions when Operate is enabled.",
      ],
      doesNotPermit: [
        "Transaction workflow execution.",
        "Expense or payroll payment execution.",
        "Access approval management.",
      ],
    },
    levels: {
      see: masterDataSee,
      monitor: masterDataMonitor,
      change: masterDataChange,
      operate: masterDataOperate,
    },
  },
  {
    key: "incomingMoneyFlow",
    groupKey: "transactions",
    title: "Incoming Money Flow",
    shortTitle: "Incoming Money",
    scope: "Company receivables workflow",
    controls: [
      "Quotations",
      "Customer POs",
      "Proforma Invoices",
      "Invoices",
      "Payments Received",
    ],
    tooltip: {
      title: "Incoming Money Flow",
      description:
        "Controls the full customer-side receivable flow from quotation and customer commitment through proforma, final invoice, and payment collection.",
      permits: [
        "Open and work with quotations, customer POs, proforma invoices, invoices, and payments received according to the enabled level.",
        "Monitor customer money-in records when Monitor is enabled.",
        "Create or edit incoming money records when Change is enabled.",
        "Run final incoming-money actions when Operate is enabled.",
      ],
      doesNotPermit: [
        "Supplier procurement actions.",
        "Expense funding/payment execution.",
        "Payroll funding/payment execution.",
        "Access approval management.",
      ],
    },
    levels: {
      see: incomingMoneyFlowSee,
      monitor: incomingMoneyFlowMonitor,
      change: incomingMoneyFlowChange,
      operate: incomingMoneyFlowOperate,
    },
  },
  {
    key: "supplierProcurementFlow",
    groupKey: "transactions",
    title: "Supplier Procurement Flow",
    shortTitle: "Supplier Procurement",
    scope: "Company supplier and payable workflow",
    controls: [
      "Vendor Quotations",
      "Purchase Orders",
      "Vendor PI / Invoice",
      "Payment Made",
    ],
    tooltip: {
      title: "Supplier Procurement Flow",
      description:
        "Controls the supplier-side procurement and payable flow from vendor quotation through purchase order, vendor PI/invoice, and outgoing payment.",
      permits: [
        "Open and work with supplier procurement records according to the enabled level.",
        "Monitor supplier, PO, bill, and payment-made records when Monitor is enabled.",
        "Create or edit procurement records when Change is enabled.",
        "Run final procurement and payable actions when Operate is enabled.",
      ],
      doesNotPermit: [
        "Incoming customer receivable actions.",
        "Employee personal expense or paycheck ownership rights.",
        "Payroll funding/payment execution.",
        "Access approval management.",
      ],
    },
    levels: {
      see: supplierProcurementSee,
      monitor: supplierProcurementMonitor,
      change: supplierProcurementChange,
      operate: supplierProcurementOperate,
    },
  },
  {
    key: "expensesFundingPayment",
    groupKey: "transactions",
    title: "Expenses & Reimbursements",
    shortTitle: "Expense Funding",
    scope: "Finance/Admin expense approval, funding, and payment execution",
    controls: [
      "Expense Requests",
      "Expense Funding Pool",
      "Expense Payment Distribution",
      "Payment Proof Review",
      "Recipient Confirmation Monitoring",
    ],
    defaultRule:
      "Normal users can see, create, edit, submit, upload, and confirm their own expenses and reimbursements by default.",
    tooltip: {
      title: "Expenses & Reimbursements",
      description:
        "Controls the company-side Finance/Admin layer of expenses and reimbursements. It does not remove normal users’ own expense/reimbursement rights.",
      permits: [
        "Open the Finance/Admin expense payment execution area according to the enabled level.",
        "Monitor all expense funding/payment records when Monitor is enabled.",
        "Create or edit funding/payment execution records when Change is enabled.",
        "Approve, allocate funds, distribute payments, verify proof, archive, delete, restore, or finalize actions when Operate is enabled.",
      ],
      doesNotPermit: [
        "Blocking normal users from seeing, creating, editing, submitting, uploading, or confirming their own expense/reimbursement records.",
        "Payroll funding/payment execution.",
        "Supplier procurement actions.",
        "Access approval management.",
      ],
    },
    levels: {
      see: expensesFundingPaymentSee,
      monitor: expensesFundingPaymentMonitor,
      change: expensesFundingPaymentChange,
      operate: expensesFundingPaymentOperate,
    },
  },
  {
    key: "payrollFundBasket",
    groupKey: "transactions",
    title: "Payroll & Paycheck Requests",
    shortTitle: "Payroll Basket",
    scope: "Finance/Admin payroll funding and payment execution",
    controls: [
      "Paycheck Requests",
      "Payroll Funding Pool",
      "Paycheck Payment Distribution",
      "Payroll Proof Review",
      "Employee Confirmation Monitoring",
    ],
    defaultRule:
      "Normal users can see, create, edit, submit, upload, and confirm their own paycheck requests by default.",
    tooltip: {
      title: "Payroll & Paycheck Requests",
      description:
        "Controls the company-side Finance/Admin layer of payroll funding pools and paycheck payment distributions. It does not remove normal users’ own paycheck request rights.",
      permits: [
        "Open payroll funding/payment execution pages according to the enabled level.",
        "Monitor all payroll funding/payment records when Monitor is enabled.",
        "Create or edit payroll funding/payment execution records when Change is enabled.",
        "Approve, allocate funding, distribute paycheck payments, verify proof, archive, delete, restore, or finalize payroll actions when Operate is enabled.",
      ],
      doesNotPermit: [
        "Blocking normal users from seeing, creating, editing, submitting, uploading, or confirming their own paycheck requests.",
        "Expense funding/payment execution.",
        "Supplier procurement actions.",
        "Access approval management.",
      ],
    },
    levels: {
      see: payrollFundBasketSee,
      monitor: payrollFundBasketMonitor,
      change: payrollFundBasketChange,
      operate: payrollFundBasketOperate,
    },
  },
  {
    key: "reports",
    groupKey: "reports",
    title: "Reports",
    shortTitle: "Reports",
    scope: "Finance reports, analytics, and exports",
    controls: [
      "Finance Reports",
      "Receivables Reports",
      "Payables Reports",
      "Expense Reports",
      "Reimbursement Reports",
      "Report Exports",
    ],
    tooltip: {
      title: "Reports",
      description:
        "Controls finance reporting, analytics, summaries, saved report views if added later, and official report exports.",
      permits: [
        "Open the Finance Reports page according to the enabled level.",
        "View company-level report dashboards and summaries when Monitor is enabled.",
        "Configure report views or report settings if supported when Change is enabled.",
        "Export/download/share official finance reports when Operate is enabled.",
      ],
      doesNotPermit: [
        "Editing source transaction records.",
        "Executing payments.",
        "Changing master data.",
        "Managing access approvals.",
      ],
    },
    levels: {
      see: reportsSee,
      monitor: reportsMonitor,
      change: reportsChange,
      operate: reportsOperate,
    },
  },
  {
    key: "financeSettings",
    groupKey: "settings",
    title: "Settings",
    shortTitle: "Settings",
    scope: "Finance configuration and workflow setup",
    controls: [
      "Finance Settings",
      "Workflow Settings",
      "Numbering Settings",
      "System Configuration",
    ],
    tooltip: {
      title: "Settings",
      description:
        "Controls finance configuration, workflow settings, numbering/settings, and permission-sensitive finance setup.",
      permits: [
        "Open Finance Settings according to the enabled level.",
        "Review finance configuration and status when Monitor is enabled.",
        "Edit finance configuration when Change is enabled.",
        "Apply dangerous or final configuration actions when Operate is enabled.",
      ],
      doesNotPermit: [
        "Managing user access approvals.",
        "Executing transaction payments.",
        "Approving transaction workflow records unless the relevant transaction section is also enabled.",
      ],
    },
    levels: {
      see: financeSettingsSee,
      monitor: financeSettingsMonitor,
      change: financeSettingsChange,
      operate: financeSettingsOperate,
    },
  },
  {
    key: "accessApprovals",
    groupKey: "settings",
    title: "Finance Access Approvals",
    shortTitle: "Access Control",
    scope: "Admin-only user access management",
    controls: [
      "User Access Approval",
      "Finance-Level Permission Matrix",
      "See / Monitor / Change / Operate Controls",
    ],
    adminOnly: true,
    tooltip: {
      title: "Finance Access Approvals",
      description:
        "Admin-only control for managing what users can see, monitor, change, and operate across the full AiXia Finance module.",
      permits: [
        "Open the Finance Access Approvals page only if the current user is Admin.",
        "View user access states only if Admin.",
        "Change user permissions only if Admin.",
        "Operate final access-control actions only if Admin.",
      ],
      doesNotPermit: [
        "Normal users managing other users’ access.",
        "Finance operators managing access unless they are Admin.",
        "Bypassing Admin-only security rules.",
      ],
    },
    levels: {
      see: accessApprovalsSee,
      monitor: accessApprovalsMonitor,
      change: accessApprovalsChange,
      operate: accessApprovalsOperate,
    },
  },
];

export const ACCESS_APPROVAL_GROUPS: AccessApprovalGroup[] = [
  {
    key: "masterData",
    title: "Master Data",
    shortTitle: "Master Data",
    description:
      "Finance reference data used by companies, clients, vendors, bank accounts, terms, items, currencies, and categories.",
    sections: ["masterData"],
  },
  {
    key: "transactions",
    title: "Transactions",
    shortTitle: "Transactions",
    description:
      "Company transaction workflows: incoming money, supplier procurement, expenses/reimbursements, and payroll/paychecks.",
    sections: [
      "incomingMoneyFlow",
      "supplierProcurementFlow",
      "expensesFundingPayment",
      "payrollFundBasket",
    ],
  },
  {
    key: "reports",
    title: "Reports",
    shortTitle: "Reports",
    description:
      "Finance dashboards, analytics, summaries, and official report exports.",
    sections: ["reports"],
  },
  {
    key: "settings",
    title: "Settings",
    shortTitle: "Settings",
    description:
      "Finance configuration, settings, and Admin-only Finance Access Approvals.",
    sections: ["financeSettings", "accessApprovals"],
  },
];

export const ACCESS_APPROVAL_SECTION_BY_KEY = ACCESS_APPROVAL_SECTIONS.reduce(
  (map, section) => {
    map[section.key] = section;
    return map;
  },
  {} as Record<AccessApprovalSectionKey, AccessApprovalSection>
);

export const ACCESS_APPROVAL_GROUP_BY_KEY = ACCESS_APPROVAL_GROUPS.reduce(
  (map, group) => {
    map[group.key] = group;
    return map;
  },
  {} as Record<AccessApprovalGroupKey, AccessApprovalGroup>
);

export function getSectionsForGroup(groupKey: AccessApprovalGroupKey) {
  const group = ACCESS_APPROVAL_GROUP_BY_KEY[groupKey];

  if (!group) return [];

  return group.sections.map((sectionKey) => ACCESS_APPROVAL_SECTION_BY_KEY[sectionKey]);
}

export function getSectionPermissionSet(section: AccessApprovalSection) {
  return new Set<Permission>([
    ...section.levels.see,
    ...section.levels.monitor,
    ...section.levels.change,
    ...section.levels.operate,
  ]);
}

export function getRequiredPermissionsThroughLevel(
  section: AccessApprovalSection,
  level: AccessApprovalLevel
) {
  const levelIndex = ACCESS_APPROVAL_LEVEL_ORDER.indexOf(level);
  const selectedLevels = ACCESS_APPROVAL_LEVEL_ORDER.slice(0, levelIndex + 1);

  return new Set<Permission>(
    selectedLevels.flatMap((selectedLevel) => section.levels[selectedLevel])
  );
}

export function getHigherLevelPermissions(
  section: AccessApprovalSection,
  level: AccessApprovalLevel
) {
  const levelIndex = ACCESS_APPROVAL_LEVEL_ORDER.indexOf(level);
  const higherLevels = ACCESS_APPROVAL_LEVEL_ORDER.slice(levelIndex + 1);

  return new Set<Permission>(
    higherLevels.flatMap((higherLevel) => section.levels[higherLevel])
  );
}

export function isPermissionSetEnabled(
  permissions: Record<Permission, boolean>,
  permissionSet: Permission[]
) {
  if (permissionSet.length === 0) return false;
  return permissionSet.every((permission) => Boolean(permissions[permission]));
}

export function getSectionLevelState(
  section: AccessApprovalSection,
  effectivePermissions: Record<Permission, boolean>
): AccessLevelState {
  return {
    see: isPermissionSetEnabled(effectivePermissions, section.levels.see),
    monitor: isPermissionSetEnabled(effectivePermissions, section.levels.monitor),
    change: isPermissionSetEnabled(effectivePermissions, section.levels.change),
    operate: isPermissionSetEnabled(effectivePermissions, section.levels.operate),
  };
}

export function getEffectiveAccessLabel(
  section: AccessApprovalSection,
  state: AccessLevelState
): AccessApprovalEffectiveLabel {
  if (section.adminOnly && state.operate) return "Admin Only";
  if (state.operate) return "Can Operate Final Actions";
  if (state.change) return "Can Change Company Records";
  if (state.monitor) return "Can Monitor Company Records";
  if (state.see) return "Can Open Section";
  return "No Company Access";
}

export function getEffectiveAccessDescription(
  section: AccessApprovalSection,
  state: AccessLevelState
) {
  if (section.adminOnly && state.operate) {
    return "Admin-level access control is enabled for this user.";
  }

  if (state.operate) {
    return "This user can perform final workflow actions in this section.";
  }

  if (state.change) {
    return "This user can create and edit company-side records in this section.";
  }

  if (state.monitor) {
    return "This user can see company-level records, status, activity, and summaries in this section.";
  }

  if (state.see) {
    return "This user can open this section.";
  }

  if (section.defaultRule) {
    return section.defaultRule;
  }

  return "No company-level access is enabled for this section.";
}

export function getPermissionOverrideForTarget(
  permission: Permission,
  targetValue: boolean,
  roleDefaultPermissions: Record<Permission, boolean>
) {
  return targetValue === roleDefaultPermissions[permission] ? undefined : targetValue;
}

export function setPermissionOverride(
  overrides: Partial<Record<Permission, boolean>>,
  permission: Permission,
  targetValue: boolean,
  roleDefaultPermissions: Record<Permission, boolean>
) {
  const overrideValue = getPermissionOverrideForTarget(
    permission,
    targetValue,
    roleDefaultPermissions
  );

  if (overrideValue === undefined) {
    delete overrides[permission];
  } else {
    overrides[permission] = overrideValue;
  }
}

export function buildSectionToggleOverrides({
  section,
  level,
  enabled,
  currentOverrides,
  roleDefaultPermissions,
}: ToggleSectionLevelInput) {
  const nextOverrides: Partial<Record<Permission, boolean>> = {
    ...currentOverrides,
  };

  if (enabled) {
    const requiredPermissions = getRequiredPermissionsThroughLevel(section, level);

    requiredPermissions.forEach((permission) => {
      setPermissionOverride(nextOverrides, permission, true, roleDefaultPermissions);
    });

    return nextOverrides;
  }

  const permissionsToDisable = new Set<Permission>([
    ...section.levels[level],
    ...getHigherLevelPermissions(section, level),
  ]);

  permissionsToDisable.forEach((permission) => {
    setPermissionOverride(nextOverrides, permission, false, roleDefaultPermissions);
  });

  return nextOverrides;
}

export function countEnabledSections(
  states: Record<AccessApprovalSectionKey, AccessLevelState>
) {
  return ACCESS_APPROVAL_SECTIONS.filter((section) => states[section.key]?.see).length;
}

export function countOperatorSections(
  states: Record<AccessApprovalSectionKey, AccessLevelState>
) {
  return ACCESS_APPROVAL_SECTIONS.filter((section) => states[section.key]?.operate).length;
}

export function countEnabledSectionsForGroup(
  groupKey: AccessApprovalGroupKey,
  states: Record<AccessApprovalSectionKey, AccessLevelState>
) {
  return getSectionsForGroup(groupKey).filter((section) => states[section.key]?.see).length;
}

export function countOperatorSectionsForGroup(
  groupKey: AccessApprovalGroupKey,
  states: Record<AccessApprovalSectionKey, AccessLevelState>
) {
  return getSectionsForGroup(groupKey).filter((section) => states[section.key]?.operate).length;
}

export function countAvailableLevelsForGroup(
  groupKey: AccessApprovalGroupKey,
  states: Record<AccessApprovalSectionKey, AccessLevelState>
) {
  return getSectionsForGroup(groupKey).reduce((total, section) => {
    const state = states[section.key];

    if (!state) return total;

    return (
      total +
      ACCESS_APPROVAL_LEVEL_ORDER.filter((level) => Boolean(state[level])).length
    );
  }, 0);
}

export function countTotalLevelsForGroup(groupKey: AccessApprovalGroupKey) {
  return getSectionsForGroup(groupKey).length * ACCESS_APPROVAL_LEVEL_ORDER.length;
}

export function createEmptyAccessStateMap(): Record<
  AccessApprovalSectionKey,
  AccessLevelState
> {
  return ACCESS_APPROVAL_SECTIONS.reduce(
    (map, section) => {
      map[section.key] = {
        see: false,
        monitor: false,
        change: false,
        operate: false,
      };
      return map;
    },
    {} as Record<AccessApprovalSectionKey, AccessLevelState>
  );
}
